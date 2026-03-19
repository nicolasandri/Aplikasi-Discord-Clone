const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const uuidv4 = () => crypto.randomUUID();

// BUG-024: Increase Salt Rounds for better security
const SALT_ROUNDS = 12;

const dbPath = path.join(__dirname, 'workgrid.db');
const db = new sqlite3.Database(dbPath);

// Set timezone to Asia/Jakarta (WIB) for SQLite
// SQLite stores datetime in UTC by default, we need to handle timezone conversion
process.env.TZ = 'Asia/Jakarta';

// Helper to get current timestamp in ISO format with timezone
function getCurrentTimestamp() {
  return new Date().toISOString();
}

// Helper to convert UTC to local time for display
function toLocalTime(isoString) {
  if (!isoString) return null;
  const date = new Date(isoString);
  return date.toISOString();
}

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
  // Check if user has a specific permission (combines all roles)
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
  
  // Get combined permissions from all user's roles
  async getCombinedPermissions(userId, serverId) {
    return new Promise((resolve, reject) => {
      db.get(
        `SELECT COALESCE(GROUP_CONCAT(sr.permissions), 0) as all_perms
         FROM member_roles mr
         JOIN server_roles sr ON mr.role_id = sr.id
         WHERE mr.server_id = ? AND mr.user_id = ?`,
        [serverId, userId],
        (err, row) => {
          if (err) {
            reject(err);
            return;
          }
          
          if (!row || !row.all_perms) {
            resolve(0);
            return;
          }
          
          // Combine all permissions with bitwise OR
          const perms = row.all_perms.toString().split(',').map(Number);
          const combined = perms.reduce((a, b) => a | b, 0);
          resolve(combined);
        }
      );
    });
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

  // Get all permissions for a user in a server (combines all roles)
  async getUserPermissions(userId, serverId) {
    // Owner has all permissions
    const isOwner = await this.isServerOwner(userId, serverId);
    if (isOwner) return RolePermissions.owner;
    
    const role = await this.getUserRole(userId, serverId);
    if (!role) return 0;
    
    // Get combined permissions from all custom roles
    const combinedPerms = await this.getCombinedPermissions(userId, serverId);
    if (combinedPerms > 0) {
      return combinedPerms;
    }
    
    // Fallback to legacy role permissions
    return RolePermissions[role] || 0;
  },

  // Check if user can manage another user (based on role hierarchy)
  async canManageUser(managerId, targetId, serverId) {
    // Can't manage yourself
    if (managerId === targetId) return false;

    const managerRole = await this.getUserRole(managerId, serverId);
    const targetRole = await this.getUserRole(targetId, serverId);
    
    if (!managerRole || !targetRole) return false;

    // Get custom role positions if any
    const managerCustomRole = await this.getUserCustomRole(managerId, serverId);
    const targetCustomRole = await this.getUserCustomRole(targetId, serverId);
    
    // If manager is owner, they can manage anyone except other owners
    if (managerRole === 'owner') {
      return targetRole !== 'owner';
    }
    
    // If target is owner, nobody can manage them (except owner, handled above)
    if (targetRole === 'owner') {
      return false;
    }
    
    // If manager is admin, they can manage moderator and member
    if (managerRole === 'admin') {
      // Admin can manage moderators and members
      if (targetRole === 'moderator' || targetRole === 'member') {
        return true;
      }
      // Admin can also manage users with custom roles
      if (targetCustomRole) {
        return true;
      }
      return false;
    }
    
    // If manager is moderator, they can manage members
    if (managerRole === 'moderator') {
      // Moderator can manage regular members
      if (targetRole === 'member' && !targetCustomRole) {
        return true;
      }
      return false;
    }
    
    // For users with custom roles, check if they have KICK_MEMBERS permission
    if (managerCustomRole) {
      const managerPerms = managerCustomRole.permissions || 0;
      // Check if has KICK_MEMBERS permission (bit 4)
      const hasKickPermission = (managerPerms & (1 << 4)) !== 0;
      if (!hasKickPermission) return false;
      
      // Can manage members with lower position or no custom role
      if (targetCustomRole) {
        return managerCustomRole.position > targetCustomRole.position;
      }
      // Can manage regular members
      if (targetRole === 'member') {
        return true;
      }
      return false;
    }

    const managerHierarchy = RoleHierarchy[managerRole] || 0;
    const targetHierarchy = RoleHierarchy[targetRole] || 0;

    return managerHierarchy > targetHierarchy;
  },
  
  // Get user's custom role details
  async getUserCustomRole(userId, serverId) {
    return new Promise((resolve, reject) => {
      db.get(
        `SELECT sr.id, sr.name, sr.color, sr.permissions, sr.position
         FROM server_members sm
         LEFT JOIN server_roles sr ON sm.role_id = sr.id
         WHERE sm.server_id = ? AND sm.user_id = ? AND sm.role_id IS NOT NULL`,
        [serverId, userId],
        (err, row) => {
          if (err) reject(err);
          else resolve(row || null);
        }
      );
    });
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
    
    // Add display_name column if not exists (ignore error if already exists)
    db.run(`ALTER TABLE users ADD COLUMN display_name TEXT`, (err) => {
      if (err && !err.message.includes('duplicate column') && !err.message.includes('already exists')) {
        console.error('Error adding display_name column:', err);
      }
    });
    
    // Add badges column (JSON array like '["vip","crown","verified"]')
    db.run(`ALTER TABLE users ADD COLUMN badges TEXT DEFAULT '[]'`, (err) => {
      if (err && !err.message.includes('duplicate column') && !err.message.includes('already exists')) {
        console.error('Error adding badges column:', err);
      }
    });

    // Add token_version column for force logout functionality
    db.run(`ALTER TABLE users ADD COLUMN token_version INTEGER DEFAULT 0`, (err) => {
      if (err && !err.message.includes('duplicate column') && !err.message.includes('already exists')) {
        console.error('Error adding token_version column:', err);
      }
    });
    
    // Add is_master_admin column for Master Admin functionality
    db.run(`ALTER TABLE users ADD COLUMN is_master_admin INTEGER DEFAULT 0`, (err) => {
      if (err && !err.message.includes('duplicate column') && !err.message.includes('already exists')) {
        console.error('Error adding is_master_admin column:', err);
      }
    });

    // Add force_password_change column for password reset functionality
    db.run(`ALTER TABLE users ADD COLUMN force_password_change INTEGER DEFAULT 0`, (err) => {
      if (err && !err.message.includes('duplicate column') && !err.message.includes('already exists')) {
        console.error('Error adding force_password_change column:', err);
      }
    });

    // Add last_login column to track user login time
    db.run(`ALTER TABLE users ADD COLUMN last_login DATETIME`, (err) => {
      if (err && !err.message.includes('duplicate column') && !err.message.includes('already exists')) {
        console.error('Error adding last_login column:', err);
      }
    });

    // Add last_login_ip column to track IP address
    db.run(`ALTER TABLE users ADD COLUMN last_login_ip TEXT`, (err) => {
      if (err && !err.message.includes('duplicate column') && !err.message.includes('already exists')) {
        console.error('Error adding last_login_ip column:', err);
      }
    });

    // Add is_active column to enable/disable users
    db.run(`ALTER TABLE users ADD COLUMN is_active INTEGER DEFAULT 1`, (err) => {
      if (err && !err.message.includes('duplicate column') && !err.message.includes('already exists')) {
        console.error('Error adding is_active column:', err);
      }
    });

    // Add joined_via_group_code column to track which group code user used to register
    db.run(`ALTER TABLE users ADD COLUMN joined_via_group_code TEXT`, (err) => {
      if (err && !err.message.includes('duplicate column') && !err.message.includes('already exists')) {
        console.error('Error adding joined_via_group_code column:', err);
      }
    });

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
      join_method TEXT DEFAULT 'Unknown',
      FOREIGN KEY (server_id) REFERENCES servers(id),
      FOREIGN KEY (user_id) REFERENCES users(id),
      UNIQUE(server_id, user_id)
    )`);

    // Custom server roles table
    db.run(`CREATE TABLE IF NOT EXISTS server_roles (
      id TEXT PRIMARY KEY,
      server_id TEXT NOT NULL,
      name TEXT NOT NULL,
      color TEXT DEFAULT '#99aab5',
      permissions INTEGER DEFAULT 0,
      position INTEGER DEFAULT 0,
      is_default BOOLEAN DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (server_id) REFERENCES servers(id),
      UNIQUE(server_id, name)
    )`);

    // Member roles table (many-to-many relationship)
    db.run(`CREATE TABLE IF NOT EXISTS member_roles (
      id TEXT PRIMARY KEY,
      server_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      role_id TEXT NOT NULL,
      assigned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (server_id) REFERENCES servers(id),
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (role_id) REFERENCES server_roles(id),
      UNIQUE(server_id, user_id, role_id)
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
      is_pinned BOOLEAN DEFAULT 0,
      pinned_at DATETIME,
      pinned_by TEXT,
      forwarded_from TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      edited_at DATETIME,
      FOREIGN KEY (channel_id) REFERENCES channels(id),
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (pinned_by) REFERENCES users(id)
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
      is_group_code INTEGER DEFAULT 0,
      auto_join_channels TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (server_id) REFERENCES servers(id),
      FOREIGN KEY (created_by) REFERENCES users(id)
    )`);
    
    // Add is_group_code column if not exists
    db.run(`ALTER TABLE invites ADD COLUMN is_group_code INTEGER DEFAULT 0`, (err) => {
      if (err && !err.message.includes('duplicate column') && !err.message.includes('already exists')) {
        console.error('Error adding is_group_code column:', err);
      }
    });
    
    // Add auto_join_channels column if not exists
    db.run(`ALTER TABLE invites ADD COLUMN auto_join_channels TEXT`, (err) => {
      if (err && !err.message.includes('duplicate column') && !err.message.includes('already exists')) {
        console.error('Error adding auto_join_channels column:', err);
      }
    });

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

    // Audit log table for tracking server changes
    db.run(`CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      server_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      action TEXT NOT NULL,
      action_type TEXT NOT NULL,
      target_id TEXT,
      target_name TEXT,
      target_type TEXT,
      old_value TEXT,
      new_value TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (server_id) REFERENCES servers(id),
      FOREIGN KEY (user_id) REFERENCES users(id)
    )`);

    // DM Channels table for 1-on-1 and group direct messages
    db.run(`CREATE TABLE IF NOT EXISTS dm_channels (
      id TEXT PRIMARY KEY,
      name TEXT,
      type TEXT DEFAULT 'direct',
      creator_id TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (creator_id) REFERENCES users(id)
    )`);

    // DM Channel Members table for supporting multiple users
    db.run(`CREATE TABLE IF NOT EXISTS dm_channel_members (
      id TEXT PRIMARY KEY,
      channel_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (channel_id) REFERENCES dm_channels(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id),
      UNIQUE(channel_id, user_id)
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

    // Push Subscriptions table
    db.run(`CREATE TABLE IF NOT EXISTS push_subscriptions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      endpoint TEXT NOT NULL,
      p256dh TEXT NOT NULL,
      auth TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id),
      UNIQUE(user_id, endpoint)
    )`);

    // User Sessions table for device management
    db.run(`CREATE TABLE IF NOT EXISTS user_sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      device_type TEXT NOT NULL,
      device_name TEXT NOT NULL,
      browser TEXT,
      os TEXT,
      ip_address TEXT,
      location TEXT,
      last_active DATETIME DEFAULT CURRENT_TIMESTAMP,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      is_current BOOLEAN DEFAULT 0,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )`);

    // Channel Read Status table for tracking last read message per user per channel
    db.run(`CREATE TABLE IF NOT EXISTS channel_read_status (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      channel_id TEXT NOT NULL,
      last_read_message_id TEXT,
      last_read_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (channel_id) REFERENCES channels(id),
      UNIQUE(user_id, channel_id)
    )`);

    console.log('✅ Database initialized');
    
    // Run migrations
    runMigrations();
  });
}

