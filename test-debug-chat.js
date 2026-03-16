const { chromium } = require('playwright');

async function debugChat() {
  console.log('🔍 Debugging Chat Area...');
  
  const browser = await chromium.launch({ headless: false, slowMo: 1000 });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  
  // Capture all console logs
  page.on('console', msg => {
    console.log(`🌐 [${msg.type()}]: ${msg.text().substring(0, 150)}`);
  });
  
  // Capture network requests
  page.on('response', async response => {
    if (response.url().includes('/api/channels/') && response.url().includes('/messages')) {
      console.log(`\n📡 API Response: ${response.url()}`);
      try {
        const data = await response.json();
        console.log(`   Total messages: ${data.length}`);
        data.forEach((msg, i) => {
          console.log(`   ${i+1}. ID: ${msg.id}, User: ${msg.userId}, Content: ${msg.content?.substring(0, 50)}...`);
        });
      } catch(e) {
        console.log('   Failed to parse response');
      }
    }
  });
  
  try {
    // Login
    console.log('📱 Login...');
    const loginRes = await page.request.post('https://workgrid.homeku.net/api/auth/login', {
      data: { email: 'admin@workgrid.com', password: 'admin123' }
    });
    
    const { token, user } = await loginRes.json();
    console.log('✅ Login berhasil');
    
    // Set token
    await page.goto('https://workgrid.homeku.net/login');
    await page.evaluate((data) => {
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
    }, { token, user });
    
    // Navigate to channel
    console.log('\n🌐 Navigasi ke channel Report Izin...');
    await page.goto('https://workgrid.homeku.net/channels/476bde5d-a814-4835-9c6b-1c9c2689783b/caf0eaa8-1dac-4e4c-9011-6f9e78625fbc', { waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);
    
    // Screenshot
    await page.screenshot({ path: '01-channel-view.png' });
    
    // Check if chat container exists
    const chatContainer = await page.locator('[class*="message"], [class*="chat"]').first();
    console.log('\n📦 Chat container exists:', await chatContainer.isVisible().catch(() => false));
    
    // Scroll to bottom
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(1000);
    await page.screenshot({ path: '02-scrolled-bottom.png' });
    
    // Check page content
    const pageText = await page.locator('body').textContent();
    console.log('\n📄 Page content check:');
    console.log('   Contains IZIN:', pageText.includes('IZIN'));
    console.log('   Contains SECURITY:', pageText.includes('SECURITY'));
    console.log('   Contains bot:', pageText.includes('bot'));
    
    // Get HTML of chat area
    const chatHTML = await page.locator('body').innerHTML();
    console.log('\n🔍 Checking for bot messages in HTML...');
    const botMatches = chatHTML.match(/00000000-0000-0000-0000-000000000000/g);
    console.log('   Bot user ID occurrences:', botMatches ? botMatches.length : 0);
    
    // Check for embed in HTML
    const embedMatches = chatHTML.match(/embed/gi);
    console.log('   Embed mentions:', embedMatches ? embedMatches.length : 0);
    
    // Try to find any message elements
    const allDivs = await page.locator('div').all();
    console.log(`\n📊 Total div elements: ${allDivs.length}`);
    
    // Look for message-like elements
    let messageCount = 0;
    for (const div of allDivs.slice(0, 50)) {
      const text = await div.textContent().catch(() => '');
      if (text && (text.includes('IZIN') || text.includes('SECURITY'))) {
        messageCount++;
        console.log(`   Found message ${messageCount}: ${text.substring(0, 80)}...`);
      }
    }
    
    if (messageCount === 0) {
      console.log('\n❌ No bot messages found in DOM');
      
      // Check if messages array is empty
      const hasMessages = await page.evaluate(() => {
        // Access React state if possible
        const root = document.getElementById('root');
        return root && root.innerHTML.includes('IZIN');
      });
      console.log('   Messages in React root:', hasMessages);
    }
    
    // Final screenshot
    await page.screenshot({ path: '03-final.png', fullPage: true });
    console.log('\n✅ Debug complete');
    
    await page.waitForTimeout(5000);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    await page.screenshot({ path: 'error.png' });
  } finally {
    await browser.close();
  }
}

debugChat();
