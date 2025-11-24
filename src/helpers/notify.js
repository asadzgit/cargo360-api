const { sendPushNotification } = require('../utils/pushNotifications');
const { DeviceToken, Notification } = require('../../models');

async function sendUserNotification(userId, title, body, data = {}) {
  const tokens = await DeviceToken.findAll({
    where: { userId: userId },
    attributes: ['expoPushToken'],
  });

  const list = tokens.map(t => t.expoPushToken);

  if (list.length > 0) {
    await sendPushNotification(list, title, body, data);
  }

  await Notification.create({
    userId: userId,
    title,
    body,
    data,
  });
}

module.exports = { sendUserNotification };