// Database migrations
function runMigrations() {
  // Migration: Add is_pinned, pinned_at, pinned_by columns to messages if not exists
  db.all("PRAGMA table_info(messages)", (err, rows) => {
    if (err) {
      console.error('Migration error (messages):', err);
      return;
    }
    
    const hasIsPinned = rows.some(row => row.name === 'is_pinned');
    if (!hasIsPinned) {
      db.run('ALTER TABLE messages ADD COLUMN is_pinned BOOLEAN DEFAULT 0', (err) => {
        if (err) {
          console.error('Failed to add is_pinned column:', err);
        } else {
          console.log('✅ Migration: Added is_pinned column to messages');
        }
      });
    }
    
    const hasPinnedAt = rows.some(row => row.name === 'pinned_at');
    if (!hasPinnedAt) {
      db.run('ALTER TABLE messages ADD COLUMN pinned_at DATETIME', (err) => {
        if (err) {
          console.error('Failed to add pinned_at column:', err);
        } else {
          console.log('✅ Migration: Added pinned_at column to messages');
        }
      });
    }
    
    const hasPinnedBy = rows.some(row => row.name === 'pinned_by');
    if (!hasPinnedBy) {
      db.run('ALTER TABLE messages ADD COLUMN pinned_by TEXT', (err) => {
        if (err) {
          console.error('Failed to add pinned_by column:', err);
        } else {
          console.log('✅ Migration: Added pinned_by column to messages');
        }
      });
    }
    
    const hasForwardedFrom = rows.some(row => row.name === 'forwarded_from');
    if (!hasForwardedFrom) {
      db.run('ALTER TABLE messages ADD COLUMN forwarded_from TEXT', (err) => {
        if (err) {
          console.error('Failed to add forwarded_from column:', err);
        } else {
          console.log('✅ Migration: Added forwarded_from column to messages');
        }
      });
    }
  });

  // Migration: Add banner column to servers if not exists
  db.all("PRAGMA table_info(servers)", (err, rows) => {
    if (err) {
      console.error('Migration error (servers):', err);
      return;
    }
    
    const hasBanner = rows.some(row => row.name === 'banner');
    if (!hasBanner) {
      db.run('ALTER TABLE servers ADD COLUMN banner TEXT', (err) => {
        if (err) {
          console.error('Failed to add banner column:', err);
        } else {
          console.log('✅ Migration: Added banner column to servers');
        }
      });
    }
  });

  // Migration: Add role_id column to server_members if not exists
  db.all("PRAGMA table_info(server_members)", (err, rows) => {
    if (err) {
      console.error('Migration error:', err);
      return;
    }
    
    const hasRoleId = rows.some(row => row.name === 'role_id');
    if (!hasRoleId) {
      db.run('ALTER TABLE server_members ADD COLUMN role_id TEXT', (err) => {
        if (err) {
          console.error('Failed to add role_id column:', err);
        } else {
          console.log('✅ Migration: Added role_id column to server_members');
        }
      });
    }
    
    // Migration: Add join_method column
    const hasJoinMethod = rows.some(row => row.name === 'join_method');
    if (!hasJoinMethod) {
      db.run('ALTER TABLE server_members ADD COLUMN join_method TEXT DEFAULT "Unknown"', (err) => {
        if (err) {
          console.error('Failed to add join_method column:', err);
        } else {
          console.log('✅ Migration: Added join_method column to server_members');
        }
      });
    }
  });

  // Migration: Create default roles for existing servers
  db.all(`SELECT id, owner_id FROM servers WHERE id NOT IN (SELECT DISTINCT server_id FROM server_roles)`, (err, servers) => {
    if (err || !servers || servers.length === 0) return;
    
    servers.forEach(server => {
      // Create default roles for this server
      createDefaultRolesForServer(server.id);
    });
  });

  // Migration: Create user_server_access table for per-user server access control
  db.run(`CREATE TABLE IF NOT EXISTS user_server_access (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    server_id TEXT NOT NULL,
    is_allowed INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (server_id) REFERENCES servers(id) ON DELETE CASCADE,
    UNIQUE(user_id, server_id)
  )`);

  // Add indexes for faster queries
  db.run(`CREATE INDEX IF NOT EXISTS idx_user_server_access_user ON user_server_access(user_id)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_user_server_access_server ON user_server_access(server_id)`);

  // Migration: Create role_channel_access table for per-role channel access control
  db.run(`CREATE TABLE IF NOT EXISTS role_channel_access (
    id TEXT PRIMARY KEY,
    role_id TEXT NOT NULL,
    channel_id TEXT NOT NULL,
    is_allowed INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (role_id) REFERENCES server_roles(id) ON DELETE CASCADE,
    FOREIGN KEY (channel_id) REFERENCES channels(id) ON DELETE CASCADE,
    UNIQUE(role_id, channel_id)
  )`);

  // Add indexes for role_channel_access
  db.run(`CREATE INDEX IF NOT EXISTS idx_role_channel_access_role ON role_channel_access(role_id)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_role_channel_access_channel ON role_channel_access(channel_id)`);
}

