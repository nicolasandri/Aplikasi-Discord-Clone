#!/bin/bash
UPLOADS_FILENAME=$1
cd /tmp
cp "$UPLOADS_FILENAME" /var/www/workgrid/
cd /var/www/workgrid || exit 1

# Backup existing uploads
if [ -d server/uploads ]; then
    mv server/uploads "server/uploads_backup_$(date +%Y%m%d_%H%M%S)"
fi

# Extract new uploads
unzip -o "$UPLOADS_FILENAME" -d server/

# Fix permissions
chown -R root:root server/uploads
chmod -R 755 server/uploads

# Copy to container
docker cp server/uploads workgrid-backend:/app/
docker exec workgrid-backend chown -R root:root /app/uploads
docker exec workgrid-backend chmod -R 755 /app/uploads

# Cleanup
rm -f "$UPLOADS_FILENAME"

echo "Uploads deployed successfully!"