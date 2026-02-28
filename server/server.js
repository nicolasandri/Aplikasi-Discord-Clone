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
const rateLimit = require('express-rate-limit');
const { body, validationResult } = require('express-validator');

// Database selection: SQLite or PostgreSQL
const usePostgres = process.env.USE_POSTGRES === 'true' || process.env.DATABASE_URL;
const dbModule = usePostgres ? require('./database-postgres') : require('./database');

// Security: Allowed origins for CORS
const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS 
  ? process.env.ALLOWED_ORIGINS.split(',') 
  : ['http://localhost:5173', 'http://127.0.0.1:5173', 'http://localhost:3000', 'https://xoqeprkp54f74.ok.kimi.link'];

const { db, initDatabase, userDB, serverDB, roleDB, categoryDB, channelDB, messageDB, inviteDB, reactionDB, permissionDB, friendDB, dmDB, subscriptionDB, auditLogDB, Permissions } = dbModule;

// BUG-021: Conditional Logging
const DEBUG = process.env.NODE_ENV !== 'production';
function log(...args) {
  if (DEBUG) console.log(...args);
}
function logError(...args) {
  // Always log errors, even in production
  console.error(...args);
}

log(`📦 Using database: ${usePostgres ? 'PostgreSQL' : 'SQLite'}`);
const { checkPermission, requireServerOwner, canManageMember, fetchPermissions } = require('./middleware/permissions');

// Push notification service
const pushService = require('./services/push');

// BUG-016: Helper function untuk socket error handling
function handleSocketError(socket, error, context) {
  logError(`❌ ${context}:`, error.message);
  socket.emit('error', { 
    context: context,
    message: error.message || 'An error occurred',
    timestamp: new Date().toISOString()
  });
}

// BUG-022: Standardized Error/Success Response Helpers
function createErrorResponse(context, message, details = null) {
  return {
    success: false,
    error: {
      context,
      message,
      details,
      timestamp: new Date().toISOString()
    }
  };
}

function createSuccessResponse(data = null, message = null) {
  return {
    success: true,
    data,
    message,
    timestamp: new Date().toISOString()
  };
}

const app = express();
const server = http.createServer(app);

// Security: Socket.IO CORS with strict origin checking
const io = new Server(server, {
  cors: {
    origin: function(origin, callback) {
      if (!origin) return callback(null, true);
      if (ALLOWED_ORIGINS.indexOf(origin) !== -1 || process.env.NODE_ENV === 'development') {
        callback(null, true);
      } else {
        console.error(`Socket.IO CORS blocked: ${origin}`);
        callback(new Error('Not allowed by CORS'));
      }
    },
    methods: ["GET", "POST"],
    allowedHeaders: ["Authorization", "Content-Type"],
    credentials: true
  },
  transports: ['websocket', 'polling'],
  pingTimeout: 60000,
  pingInterval: 25000
});

// Initialize Voice Signaling Server for WebRTC
const VoiceSignalingServer = require('./webrtc/signaling');
const voiceSignaling = new VoiceSignalingServer(io);

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
    try {
      // Create admin user using userDB API
      const adminUser = await userDB.create('Admin', 'admin@workgrid.com', 'admin123');
      // Update admin status to online
      await userDB.updateProfile(adminUser.id, { status: 'online' });
      
      // Create default server using serverDB API
      const server = await serverDB.create(
        'WorkGrid Official',
        'https://api.dicebear.com/7.x/identicon/svg?seed=WorkGrid',
        adminUser.id
      );
      
      // Add admin as owner
      await serverDB.addMember(server.id, adminUser.id, 'owner');
      
      // Create default channels
      const channels = [
        { name: 'selamat-datang', type: 'text' },
        { name: 'umum', type: 'text' },
        { name: 'bantuan', type: 'text' },
        { name: 'Suara Umum', type: 'voice' }
      ];
      
      for (const ch of channels) {
        await channelDB.create(server.id, ch.name, ch.type);
      }
      
      console.log('✅ Seed data created');
    } catch (error) {
      console.error('❌ Error creating seed data:', error);
    }
  }
}

seedData();

