#!/usr/bin/env python3
"""
Deploy script menggunakan SSH key baru
"""

import subprocess
import sys
import os

VPS_IP = "152.42.229.212"
VPS_USER = "root"
VPS_PASS = "%0|F?H@f!berhO3e"
PROJECT_DIR = os.path.dirname(os.path.abspath(__file__))

def run_ssh_command(command):
    """Run SSH command with password"""
    ssh_cmd = f"sshpass -p '{VPS_PASS}' ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null {VPS_USER}@{VPS_IP} '{command}'"
    result = subprocess.run(ssh_cmd, shell=True, capture_output=True, text=True)
    return result

def copy_file(local_path, remote_path):
    """Copy file to VPS"""
    scp_cmd = f"sshpass -p '{VPS_PASS}' scp -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null {local_path} {VPS_USER}@{VPS_IP}:{remote_path}"
    result = subprocess.run(scp_cmd, shell=True, capture_output=True, text=True)
    return result

def copy_ssh_key():
    """Copy SSH public key to VPS"""
    key_path = os.path.join(PROJECT_DIR, "workgrid_new_key.pub")
    with open(key_path, 'r') as f:
        public_key = f.read().strip()
    
    # Add key to authorized_keys
    cmd = f"mkdir -p ~/.ssh && echo '{public_key}' >> ~/.ssh/authorized_keys && chmod 600 ~/.ssh/authorized_keys && chmod 700 ~/.ssh"
    return run_ssh_command(cmd)

def main():
    print("========================================")
    print("  Deploy: Message Limit 50 -> 1000")
    print(f"  VPS: {VPS_IP}")
    print("========================================\n")
    
    # Check if sshpass is available
    result = subprocess.run(["which", "sshpass"], capture_output=True)
    if result.returncode != 0:
        print("[!] sshpass tidak ditemukan!")
        print("[*] Install dengan: apt-get install sshpass")
        sys.exit(1)
    
    # Copy SSH key first
    print("[*] Copying SSH key to VPS...")
    result = copy_ssh_key()
    if result.returncode != 0:
        print(f"[!] Failed to copy SSH key: {result.stderr}")
    else:
        print("[✓] SSH key copied successfully!")
    
    # Copy server files
    print("\n[*] Copying server.js...")
    result = copy_file(
        os.path.join(PROJECT_DIR, "server", "server.js"),
        "/opt/workgrid/server/server.js"
    )
    if result.returncode == 0:
        print("[✓] server.js copied")
    else:
        print(f"[!] Error: {result.stderr}")
    
    print("[*] Copying database.js...")
    result = copy_file(
        os.path.join(PROJECT_DIR, "server", "database.js"),
        "/opt/workgrid/server/database.js"
    )
    if result.returncode == 0:
        print("[✓] database.js copied")
    else:
        print(f"[!] Error: {result.stderr}")
    
    print("[*] Copying database-postgres.js...")
    result = copy_file(
        os.path.join(PROJECT_DIR, "server", "database-postgres.js"),
        "/opt/workgrid/server/database-postgres.js"
    )
    if result.returncode == 0:
        print("[✓] database-postgres.js copied")
    else:
        print(f"[!] Error: {result.stderr}")
    
    # Restart backend
    print("\n[*] Restarting backend container...")
    result = run_ssh_command("cd /opt/workgrid && docker-compose restart backend")
    print(result.stdout)
    if result.stderr:
        print(result.stderr)
    
    print("\n========================================")
    print("  [✓] Deploy Selesai!")
    print("========================================")
    print("\nMessage limit berhasil diubah dari 50 ke 1000!")
    print("\nSSH key baru tersimpan di: workgrid_new_key")
    print("Untuk login selanjutnya gunakan:")
    print(f"  ssh -i workgrid_new_key {VPS_USER}@{VPS_IP}")

if __name__ == "__main__":
    main()
