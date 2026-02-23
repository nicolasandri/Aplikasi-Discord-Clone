const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');

const { db, initDatabase, userDB, serverDB, channelDB, messageDB, inviteDB, reactionDB } = require('./database');

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

const JWT_SECRET = process.env.JWT_SECRET || 'workgrid-secret-key-change-in-production';

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
    
    if (!username || !email || !password) {
      return res.status(400).json({ error: 'All fields are required' });
    }
    
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }
    
    const existingUser = await userDB.findByEmail(email);
    if (existingUser) {
      return res.status(400).json({ error: 'Email already registered' });
    }
    
    const user = await userDB.create(username, email, password);
    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET);
    
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
    
    const user = await userDB.findByEmail(email);
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const validPassword = await userDB.verifyPassword(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    await userDB.updateProfile(user.id, { status: 'online' });
    
    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET);
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

// Update user role (owner only)
app.put('/api/servers/:serverId/members/:userId/role', authenticateToken, async (req, res) => {
  try {
    const { serverId, userId } = req.params;
    const { role } = req.body;
    
    // Check if requester is owner
    const requester = await new Promise((resolve, reject) => {
      db.get(
        'SELECT role FROM server_members WHERE server_id = ? AND user_id = ?',
        [serverId, req.userId],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });
    
    if (!requester || requester.role !== 'owner') {
      return res.status(403).json({ error: 'Only owner can change roles' });
    }
    
    // Update role
    await new Promise((resolve, reject) => {
      db.run(
        'UPDATE server_members SET role = ? WHERE server_id = ? AND user_id = ?',
        [role, serverId, userId],
        function(err) {
          if (err) reject(err);
          else resolve(true);
        }
      );
    });
    
    res.json({ success: true, userId, role });
  } catch (error) {
    console.error('Update role error:', error);
    res.status(500).json({ error: 'Failed to update role' });
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

const connectedUsers = new Map();

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);
  
  socket.on('authenticate', async (token) => {
    console.log('🔐 Authenticate attempt from socket:', socket.id);
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      socket.userId = decoded.id;
      connectedUsers.set(decoded.id, socket);
      
      const user = await userDB.findById(decoded.id);
      console.log('✅ User authenticated:', user?.username, '(', decoded.id, ')');
      
      await userDB.updateProfile(decoded.id, { status: 'online' });
      io.emit('user_status_changed', { userId: decoded.id, status: 'online' });
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
      
      // Only allow deletion by message owner
      if (message.userId !== socket.userId) {
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
  
  socket.on('disconnect', async () => {
    console.log('User disconnected:', socket.id);
    if (socket.userId) {
      connectedUsers.delete(socket.userId);
      await userDB.updateProfile(socket.userId, { status: 'offline' });
      io.emit('user_status_changed', { userId: socket.userId, status: 'offline' });
    }
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 WorkGrid Server running on http://localhost:${PORT}`);
  console.log(`📁 Uploads directory: ${uploadsDir}`);
});
