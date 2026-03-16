import re

with open('/opt/workgrid/server/database-postgres.js', 'r') as f:
    content = f.read()

# Add sendPenaltyReport function after getHistoryForUser
old_code = '''  async getHistoryForUser(userId, limit = 10) {
    return await queryMany(
      `SELECT * FROM permission_requests 
       WHERE user_id::text = $1::text
       ORDER BY created_at DESC LIMIT $2`,
      [userId, limit]
    );
  },
  
  // Expire old requests'''

new_code = '''  async getHistoryForUser(userId, limit = 10) {
    return await queryMany(
      `SELECT * FROM permission_requests 
       WHERE user_id::text = $1::text
       ORDER BY created_at DESC LIMIT $2`,
      [userId, limit]
    );
  },

  // Send penalty report to report channel
  async sendPenaltyReport(requestId, reportChannelId) {
    try {
      const request = await this.getById(requestId);
      if (!request || request.penalty_seconds <= 0) return { success: false, error: 'No penalty' };
      
      const user = await queryOne('SELECT username, display_name FROM users WHERE id = $1', [request.user_id]);
      
      // Format duration
      const formatDuration = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}m ${secs}d`;
      };
      
      // Create report message
      const reportMessage = {
        type: 'permission_penalty',
        title: '⚠️ IZIN TERLAMBAT',
        staff: `@${user?.username || 'Unknown'}`,
        requestType: request.request_type,
        maxDuration: `${request.max_duration_minutes} menit`,
        actualDuration: formatDuration(request.actual_duration_seconds),
        penalty: formatDuration(request.penalty_seconds),
        startedAt: request.started_at,
        endedAt: request.ended_at,
        timestamp: new Date().toISOString()
      };
      
      // Insert as system message in report channel
      await query(
        `INSERT INTO messages (id, channel_id, user_id, content, created_at)
         VALUES ($1, $2, $3, $4, NOW())`,
        [uuidv4(), reportChannelId, 'system', JSON.stringify(reportMessage)]
      );
      
      return { success: true };
    } catch (error) {
      console.error('Send penalty report error:', error);
      return { success: false, error: error.message };
    }
  },

  // Check and report late permissions
  async checkAndReportLatePermissions(reportChannelId) {
    try {
      // Find active permissions that exceeded max duration
      const latePermissions = await queryMany(
        `SELECT pr.*, u.username, u.display_name 
         FROM permission_requests pr
         JOIN users u ON pr.user_id = u.id
         WHERE pr.status = 'active'
         AND pr.started_at < NOW() - INTERVAL '1 minute' * pr.max_duration_minutes`,
        []
      );
      
      const reports = [];
      for (const perm of latePermissions) {
        const elapsed = Math.floor((new Date() - new Date(perm.started_at)) / 1000);
        const maxSeconds = perm.max_duration_minutes * 60;
        const penalty = elapsed - maxSeconds;
        
        if (penalty > 0) {
          // Format duration
          const formatDuration = (seconds) => {
            const mins = Math.floor(seconds / 60);
            const secs = seconds % 60;
            return `${mins}m ${secs}d`;
          };
          
          reports.push({
            userId: perm.user_id,
            username: perm.username,
            displayName: perm.display_name,
            requestType: perm.request_type,
            maxDuration: formatDuration(maxSeconds),
            actualDuration: formatDuration(elapsed),
            penalty: formatDuration(penalty),
            startedAt: perm.started_at,
            penaltySeconds: penalty
          });
        }
      }
      
      return { success: true, reports };
    } catch (error) {
      console.error('Check late permissions error:', error);
      return { success: false, error: error.message };
    }
  },
  
  // Expire old requests'''

if old_code in content:
    content = content.replace(old_code, new_code)
    with open('/opt/workgrid/server/database-postgres.js', 'w') as f:
        f.write(content)
    print('✅ Penalty report functions added!')
else:
    print('❌ Pattern not found')
