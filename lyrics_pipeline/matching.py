"""Conservative matching: reject version changes rather than guessing."""
import math
import re
from .models import normalize

STAMP = re.compile(r"^\[\d{1,3}:[0-5]\d(?:[.:]\d{1,3})?\]", re.M)


def usable_lrc(value):
    return isinstance(value, str) and bool(STAMP.search(value)) and len(value) <= 1_000_000


def candidate_summary(record):
    return {k: record.get(k) for k in ("id", "artistName", "trackName", "albumName", "duration", "instrumental")}


def compatible(track, record, tolerance=2.0):
    if not isinstance(record, dict):
        return False
    if normalize(track.artist) != normalize(record.get("artistName", "")):
        return False
    if normalize(track.title) != normalize(record.get("trackName", "")):
        return False
    # Keep parentheses and suffix words semantically: live/remix/cover variants do not collapse to the base title.
    if track.album and normalize(track.album) != normalize(record.get("albumName", "")):
        return False
    if track.duration is not None:
        try:
            duration = float(record.get("duration"))
            if not math.isfinite(duration) or abs(duration - track.duration) > tolerance:
                return False
        except (ValueError, TypeError):
            return False
    return True


def choose_match(track, records, tolerance=2.0):
    valid = [r for r in records if compatible(track, r, tolerance)]
    # Collapse duplicate records only when identity AND lyric payloads agree.
    unique = {}
    for record in valid:
        key = (normalize(record.get("artistName", "")), normalize(record.get("trackName", "")), normalize(record.get("albumName", "")), str(record.get("duration")), str(record.get("syncedLyrics")), str(record.get("plainLyrics")), bool(record.get("instrumental")))
        unique.setdefault(key, record)
    candidates = list(unique.values())
    if not candidates:
        return "missing", None, [candidate_summary(r) for r in records if isinstance(r, dict)], "No candidate satisfied artist, title, album and duration checks."
    # Prefer timed text for otherwise identical recording identities.
    identities = {(normalize(r.get("albumName", "")), str(r.get("duration"))) for r in candidates}
    if len(identities) == 1:
        timed = [r for r in candidates if usable_lrc(r.get("syncedLyrics"))]
        if len(timed) == 1:
            candidates = timed
    if len(candidates) != 1:
        return "ambiguous", None, [candidate_summary(r) for r in candidates], "Multiple validated versions remain; no lyrics were chosen."
    record = candidates[0]
    if record.get("instrumental") is True:
        return "instrumental", record, [], "Provider marks this recording as instrumental."
    if not usable_lrc(record.get("syncedLyrics")) and not (isinstance(record.get("plainLyrics"), str) and record["plainLyrics"].strip()):
        return "missing", None, [candidate_summary(record)], "Matched record has no supported LRC or plain lyrics."
    return "success", record, [], "Exact normalized metadata match; duration checked when supplied."


def retrieve(track, client, tolerance=2.0):
    params = {"artist_name": track.artist, "track_name": track.title}
    if track.album:
        params["album_name"] = track.album
    # The documented signature endpoint accepts durations only up to one hour.
    if track.duration is not None and 1 <= track.duration <= 3600:
        params["duration"] = round(track.duration, 3)
    direct = client.get("/api/get", params)
    if isinstance(direct, dict):
        outcome = choose_match(track, [direct], tolerance)
        if outcome[0] in ("success", "instrumental") and track.album and track.duration is not None:
            return outcome
    search_params = {"artist_name": track.artist, "track_name": track.title}
    if track.album:
        search_params["album_name"] = track.album
    records = client.get("/api/search", search_params)
    return choose_match(track, records if isinstance(records, list) else [], tolerance)
