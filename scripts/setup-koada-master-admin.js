#!/usr/bin/env node

/**
 * Script untuk setup KOADA sebagai Master Admin
 */

const http = require('http');

const API_URL = process.env.API_URL || 'http://localhost:3001';
const SETUP_KEY = process.env.MASTER_ADMIN_SETUP_KEY || 'workgrid-setup-2024';

// Email KOADA (dari screenshot)
const email = 'koada@example.com'; // Ganti dengan email KOADA yang sebenarnya

const data = JSON.stringify({
  email: email,
  secretKey: SETUP_KEY
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

console.log(`Setting up Master Admin for: ${email}`);
console.log(`API URL: ${API_URL}`);

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
        console.log('\nSekarang KOADA adalah Master Admin!');
        console.log('Silakan refresh browser dan akses http://localhost:5173/admin');
      } else {
        console.error('❌ Error:', result.error);
        if (result.error.includes('already exists')) {
          console.log('\n⚠️  Master Admin sudah ada. Gunakan akun yang sudah ada atau hapus dulu.');
        }
      }
    } catch (e) {
      console.error('❌ Failed to parse response:', responseData);
    }
  });
});

req.on('error', (error) => {
  console.error('❌ Request failed:', error.message);
  console.log('\nMake sure the server is running on', API_URL);
});

req.write(data);
req.end();
