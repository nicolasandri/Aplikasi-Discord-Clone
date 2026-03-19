const { Client } = require('ssh2');

const password = '%0|F?H@f!berhO3e';
const backendKey = 'ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAILpGH8HJ2Y0DLTKBeevbJqkzUZ+hrZJmQsgfz82t1fO6 workgrid-backend';
const frontendKey = 'ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIA4ylbANDFZmlb9BBBep0suw3tZfPi61USOw5tUzchDJ workgrid-frontend';

function setupVPS(host, label) {
  return new Promise((resolve, reject) => {
    const conn = new Client();
    
    conn.on('ready', () => {
      console.log(`[${label}] SSH connected to ${host}`);
      
      const commands = [
        'mkdir -p /root/.ssh',
        'chmod 700 /root/.ssh',
        `echo '${backendKey}' > /root/.ssh/authorized_keys`,
        `echo '${frontendKey}' >> /root/.ssh/authorized_keys`,
        'chmod 600 /root/.ssh/authorized_keys',
        'systemctl restart sshd || service ssh restart || echo "SSH restart attempted"',
        'echo "SSH keys installed successfully"'
      ].join(' && ');
      
      conn.exec(commands, (err, stream) => {
        if (err) {
          reject(err);
          return;
        }
        
        let stdout = '';
        let stderr = '';
        
        stream.on('close', (code) => {
          console.log(`[${label}] Setup complete, exit code: ${code}`);
          console.log(`[${label}] STDOUT: ${stdout}`);
          if (stderr) console.log(`[${label}] STDERR: ${stderr}`);
          conn.end();
          resolve(code);
        }).on('data', (data) => {
          stdout += data.toString();
        }).stderr.on('data', (data) => {
          stderr += data.toString();
        });
      });
    }).on('error', (err) => {
      console.error(`[${label}] Error: ${err.message}`);
      reject(err);
    }).connect({
      host: host,
      port: 22,
      username: 'root',
      password: password,
      readyTimeout: 60000,  // 60 seconds timeout
      keepaliveInterval: 5000,
      keepaliveCountMax: 3
    });
  });
}

async function main() {
  try {
    console.log('Setting up SSH key for VPS 1 (Frontend) - 165.22.63.51...');
    console.log('This may take a moment...\n');
    
    await setupVPS('165.22.63.51', 'FRONTEND');
    
    console.log('\n✅ VPS 1 SSH key configured successfully!');
    console.log('\nTest with:');
    console.log('ssh -i ~/.ssh/workgrid_frontend root@165.22.63.51');
  } catch (err) {
    console.error('\n❌ Failed:', err.message);
    console.log('\nPossible causes:');
    console.log('- VPS still initializing');
    console.log('- Network latency');
    console.log('- SSH service not ready');
    console.log('\nPlease wait 2-3 minutes and try again.');
    process.exit(1);
  }
}

main();
