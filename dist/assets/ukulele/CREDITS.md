# Real ukulele string recordings

Instrument: Kala KA-CE concert ukulele.
Source: François W. Nel, [Ukulele sample library](https://github.com/francoiswnel/Ukulele), source revision `b27cf72d4916ebba6fcef0b21e3f6050bab2727e`.

The source project's README explicitly releases its samples under **CC0**. Only audio samples are used; none of the upstream GPL-licensed Pure Data or other program code is incorporated into this app.

Audio license: [CC0 1.0 Universal public-domain dedication](https://creativecommons.org/publicdomain/zero/1.0/).

Twenty recordings cover frets 0–4 on each physical string, preserving the different sound of unison notes played on different strings. Preparation trims leading silence, removes DC, mixes to mono, matches peak level and fades the recorded tail. Playback makes small per-sample pitch corrections to the A=440 reference. Up/down strokes use opposite physical string order. Higher frets use pitch-shifted recordings from the same string.

The manifest contains provenance, checksums and measured tuning offsets. Sample preparation and pitch auditing are reproducible with the scripts in this project.
