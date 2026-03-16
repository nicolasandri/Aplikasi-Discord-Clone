UPDATE users SET display_name = username WHERE display_name IS NULL OR display_name = '';
