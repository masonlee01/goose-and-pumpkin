@echo off
REM Double-click this to play Goose and Pumpkin.
REM Leave the black window open while you play. Close it to stop the game.
cd /d "%~dp0"
if not exist node_modules (
  echo First time setup - installing the bits the game needs...
  call npm install
)
echo.
echo Starting Goose and Pumpkin. Your browser should open in a moment.
echo Leave this window open while you play.
echo.
call npm run dev
pause
