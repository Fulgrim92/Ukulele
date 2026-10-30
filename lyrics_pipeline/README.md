# Batch lyrics and ukulele karaoke

This reusable Python 3.10+ CLI reads a music library or song list, queries the documented LRCLIB API sequentially, and saves a separate local collection. It does not scrape websites, extract YouTube captions, change music files, or embed lyrics in source code. All development fixtures and demonstrations use original synthetic lyrics. No commercial lyrics were downloaded during implementation.

## Quick start on this computer

Open a terminal in `H:\AI_Code\Guitar learning\four-strings`. The `lyrics.cmd` launcher finds the configured local Python runtime and the project-local audio-tag dependency, already installed here.

### Double-click download for the app's songbook

Double-click **`Pull-Songbook-Lyrics.cmd`** in the project folder. It looks up all 71 catalogue entries (47 medley + 12 acoustic + 12 oldies), prefers synchronized LRC, falls back to TXT, and reuses **`lyrics-output\axis`** for progress and cached responses. It then automatically prepares **`lyrics-output\axis-karaoke`**, recovering plain text where compatible versions agree and retaining LRC only when cached timing versions also agree. Run it again to resume. The window stays open at the end when launched without arguments. Ctrl+C stops the run with completed work saved.

After downloading, open **Practice studio → Import lyric collection** in Four Strings and select the **`lyrics-output\axis-karaoke`** folder. Review the matches and import them. This last folder selection is required by the browser's local-file permissions; downloading does not itself change your browser's saved app data. **`Pull-Acoustic-Lyrics.cmd`** limits new requests to Ed Sheeran, Noah Rinker, Hozier and the other acoustic additions. **`Update-Phone-Karaoke.cmd`** prepares the existing cache offline and rebuilds the APK, using the installed Android build tools. It does not retrieve more songs; run a Pull launcher first.

Missing lyrics and uncertain recording versions appear in **`unresolved.csv`**; the downloader does not guess a version or promise every song will be available. Supply album and duration in a separate song list when you need to identify a specific recording.

Optional commands from the project folder:

```powershell
# Verify the launcher offline with original synthetic lyrics
.\Pull-Songbook-Lyrics.cmd --demo

# Revisit unresolved entries using fresh provider responses
.\Pull-Songbook-Lyrics.cmd --retry-unresolved --refresh-cache

# Choose a different output folder
.\Pull-Songbook-Lyrics.cmd --output "D:\My Lyrics"
```

Additional options are forwarded to `lyrics.cmd run`. `--demo` uses the separate `lyrics-output\pull-demo` folder and makes no network requests.

### Other libraries and song lists

The expanded catalogue includes **47 Axis + 12 acoustic + 12 new Oldies = 71** unique identities. `Pull-Songbook-Lyrics.cmd` covers all 71. `Pull-Oldies-Lyrics.cmd` uses `examples/oldies-song-list.json` for the twelve new songs plus existing With or Without You and Let It Be. Their existing IDs and cached results are retained. The prepared import and phone rebuild steps remain unchanged; no downloaded text is stored in source control.

```powershell
# Completely offline demonstration
.\lyrics.cmd demo --output lyrics-output\synthetic-demo

# Entire MP3/FLAC folder, including subfolders
.\lyrics.cmd run --library "D:\My Music" --output "D:\My Lyrics"

# CSV / JSON lists; repeat --library or --songs to combine inputs
.\lyrics.cmd run --songs "my-songs.csv" --output "D:\My Lyrics"

# All 47 song identities already used by Four Strings
.\lyrics.cmd run --songs lyrics_pipeline\examples\axis-song-list.json --output lyrics-output\axis

# Resume: run the same command again. Valid outputs are skipped.
# Recheck previously missing / ambiguous entries using fresh provider responses:
.\lyrics.cmd run --songs "my-songs.csv" --output "D:\My Lyrics" --retry-unresolved --refresh-cache

# Extract tags to a reviewable list without requesting lyrics
.\lyrics.cmd scan --library "D:\My Music" --output "my-songs.csv"
```

On another machine, create a Python environment and install the single optional dependency for MP3/FLAC reading:

```text
python -m venv .venv
.venv\Scripts\python -m pip install -r requirements-lyrics.txt
.venv\Scripts\python -m lyrics_pipeline --help
```

On macOS/Linux use `.venv/bin/python`. CSV/JSON acquisition and the offline demo use only Python's standard library.

CSV columns are `artist,title,album,duration`. JSON accepts an array or an object containing a `tracks`/`songs` array; aliases `artist_name`, `track_name`, `album_name`, and `duration_seconds` are supported. Durations use seconds, `mm:ss` or `hh:mm:ss`. Artist/title are required. Album and duration are optional, but omitting them increases ambiguity. The prepared 47-song list contains identities only: audio-library scanning supplies accurate album/duration automatically. Filename guesses never replace missing audio tags.

## Match and request behavior

- First request `/api/get` using artist, title, album and duration when known. Validate the returned metadata independently.
- Fall back to `/api/search` when necessary. Also search if album or duration is missing, so a single signature result does not hide alternate releases.
- Require normalized artist/title equality. Version words such as live, remix and cover remain significant. If supplied, album must agree and duration must be within two seconds. Conservative checks can leave legitimate compilation/remastered editions unresolved.
- Prefer valid synchronized LRC. Plain TXT is the fallback; a TXT companion is also saved for LRC, derived from timestamped text if needed. Instrumentals are explicitly recorded without inventing lyrics.
- If several recording identities or conflicting lyric versions remain, mark ambiguous instead of selecting the first result. A search currently returns at most 20 results; the pipeline cannot guarantee coverage or identify undocumented versions.
- One request at a time, one-second default spacing, identifying User-Agent, 25-second timeout and four retries. Retry network failures, 429 and 5xx; honor numeric/date `Retry-After` plus jitter. Stop the batch on 401/403. Other 4xx responses are recorded without retry loops.
- Successful responses are cached for 24 hours; missing signature responses for one hour. Errors are not cached. Optional registered access uses `LRCLIB_APP_ID` / `LRCLIB_API_KEY` environment variables, never source files or command-line arguments. Anonymous access is supported.

