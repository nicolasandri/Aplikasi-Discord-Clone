// Check database exports
const usePostgres = process.env.USE_POSTGRES === 'true' || process.env.DATABASE_URL;
console.log('USE_POSTGRES:', usePostgres);

const db = usePostgres ? require('./database-postgres') : require('./database');
console.log('Database module exports:', Object.keys(db));
console.log('userDB exports:', db.userDB ? Object.keys(db.userDB) : 'undefined');
console.log('Has resetAllStatus:', db.userDB && typeof db.userDB.resetAllStatus === 'function');
