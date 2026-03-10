-- Migration 011: Add user_server_access table for per-user server access control

CREATE TABLE IF NOT EXISTS user_server_access (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  server_id INTEGER NOT NULL REFERENCES servers(id) ON DELETE CASCADE,
  is_allowed BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, server_id)
);

CREATE INDEX IF NOT EXISTS idx_user_server_access_user ON user_server_access(user_id);
CREATE INDEX IF NOT EXISTS idx_user_server_access_server ON user_server_access(server_id);
