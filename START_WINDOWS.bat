@echo off
cd /d "%~dp0"
where py >nul 2>nul
if not errorlevel 1 (
  py -3 START_GAME.py
  goto done
)
where python >nul 2>nul
if not errorlevel 1 (
  python START_GAME.py
  goto done
)
where node >nul 2>nul
if not errorlevel 1 (
  node tools\serve.mjs --open
  goto done
)
echo Install Python 3 from https://www.python.org/ or Node.js LTS from https://nodejs.org/
echo Then run this launcher again. No game engine or package installation is needed.
:done
pause
