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
    console.log('Using server:', serverData.name, '(' + serverId + ')');

    // Get roles
    const rolesData = await page.evaluate(async (params) => {
      const { token, serverId } = params;
      const res = await fetch(`/api/servers/${serverId}/roles`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      return await res.json();
    }, { token, serverId });

    console.log('\n=== Available Roles ===');
    rolesData.forEach(role => {
      console.log(`  ${role.name} (${role.id})`);
    });

    // Get members
    const membersData = await page.evaluate(async (params) => {
      const { token, serverId } = params;
      const res = await fetch(`/api/servers/${serverId}/members`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      return await res.json();
    }, { token, serverId });

    console.log('\n=== Server Members ===');
    if (Array.isArray(membersData)) {
      membersData.forEach(member => {
        console.log(`  ${member.username} (${member.id})`);
      });
    } else {
      console.log('Members data format:', JSON.stringify(membersData).substring(0, 200));
    }

    // Try to assign a member to a role
    if (rolesData.length > 0 && Array.isArray(membersData) && membersData.length > 0) {
      const roleId = rolesData[0].id;
      const memberId = membersData[1]?.id || membersData[0]?.id; // Try to get second member, fallback to first

      if (memberId) {
        console.log(`\n=== Assigning ${membersData.find(m => m.id === memberId)?.username} to role ${rolesData[0].name} ===`);

        // Try to add member to role
        const assignResult = await page.evaluate(async (params) => {
          const { token, serverId, memberId, roleId } = params;
          try {
            const res = await fetch(`/api/servers/${serverId}/roles/${roleId}/members`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({ userId: memberId })
            });

            const text = await res.text();
            let data;
            try { data = JSON.parse(text); } catch { data = text; }

            return { status: res.status, data: data };
          } catch (e) {
            return { error: e.message };
          }
        }, { token, serverId, memberId, roleId });

        console.log('Assignment Result:', JSON.stringify(assignResult, null, 2));

        // Check if member now has the role
        console.log('\n=== Verifying role assignment ===');
        const verifyResult = await page.evaluate(async (params) => {
          const { token, serverId } = params;
          const res = await fetch(`/api/servers/${serverId}/members`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          return await res.json();
        }, { token, serverId });

        if (Array.isArray(verifyResult)) {
          const assignedMember = verifyResult.find(m => m.id === memberId);
          if (assignedMember) {
            console.log('Member after assignment:', JSON.stringify(assignedMember, null, 2).substring(0, 500));
          }
        }
      }
    }

  } catch (e) {
    console.log('TEST ERROR:', e.message);
    console.error(e);
  }

  await browser.close();
})();
