#!/bin/bash
SERVER="143.198.217.81"
PASSWORD='%0|F?H@f!berhO3e'
PUBKEY="ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIN8DFb+EN1qfUrq6wSfph5cyqNR7NnV7dXFwhs33ip+B workgrid-sgp-access"

# Use expect to automate password
/usr/bin/expect << EOF
spawn ssh -o StrictHostKeyChecking=no root@$SERVER "mkdir -p /root/.ssh && chmod 700 /root/.ssh"
expect "password:"
send "$PASSWORD\r"
expect eof
EOF

/usr/bin/expect << EOF
spawn ssh -o StrictHostKeyChecking=no root@$SERVER "echo '$PUBKEY' > /root/.ssh/authorized_keys && chmod 600 /root/.ssh/authorized_keys"
expect "password:"
send "$PASSWORD\r"
expect eof
EOF

echo "SSH key copied"
