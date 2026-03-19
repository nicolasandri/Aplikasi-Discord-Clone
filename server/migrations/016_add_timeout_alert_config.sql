-- Add timeout alert configuration for permission system
-- This stores which roles to tag when permission timeout occurs

-- Add timeout_alert columns to permission_requests table
ALTER TABLE permission_requests 
ADD COLUMN IF NOT EXISTS timeout_alert_sent BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS timeout_alert_sent_at TIMESTAMP;

-- Create index for efficient timeout checking
CREATE INDEX IF NOT EXISTS idx_permission_requests_timeout_check 
ON permission_requests(status, timeout_alert_sent, started_at, max_duration_minutes)
WHERE status = 'active' AND timeout_alert_sent = false;

-- Create table for timeout alert configuration
CREATE TABLE IF NOT EXISTS permission_timeout_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  server_id UUID NOT NULL REFERENCES servers(id) ON DELETE CASCADE,
  alert_roles TEXT[] DEFAULT ARRAY['OPERATOR', 'SPV']::TEXT[],
  alert_message TEXT DEFAULT '⛔ Waktu izin habis. Kalau masih lanjut, itu bukan izin—itukabur.',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(server_id)
);

-- Create index for faster lookup
CREATE INDEX IF NOT EXISTS idx_permission_timeout_config_server_id 
ON permission_timeout_config(server_id);

-- Add comment
COMMENT ON TABLE permission_timeout_config IS 'Stores timeout alert configuration for permission system';

-- Insert default config for JEBOLTOGEL server
INSERT INTO permission_timeout_config (server_id, alert_roles, alert_message)
VALUES (
  'c7fc8080-caa3-4cb3-bf25-7fa4387cbf2d'::uuid,
  ARRAY['OPERATOR', 'SPV']::TEXT[],
  '⛔ Waktu izin habis. Kalau masih lanjut, itu bukan izin—itukabur.'
)
ON CONFLICT (server_id) DO NOTHING;

SELECT 'Permission timeout config table created successfully' as result;
