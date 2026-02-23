require('dotenv').config();

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');

const { db, initDatabase, userDB, serverDB, categoryDB, channelDB, messageDB, inviteDB, reactionDB, permissionDB, friendDB, dmDB, Permissions } = require('./database');
const { checkPermission, requireServerOwner, canManageMember, fetchPermissions } = require('./middleware/permissions');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
    allowedHeaders: ["Authorization", "Content-Type"],
    credentials: true
  }
});

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.error('ERROR: JWT_SECRET not set!');
  process.exit(1);
}

// Initialize database
initDatabase();

// Seed data
async function seedData() {
  const bcrypt = require('bcryptjs');
  
  // Check if admin exists
  const admin = await userDB.findByEmail('admin@workgrid.com');
  if (!admin) {
    const hashedPassword = await bcrypt.hash('admin123', 10);
    const adminId = uuidv4();
    
    db.run(
      'INSERT INTO users (id, username, email, password, avatar, status) VALUES (?, ?, ?, ?, ?, ?)',
      [adminId, 'Admin', 'admin@workgrid.com', hashedPassword, 'https://api.dicebear.com/7.x/avataaars/svg?seed=Admin', 'online']
    );
    
    // Create default server
    const serverId = uuidv4();
    db.run(
      'INSERT INTO servers (id, name, icon, owner_id) VALUES (?, ?, ?, ?)',
      [serverId, 'WorkGrid Official', 'https://api.dicebear.com/7.x/identicon/svg?seed=WorkGrid', adminId]
    );
    
    // Add admin as member
    db.run(
      'INSERT INTO server_members (id, server_id, user_id, role) VALUES (?, ?, ?, ?)',
      [uuidv4(), serverId, adminId, 'owner']
    );
    
    // Create channels
    const channels = [
      { name: 'selamat-datang', type: 'text' },
      { name: 'umum', type: 'text' },
      { name: 'bantuan', type: 'text' },
      { name: 'Suara Umum', type: 'voice' }
    ];
    
    channels.forEach(ch => {
      db.run(
        'INSERT INTO channels (id, server_id, name, type) VALUES (?, ?, ?, ?)',
        [uuidv4(), serverId, ch.name, ch.type]
      );
    });
    
    console.log('✅ Seed data created');
  }
}

seedData();

// Enable CORS for all routes
app.use(cors({
  origin: "*",
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Authorization", "Content-Type"],
  credentials: true
}));
app.use(express.json());

// Create uploads directory
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowedMimes = [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp',
      'application/pdf', 'application/msword', 
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain', 'application/zip'
    ];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type'), false);
    }
  }
});

// Serve static files
app.use(express.static(path.join(__dirname, '../app/dist')));
app.use('/uploads', express.static(uploadsDir));

// JWT Middleware
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'Access denied' });
  }
  
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid token' });
    req.userId = user.id;
    next();
  });
}

// Root route
app.get('/', (req, res) => {
  res.json({
    status: '✅ WorkGrid Server is Running!',
    version: '2.0.0',
    features: [
      'Authentication with JWT',
      'Real-time messaging',
      'File uploads',
      'Server & Channels',
      'Direct Messages',
      'User Profiles',
      'Server Invites'
    ]
  });
});

// ==================== AUTH ROUTES ====================

// Register
app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;
    
    // Input validation
    if (!username || !email || !password) {
      return res.status(400).json({ error: 'All fields are required' });
    }
    
    // Username validation
    if (username.length < 3 || username.length > 30) {
      return res.status(400).json({ error: 'Username must be between 3 and 30 characters' });
    }
    
    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      return res.status(400).json({ error: 'Username can only contain letters, numbers, and underscores' });
    }
    
    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }
    
    // Password validation
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }
    
    // Check email uniqueness
    const existingUser = await userDB.findByEmail(email);
    if (existingUser) {
      return res.status(400).json({ error: 'Email already registered' });
    }
    
    // Check username uniqueness
    const existingUsername = await userDB.findByUsername(username);
    if (existingUsername) {
      return res.status(400).json({ error: 'Username already taken' });
    }
    
    const user = await userDB.create(username, email, password);
    const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: '7d' });
    
    res.json({ user, token });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// Login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Input validation
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }
    
    const user = await userDB.findByEmail(email);
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const validPassword = await userDB.verifyPassword(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    await userDB.updateProfile(user.id, { status: 'online' });
    
    const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: '7d' });
    const { password: _, ...userWithoutPassword } = user;
    
    res.json({ user: userWithoutPassword, token });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// ==================== USER ROUTES ====================

// Get current user
app.get('/api/users/me', authenticateToken, async (req, res) => {
  try {
    const user = await userDB.findById(req.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get user' });
  }
});

// Update profile
app.put('/api/users/profile', authenticateToken, async (req, res) => {
  try {
    const { username } = req.body;
    await userDB.updateProfile(req.userId, { username });
    const user = await userDB.findById(req.userId);
    res.json({ success: true, user });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// Change password
app.put('/api/users/password', authenticateToken, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await userDB.findById(req.userId);
    
    const validPassword = await userDB.verifyPassword(currentPassword, user.password);
    if (!validPassword) {
      return res.status(400).json({ error: 'Current password is incorrect' });
    }
    
    await userDB.updatePassword(req.userId, newPassword);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to change password' });
  }
});

// Upload avatar
app.post('/api/users/avatar', authenticateToken, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    const avatarUrl = `/uploads/${req.file.filename}`;
    await userDB.updateProfile(req.userId, { avatar: avatarUrl });
    
    res.json({ success: true, avatar: avatarUrl });
  } catch (error) {
    res.status(500).json({ error: 'Failed to upload avatar' });
  }
});

