with open('/opt/workgrid/server/server.js', 'r') as f:
    content = f.read()

# Replace the welcome message logic
old_code = '''          // Create welcome message in  selamat-datang channel
          try {
            const channels = await channelDB.getByServerId(autoJoinServer);
            const welcomeChannel = channels.find(ch => ch.name === 'selamat-datang') || channels[0];
            
            if (welcomeChannel) {
              const welcomeMessage = await messageDB.create(
                welcomeChannel.id,
                user.id,
                `Selamat datang **${user.display_name || user.username}!** 👋 Semua member sekarang bisa berteman denganmu.`,
                null,
                null,
                true // isSystem = true
              );
              
              // Broadcast welcome message
              io.to(welcomeChannel.id).emit('new_message', {
                ...welcomeMessage,
                isSystem: true,
                newMember: {
                  id: user.id,
                  username: user.username,
                  displayName: user.display_name,
                  avatar: user.avatar
                }
              });
              console.log(`[Register] Welcome message sent for ${username}`);
            }
          } catch (welcomeError) {
            console.error('[Register] Failed to create welcome message:', welcomeError);
          }'''

new_code = '''          // Create welcome message in default channel (from auto_join_channels)
          try {
            let welcomeChannel = null;
            
            // Try to get the default channel from auto_join_channels
            if (defaultChannelId) {
              welcomeChannel = await channelDB.getById(defaultChannelId);
            }
            
            // Fallback to first channel if default not found
            if (!welcomeChannel) {
              const channels = await channelDB.getByServerId(autoJoinServer);
              welcomeChannel = channels[0];
            }
            
            if (welcomeChannel) {
              const welcomeMessage = await messageDB.create(
                welcomeChannel.id,
                user.id,
                `Selamat datang **${user.display_name || user.username}!** 👋 Semua member sekarang bisa berteman denganmu.`,
                null,
                null,
                true // isSystem = true
              );
              
              // Broadcast welcome message
              io.to(welcomeChannel.id).emit('new_message', {
                ...welcomeMessage,
                isSystem: true,
                newMember: {
                  id: user.id,
                  username: user.username,
                  displayName: user.display_name,
                  avatar: user.avatar
                }
              });
              console.log(`[Register] Welcome message sent to #${welcomeChannel.name} for ${username}`);
            }
          } catch (welcomeError) {
            console.error('[Register] Failed to create welcome message:', welcomeError);
          }'''

content = content.replace(old_code, new_code)

with open('/opt/workgrid/server/server.js', 'w') as f:
    f.write(content)

print('Fixed!')
