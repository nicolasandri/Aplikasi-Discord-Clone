#!/usr/bin/env python3

server_path = '/opt/workgrid/server/server.js'

with open(server_path, 'r') as f:
    content = f.read()

# Replace the channel finding logic
old_code = """          // Find auditor channel
          const channels = await channelDB.getByServer(server.id);
          const auditChannel = channels.find(c => 
            c.name.toLowerCase().includes('audit') || 
            c.name.toLowerCase().includes('auditor')
          );"""

new_code = """          // Find audit izin channel specifically
          const channels = await channelDB.getByServer(server.id);
          const auditChannel = channels.find(c => 
            c.name.toLowerCase() === 'audit izin'
          );"""

if old_code in content:
    content = content.replace(old_code, new_code)
    with open(server_path, 'w') as f:
        f.write(content)
    print('✅ Audit channel filter updated!')
else:
    print('❌ Pattern not found')
    # Try to find the line
    if "c.name.toLowerCase().includes('audit')" in content:
        print("Found old pattern, trying simpler replacement...")
        content = content.replace(
            "c.name.toLowerCase().includes('audit') ||",
            "c.name.toLowerCase() === 'audit izin'"
        )
        content = content.replace(
            "c.name.toLowerCase().includes('auditor')",
            ""
        )
        with open(server_path, 'w') as f:
            f.write(content)
        print('✅ Updated with simpler method!')
