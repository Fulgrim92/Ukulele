# Verification — 29 October 2026

## Passed

- JavaScript syntax checks for every application module (`npm run check`).
- 18 automated tests (`npm test`): chord pitch classes for all eighteen included shapes, 47 unique catalogue entries, complete song structures and all 46 sourced additional arrangements, valid lesson checks, transposition (including slash-bass and split-bar names), sheet parsing and repeats, half- and quarter-bar scheduling, malformed/oversized sheets, HTML escaping, calendar streaks, backup validation, strumming subdivisions, and pitch detection.
- Pitch detector tests use harmonic-rich synthetic signals at 261.626, 329.628, 391.995 and 440 Hz, at both 44.1 and 48 kHz; detected pitch must fall within 5 cents. An octave-selection defect found by these tests was repaired.
- HTTP preview returns status 200.
- Browser: home rendering; guided lesson; incorrect answer keeps completion disabled; correct answer allows completion; lesson progress persists after reload.
- Browser: Axis collection filter shows exactly 47 songs; search finds Auld Lang Syne with its full practice sheet; source and full-recording/chart links are present.
- Browser: Auld Lang Syne opens as 80 bars with 10 sections; count-in starts; controls lock during playback; the displayed chord advances from C to G; pause records active time and displays it in the practice journal.
- Browser: original test-only song created with a lyric cue, persisted across reload, and played to its finite ending; player displays SESSION COMPLETE and stops automatically.
- Browser: JSON backup download succeeds; clean backup upload is parsed, confirmation describes its contents, and restore clears disposable test progress and songs.
- Browser: phone layout checked at a 390 × 844 viewport override (effective content width 375 due to browser scrollbar); no horizontal overflow. Responsive home, bottom navigation, and readable chord cards inspected visually.
- Browser console: no warnings or errors in the inspected working flows.

## Limits

- Physical microphone capture, real-instrument tuning accuracy, user permission prompts, subjective speaker sound quality, and Safari/iOS/Android behavior require device testing. They are not claimed as verified. Microphone pitch processing itself has the synthetic-signal coverage above.
- This is a self-guided teacher; the app does not detect the user's fretting, rhythm, or chord accuracy.
- Every song has a finite learning accompaniment. The 46 researched chord charts have browsed direct public-library references and explicit adaptation notes. Authored bar lengths, repeats, reharmonizations and endings are not recording-verified timing. The chart library is not claimed to be a set of exact transcriptions or to use only four chords throughout. Two complete lyric-and-chord learning sheets are included; copyrighted full lyrics, recordings and melody scores are linked or user-supplied.
- Auld Lang Syne has an original simplified accompaniment. It is not an exact reproduction of a specific commercial arrangement.

## Reproduce

Use `npm test`, `npm run check`, and `npm start`. Preview at http://127.0.0.1:4173. `tests/clean-backup.json` is a disposable empty backup for import testing; importing it replaces the current browser's progress after the app's confirmation step.

## Illustrated songbook update

- Desktop and phone layouts visually inspected for the new original ukulele artwork and illustrated songbook. Home, songbook and instrument guide all had equal viewport and document widths at the phone breakpoint, with no horizontal overflow.
- Interactive instrument guide: selecting “Fingerboard & frets” updates the explanation and the highlighted instrument detail. Source reference is linked visibly.
- Chord library: all 14 extra shape cards appear alongside the four foundation shapes. Every included arrangement chord has a fingering and ukulele reference voicing; automated pitch-class tests cover all eighteen.
- Axis collection reports exactly 47 entries, all 47 with a ready sheet badge. All 46 added charts parse into finite named sections; Auld Lang Syne remains the 47th complete arrangement.
- Hey, Soul Sister shows its complete 112-bar authored learning form, the F-starting chorus, split-bar C/G changes, direct harmony/lyric reference, chord-shape buttons and the practice action.
- “Add my lyrics” opens a personal-copy editor with the entire existing chord arrangement preserved; closing without saving leaves the original intact.
- Studio test: Hey, Soul Sister chorus selection starts on F, displays the C/G split bar in its queue, advances through the chosen section, and pauses successfully. No browser warnings or errors were reported in the inspected flows.
- This update preserves the physical-device microphone verification limitation above. The new artwork is decorative and reference-informed; exact commercial recording timing and vocal/score transcription are not claimed.

## Finger-first practice and lyrics update

