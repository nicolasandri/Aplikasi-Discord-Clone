UPDATE users SET is_master_admin = TRUE WHERE email = 'admin@workgrid.com';
SELECT id, username, email, is_master_admin, is_active FROM users;
