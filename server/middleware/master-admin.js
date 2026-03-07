// Middleware untuk Master Admin
const db = require('../database');

// Cek apakah user adalah Master Admin
const requireMasterAdmin = async (req, res, next) => {
  try {
    const userId = req.userId;
    
    if (!userId) {
      return res.status(401).json({ error: 'Akses ditolak. Silakan login terlebih dahulu.' });
    }
    
    const user = await db.userDB.findById(userId, true);
    
    if (!user) {
      return res.status(404).json({ error: 'User tidak ditemukan' });
    }
    
    if (!user.is_master_admin) {
      return res.status(403).json({ error: 'Akses ditolak. Hanya Master Admin yang dapat mengakses fitur ini.' });
    }
    
    // Set user data untuk digunakan di route handler
    req.userData = user;
    next();
  } catch (error) {
    console.error('Master Admin middleware error:', error);
    res.status(500).json({ error: 'Terjadi kesalahan saat verifikasi Master Admin' });
  }
};

module.exports = { requireMasterAdmin };
