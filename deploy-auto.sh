#!/bin/bash
# Auto deploy using SSH key

VPS_IP="152.42.229.212"
SSH_KEY="$HOME/.ssh/workgrid_deploy"

echo "🚀 Deploying to VPS $VPS_IP..."

ssh -i "$SSH_KEY" -o StrictHostKeyChecking=no root@$VPS_IP << 'EOF'
  set -e
  echo "📦 Updating code..."
  cd /opt/workgrid
  git fetch origin
  git reset --hard origin/main
  
  echo "🐳 Rebuilding backend..."
  docker-compose stop backend
  docker-compose rm -f backend
  docker-compose build backend
  docker-compose up -d backend
  
  echo "🧹 Cleanup..."
  docker system prune -f
  
  echo "✅ Deployment complete!"
  docker-compose ps
EOF

echo "🔍 Checking deployment..."
sleep 5
curl -s http://$VPS_IP/api/servers/0a43478c-c72d-4cbc-ab98-4821b9d87e20/members | head -c 200
