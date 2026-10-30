@echo off
setlocal
cd /d "%~dp0"

if /i "%~1"=="--demo" goto demo

echo Four Strings - songbook lyrics downloader
echo Looking up the 47 songs using the documented LRCLIB API.
echo Completed files are kept. Run this launcher again to resume.
echo Press Ctrl+C to stop safely.
echo.
call "%~dp0lyrics.cmd" run --songs "%~dp0lyrics_pipeline\examples\axis-song-list.json" --output "%~dp0lyrics-output\axis" %*
set "PULL_EXIT_CODE=%errorlevel%"
if not "%PULL_EXIT_CODE%"=="0" goto finish
echo.
echo In Four Strings: Practice studio ^> Import lyric collection
echo Select this folder: "%~dp0lyrics-output\axis"
echo Review unresolved.csv for songs needing a recording choice or another source.
goto finish

:demo
echo Offline test: only original synthetic lyrics; no network requests.
call "%~dp0lyrics.cmd" demo --output "%~dp0lyrics-output\pull-demo"
set "PULL_EXIT_CODE=%errorlevel%"

:finish
echo.
if not "%PULL_EXIT_CODE%"=="0" echo The run stopped with code %PULL_EXIT_CODE%. Saved progress is retained.
if "%~1"=="" pause
exit /b %PULL_EXIT_CODE%
