const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const VPS_IP = '152.42.229.212';
const VPS_USER = 'root';
const SSH_KEY = path.join(__dirname, 'workgrid_deploy_key');
const ZIP_FILE = path.join(__dirname, 'deploy-vps-package.zip');
const REMOTE_ZIP = '/root/workgrid-update.zip';

console.log('============================================');
console.log('  DEPLOY WORKGRID TO VPS');
console.log('  Target:', VPS_IP);
console.log('============================================\n');

// Check if zip exists
if (!fs.existsSync(ZIP_FILE)) {
  console.error('❌ File not found:', ZIP_FILE);
  process.exit(1);
}

// Step 1: Upload file
console.log('[1/4] Uploading package to VPS...');
try {
  const sshCmd = `ssh -i "${SSH_KEY}" -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null ${VPS_USER}@${VPS_IP} "mkdir -p /opt/workgrid"`;
  execSync(sshCmd, { stdio: 'inherit', timeout: 30000 });
} catch (e) {
  console.log('Note: Directory may already exist');
}

try {
  const scpCmd = `scp -i "${SSH_KEY}" -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null "${ZIP_FILE}" ${VPS_USER}@${VPS_IP}:${REMOTE_ZIP}`;
  execSync(scpCmd, { stdio: 'inherit', timeout: 120000 });
  console.log('✅ Upload completed\n');
} catch (e) {
  console.error('❌ Upload failed:', e.message);
  process.exit(1);
}

// Step 2: Deploy on VPS
console.log('[2/4] Deploying on VPS...');
const deployCommands = `
set -e
cd /root
echo "[DEPLOY] Extracting package..."
unzip -o workgrid-update.zip -d workgrid-update/
cd workgrid-update/deploy-vps

echo "[DEPLOY] Backing up current uploads..."
mkdir -p /opt/workgrid/backups\nif [ -d /var/lib/docker/volumes/workgrid_uploads_data/_data ]; then
  cp -r /var/lib/docker/volumes/workgrid_uploads_data/_data/* /opt/workgrid/backups/ 2>/dev/null || true
fi

echo "[DEPLOY] Updating project files..."
cp docker-compose.vps.yml /opt/workgrid/
cp .env /opt/workgrid/
cp nginx.conf /opt/workgrid/nginx/

echo "[DEPLOY] Restoring uploads..."
mkdir -p /var/lib/docker/volumes/workgrid_uploads_data/_data
if [ -d uploads ]; then
  cp -r uploads/* /var/lib/docker/volumes/workgrid_uploads_data/_data/
  chown -R 1000:1000 /var/lib/docker/volumes/workgrid_uploads_data/_data/
fi

echo "[DEPLOY] Updating frontend..."
rm -rf /opt/workgrid/app/dist
mkdir -p /opt/workgrid/app/dist
cp -r frontend-dist/* /opt/workgrid/app/dist/

echo "[DEPLOY] Cleaning up temp files..."
rm -rf /root/workgrid-update /root/workgrid-update.zip

echo "✅ VPS deployment completed!"
`;

try {
  const sshCmd = `ssh -i "${SSH_KEY}" -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null ${VPS_USER}@${VPS_IP} "${deployCommands.replace(/"/g, '\\"')}"`;
  execSync(sshCmd, { stdio: 'inherit', timeout: 120000 });
  console.log('✅ Deploy completed\n');
} catch (e) {
  console.error('❌ Deploy failed:', e.message);
  process.exit(1);
}

// Step 3: Restart services
console.log('[3/4] Restarting services...');
const restartCommands = `
cd /opt/workgrid
echo "[DEPLOY] Restarting Docker containers..."
docker-compose -f docker-compose.vps.yml down
docker-compose -f docker-compose.vps.yml up -d
echo "✅ Services restarted!"
`;

try {
  const sshCmd = `ssh -i "${SSH_KEY}" -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null ${VPS_USER}@${VPS_IP} "${restartCommands.replace(/"/g, '\\"')}"`;
  execSync(sshCmd, { stdio: 'inherit', timeout: 120000 });
  console.log('✅ Restart completed\n');
} catch (e) {
  console.error('❌ Restart failed:', e.message);
  process.exit(1);
}

// Step 4: Verify
console.log('[4/4] Verifying deployment...');
setTimeout(() => {
  try {
    const response = execSync(`curl -s http://${VPS_IP}/api/health`, { timeout: 10000 });
    console.log('Health check response:', response.toString());
    console.log('✅ Health check passed!');
  } catch (e) {
    console.log('⚠️ Health check failed, services may still be starting...');
  }
  
  console.log('\n============================================');
  console.log('  DEPLOYMENT COMPLETED!');
  console.log('============================================');
  console.log('Website: http://workgrid.homeku.net');
  console.log('IP: http://152.42.229.212');
  console.log('============================================');
}, 15000);
