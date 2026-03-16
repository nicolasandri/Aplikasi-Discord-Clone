#!/usr/bin/env python3
"""
WorkGrid VPS Deployment Script
Deploy files to VPS via SSH/SCP using paramiko or subprocess fallback.
"""

import os
import sys
import subprocess
import time
from pathlib import Path

# Configuration
VPS_HOST = "152.42.242.180"
VPS_USER = "root"
SSH_KEY_PATH = r"c:\Users\PC\Downloads\PROJECT TEAMCHAT\Aplikasi Discord Clone\workgrid_deploy_key"
LOCAL_FILE = r"c:\Users\PC\Downloads\PROJECT TEAMCHAT\Aplikasi Discord Clone\deploy-vps-package.zip"
REMOTE_FILE = "/root/workgrid-update.zip"
WORKGRID_DIR = "/opt/workgrid"
UPLOADS_VOLUME = "/var/lib/docker/volumes/workgrid_uploads_data/_data/"

# ANSI colors for output
GREEN = "\033[92m"
RED = "\033[91m"
YELLOW = "\033[93m"
BLUE = "\033[94m"
RESET = "\033[0m"


def log_info(msg):
    print(f"{BLUE}[INFO]{RESET} {msg}")


def log_success(msg):
    print(f"{GREEN}[SUCCESS]{RESET} {msg}")


def log_error(msg):
    print(f"{RED}[ERROR]{RESET} {msg}")


def log_warning(msg):
    print(f"{YELLOW}[WARNING]{RESET} {msg}")


def check_file_exists(filepath):
    """Check if file exists."""
    if not os.path.exists(filepath):
        log_error(f"File not found: {filepath}")
        return False
    return True


def get_ssh_key_path():
    """Get SSH key path, try .pem extension if .pub doesn't exist."""
    key_path = Path(SSH_KEY_PATH)
    
    if key_path.exists():
        return str(key_path)
    
    # Try with .pem extension
    pem_path = key_path.with_suffix('.pem')
    if pem_path.exists():
        return str(pem_path)
    
    # Try without extension
    if key_path.with_suffix('').exists():
        return str(key_path.with_suffix(''))
    
    return str(key_path)


