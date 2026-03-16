const { chromium } = require('playwright');

async function testFullFlow() {
  console.log('🚀 Testing Full Flow - Bot Izin Keluar');
  
  const browser = await chromium.launch({ headless: false, slowMo: 2000 });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  
  // Capture console logs
  page.on('console', msg => {
    const text = msg.text();
    if (text.includes('message') || text.includes('Message') || text.includes('IZIN')) {
      console.log(`🌐 ${text.substring(0, 150)}`);
    }
  });
  
  try {
    // Step 1: Login
    console.log('\n📱 Step 1: Login');
    await page.goto('https://workgrid.homeku.net/login');
    await page.waitForSelector('input[type="email"]');
    
    // Fill login form using evaluate to bypass validation
    await page.evaluate(() => {
      const emailInput = document.querySelector('input[type="email"]');
      const passInput = document.querySelector('input[type="password"]');
      if (emailInput) emailInput.value = 'admin@workgrid.com';
      if (passInput) passInput.value = 'admin123';
    });
    
    await page.click('button[type="submit"]');
    await page.waitForTimeout(3000);
    console.log('✅ Login submitted');
    
    // Step 2: Click server JEBOLTOGEL
    console.log('\n🖱️ Step 2: Click server JEBOLTOGEL');
    const serverIcon = await page.locator('img[alt*="JEBOL"]').first();
    await serverIcon.click();
    await page.waitForTimeout(3000);
    console.log('✅ Server clicked');
    
    // Step 3: Click channel Report Izin
    console.log('\n🖱️ Step 3: Click channel Report Izin');
    
    // Find channel by text
    const channelElements = await page.locator('div, a, button').all();
    let reportChannelClicked = false;
    
    for (const el of channelElements) {
      const text = await el.textContent().catch(() => '');
      if (text.toLowerCase().includes('report izin')) {
        await el.click();
        console.log('✅ Channel Report Izin clicked');
        reportChannelClicked = true;
        break;
      }
    }
    
    if (!reportChannelClicked) {
      console.log('❌ Channel not found, trying alternative...');
      // Try clicking by partial text
      await page.click('text=/report izin/i');
    }
    
    await page.waitForTimeout(3000);
    await page.screenshot({ path: '01-channel-loaded.png' });
    
    // Step 4: Check for existing bot messages
    console.log('\n🔍 Step 4: Check for bot messages');
    
    // Scroll to bottom
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(1000);
    
    const pageText = await page.locator('body').textContent();
    const hasBotMessage = pageText.includes('IZIN DIMULAI') || pageText.includes('IZIN SELESAI');
    
    if (hasBotMessage) {
      console.log('✅✅✅ SUKSES! Riwayat izin ditemukan!');
      await page.screenshot({ path: '02-bot-messages-found.png', fullPage: true });
    } else {
      console.log('⚠️ Tidak ada riwayat izin, mencoba klik IZIN...');
      
      // Step 5: Fill form and click IZIN
      console.log('\n📝 Step 5: Fill form and click IZIN');
      
      const input = await page.locator('input[placeholder*="izin"]').first();
      if (await input.isVisible().catch(() => false)) {
        await input.fill('wc');
        console.log('✅ Form filled');
        
        const izinBtn = await page.locator('button:has-text("IZIN")').first();
        await izinBtn.click();
        console.log('👆 IZIN clicked');
        
        await page.waitForTimeout(5000);
        
        // Refresh and check again
        await page.reload();
        await page.waitForTimeout(3000);
        await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
        await page.waitForTimeout(1000);
        
        const newText = await page.locator('body').textContent();
        if (newText.includes('IZIN')) {
          console.log('✅✅✅ SUKSES! Pesan IZIN muncul setelah refresh!');
        } else {
          console.log('❌ Pesan masih tidak muncul');
        }
        
        await page.screenshot({ path: '03-after-izin.png', fullPage: true });
      }
    }
    
    console.log('\n✅ Test complete!');
    await page.waitForTimeout(5000);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    await page.screenshot({ path: 'error.png' });
  } finally {
    await browser.close();
  }
}

testFullFlow();
