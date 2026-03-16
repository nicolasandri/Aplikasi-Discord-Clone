const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const VPS_IP = '152.42.242.180';
const VPS_USER = 'root';
const SSH_KEY = path.join(__dirname, 'workgrid_deploy_key');
const ZIP_FILE = path.join(__dirname, 'frontend-cyan-update.zip');
const REMOTE_ZIP = '/root/frontend-cyan-update.zip';

console.log('============================================');
console.log('  DEPLOY CYAN THEME UPDATE TO VPS');
console.log('  Target:', VPS_IP);
console.log('============================================\n');

// Check if zip exists
if (!fs.existsSync(ZIP_FILE)) {
  console.error('❌ File not found:', ZIP_FILE);
  process.exit(1);
}

// Step 1: Upload file
console.log('[1/3] Uploading frontend to VPS...');
try {
  const scpCmd = `scp -i "${SSH_KEY}" -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null "${ZIP_FILE}" ${VPS_USER}@${VPS_IP}:${REMOTE_ZIP}`;
  execSync(scpCmd, { stdio: 'inherit', timeout: 120000 });
  console.log('✅ Upload completed\n');
} catch (e) {
  console.error('❌ Upload failed:', e.message);
  process.exit(1);
}

// Step 2: Deploy on VPS
console.log('[2/3] Deploying frontend on VPS...');
const deployCommands = `
set -e
cd /root
echo "[DEPLOY] Stopping containers..."
cd /opt/workgrid && docker-compose -f docker-compose.vps.yml stop frontend

echo "[DEPLOY] Extracting new frontend..."
cd /opt/workgrid/app
rm -rf dist/*
unzip -o /root/frontend-cyan-update.zip -d dist/

echo "[DEPLOY] Cleanup..."
rm -f /root/frontend-cyan-update.zip

echo "✅ Frontend deployed!"
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
console.log('[3/3] Restarting frontend container...');
const restartCommands = `
cd /opt/workgrid
docker-compose -f docker-compose.vps.yml up -d frontend
echo "✅ Frontend restarted!"
`;

try {
  const sshCmd = `ssh -i "${SSH_KEY}" -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null ${VPS_USER}@${VPS_IP} "${restartCommands.replace(/"/g, '\\"')}"`;
  execSync(sshCmd, { stdio: 'inherit', timeout: 120000 });
  console.log('✅ Restart completed\n');
} catch (e) {
  console.error('❌ Restart failed:', e.message);
  process.exit(1);
}

console.log('\n============================================');
console.log('  DEPLOYMENT COMPLETED!');
console.log('============================================');
console.log('Website: https://workgrid.homeku.net');
console.log('IP: http://152.42.242.180');
console.log('============================================');
