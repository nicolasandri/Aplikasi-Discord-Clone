const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('workgrid.db');

// Check all users with 'Nicolas' in name
db.all("SELECT id, username, email, display_name FROM users WHERE username LIKE '%Nicolas%' OR display_name LIKE '%Nicolas%'", (err, rows) => {
  if (err) {
    console.error('Error:', err);
    db.close();
    return;
  }
  console.log('Users with Nicolas:');
  rows.forEach(r => console.log('  ID:', r.id, 'Username:', r.username, 'Display:', r.display_name, 'Email:', r.email));
  
  // Also check users with jebolkasir
  db.all("SELECT id, username, email, display_name FROM users WHERE username LIKE '%jebolkasir%' OR email LIKE '%jebolkasir%'", (err2, rows2) => {
    if (err2) {
      console.error('Error:', err2);
      db.close();
      return;
    }
    console.log('\nUsers with jebolkasir:');
    rows2.forEach(r => console.log('  ID:', r.id, 'Username:', r.username, 'Display:', r.display_name, 'Email:', r.email));
    db.close();
  });
});
