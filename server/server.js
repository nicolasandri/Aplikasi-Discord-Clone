require('dotenv').config();

const express = require('express');
const http = require('http');
const https = require('https');
const { Server } = require('socket.io');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const jwt = require('jsonwebtoken');
// UUID - using crypto for compatibility
const crypto = require('crypto');
const uuidv4 = () => crypto.randomUUID();
const rateLimit = require('express-rate-limit');
const cheerio = require('cheerio');

// Set timezone to Asia/Jakarta (WIB) for all date operations
process.env.TZ = 'Asia/Jakarta';

// Helper function to get current time in WIB
function getCurrentTime() {
  return new Date();
}

// Helper function to format time for database (ISO 8601 with timezone)
function formatDateTime(date) {
  return date.toISOString();
}

// Helper function to convert mention tags to readable text for notifications
async function formatMentionsForNotification(content, serverId = null) {
  if (!content) return '';
  
  console.log('📱 formatMentionsForNotification input:', content);
  
  let formatted = content;
  
  // Replace user mentions: <@userId> -> @username
  // Note: This regex should NOT match <@everyone> or <@here>
  const userMentionRegex = /<@([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})>/gi;
  let match;
  let loopCount = 0;
  while ((match = userMentionRegex.exec(content)) !== null) {
    loopCount++;
    const userId = match[1];
    console.log(`📱 [${loopCount}] Found user mention:`, match[0], '-> ID:', userId);
    try {
      const user = await userDB.findById(userId);
      if (user) {
        console.log(`📱 [${loopCount}] Found user:`, user.display_name || user.username);
        formatted = formatted.replaceAll(match[0], `@${user.display_name || user.username}`);
      } else {
        console.log(`📱 [${loopCount}] User NOT found for ID:`, userId);
        formatted = formatted.replaceAll(match[0], '@Unknown User');
      }
    } catch (err) {
      console.error(`📱 [${loopCount}] Error finding user:`, err);
      formatted = formatted.replaceAll(match[0], '@Unknown User');
    }
    // Prevent infinite loop
    if (loopCount > 50) break;
  }
  
  console.log('📱 After user mentions, formatted:', formatted);
  
  // Replace role mentions: <@&roleId> -> @roleName (if serverId provided)
  if (serverId) {
    const roleMentionRegex = /<@&([a-fA-F0-9-]+)>/g;
    while ((match = roleMentionRegex.exec(content)) !== null) {
      const roleId = match[1];
      try {
        const roles = await roleDB.getByServer(serverId);
        const role = roles.find(r => r.id === roleId);
        if (role) {
          formatted = formatted.replace(match[0], `@${role.name}`);
        } else {
          formatted = formatted.replace(match[0], '@Unknown Role');
        }
      } catch (err) {
        formatted = formatted.replace(match[0], '@Unknown Role');
      }
    }
  }
  
  // Replace @everyone mention: <@everyone> -> @everyone
  formatted = formatted.replace(/<@everyone>/g, '@everyone');
  
  // Replace @here mention: <@here> -> @here
  formatted = formatted.replace(/<@here>/g, '@here');
  
  return formatted;
}

// Helper function to send mention notifications
async function sendMentionNotifications(content, senderId, serverId, channelId, channelName, senderName) {
  console.log('📱 sendMentionNotifications called - content:', content?.substring(0, 50), 'isConfigured:', pushService.isConfigured());
  if (!content) return;
  // Always process mentions even if push not configured (for testing)
  // if (!pushService.isConfigured()) return;
  
  console.log('📱 Checking for mentions in message...');
  
  // Find user mentions: <@userId>
  const userMentionRegex = /<@([a-fA-F0-9-]+)>/g;
  let match;
  const mentionedUserIds = new Set();
  
  while ((match = userMentionRegex.exec(content)) !== null) {
    const userId = match[1];
    if (userId !== senderId) { // Don't notify sender
      mentionedUserIds.add(userId);
    }
  }
  
  // Find role mentions: <@&roleId>
  const roleMentionRegex = /<@&([a-fA-F0-9-]+)>/g;
  const mentionedRoleIds = new Set();
  
  while ((match = roleMentionRegex.exec(content)) !== null) {
    mentionedRoleIds.add(match[1]);
  }
  
  // Check for @everyone and @here mentions
  const hasEveryoneMention = content.includes('<@everyone>');
  const hasHereMention = content.includes('<@here>');
  
  console.log('📱 Mentioned users:', [...mentionedUserIds]);
  console.log('📱 Mentioned roles:', [...mentionedRoleIds]);
  console.log('📱 @everyone mention:', hasEveryoneMention);
  console.log('📱 @here mention:', hasHereMention);
  
  // Get server members
  const members = await serverDB.getMembers(serverId);
  
  // Send notification to mentioned users
  for (const userId of mentionedUserIds) {
    const member = members.find(m => m.id === userId);
    if (member) {
      const formattedContent = await formatMentionsForNotification(content, serverId);
      console.log('📱 Sending mention notification to user:', userId);
      try {
        await pushService.sendMentionNotification(
          userId,
          senderName,
          channelName,
          formattedContent,
          `/channels/${channelId}`
        );
        console.log('📱 Mention notification sent to:', userId);
      } catch (err) {
        console.error('📱 Failed to send mention notification:', err);
      }
    }
  }
  
  // Send notification to users with mentioned roles
  for (const roleId of mentionedRoleIds) {
    const roleMembers = members.filter(m => m.role_id === roleId);
    for (const member of roleMembers) {
      if (member.id !== senderId && !mentionedUserIds.has(member.id)) {
        const formattedContent = await formatMentionsForNotification(content, serverId);
        console.log('📱 Sending role mention notification to user:', member.id);
        try {
          await pushService.sendMentionNotification(
            member.id,
            senderName,
            channelName,
            formattedContent,
            `/channels/${channelId}`
          );
          console.log('📱 Role mention notification sent to:', member.id);
        } catch (err) {
          console.error('📱 Failed to send role mention notification:', err);
        }
      }
    }
  }
  
  // Send notification to all server members for @everyone
  if (hasEveryoneMention) {
    console.log('📱 Sending @everyone notification to all server members');
    for (const member of members) {
      if (member.id !== senderId && !mentionedUserIds.has(member.id)) {
        const formattedContent = await formatMentionsForNotification(content, serverId);
        console.log('📱 Sending @everyone notification to user:', member.id);
        try {
          await pushService.sendMentionNotification(
            member.id,
            senderName,
            channelName,
            formattedContent,
            `/channels/${channelId}`
          );
          console.log('📱 @everyone notification sent to:', member.id);
        } catch (err) {
          console.error('📱 Failed to send @everyone notification:', err);
        }
      }
    }
  }
  
  // Send notification to online server members for @here
  // For now, @here behaves like @everyone (all members) since we don't have precise online tracking
  if (hasHereMention) {
    console.log('📱 Sending @here notification to server members');
    for (const member of members) {
      if (member.id !== senderId && !mentionedUserIds.has(member.id)) {
        const formattedContent = await formatMentionsForNotification(content, serverId);
        console.log('📱 Sending @here notification to user:', member.id);
        try {
          await pushService.sendMentionNotification(
            member.id,
            senderName,
            channelName,
            formattedContent,
            `/channels/${channelId}`
          );
          console.log('📱 @here notification sent to:', member.id);
        } catch (err) {
          console.error('📱 Failed to send @here notification:', err);
        }
      }
    }
  }
}

// Send channel message notification to offline members
async function sendChannelMessageNotifications(content, senderId, serverId, channelId, channelName, senderName) {
  console.log('📱 sendChannelMessageNotifications called - isConfigured:', pushService.isConfigured());
  // Always process even if push not configured (for testing)
  // if (!pushService.isConfigured()) {
  //   console.log('📱 Push service not configured, skipping channel notifications');
  //   return;
  // }
  
  // Get server members
  const members = await serverDB.getMembers(serverId);
  
  // Send notification to members who are offline (not connected via socket)
  for (const member of members) {
    if (member.id === senderId) continue; // Skip sender
    
    // Check if user is online (has socket connection)
    const userSocket = getUserSocket(member.id);
    if (userSocket) {
      console.log('📱 User', member.id, 'is online via socket, skipping push notification');
      continue;
    }
    
    // Send push notification to offline users
    const formattedContent = await formatMentionsForNotification(content || 'Sent an attachment', serverId);
    console.log('📱 Sending channel message notification to offline user:', member.id);
    try {
      await pushService.sendChannelNotification(
        member.id,
        senderName,
        channelName,
        formattedContent,
        `/channels/${channelId}`
      );
      console.log('📱 Channel notification sent to:', member.id);
    } catch (err) {
      console.error('📱 Failed to send channel notification:', err);
    }
  }
}

// Database selection: SQLite or PostgreSQL
console.log('[DB] Environment USE_POSTGRES:', process.env.USE_POSTGRES);
console.log('[DB] Environment DATABASE_URL exists:', !!process.env.DATABASE_URL);
const usePostgres = process.env.USE_POSTGRES === 'true' || process.env.DATABASE_URL;
console.log('[DB] Using PostgreSQL:', usePostgres);

if (!usePostgres && process.env.NODE_ENV === 'production') {
  console.error('[DB] ERROR: Production mode requires PostgreSQL. Set USE_POSTGRES=true or DATABASE_URL');
  process.exit(1);
}

const dbModule = usePostgres ? require('./database-postgres') : require('./database');

// Security: Allowed origins for CORS
const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS 
  ? process.env.ALLOWED_ORIGINS.split(',') 
  : ['http://localhost:5173', 'http://127.0.0.1:5173', 'http://localhost:3000'];

const { db, dbGet, dbRun, dbAll, initDatabase, userDB, serverDB, roleDB, categoryDB, channelDB, messageDB, inviteDB, reactionDB, permissionDB, friendDB, dmDB, subscriptionDB, auditLogDB, sessionDB, userServerAccessDB, roleChannelAccessDB, Permissions } = dbModule;

// BUG-021: Conditional Logging
const DEBUG = process.env.NODE_ENV !== 'production';
function log(...args) {
  if (DEBUG) console.log(...args);
}
function logError(...args) {
  console.error(...args);
}

log(`📦 Using database: ${usePostgres ? 'PostgreSQL' : 'SQLite'}`);

const { checkPermission, requireServerOwner } = require('./middleware/permissions');
const pushService = require('./services/push');

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

// Reset all users status to offline on server start
async function resetAllUsersStatus() {
  try {
    await userDB.resetAllStatus();
    console.log('🔄 All users status reset to offline');
  } catch (error) {
    console.error('Error resetting user statuses:', error);
  }
}

// Call reset status on startup
resetAllUsersStatus();

// Seed data
async function seedData() {
  const admin = await userDB.findByEmail('admin@workgrid.com');
  if (!admin) {
    try {
      const adminUser = await userDB.create('Admin', 'admin@workgrid.com', 'admin123');
      await userDB.updateProfile(adminUser.id, { status: 'online' });
      
      // Set admin as master admin
      const isPostgres = process.env.USE_POSTGRES === 'true' || process.env.DATABASE_URL;
      if (isPostgres) {
        await dbRun('UPDATE users SET is_master_admin = 1 WHERE id = $1', [adminUser.id]);
      } else {
        await dbRun('UPDATE users SET is_master_admin = 1 WHERE id = ?', [adminUser.id]);
      }
      
      const server = await serverDB.create(
        'WorkGrid Official',
        'https://api.dicebear.com/7.x/identicon/svg?seed=WorkGrid',
        adminUser.id
      );
      
      await serverDB.addMember(server.id, adminUser.id, 'owner');
      
      const channels = [
        { name: 'selamat-datang', type: 'text' },
        { name: 'umum', type: 'text' },
        { name: 'bantuan', type: 'text' },
        { name: 'Suara Umum', type: 'voice' }
      ];
      
      for (const ch of channels) {
        await channelDB.create(server.id, ch.name, ch.type);
      }
      
      console.log('✅ Seed data created (Master Admin: admin@workgrid.com / admin123)');
    } catch (error) {
      console.error('❌ Error creating seed data:', error);
    }
  }
}

seedData();

// Security: Express CORS - allow all for development
app.use(cors({
  origin: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Authorization", "Content-Type"],
  credentials: true
}));

app.use(express.json());

// Security: Rate Limiting
const isDev = process.env.NODE_ENV !== 'production';

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isDev ? 100 : 10, // Development: 100, Production: 10
  message: { error: 'Too many attempts. Try again in 15 minutes.' }
});

const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: isDev ? 10000 : 300, // Development: 10000, Production: 300
  message: { error: 'Too many requests. Please slow down.' },
  skip: (req) => {
    // Skip rate limiting for /api/users/me (token verification)
    return req.path === '/users/me';
  },
  // Skip rate limiting completely in development for smoother experience
  skipSuccessfulRequests: isDev // Skip counting successful requests in dev
});

app.use('/api/', apiLimiter);

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
    const timestamp = Date.now();
    const randomNum = Math.round(Math.random() * 1E9);
    const uniqueSuffix = timestamp + '-' + randomNum;
    const ext = path.extname(file.originalname);
    const filename = file.fieldname + '-' + uniqueSuffix + ext;
    console.log('[MULTER] Generating filename:', filename, 'timestamp:', timestamp);
    cb(null, filename);
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 },
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

// File upload endpoint
app.post('/api/upload', authenticateToken, upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    console.log('[UPLOAD] File uploaded:', req.file.filename);
    
    res.json({
      url: `/uploads/${req.file.filename}`,
      filename: req.file.filename,
      originalName: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Upload failed' });
  }
});

// Serve static files
app.use(express.static(path.join(__dirname, '../app/dist')));
app.use('/uploads', (req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET');
  next();
}, express.static(uploadsDir));

// JWT Middleware - Simple token verification (7 days expiry)
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'Access denied' });
  }
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Support both 'id' and 'userId' fields in token
    req.userId = decoded.id || decoded.userId;
    req.user = decoded;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired' });
    }
    return res.status(403).json({ error: 'Invalid token' });
  }
}

