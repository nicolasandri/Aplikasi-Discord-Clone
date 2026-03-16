import re

with open('/opt/workgrid/server/server.js', 'r') as f:
    content = f.read()

# Find the bot permission endpoint
old_endpoint = '''app.post('/api/bot/permission', authenticateToken, async (req, res) => {
  try {
    const { channelId, serverId, command, type } = req.body;
    const userId = req.userId;
    
    if (!channelId || !serverId || !command) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    const user = await userDB.findById(userId);
    const channel = await channelDB.getById(channelId);
    
    // Check if user already has active permission request
    const activeRequest = await permissionRequestsDB.getActiveForUser(userId, channelId);
    
    if (command.toUpperCase() === 'IZIN') {
      // Check if already has active request
      if (activeRequest) {
        return res.status(400).json({ 
          error: 'Anda sudah memiliki izin aktif',
          activeRequest
        });
      }
      
      // Create new permission request
      const requestType = type || 'wc';
      const result = await permissionRequestsDB.create(userId, serverId, channelId, requestType, 5);
      
      // Get the created request
      const newRequest = await permissionRequestsDB.getById(result.id);
      
      res.json({
        success: true,
        action: 'started',
        message: '✅ IZIN DIMULAI',
        request: newRequest,
        embed: {
          title: '✅ IZIN DIMULAI',
          staff: `@${user.username}`,
          type: requestType,
          maxDuration: '5 menit',
          startedAt: newRequest.started_at,
          mode: '✅ Format benar',
          note: 'Akhiri dengan: kembali'
        }
      });
    } else if (command.toUpperCase() === 'KEMBALI' || command.toUpperCase() === 'SELESAI') {
      // Check if has active request
      if (!activeRequest) {
        return res.status(400).json({ 
          error: 'Tidak ada izin aktif yang ditemukan'
        });
      }
      
      // Complete the request
      const result = await permissionRequestsDB.complete(activeRequest.id, command.toLowerCase());
      
      if (!result.success) {
        return res.status(500).json({ error: result.error });
      }
      
      // Format durations
      const formatDuration = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}m ${secs}d`;
      };
      
      res.json({
        success: true,
        action: 'completed',
        message: '✅ IZIN SELESAI',
        embed: {
          title: '✅ IZIN SELESAI',
          staff: `@${user.username}`,
          type: activeRequest.request_type,
          startedAt: activeRequest.started_at,
          endedAt: new Date().toISOString(),
          actualDuration: formatDuration(result.actualDurationSeconds),
          penalty: result.penaltySeconds > 0 ? formatDuration(result.penaltySeconds) : '0d',
          recordedDuration: formatDuration(result.recordedDurationSeconds),
          endedWith: `✅ Ditutup dengan kata ${command.toLowerCase()}`
        },
        details: result
      });
    } else {
      return res.status(400).json({ error: 'Perintah tidak dikenali. Gunakan: IZIN atau KEMBALI' });
    }
  } catch (error) {
    console.error('Permission bot error:', error);
    res.status(500).json({ error: 'Failed to process permission command' });
  }
});'''

