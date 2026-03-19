// Script to add timeout alert cron job to server.js
// This will be inserted before "// Start server"

const fs = require('fs');
const path = require('path');

const serverPath = path.join(__dirname, 'server.js');
let serverContent = fs.readFileSync(serverPath, 'utf8');

// The cron job code to insert
const cronJobCode = `
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
        const roleMentions = config.alert_roles.map(role => `@${role}`).join(' ');
        const staffMention = request.username ? `@${request.username}` : 'Unknown';
        
        // Create bot message for timeout alert
        const botMessageId = require('uuid').v4();
        const botMessageContent = JSON.stringify({
          embed: {
            title: '⛔ WAKTU IZIN HABIS',
            staff: staffMention,
            type: request.request_type,
            maxDuration: `${request.max_duration_minutes} menit`,
            startedAt: request.started_at,
            note: `${roleMentions} ⛔ Waktu izin habis. Kalau masih lanjut, itu bukan izin—itukabur.`,
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
        
        console.log(\`[Timeout Alert] Sent for user \${request.username} in channel \${request.channel_id}\`);
      } catch (alertError) {
        console.error('[Timeout Alert] Error sending alert:', alertError);
      }
    }
  } catch (error) {
    console.error('[Timeout Alert] Cron job error:', error);
  }
}, 30000); // Run every 30 seconds

`;

// Find the position to insert (before "// Start server")
const insertPosition = serverContent.indexOf('// Start server');
if (insertPosition === -1) {
  console.error('Could not find "// Start server" in server.js');
  process.exit(1);
}

// Insert the cron job code
const newContent = serverContent.slice(0, insertPosition) + cronJobCode + serverContent.slice(insertPosition);

// Write back to file
fs.writeFileSync(serverPath, newContent);
console.log('Timeout alert cron job added successfully!');