class ParamikoDeployer:
    """Deploy using paramiko library."""
    
    def __init__(self):
        self.ssh = None
        self.sftp = None
    
    def connect(self):
        """Connect to VPS via SSH."""
        try:
            import paramiko
        except ImportError:
            log_warning("paramiko not installed, will use subprocess fallback")
            return False
        
        try:
            log_info(f"Connecting to {VPS_HOST} as {VPS_USER}...")
            
            self.ssh = paramiko.SSHClient()
            self.ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
            
            key_path = get_ssh_key_path()
            log_info(f"Using SSH key: {key_path}")
            
            # Try to load the private key
            try:
                private_key = paramiko.RSAKey.from_private_key_file(key_path)
            except paramiko.SSHException:
                try:
                    private_key = paramiko.Ed25519Key.from_private_key_file(key_path)
                except paramiko.SSHException:
                    try:
                        private_key = paramiko.ECDSAKey.from_private_key_file(key_path)
                    except paramiko.SSHException:
                        # Let paramiko auto-detect
                        private_key = None
            
            if private_key:
                self.ssh.connect(
                    hostname=VPS_HOST,
                    username=VPS_USER,
                    pkey=private_key,
                    timeout=30,
                    banner_timeout=30
                )
            else:
                self.ssh.connect(
                    hostname=VPS_HOST,
                    username=VPS_USER,
                    key_filename=key_path,
                    timeout=30,
                    banner_timeout=30
                )
            
            log_success("SSH connection established")
            return True
            
        except Exception as e:
            log_error(f"Failed to connect via paramiko: {e}")
            return False
    
    def upload_file(self, local_path, remote_path):
        """Upload file via SFTP."""
        try:
            log_info(f"Uploading {local_path} to {remote_path}...")
            
            self.sftp = self.ssh.open_sftp()
            
            # Ensure remote directory exists
            remote_dir = os.path.dirname(remote_path)
            try:
                self.sftp.stat(remote_dir)
            except FileNotFoundError:
                log_info(f"Creating remote directory: {remote_dir}")
                self.ssh.exec_command(f"mkdir -p {remote_dir}")
            
            # Upload file
            self.sftp.put(local_path, remote_path)
            
            # Verify upload
            try:
                remote_stat = self.sftp.stat(remote_path)
                local_size = os.path.getsize(local_path)
                log_success(f"File uploaded successfully ({local_size} bytes)")
                return True
            except Exception as e:
                log_error(f"Failed to verify upload: {e}")
                return False
                
        except Exception as e:
            log_error(f"Failed to upload file: {e}")
            return False
    
    def execute_command(self, command, timeout=60):
        """Execute command on remote server."""
        try:
            log_info(f"Executing: {command[:80]}..." if len(command) > 80 else f"Executing: {command}")
            
            stdin, stdout, stderr = self.ssh.exec_command(command, timeout=timeout)
            
            exit_code = stdout.channel.recv_exit_status()
            output = stdout.read().decode('utf-8', errors='ignore')
            error = stderr.read().decode('utf-8', errors='ignore')
            
            if exit_code == 0:
                if output.strip():
                    print(f"  Output: {output.strip()[:200]}")
                return True, output
            else:
                log_error(f"Command failed with exit code {exit_code}")
                if error.strip():
                    log_error(f"Error: {error.strip()}")
                return False, error
                
        except Exception as e:
            log_error(f"Failed to execute command: {e}")
            return False, str(e)
    
    def deploy(self):
        """Run full deployment process."""
        if not self.connect():
            return False
        
        try:
            # Step 1: Upload file
            if not self.upload_file(LOCAL_FILE, REMOTE_FILE):
                return False
            
            # Step 2: Extract and deploy
            log_info("Starting deployment process...")
            
            commands = [
                # Extract zip file
                f"cd /root && unzip -o {REMOTE_FILE} -d /root/workgrid-temp",
                
                # Ensure workgrid directory exists
                f"mkdir -p {WORKGRID_DIR}",
                
                # Copy files to workgrid directory (backup first)
                f"cp -r {WORKGRID_DIR} {WORKGRID_DIR}.backup.$(date +%Y%m%d%H%M%S) 2>/dev/null || true",
                
                # Copy new files
                f"cp -r /root/workgrid-temp/* {WORKGRID_DIR}/ 2>/dev/null || cp -r /root/workgrid-temp/*/.* {WORKGRID_DIR}/ 2>/dev/null || cp -r /root/workgrid-temp/*/* {WORKGRID_DIR}/ 2>/dev/null || true",
                
                # Handle uploads directory if exists in package
                f"if [ -d /root/workgrid-temp/uploads ]; then cp -r /root/workgrid-temp/uploads/* {UPLOADS_VOLUME} 2>/dev/null || true; fi",
                
                # Set permissions
                f"chmod -R 755 {WORKGRID_DIR}",
                
                # Restart Docker containers
                "cd /opt/workgrid && docker-compose down",
                "cd /opt/workgrid && docker-compose up -d --build",
                
                # Cleanup
                f"rm -rf /root/workgrid-temp",
                
                # Check container status
                "docker ps --filter name=workgrid --format 'table {{.Names}}\\t{{.Status}}\\t{{.Ports}}'"
            ]
            
            for cmd in commands:
                success, output = self.execute_command(cmd, timeout=120)
                if not success and "backup" not in cmd and "2>/dev/null" not in cmd:
                    log_warning(f"Command may have failed: {cmd}")
                time.sleep(1)
            
            log_success("Deployment completed!")
            return True
            
        except Exception as e:
            log_error(f"Deployment failed: {e}")
            return False
        finally:
            self.close()
    
    def close(self):
        """Close connections."""
        if self.sftp:
            self.sftp.close()
        if self.ssh:
            self.ssh.close()
        log_info("Connections closed")


