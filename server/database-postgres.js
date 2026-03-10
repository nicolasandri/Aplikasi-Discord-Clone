/**
 * PostgreSQL Database Module for Discord Clone
 * Optimized for 110 concurrent users
 */

const { pool, query, queryOne, queryMany, withTransaction } = require('./config/database');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const uuidv4 = () => crypto.randomUUID();

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
    console.log('✅ PostgreSQL connection OK');
    
    // Create member_roles table if not exists (tanpa FK constraints karena tipe data berbeda)
    try {
      await query(`
        CREATE TABLE IF NOT EXISTS member_roles (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          server_id TEXT NOT NULL,
          role_id TEXT NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(user_id, server_id, role_id)
        )
      `);
      console.log('✅ member_roles table OK');
    } catch (e) {
      console.log('⚠️ member_roles table:', e.message);
    }
    
    // Create indexes for member_roles
    try {
      await query(`CREATE INDEX IF NOT EXISTS idx_member_roles_user ON member_roles(user_id)`);
      await query(`CREATE INDEX IF NOT EXISTS idx_member_roles_server ON member_roles(server_id)`);
      await query(`CREATE INDEX IF NOT EXISTS idx_member_roles_role ON member_roles(role_id)`);
    } catch (e) {
      // Indexes might already exist, ignore
    }
    
    // Create channel_read_status table
    try {
      await query(`
        CREATE TABLE IF NOT EXISTS channel_read_status (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          channel_id TEXT NOT NULL,
          last_read_message_id TEXT,
          last_read_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(user_id, channel_id)
        )
      `);
      console.log('✅ channel_read_status table OK');
    } catch (e) {
      console.log('⚠️ channel_read_status table:', e.message);
    }
    
    // Create indexes for channel_read_status
    try {
      await query(`CREATE INDEX IF NOT EXISTS idx_channel_read_user ON channel_read_status(user_id)`);
      await query(`CREATE INDEX IF NOT EXISTS idx_channel_read_channel ON channel_read_status(channel_id)`);
    } catch (e) {
      // Ignore
    }
    
    // Create audit_logs table
    try {
      await query(`
        CREATE TABLE IF NOT EXISTS audit_logs (
          id TEXT PRIMARY KEY,
          server_id TEXT NOT NULL,
          user_id TEXT,
          action TEXT NOT NULL,
          target_id TEXT,
          target_type TEXT,
          details JSONB DEFAULT '{}',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      console.log('✅ audit_logs table OK');
    } catch (e) {
      console.log('⚠️ audit_logs table:', e.message);
    }
    
    // Create indexes for audit_logs
    try {
      await query(`CREATE INDEX IF NOT EXISTS idx_audit_logs_server ON audit_logs(server_id)`);
      await query(`CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at DESC)`);
    } catch (e) {
      // Ignore
    }
    
    // Create server_roles table
    try {
      await query(`
        CREATE TABLE IF NOT EXISTS server_roles (
          id TEXT PRIMARY KEY,
          server_id TEXT NOT NULL,
          name TEXT NOT NULL,
          color TEXT DEFAULT '#99aab5',
          permissions INTEGER DEFAULT 0,
          position INTEGER DEFAULT 0,
          is_default BOOLEAN DEFAULT false,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      console.log('✅ server_roles table OK');
    } catch (e) {
      console.log('⚠️ server_roles table:', e.message);
    }
    
    // Create indexes for server_roles
    try {
      await query(`CREATE INDEX IF NOT EXISTS idx_server_roles_server ON server_roles(server_id)`);
    } catch (e) {
      // Ignore
    }
    
    // Create role_channel_access table
    try {
      await query(`
        CREATE TABLE IF NOT EXISTS role_channel_access (
          id TEXT PRIMARY KEY,
          role_id TEXT NOT NULL,
          channel_id TEXT NOT NULL,
          is_allowed BOOLEAN DEFAULT true,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(role_id, channel_id)
        )
      `);
      console.log('✅ role_channel_access table OK');
    } catch (e) {
      console.log('⚠️ role_channel_access table:', e.message);
    }
    
    // Create user_server_access table
    try {
      await query(`
        CREATE TABLE IF NOT EXISTS user_server_access (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          server_id TEXT NOT NULL,
          access_level TEXT DEFAULT 'read',
          granted_by TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(user_id, server_id)
        )
      `);
      console.log('✅ user_server_access table OK');
    } catch (e) {
      console.log('⚠️ user_server_access table:', e.message);
    }
    
    // Add missing columns to messages table
    try {
      await query(`ALTER TABLE messages ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN DEFAULT false`);
      await query(`ALTER TABLE messages ADD COLUMN IF NOT EXISTS pinned_at TIMESTAMP`);
      await query(`ALTER TABLE messages ADD COLUMN IF NOT EXISTS pinned_by TEXT`);
      await query(`ALTER TABLE messages ADD COLUMN IF NOT EXISTS edited_at TIMESTAMP`);
      await query(`ALTER TABLE messages ADD COLUMN IF NOT EXISTS forwarded_from TEXT`);
      console.log('✅ messages columns OK');
    } catch (e) {
      console.log('⚠️ messages columns:', e.message);
    }
    
    // Add missing columns to users table
    try {
      await query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS is_master_admin BOOLEAN DEFAULT false`);
      await query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS display_name TEXT`);
      await query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS joined_via_group_code TEXT`);
      console.log('✅ users columns OK');
    } catch (e) {
      console.log('⚠️ users columns:', e.message);
    }
    
    // Add missing columns to invites table
    try {
      await query(`ALTER TABLE invites ADD COLUMN IF NOT EXISTS role_id TEXT`);
      console.log('✅ invites columns OK');
    } catch (e) {
      console.log('⚠️ invites columns:', e.message);
    }
    
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
    // First check if user is owner
    const isOwner = await this.isServerOwner(userId, serverId);
    if (isOwner) return true;
    
    const role = await this.getUserRole(userId, serverId);
    if (!role) return false;
    
    // Get combined permissions from all custom roles
    const combinedPerms = await this.getCombinedPermissions(userId, serverId);
    if (combinedPerms > 0) {
      return (combinedPerms & permission) === permission;
    }
    
    // Fallback to legacy role permissions
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

  // Get combined permissions from all user's roles
  async getCombinedPermissions(userId, serverId) {
    const result = await queryOne(
      `SELECT COALESCE(STRING_AGG(sr.permissions::text, ','), '0') as all_perms
       FROM member_roles mr
       JOIN server_roles sr ON mr.role_id = sr.id
       WHERE mr.server_id = $1 AND mr.user_id = $2`,
      [serverId, userId]
    );
    
    if (!result || !result.all_perms || result.all_perms === '0') {
      return 0;
    }
    
    // Combine all permissions with bitwise OR
    const perms = result.all_perms.split(',').map(Number);
    return perms.reduce((a, b) => a | b, 0);
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
      'SELECT id, username, email, avatar, status, token_version, created_at, is_master_admin, display_name FROM users WHERE id = $1',
      [id]
    );
  },

  async findByGroupCode(groupCode) {
    const rows = await queryMany(
      'SELECT id, username, email, display_name, avatar, status FROM users WHERE joined_via_group_code = $1',
      [groupCode]
    );
    return rows.map(row => ({ ...row, displayName: row.display_name }));
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
    if (updates.token_version !== undefined) {
      fields.push(`token_version = $${paramIndex++}`);
      values.push(updates.token_version);
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
  },

  async needsPasswordChange(userId) {
    // TODO: Add force_password_change column to users table
    // For now, return false to allow login
    return false;
  },

  async updateLastLogin(userId, ipAddress) {
    // TODO: Add last_login and last_login_ip columns to users table
    // For now, skip this non-critical logging
    return true;
  },

  async resetAllStatus() {
    await query("UPDATE users SET status = 'offline'");
    return { success: true };
  },

  async findByGroupCode(groupCode) {
    const rows = await queryMany(
      'SELECT id, username, email, display_name, avatar, status FROM users WHERE joined_via_group_code = $1',
      [groupCode]
    );
    return rows.map(row => ({ ...row, displayName: row.display_name }));
  },

  async getMutualServerCount(userId1, userId2) {
    const row = await queryOne(
      `SELECT COUNT(*) as count FROM server_members sm1
       JOIN server_members sm2 ON sm1.server_id = sm2.server_id
       WHERE sm1.user_id = $1 AND sm2.user_id = $2`,
      [userId1, userId2]
    );
    return parseInt(row?.count || 0);
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

  async findById(id) {
    return await queryOne(
      'SELECT * FROM servers WHERE id = $1',
      [id]
    );
  },

  // Alias of findById for compatibility
  async getById(id) {
    return await this.findById(id);
  },

  async getUserServers(userId) {
    return await queryMany(
      `SELECT s.* FROM servers s
       JOIN server_members sm ON s.id = sm.server_id
       WHERE sm.user_id = $1`,
      [userId]
    );
  },

  async addMember(serverId, userId, role = 'member', joinMethod = 'Manual') {
    const id = uuidv4();
    try {
      await query(
        `INSERT INTO server_members (id, server_id, user_id, role, join_method) 
         VALUES ($1, $2, $3, $4, $5) 
         ON CONFLICT (server_id, user_id) DO NOTHING`,
        [id, serverId, userId, role, joinMethod]
      );
      return true;
    } catch (error) {
      console.error('Error adding member:', error);
      return false;
    }
  },

  async isMember(serverId, userId) {
    const result = await queryOne(
      'SELECT 1 FROM server_members WHERE server_id = $1 AND user_id = $2',
      [serverId, userId]
    );
    return !!result;
  },

  async getMembers(serverId) {
    return await queryMany(
      `SELECT u.id, u.username, u.avatar, COALESCE(u.status, 'offline') as status, sm.role,
              ARRAY_AGG(mr.role_id) FILTER (WHERE mr.role_id IS NOT NULL) as role_ids,
              COALESCE(
                JSON_AGG(JSON_BUILD_OBJECT('id', sr.id, 'name', sr.name, 'color', sr.color))
                FILTER (WHERE sr.id IS NOT NULL),
                '[]'::json
              ) as roles
       FROM users u
       JOIN server_members sm ON u.id = sm.user_id
       LEFT JOIN member_roles mr ON u.id::text = mr.user_id AND mr.server_id = $1
       LEFT JOIN server_roles sr ON mr.role_id = sr.id::text
       WHERE sm.server_id::text = $1
       GROUP BY u.id, u.username, u.avatar, u.status, sm.role`,
      [serverId]
    );
  },

  async getChannels(serverId) {
    return await queryMany(
      `SELECT c.*, cat.name as category_name
       FROM channels c
       LEFT JOIN categories cat ON c.category_id = cat.id
       WHERE c.server_id = $1
       ORDER BY c.category_id, c.position`,
      [serverId]
    );
  },

  async getCategories(serverId) {
    return await queryMany(
      `SELECT * FROM categories
       WHERE server_id = $1
       ORDER BY position`,
      [serverId]
    );
  },

  async getMember(serverId, userId) {
    return await queryOne(
      'SELECT * FROM server_members WHERE server_id = $1 AND user_id = $2',
      [serverId, userId]
    );
  },

  async getMemberRole(serverId, userId) {
    const row = await queryOne(
      'SELECT role FROM server_members WHERE server_id = $1 AND user_id = $2',
      [serverId, userId]
    );
    return row?.role || null;
  },

  async getMemberDetails(serverId, userId) {
    let row = null;
    try {
      row = await queryOne(
        `SELECT u.id, u.username, COALESCE(u.display_name, u.username) as display_name,
                u.avatar, COALESCE(u.status, 'offline') as status, u.email, u.created_at,
                COALESCE(sm.role, 'member') as role, sm.role_id,
                COALESCE(sm.joined_at, u.created_at) as joined_at,
                COALESCE(sm.join_method, 'invite') as join_method,
                COALESCE(sr.name,
                  CASE COALESCE(sm.role, 'member')
                    WHEN 'owner' THEN 'Owner'
                    WHEN 'admin' THEN 'Admin'
                    WHEN 'moderator' THEN 'Moderator'
                    WHEN 'custom' THEN 'Custom Role'
                    ELSE 'Member'
                  END
                ) as role_name,
                COALESCE(sr.color, CASE COALESCE(sm.role, 'member')
                  WHEN 'owner' THEN '#ffd700'
                  WHEN 'admin' THEN '#ed4245'
                  WHEN 'moderator' THEN '#43b581'
                  ELSE '#99aab5'
                END) as role_color
         FROM users u
         JOIN server_members sm ON u.id = sm.user_id AND sm.server_id = $1
         LEFT JOIN server_roles sr ON sm.role_id = sr.id AND sr.server_id = $1
         WHERE u.id = $2`,
        [serverId, userId]
      );
    } catch (e) {
      // Fallback query tanpa kolom opsional jika ada kolom yang belum exist
      console.warn('[getMemberDetails] Full query failed, trying fallback:', e.message);
      row = await queryOne(
        `SELECT u.id, u.username, u.username as display_name,
                u.avatar, COALESCE(u.status, 'offline') as status, u.email, u.created_at,
                COALESCE(sm.role, 'member') as role, sm.role_id,
                u.created_at as joined_at,
                'invite' as join_method,
                CASE COALESCE(sm.role, 'member')
                  WHEN 'owner' THEN 'Owner'
                  WHEN 'admin' THEN 'Admin'
                  WHEN 'moderator' THEN 'Moderator'
                  ELSE 'Member'
                END as role_name,
                CASE COALESCE(sm.role, 'member')
                  WHEN 'owner' THEN '#ffd700'
                  WHEN 'admin' THEN '#ed4245'
                  WHEN 'moderator' THEN '#43b581'
                  ELSE '#99aab5'
                END as role_color
         FROM users u
         JOIN server_members sm ON u.id = sm.user_id AND sm.server_id = $1
         WHERE u.id = $2`,
        [serverId, userId]
      );
    }
    if (!row) return null;
    return {
      id: row.id,
      username: row.username,
      displayName: row.display_name,
      avatar: row.avatar,
      status: row.status,
      email: row.email,
      createdAt: row.created_at,
      role: row.role,
      role_id: row.role_id,
      role_name: row.role_name,
      role_color: row.role_color,
      joinedAt: row.joined_at,
      joinMethod: row.join_method || 'invite'
    };
  },

  async transferOwnership(serverId, oldOwnerId, newOwnerId) {
    return await withTransaction(async (client) => {
      await client.query('UPDATE servers SET owner_id = $1 WHERE id = $2', [newOwnerId, serverId]);
      await client.query(`UPDATE server_members SET role = 'admin' WHERE server_id = $1 AND user_id = $2`, [serverId, oldOwnerId]);
      await client.query(`UPDATE server_members SET role = 'owner' WHERE server_id = $1 AND user_id = $2`, [serverId, newOwnerId]);
      return true;
    });
  },

  async update(serverId, updates) {
    const fields = [];
    const values = [];
    let paramIndex = 1;

    if (updates.name) {
      fields.push(`name = $${paramIndex++}`);
      values.push(updates.name);
    }
    if (updates.icon !== undefined) {
      fields.push(`icon = $${paramIndex++}`);
      values.push(updates.icon);
    }
    if (updates.banner !== undefined) {
      fields.push(`banner = $${paramIndex++}`);
      values.push(updates.banner);
    }
    if (updates.description !== undefined) {
      fields.push(`description = $${paramIndex++}`);
      values.push(updates.description);
    }

    if (fields.length === 0) {
      return { success: false, error: 'No updates provided' };
    }

    fields.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(serverId);

    const result = await query(
      `UPDATE servers SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values
    );
    return { success: result.rowCount > 0, server: result.rows[0] };
  },

  async delete(serverId) {
    return await withTransaction(async (client) => {
      await client.query('DELETE FROM reactions WHERE message_id IN (SELECT id FROM messages WHERE channel_id IN (SELECT id FROM channels WHERE server_id = $1))', [serverId]);
      await client.query('DELETE FROM messages WHERE channel_id IN (SELECT id FROM channels WHERE server_id = $1)', [serverId]);
      await client.query('DELETE FROM channels WHERE server_id = $1', [serverId]);
      await client.query('DELETE FROM categories WHERE server_id = $1', [serverId]);
      await client.query('DELETE FROM server_members WHERE server_id = $1', [serverId]);
      await client.query('DELETE FROM server_roles WHERE server_id = $1', [serverId]);
      await client.query('DELETE FROM invites WHERE server_id = $1', [serverId]);
      await client.query('DELETE FROM bans WHERE server_id = $1', [serverId]);
      await client.query('DELETE FROM audit_logs WHERE server_id = $1', [serverId]);
      await client.query('DELETE FROM servers WHERE id = $1', [serverId]);
      return { success: true };
    });
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

  async getCategories(serverId) {
    return await this.getByServer(serverId);
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

  async getById(channelId) {
    return await queryOne('SELECT * FROM channels WHERE id = $1', [channelId]);
  },

  async getByServerId(serverId) {
    return await queryMany('SELECT * FROM channels WHERE server_id = $1 ORDER BY category_id, position', [serverId]);
  },

  async delete(channelId) {
    const result = await query('DELETE FROM channels WHERE id = $1', [channelId]);
    return { success: result.rowCount > 0 };
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
       JOIN users u ON m.user_id::text = u.id::text
       LEFT JOIN messages rm ON m.reply_to_id::text = rm.id::text
       LEFT JOIN users ru ON rm.user_id::text = ru.id::text
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
       JOIN users u ON m.user_id::text = u.id::text
       LEFT JOIN messages rm ON m.reply_to_id::text = rm.id::text
       LEFT JOIN users ru ON rm.user_id::text = ru.id::text
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

  async pin(messageId, userId) {
    await query(
      `UPDATE messages SET is_pinned = true, pinned_at = CURRENT_TIMESTAMP, pinned_by = $1 WHERE id = $2`,
      [userId, messageId]
    );
    return await this.getById(messageId);
  },

  async unpin(messageId) {
    await query(
      `UPDATE messages SET is_pinned = false, pinned_at = NULL, pinned_by = NULL WHERE id = $1`,
      [messageId]
    );
    return await this.getById(messageId);
  },

  async getPinnedByChannel(channelId) {
    const rows = await queryMany(
      `SELECT m.*, u.id as user_id, u.username, u.display_name, u.avatar,
              p.username as pinned_by_username
       FROM messages m
       JOIN users u ON m.user_id::text = u.id::text
       LEFT JOIN users p ON m.pinned_by::text = p.id::text
       WHERE m.channel_id = $1 AND m.is_pinned = true
       ORDER BY m.pinned_at DESC`,
      [channelId]
    );
    return rows.map(row => {
      let attachments = [];
      if (row.attachments) {
        try { attachments = typeof row.attachments === 'string' ? JSON.parse(row.attachments) : row.attachments; } catch(e) {}
      }
      return {
        ...row,
        attachments,
        user: { id: row.user_id, username: row.username, displayName: row.display_name, avatar: row.avatar },
        pinnedBy: row.pinned_by_username,
        channelId: row.channel_id,
        userId: row.user_id,
        timestamp: row.created_at,
      };
    });
  },

  async updateReadStatus(userId, channelId, messageId) {
    await query(
      `INSERT INTO channel_read_status (id, user_id, channel_id, last_read_message_id, last_read_at)
       VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
       ON CONFLICT (user_id, channel_id)
       DO UPDATE SET last_read_message_id = EXCLUDED.last_read_message_id, last_read_at = CURRENT_TIMESTAMP`,
      [uuidv4(), userId, channelId, messageId]
    );
    return true;
  },

  async getReadStatus(userId, channelId) {
    const row = await queryOne(
      `SELECT last_read_message_id, last_read_at FROM channel_read_status WHERE user_id = $1 AND channel_id = $2`,
      [userId, channelId]
    );
    return row || null;
  },

  async searchMessages(options) {
    const { serverId = null, channelId = null, userId = null, query: q = '', dateFrom = null, dateTo = null, hasAttachments = null, limit = 50, offset = 0 } = options;
    let conditions = [];
    let params = [];
    let i = 1;
    if (serverId) { conditions.push(`c.server_id = $${i++}`); params.push(serverId); }
    if (channelId) { conditions.push(`m.channel_id = $${i++}`); params.push(channelId); }
    if (userId) { conditions.push(`m.user_id = $${i++}`); params.push(userId); }
    if (q) { conditions.push(`m.content ILIKE $${i++}`); params.push(`%${q}%`); }
    if (dateFrom) { conditions.push(`m.created_at >= $${i++}`); params.push(dateFrom); }
    if (dateTo) { conditions.push(`m.created_at <= $${i++}`); params.push(dateTo); }
    if (hasAttachments === true) { conditions.push(`m.attachments != '[]' AND m.attachments IS NOT NULL`); }
    const where = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';
    params.push(limit, offset);
    const rows = await queryMany(
      `SELECT m.id, m.content, m.created_at, m.channel_id, c.name as channel_name, c.server_id,
              u.id as user_id, u.username, u.display_name, u.avatar, m.attachments
       FROM messages m
       JOIN channels c ON m.channel_id::text = c.id::text
       JOIN users u ON m.user_id::text = u.id::text
       ${where}
       ORDER BY m.created_at DESC
       LIMIT $${i} OFFSET $${i+1}`,
      params
    );
    return rows.map(r => ({ ...r, attachments: r.attachments ? (typeof r.attachments === 'string' ? JSON.parse(r.attachments) : r.attachments) : [] }));
  },

  async getSearchResultCount(options) {
    const { serverId = null, channelId = null, userId = null, query: q = '', dateFrom = null, dateTo = null, hasAttachments = null } = options;
    let conditions = [];
    let params = [];
    let i = 1;
    if (serverId) { conditions.push(`c.server_id = $${i++}`); params.push(serverId); }
    if (channelId) { conditions.push(`m.channel_id = $${i++}`); params.push(channelId); }
    if (userId) { conditions.push(`m.user_id = $${i++}`); params.push(userId); }
    if (q) { conditions.push(`m.content ILIKE $${i++}`); params.push(`%${q}%`); }
    if (dateFrom) { conditions.push(`m.created_at >= $${i++}`); params.push(dateFrom); }
    if (dateTo) { conditions.push(`m.created_at <= $${i++}`); params.push(dateTo); }
    if (hasAttachments === true) { conditions.push(`m.attachments != '[]' AND m.attachments IS NOT NULL`); }
    const where = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';
    const row = await queryOne(
      `SELECT COUNT(*) as count FROM messages m JOIN channels c ON m.channel_id::text = c.id::text ${where}`,
      params
    );
    return parseInt(row?.count || 0);
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
  },

  async getUnreadCountForAllChannels(userId, serverId) {
    const rows = await queryMany(
      `SELECT c.id as channel_id,
              COUNT(m.id) as unread_count,
              MAX(CASE WHEN m.content LIKE '%<@' || $1 || '>%' THEN 1 ELSE 0 END) as has_mention
       FROM channels c
       JOIN server_members sm ON c.server_id::text = sm.server_id::text
       LEFT JOIN messages m ON m.channel_id::text = c.id::text
         AND m.user_id::text != $2
         AND m.created_at > COALESCE(
           (SELECT last_read_at FROM channel_read_status
            WHERE user_id::text = $3 AND channel_id::text = c.id::text),
           '1970-01-01'::timestamptz
         )
       WHERE c.server_id = $4 AND sm.user_id::text = $5
       GROUP BY c.id`,
      [userId, userId, userId, serverId, userId]
    );
    const result = {};
    rows.forEach(row => {
      result[row.channel_id] = {
        count: parseInt(row.unread_count) || 0,
        hasMention: parseInt(row.has_mention) === 1
      };
    });
    return result;
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
       JOIN users u ON r.user_id::text = u.id::text
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
       JOIN servers s ON i.server_id::text = s.id::text
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
  },

  async getByServer(serverId) {
    const rows = await queryMany(
      `SELECT i.*, u.username as created_by_username, u.avatar as created_by_avatar
       FROM invites i
       JOIN users u ON i.created_by::text = u.id::text
       WHERE i.server_id = $1
       ORDER BY i.created_at DESC`,
      [serverId]
    );
    return rows.map(row => ({
      id: row.id,
      code: row.code,
      serverId: row.server_id,
      createdBy: row.created_by,
      createdByUsername: row.created_by_username,
      createdByAvatar: row.created_by_avatar,
      uses: row.uses,
      maxUses: row.max_uses,
      expiresAt: row.expires_at,
      createdAt: row.created_at,
      roleId: row.role_id,
    }));
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
       JOIN users u ON f.friend_id::text = u.id::text
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
       JOIN users u ON f.user_id::text = u.id::text
       WHERE f.friend_id = $1 AND f.status = 'pending'
       ORDER BY f.created_at DESC`,
      [userId]
    );
    
    const outgoing = await queryMany(
      `SELECT f.id, f.user_id, f.friend_id, f.status, f.created_at,
              u.id as recipient_id, u.username as recipient_username, 
              u.avatar as recipient_avatar, u.status as recipient_status
       FROM friendships f
       JOIN users u ON f.friend_id::text = u.id::text
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
       JOIN users u ON f.friend_id::text = u.id::text
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

  async createAutoFriendship(user1Id, user2Id) {
    const existing = await this.getFriendship(user1Id, user2Id);
    if (existing && existing.status === 'accepted') {
      return { success: false, message: 'Already friends' };
    }
    // Delete any pending requests between them
    await query(
      'DELETE FROM friendships WHERE (user_id = $1 AND friend_id = $2) OR (user_id = $2 AND friend_id = $1)',
      [user1Id, user2Id]
    );
    // Create mutual friendship (both directions)
    const id1 = uuidv4();
    const id2 = uuidv4();
    await query(
      'INSERT INTO friendships (id, user_id, friend_id, status, created_at, updated_at) VALUES ($1, $2, $3, $4, NOW(), NOW())',
      [id1, user1Id, user2Id, 'accepted']
    );
    await query(
      'INSERT INTO friendships (id, user_id, friend_id, status, created_at, updated_at) VALUES ($1, $2, $3, $4, NOW(), NOW())',
      [id2, user2Id, user1Id, 'accepted']
    );
    return { success: true };
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
  },

  async getRequestById(requestId) {
    return await queryOne('SELECT * FROM friendships WHERE id = $1', [requestId]);
  },

  async createAutoFriendship(user1Id, user2Id) {
    const existing = await this.getFriendship(user1Id, user2Id);
    if (existing && existing.status === 'accepted') {
      return { success: false, message: 'Already friends' };
    }
    return await withTransaction(async (client) => {
      await client.query(
        'DELETE FROM friendships WHERE (user_id = $1 AND friend_id = $2) OR (user_id = $2 AND friend_id = $1)',
        [user1Id, user2Id]
      );
      const id1 = uuidv4();
      const id2 = uuidv4();
      await client.query(
        `INSERT INTO friendships (id, user_id, friend_id, status) VALUES ($1, $2, $3, 'accepted')`,
        [id1, user1Id, user2Id]
      );
      await client.query(
        `INSERT INTO friendships (id, user_id, friend_id, status) VALUES ($1, $2, $3, 'accepted')`,
        [id2, user2Id, user1Id]
      );
      return { success: true, message: 'Auto-friendship created' };
    });
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
      "INSERT INTO dm_channels (id, user1_id, user2_id, type, created_at, updated_at) VALUES ($1, $2, $3, 'direct', NOW(), NOW())",
      [id, firstUser, secondUser]
    );
    // Also insert into dm_channel_members for unified member lookup
    await query(
      'INSERT INTO dm_channel_members (id, channel_id, user_id, joined_at) VALUES ($1, $2, $3, NOW()) ON CONFLICT DO NOTHING',
      [uuidv4(), id, firstUser]
    );
    await query(
      'INSERT INTO dm_channel_members (id, channel_id, user_id, joined_at) VALUES ($1, $2, $3, NOW()) ON CONFLICT DO NOTHING',
      [uuidv4(), id, secondUser]
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

  async getDMChannelBetweenUsers(user1Id, user2Id) {
    return await this.getDMChannel(user1Id, user2Id);
  },

  async getDMChannelById(channelId) {
    const channel = await queryOne(
      `SELECT dc.id, dc.name, dc.type, dc.creator_id, dc.created_at, dc.updated_at,
              dc.user1_id, dc.user2_id
       FROM dm_channels dc
       WHERE dc.id = $1`,
      [channelId]
    );
    if (!channel) return null;
    channel.members = await this.getChannelMembers(channelId);
    return channel;
  },

  async getUserDMChannels(userId) {
    const channels = await queryMany(
      `SELECT dc.id, dc.name, dc.type, dc.creator_id, dc.created_at, dc.updated_at,
              (SELECT content FROM dm_messages WHERE channel_id = dc.id ORDER BY created_at DESC LIMIT 1) as last_message,
              (SELECT created_at FROM dm_messages WHERE channel_id = dc.id ORDER BY created_at DESC LIMIT 1) as last_message_at,
              (SELECT COUNT(*) FROM dm_messages WHERE channel_id = dc.id AND sender_id != $1 AND is_read = false) as unread_count
       FROM dm_channels dc
       WHERE dc.id IN (
         SELECT channel_id FROM dm_channel_members WHERE user_id = $1
         UNION
         SELECT id FROM dm_channels WHERE user1_id = $1 OR user2_id = $1
       )
       ORDER BY COALESCE(
         (SELECT created_at FROM dm_messages WHERE channel_id = dc.id ORDER BY created_at DESC LIMIT 1),
         dc.updated_at
       ) DESC`,
      [userId]
    );
    const result = await Promise.all(channels.map(async (ch) => {
      const members = await this.getChannelMembers(ch.id);
      return {
        ...ch,
        members,
        friend: ch.type === 'direct' ? (members.find(m => m.id !== userId) || members[0]) : null
      };
    }));
    return result;
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
  },

  async createGroupDMChannel(creatorId, userIds, name = null) {
    const allUserIds = [creatorId, ...userIds.filter(id => id !== creatorId)];
    const id = uuidv4();
    const groupName = name || 'Grup Baru';
    await query(
      'INSERT INTO dm_channels (id, name, type, creator_id, created_at, updated_at) VALUES ($1, $2, $3, $4, NOW(), NOW())',
      [id, groupName, 'group', creatorId]
    );
    for (const userId of allUserIds) {
      await query(
        'INSERT INTO dm_channel_members (id, channel_id, user_id, joined_at) VALUES ($1, $2, $3, NOW()) ON CONFLICT DO NOTHING',
        [uuidv4(), id, userId]
      );
    }
    return await this.getDMChannelById(id);
  },

  async getChannelMembers(channelId) {
    const rows = await queryMany(
      `SELECT u.id, u.username, u.display_name, u.avatar, u.status, m.joined_at
       FROM dm_channel_members m
       JOIN users u ON m.user_id = u.id
       WHERE m.channel_id = $1
       ORDER BY m.joined_at`,
      [channelId]
    );
    return rows.map(row => ({ ...row, displayName: row.display_name }));
  },

  async isChannelMember(channelId, userId) {
    const row = await queryOne(
      'SELECT 1 FROM dm_channel_members WHERE channel_id = $1 AND user_id = $2',
      [channelId, userId]
    );
    return !!row;
  },

  async addChannelMember(channelId, userId) {
    const result = await query(
      'INSERT INTO dm_channel_members (id, channel_id, user_id, joined_at) VALUES ($1, $2, $3, NOW()) ON CONFLICT DO NOTHING',
      [uuidv4(), channelId, userId]
    );
    const member = await userDB.findById(userId);
    return { success: result.rowCount > 0, member };
  },

  async removeChannelMember(channelId, userId) {
    const result = await query(
      'DELETE FROM dm_channel_members WHERE channel_id = $1 AND user_id = $2',
      [channelId, userId]
    );
    return { success: result.rowCount > 0 };
  },

  async updateGroupName(channelId, name) {
    const result = await query(
      "UPDATE dm_channels SET name = $1, updated_at = NOW() WHERE id = $2 AND type = 'group'",
      [name, channelId]
    );
    return { success: result.rowCount > 0 };
  },

  async leaveDMChannel(channelId, userId) {
    const result = await query(
      'DELETE FROM dm_channel_members WHERE channel_id = $1 AND user_id = $2',
      [channelId, userId]
    );
    const remaining = await queryOne(
      'SELECT COUNT(*) as count FROM dm_channel_members WHERE channel_id = $1',
      [channelId]
    );
    if (parseInt(remaining.count) === 0) {
      await this.deleteDMChannel(channelId);
    }
    return { success: result.rowCount > 0 };
  },
};

// ============================================
// VOICE CHANNEL DATABASE
// ============================================

const voiceDB = {
  async joinVoiceChannel(channelId, userId) {
    const result = await query(
      `INSERT INTO voice_participants (channel_id, user_id, is_muted, is_deafened)
       VALUES ($1, $2, false, false)
       ON CONFLICT (channel_id, user_id) 
       DO UPDATE SET joined_at = CURRENT_TIMESTAMP, is_muted = false, is_deafened = false
       RETURNING *`,
      [channelId, userId]
    );
    return result.rows[0];
  },

  async leaveVoiceChannel(channelId, userId) {
    await query(
      'DELETE FROM voice_participants WHERE channel_id = $1 AND user_id = $2',
      [channelId, userId]
    );
    return { success: true };
  },

  async getVoiceParticipants(channelId) {
    return await queryMany(
      `SELECT vp.*, u.username, u.avatar, u.status
       FROM voice_participants vp
       JOIN users u ON vp.user_id = u.id
       WHERE vp.channel_id = $1
       ORDER BY vp.joined_at ASC`,
      [channelId]
    );
  },

  async updateVoiceState(channelId, userId, updates) {
    const { isMuted, isDeafened } = updates;
    const result = await query(
      `UPDATE voice_participants 
       SET is_muted = COALESCE($3, is_muted),
           is_deafened = COALESCE($4, is_deafened)
       WHERE channel_id = $1 AND user_id = $2
       RETURNING *`,
      [channelId, userId, isMuted, isDeafened]
    );
    return result.rows[0];
  },

  async getUserVoiceChannel(userId) {
    return await queryOne(
      `SELECT vp.*, c.name as channel_name, c.server_id, s.name as server_name
       FROM voice_participants vp
       JOIN channels c ON vp.channel_id::text = c.id::text
       JOIN servers s ON c.server_id::text = s.id::text
       WHERE vp.user_id = $1`,
      [userId]
    );
  },

  async isUserInVoiceChannel(channelId, userId) {
    const result = await queryOne(
      'SELECT id FROM voice_participants WHERE channel_id = $1 AND user_id = $2',
      [channelId, userId]
    );
    return !!result;
  },

  async logSignalingEvent(channelId, userId, eventType, data = {}) {
    try {
      await query(
        `INSERT INTO voice_signaling_logs (channel_id, user_id, event_type, data)
         VALUES ($1, $2, $3, $4)`,
        [channelId, userId, eventType, JSON.stringify(data)]
      );
    } catch (error) {
      // Silently fail for logging
      console.error('Failed to log signaling event:', error);
    }
  },

  async leaveAllVoiceChannels(userId) {
    await query(
      'DELETE FROM voice_participants WHERE user_id = $1',
      [userId]
    );
    return { success: true };
  },

  async getVoiceChannelWithPermission(channelId, userId) {
    return await queryOne(
      `SELECT c.*, sm.role as member_role, s.owner_id
       FROM channels c
       JOIN servers s ON c.server_id::text = s.id::text
       LEFT JOIN server_members sm ON s.id::text = sm.server_id::text AND sm.user_id::text = $2
       WHERE c.id = $1 AND c.type = 'voice'`,
      [channelId, userId]
    );
  }
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
// STUB DATABASES (TODO: Implement full functionality)
// ============================================

const userServerAccessDB = {
  async setServerAccess(userId, serverId, isAllowed) {
    const id = uuidv4();
    const accessLevel = isAllowed ? 'read' : 'denied';
    await dbRun(
      `INSERT INTO user_server_access (id, user_id, server_id, access_level, is_allowed)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(user_id, server_id)
       DO UPDATE SET access_level = EXCLUDED.access_level, is_allowed = EXCLUDED.is_allowed`,
      [id, userId, serverId, accessLevel, isAllowed]
    );
    return { userId, serverId, isAllowed };
  },
  async hasServerAccess(userId, serverId) {
    const row = await dbGet(
      'SELECT is_allowed, access_level FROM user_server_access WHERE user_id = ?::text AND server_id = ?::text',
      [userId, serverId]
    );
    if (!row) return true; // default allow if no record
    if (row.is_allowed !== null && row.is_allowed !== undefined) return row.is_allowed === true;
    return row.access_level !== 'denied';
  },
  async getServerMembersAccess(serverId) {
    return dbAll(
      `SELECT u.id, u.username, u.display_name, u.avatar,
              CASE WHEN usa.is_allowed IS NOT NULL THEN usa.is_allowed
                   WHEN usa.access_level = 'denied' THEN FALSE
                   ELSE TRUE END as is_allowed
       FROM users u
       JOIN server_members sm ON u.id = sm.user_id
       LEFT JOIN user_server_access usa ON u.id::text = usa.user_id AND sm.server_id::text = usa.server_id
       WHERE sm.server_id = ?
       ORDER BY u.username`,
      [serverId]
    );
  },
  async deleteServerAccess(userId, serverId) {
    return dbRun(
      'DELETE FROM user_server_access WHERE user_id = ? AND server_id = ?',
      [userId, serverId]
    );
  }
};

const roleChannelAccessDB = {
  async setChannelAccess(roleId, channelId, isAllowed) {
    // TODO: Implement
    return { success: true };
  },
  async hasChannelAccess(roleId, channelId) {
    // Default to true for now
    return true;
  },
  async bulkUpdateChannelAccess(roleId, channelAccess) {
    // TODO: Implement
    return { success: true };
  }
};

const subscriptionDB = {
  async create(userId, subscription) {
    const id = uuidv4();
    const { endpoint, keys } = subscription;
    await query(
      `INSERT INTO push_subscriptions (id, user_id, endpoint, p256dh, auth, created_at)
       VALUES ($1, $2, $3, $4, $5, NOW())
       ON CONFLICT (user_id, endpoint) DO UPDATE SET p256dh = $4, auth = $5`,
      [id, userId, endpoint, keys.p256dh, keys.auth]
    );
    return { success: true };
  },
  async getByUser(userId) {
    return await queryMany(
      'SELECT * FROM push_subscriptions WHERE user_id = $1',
      [userId]
    );
  },
  async remove(userId, endpoint) {
    await query(
      'DELETE FROM push_subscriptions WHERE user_id = $1 AND endpoint = $2',
      [userId, endpoint]
    );
    return { success: true };
  },
  async removeAllByUser(userId) {
    await query('DELETE FROM push_subscriptions WHERE user_id = $1', [userId]);
    return { success: true };
  }
};

const auditLogDB = {
  async create(serverId, userId, action, actionType, targetId, targetName, targetType, oldValue, newValue) {
    // TODO: Implement
    return { success: true };
  },
  async getServerLogs(serverId) {
    // TODO: Implement
    return [];
  }
};

const sessionDB = {
  async createSession(userId, sessionData) {
    // TODO: Implement
    return { id: 'stub-session-id' };
  },
  async getUserSessions(userId) {
    // TODO: Implement
    return [];
  },
  async getSessionById(deviceId) {
    // TODO: Implement
    return null;
  },
  async deleteSession(deviceId, userId) {
    // TODO: Implement
    return { success: true };
  },
  async deleteOtherSessions(userId, currentSessionId) {
    // TODO: Implement
    return { success: true };
  }
};

const roleDB = {
  async getServerRoles(serverId) {
    const rows = await queryMany(
      `SELECT * FROM server_roles WHERE server_id = $1 ORDER BY position DESC, created_at ASC`,
      [serverId]
    );
    return rows.map(row => ({
      id: row.id,
      serverId: row.server_id,
      name: row.name,
      color: row.color,
      permissions: row.permissions,
      position: row.position,
      isDefault: row.is_default === true,
      createdAt: row.created_at
    }));
  },

  async getByServer(serverId) {
    return await this.getServerRoles(serverId);
  },

  async createRole(serverId, name, color = '#99aab5', permissions = 0, position = 0) {
    const id = uuidv4();
    const result = await query(
      `INSERT INTO server_roles (id, server_id, name, color, permissions, position)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [id, serverId, name, color, permissions, position]
    );
    return result.rows[0];
  },

  async getRoleById(roleId) {
    return await queryOne('SELECT * FROM server_roles WHERE id = $1', [roleId]);
  },

  async updateRole(roleId, updates) {
    const { name, color, permissions, position } = updates;
    const result = await query(
      `UPDATE server_roles
       SET name = COALESCE($1, name),
           color = COALESCE($2, color),
           permissions = COALESCE($3, permissions),
           position = COALESCE($4, position)
       WHERE id = $5 RETURNING *`,
      [name, color, permissions, position, roleId]
    );
    return result.rows[0];
  },

  async deleteRole(roleId) {
    const result = await query(
      'DELETE FROM server_roles WHERE id = $1 AND is_default = false',
      [roleId]
    );
    return { deleted: result.rowCount > 0 };
  },

  async normalizeRolePositions(serverId) {
    const roles = await queryMany(
      `SELECT id FROM server_roles WHERE server_id = $1 AND is_default = false ORDER BY position DESC, created_at ASC`,
      [serverId]
    );
    for (let i = 0; i < roles.length; i++) {
      await query('UPDATE server_roles SET position = $1 WHERE id = $2', [roles.length - i, roles[i].id]);
    }
    return true;
  },

  async getMemberCount(roleId, serverId) {
    const row = await queryOne(
      'SELECT COUNT(*) as count FROM member_roles WHERE server_id = $1 AND role_id = $2',
      [serverId, roleId]
    );
    return parseInt(row?.count || 0);
  },

  async assignRole(serverId, userId, roleId) {
    const id = uuidv4();
    await query(
      `INSERT INTO member_roles (id, server_id, user_id, role_id)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (server_id, user_id, role_id) DO NOTHING`,
      [id, serverId, userId, roleId]
    );
    return { success: true };
  },

  async removeMemberRole(serverId, userId, roleId) {
    const result = await query(
      'DELETE FROM member_roles WHERE server_id = $1 AND user_id = $2 AND role_id = $3',
      [serverId, userId, roleId]
    );
    return { success: result.rowCount > 0 };
  },

  async setMemberRole(serverId, userId, role) {
    const result = await query(
      `UPDATE server_members SET role = $1, role_id = NULL WHERE server_id = $2 AND user_id = $3`,
      [role, serverId, userId]
    );
    return { success: result.rowCount > 0 };
  }
};

// ============================================
// MASTER ADMIN DATABASE
// ============================================

const masterAdminDB = {
  async getAllUsers(limit = 100, offset = 0) {
    const rows = await queryMany(
      `SELECT u.id, u.username, u.email, u.password, u.avatar, u.status, u.display_name,
              u.is_master_admin, u.created_at, u.joined_via_group_code,
              (SELECT COUNT(*) FROM server_members sm WHERE sm.user_id = u.id) as server_count,
              (SELECT COUNT(*) FROM messages m WHERE m.user_id = u.id) as message_count
       FROM users u ORDER BY u.created_at DESC LIMIT $1 OFFSET $2`,
      [limit, offset]
    );
    return rows.map(row => ({
      id: row.id, username: row.username, email: row.email, password: row.password,
      avatar: row.avatar, status: row.status, displayName: row.display_name,
      isMasterAdmin: row.is_master_admin === true,
      isActive: true,
      createdAt: row.created_at, joinedViaGroupCode: row.joined_via_group_code,
      serverCount: parseInt(row.server_count) || 0,
      messageCount: parseInt(row.message_count) || 0
    }));
  },

  async getAllServers(limit = 100, offset = 0) {
    const rows = await queryMany(
      `SELECT s.id, s.name, s.icon, s.owner_id, s.created_at,
              COALESCE(u.username, 'Unknown') as owner_username,
              (SELECT COUNT(*) FROM server_members sm WHERE sm.server_id = s.id) as member_count,
              (SELECT COUNT(*) FROM channels c WHERE c.server_id = s.id) as channel_count,
              (SELECT COUNT(*) FROM messages m JOIN channels ch ON m.channel_id = ch.id WHERE ch.server_id = s.id) as message_count
       FROM servers s LEFT JOIN users u ON s.owner_id = u.id
       ORDER BY s.created_at DESC LIMIT $1 OFFSET $2`,
      [limit, offset]
    );
    return rows.map(row => ({
      id: row.id, name: row.name, icon: row.icon, ownerId: row.owner_id,
      ownerUsername: row.owner_username, createdAt: row.created_at,
      memberCount: parseInt(row.member_count) || 0,
      channelCount: parseInt(row.channel_count) || 0,
      messageCount: parseInt(row.message_count) || 0
    }));
  },

  async getAllMessages(limit = 100, offset = 0, serverId = null, channelId = null) {
    const params = [];
    const conditions = [];
    if (serverId) { params.push(serverId); conditions.push(`c.server_id = $${params.length}`); }
    if (channelId) { params.push(channelId); conditions.push(`m.channel_id = $${params.length}`); }
    const where = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';
    params.push(limit, offset);
    const rows = await queryMany(
      `SELECT m.id, m.channel_id, m.user_id, m.content, m.reply_to_id,
              m.attachments, m.is_pinned, m.pinned_at, m.pinned_by,
              m.forwarded_from, m.created_at, m.edited_at,
              u.username, u.display_name, u.avatar,
              c.name as channel_name, c.server_id,
              s.name as server_name
       FROM messages m JOIN users u ON m.user_id = u.id
       JOIN channels c ON m.channel_id = c.id JOIN servers s ON c.server_id = s.id
       ${where} ORDER BY m.created_at DESC LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );
    return rows.map(row => ({
      id: row.id, channelId: row.channel_id, channelName: row.channel_name,
      serverId: row.server_id, serverName: row.server_name, userId: row.user_id,
      username: row.username, displayName: row.display_name, avatar: row.avatar,
      content: row.content, replyToId: row.reply_to_id,
      attachments: row.attachments ? (typeof row.attachments === 'string' ? JSON.parse(row.attachments) : row.attachments) : null,
      isPinned: row.is_pinned === true, pinnedAt: row.pinned_at, pinnedBy: row.pinned_by,
      forwardedFrom: row.forwarded_from ? (typeof row.forwarded_from === 'string' ? JSON.parse(row.forwarded_from) : row.forwarded_from) : null,
      createdAt: row.created_at, editedAt: row.edited_at
    }));
  },

  async getChannelMessages(channelId, limit = 100, offset = 0) {
    return this.getAllMessages(limit, offset, null, channelId);
  },

  async getAllDMMessages(limit = 100, offset = 0) {
    const rows = await queryMany(
      `SELECT dm.id, dm.channel_id, dm.sender_id, dm.content, dm.attachments,
              dm.is_read, dm.created_at, dm.edited_at,
              u.username, u.display_name, u.avatar,
              dmc.name as channel_name, dmc.type as channel_type
       FROM dm_messages dm JOIN users u ON dm.sender_id = u.id
       JOIN dm_channels dmc ON dm.channel_id = dmc.id
       ORDER BY dm.created_at DESC LIMIT $1 OFFSET $2`,
      [limit, offset]
    );
    const result = await Promise.all(rows.map(async (row) => {
      const members = await queryMany(
        `SELECT u.id, u.username, u.display_name, u.avatar FROM dm_channel_members dcm
         JOIN users u ON dcm.user_id = u.id WHERE dcm.channel_id = $1`,
        [row.channel_id]
      );
      const recipient = members.find(m => m.id !== row.sender_id);
      return {
        id: row.id, channelId: row.channel_id, channelName: row.channel_name,
        channelType: row.channel_type, senderId: row.sender_id,
        senderUsername: row.username, senderDisplayName: row.display_name || row.username,
        senderAvatar: row.avatar,
        recipientId: recipient?.id || null, recipientUsername: recipient?.username || 'Unknown',
        recipientDisplayName: recipient?.display_name || recipient?.username || 'Unknown',
        recipientAvatar: recipient?.avatar || null,
        content: row.content,
        attachments: row.attachments ? (typeof row.attachments === 'string' ? JSON.parse(row.attachments) : row.attachments) : null,
        isRead: row.is_read === true, createdAt: row.created_at, editedAt: row.edited_at,
        participants: members
      };
    }));
    return result;
  },

  async getStatistics() {
    const row = await queryOne(
      `SELECT
        (SELECT COUNT(*) FROM users) as total_users,
        (SELECT COUNT(*) FROM servers) as total_servers,
        (SELECT COUNT(*) FROM channels) as total_channels,
        (SELECT COUNT(*) FROM messages) as total_messages,
        (SELECT COUNT(*) FROM dm_messages) as total_dm_messages,
        (SELECT COUNT(*) FROM server_members) as total_memberships,
        (SELECT COUNT(*) FROM friendships WHERE status = 'accepted') as total_friendships,
        (SELECT COUNT(*) FROM users WHERE status = 'online') as online_users`
    );
    return {
      total_users: parseInt(row.total_users) || 0,
      total_servers: parseInt(row.total_servers) || 0,
      total_channels: parseInt(row.total_channels) || 0,
      total_messages: parseInt(row.total_messages) || 0,
      total_dm_messages: parseInt(row.total_dm_messages) || 0,
      total_memberships: parseInt(row.total_memberships) || 0,
      total_friendships: parseInt(row.total_friendships) || 0,
      online_users: parseInt(row.online_users) || 0
    };
  },

  async setMasterAdmin(userId, isMasterAdmin = true) {
    const result = await query(
      'UPDATE users SET is_master_admin = $1 WHERE id = $2',
      [isMasterAdmin, userId]
    );
    return { success: result.rowCount > 0 };
  },

  async deleteUser(userId) {
    return withTransaction(async (client) => {
      await client.query('DELETE FROM messages WHERE user_id = $1', [userId]);
      await client.query('DELETE FROM dm_messages WHERE sender_id = $1', [userId]);
      await client.query('DELETE FROM server_members WHERE user_id = $1', [userId]);
      await client.query('DELETE FROM member_roles WHERE user_id = $1', [userId]);
      await client.query('DELETE FROM friendships WHERE user_id = $1 OR friend_id = $1', [userId]);
      await client.query('DELETE FROM dm_channel_members WHERE user_id = $1', [userId]);
      const result = await client.query('DELETE FROM users WHERE id = $1', [userId]);
      return { success: result.rowCount > 0 };
    });
  },

  async deleteServer(serverId) {
    return withTransaction(async (client) => {
      await client.query('DELETE FROM reactions WHERE message_id IN (SELECT id FROM messages WHERE channel_id IN (SELECT id FROM channels WHERE server_id = $1))', [serverId]);
      await client.query('DELETE FROM messages WHERE channel_id IN (SELECT id FROM channels WHERE server_id = $1)', [serverId]);
      await client.query('DELETE FROM channels WHERE server_id = $1', [serverId]);
      await client.query('DELETE FROM categories WHERE server_id = $1', [serverId]);
      await client.query('DELETE FROM server_members WHERE server_id = $1', [serverId]);
      await client.query('DELETE FROM member_roles WHERE server_id = $1', [serverId]);
      await client.query('DELETE FROM server_roles WHERE server_id = $1', [serverId]);
      await client.query('DELETE FROM invites WHERE server_id = $1', [serverId]);
      await client.query('DELETE FROM bans WHERE server_id = $1', [serverId]);
      const result = await client.query('DELETE FROM servers WHERE id = $1', [serverId]);
      return { success: result.rowCount > 0 };
    });
  }
};

// ============================================
// SQLITE COMPATIBILITY HELPERS
// ============================================

// Convert SQLite ? placeholders to PostgreSQL $1, $2, etc.
function convertPlaceholders(sql) {
  let index = 1;
  return sql.replace(/\?/g, () => `$${index++}`);
}

async function dbGet(sql, params = []) {
  const pgSql = convertPlaceholders(sql);
  const result = await queryOne(pgSql, params);
  return result;
}

async function dbRun(sql, params = []) {
  const pgSql = convertPlaceholders(sql);
  const result = await query(pgSql, params);
  return { changes: result.rowCount, lastID: result.rows[0]?.id || null };
}

async function dbAll(sql, params = []) {
  const pgSql = convertPlaceholders(sql);
  const result = await queryMany(pgSql, params);
  return result;
}

// ============================================
// EXPORTS
// ============================================

module.exports = {
  pool,
  db,
  dbGet,
  dbRun,
  dbAll,
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
  voiceDB,
  userServerAccessDB,
  roleChannelAccessDB,
  subscriptionDB,
  auditLogDB,
  sessionDB,
  roleDB,
  masterAdminDB,
  Permissions,
  RolePermissions,
  RoleHierarchy,
  async adminResetPassword(userId, newPassword) {
    const bcrypt = require('bcryptjs');
    const hashed = await bcrypt.hash(newPassword, 10);
    await query('UPDATE users SET password = $1 WHERE id = $2', [hashed, userId]);
    return { success: true };
  },
  async toggleUserActive(userId, isActive) {
    await query('UPDATE users SET is_active = $1 WHERE id = $2', [isActive, userId]);
    return { success: true };
  }
};
