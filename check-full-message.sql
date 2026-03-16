SELECT 
  m.id, 
  m.channel_id, 
  m.user_id, 
  u.username, 
  u.avatar,
  m.content,
  m.created_at
FROM messages m
LEFT JOIN users u ON m.user_id::text = u.id::text
WHERE m.channel_id::text = 'caf0eaa8-1dac-4e4c-9011-6f9e78625fbc'
ORDER BY m.created_at DESC
LIMIT 5;
