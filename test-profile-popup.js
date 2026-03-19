const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ 
    viewport: { width: 400, height: 819 }
  });

  try {
    console.log('Loading VPS app...');
    await page.goto('https://workgrid.homeku.net/', { waitUntil: 'networkidle', timeout: 30000 }).catch(() => {});
    
    await page.waitForTimeout(3000);
    const currentUrl = page.url();
    console.log('Current URL:', currentUrl);
    
    // Check if logged in (look for server name or channels)
    const hasServerName = await page.locator('text=JEBOLTOGEL, text=Operasional').count() > 0;
    console.log('Has server loaded:', hasServerName);
    
    // Look for message avatars in the chat
    const messageAvatars = await page.locator('img[class*="rounded-lg"][class*="ring"]').all();
    console.log('Found message avatars:', messageAvatars.length);
    
    if (messageAvatars.length > 0) {
      console.log('Attempting to click avatar...');
      await messageAvatars[0].click({ timeout: 5000 });
      await page.waitForTimeout(1500);
      
      // Check for popup indicators
      const popupVisible = await page.locator('[class*="motion"]').first().isVisible({ timeout: 500 }).catch(() => false);
      console.log('Popup motion element visible:', popupVisible);
      
      // Check for text content in popup
      const memberText = await page.locator('text=/Member|Profile|Status/i').count();
      console.log('Profile text elements found:', memberText);
    }
    
    await page.screenshot({ path: 'test-profile-mobile.png' });
    console.log('Screenshot saved');
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await browser.close();
  }
})();
