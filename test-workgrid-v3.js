const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ ignoreHTTPSErrors: true });
  const page = await context.newPage();

  const serverErrors = [];
  const consoleErrors = [];
  const networkFailures = [];

  page.on('console', msg => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });
  page.on('response', response => {
    if (response.status() >= 400) serverErrors.push(`${response.status()} ${response.url()}`);
  });
  page.on('requestfailed', req => {
    networkFailures.push(`${req.failure().errorText} - ${req.url()}`);
  });

  try {
    // Login
    console.log('=== Logging in ===');
    await page.goto('https://workgrid.homeku.net/login', { waitUntil: 'networkidle', timeout: 30000 });
    await page.fill('input[type="email"], input#email, input[placeholder*="email" i]', 'admin@workgrid.com');
    await page.fill('input[type="password"], input#password', 'admin123');
    await page.click('button[type="submit"], button:has-text("Masuk")');
    await page.waitForURL('**/friends**', { timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(3000);
    console.log('Logged in. URL:', page.url());

    // Clear errors from login process
    serverErrors.length = 0;
    consoleErrors.length = 0;
    networkFailures.length = 0;

    // Screenshot friends page
    await page.screenshot({ path: 'screenshot-friends.png', fullPage: true });

    // Check connection status
    const statusText = await page.textContent('body');
    const isOnline = statusText.includes('Online');
    console.log('WebSocket connected:', isOnline);

    // Check visible servers in sidebar
    console.log('\n=== Checking visible sidebar ===');
    const sidebarHTML = await page.evaluate(() => {
      const sidebar = document.querySelector('[class*="sidebar"], nav, [class*="server-list"]');
      return sidebar ? sidebar.innerText.substring(0, 500) : 'No sidebar found';
    });
    console.log('Sidebar content:', sidebarHTML.substring(0, 300));

    // Find and click on server
    console.log('\n=== Looking for server links ===');
    const allLinks = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('a')).map(a => ({ href: a.href, text: a.innerText.substring(0, 50) })).filter(a => a.href.includes('channel'));
    });
    console.log('Channel links:', JSON.stringify(allLinks).substring(0, 500));

    // Try to find server icons/buttons in sidebar
    const serverButtons = await page.$$('img[alt*="server" i], div[class*="serverIcon"], [data-tooltip], .server-icon');
    console.log('Server buttons found:', serverButtons.length);

    // Wait and look for any clickable server elements
    const clickableServers = await page.evaluate(() => {
      // Look for elements that might be server icons
      const imgs = Array.from(document.querySelectorAll('img'));
      const serverImgs = imgs.filter(img => {
        const parent = img.closest('a') || img.closest('button') || img.closest('[role="button"]');
        return parent && (parent.href?.includes('channel') || img.alt);
      });
      return serverImgs.map(img => ({ alt: img.alt, src: img.src?.substring(0, 100), parentHref: img.closest('a')?.href }));
    });
    console.log('Clickable server elements:', JSON.stringify(clickableServers).substring(0, 500));

    // Navigate to friends page and check API responses
    console.log('\n=== Testing API endpoints ===');

    // Get cookies for auth
    const cookies = await context.cookies();
    const tokenCookie = cookies.find(c => c.name === 'token' || c.name === 'jwt' || c.name === 'session');
    console.log('Auth cookies:', cookies.map(c => c.name).join(', '));

    // Use page context to call APIs (with cookies)
    const apiTests = [
      '/api/users/me',
      '/api/servers',
      '/api/dm-channels',
      '/api/friends',
    ];

    for (const endpoint of apiTests) {
      const result = await page.evaluate(async (url) => {
        try {
          const res = await fetch(url, { credentials: 'same-origin' });
          const text = await res.text();
          let data;
          try { data = JSON.parse(text); } catch { data = text.substring(0, 200); }
          return { status: res.status, data: typeof data === 'object' ? JSON.stringify(data).substring(0, 300) : data };
        } catch (e) {
          return { error: e.message };
        }
      }, endpoint);
      console.log(`  ${endpoint}: ${result.status || 'ERROR'} - ${result.data || result.error}`);
    }

    // Try navigating to a server page
    console.log('\n=== Testing server navigation ===');
    const serversResult = await page.evaluate(async () => {
      const res = await fetch('/api/servers', { credentials: 'same-origin' });
      if (res.ok) return await res.json();
      return null;
    });

    if (serversResult && Array.isArray(serversResult) && serversResult.length > 0) {
      const server = serversResult[0];
      console.log('First server:', server.name, '-', server.id);

      // Navigate to server
      await page.goto(`https://workgrid.homeku.net/channels/${server.id}`, { waitUntil: 'networkidle', timeout: 15000 }).catch(() => {});
      await page.waitForTimeout(5000);
      await page.screenshot({ path: 'screenshot-server.png', fullPage: true });
      console.log('Server page URL:', page.url());

      // Test server-specific APIs
      const serverApis = [
        `/api/servers/${server.id}`,
        `/api/servers/${server.id}/channels`,
        `/api/servers/${server.id}/members`,
        `/api/servers/${server.id}/roles`,
      ];

      for (const endpoint of serverApis) {
        const result = await page.evaluate(async (url) => {
          try {
            const res = await fetch(url, { credentials: 'same-origin' });
            const text = await res.text();
            let data;
            try { data = JSON.parse(text); } catch { data = text.substring(0, 200); }
            return { status: res.status, data: typeof data === 'object' ? JSON.stringify(data).substring(0, 300) : data };
          } catch (e) {
            return { error: e.message };
          }
        }, endpoint);
        console.log(`  ${endpoint.replace(server.id, '{id}')}: ${result.status || 'ERROR'} - ${(result.data || result.error || '').substring(0, 150)}`);
      }

      // Navigate to a channel
      const channelsResult = await page.evaluate(async (sid) => {
        const res = await fetch(`/api/servers/${sid}/channels`, { credentials: 'same-origin' });
        if (res.ok) return await res.json();
        return null;
      }, server.id);

      if (channelsResult && channelsResult.length > 0) {
        const channel = channelsResult[0];
        console.log('\nNavigating to channel:', channel.name, '-', channel.id);
        await page.goto(`https://workgrid.homeku.net/channels/${server.id}/${channel.id}`, { waitUntil: 'networkidle', timeout: 15000 }).catch(() => {});
        await page.waitForTimeout(5000);
        await page.screenshot({ path: 'screenshot-channel.png', fullPage: true });

        // Test messages
        const msgsResult = await page.evaluate(async (cid) => {
          const res = await fetch(`/api/channels/${cid}/messages?limit=10`, { credentials: 'same-origin' });
          return { status: res.status, count: res.ok ? (await res.json()).length : 'error' };
        }, channel.id);
        console.log(`  Messages: ${msgsResult.status} - ${msgsResult.count} messages`);
      }
    } else {
      console.log('No servers found or API returned error');
    }

  } catch (e) {
    console.log('TEST ERROR:', e.message);
    await page.screenshot({ path: 'screenshot-error.png', fullPage: true }).catch(() => {});
  }

  console.log('\n========== ERROR SUMMARY ==========');
  console.log(`Console Errors (${consoleErrors.length}):`);
  [...new Set(consoleErrors)].slice(0, 15).forEach(e => console.log('  -', e.substring(0, 200)));
  console.log(`\nNetwork Failures (${networkFailures.length}):`);
  networkFailures.slice(0, 10).forEach(e => console.log('  -', e.substring(0, 200)));
  console.log(`\nHTTP Errors 4xx/5xx (${serverErrors.length}):`);
  [...new Set(serverErrors)].slice(0, 30).forEach(e => console.log('  -', e.substring(0, 200)));

  await browser.close();
})();
