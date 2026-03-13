#!/bin/bash

# Setup Auto-Renewal untuk SSL Certificate

set -e

echo "🔧 Setup Auto-Renewal SSL Certificate..."

# Check apakah berjalan sebagai root
if [ "$EUID" -ne 0 ]; then 
    echo "❌ Harus dijalankan sebagai root (gunakan sudo)"
    exit 1
fi

PROJECT_DIR="/opt/workgrid"
DOMAIN="workgrid.homeku.net"

# Buat script untuk renew dan restart nginx
cat > /usr/local/bin/renew-ssl.sh << 'EOF'
#!/bin/bash

PROJECT_DIR="/opt/workgrid"

# Renew certificate
certbot renew --quiet

# Copy sertifikat terbaru ke project directory
rsync -av /etc/letsencrypt/ $PROJECT_DIR/certbot/conf/

# Restart nginx container untuk apply sertifikat baru
cd $PROJECT_DIR
docker-compose -f deployment/docker-compose.ssl.yml restart nginx

echo "SSL Renewed and Nginx restarted at $(date)"
EOF

chmod +x /usr/local/bin/renew-ssl.sh

# Tambahkan ke crontab (renew setiap hari jam 2 pagi)
CRON_JOB="0 2 * * * /usr/local/bin/renew-ssl.sh >> /var/log/letsencrypt-renew.log 2>&1"

# Cek apakah cron job sudah ada
if ! crontab -l 2>/dev/null | grep -q "renew-ssl.sh"; then
    # Tambahkan cron job
    (crontab -l 2>/dev/null; echo "$CRON_JOB") | crontab -
    echo "✅ Auto-renewal cron job ditambahkan"
else
    echo "ℹ️ Auto-renewal cron job sudah ada"
fi

# Test cron job
echo "📋 Cron jobs:"
crontab -l | grep renew-ssl || echo "   (No renew-ssl job found)"

echo ""
echo "✅ Auto-renewal setup complete!"
echo "   Sertifikat akan otomatis di-renew setiap hari jam 2 pagi"
echo "   Log: /var/log/letsencrypt-renew.log"
