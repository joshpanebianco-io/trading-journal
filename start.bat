@echo off
cd /d "%~dp0"
start "Trading.ai Server" cmd /k "cd server && node --watch index.js"
start "Trading.ai Client" cmd /k "cd client && npm run dev"
timeout /t 3 /nobreak >nul
start "" "http://localhost:5173"
