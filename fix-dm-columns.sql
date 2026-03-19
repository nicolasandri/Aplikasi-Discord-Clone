-- Add missing columns to dm_channels table
ALTER TABLE dm_channels ADD COLUMN IF NOT EXISTS type VARCHAR(20) DEFAULT 'direct';
ALTER TABLE dm_channels ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE dm_channels ADD COLUMN IF NOT EXISTS creator_id UUID;
ALTER TABLE dm_channels ADD COLUMN IF NOT EXISTS icon TEXT;

-- Add dm_channel_members table if not exists
CREATE TABLE IF NOT EXISTS dm_channel_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  dm_channel_id UUID NOT NULL REFERENCES dm_channels(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(dm_channel_id, user_id)
);

-- Create index for dm_channel_members
CREATE INDEX IF NOT EXISTS idx_dm_channel_members_channel ON dm_channel_members(dm_channel_id);
CREATE INDEX IF NOT EXISTS idx_dm_channel_members_user ON dm_channel_members(user_id);
