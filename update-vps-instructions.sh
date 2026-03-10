#!/bin/bash
# Script untuk update WorkGrid di VPS
# Jalankan ini di VPS Anda (167.172.72.73)

echo "🚀 Updating WorkGrid..."

# Pindah ke direktori project
cd /opt/workgrid || cd ~/Aplikasi-Discord-Clone || exit 1

# Pull perubahan terbaru dari GitHub
echo "📥 Pulling latest changes..."
git pull origin main

# Install dependencies backend
echo "📦 Installing backend dependencies..."
cd server
npm install
cd ..

# Install dependencies frontend dan build
echo "📦 Building frontend..."
cd app
npm install
npm run build
cd ..

# Restart services (sesuaikan dengan setup Anda)
echo "🔄 Restarting services..."

# Jika menggunakan Docker:
# docker-compose -f deployment/docker-compose.vps.yml down
# docker-compose -f deployment/docker-compose.vps.yml up --build -d

# Jika menggunakan PM2:
# pm2 restart workgrid-backend
# sudo systemctl restart nginx

# Jika menggunakan systemd:
# sudo systemctl restart workgrid
# sudo systemctl restart nginx

echo "✅ Update complete!"
echo "📝 Check logs with:"
echo "   - Backend: tail -f server/logs/app.log"
echo "   - Nginx: sudo tail -f /var/log/nginx/error.log"
