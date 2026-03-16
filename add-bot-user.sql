INSERT INTO users (id, username, email, password, status, is_active, created_at, updated_at) 
VALUES ('00000000-0000-0000-0000-000000000000', 'SECURITY BOT', 'bot@workgrid.local', 'bot_password_not_used', 'online', true, NOW(), NOW()) 
ON CONFLICT (id) DO NOTHING;
