/**
 * PostgreSQL Database Module for Discord Clone
 * Optimized for 110 concurrent users
 */

const { pool, query, queryOne, queryMany, withTransaction } = require('./config/database');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

// ============================================
// PERMISSION SYSTEM CONSTANTS
// ============================================

// Permission Bitfield (Discord-like)
const Permissions = {
  VIEW_CHANNEL: 1 << 0,
  SEND_MESSAGES: 1 << 1,
  CONNECT: 1 << 2,
  SPEAK: 1 << 3,
  KICK_MEMBERS: 1 << 4,
  BAN_MEMBERS: 1 << 5,
  MANAGE_MESSAGES: 1 << 6,
  MANAGE_CHANNELS: 1 << 7,
  MANAGE_ROLES: 1 << 8,
  MANAGE_SERVER: 1 << 9,
  ADMINISTRATOR: 1 << 10,
  MODERATE_MEMBERS: 1 << 11,
};

// Default permissions for each role
const RolePermissions = {
  owner: Object.values(Permissions).reduce((a, b) => a | b, 0),
  admin: 
    Permissions.VIEW_CHANNEL |
    Permissions.SEND_MESSAGES |
    Permissions.CONNECT |
    Permissions.SPEAK |
    Permissions.KICK_MEMBERS |
    Permissions.BAN_MEMBERS |
    Permissions.MANAGE_MESSAGES |
    Permissions.MANAGE_CHANNELS |
    Permissions.MANAGE_ROLES |
    Permissions.MODERATE_MEMBERS,
  moderator:
    Permissions.VIEW_CHANNEL |
    Permissions.SEND_MESSAGES |
    Permissions.CONNECT |
    Permissions.SPEAK |
    Permissions.KICK_MEMBERS |
    Permissions.MANAGE_MESSAGES |
    Permissions.MODERATE_MEMBERS,
  member:
    Permissions.VIEW_CHANNEL |
    Permissions.SEND_MESSAGES |
    Permissions.CONNECT |
    Permissions.SPEAK,
};

// Role hierarchy (higher = more power)
const RoleHierarchy = {
  owner: 4,
  admin: 3,
  moderator: 2,
  member: 1,
};

// ============================================
// DATABASE INITIALIZATION
// ============================================

async function initDatabase() {
  try {
    // Test connection
    await query('SELECT NOW()');
    console.log('✅ PostgreSQL database initialized');
  } catch (error) {
    console.error('❌ Failed to initialize PostgreSQL:', error);
    throw error;
  }
}

// ============================================
// PERMISSION DATABASE
// ============================================

const permissionDB = {
  async hasPermission(userId, serverId, permission) {
    const role = await this.getUserRole(userId, serverId);
    if (!role) return false;
    const rolePerms = RolePermissions[role];
    return (rolePerms & permission) === permission;
  },

  async getUserRole(userId, serverId) {
    const result = await queryOne(
      'SELECT role FROM server_members WHERE server_id = $1 AND user_id = $2',
      [serverId, userId]
    );
    return result?.role || null;
  },

  async isServerOwner(userId, serverId) {
    const result = await queryOne(
      'SELECT owner_id FROM servers WHERE id = $1',
      [serverId]
    );
    return result?.owner_id === userId;
  },

  async getUserPermissions(userId, serverId) {
    const role = await this.getUserRole(userId, serverId);
    if (!role) return 0;
    return RolePermissions[role] || 0;
  },

  async canManageUser(managerId, targetId, serverId) {
    if (managerId === targetId) return false;

    const managerRole = await this.getUserRole(managerId, serverId);
    const targetRole = await this.getUserRole(targetId, serverId);
    
    if (!managerRole || !targetRole) return false;

    const managerHierarchy = RoleHierarchy[managerRole];
    const targetHierarchy = RoleHierarchy[targetRole];

    return managerHierarchy > targetHierarchy;
  },

  async updateMemberRole(serverId, userId, newRole) {
    const result = await query(
      'UPDATE server_members SET role = $1 WHERE server_id = $2 AND user_id = $3 RETURNING *',
      [newRole, serverId, userId]
    );
    return { success: result.rowCount > 0 };
  },

  async removeMember(serverId, userId) {
    const result = await query(
      'DELETE FROM server_members WHERE server_id = $1 AND user_id = $2',
      [serverId, userId]
    );
    return { success: result.rowCount > 0 };
  },

  async banMember(serverId, userId, reason = null) {
    return withTransaction(async (client) => {
      const id = uuidv4();
      await client.query(
        'INSERT INTO bans (id, server_id, user_id, reason) VALUES ($1, $2, $3, $4)',
        [id, serverId, userId, reason]
      );
      await client.query(
        'DELETE FROM server_members WHERE server_id = $1 AND user_id = $2',
        [serverId, userId]
      );
      return { success: true };
    });
  },

  async isBanned(serverId, userId) {
    const result = await queryOne(
      'SELECT id FROM bans WHERE server_id = $1 AND user_id = $2',
      [serverId, userId]
    );
    return !!result;
  },
};

