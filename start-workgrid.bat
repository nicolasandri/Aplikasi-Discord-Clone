@echo off
chcp 65001 >nul
echo =========================================
echo   WorkGrid - Discord Clone
echo =========================================
echo.

:: Kill proses lama
taskkill /F /IM node.exe 2>nul
taskkill /F /IM npm.exe 2>nul
timeout /t 2 /nobreak >nul

:: Jalankan Backend
echo Starting Backend...
start "WorkGrid Backend" cmd /k "cd /d "%~dp0server" && node server.js"

:: Tunggu backend siap
timeout /t 3 /nobreak >nul

:: Jalankan Frontend
echo Starting Frontend...
start "WorkGrid Frontend" cmd /k "cd /d "%~dp0app" && npm run dev"

:: Tunggu frontend siap  
timeout /t 5 /nobreak >nul

echo.
echo =========================================
echo   Server Berjalan!
echo =========================================
echo   Frontend: http://localhost:5173
echo   Backend:  http://localhost:3001
echo =========================================
echo.
echo Jangan tutup jendela command prompt!
echo.
pause
