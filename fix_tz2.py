import re

with open('/opt/workgrid/server/config/database.js', 'r') as f:
    content = f.read()

# Fix pool.on connect - handle the checkmark character
old_pattern = """pool.on('connect', () => {
  console.log('✅ Connected to PostgreSQL');
});"""

new_pattern = """pool.on('connect', (client) => {
  client.query("SET timezone = 'Asia/Jakarta'");
  console.log('✅ Connected to PostgreSQL (WIB timezone)');
});"""

content = content.replace(old_pattern, new_pattern)

with open('/opt/workgrid/server/config/database.js', 'w') as f:
    f.write(content)

print('Done!')
