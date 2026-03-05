/**
 * Generate update info for Electron Auto Updater
 * Run this after building the app to generate latest.yml
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const yaml = require('js-yaml');

const RELEASE_DIR = path.join(__dirname, '../app/release');
const PACKAGE_JSON = path.join(__dirname, '../app/package.json');

function getFileHash(filePath) {
  const buffer = fs.readFileSync(filePath);
  const hash = crypto.createHash('sha512');
  hash.update(buffer);
  return hash.digest('base64');
}

function generateUpdateInfo() {
  // Read package.json for version
  const pkg = JSON.parse(fs.readFileSync(PACKAGE_JSON, 'utf8'));
  const version = pkg.version;

  // Find the setup exe file
  const files = fs.readdirSync(RELEASE_DIR);
  const setupFile = files.find(f => f.endsWith('Setup.exe') && !f.includes('blockmap'));
  
  if (!setupFile) {
    console.error('Setup file not found in release directory');
    process.exit(1);
  }

  const setupPath = path.join(RELEASE_DIR, setupFile);
  const fileSize = fs.statSync(setupPath).size;
  const fileHash = getFileHash(setupPath);

  // Generate latest.yml
  const updateInfo = {
    version: version,
    files: [
      {
        url: setupFile,
        sha512: fileHash,
        size: fileSize
      }
    ],
    path: setupFile,
    sha512: fileHash,
    releaseDate: new Date().toISOString()
  };

  const yamlContent = yaml.dump(updateInfo);
  const yamlPath = path.join(RELEASE_DIR, 'latest.yml');
  
  fs.writeFileSync(yamlPath, yamlContent);
  console.log('Generated latest.yml:');
  console.log(yamlContent);
  console.log(`\nFile saved to: ${yamlPath}`);
}

generateUpdateInfo();
