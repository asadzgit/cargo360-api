/**
 * Socket Notification Utility
 * Sends real-time notifications via WebSocket
 */

const { emitToUser } = require('../services/socketService');

/**
 * Send socket notification to user
 * @param {number} userId - User ID
 * @param {string} title - Notification title
 * @param {string} body - Notification body
 * @param {Object} data - Additional data
 */
function sendSocketNotification(userId, title, body, data = {}) {
  try {
    const notificationData = {
      title,
      body,
      data,
      timestamp: new Date().toISOString()
    };

    const sent = emitToUser(userId, 'notification', notificationData);
    
    if (sent) {
      console.log('[SOCKET-NOTIFY] Socket notification sent to user:', userId);
    } else {
      console.log('[SOCKET-NOTIFY] User not connected, notification not sent:', userId);
    }

    return sent;
  } catch (error) {
    console.error('[SOCKET-NOTIFY] Error sending socket notification:', error);
    return false;
  }
}

module.exports = { sendSocketNotification };