// Helper function to format user response
function formatUserResponse(user) {
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    avatar: user.avatar,
    displayName: user.display_name,
    status: user.status || 'offline',
    isMasterAdmin: user.is_master_admin === 1 || user.is_master_admin === true,
    joinedViaGroupCode: user.joined_via_group_code || null
  };
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

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    const isPostgres = process.env.USE_POSTGRES === 'true';
    if (isPostgres) {
      const { pool } = require('./config/database');
      await pool.query('SELECT 1');
    } else {
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

// ==================== AUTO UPDATE ROUTES ====================

// Get current app version (MUST be before /updates/:filename)
app.get('/updates/version', (req, res) => {
  try {
    const pkgPath = path.join(__dirname, '../app/package.json');
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
    
    // Get latest release info if available
    const latestPath = path.join(__dirname, '../app/release/latest.yml');
    let latestVersion = pkg.version;
    let downloadUrl = null;
    
    if (fs.existsSync(latestPath)) {
      const yaml = require('js-yaml');
      const latest = yaml.load(fs.readFileSync(latestPath, 'utf8'));
      latestVersion = latest.version;
      downloadUrl = `/updates/${latest.path}`;
    }
    
    res.json({
      current: pkg.version,
      latest: latestVersion,
      updateAvailable: latestVersion !== pkg.version,
      downloadUrl: downloadUrl,
      releaseDate: fs.existsSync(latestPath) ? 
        fs.statSync(latestPath).mtime.toISOString() : 
        new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get version info' });
  }
});

// Serve latest.yml for auto-updater
app.get('/updates/latest.yml', (req, res) => {
  const latestPath = path.join(__dirname, '../app/release/latest.yml');
  
  if (fs.existsSync(latestPath)) {
    res.setHeader('Content-Type', 'application/x-yaml');
    res.sendFile(latestPath);
  } else {
    // Return mock data if file doesn't exist (development mode)
    res.setHeader('Content-Type', 'application/x-yaml');
    res.send(`version: 1.0.0
files:
  - url: WorkGrid Setup 1.0.0.exe
    sha512: mock-hash-for-development
    size: 0
path: WorkGrid Setup 1.0.0.exe
sha512: mock-hash-for-development
releaseDate: ${new Date().toISOString()}
`);
  }
});

// Serve update files (setup.exe)
app.get('/updates/:filename', (req, res) => {
  const filename = req.params.filename;
  const filePath = path.join(__dirname, '../app/release', filename);
  
  // Security: only allow specific file extensions
  if (!filename.match(/\.(exe|yml|yaml|blockmap|zip|dmg|AppImage|deb|rpm|nupkg|json|sig)$/i)) {
    return res.status(403).json({ error: 'Forbidden file type' });
  }
  
  if (fs.existsSync(filePath)) {
    res.sendFile(filePath);
  } else {
    res.status(404).json({ error: 'File not found' });
  }
});

// ==================== AUTH ROUTES ====================

// Register
app.post('/api/auth/register', authLimiter, async (req, res) => {
  try {
    const { username, email, password, groupCode } = req.body;
    
    if (!username || !email || !password) {
      return res.status(400).json({ error: 'All fields are required' });
    }
    
    if (username.length < 3 || username.length > 30) {
      return res.status(400).json({ error: 'Username must be between 3 and 30 characters' });
    }
    
    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      return res.status(400).json({ error: 'Username can only contain letters, numbers, and underscores' });
    }
    
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }
    
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }
    
    const existingUser = await userDB.findByEmail(email);
    if (existingUser) {
      return res.status(400).json({ error: 'Email already registered' });
    }
    
    const existingUsername = await userDB.findByUsername(username);
    if (existingUsername) {
      return res.status(400).json({ error: 'Username already taken' });
    }
    
    // Validate group code if provided
    let autoJoinServer = null;
    let defaultChannelId = null;
    
    if (groupCode) {
      // Check using inviteDB (group codes are invites with is_group_code = 1)
      const invite = await inviteDB.findByCode(groupCode);
      
      if (!invite || !invite.is_group_code) {
        return res.status(400).json({ error: 'Kode grup tidak valid' });
      }
      
      // Check if code has reached max uses
      if (invite.max_uses && invite.uses >= invite.max_uses) {
        return res.status(400).json({ error: 'Kode grup sudah mencapai batas penggunaan' });
      }
      
      // Check if code has expired
      if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
        return res.status(400).json({ error: 'Kode grup sudah expired' });
      }
      
      autoJoinServer = invite.server_id;
      
      // Get default channel from auto_join_channels
      if (invite.auto_join_channels) {
        try {
          const channelsArr = JSON.parse(invite.auto_join_channels);
          defaultChannelId = channelsArr[0] || null;
        } catch (e) {
          defaultChannelId = null;
        }
      }
    }
    
    const user = await userDB.create(username, email, password, groupCode || null);
    
    // Auto-join server if group code provided
    if (autoJoinServer) {
      try {
        // Check if already a member
        const existingMember = await serverDB.getMember(autoJoinServer, user.id);
        if (!existingMember) {
          // Add member to server
          await serverDB.addMember(autoJoinServer, user.id, 'member');
          
          // Increment invite usage
          await inviteDB.incrementUses(groupCode);
          
          // Grant default access to the server
          try {
            await userServerAccessDB.setServerAccess(user.id, autoJoinServer, true);
            console.log(`[Register] Granted default server access to user ${username} for server ${autoJoinServer}`);
          } catch (accessError) {
            console.error('[Register] Error granting default server access:', accessError);
          }
          
          console.log(`[Register] User ${username} auto-joined server ${autoJoinServer} via group code ${groupCode}`);
        }
      } catch (joinError) {
        console.error('[Register] Auto-join error:', joinError);
      }
    }
    
    // Auto-friend dengan user lain yang pakai kode grup yang sama
    if (groupCode) {
      try {
        // Cari semua user lain dengan kode grup yang sama
        const existingUsers = await userDB.findByGroupCode(groupCode);
        
        for (const existingUser of existingUsers) {
          if (existingUser.id !== user.id) {
            // Buat pertemanan otomatis (accepted)
            await friendDB.createAutoFriendship(existingUser.id, user.id);
            
            console.log(`[AutoFriend] ${username} berteman dengan ${existingUser.username} via kode ${groupCode}`);
            
            // Kirim notifikasi ke user lama via socket
            const targetSocket = getUserSocket(existingUser.id);
            if (targetSocket) {
              targetSocket.emit('new_friend_added', {
                friend: {
                  id: user.id,
                  username: user.username,
                  displayName: user.displayName || user.username,
                  avatar: user.avatar,
                  status: user.status
                },
                message: `${user.displayName || username} bergabung menggunakan kode ${groupCode} dan menjadi temanmu`
              });
            }
            
            // Kirim notifikasi ke user baru juga (newly registered user)
            const newUserSocket = getUserSocket(user.id);
            if (newUserSocket) {
              newUserSocket.emit('new_friend_added', {
                friend: {
                  id: existingUser.id,
                  username: existingUser.username,
                  displayName: existingUser.displayName || existingUser.username,
                  avatar: existingUser.avatar,
                  status: existingUser.status
                },
                message: `Anda berteman dengan ${existingUser.displayName || existingUser.username} dari kode ${groupCode}`
              });
            }
          }
        }
      } catch (friendError) {
        console.error('[Register] Auto-friend error:', friendError);
      }
    }
    
    // Generate JWT token (7 days expiry)
    const token = jwt.sign(
      { id: user.id, email: user.email, username: user.username },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    res.json({ 
      user: formatUserResponse(user), 
      token,
      autoJoinedServer: autoJoinServer ? true : false,
      defaultChannelId: defaultChannelId,
      serverId: autoJoinServer
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// Login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }
    
    const user = await userDB.findByEmail(email, true);
    if (!user) {
      return res.status(400).json({ error: 'Invalid email or password' });
    }
    
    // Check if user account is active
    if (user.is_active === 0) {
      return res.status(403).json({ error: 'Akun Anda telah dinonaktifkan, Hubungi Operator untuk mengaktifkan kembali.' });
    }
    
    const bcrypt = require('bcryptjs');
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(400).json({ error: 'Invalid email or password' });
    }
    
    // Check if user needs to force change password
    const needsPasswordChange = await userDB.needsPasswordChange(user.id);
    
    // Generate JWT token (7 days expiry)
    const token = jwt.sign(
      { id: user.id, email: user.email, username: user.username },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    // Get client IP address
    const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'Unknown';
    
    // Update last login timestamp and IP
    await userDB.updateLastLogin(user.id, clientIp);
    
    // If password needs to be changed, return special response
    if (needsPasswordChange) {
      return res.json({
        user: formatUserResponse({ ...user, status: 'online' }),
        token,
        requirePasswordChange: true,
        message: 'Anda harus mengganti password sebelum melanjutkan'
      });
    }
    
    // Update user status to online (only if not requiring password change)
    await userDB.updateProfile(user.id, { status: 'online' });
    
    res.json({ 
      user: formatUserResponse({ ...user, status: 'online' }), 
      token
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});



// Logout endpoint (simple - just client-side token removal)
app.post('/api/auth/logout', authenticateToken, async (req, res) => {
  res.json({ success: true, message: 'Berhasil logout' });
});

// Get current user (verify token)
app.get('/api/users/me', authenticateToken, async (req, res) => {
  try {
    const user = await userDB.findById(req.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(formatUserResponse(user));
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to get user' });
  }
});

// Update user profile
app.put('/api/users/profile', authenticateToken, async (req, res) => {
  try {
    const userId = req.userId;
    const { displayName, username, avatar, status } = req.body;
    
    // Build updates object
    const updates = {};
    if (displayName !== undefined) updates.displayName = displayName;
    if (username !== undefined) updates.username = username;
    if (avatar !== undefined) updates.avatar = avatar;
    if (status !== undefined) updates.status = status;
    
    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }
    
    // Update profile
    await userDB.updateProfile(userId, updates);
    
    // Get updated user
    const updatedUser = await userDB.findById(userId);
    
    res.json(formatUserResponse(updatedUser));
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// Change password (requires current password)
app.put('/api/users/password', authenticateToken, async (req, res) => {
  try {
    const userId = req.userId;
    const { currentPassword, newPassword } = req.body;
    
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current password and new password are required' });
    }
    
    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters' });
    }
    
    // Get user with password
    const user = await userDB.findById(userId, true);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    console.log('[Change Password] User found, checking password...');
    
    // Verify current password
    const bcrypt = require('bcryptjs');
    const isValid = await bcrypt.compare(currentPassword, user.password);
    if (!isValid) {
      return res.status(400).json({ error: 'Current password is incorrect' });
    }
    
    // Update password (database.js will handle hashing and reset force_password_change)
    await userDB.updatePassword(userId, newPassword);
    
    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ error: 'Failed to change password' });
  }
});

// Force change password (after admin reset - no current password required)
app.post('/api/users/force-change-password', authenticateToken, async (req, res) => {
  try {
    const userId = req.userId;
    const { newPassword } = req.body;
    
    if (!newPassword) {
      return res.status(400).json({ error: 'New password is required' });
    }
    
    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }
    
    // Check if user really needs to change password
    const needsChange = await userDB.needsPasswordChange(userId);
    if (!needsChange) {
      return res.status(403).json({ error: 'Password change not required' });
    }
    
    // Update password (database.js will handle hashing and reset force_password_change)
    await userDB.updatePassword(userId, newPassword);
    
    // Update user status to online after successful password change
    await userDB.updateProfile(userId, { status: 'online' });
    
    res.json({ 
      message: 'Password changed successfully. Please login again.',
      passwordChanged: true 
    });
  } catch (error) {
    console.error('Force change password error:', error);
    res.status(500).json({ error: 'Failed to change password' });
  }
});

// Upload user avatar
app.post('/api/users/avatar', authenticateToken, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    const userId = req.userId;
    const avatarUrl = `/uploads/${req.file.filename}`;
    
    console.log('[POST /api/users/avatar] Uploading avatar for user:', userId, 'file:', req.file.filename);
    
    // Update user avatar in database
    await userDB.updateProfile(userId, { avatar: avatarUrl });
    
    res.json({ avatar: avatarUrl });
  } catch (error) {
    console.error('Avatar upload error:', error);
    res.status(500).json({ error: 'Failed to upload avatar' });
  }
});

// Get user's servers
app.get('/api/servers', authenticateToken, async (req, res) => {
  try {
    const servers = await serverDB.getUserServers(req.userId);
    
    // Filter servers based on user access
    const accessibleServers = [];
    for (const server of servers) {
      const hasAccess = await userServerAccessDB.hasServerAccess(req.userId, server.id);
      if (hasAccess) {
        accessibleServers.push(server);
      }
    }
    
    res.json(accessibleServers);
  } catch (error) {
    console.error('Get servers error:', error);
    res.status(500).json({ error: 'Failed to get servers' });
  }
});

// Create new server
app.post('/api/servers', authenticateToken, async (req, res) => {
  try {
    const { name, icon } = req.body;
    
    if (!name || name.trim().length === 0) {
      return res.status(400).json({ error: 'Server name is required' });
    }
    
    if (name.length > 100) {
      return res.status(400).json({ error: 'Server name must be less than 100 characters' });
    }
    
    // Create server
    const server = await serverDB.create(name.trim(), icon || null, req.userId);
    
    // Add creator as owner
    await serverDB.addMember(server.id, req.userId, 'owner');
    
    // Create default channels
    await channelDB.create(server.id, 'umum', 'text');
    await channelDB.create(server.id, 'Suara Umum', 'voice');
    
    res.status(201).json(server);
  } catch (error) {
    console.error('Create server error:', error);
    res.status(500).json({ error: 'Failed to create server' });
  }
});

// Get server by ID
app.get('/api/servers/:serverId', authenticateToken, async (req, res) => {
  try {
    const { serverId } = req.params;
    const server = await serverDB.findById(serverId);
    
    if (!server) {
      return res.status(404).json({ error: 'Server not found' });
    }
    
    // Check if user has access to this server
    const hasAccess = await userServerAccessDB.hasServerAccess(req.userId, serverId);
    if (!hasAccess) {
      return res.status(403).json({ error: 'Akses ke server ini ditolak oleh admin' });
    }
    
    // Check if user is member
    const members = await serverDB.getMembers(serverId);
    const isMember = members.some(m => m.id === req.userId);
    
    if (!isMember) {
      return res.status(403).json({ error: 'You are not a member of this server' });
    }
    
    res.json(server);
  } catch (error) {
    console.error('Get server error:', error);
    res.status(500).json({ error: 'Failed to get server' });
  }
});

// Transfer server ownership
app.post('/api/servers/:serverId/transfer-ownership', authenticateToken, async (req, res) => {
  try {
    const { serverId } = req.params;
    const { newOwnerId } = req.body;
    const currentOwnerId = req.userId;
    
    if (!newOwnerId) {
      return res.status(400).json({ error: 'New owner ID is required' });
    }
    
    // Get server
    const server = await serverDB.findById(serverId);
    if (!server) {
      return res.status(404).json({ error: 'Server not found' });
    }
    
    // Check if current user is the owner
    if (server.owner_id !== currentOwnerId) {
      return res.status(403).json({ error: 'Only server owner can transfer ownership' });
    }
    
    // Check if new owner is a member
    const isMember = await serverDB.isMember(serverId, newOwnerId);
    if (!isMember) {
      return res.status(400).json({ error: 'New owner must be a member of this server' });
    }
    
    // Check if trying to transfer to self
    if (newOwnerId === currentOwnerId) {
      return res.status(400).json({ error: 'Cannot transfer ownership to yourself' });
    }
    
    // Transfer ownership
    await serverDB.transferOwnership(serverId, currentOwnerId, newOwnerId);
    
    // Emit socket event
    io.to(`server:${serverId}`).emit('ownership_transferred', {
      serverId,
      oldOwnerId: currentOwnerId,
      newOwnerId
    });
    
    res.json({ success: true, message: 'Ownership transferred successfully' });
  } catch (error) {
    console.error('[TRANSFER OWNERSHIP] Error:', error);
    res.status(500).json({ error: 'Failed to transfer ownership', details: error.message });
  }
});

// Update server (name, icon, description)
app.put('/api/servers/:serverId', authenticateToken, async (req, res) => {
  console.log('[PUT /api/servers/:serverId] Called with serverId:', req.params.serverId);
  try {
    const { serverId } = req.params;
    const { name, icon, description, banner } = req.body;
    const userId = req.userId;
    
    // Check if server exists
    const server = await serverDB.findById(serverId);
    if (!server) {
      return res.status(404).json({ error: 'Server not found' });
    }
    
    // Check if user has MANAGE_SERVER permission
    const members = await serverDB.getMembers(serverId);
    const member = members.find(m => m.id === userId);
    
    if (!member) {
      return res.status(403).json({ error: 'You are not a member of this server' });
    }
    
    const hasManagePermission = await permissionDB.hasPermission(userId, serverId, Permissions.MANAGE_SERVER);
    if (!hasManagePermission && member.role !== 'owner' && member.role !== 'admin') {
      return res.status(403).json({ error: 'Only owner or admin can update server' });
    }
    
    // Build update object
    const updates = {};
    if (name !== undefined) updates.name = name;
    if (icon !== undefined) updates.icon = icon;
    if (description !== undefined) updates.description = description;
    if (banner !== undefined) updates.banner = banner;
    
    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }
    
    // Update server
    await serverDB.update(serverId, updates);
    
    // Get updated server
    const updatedServer = await serverDB.findById(serverId);
    
    res.json(updatedServer);
  } catch (error) {
    console.error('Update server error:', error);
    res.status(500).json({ error: 'Failed to update server' });
  }
});

