# Four Strings

A browser-based teacher for a four-string ukulele in standard high-g tuning (g4 C4 E4 A4). No installation, account API, or API key is needed to run the app locally.

## Run

Requires Node.js 20 or newer. From this folder run `npm start`, then open http://127.0.0.1:4173. Stop the server with Ctrl+C. All application assets are in `dist/`; any static HTTPS host can serve that directory. Google Fonts is optional; system font fallbacks work without it.

## Android phone app

The native Android project and personal APK build instructions are in [mobile/README.md](mobile/README.md). Run `npm ci`, then `npm run android:apk` with JDK 21 and Android SDK 36 configured. Optional local lyric imports can be included in a private build without committing their text to GitHub. The app bundles lessons, arrangements and recorded ukulele sounds for offline practice.

## Learn and practice

- Eight guided lessons with knowledge checks and self-assessed playing exercises.
- Verified C (0003), G (0232), Am (2000), and F (2010) shapes, string order, finger positions, and notes; mirrored left-handed diagrams.
- Real recorded concert-ukulele chord sounds, a one-bar count-in, 35–160 BPM metronome, three strumming patterns, chord-order variations, and transposition.
- Complete-sheet playback with section selection, looping, coaching/lyric cues, a finite ending, and two- or four-chord split bars.
- Original researched concert-ukulele painting, interactive six-part instrument guide, and eighteen available chord shapes.
- Finger-first studio: large numbered/color-coded fretting diagram, string and fret labels, open-string markers, barre shapes, per-finger instructions, handedness switch, and an upcoming-shape preview. The chord name is a small label and playback controls stay above the diagram.
- Lyrics beside the hands: the original practice song and public-domain Auld Lang Syne use their saved chord cues. For any song, paste plain lyric text into the studio's **Add lyrics** editor. The current line and following lines remain visible, with previous/next buttons, all-lines navigation, and optional approximate follow at 1/2/4/8 bars per line. Manual lyric advancement remains the default for pasted text. Full commercial lyrics are not fetched automatically.
- Reference-tone and microphone pitch tuner. Microphone audio is processed locally and capture stops when leaving the tuner or hiding the tab. HTTPS or localhost is required for microphone access.
- Active playback history, daily goals, streaks, favorites, and JSON backup export/import. Data lives only in the current browser/origin. Localhost and the deployed site have separate storage; move between them with backups.
- Per-song lyric text/settings and the last selected practice song are preserved across reloads and included in the same backups. Older version-1 backups remain compatible.

## Content boundaries

The catalogue contains all 47 entries listed in The Axis of Awesome's official **2011 music video**: https://www.youtube.com/watch?v=oOlDewpCfZQ. Other performances have different song lists. All 47 now have complete finite learning forms: 46 independently authored chord arrangements plus the public-domain Auld Lang Syne sheet. Each researched chart links directly to its public harmony reference. The C–G–Am–F exercise remains available separately.

These are original teaching adaptations, not reverse-engineered or recording-synchronized transcriptions. Harmony was researched in public chord libraries; section lengths, repeats, regularized rhythm and finite endings are authored practice choices. Some songs retain extra chords; others use an explicitly explained simplification. A private-use setting does not change the app's content model: copyrighted full lyrics, melody notation and recordings are not bundled. Use the direct chart-and-lyrics link or **Add my lyrics** to create a personal copy of the arrangement and add text you supply.

Two complete lyric-and-chord sheets are provided:

1. **A Little Every Day**: original practice text and arrangement created for this app, 56 bars, including intro, two verses, repeated choruses and outro.
2. **Auld Lang Syne**: all five verses of the public-domain Burns text, from the 1887 edition at https://en.wikisource.org/wiki/The_Poetical_Works_of_Robert_Burns/Auld_Lang_Syne, with our own simplified C/G/F accompaniment, 80 bars. This is a beginner arrangement, not a transcription of the medley. Begin vocal phrases with a pickup before the first full bar.

The other commercial songs' full lyrics, melody scores, original recordings, and full transcriptions are not included. Users can add material they own or have permission to use. The foundation is intentionally extensible through personal song sheets. No automatic music licensing or third-party lyric API is configured.

## Sheet format

```text
[Verse 1]
C G :: Your own first lyric cue
Am F :: Your own next lyric cue
[Chorus] x2
F C G Am
```

