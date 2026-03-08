// Master Admin Routes
const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { requireMasterAdmin } = require('../middleware/master-admin');

// Apply authentication middleware to all routes
router.use(authenticate);
router.use(requireMasterAdmin);

module.exports = (dbModule) => {
  const { masterAdminDB } = dbModule;

  // ==================== STATISTICS ====================
  
  // Get dashboard statistics
  router.get('/stats', async (req, res) => {
    try {
      const stats = await masterAdminDB.getStatistics();
      res.json(stats);
    } catch (error) {
      console.error('Get statistics error:', error);
      res.status(500).json({ error: 'Failed to get statistics' });
    }
  });

  // ==================== USERS ====================
  
  // Get all users with password hash (master admin only)
  router.get('/users', async (req, res) => {
    try {
      const { limit = 100, offset = 0 } = req.query;
      const users = await masterAdminDB.getAllUsers(parseInt(limit), parseInt(offset));
      res.json({ users });
    } catch (error) {
      console.error('Get all users error:', error);
      res.status(500).json({ error: 'Failed to get users' });
    }
  });

  // Set user as master admin
  router.put('/users/:userId/master-admin', async (req, res) => {
    try {
      const { userId } = req.params;
      const { isMasterAdmin } = req.body;
      
      // Prevent removing master admin from yourself
      if (req.userId === userId && !isMasterAdmin) {
        return res.status(400).json({ error: 'Tidak dapat menghapus status Master Admin dari diri sendiri' });
      }
      
      const result = await masterAdminDB.setMasterAdmin(userId, isMasterAdmin);
      res.json({ success: result.success });
    } catch (error) {
      console.error('Set master admin error:', error);
      res.status(500).json({ error: 'Failed to update master admin status' });
    }
  });

  // Delete user
  router.delete('/users/:userId', async (req, res) => {
    try {
      const { userId } = req.params;
      
      // Prevent deleting yourself
      if (req.userId === userId) {
        return res.status(400).json({ error: 'Tidak dapat menghapus akun sendiri' });
      }
      
      const result = await masterAdminDB.deleteUser(userId);
      res.json({ success: result.success });
    } catch (error) {
      console.error('Delete user error:', error);
      res.status(500).json({ error: 'Failed to delete user' });
    }
  });

  // Reset user password (admin only)
  router.post('/users/:userId/reset-password', async (req, res) => {
    try {
      const { userId } = req.params;
      const { tempPassword } = req.body;
      
      // Prevent resetting your own password via this endpoint
      if (req.userId === userId) {
        return res.status(400).json({ error: 'Tidak dapat mereset password sendiri melalui fitur ini' });
      }
      
      if (!tempPassword || tempPassword.length < 6) {
        return res.status(400).json({ error: 'Password sementara minimal 6 karakter' });
      }
      
      // Use the main database module for password reset
      await dbModule.adminResetPassword(userId, tempPassword);
      
      res.json({ 
        success: true, 
        message: 'Password berhasil direset. User harus mengganti password saat login.' 
      });
    } catch (error) {
      console.error('Reset password error:', error);
      res.status(500).json({ error: 'Failed to reset password' });
    }
  });

  // Toggle user active status (enable/disable)
  router.put('/users/:userId/toggle-active', async (req, res) => {
    try {
      const { userId } = req.params;
      const { isActive } = req.body;
      
      // Prevent disabling yourself
      if (req.userId === userId && !isActive) {
        return res.status(400).json({ error: 'Tidak dapat menonaktifkan akun sendiri' });
      }
      
      const result = await dbModule.toggleUserActive(userId, isActive);
      
      res.json({ 
        success: true, 
        message: isActive ? 'User berhasil diaktifkan' : 'User berhasil dinonaktifkan',
        isActive 
      });
    } catch (error) {
      console.error('Toggle user active error:', error);
      res.status(500).json({ error: 'Failed to toggle user status' });
    }
  });

  // Get all pending friend requests (for debugging)
  router.get('/friend-requests/pending', async (req, res) => {
    try {
      const pendingRequests = await new Promise((resolve, reject) => {
        dbModule.db.all(
          `SELECT f.id, f.user_id, f.friend_id, f.status, f.created_at,
                  u1.username as sender_username, u1.display_name as sender_display_name,
                  u2.username as receiver_username, u2.display_name as receiver_display_name
           FROM friendships f
           JOIN users u1 ON f.user_id = u1.id
           JOIN users u2 ON f.friend_id = u2.id
           WHERE f.status = 'pending'
           ORDER BY f.created_at DESC`,
          (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
          }
        );
      });
      
      res.json({ pendingRequests });
    } catch (error) {
      console.error('Get pending friend requests error:', error);
      res.status(500).json({ error: 'Failed to get pending friend requests' });
    }
  });

  // Clear all pending friend requests (debug tool)
  router.delete('/friend-requests/pending', async (req, res) => {
    try {
      await new Promise((resolve, reject) => {
        dbModule.db.run(
          "DELETE FROM friendships WHERE status = 'pending'",
          function(err) {
            if (err) reject(err);
            else resolve({ changes: this.changes });
          }
        );
      });
      
      res.json({ success: true, message: 'Semua pending friend requests telah dihapus' });
    } catch (error) {
      console.error('Clear pending friend requests error:', error);
      res.status(500).json({ error: 'Failed to clear pending friend requests' });
    }
  });

  // Delete specific friendship by usernames (force remove stuck requests)
  router.delete('/friend-requests', async (req, res) => {
    try {
      const { user1, user2 } = req.body;
      
      // Get user IDs
      const user1Data = await new Promise((resolve, reject) => {
        dbModule.db.get('SELECT id FROM users WHERE username = ?', [user1], (err, row) => {
          if (err) reject(err);
          else resolve(row);
        });
      });
      
      const user2Data = await new Promise((resolve, reject) => {
        dbModule.db.get('SELECT id FROM users WHERE username = ?', [user2], (err, row) => {
          if (err) reject(err);
          else resolve(row);
        });
      });
      
      if (!user1Data || !user2Data) {
        return res.status(404).json({ error: 'User tidak ditemukan' });
      }
      
      // Delete friendship in both directions
      await new Promise((resolve, reject) => {
        dbModule.db.run(
          `DELETE FROM friendships WHERE 
           (user_id = ? AND friend_id = ?) OR 
           (user_id = ? AND friend_id = ?)`,
          [user1Data.id, user2Data.id, user2Data.id, user1Data.id],
          function(err) {
            if (err) reject(err);
            else resolve({ changes: this.changes });
          }
        );
      });
      
      res.json({ success: true, message: `Friendship antara ${user1} dan ${user2} telah dihapus` });
    } catch (error) {
      console.error('Delete friendship error:', error);
      res.status(500).json({ error: 'Failed to delete friendship' });
    }
  });

  // ==================== GROUP CODE MANAGEMENT ====================
  
  // Create group code for auto-join
  router.post('/group-codes', async (req, res) => {
    try {
      const { serverId, code, maxUses, autoJoinChannels } = req.body;
      
      if (!serverId || !code) {
        return res.status(400).json({ error: 'Server ID dan kode grup diperlukan' });
      }
      
      // Check if code already exists
      const existing = await new Promise((resolve, reject) => {
        dbModule.db.get('SELECT * FROM invites WHERE code = ?', [code], (err, row) => {
          if (err) reject(err);
          else resolve(row);
        });
      });
      
      if (existing) {
        return res.status(400).json({ error: 'Kode grup sudah digunakan' });
      }
      
      const id = require('crypto').randomUUID();
      const channelsJson = autoJoinChannels ? JSON.stringify(autoJoinChannels) : null;
      
      await new Promise((resolve, reject) => {
        dbModule.db.run(
          `INSERT INTO invites (id, server_id, code, created_by, max_uses, is_group_code, auto_join_channels, created_at) 
           VALUES (?, ?, ?, ?, ?, 1, ?, datetime('now'))`,
          [id, serverId, code, req.userId, maxUses || null, channelsJson],
          function(err) {
            if (err) reject(err);
            else resolve();
          }
        );
      });
      
      res.json({ success: true, message: 'Kode grup berhasil dibuat', groupCode: { id, code, serverId } });
    } catch (error) {
      console.error('Create group code error:', error);
      res.status(500).json({ error: 'Failed to create group code' });
    }
  });
  
  // Get all group codes
  router.get('/group-codes', async (req, res) => {
    try {
      const groupCodes = await new Promise((resolve, reject) => {
        dbModule.db.all(
          `SELECT i.*, s.name as server_name, u.username as created_by_username
           FROM invites i
           JOIN servers s ON i.server_id = s.id
           JOIN users u ON i.created_by = u.id
           WHERE i.is_group_code = 1
           ORDER BY i.created_at DESC`,
          (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
          }
        );
      });
      
      res.json({ groupCodes });
    } catch (error) {
      console.error('Get group codes error:', error);
      res.status(500).json({ error: 'Failed to get group codes' });
    }
  });
  
  // Delete group code
  router.delete('/group-codes/:codeId', async (req, res) => {
    try {
      const { codeId } = req.params;
      
      await new Promise((resolve, reject) => {
        dbModule.db.run(
          'DELETE FROM invites WHERE id = ? AND is_group_code = 1',
          [codeId],
          function(err) {
            if (err) reject(err);
            else resolve({ changes: this.changes });
          }
        );
      });
      
      res.json({ success: true, message: 'Kode grup berhasil dihapus' });
    } catch (error) {
      console.error('Delete group code error:', error);
      res.status(500).json({ error: 'Failed to delete group code' });
    }
  });

  // Update group code default channel
  router.put('/group-codes/:codeId/default-channel', async (req, res) => {
    try {
      const { codeId } = req.params;
      const { defaultChannelId } = req.body;
      
      // Get current group code data
      const groupCode = await new Promise((resolve, reject) => {
        dbModule.db.get(
          'SELECT * FROM invites WHERE id = ? AND is_group_code = 1',
          [codeId],
          (err, row) => {
            if (err) reject(err);
            else resolve(row);
          }
        );
      });
      
      if (!groupCode) {
        return res.status(404).json({ error: 'Kode grup tidak ditemukan' });
      }
      
      // Parse existing auto_join_channels
      let autoJoinChannels = [];
      if (groupCode.auto_join_channels) {
        try {
          autoJoinChannels = JSON.parse(groupCode.auto_join_channels);
        } catch (e) {
          autoJoinChannels = [];
        }
      }
      
      // Update or add default channel
      const channelsJson = defaultChannelId ? JSON.stringify([defaultChannelId]) : null;
      
      await new Promise((resolve, reject) => {
        dbModule.db.run(
          'UPDATE invites SET auto_join_channels = ? WHERE id = ? AND is_group_code = 1',
          [channelsJson, codeId],
          function(err) {
            if (err) reject(err);
            else resolve({ changes: this.changes });
          }
        );
      });
      
      res.json({ 
        success: true, 
        message: 'Channel default berhasil diupdate',
        defaultChannelId
      });
    } catch (error) {
      console.error('Update default channel error:', error);
      res.status(500).json({ error: 'Failed to update default channel' });
    }
  });

  // Get server channels for group code configuration
  router.get('/group-codes/:codeId/channels', async (req, res) => {
    try {
      const { codeId } = req.params;
      
      // Get group code with server info
      const groupCode = await new Promise((resolve, reject) => {
        dbModule.db.get(
          `SELECT i.*, s.name as server_name 
           FROM invites i 
           JOIN servers s ON i.server_id = s.id 
           WHERE i.id = ? AND i.is_group_code = 1`,
          [codeId],
          (err, row) => {
            if (err) reject(err);
            else resolve(row);
          }
        );
      });
      
      if (!groupCode) {
        return res.status(404).json({ error: 'Kode grup tidak ditemukan' });
      }
      
      // Get channels for this server
      const channels = await new Promise((resolve, reject) => {
        dbModule.db.all(
          `SELECT c.id, c.name, c.type, cat.name as category_name
           FROM channels c
           LEFT JOIN categories cat ON c.category_id = cat.id
           WHERE c.server_id = ?
           ORDER BY cat.position, c.position`,
          [groupCode.server_id],
          (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
          }
        );
      });
      
      // Parse current default channel
      let defaultChannelId = null;
      if (groupCode.auto_join_channels) {
        try {
          const channelsArr = JSON.parse(groupCode.auto_join_channels);
          defaultChannelId = channelsArr[0] || null;
        } catch (e) {
          defaultChannelId = null;
        }
      }
      
      res.json({ 
        groupCode: {
          id: groupCode.id,
          code: groupCode.code,
          serverName: groupCode.server_name
        },
        channels,
        defaultChannelId
      });
    } catch (error) {
      console.error('Get group code channels error:', error);
      res.status(500).json({ error: 'Failed to get channels' });
    }
  });

  // ==================== USER SERVER ACCESS MANAGEMENT ====================
  
  // Get all users with their server access
  router.get('/server-access/users', async (req, res) => {
    try {
      // Get all users
      const users = await new Promise((resolve, reject) => {
        dbModule.db.all(
          `SELECT id, username, display_name, avatar FROM users ORDER BY username`,
          (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
          }
        );
      });
      
      // Get all servers
      const servers = await new Promise((resolve, reject) => {
        dbModule.db.all(
          `SELECT id, name, icon FROM servers ORDER BY name`,
          (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
          }
        );
      });
      
      // Get all server access records
      const accessRecords = await new Promise((resolve, reject) => {
        dbModule.db.all(
          `SELECT user_id, server_id, is_allowed FROM user_server_access`,
          (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
          }
        );
      });
      
      // Create access map
      const accessMap = {};
      accessRecords.forEach(record => {
        if (!accessMap[record.user_id]) {
          accessMap[record.user_id] = {};
        }
        accessMap[record.user_id][record.server_id] = record.is_allowed === 1;
      });
      
      // Get user memberships
      const memberships = await new Promise((resolve, reject) => {
        dbModule.db.all(
          `SELECT user_id, server_id FROM server_members`,
          (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
          }
        );
      });
      
      // Create membership map
      const membershipMap = {};
      memberships.forEach(m => {
        if (!membershipMap[m.user_id]) {
          membershipMap[m.user_id] = {};
        }
        membershipMap[m.user_id][m.server_id] = true;
      });
      
      // Build response - only include users who are members of servers
      const usersWithAccess = users.map(user => {
        const serverAccess = servers.map(srv => ({
          serverId: srv.id,
          serverName: srv.name,
          serverIcon: srv.icon,
          isMember: !!membershipMap[user.id]?.[srv.id],
          // Default to true if member and no explicit record
          isAllowed: membershipMap[user.id]?.[srv.id] 
            ? (accessMap[user.id]?.[srv.id] !== false)
            : false
        })).filter(sa => sa.isMember); // Only show servers where user is a member
        
        return {
          ...user,
          serverAccess
        };
      }).filter(u => u.serverAccess.length > 0); // Only users who are members of at least 1 server
      
      // Calculate member count for each server (active vs inactive)
      const serverMemberStats = {};
      memberships.forEach(m => {
        if (!serverMemberStats[m.server_id]) {
          serverMemberStats[m.server_id] = { total: 0, active: 0, inactive: 0 };
        }
        serverMemberStats[m.server_id].total++;
        
        // Check if member has access (default true if no explicit record)
        const hasAccess = accessMap[m.user_id]?.[m.server_id] !== false;
        if (hasAccess) {
          serverMemberStats[m.server_id].active++;
        } else {
          serverMemberStats[m.server_id].inactive++;
        }
      });
      
      // Add member count to servers
      const serversWithMemberCount = servers.map(srv => ({
        ...srv,
        member_count: serverMemberStats[srv.id]?.total || 0,
        active_count: serverMemberStats[srv.id]?.active || 0,
        inactive_count: serverMemberStats[srv.id]?.inactive || 0
      }));
      
      res.json({ 
        users: usersWithAccess,
        servers: serversWithMemberCount
      });
    } catch (error) {
      console.error('Get users server access error:', error);
      res.status(500).json({ error: 'Failed to get users server access' });
    }
  });
  
  // Update server access for a user
  router.put('/users/:userId/servers/:serverId/access', async (req, res) => {
    try {
      const { userId, serverId } = req.params;
      const { isAllowed } = req.body;
      
      if (typeof isAllowed !== 'boolean') {
        return res.status(400).json({ error: 'isAllowed harus boolean' });
      }
      
      // Check if user exists
      const user = await dbModule.userDB.findById(userId);
      if (!user) {
        return res.status(404).json({ error: 'User tidak ditemukan' });
      }
      
      // Check if server exists
      const server = await new Promise((resolve, reject) => {
        dbModule.db.get('SELECT * FROM servers WHERE id = ?', [serverId], (err, row) => {
          if (err) reject(err);
          else resolve(row);
        });
      });
      
      if (!server) {
        return res.status(404).json({ error: 'Server tidak ditemukan' });
      }
      
      // Check if user is member of the server
      const members = await dbModule.serverDB.getMembers(serverId);
      const isMember = members.some(m => m.id === userId);
      if (!isMember) {
        return res.status(400).json({ error: 'User bukan member server ini' });
      }
      
      // Set server access
      await dbModule.userServerAccessDB.setServerAccess(userId, serverId, isAllowed);
      
      res.json({ 
        success: true, 
        message: `Akses server ${isAllowed ? 'diberikan' : 'ditolak'}`,
        userId,
        serverId,
        isAllowed
      });
    } catch (error) {
      console.error('Update server access error:', error);
      res.status(500).json({ error: 'Failed to update server access' });
    }
  });
  
  // Get all servers for server access management
  router.get('/server-access/servers', async (req, res) => {
    try {
      // Get all servers with member count
      const servers = await new Promise((resolve, reject) => {
        dbModule.db.all(
          `SELECT s.id, s.name, s.icon,
                  (SELECT COUNT(*) FROM server_members WHERE server_id = s.id) as member_count
           FROM servers s
           ORDER BY s.name`,
          (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
          }
        );
      });
      
      res.json({ servers });
    } catch (error) {
      console.error('Get servers for server access error:', error);
      res.status(500).json({ error: 'Failed to get servers' });
    }
  });
  
  // Get all members of a server with their access status
  router.get('/servers/:serverId/members/server-access', async (req, res) => {
    try {
      const { serverId } = req.params;
      
      // Get server info
      const server = await new Promise((resolve, reject) => {
        dbModule.db.get('SELECT id, name, icon FROM servers WHERE id = ?', [serverId], (err, row) => {
          if (err) reject(err);
          else resolve(row);
        });
      });
      
      if (!server) {
        return res.status(404).json({ error: 'Server tidak ditemukan' });
      }
      
      // Get all members with their server access
      const members = await dbModule.userServerAccessDB.getServerMembersAccess(serverId);
      
      res.json({ 
        server,
        members
      });
    } catch (error) {
      console.error('Get server members access error:', error);
      res.status(500).json({ error: 'Failed to get members server access' });
    }
  });

  // ==================== SERVERS ====================

  // Get all servers
  router.get('/servers', async (req, res) => {
    try {
      const { limit = 100, offset = 0 } = req.query;
      const servers = await masterAdminDB.getAllServers(parseInt(limit), parseInt(offset));
      res.json({ servers });
    } catch (error) {
      console.error('Get all servers error:', error);
      res.status(500).json({ error: 'Failed to get servers' });
    }
  });

  // ==================== SERVERS ====================
  
  // Get all servers
  router.get('/servers', async (req, res) => {
    try {
      const { limit = 100, offset = 0 } = req.query;
      const servers = await masterAdminDB.getAllServers(parseInt(limit), parseInt(offset));
      res.json({ servers });
    } catch (error) {
      console.error('Get all servers error:', error);
      res.status(500).json({ error: 'Failed to get servers' });
    }
  });

  // Delete server
  router.delete('/servers/:serverId', async (req, res) => {
    try {
      const { serverId } = req.params;
      const result = await masterAdminDB.deleteServer(serverId);
      res.json({ success: result.success });
    } catch (error) {
      console.error('Delete server error:', error);
      res.status(500).json({ error: 'Failed to delete server' });
    }
  });

  // ==================== MESSAGES ====================
  
  // Get all messages
  router.get('/messages', async (req, res) => {
    try {
      const { limit = 100, offset = 0, serverId, channelId } = req.query;
      const messages = await masterAdminDB.getAllMessages(
        parseInt(limit), 
        parseInt(offset),
        serverId || null,
        channelId || null
      );
      res.json({ messages });
    } catch (error) {
      console.error('Get all messages error:', error);
      res.status(500).json({ error: 'Failed to get messages' });
    }
  });

  // Get messages from specific channel
  router.get('/channels/:channelId/messages', async (req, res) => {
    try {
      const { channelId } = req.params;
      const { limit = 100, offset = 0 } = req.query;
      const messages = await masterAdminDB.getChannelMessages(
        channelId,
        parseInt(limit),
        parseInt(offset)
      );
      res.json({ messages });
    } catch (error) {
      console.error('Get channel messages error:', error);
      res.status(500).json({ error: 'Failed to get channel messages' });
    }
  });

  // Get all DM messages
  router.get('/dm-messages', async (req, res) => {
    try {
      const { limit = 100, offset = 0 } = req.query;
      const messages = await masterAdminDB.getAllDMMessages(parseInt(limit), parseInt(offset));
      res.json({ messages });
    } catch (error) {
      console.error('Get all DM messages error:', error);
      res.status(500).json({ error: 'Failed to get DM messages' });
    }
  });

  return router;
};
