with open('/opt/workgrid/server/database-postgres.js', 'r') as f:
    content = f.read()

old_query = '''async getHistoryForChannel(channelId, limit = 20) {
    return await queryMany(
      `SELECT pr.*, u.username, u.display_name, u.avatar 
       FROM permission_requests pr 
       JOIN users u ON pr.user_id = u.id 
       WHERE pr.channel_id::text = $1::text 
       AND pr.status IN ('completed', 'expired') 
       ORDER BY pr.ended_at DESC 
       LIMIT $2`,
      [channelId, limit]
    );
  }'''

new_query = '''async getHistoryForChannel(channelId, limit = 20) {
    return await queryMany(
      `SELECT pr.*, u.username, u.display_name, u.avatar 
       FROM permission_requests pr 
       JOIN users u ON pr.user_id = u.id 
       WHERE pr.channel_id = $1 
       AND pr.status IN ('completed', 'expired') 
       ORDER BY pr.ended_at DESC 
       LIMIT $2`,
      [channelId, limit]
    );
  }'''

if old_query in content:
    content = content.replace(old_query, new_query)
    with open('/opt/workgrid/server/database-postgres.js', 'w') as f:
        f.write(content)
    print('✅ Query fixed!')
else:
    print('❌ Pattern not found')
