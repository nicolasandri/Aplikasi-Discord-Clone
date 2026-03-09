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

  router.put('/users/:userId/master-admin', async (req, res) => {
    try {
      const { userId } = req.params;
      const { isMasterAdmin } = req.body;
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

  router.delete('/users/:userId', async (req, res) => {
    try {
      const { userId } = req.params;
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

  router.post('/users/:userId/reset-password', async (req, res) => {
    try {
      const { userId } = req.params;
      const { tempPassword } = req.body;
      if (req.userId === userId) {
        return res.status(400).json({ error: 'Tidak dapat mereset password sendiri melalui fitur ini' });
      }
      if (!tempPassword || tempPassword.length < 6) {
        return res.status(400).json({ error: 'Password sementara minimal 6 karakter' });
      }
      await dbModule.adminResetPassword(userId, tempPassword);
      res.json({ success: true, message: 'Password berhasil direset.' });
    } catch (error) {
      console.error('Reset password error:', error);
      res.status(500).json({ error: 'Failed to reset password' });
    }
  });

  router.put('/users/:userId/toggle-active', async (req, res) => {
    try {
      const { userId } = req.params;
      const { isActive } = req.body;
      if (req.userId === userId && !isActive) {
        return res.status(400).json({ error: 'Tidak dapat menonaktifkan akun sendiri' });
      }
      await dbModule.toggleUserActive(userId, isActive);
      res.json({ success: true, message: isActive ? 'User berhasil diaktifkan' : 'User berhasil dinonaktifkan', isActive });
    } catch (error) {
      console.error('Toggle user active error:', error);
      res.status(500).json({ error: 'Failed to toggle user status' });
    }
  });

  // Get single user
  router.get('/users/:userId', async (req, res) => {
    try {
      const user = await dbModule.userDB.findById(req.params.userId);
      if (!user) return res.status(404).json({ error: 'User tidak ditemukan' });
      res.json(user);
    } catch (error) {
      res.status(500).json({ error: 'Failed to get user' });
    }
  });

  // ==================== FRIEND REQUESTS ====================

  router.get('/friend-requests/pending', async (req, res) => {
    try {
      const pendingRequests = await dbModule.dbAll(
        `SELECT f.id, f.user_id, f.friend_id, f.status, f.created_at,
                u1.username as sender_username, u1.display_name as sender_display_name,
                u2.username as receiver_username, u2.display_name as receiver_display_name
         FROM friendships f
         JOIN users u1 ON f.user_id = u1.id
         JOIN users u2 ON f.friend_id = u2.id
         WHERE f.status = 'pending'
         ORDER BY f.created_at DESC`
      );
      res.json({ pendingRequests });
    } catch (error) {
      console.error('Get pending friend requests error:', error);
      res.status(500).json({ error: 'Failed to get pending friend requests' });
    }
  });

  router.delete('/friend-requests/pending', async (req, res) => {
    try {
      await dbModule.dbRun("DELETE FROM friendships WHERE status = 'pending'");
      res.json({ success: true, message: 'Semua pending friend requests telah dihapus' });
    } catch (error) {
      console.error('Clear pending friend requests error:', error);
      res.status(500).json({ error: 'Failed to clear pending friend requests' });
    }
  });

  router.delete('/friend-requests', async (req, res) => {
    try {
      const { user1, user2 } = req.body;
      const user1Data = await dbModule.dbGet('SELECT id FROM users WHERE username = ?', [user1]);
      const user2Data = await dbModule.dbGet('SELECT id FROM users WHERE username = ?', [user2]);
      if (!user1Data || !user2Data) {
        return res.status(404).json({ error: 'User tidak ditemukan' });
      }
      await dbModule.dbRun(
        'DELETE FROM friendships WHERE (user_id = ? AND friend_id = ?) OR (user_id = ? AND friend_id = ?)',
        [user1Data.id, user2Data.id, user2Data.id, user1Data.id]
      );
      res.json({ success: true, message: `Friendship antara ${user1} dan ${user2} telah dihapus` });
    } catch (error) {
      console.error('Delete friendship error:', error);
      res.status(500).json({ error: 'Failed to delete friendship' });
    }
  });

  // ==================== GROUP CODE MANAGEMENT ====================

  router.post('/group-codes', async (req, res) => {
    try {
      const { serverId, code, maxUses, autoJoinChannels } = req.body;
      if (!serverId || !code) {
        return res.status(400).json({ error: 'Server ID dan kode grup diperlukan' });
      }
      const existing = await dbModule.dbGet('SELECT id FROM invites WHERE code = ?', [code]);
      if (existing) {
        return res.status(400).json({ error: 'Kode grup sudah digunakan' });
      }
      const id = require('crypto').randomUUID();
      const channelsJson = autoJoinChannels ? JSON.stringify(autoJoinChannels) : null;
      await dbModule.dbRun(
        `INSERT INTO invites (id, server_id, code, created_by, max_uses, is_group_code, auto_join_channels, created_at)
         VALUES (?, ?, ?, ?, ?, TRUE, ?, NOW())`,
        [id, serverId, code, req.userId, maxUses || null, channelsJson]
      );
      res.json({ success: true, message: 'Kode grup berhasil dibuat', groupCode: { id, code, serverId } });
    } catch (error) {
      console.error('Create group code error:', error);
      res.status(500).json({ error: 'Failed to create group code' });
    }
  });

  router.get('/group-codes', async (req, res) => {
    try {
      const groupCodes = await dbModule.dbAll(
        `SELECT i.*, s.name as server_name, u.username as creator_username
         FROM invites i
         JOIN servers s ON i.server_id = s.id
         JOIN users u ON i.created_by = u.id
         WHERE i.is_group_code = TRUE
         ORDER BY i.created_at DESC`
      );
      res.json({ groupCodes });
    } catch (error) {
      console.error('Get group codes error:', error);
      res.status(500).json({ error: 'Failed to get group codes' });
    }
  });

  router.delete('/group-codes/:codeId', async (req, res) => {
    try {
      await dbModule.dbRun('DELETE FROM invites WHERE id = ? AND is_group_code = TRUE', [req.params.codeId]);
      res.json({ success: true, message: 'Kode grup berhasil dihapus' });
    } catch (error) {
      console.error('Delete group code error:', error);
      res.status(500).json({ error: 'Failed to delete group code' });
    }
  });

  router.put('/group-codes/:codeId/default-channel', async (req, res) => {
    try {
      const { codeId } = req.params;
      const { defaultChannelId } = req.body;
      const groupCode = await dbModule.dbGet('SELECT * FROM invites WHERE id = ? AND is_group_code = TRUE', [codeId]);
      if (!groupCode) {
        return res.status(404).json({ error: 'Kode grup tidak ditemukan' });
      }
      const channelsJson = defaultChannelId ? JSON.stringify([defaultChannelId]) : null;
      await dbModule.dbRun('UPDATE invites SET auto_join_channels = ? WHERE id = ? AND is_group_code = TRUE', [channelsJson, codeId]);
      res.json({ success: true, message: 'Channel default berhasil diupdate', defaultChannelId });
    } catch (error) {
      console.error('Update default channel error:', error);
      res.status(500).json({ error: 'Failed to update default channel' });
    }
  });

  router.get('/group-codes/:codeId/channels', async (req, res) => {
    try {
      const { codeId } = req.params;
      const groupCode = await dbModule.dbGet(
        `SELECT i.*, s.name as server_name FROM invites i
         JOIN servers s ON i.server_id = s.id
         WHERE i.id = ? AND i.is_group_code = TRUE`,
        [codeId]
      );
      if (!groupCode) {
        return res.status(404).json({ error: 'Kode grup tidak ditemukan' });
      }
      const channels = await dbModule.dbAll(
        `SELECT c.id, c.name, c.type, cat.name as category_name
         FROM channels c LEFT JOIN categories cat ON c.category_id = cat.id
         WHERE c.server_id = ? ORDER BY cat.position, c.position`,
        [groupCode.server_id]
      );
      let defaultChannelId = null;
      if (groupCode.auto_join_channels) {
        try {
          const arr = typeof groupCode.auto_join_channels === 'string'
            ? JSON.parse(groupCode.auto_join_channels)
            : groupCode.auto_join_channels;
          defaultChannelId = arr[0] || null;
        } catch (e) {}
      }
      res.json({
        groupCode: { id: groupCode.id, code: groupCode.code, serverName: groupCode.server_name },
        channels,
        defaultChannelId
      });
    } catch (error) {
      console.error('Get group code channels error:', error);
      res.status(500).json({ error: 'Failed to get channels' });
    }
  });

  // ==================== USER SERVER ACCESS MANAGEMENT ====================

  router.get('/server-access/users', async (req, res) => {
    try {
      const users = await dbModule.dbAll('SELECT id, username, display_name, avatar FROM users ORDER BY username');
      const servers = await dbModule.dbAll('SELECT id, name, icon FROM servers ORDER BY name');
      const accessRecords = await dbModule.dbAll('SELECT user_id, server_id, is_allowed FROM user_server_access');
      const memberships = await dbModule.dbAll('SELECT user_id, server_id FROM server_members');

      const accessMap = {};
      accessRecords.forEach(r => {
        if (!accessMap[r.user_id]) accessMap[r.user_id] = {};
        accessMap[r.user_id][r.server_id] = r.is_allowed === true || r.is_allowed === 1;
      });

      const membershipMap = {};
      memberships.forEach(m => {
        if (!membershipMap[m.user_id]) membershipMap[m.user_id] = {};
        membershipMap[m.user_id][m.server_id] = true;
      });

      const serverMemberStats = {};
      memberships.forEach(m => {
        if (!serverMemberStats[m.server_id]) serverMemberStats[m.server_id] = { total: 0, active: 0, inactive: 0 };
        serverMemberStats[m.server_id].total++;
        const hasAccess = accessMap[m.user_id]?.[m.server_id] !== false;
        if (hasAccess) serverMemberStats[m.server_id].active++;
        else serverMemberStats[m.server_id].inactive++;
      });

      const usersWithAccess = users.map(user => {
        const serverAccess = servers.map(srv => ({
          serverId: srv.id, serverName: srv.name, serverIcon: srv.icon,
          isMember: !!membershipMap[user.id]?.[srv.id],
          isAllowed: membershipMap[user.id]?.[srv.id] ? (accessMap[user.id]?.[srv.id] !== false) : false
        })).filter(sa => sa.isMember);
        return { ...user, serverAccess };
      }).filter(u => u.serverAccess.length > 0);

      const serversWithMemberCount = servers.map(srv => ({
        ...srv,
        member_count: serverMemberStats[srv.id]?.total || 0,
        active_count: serverMemberStats[srv.id]?.active || 0,
        inactive_count: serverMemberStats[srv.id]?.inactive || 0
      }));

      res.json({ users: usersWithAccess, servers: serversWithMemberCount });
    } catch (error) {
      console.error('Get users server access error:', error);
      res.status(500).json({ error: 'Failed to get users server access' });
    }
  });

  router.put('/users/:userId/servers/:serverId/access', async (req, res) => {
    try {
      const { userId, serverId } = req.params;
      const { isAllowed } = req.body;
      if (typeof isAllowed !== 'boolean') {
        return res.status(400).json({ error: 'isAllowed harus boolean' });
      }
      const user = await dbModule.userDB.findById(userId);
      if (!user) return res.status(404).json({ error: 'User tidak ditemukan' });
      const server = await dbModule.dbGet('SELECT id FROM servers WHERE id = ?', [serverId]);
      if (!server) return res.status(404).json({ error: 'Server tidak ditemukan' });
      const members = await dbModule.serverDB.getMembers(serverId);
      if (!members.some(m => m.id === userId)) {
        return res.status(400).json({ error: 'User bukan member server ini' });
      }
      await dbModule.userServerAccessDB.setServerAccess(userId, serverId, isAllowed);
      res.json({ success: true, message: `Akses server ${isAllowed ? 'diberikan' : 'ditolak'}`, userId, serverId, isAllowed });
    } catch (error) {
      console.error('Update server access error:', error);
      res.status(500).json({ error: 'Failed to update server access' });
    }
  });

  router.get('/server-access/servers', async (req, res) => {
    try {
      const servers = await dbModule.dbAll(
        `SELECT s.id, s.name, s.icon,
                (SELECT COUNT(*) FROM server_members WHERE server_id = s.id) as member_count
         FROM servers s ORDER BY s.name`
      );
      res.json({ servers });
    } catch (error) {
      console.error('Get servers for server access error:', error);
      res.status(500).json({ error: 'Failed to get servers' });
    }
  });

  router.get('/servers/:serverId/members/server-access', async (req, res) => {
    try {
      const { serverId } = req.params;
      const server = await dbModule.dbGet('SELECT id, name, icon FROM servers WHERE id = ?', [serverId]);
      if (!server) return res.status(404).json({ error: 'Server tidak ditemukan' });
      const members = await dbModule.userServerAccessDB.getServerMembersAccess(serverId);
      res.json({ server, members });
    } catch (error) {
      console.error('Get server members access error:', error);
      res.status(500).json({ error: 'Failed to get members server access' });
    }
  });

  // ==================== SERVERS ====================

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

  router.delete('/servers/:serverId', async (req, res) => {
    try {
      const result = await masterAdminDB.deleteServer(req.params.serverId);
      res.json({ success: result.success });
    } catch (error) {
      console.error('Delete server error:', error);
      res.status(500).json({ error: 'Failed to delete server' });
    }
  });

  // Get single server
  router.get('/servers/:serverId', async (req, res) => {
    try {
      const server = await dbModule.serverDB.findById(req.params.serverId);
      if (!server) return res.status(404).json({ error: 'Server tidak ditemukan' });
      res.json(server);
    } catch (error) {
      res.status(500).json({ error: 'Failed to get server' });
    }
  });

  // ==================== MESSAGES ====================

  router.get('/messages', async (req, res) => {
    try {
      const { limit = 100, offset = 0, serverId, channelId } = req.query;
      const messages = await masterAdminDB.getAllMessages(parseInt(limit), parseInt(offset), serverId || null, channelId || null);
      res.json({ messages });
    } catch (error) {
      console.error('Get all messages error:', error);
      res.status(500).json({ error: 'Failed to get messages' });
    }
  });

  router.get('/channels/:channelId/messages', async (req, res) => {
    try {
      const { limit = 100, offset = 0 } = req.query;
      const messages = await masterAdminDB.getChannelMessages(req.params.channelId, parseInt(limit), parseInt(offset));
      res.json({ messages });
    } catch (error) {
      console.error('Get channel messages error:', error);
      res.status(500).json({ error: 'Failed to get channel messages' });
    }
  });

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
