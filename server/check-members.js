const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./workgrid.db');

const userId = '47f542e2-2927-4a04-a2dc-b134003a8516';
const serverId = '454f9373-260b-4457-9614-f3744a409ffe';

db.all("SELECT * FROM users WHERE id = ?", [userId], (err, rows) => {
  if (err) console.error(err);
  else console.log('User:', JSON.stringify(rows, null, 2));
  
  db.all("SELECT * FROM servers WHERE id = ?", [serverId], (err2, rows2) => {
    if (err2) console.error(err2);
    else console.log('Server:', JSON.stringify(rows2, null, 2));
    
    // Try to add member manually
    const id = require('uuid').v4();
    db.run(
      'INSERT INTO server_members (id, server_id, user_id, role) VALUES (?, ?, ?, ?)',
      [id, serverId, userId, 'member'],
      function(err3) {
        if (err3) console.error('Insert error:', err3.message);
        else console.log('Member added successfully, ID:', id);
        db.close();
      }
    );
  });
});
