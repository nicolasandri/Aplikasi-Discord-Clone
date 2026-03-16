import re

with open('/opt/workgrid/server/config/database.js', 'r') as f:
    content = f.read()

# Add options after port line
content = content.replace(
    "port: parseInt(process.env.DB_PORT || '5432'),",
    "port: parseInt(process.env.DB_PORT || '5432'),\n\n  // Timezone - Asia/Jakarta (WIB)\n  options: '-c timezone=Asia/Jakarta',"
)

# Replace pool.on connect
old_connect = "pool.on('connect', () => {\n  console.log('Connected to PostgreSQL');"
new_connect = "pool.on('connect', (client) => {\n  client.query(\"SET timezone = 'Asia/Jakarta'\");\n  console.log('Connected to PostgreSQL (WIB timezone)');"
content = content.replace(old_connect, new_connect)

# Replace withTransaction
old_trans = """async function withTransaction(callback) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');"""
new_trans = """async function withTransaction(callback) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query("SET timezone = 'Asia/Jakarta'");"""
content = content.replace(old_trans, new_trans)

with open('/opt/workgrid/server/config/database.js', 'w') as f:
    f.write(content)

print('Done!')
