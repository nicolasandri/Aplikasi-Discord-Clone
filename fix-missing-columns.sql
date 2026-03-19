-- Add missing columns to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS token_version INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS force_password_change BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Add missing columns to server_members table
ALTER TABLE server_members ADD COLUMN IF NOT EXISTS join_method TEXT DEFAULT 'invite';

-- Check columns
SELECT column_name FROM information_schema.columns WHERE table_name = 'users' ORDER BY ordinal_position;