// ============================================
// USER DATABASE
// ============================================

const userDB = {
  async create(username, email, password) {
    const hashedPassword = await bcrypt.hash(password, 10);
    const avatar = `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`;
    
    const result = await query(
      `INSERT INTO users (username, email, password, avatar) 
       VALUES ($1, $2, $3, $4) 
       RETURNING id, username, email, avatar, status`,
      [username, email, hashedPassword, avatar]
    );
    
    return result.rows[0];
  },

  async findByEmail(email) {
    return await queryOne('SELECT * FROM users WHERE email = $1', [email]);
  },

  async findByUsername(username) {
    return await queryOne('SELECT * FROM users WHERE username = $1', [username]);
  },

  async findById(id) {
    return await queryOne(
      'SELECT id, username, email, avatar, status, created_at FROM users WHERE id = $1',
      [id]
    );
  },

  async updateProfile(id, updates) {
    const fields = [];
    const values = [];
    let paramIndex = 1;
    
    if (updates.username) {
      fields.push(`username = $${paramIndex++}`);
      values.push(updates.username);
    }
    if (updates.avatar) {
      fields.push(`avatar = $${paramIndex++}`);
      values.push(updates.avatar);
    }
    if (updates.status) {
      fields.push(`status = $${paramIndex++}`);
      values.push(updates.status);
    }
    
    if (fields.length === 0) return true;
    
    values.push(id);
    
    await query(
      `UPDATE users SET ${fields.join(', ')} WHERE id = $${paramIndex}`,
      values
    );
    return true;
  },

  async updatePassword(id, newPassword) {
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await query(
      'UPDATE users SET password = $1 WHERE id = $2',
      [hashedPassword, id]
    );
    return true;
  },

  async verifyPassword(password, hashedPassword) {
    return bcrypt.compare(password, hashedPassword);
  }
};

// ============================================
// SERVER DATABASE
// ============================================

const serverDB = {
  async create(name, icon, ownerId) {
    const id = uuidv4();
    const result = await query(
      `INSERT INTO servers (id, name, icon, owner_id) 
       VALUES ($1, $2, $3, $4) 
       RETURNING id, name, icon, owner_id`,
      [id, name, icon, ownerId]
    );
    return result.rows[0];
  },

  async getUserServers(userId) {
    return await queryMany(
      `SELECT s.* FROM servers s
       JOIN server_members sm ON s.id = sm.server_id
       WHERE sm.user_id = $1`,
      [userId]
    );
  },

  async addMember(serverId, userId, role = 'member') {
    const id = uuidv4();
    try {
      await query(
        `INSERT INTO server_members (id, server_id, user_id, role) 
         VALUES ($1, $2, $3, $4) 
         ON CONFLICT (server_id, user_id) DO NOTHING`,
        [id, serverId, userId, role]
      );
      return true;
    } catch (error) {
      console.error('Error adding member:', error);
      return false;
    }
  },

  async getMembers(serverId) {
    return await queryMany(
      `SELECT u.id, u.username, u.avatar, u.status, sm.role 
       FROM users u
       JOIN server_members sm ON u.id = sm.user_id
       WHERE sm.server_id = $1`,
      [serverId]
    );
  }
};

// ============================================
// CATEGORY DATABASE
// ============================================

