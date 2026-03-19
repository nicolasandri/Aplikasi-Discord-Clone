const { Client } = require('ssh2');

const password = '%0|F?H@f!berhO3e';
const server = '143.198.217.81';
const publicKey = 'ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIN8DFb+EN1qfUrq6wSfph5cyqNR7NnV7dXFwhs33ip+B workgrid-sgp-access';

const conn = new Client();

conn.on('ready', () => {
  console.log('SSH connected');
  
  const commands = [
    'mkdir -p /root/.ssh',
    'chmod 700 /root/.ssh',
    `echo '${publicKey}' > /root/.ssh/authorized_keys`,
    'chmod 600 /root/.ssh/authorized_keys',
    'systemctl restart sshd || service ssh restart',
    'echo "SSH key setup complete"'
  ].join(' && ');
  
  conn.exec(commands, (err, stream) => {
    if (err) {
      console.error('Exec error:', err);
      conn.end();
      return;
    }
    
    stream.on('close', (code, signal) => {
      console.log('Stream closed with code:', code);
      conn.end();
    }).on('data', (data) => {
      console.log('STDOUT:', data.toString());
    }).stderr.on('data', (data) => {
      console.log('STDERR:', data.toString());
    });
  });
}).on('error', (err) => {
  console.error('SSH error:', err);
}).connect({
  host: server,
  port: 22,
  username: 'root',
  password: password,
  readyTimeout: 30000
});
