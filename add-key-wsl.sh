#!/bin/bash
# Add SSH key to VPS

VPS_IP="152.42.229.212"
PASSWORD='%0|F?H@f!berhO3e'
PUBKEY="ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIOBGdALFAs7WEOAOTVnJPFMS/56pHzlMq9pLRdMWBEtg deploy@workgrid"

echo "🔑 Adding SSH key to VPS..."

# Create expect script
expect << EXPECT_EOF
set timeout 30
spawn ssh -o StrictHostKeyChecking=no root@$VPS_IP "mkdir -p ~/.ssh && echo '$PUBKEY' >> ~/.ssh/authorized_keys && chmod 600 ~/.ssh/authorized_keys"
expect "password:"
send "$PASSWORD\r"
expect eof
EXPECT_EOF

echo "✅ SSH key added!"
