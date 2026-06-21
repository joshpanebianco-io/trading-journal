@echo off
cd /d "%~dp0"
start "Tradelytics Client" cmd /k "cd client && npm run dev"
timeout /t 3 /nobreak >nul
start "" "http://localhost:5173"
