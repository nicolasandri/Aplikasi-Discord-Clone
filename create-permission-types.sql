CREATE TABLE IF NOT EXISTS server_permission_types (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  server_id TEXT NOT NULL REFERENCES servers(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  max_duration INTEGER DEFAULT 5,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(server_id, name)
);

CREATE INDEX IF NOT EXISTS idx_server_permission_types_server_id 
ON server_permission_types(server_id);

SELECT * FROM server_permission_types LIMIT 1;
