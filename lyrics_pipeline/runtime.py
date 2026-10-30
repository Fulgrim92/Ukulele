"""Load acquired lyrics dynamically from an external output folder."""
import json
from pathlib import Path


def load_manifest(output):
    with (Path(output) / "manifest.json").open(encoding="utf-8") as handle:
        manifest = json.load(handle)
    if manifest.get("version") != 1 or not isinstance(manifest.get("tracks"), list):
        raise ValueError("Unsupported lyric manifest.")
    return manifest


def load_lyrics(output, track_id):
    root = Path(output).resolve()
    track = next((t for t in load_manifest(root)["tracks"] if t["id"] == track_id), None)
    if not track or track["status"] != "success":
        return None
    path = (root / track["lyrics_path"]).resolve()
    if not path.is_relative_to(root):
        raise ValueError("Lyric path escapes the collection folder.")
    return {"format": track["format"], "text": path.read_text(encoding="utf-8"), "metadata": track}
