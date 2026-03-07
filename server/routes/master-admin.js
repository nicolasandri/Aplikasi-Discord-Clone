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
      
      const id = require('uuid').v4();
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
