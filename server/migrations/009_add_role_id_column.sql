-- Add role_id column to server_members table
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='server_members' AND column_name='role_id') THEN
        ALTER TABLE server_members ADD COLUMN role_id TEXT;
    END IF;
END $$;
