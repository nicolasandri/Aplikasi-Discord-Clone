const jwt = require('jsonwebtoken');

// Dynamic database selection
const usePostgres = process.env.USE_POSTGRES === 'true' || process.env.DATABASE_URL;
const db = usePostgres ? require('../database-postgres') : require('../database');

const JWT_SECRET = process.env.JWT_SECRET;

// Middleware untuk verifikasi access token
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Token tidak ditemukan' });
    }

    const token = authHeader.substring(7);
    
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      
      // Verifikasi token_version (untuk force logout)
      const user = await db.dbGet('SELECT token_version FROM users WHERE id = ?', [decoded.id || decoded.userId]);
      
      if (!user) {
        return res.status(401).json({ error: 'User tidak ditemukan' });
      }
      
      // Check kalau token version sudah berubah (force logout)
      // Skip jika token tidak punya tokenVersion (backward compatibility)
      if (decoded.tokenVersion !== undefined && user.token_version !== undefined && user.token_version !== decoded.tokenVersion) {
        return res.status(401).json({ 
          error: 'Token sudah tidak valid. Silakan login kembali.',
          code: 'TOKEN_REVOKED'
        });
      }
      
      req.user = decoded;
      req.userId = decoded.id || decoded.userId;
      next();
      
    } catch (jwtError) {
      if (jwtError.name === 'TokenExpiredError') {
        return res.status(401).json({ 
          error: 'Token expired',
          code: 'TOKEN_EXPIRED'
        });
      }
      
      if (jwtError.name === 'JsonWebTokenError') {
        return res.status(401).json({ error: 'Token tidak valid' });
      }
      
      throw jwtError;
    }
    
  } catch (error) {
    console.error('Auth error:', error);
    res.status(500).json({ error: 'Terjadi kesalahan autentikasi' });
  }
};

// Middleware optional - kalau ada token, decode; kalau tidak, lanjutkan
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        req.userId = decoded.id || decoded.userId;
      } catch {
        // Ignore error, user tidak terautentikasi
      }
    }
    
    next();
  } catch (error) {
    next();
  }
};

module.exports = { authenticate, optionalAuth };
