@echo off
chcp 65001 >/dev/null
cd /d "%~dp0app"
echo.
echo ========================================
echo  WorkGrid Desktop App - Production Build
echo ========================================
echo.
echo [1/3] Building React app...
call npm run build
if %errorlevel% neq 0 (
  echo.
  echo [FAILED] Build failed! Check errors above.
  pause
  exit /b 1
)
echo [OK] Build completed
echo.
echo [2/3] Starting WorkGrid Desktop...
call npm run electron
echo.
echo [OK] WorkGrid closed
pause
