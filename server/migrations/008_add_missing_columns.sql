-- Add missing columns for PostgreSQL compatibility

-- Add token_version to users table if not exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='users' AND column_name='token_version') THEN
        ALTER TABLE users ADD COLUMN token_version INTEGER DEFAULT 0;
    END IF;
END $$;

-- Add last_login to users table if not exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='users' AND column_name='last_login') THEN
        ALTER TABLE users ADD COLUMN last_login TIMESTAMP;
    END IF;
END $$;

-- Add last_login_ip to users table if not exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='users' AND column_name='last_login_ip') THEN
        ALTER TABLE users ADD COLUMN last_login_ip TEXT;
    END IF;
END $$;

-- Add force_password_change to users table if not exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='users' AND column_name='force_password_change') THEN
        ALTER TABLE users ADD COLUMN force_password_change BOOLEAN DEFAULT false;
    END IF;
END $$;

-- Add is_master_admin to users table if not exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='users' AND column_name='is_master_admin') THEN
        ALTER TABLE users ADD COLUMN is_master_admin BOOLEAN DEFAULT false;
    END IF;
END $$;

-- Add join_method to server_members table if not exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='server_members' AND column_name='join_method') THEN
        ALTER TABLE server_members ADD COLUMN join_method TEXT DEFAULT 'invite';
    END IF;
END $$;

-- Add position to categories table if not exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='categories' AND column_name='position') THEN
        ALTER TABLE categories ADD COLUMN position INTEGER DEFAULT 0;
    END IF;
END $$;

-- Add position to channels table if not exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='channels' AND column_name='position') THEN
        ALTER TABLE channels ADD COLUMN position INTEGER DEFAULT 0;
    END IF;
END $$;
