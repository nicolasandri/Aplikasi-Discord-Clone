with open('/opt/workgrid/server/server.js', 'r') as f:
    content = f.read()

# Replace the welcome message logic for invite join
old_code = '''    // Create welcome message in "selamat-datang" channel
    try {
      const channels = await channelDB.getByServerId(invite.server_id);
      const welcomeChannel = channels.find(ch => ch.name === 'selamat-datang') || channels[0];
      
      if (welcomeChannel) {
        const welcomeMessage = await messageDB.create(
          welcomeChannel.id,
          null, // system message has no user
          `Selamat datang ${user.display_name || user.username}! 👋`,
          null,
          'system' // message type
        );
        
        // Broadcast welcome message
        io.to(welcomeChannel.id).emit('new_message', {
          ...welcomeMessage,
          isSystem: true,
          newMember: {
            id: userId,
            username: user.username,
            displayName: user.display_name,
            avatar: user.avatar
          }
        });
      }
    } catch (welcomeError) {
      console.error('Failed to create welcome message:', welcomeError);
      // Don't fail the join if welcome message fails
    }'''

new_code = '''    // Create welcome message in default channel (from auto_join_channels)
    try {
      let welcomeChannel = null;
      
      // Try to get the default channel from auto_join_channels
      if (invite.auto_join_channels) {
        try {
          const channelsArr = JSON.parse(invite.auto_join_channels);
          if (channelsArr && channelsArr.length > 0) {
            welcomeChannel = await channelDB.getById(channelsArr[0]);
          }
        } catch (e) {
          console.error('[InviteJoin] Error parsing auto_join_channels:', e);
        }
      }
      
      // Fallback to first channel if default not found
      if (!welcomeChannel) {
        const channels = await channelDB.getByServerId(invite.server_id);
        welcomeChannel = channels[0];
      }
      
      if (welcomeChannel) {
        const welcomeMessage = await messageDB.create(
          welcomeChannel.id,
          userId,
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
            id: userId,
            username: user.username,
            displayName: user.display_name,
            avatar: user.avatar
          }
        });
        console.log(`[InviteJoin] Welcome message sent to #${welcomeChannel.name}`);
      }
    } catch (welcomeError) {
      console.error('[InviteJoin] Failed to create welcome message:', welcomeError);
      // Don't fail the join if welcome message fails
    }'''

content = content.replace(old_code, new_code)

with open('/opt/workgrid/server/server.js', 'w') as f:
    f.write(content)

print('Fixed!')
