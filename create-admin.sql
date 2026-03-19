-- Create admin user with password: admin123
INSERT INTO users (id, username, email, password, avatar, is_active, is_master_admin, token_version, status)
VALUES (
  gen_random_uuid()::text,
  'admin',
  'admin@workgrid.com',
  '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', -- bcrypt hash for 'password'
  'https://api.dicebear.com/7.x/avataaars/svg?seed=admin',
  true,
  true,
  0,
  'online'
)
ON CONFLICT (email) DO NOTHING;

-- Create a default server
INSERT INTO servers (id, name, icon, owner_id)
SELECT 
  gen_random_uuid()::text,
  'WorkGrid Official',
  NULL,
  id
FROM users WHERE email = 'admin@workgrid.com'
ON CONFLICT DO NOTHING;

-- Add admin as member
INSERT INTO server_members (id, server_id, user_id, role, join_method)
SELECT 
  gen_random_uuid()::text,
  s.id,
  u.id,
  'owner',
  'Manual'
FROM servers s, users u
WHERE s.name = 'WorkGrid Official' AND u.email = 'admin@workgrid.com'
ON CONFLICT DO NOTHING;
