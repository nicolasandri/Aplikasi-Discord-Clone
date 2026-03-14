-- Fix user_server_access table schema mismatch
-- This migration adds missing columns to match database-postgres.js expectations

-- Add access_level column if not exists
ALTER TABLE user_server_access 
ADD COLUMN IF NOT EXISTS access_level TEXT DEFAULT 'read';

-- Add granted_by column if not exists
ALTER TABLE user_server_access 
ADD COLUMN IF NOT EXISTS granted_by TEXT;

-- Update existing rows to have access_level based on is_allowed
UPDATE user_server_access 
SET access_level = CASE 
    WHEN is_allowed = true THEN 'read'
    ELSE 'denied'
END
WHERE access_level IS NULL;
