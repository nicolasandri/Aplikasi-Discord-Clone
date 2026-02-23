const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

const dbPath = path.join(__dirname, 'workgrid.db');
const db = new sqlite3.Database(dbPath);

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

    // Channels table
    db.run(`CREATE TABLE IF NOT EXISTS channels (
      id TEXT PRIMARY KEY,
      server_id TEXT NOT NULL,
      name TEXT NOT NULL,
      type TEXT DEFAULT 'text',
      position INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (server_id) REFERENCES servers(id)
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

    // Friend requests table
    db.run(`CREATE TABLE IF NOT EXISTS friendships (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      friend_id TEXT NOT NULL,
      status TEXT DEFAULT 'pending',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (friend_id) REFERENCES users(id),
      UNIQUE(user_id, friend_id)
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

// Channel operations
const channelDB = {
  async create(serverId, name, type = 'text') {
    const id = uuidv4();
    return new Promise((resolve, reject) => {
      db.run(
        'INSERT INTO channels (id, server_id, name, type) VALUES (?, ?, ?, ?)',
        [id, serverId, name, type],
        function(err) {
          if (err) reject(err);
          else resolve({ id, server_id: serverId, name, type });
        }
      );
    });
  },

  async getByServer(serverId) {
    return new Promise((resolve, reject) => {
      db.all(
        'SELECT * FROM channels WHERE server_id = ? ORDER BY position',
        [serverId],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
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

module.exports = {
  db,
  initDatabase,
  userDB,
  serverDB,
  channelDB,
  messageDB,
  inviteDB,
  reactionDB
};
