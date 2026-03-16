const axios = require('axios');

async function testAPI() {
  try {
    // Login
    console.log('📱 Login...');
    const loginRes = await axios.post('https://workgrid.homeku.net/api/auth/login', {
      email: 'admin@workgrid.com',
      password: 'admin123'
    });
    
    const token = loginRes.data.token;
    console.log('✅ Login berhasil');
    
    // Get messages dari channel Report Izin
    // Channel ID dari log: 41431c40-a85d-4243-9ce2-ee7cc3debf45
    console.log('📨 Fetch messages...');
    const messagesRes = await axios.get(
      'https://workgrid.homeku.net/api/channels/41431c40-a85d-4243-9ce2-ee7cc3debf45/messages',
      { headers: { Authorization: `Bearer ${token}` } }
    );
    
    const messages = messagesRes.data;
    console.log(`✅ Dapat ${messages.length} pesan`);
    
    // Cari pesan bot
    const botMessages = messages.filter(m => 
      m.userId === '00000000-0000-0000-0000-000000000000'
    );
    
    console.log(`🤖 Ditemukan ${botMessages.length} pesan bot`);
    
    if (botMessages.length > 0) {
      botMessages.forEach((msg, i) => {
        console.log(`\n📄 Bot Message ${i + 1}:`);
        console.log('  ID:', msg.id);
        console.log('  User ID:', msg.userId);
        console.log('  Content:', msg.content.substring(0, 200));
        console.log('  User:', JSON.stringify(msg.user));
      });
    } else {
      console.log('\n❌ Tidak ada pesan bot');
      console.log('\n📋 Semua pesan:');
      messages.forEach((msg, i) => {
        console.log(`  ${i + 1}. User: ${msg.userId}, Content: ${msg.content.substring(0, 50)}...`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.response) {
      console.error('Response:', error.response.status, error.response.data);
    }
  }
}

testAPI();
