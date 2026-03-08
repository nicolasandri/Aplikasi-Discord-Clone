/**
 * Test API call for DM channels
 */

const http = require('http');

const API_HOST = 'localhost';
const API_PORT = 3001;

// Create token for user KOADA (owner)
const jwt = require('jsonwebtoken');
const JWT_SECRET = 'workgrid-super-secret-key-min-32-characters';
const token = jwt.sign(
  { userId: 'be97eaa0-ec14-45c8-9b40-9af3ebcd3327', email: 'admin@workgrid.com' },
  JWT_SECRET,
  { expiresIn: '7d' }
);

function makeRequest(path, token) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: API_HOST,
      port: API_PORT,
      path: path,
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve(parsed);
        } catch (e) {
          resolve(data);
        }
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    req.end();
  });
}

async function testDMChannels() {
  try {
    console.log('=== Testing DM Channels API ===\n');
    
    const channels = await makeRequest('/api/dm/channels', token);
    
    console.log('DM Channels:');
    channels.forEach(ch => {
      console.log(`\n  - ${ch.friend?.username || ch.name}:`);
      console.log(`    lastMessage: ${ch.lastMessage}`);
      console.log(`    lastMessageAt: ${ch.lastMessageAt}`);
      console.log(`    last_message (raw): ${ch.last_message}`);
      console.log(`    last_message_at (raw): ${ch.last_message_at}`);
    });
    
  } catch (err) {
    console.error('API test error:', err.message);
  }
  
  process.exit(0);
}

testDMChannels();
