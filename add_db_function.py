with open('/opt/workgrid/server/database-postgres.js', 'r') as f:
    content = f.read()

# Check if getHistoryForChannel already exists
if 'getHistoryForChannel' in content:
    print('ℹ️ getHistoryForChannel already exists')
else:
    # Find getHistoryForUser and add getHistoryForChannel before it
    old_func = '''  async getHistoryForUser(userId, limit = 10) {
    return await queryMany(
      `SELECT * FROM permission_requests 
       WHERE user_id::text = $1::text
       ORDER BY created_at DESC LIMIT $2`,
      [userId, limit]
    );
  },'''

    new_func = '''  async getHistoryForChannel(channelId, limit = 20) {
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
  },

  async getHistoryForUser(userId, limit = 10) {
    return await queryMany(
      `SELECT * FROM permission_requests 
       WHERE user_id::text = $1::text
       ORDER BY created_at DESC LIMIT $2`,
      [userId, limit]
    );
  },'''

    if old_func in content:
        content = content.replace(old_func, new_func)
        with open('/opt/workgrid/server/database-postgres.js', 'w') as f:
            f.write(content)
        print('✅ getHistoryForChannel added!')
    else:
        print('❌ Could not find insertion point')
