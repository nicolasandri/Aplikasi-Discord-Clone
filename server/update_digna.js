const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('workgrid.db');

const userId = '4e0bd272-0fee-4fe4-92ba-615fd90bb757';
const newUsername = 'jebolkasir7';

// Update username DIGNA
db.run(
  'UPDATE users SET username = ? WHERE id = ?',
  [newUsername, userId],
  function(err) {
    if (err) {
      console.error('Error updating username:', err.message);
      db.close();
      return;
    }
    console.log(`Updated ${this.changes} row(s)`);
    
    // Verify the update
    db.get('SELECT id, username, email, display_name FROM users WHERE id = ?', [userId], (err, row) => {
      if (err) {
        console.error('Error verifying:', err);
      } else {
        console.log('Updated user:', row);
      }
      db.close();
    });
  }
);
