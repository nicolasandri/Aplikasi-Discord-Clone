// Audit System for Permission Reports
const { v4: uuidv4 } = require('uuid');

class AuditSystem {
  constructor(dbModule, io) {
    this.permissionRequestsDB = dbModule.permissionRequestsDB;
    this.dbRun = dbModule.dbRun;
    this.io = io;
  }

  // Format duration from seconds to readable format
  formatDuration(seconds) {
    if (!seconds || seconds <= 0) return '0d';
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}j ${mins}m ${secs}d`;
    } else if (mins > 0) {
      return `${mins}m ${secs}d`;
    }
    return `${secs}d`;
  }

  // Generate simplified daily audit report
  async generateDailyReport(serverId, auditChannelId, date = new Date()) {
    try {
      console.log(`[Audit] Generating daily report for server ${serverId}...`);
      
      const userStats = await this.permissionRequestsDB.getUserAuditStats(serverId, date);
      
      if (userStats.length === 0) {
        console.log('[Audit] No data for today');
        return null;
      }

      const dateStr = date.toISOString().split('T')[0];
      const timeStr = date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

      // Sort by total requests (most active)
      const sortedByRequests = [...userStats].sort((a, b) => b.total_requests - a.total_requests);
      
      // Sort by late count (most problematic)
      const lateUsers = [...userStats].filter(u => u.late_count > 0).sort((a, b) => b.late_count - a.late_count);

      // Build simplified report
      let description = '';

      // Section 1: Summary
      const totalIzin = userStats.reduce((sum, u) => sum + parseInt(u.total_requests), 0);
      const totalLate = userStats.reduce((sum, u) => sum + parseInt(u.late_count), 0);
      description += `📊 **RINGKASAN HARI INI**\n`;
      description += `Total Izin: ${totalIzin}x | Staff Terlambat: ${totalLate}x\n\n`;

      // Section 2: Top 10 Staff
      description += `🏆 **TOP 10 STAFF PALING IZIN**\n`;
      sortedByRequests.slice(0, 10).forEach((u, i) => {
        const totalDurasi = this.formatDuration(u.total_duration_seconds);
        const lateInfo = u.late_count > 0 ? ` ⚠️${u.late_count}x telat` : '';
        description += `${i + 1}. @${u.username} — ${u.total_requests}x (${totalDurasi})${lateInfo}\n`;
      });

      // Section 3: Staff Terlambat (if any)
      if (lateUsers.length > 0) {
        description += `\n🚨 **STAFF TERLAMBAT**\n`;
        lateUsers.slice(0, 5).forEach((u, i) => {
          description += `${i + 1}. @${u.username} — ${u.late_count}x terlambat\n`;
        });
      }

      // Create single embed
      const embed = {
        title: `📋 LAPORAN AUDIT IZIN (${timeStr})`,
        date: dateStr,
        description: description
      };

      // Send single message
      await this.sendAuditMessage(serverId, auditChannelId, embed);

      console.log('[Audit] Daily report generated successfully');
      return [embed];

    } catch (error) {
      console.error('[Audit] Failed to generate daily report:', error);
      return null;
    }
  }

  // Send audit message to channel
  async sendAuditMessage(serverId, channelId, embed) {
    const botMessageId = uuidv4();
    const botMessageContent = JSON.stringify({
      embed: {
        ...embed,
        isAuditReport: true
      }
    });

    try {
      // Save to database
      await this.dbRun(
        `INSERT INTO messages (id, channel_id, user_id, content, created_at)
         VALUES ($1, $2, $3, $4, NOW())`,
        [botMessageId, channelId, '00000000-0000-0000-0000-000000000000', botMessageContent]
      );

      // Broadcast via socket
      if (this.io) {
        this.io.to(channelId).emit('new_message', {
          id: botMessageId,
          channel_id: channelId,
          user_id: '00000000-0000-0000-0000-000000000000',
          content: botMessageContent,
          created_at: new Date().toISOString(),
          is_bot: true,
          isAuditReport: true
        });
      }

      return { success: true };
    } catch (error) {
      console.error('[Audit] Failed to send audit message:', error);
      return { success: false, error };
    }
  }
}

module.exports = AuditSystem;