const categoryDB = {
  async create(serverId, name, position = 0) {
    const id = uuidv4();
    const result = await query(
      `INSERT INTO categories (id, server_id, name, position) 
       VALUES ($1, $2, $3, $4) 
       RETURNING *`,
      [id, serverId, name, position]
    );
    return result.rows[0];
  },

  async getByServer(serverId) {
    return await queryMany(
      'SELECT * FROM categories WHERE server_id = $1 ORDER BY position',
      [serverId]
    );
  },

  async getById(categoryId) {
    return await queryOne(
      'SELECT * FROM categories WHERE id = $1',
      [categoryId]
    );
  },

  async update(categoryId, updates) {
    const fields = [];
    const values = [];
    let paramIndex = 1;
    
    if (updates.name) {
      fields.push(`name = $${paramIndex++}`);
      values.push(updates.name);
    }
    if (typeof updates.position === 'number') {
      fields.push(`position = $${paramIndex++}`);
      values.push(updates.position);
    }
    
    if (fields.length === 0) {
      return { success: false, error: 'No updates provided' };
    }
    
    values.push(categoryId);
    
    const result = await query(
      `UPDATE categories SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values
    );
    return { success: result.rowCount > 0 };
  },

  async delete(categoryId) {
    return withTransaction(async (client) => {
      await client.query(
        'UPDATE channels SET category_id = NULL WHERE category_id = $1',
        [categoryId]
      );
      const result = await client.query(
        'DELETE FROM categories WHERE id = $1',
        [categoryId]
      );
      return { success: result.rowCount > 0 };
    });
  },

  async reorder(serverId, categoryIds) {
    return withTransaction(async (client) => {
      for (let i = 0; i < categoryIds.length; i++) {
        await client.query(
          'UPDATE categories SET position = $1 WHERE id = $2 AND server_id = $3',
          [i, categoryIds[i], serverId]
        );
      }
      return { success: true };
    });
  }
};

// ============================================
// CHANNEL DATABASE
// ============================================

const channelDB = {
  async create(serverId, name, type = 'text', categoryId = null, position = 0) {
    const id = uuidv4();
    const result = await query(
      `INSERT INTO channels (id, server_id, category_id, name, type, position) 
       VALUES ($1, $2, $3, $4, $5, $6) 
       RETURNING *`,
      [id, serverId, categoryId, name, type, position]
    );
    return result.rows[0];
  },

  async getByServer(serverId) {
    return await queryMany(
      'SELECT * FROM channels WHERE server_id = $1 ORDER BY category_id, position',
      [serverId]
    );
  },

  async getByCategory(categoryId) {
    return await queryMany(
      'SELECT * FROM channels WHERE category_id = $1 ORDER BY position',
      [categoryId]
    );
  },

  async getUncategorized(serverId) {
    return await queryMany(
      'SELECT * FROM channels WHERE server_id = $1 AND category_id IS NULL ORDER BY position',
      [serverId]
    );
  },

  async moveToCategory(channelId, categoryId, position = null) {
    let sql = 'UPDATE channels SET category_id = $1';
    const values = [categoryId];
    
    if (position !== null) {
      sql += ', position = $2';
      values.push(position);
    }
    
    sql += ` WHERE id = $${values.length + 1} RETURNING *`;
    values.push(channelId);
    
    const result = await query(sql, values);
    return { success: result.rowCount > 0 };
  },

  async reorder(channels) {
    return withTransaction(async (client) => {
      for (const { id, categoryId, position } of channels) {
        await client.query(
          'UPDATE channels SET category_id = $1, position = $2 WHERE id = $3',
          [categoryId, position, id]
        );
      }
      return { success: true };
    });
  },

  async update(channelId, updates) {
    const fields = [];
    const values = [];
    let paramIndex = 1;
    
    if (updates.name) {
      fields.push(`name = $${paramIndex++}`);
      values.push(updates.name);
    }
    if (updates.category_id !== undefined) {
      fields.push(`category_id = $${paramIndex++}`);
      values.push(updates.category_id);
    }
    if (typeof updates.position === 'number') {
      fields.push(`position = $${paramIndex++}`);
      values.push(updates.position);
    }
    
    if (fields.length === 0) {
      return { success: false, error: 'No updates provided' };
    }
    
    values.push(channelId);
    
    const result = await query(
      `UPDATE channels SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values
    );
    return { success: result.rowCount > 0 };
  }
};

// ============================================
// MESSAGE DATABASE
// ============================================

