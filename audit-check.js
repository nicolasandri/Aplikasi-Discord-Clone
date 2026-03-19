const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const errors = [];
  const warnings = [];

  // Capture console messages
  page.on('console', msg => {
    if (msg.type() === 'error') errors.push(msg.text());
    if (msg.type() === 'warning') warnings.push(msg.text());
  });

  try {
    console.log('Loading: https://workgrid.homeku.net/');
    await page.goto('https://workgrid.homeku.net/', { waitUntil: 'networkidle', timeout: 30000 });
    
    await page.waitForTimeout(3000);
    
    // Check page title and content
    const title = await page.title();
    console.log('\n✓ Page Title:', title);
    
    // Check for critical UI elements
    const hasServerList = await page.locator('[class*="server"]').count() > 0;
    console.log('✓ Server List Found:', hasServerList ? 'YES' : 'NO');
    
    const hasChannels = await page.locator('[class*="channel"]').count() > 0;
    console.log('✓ Channels Found:', hasChannels ? 'YES' : 'NO');
    
    const hasChat = await page.locator('[class*="chat"], [class*="message"]').count() > 0;
    console.log('✓ Chat Area Found:', hasChat ? 'YES' : 'NO');

    // Check network requests
    const failedRequests = [];
    page.on('response', response => {
      if (response.status() >= 400) {
        failedRequests.push(`${response.status()} - ${response.url()}`);
      }
    });

    await page.waitForTimeout(2000);

    console.log('\n--- CONSOLE ERRORS ---');
    if (errors.length > 0) {
      errors.slice(0, 10).forEach((e, i) => console.log(`${i+1}. ${e}`));
    } else {
      console.log('✓ No console errors');
    }

    console.log('\n--- NETWORK ISSUES ---');
    if (failedRequests.length > 0) {
      failedRequests.slice(0, 10).forEach((r, i) => console.log(`${i+1}. ${r}`));
    } else {
      console.log('✓ No failed requests');
    }

  } catch (error) {
    console.error('❌ Test Failed:', error.message);
  } finally {
    await browser.close();
  }
})();