- 24 automated tests pass. New coverage includes next-shape changes inside split bars and at finite endings, left/right-handed string ordering, barre rendering, enharmonic lookup, plain lyric parsing/limits, instrumental lead-ins and bar-follow indices, saved lyric validation, and backward-compatible backup round-tripping with lyrics and remembered practice source.
- Browser checks: large high-contrast current diagram, smaller upcoming diagram, per-finger placement instructions and color legend render; handedness toggle changes the diagram's accessible description and string order.
- Browser checks: original test lyric lines were saved for Hey, Soul Sister; the Next button changed the active line; reloading retained the selected song and its saved lyric text. Disposable test lyrics were then removed.
- Browser checks: Cancel and Remove in the lyric form do not accidentally submit it. This exposed and fixed a pre-existing shared-button default-submit problem, including Cancel buttons in the full song editor.
- Original/public-domain built-in text appears in the lyrics panel beside the finger shapes. Pasted lyrics are manually advanced by default; automatic bar following is explicitly approximate, and uses the chosen first bar and bars per line.
- Commercial lyric text is not bundled or fetched. Direct public-library links and private pasted text remain the supported route for those songs.
- Phone layout checked at a 390 × 844 viewport override (effective document width 375): no horizontal overflow, the current diagram measured about 213 px tall versus 30 px for the chord-name label, and the current lyric appeared above the fingerboard. Desktop places the lyric panel alongside the current/next hand shapes.
- Browser playback test advanced from the original song's instrumental intro into its chorus, updating lyric lines to their saved bar cues. A separate test paused on G and confirmed all three finger markers and the upcoming Am shape. No warnings/errors appeared in the inspected browser log.

## Recorded ukulele and reference-style neck update

- 46 JavaScript tests pass; the unchanged Python pipeline retains its 24-test verification. The audio tests verify all twenty WAV checksums, valid non-clipping data, recorded pitches and A440 corrections, exactly four physical strings per chord, distinct recordings for unison notes, reversed upstroke order, a 39 ms downstroke spread, and playable four-string voicings for all included chords at every supported transposition.

- Karaoke additions: LRC parsing tests cover repeated timestamps, offsets, ordering, instrumental cues, limits, tempo conversion, validation and backward compatible storage. Source-link tests verify safe query encoding and HTTPS destinations.
- Browser QA imported tests/fixtures/karaoke-demo.lrc through the native file chooser, confirmed four timed lines and automatic LRC selection, saved and played the result, observed advancement from line 1 to line 4, and verified persistence after reload. Test lyrics were removed afterward. The supplied UkuTabs reference appears for You're Beautiful. At 390 x 844 the content width was 375 pixels with no horizontal overflow. Browser error/warning logs were empty.
- External lyric/video sources open separately; no live video synchronization, provider API licensing, or full commercial lyric availability is claimed.
- Collection browser QA selected a synthetic pipeline output folder, previewed two title/artist matches, imported both in one step and confirmed LRC/manual modes. Synthetic imports were removed afterward. No commercial lyric text was acquired during development.
- Section browser QA looped Intro alone, extended Intro through Verse 1, then switched to full-song playback. Original bar offsets are retained for lyric alignment; automated tests cover ranges and loop boundaries. LRC reference-tempo settings let lines slow with practice tempo.
- Python tests cover sequential/cache/retry logic, Retry-After dates and delays, access denial and redirects, exact version matching, CSV/JSON input, real Mutagen reads of synthetic MP3/FLAC fixtures, interruption recovery, file integrity repair, runtime path checks and unresolved reports. A synthetic 1,000-track run completed and resumed with zero additional requests. The CLI demo was also run separately with network-free synthetic transport.

- Browser acquisition tests exercise exact artist/title/version matching, optional album/duration checks, LRC preference and TXT fallback, cache expiry/refresh, request spacing, identifying headers, Retry-After and network retries, denial, cancellation, timeout, selected-version revalidation, preserving existing lyrics, interrupted jobs and storage errors. Resume metadata excludes lyric text and validates known catalogue IDs/fingerprints.
- Local QA uses `node server.mjs --port 4174 --synthetic-lyrics`. This rewrites the client import only in the local development server and routes every acquisition request to synthetic responses; the test adapter is never placed in dist or deployed. No live lyric corpus is fetched. The normal deployed client always uses HTTPS LRCLIB with omitted credentials.
- End-to-end browser QA paused after the first saved song, reloaded and resumed all 47 catalogue entries, left a missing song and ambiguous versions unresolved, selected one recording version, and confirmed that its lyrics appeared in practice and advanced to line 2 of 2 during playback. The Ready to sing filter showed the expected fixture-derived entries. Mobile QA at 390 x 844 had a 375-pixel page width and a 343-pixel dialog, without horizontal overflow; inspected browser logs were empty. Fixture results do not represent live LRCLIB coverage.
- A live OPTIONS-only request verified HTTP 200, wildcard CORS origin and explicit support for the Lrclib-Client header. It requested no lyrics. Live lyric availability and exact timing against recordings remain unverified. Retry-After may not be browser-readable on all responses; absent 429 headers use a one-minute cooldown plus jitter.
- The offline C–G–Am–F demo uses the same strum plans and real samples. Its measured peak is 0.568 or less, without clipping.
- The chord-library browser check displayed the new headstock, nut, four strings, five frets and exact finger dots. Clicking Hear chord completed and displayed the C-major reference confirmation; the inspected console had no warnings or errors.
- The sound is made from real concert-ukulele string recordings, not generic oscillators or a guitar preset. Speaker/headphone differences and subjective realism are not claimed as measured listening tests.
- The neck illustration is vector-based and informed by the user's reference. Its four-string count, nut presence, orientation, C/G placements and barre markers have automated coverage.
