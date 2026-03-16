const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ ignoreHTTPSErrors: true });
  const page = await context.newPage();

  try {
    // Login
    console.log('=== Logging in ===');
    await page.goto('https://workgrid.homeku.net/login', { waitUntil: 'networkidle', timeout: 30000 });
    await page.fill('input[type="email"]', 'admin@workgrid.com');
    await page.fill('input[type="password"]', 'admin123');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(5000);

    const token = await page.evaluate(() => localStorage.getItem('token'));
    console.log('Token obtained:', !!token);

    // Test servers endpoint
    console.log('\n=== Testing /api/servers ===');
    const serversResult = await page.evaluate(async (token) => {
      const res = await fetch('/api/servers', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      return { status: res.status, count: Array.isArray(data) ? data.length : 0, firstServer: data[0] };
    }, token);
    console.log('Servers:', JSON.stringify(serversResult, null, 2));

    // Get first server ID for admin endpoint tests
    const serverData = await page.evaluate(async (token) => {
      const res = await fetch('/api/servers', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      return Array.isArray(data) && data.length > 0 ? data[0] : null;
    }, token);

    if (serverData) {
      const serverId = serverData.id;
      console.log('\nUsing server ID:', serverId);

      // Test GET /api/admin/server-access/users - this was returning 500
      console.log('\n=== Testing /api/admin/server-access/users (GET) ===');
      const serverAccessResult = await page.evaluate(async (params) => {
        const { token, serverId } = params;
        try {
          const res = await fetch(`/api/admin/server-access/users?serverId=${serverId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          const text = await res.text();
          let data;
          try { data = JSON.parse(text); } catch { data = text; }
          return { status: res.status, data: data };
        } catch (e) {
          return { error: e.message };
        }
      }, { token, serverId });
      console.log('Server Access Result:', JSON.stringify(serverAccessResult, null, 2));

      // Test server channels
      console.log('\n=== Testing /api/servers/{id}/channels ===');
      const channelsResult = await page.evaluate(async (params) => {
        const { token, serverId } = params;
        try {
          const res = await fetch(`/api/servers/${serverId}/channels`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          const text = await res.text();
          let data;
          try { data = JSON.parse(text); } catch { data = text; }
          return { status: res.status, count: Array.isArray(data) ? data.length : 'N/A', data: data };
        } catch (e) {
          return { error: e.message };
        }
      }, { token, serverId });
      console.log('Channels:', JSON.stringify(channelsResult, null, 2));

      // Test server members
      console.log('\n=== Testing /api/servers/{id}/members ===');
      const membersResult = await page.evaluate(async (params) => {
        const { token, serverId } = params;
        try {
          const res = await fetch(`/api/servers/${serverId}/members`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          const text = await res.text();
          let data;
          try { data = JSON.parse(text); } catch { data = text; }
          return { status: res.status, count: Array.isArray(data) ? data.length : 'N/A' };
        } catch (e) {
          return { error: e.message };
        }
      }, { token, serverId });
      console.log('Members:', JSON.stringify(membersResult, null, 2));

      // Test server roles
      console.log('\n=== Testing /api/servers/{id}/roles ===');
      const rolesResult = await page.evaluate(async (params) => {
        const { token, serverId } = params;
        try {
          const res = await fetch(`/api/servers/${serverId}/roles`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          const text = await res.text();
          let data;
          try { data = JSON.parse(text); } catch { data = text; }
          return { status: res.status, count: Array.isArray(data) ? data.length : 'N/A', data: data };
        } catch (e) {
          return { error: e.message };
        }
      }, { token, serverId });
      console.log('Roles:', JSON.stringify(rolesResult, null, 2));

    } else {
      console.log('No servers found');
    }

  } catch (e) {
    console.log('TEST ERROR:', e.message);
    console.error(e);
  }

  await browser.close();
})();
