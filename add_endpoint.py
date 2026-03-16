with open('/opt/workgrid/server/server.js', 'r') as f:
    lines = f.readlines()

# Find the line with active permissions endpoint ending
insert_line = None
for i, line in enumerate(lines):
    if "app.get('/api/channels/:channelId/permissions/active'" in line:
        # Find the closing of this endpoint (find the line with "});")
        for j in range(i+1, len(lines)):
            if lines[j].strip() == '});':
                insert_line = j + 1
                break
        break

if insert_line:
    new_endpoint = '''
// Get permission history for channel
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
'''
    lines.insert(insert_line, new_endpoint)
    with open('/opt/workgrid/server/server.js', 'w') as f:
        f.writelines(lines)
    print('✅ Endpoint added at line', insert_line)
else:
    print('❌ Could not find insertion point')
