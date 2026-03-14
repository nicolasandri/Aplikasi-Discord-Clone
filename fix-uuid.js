const fs = require('fs');
let c = fs.readFileSync('/app/database-postgres.js', 'utf8');
c = c.replace(/::uuid\$1/g, '$1::uuid');
fs.writeFileSync('/app/database-postgres.js', c);
console.log('fixed');