// Get user profile with role in specific server
app.get('/api/servers/:serverId/users/:userId', authenticateToken, async (req, res) => {
  try {
    const { serverId, userId } = req.params;
    
    // Get user info
    const user = await userDB.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Get user's role in this server
    const member = await new Promise((resolve, reject) => {
      db.get(
        'SELECT role FROM server_members WHERE server_id = ? AND user_id = ?',
        [serverId, userId],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });
    
    res.json({
      ...user,
      role: member?.role || 'member'
    });
  } catch (error) {
    console.error('Get user profile error:', error);
    res.status(500).json({ error: 'Failed to get user profile' });
  }
});

// Update user role (owner/admin with hierarchy check)
app.put('/api/servers/:serverId/members/:userId/role', authenticateToken, async (req, res) => {
  try {
    const { serverId, userId } = req.params;
    const { role } = req.body;
    const requesterId = req.userId;
    
    // Validate role
    const validRoles = ['member', 'moderator', 'admin'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }
    
    // Check if target user exists in server
    const targetMember = await new Promise((resolve, reject) => {
      db.get(
        'SELECT role FROM server_members WHERE server_id = ? AND user_id = ?',
        [serverId, userId],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });
    
    if (!targetMember) {
      return res.status(404).json({ error: 'Member not found' });
    }
    
    // Prevent changing owner's role
    const isTargetOwner = await permissionDB.isServerOwner(userId, serverId);
    if (isTargetOwner) {
      return res.status(403).json({ error: 'Cannot change owner\'s role' });
    }
    
    // Check if requester can manage this user
    const canManage = await permissionDB.canManageUser(requesterId, userId, serverId);
    if (!canManage) {
      return res.status(403).json({ error: 'You cannot manage this user' });
    }
    
    // Admin can only assign moderator or member, not admin
    const requesterRole = await permissionDB.getUserRole(requesterId, serverId);
    if (requesterRole === 'admin' && role === 'admin') {
      return res.status(403).json({ error: 'Only owner can assign admin role' });
    }
    
    // Update role
    await permissionDB.updateMemberRole(serverId, userId, role);
    
    res.json({ success: true, userId, role });
  } catch (error) {
    console.error('Update role error:', error);
    res.status(500).json({ error: 'Failed to update role' });
  }
});

// Kick member from server
app.delete('/api/servers/:serverId/members/:userId', authenticateToken, async (req, res) => {
  try {
    const { serverId, userId } = req.params;
    const requesterId = req.userId;
    
    // Check if target is owner
    const isTargetOwner = await permissionDB.isServerOwner(userId, serverId);
    if (isTargetOwner) {
      return res.status(403).json({ error: 'Cannot kick server owner' });
    }
    
    // Check if requester can manage this user
    const canManage = await permissionDB.canManageUser(requesterId, userId, serverId);
    if (!canManage) {
      return res.status(403).json({ error: 'You cannot kick this user' });
    }
    
    await permissionDB.removeMember(serverId, userId);
    
    res.json({ success: true, message: 'Member kicked' });
  } catch (error) {
    console.error('Kick member error:', error);
    res.status(500).json({ error: 'Failed to kick member' });
  }
});

// Ban member from server
app.post('/api/servers/:serverId/bans/:userId', authenticateToken, async (req, res) => {
  try {
    const { serverId, userId } = req.params;
    const { reason } = req.body;
    const requesterId = req.userId;
    
    // Check permission (BAN_MEMBERS)
    const hasPermission = await permissionDB.hasPermission(requesterId, serverId, Permissions.BAN_MEMBERS);
    if (!hasPermission) {
      return res.status(403).json({ error: 'You do not have permission to ban members' });
    }
    
    // Check if target is owner
    const isTargetOwner = await permissionDB.isServerOwner(userId, serverId);
    if (isTargetOwner) {
      return res.status(403).json({ error: 'Cannot ban server owner' });
    }
    
    // Check if requester can manage this user
    const canManage = await permissionDB.canManageUser(requesterId, userId, serverId);
    if (!canManage) {
      return res.status(403).json({ error: 'You cannot ban this user' });
    }
    
    await permissionDB.banMember(serverId, userId, reason);
    
    res.json({ success: true, message: 'Member banned' });
  } catch (error) {
    console.error('Ban member error:', error);
    res.status(500).json({ error: 'Failed to ban member' });
  }
});

// Get user's permissions in a server
app.get('/api/servers/:serverId/permissions', authenticateToken, async (req, res) => {
  try {
    const { serverId } = req.params;
    const userId = req.userId;
    
    const role = await permissionDB.getUserRole(userId, serverId);
    const permissions = await permissionDB.getUserPermissions(userId, serverId);
    const isOwner = await permissionDB.isServerOwner(userId, serverId);
    
    res.json({
      role,
      permissions,
      isOwner,
      canManageMessages: (permissions & Permissions.MANAGE_MESSAGES) === Permissions.MANAGE_MESSAGES,
      canManageChannels: (permissions & Permissions.MANAGE_CHANNELS) === Permissions.MANAGE_CHANNELS,
      canKickMembers: (permissions & Permissions.KICK_MEMBERS) === Permissions.KICK_MEMBERS,
      canBanMembers: (permissions & Permissions.BAN_MEMBERS) === Permissions.BAN_MEMBERS,
    });
  } catch (error) {
    console.error('Get permissions error:', error);
    res.status(500).json({ error: 'Failed to get permissions' });
  }
});

// ==================== SERVER ROUTES ====================

// Get user servers
app.get('/api/servers', authenticateToken, async (req, res) => {
  try {
    const servers = await serverDB.getUserServers(req.userId);
    res.json(servers);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get servers' });
  }
});

// Create server
app.post('/api/servers', authenticateToken, async (req, res) => {
  try {
    const { name, icon } = req.body;
    const serverIcon = icon || `https://api.dicebear.com/7.x/identicon/svg?seed=${name}`;
    
    const server = await serverDB.create(name, serverIcon, req.userId);
    await serverDB.addMember(server.id, req.userId, 'owner');
    
    // Create default channels
    await channelDB.create(server.id, 'general', 'text');
    await channelDB.create(server.id, 'random', 'text');
    await channelDB.create(server.id, 'General Voice', 'voice');
    
    res.json(server);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create server' });
  }
});

// Delete server (owner only)
app.delete('/api/servers/:serverId', authenticateToken, requireServerOwner, async (req, res) => {
  try {
    const { serverId } = req.params;
    
    // Delete in correct order to maintain referential integrity
    // 1. Delete reactions for messages in this server's channels
    await new Promise((resolve, reject) => {
      db.run(`
        DELETE FROM reactions WHERE message_id IN (
          SELECT m.id FROM messages m
          JOIN channels c ON m.channel_id = c.id
          WHERE c.server_id = ?
        )
      `, [serverId], (err) => {
        if (err) reject(err);
        else resolve(true);
      });
    });
    
    // 2. Delete messages in channels
    await new Promise((resolve, reject) => {
      db.run(`
        DELETE FROM messages WHERE channel_id IN (
          SELECT id FROM channels WHERE server_id = ?
        )
      `, [serverId], (err) => {
        if (err) reject(err);
        else resolve(true);
      });
    });
    
    // 3. Delete channels
    await new Promise((resolve, reject) => {
      db.run('DELETE FROM channels WHERE server_id = ?', [serverId], (err) => {
        if (err) reject(err);
        else resolve(true);
      });
    });
    
    // 4. Delete server members
    await new Promise((resolve, reject) => {
      db.run('DELETE FROM server_members WHERE server_id = ?', [serverId], (err) => {
        if (err) reject(err);
        else resolve(true);
      });
    });
    
    // 5. Delete invites
    await new Promise((resolve, reject) => {
      db.run('DELETE FROM invites WHERE server_id = ?', [serverId], (err) => {
        if (err) reject(err);
        else resolve(true);
      });
    });
    
    // 6. Delete bans
    await new Promise((resolve, reject) => {
      db.run('DELETE FROM bans WHERE server_id = ?', [serverId], (err) => {
        if (err) reject(err);
        else resolve(true);
      });
    });
    
    // 7. Delete server
    await new Promise((resolve, reject) => {
      db.run('DELETE FROM servers WHERE id = ?', [serverId], (err) => {
        if (err) reject(err);
        else resolve(true);
      });
    });
    
    res.json({ success: true });
  } catch (error) {
    console.error('Delete server error:', error);
    res.status(500).json({ error: 'Failed to delete server' });
  }
});

// Get server channels
app.get('/api/servers/:serverId/channels', authenticateToken, async (req, res) => {
  try {
    const { serverId } = req.params;
    const channels = await channelDB.getByServer(serverId);
    res.json(channels);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get channels' });
  }
});

// Create channel (requires MANAGE_CHANNELS permission)
app.post('/api/servers/:serverId/channels', authenticateToken, checkPermission(Permissions.MANAGE_CHANNELS), async (req, res) => {
  try {
    const { serverId } = req.params;
    const { name, type } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: 'Channel name is required' });
    }
    
    const channel = await channelDB.create(serverId, name, type || 'text');
    res.json(channel);
  } catch (error) {
    console.error('Create channel error:', error);
    res.status(500).json({ error: 'Failed to create channel' });
  }
});

