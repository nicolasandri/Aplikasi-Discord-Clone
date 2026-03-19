-- Migration: Add server notification settings table
-- This table stores per-server notification preferences for each user

CREATE TABLE IF NOT EXISTS server_notification_settings (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id TEXT NOT NULL,
  server_id TEXT NOT NULL,
  
  -- Server-level notification level: 'all', 'mentions', 'nothing'
  notification_level VARCHAR(20) DEFAULT 'all',
  
  -- Mute settings
  muted BOOLEAN DEFAULT FALSE,
  muted_until TIMESTAMP NULL,
  
  -- Notification type toggles
  suppress_everyone_here BOOLEAN DEFAULT FALSE,
  suppress_role_mentions BOOLEAN DEFAULT FALSE,
  suppress_highlights BOOLEAN DEFAULT FALSE,
  
  -- Push notification settings
  push_notifications BOOLEAN DEFAULT TRUE,
  mobile_push_notifications BOOLEAN DEFAULT TRUE,
  
  -- Event notifications
  mute_new_events BOOLEAN DEFAULT FALSE,
  community_activity_alerts BOOLEAN DEFAULT TRUE,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE(user_id, server_id)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_server_notification_settings_user 
  ON server_notification_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_server_notification_settings_server 
  ON server_notification_settings(server_id);
CREATE INDEX IF NOT EXISTS idx_server_notification_settings_user_server 
  ON server_notification_settings(user_id, server_id);

-- Add channel override table for per-channel notification settings within a server
CREATE TABLE IF NOT EXISTS channel_notification_overrides (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id TEXT NOT NULL,
  channel_id TEXT NOT NULL,
  server_id TEXT NOT NULL, -- For easier joins
  
  -- Override level: 'all', 'mentions', 'nothing', 'default' (use server setting)
  notification_level VARCHAR(20) DEFAULT 'default',
  muted BOOLEAN DEFAULT FALSE,
  muted_until TIMESTAMP NULL,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE(user_id, channel_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_channel_notification_overrides_user 
  ON channel_notification_overrides(user_id);
CREATE INDEX IF NOT EXISTS idx_channel_notification_overrides_channel 
  ON channel_notification_overrides(channel_id);
CREATE INDEX IF NOT EXISTS idx_channel_notification_overrides_server 
  ON channel_notification_overrides(server_id);
CREATE INDEX IF NOT EXISTS idx_channel_notification_overrides_user_channel 
  ON channel_notification_overrides(user_id, channel_id);

-- Update existing notification_settings table to mark as channel-level
-- Keep the existing table for backward compatibility

COMMENT ON TABLE server_notification_settings IS 'Stores per-server notification preferences for each user';
COMMENT ON TABLE channel_notification_overrides IS 'Stores per-channel notification overrides within a server';
