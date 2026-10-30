@echo off
setlocal
cd /d "%~dp0"
echo Preparing your existing local lyric cache for automatic phone karaoke.
echo To retrieve new songs first, run Pull-Acoustic-Lyrics.cmd or Pull-Songbook-Lyrics.cmd.
call "%~dp0lyrics.cmd" prepare --source "%~dp0lyrics-output\axis" --output "%~dp0lyrics-output\axis-karaoke" --timing
if errorlevel 1 goto failed
powershell -NoProfile -File "%~dp0scripts\build-android.ps1" -LyricsFolder "%~dp0lyrics-output\axis-karaoke"
if errorlevel 1 goto failed
echo Your updated APK is ready in apk-output\Four-Strings.apk.
if "%~1"=="" pause
exit /b 0
:failed
echo Could not finish. Read the message above; your downloaded files are kept.
if "%~1"=="" pause
exit /b 1
