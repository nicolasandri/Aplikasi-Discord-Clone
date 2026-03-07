#!/usr/bin/env node

/**
 * Script untuk setup Master Admin pertama kali
 * 
 * Usage: node setup-master-admin.js <email> [setup_key]
 * 
 * Default setup key: workgrid-setup-2024
 * Atau gunakan environment variable MASTER_ADMIN_SETUP_KEY
 */

const http = require('http');

const API_URL = process.env.API_URL || 'http://localhost:3001';
const SETUP_KEY = process.env.MASTER_ADMIN_SETUP_KEY || 'workgrid-setup-2024';

const email = process.argv[2];
const customSetupKey = process.argv[3];

if (!email) {
  console.log(`
Usage: node setup-master-admin.js <email> [setup_key]

Arguments:
  email       Email user yang akan dijadikan Master Admin
  setup_key   Secret key untuk setup (optional, default: workgrid-setup-2024)

Environment Variables:
  API_URL                 Base URL API (default: http://localhost:3001)
  MASTER_ADMIN_SETUP_KEY  Secret key untuk setup (default: workgrid-setup-2024)

Examples:
  node setup-master-admin.js admin@workgrid.com
  node setup-master-admin.js admin@workgrid.com my-secret-key
  API_URL=http://192.168.1.100:3001 node setup-master-admin.js admin@workgrid.com
`);
  process.exit(1);
}

const setupKey = customSetupKey || SETUP_KEY;

const data = JSON.stringify({
  email: email,
  secretKey: setupKey
});

const options = {
  hostname: new URL(API_URL).hostname,
  port: new URL(API_URL).port,
  path: '/api/setup-master-admin',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
};

console.log(`Setting up Master Admin...`);
console.log(`API URL: ${API_URL}`);
console.log(`Email: ${email}`);

const req = http.request(options, (res) => {
  let responseData = '';

  res.on('data', (chunk) => {
    responseData += chunk;
  });

  res.on('end', () => {
    try {
      const result = JSON.parse(responseData);
      if (res.statusCode === 200) {
        console.log('✅ Success:', result.message);
      } else {
        console.error('❌ Error:', result.error);
        process.exit(1);
      }
    } catch (e) {
      console.error('❌ Failed to parse response:', responseData);
      process.exit(1);
    }
  });
});

req.on('error', (error) => {
  console.error('❌ Request failed:', error.message);
  console.log('\nMake sure the server is running on', API_URL);
  process.exit(1);
});

req.write(data);
req.end();
