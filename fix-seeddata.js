
  // Ensure existing admin is master admin
  if (admin) {
    const isPostgres = process.env.USE_POSTGRES === 'true' || process.env.DATABASE_URL;
    if (isPostgres) {
      await dbRun('UPDATE users SET is_master_admin = true WHERE email = $1', ['admin@workgrid.com']);
    } else {
      await dbRun('UPDATE users SET is_master_admin = 1 WHERE email = ?', ['admin@workgrid.com']);
    }
    console.log('✅ Admin master status verified');
  }
