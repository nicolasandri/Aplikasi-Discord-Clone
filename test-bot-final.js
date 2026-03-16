const { chromium } = require('playwright');

async function testBotMessage() {
  console.log('🚀 Testing Bot Izin Keluar - Final Test');
  
  const browser = await chromium.launch({ headless: false, slowMo: 1500 });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  
  page.on('console', msg => {
    const text = msg.text();
    if (text.includes('new_message') || text.includes('IZIN') || text.includes('bot')) {
      console.log(`🌐 [${msg.type()}]:`, text.substring(0, 200));
    }
  });
  
  try {
    // Login
    console.log('📱 Login...');
    const loginRes = await page.request.post('https://workgrid.homeku.net/api/auth/login', {
      data: { email: 'admin@workgrid.com', password: 'admin123' }
    });
    
    const { token, user } = await loginRes.json();
    console.log('✅ Login berhasil sebagai:', user.username);
    
    // Buka app
    await page.goto('https://workgrid.homeku.net/login');
    await page.evaluate((data) => {
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
    }, { token, user });
    
    // Buka channel report izin langsung (dari database: caf0eaa8-1dac-4e4c-9011-6f9e78625fbc)
    await page.goto('https://workgrid.homeku.net/channels/476bde5d-a814-4835-9c6b-1c9c2689783b/caf0eaa8-1dac-4e4c-9011-6f9e78625fbc', { waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);
    await page.screenshot({ path: '01-channel-loaded.png' });
    
    // Scroll ke bawah untuk lihat pesan
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(1000);
    await page.screenshot({ path: '02-scrolled-down.png', fullPage: true });
    
    // Cek apakah pesan bot sudah ada
    const pageText = await page.locator('body').textContent();
    const hasBotMessage = pageText.includes('IZIN SELESAI') || pageText.includes('IZIN DIMULAI');
    
    if (hasBotMessage) {
      console.log('✅✅✅ SUKSES! Pesan bot sudah ada di channel!');
      
      // Cari dan screenshot pesan bot
      const botMsg = await page.locator('text=/IZIN SELESAI/i').first();
      if (await botMsg.isVisible().catch(() => false)) {
        await botMsg.scrollIntoViewIfNeeded();
        await page.screenshot({ path: '03-bot-message-found.png' });
        console.log('📸 Screenshot pesan bot disimpan');
      }
    } else {
      console.log('⚠️ Pesan bot belum ada, coba klik IZIN...');
      
      // Cari input dan isi
      const input = await page.locator('input[placeholder*="izin"]').first();
      if (await input.isVisible().catch(() => false)) {
        await input.fill('wc');
        console.log('✅ Input diisi');
        
        // Klik IZIN
        const izinBtn = await page.locator('button:has-text("IZIN")').first();
        await izinBtn.click();
        console.log('👆 Tombol IZIN diklik');
        
        // Tunggu dan refresh
        await page.waitForTimeout(3000);
        await page.reload({ waitUntil: 'networkidle' });
        await page.waitForTimeout(2000);
        
        // Scroll ke bawah
        await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
        await page.waitForTimeout(1000);
        await page.screenshot({ path: '04-after-izin.png', fullPage: true });
        
        // Cek lagi
        const newText = await page.locator('body').textContent();
        if (newText.includes('IZIN DIMULAI')) {
          console.log('✅✅✅ SUKSES! Pesan bot IZIN DIMULAI muncul!');
        } else {
          console.log('❌ Pesan bot masih tidak muncul');
        }
      }
    }
    
    await page.screenshot({ path: '99-final.png', fullPage: true });
    console.log('✅ Test selesai!');
    
    await page.waitForTimeout(5000);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    await page.screenshot({ path: 'error.png', fullPage: true });
  } finally {
    await browser.close();
    console.log('🔒 Browser ditutup');
  }
}

testBotMessage();
