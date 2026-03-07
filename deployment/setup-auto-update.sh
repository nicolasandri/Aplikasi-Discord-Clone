#!/bin/bash
# Setup Auto-Update Server for WorkGrid Electron App
# Run this on VPS after main deployment

VPS_IP="167.172.72.73"
UPDATE_DIR="/opt/workgrid/updates"

echo "🔄 Setting up Auto-Update Server..."

# Create update directory structure
ssh root@$VPS_IP "mkdir -p $UPDATE_DIR/latest"

# Create latest.yml for electron-updater
cat > /tmp/latest.yml << 'EOF'
version: 1.0.0
files:
  - url: WorkGrid Setup 1.0.0.exe
    sha512: UPDATE_SHA512_HERE
    size: UPDATE_SIZE_HERE
path: WorkGrid Setup 1.0.0.exe
sha512: UPDATE_SHA512_HERE
releaseDate: '2026-03-06T00:00:00.000Z'
EOF

echo "📦 Copying latest.yml template..."
scp /tmp/latest.yml root@$VPS_IP:$UPDATE_DIR/latest.yml

# Create update script
cat > /tmp/update-release.sh << 'EOF'
#!/bin/bash
# Update release files for WorkGrid Auto-Update
# Usage: ./update-release.sh path/to/WorkGrid Setup 1.0.0.exe

RELEASE_FILE="$1"
VERSION="$2"

if [ -z "$RELEASE_FILE" ] || [ -z "$VERSION" ]; then
    echo "Usage: $0 <path-to-exe> <version>"
    echo "Example: $0 ./WorkGrid Setup 1.0.0.exe 1.0.1"
    exit 1
fi

# Calculate SHA512
SHA512=$(sha512sum "$RELEASE_FILE" | awk '{print $1}')
SIZE=$(stat -f%z "$RELEASE_FILE" 2>/dev/null || stat -c%s "$RELEASE_FILE" 2>/dev/null)

# Copy file to update server
cp "$RELEASE_FILE" /opt/workgrid/updates/latest/"WorkGrid Setup $VERSION.exe"

# Update latest.yml
cat > /opt/workgrid/updates/latest.yml << EOL
version: $VERSION
files:
  - url: http://167.172.72.73:8080/latest/WorkGrid Setup $VERSION.exe
    sha512: $SHA512
    size: $SIZE
path: WorkGrid Setup $VERSION.exe
sha512: $SHA512
releaseDate: '$(date -u +%Y-%m-%dT%H:%M:%S.000Z)'
releaseNotes: 'Update to version $VERSION'
EOL

echo "✅ Release updated to version $VERSION"
echo "📦 File: WorkGrid Setup $VERSION.exe"
echo "🔑 SHA512: $SHA512"
echo "📏 Size: $SIZE bytes"
EOF

chmod +x /tmp/update-release.sh
scp /tmp/update-release.sh root@$VPS_IP:/opt/workgrid/
ssh root@$VPS_IP "chmod +x /opt/workgrid/update-release.sh"

echo "✅ Auto-Update Server configured!"
echo ""
echo "📋 To publish a new update:"
echo "1. Build new version: npm run electron:build:win"
echo "2. Upload to VPS:"
echo "   scp 'app/release/WorkGrid Setup X.X.X.exe' root@$VPS_IP:/opt/workgrid/"
echo "3. Run on VPS:"
echo "   ssh root@$VPS_IP '/opt/workgrid/update-release.sh /opt/workgrid/WorkGrid Setup X.X.X.exe X.X.X'"
echo ""
echo "🌐 Update server URL: http://$VPS_IP:8080/latest.yml"
