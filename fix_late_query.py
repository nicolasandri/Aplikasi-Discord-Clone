with open('/opt/workgrid/server/database-postgres.js', 'r') as f:
    content = f.read()

# Fix the checkAndReportLatePermissions query
old_query = '''  async checkAndReportLatePermissions(reportChannelId) {
    try {
      // Find active permissions that exceeded max duration
      const latePermissions = await queryMany(
        `SELECT pr.*, u.username, u.display_name 
         FROM permission_requests pr
         JOIN users u ON pr.user_id = u.id
         WHERE pr.status = 'active'
         AND pr.started_at < NOW() - INTERVAL '1 minute' * pr.max_duration_minutes`,
        []
      );'''

new_query = '''  async checkAndReportLatePermissions(reportChannelId) {
    try {
      // Find active permissions that exceeded max duration
      const latePermissions = await queryMany(
        `SELECT pr.*, u.username, u.display_name 
         FROM permission_requests pr
         JOIN users u ON pr.user_id = u.id::text
         WHERE pr.status = 'active'
         AND pr.started_at < NOW() - INTERVAL '1 minute' * pr.max_duration_minutes`,
        []
      );'''

if old_query in content:
    content = content.replace(old_query, new_query)
    with open('/opt/workgrid/server/database-postgres.js', 'w') as f:
        f.write(content)
    print('✅ Late query fixed!')
else:
    print('❌ Pattern not found')
