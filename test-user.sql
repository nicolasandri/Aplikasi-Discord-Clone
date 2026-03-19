SELECT id, username, email, avatar, status, token_version, created_at, is_master_admin, display_name, joined_via_group_code 
FROM users 
WHERE email = 'admin@workgrid.com';
