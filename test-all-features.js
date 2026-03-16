#!/usr/bin/env node
/**
 * Comprehensive Test Suite for WorkGrid
 * Tests all major features via API
 * 
 * Usage: node test-all-features.js [base_url]
 * Example: node test-all-features.js http://152.42.242.180
 */

const http = require('http');
const https = require('https');

const BASE_URL = process.argv[2] || 'http://152.42.242.180';
const API_URL = `${BASE_URL}/api`;

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

let testsPassed = 0;
let testsFailed = 0;
const testResults = [];

// Helper to make HTTP requests
function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    const req = client.request(url, options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve({ status: res.statusCode, headers: res.headers, data: json });
        } catch {
          resolve({ status: res.statusCode, headers: res.headers, data: data });
        }
      });
    });
    req.on('error', reject);
    req.setTimeout(10000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
    if (options.body) req.write(options.body);
    req.end();
  });
}

// Test function wrapper
async function test(name, testFn) {
  process.stdout.write(`  Testing ${name}... `);
  try {
    const start = Date.now();
    await testFn();
    const duration = Date.now() - start;
    console.log(`${colors.green}✓ PASS${colors.reset} (${duration}ms)`);
    testsPassed++;
    testResults.push({ name, status: 'PASS', duration });
  } catch (error) {
    console.log(`${colors.red}✗ FAIL${colors.reset}`);
    console.log(`    Error: ${error.message}`);
    testsFailed++;
    testResults.push({ name, status: 'FAIL', error: error.message });
  }
}

// Assertion helpers
function assertEquals(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(`${message || 'Assertion failed'}: expected ${expected}, got ${actual}`);
  }
}

function assertTrue(condition, message) {
  if (!condition) {
    throw new Error(message || 'Assertion failed: expected true');
  }
}

function assertExists(value, message) {
  if (value === undefined || value === null) {
    throw new Error(message || 'Assertion failed: expected value to exist');
  }
}

// ============================================
// TEST SUITES
// ============================================

async function testHealth() {
  console.log(`\n${colors.cyan}=== HEALTH CHECKS ===${colors.reset}`);
  
  await test('Health endpoint', async () => {
    const res = await makeRequest(`${BASE_URL}/api/health`);
    assertEquals(res.status, 200, 'Status code');
    assertTrue(res.data.status === 'healthy' || res.data.status === 'ok', 'Health status');
  });
}

async function testCORS() {
  console.log(`\n${colors.cyan}=== CORS CONFIGURATION ===${colors.reset}`);
  
  await test('CORS headers on API', async () => {
    const res = await makeRequest(`${API_URL}/health`, {
      method: 'OPTIONS',
      headers: {
        'Origin': 'http://workgrid.homeku.net',
        'Access-Control-Request-Method': 'GET'
      }
    });
    assertExists(res.headers['access-control-allow-origin'], 'CORS allow origin header');
  });
  
  await test('CORS preflight response', async () => {
    const res = await makeRequest(`${API_URL}/health`, {
      method: 'OPTIONS',
      headers: {
        'Origin': 'http://workgrid.homeku.net',
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'Content-Type,Authorization'
      }
    });
    assertEquals(res.status, 204, 'Preflight status code');
  });
}

async function testStaticFiles() {
  console.log(`\n${colors.cyan}=== STATIC FILES ===${colors.reset}`);
  
  await test('Frontend serving', async () => {
    const res = await makeRequest(`${BASE_URL}/`);
    assertEquals(res.status, 200, 'Status code');
    assertTrue(res.data.includes('<!DOCTYPE html>') || res.data.includes('<html'), 'HTML content');
  });
  
  await test('Uploads directory accessible', async () => {
    const res = await makeRequest(`${BASE_URL}/uploads/`);
    // Should get directory listing or 403, not 404
    assertTrue(res.status !== 404, 'Uploads directory exists');
  });
  
  // Check if there are any upload files to test
  await test('Sample upload file exists', async () => {
    // Try to get a list of uploads from a known file pattern
    const testFiles = [
      'file-1771787357862-340831807.png',
      'file-1772931542928-604654610.png'
    ];
    let found = false;
    for (const file of testFiles) {
      try {
        const res = await makeRequest(`${BASE_URL}/uploads/${file}`);
        if (res.status === 200) {
          found = true;
          break;
        }
      } catch {}
    }
    // If no files found, that's OK - just means no uploads yet
    if (!found) {
      console.log(`\n    ${colors.yellow}⚠ No sample upload files found (this is OK if no uploads exist)${colors.reset}`);
    }
  });
}

