const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ ignoreHTTPSErrors: true });
  const page = await context.newPage();

  const serverErrors = [];
  const consoleErrors = [];

  page.on('console', msg => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });
  page.on('response', response => {
    if (response.status() >= 400) serverErrors.push(`${response.status()} ${response.url()}`);
  });

  try {
    // Login
    console.log('=== Logging in ===');
    await page.goto('https://workgrid.homeku.net/login', { waitUntil: 'networkidle', timeout: 30000 });
    await page.fill('input[type="email"], input#email, input[placeholder*="email" i]', 'admin@workgrid.com');
    await page.fill('input[type="password"], input#password', 'admin123');
    await page.click('button[type="submit"], button:has-text("Masuk")');
    await page.waitForTimeout(5000);
    console.log('Logged in. URL:', page.url());

    // Check sidebar for servers
    console.log('\n=== Checking servers ===');
    const serverIcons = await page.$$('[class*="server"], [class*="guild"], a[href*="channels"]');
    console.log('Server icons found:', serverIcons.length);

    // Try clicking first server icon (skip first which is usually DM)
    const sidebarLinks = await page.$$('a[href*="channels/"]');
    if (sidebarLinks.length > 0) {
      await sidebarLinks[0].click();
      await page.waitForTimeout(3000);
      console.log('Navigated to server. URL:', page.url());
    }

    // Try navigating to a known server URL
    console.log('\n=== Navigating to JEBOLTOGEL server ===');
    // First check what servers are available via API
    const serversResponse = await page.evaluate(async () => {
      const res = await fetch('/api/servers', { credentials: 'include' });
      return { status: res.status, data: await res.json().catch(() => null) };
    });
    console.log('Servers API:', serversResponse.status);
    if (serversResponse.data) {
      console.log('Servers:', JSON.stringify(serversResponse.data).substring(0, 500));

      if (Array.isArray(serversResponse.data) && serversResponse.data.length > 0) {
        const server = serversResponse.data[0];
        console.log('\nFirst server:', server.name, server.id);

        // Navigate to server
        await page.goto(`https://workgrid.homeku.net/channels/${server.id}`, { waitUntil: 'networkidle', timeout: 15000 }).catch(() => {});
        await page.waitForTimeout(3000);
        await page.screenshot({ path: 'screenshot-server.png', fullPage: true });
        console.log('Server page URL:', page.url());

        // Check channels
        const channelResponse = await page.evaluate(async (sid) => {
          const res = await fetch(`/api/servers/${sid}/channels`, { credentials: 'include' });
          return { status: res.status, data: await res.json().catch(() => null) };
        }, server.id);
        console.log('Channels API:', channelResponse.status);
        if (channelResponse.data) {
          console.log('Channels:', JSON.stringify(channelResponse.data).substring(0, 500));
        }

        // Check members
        const membersResponse = await page.evaluate(async (sid) => {
          const res = await fetch(`/api/servers/${sid}/members`, { credentials: 'include' });
          return { status: res.status, data: await res.json().catch(() => null) };
        }, server.id);
        console.log('Members API:', membersResponse.status);

        // Click first channel if available
        if (Array.isArray(channelResponse.data) && channelResponse.data.length > 0) {
          const ch = channelResponse.data[0];
          await page.goto(`https://workgrid.homeku.net/channels/${server.id}/${ch.id}`, { waitUntil: 'networkidle', timeout: 15000 }).catch(() => {});
          await page.waitForTimeout(3000);
          await page.screenshot({ path: 'screenshot-channel.png', fullPage: true });
          console.log('Channel page URL:', page.url());
        }
      }
    }

    // Check DMs
    console.log('\n=== Checking DMs ===');
    const dmsResponse = await page.evaluate(async () => {
      const res = await fetch('/api/dm-channels', { credentials: 'include' });
      return { status: res.status, data: await res.json().catch(e => e.message) };
    });
    console.log('DMs API:', dmsResponse.status, typeof dmsResponse.data === 'string' ? dmsResponse.data : `${Array.isArray(dmsResponse.data) ? dmsResponse.data.length : 0} channels`);

    // Check user profile
    console.log('\n=== Checking user profile ===');
    const meResponse = await page.evaluate(async () => {
      const res = await fetch('/api/users/me', { credentials: 'include' });
      return { status: res.status, data: await res.json().catch(e => e.message) };
    });
    console.log('Users/me API:', meResponse.status);
    if (meResponse.data && typeof meResponse.data === 'object') {
      console.log('User:', meResponse.data.username, meResponse.data.email);
    }

    // Check uploads
    console.log('\n=== Checking uploads ===');
    const uploadsExist = await page.evaluate(async () => {
      const res = await fetch('/uploads/', { credentials: 'include' });
      return res.status;
    });
    console.log('Uploads endpoint:', uploadsExist);

  } catch (e) {
    console.log('TEST ERROR:', e.message);
    await page.screenshot({ path: 'screenshot-error.png', fullPage: true }).catch(() => {});
  }

  console.log('\n========== ERROR SUMMARY ==========');
  console.log(`Console Errors (${consoleErrors.length}):`);
  consoleErrors.slice(0, 15).forEach(e => console.log('  -', e.substring(0, 200)));
  console.log(`\nHTTP Errors 4xx/5xx (${serverErrors.length}):`);
  serverErrors.slice(0, 30).forEach(e => console.log('  -', e.substring(0, 200)));

  await browser.close();
})();
