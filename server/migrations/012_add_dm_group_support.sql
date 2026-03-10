-- Migration 012: Add group DM support (type, creator_id, dm_channel_members table)

-- Add type and creator_id columns to dm_channels
ALTER TABLE dm_channels ADD COLUMN IF NOT EXISTS type VARCHAR(20) DEFAULT 'direct';
ALTER TABLE dm_channels ADD COLUMN IF NOT EXISTS name VARCHAR(255);
ALTER TABLE dm_channels ADD COLUMN IF NOT EXISTS creator_id UUID REFERENCES users(id) ON DELETE SET NULL;

-- Create dm_channel_members table
CREATE TABLE IF NOT EXISTS dm_channel_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  channel_id UUID NOT NULL REFERENCES dm_channels(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  joined_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(channel_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_dm_channel_members_channel ON dm_channel_members(channel_id);
CREATE INDEX IF NOT EXISTS idx_dm_channel_members_user ON dm_channel_members(user_id);

-- Populate dm_channel_members from existing direct channels
INSERT INTO dm_channel_members (id, channel_id, user_id, joined_at)
SELECT uuid_generate_v4(), id, user1_id, created_at FROM dm_channels
ON CONFLICT DO NOTHING;

INSERT INTO dm_channel_members (id, channel_id, user_id, joined_at)
SELECT uuid_generate_v4(), id, user2_id, created_at FROM dm_channels
ON CONFLICT DO NOTHING;
