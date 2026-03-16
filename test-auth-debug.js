const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ ignoreHTTPSErrors: true });
  const page = await context.newPage();

  try {
    // Login
    console.log('=== Logging in ===');
    await page.goto('https://workgrid.homeku.net/login', { waitUntil: 'networkidle', timeout: 30000 });
    await page.fill('input[type="email"], input#email', 'admin@workgrid.com');
    await page.fill('input[type="password"], input#password', 'admin123');
    await page.click('button[type="submit"], button:has-text("Masuk")');
    await page.waitForTimeout(5000);
    console.log('After login URL:', page.url());

    // Check localStorage for token
    const token = await page.evaluate(() => {
      return localStorage.getItem('token');
    });

    console.log('\n=== Token in localStorage ===');
    console.log('Token exists:', !!token);
    console.log('Token length:', token ? token.length : 0);
    if (token) {
      console.log('Token preview:', token.substring(0, 50) + '...');

      // Decode token to see claims
      try {
        const parts = token.split('.');
        const decoded = JSON.parse(Buffer.from(parts[1], 'base64').toString());
        console.log('Token claims:', JSON.stringify(decoded, null, 2));
      } catch (e) {
        console.log('Error decoding token:', e.message);
      }
    }

    // Check if user is stored
    const user = await page.evaluate(() => {
      return localStorage.getItem('user');
    });
    console.log('\n=== User in localStorage ===');
    console.log('User exists:', !!user);
    if (user) {
      console.log('User data:', user.substring(0, 100) + '...');
    }

    // Make API call using page.evaluate with explicit Authorization header
    console.log('\n=== Testing API with explicit Authorization header ===');
    if (token) {
      const apiResult = await page.evaluate(async (token) => {
        try {
          const res = await fetch('https://workgrid.homeku.net/api/users/me', {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });

          const text = await res.text();
          let data;
          try { data = JSON.parse(text); } catch { data = text; }

          return {
            status: res.status,
            statusText: res.statusText,
            data: data,
            headers: Object.fromEntries(res.headers)
          };
        } catch (e) {
          return { error: e.message };
        }
      }, token);

      console.log('API Response:', JSON.stringify(apiResult, null, 2));
    } else {
      console.log('No token found, cannot test API');
    }

    // Test with actual frontend fetch (let frontend make the call)
    console.log('\n=== Testing with frontend fetch (DMList style) ===');
    const dmResult = await page.evaluate(async () => {
      try {
        const token = localStorage.getItem('token');
        console.log('[Page] Token available:', !!token);

        const res = await fetch('/api/dm/channels', {
          headers: { 'Authorization': `Bearer ${token}` }
        });

        const text = await res.text();
        let data;
        try { data = JSON.parse(text); } catch { data = text; }

        return {
          status: res.status,
          data: data
        };
      } catch (e) {
        return { error: e.message };
      }
    });

    console.log('DM Channels Response:', JSON.stringify(dmResult, null, 2));

  } catch (e) {
    console.log('TEST ERROR:', e.message);
    console.error(e);
  }

  await browser.close();
})();
