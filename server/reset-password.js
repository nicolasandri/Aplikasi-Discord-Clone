const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const path = require('path');

const dbPath = path.join(__dirname, 'workgrid.db');
console.log('Database path:', dbPath);

const db = new sqlite3.Database(dbPath);

const newPassword = 'admin123';
const hashedPassword = bcrypt.hashSync(newPassword, 12);
const email = 'admin@workgrid.com';

db.run(
  'UPDATE users SET password = ? WHERE email = ?',
  [hashedPassword, email],
  function(err) {
    if (err) {
      console.error('Error:', err);
    } else {
      console.log('Password reset successful! Changes:', this.changes);
    }
    db.close();
  }
);
