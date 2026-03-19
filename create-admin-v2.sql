-- Create admin user with password: admin123
-- Password hash generated with bcrypt(10 rounds): admin123
INSERT INTO users (username, email, password, avatar, is_master_admin, status)
VALUES (
  'admin',
  'admin@workgrid.com',
  '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', -- bcrypt hash for 'password'
  'https://api.dicebear.com/7.x/avataaars/svg?seed=admin',
  true,
  'online'
)
ON CONFLICT (email) DO UPDATE SET password = EXCLUDED.password, is_master_admin = true;

-- Create a default server
INSERT INTO servers (name, icon, owner_id)
SELECT 
  'WorkGrid Official',
  NULL,
  id
FROM users WHERE email = 'admin@workgrid.com'
ON CONFLICT DO NOTHING;

-- Add admin as member
INSERT INTO server_members (server_id, user_id, role)
SELECT 
  s.id,
  u.id,
  'owner'
FROM servers s, users u
WHERE s.name = 'WorkGrid Official' AND u.email = 'admin@workgrid.com'
ON CONFLICT DO NOTHING;
