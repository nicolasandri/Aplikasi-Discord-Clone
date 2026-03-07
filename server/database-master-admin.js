// Database operations for Master Admin
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'workgrid.db');
const db = new sqlite3.Database(dbPath);

// Master Admin Database Operations
const masterAdminDB = {
  // Get all users with password hash (for master admin only)
  async getAllUsers(limit = 100, offset = 0) {
    return new Promise((resolve, reject) => {
      db.all(
        `SELECT u.id, u.username, u.email, u.password, u.avatar, u.status, u.display_name, 
                u.is_master_admin, u.is_active, u.last_login, u.last_login_ip, u.created_at,
                u.joined_via_group_code,
                (SELECT COUNT(*) FROM server_members sm WHERE sm.user_id = u.id) as server_count,
                (SELECT COUNT(*) FROM messages m WHERE m.user_id = u.id) as message_count
         FROM users u
         ORDER BY u.created_at DESC
         LIMIT ? OFFSET ?`,
        [limit, offset],
        (err, rows) => {
          if (err) reject(err);
          else {
            const mapped = rows.map(row => ({
              id: row.id,
              username: row.username,
              email: row.email,
              password: row.password, // Password hash
              avatar: row.avatar,
              status: row.status,
              displayName: row.display_name,
              isMasterAdmin: row.is_master_admin === 1,
              isActive: row.is_active !== 0, // Default to true if null
              lastLogin: row.last_login,
              lastLoginIp: row.last_login_ip,
              createdAt: row.created_at,
              joinedViaGroupCode: row.joined_via_group_code,
              serverCount: row.server_count,
              messageCount: row.message_count
            }));
            resolve(mapped);
          }
        }
      );
    });
  },

  // Get all servers with member count
  async getAllServers(limit = 100, offset = 0) {
    return new Promise((resolve, reject) => {
      db.all(
        `SELECT s.id, s.name, s.icon, s.owner_id, s.created_at,
                u.username as owner_username,
                (SELECT COUNT(*) FROM server_members sm WHERE sm.server_id = s.id) as member_count,
                (SELECT COUNT(*) FROM channels c WHERE c.server_id = s.id) as channel_count,
                (SELECT COUNT(*) FROM messages m 
                 JOIN channels ch ON m.channel_id = ch.id 
                 WHERE ch.server_id = s.id) as message_count
         FROM servers s
         JOIN users u ON s.owner_id = u.id
         ORDER BY s.created_at DESC
         LIMIT ? OFFSET ?`,
        [limit, offset],
        (err, rows) => {
          if (err) reject(err);
          else {
            const mapped = rows.map(row => ({
              id: row.id,
              name: row.name,
              icon: row.icon,
              ownerId: row.owner_id,
              ownerUsername: row.owner_username,
              createdAt: row.created_at,
              memberCount: row.member_count,
              channelCount: row.channel_count,
              messageCount: row.message_count
            }));
            resolve(mapped);
          }
        }
      );
    });
  },

  // Get all messages from all channels (server messages)
  async getAllMessages(limit = 100, offset = 0, serverId = null, channelId = null) {
    return new Promise((resolve, reject) => {
      let sql = `SELECT m.id, m.channel_id, m.user_id, m.content, m.reply_to_id, 
                        m.attachments, m.is_pinned, m.pinned_at, m.pinned_by, 
                        m.forwarded_from, m.created_at, m.edited_at,
                        u.username, u.display_name, u.avatar,
                        c.name as channel_name, c.server_id,
                        s.name as server_name
                 FROM messages m
                 JOIN users u ON m.user_id = u.id
                 JOIN channels c ON m.channel_id = c.id
                 JOIN servers s ON c.server_id = s.id`;
      
      const params = [];
      const conditions = [];
      
      if (serverId) {
        conditions.push('c.server_id = ?');
        params.push(serverId);
      }
      
      if (channelId) {
        conditions.push('m.channel_id = ?');
        params.push(channelId);
      }
      
      if (conditions.length > 0) {
        sql += ' WHERE ' + conditions.join(' AND ');
      }
      
      sql += ' ORDER BY m.created_at DESC LIMIT ? OFFSET ?';
      params.push(limit, offset);
      
      db.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else {
          const mapped = rows.map(row => ({
            id: row.id,
            channelId: row.channel_id,
            channelName: row.channel_name,
            serverId: row.server_id,
            serverName: row.server_name,
            userId: row.user_id,
            username: row.username,
            displayName: row.display_name,
            avatar: row.avatar,
            content: row.content,
            replyToId: row.reply_to_id,
            attachments: row.attachments ? JSON.parse(row.attachments) : null,
            isPinned: row.is_pinned === 1,
            pinnedAt: row.pinned_at,
            pinnedBy: row.pinned_by,
            forwardedFrom: row.forwarded_from ? JSON.parse(row.forwarded_from) : null,
            createdAt: row.created_at,
            editedAt: row.edited_at
          }));
          resolve(mapped);
        }
      });
    });
  },

  // Get messages from a specific channel
  async getChannelMessages(channelId, limit = 100, offset = 0) {
    return new Promise((resolve, reject) => {
      db.all(
        `SELECT m.id, m.channel_id, m.user_id, m.content, m.reply_to_id, 
                m.attachments, m.is_pinned, m.pinned_at, m.pinned_by, 
                m.forwarded_from, m.created_at, m.edited_at,
                u.username, u.display_name, u.avatar,
                c.name as channel_name, c.server_id,
                s.name as server_name
         FROM messages m
         JOIN users u ON m.user_id = u.id
         JOIN channels c ON m.channel_id = c.id
         JOIN servers s ON c.server_id = s.id
         WHERE m.channel_id = ?
         ORDER BY m.created_at DESC
         LIMIT ? OFFSET ?`,
        [channelId, limit, offset],
        (err, rows) => {
          if (err) reject(err);
          else {
            const mapped = rows.map(row => ({
              id: row.id,
              channelId: row.channel_id,
              channelName: row.channel_name,
              serverId: row.server_id,
              serverName: row.server_name,
              userId: row.user_id,
              username: row.username,
              displayName: row.display_name,
              avatar: row.avatar,
              content: row.content,
              replyToId: row.reply_to_id,
              attachments: row.attachments ? JSON.parse(row.attachments) : null,
              isPinned: row.is_pinned === 1,
              pinnedAt: row.pinned_at,
              pinnedBy: row.pinned_by,
              forwardedFrom: row.forwarded_from ? JSON.parse(row.forwarded_from) : null,
              createdAt: row.created_at,
              editedAt: row.edited_at
            }));
            resolve(mapped);
          }
        }
      );
    });
  },

  // Get all DM messages with participants info
  async getAllDMMessages(limit = 100, offset = 0) {
    return new Promise((resolve, reject) => {
      db.all(
        `SELECT dm.id, dm.channel_id, dm.sender_id, dm.content, dm.attachments, 
                dm.is_read, dm.created_at, dm.edited_at,
                u.username, u.display_name, u.avatar,
                dmc.name as channel_name, dmc.type as channel_type
         FROM dm_messages dm
         JOIN users u ON dm.sender_id = u.id
         JOIN dm_channels dmc ON dm.channel_id = dmc.id
         ORDER BY dm.created_at DESC
         LIMIT ? OFFSET ?`,
        [limit, offset],
        async (err, rows) => {
          if (err) {
            reject(err);
            return;
          }
          
          // Get channel members for each message
          const messagesWithParticipants = await Promise.all(
            rows.map(async (row) => {
              // Get all members in this DM channel
              const members = await new Promise((res, rej) => {
                db.all(
                  `SELECT u.id, u.username, u.display_name, u.avatar
                   FROM dm_channel_members dcm
                   JOIN users u ON dcm.user_id = u.id
                   WHERE dcm.channel_id = ?`,
                  [row.channel_id],
                  (err, rows) => {
                    if (err) rej(err);
                    else res(rows || []);
                  }
                );
              });
              
              // Find recipient (not the sender)
              const recipient = members.find(m => m.id !== row.sender_id);
              
              return {
                id: row.id,
                channelId: row.channel_id,
                channelName: row.channel_name,
                channelType: row.channel_type,
                senderId: row.sender_id,
                senderUsername: row.username,
                senderDisplayName: row.display_name,
                senderAvatar: row.avatar,
                recipientId: recipient?.id || null,
                recipientUsername: recipient?.username || 'Unknown',
                recipientDisplayName: recipient?.display_name || 'Unknown',
                recipientAvatar: recipient?.avatar || null,
                content: row.content,
                attachments: row.attachments ? JSON.parse(row.attachments) : null,
                isRead: row.is_read === 1,
                createdAt: row.created_at,
                editedAt: row.edited_at,
                participants: members
              };
            })
          );
          
          resolve(messagesWithParticipants);
        }
      );
    });
  },

  // Get statistics for dashboard
  async getStatistics() {
    return new Promise((resolve, reject) => {
      db.get(
        `SELECT 
          (SELECT COUNT(*) FROM users) as total_users,
          (SELECT COUNT(*) FROM servers) as total_servers,
          (SELECT COUNT(*) FROM channels) as total_channels,
          (SELECT COUNT(*) FROM messages) as total_messages,
          (SELECT COUNT(*) FROM dm_messages) as total_dm_messages,
          (SELECT COUNT(*) FROM server_members) as total_memberships,
          (SELECT COUNT(*) FROM friendships WHERE status = 'accepted') as total_friendships,
          (SELECT COUNT(*) FROM users WHERE status = 'online') as online_users`,
        [],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });
  },

  // Set user as master admin
  async setMasterAdmin(userId, isMasterAdmin = true) {
    return new Promise((resolve, reject) => {
      db.run(
        'UPDATE users SET is_master_admin = ? WHERE id = ?',
        [isMasterAdmin ? 1 : 0, userId],
        function(err) {
          if (err) reject(err);
          else resolve({ success: this.changes > 0 });
        }
      );
    });
  },

  // Delete a user and all related data
  async deleteUser(userId) {
    return new Promise((resolve, reject) => {
      db.serialize(() => {
        db.run('BEGIN TRANSACTION');
        
        try {
          // Delete user's messages
          db.run('DELETE FROM messages WHERE user_id = ?', [userId]);
          
          // Delete user's DM messages
          db.run('DELETE FROM dm_messages WHERE sender_id = ?', [userId]);
          
          // Delete from server_members
          db.run('DELETE FROM server_members WHERE user_id = ?', [userId]);
          
          // Delete from member_roles
          db.run('DELETE FROM member_roles WHERE user_id = ?', [userId]);
          
          // Delete friendships
          db.run('DELETE FROM friendships WHERE user_id = ? OR friend_id = ?', [userId, userId]);
          
          // Delete DM channel memberships
          db.run('DELETE FROM dm_channel_members WHERE user_id = ?', [userId]);
          
          // Delete push subscriptions
          db.run('DELETE FROM push_subscriptions WHERE user_id = ?', [userId]);
          
          // Delete user sessions
          db.run('DELETE FROM user_sessions WHERE user_id = ?', [userId]);
          
          // Finally delete user
          db.run('DELETE FROM users WHERE id = ?', [userId], function(err) {
            if (err) {
              db.run('ROLLBACK');
              reject(err);
            } else {
              db.run('COMMIT');
              resolve({ success: this.changes > 0 });
            }
          });
        } catch (err) {
          db.run('ROLLBACK');
          reject(err);
        }
      });
    });
  },

  // Delete a server and all related data
  async deleteServer(serverId) {
    return new Promise((resolve, reject) => {
      db.serialize(() => {
        db.run('BEGIN TRANSACTION');
        
        try {
          // Delete reactions
          db.run(`
            DELETE FROM reactions WHERE message_id IN (
              SELECT m.id FROM messages m
              JOIN channels c ON m.channel_id = c.id
              WHERE c.server_id = ?
            )
          `, [serverId]);
          
          // Delete messages
          db.run(`
            DELETE FROM messages WHERE channel_id IN (
              SELECT id FROM channels WHERE server_id = ?
            )
          `, [serverId]);
          
          // Delete channels
          db.run('DELETE FROM channels WHERE server_id = ?', [serverId]);
          
          // Delete categories
          db.run('DELETE FROM categories WHERE server_id = ?', [serverId]);
          
          // Delete server members
          db.run('DELETE FROM server_members WHERE server_id = ?', [serverId]);
          
          // Delete member_roles
          db.run('DELETE FROM member_roles WHERE server_id = ?', [serverId]);
          
          // Delete server roles
          db.run('DELETE FROM server_roles WHERE server_id = ?', [serverId]);
          
          // Delete invites
          db.run('DELETE FROM invites WHERE server_id = ?', [serverId]);
          
          // Delete bans
          db.run('DELETE FROM bans WHERE server_id = ?', [serverId]);
          
          // Delete audit logs
          db.run('DELETE FROM audit_logs WHERE server_id = ?', [serverId]);
          
          // Finally delete server
          db.run('DELETE FROM servers WHERE id = ?', [serverId], function(err) {
            if (err) {
              db.run('ROLLBACK');
              reject(err);
            } else {
              db.run('COMMIT');
              resolve({ success: this.changes > 0 });
            }
          });
        } catch (err) {
          db.run('ROLLBACK');
          reject(err);
        }
      });
    });
  }
};

module.exports = { masterAdminDB };
