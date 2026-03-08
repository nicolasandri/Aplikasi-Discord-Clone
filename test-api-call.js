/**
 * Test API call untuk channel endpoint
 */

const http = require('http');

const API_HOST = 'localhost';
const API_PORT = 3001;
const SERVER_ID = '14ee678c-3db9-46e3-b68b-4a636a896c28';

// We need to get a valid token first
// Let's check if we can get it from localStorage simulation or use a test login

async function loginAndGetToken() {
  const { dbGet } = require('./server/database.js');
  const jwt = require('jsonwebtoken');
  
  // Get user WorkGrid GM
  const user = await dbGet('SELECT * FROM users WHERE id = ?', 
    ['4e0bd272-0fee-4fe4-92ba-615fd90bb757']);
  
  if (!user) {
    console.log('User not found');
    return null;
  }
  
  // Create a token (simplified)
  const JWT_SECRET = 'workgrid-super-secret-key-min-32-characters';
  const token = jwt.sign(
    { userId: user.id, email: user.email },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
  
  return token;
}

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
      
      console.log(`\nResponse Status: ${res.statusCode}`);
      console.log(`Response Headers:`, res.headers);
      
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

async function testAPICall() {
  try {
    console.log('=== Testing API Call ===\n');
    
    const token = await loginAndGetToken();
    if (!token) {
      console.log('Failed to get token');
      return;
    }
    
    console.log('Token obtained successfully');
    console.log('Testing: GET /api/servers/' + SERVER_ID + '/categories');
    
    const data = await makeRequest(`/api/servers/${SERVER_ID}/categories`, token);
    
    console.log('\n=== API Response ===');
    if (data.categories) {
      console.log(`Categories:`);
      data.categories.forEach(cat => {
        console.log(`  Category: ${cat.name}`);
        if (cat.channels) {
          cat.channels.forEach(c => console.log(`    - ${c.name} (${c.id})`));
        }
      });
      console.log(`\nUncategorized:`);
      if (data.uncategorized) {
        data.uncategorized.forEach(c => console.log(`  - ${c.name} (${c.id})`));
      }
    } else {
      console.log('Response:', data);
    }
    
  } catch (err) {
    console.error('API test error:', err.message);
  }
  
  process.exit(0);
}

testAPICall();