API access and availability do not establish a blanket redistribution license for every lyric. Use acquired material according to your rights and applicable provider terms; this tool does not publish it or assert a license. No access controls are bypassed. Documentation: [LRCLIB API](https://lrclib.net/docs), [Mutagen tag reader](https://mutagen.readthedocs.io/en/latest/user/gettingstarted.html).

## Files, resume and reports

```text
My Lyrics/
  manifest.json
  unresolved.csv
  Artist/
    Album/
      Song--stable-id/
        lyrics.lrc       # when synchronized text is available
        lyrics.txt       # plain text / companion
        metadata.json    # input identity, provider ID, status, reason, provenance
  .pipeline/
    state.sqlite3        # completed state + response cache
    run.lock             # prevents concurrent writers; released if the process exits
```

Writes are atomic and state commits after each track. Reports are refreshed every 25 inputs and on exit, including Ctrl+C. Rerun the same command to resume. Successful/instrumental, missing, ambiguous and invalid entries are skipped by default; transient `error` entries retry automatically. `--retry-unresolved` revisits other unresolved statuses. Hash validation repairs missing/corrupted outputs from cache where possible. Duplicate input identities are skipped. CSV cells are protected against spreadsheet formulas.

Neither successful matches nor complete coverage are guaranteed. Missing tags, unavailable lyrics, alternate versions and denied access appear in the report. Partial batch completion is retained after an error. Keep the output outside `dist`; the default `lyrics-output` folder is Git-ignored and excluded from the published site. Cache/state files contain provider responses and local source paths, so treat them as part of your private collection.

## Load in Four Strings

For the app's existing 47-song catalogue, use **Songbook → Find songbook lyrics → Find lyrics for my songbook**. This runs the acquisition workflow directly in your browser; the Python CLI and folder import are optional for the existing songs. It uses the documented LRCLIB endpoints and the same conservative artist/title/version, album and duration checks. Metadata for this catalogue does not include a specific album or recording duration, so multiple valid versions need a recording choice instead of being guessed.

Matching LRC/TXT is saved to the current song automatically and stays outside the deployed source code. The **Ready to sing** filter shows songs that already have lyrics. Pause or close the panel to stop lookup; reopen and resume without redoing saved songs. **Retry unresolved** requests fresh results for missing/ambiguous entries. A chosen version is fetched by provider ID and revalidated before saving. Manually pasted or imported lyrics are retained.

The browser client identifies itself with the documented `Lrclib-Client` header, sends requests sequentially at one-second intervals, caches provider responses locally with expiry, honors readable `Retry-After` headers (with a conservative one-minute fallback for 429 responses when the header is absent or hidden by CORS), stops on denied access, and prevents concurrent lookup jobs across tabs where Web Locks is available. Request retries and timeouts are bounded. Completed lyrics are included in the app's existing backup format; lookup status and response caches are browser-local. Clearing browser storage removes them. Results are not preloaded, shared across devices, or automatically published with the website. The full acquisition UI is tested against synthetic local responses; development does not fetch a commercial lyric corpus.

In **Practice studio → Import lyric collection**, choose the pipeline output folder. The browser reads `manifest.json`, matches successful tracks against the songbook by artist/title, and loads the corresponding LRC/TXT files dynamically. Multiple recordings for the same song are skipped for review. Existing saved lyrics are kept. Alternatively select up to 100 individual TXT/LRC files at once, named `Artist - Title.lrc` or `Title.txt`. Review the matches and press **Import matched songs** once.

The web app remains local-first: files are read in your browser and saved with your existing backup data. The batch importer is limited to 100 matched songs / one million characters per import; the Python pipeline handles larger libraries. Refresh the browser import after changing external files; browsers cannot silently monitor an arbitrary local folder.

LRC highlights follow practice time after count-in, updated each eighth-note subdivision. The reference tempo defaults to the song's learning arrangement and can be adjusted in Edit to match the recording used by the LRC; this lets lyrics slow down with the practice tempo. They are recording-specific. Adapted repeats and different bar lengths can require adjusted timing. The first-bar setting adds a lead-in; manual arrows and approximate bars remain available. The external YouTube player is not synchronized by this feature.

Use **Build the song** to loop one section, extend the range to rehearse transitions, then switch to the full song. Original song-bar positions are preserved, so imported lyric cues follow a selected section's place in the full arrangement. This supports line-level karaoke, not syllable highlighting or vocal scoring.

Other Python software can load a collection without putting lyrics in its source:

```python
from lyrics_pipeline.runtime import load_manifest, load_lyrics
collection = load_manifest(r"D:\My Lyrics")
track = next(t for t in collection["tracks"] if t["status"] == "success")
content = load_lyrics(r"D:\My Lyrics", track["id"])
# content["text"] is loaded from the external file when requested.
```

## Verification

```text
python -m unittest discover -s lyrics_pipeline/tests -v
npm test
npm run check
```

Tests use synthetic API responses and original fixture text. They cover real MP3/FLAC tag reading from synthetic files, matching and ambiguity, retries/rate limits/cache expiry, permission denial, interrupted runs, output corruption repair, manifest loading, safe paths and CSV reports. A 1,000-track synthetic run verifies resume without further requests. No live lyric acquisition is performed by the test suite.
