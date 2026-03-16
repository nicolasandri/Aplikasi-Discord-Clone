-- Migration 015: Add server permission types table for permission bot

-- ============================================================
-- SERVER_PERMISSION_TYPES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS server_permission_types (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  server_id TEXT NOT NULL REFERENCES servers(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  max_duration INTEGER DEFAULT 5,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(server_id, name)
);

CREATE INDEX IF NOT EXISTS idx_server_permission_types_server_id ON server_permission_types(server_id);

-- Insert default permission types for existing servers
INSERT INTO server_permission_types (server_id, name, max_duration)
SELECT 
  s.id as server_id,
  unnest(ARRAY['wc', 'makan', 'rokok']) as name,
  5 as max_duration
FROM servers s
WHERE NOT EXISTS (
  SELECT 1 FROM server_permission_types WHERE server_id = s.id
)
ON CONFLICT (server_id, name) DO NOTHING;
