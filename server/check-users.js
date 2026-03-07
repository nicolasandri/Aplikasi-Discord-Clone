const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./workgrid.db');

db.all('SELECT username, joined_via_group_code FROM users WHERE username LIKE ?', ['testuser%'], (err, rows) => {
  if (err) console.error(err);
  else console.log(JSON.stringify(rows, null, 2));
  db.close();
});
