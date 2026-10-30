"""Sequential documented LRCLIB requests, with persistent response cache."""
from datetime import datetime, timezone
from email.utils import parsedate_to_datetime
import hashlib
import json
import math
import os
import random
import time
import urllib.error
import urllib.parse
import urllib.request

BASE_URL = "https://lrclib.net"
DEFAULT_AGENT = "FourStringsLyrics/1.0 (https://four-strings-christian.christian-wolf96.chatgpt.site)"


class ApiError(RuntimeError):
    pass


class AccessError(ApiError):
    """Stop the batch on denied access; do not try alternate endpoints."""


class SameOriginRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        target = urllib.parse.urlparse(newurl)
        if target.scheme != "https" or target.netloc != "lrclib.net":
            raise AccessError("Provider redirected outside its HTTPS origin; batch stopped.")
        return super().redirect_request(req, fp, code, msg, headers, newurl)


def reject_nonfinite(value):
    raise ValueError("Non-finite JSON value")


def transport(url, headers, timeout):
    request = urllib.request.Request(url, headers=headers)
    try:
        response = urllib.request.build_opener(SameOriginRedirect()).open(request, timeout=timeout)
    except urllib.error.HTTPError as exc:
        response = exc
    with response:
        body = response.read(5_000_001)
        if len(body) > 5_000_000:
            raise ApiError("Response exceeded the 5 MB safety limit.")
        return response.code, dict(response.headers), body


def retry_seconds(value, now=None):
    try:
        return max(0, float(value))
    except (ValueError, TypeError):
        try:
            date = parsedate_to_datetime(value)
            if date.tzinfo is None:
                date = date.replace(tzinfo=timezone.utc)
            return max(0, date.timestamp() - (now if now is not None else datetime.now(timezone.utc).timestamp()))
        except (ValueError, TypeError, OverflowError):
            return 0


class LRCLIBClient:
    def __init__(self, db, *, interval=1.0, retries=4, timeout=25, user_agent=DEFAULT_AGENT,
                 send=transport, sleep=time.sleep, clock=time.monotonic, wall=time.time,
                 jitter=random.uniform, log=lambda message: None):
        if not math.isfinite(interval) or not math.isfinite(timeout) or interval < .25 or retries < 0 or timeout <= 0:
            raise ValueError("Use an interval of at least 0.25 seconds, nonnegative retries and a positive timeout.")
        if not user_agent.strip() or "\n" in user_agent or "\r" in user_agent:
            raise ValueError("Provide a valid identifying User-Agent.")
        self.db, self.interval, self.retries, self.timeout = db, interval, retries, timeout
        self.send, self.sleep, self.clock, self.wall, self.jitter, self.log = send, sleep, clock, wall, jitter, log
        self.last_request = None
        self.headers = {"User-Agent": user_agent, "Accept": "application/json"}
        for env, header in [("LRCLIB_APP_ID", "Lrclib-App-Id"), ("LRCLIB_API_KEY", "Lrclib-Api-Key")]:
            if os.environ.get(env):
                self.headers[header] = os.environ[env]
        self.db.execute("CREATE TABLE IF NOT EXISTS http_cache (key TEXT PRIMARY KEY, expires REAL, status INTEGER, payload TEXT)")
        self.db.commit()

    def get(self, endpoint, params):
        if endpoint not in ("/api/get", "/api/search"):
            raise ValueError("Only documented read-only endpoints are supported.")
        url = BASE_URL + endpoint + "?" + urllib.parse.urlencode(sorted(params.items()))
        key = hashlib.sha256(url.encode()).hexdigest()
        cached = self.db.execute("SELECT expires,status,payload FROM http_cache WHERE key=?", (key,)).fetchone()
        if cached and cached[0] > self.wall():
            return None if cached[1] == 404 else json.loads(cached[2])
        for attempt in range(self.retries + 1):
            if self.last_request is not None:
                self.sleep(max(0, self.interval - (self.clock() - self.last_request)))
            self.last_request = self.clock()
            try:
                status, headers, body = self.send(url, self.headers, self.timeout)
            except (urllib.error.URLError, TimeoutError, OSError) as exc:
                if attempt == self.retries:
                    raise ApiError(f"Network request failed after {attempt + 1} attempts ({type(exc).__name__}).") from exc
                self._wait(attempt, 0)
                continue
            headers = {k.lower(): v for k, v in headers.items()}
            if status in (401, 403):
                raise AccessError(f"LRCLIB denied access (HTTP {status}); batch stopped.")
            if status == 429 or 500 <= status <= 599:
                delay = retry_seconds(headers.get("retry-after"), self.wall())
                if attempt == self.retries:
                    # Honor a final server cooldown before another track can make a request.
                    self._wait(attempt, delay)
                    raise ApiError(f"LRCLIB HTTP {status}; retry limit reached.")
                self._wait(attempt, delay)
                continue
            if status == 404:
                payload = None
            elif status != 200:
                raise ApiError(f"LRCLIB HTTP {status}; request was not retried.")
            else:
                if "application/json" not in headers.get("content-type", "").lower():
                    raise ApiError("LRCLIB returned a non-JSON response.")
                try:
                    payload = json.loads(body, parse_constant=reject_nonfinite)
                except (ValueError, UnicodeDecodeError) as exc:
                    raise ApiError("LRCLIB returned invalid JSON.") from exc
                if not isinstance(payload, (dict, list)):
                    raise ApiError("LRCLIB returned an invalid record shape.")
            self.db.execute("INSERT OR REPLACE INTO http_cache VALUES (?,?,?,?)", (key, self.wall() + (3600 if status == 404 else 86400), status, json.dumps(payload)))
            self.db.commit()
            return payload
        raise ApiError("Retry limit reached.")

    def _wait(self, attempt, server_delay):
        delay = max(server_delay, min(60, 2 ** attempt))
        delay += self.jitter(0, delay * .3)
        self.log(f"Waiting {delay:.1f}s before continuing LRCLIB requests.")
        self.sleep(delay)
