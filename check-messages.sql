SELECT m.id, m.user_id, u.id as u_id, u.username, m.content 
FROM messages m 
LEFT JOIN users u ON m.user_id::text = u.id::text 
WHERE m.channel_id::text = '41431c40-a85d-4243-9ce2-ee7cc3debf45'
ORDER BY m.created_at DESC 
LIMIT 5;
