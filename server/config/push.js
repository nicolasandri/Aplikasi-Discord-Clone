const webpush = require('web-push');

// VAPID keys should be set in environment variables
// Generate new keys with: node -e "console.log(require('web-push').generateVAPIDKeys())"
const vapidKeys = {
  publicKey: process.env.VAPID_PUBLIC_KEY,
  privateKey: process.env.VAPID_PRIVATE_KEY
};

// Only set VAPID details if keys are provided
if (vapidKeys.publicKey && vapidKeys.privateKey) {
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || 'mailto:admin@workgrid.app',
    vapidKeys.publicKey,
    vapidKeys.privateKey
  );
} else {
  console.warn('⚠️  VAPID keys not configured. Push notifications will not work.');
  console.warn('   Generate keys with: node -e "console.log(require(\'web-push\').generateVAPIDKeys())"');
}

module.exports = { webpush };
