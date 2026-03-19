#!/usr/bin/env python3
import subprocess
import sys

password = '%0|F?H@f!berhO3e'
server = '143.198.217.81'
public_key = 'ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIN8DFb+EN1qfUrq6wSfph5cyqNR7NnV7dXFwhs33ip+B workgrid-sgp-access'

commands = f"""
echo '{public_key}' >> /root/.ssh/authorized_keys
chmod 600 /root/.ssh/authorized_keys
chmod 700 /root/.ssh
systemctl restart sshd
"""

# Use ssh with password
proc = subprocess.Popen(
    ['ssh', '-o', 'StrictHostKeyChecking=no', f'root@{server}'],
    stdin=subprocess.PIPE,
    stdout=subprocess.PIPE,
    stderr=subprocess.PIPE,
    text=True
)

stdout, stderr = proc.communicate(input=commands, timeout=60)
print('STDOUT:', stdout)
print('STDERR:', stderr)
print('Return code:', proc.returncode)