// Get user by ID (for DM profile)
app.get('/api/users/:userId', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await userDB.findById(userId);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Return user data without sensitive info
    res.json({
      id: user.id,
      username: user.username,
      displayName: user.display_name,
      avatar: user.avatar,
      status: user.status,
      email: user.email,
      created_at: user.created_at,
      // No role info for DM view
      role: null
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to get user' });
  }
});

// Get user permissions in server
app.get('/api/servers/:serverId/permissions', authenticateToken, async (req, res) => {
  try {
    const { serverId } = req.params;
    
    // Check if user has access to this server
    const hasAccess = await userServerAccessDB.hasServerAccess(req.userId, serverId);
    if (!hasAccess) {
      return res.status(403).json({ error: 'Akses ke server ini ditolak oleh admin' });
    }
    
    // Check if user is member
    const members = await serverDB.getMembers(serverId);
    const member = members.find(m => m.id === req.userId);
    
    if (!member) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    // Get server details
    const server = await serverDB.findById(serverId);
    const isOwner = server?.owner_id === req.userId;
    
    // Determine permissions based on role
    const role = member.role;
    const permissions = {
      isOwner,
      isAdmin: role === 'admin' || isOwner,
      isModerator: role === 'moderator' || role === 'admin' || isOwner,
      canManageChannels: role === 'admin' || role === 'owner' || isOwner,
      canManageRoles: role === 'admin' || role === 'owner' || isOwner,
      canManageMessages: role === 'moderator' || role === 'admin' || role === 'owner' || isOwner,
      canKickMembers: role === 'moderator' || role === 'admin' || role === 'owner' || isOwner,
      canBanMembers: role === 'admin' || role === 'owner' || isOwner,
      canInvite: true, // All members can invite by default
    };
    
    res.json(permissions);
  } catch (error) {
    console.error('Get permissions error:', error);
    res.status(500).json({ error: 'Failed to get permissions' });
  }
});

// Get server categories with channels
app.get('/api/servers/:serverId/categories', authenticateToken, async (req, res) => {
  try {
    const { serverId } = req.params;
    const userId = req.userId;
    
    console.log(`[CategoryFilter] User ${userId} requesting categories for server ${serverId}`);
    
    // Check if user has access to this server
    const hasAccess = await userServerAccessDB.hasServerAccess(userId, serverId);
    if (!hasAccess) {
      return res.status(403).json({ error: 'Akses ke server ini ditolak oleh admin' });
    }
    
    // Check if user is member
    const members = await serverDB.getMembers(serverId);
    const isMember = members.some(m => m.id === userId);
    
    if (!isMember) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    // Get categories
    const categories = await categoryDB.getByServer(serverId);
    
    // Get all channels
    const allChannels = await channelDB.getByServer(serverId);
    
    // Check if user is owner (owner can see all channels)
    const server = await serverDB.getById(serverId);
    const isOwner = server && server.owner_id === userId;
    
    // Get user's member info
    // For now, only select 'role' column as 'role_id' might not exist in all databases
    const isPostgres = process.env.USE_POSTGRES === 'true' || process.env.DATABASE_URL;
    let member;
    try {
      member = isPostgres 
        ? await dbGet(
            'SELECT role FROM server_members WHERE user_id = $1 AND server_id = $2',
            [userId, serverId]
          )
        : await dbGet(
            'SELECT role FROM server_members WHERE user_id = ? AND server_id = ?',
            [userId, serverId]
          );
    } catch (dbErr) {
      console.error('[Categories] DB Error:', dbErr.message);
      member = null;
    }
    
    // Check legacy role
    const hasLegacyRole = ['admin', 'owner', 'moderator'].includes(member?.role);
    
    // Get custom roles
    const userRoles = isPostgres
      ? await dbAll(
          `SELECT sr.id, sr.name
           FROM member_roles mr
           JOIN server_roles sr ON mr.role_id = sr.id
           WHERE mr.user_id = $1 AND mr.server_id = $2`,
          [userId, serverId]
        )
      : await dbAll(
          `SELECT sr.id, sr.name
           FROM member_roles mr
           JOIN server_roles sr ON mr.role_id = sr.id
           WHERE mr.user_id = ? AND mr.server_id = ?`,
          [userId, serverId]
        );
    
    const roleIds = [
      ...userRoles.map(r => r.id),
      ...(member?.role_id ? [member.role_id] : [])
    ];
    const uniqueRoleIds = [...new Set(roleIds)];
    
    console.log(`[CategoryFilter] isOwner: ${isOwner}, hasLegacyRole: ${hasLegacyRole}, roleIds:`, uniqueRoleIds);
    
    // Filter channels based on access
    let allowedChannels = allChannels;
    
    if (!isOwner && !hasLegacyRole && uniqueRoleIds.length > 0) {
      // Filter channels based on role access
      allowedChannels = [];
      for (const channel of allChannels) {
        let hasChannelAccess = false;
        for (const roleId of uniqueRoleIds) {
          const access = await roleChannelAccessDB.hasChannelAccess(roleId, channel.id);
          if (access) {
            hasChannelAccess = true;
            break;
          }
        }
        if (hasChannelAccess) {
          allowedChannels.push(channel);
        }
      }
      console.log(`[CategoryFilter] Filtered ${allChannels.length} channels to ${allowedChannels.length}`);
    } else if (isOwner || hasLegacyRole) {
      console.log(`[CategoryFilter] User is owner/has legacy role - all channels allowed`);
    }
    
    // Group channels by category
    const channelsByCategory = new Map();
    const uncategorized = [];
    
    for (const channel of allowedChannels) {
      if (channel.category_id) {
        if (!channelsByCategory.has(channel.category_id)) {
          channelsByCategory.set(channel.category_id, []);
        }
        channelsByCategory.get(channel.category_id).push(channel);
      } else {
        uncategorized.push(channel);
      }
    }
    
    // Add channels to categories
    const categoriesWithChannels = categories.map(cat => ({
      ...cat,
      channels: channelsByCategory.get(cat.id) || []
    }));
    
    res.json({
      categories: categoriesWithChannels,
      uncategorized: uncategorized
    });
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({ error: 'Failed to get categories' });
  }
});

// Create category
app.post('/api/servers/:serverId/categories', authenticateToken, async (req, res) => {
  try {
    const { serverId } = req.params;
    const { name } = req.body;
    const userId = req.userId;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Nama kategori wajib diisi' });
    }

    // Check if user is member with manage permissions
    const server = await serverDB.getById(serverId);
    if (!server) return res.status(404).json({ error: 'Server tidak ditemukan' });

    const memberRole = await serverDB.getMemberRole(serverId, userId);
    if (!memberRole) return res.status(403).json({ error: 'Bukan anggota server' });

    if (memberRole !== 'owner' && memberRole !== 'admin') {
      return res.status(403).json({ error: 'Tidak ada izin untuk membuat kategori' });
    }

    // Get current max position
    const categories = await categoryDB.getByServer(serverId);
    const position = categories.length;

    const category = await categoryDB.create(serverId, name.trim(), position);

    // Emit socket event
    io.to(`server:${serverId}`).emit('category_created', { category });

    res.status(201).json(category);
  } catch (error) {
    console.error('Create category error:', error);
    res.status(500).json({ error: 'Gagal membuat kategori' });
  }
});

// Get server channels
app.get('/api/servers/:serverId/channels', authenticateToken, async (req, res) => {
  try {
    const { serverId } = req.params;
    const userId = req.userId;
    
    console.log(`[ChannelFilter] User ${userId} requesting channels for server ${serverId}`);
    
    // Check if user has access to this server
    const hasAccess = await userServerAccessDB.hasServerAccess(userId, serverId);
    if (!hasAccess) {
      console.log(`[ChannelFilter] Server access denied for user ${userId}`);
      return res.status(403).json({ error: 'Akses ke server ini ditolak oleh admin' });
    }
    
    // Get all channels
    const channels = await channelDB.getByServer(serverId);
    console.log(`[ChannelFilter] Total channels in server: ${channels.length}`);
    
    // Check if user is owner (owner can see all channels)
    const server = await serverDB.getById(serverId);
    if (server && server.owner_id === userId) {
      console.log(`[ChannelFilter] User ${userId} is owner - returning all channels`);
      return res.json(channels);
    }
    
    // Get user's member info
    // For now, only select 'role' column as 'role_id' might not exist in all databases
    const isPostgres = process.env.USE_POSTGRES === 'true' || process.env.DATABASE_URL;
    let member;
    try {
      member = isPostgres 
        ? await dbGet(
            'SELECT role FROM server_members WHERE user_id = $1 AND server_id = $2',
            [userId, serverId]
          )
        : await dbGet(
            'SELECT role FROM server_members WHERE user_id = ? AND server_id = ?',
            [userId, serverId]
          );
    } catch (dbErr) {
      console.error('[Categories] DB Error:', dbErr.message);
      member = null;
    }
    console.log(`[ChannelFilter] Member info:`, member);
    
    // If member has legacy role (admin, moderator), allow all channels
    // This is for backward compatibility
    const legacyRole = member?.role;
    if (legacyRole === 'admin' || legacyRole === 'owner' || legacyRole === 'moderator') {
      console.log(`[ChannelFilter] User has legacy role '${legacyRole}' - returning all channels`);
      return res.json(channels);
    }
    
    // Get custom roles assigned to user (from member_roles table)
    const userRoles = isPostgres
      ? await dbAll(
          `SELECT sr.id, sr.name
           FROM member_roles mr
           JOIN server_roles sr ON mr.role_id = sr.id
           WHERE mr.user_id = $1 AND mr.server_id = $2`,
          [userId, serverId]
        )
      : await dbAll(
          `SELECT sr.id, sr.name
           FROM member_roles mr
           JOIN server_roles sr ON mr.role_id = sr.id
           WHERE mr.user_id = ? AND mr.server_id = ?`,
          [userId, serverId]
        );
    console.log(`[ChannelFilter] User roles from member_roles:`, userRoles.map(r => r.name));
    
    // Also get role from server_members.role_id (legacy/custom role assignment)
    const memberRole = isPostgres
      ? await dbGet(
          'SELECT role_id FROM server_members WHERE user_id = $1 AND server_id = $2',
          [userId, serverId]
        )
      : await dbGet(
          'SELECT role_id FROM server_members WHERE user_id = ? AND server_id = ?',
          [userId, serverId]
        );
    
    const roleIds = [
      ...userRoles.map(r => r.id),
      ...(memberRole?.role_id ? [memberRole.role_id] : [])
    ];
    
    // Remove duplicates
    const uniqueRoleIds = [...new Set(roleIds)];
    console.log(`[ChannelFilter] Unique role IDs:`, uniqueRoleIds);
    
    // Get role details to check for admin/owner permissions
    const roleDetails = uniqueRoleIds.length > 0
      ? isPostgres
        ? await dbAll(
            `SELECT id, name, permissions FROM server_roles WHERE id = ANY($1)`,
            [uniqueRoleIds]
          )
        : await dbAll(
            `SELECT id, name, permissions FROM server_roles WHERE id IN (${uniqueRoleIds.map(() => '?').join(',')})`,
            uniqueRoleIds
          )
      : [];
    
    // Check if any role has ADMINISTRATOR permission (bit 10 = 1024)
    const hasAdminRole = roleDetails.some(r => {
      const perms = parseInt(r.permissions) || 0;
      return (perms & 1024) !== 0; // ADMINISTRATOR = 1 << 10
    });
    
    // Check if any role has MANAGE_CHANNELS permission (bit 7 = 128)
    const hasManageChannels = roleDetails.some(r => {
      const perms = parseInt(r.permissions) || 0;
      return (perms & 128) !== 0; // MANAGE_CHANNELS = 1 << 7
    });
    
    console.log(`[ChannelFilter] Has admin role: ${hasAdminRole}, Has manage channels: ${hasManageChannels}`);
    
    // If user has admin/manage_channels permission, allow all channels
    if (hasAdminRole || hasManageChannels) {
      console.log(`[ChannelFilter] User has admin/manage_channels - returning all channels`);
      return res.json(channels);
    }
    
    // If user has no custom roles, allow all channels (backward compatible)
    if (uniqueRoleIds.length === 0) {
      console.log(`[ChannelFilter] No custom roles - returning all channels (backward compat)`);
      return res.json(channels);
    }
    
    // Filter channels based on role access
    const accessibleChannels = [];
    for (const channel of channels) {
      // Check if any of user's custom roles has access to this channel
      let hasChannelAccess = false;
      
      for (const roleId of uniqueRoleIds) {
        const access = await roleChannelAccessDB.hasChannelAccess(roleId, channel.id);
        console.log(`[ChannelFilter] Channel: ${channel.name}, RoleID: ${roleId}, Access: ${access}`);
        if (access) {
          hasChannelAccess = true;
          break;
        }
      }
      
      // Only include if explicitly allowed
      if (hasChannelAccess) {
        accessibleChannels.push(channel);
        console.log(`[ChannelFilter] Channel ${channel.name} INCLUDED`);
      } else {
        console.log(`[ChannelFilter] Channel ${channel.name} EXCLUDED`);
      }
    }
    
    console.log(`[ChannelFilter] Returning ${accessibleChannels.length} of ${channels.length} channels`);
    res.json(accessibleChannels);
  } catch (error) {
    console.error('Get channels error:', error);
    res.status(500).json({ error: 'Failed to get channels' });
  }
});