// Security: Express CORS with strict origin checking
app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    if (ALLOWED_ORIGINS.indexOf(origin) !== -1 || process.env.NODE_ENV === 'development') {
      callback(null, true);
    } else {
      console.error(`CORS blocked: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Authorization", "Content-Type"],
  credentials: true
}));

app.use(express.json());

// Security: Rate Limiting (BUG-003)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Too many attempts. Try again in 15 minutes.' }
});

const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 100,
  message: { error: 'Too many requests. Please slow down.' }
});

app.use('/api/', apiLimiter);

// Security: XSS Prevention (BUG-014)
function sanitizeInput(input) {
  if (typeof input !== 'string') return input;
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

function sanitizeBody(req, res, next) {
  if (req.body) {
    ['content', 'name', 'username', 'email', 'message'].forEach(field => {
      if (req.body[field] && typeof req.body[field] === 'string') {
        req.body[field] = sanitizeInput(req.body[field]);
      }
    });
  }
  next();
}
app.use('/api/', sanitizeBody);

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

// Serve uploads with CORS headers
app.use('/uploads', (req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET');
  next();
}, express.static(uploadsDir));

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

// Health check endpoint untuk Docker
app.get('/health', async (req, res) => {
  try {
    // Check database connection
    const isPostgres = process.env.USE_POSTGRES === 'true';
    if (isPostgres) {
      const { pool } = require('./config/database');
      await pool.query('SELECT 1');
    } else {
      // For SQLite, just check if db is accessible
      const dbModule = require('./database');
      if (!dbModule.db) {
        throw new Error('Database not initialized');
      }
    }
    
    res.status(200).json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      database: 'connected',
      version: '2.0.0'
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
});

// ==================== AUTH ROUTES ====================

// Register with enhanced security validation (BUG-011 & BUG-012)
app.post('/api/auth/register', authLimiter, async (req, res) => {
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
    
    // Email validation (stricter)
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }
    
    // Block disposable emails
    const disposableDomains = ['tempmail.com', 'throwaway.com', 'mailinator.com', 'guerrillamail.com'];
    const emailDomain = email.split('@')[1].toLowerCase();
    if (disposableDomains.includes(emailDomain)) {
      return res.status(400).json({ error: 'Disposable emails not allowed' });
    }
    
    // Password validation (stronger)
    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    if (!hasUpperCase || !hasLowerCase || !hasNumbers) {
      return res.status(400).json({ 
        error: 'Password must contain uppercase, lowercase, and number' 
      });
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
    
    res.json({ user: formatUserResponse(user), token });
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
    
    res.json({ user: formatUserResponse(user), token });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// ==================== USER ROUTES ====================

// Get current user
// Helper function to convert snake_case to camelCase for user object
function formatUserResponse(user) {
  if (!user) return null;
  return {
    id: user.id,
    username: user.username,
    displayName: user.display_name || user.displayName || user.username,
    email: user.email,
    avatar: user.avatar,
    status: user.status,
    created_at: user.created_at
  };
}

app.get('/api/users/me', authenticateToken, async (req, res) => {
  try {
    const user = await userDB.findById(req.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(formatUserResponse(user));
  } catch (error) {
    res.status(500).json({ error: 'Failed to get user' });
  }
});

// Update profile
app.put('/api/users/profile', authenticateToken, async (req, res) => {
  try {
    const { username, displayName } = req.body;
    const updates = {};
    if (username) updates.username = username;
    if (displayName !== undefined) updates.displayName = displayName;
    
    await userDB.updateProfile(req.userId, updates);
    const user = await userDB.findById(req.userId);
    res.json({ success: true, user: formatUserResponse(user) });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// Change password
app.put('/api/users/password', authenticateToken, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    console.log('[Change Password] Request received for user:', req.userId);
    
    if (!currentPassword || !newPassword) {
      console.log('[Change Password] Missing fields');
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    const user = await userDB.findById(req.userId, true);
    if (!user) {
      console.log('[Change Password] User not found');
      return res.status(404).json({ error: 'User not found' });
    }
    
    console.log('[Change Password] Verifying password...');
    const validPassword = await userDB.verifyPassword(currentPassword, user.password);
    if (!validPassword) {
      console.log('[Change Password] Invalid current password');
      return res.status(400).json({ error: 'Current password is incorrect' });
    }
    
    console.log('[Change Password] Updating password...');
    await userDB.updatePassword(req.userId, newPassword);
    console.log('[Change Password] Success');
    res.json({ success: true });
  } catch (error) {
    console.error('[Change Password] Error:', error);
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
      ...formatUserResponse(user),
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

// ==================== CUSTOM ROLES API ====================

// Get all roles for a server
app.get('/api/servers/:serverId/roles', authenticateToken, async (req, res) => {
  try {
    const { serverId } = req.params;
    const roles = await roleDB.getServerRoles(serverId);
    res.json(roles);
  } catch (error) {
    console.error('Get roles error:', error);
    res.status(500).json({ error: 'Failed to get roles' });
  }
});

// Create a new custom role
app.post('/api/servers/:serverId/roles', authenticateToken, async (req, res) => {
  try {
    const { serverId } = req.params;
    const { name, color, permissions = 0, position = 0 } = req.body;
    const requesterId = req.userId;
    
    // Check if requester can manage roles
    const canManageRoles = await permissionDB.hasPermission(requesterId, serverId, Permissions.MANAGE_ROLES);
    const isOwner = await permissionDB.isServerOwner(requesterId, serverId);
    
    if (!canManageRoles && !isOwner) {
      return res.status(403).json({ error: 'You do not have permission to manage roles' });
    }
    
    if (!name || name.trim().length === 0) {
      return res.status(400).json({ error: 'Role name is required' });
    }
    
    const role = await roleDB.createRole(serverId, name.trim(), color, permissions, position);
    res.json({ success: true, role });
  } catch (error) {
    console.error('Create role error:', error);
    res.status(500).json({ error: 'Failed to create role' });
  }
});

// Update a custom role
app.put('/api/servers/:serverId/roles/:roleId', authenticateToken, async (req, res) => {
  try {
    const { serverId, roleId } = req.params;
    const { name, color, permissions, position } = req.body;
    const requesterId = req.userId;
    
    // Check if requester can manage roles
    const canManageRoles = await permissionDB.hasPermission(requesterId, serverId, Permissions.MANAGE_ROLES);
    const isOwner = await permissionDB.isServerOwner(requesterId, serverId);
    
    if (!canManageRoles && !isOwner) {
      return res.status(403).json({ error: 'You do not have permission to manage roles' });
    }
    
    // Check if role belongs to this server
    const role = await roleDB.getRoleById(roleId);
    if (!role || role.server_id !== serverId) {
      return res.status(404).json({ error: 'Role not found' });
    }
    
    // Don't allow modifying default roles name
    if (role.is_default && name && name !== role.name) {
      return res.status(403).json({ error: 'Cannot rename default roles' });
    }
    
    const updates = {};
    if (name !== undefined) updates.name = name.trim();
    if (color !== undefined) updates.color = color;
    if (permissions !== undefined) updates.permissions = permissions;
    if (position !== undefined) updates.position = position;
    
    await roleDB.updateRole(roleId, updates);
    res.json({ success: true, role: { ...role, ...updates } });
  } catch (error) {
    console.error('Update role error:', error);
    res.status(500).json({ error: 'Failed to update role' });
  }
});

// Delete a custom role
app.delete('/api/servers/:serverId/roles/:roleId', authenticateToken, async (req, res) => {
  try {
    const { serverId, roleId } = req.params;
    const requesterId = req.userId;
    
    // Check if requester can manage roles
    const canManageRoles = await permissionDB.hasPermission(requesterId, serverId, Permissions.MANAGE_ROLES);
    const isOwner = await permissionDB.isServerOwner(requesterId, serverId);
    
    if (!canManageRoles && !isOwner) {
      return res.status(403).json({ error: 'You do not have permission to manage roles' });
    }
    
    // Check if role belongs to this server
    const role = await roleDB.getRoleById(roleId);
    if (!role || role.server_id !== serverId) {
      return res.status(404).json({ error: 'Role not found' });
    }
    
    // Don't allow deleting default roles
    if (role.is_default) {
      return res.status(403).json({ error: 'Cannot delete default roles' });
    }
    
    // Get default role to assign to members with this role
    const defaultRole = await roleDB.getDefaultRole(serverId);
    
    // Reassign all members with this role to default role
    await new Promise((resolve, reject) => {
      db.run(
        `UPDATE server_members 
         SET role_id = ?, role = 'custom'
         WHERE server_id = ? AND role_id = ?`,
        [defaultRole?.id || null, serverId, roleId],
        function(err) {
          if (err) reject(err);
          else resolve();
        }
      );
    });
    
    await roleDB.deleteRole(roleId);
    res.json({ success: true, message: 'Role deleted' });
  } catch (error) {
    console.error('Delete role error:', error);
    res.status(500).json({ error: 'Failed to delete role' });
  }
});

// Get member count for a role
app.get('/api/servers/:serverId/roles/:roleId/members/count', authenticateToken, async (req, res) => {
  try {
    const { serverId, roleId } = req.params;
    
    // Check if user is a member of the server
    const isMember = await serverDB.isMember(serverId, req.userId);
    if (!isMember) {
      return res.status(403).json({ error: 'You are not a member of this server' });
    }
    
    const count = await roleDB.getMemberCount(roleId, serverId);
    res.json({ count });
  } catch (error) {
    console.error('Get role member count error:', error);
    res.status(500).json({ error: 'Failed to get member count' });
  }
});

// Assign custom role to member
app.put('/api/servers/:serverId/members/:userId/custom-role', authenticateToken, async (req, res) => {
  try {
    const { serverId, userId } = req.params;
    const { roleId } = req.body;
    const requesterId = req.userId;
    
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
    
    // Check if role exists and belongs to this server
    const role = await roleDB.getRoleById(roleId);
    if (!role || role.server_id !== serverId) {
      return res.status(404).json({ error: 'Role not found' });
    }
    
    // Assign the custom role
    await roleDB.assignRole(serverId, userId, roleId);
    
    res.json({ success: true, userId, role: { id: role.id, name: role.name, color: role.color } });
  } catch (error) {
    console.error('Assign custom role error:', error);
    res.status(500).json({ error: 'Failed to assign role' });
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

// Update server (owner and admin only)
app.put('/api/servers/:serverId', authenticateToken, async (req, res) => {
  try {
    const { serverId } = req.params;
    const { name, icon } = req.body;
    const requesterId = req.userId;
    
    // Check if requester is owner or admin
    const isOwner = await permissionDB.isServerOwner(requesterId, serverId);
    const userRole = await permissionDB.getUserRole(requesterId, serverId);
    const isAdmin = userRole === 'admin';
    
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ error: 'You do not have permission to update this server' });
    }
    
    // Update server
    const updates = [];
    const params = [];
    
    if (name !== undefined) {
      updates.push('name = ?');
      params.push(name);
    }
    
    if (icon !== undefined) {
      updates.push('icon = ?');
      params.push(icon);
    }
    
    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }
    
    params.push(serverId);
    
    await new Promise((resolve, reject) => {
      db.run(
        `UPDATE servers SET ${updates.join(', ')} WHERE id = ?`,
        params,
        function(err) {
          if (err) reject(err);
          else resolve(true);
        }
      );
    });
    
    // Get updated server
    const updatedServer = await new Promise((resolve, reject) => {
      db.get('SELECT * FROM servers WHERE id = ?', [serverId], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
    
    res.json(updatedServer);
  } catch (error) {
    console.error('Update server error:', error);
    res.status(500).json({ error: 'Failed to update server' });
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
    const { name, type, categoryId } = req.body;
    const userId = req.userId;
    
    if (!name) {
      return res.status(400).json({ error: 'Channel name is required' });
    }
    
    const channel = await channelDB.create(serverId, name, type || 'text', categoryId || null);
    
    // Log audit event
    const user = await userDB.findById(userId);
    await auditLogDB.create(
      serverId,
      userId,
      `created a ${type || 'text'} channel`,
      'create_channel',
      channel.id,
      `#${name}`,
      'channel',
      null,
      null
    );
    
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

// Get specific server member details
app.get('/api/servers/:serverId/members/:userId', authenticateToken, async (req, res) => {
  try {
    const { serverId, userId } = req.params;
    const requesterId = req.userId;
    
    // Check if requester is a member
    const isMember = await serverDB.isMember(serverId, requesterId);
    if (!isMember) {
      return res.status(403).json({ error: 'You are not a member of this server' });
    }
    
    // Get member details
    const member = await serverDB.getMemberDetails(serverId, userId);
    if (!member) {
      return res.status(404).json({ error: 'Member not found' });
    }
    
    res.json(member);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get member details' });
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
    const { q, username, email, server_id } = req.query;
    const userId = req.userId;
    
    // Support both new 'q' parameter (for mentions) and old 'username'/'email' parameters
    const searchQuery = q || username;
    
    if (!searchQuery && !email) {
      return res.status(400).json({ error: 'Query parameter (q or username) or email required' });
    }
    
    // If server_id provided, prioritize server members for mention autocomplete
    if (server_id && searchQuery) {
      const sql = `
        SELECT u.id, u.username, u.avatar, u.status, sm.role
        FROM users u
        JOIN server_members sm ON u.id = sm.user_id
        WHERE sm.server_id = ?
        AND u.username LIKE ?
        AND u.id != ?
        ORDER BY 
          CASE sm.role 
            WHEN 'owner' THEN 1 
            WHEN 'admin' THEN 2 
            WHEN 'moderator' THEN 3 
            ELSE 4 
          END,
          u.username
        LIMIT 10
      `;
      
      db.all(sql, [server_id, `${searchQuery}%`, userId], (err, rows) => {
        if (err) {
          console.error('Search users error:', err);
          return res.status(500).json({ error: 'Failed to search users' });
        }
        res.json({ users: rows });
      });
      return;
    }
    
    // Regular user search (no server filter)
    let query = 'SELECT id, username, avatar, status FROM users WHERE ';
    let params = [];
    
    if (searchQuery) {
      query += 'username LIKE ? AND id != ?';
      params = [`%${searchQuery}%`, userId];
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
      
      // Return in consistent format
      if (q !== undefined) {
        res.json({ users: usersWithMutual });
      } else {
        res.json(usersWithMutual);
      }
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
    } else if (pushService.isConfigured()) {
      // Send push notification if recipient is offline
      await pushService.sendDMNotification(
        recipientId,
        sender.username,
        content || 'Sent an attachment',
        `/dm/${channelId}`
      );
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

// ==================== PUSH NOTIFICATION ROUTES ====================

// Get VAPID public key
app.get('/api/push/vapid-public-key', authenticateToken, (req, res) => {
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  if (!publicKey) {
    return res.status(503).json({ error: 'Push notifications not configured' });
  }
  res.json({ publicKey });
});

// Subscribe to push notifications
app.post('/api/push/subscribe', authenticateToken, async (req, res) => {
  try {
    const subscription = req.body;
    
    if (!subscription || !subscription.endpoint || !subscription.keys) {
      return res.status(400).json({ error: 'Invalid subscription' });
    }

    await subscriptionDB.create(req.userId, subscription);
    
    res.json({ success: true, message: 'Subscribed to push notifications' });
  } catch (error) {
    logError('Push subscribe error:', error);
    res.status(500).json({ error: 'Failed to subscribe' });
  }
});

// Unsubscribe from push notifications
app.post('/api/push/unsubscribe', authenticateToken, async (req, res) => {
  try {
    const { endpoint } = req.body;
    
    if (endpoint) {
      // Unsubscribe specific device
      await subscriptionDB.remove(req.userId, endpoint);
    } else {
      // Unsubscribe all devices
      await subscriptionDB.removeAllByUser(req.userId);
    }
    
    res.json({ success: true, message: 'Unsubscribed from push notifications' });
  } catch (error) {
    logError('Push unsubscribe error:', error);
    res.status(500).json({ error: 'Failed to unsubscribe' });
  }
});

// Test push notification
app.post('/api/push/test', authenticateToken, async (req, res) => {
  try {
    await pushService.sendToUser(req.userId, {
      title: 'Test Notifikasi',
      body: 'Push notifications berfungsi! 🎉',
      url: '/',
      requireInteraction: true
    });
    
    res.json({ success: true, message: 'Test notification sent' });
  } catch (error) {
    logError('Push test error:', error);
    res.status(500).json({ error: 'Failed to send test notification' });
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

// Get invite info (public, no auth required)
app.get('/api/invites/:code', async (req, res) => {
  try {
    const { code } = req.params;
    const invite = await inviteDB.findByCode(code);
    
    if (!invite) {
      return res.status(404).json({ error: 'Invalid invite code' });
    }
    
    // Check expiration
    if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
      return res.status(410).json({ error: 'Invite has expired' });
    }
    
    // Check max uses
    if (invite.max_uses && invite.uses >= invite.max_uses) {
      return res.status(410).json({ error: 'Invite has reached maximum uses' });
    }
    
    // Return public info
    res.json({
      code: invite.code,
      serverName: invite.server_name,
      serverIcon: invite.server_icon,
      expiresAt: invite.expires_at,
      maxUses: invite.max_uses,
      uses: invite.uses
    });
  } catch (error) {
    console.error('Get invite error:', error);
    res.status(500).json({ error: 'Failed to get invite info' });
  }
});

// Join server with invite
app.post('/api/invites/:code/join', authenticateToken, async (req, res) => {
  try {
    const { code } = req.params;
    const userId = req.userId;
    
    const invite = await inviteDB.findByCode(code);
    
    if (!invite) {
      return res.status(404).json({ error: 'Invalid invite code' });
    }
    
    if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
      return res.status(410).json({ error: 'Invite has expired' });
    }
    
    if (invite.max_uses && invite.uses >= invite.max_uses) {
      return res.status(410).json({ error: 'Invite has reached maximum uses' });
    }
    
    // Check if already member
    const members = await serverDB.getMembers(invite.server_id);
    if (members.some(m => m.id === userId)) {
      return res.status(409).json({ 
        error: 'Already a member of this server',
        serverId: invite.server_id
      });
    }
    
    // Add user to server
    await serverDB.addMember(invite.server_id, userId, 'member', 'Invite');
    await inviteDB.incrementUses(code);
    
    // Get server info
    const server = await serverDB.findById(invite.server_id);
    
    // Get user info for notification
    const user = await userDB.findById(userId);
    
    // Notify server members via socket
    io.to(invite.server_id).emit('member_joined', {
      userId,
      serverId: invite.server_id,
      username: user.username,
      avatar: user.avatar
    });
    
    res.json({ 
      success: true, 
      server: server || { id: invite.server_id }
    });
  } catch (error) {
    console.error('Join server error:', error);
    res.status(500).json({ error: 'Failed to join server' });
  }
});

// Get server invites (for server settings)
app.get('/api/servers/:serverId/invites', authenticateToken, async (req, res) => {
  try {
    const { serverId } = req.params;
    const userId = req.userId;
    
    // Check if user is member
    const members = await serverDB.getMembers(serverId);
    if (!members.some(m => m.id === userId)) {
      return res.status(403).json({ error: 'Not authorized' });
    }
    
    const invites = await inviteDB.getServerInvites(serverId);
    res.json(invites);
  } catch (error) {
    console.error('Get server invites error:', error);
    res.status(500).json({ error: 'Failed to get invites' });
  }
});

// Delete invite by code
app.delete('/api/invites/:code', authenticateToken, async (req, res) => {
  try {
    const { code } = req.params;
    const userId = req.userId;
    
    // Get invite
    const invite = await inviteDB.findByCode(code);
    if (!invite) {
      return res.status(404).json({ error: 'Invite not found' });
    }
    
    // Check if user has permission (admin/owner or creator)
    const members = await serverDB.getMembers(invite.server_id);
    const member = members.find(m => m.id === userId);
    
    const isAuthorized = member && 
      (['owner', 'admin'].includes(member.role) || invite.created_by === userId);
    
    if (!isAuthorized) {
      return res.status(403).json({ error: 'Not authorized' });
    }
    
    await inviteDB.deleteInvite(code);
    res.json({ success: true });
  } catch (error) {
    console.error('Delete invite error:', error);
    res.status(500).json({ error: 'Failed to delete invite' });
  }
});

// ==================== AUDIT LOG ROUTES ====================

// Get server audit logs
app.get('/api/servers/:serverId/audit-log', authenticateToken, async (req, res) => {
  try {
    const { serverId } = req.params;
    const userId = req.userId;
    
    // Check if user is member and has admin/owner permissions
    const members = await serverDB.getMembers(serverId);
    const member = members.find(m => m.id === userId);
    
    if (!member) {
      return res.status(403).json({ error: 'You are not a member of this server' });
    }
    
    // Only owners and admins can view audit logs
    if (!['owner', 'admin'].includes(member.role)) {
      return res.status(403).json({ error: 'Only server owners and admins can view audit logs' });
    }
    
    const logs = await auditLogDB.getServerLogs(serverId);
    res.json(logs);
  } catch (error) {
    console.error('Get audit logs error:', error);
    res.status(500).json({ error: 'Failed to get audit logs' });
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

// ==================== SEARCH ROUTES ====================

// Search messages
app.get('/api/search/messages', authenticateToken, async (req, res) => {
  try {
    const {
      q,                    // search query
      server_id,
      channel_id,
      user_id,
      date_from,
      date_to,
      has_attachments,
      limit = 50,
      offset = 0
    } = req.query;
    
    // Validate user has access to server/channel
    if (server_id) {
      const isMember = await serverDB.isMember(server_id, req.userId);
      if (!isMember) {
        return res.status(403).json({ error: 'Access denied' });
      }
    }
    
    if (channel_id) {
      const channel = await channelDB.getById(channel_id);
      if (channel) {
        const isMember = await serverDB.isMember(channel.server_id, req.userId);
        if (!isMember) {
          return res.status(403).json({ error: 'Access denied' });
        }
      }
    }
    
    const messages = await messageDB.searchMessages({
      query: q,
      serverId: server_id,
      channelId: channel_id,
      userId: user_id,
      dateFrom: date_from,
      dateTo: date_to,
      hasAttachments: has_attachments === 'true' ? true : 
                      has_attachments === 'false' ? false : null,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
    
    const total = await messageDB.getSearchResultCount({
      query: q,
      serverId: server_id,
      channelId: channel_id,
      userId: user_id,
      dateFrom: date_from,
      dateTo: date_to,
      hasAttachments: has_attachments === 'true' ? true : 
                      has_attachments === 'false' ? false : null
    });
    
    res.json({
      messages,
      pagination: {
        total,
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: parseInt(offset) + messages.length < total
      }
    });
  } catch (error) {
    console.error('Search error:', error);
    console.error('Search error stack:', error.stack);
    res.status(500).json({ error: 'Search failed', details: error.message });
  }
});

// Get search suggestions (autocomplete)
app.get('/api/search/suggestions', authenticateToken, async (req, res) => {
  try {
    const { q, server_id } = req.query;
    
    if (!q || q.length < 2) {
      return res.json({ suggestions: [] });
    }
    
    // Search for users
    const users = await new Promise((resolve, reject) => {
      db.all(
        `SELECT id, username, avatar FROM users 
         WHERE username LIKE ? 
         LIMIT 5`,
        [`%${q}%`],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });
    
    // Search for channels (if in server)
    let channels = [];
    if (server_id) {
      channels = await channelDB.getByServer(server_id);
      channels = channels.filter(c => 
        c.name.toLowerCase().includes(q.toLowerCase())
      ).slice(0, 5);
    }
    
    res.json({
      users,
      channels
    });
  } catch (error) {
    console.error('Suggestions error:', error);
    res.status(500).json({ error: 'Failed to get suggestions' });
  }
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
  
  // Security: Socket Rate Limiting (BUG-003)
  const socketRateLimits = new Map();

  function checkSocketRateLimit(eventName, maxRequests = 30, windowMs = 60000) {
    const key = `${socket.id}:${eventName}`;
    const now = Date.now();
    if (!socketRateLimits.has(key)) {
      socketRateLimits.set(key, { count: 1, resetTime: now + windowMs });
      return true;
    }
    const limit = socketRateLimits.get(key);
    if (now > limit.resetTime) {
      limit.count = 1; limit.resetTime = now + windowMs; return true;
    }
    if (limit.count >= maxRequests) {
      socket.emit('rate_limited', { event: eventName, message: 'Too many requests' });
      return false;
    }
    limit.count++; return true;
  }
  
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
        console.log('🟢 Broadcasting user_status_changed:', decoded.id, 'online');
        io.emit('user_status_changed', { userId: decoded.id, status: 'online' });
      } else {
        console.log('🔄 User already online (another tab):', decoded.id);
      }
      
      socket.emit('authenticated', { success: true, userId: decoded.id });
    } catch (err) {
      console.error('❌ Authentication failed:', err.message);
      socket.emit('auth_error', 'Invalid token');
    }
  });
  
  // Security: Socket Auth & Membership (BUG-004, BUG-005)
  socket.on('join_channel', async (channelId) => {
    if (!socket.userId) {
      socket.emit('error', { message: 'Not authenticated' });
      return;
    }
    try {
      const channel = await channelDB.getById(channelId);
      if (!channel) {
        socket.emit('error', { message: 'Channel not found' });
        return;
      }
      const isMember = await serverDB.isMember(channel.server_id, socket.userId);
      if (!isMember) {
        socket.emit('error', { message: 'Not authorized' });
        return;
      }
      socket.join(channelId);
      console.log(`Socket ${socket.id} joined channel ${channelId}`);
    } catch (error) {
      socket.emit('error', { message: 'Failed to join channel' });
    }
  });
  
  socket.on('leave_channel', (channelId) => {
    socket.leave(channelId);
    console.log(`Socket ${socket.id} left channel ${channelId}`);
  });
  
  // Security: Socket Auth & Membership with Rate Limiting (BUG-003, BUG-004, BUG-005, BUG-022)
  socket.on('send_message', async (data) => {
    if (!checkSocketRateLimit('send_message', 30, 60000)) {
      socket.emit('message_error', createErrorResponse('send_message', 'Rate limit exceeded'));
      return;
    }
    log('📨 send_message received:', JSON.stringify(data));
    log('👤 socket.userId:', socket.userId);
    
    try {
      if (!socket.userId) {
        logError('❌ User not authenticated');
        socket.emit('message_error', createErrorResponse('send_message', 'Not authenticated'));
        return;
      }
      
      const { channelId, content, replyTo, attachments } = data;
      
      if (!channelId) {
        logError('❌ No channelId provided');
        socket.emit('message_error', createErrorResponse('send_message', 'Channel ID required'));
        return;
      }
      
      // Security: Check channel membership
      const channel = await channelDB.getById(channelId);
      if (!channel || !(await serverDB.isMember(channel.server_id, socket.userId))) {
        socket.emit('message_error', createErrorResponse('send_message', 'Not authorized'));
        return;
      }
      
      // Security: Sanitize content
      const sanitizedContent = sanitizeInput(content);
      
      log('💾 Creating message for channel:', channelId);
      const message = await messageDB.create(
        channelId, 
        socket.userId, 
        sanitizedContent, 
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
      
      log('✅ Message created:', message.id);
      io.to(channelId).emit('new_message', message);
      socket.emit('message_sent', createSuccessResponse({ messageId: message.id }, 'Message sent successfully'));
      log('📢 Message broadcasted to channel:', channelId);
      
      // Send push notifications for mentions
      try {
        const mentionRegex = /@(\w+)/g;
        const mentions = sanitizedContent.match(mentionRegex) || [];
        
        for (const mention of mentions) {
          const username = mention.substring(1);
          const mentionedUser = await userDB.findByUsername(username);
          
          if (mentionedUser && mentionedUser.id !== socket.userId) {
            // Check if user has an active socket (is online)
            const targetSocket = Array.from(io.sockets.sockets.values())
              .find(s => s.userId === mentionedUser.id);
            
            if (!targetSocket && pushService.isConfigured()) {
              await pushService.sendMentionNotification(
                mentionedUser.id,
                user.username,
                channel.name,
                sanitizedContent,
                `/channels/${channel.server_id}/${channelId}`
              );
            }
          }
        }
      } catch (pushError) {
        logError('❌ Push notification error:', pushError);
        // Don't fail the message send if push fails
      }
    } catch (error) {
      logError('❌ Send message error:', error);
      socket.emit('message_error', createErrorResponse('send_message', error.message || 'Failed to send message'));
    }
  });
  
  // Security: Typing Rate Limit (BUG-015)
  socket.on('typing', async (data) => {
    if (!checkSocketRateLimit('typing', 20, 10000)) {
      socket.emit('error', { message: 'Typing rate limit exceeded' });
      return;
    }
    try {
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
    } catch (error) {
      handleSocketError(socket, error, 'typing');
    }
  });
  
  // Security: Rate Limiting for add reaction (BUG-003)
  socket.on('add_reaction', async (data) => {
    if (!checkSocketRateLimit('add_reaction', 50, 60000)) return;
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
  
  // Security: Reaction Ownership with Rate Limiting (BUG-003, BUG-010)
  socket.on('remove_reaction', async (data) => {
    if (!checkSocketRateLimit('remove_reaction', 50, 60000)) return;
    try {
      const { messageId, emoji } = data;
      if (!socket.userId || !messageId || !emoji) return;
      
      // Security: Check reaction ownership
      const ownsReaction = await reactionDB.checkOwnership(messageId, socket.userId, emoji);
      if (!ownsReaction) {
        socket.emit('reaction_error', { message: 'Can only remove your own reactions' });
        return;
      }
      
      await reactionDB.remove(messageId, socket.userId, emoji);
      socket.emit('reaction_removed_success', { messageId, emoji });
      
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
  
  // Handle edit message via socket (BUG-023: Edit Time Limit)
  const EDIT_TIME_LIMIT = 15 * 60 * 1000; // 15 minutes
  socket.on('edit_message', async (data) => {
    try {
      const { messageId, content } = data;
      if (!socket.userId || !messageId || !content) {
        socket.emit('error', { message: 'Missing required fields' });
        return;
      }
      
      // Get message first to check ownership
      const message = await messageDB.getById(messageId);
      if (!message) {
        socket.emit('error', { message: 'Message not found' });
        return;
      }
      
      // Only allow editing by message owner
      if (message.userId !== socket.userId) {
        socket.emit('error', { message: 'Not authorized to edit this message' });
        return;
      }
      
      // BUG-023: Check time limit
      const messageAge = Date.now() - new Date(message.created_at || message.timestamp).getTime();
      if (messageAge > EDIT_TIME_LIMIT) {
        socket.emit('error', { message: 'Message can only be edited within 15 minutes' });
        return;
      }
      
      // Security: Sanitize content
      const sanitizedContent = sanitizeInput(content);
      
      // Update the message
      const updatedMessage = await messageDB.update(messageId, sanitizedContent);
      
      // Broadcast update to channel
      io.to(message.channelId).emit('message_edited', updatedMessage);
    } catch (error) {
      handleSocketError(socket, error, 'edit_message');
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
      handleSocketError(socket, error, 'delete_message');
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
      const sender = await userDB.findById(socket.userId);
      
      if (targetSocket) {
        targetSocket.emit('friend_request_received', {
          requestId: request.id,
          userId: sender.id,
          username: sender.username,
          avatar: sender.avatar
        });
      } else if (pushService.isConfigured()) {
        // Send push notification if user is offline
        await pushService.sendFriendRequestNotification(friendId, sender.username);
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
  socket.on('join-dm-channel', (channelId) => {
    if (!socket.userId || !channelId) {
      console.log('❌ Join DM channel failed: No userId or channelId');
      return;
    }
    socket.join(`dm:${channelId}`);
    console.log(`✅ Socket ${socket.id} (user ${socket.userId}) joined DM room: dm:${channelId}`);
    // Debug: Check room members
    const room = io.sockets.adapter.rooms.get(`dm:${channelId}`);
    console.log(`Room dm:${channelId} now has ${room ? room.size : 0} member(s)`);
    socket.emit('joined-dm-channel', { channelId, success: true });
  });

  // Leave DM channel
  socket.on('leave-dm-channel', (channelId) => {
    if (!socket.userId || !channelId) return;
    socket.leave(`dm:${channelId}`);
    console.log(`Socket ${socket.id} left DM channel ${channelId}`);
  });

  // Send DM message via socket
  socket.on('send-dm-message', async (data) => {
    console.log('📥 Server received send-dm-message:', data);
    try {
      const { channelId, content, attachments } = data;
      if (!socket.userId || !channelId || (!content && !attachments)) {
        console.log('❌ Invalid data');
        socket.emit('dm-error', { error: 'Invalid data' });
        return;
      }

      // Verify user is part of this channel
      const channel = await dmDB.getDMChannelById(channelId);
      console.log('Channel found:', channel ? 'yes' : 'no');
      if (!channel || (channel.user1_id !== socket.userId && channel.user2_id !== socket.userId)) {
        console.log('❌ Access denied');
        socket.emit('dm-error', { error: 'Access denied' });
        return;
      }

      // Send message
      console.log('Saving message to DB...');
      const message = await dmDB.sendDMMessage(channelId, socket.userId, content, attachments);
      console.log('✅ Message saved:', message.id);

      // Get sender info
      const sender = await userDB.findById(socket.userId);
      const messageWithSender = {
        ...message,
        sender_username: sender.username,
        sender_avatar: sender.avatar
      };

      // Get recipient ID
      const recipientId = channel.user1_id === socket.userId ? channel.user2_id : channel.user1_id;

      console.log('Emitting new-dm-message to room:', `dm:${channelId}`);
      // EMIT TO ROOM (includes sender)
      io.to(`dm:${channelId}`).emit('new-dm-message', {
        channelId,
        message: messageWithSender,
        sender: { id: sender.id, username: sender.username, avatar: sender.avatar }
      });
      
      // Debug: Check room members
      const room = io.sockets.adapter.rooms.get(`dm:${channelId}`);
      console.log(`Room dm:${channelId} members:`, room ? room.size : 0);
      console.log('✅ DM message processing complete');

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
  socket.on('dm-typing', async (data) => {
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
        recipientSocket.emit('dm-typing', {
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
        console.log('🔴 Broadcasting user_status_changed:', userId, 'offline');
        io.emit('user_status_changed', { userId, status: 'offline' });
      } catch (error) {
        console.error('Error updating user status on disconnect:', error);
      }
    } else if (userId) {
      console.log('🔄 User still has other connections:', userId);
    }
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 WorkGrid Server running on http://localhost:${PORT}`);
  console.log(`📁 Uploads directory: ${uploadsDir}`);
});
