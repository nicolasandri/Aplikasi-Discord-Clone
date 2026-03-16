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

    // Get server data
    const serverData = await page.evaluate(async (params) => {
      const { token } = params;
      const res = await fetch('/api/servers', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      return Array.isArray(data) && data.length > 0 ? data[0] : null;
    }, { token });

    if (!serverData) {
      console.log('No servers found');
      return;
    }

    const serverId = serverData.id;
    console.log('Using server:', serverData.name);

    // Get roles and members
    const [rolesData, membersData] = await Promise.all([
      page.evaluate(async (params) => {
        const { token, serverId } = params;
        const res = await fetch(`/api/servers/${serverId}/roles`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        return await res.json();
      }, { token, serverId }),
      page.evaluate(async (params) => {
        const { token, serverId } = params;
        const res = await fetch(`/api/servers/${serverId}/members`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        return await res.json();
      }, { token, serverId })
    ]);

    console.log('Roles:', rolesData.length, 'Members:', Array.isArray(membersData) ? membersData.length : 'error');

    // Find a non-admin member to assign role to
    const targetMember = Array.isArray(membersData) ? membersData.find(m => m.username !== 'Admin') : null;
    const targetRole = rolesData[0];

    if (!targetMember || !targetRole) {
      console.log('Not enough data to test role assignment');
      return;
    }

    console.log(`\n=== Testing role assignment ===`);
    console.log(`Member: ${targetMember.username} (${targetMember.id})`);
    console.log(`Role: ${targetRole.name} (${targetRole.id})`);

    // Try the CORRECT endpoint: PUT /api/servers/{serverId}/members/{userId}/custom-role
    const assignResult = await page.evaluate(async (params) => {
      const { token, serverId, userId, roleId } = params;
      const res = await fetch(`/api/servers/${serverId}/members/${userId}/custom-role`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ roleId })
      });

      const text = await res.text();
      let data;
      try { data = JSON.parse(text); } catch { data = text; }

      return { status: res.status, data: data };
    }, { token, serverId, userId: targetMember.id, roleId: targetRole.id });

    console.log('Assignment Result:', JSON.stringify(assignResult, null, 2));

    // Verify the assignment
    console.log('\n=== Verifying assignment ===');
    const memberRolesResult = await page.evaluate(async (params) => {
      const { token, serverId, userId } = params;
      const res = await fetch(`/api/servers/${serverId}/members/${userId}/roles`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      return { status: res.status, roles: data };
    }, { token, serverId, userId: targetMember.id });

    console.log('Member Roles:', JSON.stringify(memberRolesResult, null, 2));

  } catch (e) {
    console.log('TEST ERROR:', e.message);
    console.error(e);
  }

  await browser.close();
})();
