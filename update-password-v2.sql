-- Update password to admin123 with correct hash from server
UPDATE users SET password = '$2b$10$jNJNPYfhg89L5JdiJM8LE.HVZl8mDrC07rSt60n4jnZXVJj8fXQTG' WHERE email = 'admin@workgrid.com';
