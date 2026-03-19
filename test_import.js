const dbModule = require('./database-postgres');
console.log('Keys:', Object.keys(dbModule).filter(k => k.includes('notification')));
console.log('Has export:', 'serverNotificationSettingsDB' in dbModule);
console.log('Type:', typeof dbModule.serverNotificationSettingsDB);
