with open('/opt/workgrid/server/server.js', 'r') as f:
    content = f.read()

# Find the permissions/history endpoint and add check-late endpoint after it
old_code = '''// Get permission history for channel
app.get('/api/channels/:channelId/permissions/history', authenticateToken, async (req, res) => {
  try {
    const { channelId } = req.params;
    const limit = parseInt(req.query.limit) || 20;
    const history = await permissionRequestsDB.getHistoryForChannel(channelId, limit);
    res.json(history);
  } catch (error) {
    console.error('Get permission history error:', error);
    res.status(500).json({ error: 'Failed to get permission history' });
  }
});'''

new_code = '''// Get permission history for channel
app.get('/api/channels/:channelId/permissions/history', authenticateToken, async (req, res) => {
  try {
    const { channelId } = req.params;
    const limit = parseInt(req.query.limit) || 20;
    const history = await permissionRequestsDB.getHistoryForChannel(channelId, limit);
    res.json(history);
  } catch (error) {
    console.error('Get permission history error:', error);
    res.status(500).json({ error: 'Failed to get permission history' });
  }
});

// Check late permissions for channel
app.get('/api/channels/:channelId/permissions/late', authenticateToken, async (req, res) => {
  try {
    const { channelId } = req.params;
    const result = await permissionRequestsDB.checkAndReportLatePermissions(channelId);
    res.json(result);
  } catch (error) {
    console.error('Check late permissions error:', error);
    res.status(500).json({ error: 'Failed to check late permissions' });
  }
});'''

if old_code in content:
    content = content.replace(old_code, new_code)
    with open('/opt/workgrid/server/server.js', 'w') as f:
        f.write(content)
    print('✅ API endpoint for late permissions added!')
else:
    print('❌ Pattern not found')