const messageDB = {
  async create(channelId, userId, content, replyToId = null, attachments = null) {
    const id = uuidv4();
    const attachmentsJson = attachments ? JSON.stringify(attachments) : '[]';
    
    await query(
      `INSERT INTO messages (id, channel_id, user_id, content, reply_to_id, attachments) 
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [id, channelId, userId, content, replyToId, attachmentsJson]
    );
    
    return await this.getById(id);
  },

  async getById(id) {
    const row = await queryOne(
      `SELECT m.*, u.id as user_id, u.username, u.avatar,
              rm.id as reply_id, rm.content as reply_content,
              ru.id as reply_user_id, ru.username as reply_username, ru.avatar as reply_user_avatar
       FROM messages m
       JOIN users u ON m.user_id = u.id
       LEFT JOIN messages rm ON m.reply_to_id = rm.id
       LEFT JOIN users ru ON rm.user_id = ru.id
       WHERE m.id = $1`,
      [id]
    );
    
    if (!row) return null;
    
    return this.formatMessage(row);
  },

  async getByChannel(channelId, limit = 50, offset = 0) {
    const rows = await queryMany(
      `SELECT m.*, u.id as user_id, u.username, u.avatar,
              rm.id as reply_id, rm.content as reply_content,
              ru.id as reply_user_id, ru.username as reply_username, ru.avatar as reply_user_avatar
       FROM messages m
       JOIN users u ON m.user_id = u.id
       LEFT JOIN messages rm ON m.reply_to_id = rm.id
       LEFT JOIN users ru ON rm.user_id = ru.id
       WHERE m.channel_id = $1
       ORDER BY m.created_at DESC
       LIMIT $2 OFFSET $3`,
      [channelId, limit, offset]
    );
    
    // Get reactions for all messages
    const messageIds = rows.map(r => r.id);
    const reactions = messageIds.length > 0 
      ? await queryMany(
          `SELECT message_id, emoji, COUNT(*) as count, ARRAY_AGG(user_id) as users
           FROM reactions 
           WHERE message_id = ANY($1)
           GROUP BY message_id, emoji`,
          [messageIds]
        )
      : [];
    
    // Group reactions by message
    const reactionsByMessage = {};
    for (const r of reactions) {
      if (!reactionsByMessage[r.message_id]) {
        reactionsByMessage[r.message_id] = [];
      }
      reactionsByMessage[r.message_id].push({
        emoji: r.emoji,
        count: parseInt(r.count),
        users: r.users
      });
    }
    
    // Format messages
    const messages = rows.map(row => {
      const msg = this.formatMessage(row);
      msg.reactions = reactionsByMessage[row.id] || [];
      return msg;
    });
    
    return messages.reverse();
  },

  async update(id, content) {
    await query(
      'UPDATE messages SET content = $1, edited_at = CURRENT_TIMESTAMP WHERE id = $2',
      [content, id]
    );
    return await this.getById(id);
  },

  async delete(id) {
    const result = await query(
      'DELETE FROM messages WHERE id = $1',
      [id]
    );
    return { success: result.rowCount > 0 };
  },

  formatMessage(row) {
    // Parse attachments
    let attachments = [];
    if (row.attachments) {
      try {
        attachments = typeof row.attachments === 'string' 
          ? JSON.parse(row.attachments) 
          : row.attachments;
      } catch (e) {
        attachments = [];
      }
    }
    
    // Format user object
    const user = {
      id: row.user_id,
      username: row.username,
      avatar: row.avatar
    };
    
    // Format replyTo object
    let replyTo = null;
    if (row.reply_to_id) {
      replyTo = {
        id: row.reply_id,
        content: row.reply_content,
        user: {
          id: row.reply_user_id,
          username: row.reply_username,
          avatar: row.reply_user_avatar
        }
      };
    }
    
    return {
      id: row.id,
      channelId: row.channel_id,
      userId: row.user_id,
      content: row.content,
      replyToId: row.reply_to_id,
      replyTo,
      attachments,
      editedAt: row.edited_at,
      timestamp: row.created_at,
      user
    };
  }
};

// ============================================
// REACTION DATABASE
// ============================================

const reactionDB = {
  async add(messageId, userId, emoji) {
    const id = uuidv4();
    try {
      await query(
        `INSERT INTO reactions (id, message_id, user_id, emoji) 
         VALUES ($1, $2, $3, $4) 
         ON CONFLICT (message_id, user_id, emoji) DO NOTHING`,
        [id, messageId, userId, emoji]
      );
      return { id, messageId, userId, emoji };
    } catch (error) {
      console.error('Error adding reaction:', error);
      return null;
    }
  },

  async remove(messageId, userId, emoji) {
    await query(
      'DELETE FROM reactions WHERE message_id = $1 AND user_id = $2 AND emoji = $3',
      [messageId, userId, emoji]
    );
    return true;
  },

  async getByMessage(messageId) {
    return await queryMany(
      `SELECT r.*, u.username, u.avatar 
       FROM reactions r
       JOIN users u ON r.user_id = u.id
       WHERE r.message_id = $1
       ORDER BY r.created_at ASC`,
      [messageId]
    );
  },

  async getGroupedByMessage(messageId) {
    const rows = await queryMany(
      `SELECT emoji, COUNT(*) as count, ARRAY_AGG(user_id) as users
       FROM reactions
       WHERE message_id = $1
       GROUP BY emoji
       ORDER BY count DESC`,
      [messageId]
    );
    
    return rows.map(row => ({
      emoji: row.emoji,
      count: parseInt(row.count),
      users: row.users
    }));
  }
};

// ============================================
// INVITE DATABASE
// ============================================

const inviteDB = {
  async create(serverId, createdBy, expiresAt = null, maxUses = null) {
    const id = uuidv4();
    const code = Math.random().toString(36).substring(2, 10).toUpperCase();
    
    const result = await query(
      `INSERT INTO invites (id, server_id, code, created_by, expires_at, max_uses) 
       VALUES ($1, $2, $3, $4, $5, $6) 
       RETURNING code, server_id`,
      [id, serverId, code, createdBy, expiresAt, maxUses]
    );
    
    return result.rows[0];
  },

  async findByCode(code) {
    return await queryOne(
      `SELECT i.*, s.name as server_name, s.icon as server_icon
       FROM invites i
       JOIN servers s ON i.server_id = s.id
       WHERE i.code = $1`,
      [code]
    );
  },

  async incrementUses(code) {
    await query(
      'UPDATE invites SET uses = uses + 1 WHERE code = $1',
      [code]
    );
    return true;
  }
};

// ============================================
// FRIEND DATABASE
// ============================================

const friendDB = {
  async sendFriendRequest(userId, friendId) {
    if (userId === friendId) {
      throw new Error('Cannot send friend request to yourself');
    }

    const existing = await this.getFriendship(userId, friendId);
    if (existing) {
      if (existing.status === 'accepted') throw new Error('Already friends');
      if (existing.status === 'pending') throw new Error('Friend request already pending');
      if (existing.status === 'blocked') throw new Error('Cannot send request to blocked user');
    }

    const reverseExisting = await this.getFriendship(friendId, userId);
    if (reverseExisting && reverseExisting.status === 'blocked') {
      throw new Error('Cannot send friend request');
    }

    const id = uuidv4();
    const result = await query(
      `INSERT INTO friendships (id, user_id, friend_id, status) 
       VALUES ($1, $2, $3, 'pending') 
       RETURNING *`,
      [id, userId, friendId]
    );
    
    return result.rows[0];
  },

  async getFriendship(userId, friendId) {
    return await queryOne(
      'SELECT * FROM friendships WHERE user_id = $1 AND friend_id = $2',
      [userId, friendId]
    );
  },

  async acceptFriendRequest(requestId, accepterId) {
    return withTransaction(async (client) => {
      const request = await client.query(
        'SELECT * FROM friendships WHERE id = $1 AND friend_id = $2 AND status = $3',
        [requestId, accepterId, 'pending']
      );
      
      if (request.rows.length === 0) {
        throw new Error('Friend request not found');
      }
      
      const requesterId = request.rows[0].user_id;
      
      await client.query(
        'UPDATE friendships SET status = $1 WHERE id = $2',
        ['accepted', requestId]
      );
      
      const reciprocalId = uuidv4();
      await client.query(
        `INSERT INTO friendships (id, user_id, friend_id, status) 
         VALUES ($1, $2, $3, 'accepted') 
         ON CONFLICT (user_id, friend_id) DO UPDATE SET status = 'accepted'`,
        [reciprocalId, accepterId, requesterId]
      );
      
      return { success: true, friendId: requesterId };
    });
  },

  async rejectFriendRequest(requestId, rejecterId) {
    const result = await query(
      'DELETE FROM friendships WHERE id = $1 AND friend_id = $2 AND status = $3',
      [requestId, rejecterId, 'pending']
    );
    
    if (result.rowCount === 0) {
      throw new Error('Friend request not found');
    }
    
    return { success: true };
  },

  async cancelFriendRequest(requestId, senderId) {
    const result = await query(
      'DELETE FROM friendships WHERE id = $1 AND user_id = $2 AND status = $3',
      [requestId, senderId, 'pending']
    );
    
    if (result.rowCount === 0) {
      throw new Error('Friend request not found');
    }
    
    return { success: true };
  },

  async removeFriend(userId, friendId) {
    await query(
      'DELETE FROM friendships WHERE (user_id = $1 AND friend_id = $2) OR (user_id = $2 AND friend_id = $1)',
      [userId, friendId]
    );
    return { success: true };
  },

  async blockUser(userId, blockedUserId) {
    await this.removeFriend(userId, blockedUserId);
    
    const id = uuidv4();
    await query(
      `INSERT INTO friendships (id, user_id, friend_id, status) 
       VALUES ($1, $2, $3, 'blocked') 
       ON CONFLICT (user_id, friend_id) DO UPDATE SET status = 'blocked'`,
      [id, userId, blockedUserId]
    );
    
    return { success: true };
  },

  async unblockUser(userId, blockedUserId) {
    const result = await query(
      'DELETE FROM friendships WHERE user_id = $1 AND friend_id = $2 AND status = $3',
      [userId, blockedUserId, 'blocked']
    );
    
    if (result.rowCount === 0) {
      throw new Error('User not blocked');
    }
    
    return { success: true };
  },

  async getFriends(userId) {
    return await queryMany(
      `SELECT u.id, u.username, u.avatar, u.status, f.created_at as friendship_date
       FROM friendships f
       JOIN users u ON f.friend_id = u.id
       WHERE f.user_id = $1 AND f.status = 'accepted'
       ORDER BY u.username`,
      [userId]
    );
  },

  async getPendingRequests(userId) {
    const incoming = await queryMany(
      `SELECT f.id, f.user_id, f.friend_id, f.status, f.created_at,
              u.id as requester_id, u.username as requester_username, 
              u.avatar as requester_avatar, u.status as requester_status
       FROM friendships f
       JOIN users u ON f.user_id = u.id
       WHERE f.friend_id = $1 AND f.status = 'pending'
       ORDER BY f.created_at DESC`,
      [userId]
    );
    
    const outgoing = await queryMany(
      `SELECT f.id, f.user_id, f.friend_id, f.status, f.created_at,
              u.id as recipient_id, u.username as recipient_username, 
              u.avatar as recipient_avatar, u.status as recipient_status
       FROM friendships f
       JOIN users u ON f.friend_id = u.id
       WHERE f.user_id = $1 AND f.status = 'pending'
       ORDER BY f.created_at DESC`,
      [userId]
    );
    
    return { incoming, outgoing };
  },

  async getBlockedUsers(userId) {
    return await queryMany(
      `SELECT u.id, u.username, u.avatar, f.created_at as blocked_date
       FROM friendships f
       JOIN users u ON f.friend_id = u.id
       WHERE f.user_id = $1 AND f.status = 'blocked'
       ORDER BY f.created_at DESC`,
      [userId]
    );
  },

  async isFriend(userId, friendId) {
    const result = await queryOne(
      'SELECT id FROM friendships WHERE user_id = $1 AND friend_id = $2 AND status = $3',
      [userId, friendId, 'accepted']
    );
    return !!result;
  },

  async isBlocked(userId, blockedUserId) {
    const result = await queryOne(
      'SELECT id FROM friendships WHERE user_id = $1 AND friend_id = $2 AND status = $3',
      [userId, blockedUserId, 'blocked']
    );
    return !!result;
  },

  async getFriendshipStatus(userId, otherUserId) {
    const friendship = await this.getFriendship(userId, otherUserId);
    if (friendship) return friendship.status;
    
    const reverseFriendship = await this.getFriendship(otherUserId, userId);
    if (reverseFriendship) {
      if (reverseFriendship.status === 'pending') return 'incoming_request';
      return reverseFriendship.status;
    }
    
    return 'none';
  }
};

// ============================================
// DM DATABASE
// ============================================

const dmDB = {
  async createDMChannel(user1Id, user2Id) {
    const [firstUser, secondUser] = [user1Id, user2Id].sort();
    
    const existing = await this.getDMChannel(user1Id, user2Id);
    if (existing) return existing;

    const id = uuidv4();
    await query(
      'INSERT INTO dm_channels (id, user1_id, user2_id) VALUES ($1, $2, $3)',
      [id, firstUser, secondUser]
    );
    
    return await this.getDMChannelById(id);
  },

  async getDMChannel(user1Id, user2Id) {
    const [firstUser, secondUser] = [user1Id, user2Id].sort();
    
    return await queryOne(
      `SELECT dc.*, 
              u1.username as user1_username, u1.avatar as user1_avatar, u1.status as user1_status,
              u2.username as user2_username, u2.avatar as user2_avatar, u2.status as user2_status
       FROM dm_channels dc
       JOIN users u1 ON dc.user1_id = u1.id
       JOIN users u2 ON dc.user2_id = u2.id
       WHERE dc.user1_id = $1 AND dc.user2_id = $2`,
      [firstUser, secondUser]
    );
  },

  async getDMChannelById(channelId) {
    return await queryOne(
      `SELECT dc.*, 
              u1.username as user1_username, u1.avatar as user1_avatar, u1.status as user1_status,
              u2.username as user2_username, u2.avatar as user2_avatar, u2.status as user2_status
       FROM dm_channels dc
       JOIN users u1 ON dc.user1_id = u1.id
       JOIN users u2 ON dc.user2_id = u2.id
       WHERE dc.id = $1`,
      [channelId]
    );
  },

  async getUserDMChannels(userId) {
    return await queryMany(
      `SELECT dc.*, 
              CASE WHEN dc.user1_id = $1 THEN dc.user2_id ELSE dc.user1_id END as friend_id,
              CASE WHEN dc.user1_id = $1 THEN u2.username ELSE u1.username END as friend_username,
              CASE WHEN dc.user1_id = $1 THEN u2.avatar ELSE u1.avatar END as friend_avatar,
              CASE WHEN dc.user1_id = $1 THEN u2.status ELSE u1.status END as friend_status,
              (SELECT content FROM dm_messages WHERE channel_id = dc.id ORDER BY created_at DESC LIMIT 1) as last_message,
              (SELECT created_at FROM dm_messages WHERE channel_id = dc.id ORDER BY created_at DESC LIMIT 1) as last_message_at,
              (SELECT COUNT(*) FROM dm_messages WHERE channel_id = dc.id AND sender_id != $1 AND is_read = false) as unread_count
       FROM dm_channels dc
       JOIN users u1 ON dc.user1_id = u1.id
       JOIN users u2 ON dc.user2_id = u2.id
       WHERE dc.user1_id = $1 OR dc.user2_id = $1
       ORDER BY COALESCE(
         (SELECT created_at FROM dm_messages WHERE channel_id = dc.id ORDER BY created_at DESC LIMIT 1),
         dc.updated_at
       ) DESC`,
      [userId]
    );
  },

  async sendDMMessage(channelId, senderId, content, attachments = null) {
    const id = uuidv4();
    const attachmentsJson = attachments ? JSON.stringify(attachments) : '[]';
    
    await query(
      `INSERT INTO dm_messages (id, channel_id, sender_id, content, attachments) 
       VALUES ($1, $2, $3, $4, $5)`,
      [id, channelId, senderId, content, attachmentsJson]
    );
    
    await query(
      'UPDATE dm_channels SET updated_at = CURRENT_TIMESTAMP WHERE id = $1',
      [channelId]
    );
    
    return await this.getDMMessageById(id);
  },

  async getDMMessageById(messageId) {
    const row = await queryOne(
      `SELECT dm.*, u.username as sender_username, u.avatar as sender_avatar
       FROM dm_messages dm
       JOIN users u ON dm.sender_id = u.id
       WHERE dm.id = $1`,
      [messageId]
    );
    
    if (row && row.attachments) {
      try {
        row.attachments = typeof row.attachments === 'string' 
          ? JSON.parse(row.attachments) 
          : row.attachments;
      } catch (e) {
        row.attachments = [];
      }
    }
    
    return row;
  },

  async getDMMessages(channelId, limit = 50, offset = 0) {
    const rows = await queryMany(
      `SELECT dm.*, u.username as sender_username, u.avatar as sender_avatar
       FROM dm_messages dm
       JOIN users u ON dm.sender_id = u.id
       WHERE dm.channel_id = $1
       ORDER BY dm.created_at DESC
       LIMIT $2 OFFSET $3`,
      [channelId, limit, offset]
    );
    
    rows.forEach(row => {
      if (row.attachments) {
        try {
          row.attachments = typeof row.attachments === 'string' 
            ? JSON.parse(row.attachments) 
            : row.attachments;
        } catch (e) {
          row.attachments = [];
        }
      }
    });
    
    return rows.reverse();
  },

  async markDMMessageAsRead(messageId) {
    await query(
      'UPDATE dm_messages SET is_read = true WHERE id = $1',
      [messageId]
    );
    return { success: true };
  },

  async markChannelMessagesAsRead(channelId, userId) {
    const result = await query(
      'UPDATE dm_messages SET is_read = true WHERE channel_id = $1 AND sender_id != $2 AND is_read = false',
      [channelId, userId]
    );
    return { success: true, updated: result.rowCount };
  },

  async getUnreadDMCount(userId) {
    const result = await queryOne(
      `SELECT COUNT(*) as count FROM dm_messages dm
       JOIN dm_channels dc ON dm.channel_id = dc.id
       WHERE (dc.user1_id = $1 OR dc.user2_id = $1) 
         AND dm.sender_id != $1 
         AND dm.is_read = false`,
      [userId]
    );
    return parseInt(result?.count || 0);
  },

  async getUnreadCountPerChannel(userId) {
    const rows = await queryMany(
      `SELECT dm.channel_id, COUNT(*) as count 
       FROM dm_messages dm
       JOIN dm_channels dc ON dm.channel_id = dc.id
       WHERE (dc.user1_id = $1 OR dc.user2_id = $1) 
         AND dm.sender_id != $1 
         AND dm.is_read = false
       GROUP BY dm.channel_id`,
      [userId]
    );
    
    const counts = {};
    rows.forEach(row => {
      counts[row.channel_id] = parseInt(row.count);
    });
    return counts;
  },

  async deleteDMChannel(channelId) {
    return withTransaction(async (client) => {
      await client.query(
        'DELETE FROM dm_messages WHERE channel_id = $1',
        [channelId]
      );
      await client.query(
        'DELETE FROM dm_channels WHERE id = $1',
        [channelId]
      );
      return { success: true };
    });
  }
};

// ============================================
// EXPORTS
// ============================================

module.exports = {
  pool,
  initDatabase,
  userDB,
  serverDB,
  categoryDB,
  channelDB,
  messageDB,
  inviteDB,
  reactionDB,
  permissionDB,
  friendDB,
  dmDB,
  Permissions,
  RolePermissions,
  RoleHierarchy
};

// ============================================
// SQLITE COMPATIBILITY LAYER
// Provides SQLite-like interface for migration compatibility
// ============================================

/**
 * Convert SQLite ? placeholders to PostgreSQL $1, $2, etc.
 */
function convertPlaceholders(sql) {
  let index = 1;
  return sql.replace(/\?/g, () => `$${index++}`);
}

/**
 * SQLite-compatible db object for seamless migration
 */
const db = {
  /**
   * Execute a query (for INSERT, UPDATE, DELETE)
   * Callback signature: (err) => {}
   */
  run(sql, params, callback) {
    // Handle optional params
    if (typeof params === 'function') {
      callback = params;
      params = [];
    }
    
    const pgSql = convertPlaceholders(sql);
    
    pool.query(pgSql, params || [])
      .then(result => {
        // Mimic SQLite's this.changes
        const context = { 
          changes: result.rowCount,
          lastID: result.rows[0]?.id || null
        };
        if (callback) {
          callback.call(context, null);
        }
      })
      .catch(err => {
        if (callback) callback(err);
        else console.error('DB Run Error:', err);
      });
  },

  /**
   * Get a single row
   * Callback signature: (err, row) => {}
   */
  get(sql, params, callback) {
    // Handle optional params
    if (typeof params === 'function') {
      callback = params;
      params = [];
    }
    
    const pgSql = convertPlaceholders(sql);
    
    pool.query(pgSql, params || [])
      .then(result => {
        if (callback) callback(null, result.rows[0] || null);
      })
      .catch(err => {
        if (callback) callback(err, null);
        else console.error('DB Get Error:', err);
      });
  },

  /**
   * Get all rows
   * Callback signature: (err, rows) => {}
   */
  all(sql, params, callback) {
    // Handle optional params
    if (typeof params === 'function') {
      callback = params;
      params = [];
    }
    
    const pgSql = convertPlaceholders(sql);
    
    pool.query(pgSql, params || [])
      .then(result => {
        if (callback) callback(null, result.rows);
      })
      .catch(err => {
        if (callback) callback(err, null);
        else console.error('DB All Error:', err);
      });
  },

  /**
   * Execute multiple statements in a transaction
   */
  exec(sql, callback) {
    // Split and execute multiple statements
    const statements = sql.split(';').filter(s => s.trim());
    
    (async () => {
      const client = await pool.connect();
      try {
        for (const stmt of statements) {
          if (stmt.trim()) {
            await client.query(stmt);
          }
        }
        if (callback) callback(null);
      } catch (err) {
        if (callback) callback(err);
        else console.error('DB Exec Error:', err);
      } finally {
        client.release();
      }
    })();
  }
};

// ============================================
// EXPORTS
// ============================================

module.exports = {
  pool,
  db,
  initDatabase,
  userDB,
  serverDB,
  categoryDB,
  channelDB,
  messageDB,
  inviteDB,
  reactionDB,
  permissionDB,
  friendDB,
  dmDB,
  Permissions,
  RolePermissions,
  RoleHierarchy
};
