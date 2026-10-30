@echo off
setlocal
cd /d "%~dp0"
set "PYTHONPATH=%~dp0.python-deps;%PYTHONPATH%"
if exist "%~dp0.venv\Scripts\python.exe" (
  "%~dp0.venv\Scripts\python.exe" -m lyrics_pipeline %*
) else if exist "%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe" (
  "%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe" -m lyrics_pipeline %*
) else (
  py -3 -m lyrics_pipeline %*
)
exit /b %errorlevel%
