const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

const dbPath = path.join(__dirname, 'workgrid.db');
const db = new sqlite3.Database(dbPath);

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
  owner: Object.values(Permissions).reduce((a, b) => a | b, 0), // All permissions
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

// Permission helper functions
const permissionDB = {
  // Check if user has a specific permission
  async hasPermission(userId, serverId, permission) {
    const role = await this.getUserRole(userId, serverId);
    if (!role) return false;
    
    const rolePerms = RolePermissions[role];
    return (rolePerms & permission) === permission;
  },

  // Get user's role in a server
  async getUserRole(userId, serverId) {
    return new Promise((resolve, reject) => {
      db.get(
        'SELECT role FROM server_members WHERE server_id = ? AND user_id = ?',
        [serverId, userId],
        (err, row) => {
          if (err) reject(err);
          else resolve(row?.role || null);
        }
      );
    });
  },

  // Check if user is server owner
  async isServerOwner(userId, serverId) {
    return new Promise((resolve, reject) => {
      db.get(
        'SELECT owner_id FROM servers WHERE id = ?',
        [serverId],
        (err, row) => {
          if (err) reject(err);
          else resolve(row?.owner_id === userId);
        }
      );
    });
  },

  // Get all permissions for a user in a server
  async getUserPermissions(userId, serverId) {
    const role = await this.getUserRole(userId, serverId);
    if (!role) return 0;
    return RolePermissions[role] || 0;
  },

  // Check if user can manage another user (based on role hierarchy)
  async canManageUser(managerId, targetId, serverId) {
    // Can't manage yourself
    if (managerId === targetId) return false;

    const managerRole = await this.getUserRole(managerId, serverId);
    const targetRole = await this.getUserRole(targetId, serverId);
    
    if (!managerRole || !targetRole) return false;

    const managerHierarchy = RoleHierarchy[managerRole];
    const targetHierarchy = RoleHierarchy[targetRole];

    // Owner can manage everyone except other owners (but can manage admins, mods, members)
    // Admin can manage moderator and member only
    // Moderator can manage member only
    return managerHierarchy > targetHierarchy;
  },

  // Update member role
  async updateMemberRole(serverId, userId, newRole) {
    return new Promise((resolve, reject) => {
      db.run(
        'UPDATE server_members SET role = ? WHERE server_id = ? AND user_id = ?',
        [newRole, serverId, userId],
        function(err) {
          if (err) reject(err);
          else resolve({ success: this.changes > 0 });
        }
      );
    });
  },

  // Remove member from server (kick)
  async removeMember(serverId, userId) {
    return new Promise((resolve, reject) => {
      db.run(
        'DELETE FROM server_members WHERE server_id = ? AND user_id = ?',
        [serverId, userId],
        function(err) {
          if (err) reject(err);
          else resolve({ success: this.changes > 0 });
        }
      );
    });
  },

  // Ban member (add to ban list)
  async banMember(serverId, userId, reason = null) {
    return new Promise((resolve, reject) => {
      const id = uuidv4();
      db.run(
        'INSERT INTO bans (id, server_id, user_id, reason, created_at) VALUES (?, ?, ?, ?, datetime("now"))',
        [id, serverId, userId, reason],
        function(err) {
          if (err) reject(err);
          else {
            // Also remove from members
            db.run(
              'DELETE FROM server_members WHERE server_id = ? AND user_id = ?',
              [serverId, userId],
              (err2) => {
                if (err2) reject(err2);
                else resolve({ success: true });
              }
            );
          }
        }
      );
    });
  },

  // Check if user is banned
  async isBanned(serverId, userId) {
    return new Promise((resolve, reject) => {
      db.get(
        'SELECT * FROM bans WHERE server_id = ? AND user_id = ?',
        [serverId, userId],
        (err, row) => {
          if (err) reject(err);
          else resolve(!!row);
        }
      );
    });
  },
};

module.exports.Permissions = Permissions;
module.exports.RolePermissions = RolePermissions;
module.exports.RoleHierarchy = RoleHierarchy;
module.exports.permissionDB = permissionDB;