// Delete channel (requires MANAGE_CHANNELS permission)
app.delete('/api/channels/:channelId', authenticateToken, async (req, res) => {
  try {
    const { channelId } = req.params;
    
    // Get channel to find server
    const channel = await new Promise((resolve, reject) => {
      db.get('SELECT server_id FROM channels WHERE id = ?', [channelId], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
    
    if (!channel) {
      return res.status(404).json({ error: 'Channel not found' });
    }
    
    // Check permission
    const hasPermission = await permissionDB.hasPermission(req.userId, channel.server_id, Permissions.MANAGE_CHANNELS);
    if (!hasPermission) {
      return res.status(403).json({ error: 'You do not have permission to delete channels' });
    }
    
    await new Promise((resolve, reject) => {
      db.run('DELETE FROM channels WHERE id = ?', [channelId], function(err) {
        if (err) reject(err);
        else resolve(true);
      });
    });
    
    res.json({ success: true });
  } catch (error) {
    console.error('Delete channel error:', error);
    res.status(500).json({ error: 'Failed to delete channel' });
  }
});

// ==================== CATEGORY ROUTES ====================

// Create category (requires MANAGE_CHANNELS permission)
app.post('/api/servers/:serverId/categories', authenticateToken, async (req, res) => {
  try {
    const { serverId } = req.params;
    const { name, position = 0 } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: 'Category name is required' });
    }
    
    // Check permission
    const hasPermission = await permissionDB.hasPermission(req.userId, serverId, Permissions.MANAGE_CHANNELS);
    if (!hasPermission) {
      return res.status(403).json({ error: 'You do not have permission to manage channels' });
    }
    
    const category = await categoryDB.create(serverId, name, position);
    
    // Emit socket event
    io.to(serverId).emit('category_created', { serverId, category });
    
    res.json(category);
  } catch (error) {
    console.error('Create category error:', error);
    res.status(500).json({ error: 'Failed to create category' });
  }
});

// Get all categories in server with their channels
app.get('/api/servers/:serverId/categories', authenticateToken, async (req, res) => {
  try {
    const { serverId } = req.params;
    
    // Get categories
    const categories = await categoryDB.getByServer(serverId);
    
    // Get all channels in server
    const allChannels = await channelDB.getByServer(serverId);
    
    // Group channels by category
    const categoriesWithChannels = categories.map(cat => ({
      ...cat,
      channels: allChannels.filter(ch => ch.category_id === cat.id)
    }));
    
    // Get uncategorized channels
    const uncategorizedChannels = allChannels.filter(ch => !ch.category_id);
    
    res.json({
      categories: categoriesWithChannels,
      uncategorized: uncategorizedChannels
    });
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({ error: 'Failed to get categories' });
  }
});

// Update category (requires MANAGE_CHANNELS permission)
app.put('/api/categories/:categoryId', authenticateToken, async (req, res) => {
  try {
    const { categoryId } = req.params;
    const { name, position } = req.body;
    
    // Get category to find server
    const category = await categoryDB.getById(categoryId);
    if (!category) {
      return res.status(404).json({ error: 'Category not found' });
    }
    
    // Check permission
    const hasPermission = await permissionDB.hasPermission(req.userId, category.server_id, Permissions.MANAGE_CHANNELS);
    if (!hasPermission) {
      return res.status(403).json({ error: 'You do not have permission to manage channels' });
    }
    
    const updates = {};
    if (name) updates.name = name;
    if (typeof position === 'number') updates.position = position;
    
    await categoryDB.update(categoryId, updates);
    
    // Emit socket event
    io.to(category.server_id).emit('category_updated', { 
      categoryId, 
      updates,
      serverId: category.server_id
    });
    
    res.json({ success: true });
  } catch (error) {
    console.error('Update category error:', error);
    res.status(500).json({ error: 'Failed to update category' });
  }
});

// Delete category (requires MANAGE_CHANNELS permission)
app.delete('/api/categories/:categoryId', authenticateToken, async (req, res) => {
  try {
    const { categoryId } = req.params;
    
    // Get category to find server
    const category = await categoryDB.getById(categoryId);
    if (!category) {
      return res.status(404).json({ error: 'Category not found' });
    }
    
    // Check permission
    const hasPermission = await permissionDB.hasPermission(req.userId, category.server_id, Permissions.MANAGE_CHANNELS);
    if (!hasPermission) {
      return res.status(403).json({ error: 'You do not have permission to manage channels' });
    }
    
    await categoryDB.delete(categoryId);
    
    // Emit socket event
    io.to(category.server_id).emit('category_deleted', { 
      categoryId, 
      serverId: category.server_id 
    });
    
    res.json({ success: true });
  } catch (error) {
    console.error('Delete category error:', error);
    res.status(500).json({ error: 'Failed to delete category' });
  }
});

