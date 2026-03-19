const fs = require('fs');
const path = require('path');

const serverPath = path.join(__dirname, 'server.js');
let content = fs.readFileSync(serverPath, 'utf8');

const cronCode = `
// ==================== PERMISSION TIMEOUT ALERT CRON JOB ====================
// Check every 30 seconds for permissions that have exceeded max duration
setInterval(async () => {
  try {
    if (!permissionRequestsDB || !permissionRequestsDB.getTimedOutRequests) {
      return;
    }
    
    // Get all active requests that have exceeded max_duration
    const timedOutRequests = await permissionRequestsDB.getTimedOutRequests();
    
    for (const request of timedOutRequests) {
      try {
        // Get timeout config for this server
        const config = await timeoutConfigDB.getConfig(request.server_id);
        
        // Format the alert message with mentions
        const roleMentions = config.alert_roles.map(role => '@' + role).join(' ');
        const staffMention = request.username ? '@' + request.username : 'Unknown';
        
        // Create bot message for timeout alert
        const botMessageId = uuidv4();
        const botMessageContent = JSON.stringify({
          embed: {
            title: '⛔ WAKTU IZIN HABIS',
            staff: staffMention,
            type: request.request_type,
            maxDuration: request.max_duration_minutes + ' menit',
            startedAt: request.started_at,
            note: roleMentions + ' ⛔ Waktu izin habis. Kalau masih lanjut, itu bukan izin—itukabur.',
            isTimeoutAlert: true
          }
        });
        
        // Save bot message to database
        await dbRun(
          \`INSERT INTO messages (id, channel_id, user_id, content, created_at)
           VALUES (\$1, \$2, \$3, \$4, NOW())\`,
          [botMessageId, request.channel_id, '00000000-0000-0000-0000-000000000000', botMessageContent]
        );
        
        // Broadcast bot message via socket
        if (io) {
          io.to(request.channel_id).emit('new_message', {
            id: botMessageId,
            channel_id: request.channel_id,
            user_id: '00000000-0000-0000-0000-000000000000',
            content: botMessageContent,
            created_at: new Date().toISOString(),
            is_bot: true,
            isTimeoutAlert: true
          });
        }
        
        // Mark alert as sent
        await permissionRequestsDB.markTimeoutAlertSent(request.id);
        
        console.log('[Timeout Alert] Sent for user ' + request.username + ' in channel ' + request.channel_id);
      } catch (alertError) {
        console.error('[Timeout Alert] Error sending alert:', alertError);
      }
    }
  } catch (error) {
    console.error('[Timeout Alert] Cron job error:', error);
  }
}, 30000); // Run every 30 seconds
`;

// Insert before "// Start server"
const marker = '// Start server';
if (!content.includes('PERMISSION TIMEOUT ALERT CRON JOB') && content.includes(marker)) {
  content = content.replace(marker, cronCode + '\n' + marker);
  fs.writeFileSync(serverPath, content);
  console.log('✅ Timeout alert cron job added successfully!');
} else if (content.includes('PERMISSION TIMEOUT ALERT CRON JOB')) {
  console.log('⚠️ Timeout alert cron job already exists!');
} else {
  console.error('❌ Could not find marker:', marker);
  process.exit(1);
}
