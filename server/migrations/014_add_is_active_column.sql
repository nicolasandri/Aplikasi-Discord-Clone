-- Add is_active column to users table for PostgreSQL
-- This column is needed for user account activation/deactivation

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='users' AND column_name='is_active') THEN
        ALTER TABLE users ADD COLUMN is_active BOOLEAN DEFAULT true;
    END IF;
END $$;

-- Update existing users to have is_active = true (active by default)
UPDATE users SET is_active = true WHERE is_active IS NULL;
