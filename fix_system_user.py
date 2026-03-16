with open('/opt/workgrid/server/server.js', 'r') as f:
    content = f.read()

# Replace 'system' user_id with valid UUID
content = content.replace("user_id: 'system'", "user_id: '00000000-0000-0000-0000-000000000000'")
content = content.replace("'system', JSON", "'00000000-0000-0000-0000-000000000000', JSON")
content = content.replace("message.userId === 'system'", "message.userId === '00000000-0000-0000-0000-000000000000'")

with open('/opt/workgrid/server/server.js', 'w') as f:
    f.write(content)

print('✅ Fixed system user ID!')
