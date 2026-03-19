ALTER TABLE user_server_access ADD COLUMN IF NOT EXISTS is_allowed BOOLEAN DEFAULT true;
SELECT column_name FROM information_schema.columns WHERE table_name = 'user_server_access';
