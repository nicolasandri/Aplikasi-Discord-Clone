SELECT m.id, m.channel_id, m.user_id, m.content, m.created_at 
FROM messages m 
WHERE m.user_id::text = '00000000-0000-0000-0000-000000000000'
ORDER BY m.created_at DESC 
LIMIT 5;