class SubprocessDeployer:
    """Deploy using subprocess and system scp/ssh commands."""
    
    def run_command(self, command, shell=False):
        """Run local command."""
        try:
            result = subprocess.run(
                command,
                shell=shell,
                capture_output=True,
                text=True,
                timeout=120
            )
            return result.returncode == 0, result.stdout, result.stderr
        except subprocess.TimeoutExpired:
            log_error("Command timed out")
            return False, "", "Timeout"
        except Exception as e:
            log_error(f"Command failed: {e}")
            return False, "", str(e)
    
    def upload_file(self):
        """Upload file using scp command."""
        key_path = get_ssh_key_path()
        
        # Windows scp command
        scp_cmd = [
            "scp",
            "-i", key_path,
            "-o", "StrictHostKeyChecking=no",
            "-o", "UserKnownHostsFile=/dev/null",
            LOCAL_FILE,
            f"{VPS_USER}@{VPS_HOST}:{REMOTE_FILE}"
        ]
        
        log_info(f"Uploading via SCP...")
        log_info(f"Command: {' '.join(scp_cmd)}")
        
        success, stdout, stderr = self.run_command(scp_cmd)
        
        if success:
            log_success("File uploaded successfully")
            return True
        else:
            log_error(f"SCP failed: {stderr}")
            return False
    
    def execute_remote(self, command, timeout=60):
        """Execute command via SSH."""
        key_path = get_ssh_key_path()
        
        ssh_cmd = [
            "ssh",
            "-i", key_path,
            "-o", "StrictHostKeyChecking=no",
            "-o", "UserKnownHostsFile=/dev/null",
            "-o", "ConnectTimeout=30",
            f"{VPS_USER}@{VPS_HOST}",
            command
        ]
        
        log_info(f"SSH: {command[:60]}..." if len(command) > 60 else f"SSH: {command}")
        
        try:
            result = subprocess.run(
                ssh_cmd,
                capture_output=True,
                text=True,
                timeout=timeout
            )
            
            if result.returncode == 0:
                if result.stdout.strip():
                    print(f"  Output: {result.stdout.strip()[:200]}")
                return True, result.stdout
            else:
                log_error(f"SSH command failed: {result.stderr}")
                return False, result.stderr
                
        except subprocess.TimeoutExpired:
            log_error("SSH command timed out")
            return False, "Timeout"
        except Exception as e:
            log_error(f"SSH error: {e}")
            return False, str(e)
    
    def deploy(self):
        """Run full deployment using subprocess."""
        log_info("Using subprocess method (scp/ssh)...")
        
        # Step 1: Upload file
        if not self.upload_file():
            return False
        
        # Step 2: Execute remote deployment commands
        log_info("Executing remote deployment commands...")
        
        # Create extraction script
        deploy_script = f"""
set -e
echo "[1/8] Extracting archive..."
cd /root
rm -rf /root/workgrid-temp 2>/dev/null || true
unzip -o {REMOTE_FILE} -d /root/workgrid-temp

echo "[2/8] Creating backup and ensuring directories..."
mkdir -p {WORKGRID_DIR}
if [ -d {WORKGRID_DIR} ]; then
    BACKUP_NAME="{WORKGRID_DIR}.backup.$(date +%Y%m%d%H%M%S)"
    cp -r {WORKGRID_DIR} "$BACKUP_NAME" 2>/dev/null || true
    echo "Backup created: $BACKUP_NAME"
fi
mkdir -p {UPLOADS_VOLUME}

echo "[3/8] Copying files to workgrid directory..."
if [ -d /root/workgrid-temp/app ] || [ -d /root/workgrid-temp/server ]; then
    cp -r /root/workgrid-temp/* {WORKGRID_DIR}/ 2>/dev/null || true
else
    # Handle nested directory
    SUBDIR=$(find /root/workgrid-temp -maxdepth 1 -type d | tail -1)
    if [ "$SUBDIR" != "/root/workgrid-temp" ]; then
        cp -r "$SUBDIR"/* {WORKGRID_DIR}/ 2>/dev/null || true
    fi
fi

echo "[4/8] Copying uploads..."
if [ -d /root/workgrid-temp/uploads ]; then
    cp -r /root/workgrid-temp/uploads/* {UPLOADS_VOLUME} 2>/dev/null || true
    echo "Uploads copied"
elif [ -d {WORKGRID_DIR}/uploads ]; then
    cp -r {WORKGRID_DIR}/uploads/* {UPLOADS_VOLUME} 2>/dev/null || true
    echo "Uploads copied from workgrid directory"
fi

echo "[5/8] Setting permissions..."
chmod -R 755 {WORKGRID_DIR} 2>/dev/null || true

echo "[6/8] Stopping containers..."
cd {WORKGRID_DIR}
docker-compose down 2>/dev/null || docker compose down 2>/dev/null || true

echo "[7/8] Starting containers..."
docker-compose up -d --build 2>/dev/null || docker compose up -d --build

echo "[8/8] Cleaning up..."
rm -rf /root/workgrid-temp

echo ""
echo "=== Container Status ==="
docker ps --filter name=workgrid --format "table {{{{.Names}}}}\\t{{{{.Status}}}}\\t{{{{.Ports}}}}" 2>/dev/null || echo "No workgrid containers found"

echo ""
echo "=== Deployment Complete ==="
"""
        
        # Save and execute script
        success, _ = self.execute_remote(deploy_script, timeout=300)
        
        if success:
            log_success("Deployment completed successfully!")
        else:
            log_error("Deployment failed")
        
        return success


def main():
    """Main entry point."""
    print("=" * 60)
    print("WorkGrid VPS Deployment Tool")
    print(f"Target: {VPS_USER}@{VPS_HOST}")
    print("=" * 60)
    print()
    
    # Check if local file exists
    if not check_file_exists(LOCAL_FILE):
        print()
        log_error("Deployment aborted: Source file not found")
        log_info(f"Expected file: {LOCAL_FILE}")
        sys.exit(1)
    
    # Check SSH key
    key_path = get_ssh_key_path()
    if not check_file_exists(key_path):
        print()
        log_error("Deployment aborted: SSH key not found")
        log_info(f"Expected key: {key_path}")
        sys.exit(1)
    
    print()
    log_info(f"Source file: {LOCAL_FILE}")
    log_info(f"SSH Key: {key_path}")
    log_info(f"Remote path: {REMOTE_FILE}")
    print()
    
    # Try paramiko first, fallback to subprocess
    deployer = ParamikoDeployer()
    
    if deployer.connect():
        success = deployer.deploy()
    else:
        log_info("Falling back to subprocess (scp/ssh) method...")
        print()
        deployer = SubprocessDeployer()
        success = deployer.deploy()
    
    print()
    print("=" * 60)
    if success:
        log_success("Deployment finished successfully!")
        sys.exit(0)
    else:
        log_error("Deployment failed!")
        sys.exit(1)


if __name__ == "__main__":
    main()
