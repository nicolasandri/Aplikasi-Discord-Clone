const { spawn } = require('child_process');

const ssh = spawn('ssh', [
  '-o', 'StrictHostKeyChecking=no',
  '-o', 'ConnectTimeout=30',
  'root@152.42.242.180',
  'echo SSH_OK'
], { stdio: ['pipe', 'pipe', 'pipe'] });

let passwordSent = false;

ssh.stdout.on('data', (data) => {
  const str = data.toString();
  console.log('stdout:', str);
  
  if (str.includes('password:') && !passwordSent) {
    ssh.stdin.write('%0|F?H@f!berhO3e\n');
    passwordSent = true;
  }
});

ssh.stderr.on('data', (data) => {
  const str = data.toString();
  console.log('stderr:', str);
  
  if (str.includes('password:') && !passwordSent) {
    ssh.stdin.write('%0|F?H@f!berhO3e\n');
    passwordSent = true;
  }
});

ssh.on('close', (code) => {
  console.log('exit code:', code);
  process.exit(code);
});

setTimeout(() => {
  if (!passwordSent) {
    console.log('Timeout waiting for password prompt');
    ssh.kill();
    process.exit(1);
  }
}, 30000);
