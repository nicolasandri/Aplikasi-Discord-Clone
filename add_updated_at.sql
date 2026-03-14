-- Add updated_at column if not exists
ALTER TABLE role_channel_access ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
