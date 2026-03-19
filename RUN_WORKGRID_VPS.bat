@echo off
chcp 65001 >nul
echo 🚀 Menjalankan WorkGrid Desktop dengan VPS Backend...
echo.
echo Backend: http://152.42.229.212:3001
echo Frontend: http://165.22.63.51
echo.
cd /d "C:\Users\PC\Downloads\PROJECT TEAMCHAT\Aplikasi Discord Clone\app"
echo Menjalankan aplikasi...
npx electron . --env.VITE_API_URL=http://152.42.229.212:3001/api --env.VITE_SOCKET_URL=http://152.42.229.212:3001
echo.
