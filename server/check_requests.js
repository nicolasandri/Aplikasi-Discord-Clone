const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('workgrid.db');

// Check pending friend requests involving DIGNA
const dignaId = '4e0bd272-0fee-4fe4-92ba-615fd90bb757';

db.all(`
  SELECT f.*, 
    u1.username as from_username, u1.display_name as from_display,
    u2.username as to_username, u2.display_name as to_display
  FROM friendships f
  JOIN users u1 ON f.user_id = u1.id
  JOIN users u2 ON f.friend_id = u2.id
  WHERE f.user_id = ? OR f.friend_id = ?
`, [dignaId, dignaId], (err, rows) => {
  if (err) {
    console.error('Error:', err);
    db.close();
    return;
  }
  console.log('Friend requests involving DIGNA:');
  rows.forEach(r => {
    console.log(`\n  ID: ${r.id}`);
    console.log(`  From: ${r.from_username} (${r.from_display}) -> To: ${r.to_username} (${r.to_display})`);
    console.log(`  Status: ${r.status}`);
    console.log(`  Created: ${r.created_at}`);
  });
  db.close();
});
