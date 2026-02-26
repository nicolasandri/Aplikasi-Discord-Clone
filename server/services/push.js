const { webpush } = require('../config/push');
const { subscriptionDB } = require('../database');

class PushNotificationService {
  /**
   * Send push notification to a specific user
   * @param {string} userId - User ID to send to
   * @param {Object} notification - Notification payload
   * @returns {Promise<Array>} Results of each subscription
   */
  async sendToUser(userId, notification) {
    const subscriptions = await subscriptionDB.getByUser(userId);
    
    if (!subscriptions || subscriptions.length === 0) {
      return [];
    }

    const payload = JSON.stringify({
      title: notification.title,
      body: notification.body,
      icon: notification.icon || '/icon-192x192.png',
      badge: '/badge-72x72.png',
      tag: notification.tag || 'default',
      data: {
        url: notification.url || '/',
        ...notification.data
      },
      actions: notification.actions || [],
      requireInteraction: notification.requireInteraction || false,
      silent: notification.silent || false
    });

    const results = await Promise.allSettled(
      subscriptions.map(async (sub) => {
        try {
          await webpush.sendNotification({
            endpoint: sub.endpoint,
            keys: {
              p256dh: sub.p256dh,
              auth: sub.auth
            }
          }, payload);
          return { success: true, endpoint: sub.endpoint };
        } catch (error) {
          // Remove invalid/expired subscriptions
          if (error.statusCode === 410 || error.statusCode === 404) {
            await subscriptionDB.remove(userId, sub.endpoint);
          }
          return { success: false, error: error.message, endpoint: sub.endpoint };
        }
      })
    );

    return results;
  }

  /**
   * Send mention notification
   * @param {string} userId - User being mentioned
   * @param {string} mentionerName - Name of user who mentioned
   * @param {string} channelName - Channel name where mentioned
   * @param {string} messagePreview - Preview of the message
   * @param {string} url - URL to navigate to when clicked
   */
  async sendMentionNotification(userId, mentionerName, channelName, messagePreview, url) {
    return this.sendToUser(userId, {
      title: `${mentionerName} menyebut Anda`,
      body: `#${channelName}: ${messagePreview.substring(0, 100)}`,
      icon: '/icon-192x192.png',
      tag: 'mention',
      url,
      data: { type: 'mention' }
    });
  }

  /**
   * Send DM notification
   * @param {string} userId - Recipient user ID
   * @param {string} senderName - Name of sender
   * @param {string} messagePreview - Preview of the message
   * @param {string} url - URL to navigate to when clicked
   */
  async sendDMNotification(userId, senderName, messagePreview, url) {
    return this.sendToUser(userId, {
      title: `Pesan dari ${senderName}`,
      body: messagePreview.substring(0, 100),
      icon: '/icon-192x192.png',
      tag: 'dm',
      url,
      data: { type: 'dm' }
    });
  }

  /**
   * Send friend request notification
   * @param {string} userId - Recipient user ID
   * @param {string} requesterName - Name of user who sent request
   */
  async sendFriendRequestNotification(userId, requesterName) {
    return this.sendToUser(userId, {
      title: 'Permintaan Pertemanan Baru',
      body: `${requesterName} ingin berteman dengan Anda`,
      icon: '/icon-192x192.png',
      tag: 'friend-request',
      url: '/friends',
      data: { type: 'friend-request' }
    });
  }

  /**
   * Check if push notifications are configured
   * @returns {boolean}
   */
  isConfigured() {
    return !!(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);
  }
}

module.exports = new PushNotificationService();
