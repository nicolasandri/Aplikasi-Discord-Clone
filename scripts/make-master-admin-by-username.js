#!/usr/bin/env node

/**
 * Script untuk set user sebagai Master Admin berdasarkan username
 * Usage: node make-master-admin-by-username.js <username>
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '..', 'server', 'workgrid.db');

const username = process.argv[2];

if (!username) {
  console.log(`
Usage: node make-master-admin-by-username.js <username>

Examples:
  node make-master-admin-by-username.js KOADA
  node make-master-admin-by-username.js admin
`);
  process.exit(1);
}

console.log(`Setting user "${username}" as Master Admin...`);
console.log(`Database: ${dbPath}`);

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('❌ Failed to open database:', err.message);
    process.exit(1);
  }
  console.log('✅ Connected to database');
});

// Find user by username
const findUserSQL = `SELECT id, username, email, is_master_admin FROM users WHERE username = ? COLLATE NOCASE`;

db.get(findUserSQL, [username], (err, row) => {
  if (err) {
    console.error('❌ Error finding user:', err.message);
    db.close();
    process.exit(1);
  }
  
  if (!row) {
    console.error(`❌ User "${username}" not found`);
    console.log('\nAvailable users:');
    db.all(`SELECT username, email FROM users LIMIT 10`, [], (err, rows) => {
      if (!err) {
        rows.forEach(u => console.log(`  - ${u.username} (${u.email})`));
      }
      db.close();
      process.exit(1);
    });
    return;
  }
  
  console.log(`\nFound user:`);
  console.log(`  ID: ${row.id}`);
  console.log(`  Username: ${row.username}`);
  console.log(`  Email: ${row.email}`);
  console.log(`  Current Master Admin: ${row.is_master_admin ? 'Yes' : 'No'}`);
  
  if (row.is_master_admin) {
    console.log('\n✅ User is already a Master Admin!');
    db.close();
    return;
  }
  
  // Update user to be Master Admin
  const updateSQL = `UPDATE users SET is_master_admin = 1 WHERE id = ?`;
  
  db.run(updateSQL, [row.id], function(err) {
    if (err) {
      console.error('❌ Error updating user:', err.message);
      db.close();
      process.exit(1);
    }
    
    if (this.changes === 0) {
      console.log('\n⚠️  No changes made');
    } else {
      console.log('\n✅ SUCCESS!');
      console.log(`User "${row.username}" is now a Master Admin!`);
      console.log('\nNext steps:');
      console.log('1. Refresh browser (F5)');
      console.log('2. Klik avatar di pojok kiri bawah');
      console.log('3. Pilih "Master Admin Dashboard"');
    }
    
    db.close();
  });
});
