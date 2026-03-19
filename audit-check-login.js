const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  try {
    console.log('Loading: https://workgrid.homeku.net/');
    await page.goto('https://workgrid.homeku.net/', { waitUntil: 'networkidle' });
    
    await page.waitForTimeout(2000);
    
    // Check what page we're on
    const currentUrl = page.url();
    console.log('Current URL:', currentUrl);
    
    // Look for login form or server list
    const hasLoginForm = await page.locator('input[type="email"], input[type="password"]').count() > 0;
    console.log('Login Form Found:', hasLoginForm ? 'YES - Need to login' : 'NO');
    
    // Check for main app content
    const hasMainContent = await page.locator('[class*="sidebar"], [class*="layout"]').count() > 0;
    console.log('Main App Content:', hasMainContent ? 'YES - Logged in' : 'NO - Landing page');
    
    // List visible text to understand state
    const visibleText = await page.locator('body').textContent();
    const hasWorkGrid = visibleText.includes('WorkGrid');
    const hasLogin = visibleText.includes('Login') || visibleText.includes('login') || visibleText.includes('Sign');
    const hasServer = visibleText.includes('Server') || visibleText.includes('Channel');
    
    console.log('\nPage Content Analysis:');
    console.log('- Has "WorkGrid":', hasWorkGrid);
    console.log('- Has "Login/Sign":', hasLogin);
    console.log('- Has "Server/Channel":', hasServer);
    
    // Take screenshot to see what's displayed
    await page.screenshot({ path: 'audit-screenshot.png' });
    console.log('\n✓ Screenshot saved: audit-screenshot.png');
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await browser.close();
  }
})();