// Move channel to category (requires MANAGE_CHANNELS permission)
app.put('/api/channels/:channelId/move', authenticateToken, async (req, res) => {
  try {
    const { channelId } = req.params;
    const { categoryId, position } = req.body;
    
    // Get channel
    const channel = await new Promise((resolve, reject) => {
      db.get('SELECT * FROM channels WHERE id = ?', [channelId], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
    
    if (!channel) {
      return res.status(404).json({ error: 'Channel not found' });
    }
    
    // Check permission
    const hasPermission = await permissionDB.hasPermission(req.userId, channel.server_id, Permissions.MANAGE_CHANNELS);
    if (!hasPermission) {
      return res.status(403).json({ error: 'You do not have permission to manage channels' });
    }
    
    // If moving to a category, verify category exists and is in same server
    if (categoryId) {
      const category = await categoryDB.getById(categoryId);
      if (!category || category.server_id !== channel.server_id) {
        return res.status(400).json({ error: 'Invalid category' });
      }
    }
    
    await channelDB.moveToCategory(channelId, categoryId, position);
    
    // Emit socket event
    io.to(channel.server_id).emit('channel_moved', { 
      channelId, 
      categoryId, 
      position,
      serverId: channel.server_id
    });
    
    res.json({ success: true });
  } catch (error) {
    console.error('Move channel error:', error);
    res.status(500).json({ error: 'Failed to move channel' });
  }
});

// Reorder categories (requires MANAGE_CHANNELS permission)
app.put('/api/servers/:serverId/categories/reorder', authenticateToken, async (req, res) => {
  try {
    const { serverId } = req.params;
    const { categoryIds } = req.body;
    
    if (!Array.isArray(categoryIds)) {
      return res.status(400).json({ error: 'categoryIds must be an array' });
    }
    
    // Check permission
    const hasPermission = await permissionDB.hasPermission(req.userId, serverId, Permissions.MANAGE_CHANNELS);
    if (!hasPermission) {
      return res.status(403).json({ error: 'You do not have permission to manage channels' });
    }
    
    await categoryDB.reorder(serverId, categoryIds);
    
    // Emit socket event
    io.to(serverId).emit('categories_reordered', { serverId, categoryIds });
    
    res.json({ success: true });
  } catch (error) {
    console.error('Reorder categories error:', error);
    res.status(500).json({ error: 'Failed to reorder categories' });
  }
});

// Bulk reorder channels (requires MANAGE_CHANNELS permission)
app.put('/api/servers/:serverId/channels/reorder', authenticateToken, async (req, res) => {
  try {
    const { serverId } = req.params;
    const { channels } = req.body;
    
    if (!Array.isArray(channels)) {
      return res.status(400).json({ error: 'channels must be an array' });
    }
    
    // Check permission
    const hasPermission = await permissionDB.hasPermission(req.userId, serverId, Permissions.MANAGE_CHANNELS);
    if (!hasPermission) {
      return res.status(403).json({ error: 'You do not have permission to manage channels' });
    }
    
    await channelDB.reorder(channels);
    
    // Emit socket event
    io.to(serverId).emit('channels_reordered', { serverId, channels });
    
    res.json({ success: true });
  } catch (error) {
    console.error('Reorder channels error:', error);
    res.status(500).json({ error: 'Failed to reorder channels' });
  }
});

// Get server members
app.get('/api/servers/:serverId/members', authenticateToken, async (req, res) => {
  try {
    const { serverId } = req.params;
    const members = await serverDB.getMembers(serverId);
    res.json(members);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get members' });
  }
});

// ==================== FRIEND ROUTES ====================

// Send friend request
app.post('/api/friends/request', authenticateToken, async (req, res) => {
  try {
    const { friendId, username } = req.body;
    const userId = req.userId;
    
    let targetUserId = friendId;
    
    // If username provided instead of friendId, look up the user
    if (username && !friendId) {
      const user = await userDB.findByUsername(username);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      targetUserId = user.id;
    }
    
    if (!targetUserId) {
      return res.status(400).json({ error: 'friendId or username required' });
    }
    
    // Check if target user exists
    const targetUser = await userDB.findById(targetUserId);
    if (!targetUser) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const request = await friendDB.sendFriendRequest(userId, targetUserId);
    
    // Emit socket event to the target user if they're online
    const targetSocket = Array.from(io.sockets.sockets.values()).find(
      (s) => s.userId === targetUserId
    );
    if (targetSocket) {
      const sender = await userDB.findById(userId);
      targetSocket.emit('friend_request_received', {
        requestId: request.id,
        userId: sender.id,
        username: sender.username,
        avatar: sender.avatar
      });
    }
    
    res.json({ success: true, request });
  } catch (error) {
    console.error('Send friend request error:', error);
    res.status(400).json({ error: error.message });
  }
});

// Accept friend request
app.post('/api/friends/:requestId/accept', authenticateToken, async (req, res) => {
  try {
    const { requestId } = req.params;
    const userId = req.userId;
    
    const result = await friendDB.acceptFriendRequest(requestId, userId);
    
    // Emit socket event to the requester
    const request = await new Promise((resolve, reject) => {
      db.get('SELECT user_id FROM friendships WHERE id = ?', [requestId], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
    
    if (request) {
      const requesterSocket = Array.from(io.sockets.sockets.values()).find(
        (s) => s.userId === request.user_id
      );
      if (requesterSocket) {
        const accepter = await userDB.findById(userId);
        requesterSocket.emit('friend_request_accepted', {
          friendId: accepter.id,
          username: accepter.username,
          avatar: accepter.avatar
        });
      }
    }
    
    res.json({ success: true, friendId: result.friendId });
  } catch (error) {
    console.error('Accept friend request error:', error);
    res.status(400).json({ error: error.message });
  }
});

// Reject friend request
app.post('/api/friends/:requestId/reject', authenticateToken, async (req, res) => {
  try {
    const { requestId } = req.params;
    const userId = req.userId;
    
    await friendDB.rejectFriendRequest(requestId, userId);
    res.json({ success: true });
  } catch (error) {
    console.error('Reject friend request error:', error);
    res.status(400).json({ error: error.message });
  }
});

// Cancel outgoing friend request
app.delete('/api/friends/:requestId/cancel', authenticateToken, async (req, res) => {
  try {
    const { requestId } = req.params;
    const userId = req.userId;
    
    await friendDB.cancelFriendRequest(requestId, userId);
    res.json({ success: true });
  } catch (error) {
    console.error('Cancel friend request error:', error);
    res.status(400).json({ error: error.message });
  }
});

// Remove friend (unfriend)
app.delete('/api/friends/:friendId', authenticateToken, async (req, res) => {
  try {
    const { friendId } = req.params;
    const userId = req.userId;
    
    await friendDB.removeFriend(userId, friendId);
    
    // Emit socket event to the friend
    const friendSocket = Array.from(io.sockets.sockets.values()).find(
      (s) => s.userId === friendId
    );
    if (friendSocket) {
      friendSocket.emit('friend_removed', { friendId: userId });
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('Remove friend error:', error);
    res.status(500).json({ error: 'Failed to remove friend' });
  }
});

// Block user
app.post('/api/friends/:userId/block', authenticateToken, async (req, res) => {
  try {
    const { userId: blockedUserId } = req.params;
    const userId = req.userId;
    
    if (userId === blockedUserId) {
      return res.status(400).json({ error: 'Cannot block yourself' });
    }
    
    await friendDB.blockUser(userId, blockedUserId);
    res.json({ success: true });
  } catch (error) {
    console.error('Block user error:', error);
    res.status(500).json({ error: 'Failed to block user' });
  }
});

// Unblock user
app.post('/api/friends/:userId/unblock', authenticateToken, async (req, res) => {
  try {
    const { userId: blockedUserId } = req.params;
    const userId = req.userId;
    
    await friendDB.unblockUser(userId, blockedUserId);
    res.json({ success: true });
  } catch (error) {
    console.error('Unblock user error:', error);
    res.status(400).json({ error: error.message });
  }
});

// Get all friends
app.get('/api/friends', authenticateToken, async (req, res) => {
  try {
    const userId = req.userId;
    const friends = await friendDB.getFriends(userId);
    res.json(friends);
  } catch (error) {
    console.error('Get friends error:', error);
    res.status(500).json({ error: 'Failed to get friends' });
  }
});

// Get pending requests
app.get('/api/friends/pending', authenticateToken, async (req, res) => {
  try {
    const userId = req.userId;
    const pending = await friendDB.getPendingRequests(userId);
    res.json(pending);
  } catch (error) {
    console.error('Get pending requests error:', error);
    res.status(500).json({ error: 'Failed to get pending requests' });
  }
});

// Get blocked users
app.get('/api/friends/blocked', authenticateToken, async (req, res) => {
  try {
    const userId = req.userId;
    const blocked = await friendDB.getBlockedUsers(userId);
    res.json(blocked);
  } catch (error) {
    console.error('Get blocked users error:', error);
    res.status(500).json({ error: 'Failed to get blocked users' });
  }
});

// Check friendship status
app.get('/api/friends/status/:userId', authenticateToken, async (req, res) => {
  try {
    const userId = req.userId;
    const { userId: otherUserId } = req.params;
    
    const status = await friendDB.getFriendshipStatus(userId, otherUserId);
    res.json({ status });
  } catch (error) {
    console.error('Get friendship status error:', error);
    res.status(500).json({ error: 'Failed to get friendship status' });
  }
});

// Search users
app.get('/api/users/search', authenticateToken, async (req, res) => {
  try {
    const { username, email } = req.query;
    const userId = req.userId;
    
    if (!username && !email) {
      return res.status(400).json({ error: 'username or email required' });
    }
    
    let query = 'SELECT id, username, avatar, status FROM users WHERE ';
    let params = [];
    
    if (username) {
      query += 'username LIKE ? AND id != ?';
      params = [`%${username}%`, userId];
    } else {
      query += 'email = ? AND id != ?';
      params = [email, userId];
    }
    
    query += ' LIMIT 20';
    
    db.all(query, params, async (err, rows) => {
      if (err) {
        console.error('Search users error:', err);
        return res.status(500).json({ error: 'Failed to search users' });
      }
      
      // Get mutual servers for each user
      const usersWithMutual = await Promise.all(
        rows.map(async (user) => {
          const mutualServers = await new Promise((resolve, reject) => {
            db.all(
              `SELECT COUNT(*) as count FROM server_members sm1
               JOIN server_members sm2 ON sm1.server_id = sm2.server_id
               WHERE sm1.user_id = ? AND sm2.user_id = ?`,
              [userId, user.id],
              (err, rows) => {
                if (err) reject(err);
                else resolve(rows[0]?.count || 0);
              }
            );
          });
          
          return { ...user, mutualServers };
        })
      );
      
      res.json(usersWithMutual);
    });
  } catch (error) {
    console.error('Search users error:', error);
    res.status(500).json({ error: 'Failed to search users' });
  }
});

// Get user by username
app.get('/api/users/by-username/:username', authenticateToken, async (req, res) => {
  try {
    const { username } = req.params;
    const user = await userDB.findByUsername(username);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Don't return sensitive info
    const { password, ...userData } = user;
    res.json(userData);
  } catch (error) {
    console.error('Get user by username error:', error);
    res.status(500).json({ error: 'Failed to get user' });
  }
});

// ==================== DM (DIRECT MESSAGE) ROUTES ====================

// Create or get DM channel with friend
app.post('/api/dm/channels', authenticateToken, async (req, res) => {
  try {
    const userId = req.userId;
    const { friendId } = req.body;
    
    if (!friendId) {
      return res.status(400).json({ error: 'friendId required' });
    }
    
    // Check if users are friends
    const areFriends = await friendDB.isFriend(userId, friendId);
    if (!areFriends) {
      return res.status(403).json({ error: 'You must be friends to start a DM' });
    }
    
    // Check if either user is blocked
    const isBlocked = await friendDB.isBlocked(userId, friendId) || await friendDB.isBlocked(friendId, userId);
    if (isBlocked) {
      return res.status(403).json({ error: 'Cannot message blocked user' });
    }
    
    // Create or get existing channel
    let channel = await dmDB.getDMChannel(userId, friendId);
    if (!channel) {
      channel = await dmDB.createDMChannel(userId, friendId);
    }
    
    // Get friend info
    const friend = await userDB.findById(friendId);
    
    res.json({
      id: channel.id,
      friend: {
        id: friend.id,
        username: friend.username,
        avatar: friend.avatar,
        status: friend.status
      }
    });
  } catch (error) {
    console.error('Create DM channel error:', error);
    res.status(500).json({ error: 'Failed to create DM channel' });
  }
});

// Get all DM channels for current user
app.get('/api/dm/channels', authenticateToken, async (req, res) => {
  try {
    const userId = req.userId;
    const channels = await dmDB.getUserDMChannels(userId);
    
    // Format response
    const formattedChannels = channels.map(ch => ({
      id: ch.id,
      friend: {
        id: ch.friend_id,
        username: ch.friend_username,
        avatar: ch.friend_avatar,
        status: ch.friend_status
      },
      lastMessage: ch.last_message,
      lastMessageAt: ch.last_message_at,
      unreadCount: ch.unread_count,
      updatedAt: ch.updated_at
    }));
    
    res.json(formattedChannels);
  } catch (error) {
    console.error('Get DM channels error:', error);
    res.status(500).json({ error: 'Failed to get DM channels' });
  }
});

// Get messages in DM channel
app.get('/api/dm/channels/:channelId/messages', authenticateToken, async (req, res) => {
  try {
    const userId = req.userId;
    const { channelId } = req.params;
    const { limit = 50, offset = 0 } = req.query;
    
    // Verify user is part of this channel
    const channel = await dmDB.getDMChannelById(channelId);
    if (!channel || (channel.user1_id !== userId && channel.user2_id !== userId)) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const messages = await dmDB.getDMMessages(channelId, parseInt(limit), parseInt(offset));
    
    // Mark messages as read
    await dmDB.markChannelMessagesAsRead(channelId, userId);
    
    res.json(messages);
  } catch (error) {
    console.error('Get DM messages error:', error);
    res.status(500).json({ error: 'Failed to get messages' });
  }
});

// Send message in DM channel
app.post('/api/dm/channels/:channelId/messages', authenticateToken, async (req, res) => {
  try {
    const userId = req.userId;
    const { channelId } = req.params;
    const { content, attachments } = req.body;
    
    if (!content && !attachments) {
      return res.status(400).json({ error: 'Content or attachments required' });
    }
    
    // Verify user is part of this channel
    const channel = await dmDB.getDMChannelById(channelId);
    if (!channel || (channel.user1_id !== userId && channel.user2_id !== userId)) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const message = await dmDB.sendDMMessage(channelId, userId, content, attachments);
    
    // Get sender info
    const sender = await userDB.findById(userId);
    message.sender_username = sender.username;
    message.sender_avatar = sender.avatar;
    
    // Emit to recipient via socket
    const recipientId = channel.user1_id === userId ? channel.user2_id : channel.user1_id;
    const recipientSocket = getUserSocket(recipientId);
    if (recipientSocket) {
      recipientSocket.emit('dm_message_received', {
        channelId,
        message,
        sender: { id: sender.id, username: sender.username, avatar: sender.avatar }
      });
    }
    
    res.json(message);
  } catch (error) {
    console.error('Send DM message error:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

// Mark DM message as read
app.post('/api/dm/messages/:messageId/read', authenticateToken, async (req, res) => {
  try {
    const { messageId } = req.params;
    await dmDB.markDMMessageAsRead(messageId);
    res.json({ success: true });
  } catch (error) {
    console.error('Mark message read error:', error);
    res.status(500).json({ error: 'Failed to mark message as read' });
  }
});

// Get unread DM count
app.get('/api/dm/unread-count', authenticateToken, async (req, res) => {
  try {
    const userId = req.userId;
    const count = await dmDB.getUnreadDMCount(userId);
    const perChannel = await dmDB.getUnreadCountPerChannel(userId);
    res.json({ total: count, perChannel });
  } catch (error) {
    console.error('Get unread count error:', error);
    res.status(500).json({ error: 'Failed to get unread count' });
  }
});

// Delete DM channel
app.delete('/api/dm/channels/:channelId', authenticateToken, async (req, res) => {
  try {
    const userId = req.userId;
    const { channelId } = req.params;
    
    // Verify user is part of this channel
    const channel = await dmDB.getDMChannelById(channelId);
    if (!channel || (channel.user1_id !== userId && channel.user2_id !== userId)) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    await dmDB.deleteDMChannel(channelId);
    res.json({ success: true });
  } catch (error) {
    console.error('Delete DM channel error:', error);
    res.status(500).json({ error: 'Failed to delete channel' });
  }
});

// ==================== INVITE ROUTES ====================

// Create invite
app.post('/api/servers/:serverId/invites', authenticateToken, async (req, res) => {
  try {
    const { serverId } = req.params;
    const { expiresIn, maxUses } = req.body;
    
    let expiresAt = null;
    if (expiresIn) {
      expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + expiresIn);
    }
    
    const invite = await inviteDB.create(serverId, req.userId, expiresAt, maxUses);
    res.json(invite);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create invite' });
  }
});

// Join server with invite
app.post('/api/invites/:code/join', authenticateToken, async (req, res) => {
  try {
    const { code } = req.params;
    const invite = await inviteDB.findByCode(code);
    
    if (!invite) {
      return res.status(404).json({ error: 'Invalid invite code' });
    }
    
    if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
      return res.status(400).json({ error: 'Invite has expired' });
    }
    
    if (invite.max_uses && invite.uses >= invite.max_uses) {
      return res.status(400).json({ error: 'Invite has reached maximum uses' });
    }
    
    await serverDB.addMember(invite.server_id, req.userId);
    await inviteDB.incrementUses(code);
    
    res.json({ success: true, server_id: invite.server_id });
  } catch (error) {
    res.status(500).json({ error: 'Failed to join server' });
  }
});

// ==================== MESSAGE ROUTES ====================

// Get messages
app.get('/api/channels/:channelId/messages', authenticateToken, async (req, res) => {
  try {
    const { channelId } = req.params;
    const { limit = 50, offset = 0 } = req.query;
    
    const messages = await messageDB.getByChannel(channelId, parseInt(limit), parseInt(offset));
    res.json(messages);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get messages' });
  }
});

// Add reaction to message
app.post('/api/messages/:messageId/reactions', authenticateToken, async (req, res) => {
  try {
    const { messageId } = req.params;
    const { emoji } = req.body;
    const userId = req.userId;
    
    if (!emoji) {
      return res.status(400).json({ error: 'Emoji is required' });
    }
    
    const result = await reactionDB.add(messageId, userId, emoji);
    
    // Get updated reactions for the message
    const reactions = await reactionDB.getGroupedByMessage(messageId);
    
    // Broadcast to all users in the channel via socket
    const message = await messageDB.getById(messageId);
    if (message) {
      io.emit('reaction_added', {
        messageId,
        reactions,
        userId,
        emoji
      });
    }
    
    res.json({ success: true, reactions });
  } catch (error) {
    console.error('Failed to add reaction:', error);
    res.status(500).json({ error: 'Failed to add reaction' });
  }
});

// Remove reaction from message
app.delete('/api/messages/:messageId/reactions', authenticateToken, async (req, res) => {
  try {
    const { messageId } = req.params;
    const { emoji } = req.body;
    const userId = req.userId;
    
    if (!emoji) {
      return res.status(400).json({ error: 'Emoji is required' });
    }
    
    await reactionDB.remove(messageId, userId, emoji);
    
    // Get updated reactions for the message
    const reactions = await reactionDB.getGroupedByMessage(messageId);
    
    // Broadcast to all users in the channel via socket
    io.emit('reaction_removed', {
      messageId,
      reactions,
      userId,
      emoji
    });
    
    res.json({ success: true, reactions });
  } catch (error) {
    console.error('Failed to remove reaction:', error);
    res.status(500).json({ error: 'Failed to remove reaction' });
  }
});

// ==================== FILE UPLOAD ====================

app.post('/api/upload', authenticateToken, upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }
  
  const fileUrl = `/uploads/${req.file.filename}`;
  res.json({
    success: true,
    file: {
      url: fileUrl,
      filename: req.file.filename,
      originalName: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size
    }
  });
});

// ==================== SOCKET.IO ====================

// Track user connections - Map<userId, Set<socketId>>
const connectedUsers = new Map();
const socketToUser = new Map(); // Map<socketId, userId>

// Helper function to add user connection
function addUserConnection(userId, socketId) {
  if (!connectedUsers.has(userId)) {
    connectedUsers.set(userId, new Set());
  }
  const connections = connectedUsers.get(userId);
  const wasOffline = connections.size === 0;
  connections.add(socketId);
  socketToUser.set(socketId, userId);
  return wasOffline; // Returns true if user was previously offline
}

// Helper function to remove user connection
function removeUserConnection(socketId) {
  const userId = socketToUser.get(socketId);
  if (!userId) return { userId: null, isOffline: false };
  
  const connections = connectedUsers.get(userId);
  if (connections) {
    connections.delete(socketId);
    const isOffline = connections.size === 0;
    if (isOffline) {
      connectedUsers.delete(userId);
    }
  }
  socketToUser.delete(socketId);
  return { userId, isOffline: connections?.size === 0 };
}

// Helper function to get socket by user ID (for notifications)
function getUserSocket(userId) {
  const connections = connectedUsers.get(userId);
  if (connections && connections.size > 0) {
    // Return the first socket from the set
    const socketId = connections.values().next().value;
    return io.sockets.sockets.get(socketId);
  }
  return null;
}

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);
  
  socket.on('authenticate', async (token) => {
    console.log('🔐 Authenticate attempt from socket:', socket.id);
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      socket.userId = decoded.id;
      
      // Add connection and check if this is the first connection for this user
      const wasOffline = addUserConnection(decoded.id, socket.id);
      
      const user = await userDB.findById(decoded.id);
      console.log('✅ User authenticated:', user?.username, '(', decoded.id, ')');
      
      // Only emit status change if user was previously offline
      if (wasOffline) {
        await userDB.updateProfile(decoded.id, { status: 'online' });
        io.emit('user_status_changed', { userId: decoded.id, status: 'online' });
      }
      
      socket.emit('authenticated', { success: true, userId: decoded.id });
    } catch (err) {
      console.error('❌ Authentication failed:', err.message);
      socket.emit('auth_error', 'Invalid token');
    }
  });
  
  socket.on('join_channel', (channelId) => {
    socket.join(channelId);
    console.log(`Socket ${socket.id} joined channel ${channelId}`);
  });
  
  socket.on('leave_channel', (channelId) => {
    socket.leave(channelId);
    console.log(`Socket ${socket.id} left channel ${channelId}`);
  });
  
  socket.on('send_message', async (data) => {
    console.log('📨 send_message received:', JSON.stringify(data));
    console.log('👤 socket.userId:', socket.userId);
    
    try {
      if (!socket.userId) {
        console.error('❌ User not authenticated');
        socket.emit('error', { message: 'Not authenticated' });
        return;
      }
      
      const { channelId, content, replyTo, attachments } = data;
      
      if (!channelId) {
        console.error('❌ No channelId provided');
        socket.emit('error', { message: 'Channel ID required' });
        return;
      }
      
      console.log('💾 Creating message for channel:', channelId);
      const message = await messageDB.create(
        channelId, 
        socket.userId, 
        content, 
        replyTo?.id || null,
        attachments || null
      );
      
      // Get user info
      const user = await userDB.findById(socket.userId);
      message.user = {
        id: user.id,
        username: user.username,
        avatar: user.avatar
      };
      
      console.log('✅ Message created:', message.id);
      io.to(channelId).emit('new_message', message);
      console.log('📢 Message broadcasted to channel:', channelId);
    } catch (error) {
      console.error('❌ Send message error:', error);
      socket.emit('error', { message: 'Failed to send message', error: error.message });
    }
  });
  
  socket.on('typing', async (data) => {
    const { channelId } = data;
    if (!socket.userId || !channelId) return;
    
    // Get user info for typing indicator
    const user = await userDB.findById(socket.userId);
    if (user) {
      socket.to(channelId).emit('user_typing', {
        userId: socket.userId,
        username: user.username,
        channelId
      });
    }
  });
  
  // Handle add reaction via socket
  socket.on('add_reaction', async (data) => {
    try {
      const { messageId, emoji } = data;
      if (!socket.userId || !messageId || !emoji) return;
      
      await reactionDB.add(messageId, socket.userId, emoji);
      
      // Get message to find channel for targeted broadcast
      const message = await messageDB.getById(messageId);
      if (message) {
        const reactions = await reactionDB.getGroupedByMessage(messageId);
        io.to(message.channelId).emit('reaction_added', {
          messageId,
          reactions,
          userId: socket.userId,
          emoji
        });
      }
    } catch (error) {
      console.error('Socket add_reaction error:', error);
    }
  });
  
  // Handle remove reaction via socket
  socket.on('remove_reaction', async (data) => {
    try {
      const { messageId, emoji } = data;
      if (!socket.userId || !messageId || !emoji) return;
      
      await reactionDB.remove(messageId, socket.userId, emoji);
      
      // Get message to find channel for targeted broadcast
      const message = await messageDB.getById(messageId);
      if (message) {
        const reactions = await reactionDB.getGroupedByMessage(messageId);
        io.to(message.channelId).emit('reaction_removed', {
          messageId,
          reactions,
          userId: socket.userId,
          emoji
        });
      }
    } catch (error) {
      console.error('Socket remove_reaction error:', error);
    }
  });
  
  // Handle edit message via socket
  socket.on('edit_message', async (data) => {
    try {
      const { messageId, content } = data;
      if (!socket.userId || !messageId || !content) return;
      
      // Get message first to check ownership
      const message = await messageDB.getById(messageId);
      if (!message) return;
      
      // Only allow editing by message owner
      if (message.userId !== socket.userId) {
        socket.emit('error', { message: 'Not authorized to edit this message' });
        return;
      }
      
      // Update the message
      const updatedMessage = await messageDB.update(messageId, content);
      
      // Broadcast update to channel
      io.to(message.channelId).emit('message_edited', updatedMessage);
    } catch (error) {
      console.error('Socket edit_message error:', error);
    }
  });
  
  // Handle delete message via socket
  socket.on('delete_message', async (data) => {
    try {
      const { messageId } = data;
      if (!socket.userId || !messageId) return;
      
      // Get message first to check ownership and get channel
      const message = await messageDB.getById(messageId);
      if (!message) return;
      
      // Check if user is message owner or has MANAGE_MESSAGES permission
      const isOwner = message.userId === socket.userId;
      let canDelete = isOwner;
      
      if (!isOwner) {
        // Check for MANAGE_MESSAGES permission
        const channel = await new Promise((resolve, reject) => {
          db.get('SELECT server_id FROM channels WHERE id = ?', [message.channelId], (err, row) => {
            if (err) reject(err);
            else resolve(row);
          });
        });
        
        if (channel) {
          canDelete = await permissionDB.hasPermission(socket.userId, channel.server_id, Permissions.MANAGE_MESSAGES);
        }
      }
      
      if (!canDelete) {
        socket.emit('error', { message: 'Not authorized to delete this message' });
        return;
      }
      
      // Delete the message
      await messageDB.delete(messageId);
      
      // Broadcast deletion to channel
      io.to(message.channelId).emit('message_deleted', { messageId });
    } catch (error) {
      console.error('Socket delete_message error:', error);
    }
  });
  
  // Handle friend request via socket
  socket.on('send_friend_request', async (data) => {
    try {
      const { friendId } = data;
      if (!socket.userId || !friendId) return;
      
      const request = await friendDB.sendFriendRequest(socket.userId, friendId);
      
      // Emit to target user if online
      const targetSocket = getUserSocket(friendId);
      if (targetSocket) {
        const sender = await userDB.findById(socket.userId);
        targetSocket.emit('friend_request_received', {
          requestId: request.id,
          userId: sender.id,
          username: sender.username,
          avatar: sender.avatar
        });
      }
      
      socket.emit('friend_request_sent', { success: true, requestId: request.id });
    } catch (error) {
      console.error('Socket send_friend_request error:', error);
      socket.emit('friend_request_error', { error: error.message });
    }
  });

  // Handle accept friend request via socket
  socket.on('accept_friend_request', async (data) => {
    try {
      const { requestId } = data;
      if (!socket.userId || !requestId) return;
      
      const result = await friendDB.acceptFriendRequest(requestId, socket.userId);
      
      // Get the requester info
      const request = await new Promise((resolve, reject) => {
        db.get('SELECT user_id FROM friendships WHERE id = ?', [requestId], (err, row) => {
          if (err) reject(err);
          else resolve(row);
        });
      });
      
      if (request) {
        // Emit to requester if online
        const requesterSocket = getUserSocket(request.user_id);
        if (requesterSocket) {
          const accepter = await userDB.findById(socket.userId);
          requesterSocket.emit('friend_request_accepted', {
            friendId: accepter.id,
            username: accepter.username,
            avatar: accepter.avatar
          });
        }
      }
      
      socket.emit('friend_request_accepted_success', { success: true, friendId: result.friendId });
    } catch (error) {
      console.error('Socket accept_friend_request error:', error);
      socket.emit('friend_request_error', { error: error.message });
    }
  });

  // Handle reject friend request via socket
  socket.on('reject_friend_request', async (data) => {
    try {
      const { requestId } = data;
      if (!socket.userId || !requestId) return;
      
      await friendDB.rejectFriendRequest(requestId, socket.userId);
      socket.emit('friend_request_rejected', { success: true, requestId });
    } catch (error) {
      console.error('Socket reject_friend_request error:', error);
      socket.emit('friend_request_error', { error: error.message });
    }
  });

  // Handle remove friend via socket
  socket.on('remove_friend', async (data) => {
    try {
      const { friendId } = data;
      if (!socket.userId || !friendId) return;
      
      await friendDB.removeFriend(socket.userId, friendId);
      
      // Notify the friend if online
      const friendSocket = getUserSocket(friendId);
      if (friendSocket) {
        friendSocket.emit('friend_removed', { friendId: socket.userId });
      }
      
      socket.emit('friend_removed_success', { success: true });
    } catch (error) {
      console.error('Socket remove_friend error:', error);
      socket.emit('friend_error', { error: error.message });
    }
  });

  // Handle block user via socket
  socket.on('block_user', async (data) => {
    try {
      const { userId: blockedUserId } = data;
      if (!socket.userId || !blockedUserId) return;
      
      await friendDB.blockUser(socket.userId, blockedUserId);
      
      // Notify the blocked user if online
      const blockedSocket = getUserSocket(blockedUserId);
      if (blockedSocket) {
        blockedSocket.emit('blocked_by_user', { blockedById: socket.userId });
      }
      
      socket.emit('user_blocked_success', { success: true, blockedUserId });
    } catch (error) {
      console.error('Socket block_user error:', error);
      socket.emit('friend_error', { error: error.message });
    }
  });

  // Handle unblock user via socket
  socket.on('unblock_user', async (data) => {
    try {
      const { userId: blockedUserId } = data;
      if (!socket.userId || !blockedUserId) return;
      
      await friendDB.unblockUser(socket.userId, blockedUserId);
      socket.emit('user_unblocked_success', { success: true, blockedUserId });
    } catch (error) {
      console.error('Socket unblock_user error:', error);
      socket.emit('friend_error', { error: error.message });
    }
  });

  // ============ DM (Direct Message) Socket Events ============

  // Join DM channel
  socket.on('join_dm_channel', (channelId) => {
    if (!socket.userId || !channelId) return;
    socket.join(`dm_${channelId}`);
    console.log(`Socket ${socket.id} joined DM channel ${channelId}`);
  });

  // Leave DM channel
  socket.on('leave_dm_channel', (channelId) => {
    if (!socket.userId || !channelId) return;
    socket.leave(`dm_${channelId}`);
    console.log(`Socket ${socket.id} left DM channel ${channelId}`);
  });

  // Send DM message via socket
  socket.on('send_dm_message', async (data) => {
    try {
      const { channelId, content, attachments } = data;
      if (!socket.userId || !channelId || (!content && !attachments)) {
        socket.emit('dm_error', { error: 'Invalid data' });
        return;
      }

      // Verify user is part of this channel
      const channel = await dmDB.getDMChannelById(channelId);
      if (!channel || (channel.user1_id !== socket.userId && channel.user2_id !== socket.userId)) {
        socket.emit('dm_error', { error: 'Access denied' });
        return;
      }

      // Send message
      const message = await dmDB.sendDMMessage(channelId, socket.userId, content, attachments);

      // Get sender info
      const sender = await userDB.findById(socket.userId);
      const messageWithSender = {
        ...message,
        sender_username: sender.username,
        sender_avatar: sender.avatar
      };

      // Get recipient ID
      const recipientId = channel.user1_id === socket.userId ? channel.user2_id : channel.user1_id;

      // Broadcast to both users in DM channel
      io.to(`dm_${channelId}`).emit('dm_message_received', {
        channelId,
        message: messageWithSender,
        sender: { id: sender.id, username: sender.username, avatar: sender.avatar }
      });

      // Also emit update to recipient's DM list
      const recipientSocket = getUserSocket(recipientId);
      if (recipientSocket) {
        recipientSocket.emit('dm_channel_updated', {
          channelId,
          lastMessage: content,
          unreadCount: await dmDB.getUnreadCountPerChannel(recipientId)
        });
      }

      console.log('✅ DM message sent:', message.id);
    } catch (error) {
      console.error('❌ Send DM message error:', error);
      socket.emit('dm_error', { error: error.message });
    }
  });

  // DM typing indicator
  socket.on('dm_typing', async (data) => {
    try {
      const { channelId } = data;
      if (!socket.userId || !channelId) return;

      // Verify user is part of this channel
      const channel = await dmDB.getDMChannelById(channelId);
      if (!channel || (channel.user1_id !== socket.userId && channel.user2_id !== socket.userId)) {
        return;
      }

      // Get sender info
      const sender = await userDB.findById(socket.userId);

      // Get recipient ID
      const recipientId = channel.user1_id === socket.userId ? channel.user2_id : channel.user1_id;

      // Emit to recipient only
      const recipientSocket = getUserSocket(recipientId);
      if (recipientSocket) {
        recipientSocket.emit('dm_typing', {
          channelId,
          userId: socket.userId,
          username: sender.username
        });
      }
    } catch (error) {
      console.error('DM typing error:', error);
    }
  });

  // ============ Category Socket Events ============

  // Create category via socket
  socket.on('create_category', async (data) => {
    try {
      const { serverId, name, position = 0 } = data;
      if (!socket.userId || !serverId || !name) {
        socket.emit('category_error', { error: 'Invalid data' });
        return;
      }

      // Check permission
      const hasPermission = await permissionDB.hasPermission(socket.userId, serverId, Permissions.MANAGE_CHANNELS);
      if (!hasPermission) {
        socket.emit('category_error', { error: 'Permission denied' });
        return;
      }

      const category = await categoryDB.create(serverId, name, position);
      
      // Broadcast to server
      io.to(serverId).emit('category_created', { serverId, category });
      
      socket.emit('category_created_success', { category });
    } catch (error) {
      console.error('Socket create category error:', error);
      socket.emit('category_error', { error: error.message });
    }
  });

  // Delete category via socket
  socket.on('delete_category', async (data) => {
    try {
      const { categoryId } = data;
      if (!socket.userId || !categoryId) {
        socket.emit('category_error', { error: 'Invalid data' });
        return;
      }

      // Get category to check permission
      const category = await categoryDB.getById(categoryId);
      if (!category) {
        socket.emit('category_error', { error: 'Category not found' });
        return;
      }

      // Check permission
      const hasPermission = await permissionDB.hasPermission(socket.userId, category.server_id, Permissions.MANAGE_CHANNELS);
      if (!hasPermission) {
        socket.emit('category_error', { error: 'Permission denied' });
        return;
      }

      await categoryDB.delete(categoryId);
      
      // Broadcast to server
      io.to(category.server_id).emit('category_deleted', { categoryId, serverId: category.server_id });
      
      socket.emit('category_deleted_success', { categoryId });
    } catch (error) {
      console.error('Socket delete category error:', error);
      socket.emit('category_error', { error: error.message });
    }
  });

  // Move channel via socket
  socket.on('move_channel', async (data) => {
    try {
      const { channelId, categoryId, position } = data;
      if (!socket.userId || !channelId) {
        socket.emit('category_error', { error: 'Invalid data' });
        return;
      }

      // Get channel
      const channel = await new Promise((resolve, reject) => {
        db.get('SELECT * FROM channels WHERE id = ?', [channelId], (err, row) => {
          if (err) reject(err);
          else resolve(row);
        });
      });

      if (!channel) {
        socket.emit('category_error', { error: 'Channel not found' });
        return;
      }

      // Check permission
      const hasPermission = await permissionDB.hasPermission(socket.userId, channel.server_id, Permissions.MANAGE_CHANNELS);
      if (!hasPermission) {
        socket.emit('category_error', { error: 'Permission denied' });
        return;
      }

      await channelDB.moveToCategory(channelId, categoryId, position);
      
      // Broadcast to server
      io.to(channel.server_id).emit('channel_moved', { 
        channelId, 
        categoryId, 
        position,
        serverId: channel.server_id
      });
      
      socket.emit('channel_moved_success', { channelId, categoryId, position });
    } catch (error) {
      console.error('Socket move channel error:', error);
      socket.emit('category_error', { error: error.message });
    }
  });
  
  socket.on('disconnect', async () => {
    console.log('User disconnected:', socket.id);
    
    // Remove connection and check if user is now completely offline
    const { userId, isOffline } = removeUserConnection(socket.id);
    
    if (userId && isOffline) {
      try {
        await userDB.updateProfile(userId, { status: 'offline' });
        io.emit('user_status_changed', { userId, status: 'offline' });
      } catch (error) {
        console.error('Error updating user status on disconnect:', error);
      }
    }
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 WorkGrid Server running on http://localhost:${PORT}`);
  console.log(`📁 Uploads directory: ${uploadsDir}`);
});