new_endpoint = '''app.post('/api/bot/permission', authenticateToken, async (req, res) => {
  try {
    const { channelId, serverId, command, type } = req.body;
    const userId = req.userId;
    
    if (!channelId || !serverId || !command) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    const user = await userDB.findById(userId);
    const channel = await channelDB.getById(channelId);
    
    // Check if user already has active permission request
    const activeRequest = await permissionRequestsDB.getActiveForUser(userId, channelId);
    
    // Format duration helper
    const formatDuration = (seconds) => {
      const mins = Math.floor(seconds / 60);
      const secs = seconds % 60;
      return `${mins}m ${secs}d`;
    };
    
    // Format time helper
    const formatTime = (date) => {
      return new Date(date).toLocaleTimeString('id-ID', {
        hour: 'numeric',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
      });
    };
    
    if (command.toUpperCase() === 'IZIN') {
      // Check if already has active request
      if (activeRequest) {
        return res.status(400).json({ 
          error: 'Anda sudah memiliki izin aktif',
          activeRequest
        });
      }
      
      // Create new permission request
      const requestType = type || 'wc';
      const result = await permissionRequestsDB.create(userId, serverId, channelId, requestType, 5);
      
      // Get the created request
      const newRequest = await permissionRequestsDB.getById(result.id);
      
      // Send bot message to channel
      const botMessage = {
        embed: {
          title: '✅ IZIN DIMULAI',
          staff: `@${user.username}`,
          type: requestType,
          maxDuration: '5 menit',
          startedAt: formatTime(newRequest.started_at),
          mode: '✅ Format benar',
          note: 'Akhiri dengan: kembali'
        }
      };
      
      // Insert bot message to channel
      try {
        const { query } = require('./config/database');
        await query(
          `INSERT INTO messages (id, channel_id, user_id, content, created_at)
           VALUES ($1, $2, $3, $4, NOW())`,
          [uuidv4(), channelId, 'system', JSON.stringify(botMessage)]
        );
        
        // Broadcast to channel via socket
        io.to(channelId).emit('new_message', {
          id: uuidv4(),
          channel_id: channelId,
          user_id: 'system',
          content: JSON.stringify(botMessage),
          created_at: new Date().toISOString(),
          is_bot: true
        });
      } catch (msgError) {
        console.error('Failed to send bot message:', msgError);
      }
      
      res.json({
        success: true,
        action: 'started',
        message: '✅ IZIN DIMULAI',
        request: newRequest,
        embed: botMessage.embed
      });
    } else if (command.toUpperCase() === 'KEMBALI' || command.toUpperCase() === 'SELESAI') {
      // Check if has active request
      if (!activeRequest) {
        return res.status(400).json({ 
          error: 'Tidak ada izin aktif yang ditemukan'
        });
      }
      
      // Complete the request
      const result = await permissionRequestsDB.complete(activeRequest.id, command.toLowerCase());
      
      if (!result.success) {
        return res.status(500).json({ error: result.error });
      }
      
      // Create embed message
      const isLate = result.penaltySeconds > 0;
      const botMessage = {
        embed: {
          title: isLate ? '🏁 IZIN SELESAI (TERLAMBAT)' : '✅ IZIN SELESAI',
          staff: `@${user.username}`,
          type: activeRequest.request_type,
          startedAt: formatTime(activeRequest.started_at),
          endedAt: formatTime(new Date()),
          actualDuration: formatDuration(result.actualDurationSeconds),
          penalty: result.penaltySeconds > 0 ? formatDuration(result.penaltySeconds) : '0d',
          recordedDuration: formatDuration(result.recordedDurationSeconds),
          endedWith: `✅ Ditutup dengan kata ${command.toLowerCase()}`
        }
      };
      
      // Send bot message to channel
      try {
        const { query } = require('./config/database');
        await query(
          `INSERT INTO messages (id, channel_id, user_id, content, created_at)
           VALUES ($1, $2, $3, $4, NOW())`,
          [uuidv4(), channelId, 'system', JSON.stringify(botMessage)]
        );
        
        // Broadcast to channel via socket
        io.to(channelId).emit('new_message', {
          id: uuidv4(),
          channel_id: channelId,
          user_id: 'system',
          content: JSON.stringify(botMessage),
          created_at: new Date().toISOString(),
          is_bot: true
        });
      } catch (msgError) {
        console.error('Failed to send bot message:', msgError);
      }
      
      res.json({
        success: true,
        action: 'completed',
        message: isLate ? '🏁 IZIN SELESAI (TERLAMBAT)' : '✅ IZIN SELESAI',
        embed: botMessage.embed,
        details: result
      });
    } else {
      return res.status(400).json({ error: 'Perintah tidak dikenali. Gunakan: IZIN atau KEMBALI' });
    }
  } catch (error) {
    console.error('Permission bot error:', error);
    res.status(500).json({ error: 'Failed to process permission command' });
  }
});'''

if old_endpoint in content:
    content = content.replace(old_endpoint, new_endpoint)
    with open('/opt/workgrid/server/server.js', 'w') as f:
        f.write(content)
    print('✅ Bot endpoint updated to send channel messages!')
else:
    print('❌ Pattern not found')