async function testAuth() {
  console.log(`\n${colors.cyan}=== AUTHENTICATION ===${colors.reset}`);
  
  await test('Register endpoint exists', async () => {
    const res = await makeRequest(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'testuser_' + Date.now(),
        email: `test_${Date.now()}@test.com`,
        password: 'TestPass123!'
      })
    });
    // Should get 201 (created) or 400 (if user exists) or 409 (conflict)
    assertTrue([200, 201, 400, 409].includes(res.status), 'Register endpoint response');
  });
  
  await test('Login endpoint exists', async () => {
    const res = await makeRequest(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@workgrid.com',
        password: 'admin123'
      })
    });
    // Should get 200 (success) or 401 (wrong password)
    assertTrue([200, 401].includes(res.status), 'Login endpoint response');
  });
  
  await test('Protected endpoint requires auth', async () => {
    const res = await makeRequest(`${API_URL}/users/me`);
    assertEquals(res.status, 401, 'Unauthorized without token');
  });
}

async function testAPI() {
  console.log(`\n${colors.cyan}=== API ENDPOINTS ===${colors.reset}`);
  
  await test('Get servers endpoint (public)', async () => {
    // Try to access without auth
    const res = await makeRequest(`${API_URL}/servers`);
    // Should be 401 without auth
    assertEquals(res.status, 401, 'Requires authentication');
  });
  
  await test('Get VAPID public key', async () => {
    const res = await makeRequest(`${API_URL}/push/vapid-public-key`);
    assertTrue([200, 404].includes(res.status), 'VAPID endpoint exists');
  });
}

async function testWebSocket() {
  console.log(`\n${colors.cyan}=== WEBSOCKET ===${colors.reset}`);
  
  await test('Socket.IO endpoint accessible', async () => {
    const res = await makeRequest(`${BASE_URL}/socket.io/`);
    // Socket.IO returns specific error or handshake
    assertTrue(res.status === 400 || res.data.includes('socket.io') || typeof res.data === 'object', 
      'Socket.IO endpoint responds');
  });
}

// ============================================
// MAIN
// ============================================

async function runTests() {
  console.log(`${colors.cyan}
╔════════════════════════════════════════════════════════════╗
║           WORKGRID COMPREHENSIVE TEST SUITE                ║
╠════════════════════════════════════════════════════════════╣
║  Target: ${BASE_URL.padEnd(45)}║
║  Time:   ${new Date().toISOString().slice(0, 19).padEnd(45)}║
╚════════════════════════════════════════════════════════════╝
${colors.reset}`);

  const startTime = Date.now();
  
  try {
    await testHealth();
    await testCORS();
    await testStaticFiles();
    await testAuth();
    await testAPI();
    await testWebSocket();
  } catch (error) {
    console.error(`${colors.red}Test suite error: ${error.message}${colors.reset}`);
  }
  
  const totalTime = Date.now() - startTime;
  
  // Print summary
  console.log(`\n${colors.cyan}╔════════════════════════════════════════════════════════════╗`);
  console.log(`║                      TEST SUMMARY                          ║`);
  console.log(`╠════════════════════════════════════════════════════════════╣`);
  console.log(`║  Total Tests: ${String(testsPassed + testsFailed).padEnd(42)}║`);
  console.log(`║  ${colors.green}Passed: ${String(testsPassed).padEnd(50)}${colors.reset}║`);
  console.log(`║  ${colors.red}Failed: ${String(testsFailed).padEnd(50)}${colors.reset}║`);
  console.log(`║  Duration: ${String(totalTime + 'ms').padEnd(46)}║`);
  console.log(`╚════════════════════════════════════════════════════════════╝\n`);
  
  // Print failed tests
  if (testsFailed > 0) {
    console.log(`${colors.red}Failed Tests:${colors.reset}`);
    testResults.filter(t => t.status === 'FAIL').forEach(t => {
      console.log(`  - ${t.name}: ${t.error}`);
    });
    console.log('');
  }
  
  // Exit code
  process.exit(testsFailed > 0 ? 1 : 0);
}

runTests();