// Create new channel
app.post('/api/servers/:serverId/channels', authenticateToken, async (req, res) => {
  try {
    const { serverId } = req.params;
    const { name, type, categoryId } = req.body;
    
    if (!name || name.trim().length === 0) {
      return res.status(400).json({ error: 'Channel name is required' });
    }
    
    // Check permission
    const hasPermission = await permissionDB.hasPermission(req.userId, serverId, Permissions.MANAGE_CHANNELS);
    if (!hasPermission) {
      return res.status(403).json({ error: 'You do not have permission to create channels' });
    }
    
    const channel = await channelDB.create(serverId, name.trim(), type || 'text', categoryId || null);
    
    // Emit socket event
    io.to(serverId).emit('channel_created', { serverId, channel });
    
    res.status(201).json(channel);
  } catch (error) {
    console.error('Create channel error:', error);
    res.status(500).json({ error: 'Failed to create channel' });
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
    
    // Check if user has access to this server
    const hasAccess = await userServerAccessDB.hasServerAccess(req.userId, serverId);
    if (!hasAccess) {
      return res.status(403).json({ error: 'Akses ke server ini ditolak oleh admin' });
    }
    
    const members = await serverDB.getMembers(serverId);
    res.json(members);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get members' });
  }
});

// Get specific server member details (alias for /users/)
app.get('/api/servers/:serverId/users/:userId', authenticateToken, async (req, res) => {
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

// Leave server (self-removal)
app.post('/api/servers/:serverId/leave', authenticateToken, async (req, res) => {
  try {
    const userId = req.userId;
    const { serverId } = req.params;
    
    console.log(`[LEAVE SERVER] User ${userId} trying to leave server ${serverId}`);
    
    // Check if server exists
    const server = await serverDB.findById(serverId);
    if (!server) {
      console.log(`[LEAVE SERVER] Server ${serverId} not found`);
      return res.status(404).json({ error: 'Server not found' });
    }
    
    // Check if user is a member
    const isMember = await serverDB.isMember(serverId, userId);
    if (!isMember) {
      return res.status(403).json({ error: 'You are not a member of this server' });
    }
    
    // If owner is trying to leave
    if (server.owner_id === userId) {
      // Get member count
      const members = await serverDB.getMembers(serverId);
      
      // If owner is the only member, delete the server
      if (members.length === 1) {
        console.log(`[LEAVE SERVER] Owner is the only member. Deleting server ${serverId}`);
        await serverDB.delete(serverId);
        
        // Emit socket event
        io.to(`server:${serverId}`).emit('server_deleted', {
          serverId,
          deletedBy: userId
        });
        
        return res.json({ success: true, message: 'Server deleted successfully' });
      }
      
      // If there are other members, owner cannot leave
      return res.status(403).json({ error: 'Server owner cannot leave. Transfer ownership or delete the server.' });
    }
    
    // Remove member from server
    await serverDB.removeMember(serverId, userId);
    
    // Emit socket event to notify server members
    io.to(`server:${serverId}`).emit('member_left', {
      serverId,
      userId
    });
    
    res.json({ success: true, message: 'Left server successfully' });
  } catch (error) {
    console.error('[LEAVE SERVER] Error details:', error.message);
    console.error('[LEAVE SERVER] Stack:', error.stack);
    res.status(500).json({ error: 'Failed to leave server', details: error.message });
  }
});

// ==================== SERVER ROLES ROUTES ====================

// Get all roles for a server
app.get('/api/servers/:serverId/roles', authenticateToken, async (req, res) => {
  try {
    const { serverId } = req.params;
    const userId = req.userId;
    
    // Check if user is a member
    const isMember = await serverDB.isMember(serverId, userId);
    if (!isMember) {
      return res.status(403).json({ error: 'You are not a member of this server' });
    }
    
    const roles = await roleDB.getServerRoles(serverId);
    res.json(roles);
  } catch (error) {
    console.error('Get roles error:', error);
    res.status(500).json({ error: 'Failed to get roles' });
  }
});

// Create a new role
app.post('/api/servers/:serverId/roles', authenticateToken, async (req, res) => {
  try {
    const { serverId } = req.params;
    const userId = req.userId;
    const { name, color } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: 'Role name is required' });
    }
    
    // Check permissions (Manage Roles)
    const hasPermission = await permissionDB.hasPermission(userId, serverId, Permissions.MANAGE_ROLES);
    if (!hasPermission) {
      return res.status(403).json({ error: 'You do not have permission to manage roles' });
    }
    
    // Get current roles count for position
    const existingRoles = await roleDB.getServerRoles(serverId);
    const position = existingRoles.length;
    
    const role = await roleDB.createRole(serverId, name, color || '#5865f2', 0, position);
    res.status(201).json(role);
  } catch (error) {
    console.error('Create role error:', error);
    res.status(500).json({ error: 'Failed to create role' });
  }
});

// Update a role
app.put('/api/servers/:serverId/roles/:roleId', authenticateToken, async (req, res) => {
  try {
    const { serverId, roleId } = req.params;
    const userId = req.userId;
    const { name, color, permissions } = req.body;
    
    // Check permissions (Manage Roles)
    const hasPermission = await permissionDB.hasPermission(userId, serverId, Permissions.MANAGE_ROLES);
    if (!hasPermission) {
      return res.status(403).json({ error: 'You do not have permission to manage roles' });
    }
    
    // Check if role exists and belongs to this server
    const role = await roleDB.getRoleById(roleId);
    if (!role || role.server_id !== serverId) {
      return res.status(404).json({ error: 'Role not found' });
    }
    
    // Cannot modify default role name
    if (role.is_default && name && name !== role.name) {
      return res.status(403).json({ error: 'Cannot change default role name' });
    }
    
    const updates = {};
    if (name !== undefined) updates.name = name;
    if (color !== undefined) updates.color = color;
    if (permissions !== undefined) updates.permissions = permissions;
    
    await roleDB.updateRole(roleId, updates);
    
    const updatedRole = await roleDB.getRoleById(roleId);
    res.json(updatedRole);
  } catch (error) {
    console.error('Update role error:', error);
    res.status(500).json({ error: 'Failed to update role' });
  }
});

// Delete a role
app.delete('/api/servers/:serverId/roles/:roleId', authenticateToken, async (req, res) => {
  try {
    const { serverId, roleId } = req.params;
    const userId = req.userId;
    
    // Check permissions (Manage Roles)
    const hasPermission = await permissionDB.hasPermission(userId, serverId, Permissions.MANAGE_ROLES);
    if (!hasPermission) {
      return res.status(403).json({ error: 'You do not have permission to manage roles' });
    }
    
    // Check if role exists and belongs to this server
    const role = await roleDB.getRoleById(roleId);
    console.log('[Delete Role] role:', role);
    if (!role || role.server_id !== serverId) {
      return res.status(404).json({ error: 'Role not found' });
    }
    
    // Cannot delete default role
    console.log('[Delete Role] is_default:', role.is_default, typeof role.is_default);
    if (role.is_default === 1 || role.is_default === true) {
      return res.status(403).json({ error: 'Cannot delete default role' });
    }
    
    await roleDB.deleteRole(roleId);
    res.json({ success: true });
  } catch (error) {
    console.error('Delete role error:', error);
    res.status(500).json({ error: 'Failed to delete role' });
  }
});

// Reorder a role (move up or down)
app.put('/api/servers/:serverId/roles/:roleId/reorder', authenticateToken, async (req, res) => {
  try {
    const { serverId, roleId } = req.params;
    const { direction } = req.body;
    const userId = req.userId;
    
    // Check permissions (Manage Roles)
    const hasPermission = await permissionDB.hasPermission(userId, serverId, Permissions.MANAGE_ROLES);
    if (!hasPermission) {
      return res.status(403).json({ error: 'You do not have permission to manage roles' });
    }
    
    // Check if role exists and belongs to this server
    const role = await roleDB.getRoleById(roleId);
    if (!role || role.server_id !== serverId) {
      return res.status(404).json({ error: 'Role not found' });
    }
    
    // Allow reordering all roles (including default)
    const allRoles = await roleDB.getServerRoles(serverId);
    const customRoles = allRoles.sort((a, b) => b.position - a.position);
    
    const currentIndex = customRoles.findIndex(r => r.id === roleId);
    if (currentIndex === -1) {
      return res.status(404).json({ error: 'Role not found in server' });
    }
    
    // Calculate new position
    let newPosition;
    if (direction === 'up') {
      // Move up = higher position
      if (currentIndex === 0) {
        return res.status(400).json({ error: 'Role is already at the top' });
      }
      const roleAbove = customRoles[currentIndex - 1];
      newPosition = roleAbove.position + 1;
    } else {
      // Move down = lower position
      if (currentIndex === customRoles.length - 1) {
        return res.status(400).json({ error: 'Role is already at the bottom' });
      }
      const roleBelow = customRoles[currentIndex + 1];
      newPosition = roleBelow.position - 1;
    }
    
    // Update role position
    await roleDB.updateRole(roleId, { position: newPosition });
    
    // Normalize positions to ensure they're sequential
    await roleDB.normalizeRolePositions(serverId);
    
    res.json({ success: true });
  } catch (error) {
    console.error('Reorder role error:', error);
    res.status(500).json({ error: 'Failed to reorder role' });
  }
});

// ============================================
// ROLE-CHANNEL ACCESS ENDPOINTS
// ============================================

// Get all channel access for a specific role
app.get('/api/servers/:serverId/roles/:roleId/channels', authenticateToken, async (req, res) => {
  try {
    const { serverId, roleId } = req.params;
    const userId = req.userId;
    
    // Check permissions (Manage Roles)
    const hasPermission = await permissionDB.hasPermission(userId, serverId, Permissions.MANAGE_ROLES);
    if (!hasPermission) {
      return res.status(403).json({ error: 'You do not have permission to manage roles' });
    }
    
    // Get all channels for this server with access info for the role
    const channels = await dbAll(
      `SELECT c.id, c.name, c.type, c.category_id,
              CASE WHEN rca.is_allowed IS NULL THEN 1 ELSE rca.is_allowed END as is_allowed
       FROM channels c
       LEFT JOIN role_channel_access rca ON c.id = rca.channel_id AND rca.role_id = ?
       WHERE c.server_id = ?
       ORDER BY c.position`,
      [roleId, serverId]
    );
    
    res.json({ channels });
  } catch (error) {
    console.error('Get role channel access error:', error);
    res.status(500).json({ error: 'Failed to get role channel access' });
  }
});

// Update channel access for a role
app.put('/api/servers/:serverId/roles/:roleId/channels/:channelId/access', authenticateToken, async (req, res) => {
  try {
    const { serverId, roleId, channelId } = req.params;
    const { isAllowed } = req.body;
    const userId = req.userId;
    
    // Check permissions (Manage Roles)
    const hasPermission = await permissionDB.hasPermission(userId, serverId, Permissions.MANAGE_ROLES);
    if (!hasPermission) {
      return res.status(403).json({ error: 'You do not have permission to manage roles' });
    }
    
    // Verify channel belongs to this server
    const channel = await channelDB.getById(channelId);
    if (!channel || channel.server_id !== serverId) {
      return res.status(404).json({ error: 'Channel not found' });
    }
    
    // Verify role belongs to this server
    const role = await roleDB.getRoleById(roleId);
    if (!role || role.server_id !== serverId) {
      return res.status(404).json({ error: 'Role not found' });
    }
    
    // Set channel access
    await roleChannelAccessDB.setChannelAccess(roleId, channelId, isAllowed);
    
    res.json({ success: true, message: `Akses channel ${isAllowed ? 'diberikan' : 'ditolak'}` });
  } catch (error) {
    console.error('Update role channel access error:', error);
    res.status(500).json({ error: 'Failed to update channel access' });
  }
});

// Bulk update channel access for a role
app.put('/api/servers/:serverId/roles/:roleId/channels/bulk', authenticateToken, async (req, res) => {
  try {
    const { serverId, roleId } = req.params;
    const { channelAccess } = req.body; // Array of { channelId, isAllowed }
    const userId = req.userId;
    
    // Check permissions (Manage Roles)
    const hasPermission = await permissionDB.hasPermission(userId, serverId, Permissions.MANAGE_ROLES);
    if (!hasPermission) {
      return res.status(403).json({ error: 'You do not have permission to manage roles' });
    }
    
    // Verify role belongs to this server
    const role = await roleDB.getRoleById(roleId);
    if (!role || role.server_id !== serverId) {
      return res.status(404).json({ error: 'Role not found' });
    }
    
    // Bulk update
    await roleChannelAccessDB.bulkUpdateChannelAccess(roleId, channelAccess);
    
    res.json({ success: true, message: 'Akses channel diperbarui' });
  } catch (error) {
    console.error('Bulk update role channel access error:', error);
    res.status(500).json({ error: 'Failed to update channel access' });
  }
});

// Assign custom role to member
app.put('/api/servers/:serverId/members/:userId/custom-role', authenticateToken, async (req, res) => {
  try {
    const { serverId, userId } = req.params;
    const { roleId } = req.body;
    const requesterId = req.userId;
    
    if (!roleId) {
      return res.status(400).json({ error: 'roleId is required' });
    }
    
    // Check if requester has permission to manage roles
    const hasPermission = await permissionDB.hasPermission(requesterId, serverId, Permissions.MANAGE_ROLES);
    if (!hasPermission) {
      return res.status(403).json({ error: 'You do not have permission to manage roles' });
    }
    
    // Check if role exists and belongs to this server
    const role = await roleDB.getRoleById(roleId);
    if (!role || role.server_id !== serverId) {
      return res.status(404).json({ error: 'Role not found' });
    }
    
    // Assign role to member
    await roleDB.assignRole(serverId, userId, roleId);
    
    res.json({ success: true });
  } catch (error) {
    console.error('Assign role error:', error);
    res.status(500).json({ error: 'Failed to assign role' });
  }
});

// Remove member from a specific role
app.delete('/api/servers/:serverId/members/:userId/roles/:roleId', authenticateToken, async (req, res) => {
  try {
    const { serverId, userId, roleId } = req.params;
    const requesterId = req.userId;
    
    // Check if requester has permission to manage roles
    const hasPermission = await permissionDB.hasPermission(requesterId, serverId, Permissions.MANAGE_ROLES);
    if (!hasPermission) {
      return res.status(403).json({ error: 'You do not have permission to manage roles' });
    }
    
    // Remove specific role from member
    await roleDB.removeMemberRole(serverId, userId, roleId);
    
    res.json({ success: true });
  } catch (error) {
    console.error('Remove member role error:', error);
    res.status(500).json({ error: 'Failed to remove member role' });
  }
});

// ==================== MESSAGE REACTION ROUTES ====================

