const { chromium } = require('playwright');

async function testPermissionBot() {
  console.log('🚀 Memulai test Bot Izin Keluar...');
  
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 1500
  });
  
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 }
  });
  
  const page = await context.newPage();
  
  // Capture console logs
  page.on('console', msg => {
    console.log(`🌐 [${msg.type()}]:`, msg.text().substring(0, 200));
  });
  
  page.on('pageerror', error => {
    console.log('🌐 Page error:', error.message);
  });
  
  try {
    // Login
    console.log('📱 Login...');
    const loginResponse = await page.request.post('https://workgrid.homeku.net/api/auth/login', {
      data: { email: 'admin@workgrid.com', password: 'admin123' }
    });
    
    if (!loginResponse.ok()) {
      console.log('❌ Login gagal');
      return;
    }
    
    const { token, user } = await loginResponse.json();
    console.log('✅ Login berhasil sebagai:', user.username);
    
    // Buka app dengan clear cache
    await page.goto('https://workgrid.homeku.net/login');
    await page.evaluate((data) => {
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
    }, { token, user });
    
    // Hard reload untuk clear cache
    await page.goto('https://workgrid.homeku.net/channels', { waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);
    await page.screenshot({ path: '01-logged-in.png' });
    
    // Klik server JEBOLTOGEL
    console.log('🔍 Klik server...');
    const server = await page.locator('img[alt*="JEBOL"]').first();
    await server.click();
    await page.waitForTimeout(2000);
    
    // Klik channel report izin
    console.log('🔍 Klik channel report izin...');
    const channels = await page.locator('div[class*="channel"], a').all();
    for (const ch of channels) {
      const text = await ch.textContent().catch(() => '');
      if (text.toLowerCase().includes('report') && text.toLowerCase().includes('izin')) {
        await ch.click();
        console.log('✅ Channel diklik');
        break;
      }
    }
    await page.waitForTimeout(3000);
    await page.screenshot({ path: '02-channel-loaded.png' });
    
    // Cek panel bot
    console.log('🤖 Cek panel Bot...');
    const botPanel = await page.locator('text=Bot Izin Keluar').first();
    
    if (await botPanel.isVisible().catch(() => false)) {
      console.log('✅ Panel bot ditemukan');
      
      // Cari input
      const input = await page.locator('input[placeholder*="izin"]').first();
      await input.scrollIntoViewIfNeeded();
      await input.fill('wc');
      console.log('✅ Input diisi dengan "wc"');
      await page.screenshot({ path: '03-input-filled.png' });
      
      // Cari tombol IZIN - dengan logging detail
      console.log('🔍 Mencari tombol IZIN...');
      
      const buttons = await page.locator('button').all();
      console.log(`📊 Total buttons found: ${buttons.length}`);
      
      let izinButton = null;
      for (let i = 0; i < buttons.length; i++) {
        const btn = buttons[i];
        const text = await btn.textContent().catch(() => '');
        const disabled = await btn.isDisabled().catch(() => false);
        const visible = await btn.isVisible().catch(() => false);
        
        console.log(`  Button ${i}: "${text.trim()}" - disabled: ${disabled}, visible: ${visible}`);
        
        if (text.toLowerCase().includes('izin') && !text.toLowerCase().includes('kembali')) {
          izinButton = btn;
          console.log(`  ✅ Found IZIN button at index ${i}`);
        }
      }
      
      if (izinButton) {
        // Cek apakah button disabled
        const isDisabled = await izinButton.isDisabled().catch(() => false);
        console.log(`🔘 Button disabled: ${isDisabled}`);
        
        if (!isDisabled) {
          // Listen untuk request sebelum klik
          console.log('👆 Klik tombol IZIN...');
          
          const requestPromise = new Promise((resolve) => {
            const handler = (request) => {
              if (request.url().includes('/bot/permission') || request.url().includes('/permission')) {
                console.log(`📡 Request: ${request.method()} ${request.url()}`);
                page.off('request', handler);
                resolve(request);
              }
            };
            page.on('request', handler);
            setTimeout(() => {
              page.off('request', handler);
              resolve(null);
            }, 5000);
          });
          
          await izinButton.click();
          console.log('✅ Tombol diklik');
          
          // Tunggu request
          const request = await requestPromise;
          if (request) {
            console.log('✅ API request detected!');
          } else {
            console.log('⚠️ No API request detected within 5s');
          }
          
          await page.waitForTimeout(3000);
          await page.screenshot({ path: '04-after-click.png', fullPage: true });
          
          // Cek pesan bot
          const hasBotMsg = await page.locator('text=/IZIN DIMULAI/i').isVisible().catch(() => false);
          console.log(`🔍 Bot message visible: ${hasBotMsg}`);
          
          if (hasBotMsg) {
            console.log('✅ PESAN BOT DITEMUKAN!');
            await page.screenshot({ path: '05-success.png' });
          } else {
            console.log('⚠️ Pesan bot tidak ditemukan');
            await page.screenshot({ path: '05-no-message.png', fullPage: true });
          }
        } else {
          console.log('❌ Button is disabled');
        }
      } else {
        console.log('❌ Tombol IZIN tidak ditemukan');
      }
    } else {
      console.log('❌ Panel bot tidak ditemukan');
    }
    
    await page.screenshot({ path: '99-final.png', fullPage: true });
    console.log('✅ Test selesai');
    
    await page.waitForTimeout(5000);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    await page.screenshot({ path: 'error.png', fullPage: true });
  } finally {
    await browser.close();
    console.log('🔒 Browser ditutup');
  }
}

testPermissionBot();
