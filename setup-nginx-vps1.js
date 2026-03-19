const { Client } = require('ssh2');

const nginxConf = `server {
    listen 80;
    server_name workgrid.homeku.net;
    
    location / {
        root /var/www/workgrid;
        index index.html;
        try_files $uri $uri/ /index.html;
    }
    
    location /api {
        proxy_pass http://152.42.229.212:3001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    location /socket.io {
        proxy_pass http://152.42.229.212:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection upgrade;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_cache_bypass $http_upgrade;
    }
}`;

const indexHtml = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>WorkGrid - Team Collaboration</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #0a0c10 0%, #1a1d24 100%);
            color: white;
            min-height: 100vh;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            text-align: center;
        }
        .container { max-width: 800px; padding: 2rem; }
        h1 { font-size: 3rem; margin-bottom: 1rem; background: linear-gradient(135deg, #06b6d4, #22d3ee); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
        p { font-size: 1.2rem; color: #9ca3af; margin-bottom: 2rem; }
        .status { 
            background: rgba(6, 182, 212, 0.1); 
            border: 1px solid #06b6d4; 
            padding: 1rem 2rem; 
            border-radius: 8px;
            margin-bottom: 1rem;
        }
        .status.success { border-color: #22c55e; background: rgba(34, 197, 94, 0.1); }
        .btn {
            background: linear-gradient(135deg, #06b6d4, #0891b2);
            color: white;
            padding: 1rem 2rem;
            border-radius: 8px;
            text-decoration: none;
            display: inline-block;
            margin-top: 1rem;
            transition: transform 0.2s;
        }
        .btn:hover { transform: translateY(-2px); }
        .api-test { margin-top: 2rem; padding: 1rem; background: rgba(255,255,255,0.05); border-radius: 8px; }
    </style>
</head>
<body>
    <div class="container">
        <h1>WorkGrid</h1>
        <p>Team Collaboration Platform</p>
        <div class="status success">
            ✅ Frontend VPS Running<br>
            <small>IP: 165.22.63.51</small>
        </div>
        <div class="status">
            🔌 Backend: <span id="backend-status">Checking...</span>
        </div>
        <div class="api-test">
            <h3>API Test</h3>
            <button class="btn" onclick="testAPI()">Test Backend Connection</button>
            <p id="api-result"></p>
        </div>
    </div>
    
    <script>
        // Check backend status
        fetch('/api/test')
            .then(r => r.json())
            .then(data => {
                document.getElementById('backend-status').innerHTML = 
                    '<span style="color:#22c55e">Connected ✅</span>';
            })
            .catch(() => {
                document.getElementById('backend-status').innerHTML = 
                    '<span style="color:#ef4444">Disconnected ❌</span>';
            });
        
        function testAPI() {
            fetch('/api/test')
                .then(r => r.json())
                .then(data => {
                    document.getElementById('api-result').innerHTML = 
                        '<span style="color:#22c55e">Success:</span> ' + JSON.stringify(data);
                })
                .catch(err => {
                    document.getElementById('api-result').innerHTML = 
                        '<span style="color:#ef4444">Error:</span> ' + err.message;
                });
        }
    </script>
</body>
</html>`;

function setupNginx() {
  return new Promise((resolve, reject) => {
    const conn = new Client();
    
    conn.on('ready', () => {
      console.log('[FRONTEND] Connected to VPS 1');
      
      // Create nginx config
      conn.exec(`cat > /etc/nginx/sites-available/workgrid << 'EOF'
${nginxConf}
EOF`, (err) => {
        if (err) {
          reject(err);
          return;
        }
        
        // Create web directory and index
        conn.exec(`mkdir -p /var/www/workgrid && cat > /var/www/workgrid/index.html << 'EOF'
${indexHtml}
EOF`, (err) => {
          if (err) {
            reject(err);
            return;
          }
          
          // Enable site and restart nginx
          conn.exec('ln -sf /etc/nginx/sites-available/workgrid /etc/nginx/sites-enabled/workgrid && rm -f /etc/nginx/sites-enabled/default && nginx -t && systemctl restart nginx && systemctl is-active nginx', (err, stream) => {
            let output = '';
            stream.on('close', (code) => {
              console.log('[FRONTEND] Nginx setup complete, code:', code);
              console.log('[FRONTEND] Output:', output);
              conn.end();
              resolve(code);
            }).on('data', (data) => {
              output += data.toString();
            }).stderr.on('data', (data) => {
              output += data.toString();
            });
          });
        });
      });
    }).on('error', reject).connect({
      host: '165.22.63.51',
      port: 22,
      username: 'root',
      privateKey: require('fs').readFileSync('/home/nicolas/.ssh/workgrid_frontend'),
      readyTimeout: 30000
    });
  });
}

setupNginx()
  .then(() => console.log('\n✅ VPS 1 (Frontend) setup complete!'))
  .catch(err => console.error('\n❌ Error:', err.message));
