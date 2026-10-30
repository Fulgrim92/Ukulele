"""Crash-safe local outputs and resumable processing state."""
from collections import Counter
from contextlib import contextmanager
from datetime import datetime, timezone
import csv
import hashlib
import io
import json
import os
from pathlib import Path
import re
import sqlite3
import tempfile
from .client import AccessError, ApiError, LRCLIBClient
from .matching import retrieve, usable_lrc


def atomic_write(path, text):
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = None
    try:
        with tempfile.NamedTemporaryFile(mode="w", encoding="utf-8", newline="", dir=path.parent, delete=False) as handle:
            temporary = handle.name
            handle.write(text)
            handle.flush()
            os.fsync(handle.fileno())
        os.replace(temporary, path)
    finally:
        if temporary and os.path.exists(temporary):
            os.unlink(temporary)


def json_text(value):
    return json.dumps(value, ensure_ascii=False, indent=2, allow_nan=False) + "\n"


def safe_component(value):
    value = re.sub(r'[<>:"/\\|?*\x00-\x1f]', "_", value).strip(" .")[:65] or "Unknown"
    if value.split(".")[0].upper() in {"CON", "PRN", "AUX", "NUL", *(f"COM{i}" for i in range(1, 10)), *(f"LPT{i}" for i in range(1, 10))}:
        value = "_" + value
    return value


@contextmanager
def output_lock(output):
    state_dir = Path(output) / ".pipeline"
    state_dir.mkdir(parents=True, exist_ok=True)
    with (state_dir / "run.lock").open("a+b") as handle:
        handle.seek(0)
        if not handle.read(1):
            handle.write(b"0")
            handle.flush()
        handle.seek(0)
        try:
            if os.name == "nt":
                import msvcrt
                msvcrt.locking(handle.fileno(), msvcrt.LK_NBLCK, 1)
            else:
                import fcntl
                fcntl.flock(handle.fileno(), fcntl.LOCK_EX | fcntl.LOCK_NB)
        except OSError as exc:
            raise RuntimeError("Another pipeline is already using this output folder.") from exc
        try:
            yield
        finally:
            handle.seek(0)
            if os.name == "nt":
                msvcrt.locking(handle.fileno(), msvcrt.LK_UNLCK, 1)
            else:
                fcntl.flock(handle.fileno(), fcntl.LOCK_UN)


def open_state(output):
    path = Path(output) / ".pipeline" / "state.sqlite3"
    path.parent.mkdir(parents=True, exist_ok=True)
    db = sqlite3.connect(path)
    db.execute("PRAGMA journal_mode=WAL")
    db.execute("CREATE TABLE IF NOT EXISTS tracks (id TEXT PRIMARY KEY, entry TEXT NOT NULL)")
    db.commit()
    return db