Every whitespace-separated token occupies one bar of 4/4. `C+G` means two beats of C and two of G; `C+G+Am+F` means one beat each. The player sounds each chord change even when a selected strum pattern has a rest. A line's words after `::` appear at its first bar. Section repetitions are 1–16. Supported imported chord names include major/minor, sevenths, diminished, augmented, suspended, and slash spellings. Finger diagrams and ukulele-voiced reference sounds cover all 18 chords used in the supplied arrangements. Other supported imported chords use a searched four-string voicing; chords without a playable supported voicing report an error before playback. Transposed known chords use the same fingering as the displayed diagram. Lyrics are cues, not syllable synchronization. Melody notation, mixed meters, arbitrary within-bar durations, live chord recognition, grading and recording synchronization are not implemented.

## Verification

Run `npm test` for musical and data checks; `npm run check` checks all application JavaScript. See `VERIFICATION.md` for tested browser flows and remaining physical-device verification limits.

## Sources

In addition to the video and public-domain text above, tuning and the four foundation chord fingerings were checked against UkuTabs' tuning guide and individual C, G, Am and F reference pages. Every extra fingering is tested against the intended chord pitch classes. Individual song research is retained in `references/charts-1.json` through `charts-3.json`; run `node scripts/compile-song-charts.mjs` to regenerate the app's arrangement module and validate coverage.

The instrument illustration uses the manufacturer's Kala KA-C product photo and specifications as a construction reference. It is original AI-assisted artwork, not a product photograph. The separate teaching diagram is original SVG with eighteen mathematically spaced frets. See `references/ILLUSTRATION.md` for the source, final generation prompt and asset location. No product reference photograph is served by the app. Album-sleeve motifs are original geometric illustrations, not copied record covers.

## Karaoke and lyric sources

The existing songbook has a browser acquisition workflow: **Find songbook lyrics** looks up all 47 included songs in one resumable job, prefers timed LRC, saves confident matches automatically and lets the user choose among ambiguous recording versions. It retains existing lyrics, supports retrying unresolved matches and integrates results into practice and the Ready to sing songbook filter. Provider responses are cached in browser storage; fetched lyrics remain user data rather than deployed assets. No commercial lyrics were fetched or bundled during development.

The practice view and lyric editor include song-specific searches for YouTube lyric videos and karaoke backing videos, Musixmatch, LRCLIB and Wikisource, plus the song's researched reference page (including UkuTabs). These are external links, not an embedded or synchronized video player. Commercial lyrics are not scraped or bundled.

Import a local TXT or LRC file in Add lyrics / Edit. The file is previewed before saving and remains in browser storage with the existing backup support. Timed LRC handles repeated timestamps, metadata and millisecond offsets; instrumental cues display a music note. Its timestamps follow the practice clock after count-in, with highlighting updated each eighth-note subdivision. The first-bar setting adds a lead-in. Recording timestamps can differ from the app's adapted learning arrangements. Plain text supports manual arrows or approximate bar following.

The reusable Python batch pipeline and complete instructions are in [lyrics_pipeline/README.md](lyrics_pipeline/README.md). It reads MP3/FLAC libraries or CSV/JSON lists, saves external lyric files, resumes safely and generates unresolved-song reports. The browser's collection importer loads its output folder at runtime and matches songs automatically. The studio's Build the song panel loops a chosen section range, adds subsequent sections and starts full-song playback.

## Recorded ukulele audio and reference-style necks

Twenty CC0 per-string recordings from François W. Nel's Kala KA-CE concert ukulele replace oscillator-based reference sounds. Each strum plays exactly four physical string parts, in g-C-E-A order downward and reversed upward, with a 39 ms downstroke spread. Unison notes on different strings use different recordings. Repeated plucks damp the previous note on the same string. Measured sample pitch offsets are corrected to A=440 during playback; tuner reference tones use the matching open-string recordings.

Recordings are served from the app itself (about 4.5 MB, loaded once on the first audio action). Source, license, pinned revision, processing and checksums are in dist/assets/ukulele/CREDITS.md and manifest.json. Only CC0 audio samples are incorporated, with no upstream GPL program code. Run node scripts/prepare-ukulele-samples.mjs then node scripts/audit-ukulele-samples.mjs to reproduce preparation and calibration. An offline four-chord demonstration can be rendered with node scripts/render-ukulele-demo.mjs.

All chord diagrams now use a wood-colored ukulele headstock and fingerboard, four continuous strings, visible tuning pegs, a pale nut, five numbered frets and a fifth-fret position dot. Finger numbers and barre markers retain exact string/fret coordinates and mirror for left-handed viewing. This vector teaching diagram follows the user's reference without copying its bitmap.
