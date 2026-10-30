"""Synthetic end-to-end demonstration. Never contacts LRCLIB."""
import json
import urllib.parse
from .client import LRCLIBClient
from .models import Track
from .pipeline import run

ARTIST = "Four Strings Test Ensemble"
ALBUM = "Synthetic Practice Collection"
TRACKS = [Track(ARTIST, "Practice Dawn", ALBUM, 120), Track(ARTIST, "Quiet Noon", ALBUM, 90),
          Track(ARTIST, "Echo Study"), Track(ARTIST, "Silent Interval", ALBUM, 60),
          Track(ARTIST, "Unwritten Tune", ALBUM, 80)]


def synthetic_record(title, **changes):
    record = {"id": 101, "artistName": ARTIST, "trackName": title, "albumName": ALBUM, "duration": 120,
              "instrumental": False, "syncedLyrics": "[00:00.00]One small chord begins the day\n[00:04.00]Four soft strings can lead the way",
              "plainLyrics": "One small chord begins the day\nFour soft strings can lead the way"}
    return {**record, **changes}


def synthetic_transport(url, headers, timeout):
    parsed = urllib.parse.urlparse(url)
    title = urllib.parse.parse_qs(parsed.query)["track_name"][0]
    record = {
        "Practice Dawn": synthetic_record("Practice Dawn"),
        "Quiet Noon": synthetic_record("Quiet Noon", duration=90, syncedLyrics=None, plainLyrics="Rest the hand and find the beat\nLet the practice sound complete"),
        "Silent Interval": synthetic_record("Silent Interval", duration=60, instrumental=True, syncedLyrics=None, plainLyrics=None),
        "Echo Study": synthetic_record("Echo Study"),
    }.get(title)
    if parsed.path.endswith("/search"):
        records = [] if record is None else [record]
        if title == "Echo Study":
            records.append({**record, "id": 102, "albumName": "Synthetic Alternate Edition"})
        return 200, {"Content-Type": "application/json"}, json.dumps(records).encode()
    return (200, {"Content-Type": "application/json"}, json.dumps(record).encode()) if record else (404, {}, b"")


def run_demo(output, log=print):
    return run(TRACKS, output, client_factory=lambda db, **options: LRCLIBClient(db, send=synthetic_transport, sleep=lambda delay: None, **options), log=log)
