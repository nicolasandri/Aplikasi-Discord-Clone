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
        'systemctl restart sshd || service ssh restart',
        'echo "SSH keys installed"'
      ].join(' && ');
      
      conn.exec(commands, (err, stream) => {
        if (err) {
          reject(err);
          return;
        }
        
        let output = '';
        stream.on('close', (code) => {
          console.log(`[${label}] Setup complete, code: ${code}`);
          conn.end();
          resolve(code);
        }).on('data', (data) => {
          output += data.toString();
        }).stderr.on('data', (data) => {
          console.log(`[${label}] STDERR: ${data.toString().trim()}`);
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
      readyTimeout: 30000
    });
  });
}

async function main() {
  try {
    console.log('Setting up VPS 2 (Backend)...');
    await setupVPS('152.42.229.212', 'BACKEND');
    
    console.log('\nSetting up VPS 1 (Frontend)...');
    await setupVPS('165.22.63.51', 'FRONTEND');
    
    console.log('\n✅ Both VPS SSH keys configured!');
  } catch (err) {
    console.error('Failed:', err.message);
    process.exit(1);
  }
}

main();
