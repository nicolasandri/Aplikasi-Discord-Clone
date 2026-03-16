const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ ignoreHTTPSErrors: true });
  const page = await context.newPage();

  const errors = [];
  const consoleErrors = [];
  const networkErrors = [];
  const serverErrors = [];

  // Collect console errors
  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });

  // Collect page errors
  page.on('pageerror', err => {
    errors.push(err.message);
  });

  // Collect network errors
  page.on('response', response => {
    if (response.status() >= 400) {
      serverErrors.push(`${response.status()} ${response.url()}`);
    }
  });

  page.on('requestfailed', request => {
    networkErrors.push(`${request.failure().errorText} - ${request.url()}`);
  });

  try {
    // 1. Load login page
    console.log('=== Step 1: Loading login page ===');
    await page.goto('https://workgrid.homeku.net/login', { waitUntil: 'networkidle', timeout: 30000 });
    console.log('Page title:', await page.title());
    console.log('URL:', page.url());

    // Take screenshot
    await page.screenshot({ path: 'screenshot-login.png', fullPage: true });
    console.log('Screenshot saved: screenshot-login.png');

    // 2. Login
    console.log('\n=== Step 2: Logging in ===');
    await page.fill('input[type="email"], input#email, input[placeholder*="email" i], input[placeholder*="Email" i]', 'admin@workgrid.com');
    await page.fill('input[type="password"], input#password', 'admin123');
    await page.click('button[type="submit"], button:has-text("Masuk"), button:has-text("Login")');

    // Wait for navigation
    await page.waitForTimeout(5000);
    console.log('After login URL:', page.url());
    await page.screenshot({ path: 'screenshot-after-login.png', fullPage: true });

    // 3. Check if logged in successfully
    console.log('\n=== Step 3: Checking dashboard ===');
    await page.waitForTimeout(3000);
    await page.screenshot({ path: 'screenshot-dashboard.png', fullPage: true });

    // 4. Try clicking on a channel if available
    console.log('\n=== Step 4: Checking channels ===');
    const channels = await page.$$('text=/Operasional|kendala|report/i');
    if (channels.length > 0) {
      await channels[0].click();
      await page.waitForTimeout(3000);
      await page.screenshot({ path: 'screenshot-channel.png', fullPage: true });
      console.log('Channel clicked successfully');
    } else {
      console.log('No channels found to click');
    }

    // 5. Check WebSocket connection
    console.log('\n=== Step 5: Checking connection status ===');
    const onlineIndicator = await page.$('text=/Online|Connecting/i');
    if (onlineIndicator) {
      const text = await onlineIndicator.textContent();
      console.log('Connection status:', text);
    }

  } catch (e) {
    console.log('TEST ERROR:', e.message);
    await page.screenshot({ path: 'screenshot-error.png', fullPage: true }).catch(() => {});
  }

  // Print results
  console.log('\n========== RESULTS ==========');
  console.log(`\nPage Errors (${errors.length}):`);
  errors.forEach(e => console.log('  -', e.substring(0, 200)));

  console.log(`\nConsole Errors (${consoleErrors.length}):`);
  consoleErrors.slice(0, 20).forEach(e => console.log('  -', e.substring(0, 200)));

  console.log(`\nNetwork Failures (${networkErrors.length}):`);
  networkErrors.slice(0, 20).forEach(e => console.log('  -', e.substring(0, 200)));

  console.log(`\nServer Errors 4xx/5xx (${serverErrors.length}):`);
  serverErrors.slice(0, 30).forEach(e => console.log('  -', e.substring(0, 200)));

  await browser.close();
})();
