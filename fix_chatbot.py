import re

with open('/opt/workgrid/app/src/components/ChatArea.tsx', 'r') as f:
    content = f.read()

# Find and replace the Permission Bot Panel condition
old_code = """{/* Permission Bot Panel - Only for text channels */}
      {channel.type === 'text' && serverId && (
        <div className={`${isMobile ? 'px-2 pt-2' : 'px-4 pt-4'}`}>
          <PermissionBot 
            channelId={channel.id} 
            serverId={serverId} 
            currentUserId={currentUser?.id || ''}
          />
        </div>
      )}"""

new_code = """{/* Permission Bot Panel - Only for specific text channels */}
      {channel.type === 'text' && serverId && (
        channel.name.toLowerCase().includes('izin') || 
        channel.name.toLowerCase().includes('report') ||
        channel.name.toLowerCase().includes('bot')
      ) && (
        <div className={`${isMobile ? 'px-2 pt-2' : 'px-4 pt-4'}`}>
          <PermissionBot 
            channelId={channel.id} 
            serverId={serverId} 
            currentUserId={currentUser?.id || ''}
          />
        </div>
      )}"""

if old_code in content:
    content = content.replace(old_code, new_code)
    with open('/opt/workgrid/app/src/components/ChatArea.tsx', 'w') as f:
        f.write(content)
    print('✅ Fixed! PermissionBot will only show in specific channels.')
else:
    print('❌ Pattern not found. Trying alternative...')
    # Try with different whitespace
    old_pattern = r"{channel\.type === 'text' && serverId && \("
    new_pattern = r"{channel.type === 'text' && serverId && (channel.name.toLowerCase().includes('izin') || channel.name.toLowerCase().includes('report') || channel.name.toLowerCase().includes('bot')) && ("
    
    if re.search(old_pattern, content):
        content = re.sub(old_pattern, new_pattern, content)
        with open('/opt/workgrid/app/src/components/ChatArea.tsx', 'w') as f:
            f.write(content)
        print('✅ Fixed with regex!')
    else:
        print('❌ Still not found.')
