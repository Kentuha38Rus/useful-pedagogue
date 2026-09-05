const webpush = require('web-push');
const { PushSubscription } = require('../models');

const publicVapidKey = process.env.VAPID_PUBLIC_KEY;
const privateVapidKey = process.env.VAPID_PRIVATE_KEY;

if (publicVapidKey && privateVapidKey) {
  webpush.setVapidDetails(
    process.env.VAPID_EMAIL || 'mailto:admin@useful-pedagogue.com',
    publicVapidKey,
    privateVapidKey
  );
} else {
  console.warn('VAPID keys not set. Push notifications will not work.');
}

class NotificationService {
  static async sendPushNotifications(subscriptions, payload) {
    const results = [];
    for (const sub of subscriptions) {
      const pushSubscription = {
        endpoint: sub.endpoint,
        keys: {
          auth: sub.auth_key,
          p256dh: sub.p256dh_key,
        },
      };
      try {
        const response = await webpush.sendNotification(pushSubscription, JSON.stringify(payload));
        results.push({
          userId: sub.user_id,
          success: true,
          statusCode: response.statusCode,
        });
      } catch (error) {
        console.error('Push notification error:', error);
        results.push({
          userId: sub.user_id,
          success: false,
          error: error.message,
        });
        if (error.statusCode === 410) {
          await sub.destroy();
        }
      }
    }
    return results;
  }

  static async saveSubscription(userId, subscription) {
    const { endpoint, keys } = subscription;
    const existing = await PushSubscription.findOne({ where: { endpoint } });
    if (existing) {
      await existing.update({
        auth_key: keys.auth,
        p256dh_key: keys.p256dh,
      });
      return existing;
    }
    return await PushSubscription.create({
      user_id: userId,
      endpoint,
      auth_key: keys.auth,
      p256dh_key: keys.p256dh,
    });
  }
}

module.exports = NotificationService;