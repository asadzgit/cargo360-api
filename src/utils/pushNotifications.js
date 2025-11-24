const { Expo } = require('expo-server-sdk');

const expo = new Expo();

async function sendPushNotification(tokens, title, body, data = {}) {
  const messages = tokens
    .filter(t => Expo.isExpoPushToken(t))
    .map(token => ({
      to: token,
      sound: 'default',
      title,
      body,
      data,
    }));

  const chunks = expo.chunkPushNotifications(messages);
  for (const chunk of chunks) {
    try {
      await expo.sendPushNotificationsAsync(chunk);
    } catch (err) {
      console.error('Expo Push Error:', err);
    }
  }
}

module.exports = { sendPushNotification };