// Initialize database schema
function initDatabase() {
  db.serialize(() => {
    // Users table
    db.run(`CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      avatar TEXT,
      status TEXT DEFAULT 'offline',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Servers table
    db.run(`CREATE TABLE IF NOT EXISTS servers (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      icon TEXT,
      owner_id TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (owner_id) REFERENCES users(id)
    )`);

    // Server members table
    db.run(`CREATE TABLE IF NOT EXISTS server_members (
      id TEXT PRIMARY KEY,
      server_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      role TEXT DEFAULT 'member',
      joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (server_id) REFERENCES servers(id),
      FOREIGN KEY (user_id) REFERENCES users(id),
      UNIQUE(server_id, user_id)
    )`);

    // Categories table for channel grouping
    db.run(`CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY,
      server_id TEXT NOT NULL,
      name TEXT NOT NULL,
      position INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (server_id) REFERENCES servers(id)
    )`);

    // Channels table (updated with category support)
    db.run(`CREATE TABLE IF NOT EXISTS channels (
      id TEXT PRIMARY KEY,
      server_id TEXT NOT NULL,
      category_id TEXT,
      name TEXT NOT NULL,
      type TEXT DEFAULT 'text',
      position INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (server_id) REFERENCES servers(id),
      FOREIGN KEY (category_id) REFERENCES categories(id)
    )`);

    // Messages table
    db.run(`CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      channel_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      content TEXT,
      reply_to_id TEXT,
      attachments TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      edited_at DATETIME,
      FOREIGN KEY (channel_id) REFERENCES channels(id),
      FOREIGN KEY (user_id) REFERENCES users(id)
    )`);

    // Reactions table
    db.run(`CREATE TABLE IF NOT EXISTS reactions (
      id TEXT PRIMARY KEY,
      message_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      emoji TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (message_id) REFERENCES messages(id),
      FOREIGN KEY (user_id) REFERENCES users(id),
      UNIQUE(message_id, user_id, emoji)
    )`);

    // Direct messages table
    db.run(`CREATE TABLE IF NOT EXISTS direct_messages (
      id TEXT PRIMARY KEY,
      sender_id TEXT NOT NULL,
      receiver_id TEXT NOT NULL,
      content TEXT,
      attachments TEXT,
      is_read BOOLEAN DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (sender_id) REFERENCES users(id),
      FOREIGN KEY (receiver_id) REFERENCES users(id)
    )`);

    // Server invites table
    db.run(`CREATE TABLE IF NOT EXISTS invites (
      id TEXT PRIMARY KEY,
      server_id TEXT NOT NULL,
      code TEXT UNIQUE NOT NULL,
      created_by TEXT NOT NULL,
      expires_at DATETIME,
      max_uses INTEGER,
      uses INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (server_id) REFERENCES servers(id),
      FOREIGN KEY (created_by) REFERENCES users(id)
    )`);

    // Friend requests table (extended for friendships with updated_at)
    db.run(`CREATE TABLE IF NOT EXISTS friendships (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      friend_id TEXT NOT NULL,
      status TEXT DEFAULT 'pending',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (friend_id) REFERENCES users(id),
      UNIQUE(user_id, friend_id)
    )`);

    // Bans table for server bans
    db.run(`CREATE TABLE IF NOT EXISTS bans (
      id TEXT PRIMARY KEY,
      server_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      reason TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (server_id) REFERENCES servers(id),
      FOREIGN KEY (user_id) REFERENCES users(id),
      UNIQUE(server_id, user_id)
    )`);

    // DM Channels table for 1-on-1 direct messages
    db.run(`CREATE TABLE IF NOT EXISTS dm_channels (
      id TEXT PRIMARY KEY,
      user1_id TEXT NOT NULL,
      user2_id TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user1_id) REFERENCES users(id),
      FOREIGN KEY (user2_id) REFERENCES users(id),
      UNIQUE(user1_id, user2_id)
    )`);

    // DM Messages table
    db.run(`CREATE TABLE IF NOT EXISTS dm_messages (
      id TEXT PRIMARY KEY,
      channel_id TEXT NOT NULL,
      sender_id TEXT NOT NULL,
      content TEXT,
      attachments TEXT,
      is_read BOOLEAN DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      edited_at DATETIME,
      FOREIGN KEY (channel_id) REFERENCES dm_channels(id),
      FOREIGN KEY (sender_id) REFERENCES users(id)
    )`);

    console.log('✅ Database initialized');
  });
}

// User operations
const userDB = {
  async create(username, email, password) {
    const hashedPassword = await bcrypt.hash(password, 10);
    const id = uuidv4();
    const avatar = `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`;
    
    return new Promise((resolve, reject) => {
      db.run(
        'INSERT INTO users (id, username, email, password, avatar) VALUES (?, ?, ?, ?, ?)',
        [id, username, email, hashedPassword, avatar],
        function(err) {
          if (err) reject(err);
          else resolve({ id, username, email, avatar, status: 'offline' });
        }
      );
    });
  },

  async findByEmail(email) {
    return new Promise((resolve, reject) => {
      db.get('SELECT * FROM users WHERE email = ?', [email], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  },

  async findByUsername(username) {
    return new Promise((resolve, reject) => {
      db.get('SELECT * FROM users WHERE username = ?', [username], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  },

  async findById(id) {
    return new Promise((resolve, reject) => {
      db.get('SELECT id, username, email, avatar, status, created_at FROM users WHERE id = ?', [id], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  },

  async updateProfile(id, updates) {
    const fields = [];
    const values = [];
    
    if (updates.username) {
      fields.push('username = ?');
      values.push(updates.username);
    }
    if (updates.avatar) {
      fields.push('avatar = ?');
      values.push(updates.avatar);
    }
    if (updates.status) {
      fields.push('status = ?');
      values.push(updates.status);
    }
    
    values.push(id);
    
    return new Promise((resolve, reject) => {
      db.run(
        `UPDATE users SET ${fields.join(', ')} WHERE id = ?`,
        values,
        function(err) {
          if (err) reject(err);
          else resolve(true);
        }
      );
    });
  },

  async updatePassword(id, newPassword) {
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    return new Promise((resolve, reject) => {
      db.run(
        'UPDATE users SET password = ? WHERE id = ?',
        [hashedPassword, id],
        function(err) {
          if (err) reject(err);
          else resolve(true);
        }
      );
    });
  },

  async verifyPassword(password, hashedPassword) {
    return bcrypt.compare(password, hashedPassword);
  }
};

// Server operations
const serverDB = {
  async create(name, icon, ownerId) {
    const id = uuidv4();
    return new Promise((resolve, reject) => {
      db.run(
        'INSERT INTO servers (id, name, icon, owner_id) VALUES (?, ?, ?, ?)',
        [id, name, icon, ownerId],
        function(err) {
          if (err) reject(err);
          else resolve({ id, name, icon, owner_id: ownerId });
        }
      );
    });
  },

  async getUserServers(userId) {
    return new Promise((resolve, reject) => {
      db.all(
        `SELECT s.* FROM servers s
         JOIN server_members sm ON s.id = sm.server_id
         WHERE sm.user_id = ?`,
        [userId],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });
  },

  async addMember(serverId, userId, role = 'member') {
    const id = uuidv4();
    return new Promise((resolve, reject) => {
      db.run(
        'INSERT OR IGNORE INTO server_members (id, server_id, user_id, role) VALUES (?, ?, ?, ?)',
        [id, serverId, userId, role],
        function(err) {
          if (err) reject(err);
          else resolve(true);
        }
      );
    });
  },

  async getMembers(serverId) {
    return new Promise((resolve, reject) => {
      db.all(
        `SELECT u.id, u.username, u.avatar, u.status, sm.role 
         FROM users u
         JOIN server_members sm ON u.id = sm.user_id
         WHERE sm.server_id = ?`,
        [serverId],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });
  }
};

// Category operations
const categoryDB = {
  async create(serverId, name, position = 0) {
    const id = uuidv4();
    return new Promise((resolve, reject) => {
      db.run(
        'INSERT INTO categories (id, server_id, name, position) VALUES (?, ?, ?, ?)',
        [id, serverId, name, position],
        function(err) {
          if (err) reject(err);
          else resolve({ id, server_id: serverId, name, position });
        }
      );
    });
  },

  async getByServer(serverId) {
    return new Promise((resolve, reject) => {
      db.all(
        'SELECT * FROM categories WHERE server_id = ? ORDER BY position',
        [serverId],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });
  },

  async getById(categoryId) {
    return new Promise((resolve, reject) => {
      db.get(
        'SELECT * FROM categories WHERE id = ?',
        [categoryId],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });
  },

  async update(categoryId, updates) {
    const fields = [];
    const values = [];
    
    if (updates.name) {
      fields.push('name = ?');
      values.push(updates.name);
    }
    if (typeof updates.position === 'number') {
      fields.push('position = ?');
      values.push(updates.position);
    }
    
    if (fields.length === 0) {
      return Promise.resolve({ success: false, error: 'No updates provided' });
    }
    
    values.push(categoryId);
    
    return new Promise((resolve, reject) => {
      db.run(
        `UPDATE categories SET ${fields.join(', ')} WHERE id = ?`,
        values,
        function(err) {
          if (err) reject(err);
          else resolve({ success: this.changes > 0 });
        }
      );
    });
  },

  async delete(categoryId) {
    return new Promise((resolve, reject) => {
      // First, set all channels in this category to uncategorized
      db.run(
        'UPDATE channels SET category_id = NULL WHERE category_id = ?',
        [categoryId],
        (err) => {
          if (err) {
            reject(err);
            return;
          }
          // Then delete the category
          db.run(
            'DELETE FROM categories WHERE id = ?',
            [categoryId],
            function(err) {
              if (err) reject(err);
              else resolve({ success: this.changes > 0 });
            }
          );
        }
      );
    });
  },

  async reorder(serverId, categoryIds) {
    return new Promise((resolve, reject) => {
      const stmt = db.prepare('UPDATE categories SET position = ? WHERE id = ? AND server_id = ?');
      let completed = 0;
      let hasError = false;
      
      categoryIds.forEach((id, index) => {
        stmt.run(index, id, serverId, (err) => {
          if (hasError) return;
          if (err) {
            hasError = true;
            reject(err);
            return;
          }
          completed++;
          if (completed === categoryIds.length) {
            stmt.finalize();
            resolve({ success: true });
          }
        });
      });
      
      if (categoryIds.length === 0) {
        stmt.finalize();
        resolve({ success: true });
      }
    });
  }
};

// Channel operations
const channelDB = {
  async create(serverId, name, type = 'text', categoryId = null, position = 0) {
    const id = uuidv4();
    return new Promise((resolve, reject) => {
      db.run(
        'INSERT INTO channels (id, server_id, category_id, name, type, position) VALUES (?, ?, ?, ?, ?, ?)',
        [id, serverId, categoryId, name, type, position],
        function(err) {
          if (err) reject(err);
          else resolve({ id, server_id: serverId, category_id: categoryId, name, type, position });
        }
      );
    });
  },

  async getByServer(serverId) {
    return new Promise((resolve, reject) => {
      db.all(
        'SELECT * FROM channels WHERE server_id = ? ORDER BY category_id, position',
        [serverId],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });
  },

  async getByCategory(categoryId) {
    return new Promise((resolve, reject) => {
      db.all(
        'SELECT * FROM channels WHERE category_id = ? ORDER BY position',
        [categoryId],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });
  },

  async getUncategorized(serverId) {
    return new Promise((resolve, reject) => {
      db.all(
        'SELECT * FROM channels WHERE server_id = ? AND category_id IS NULL ORDER BY position',
        [serverId],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });
  },

  async moveToCategory(channelId, categoryId, position = null) {
    return new Promise((resolve, reject) => {
      let sql = 'UPDATE channels SET category_id = ?';
      const values = [categoryId];
      
      if (position !== null) {
        sql += ', position = ?';
        values.push(position);
      }
      
      sql += ' WHERE id = ?';
      values.push(channelId);
      
      db.run(sql, values, function(err) {
        if (err) reject(err);
        else resolve({ success: this.changes > 0 });
      });
    });
  },

  async reorder(channels) {
    // channels: [{ id, categoryId, position }]
    return new Promise((resolve, reject) => {
      const stmt = db.prepare('UPDATE channels SET category_id = ?, position = ? WHERE id = ?');
      let completed = 0;
      let hasError = false;
      
      channels.forEach(({ id, categoryId, position }) => {
        stmt.run(categoryId, position, id, (err) => {
          if (hasError) return;
          if (err) {
            hasError = true;
            reject(err);
            return;
          }
          completed++;
          if (completed === channels.length) {
            stmt.finalize();
            resolve({ success: true });
          }
        });
      });
      
      if (channels.length === 0) {
        stmt.finalize();
        resolve({ success: true });
      }
    });
  },

  async update(channelId, updates) {
    const fields = [];
    const values = [];
    
    if (updates.name) {
      fields.push('name = ?');
      values.push(updates.name);
    }
    if (updates.category_id !== undefined) {
      fields.push('category_id = ?');
      values.push(updates.category_id);
    }
    if (typeof updates.position === 'number') {
      fields.push('position = ?');
      values.push(updates.position);
    }
    
    if (fields.length === 0) {
      return Promise.resolve({ success: false, error: 'No updates provided' });
    }
    
    values.push(channelId);
    
    return new Promise((resolve, reject) => {
      db.run(
        `UPDATE channels SET ${fields.join(', ')} WHERE id = ?`,
        values,
        function(err) {
          if (err) reject(err);
          else resolve({ success: this.changes > 0 });
        }
      );
    });
  }
};

// Message operations
const messageDB = {
  async create(channelId, userId, content, replyToId = null, attachments = null) {
    const id = uuidv4();
    return new Promise((resolve, reject) => {
      db.run(
        'INSERT INTO messages (id, channel_id, user_id, content, reply_to_id, attachments) VALUES (?, ?, ?, ?, ?, ?)',
        [id, channelId, userId, content, replyToId, attachments ? JSON.stringify(attachments) : null],
        async function(err) {
          if (err) reject(err);
          else {
            const message = await messageDB.getById(id);
            resolve(message);
          }
        }
      );
    });
  },

  async getById(id) {
    return new Promise((resolve, reject) => {
      db.get(
        `SELECT m.*, u.id as user_id, u.username, u.avatar,
                rm.id as reply_id, rm.content as reply_content,
                ru.id as reply_user_id, ru.username as reply_username, ru.avatar as reply_user_avatar
         FROM messages m
         JOIN users u ON m.user_id = u.id
         LEFT JOIN messages rm ON m.reply_to_id = rm.id
         LEFT JOIN users ru ON rm.user_id = ru.id
         WHERE m.id = ?`,
        [id],
        (err, row) => {
          if (err) reject(err);
          else {
            if (row) {
              if (row.attachments) {
                try {
                  row.attachments = JSON.parse(row.attachments);
                } catch (e) {
                  row.attachments = [];
                }
              }
              // Format user object
              row.user = {
                id: row.user_id,
                username: row.username,
                avatar: row.avatar
              };
              // Format replyTo object if exists
              if (row.reply_to_id) {
                row.replyTo = {
                  id: row.reply_id,
                  content: row.reply_content,
                  user: {
                    id: row.reply_user_id,
                    username: row.reply_username,
                    avatar: row.reply_user_avatar
                  }
                };
              }
              // Map snake_case to camelCase for frontend
              row.channelId = row.channel_id;
              row.userId = row.user_id;
              row.replyToId = row.reply_to_id;
              row.timestamp = row.created_at;
              // Clean up temp fields
              delete row.user_id;
              delete row.username;
              delete row.avatar;
              delete row.channel_id;
              delete row.reply_to_id;
              delete row.created_at;
              delete row.reply_id;
              delete row.reply_content;
              delete row.reply_user_id;
              delete row.reply_username;
              delete row.reply_user_avatar;
            }
            resolve(row);
          }
        }
      );
    });
  },

  async getByChannel(channelId, limit = 50, offset = 0) {
    return new Promise((resolve, reject) => {
      db.all(
        `SELECT m.*, u.id as user_id, u.username, u.avatar,
                rm.id as reply_id, rm.content as reply_content,
                ru.id as reply_user_id, ru.username as reply_username, ru.avatar as reply_user_avatar,
                (SELECT GROUP_CONCAT(emoji || ':' || COUNT || ':' || user_ids, ';')
                 FROM (
                   SELECT emoji, COUNT(*) as COUNT, GROUP_CONCAT(user_id) as user_ids
                   FROM reactions
                   WHERE message_id = m.id
                   GROUP BY emoji
                 )
                ) as reactions_data
         FROM messages m
         JOIN users u ON m.user_id = u.id
         LEFT JOIN messages rm ON m.reply_to_id = rm.id
         LEFT JOIN users ru ON rm.user_id = ru.id
         WHERE m.channel_id = ?
         ORDER BY m.created_at DESC
         LIMIT ? OFFSET ?`,
        [channelId, limit, offset],
        async (err, rows) => {
          if (err) reject(err);
          else {
            // Process reactions for each message
            for (const row of rows) {
              if (row.attachments) {
                try {
                  row.attachments = JSON.parse(row.attachments);
                } catch (e) {
                  row.attachments = [];
                }
              }
              
              // Parse reactions
              row.reactions = [];
              if (row.reactions_data) {
                const reactionGroups = row.reactions_data.split(';');
                for (const group of reactionGroups) {
                  const parts = group.split(':');
                  if (parts.length >= 3) {
                    row.reactions.push({
                      emoji: parts[0],
                      count: parseInt(parts[1]),
                      users: parts[2].split(',')
                    });
                  }
                }
              }
              delete row.reactions_data;
              
              // Format user object
              row.user = {
                id: row.user_id,
                username: row.username,
                avatar: row.avatar
              };
              // Format replyTo object if exists
              if (row.reply_to_id) {
                row.replyTo = {
                  id: row.reply_id,
                  content: row.reply_content,
                  user: {
                    id: row.reply_user_id,
                    username: row.reply_username,
                    avatar: row.reply_user_avatar
                  }
                };
              }
              // Map snake_case to camelCase for frontend
              row.channelId = row.channel_id;
              row.userId = row.user_id;
              row.replyToId = row.reply_to_id;
              row.timestamp = row.created_at;
              // Clean up temp fields
              delete row.user_id;
              delete row.username;
              delete row.avatar;
              delete row.channel_id;
              delete row.reply_to_id;
              delete row.created_at;
              delete row.reply_id;
              delete row.reply_content;
              delete row.reply_user_id;
              delete row.reply_username;
              delete row.reply_user_avatar;
            };
            resolve(rows.reverse());
          }
        }
      );
    });
  },

  async update(id, content) {
    return new Promise((resolve, reject) => {
      db.run(
        'UPDATE messages SET content = ?, edited_at = CURRENT_TIMESTAMP WHERE id = ?',
        [content, id],
        async function(err) {
          if (err) reject(err);
          else {
            const message = await messageDB.getById(id);
            resolve(message);
          }
        }
      );
    });
  },

  async delete(id) {
    return new Promise((resolve, reject) => {
      db.run(
        'DELETE FROM messages WHERE id = ?',
        [id],
        function(err) {
          if (err) reject(err);
          else resolve(true);
        }
      );
    });
  }
};

// Invite operations
const inviteDB = {
  async create(serverId, createdBy, expiresAt = null, maxUses = null) {
    const id = uuidv4();
    const code = Math.random().toString(36).substring(2, 10).toUpperCase();
    
    return new Promise((resolve, reject) => {
      db.run(
        'INSERT INTO invites (id, server_id, code, created_by, expires_at, max_uses) VALUES (?, ?, ?, ?, ?, ?)',
        [id, serverId, code, createdBy, expiresAt, maxUses],
        function(err) {
          if (err) reject(err);
          else resolve({ code, server_id: serverId });
        }
      );
    });
  },

  async findByCode(code) {
    return new Promise((resolve, reject) => {
      db.get(
        `SELECT i.*, s.name as server_name, s.icon as server_icon
         FROM invites i
         JOIN servers s ON i.server_id = s.id
         WHERE i.code = ?`,
        [code],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });
  },

  async incrementUses(code) {
    return new Promise((resolve, reject) => {
      db.run(
        'UPDATE invites SET uses = uses + 1 WHERE code = ?',
        [code],
        function(err) {
          if (err) reject(err);
          else resolve(true);
        }
      );
    });
  },

  async getServerInvites(serverId) {
    return new Promise((resolve, reject) => {
      db.all(
        `SELECT i.*, u.username as created_by_username
         FROM invites i
         JOIN users u ON i.created_by = u.id
         WHERE i.server_id = ?
         ORDER BY i.created_at DESC`,
        [serverId],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });
  },

  async deleteInvite(code) {
    return new Promise((resolve, reject) => {
      db.run(
        'DELETE FROM invites WHERE code = ?',
        [code],
        function(err) {
          if (err) reject(err);
          else resolve({ success: this.changes > 0 });
        }
      );
    });
  }
};

// Reaction operations
const reactionDB = {
  async add(messageId, userId, emoji) {
    const id = uuidv4();
    
    return new Promise((resolve, reject) => {
      db.run(
        'INSERT OR IGNORE INTO reactions (id, message_id, user_id, emoji) VALUES (?, ?, ?, ?)',
        [id, messageId, userId, emoji],
        function(err) {
          if (err) reject(err);
          else resolve({ id, messageId, userId, emoji });
        }
      );
    });
  },

  async remove(messageId, userId, emoji) {
    return new Promise((resolve, reject) => {
      db.run(
        'DELETE FROM reactions WHERE message_id = ? AND user_id = ? AND emoji = ?',
        [messageId, userId, emoji],
        function(err) {
          if (err) reject(err);
          else resolve(true);
        }
      );
    });
  },

  async getByMessage(messageId) {
    return new Promise((resolve, reject) => {
      db.all(
        `SELECT r.*, u.username, u.avatar 
         FROM reactions r
         JOIN users u ON r.user_id = u.id
         WHERE r.message_id = ?
         ORDER BY r.created_at ASC`,
        [messageId],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });
  },

  async getGroupedByMessage(messageId) {
    return new Promise((resolve, reject) => {
      db.all(
        `SELECT emoji, COUNT(*) as count, GROUP_CONCAT(user_id) as user_ids
         FROM reactions
         WHERE message_id = ?
         GROUP BY emoji
         ORDER BY count DESC`,
        [messageId],
        (err, rows) => {
          if (err) {
            reject(err);
          } else {
            const reactions = rows.map(row => ({
              emoji: row.emoji,
              count: row.count,
              users: row.user_ids ? row.user_ids.split(',') : []
            }));
            resolve(reactions);
          }
        }
      );
    });
  }
};

// Friend/Friendship operations
const friendDB = {
  // Send friend request
  async sendFriendRequest(userId, friendId) {
    // Check if trying to add self
    if (userId === friendId) {
      throw new Error('Cannot send friend request to yourself');
    }

    // Check if already friends or pending
    const existing = await this.getFriendship(userId, friendId);
    if (existing) {
      if (existing.status === 'accepted') {
        throw new Error('Already friends with this user');
      } else if (existing.status === 'pending') {
        throw new Error('Friend request already pending');
      } else if (existing.status === 'blocked') {
        throw new Error('Cannot send friend request to blocked user');
      }
    }

    // Check if blocked by the other user
    const reverseExisting = await this.getFriendship(friendId, userId);
    if (reverseExisting && reverseExisting.status === 'blocked') {
      throw new Error('Cannot send friend request to this user');
    }

    const id = uuidv4();
    return new Promise((resolve, reject) => {
      db.run(
        'INSERT INTO friendships (id, user_id, friend_id, status, created_at, updated_at) VALUES (?, ?, ?, ?, datetime("now"), datetime("now"))',
        [id, userId, friendId, 'pending'],
        function(err) {
          if (err) reject(err);
          else resolve({ id, userId, friendId, status: 'pending' });
        }
      );
    });
  },

  // Get friendship between two users
  async getFriendship(userId, friendId) {
    return new Promise((resolve, reject) => {
      db.get(
        'SELECT * FROM friendships WHERE user_id = ? AND friend_id = ?',
        [userId, friendId],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });
  },

  // Accept friend request
  async acceptFriendRequest(requestId, accepterId) {
    return new Promise((resolve, reject) => {
      // First verify the request exists and is for this user
      db.get(
        'SELECT * FROM friendships WHERE id = ? AND friend_id = ? AND status = ?',
        [requestId, accepterId, 'pending'],
        (err, row) => {
          if (err) {
            reject(err);
            return;
          }
          if (!row) {
            reject(new Error('Friend request not found'));
            return;
          }

          // Update the request status
          db.run(
            'UPDATE friendships SET status = ?, updated_at = datetime("now") WHERE id = ?',
            ['accepted', requestId],
            function(err) {
              if (err) {
                reject(err);
                return;
              }

              // Create reciprocal friendship
              const reciprocalId = uuidv4();
              db.run(
                'INSERT INTO friendships (id, user_id, friend_id, status, created_at, updated_at) VALUES (?, ?, ?, ?, datetime("now"), datetime("now"))',
                [reciprocalId, accepterId, row.user_id, 'accepted'],
                function(err) {
                  if (err) reject(err);
                  else resolve({ success: true, friendId: row.user_id });
                }
              );
            }
          );
        }
      );
    });
  },

  // Reject friend request
  async rejectFriendRequest(requestId, rejecterId) {
    return new Promise((resolve, reject) => {
      db.run(
        'DELETE FROM friendships WHERE id = ? AND friend_id = ? AND status = ?',
        [requestId, rejecterId, 'pending'],
        function(err) {
          if (err) reject(err);
          else if (this.changes === 0) {
            reject(new Error('Friend request not found'));
          } else {
            resolve({ success: true });
          }
        }
      );
    });
  },

  // Cancel outgoing friend request
  async cancelFriendRequest(requestId, senderId) {
    return new Promise((resolve, reject) => {
      db.run(
        'DELETE FROM friendships WHERE id = ? AND user_id = ? AND status = ?',
        [requestId, senderId, 'pending'],
        function(err) {
          if (err) reject(err);
          else if (this.changes === 0) {
            reject(new Error('Friend request not found'));
          } else {
            resolve({ success: true });
          }
        }
      );
    });
  },

  // Remove friend (unfriend)
  async removeFriend(userId, friendId) {
    return new Promise((resolve, reject) => {
      // Delete both directions
      db.run(
        'DELETE FROM friendships WHERE (user_id = ? AND friend_id = ?) OR (user_id = ? AND friend_id = ?)',
        [userId, friendId, friendId, userId],
        function(err) {
          if (err) reject(err);
          else resolve({ success: true });
        }
      );
    });
  },

  // Block user
  async blockUser(userId, blockedUserId) {
    // First remove any existing friendship
    await this.removeFriend(userId, blockedUserId);

    const id = uuidv4();
    return new Promise((resolve, reject) => {
      db.run(
        'INSERT INTO friendships (id, user_id, friend_id, status, created_at, updated_at) VALUES (?, ?, ?, ?, datetime("now"), datetime("now"))',
        [id, userId, blockedUserId, 'blocked'],
        function(err) {
          if (err) reject(err);
          else resolve({ success: true });
        }
      );
    });
  },

  // Unblock user
  async unblockUser(userId, blockedUserId) {
    return new Promise((resolve, reject) => {
      db.run(
        'DELETE FROM friendships WHERE user_id = ? AND friend_id = ? AND status = ?',
        [userId, blockedUserId, 'blocked'],
        function(err) {
          if (err) reject(err);
          else if (this.changes === 0) {
            reject(new Error('User not blocked'));
          } else {
            resolve({ success: true });
          }
        }
      );
    });
  },

  // Get all friends (accepted)
  async getFriends(userId) {
    return new Promise((resolve, reject) => {
      db.all(
        `SELECT u.id, u.username, u.avatar, u.status, f.created_at as friendship_date
         FROM friendships f
         JOIN users u ON f.friend_id = u.id
         WHERE f.user_id = ? AND f.status = ?
         ORDER BY u.username`,
        [userId, 'accepted'],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });
  },

  // Get pending requests (incoming and outgoing)
  async getPendingRequests(userId) {
    return new Promise((resolve, reject) => {
      db.all(
        `SELECT f.id, f.user_id, f.friend_id, f.status, f.created_at,
                u.id as requester_id, u.username as requester_username, u.avatar as requester_avatar, u.status as requester_status
         FROM friendships f
         JOIN users u ON f.user_id = u.id
         WHERE f.friend_id = ? AND f.status = ?
         ORDER BY f.created_at DESC`,
        [userId, 'pending'],
        (err, incomingRows) => {
          if (err) {
            reject(err);
            return;
          }

          db.all(
            `SELECT f.id, f.user_id, f.friend_id, f.status, f.created_at,
                    u.id as recipient_id, u.username as recipient_username, u.avatar as recipient_avatar, u.status as recipient_status
             FROM friendships f
             JOIN users u ON f.friend_id = u.id
             WHERE f.user_id = ? AND f.status = ?
             ORDER BY f.created_at DESC`,
            [userId, 'pending'],
            (err2, outgoingRows) => {
              if (err2) reject(err2);
              else {
                resolve({
                  incoming: incomingRows,
                  outgoing: outgoingRows
                });
              }
            }
          );
        }
      );
    });
  },

  // Get blocked users
  async getBlockedUsers(userId) {
    return new Promise((resolve, reject) => {
      db.all(
        `SELECT u.id, u.username, u.avatar, f.created_at as blocked_date
         FROM friendships f
         JOIN users u ON f.friend_id = u.id
         WHERE f.user_id = ? AND f.status = ?
         ORDER BY f.created_at DESC`,
        [userId, 'blocked'],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });
  },

  // Check if users are friends
  async isFriend(userId, friendId) {
    return new Promise((resolve, reject) => {
      db.get(
        'SELECT * FROM friendships WHERE user_id = ? AND friend_id = ? AND status = ?',
        [userId, friendId, 'accepted'],
        (err, row) => {
          if (err) reject(err);
          else resolve(!!row);
        }
      );
    });
  },

  // Check if user is blocked
  async isBlocked(userId, blockedUserId) {
    return new Promise((resolve, reject) => {
      db.get(
        'SELECT * FROM friendships WHERE user_id = ? AND friend_id = ? AND status = ?',
        [userId, blockedUserId, 'blocked'],
        (err, row) => {
          if (err) reject(err);
          else resolve(!!row);
        }
      );
    });
  },

  // Get friendship status between two users
  async getFriendshipStatus(userId, otherUserId) {
    const friendship = await this.getFriendship(userId, otherUserId);
    if (friendship) {
      return friendship.status;
    }
    
    const reverseFriendship = await this.getFriendship(otherUserId, userId);
    if (reverseFriendship) {
      if (reverseFriendship.status === 'pending') {
        return 'incoming_request';
      }
      return reverseFriendship.status;
    }
    
    return 'none';
  }
};

// DM (Direct Message) operations
const dmDB = {
  // Create or get existing DM channel between two users
  async createDMChannel(user1Id, user2Id) {
    // Ensure consistent ordering (smaller id first)
    const [firstUser, secondUser] = [user1Id, user2Id].sort();
    
    // Check if channel already exists
    const existingChannel = await this.getDMChannel(user1Id, user2Id);
    if (existingChannel) {
      return existingChannel;
    }

    const id = uuidv4();
    return new Promise((resolve, reject) => {
      db.run(
        'INSERT INTO dm_channels (id, user1_id, user2_id, created_at, updated_at) VALUES (?, ?, ?, datetime("now"), datetime("now"))',
        [id, firstUser, secondUser],
        async function(err) {
          if (err) reject(err);
          else {
            const channel = await dmDB.getDMChannelById(id);
            resolve(channel);
          }
        }
      );
    });
  },

  // Get DM channel between two users
  async getDMChannel(user1Id, user2Id) {
    const [firstUser, secondUser] = [user1Id, user2Id].sort();
    
    return new Promise((resolve, reject) => {
      db.get(
        `SELECT dc.*, 
                u1.username as user1_username, u1.avatar as user1_avatar, u1.status as user1_status,
                u2.username as user2_username, u2.avatar as user2_avatar, u2.status as user2_status
         FROM dm_channels dc
         JOIN users u1 ON dc.user1_id = u1.id
         JOIN users u2 ON dc.user2_id = u2.id
         WHERE dc.user1_id = ? AND dc.user2_id = ?`,
        [firstUser, secondUser],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });
  },

  // Get DM channel by ID
  async getDMChannelById(channelId) {
    return new Promise((resolve, reject) => {
      db.get(
        `SELECT dc.*, 
                u1.username as user1_username, u1.avatar as user1_avatar, u1.status as user1_status,
                u2.username as user2_username, u2.avatar as user2_avatar, u2.status as user2_status
         FROM dm_channels dc
         JOIN users u1 ON dc.user1_id = u1.id
         JOIN users u2 ON dc.user2_id = u2.id
         WHERE dc.id = ?`,
        [channelId],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });
  },

  // Get all DM channels for a user
  async getUserDMChannels(userId) {
    return new Promise((resolve, reject) => {
      db.all(
        `SELECT dc.*, 
                CASE 
                  WHEN dc.user1_id = ? THEN dc.user2_id 
                  ELSE dc.user1_id 
                END as friend_id,
                CASE 
                  WHEN dc.user1_id = ? THEN u2.username 
                  ELSE u1.username 
                END as friend_username,
                CASE 
                  WHEN dc.user1_id = ? THEN u2.avatar 
                  ELSE u1.avatar 
                END as friend_avatar,
                CASE 
                  WHEN dc.user1_id = ? THEN u2.status 
                  ELSE u1.status 
                END as friend_status,
                (SELECT content FROM dm_messages WHERE channel_id = dc.id ORDER BY created_at DESC LIMIT 1) as last_message,
                (SELECT created_at FROM dm_messages WHERE channel_id = dc.id ORDER BY created_at DESC LIMIT 1) as last_message_at,
                (SELECT COUNT(*) FROM dm_messages WHERE channel_id = dc.id AND sender_id != ? AND is_read = 0) as unread_count
         FROM dm_channels dc
         JOIN users u1 ON dc.user1_id = u1.id
         JOIN users u2 ON dc.user2_id = u2.id
         WHERE dc.user1_id = ? OR dc.user2_id = ?
         ORDER BY COALESCE(last_message_at, dc.updated_at) DESC`,
        [userId, userId, userId, userId, userId, userId, userId],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });
  },

  // Send DM message
  async sendDMMessage(channelId, senderId, content, attachments = null) {
    const id = uuidv4();
    return new Promise((resolve, reject) => {
      db.run(
        'INSERT INTO dm_messages (id, channel_id, sender_id, content, attachments) VALUES (?, ?, ?, ?, ?)',
        [id, channelId, senderId, content, attachments ? JSON.stringify(attachments) : null],
        async function(err) {
          if (err) reject(err);
          else {
            // Update channel updated_at
            db.run('UPDATE dm_channels SET updated_at = datetime("now") WHERE id = ?', [channelId]);
            const message = await dmDB.getDMMessageById(id);
            resolve(message);
          }
        }
      );
    });
  },

  // Get DM message by ID
  async getDMMessageById(messageId) {
    return new Promise((resolve, reject) => {
      db.get(
        `SELECT dm.*, u.username as sender_username, u.avatar as sender_avatar
         FROM dm_messages dm
         JOIN users u ON dm.sender_id = u.id
         WHERE dm.id = ?`,
        [messageId],
        (err, row) => {
          if (err) reject(err);
          else {
            if (row && row.attachments) {
              try {
                row.attachments = JSON.parse(row.attachments);
              } catch (e) {
                row.attachments = [];
              }
            }
            resolve(row);
          }
        }
      );
    });
  },

  // Get messages in DM channel
  async getDMMessages(channelId, limit = 50, offset = 0) {
    return new Promise((resolve, reject) => {
      db.all(
        `SELECT dm.*, u.username as sender_username, u.avatar as sender_avatar
         FROM dm_messages dm
         JOIN users u ON dm.sender_id = u.id
         WHERE dm.channel_id = ?
         ORDER BY dm.created_at DESC
         LIMIT ? OFFSET ?`,
        [channelId, limit, offset],
        (err, rows) => {
          if (err) reject(err);
          else {
            rows.forEach(row => {
              if (row.attachments) {
                try {
                  row.attachments = JSON.parse(row.attachments);
                } catch (e) {
                  row.attachments = [];
                }
              }
            });
            resolve(rows.reverse());
          }
        }
      );
    });
  },

  // Mark message as read
  async markDMMessageAsRead(messageId) {
    return new Promise((resolve, reject) => {
      db.run(
        'UPDATE dm_messages SET is_read = 1 WHERE id = ?',
        [messageId],
        function(err) {
          if (err) reject(err);
          else resolve({ success: true });
        }
      );
    });
  },

  // Mark all messages in channel as read for a user
  async markChannelMessagesAsRead(channelId, userId) {
    return new Promise((resolve, reject) => {
      db.run(
        'UPDATE dm_messages SET is_read = 1 WHERE channel_id = ? AND sender_id != ? AND is_read = 0',
        [channelId, userId],
        function(err) {
          if (err) reject(err);
          else resolve({ success: true, updated: this.changes });
        }
      );
    });
  },

  // Get unread DM count for user
  async getUnreadDMCount(userId) {
    return new Promise((resolve, reject) => {
      db.get(
        `SELECT COUNT(*) as count FROM dm_messages dm
         JOIN dm_channels dc ON dm.channel_id = dc.id
         WHERE (dc.user1_id = ? OR dc.user2_id = ?) 
           AND dm.sender_id != ? 
           AND dm.is_read = 0`,
        [userId, userId, userId],
        (err, row) => {
          if (err) reject(err);
          else resolve(row?.count || 0);
        }
      );
    });
  },

  // Get unread count per channel
  async getUnreadCountPerChannel(userId) {
    return new Promise((resolve, reject) => {
      db.all(
        `SELECT dm.channel_id, COUNT(*) as count 
         FROM dm_messages dm
         JOIN dm_channels dc ON dm.channel_id = dc.id
         WHERE (dc.user1_id = ? OR dc.user2_id = ?) 
           AND dm.sender_id != ? 
           AND dm.is_read = 0
         GROUP BY dm.channel_id`,
        [userId, userId, userId],
        (err, rows) => {
          if (err) reject(err);
          else {
            const counts = {};
            rows.forEach(row => {
              counts[row.channel_id] = row.count;
            });
            resolve(counts);
          }
        }
      );
    });
  },

  // Delete DM channel (hard delete for now)
  async deleteDMChannel(channelId) {
    return new Promise((resolve, reject) => {
      // Delete messages first
      db.run('DELETE FROM dm_messages WHERE channel_id = ?', [channelId], (err) => {
        if (err) {
          reject(err);
          return;
        }
        // Delete channel
        db.run('DELETE FROM dm_channels WHERE id = ?', [channelId], function(err) {
          if (err) reject(err);
          else resolve({ success: true });
        });
      });
    });
  }
};

// Dummy pool for compatibility with PostgreSQL interface
const pool = { query: () => Promise.resolve({ rows: [] }) };

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
