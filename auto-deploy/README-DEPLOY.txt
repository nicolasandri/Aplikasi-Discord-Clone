================================================================================
🚀 WORKGRID AUTO DEPLOYMENT - VPS 152.42.242.180
================================================================================

📋 FILES IN THIS FOLDER:
- workgrid-ready-deploy.tar.gz    : Project archive siap deploy
- workgrid_deploy_key             : SSH private key (jika perlu)
- workgrid_deploy_key.pub         : SSH public key
- deploy-to-vps.sh                : Script deploy otomatis
- README-DEPLOY.txt               : File ini

================================================================================
🚀 CARA DEPLOY (Hanya 3 Langkah!)
================================================================================

STEP 1: Copy File ke VPS
--------------------------
Buka Command Prompt atau PowerShell di folder ini, jalankan:

scp workgrid-ready-deploy.tar.gz root@152.42.242.180:/tmp/
scp deploy-to-vps.sh root@152.42.242.180:/tmp/

Password VPS: %0|F?H@f!berhO3e


STEP 2: SSH ke VPS
------------------
ssh root@152.42.242.180
Password: %0|F?H@f!berhO3e


STEP 3: Jalankan Script Deploy
------------------------------
Di VPS, jalankan:

bash /tmp/deploy-to-vps.sh

Tunggu sampai selesai (sekitar 5-10 menit tergantung koneksi).

================================================================================
✅ VERIFIKASI
================================================================================

Setelah deployment selesai, akses:
- Web App    : http://152.42.242.180
- API        : http://152.42.242.180/api
- Update Svr : http://152.42.242.180:8080

================================================================================
🔧 TROUBLESHOOTING
================================================================================

Jika ada error:
1. Cek logs: docker-compose -f deployment/docker-compose.vps.yml logs -f
2. Restart:  docker-compose -f deployment/docker-compose.vps.yml restart
3. Reset DB: docker-compose -f deployment/docker-compose.vps.yml down -v
             docker-compose -f deployment/docker-compose.vps.yml up -d

================================================================================
💾 SSH KEY
================================================================================

SSH key sudah dibuat di folder ini:
- workgrid_deploy_key     : Private key
- workgrid_deploy_key.pub : Public key

Untuk SSH tanpa password ke VPS:
ssh -i workgrid_deploy_key root@152.42.242.180

(Note: Pastikan public key sudah ditambahkan ke ~/.ssh/authorized_keys di VPS)

================================================================================
📞 SUPPORT
================================================================================
Jika ada masalah, cek file log atau hubungi developer.

================================================================================
