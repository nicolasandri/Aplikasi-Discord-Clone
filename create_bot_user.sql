-- Create system bot user for permission bot messages
INSERT INTO users (id, username, email, password, is_master_admin, is_active, created_at) 
VALUES (
  '00000000-0000-0000-0000-000000000000'::uuid, 
  'SYSTEM', 
  'system@localhost', 
  'not-a-password', 
  false, 
  true, 
  NOW()
)
ON CONFLICT (id) DO NOTHING;

-- Verify
SELECT id, username FROM users WHERE username = 'SYSTEM';
