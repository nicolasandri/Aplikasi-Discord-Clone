# Deploy uploads to VPS
$VPS_IP = "152.42.242.180"
$VPS_USER = "root"
$SSH_KEY = "workgrid_deploy_key"

# Get latest uploads zip
$UPLOADS_ZIP = (Get-ChildItem backups/uploads_*.zip | Sort-Object LastWriteTime -Descending | Select-Object -First 1).FullName
$UPLOADS_FILENAME = Split-Path $UPLOADS_ZIP -Leaf

Write-Host "Deploying uploads to VPS..." -ForegroundColor Green
Write-Host "File: $UPLOADS_FILENAME" -ForegroundColor Cyan

# Upload to VPS using scp
Write-Host "Uploading to VPS..." -ForegroundColor Yellow
scp -i $SSH_KEY -o StrictHostKeyChecking=no $UPLOADS_ZIP "${VPS_USER}@${VPS_IP}:/tmp/"

# Extract and copy to container
$remoteScript = @'
cd /tmp
cp UPLOADS_FILENAME /var/www/workgrid/
cd /var/www/workgrid
# Backup existing uploads
if [ -d server/uploads ]; then
    mv server/uploads server/uploads_backup_$(date +%Y%m%d_%H%M%S)
fi
# Extract new uploads
unzip -o UPLOADS_FILENAME -d server/
# Fix permissions
chown -R root:root server/uploads
chmod -R 755 server/uploads
# Copy to container
docker cp server/uploads workgrid-backend:/app/
docker exec workgrid-backend chown -R root:root /app/uploads
docker exec workgrid-backend chmod -R 755 /app/uploads
# Cleanup
rm -f UPLOADS_FILENAME
echo "Uploads deployed successfully!"
'@

$remoteScript = $remoteScript -replace 'UPLOADS_FILENAME', $UPLOADS_FILENAME

Write-Host "Extracting and copying to container..." -ForegroundColor Yellow
$remoteScript | ssh -i $SSH_KEY -o StrictHostKeyChecking=no "${VPS_USER}@${VPS_IP}"

Write-Host "Uploads deployed successfully!" -ForegroundColor Green
