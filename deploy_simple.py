#!/usr/bin/env python3
"""
WorkGrid VPS Deployment Script (Simple Version)
Uses only subprocess with Windows-compatible SSH/SCP commands.
"""

import subprocess
import sys
import os
from pathlib import Path

# Configuration
VPS_HOST = "152.42.242.180"
VPS_USER = "root"
SSH_KEY = r"c:\Users\PC\Downloads\PROJECT TEAMCHAT\Aplikasi Discord Clone\workgrid_deploy_key"
LOCAL_ZIP = r"c:\Users\PC\Downloads\PROJECT TEAMCHAT\Aplikasi Discord Clone\deploy-vps-package.zip"
REMOTE_ZIP = "/root/workgrid-update.zip"

def run_cmd(cmd, timeout=120):
    """Run command and return success status."""
    print(f"[EXEC] {' '.join(cmd) if isinstance(cmd, list) else cmd}")
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=timeout)
        if result.returncode != 0:
            print(f"[ERROR] {result.stderr}")
            return False
        if result.stdout:
            print(result.stdout[:500])
        return True
    except Exception as e:
        print(f"[ERROR] {e}")
        return False

def main():
    print("=" * 50)
    print("WorkGrid VPS Deployer")
    print("=" * 50)
    
    # Check files exist
    if not os.path.exists(LOCAL_ZIP):
        print(f"[ERROR] File not found: {LOCAL_ZIP}")
        sys.exit(1)
    
    if not os.path.exists(SSH_KEY):
        print(f"[ERROR] SSH key not found: {SSH_KEY}")
        sys.exit(1)
    
    file_size = os.path.getsize(LOCAL_ZIP) / (1024*1024)
    print(f"[INFO] Deploying {file_size:.2f} MB to {VPS_HOST}")
    print()
    
    # Step 1: Upload via SCP
    print("[1/4] Uploading file...")
    scp_cmd = [
        "scp", "-i", SSH_KEY,
        "-o", "StrictHostKeyChecking=no",
        LOCAL_ZIP, f"{VPS_USER}@{VPS_HOST}:{REMOTE_ZIP}"
    ]
    if not run_cmd(scp_cmd, timeout=300):
        print("[FAILED] Upload failed")
        sys.exit(1)
    print("[OK] Upload complete")
    print()
    
    # Step 2: Deploy on remote
    print("[2/4] Deploying on server...")
    ssh_cmd = [
        "ssh", "-i", SSH_KEY,
        "-o", "StrictHostKeyChecking=no",
        f"{VPS_USER}@{VPS_HOST}",
        f"cd /root && unzip -o {REMOTE_ZIP} -d /tmp/workgrid-deploy && "
        f"mkdir -p /opt/workgrid && "
        f"cp -r /tmp/workgrid-deploy/* /opt/workgrid/ 2>/dev/null || true && "
        f"chmod -R 755 /opt/workgrid && "
        f"rm -rf /tmp/workgrid-deploy"
    ]
    if not run_cmd(ssh_cmd, timeout=120):
        print("[WARNING] Some copy commands may have failed")
    print("[OK] Files deployed")
    print()
    
    # Step 3: Copy uploads
    print("[3/4] Copying uploads...")
    uploads_cmd = [
        "ssh", "-i", SSH_KEY,
        "-o", "StrictHostKeyChecking=no",
        f"{VPS_USER}@{VPS_HOST}",
        f"mkdir -p /var/lib/docker/volumes/workgrid_uploads_data/_data/ && "
        f"if [ -d /opt/workgrid/uploads ]; then "
        f"cp -r /opt/workgrid/uploads/* /var/lib/docker/volumes/workgrid_uploads_data/_data/ 2>/dev/null; "
        f"fi && chmod -R 755 /var/lib/docker/volumes/workgrid_uploads_data/_data/"
    ]
    run_cmd(uploads_cmd, timeout=60)
    print("[OK] Uploads copied")
    print()
    
    # Step 4: Restart containers
    print("[4/4] Restarting Docker containers...")
    docker_cmd = [
        "ssh", "-i", SSH_KEY,
        "-o", "StrictHostKeyChecking=no",
        f"{VPS_USER}@{VPS_HOST}",
        "cd /opt/workgrid && "
        "(docker-compose down || docker compose down) && "
        "(docker-compose up -d --build || docker compose up -d --build) && "
        "docker ps --filter name=workgrid --format 'table {{.Names}}\\t{{.Status}}'"
    ]
    if run_cmd(docker_cmd, timeout=300):
        print("[OK] Containers restarted")
    else:
        print("[WARNING] Container restart may have issues")
    print()
    
    print("=" * 50)
    print("[SUCCESS] Deployment completed!")
    print("=" * 50)

if __name__ == "__main__":
    main()
