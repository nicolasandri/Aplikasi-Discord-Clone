with open('/opt/workgrid/server/database-postgres.js', 'r') as f:
    content = f.read()

# Fix 1: getHistoryForChannel
content = content.replace(
    'JOIN users u ON pr.user_id = u.id',
    'JOIN users u ON pr.user_id = u.id::text'
)

# Fix 2: getActiveForChannel if exists
content = content.replace(
    'JOIN users u ON pr.user_id::text = u.id::text',
    'JOIN users u ON pr.user_id = u.id::text'
)

with open('/opt/workgrid/server/database-postgres.js', 'w') as f:
    f.write(content)

print('✅ All queries fixed!')
