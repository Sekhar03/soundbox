@echo off
start "Backend" cmd /k "%~dp0run-backend.bat"
timeout /t 4 /nobreak >nul
start "Frontend" cmd /k "%~dp0run-frontend.bat"
timeout /t 6 /nobreak >nul
start http://localhost:5173
