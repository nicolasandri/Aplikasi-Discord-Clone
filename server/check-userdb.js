// Check all userDB functions
const usePostgres = process.env.USE_POSTGRES === 'true' || process.env.DATABASE_URL;
const db = usePostgres ? require('./database-postgres') : require('./database');

const requiredFunctions = [
  'create',
  'findByEmail',
  'findByUsername',
  'findById',
  'updateProfile',
  'updatePassword',
  'verifyPassword',
  'needsPasswordChange',
  'updateLastLogin',
  'resetAllStatus'
];

console.log('Checking userDB functions...\n');
let missing = [];

for (const fn of requiredFunctions) {
  const exists = typeof db.userDB[fn] === 'function';
  console.log(`${exists ? '✅' : '❌'} ${fn}`);
  if (!exists) missing.push(fn);
}

if (missing.length > 0) {
  console.log('\n❌ Missing functions:', missing.join(', '));
  process.exit(1);
} else {
  console.log('\n✅ All functions available!');
  process.exit(0);
}
