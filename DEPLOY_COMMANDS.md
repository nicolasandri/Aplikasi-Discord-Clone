# Deployment Commands for VPS

Jalankan commands berikut di VPS untuk deploy UUID casting fixes:

```bash
# 1. SSH ke VPS
ssh root@152.42.242.180

# 2. Update code dari GitHub
cd /opt/workgrid
git fetch origin
git reset --hard origin/main

# 3. Rebuild backend container
docker-compose stop backend
docker-compose rm -f backend
docker-compose build --no-cache backend

# 4. Start containers
docker-compose up -d backend

# 5. Cek logs
docker logs workgrid-backend-1 --tail 50

# 6. Jika masih error, restart semua
docker-compose restart

# 7. Cleanup
docker system prune -f
```

## Cek Status Deployment

```bash
# Cek container status
docker-compose ps

# Cek backend logs real-time
docker logs -f workgrid-backend-1

# Test API endpoint
curl http://localhost:3001/api/servers/0a43478c-c72d-4cbc-ab98-4821b9d87e20/members
```

## Jika Ada Masalah

```bash
# Backup database terlebih dahulu
docker exec workgrid-db-1 pg_dump -U discord_user discord_clone > /opt/workgrid/backups/backup_$(date +%Y%m%d_%H%M%S).sql

# Full rebuild
docker-compose down
docker-compose up --build -d
```
