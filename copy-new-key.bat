@echo off
echo ==========================================
echo   Copy SSH Key Baru ke VPS
echo ==========================================
echo.
echo Public key:
type workgrid_new_key.pub
echo.
echo.
echo [*] Copy key ke VPS dengan cara:
echo.
echo    ssh root@152.42.229.212
echo    mkdir -p ~/.ssh
echo    echo 'ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIP/88uo9VtiVSfXgJO95iRutY+lwxCTAEdLoXnisd54F workgrid-deploy' ^>^> ~/.ssh/authorized_keys
echo    chmod 600 ~/.ssh/authorized_keys
echo    chmod 700 ~/.ssh
echo.
pause
