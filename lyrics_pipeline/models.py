from dataclasses import asdict, dataclass
import hashlib
import json
import math
import unicodedata


def normalize(value):
    return "".join(c for c in unicodedata.normalize("NFKD", str(value)).casefold() if c.isalnum())


@dataclass(frozen=True)
class Track:
    artist: str
    title: str
    album: str = ""
    duration: float | None = None
    source: str = ""
    input_error: str = ""

    @property
    def key(self):
        identity = [normalize(self.artist), normalize(self.title), normalize(self.album), self.duration]
        if self.input_error:
            identity.append(self.source)
        return hashlib.sha256(json.dumps(identity, ensure_ascii=False).encode()).hexdigest()[:24]

    def as_dict(self):
        result = asdict(self)
        if self.duration is not None and not math.isfinite(self.duration):
            result["duration"] = None
        return result

    def validate(self):
        if self.input_error:
            raise ValueError(self.input_error)
        if not self.artist.strip() or not self.title.strip():
            raise ValueError("Artist and title are required; filename guessing is disabled.")
        if any(len(v) > 1000 for v in (self.artist, self.title, self.album)):
            raise ValueError("Track tags must be under 1,000 characters.")
        if self.duration is not None and (not math.isfinite(self.duration) or self.duration <= 0):
            raise ValueError("Duration must be a positive number of seconds.")