// Create default roles for a server
function createDefaultRolesForServer(serverId) {
  const defaultRoles = [
    { name: 'Admin', color: '#ed4245', permissions: RolePermissions.admin, position: 3 },
    { name: 'Moderator', color: '#43b581', permissions: RolePermissions.moderator, position: 2 },
    { name: 'Member', color: '#99aab5', permissions: RolePermissions.member, position: 1, is_default: true },
  ];

  defaultRoles.forEach(role => {
    const id = uuidv4();
    db.run(
      `INSERT OR IGNORE INTO server_roles (id, server_id, name, color, permissions, position, is_default) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, serverId, role.name, role.color, role.permissions, role.position, role.is_default || 0]
    );
  });
}

// User operations
const userDB = {
  async create(username, email, password, groupCode = null) {
    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
    const id = uuidv4();
    const avatar = `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`;
    
    return new Promise((resolve, reject) => {
      db.run(
        'INSERT INTO users (id, username, email, password, avatar, joined_via_group_code) VALUES (?, ?, ?, ?, ?, ?)',
        [id, username, email, hashedPassword, avatar, groupCode],
        function(err) {
          if (err) reject(err);
          else resolve({ id, username, email, avatar, status: 'offline', joined_via_group_code: groupCode });
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

  // Find users by group code (for auto-friend feature)
  async findByGroupCode(groupCode) {
    return new Promise((resolve, reject) => {
      db.all(
        'SELECT id, username, email, display_name, avatar, status FROM users WHERE joined_via_group_code = ?',
        [groupCode],
        (err, rows) => {
          if (err) reject(err);
          else {
            // Map display_name to displayName
            rows.forEach(row => {
              row.displayName = row.display_name;
              delete row.display_name;
            });
            resolve(rows);
          }
        }
      );
    });
  },

  // Update last login timestamp and IP
  async updateLastLogin(userId, ipAddress) {
    return new Promise((resolve, reject) => {
      db.run(
        'UPDATE users SET last_login = CURRENT_TIMESTAMP, last_login_ip = ? WHERE id = ?',
        [ipAddress, userId],
        (err) => {
          if (err) reject(err);
          else resolve(true);
        }
      );
    });
  },

  // Toggle user active status (enable/disable)
  async toggleUserActive(userId, isActive) {
    return new Promise((resolve, reject) => {
      db.run(
        'UPDATE users SET is_active = ? WHERE id = ?',
        [isActive ? 1 : 0, userId],
        function(err) {
          if (err) reject(err);
          else resolve({ success: true, changes: this.changes });
        }
      );
    });
  },

  async findByUsername(username) {
    return new Promise((resolve, reject) => {
      // Use COLLATE NOCASE for case-insensitive search
      db.get('SELECT * FROM users WHERE username = ? COLLATE NOCASE', [username], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  },

  async findById(id, includePassword = false) {
    return new Promise((resolve, reject) => {
      const fields = includePassword 
        ? 'id, username, display_name, email, password, avatar, status, token_version, is_master_admin, created_at, joined_via_group_code'
        : 'id, username, display_name, email, avatar, status, token_version, is_master_admin, created_at, joined_via_group_code';
      db.get(`SELECT ${fields} FROM users WHERE id = ?`, [id], (err, row) => {
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
    if (updates.displayName !== undefined) {
      fields.push('display_name = ?');
      values.push(updates.displayName);
    }
    if (updates.avatar) {
      fields.push('avatar = ?');
      values.push(updates.avatar);
    }
    if (updates.status) {
      fields.push('status = ?');
      values.push(updates.status);
    }
    if (updates.badges !== undefined) {
      fields.push('badges = ?');
      values.push(JSON.stringify(updates.badges));
    }

    if (fields.length === 0) return true;
    
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
    const hashedPassword = await bcrypt.hash(newPassword, SALT_ROUNDS);
    return new Promise((resolve, reject) => {
      db.run(
        'UPDATE users SET password = ?, force_password_change = 0 WHERE id = ?',
        [hashedPassword, id],
        function(err) {
          if (err) reject(err);
          else resolve(true);
        }
      );
    });
  },

  // Admin reset password - sets temp password and forces user to change it on login
  async adminResetPassword(userId, tempPassword) {
    const hashedPassword = await bcrypt.hash(tempPassword, SALT_ROUNDS);
    return new Promise((resolve, reject) => {
      db.run(
        'UPDATE users SET password = ?, force_password_change = 1 WHERE id = ?',
        [hashedPassword, userId],
        function(err) {
          if (err) reject(err);
          else resolve(true);
        }
      );
    });
  },

  async verifyPassword(password, hashedPassword) {
    return bcrypt.compare(password, hashedPassword);
  },

  // Check if user needs to force change password
  async needsPasswordChange(userId) {
    return new Promise((resolve, reject) => {
      db.get(
        'SELECT force_password_change FROM users WHERE id = ?',
        [userId],
        (err, row) => {
          if (err) reject(err);
          else resolve(row?.force_password_change === 1);
        }
      );
    });
  },

  // Reset all users status to offline
  async resetAllStatus() {
    return new Promise((resolve, reject) => {
      db.run(
        "UPDATE users SET status = 'offline'",
        function(err) {
          if (err) reject(err);
          else resolve(true);
        }
      );
    });
  },

  // Search users (for Bug #4 - replace direct db.all in server.js)
  async search(query, excludeUserId = null, serverId = null, limit = 20) {
    return new Promise((resolve, reject) => {
      let sql;
      let params;
      
      if (serverId) {
        // Search within server members (for mention autocomplete)
        sql = `
          SELECT u.id, u.username, u.avatar, u.status, sm.role
          FROM users u
          JOIN server_members sm ON u.id = sm.user_id
          WHERE sm.server_id = ?
          AND u.username LIKE ?
          ${excludeUserId ? 'AND u.id != ?' : ''}
          ORDER BY 
            CASE sm.role 
              WHEN 'owner' THEN 1 
              WHEN 'admin' THEN 2 
              WHEN 'moderator' THEN 3 
              ELSE 4 
            END,
            u.username
          LIMIT ?
        `;
        params = [serverId, `${query}%`];
        if (excludeUserId) params.push(excludeUserId);
        params.push(limit);
      } else {
        // Regular user search
        sql = `
          SELECT id, username, avatar, status FROM users 
          WHERE username LIKE ? 
          ${excludeUserId ? 'AND id != ?' : ''}
          LIMIT ?
        `;
        params = [`%${query}%`];
        if (excludeUserId) params.push(excludeUserId);
        params.push(limit);
      }
      
      db.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  },

  // Get mutual server count between two users (for Bug #4)
  async getMutualServerCount(userId1, userId2) {
    return new Promise((resolve, reject) => {
      db.get(
        `SELECT COUNT(*) as count FROM server_members sm1
         JOIN server_members sm2 ON sm1.server_id = sm2.server_id
         WHERE sm1.user_id = ? AND sm2.user_id = ?`,
        [userId1, userId2],
        (err, row) => {
          if (err) reject(err);
          else resolve(row?.count || 0);
        }
      );
    });
  }
};

// User Server Access operations (for per-user server access control)
const userServerAccessDB = {
  // Grant or revoke access to a server for a user
  async setServerAccess(userId, serverId, isAllowed) {
    return new Promise((resolve, reject) => {
      const id = uuidv4();
      db.run(
        `INSERT INTO user_server_access (id, user_id, server_id, is_allowed, created_at)
         VALUES (?, ?, ?, ?, datetime('now'))
         ON CONFLICT(user_id, server_id) 
         DO UPDATE SET is_allowed = excluded.is_allowed`,
        [id, userId, serverId, isAllowed ? 1 : 0],
        function(err) {
          if (err) reject(err);
          else resolve({ id, userId, serverId, isAllowed });
        }
      );
    });
  },

  // Check if user has access to a server
  async hasServerAccess(userId, serverId) {
    return new Promise((resolve, reject) => {
      db.get(
        `SELECT is_allowed FROM user_server_access 
         WHERE user_id = ? AND server_id = ?`,
        [userId, serverId],
        (err, row) => {
          if (err) reject(err);
          else {
            // If no record exists, check server membership (default allow)
            if (!row) {
              db.get(
                `SELECT 1 FROM server_members WHERE user_id = ? AND server_id = ?`,
                [userId, serverId],
                (err2, memberRow) => {
                  if (err2) reject(err2);
                  else resolve(!!memberRow); // Allow if member, deny if not
                }
              );
            } else {
              resolve(row.is_allowed === 1);
            }
          }
        }
      );
    });
  },

  // Get all server access for a user
  async getUserServerAccess(userId) {
    return new Promise((resolve, reject) => {
      db.all(
        `SELECT s.id, s.name, s.icon,
                CASE WHEN usa.is_allowed IS NULL THEN 1 ELSE usa.is_allowed END as is_allowed
         FROM servers s
         JOIN server_members sm ON s.id = sm.server_id
         LEFT JOIN user_server_access usa ON s.id = usa.server_id AND usa.user_id = ?
         WHERE sm.user_id = ?
         ORDER BY s.name`,
        [userId, userId],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });
  },

  // Get all users with their server access
  async getAllUsersServerAccess() {
    return new Promise((resolve, reject) => {
      db.all(
        `SELECT u.id as user_id, u.username, u.display_name, u.avatar,
                s.id as server_id, s.name as server_name, s.icon as server_icon,
                usa.is_allowed
         FROM users u
         JOIN server_members sm ON u.id = sm.user_id
         JOIN servers s ON sm.server_id = s.id
         LEFT JOIN user_server_access usa ON u.id = usa.user_id AND s.id = usa.server_id
         ORDER BY u.username, s.name`,
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });
  },

  // Get all members with server access for a specific server
  async getServerMembersAccess(serverId) {
    return new Promise((resolve, reject) => {
      db.all(
        `SELECT u.id, u.username, u.display_name, u.avatar,
                CASE WHEN usa.is_allowed IS NULL THEN 1 ELSE usa.is_allowed END as is_allowed
         FROM users u
         JOIN server_members sm ON u.id = sm.user_id
         LEFT JOIN user_server_access usa ON u.id = usa.user_id AND usa.server_id = ?
         WHERE sm.server_id = ?
         ORDER BY u.username`,
        [serverId, serverId],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });
  },

  // Delete server access record
  async deleteServerAccess(userId, serverId) {
    return new Promise((resolve, reject) => {
      db.run(
        `DELETE FROM user_server_access WHERE user_id = ? AND server_id = ?`,
        [userId, serverId],
        function(err) {
          if (err) reject(err);
          else resolve({ changes: this.changes });
        }
      );
    });
  }
};

// Role-Channel Access operations (for controlling which channels each role can access)
const roleChannelAccessDB = {
  // Grant or revoke access to a channel for a role
  async setChannelAccess(roleId, channelId, isAllowed) {
    return new Promise((resolve, reject) => {
      const id = uuidv4();
      db.run(
        `INSERT INTO role_channel_access (id, role_id, channel_id, is_allowed, created_at)
         VALUES (?, ?, ?, ?, datetime('now'))
         ON CONFLICT(role_id, channel_id) 
         DO UPDATE SET is_allowed = excluded.is_allowed`,
        [id, roleId, channelId, isAllowed ? 1 : 0],
        function(err) {
          if (err) reject(err);
          else resolve({ id, roleId, channelId, isAllowed });
        }
      );
    });
  },

  // Check if role has access to a channel (for backend filtering)
  async hasChannelAccess(roleId, channelId) {
    return new Promise((resolve, reject) => {
      db.get(
        `SELECT is_allowed FROM role_channel_access 
         WHERE role_id = ? AND channel_id = ?`,
        [roleId, channelId],
        (err, row) => {
          if (err) reject(err);
          else {
            // If no record exists, default to allowed (backward compatible)
            resolve(!row || row.is_allowed === 1);
          }
        }
      );
    });
  },

  // Get all channel access for a specific role
  async getRoleChannelAccess(roleId) {
    return new Promise((resolve, reject) => {
      db.all(
        `SELECT c.id as channel_id, c.name as channel_name, c.type,
                CASE WHEN rca.is_allowed IS NULL THEN 1 ELSE rca.is_allowed END as is_allowed
         FROM channels c
         JOIN server_roles sr ON c.server_id = sr.server_id
         LEFT JOIN role_channel_access rca ON c.id = rca.channel_id AND rca.role_id = ?
         WHERE sr.id = ?
         ORDER BY c.name`,
        [roleId, roleId],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });
  },

  // Get all roles with their channel access for a specific server
  async getServerRolesChannelAccess(serverId) {
    return new Promise((resolve, reject) => {
      db.all(
        `SELECT sr.id as role_id, sr.name as role_name, sr.color,
                c.id as channel_id, c.name as channel_name, c.type,
                CASE WHEN rca.is_allowed IS NULL THEN 1 ELSE rca.is_allowed END as is_allowed
         FROM server_roles sr
         CROSS JOIN channels c ON c.server_id = sr.server_id
         LEFT JOIN role_channel_access rca ON sr.id = rca.role_id AND c.id = rca.channel_id
         WHERE sr.server_id = ?
         ORDER BY sr.position DESC, c.name`,
        [serverId],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });
  },

  // Delete channel access record
  async deleteChannelAccess(roleId, channelId) {
    return new Promise((resolve, reject) => {
      db.run(
        `DELETE FROM role_channel_access WHERE role_id = ? AND channel_id = ?`,
        [roleId, channelId],
        function(err) {
          if (err) reject(err);
          else resolve({ changes: this.changes });
        }
      );
    });
  },

  // Bulk update channel access for a role
  async bulkUpdateChannelAccess(roleId, channelAccessList) {
    return new Promise((resolve, reject) => {
      db.serialize(() => {
        db.run('BEGIN TRANSACTION');
        
        const stmt = db.prepare(
          `INSERT INTO role_channel_access (id, role_id, channel_id, is_allowed, created_at)
           VALUES (?, ?, ?, ?, datetime('now'))
           ON CONFLICT(role_id, channel_id) 
           DO UPDATE SET is_allowed = excluded.is_allowed`
        );
        
        channelAccessList.forEach(({ channelId, isAllowed }) => {
          stmt.run(uuidv4(), roleId, channelId, isAllowed ? 1 : 0);
        });
        
        stmt.finalize((err) => {
          if (err) {
            db.run('ROLLBACK');
            reject(err);
          } else {
            db.run('COMMIT');
            resolve({ success: true });
          }
        });
      });
    });
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

  async getById(serverId) {
    return new Promise((resolve, reject) => {
      db.get(
        'SELECT * FROM servers WHERE id = ?',
        [serverId],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
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

  async addMember(serverId, userId, role = 'member', joinMethod = 'Manual') {
    const id = uuidv4();
    return new Promise((resolve, reject) => {
      db.run(
        'INSERT OR IGNORE INTO server_members (id, server_id, user_id, role, join_method) VALUES (?, ?, ?, ?, ?)',
        [id, serverId, userId, role, joinMethod],
        function(err) {
          if (err) reject(err);
          else resolve(true);
        }
      );
    });
  },

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

  async getMembers(serverId) {
    return new Promise((resolve, reject) => {
      db.all(
        `SELECT u.id, u.username, u.display_name, u.avatar, u.badges, COALESCE(u.status, 'offline') as status, sm.role, sm.role_id,
                COALESCE(NULLIF(sr.name, ''), 
                  CASE sm.role
                    WHEN 'owner' THEN 'Owner'
                    WHEN 'admin' THEN 'Admin'
                    WHEN 'moderator' THEN 'Moderator'
                    WHEN 'custom' THEN 'Custom Role'
                    ELSE 'Member'
                  END
                ) as role_name, 
                COALESCE(NULLIF(sr.color, ''), CASE 
                  WHEN sm.role = 'owner' THEN '#ffd700'
                  WHEN sm.role = 'admin' THEN '#ed4245'
                  WHEN sm.role = 'moderator' THEN '#43b581'
                  ELSE '#99aab5'
                END) as role_color,
                sm.joined_at, u.created_at, sm.join_method,
                (SELECT GROUP_CONCAT(sr2.id || ':' || sr2.name || ':' || sr2.color, '|')
                 FROM member_roles mr
                 JOIN server_roles sr2 ON mr.role_id = sr2.id
                 WHERE mr.server_id = sm.server_id AND mr.user_id = sm.user_id
                ) as all_roles
         FROM users u
         JOIN server_members sm ON u.id = sm.user_id
         LEFT JOIN server_roles sr ON sm.role_id = sr.id
         WHERE sm.server_id = ?`,
        [serverId],
        (err, rows) => {
          if (err) reject(err);
          else {
            // Map display_name to displayName for frontend and parse roles
            rows.forEach(row => {
              row.displayName = row.display_name;
              row.joinedAt = row.joined_at;
              row.createdAt = row.created_at;
              try { row.badges = row.badges ? JSON.parse(row.badges) : []; } catch { row.badges = []; }
              
              // Parse all_roles into array
              if (row.all_roles) {
                row.roles = row.all_roles.split('|').map(r => {
                  const parts = r.split(':');
                  return { id: parts[0], name: parts[1], color: parts[2] };
                });
              } else {
                row.roles = [];
              }
              
              delete row.display_name;
              delete row.joined_at;
              delete row.created_at;
              delete row.all_roles;
            });
            resolve(rows);
          }
        }
      );
    });
  },

  async getMemberDetails(serverId, userId) {
    return new Promise((resolve, reject) => {
      db.get(
        `SELECT u.id, u.username, u.display_name, u.avatar, u.status, u.email, u.created_at,
                sm.role, sm.role_id, sm.joined_at, sm.join_method,
                COALESCE(NULLIF(sr.name, ''), 
                  CASE sm.role
                    WHEN 'owner' THEN 'Owner'
                    WHEN 'admin' THEN 'Admin'
                    WHEN 'moderator' THEN 'Moderator'
                    WHEN 'custom' THEN 'Custom Role'
                    ELSE 'Member'
                  END
                ) as role_name, 
                COALESCE(NULLIF(sr.color, ''), CASE 
                  WHEN sm.role = 'owner' THEN '#ffd700'
                  WHEN sm.role = 'admin' THEN '#ed4245'
                  WHEN sm.role = 'moderator' THEN '#43b581'
                  ELSE '#99aab5'
                END) as role_color
         FROM users u
         JOIN server_members sm ON u.id = sm.user_id
         LEFT JOIN server_roles sr ON sm.role_id = sr.id
         WHERE sm.server_id = ? AND u.id = ?`,
        [serverId, userId],
        (err, row) => {
          if (err) reject(err);
          else if (!row) resolve(null);
          else {
            // Map to frontend format
            resolve({
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
              joinMethod: row.join_method || 'Unknown'
            });
          }
        }
      );
    });
  },

  async findById(serverId) {
    return new Promise((resolve, reject) => {
      db.get(
        'SELECT * FROM servers WHERE id = ?',
        [serverId],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });
  },

  async isMember(serverId, userId) {
    return new Promise((resolve, reject) => {
      db.get('SELECT 1 FROM server_members WHERE server_id = ? AND user_id = ?', 
        [serverId, userId], (err, row) => {
        if (err) reject(err); else resolve(!!row);
      });
    });
  },

  // Update server info
  async update(serverId, updates) {
    const fields = [];
    const values = [];
    
    if (updates.name !== undefined) {
      fields.push('name = ?');
      values.push(updates.name);
    }
    if (updates.icon !== undefined) {
      fields.push('icon = ?');
      values.push(updates.icon);
    }
    if (updates.banner !== undefined) {
      fields.push('banner = ?');
      values.push(updates.banner);
    }
    
    if (fields.length === 0) {
      return Promise.resolve({ success: false, error: 'No updates provided' });
    }
    
    values.push(serverId);
    
    return new Promise((resolve, reject) => {
      db.run(
        `UPDATE servers SET ${fields.join(', ')} WHERE id = ?`,
        values,
        function(err) {
          if (err) reject(err);
          else resolve({ success: this.changes > 0 });
        }
      );
    });
  },

  // Transfer ownership to another member
  async transferOwnership(serverId, oldOwnerId, newOwnerId) {
    return new Promise((resolve, reject) => {
      db.serialize(() => {
        db.run('BEGIN TRANSACTION');
        
        // 1. Update server owner
        db.run(
          'UPDATE servers SET owner_id = ? WHERE id = ?',
          [newOwnerId, serverId],
          function(err) {
            if (err) {
              db.run('ROLLBACK');
              reject(err);
              return;
            }
            
            // 2. Update old owner role to admin
            db.run(
              "UPDATE server_members SET role = 'admin' WHERE server_id = ? AND user_id = ?",
              [serverId, oldOwnerId],
              function(err) {
                if (err) {
                  db.run('ROLLBACK');
                  reject(err);
                  return;
                }
                
                // 3. Update new owner role to owner
                db.run(
                  "UPDATE server_members SET role = 'owner' WHERE server_id = ? AND user_id = ?",
                  [serverId, newOwnerId],
                  function(err) {
                    if (err) {
                      db.run('ROLLBACK');
                      reject(err);
                      return;
                    }
                    
                    db.run('COMMIT');
                    resolve({ success: true });
                  }
                );
              }
            );
          }
        );
      });
    });
  },

  // Get member's role in a server
  async getMemberRole(serverId, userId) {
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

  // Delete server with cascading deletes (Bug #5 fix)
  async delete(serverId) {
    return new Promise((resolve, reject) => {
      db.serialize(() => {
        db.run('BEGIN TRANSACTION');
        
        // 1. Delete reactions for messages in this server's channels
        db.run(`
          DELETE FROM reactions WHERE message_id IN (
            SELECT m.id FROM messages m
            JOIN channels c ON m.channel_id = c.id
            WHERE c.server_id = ?
          )
        `, [serverId]);
        
        // 2. Delete messages in channels
        db.run(`
          DELETE FROM messages WHERE channel_id IN (
            SELECT id FROM channels WHERE server_id = ?
          )
        `, [serverId]);
        
        // 3. Delete channels
        db.run('DELETE FROM channels WHERE server_id = ?', [serverId]);
        
        // 4. Delete categories (Bug #5 fix)
        db.run('DELETE FROM categories WHERE server_id = ?', [serverId]);
        
        // 5. Delete custom role assignments
        db.run('DELETE FROM server_members WHERE server_id = ?', [serverId]);
        
        // 6. Delete server_roles (Bug #5 fix)
        db.run('DELETE FROM server_roles WHERE server_id = ?', [serverId]);
        
        // 7. Delete invites
        db.run('DELETE FROM invites WHERE server_id = ?', [serverId]);
        
        // 8. Delete bans
        db.run('DELETE FROM bans WHERE server_id = ?', [serverId]);
        
        // 9. Delete audit logs (Bug #5 fix)
        db.run('DELETE FROM audit_logs WHERE server_id = ?', [serverId]);
        
        // 10. Finally delete the server
        db.run('DELETE FROM servers WHERE id = ?', [serverId], function(err) {
          if (err) {
            db.run('ROLLBACK');
            reject(err);
          } else {
            db.run('COMMIT');
            resolve({ success: this.changes > 0 });
          }
        });
      });
    });
  }
};


// Helper: Run a db query as Promise (for abstraction)
function dbGet(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

function dbRun(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) reject(err);
      else resolve({ changes: this.changes, lastID: this.lastID });
    });
  });
}

function dbAll(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows || []);
    });
  });
}

// Role operations (Custom roles)
const roleDB = {
  // Create a new custom role
  async createRole(serverId, name, color = '#99aab5', permissions = 0, position = 0) {
    const id = uuidv4();
    return new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO server_roles (id, server_id, name, color, permissions, position) 
         VALUES (?, ?, ?, ?, ?, ?)`,
        [id, serverId, name, color, permissions, position],
        function(err) {
          if (err) reject(err);
          else resolve({ id, server_id: serverId, name, color, permissions, position });
        }
      );
    });
  },

  // Get all roles for a server
  async getServerRoles(serverId) {
    return new Promise((resolve, reject) => {
      db.all(
        `SELECT * FROM server_roles 
         WHERE server_id = ? 
         ORDER BY position DESC, created_at ASC`,
        [serverId],
        (err, rows) => {
          if (err) reject(err);
          else {
            // Map snake_case to camelCase for frontend
            const mapped = rows.map(row => ({
              id: row.id,
              serverId: row.server_id,
              name: row.name,
              color: row.color,
              permissions: row.permissions,
              position: row.position,
              isDefault: row.is_default === 1,
              createdAt: row.created_at
            }));
            resolve(mapped);
          }
        }
      );
    });
  },

  // Get role by ID
  async getRoleById(roleId) {
    return new Promise((resolve, reject) => {
      db.get(
        'SELECT * FROM server_roles WHERE id = ?',
        [roleId],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });
  },

  // Update role
  async updateRole(roleId, updates) {
    const { name, color, permissions, position } = updates;
    return new Promise((resolve, reject) => {
      db.run(
        `UPDATE server_roles 
         SET name = COALESCE(?, name), 
             color = COALESCE(?, color), 
             permissions = COALESCE(?, permissions),
             position = COALESCE(?, position)
         WHERE id = ?`,
        [name, color, permissions, position, roleId],
        function(err) {
          if (err) reject(err);
          else resolve({ id: roleId, ...updates });
        }
      );
    });
  },

  // Delete role
  async deleteRole(roleId) {
    return new Promise((resolve, reject) => {
      db.run(
        'DELETE FROM server_roles WHERE id = ? AND is_default = 0',
        [roleId],
        function(err) {
          if (err) reject(err);
          else resolve({ deleted: this.changes > 0 });
        }
      );
    });
  },

  // Normalize role positions to ensure they're sequential
  async normalizeRolePositions(serverId) {
    return new Promise(async (resolve, reject) => {
      try {
        // Get all custom roles sorted by position
        const roles = await new Promise((res, rej) => {
          db.all(
            `SELECT id, position FROM server_roles 
             WHERE server_id = ? AND is_default = 0
             ORDER BY position DESC, created_at ASC`,
            [serverId],
            (err, rows) => {
              if (err) rej(err);
              else res(rows);
            }
          );
        });
        
        // Update positions to be sequential starting from highest
        for (let i = 0; i < roles.length; i++) {
          const newPosition = roles.length - i;
          await new Promise((res, rej) => {
            db.run(
              'UPDATE server_roles SET position = ? WHERE id = ?',
              [newPosition, roles[i].id],
              (err) => {
                if (err) rej(err);
                else res();
              }
            );
          });
        }
        
        resolve(true);
      } catch (error) {
        reject(error);
      }
    });
  },

  // Get member count for a role
  async getMemberCount(roleId, serverId) {
    return new Promise((resolve, reject) => {
      db.get(
        `SELECT COUNT(*) as count 
         FROM member_roles 
         WHERE server_id = ? AND role_id = ?`,
        [serverId, roleId],
        (err, row) => {
          if (err) reject(err);
          else resolve(row?.count || 0);
        }
      );
    });
  },

  // Assign role to member (adds to member_roles table - supports multiple roles)
  async assignRole(serverId, userId, roleId) {
    return new Promise((resolve, reject) => {
      const id = uuidv4();
      db.run(
        `INSERT INTO member_roles (id, server_id, user_id, role_id)
         VALUES (?, ?, ?, ?)
         ON CONFLICT DO NOTHING`,
        [id, serverId, userId, roleId],
        function(err) {
          if (err) {
            // If table doesn't have UNIQUE constraint yet, try without ON CONFLICT
            if (err.message.includes('no such column') || err.message.includes('UNIQUE')) {
              db.run(
                `INSERT OR IGNORE INTO member_roles (id, server_id, user_id, role_id)
                 VALUES (?, ?, ?, ?)`,
                [id, serverId, userId, roleId],
                function(err2) {
                  if (err2) reject(err2);
                  else resolve({ success: this.changes > 0 });
                }
              );
            } else {
              reject(err);
            }
          }
          else resolve({ success: this.changes > 0 });
        }
      );
    });
  },

  // Set member role (legacy - for default roles)
  async setMemberRole(serverId, userId, role) {
    return new Promise((resolve, reject) => {
      db.run(
        `UPDATE server_members 
         SET role = ?, role_id = NULL
         WHERE server_id = ? AND user_id = ?`,
        [role, serverId, userId],
        function(err) {
          if (err) reject(err);
          else resolve({ success: this.changes > 0 });
        }
      );
    });
  },

  // Clear custom role from member (set to default)
  async clearMemberRole(serverId, userId) {
    return new Promise((resolve, reject) => {
      db.run(
        `UPDATE server_members 
         SET role_id = NULL
         WHERE server_id = ? AND user_id = ?`,
        [serverId, userId],
        function(err) {
          if (err) reject(err);
          else resolve({ success: this.changes > 0 });
        }
      );
    });
  },

  // Remove specific role from member
  async removeMemberRole(serverId, userId, roleId) {
    return new Promise((resolve, reject) => {
      db.run(
        `DELETE FROM member_roles 
         WHERE server_id = ? AND user_id = ? AND role_id = ?`,
        [serverId, userId, roleId],
        function(err) {
          if (err) reject(err);
          else resolve({ success: this.changes > 0 });
        }
      );
    });
  },

  // Get all member's roles (plural)
  async getMemberRoles(serverId, userId) {
    return new Promise((resolve, reject) => {
      db.all(
        `SELECT sr.id, sr.name, sr.color, sr.permissions, sr.position
         FROM member_roles mr
         JOIN server_roles sr ON mr.role_id = sr.id
         WHERE mr.server_id = ? AND mr.user_id = ?
         ORDER BY sr.position DESC`,
        [serverId, userId],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows || []);
        }
      );
    });
  },

  // Get member's role info
  async getMemberRole(serverId, userId) {
    return new Promise((resolve, reject) => {
      db.get(
        `SELECT sm.role, sm.role_id, sr.name as role_name, sr.color as role_color, sr.permissions
         FROM server_members sm
         LEFT JOIN server_roles sr ON sm.role_id = sr.id
         WHERE sm.server_id = ? AND sm.user_id = ?`,
        [serverId, userId],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });
  },

  // Get default role for a server
  async getDefaultRole(serverId) {
    return new Promise((resolve, reject) => {
      db.get(
        `SELECT * FROM server_roles 
         WHERE server_id = ? AND is_default = 1 
         LIMIT 1`,
        [serverId],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
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

  async getById(channelId) {
    return new Promise((resolve, reject) => {
      db.get('SELECT * FROM channels WHERE id = ?', [channelId], (err, row) => {
        if (err) reject(err); else resolve(row);
      });
    });
  },

  // Delete channel (for Bug #4)
  async delete(channelId) {
    return new Promise((resolve, reject) => {
      db.run('DELETE FROM channels WHERE id = ?', [channelId], function(err) {
        if (err) reject(err);
        else resolve({ success: this.changes > 0 });
      });
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
  async create(channelId, userId, content, replyToId = null, attachments = null, type = 'user', forwardedFrom = null) {
    const id = uuidv4();
    const timestamp = getCurrentTimestamp();
    
    // For system messages, userId can be null
    const actualUserId = type === 'system' ? (userId || 'system') : userId;
    
    return new Promise((resolve, reject) => {
      db.run(
        'INSERT INTO messages (id, channel_id, user_id, content, reply_to_id, attachments, forwarded_from, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [id, channelId, actualUserId, content, replyToId, attachments ? JSON.stringify(attachments) : null, forwardedFrom ? JSON.stringify(forwardedFrom) : null, timestamp],
        async function(err) {
          if (err) reject(err);
          else {
            const message = await messageDB.getById(id);
            resolve({ ...message, type });
          }
        }
      );
    });
  },

  async getById(id) {
    return new Promise((resolve, reject) => {
      db.get(
        `SELECT m.*, u.id as user_id, u.username, u.display_name, u.avatar, u.badges,
                c.server_id,
                sm.role_id, sr.name as role_name, sr.color as role_color,
                rm.id as reply_id, rm.content as reply_content,
                ru.id as reply_user_id, ru.username as reply_username, ru.display_name as reply_display_name, ru.avatar as reply_user_avatar,
                rsm.role_id as reply_role_id, rsr.name as reply_role_name, rsr.color as reply_role_color
         FROM messages m
         JOIN users u ON m.user_id = u.id
         JOIN channels c ON m.channel_id = c.id
         LEFT JOIN server_members sm ON m.user_id = sm.user_id AND c.server_id = sm.server_id
         LEFT JOIN server_roles sr ON sm.role_id = sr.id
         LEFT JOIN messages rm ON m.reply_to_id = rm.id
         LEFT JOIN users ru ON rm.user_id = ru.id
         LEFT JOIN channels rc ON rm.channel_id = rc.id
         LEFT JOIN server_members rsm ON rm.user_id = rsm.user_id AND rc.server_id = rsm.server_id
         LEFT JOIN server_roles rsr ON rsm.role_id = rsr.id
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
              // Parse forwarded_from if exists
              if (row.forwarded_from) {
                try {
                  row.forwardedFrom = JSON.parse(row.forwarded_from);
                } catch (e) {
                  row.forwardedFrom = null;
                }
              }
              // Format user object with displayName and role info
              let userBadges = [];
              try { userBadges = row.badges ? JSON.parse(row.badges) : []; } catch { userBadges = []; }
              row.user = {
                id: row.user_id,
                username: row.username,
                displayName: row.display_name,
                avatar: row.avatar,
                role_color: row.role_color,
                badges: userBadges
              };
              // Format replyTo object if exists
              if (row.reply_to_id) {
                row.replyTo = {
                  id: row.reply_id,
                  content: row.reply_content,
                  user: {
                    id: row.reply_user_id,
                    username: row.reply_username,
                    displayName: row.reply_display_name,
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
              delete row.display_name;
              delete row.avatar;
              delete row.channel_id;
              delete row.reply_to_id;
              delete row.created_at;
              delete row.reply_id;
              delete row.reply_content;
              delete row.reply_user_id;
              delete row.reply_username;
              delete row.reply_display_name;
              delete row.reply_user_avatar;
            }
            resolve(row);
          }
        }
      );
    });
  },

  async getByChannel(channelId, limit = 1000, offset = 0) {
    return new Promise((resolve, reject) => {
      db.all(
        `SELECT m.*, u.id as user_id, u.username, u.display_name, u.avatar, u.badges,
                c.server_id,
                sm.role_id, sr.name as role_name, sr.color as role_color,
                rm.id as reply_id, rm.content as reply_content,
                ru.id as reply_user_id, ru.username as reply_username, ru.display_name as reply_display_name, ru.avatar as reply_user_avatar,
                rsm.role_id as reply_role_id, rsr.name as reply_role_name, rsr.color as reply_role_color,
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
         JOIN channels c ON m.channel_id = c.id
         LEFT JOIN server_members sm ON m.user_id = sm.user_id AND c.server_id = sm.server_id
         LEFT JOIN server_roles sr ON sm.role_id = sr.id
         LEFT JOIN messages rm ON m.reply_to_id = rm.id
         LEFT JOIN users ru ON rm.user_id = ru.id
         LEFT JOIN server_members rsm ON rm.user_id = rsm.user_id AND c.server_id = rsm.server_id
         LEFT JOIN server_roles rsr ON rsm.role_id = rsr.id
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
              
              // Parse forwarded_from if exists
              if (row.forwarded_from) {
                try {
                  row.forwardedFrom = JSON.parse(row.forwarded_from);
                } catch (e) {
                  row.forwardedFrom = null;
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
              
              // Format user object with displayName and role info
              let userBadges = [];
              try { userBadges = row.badges ? JSON.parse(row.badges) : []; } catch { userBadges = []; }
              row.user = {
                id: row.user_id,
                username: row.username,
                displayName: row.display_name,
                avatar: row.avatar,
                role_color: row.role_color,
                badges: userBadges
              };
              // Format replyTo object if exists
              if (row.reply_to_id) {
                row.replyTo = {
                  id: row.reply_id,
                  content: row.reply_content,
                  user: {
                    id: row.reply_user_id,
                    username: row.reply_username,
                    displayName: row.reply_display_name,
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
              delete row.display_name;
              delete row.avatar;
              delete row.channel_id;
              delete row.reply_to_id;
              delete row.created_at;
              delete row.reply_id;
              delete row.reply_content;
              delete row.reply_user_id;
              delete row.reply_username;
              delete row.reply_display_name;
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
  },

  // Pin message
  async pin(messageId, userId) {
    return new Promise((resolve, reject) => {
      db.run(
        'UPDATE messages SET is_pinned = 1, pinned_at = datetime("now"), pinned_by = ? WHERE id = ?',
        [userId, messageId],
        async function(err) {
          if (err) reject(err);
          else {
            const message = await messageDB.getById(messageId);
            resolve(message);
          }
        }
      );
    });
  },

  // Unpin message
  async unpin(messageId) {
    return new Promise((resolve, reject) => {
      db.run(
        'UPDATE messages SET is_pinned = 0, pinned_at = NULL, pinned_by = NULL WHERE id = ?',
        [messageId],
        async function(err) {
          if (err) reject(err);
          else {
            const message = await messageDB.getById(messageId);
            resolve(message);
          }
        }
      );
    });
  },

  // Get pinned messages for a channel
  async getPinnedByChannel(channelId) {
    return new Promise((resolve, reject) => {
      db.all(
        `SELECT m.*, u.id as user_id, u.username, u.display_name, u.avatar, u.badges,
                p.username as pinned_by_username
         FROM messages m
         JOIN users u ON m.user_id = u.id
         LEFT JOIN users p ON m.pinned_by = p.id
         WHERE m.channel_id = ? AND m.is_pinned = 1
         ORDER BY m.pinned_at DESC`,
        [channelId],
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
              row.user = {
                id: row.user_id,
                username: row.username,
                displayName: row.display_name,
                avatar: row.avatar
              };
              row.pinnedBy = row.pinned_by_username;
              row.channelId = row.channel_id;
              row.userId = row.user_id;
              row.timestamp = row.created_at;
              delete row.user_id;
              delete row.username;
              delete row.display_name;
              delete row.avatar;
              delete row.channel_id;
              delete row.created_at;
              delete row.pinned_by_username;
            });
            resolve(rows);
          }
        }
      );
    });
  },


  // Message Search Feature
  async searchMessages(options) {
    const {
      serverId = null,
      channelId = null,
      userId = null,
      query = '',
      dateFrom = null,
      dateTo = null,
      hasAttachments = null,
      limit = 1000,
      offset = 0
    } = options;
    
    return new Promise((resolve, reject) => {
      let sql = `
        SELECT 
          m.id,
          m.content,
          m.created_at,
          m.reply_to_id,
          m.attachments,
          u.id as user_id,
          u.username,
          u.avatar,
          c.id as channel_id,
          c.name as channel_name,
          c.server_id
        FROM messages m
        JOIN users u ON m.user_id = u.id
        JOIN channels c ON m.channel_id = c.id
        WHERE 1=1
      `;
      const params = [];
      
      // Search by content (case-insensitive using LOWER)
      if (query) {
        sql += ` AND LOWER(m.content) LIKE LOWER(?)`;
        params.push(`%${query}%`);
      }
      
      // Filter by server
      if (serverId) {
        sql += ` AND c.server_id = ?`;
        params.push(serverId);
      }
      
      // Filter by channel
      if (channelId) {
        sql += ` AND m.channel_id = ?`;
        params.push(channelId);
      }
      
      // Filter by user
      if (userId) {
        sql += ` AND m.user_id = ?`;
        params.push(userId);
      }
      
      // Date range
      if (dateFrom) {
        sql += ` AND m.created_at >= ?`;
        params.push(dateFrom);
      }
      if (dateTo) {
        sql += ` AND m.created_at <= ?`;
        params.push(dateTo);
      }
      
      // Has attachments
      if (hasAttachments !== null) {
        sql += hasAttachments 
          ? ` AND m.attachments IS NOT NULL AND m.attachments != ''`
          : ` AND (m.attachments IS NULL OR m.attachments = '')`;
      }
      
      // Order by date (newest first)
      sql += ` ORDER BY m.created_at DESC`;
      
      // Pagination
      sql += ` LIMIT ? OFFSET ?`;
      params.push(limit, offset);
      
      // Debug log
      console.log('Search SQL:', sql);
      console.log('Search params:', params);
      
      db.all(sql, params, (err, rows) => {
        if (err) {
          console.error('Search SQL error:', err);
          reject(err);
        }
        else {
          console.log('Search results:', rows.length);
          resolve(rows);
        }
      });
    });
  },

  async getSearchResultCount(options) {
    const {
      serverId = null,
      channelId = null,
      userId = null,
      query = '',
      dateFrom = null,
      dateTo = null,
      hasAttachments = null
    } = options;
    
    return new Promise((resolve, reject) => {
      let sql = `
        SELECT COUNT(*) as count
        FROM messages m
        JOIN users u ON m.user_id = u.id
        JOIN channels c ON m.channel_id = c.id
        WHERE 1=1
      `;
      const params = [];
      
      // Search by content (case-insensitive using LOWER)
      if (query) {
        sql += ` AND LOWER(m.content) LIKE LOWER(?)`;
        params.push(`%${query}%`);
      }
      
      if (serverId) {
        sql += ` AND c.server_id = ?`;
        params.push(serverId);
      }
      
      if (channelId) {
        sql += ` AND m.channel_id = ?`;
        params.push(channelId);
      }
      
      if (userId) {
        sql += ` AND m.user_id = ?`;
        params.push(userId);
      }
      
      if (dateFrom) {
        sql += ` AND m.created_at >= ?`;
        params.push(dateFrom);
      }
      if (dateTo) {
        sql += ` AND m.created_at <= ?`;
        params.push(dateTo);
      }
      
      if (hasAttachments !== null) {
        sql += hasAttachments 
          ? ` AND m.attachments IS NOT NULL AND m.attachments != ''`
          : ` AND (m.attachments IS NULL OR m.attachments = '')`;
      }
      
      db.get(sql, params, (err, row) => {
        if (err) reject(err);
        else resolve(row?.count || 0);
      });
    });
  },

  // Channel Read Status operations
  async updateReadStatus(userId, channelId, messageId) {
    const id = uuidv4();
    const timestamp = getCurrentTimestamp();
    
    return new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO channel_read_status (id, user_id, channel_id, last_read_message_id, last_read_at) 
         VALUES (?, ?, ?, ?, ?)
         ON CONFLICT(user_id, channel_id) 
         DO UPDATE SET last_read_message_id = excluded.last_read_message_id, last_read_at = excluded.last_read_at`,
        [id, userId, channelId, messageId, timestamp],
        function(err) {
          if (err) reject(err);
          else resolve(true);
        }
      );
    });
  },

  async getReadStatus(userId, channelId) {
    return new Promise((resolve, reject) => {
      db.get(
        `SELECT last_read_message_id, last_read_at 
         FROM channel_read_status 
         WHERE user_id = ? AND channel_id = ?`,
        [userId, channelId],
        (err, row) => {
          if (err) reject(err);
          else resolve(row || null);
        }
      );
    });
  },

  async getUnreadCountForChannel(userId, channelId) {
    return new Promise((resolve, reject) => {
      db.get(
        `SELECT COUNT(*) as count 
         FROM messages m
         JOIN channels c ON m.channel_id = c.id
         JOIN server_members sm ON c.server_id = sm.server_id
         WHERE m.channel_id = ? 
           AND sm.user_id = ?
           AND m.user_id != ?
           AND m.created_at > IFNULL(
             (SELECT last_read_at FROM channel_read_status 
              WHERE user_id = ? AND channel_id = ?), 
             datetime('1970-01-01')
           )`,
        [channelId, userId, userId, userId, channelId],
        (err, row) => {
          if (err) reject(err);
          else resolve(row?.count || 0);
        }
      );
    });
  },

  async getUnreadCountForAllChannels(userId, serverId) {
    return new Promise((resolve, reject) => {
      db.all(
        `SELECT c.id as channel_id, 
                COUNT(m.id) as unread_count,
                MAX(CASE WHEN m.content LIKE '%<@' || ? || '>%' THEN 1 ELSE 0 END) as has_mention
         FROM channels c
         JOIN server_members sm ON c.server_id = sm.server_id
         LEFT JOIN messages m ON m.channel_id = c.id 
           AND m.user_id != ?
           AND m.created_at > IFNULL(
             (SELECT last_read_at FROM channel_read_status 
              WHERE user_id = ? AND channel_id = c.id), 
             datetime('1970-01-01')
           )
         WHERE c.server_id = ? AND sm.user_id = ?
         GROUP BY c.id`,
        [userId, userId, userId, serverId, userId],
        (err, rows) => {
          if (err) reject(err);
          else {
            const result = {};
            rows.forEach(row => {
              result[row.channel_id] = {
                count: row.unread_count || 0,
                hasMention: row.has_mention === 1
              };
            });
            resolve(result);
          }
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
        `SELECT i.*, u.username as created_by_username, u.avatar as created_by_avatar
         FROM invites i
         JOIN users u ON i.created_by = u.id
         WHERE i.server_id = ?
         ORDER BY i.created_at DESC`,
        [serverId],
        (err, rows) => {
          if (err) reject(err);
          else {
            // Map to frontend format
            const mapped = rows.map(row => ({
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
            resolve(mapped);
          }
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
  },

  async deleteInviteById(id) {
    return new Promise((resolve, reject) => {
      db.run(
        'DELETE FROM invites WHERE id = ?',
        [id],
        function(err) {
          if (err) reject(err);
          else resolve({ success: this.changes > 0 });
        }
      );
    });
  }
};

// Audit log operations
const auditLogDB = {
  async create(serverId, userId, action, actionType, targetId = null, targetName = null, targetType = null, oldValue = null, newValue = null) {
    const id = uuidv4();
    return new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO audit_logs (id, server_id, user_id, action, action_type, target_id, target_name, target_type, old_value, new_value) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, serverId, userId, action, actionType, targetId, targetName, targetType, oldValue, newValue],
        function(err) {
          if (err) reject(err);
          else resolve({ id });
        }
      );
    });
  },

  async getServerLogs(serverId) {
    return new Promise((resolve, reject) => {
      db.all(
        `SELECT al.*, u.username as user_name, u.avatar as user_avatar
         FROM audit_logs al
         JOIN users u ON al.user_id = u.id
         WHERE al.server_id = ?
         ORDER BY al.created_at DESC
         LIMIT 100`,
        [serverId],
        (err, rows) => {
          if (err) reject(err);
          else {
            const mapped = rows.map(row => ({
              id: row.id,
              serverId: row.server_id,
              userId: row.user_id,
              userName: row.user_name,
              userAvatar: row.user_avatar,
              action: row.action,
              actionType: row.action_type,
              targetId: row.target_id,
              targetName: row.target_name,
              targetType: row.target_type,
              oldValue: row.old_value,
              newValue: row.new_value,
              createdAt: row.created_at,
            }));
            resolve(mapped);
          }
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
  },

  async checkOwnership(messageId, userId, emoji) {
    return new Promise((resolve, reject) => {
      db.get('SELECT 1 FROM reactions WHERE message_id = ? AND user_id = ? AND emoji = ?',
        [messageId, userId, emoji], (err, row) => {
        if (err) reject(err); else resolve(!!row);
      });
    });
  },

  // BUG-010 FIX: Get reactions by message and user for ownership verification
  async getByMessageAndUser(messageId, userId) {
    return new Promise((resolve, reject) => {
      db.all(
        'SELECT * FROM reactions WHERE message_id = ? AND user_id = ?',
        [messageId, userId],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
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
        `SELECT u.id, u.username, u.display_name, u.avatar, u.status, f.created_at as friendship_date
         FROM friendships f
         JOIN users u ON f.friend_id = u.id
         WHERE f.user_id = ? AND f.status = ?
         ORDER BY u.username`,
        [userId, 'accepted'],
        (err, rows) => {
          if (err) reject(err);
          else {
            // Map display_name to displayName
            rows.forEach(row => {
              row.displayName = row.display_name;
              delete row.display_name;
            });
            resolve(rows);
          }
        }
      );
    });
  },

  // Get pending requests (incoming and outgoing)
  async getPendingRequests(userId) {
    return new Promise((resolve, reject) => {
      // Get incoming requests (others sent to me)
      db.all(
        `SELECT f.id, f.user_id, f.friend_id, f.status, f.created_at,
                u.id as requester_id, u.username as requester_username, u.display_name as requester_display_name, u.avatar as requester_avatar, u.status as requester_status
         FROM friendships f
         JOIN users u ON f.user_id = u.id
         WHERE f.friend_id = ? AND f.status = 'pending'
         ORDER BY f.created_at DESC`,
        [userId],
        (err, incomingRows) => {
          if (err) {
            reject(err);
            return;
          }

          // Get outgoing requests (I sent to others)
          db.all(
            `SELECT f.id, f.user_id, f.friend_id, f.status, f.created_at,
                    u.id as recipient_id, u.username as recipient_username, u.display_name as recipient_display_name, u.avatar as recipient_avatar, u.status as recipient_status
             FROM friendships f
             JOIN users u ON f.friend_id = u.id
             WHERE f.user_id = ? AND f.status = 'pending'
             ORDER BY f.created_at DESC`,
            [userId],
            (err2, outgoingRows) => {
              if (err2) reject(err2);
              else {
                resolve({
                  incoming: incomingRows || [],
                  outgoing: outgoingRows || []
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
        `SELECT u.id, u.username, u.display_name, u.avatar, f.created_at as blocked_date
         FROM friendships f
         JOIN users u ON f.friend_id = u.id
         WHERE f.user_id = ? AND f.status = ?
         ORDER BY f.created_at DESC`,
        [userId, 'blocked'],
        (err, rows) => {
          if (err) reject(err);
          else {
            // Map display_name to displayName
            rows.forEach(row => {
              row.display_name = row.display_name;
            });
            resolve(rows);
          }
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
  },

  // Get friend request by ID (for Bug #4)
  async getRequestById(requestId) {
    return new Promise((resolve, reject) => {
      db.get(
        'SELECT * FROM friendships WHERE id = ?',
        [requestId],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });
  },

  // Auto-friend for group code users (creates mutual friendship immediately)
  async createAutoFriendship(user1Id, user2Id) {
    return new Promise(async (resolve, reject) => {
      try {
        // Check if already friends
        const existing = await this.getFriendship(user1Id, user2Id);
        if (existing && existing.status === 'accepted') {
          resolve({ success: false, message: 'Already friends' });
          return;
        }

        // Delete any pending requests between them
        await dbRun(
          'DELETE FROM friendships WHERE (user_id = ? AND friend_id = ?) OR (user_id = ? AND friend_id = ?)',
          [user1Id, user2Id, user2Id, user1Id]
        );

        // Create mutual friendship (both directions)
        const id1 = uuidv4();
        const id2 = uuidv4();
        
        await dbRun(
          'INSERT INTO friendships (id, user_id, friend_id, status, created_at, updated_at) VALUES (?, ?, ?, ?, datetime("now"), datetime("now"))',
          [id1, user1Id, user2Id, 'accepted']
        );
        
        await dbRun(
          'INSERT INTO friendships (id, user_id, friend_id, status, created_at, updated_at) VALUES (?, ?, ?, ?, datetime("now"), datetime("now"))',
          [id2, user2Id, user1Id, 'accepted']
        );
        
        resolve({ success: true, message: 'Auto-friendship created' });
      } catch (err) {
        reject(err);
      }
    });
  }
};


// DM (Direct Message) operations
const dmDB = {
  // Create a direct DM channel (1-on-1)
  async createDMChannel(user1Id, user2Id) {
    // Check if channel already exists between these two users
    const existingChannel = await this.getDMChannelBetweenUsers(user1Id, user2Id);
    if (existingChannel) {
      return existingChannel;
    }

    const id = uuidv4();
    return new Promise((resolve, reject) => {
      db.run(
        'INSERT INTO dm_channels (id, type, creator_id, created_at, updated_at) VALUES (?, \'direct\', ?, datetime("now"), datetime("now"))',
        [id, user1Id],
        async function(err) {
          if (err) reject(err);
          else {
            // Add both users as members
            await dbRun(
              'INSERT INTO dm_channel_members (id, channel_id, user_id, joined_at) VALUES (?, ?, ?, datetime("now"))',
              [uuidv4(), id, user1Id]
            );
            await dbRun(
              'INSERT INTO dm_channel_members (id, channel_id, user_id, joined_at) VALUES (?, ?, ?, datetime("now"))',
              [uuidv4(), id, user2Id]
            );
            const channel = await dmDB.getDMChannelById(id);
            resolve(channel);
          }
        }
      );
    });
  },

  // Create a group DM channel
  async createGroupDMChannel(creatorId, userIds, name = null) {
    // Validate all users are friends with creator
    const allUserIds = [creatorId, ...userIds.filter(id => id !== creatorId)];
    
    const id = uuidv4();
    // Generate default name if not provided
    const groupName = name || 'Grup Baru';
    
    return new Promise((resolve, reject) => {
      db.run(
        'INSERT INTO dm_channels (id, name, type, creator_id, created_at, updated_at) VALUES (?, ?, \'group\', ?, datetime("now"), datetime("now"))',
        [id, groupName, creatorId],
        async function(err) {
          if (err) reject(err);
          else {
            // Add all users as members
            for (const userId of allUserIds) {
              await dbRun(
                'INSERT INTO dm_channel_members (id, channel_id, user_id, joined_at) VALUES (?, ?, ?, datetime("now"))',
                [uuidv4(), id, userId]
              );
            }
            const channel = await dmDB.getDMChannelById(id);
            resolve(channel);
          }
        }
      );
    });
  },

  // Get DM channel between two users (direct only)
  async getDMChannelBetweenUsers(user1Id, user2Id) {
    return new Promise((resolve, reject) => {
      db.get(
        `SELECT dc.* FROM dm_channels dc
         JOIN dm_channel_members m1 ON dc.id = m1.channel_id AND m1.user_id = ?
         JOIN dm_channel_members m2 ON dc.id = m2.channel_id AND m2.user_id = ?
         WHERE dc.type = 'direct'
         LIMIT 1`,
        [user1Id, user2Id],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });
  },

  // Get DM channel by ID with members
  async getDMChannelById(channelId) {
    return new Promise((resolve, reject) => {
      db.get(
        `SELECT dc.* FROM dm_channels dc WHERE dc.id = ?`,
        [channelId],
        async (err, row) => {
          if (err) {
            reject(err);
            return;
          }
          if (!row) {
            resolve(null);
            return;
          }
          
          // Get all members
          const members = await dmDB.getChannelMembers(channelId);
          row.members = members;
          
          // For direct channels, identify the "friend" (other user)
          if (row.type === 'direct' && members.length === 2) {
            // Will be set based on requesting user context
            row.friend = null;
          }
          
          resolve(row);
        }
      );
    });
  },

  // Get all members of a DM channel
  async getChannelMembers(channelId) {
    return new Promise((resolve, reject) => {
      db.all(
        `SELECT u.id, u.username, u.display_name, u.avatar, u.status, m.joined_at
         FROM dm_channel_members m
         JOIN users u ON m.user_id = u.id
         WHERE m.channel_id = ?
         ORDER BY m.joined_at`,
        [channelId],
        (err, rows) => {
          if (err) reject(err);
          else {
            // Map display_name to displayName
            rows.forEach(row => {
              row.displayName = row.display_name;
              delete row.display_name;
            });
            resolve(rows);
          }
        }
      );
    });
  },

  // Check if user is a member of a DM channel
  async isChannelMember(channelId, userId) {
    return new Promise((resolve, reject) => {
      db.get(
        'SELECT 1 FROM dm_channel_members WHERE channel_id = ? AND user_id = ?',
        [channelId, userId],
        (err, row) => {
          if (err) reject(err);
          else resolve(!!row);
        }
      );
    });
  },

  // Add member to DM channel
  async addChannelMember(channelId, userId) {
    return new Promise((resolve, reject) => {
      db.run(
        'INSERT OR IGNORE INTO dm_channel_members (id, channel_id, user_id, joined_at) VALUES (?, ?, ?, datetime("now"))',
        [uuidv4(), channelId, userId],
        async function(err) {
          if (err) reject(err);
          else {
            const member = await userDB.findById(userId);
            resolve({ success: this.changes > 0, member });
          }
        }
      );
    });
  },

  // Remove member from DM channel
  async removeChannelMember(channelId, userId) {
    return new Promise((resolve, reject) => {
      db.run(
        'DELETE FROM dm_channel_members WHERE channel_id = ? AND user_id = ?',
        [channelId, userId],
        function(err) {
          if (err) reject(err);
          else resolve({ success: this.changes > 0 });
        }
      );
    });
  },

  // Get channel creator
  async getChannelCreator(channelId) {
    return new Promise((resolve, reject) => {
      db.get(
        'SELECT creator_id FROM dm_channels WHERE id = ?',
        [channelId],
        (err, row) => {
          if (err) reject(err);
          else resolve(row?.creator_id);
        }
      );
    });
  },

  // Get all DM channels for a user
  async getUserDMChannels(userId) {
    return new Promise((resolve, reject) => {
      db.all(
        `SELECT dc.id, dc.name, dc.type, dc.creator_id, dc.created_at, dc.updated_at,
                (SELECT content FROM dm_messages WHERE channel_id = dc.id ORDER BY created_at DESC LIMIT 1) as last_message,
                (SELECT created_at FROM dm_messages WHERE channel_id = dc.id ORDER BY created_at DESC LIMIT 1) as last_message_at,
                (SELECT COUNT(*) FROM dm_messages WHERE channel_id = dc.id AND sender_id != ? AND is_read = 0) as unread_count
         FROM dm_channels dc
         JOIN dm_channel_members m ON dc.id = m.channel_id
         WHERE m.user_id = ?
         ORDER BY COALESCE(last_message_at, dc.updated_at) DESC`,
        [userId, userId],
        async (err, rows) => {
          if (err) {
            reject(err);
            return;
          }
          
          // Fetch members for each channel
          const channelsWithMembers = await Promise.all(
            rows.map(async (row) => {
              const members = await dmDB.getChannelMembers(row.id);
              return {
                ...row,
                members,
                // For direct messages, identify the friend
                friend: row.type === 'direct' 
                  ? members.find(m => m.id !== userId) || members[0]
                  : null
              };
            })
          );
          
          resolve(channelsWithMembers);
        }
      );
    });
  },

  // Update group DM name
  async updateGroupName(channelId, name) {
    return new Promise((resolve, reject) => {
      db.run(
        'UPDATE dm_channels SET name = ?, updated_at = datetime("now") WHERE id = ? AND type = \'group\'',
        [name, channelId],
        function(err) {
          if (err) reject(err);
          else resolve({ success: this.changes > 0 });
        }
      );
    });
  },

  // Send DM message
  async sendDMMessage(channelId, senderId, content, attachments = null) {
    const id = uuidv4();
    
    // Validate and format attachments
    let attachmentsJson = null;
    if (attachments) {
      try {
        // If attachments is already a string, parse it first
        const attachmentsArray = typeof attachments === 'string' 
          ? JSON.parse(attachments) 
          : attachments;
        
        // Ensure it's an array
        if (Array.isArray(attachmentsArray) && attachmentsArray.length > 0) {
          attachmentsJson = JSON.stringify(attachmentsArray);
        }
      } catch (e) {
        console.error('Error formatting attachments:', e);
        attachmentsJson = null;
      }
    }
    
    const timestamp = getCurrentTimestamp();
    
    return new Promise((resolve, reject) => {
      db.run(
        'INSERT INTO dm_messages (id, channel_id, sender_id, content, attachments, created_at) VALUES (?, ?, ?, ?, ?, ?)',
        [id, channelId, senderId, content, attachmentsJson, timestamp],
        async function(err) {
          if (err) {
            console.error('Error inserting DM message:', err);
            reject(err);
          }
          else {
            // Update channel updated_at
            db.run('UPDATE dm_channels SET updated_at = ? WHERE id = ?', [timestamp, channelId]);
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
        `SELECT dm.*, u.username as sender_username, u.display_name as sender_display_name, u.avatar as sender_avatar
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
  async getDMMessages(channelId, limit = 1000, offset = 0) {
    return new Promise((resolve, reject) => {
      db.all(
        `SELECT dm.*, u.username as sender_username, u.display_name as sender_display_name, u.avatar as sender_avatar
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

  // Get DM message by ID
  async getDMMessageById(messageId) {
    return new Promise((resolve, reject) => {
      db.get(
        'SELECT * FROM dm_messages WHERE id = ?',
        [messageId],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
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
         JOIN dm_channel_members m ON dm.channel_id = m.channel_id
         WHERE m.user_id = ? 
           AND dm.sender_id != ? 
           AND dm.is_read = 0`,
        [userId, userId],
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
         JOIN dm_channel_members m ON dm.channel_id = m.channel_id
         WHERE m.user_id = ? 
           AND dm.sender_id != ? 
           AND dm.is_read = 0
         GROUP BY dm.channel_id`,
        [userId, userId],
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
      // Delete members first
      db.run('DELETE FROM dm_channel_members WHERE channel_id = ?', [channelId], (err) => {
        if (err) {
          reject(err);
          return;
        }
        // Delete messages
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
    });
  },

  // Leave DM channel (for group DMs)
  async leaveDMChannel(channelId, userId) {
    return new Promise((resolve, reject) => {
      // Remove user from members
      db.run(
        'DELETE FROM dm_channel_members WHERE channel_id = ? AND user_id = ?',
        [channelId, userId],
        async function(err) {
          if (err) {
            reject(err);
            return;
          }
          
          // Check remaining member count
          const remaining = await dbGet(
            'SELECT COUNT(*) as count FROM dm_channel_members WHERE channel_id = ?',
            [channelId]
          );
          
          // If no members left, delete the channel
          if (remaining.count === 0) {
            await dmDB.deleteDMChannel(channelId);
          }
          
          resolve({ success: this.changes > 0 });
        }
      );
    });
  }
};

// Push Subscriptions database operations
const subscriptionDB = {
  async create(userId, subscription) {
    const id = uuidv4();
    const { endpoint, keys } = subscription;
    return new Promise((resolve, reject) => {
      db.run(
        `INSERT OR REPLACE INTO push_subscriptions (id, user_id, endpoint, p256dh, auth) 
         VALUES (?, ?, ?, ?, ?)`,
        [id, userId, endpoint, keys.p256dh, keys.auth],
        function(err) {
          if (err) reject(err);
          else resolve({ id, userId, endpoint });
        }
      );
    });
  },

  async remove(userId, endpoint) {
    return new Promise((resolve, reject) => {
      db.run(
        'DELETE FROM push_subscriptions WHERE user_id = ? AND endpoint = ?',
        [userId, endpoint],
        function(err) {
          if (err) reject(err);
          else resolve({ success: this.changes > 0 });
        }
      );
    });
  },

  async getByUser(userId) {
    return new Promise((resolve, reject) => {
      db.all(
        'SELECT * FROM push_subscriptions WHERE user_id = ?',
        [userId],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });
  },

  async removeAllByUser(userId) {
    return new Promise((resolve, reject) => {
      db.run(
        'DELETE FROM push_subscriptions WHERE user_id = ?',
        [userId],
        function(err) {
          if (err) reject(err);
          else resolve({ success: true });
        }
      );
    });
  }
};

// Custom Emoji and Stickers Database
const emojiDB = {
  // Create custom emoji
  async createEmoji(name, url, serverId, uploaderId, isGlobal = false, isAnimated = false) {
    const id = uuidv4();
    return new Promise((resolve, reject) => {
      db.run(
        'INSERT INTO custom_emojis (id, name, url, server_id, uploader_id, is_global, is_animated) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [id, name, url, serverId, uploaderId, isGlobal ? 1 : 0, isAnimated ? 1 : 0],
        function(err) {
          if (err) reject(err);
          else resolve({ id, name, url, serverId, uploaderId, isGlobal, isAnimated });
        }
      );
    });
  },

  // Get emojis by server (including global emojis)
  async getEmojisByServer(serverId) {
    return new Promise((resolve, reject) => {
      db.all(
        `SELECT e.*, u.username as uploader_username 
         FROM custom_emojis e
         LEFT JOIN users u ON e.uploader_id = u.id
         WHERE e.server_id = ? OR e.is_global = 1
         ORDER BY e.is_global DESC, e.created_at DESC`,
        [serverId],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });
  },

  // Get global emojis only
  async getGlobalEmojis() {
    return new Promise((resolve, reject) => {
      db.all(
        `SELECT e.*, u.username as uploader_username 
         FROM custom_emojis e
         LEFT JOIN users u ON e.uploader_id = u.id
         WHERE e.is_global = 1
         ORDER BY e.created_at DESC`,
        [],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });
  },

  // Delete emoji
  async deleteEmoji(emojiId, uploaderId) {
    return new Promise((resolve, reject) => {
      db.run(
        'DELETE FROM custom_emojis WHERE id = ? AND (uploader_id = ? OR is_global = 0)',
        [emojiId, uploaderId],
        function(err) {
          if (err) reject(err);
          else resolve({ success: this.changes > 0 });
        }
      );
    });
  }
};

const stickerDB = {
  // Create sticker
  async createSticker(name, description, url, serverId, uploaderId, isGlobal = false) {
    const id = uuidv4();
    return new Promise((resolve, reject) => {
      db.run(
        'INSERT INTO stickers (id, name, description, url, server_id, uploader_id, is_global) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [id, name, description, url, serverId, uploaderId, isGlobal ? 1 : 0],
        function(err) {
          if (err) reject(err);
          else resolve({ id, name, description, url, serverId, uploaderId, isGlobal });
        }
      );
    });
  },

  // Get stickers by server (including global stickers)
  async getStickersByServer(serverId) {
    return new Promise((resolve, reject) => {
      db.all(
        `SELECT s.*, u.username as uploader_username 
         FROM stickers s
         LEFT JOIN users u ON s.uploader_id = u.id
         WHERE s.server_id = ? OR s.is_global = 1
         ORDER BY s.is_global DESC, s.created_at DESC`,
        [serverId],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });
  },

  // Get global stickers only
  async getGlobalStickers() {
    return new Promise((resolve, reject) => {
      db.all(
        `SELECT s.*, u.username as uploader_username 
         FROM stickers s
         LEFT JOIN users u ON s.uploader_id = u.id
         WHERE s.is_global = 1
         ORDER BY s.created_at DESC`,
        [],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });
  },

  // Create sticker pack
  async createStickerPack(name, description, thumbnail, serverId, creatorId, isGlobal = false) {
    const id = uuidv4();
    return new Promise((resolve, reject) => {
      db.run(
        'INSERT INTO sticker_packs (id, name, description, thumbnail, server_id, creator_id, is_global) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [id, name, description, thumbnail, serverId, creatorId, isGlobal ? 1 : 0],
        function(err) {
          if (err) reject(err);
          else resolve({ id, name, description, thumbnail, serverId, creatorId, isGlobal });
        }
      );
    });
  },

  // Add sticker to pack
  async addStickerToPack(packId, stickerId, position = 0) {
    return new Promise((resolve, reject) => {
      db.run(
        'INSERT OR IGNORE INTO sticker_pack_items (pack_id, sticker_id, position) VALUES (?, ?, ?)',
        [packId, stickerId, position],
        function(err) {
          if (err) reject(err);
          else resolve({ success: true });
        }
      );
    });
  },

  // Get sticker packs with stickers
  async getStickerPacks(serverId) {
    return new Promise((resolve, reject) => {
      db.all(
        `SELECT sp.*, u.username as creator_username 
         FROM sticker_packs sp
         LEFT JOIN users u ON sp.creator_id = u.id
         WHERE sp.server_id = ? OR sp.is_global = 1
         ORDER BY sp.is_global DESC, sp.created_at DESC`,
        [serverId],
        async (err, packs) => {
          if (err) {
            reject(err);
            return;
          }
          
          // Get stickers for each pack
          const packsWithStickers = await Promise.all(
            packs.map(async (pack) => {
              const stickers = await this.getStickersInPack(pack.id);
              return { ...pack, stickers };
            })
          );
          
          resolve(packsWithStickers);
        }
      );
    });
  },

  // Get stickers in a pack
  async getStickersInPack(packId) {
    return new Promise((resolve, reject) => {
      db.all(
        `SELECT s.*, spi.position 
         FROM stickers s
         JOIN sticker_pack_items spi ON s.id = spi.sticker_id
         WHERE spi.pack_id = ?
         ORDER BY spi.position`,
        [packId],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });
  },

  // Delete sticker
  async deleteSticker(stickerId, uploaderId) {
    return new Promise((resolve, reject) => {
      db.run(
        'DELETE FROM stickers WHERE id = ? AND (uploader_id = ? OR is_global = 0)',
        [stickerId, uploaderId],
        function(err) {
          if (err) reject(err);
          else resolve({ success: this.changes > 0 });
        }
      );
    });
  }
};

// Session/Device management
const sessionDB = {
  // Create new session
  async createSession(userId, sessionData) {
    const id = uuidv4();
    const {
      deviceType,
      deviceName,
      browser,
      os,
      ipAddress,
      location,
      isCurrent = false
    } = sessionData;
    
    return new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO user_sessions (id, user_id, device_type, device_name, browser, os, ip_address, location, is_current)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, userId, deviceType, deviceName, browser, os, ipAddress, location, isCurrent ? 1 : 0],
        function(err) {
          if (err) reject(err);
          else resolve({ id, userId, deviceType, deviceName, browser, os, ipAddress, location, isCurrent });
        }
      );
    });
  },

  // Get all sessions for a user
  async getUserSessions(userId) {
    return new Promise((resolve, reject) => {
      db.all(
        `SELECT id, user_id, device_type, device_name, browser, os, ip_address, location, 
                last_active, created_at, is_current
         FROM user_sessions 
         WHERE user_id = ?
         ORDER BY is_current DESC, last_active DESC`,
        [userId],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows || []);
        }
      );
    });
  },

  // Update session last active
  async updateLastActive(sessionId) {
    return new Promise((resolve, reject) => {
      db.run(
        'UPDATE user_sessions SET last_active = CURRENT_TIMESTAMP WHERE id = ?',
        [sessionId],
        function(err) {
          if (err) reject(err);
          else resolve({ success: true });
        }
      );
    });
  },

  // Delete a specific session
  async deleteSession(sessionId, userId) {
    return new Promise((resolve, reject) => {
      db.run(
        'DELETE FROM user_sessions WHERE id = ? AND user_id = ?',
        [sessionId, userId],
        function(err) {
          if (err) reject(err);
          else resolve({ success: this.changes > 0 });
        }
      );
    });
  },

  // Delete all other sessions (logout from all devices except current)
  async deleteOtherSessions(userId, currentSessionId) {
    return new Promise((resolve, reject) => {
      db.run(
        'DELETE FROM user_sessions WHERE user_id = ? AND id != ?',
        [userId, currentSessionId],
        function(err) {
          if (err) reject(err);
          else resolve({ success: true, count: this.changes });
        }
      );
    });
  },

  // Delete all sessions for a user (logout from all devices)
  async deleteAllUserSessions(userId) {
    return new Promise((resolve, reject) => {
      db.run(
        'DELETE FROM user_sessions WHERE user_id = ?',
        [userId],
        function(err) {
          if (err) reject(err);
          else resolve({ success: true, count: this.changes });
        }
      );
    });
  },

  // Get session by ID
  async getSessionById(sessionId) {
    return new Promise((resolve, reject) => {
      db.get(
        'SELECT * FROM user_sessions WHERE id = ?',
        [sessionId],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });
  },

  // Mark session as current
  async markAsCurrent(sessionId, userId) {
    return new Promise((resolve, reject) => {
      db.run(
        'UPDATE user_sessions SET is_current = 0 WHERE user_id = ?',
        [userId],
        (err) => {
          if (err) {
            reject(err);
            return;
          }
          db.run(
            'UPDATE user_sessions SET is_current = 1 WHERE id = ? AND user_id = ?',
            [sessionId, userId],
            function(err2) {
              if (err2) reject(err2);
              else resolve({ success: true });
            }
          );
        }
      );
    });
  }
};

// ============================================
// GROUP CODES DATABASE
// ============================================

const groupCodeDB = {
  // Create group codes table
  async createTable() {
    return new Promise((resolve, reject) => {
      db.run(`
        CREATE TABLE IF NOT EXISTS group_codes (
          id TEXT PRIMARY KEY,
          code TEXT UNIQUE NOT NULL,
          server_id TEXT NOT NULL,
          created_by TEXT NOT NULL,
          max_uses INTEGER,
          used_count INTEGER DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (server_id) REFERENCES servers(id) ON DELETE CASCADE,
          FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
        )
      `, (err) => {
        if (err) reject(err);
        else resolve(true);
      });
    });
  },

  // Create a new group code
  async create(code, serverId, createdBy, maxUses = null) {
    const id = uuidv4();
    return new Promise((resolve, reject) => {
      db.run(
        'INSERT INTO group_codes (id, code, server_id, created_by, max_uses) VALUES (?, ?, ?, ?, ?)',
        [id, code.toUpperCase(), serverId, createdBy, maxUses],
        function(err) {
          if (err) {
            if (err.message.includes('UNIQUE constraint failed')) {
              reject(new Error('Kode grup sudah ada'));
            } else {
              reject(err);
            }
          } else {
            resolve({ id, code: code.toUpperCase(), server_id: serverId, created_by: createdBy, max_uses: maxUses });
          }
        }
      );
    });
  },

  // Get all group codes with details
  async getAll() {
    return new Promise((resolve, reject) => {
      db.all(`
        SELECT 
          gc.*,
          s.name as server_name,
          u.username as creator_username
        FROM group_codes gc
        LEFT JOIN servers s ON gc.server_id = s.id
        LEFT JOIN users u ON gc.created_by = u.id
        ORDER BY gc.created_at DESC
      `, [], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  },

  // Get group code by code string
  async getByCode(code) {
    return new Promise((resolve, reject) => {
      db.get(
        'SELECT * FROM group_codes WHERE code = ?',
        [code.toUpperCase()],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });
  },

  // Increment usage count
  async incrementUsage(code) {
    return new Promise((resolve, reject) => {
      db.run(
        'UPDATE group_codes SET used_count = used_count + 1 WHERE code = ?',
        [code.toUpperCase()],
        function(err) {
          if (err) reject(err);
          else resolve({ success: true });
        }
      );
    });
  },

  // Check if code is still valid
  async isValid(code) {
    const groupCode = await this.getByCode(code);
    if (!groupCode) return false;
    if (groupCode.max_uses && groupCode.used_count >= groupCode.max_uses) return false;
    return true;
  },

  // Delete group code
  async delete(id) {
    return new Promise((resolve, reject) => {
      db.run(
        'DELETE FROM group_codes WHERE id = ?',
        [id],
        function(err) {
          if (err) reject(err);
          else resolve({ success: true, changes: this.changes });
        }
      );
    });
  }
};

// Initialize group codes table
groupCodeDB.createTable().catch(console.error);

// Dummy pool for compatibility with PostgreSQL interface
const pool = { query: () => Promise.resolve({ rows: [] }) };

// Import Master Admin DB
const { masterAdminDB } = require('./database-master-admin');

module.exports = {
  pool,
  db,
  dbGet,
  dbRun,
  dbAll,
  subscriptionDB,
  initDatabase,
  userDB,
  serverDB,
  roleDB,
  categoryDB,
  channelDB,
  messageDB,
  inviteDB,
  reactionDB,
  permissionDB,
  friendDB,
  dmDB,
  auditLogDB,
  emojiDB,
  stickerDB,
  sessionDB,
  masterAdminDB,
  groupCodeDB,
  userServerAccessDB,
  roleChannelAccessDB,
  Permissions,
  RolePermissions,
  RoleHierarchy,
  adminResetPassword: userDB.adminResetPassword,
  needsPasswordChange: userDB.needsPasswordChange,
  updateLastLogin: userDB.updateLastLogin,
  toggleUserActive: userDB.toggleUserActive
};
