with open('/opt/workgrid/app/src/components/ChatArea.tsx', 'r') as f:
    content = f.read()

content = content.replace("message.userId === 'system'", "message.userId === '00000000-0000-0000-0000-000000000000'")

with open('/opt/workgrid/app/src/components/ChatArea.tsx', 'w') as f:
    f.write(content)

print('✅ Fixed ChatArea!')
