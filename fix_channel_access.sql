-- Create role_channel_access table with proper constraints
CREATE TABLE IF NOT EXISTS role_channel_access (
  id TEXT PRIMARY KEY,
  role_id TEXT NOT NULL,
  channel_id TEXT NOT NULL,
  is_allowed BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(role_id, channel_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_role_channel_access_role ON role_channel_access(role_id);
CREATE INDEX IF NOT EXISTS idx_role_channel_access_channel ON role_channel_access(channel_id);
