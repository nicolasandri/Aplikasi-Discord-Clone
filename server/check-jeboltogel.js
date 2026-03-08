const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./workgrid.db');

console.log('Checking all users with joined_via_group_code...\n');

db.all('SELECT id, username, joined_via_group_code FROM users', (err, rows) => {
  if (err) {
    console.error('Error:', err);
    db.close();
    return;
  }
  
  console.log('All users:');
  console.table(rows);
  
  // Count JEBOLTOGEL users
  const jeboltogelUsers = rows.filter(r => r.joined_via_group_code === 'JEBOLTOGEL');
  console.log('\nJEBOLTOGEL users count:', jeboltogelUsers.length);
  console.log('JEBOLTOGEL users:', jeboltogelUsers.map(u => u.username));
  
  // Show all non-null group codes
  const withGroupCode = rows.filter(r => r.joined_via_group_code);
  console.log('\nAll users with group codes:');
  console.table(withGroupCode);
  
  db.close();
});
