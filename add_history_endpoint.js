const fs = require('fs');

const serverPath = '/opt/workgrid/server/server.js';
let content = fs.readFileSync(serverPath, 'utf8');

// Find the active permissions endpoint and add history endpoint after it
const activeEndpoint = `app.get('/api/channels/:channelId/permissions/active', authenticateToken, async (req, res) => {
  try {
    const { channelId } = req.params;
    
    // Get active permissions with user info
    const permissions = await queryMany(\`
      SELECT pr.*, u.username, u.display_name, u.avatar
      FROM permission_requests pr
      JOIN users u ON pr.user_id = u.id
      WHERE pr.channel_id = $1 AND pr.status = 'active'
      ORDER BY pr.started_at DESC
    \`, [channelId]);
    
    res.json(permissions);
  } catch (error) {
    console.error('Error fetching active permissions:', error);
    res.status(500).json({ error: 'Failed to fetch active permissions' });
  }
});`;

const historyEndpoint = `app.get('/api/channels/:channelId/permissions/active', authenticateToken, async (req, res) => {
  try {
    const { channelId } = req.params;
    
    // Get active permissions with user info
    const permissions = await queryMany(\`
      SELECT pr.*, u.username, u.display_name, u.avatar
      FROM permission_requests pr
      JOIN users u ON pr.user_id = u.id
      WHERE pr.channel_id = $1 AND pr.status = 'active'
      ORDER BY pr.started_at DESC
    \`, [channelId]);
    
    res.json(permissions);
  } catch (error) {
    console.error('Error fetching active permissions:', error);
    res.status(500).json({ error: 'Failed to fetch active permissions' });
  }
});

// Get permission history
app.get('/api/channels/:channelId/permissions/history', authenticateToken, async (req, res) => {
  try {
    const { channelId } = req.params;
    
    // Get completed/expired permissions with user info
    const permissions = await queryMany(\`
      SELECT pr.*, u.username, u.display_name, u.avatar
      FROM permission_requests pr
      JOIN users u ON pr.user_id = u.id
      WHERE pr.channel_id = $1 AND pr.status IN ('completed', 'expired')
      ORDER BY pr.ended_at DESC
      LIMIT 20
    \`, [channelId]);
    
    res.json(permissions);
  } catch (error) {
    console.error('Error fetching permission history:', error);
    res.status(500).json({ error: 'Failed to fetch permission history' });
  }
});`;

if (content.includes(activeEndpoint) && !content.includes("/permissions/history'")) {
  content = content.replace(activeEndpoint, historyEndpoint);
  fs.writeFileSync(serverPath, content);
  console.log('✅ History endpoint added!');
} else if (content.includes("/permissions/history'")) {
  console.log('ℹ️ History endpoint already exists');
} else {
  console.log('⚠️ Pattern not found, trying alternative...');
  // Try to find just the route and append after it
  const routePattern = /app\.get\('\/api\/channels\/:channelId\/permissions\/active'[^}]+}\);/s;
  const match = content.match(routePattern);
  if (match) {
    const insertAfter = match[0];
    const newEndpoint = `\n\n// Get permission history
app.get('/api/channels/:channelId/permissions/history', authenticateToken, async (req, res) => {
  try {
    const { channelId } = req.params;
    
    // Get completed/expired permissions with user info
    const permissions = await queryMany(\`
      SELECT pr.*, u.username, u.display_name, u.avatar
      FROM permission_requests pr
      JOIN users u ON pr.user_id = u.id
      WHERE pr.channel_id = $1 AND pr.status IN ('completed', 'expired')
      ORDER BY pr.ended_at DESC
      LIMIT 20
    \`, [channelId]);
    
    res.json(permissions);
  } catch (error) {
    console.error('Error fetching permission history:', error);
    res.status(500).json({ error: 'Failed to fetch permission history' });
  }
});`;
    content = content.replace(insertAfter, insertAfter + newEndpoint);
    fs.writeFileSync(serverPath, content);
    console.log('✅ History endpoint added with alternative method!');
  } else {
    console.log('❌ Could not find insertion point');
  }
}
