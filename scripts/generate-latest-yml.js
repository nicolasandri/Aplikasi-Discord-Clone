const fs = require('fs');
const crypto = require('crypto');
const path = require('path');

const releaseDir = path.join(__dirname, '../app/release');
const file = 'WorkGrid Setup 1.0.0.exe';
const filePath = path.join(releaseDir, file);

if (!fs.existsSync(filePath)) {
  console.error('File not found:', filePath);
  process.exit(1);
}

const buffer = fs.readFileSync(filePath);
const hash = crypto.createHash('sha512').update(buffer).digest('base64');
const size = buffer.length;

const yaml = `version: 1.0.0
files:
  - url: WorkGrid Setup 1.0.0.exe
    sha512: ${hash}
    size: ${size}
path: WorkGrid Setup 1.0.0.exe
sha512: ${hash}
releaseDate: ${new Date().toISOString()}
`;

fs.writeFileSync(path.join(releaseDir, 'latest.yml'), yaml);
console.log('✅ latest.yml generated successfully!');
console.log(yaml);
