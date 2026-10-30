@echo off
setlocal
cd /d "%~dp0"
if /i "%~1"=="--demo" goto demo
echo Four Strings - oldies collection lyrics
echo Reusing the existing local cache and progress in lyrics-output\axis.
call "%~dp0lyrics.cmd" run --songs "%~dp0lyrics_pipeline\examples\oldies-song-list.json" --output "%~dp0lyrics-output\axis" %*
set "PULL_EXIT_CODE=%errorlevel%"
if not "%PULL_EXIT_CODE%"=="0" goto finish
call "%~dp0lyrics.cmd" prepare --source "%~dp0lyrics-output\axis" --output "%~dp0lyrics-output\axis-karaoke" --timing
set "PULL_EXIT_CODE=%errorlevel%"
echo Import the lyrics-output\axis-karaoke folder in the app, or run Update-Phone-Karaoke.cmd.
goto finish
:demo
call "%~dp0lyrics.cmd" demo --output "%~dp0lyrics-output\oldies-demo"
set "PULL_EXIT_CODE=%errorlevel%"
:finish
if not "%PULL_EXIT_CODE%"=="0" echo Run stopped with code %PULL_EXIT_CODE%. Saved progress is kept.
if "%~1"=="" pause
exit /b %PULL_EXIT_CODE%
