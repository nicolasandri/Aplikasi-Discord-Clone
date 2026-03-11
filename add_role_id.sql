-- Add role_id column to server_members
ALTER TABLE server_members ADD COLUMN IF NOT EXISTS role_id VARCHAR(255) REFERENCES server_roles(id) ON DELETE SET NULL;

-- Create member_roles table if not exists
CREATE TABLE IF NOT EXISTS member_roles (
  id SERIAL PRIMARY KEY,
  server_id VARCHAR(255) NOT NULL REFERENCES servers(id) ON DELETE CASCADE,
  user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role_id VARCHAR(255) NOT NULL REFERENCES server_roles(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(server_id, user_id, role_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_member_roles_server_user ON member_roles(server_id, user_id);
CREATE INDEX IF NOT EXISTS idx_member_roles_role_id ON member_roles(role_id);
