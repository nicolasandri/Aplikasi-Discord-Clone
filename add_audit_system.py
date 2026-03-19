#!/usr/bin/env python3
import re

server_path = '/opt/workgrid/server/server.js'

with open(server_path, 'r') as f:
    content = f.read()

# Check if already patched
if 'AuditSystem' in content:
    print('⚠️ Audit system already added!')
    exit(0)

# Add require statement after other requires
audit_require = '''const AuditSystem = require('./audit-system');

'''

# Find a good place to add require (after other const requires)
if "const AuditSystem" not in content:
    # Add after require('./routes/master-admin')
    content = content.replace(
        "const masterAdminRoutes = require('./routes/master-admin')(dbModule);",
        "const masterAdminRoutes = require('./routes/master-admin')(dbModule);\nconst AuditSystem = require('./audit-system');"
    )

# Add audit system initialization and cron job before "// Start server"
audit_cron_code = '''
// ==================== AUDIT SYSTEM ====================
// Initialize audit system
const auditSystem = new AuditSystem(dbModule, io);

// Daily report cron job - runs at 23:50 every day
// Generate daily audit report for all servers
setInterval(async () => {
  try {
    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();
    
    // Run at 23:50 (11:50 PM)
    if (hours === 23 && minutes === 50) {
      console.log('[Cron] Generating daily audit reports...');
      
      // Get all servers
      const servers = await serverDB.getAll();
      
      for (const server of servers) {
        try {
          // Find auditor channel
          const channels = await channelDB.getByServer(server.id);
          const auditChannel = channels.find(c => 
            c.name.toLowerCase().includes('audit') || 
            c.name.toLowerCase().includes('auditor')
          );
          
          if (auditChannel) {
            await auditSystem.generateDailyReport(server.id, auditChannel.id, now);
          }
        } catch (serverError) {
          console.error(`[Cron] Failed to generate report for server ${server.id}:`, serverError);
        }
      }
      
      console.log('[Cron] Daily audit reports completed');
    }
  } catch (error) {
    console.error('[Cron] Audit report generation error:', error);
  }
}, 60000); // Check every minute

// Manual trigger endpoint for daily report
app.post('/api/admin/generate-audit-report', authenticateToken, async (req, res) => {
  try {
    const { serverId, channelId } = req.body;
    
    // Check if user has manage server permission
    const hasPermission = await permissionDB.hasPermission(req.userId, serverId, Permissions.MANAGE_SERVER);
    if (!hasPermission) {
      return res.status(403).json({ error: 'Permission denied' });
    }
    
    const result = await auditSystem.generateDailyReport(serverId, channelId);
    
    if (result) {
      res.json({ success: true, message: 'Audit report generated successfully' });
    } else {
      res.json({ success: false, message: 'No data to report' });
    }
  } catch (error) {
    console.error('Generate audit report error:', error);
    res.status(500).json({ error: 'Failed to generate audit report' });
  }
});

'''

# Insert before "// Start server"
if '// ==================== AUDIT SYSTEM' not in content:
    content = content.replace('// Start server', audit_cron_code + '// Start server')

with open(server_path, 'w') as f:
    f.write(content)

print('✅ Audit system and cron job added successfully!')