def file_hash(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def intact(output, entry):
    for relative, digest in entry.get("files", {}).items():
        path = (Path(output) / relative).resolve()
        if not path.is_relative_to(Path(output).resolve()) or not path.is_file() or file_hash(path) != digest:
            return False
    return True


def plain_from_lrc(text):
    result = []
    for line in text.splitlines():
        if re.match(r"^\[\d{1,3}:[0-5]\d", line):
            words = re.sub(r"\[\d{1,3}:[0-5]\d(?:[.:]\d{1,3})?\]", "", line).strip()
            if words:
                result.append(words)
    return "\n".join(result)


def write_result(output, track, status, record, candidates, reason):
    folder = Path(safe_component(track.artist)) / safe_component(track.album or "Unknown album") / (safe_component(track.title) + "--" + track.key[:10])
    entry = {"id": track.key, **track.as_dict(), "status": status, "reason": reason,
             "provider": "LRCLIB", "provider_url": "https://lrclib.net", "fetched_at": datetime.now(timezone.utc).isoformat(),
             "rights": "No blanket lyric redistribution license is asserted. Follow applicable rights and provider terms.",
             "candidates": candidates, "files": {}}
    if record:
        entry["match"] = {k: record.get(k) for k in ("id", "artistName", "trackName", "albumName", "duration", "instrumental")}
    if status == "success":
        lrc = record.get("syncedLyrics")
        plain = record.get("plainLyrics")
        if usable_lrc(lrc):
            relative = (folder / "lyrics.lrc").as_posix()
            atomic_write(Path(output) / relative, lrc.rstrip() + "\n")
            entry["lyrics_path"] = relative
            entry["format"] = "lrc"
            entry["files"][relative] = file_hash(Path(output) / relative)
            if not isinstance(plain, str) or not plain.strip():
                plain = plain_from_lrc(lrc)
                entry["plain_derived_from_lrc"] = True
        if isinstance(plain, str) and plain.strip():
            if len(plain) > 1_000_000:
                raise ValueError("Plain lyrics exceed the 1 million character limit.")
            relative = (folder / "lyrics.txt").as_posix()
            atomic_write(Path(output) / relative, plain.rstrip() + "\n")
            entry["plain_path"] = relative
            if "lyrics_path" not in entry:
                entry["lyrics_path"], entry["format"] = relative, "txt"
            entry["files"][relative] = file_hash(Path(output) / relative)
    relative = (folder / "metadata.json").as_posix()
    entry["metadata_path"] = relative
    atomic_write(Path(output) / relative, json_text(entry))
    # The metadata contains lyric hashes; the manifest/state also verify the metadata itself.
    entry["files"][relative] = file_hash(Path(output) / relative)
    return entry


def spreadsheet_safe(value):
    value = "" if value is None else str(value)
    return "'" + value if value.startswith(("=", "+", "-", "@", "\t", "\r")) else value


def export_indexes(output, db):
    entries = [json.loads(row[0]) for row in db.execute("SELECT entry FROM tracks ORDER BY id")]
    manifest = {"version": 1, "provider": "LRCLIB", "tracks": entries}
    atomic_write(Path(output) / "manifest.json", json_text(manifest))
    csv_data = io.StringIO(newline="")
    fields = ["id", "artist", "title", "album", "duration", "status", "reason", "source"]
    writer = csv.DictWriter(csv_data, fieldnames=fields)
    writer.writeheader()
    for entry in entries:
        if entry["status"] not in ("success", "instrumental"):
            writer.writerow({k: spreadsheet_safe(entry.get(k)) for k in fields})
    atomic_write(Path(output) / "unresolved.csv", csv_data.getvalue())
    return dict(Counter(e["status"] for e in entries))


def run(tracks, output, *, retry_unresolved=False, refresh_cache=False, client_factory=LRCLIBClient, log=print, **client_options):
    output = Path(output).resolve()
    served = Path(__file__).resolve().parents[1] / "dist"
    if output.is_relative_to(served):
        raise ValueError("Keep lyrics outside dist so they are not bundled with the published app.")
    counts = Counter()
    with output_lock(output):
        db = open_state(output)
        try:
            client = client_factory(db, log=log, **client_options)
            if refresh_cache:
                db.execute("DELETE FROM http_cache")
                db.commit()
            seen = set()
            for number, track in enumerate(tracks, 1):
                if track.key in seen:
                    counts["duplicate_inputs"] += 1
                    continue
                seen.add(track.key)
                row = db.execute("SELECT entry FROM tracks WHERE id=?", (track.key,)).fetchone()
                prior = json.loads(row[0]) if row else None
                if prior and prior["status"] != "error" and not (retry_unresolved and prior["status"] not in ("success", "instrumental")) and intact(output, prior):
                    counts["skipped"] += 1
                    log(f"[{number}] skipped | {track.artist} / {track.title}")
                    continue
                access_error = None
                try:
                    track.validate()
                    status, record, candidates, reason = retrieve(track, client)
                except ValueError as exc:
                    status, record, candidates, reason = "invalid", None, [], str(exc)
                except ApiError as exc:
                    status, record, candidates, reason = "error", None, [], str(exc)
                    if isinstance(exc, AccessError):
                        access_error = exc
                entry = write_result(output, track, status, record, candidates, reason)
                db.execute("INSERT OR REPLACE INTO tracks VALUES (?,?)", (track.key, json_text(entry)))
                db.commit()
                counts[status] += 1
                log(f"[{number}] {status} | {track.artist} / {track.title}")
                if number % 25 == 0:
                    export_indexes(output, db)
                if access_error:
                    raise access_error
        finally:
            try:
                export_indexes(output, db)
            finally:
                db.close()
    return dict(counts)
