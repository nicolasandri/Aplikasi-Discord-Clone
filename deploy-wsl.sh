#!/bin/bash
# Deploy script using WSL

VPS_IP="152.42.229.212"
PASSWORD='%0|F?H@f!berhO3e'

echo "🚀 Deploying to VPS $VPS_IP..."

# Use expect to handle SSH password
expect << EOF
set timeout 120
spawn ssh -o StrictHostKeyChecking=no -o ConnectTimeout=30 root@$VPS_IP "cd /opt/workgrid && git pull && docker-compose build backend && docker-compose up -d backend"
expect "password:"
send "$PASSWORD\r"
expect eof
EOF

echo "✅ Deployment complete!"
