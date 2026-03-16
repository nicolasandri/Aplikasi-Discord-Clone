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
    console.log('✅ Login berhasil\n');
    
    // Get messages from channel
    console.log('📨 Fetch messages dari channel Report Izin...');
    const messagesRes = await axios.get(
      'https://workgrid.homeku.net/api/channels/caf0eaa8-1dac-4e4c-9011-6f9e78625fbc/messages',
      { headers: { Authorization: `Bearer ${token}` } }
    );
    
    const messages = messagesRes.data;
    console.log(`✅ Dapat ${messages.length} pesan\n`);
    
    // Show all messages
    console.log('📋 Semua pesan:');
    messages.forEach((msg, i) => {
      console.log(`\n${i + 1}. ID: ${msg.id}`);
      console.log(`   User: ${msg.user?.username || 'Unknown'} (${msg.userId})`);
      console.log(`   Content: ${msg.content?.substring(0, 100)}...`);
      console.log(`   Timestamp: ${msg.timestamp}`);
      console.log(`   isSystem: ${msg.isSystem}`);
    });
    
    // Find bot messages
    console.log('\n\n🤖 Pesan Bot:');
    const botMessages = messages.filter(m => 
      m.userId === '00000000-0000-0000-0000-000000000000'
    );
    
    if (botMessages.length > 0) {
      botMessages.forEach((msg, i) => {
        console.log(`\n  ${i + 1}. ${msg.user?.username || 'Unknown'}`);
        console.log(`     Content: ${msg.content?.substring(0, 200)}`);
      });
    } else {
      console.log('  ❌ Tidak ada pesan bot');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    }
  }
}

testAPI();
