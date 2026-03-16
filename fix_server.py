import re

with open('/opt/workgrid/server/server.js', 'r') as f:
    content = f.read()

# Find the active permissions endpoint ending
pattern = r"(app\.get\('/api/channels/:channelId/permissions/active'[^}]+}\);)"

new_endpoint = '''// Get permission history for channel
app.get('/api/channels/:channelId/permissions/history', authenticateToken, async (req, res) => {
  try {
    const { channelId } = req.params;
    const limit = parseInt(req.query.limit) || 20;
    
    const { queryMany } = require('./config/database');
    const history = await queryMany(
      `SELECT pr.*, u.username, u.display_name, u.avatar 
       FROM permission_requests pr 
       JOIN users u ON pr.user_id = u.id 
       WHERE pr.channel_id = $1 AND pr.status IN ('completed', 'expired') 
       ORDER BY pr.ended_at DESC 
       LIMIT $2`,
      [channelId, limit]
    );
    res.json(history);
  } catch (error) {
    console.error('Get permission history error:', error);
    res.status(500).json({ error: 'Failed to get permission history' });
  }
});

'''

match = re.search(pattern, content, re.DOTALL)
if match:
    insert_pos = match.end()
    new_content = content[:insert_pos] + '\n\n' + new_endpoint + content[insert_pos:]
    with open('/opt/workgrid/server/server.js', 'w') as f:
        f.write(new_content)
    print('✅ History endpoint added!')
else:
    print('❌ Pattern not found')
