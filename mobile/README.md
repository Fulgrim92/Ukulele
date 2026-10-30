# Four Strings for Android

The Android app packages the local website and all recorded ukulele sounds using Capacitor 8.6.0. Core lessons, diagrams, arrangements and playback work offline. Online lyric lookup and external references need an internet connection. Android 7.0 (API 24) or later and an updated Android System WebView are required.

## Build a personal APK

Install Node 22+, JDK 21 and Android SDK platform/build-tools 36. Set `JAVA_HOME` and `ANDROID_HOME` to those installations. The PowerShell build script also recognizes this computer's existing `H:\AI_Code\android-build` tools.

```powershell
npm ci
npm run android:apk

# Optionally seed a private APK with your local imported lyric files:
npm run android:apk -- -LyricsFolder "lyrics-output\axis-import"
```

Output: `apk-output\Four-Strings.apk`. Transfer it to your Android phone and open it to install. This is a locally signed debug build for personal testing, not a Play Store release. Keep `.android-secrets\four-strings-debug.keystore` privately if you want future builds to update the installed app without uninstalling it.

The build copies web assets into `.android-web` and then into Android's generated assets. Optional lyrics are validated with the app's existing importer and loaded before startup. They seed missing songs while preserving the player's saved edits and progress. They retain their imported mode: plain text is manual, and LRC requires recording/arrangement timing adjustment. A build without `-LyricsFolder` resets the generated lyric seed to an empty object.

Downloaded text, generated web assets, signing keys, SDK paths and APKs are excluded from Git. An APK built with private lyrics contains those texts, so keep that APK private. The repository contains build code and original/public-domain or synthetic fixtures only.

## Phone behavior

- Four Strings uses its own app storage. Existing desktop-browser progress does not transfer automatically; use the app's backup export/import to transfer it where supported by the phone's file picker.
- Microphone permission is requested only when the tuner is started. The tuner processes audio locally. No camera, location or broad storage permission is requested.
- Network access supports optional lyric lookup, fonts and reference links. The app does not need an account or remote website login to open.
- Android backup is disabled for the private app data. Uninstalling removes local progress and imported text.
- Compilation, signature and packaged-asset checks do not establish physical-phone audio, microphone or file-picker compatibility. Those flows still need a device test.

## Recover an existing local pipeline cache

```powershell
python -m lyrics_pipeline.cached_import lyrics-output\axis lyrics-output\axis-import
```

This offline command reads the supplied collection's SQLite response cache without updating it. It exports plain text only when all compatible cached candidates agree after whitespace/case normalization. It keeps differing words/repeats unresolved and does not claim recording timing. Review `unresolved.csv`; importing this folder in the website or supplying it to the Android build keeps lyrics outside source code.
