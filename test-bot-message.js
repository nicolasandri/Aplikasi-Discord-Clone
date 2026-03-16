const { chromium } = require('playwright');

async function testBotMessage() {
  console.log('🚀 Testing Bot Izin Keluar - Laporan di Channel');
  
  const browser = await chromium.launch({ headless: false, slowMo: 1000 });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  
  page.on('console', msg => {
    const text = msg.text();
    if (text.includes('new_message') || text.includes('IZIN')) {
      console.log(`🌐 [${msg.type()}]:`, text.substring(0, 150));
    }
  });
  
  try {
    // Login API
    console.log('📱 Login...');
    const loginRes = await page.request.post('https://workgrid.homeku.net/api/auth/login', {
      data: { email: 'admin@workgrid.com', password: 'admin123' }
    });
    
    if (!loginRes.ok()) {
      console.log('❌ Login gagal');
      return;
    }
    
    const { token, user } = await loginRes.json();
    console.log('✅ Login berhasil sebagai:', user.username);
    
    // Set token dan buka app
    await page.goto('https://workgrid.homeku.net/login');
    await page.evaluate((data) => {
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
    }, { token, user });
    
    await page.goto('https://workgrid.homeku.net/channels', { waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);
    
    // Klik server
    console.log('🔍 Klik server JEBOLTOGEL...');
    const serverImg = await page.locator('img[alt*="JEBOL"]').first();
    await serverImg.click();
    await page.waitForTimeout(2000);
    
    // Klik channel report izin
    console.log('🔍 Klik channel Report Izin...');
    const channels = await page.locator('div[class*="channel"], a[class*="channel"]').all();
    for (const ch of channels) {
      const text = await ch.textContent().catch(() => '');
      if (text.toLowerCase().includes('report') && text.toLowerCase().includes('izin')) {
        await ch.click();
        console.log('✅ Channel diklik');
        break;
      }
    }
    await page.waitForTimeout(2000);
    
    await page.screenshot({ path: '01-channel-before-izin.png' });
    
    // Isi form dan klik IZIN
    console.log('📝 Isi form izin...');
    const input = await page.locator('input[placeholder*="izin"]').first();
    await input.fill('wc');
    
    // Klik IZIN
    const izinBtn = await page.locator('button:has-text("IZIN")').first();
    await izinBtn.click();
    console.log('👆 Tombol IZIN diklik');
    
    // Tunggu pesan muncul (maks 10 detik)
    console.log('⏳ Tunggu pesan bot muncul...');
    await page.waitForTimeout(5000);
    
    // Scroll ke bawah untuk lihat pesan
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(1000);
    
    await page.screenshot({ path: '02-after-izin-clicked.png', fullPage: true });
    
    // Cek apakah pesan bot muncul
    const pageText = await page.locator('body').textContent();
    const hasBotMessage = pageText.includes('IZIN DIMULAI') || pageText.includes('SECURITY BOT');
    
    if (hasBotMessage) {
      console.log('✅✅✅ SUKSES! Pesan bot IZIN DIMULAI muncul!');
      
      // Cari elemen pesan bot
      const botMsg = await page.locator('text=/IZIN DIMULAI/i').first();
      if (await botMsg.isVisible().catch(() => false)) {
        await botMsg.scrollIntoViewIfNeeded();
        await page.screenshot({ path: '03-bot-message-visible.png' });
        console.log('📸 Screenshot pesan bot disimpan');
      }
      
      // Tunggu 5 detik lalu klik KEMBALI
      console.log('⏳ Tunggu 5 detik lalu klik KEMBALI...');
      await page.waitForTimeout(5000);
      
      // Scroll ke atas untuk lihat tombol KEMBALI
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.waitForTimeout(500);
      
      const kembaliBtn = await page.locator('button:has-text("KEMBALI")').first();
      if (await kembaliBtn.isVisible().catch(() => false)) {
        await kembaliBtn.click();
        console.log('👆 Tombol KEMBALI diklik');
        
        await page.waitForTimeout(3000);
        await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
        await page.waitForTimeout(1000);
        await page.screenshot({ path: '04-after-kembali.png', fullPage: true });
        
        // Cek pesan IZIN SELESAI
        const hasSelesai = await page.locator('text=/IZIN SELESAI/i').isVisible().catch(() => false);
        if (hasSelesai) {
          console.log('✅✅✅ SUKSES! Pesan bot IZIN SELESAI muncul!');
        } else {
          console.log('⚠️ Pesan IZIN SELESAI tidak ditemukan');
        }
      }
    } else {
      console.log('❌ Pesan bot TIDAK muncul');
      console.log('📄 Content:', pageText.substring(0, 500));
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
