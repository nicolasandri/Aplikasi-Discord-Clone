const { db } = require('./database.js');

console.log('Fixing database schema...\n');

// Fix friendships table - add updated_at column
db.run('ALTER TABLE friendships ADD COLUMN updated_at DATETIME DEFAULT CURRENT_TIMESTAMP', (err) => {
  if (err) {
    if (err.message.includes('duplicate column')) {
      console.log('✓ friendships.updated_at already exists');
    } else {
      console.log('✗ friendships error:', err.message);
    }
  } else {
    console.log('✅ Added friendships.updated_at column');
  }
  
  // Fix dm_channels table - add updated_at column
  db.run('ALTER TABLE dm_channels ADD COLUMN updated_at DATETIME DEFAULT CURRENT_TIMESTAMP', (err) => {
    if (err) {
      if (err.message.includes('duplicate column')) {
        console.log('✓ dm_channels.updated_at already exists');
      } else {
        console.log('✗ dm_channels error:', err.message);
      }
    } else {
      console.log('✅ Added dm_channels.updated_at column');
    }
    
    console.log('\n✅ Database fix complete!');
    process.exit(0);
  });
});
