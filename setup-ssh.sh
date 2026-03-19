#!/bin/bash
mkdir -p /root/.ssh
chmod 700 /root/.ssh
echo 'ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIHCZ/cjl0D3uTS/aguoFJn9N8Saa5R6ZR9H/wp0MlXJc workgrid-sgp-access' >> /root/.ssh/authorized_keys
chmod 600 /root/.ssh/authorized_keys
systemctl restart sshd
echo 'SSH key setup complete'
