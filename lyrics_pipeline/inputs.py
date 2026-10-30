"""Read-only music tags and streaming song-list input."""
import csv
import json
from pathlib import Path
from .models import Track


def duration_seconds(value):
    if value is None or str(value).strip() == "":
        return None
    if isinstance(value, str) and ":" in value:
        parts = value.split(":")
        if len(parts) not in (2, 3) or any(float(v) < 0 for v in parts):
            raise ValueError("Duration needs seconds, mm:ss or hh:mm:ss.")
        result = 0.0
        for part in parts:
            result = result * 60 + float(part)
        return result
    return float(value)


def row_track(row, source):
    if not isinstance(row, dict):
        return Track("", "", source=source, input_error="Each song must be an object.")
    row = {str(k).lower().strip(): v for k, v in row.items()}
    def text(*keys):
        value = next((row[k] for k in keys if k in row and row[k] is not None), "")
        return str(value).strip()
    try:
        return Track(text("artist", "artist_name", "artistname"), text("title", "track_name", "trackname"), text("album", "album_name", "albumname"), duration_seconds(row.get("duration", row.get("duration_seconds"))), source)
    except (ValueError, TypeError, OverflowError):
        return Track(text("artist", "artist_name"), text("title", "track_name"), text("album"), source=source, input_error="Invalid duration.")


def song_list(path):
    path = Path(path)
    with path.open(encoding="utf-8-sig", newline="") as handle:
        if path.suffix.lower() == ".csv":
            for number, row in enumerate(csv.DictReader(handle), 2):
                yield row_track(row, f"{path}:{number}")
        elif path.suffix.lower() == ".json":
            rows = json.load(handle)
            if isinstance(rows, dict):
                rows = rows.get("tracks", rows.get("songs"))
            if not isinstance(rows, list):
                raise ValueError("JSON input needs an array, or a tracks/songs array.")
            for number, row in enumerate(rows, 1):
                yield row_track(row, f"{path}:{number}")
        else:
            raise ValueError("Song lists must be CSV or JSON.")


def audio_track(path, reader=None):
    if reader is None:
        try:
            from mutagen import File
        except ImportError as exc:
            raise RuntimeError("Audio scanning needs mutagen. Install requirements-lyrics.txt first.") from exc
        reader = File
    try:
        audio = reader(str(path), easy=True)
        if audio is None:
            raise ValueError("Unsupported or damaged audio file.")
        tags = audio.tags or {}
        def first(key):
            values = tags.get(key, [])
            return str(values[0] if isinstance(values, (list, tuple)) and values else values or "").strip()
        return Track(first("artist"), first("title"), first("album"), float(audio.info.length), str(path))
    except Exception as exc:
        return Track("", Path(path).stem, source=str(path), input_error=f"Could not read audio tags: {type(exc).__name__}")


def library_tracks(path, reader=None):
    root = Path(path)
    if not root.is_dir():
        raise ValueError(f"Music library folder not found: {root}")
    # Reject a missing dependency before walking thousands of files.
    if reader is None:
        try:
            from mutagen import File
        except ImportError as exc:
            raise RuntimeError("Audio scanning needs mutagen. Install requirements-lyrics.txt first.") from exc
        reader = File
    for file in sorted(root.rglob("*")):
        if file.is_file() and file.suffix.lower() in {".mp3", ".flac"}:
            yield audio_track(file, reader)