// Add reaction to message
app.post('/api/messages/:messageId/reactions', authenticateToken, async (req, res) => {
  try {
    const { messageId } = req.params;
    const { emoji } = req.body;
    const userId = req.userId;
    
    if (!emoji) {
      return res.status(400).json({ error: 'Emoji is required' });
    }
    
    // Check if message exists
    const message = await messageDB.getById(messageId);
    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }
    
    // Add reaction
    await reactionDB.add(messageId, userId, emoji);
    
    // Get updated reactions
    const reactions = await reactionDB.getGroupedByMessage(messageId);
    
    // Broadcast to channel
    console.log('📡 Server: Broadcasting reaction_added to channel:', message.channel_id, 'Message:', messageId);
    console.log('📡 Server: Reactions:', JSON.stringify(reactions));
    io.to(message.channel_id).emit('reaction_added', { messageId, reactions });
    
    // Send notification to message owner (if not self)
    if (message.userId !== userId) {
      try {
        // Get reactor info
        const reactor = await userDB.findById(userId);
        // Get channel info
        const channel = await channelDB.getById(message.channel_id);
        
        if (reactor && channel && pushService.isConfigured()) {
          await pushService.sendReactionNotification(
            message.userId,
            reactor.display_name || reactor.username,
            emoji,
            channel.name,
            `/channels/${message.channel_id}?message=${messageId}`
          );
        }
      } catch (notifError) {
        console.error('Failed to send reaction notification:', notifError);
        // Don't fail the request if notification fails
      }
    }
    
    res.json({ success: true, reactions });
  } catch (error) {
    console.error('Add reaction error:', error);
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
    
    // Check if message exists
    const message = await messageDB.getById(messageId);
    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }
    
    // Remove reaction
    await reactionDB.remove(messageId, userId, emoji);
    
    // Get updated reactions
    const reactions = await reactionDB.getGroupedByMessage(messageId);
    
    // Broadcast to channel
    io.to(message.channel_id).emit('reaction_removed', { messageId, reactions });
    
    res.json({ success: true, reactions });
  } catch (error) {
    console.error('Remove reaction error:', error);
    res.status(500).json({ error: 'Failed to remove reaction' });
  }
});

// Get reactions for a message
app.get('/api/messages/:messageId/reactions', authenticateToken, async (req, res) => {
  try {
    const { messageId } = req.params;
    
    // Check if message exists
    const message = await messageDB.getById(messageId);
    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }
    
    // Get reactions
    const reactions = await reactionDB.getGroupedByMessage(messageId);
    
    res.json(reactions);
  } catch (error) {
    console.error('Get reactions error:', error);
    res.status(500).json({ error: 'Failed to get reactions' });
  }
});

// ==================== MESSAGE PIN ROUTES ====================

// Pin a message
app.post('/api/messages/:messageId/pin', authenticateToken, async (req, res) => {
  try {
    const { messageId } = req.params;
    const userId = req.userId;
    
    // Check if message exists
    const message = await messageDB.getById(messageId);
    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }
    
    // Get server_id from message (messageDB.getById returns server_id from channels table)
    const serverId = message.server_id;
    if (!serverId) {
      return res.status(400).json({ error: 'Cannot determine server for this message' });
    }
    
    // Check user permissions (must have manage_messages permission)
    const hasPermission = await permissionDB.hasPermission(userId, serverId, Permissions.MANAGE_MESSAGES);
    if (!hasPermission) {
      return res.status(403).json({ error: 'You do not have permission to pin messages' });
    }
    
    // Pin the message
    const pinnedMessage = await messageDB.pin(messageId, userId);
    
    // Broadcast to channel
    io.to(message.channel_id).emit('message_pinned', { 
      messageId, 
      channelId: message.channel_id,
      pinnedBy: userId 
    });
    
    res.json({ success: true, message: pinnedMessage });
  } catch (error) {
    console.error('Pin message error:', error);
    res.status(500).json({ error: 'Failed to pin message' });
  }
});

// Unpin a message
app.post('/api/messages/:messageId/unpin', authenticateToken, async (req, res) => {
  try {
    const { messageId } = req.params;
    const userId = req.userId;
    
    // Check if message exists
    const message = await messageDB.getById(messageId);
    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }
    
    // Get server_id from message
    const serverId = message.server_id;
    if (!serverId) {
      return res.status(400).json({ error: 'Cannot determine server for this message' });
    }
    
    // Check user permissions (must have manage_messages permission)
    const hasPermission = await permissionDB.hasPermission(userId, serverId, Permissions.MANAGE_MESSAGES);
    if (!hasPermission) {
      return res.status(403).json({ error: 'You do not have permission to unpin messages' });
    }
    
    // Unpin the message
    const unpinnedMessage = await messageDB.unpin(messageId);
    
    // Broadcast to channel
    io.to(message.channel_id).emit('message_unpinned', { 
      messageId, 
      channelId: message.channel_id 
    });
    
    res.json({ success: true, message: unpinnedMessage });
  } catch (error) {
    console.error('Unpin message error:', error);
    res.status(500).json({ error: 'Failed to unpin message' });
  }
});

