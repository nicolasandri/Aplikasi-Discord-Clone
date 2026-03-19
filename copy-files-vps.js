const { Client } = require('ssh2');
const fs = require('fs');

const password = '%0|F?H@f!berhO3e';

// File contents
const packageJson = `{
  "name": "workgrid-backend",
  "version": "1.0.0",
  "description": "WorkGrid Backend API",
  "main": "server.js",
  "scripts": {
    "start": "node server.js"
  },
  "dependencies": {
    "express": "^4.18.2",
    "cors": "^2.8.5",
    "pg": "^8.11.0",
    "redis": "^4.6.5",
    "jsonwebtoken": "^9.0.0",
    "bcryptjs": "^2.4.3",
    "socket.io": "^4.6.1",
    "multer": "^1.4.5-lts.1",
    "uuid": "^9.0.0"
  }
}`;

const serverJs = `const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: ['http://165.22.63.51', 'http://workgrid.homeku.net'],
    methods: ['GET', 'POST']
  }
});

// Middleware
app.use(cors({
  origin: ['http://165.22.63.51', 'http://workgrid.homeku.net']
}));
app.use(express.json());

// PostgreSQL Connection
const pool = new Pool({
  host: process.env.DB_HOST || 'db',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'discord_clone',
  user: process.env.DB_USER || 'discord_user',
  password: process.env.DB_PASSWORD || 'WorkGridDB@Secure2024!'
});

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT NOW()');
    res.json({ 
      status: 'healthy', 
      database: 'connected',
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    res.status(500).json({ 
      status: 'unhealthy', 
      database: 'disconnected',
      error: err.message 
    });
  }
});

// API test endpoint
app.get('/api/test', (req, res) => {
  res.json({ message: 'Backend API is running', timestamp: new Date().toISOString() });
});

// Socket.IO connection
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, '0.0.0.0', () => {
  console.log('WorkGrid Backend running on port', PORT);
});
`;

const dockerfile = `FROM node:20-alpine
WORKDIR /app
RUN apk add --no-cache postgresql-client curl
COPY package*.json ./
RUN npm install
COPY . .
RUN mkdir -p uploads && chmod 777 uploads
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 CMD curl -f http://localhost:3001/health || exit 1
EXPOSE 3001
CMD ["node", "server.js"]
`;

function copyFile(host, path, content, label) {
  return new Promise((resolve, reject) => {
    const conn = new Client();
    
    conn.on('ready', () => {
      conn.exec(`cat > ${path} << 'EOF'\n${content}\nEOF`, (err, stream) => {
        if (err) {
          reject(err);
          return;
        }
        
        stream.on('close', (code) => {
          console.log(`[${label}] ${path} created, code: ${code}`);
          conn.end();
          resolve(code);
        }).on('data', () => {}).stderr.on('data', () => {});
      });
    }).on('error', reject).connect({
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
    console.log('Copying files to VPS 2 (Backend)...');
    
    await copyFile('152.42.229.212', '/opt/workgrid/server/package.json', packageJson, 'BACKEND');
    await copyFile('152.42.229.212', '/opt/workgrid/server/server.js', serverJs, 'BACKEND');
    await copyFile('152.42.229.212', '/opt/workgrid/server/Dockerfile', dockerfile, 'BACKEND');
    
    console.log('\\n✅ All files copied successfully!');
  } catch (err) {
    console.error('Failed:', err.message);
    process.exit(1);
  }
}

main();
