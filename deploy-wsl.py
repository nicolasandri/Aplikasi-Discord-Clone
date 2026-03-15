#!/usr/bin/env python3
import paramiko
import time
import sys

VPS_IP = "152.42.242.180"
PASSWORD = "%0|F?H@f!berhO3e"

def deploy():
    print(f"🚀 Deploying to VPS {VPS_IP}...")
    
    try:
        # Create SSH client
        ssh = paramiko.SSHClient()
        ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
        
        # Connect
        print("📡 Connecting to VPS...")
        ssh.connect(VPS_IP, username='root', password=PASSWORD, timeout=30)
        
        # Execute deployment commands
        commands = [
            "cd /opt/workgrid",
            "echo 'Pulling latest code...' && git fetch origin && git reset --hard origin/main",
            "echo 'Stopping backend...' && docker-compose stop backend",
            "echo 'Removing old container...' && docker-compose rm -f backend",
            "echo 'Building new backend...' && docker-compose build backend",
            "echo 'Starting backend...' && docker-compose up -d backend",
            "echo 'Checking status...' && docker-compose ps"
        ]
        
        full_command = " && ".join(commands)
        print("🔧 Running deployment commands...")
        
        stdin, stdout, stderr = ssh.exec_command(full_command, get_pty=True)
        
        # Stream output
        for line in iter(stdout.readline, ""):
            print(line, end="")
        
        # Check for errors
        err = stderr.read().decode()
        if err:
            print(f"⚠️  Errors: {err}")
        
        exit_code = stdout.channel.recv_exit_status()
        print(f"✅ Deployment complete! Exit code: {exit_code}")
        
        ssh.close()
        return exit_code == 0
        
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

if __name__ == "__main__":
    success = deploy()
    sys.exit(0 if success else 1)