// Get pinned messages for a channel
app.get('/api/channels/:channelId/pins', authenticateToken, async (req, res) => {
  try {
    const { channelId } = req.params;
    
    // Check if channel exists
    const channel = await channelDB.getById(channelId);
    if (!channel) {
      return res.status(404).json({ error: 'Channel not found' });
    }
    
    // Get pinned messages
    const pinnedMessages = await messageDB.getPinnedByChannel(channelId);
    
    res.json({ messages: pinnedMessages });
  } catch (error) {
    console.error('Get pinned messages error:', error);
    res.status(500).json({ error: 'Failed to get pinned messages' });
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
    
    // Check if user is trying to add themselves
    if (targetUserId === userId) {
      return res.status(400).json({ error: 'Cannot add yourself as a friend' });
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
        displayName: sender.display_name,
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
    const request = await friendDB.getRequestById(requestId);

    
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
      const rows = await userDB.search(searchQuery, userId, server_id, 10);
      res.json({ users: rows });
      return;
    }

    
    // Regular user search (no server filter)
    const rows = await userDB.search(searchQuery || email, userId, null, 20);
    
    // Get mutual servers for each user
    const usersWithMutual = await Promise.all(
      rows.map(async (user) => {
        const mutualServers = await userDB.getMutualServerCount(userId, user.id);
        return { ...user, mutualServers };
      })
    );
    
    // Return in consistent format
    if (q !== undefined) {
      res.json({ users: usersWithMutual });
    } else {
      res.json(usersWithMutual);
    }

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

// Create DM channel (direct 1-on-1 or group DM)
app.post('/api/dm/channels', authenticateToken, async (req, res) => {
  try {
    const userId = req.userId;
    const { friendId, userIds, name, type = 'direct' } = req.body;
    
    // Group DM creation
    if (type === 'group' || (userIds && userIds.length > 1)) {
      if (!userIds || !Array.isArray(userIds) || userIds.length < 1) {
        return res.status(400).json({ error: 'At least 2 users required for group DM' });
      }
      
      // Include creator if not in list
      const allUserIds = userIds.includes(userId) ? userIds : [userId, ...userIds];
      
      if (allUserIds.length < 2) {
        return res.status(400).json({ error: 'At least 2 users required for group DM' });
      }
      
      // Check friendships for all users
      for (const targetId of userIds) {
        if (targetId === userId) continue;
        
        const areFriends = await friendDB.isFriend(userId, targetId);
        if (!areFriends) {
          return res.status(403).json({ error: `You must be friends with all members` });
        }
        
        const isBlocked = await friendDB.isBlocked(userId, targetId) || await friendDB.isBlocked(targetId, userId);
        if (isBlocked) {
          return res.status(403).json({ error: 'Cannot add blocked users to group' });
        }
      }
      
      // Create group DM
      const channel = await dmDB.createGroupDMChannel(userId, allUserIds, name);
      
      // Notify all members via socket
      for (const memberId of allUserIds) {
        if (memberId === userId) continue;
        
        const memberSocket = getUserSocket(memberId);
        if (memberSocket) {
          memberSocket.emit('group_dm_created', {
            channelId: channel.id,
            name: channel.name,
            createdBy: userId
          });
        }
      }
      
      // Return channel with members
      const channelWithMembers = await dmDB.getDMChannelById(channel.id);
      res.json({
        id: channelWithMembers.id,
        name: channelWithMembers.name,
        type: 'group',
        members: channelWithMembers.members,
        creatorId: channelWithMembers.creator_id
      });
      return;
    }
    
    // Direct DM creation (1-on-1)
    if (!friendId) {
      return res.status(400).json({ error: 'friendId or userIds required' });
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
    let channel = await dmDB.getDMChannelBetweenUsers(userId, friendId);
    if (!channel) {
      channel = await dmDB.createDMChannel(userId, friendId);
    }
    
    // Get full channel data with members
    const channelWithMembers = await dmDB.getDMChannelById(channel.id);
    const friend = channelWithMembers.members.find((m) => m.id !== userId) || channelWithMembers.members[0];
    
    res.json({
      id: channel.id,
      type: 'direct',
      friend: {
        id: friend.id,
        username: friend.username,
        avatar: friend.avatar,
        status: friend.status
      },
      members: channelWithMembers.members
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
    const formattedChannels = channels.map(ch => {
      const base = {
        id: ch.id,
        name: ch.name,
        type: ch.type,
        lastMessage: ch.last_message,
        lastMessageAt: ch.last_message_at,
        unreadCount: ch.unread_count || 0,
        updatedAt: ch.updated_at,
        members: ch.members || []
      };
      
      // For direct messages, include friend info for backward compatibility
      if (ch.type === 'direct' && ch.friend) {
        base.friend = {
          id: ch.friend.id,
          username: ch.friend.username,
          displayName: ch.friend.displayName,
          avatar: ch.friend.avatar,
          status: ch.friend.status
        };
      }
      
      return base;
    });
    
    res.json(formattedChannels);
  } catch (error) {
    console.error('Get DM channels error:', error);
    res.status(500).json({ error: 'Failed to get DM channels' });
  }
});

// Add member to group DM
app.post('/api/dm/channels/:channelId/members', authenticateToken, async (req, res) => {
  try {
    const userId = req.userId;
    const { channelId } = req.params;
    const { userId: newMemberId } = req.body;
    
    if (!newMemberId) {
      return res.status(400).json({ error: 'userId required' });
    }
    
    // Check if channel exists and is a group
    const channel = await dmDB.getDMChannelById(channelId);
    if (!channel) {
      return res.status(404).json({ error: 'Channel not found' });
    }
    
    if (channel.type !== 'group') {
      return res.status(400).json({ error: 'Can only add members to group DMs' });
    }
    
    // Check if requesting user is a member
    const isMember = await dmDB.isChannelMember(channelId, userId);
    if (!isMember) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    // Check if new user is already a member
    const alreadyMember = await dmDB.isChannelMember(channelId, newMemberId);
    if (alreadyMember) {
      return res.status(409).json({ error: 'User is already a member' });
    }
    
    // Check if requester and new member are friends
    const areFriends = await friendDB.isFriend(userId, newMemberId);
    if (!areFriends) {
      return res.status(403).json({ error: 'You must be friends to add them to a group' });
    }
    
    // Add member
    const result = await dmDB.addChannelMember(channelId, newMemberId);
    
    if (result.success) {
      // Notify new member
      const newMemberSocket = getUserSocket(newMemberId);
      if (newMemberSocket) {
        newMemberSocket.emit('user_added_to_dm', {
          channelId,
          channelName: channel.name,
          addedBy: userId
        });
      }
      
      // Notify existing members
      const members = await dmDB.getChannelMembers(channelId);
      members.forEach(member => {
        if (member.id !== newMemberId) {
          const memberSocket = getUserSocket(member.id);
          if (memberSocket) {
            memberSocket.emit('dm_member_added', {
              channelId,
              user: result.member
            });
          }
        }
      });
    }
    
    res.json({ success: true, member: result.member });
  } catch (error) {
    console.error('Add member error:', error);
    res.status(500).json({ error: 'Failed to add member' });
  }
});

// Remove member from group DM (or leave)
app.delete('/api/dm/channels/:channelId/members/:memberId', authenticateToken, async (req, res) => {
  try {
    const userId = req.userId;
    const { channelId, memberId } = req.params;
    
    // Check if channel exists
    const channel = await dmDB.getDMChannelById(channelId);
    if (!channel) {
      return res.status(404).json({ error: 'Channel not found' });
    }
    
    if (channel.type !== 'group') {
      return res.status(400).json({ error: 'Can only remove members from group DMs' });
    }
    
    // Check permissions: can remove self, or creator can remove others
    const isCreator = channel.creator_id === userId;
    const isSelf = userId === memberId;
    
    if (!isSelf && !isCreator) {
      return res.status(403).json({ error: 'Only the creator can remove other members' });
    }
    
    // Check if requesting user is a member (when leaving)
    if (isSelf) {
      const isMember = await dmDB.isChannelMember(channelId, userId);
      if (!isMember) {
        return res.status(403).json({ error: 'You are not a member of this channel' });
      }
    }
    
    // Remove member
    await dmDB.removeChannelMember(channelId, memberId);
    
    // Notify the removed user
    const removedSocket = getUserSocket(memberId);
    if (removedSocket) {
      removedSocket.emit('user_left_dm', {
        channelId,
        userId: memberId,
        left: isSelf
      });
    }
    
    // Notify remaining members
    const members = await dmDB.getChannelMembers(channelId);
    members.forEach(member => {
      const memberSocket = getUserSocket(member.id);
      if (memberSocket) {
        memberSocket.emit('dm_member_left', {
          channelId,
          userId: memberId
        });
      }
    });
    
    res.json({ success: true });
  } catch (error) {
    console.error('Remove member error:', error);
    res.status(500).json({ error: 'Failed to remove member' });
  }
});

// Update group DM name
app.put('/api/dm/channels/:channelId', authenticateToken, async (req, res) => {
  try {
    const userId = req.userId;
    const { channelId } = req.params;
    const { name } = req.body;
    
    if (!name || name.trim() === '') {
      return res.status(400).json({ error: 'Name required' });
    }
    
    // Check if channel exists and is a group
    const channel = await dmDB.getDMChannelById(channelId);
    if (!channel) {
      return res.status(404).json({ error: 'Channel not found' });
    }
    
    if (channel.type !== 'group') {
      return res.status(400).json({ error: 'Can only rename group DMs' });
    }
    
    // Check if requesting user is a member
    const isMember = await dmDB.isChannelMember(channelId, userId);
    if (!isMember) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    await dmDB.updateGroupName(channelId, name.trim());
    
    // Notify all members
    const members = await dmDB.getChannelMembers(channelId);
    members.forEach(member => {
      const memberSocket = getUserSocket(member.id);
      if (memberSocket) {
        memberSocket.emit('dm_channel_updated', {
          channelId,
          name: name.trim()
        });
      }
    });
    
    res.json({ success: true });
  } catch (error) {
    console.error('Update group name error:', error);
    res.status(500).json({ error: 'Failed to update group name' });
  }
});

// Get channel by ID (regular channels)
app.get('/api/channels/:channelId', authenticateToken, async (req, res) => {
  try {
    const { channelId } = req.params;
    const channel = await channelDB.getById(channelId);
    
    if (!channel) {
      return res.status(404).json({ error: 'Channel not found' });
    }
    
    // Check if user has access to this server
    const members = await serverDB.getMembers(channel.server_id);
    const isMember = members.some(m => m.id === req.userId);
    
    if (!isMember) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    res.json(channel);
  } catch (error) {
    console.error('Get channel error:', error);
    res.status(500).json({ error: 'Failed to get channel' });
  }
});

// Send message to channel
app.post('/api/channels/:channelId/messages', authenticateToken, async (req, res) => {
  try {
    const { channelId } = req.params;
    const { content, replyToId, attachments, forwardedFrom } = req.body;
    const userId = req.userId;
    
    console.log('📥 Server: Send channel message - channelId:', channelId, 'userId:', userId);
    
    // Get channel to verify access
    const channel = await channelDB.getById(channelId);
    if (!channel) {
      return res.status(404).json({ error: 'Channel not found' });
    }
    
    // Check if user is member of the server
    const members = await serverDB.getMembers(channel.server_id);
    const isMember = members.some(m => m.id === userId);
    
    if (!isMember) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    // Check if user has access to this server (per-user server access control)
    const hasServerAccess = await userServerAccessDB.hasServerAccess(userId, channel.server_id);
    if (!hasServerAccess) {
      return res.status(403).json({ error: 'Akses ke server ini ditolak oleh admin' });
    }
    
    // Check if user has role-based access to this channel
    const server = await serverDB.getById(channel.server_id);
    const isPostgres2 = process.env.USE_POSTGRES === 'true' || process.env.DATABASE_URL;
    if (server && server.owner_id !== userId) {
      // Get user's custom roles (from both member_roles and server_members)
      const userRoles = isPostgres2
        ? await dbAll(
            `SELECT sr.id
             FROM member_roles mr
             JOIN server_roles sr ON mr.role_id = sr.id
             WHERE mr.user_id = $1 AND mr.server_id = $2`,
            [userId, channel.server_id]
          )
        : await dbAll(
            `SELECT sr.id
             FROM member_roles mr
             JOIN server_roles sr ON mr.role_id = sr.id
             WHERE mr.user_id = ? AND mr.server_id = ?`,
            [userId, channel.server_id]
          );

      const member = isPostgres2
        ? await dbGet(
            `SELECT role_id FROM server_members WHERE user_id = $1 AND server_id = $2`,
            [userId, channel.server_id]
          )
        : await dbGet(
            `SELECT role_id FROM server_members WHERE user_id = ? AND server_id = ?`,
            [userId, channel.server_id]
          );
      
      const roleIds = [
        ...userRoles.map(r => r.id),
        ...(member?.role_id ? [member.role_id] : [])
      ];
      
      // Remove duplicates
      const uniqueRoleIds = [...new Set(roleIds)];
      
      // If user has custom roles, check channel access
      if (uniqueRoleIds.length > 0) {
        let hasChannelAccess = false;
        for (const roleId of uniqueRoleIds) {
          const access = await roleChannelAccessDB.hasChannelAccess(roleId, channelId);
          if (access) {
            hasChannelAccess = true;
            break;
          }
        }
        
        if (!hasChannelAccess) {
          return res.status(403).json({ error: 'Akses ke channel ini ditolak' });
        }
      }
    }
    
    // Create message
    const message = await messageDB.create(channelId, userId, content, replyToId, attachments, 'user', forwardedFrom);
    
    console.log('📤 Server: Broadcasting new_message to channel:', channelId);
    // Emit socket event
    io.to(channelId).emit('new_message', message);
    console.log('📤 Server: new_message broadcasted to', channelId);
    
    // Send mention notifications (async, don't block response)
    const sender = await userDB.findById(userId);
    console.log('📱 Sending notifications - content:', content, 'sender:', sender.display_name || sender.username);
    sendMentionNotifications(
      content,
      req.userId,
      channel.server_id,
      channelId,
      channel.name,
      sender.display_name || sender.username
    ).catch(err => console.error('📱 Error sending mention notifications:', err));
    
    // Send channel message notifications to offline members (async, don't block response)
    sendChannelMessageNotifications(
      content,
      req.userId,
      channel.server_id,
      channelId,
      channel.name,
      sender.display_name || sender.username
    ).catch(err => console.error('📱 Error sending channel notifications:', err));
    
    res.status(201).json(message);
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

// Get messages in a channel
app.get('/api/channels/:channelId/messages', authenticateToken, async (req, res) => {
  try {
    const { channelId } = req.params;
    const { limit = 50, offset = 0 } = req.query;
    const userId = req.userId;
    
    // Get channel to verify access
    const channel = await channelDB.getById(channelId);
    if (!channel) {
      return res.status(404).json({ error: 'Channel not found' });
    }
    
    // Check if user is member of the server
    const members = await serverDB.getMembers(channel.server_id);
    const isMember = members.some(m => m.id === userId);
    
    if (!isMember) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    // Check if user has access to this server (per-user server access control)
    const hasServerAccess = await userServerAccessDB.hasServerAccess(userId, channel.server_id);
    if (!hasServerAccess) {
      return res.status(403).json({ error: 'Akses ke server ini ditolak oleh admin' });
    }
    
    // Check if user has role-based access to this channel
    const server = await serverDB.getById(channel.server_id);
    const isPostgres3 = process.env.USE_POSTGRES === 'true' || process.env.DATABASE_URL;
    if (server && server.owner_id !== userId) {
      // Get user's custom roles
      const userRoles = isPostgres3
        ? await dbAll(
            `SELECT sr.id
             FROM member_roles mr
             JOIN server_roles sr ON mr.role_id = sr.id
             WHERE mr.user_id = $1 AND mr.server_id = $2`,
            [userId, channel.server_id]
          )
        : await dbAll(
            `SELECT sr.id
             FROM member_roles mr
             JOIN server_roles sr ON mr.role_id = sr.id
             WHERE mr.user_id = ? AND mr.server_id = ?`,
            [userId, channel.server_id]
          );

      const memberRole = isPostgres3
        ? await dbGet(
            `SELECT role_id FROM server_members WHERE user_id = $1 AND server_id = $2`,
            [userId, channel.server_id]
          )
        : await dbGet(
            `SELECT role_id FROM server_members WHERE user_id = ? AND server_id = ?`,
            [userId, channel.server_id]
          );
      
      const roleIds = [
        ...userRoles.map(r => r.id),
        ...(memberRole?.role_id ? [memberRole.role_id] : [])
      ];
      
      // If user has custom roles, check channel access
      if (roleIds.length > 0) {
        let hasChannelAccess = false;
        for (const roleId of roleIds) {
          const access = await roleChannelAccessDB.hasChannelAccess(roleId, channelId);
          if (access) {
            hasChannelAccess = true;
            break;
          }
        }
        
        if (!hasChannelAccess) {
          return res.status(403).json({ error: 'Akses ke channel ini ditolak' });
        }
      }
    }
    
    const messages = await messageDB.getByChannel(channelId, parseInt(limit), parseInt(offset));
    res.json(messages);
  } catch (error) {
    console.error('Get messages error:', error);
    console.error('Stack trace:', error.stack);
    res.status(500).json({ error: 'Failed to get messages', details: error.message });
  }
});

// Delete channel
app.delete('/api/channels/:channelId', authenticateToken, async (req, res) => {
  try {
    const { channelId } = req.params;
    
    // Get channel to verify
    const channel = await channelDB.getById(channelId);
    if (!channel) {
      return res.status(404).json({ error: 'Channel not found' });
    }
    
    // Check permission
    const hasPermission = await permissionDB.hasPermission(req.userId, channel.server_id, Permissions.MANAGE_CHANNELS);
    if (!hasPermission) {
      return res.status(403).json({ error: 'You do not have permission to delete channels' });
    }
    
    await channelDB.delete(channelId);
    
    // Emit socket event
    io.to(channel.server_id).emit('channel_deleted', { serverId: channel.server_id, channelId });
    
    res.json({ success: true });
  } catch (error) {
    console.error('Delete channel error:', error);
    res.status(500).json({ error: 'Failed to delete channel' });
  }
});

// Get messages in DM channel
app.get('/api/dm/channels/:channelId/messages', authenticateToken, async (req, res) => {
  try {
    const userId = req.userId;
    const { channelId } = req.params;
    const { limit = 50, offset = 0 } = req.query;
    
    // Verify user is part of this channel
    const isMember = await dmDB.isChannelMember(channelId, userId);
    if (!isMember) {
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

// Mark DM message as read
app.post('/api/dm/messages/:messageId/read', authenticateToken, async (req, res) => {
  try {
    const userId = req.userId;
    const { messageId } = req.params;
    
    // Get message details
    const message = await dmDB.getDMMessageById(messageId);
    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }
    
    // Verify user is channel member
    const isMember = await dmDB.isChannelMember(message.channel_id, userId);
    if (!isMember) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    // Don't mark own messages as read
    if (message.sender_id === userId) {
      return res.json({ success: true });
    }
    
    // Mark as read
    await dmDB.markDMMessageAsRead(messageId);
    
    // Notify sender that message was read
    const senderSocket = getUserSocket(message.sender_id);
    if (senderSocket) {
      senderSocket.emit('dm-message-read', {
        messageId,
        channelId: message.channel_id,
        readBy: userId
      });
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('Mark DM message read error:', error);
    res.status(500).json({ error: 'Failed to mark message as read' });
  }
});

// Send message in DM channel
app.post('/api/dm/channels/:channelId/messages', authenticateToken, async (req, res) => {
  try {
    const userId = req.userId;
    const { channelId } = req.params;
    const { content, attachments } = req.body;
    
    console.log('Send DM message - userId:', userId);
    console.log('Send DM message - channelId:', channelId);
    console.log('Send DM message - content:', content?.substring(0, 100));
    console.log('Send DM message - attachments:', JSON.stringify(attachments)?.substring(0, 200));
    
    if (!content && !attachments) {
      return res.status(400).json({ error: 'Content or attachments required' });
    }
    
    // Verify user is part of this channel
    const isMember = await dmDB.isChannelMember(channelId, userId);
    console.log('Send DM message - isMember:', isMember);
    if (!isMember) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const message = await dmDB.sendDMMessage(channelId, userId, content, attachments);
    
    // Get sender info
    const sender = await userDB.findById(userId);
    message.sender_username = sender.username;
    message.sender_avatar = sender.avatar;
    
    // Get all channel members to notify
    const members = await dmDB.getChannelMembers(channelId);
    
    // Emit to all other members via socket
    for (const member of members) {
      if (member.id === userId) continue;
      
      const recipientSocket = getUserSocket(member.id);
      if (recipientSocket) {
        recipientSocket.emit('new-dm-message', {
          channelId,
          message,
          sender: { id: sender.id, username: sender.username, displayName: sender.display_name, avatar: sender.avatar }
        });
      } else if (pushService.isConfigured()) {
        // Send push notification if recipient is offline
        // Format mentions to readable text
        console.log('📱 Sending push notification to:', member.id);
        const formattedContent = await formatMentionsForNotification(content || 'Sent an attachment');
        console.log('📱 Formatted content:', formattedContent);
        try {
          await pushService.sendDMNotification(
            member.id,
            sender.username,
            formattedContent,
            `/dm/${channelId}`
          );
          console.log('📱 Push notification sent successfully');
        } catch (notifError) {
          console.error('📱 Failed to send push notification:', notifError);
        }
      } else {
        console.log('📱 Push service not configured, skipping notification');
      }
    }
    
    res.json(message);
  } catch (error) {
    console.error('Send DM message error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ error: 'Failed to send message', details: error.message });
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

// Get unread count for all channels in a server
app.get('/api/servers/:serverId/unread-count', authenticateToken, async (req, res) => {
  try {
    const userId = req.userId;
    const { serverId } = req.params;
    
    // Check if user has access to this server
    const hasAccess = await userServerAccessDB.hasServerAccess(userId, serverId);
    if (!hasAccess) {
      return res.status(403).json({ error: 'Akses ke server ini ditolak oleh admin' });
    }
    
    // Verify user is member of this server
    const isMember = await serverDB.isMember(serverId, userId);
    if (!isMember) {
      return res.status(403).json({ error: 'Not a member of this server' });
    }
    
    const unreadCounts = await messageDB.getUnreadCountForAllChannels(userId, serverId);
    res.json({ unreadCounts });
  } catch (error) {
    console.error('Get server unread count error:', error);
    res.status(500).json({ error: 'Failed to get unread count' });
  }
});

// Mark channel as read
app.post('/api/channels/:channelId/read', authenticateToken, async (req, res) => {
  try {
    const userId = req.userId;
    const { channelId } = req.params;
    const { messageId } = req.body;
    
    await messageDB.updateReadStatus(userId, channelId, messageId);
    res.json({ success: true });
  } catch (error) {
    console.error('Mark channel as read error:', error);
    res.status(500).json({ error: 'Failed to mark as read' });
  }
});

// Get last read message for a channel
app.get('/api/channels/:channelId/read', authenticateToken, async (req, res) => {
  try {
    const userId = req.userId;
    const { channelId } = req.params;
    
    const readStatus = await messageDB.getReadStatus(userId, channelId);
    res.json({ 
      lastReadMessageId: readStatus?.last_read_message_id || null,
      lastReadAt: readStatus?.last_read_at || null
    });
  } catch (error) {
    console.error('Get read status error:', error);
    res.status(500).json({ error: 'Failed to get read status' });
  }
});

// Delete DM channel (or leave for group DMs)
app.delete('/api/dm/channels/:channelId', authenticateToken, async (req, res) => {
  try {
    const userId = req.userId;
    const { channelId } = req.params;
    
    // Get channel info
    const channel = await dmDB.getDMChannelById(channelId);
    if (!channel) {
      return res.status(404).json({ error: 'Channel not found' });
    }
    
    // Verify user is part of this channel
    const isMember = await dmDB.isChannelMember(channelId, userId);
    if (!isMember) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    // For group DMs, just leave instead of deleting
    if (channel.type === 'group') {
      await dmDB.leaveDMChannel(channelId, userId);
      
      // Notify other members
      const members = await dmDB.getChannelMembers(channelId);
      members.forEach(member => {
        const memberSocket = getUserSocket(member.id);
        if (memberSocket) {
          memberSocket.emit('dm_member_left', {
            channelId,
            userId
          });
        }
      });
      
      res.json({ success: true, left: true });
    } else {
      // For direct DMs, delete the channel
      await dmDB.deleteDMChannel(channelId);
      res.json({ success: true, deleted: true });
    }
  } catch (error) {
    console.error('Delete/Leave DM channel error:', error);
    res.status(500).json({ error: 'Failed to delete/leave channel' });
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
    const userId = req.userId;
    
    let expiresAt = null;
    if (expiresIn) {
      expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + expiresIn);
    }
    
    const invite = await inviteDB.create(serverId, userId, expiresAt, maxUses);
    
    // Log audit event
    await auditLogDB.create(
      serverId,
      userId,
      `created an invite`,
      'create_invite',
      invite.id,
      invite.code,
      'invite',
      null,
      null
    );
    
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

// Edit message
app.put('/api/messages/:messageId', authenticateToken, async (req, res) => {
  try {
    const { messageId } = req.params;
    const { content } = req.body;
    const userId = req.userId;

    if (!content || typeof content !== 'string') {
      return res.status(400).json({ error: 'Content is required' });
    }

    if (content.trim().length === 0) {
      return res.status(400).json({ error: 'Content cannot be empty' });
    }

    // Get the message to check ownership
    const message = await messageDB.getById(messageId);
    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    // Check if user is the message author
    if (message.userId !== userId) {
      return res.status(403).json({ error: 'You can only edit your own messages' });
    }

    // Update the message
    const updatedMessage = await messageDB.update(messageId, content.trim());

    // Broadcast to channel
    io.to(message.channelId).emit('message_edited', updatedMessage);

    res.json(updatedMessage);
  } catch (error) {
    console.error('Edit message error:', error);
    res.status(500).json({ error: 'Failed to edit message' });
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
    
    // Create welcome message in "selamat-datang" channel
    try {
      const channels = await channelDB.getByServerId(invite.server_id);
      const welcomeChannel = channels.find(ch => ch.name === 'selamat-datang') || channels[0];
      
      if (welcomeChannel) {
        const welcomeMessage = await messageDB.create(
          welcomeChannel.id,
          null, // system message has no user
          `Selamat datang ${user.display_name || user.username}! 👋`,
          null,
          'system' // message type
        );
        
        // Broadcast welcome message
        io.to(welcomeChannel.id).emit('new_message', {
          ...welcomeMessage,
          isSystem: true,
          newMember: {
            id: userId,
            username: user.username,
            displayName: user.display_name,
            avatar: user.avatar
          }
        });
      }
    } catch (welcomeError) {
      console.error('Failed to create welcome message:', welcomeError);
      // Don't fail the join if welcome message fails
    }
    
    // Notify server members via socket
    io.to(invite.server_id).emit('member_joined', {
      userId,
      serverId: invite.server_id,
      username: user.username,
      displayName: user.display_name,
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
    const isMember = members.some(m => m.id === userId);
    
    if (!isMember) {
      return res.status(403).json({ error: 'Not a server member' });
    }
    
    const invites = await inviteDB.getByServer(serverId);
    res.json(invites);
  } catch (error) {
    console.error('Get invites error:', error);
    res.status(500).json({ error: 'Failed to get invites' });
  }
});

// Search messages across channels
app.get('/api/search/messages', authenticateToken, async (req, res) => {
  try {
    const {
      q: query,
      server_id: serverId,
      channel_id: channelId,
      user_id: userId,
      date_from: dateFrom,
      date_to: dateTo,
      has_attachments: hasAttachments,
      limit = 50,
      offset = 0
    } = req.query;

    // Parse has_attachments if provided
    let parsedHasAttachments = null;
    if (hasAttachments !== undefined) {
      parsedHasAttachments = hasAttachments === 'true' || hasAttachments === '1';
    }

    // Build search options
    const searchOptions = {
      serverId: serverId || null,
      channelId: channelId || null,
      userId: userId || null,
      query: query || '',
      dateFrom: dateFrom || null,
      dateTo: dateTo || null,
      hasAttachments: parsedHasAttachments,
      limit: parseInt(limit, 10) || 50,
      offset: parseInt(offset, 10) || 0
    };

    // Execute search and get count in parallel
    const [messages, total] = await Promise.all([
      messageDB.searchMessages(searchOptions),
      messageDB.getSearchResultCount(searchOptions)
    ]);

    // Calculate pagination info
    const parsedLimit = searchOptions.limit;
    const parsedOffset = searchOptions.offset;
    const hasMore = parsedOffset + messages.length < total;

    res.json({
      messages,
      pagination: {
        total,
        hasMore,
        offset: parsedOffset,
        limit: parsedLimit
      }
    });
  } catch (error) {
    console.error('Search messages error:', error);
    res.status(500).json({ error: 'Failed to search messages' });
  }
});

// ============================================
// DEVICE/SSESSION MANAGEMENT ENDPOINTS
// ============================================

// Helper function to detect device info from request
function getDeviceInfo(req) {
  const userAgent = req.headers['user-agent'] || 'Unknown';
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'Unknown';
  
  // Parse device type and OS from user agent
  let deviceType = 'Desktop';
  let os = 'Unknown';
  let browser = 'Unknown';
  
  if (/mobile|android|iphone|ipad|ipod/i.test(userAgent)) {
    deviceType = 'Mobile';
  }
  
  if (/windows/i.test(userAgent)) {
    os = 'Windows';
  } else if (/macintosh|mac os/i.test(userAgent)) {
    os = 'macOS';
  } else if (/linux/i.test(userAgent)) {
    os = 'Linux';
  } else if (/android/i.test(userAgent)) {
    os = 'Android';
  } else if (/ios|iphone|ipad/i.test(userAgent)) {
    os = 'iOS';
  }
  
  if (/chrome/i.test(userAgent)) {
    browser = 'Chrome';
  } else if (/firefox/i.test(userAgent)) {
    browser = 'Firefox';
  } else if (/safari/i.test(userAgent)) {
    browser = 'Safari';
  } else if (/edge/i.test(userAgent)) {
    browser = 'Edge';
  }
  
  // Detect Electron app
  if (/electron/i.test(userAgent)) {
    deviceType = 'Desktop';
    browser = 'WorkGrid App';
  }
  
  const deviceName = `${os} • ${browser}`;
  
  return {
    deviceType,
    deviceName,
    browser,
    os,
    ipAddress: ip,
    location: 'Unknown' // Could be enhanced with geolocation
  };
}

// Get all devices/sessions for current user
app.get('/api/devices', authenticateToken, async (req, res) => {
  try {
    const sessions = await sessionDB.getUserSessions(req.user.id);
    
    // Format sessions for frontend
    const devices = sessions.map(session => ({
      id: session.id,
      deviceType: session.device_type,
      deviceName: session.device_name,
      browser: session.browser,
      os: session.os,
      ipAddress: session.ip_address,
      location: session.location,
      lastActive: session.last_active,
      createdAt: session.created_at,
      isCurrent: session.is_current === 1
    }));
    
    res.json({ devices });
  } catch (error) {
    console.error('Get devices error:', error);
    res.status(500).json({ error: 'Failed to get devices' });
  }
});

// Logout from a specific device
app.delete('/api/devices/:deviceId', authenticateToken, async (req, res) => {
  try {
    const { deviceId } = req.params;
    
    // Get session to check if it exists and belongs to user
    const session = await sessionDB.getSessionById(deviceId);
    if (!session) {
      return res.status(404).json({ error: 'Device not found' });
    }
    
    if (session.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    
    // Prevent logging out from current device
    if (session.is_current === 1) {
      return res.status(400).json({ error: 'Cannot logout from current device. Use Logout All instead.' });
    }
    
    const result = await sessionDB.deleteSession(deviceId, req.user.id);
    if (result.success) {
      res.json({ success: true, message: 'Device logged out successfully' });
    } else {
      res.status(400).json({ error: 'Failed to logout device' });
    }
  } catch (error) {
    console.error('Logout device error:', error);
    res.status(500).json({ error: 'Failed to logout device' });
  }
});

// Logout from all other devices
app.delete('/api/devices/others', authenticateToken, async (req, res) => {
  try {
    // Find current session
    const sessions = await sessionDB.getUserSessions(req.user.id);
    const currentSession = sessions.find(s => s.is_current === 1);
    
    if (!currentSession) {
      return res.status(400).json({ error: 'No current session found' });
    }
    
    const result = await sessionDB.deleteOtherSessions(req.user.id, currentSession.id);
    res.json({ 
      success: true, 
      message: `Logged out from ${result.count} device(s)`,
      count: result.count
    });
  } catch (error) {
    console.error('Logout other devices error:', error);
    res.status(500).json({ error: 'Failed to logout other devices' });
  }
});

// Link Preview / Embed Endpoint
app.get('/api/link-preview', authenticateToken, async (req, res) => {
  try {
    const { url } = req.query;
    
    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }
    
    // Validate URL format
    let parsedUrl;
    try {
      parsedUrl = new URL(url);
      if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
        return res.status(400).json({ error: 'Invalid URL protocol' });
      }
    } catch (e) {
      return res.status(400).json({ error: 'Invalid URL format' });
    }
    
    // Fetch the webpage
    const fetchHtml = (url) => {
      return new Promise((resolve, reject) => {
        const client = url.startsWith('https:') ? https : http;
        const request = client.get(url, {
          timeout: 5000,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9',
          }
        }, (response) => {
          // Handle redirects
          if ([301, 302, 303, 307, 308].includes(response.statusCode)) {
            const redirectUrl = response.headers.location;
            if (redirectUrl) {
              const absoluteUrl = redirectUrl.startsWith('http') 
                ? redirectUrl 
                : new URL(redirectUrl, url).href;
              resolve(fetchHtml(absoluteUrl));
              return;
            }
          }
          
          if (response.statusCode !== 200) {
            reject(new Error(`HTTP ${response.statusCode}`));
            return;
          }
          
          let data = '';
          response.on('data', chunk => data += chunk);
          response.on('end', () => resolve(data));
        });
        
        request.on('error', reject);
        request.on('timeout', () => {
          request.destroy();
          reject(new Error('Request timeout'));
        });
      });
    };
    
    const html = await fetchHtml(url);
    const $ = cheerio.load(html);
    
    // Extract Open Graph metadata
    const getMeta = (property) => {
      // Try Open Graph first
      let value = $(`meta[property="og:${property}"]`).attr('content');
      if (!value) {
        value = $(`meta[name="og:${property}"]`).attr('content');
      }
      // Fallback to standard meta tags
      if (!value) {
        if (property === 'title') {
          value = $('title').text() || $('h1').first().text();
        } else if (property === 'description') {
          value = $(`meta[name="description"]`).attr('content');
        } else if (property === 'image') {
          // Try common image meta tags
          value = $(`meta[name="twitter:image"]`).attr('content') ||
                  $(`meta[name="twitter:image:src"]`).attr('content');
        } else if (property === 'site_name') {
          value = $(`meta[property="og:site_name"]`).attr('content') ||
                  parsedUrl.hostname.replace(/^www\./, '');
        }
      }
      return value || null;
    };
    
    const metadata = {
      url: url,
      title: getMeta('title') || parsedUrl.hostname,
      description: getMeta('description'),
      image: getMeta('image'),
      siteName: getMeta('site_name') || parsedUrl.hostname.replace(/^www\./, ''),
      favicon: null,
      color: $(`meta[name="theme-color"]`).attr('content') || 
             $(`meta[property="og:color"]`).attr('content') || 
             null
    };
    
    // Try to find favicon
    const faviconPath = $('link[rel="icon"]').attr('href') ||
                       $('link[rel="shortcut icon"]').attr('href') ||
                       $('link[rel="apple-touch-icon"]').attr('href');
    
    if (faviconPath) {
      metadata.favicon = faviconPath.startsWith('http') 
        ? faviconPath 
        : new URL(faviconPath, url).href;
    } else {
      metadata.favicon = `${parsedUrl.protocol}//${parsedUrl.hostname}/favicon.ico`;
    }
    
    // Make image URL absolute
    if (metadata.image && !metadata.image.startsWith('http')) {
      metadata.image = new URL(metadata.image, url).href;
    }
    
    res.json(metadata);
    
  } catch (error) {
    console.error('Link preview error:', error.message);
    // Return basic info even if fetch fails
    try {
      const parsedUrl = new URL(req.query.url);
      res.json({
        url: req.query.url,
        title: parsedUrl.hostname,
        description: null,
        image: null,
        siteName: parsedUrl.hostname.replace(/^www\./, ''),
        favicon: `${parsedUrl.protocol}//${parsedUrl.hostname}/favicon.ico`,
        color: null,
        error: 'Failed to fetch preview'
      });
    } catch {
      res.status(500).json({ error: 'Failed to fetch link preview' });
    }
  }
});

// GIPHY API Proxy (to avoid CSP issues)
const GIPHY_API_KEY = process.env.GIPHY_API_KEY || 'YpMijmz8K3JNNhmssCfdWuYmluS0JDAW';
const GIPHY_BASE_URL = 'https://api.giphy.com/v1/gifs';

app.get('/api/giphy/trending', authenticateToken, async (req, res) => {
  try {
    const limit = req.query.limit || 20;
    const response = await fetch(`${GIPHY_BASE_URL}/trending?api_key=${GIPHY_API_KEY}&limit=${limit}&rating=g&lang=id`);
    
    if (!response.ok) {
      return res.status(response.status).json({ error: 'Failed to fetch from Giphy' });
    }
    
    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('Giphy trending error:', error);
    res.status(500).json({ error: 'Failed to fetch trending GIFs' });
  }
});

app.get('/api/giphy/search', authenticateToken, async (req, res) => {
  try {
    const { q, limit = 20 } = req.query;
    if (!q) {
      return res.status(400).json({ error: 'Query parameter required' });
    }
    
    const response = await fetch(`${GIPHY_BASE_URL}/search?api_key=${GIPHY_API_KEY}&q=${encodeURIComponent(q)}&limit=${limit}&rating=g&lang=id`);
    
    if (!response.ok) {
      return res.status(response.status).json({ error: 'Failed to fetch from Giphy' });
    }
    
    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('Giphy search error:', error);
    res.status(500).json({ error: 'Failed to search GIFs' });
  }
});

// Helper function to get user socket
function getUserSocket(userId) {
  return Array.from(io.sockets.sockets.values()).find(s => s.userId === userId);
}

// Rate limiting for messages - store last message time per user
const userLastMessageTime = new Map();
const userMessageCount = new Map();
const MESSAGE_COOLDOWN_MS = 1000; // 1 second between messages
const MESSAGE_BURST_LIMIT = 5; // Max 5 messages per 10 seconds
const MESSAGE_BURST_WINDOW_MS = 10000; // 10 seconds window

// Helper function to check rate limit for a user
function checkMessageRateLimit(userId) {
  const now = Date.now();
  const lastMessageTime = userLastMessageTime.get(userId) || 0;
  let userMessages = userMessageCount.get(userId) || { count: 0, firstMessageTime: now };
  
  // Reset burst count if window has passed
  if (now - userMessages.firstMessageTime > MESSAGE_BURST_WINDOW_MS) {
    userMessages = { count: 0, firstMessageTime: now };
  }
  
  // Check cooldown between messages
  if (now - lastMessageTime < MESSAGE_COOLDOWN_MS) {
    return { allowed: false, reason: 'cooldown', retryAfter: MESSAGE_COOLDOWN_MS - (now - lastMessageTime) };
  }
  
  // Check burst limit
  if (userMessages.count >= MESSAGE_BURST_LIMIT) {
    return { allowed: false, reason: 'burst_limit', retryAfter: MESSAGE_BURST_WINDOW_MS - (now - userMessages.firstMessageTime) };
  }
  
  // Update counters
  userMessages.count++;
  userMessageCount.set(userId, userMessages);
  userLastMessageTime.set(userId, now);
  
  return { allowed: true };
}

// Socket.IO connection handling
io.on('connection', (socket) => {
  log('🔌 Client connected:', socket.id);

  // Authenticate socket connection
  socket.on('authenticate', async (token) => {
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      socket.userId = decoded.id;
      socket.emit('authenticated', { success: true, userId: decoded.id });
      log('✅ Socket authenticated:', socket.id, 'User:', decoded.id);
      
      // Update user status to online and broadcast
      try {
        await userDB.updateProfile(decoded.id, { status: 'online' });
        const user = await userDB.findById(decoded.id);
        if (user) {
          io.emit('user_status_changed', {
            userId: decoded.id,
            status: 'online',
            username: user.username
          });
          log('🟢 User status changed to online:', decoded.id);
          
          // Auto-friend dengan user lain yang pakai kode grup yang sama
          if (user.joined_via_group_code) {
            try {
              const groupCode = user.joined_via_group_code;
              const existingUsers = await userDB.findByGroupCode(groupCode);
              
              for (const existingUser of existingUsers) {
                if (existingUser.id !== user.id) {
                  // Check if already friends
                  const isAlreadyFriend = await friendDB.getFriendship(user.id, existingUser.id);
                  if (!isAlreadyFriend || isAlreadyFriend.status !== 'accepted') {
                    // Create auto-friendship
                    await friendDB.createAutoFriendship(user.id, existingUser.id);
                    console.log(`[SocketAutoFriend] ${user.username} berteman dengan ${existingUser.username} via kode ${groupCode}`);
                    
                    // Notify both users
                    socket.emit('new_friend_added', {
                      friend: {
                        id: existingUser.id,
                        username: existingUser.username,
                        displayName: existingUser.displayName || existingUser.username,
                        avatar: existingUser.avatar,
                        status: existingUser.status
                      },
                      message: `Anda berteman dengan ${existingUser.displayName || existingUser.username} dari kode ${groupCode}`
                    });
                    
                    const targetSocket = getUserSocket(existingUser.id);
                    if (targetSocket) {
                      targetSocket.emit('new_friend_added', {
                        friend: {
                          id: user.id,
                          username: user.username,
                          displayName: user.display_name || user.username,
                          avatar: user.avatar,
                          status: 'online'
                        },
                        message: `${user.display_name || user.username} (online) berteman dengan Anda via kode ${groupCode}`
                      });
                    }
                  }
                }
              }
            } catch (friendError) {
              console.error('[Socket] Auto-friend error:', friendError);
            }
          }
        }
      } catch (statusError) {
        console.error('Error updating user status on connect:', statusError);
      }
    } catch (error) {
      socket.emit('auth_error', { error: 'Invalid token' });
      log('❌ Socket authentication failed:', socket.id);
    }
  });

  // Handle edit message via socket
  socket.on('edit_message', async ({ messageId, content }) => {
    try {
      const userId = socket.userId;
      if (!userId) {
        socket.emit('error', { message: 'Not authenticated' });
        return;
      }

      if (!content || typeof content !== 'string' || content.trim().length === 0) {
        socket.emit('error', { message: 'Invalid content' });
        return;
      }

      // Get the message to check ownership
      const message = await messageDB.getById(messageId);
      if (!message) {
        socket.emit('error', { message: 'Message not found' });
        return;
      }

      // Check if user is the message author
      if (message.userId !== userId) {
        socket.emit('error', { message: 'You can only edit your own messages' });
        return;
      }

      // Update the message
      const updatedMessage = await messageDB.update(messageId, content.trim());

      // Broadcast to channel
      io.to(message.channelId).emit('message_edited', updatedMessage);
      log('✏️ Message edited:', messageId, 'by user:', userId);
    } catch (error) {
      console.error('Socket edit message error:', error);
      socket.emit('error', { message: 'Failed to edit message' });
    }
  });

  // Handle delete message via socket
  socket.on('delete_message', async ({ messageId }) => {
    try {
      const userId = socket.userId;
      console.log('[DELETE MESSAGE] Attempt by user:', userId, 'message:', messageId);
      
      if (!userId) {
        socket.emit('error', { message: 'Not authenticated' });
        return;
      }

      // Get the message to check ownership
      const message = await messageDB.getById(messageId);
      console.log('[DELETE MESSAGE] Message found:', message ? 'yes' : 'no', 'channelId:', message?.channelId, 'msgUserId:', message?.userId);
      
      if (!message) {
        socket.emit('error', { message: 'Message not found' });
        return;
      }

      // Get channel to check server ownership
      const channel = await channelDB.getById(message.channelId);
      console.log('[DELETE MESSAGE] Channel found:', channel ? 'yes' : 'no', 'server_id:', channel?.server_id);
      
      const server = channel ? await serverDB.findById(channel.server_id) : null;
      const isOwner = server && server.owner_id === userId;
      console.log('[DELETE MESSAGE] Server found:', server ? 'yes' : 'no', 'isOwner:', isOwner, 'serverOwner:', server?.owner_id);
      
      // Check if user is the message author, server owner, or has manage messages permission
      const serverId = channel ? channel.server_id : null;
      // Owner bypass - no need to check permission if already owner
      let hasManagePermission = false;
      if (!isOwner && serverId) {
        hasManagePermission = await permissionDB.hasPermission(userId, serverId, Permissions.MANAGE_MESSAGES);
      }
      console.log('[DELETE MESSAGE] serverId:', serverId, 'hasManagePermission:', hasManagePermission);
      console.log('[DELETE MESSAGE] Check:', message.userId !== userId, '!hasManagePermission:', !hasManagePermission, '!isOwner:', !isOwner);
      
      if (message.userId !== userId && !hasManagePermission && !isOwner) {
        socket.emit('error', { message: 'You can only delete your own messages' });
        return;
      }
      
      console.log('[DELETE MESSAGE] Permission granted, deleting...');

      // Delete the message
      await messageDB.delete(messageId);

      // Broadcast to channel
      io.to(message.channelId).emit('message_deleted', { messageId });
      log('🗑️ Message deleted:', messageId, 'by user:', userId);
    } catch (error) {
      console.error('Socket delete message error:', error.message);
      console.error('Stack:', error.stack);
      socket.emit('error', { message: 'Failed to delete message: ' + error.message });
    }
  });

  // Handle join channel
  socket.on('join_channel', (channelId) => {
    if (!socket.userId) return;
    socket.join(channelId);
    console.log('📥 Server: User joined channel room:', socket.userId, 'Channel:', channelId);
  });

  // Handle leave channel
  socket.on('leave_channel', (channelId) => {
    if (!socket.userId) return;
    socket.leave(channelId);
    log('📤 User left channel room:', socket.userId, 'Channel:', channelId);
  });

  // Handle send message
  socket.on('send_message', async (data) => {
    console.log('📥 Server: send_message received from user:', socket.userId, 'Data:', data?.channelId, data?.content?.substring(0, 30));
    
    if (!socket.userId) {
      console.log('❌ Server: send_message rejected - not authenticated');
      socket.emit('message_error', { error: 'Not authenticated' });
      return;
    }
    
    // Check rate limit
    const rateLimit = checkMessageRateLimit(socket.userId);
    if (!rateLimit.allowed) {
      const errorMsg = rateLimit.reason === 'cooldown' 
        ? 'Please wait before sending another message' 
        : 'Too many messages sent. Please slow down.';
      socket.emit('message_error', { error: errorMsg, retryAfter: rateLimit.retryAfter });
      return;
    }
    
    try {
      const { channelId, content, replyToId, attachments } = data;
      
      // Verify user has access to channel
      const channel = await channelDB.getById(channelId);
      if (!channel) {
        socket.emit('message_error', { error: 'Channel not found' });
        return;
      }
      
      // Check if user is member of the server
      const members = await serverDB.getMembers(channel.server_id);
      const isMember = members.some(m => m.id === socket.userId);
      
      if (!isMember) {
        socket.emit('message_error', { error: 'Access denied' });
        return;
      }
      
      // Check if user has access to this server (per-user server access control)
      const hasAccess = await userServerAccessDB.hasServerAccess(socket.userId, channel.server_id);
      if (!hasAccess) {
        socket.emit('message_error', { error: 'Akses ke server ini ditolak oleh admin' });
        return;
      }
      
      // Create message
      const message = await messageDB.create(channelId, socket.userId, content, replyToId, attachments);
      
      // Broadcast to all users in channel
      console.log('📤 Server: Broadcasting new_message to channel:', channelId, 'Message:', message.id);
      io.to(channelId).emit('new_message', message);
      console.log('📤 Server: new_message broadcasted');
      
    } catch (error) {
      console.error('Send message error:', error);
      socket.emit('message_error', { error: 'Failed to send message' });
    }
  });

  // Handle send DM message via socket
  socket.on('send-dm-message', async (data) => {
    if (!socket.userId) {
      socket.emit('dm-error', { error: 'Not authenticated' });
      return;
    }
    
    // Check rate limit
    const rateLimit = checkMessageRateLimit(socket.userId);
    if (!rateLimit.allowed) {
      const errorMsg = rateLimit.reason === 'cooldown' 
        ? 'Please wait before sending another message' 
        : 'Too many messages sent. Please slow down.';
      socket.emit('dm-error', { error: errorMsg, retryAfter: rateLimit.retryAfter });
      return;
    }
    
    try {
      const { channelId, content, attachments } = data;
      
      console.log('📨 Socket send-dm-message received:', { userId: socket.userId, channelId, content: content?.substring(0, 50) });
      
      // Verify user is part of this channel
      const isMember = await dmDB.isChannelMember(channelId, socket.userId);
      if (!isMember) {
        socket.emit('dm-error', { error: 'Access denied - not a channel member' });
        return;
      }
      
      // Create message
      const message = await dmDB.sendDMMessage(channelId, socket.userId, content, attachments);
      
      // Get sender info
      const sender = await userDB.findById(socket.userId);
      message.sender_username = sender.username;
      message.sender_avatar = sender.avatar;
      
      // Get all channel members to notify
      const members = await dmDB.getChannelMembers(channelId);
      
      // Emit to sender (confirm message sent)
      socket.emit('new-dm-message', {
        channelId,
        message,
        sender: { id: sender.id, username: sender.username, displayName: sender.display_name, avatar: sender.avatar }
      });
      
      // Emit to all other members via socket
      for (const member of members) {
        if (member.id === socket.userId) continue;
        
        const recipientSocket = getUserSocket(member.id);
        if (recipientSocket) {
          recipientSocket.emit('new-dm-message', {
            channelId,
            message,
            sender: { id: sender.id, username: sender.username, displayName: sender.display_name, avatar: sender.avatar }
          });
          console.log('📤 Sent new-dm-message to:', member.id);
        }
      }
      
      console.log('✅ DM message sent successfully via socket');
    } catch (error) {
      console.error('Socket send-dm-message error:', error);
      socket.emit('dm-error', { error: 'Failed to send message' });
    }
  });

  // Handle DM read receipt
  socket.on('dm-read-receipt', async (data) => {
    try {
      const { messageId, channelId } = data;
      const userId = socket.userId;
      
      if (!userId || !messageId || !channelId) return;
      
      // Get message details
      const message = await dmDB.getDMMessageById(messageId);
      if (!message) return;
      
      // Don't mark own messages
      if (message.sender_id === userId) return;
      
      // Verify user is channel member
      const isMember = await dmDB.isChannelMember(channelId, userId);
      if (!isMember) return;
      
      // Mark as read
      await dmDB.markDMMessageAsRead(messageId);
      
      // Notify sender
      const senderSocket = getUserSocket(message.sender_id);
      if (senderSocket) {
        senderSocket.emit('dm-message-read', {
          messageId,
          channelId,
          readBy: userId
        });
      }
    } catch (error) {
      console.error('Socket dm-read-receipt error:', error);
    }
  });

  // Handle DM typing indicator
  socket.on('dm-typing', async (data) => {
    try {
      const { channelId } = data;
      const userId = socket.userId;
      
      console.log('⌨️ Server received dm-typing:', { channelId, userId });
      
      if (!userId || !channelId) {
        console.log('❌ Missing userId or channelId');
        return;
      }
      
      // Verify user is channel member
      const isMember = await dmDB.isChannelMember(channelId, userId);
      console.log('👥 Is member:', isMember);
      if (!isMember) return;
      
      // Get user info
      const user = await userDB.findById(userId);
      console.log('👤 User:', user?.username);
      if (!user) return;
      
      // Get all channel members
      const members = await dmDB.getChannelMembers(channelId);
      console.log('📋 Channel members:', members.length);
      
      // Broadcast typing to other members
      for (const member of members) {
        if (member.id === userId) continue;
        
        const recipientSocket = getUserSocket(member.id);
        console.log('📤 Emitting dm-typing to:', member.id, 'socket:', !!recipientSocket);
        if (recipientSocket) {
          recipientSocket.emit('dm-typing', {
            channelId,
            username: user.username
          });
        }
      }
    } catch (error) {
      console.error('Socket dm-typing error:', error);
    }
  });

  socket.on('disconnect', async () => {
    log('👋 Client disconnected:', socket.id);
    
    // Handle user status change on disconnect
    const userId = socket.userId;
    if (userId) {
      // Wait a moment to check if user has other active sockets
      setTimeout(async () => {
        const userStillOnline = Array.from(io.sockets.sockets.values()).some(s => s.userId === userId);
        
        if (!userStillOnline) {
          // User has no more active connections, set status to offline
          try {
            await userDB.updateProfile(userId, { status: 'offline' });
            
            // Get user info for broadcast
            const user = await userDB.findById(userId);
            if (user) {
              // Broadcast status change to all connected clients
              io.emit('user_status_changed', { 
                userId, 
                status: 'offline',
                username: user.username 
              });
              log('📴 User status changed to offline:', userId);
            }
          } catch (error) {
            console.error('Error updating user status on disconnect:', error);
          }
        }
      }, 2000); // Wait 2 seconds to allow for reconnects
    }
  });
});

// ==================== MASTER ADMIN SETUP ====================
// Setup first master admin (only works if no master admin exists)
app.post('/api/setup-master-admin', async (req, res) => {
  try {
    const { email, secretKey } = req.body;
    
    // Secret key untuk setup (harus sama dengan yang di-set di environment)
    const setupSecretKey = process.env.MASTER_ADMIN_SETUP_KEY || 'workgrid-setup-2024';
    
    if (secretKey !== setupSecretKey) {
      return res.status(403).json({ error: 'Invalid secret key' });
    }
    
    // Cek apakah sudah ada master admin
    const existingMasterAdmin = await dbGet('SELECT id FROM users WHERE is_master_admin = 1 LIMIT 1');
    if (existingMasterAdmin) {
      return res.status(400).json({ error: 'Master admin already exists' });
    }
    
    // Cari user berdasarkan email
    const user = await userDB.findByEmail(email);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Set user sebagai master admin
    await dbRun('UPDATE users SET is_master_admin = 1 WHERE id = ?', [user.id]);
    
    res.json({ success: true, message: `${email} has been set as Master Admin` });
  } catch (error) {
    console.error('Setup master admin error:', error);
    res.status(500).json({ error: 'Failed to setup master admin' });
  }
});

// Check if master admin exists
app.get('/api/master-admin-status', async (req, res) => {
  try {
    const masterAdmin = await dbGet('SELECT COUNT(*) as count FROM users WHERE is_master_admin = 1');
    res.json({ 
      hasMasterAdmin: masterAdmin.count > 0,
      count: masterAdmin.count 
    });
  } catch (error) {
    console.error('Check master admin status error:', error);
    res.status(500).json({ error: 'Failed to check master admin status' });
  }
});

// ==================== MASTER ADMIN ROUTES ====================
const masterAdminRoutes = require('./routes/master-admin')(dbModule);
app.use('/api/admin', masterAdminRoutes);

// Start server
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
