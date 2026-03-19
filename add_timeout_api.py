#!/usr/bin/env python3
import re

# Read the server.js file
with open('/opt/workgrid/server/server.js', 'r') as f:
    content = f.read()

# Check if already added
if '/api/servers/:serverId/timeout-config' in content:
    print('⚠️ Timeout config API already exists!')
    exit(0)

# API endpoint code to insert
api_code = '''
// Get timeout alert config for server
app.get('/api/servers/:serverId/timeout-config', authenticateToken, async (req, res) => {
  try {
    const { serverId } = req.params;
    const config = await timeoutConfigDB.getConfig(serverId);
    res.json(config);
  } catch (error) {
    console.error('Get timeout config error:', error);
    res.status(500).json({ error: 'Failed to get timeout config' });
  }
});

// Update timeout alert config for server
app.put('/api/servers/:serverId/timeout-config', authenticateToken, async (req, res) => {
  try {
    const { serverId } = req.params;
    const { alertRoles, alertMessage } = req.body;
    
    // Check if user has manage server permission
    const hasPermission = await permissionDB.hasPermission(req.userId, serverId, Permissions.MANAGE_SERVER);
    if (!hasPermission) {
      return res.status(403).json({ error: 'Permission denied' });
    }
    
    await timeoutConfigDB.setConfig(serverId, alertRoles, alertMessage);
    res.json({ success: true });
  } catch (error) {
    console.error('Update timeout config error:', error);
    res.status(500).json({ error: 'Failed to update timeout config' });
  }
});

'''

# Find the position to insert (before timeout alert cron job)
marker = '// ==================== PERMISSION TIMEOUT ALERT CRON JOB'
if marker in content:
    content = content.replace(marker, api_code + marker)
    # Write back
    with open('/opt/workgrid/server/server.js', 'w') as f:
        f.write(content)
    print('✅ Timeout config API added successfully!')
else:
    print('❌ Could not find marker:', marker)
    exit(1)
