const { Expo } = require('expo-server-sdk');

const expo = new Expo();

async function sendPushNotification(tokens, title, body, data = {}) {
  console.log('[PUSH] Starting notification send:', {
    tokenCount: tokens.length,
    title,
    body,
    dataType: data.type || 'unknown'
  });

  if (!tokens || tokens.length === 0) {
    console.warn('[PUSH] No tokens provided');
    return { sent: 0, failed: 0, errors: [] };
  }

  // Filter valid Expo tokens
  const validTokens = tokens.filter(t => {
    const isValid = Expo.isExpoPushToken(t);
    if (!isValid) {
      console.warn('[PUSH] Invalid token format:', t?.substring(0, 20) + '...');
    }
    return isValid;
  });

  console.log('[PUSH] Valid tokens:', validTokens.length, 'out of', tokens.length);

  if (validTokens.length === 0) {
    console.error('[PUSH] No valid Expo push tokens found');
    return { sent: 0, failed: 0, errors: ['No valid tokens'] };
  }

  const messages = validTokens.map(token => ({
    to: token,
    sound: 'default',
    title,
    body,
    data,
  }));

  const chunks = expo.chunkPushNotifications(messages);
  console.log('[PUSH] Sending in', chunks.length, 'chunk(s)');

  let sent = 0;
  let failed = 0;
  const errors = [];

  for (const chunk of chunks) {
    try {
      const receipts = await expo.sendPushNotificationsAsync(chunk);
      console.log('[PUSH] Chunk sent, receipts:', receipts);
      
      // Check for errors in receipts
      receipts.forEach((receipt, index) => {
        if (receipt.status === 'error') {
          failed++;
          errors.push({
            token: chunk[index].to,
            error: receipt.message || 'Unknown error',
            details: receipt.details
          });
          console.error('[PUSH] Error for token:', {
            token: chunk[index].to?.substring(0, 20) + '...',
            error: receipt.message,
            details: receipt.details
          });
        } else if (receipt.status === 'ok') {
          sent++;
        }
      });
    } catch (err) {
      failed += chunk.length;
      errors.push({
        error: err.message,
        stack: err.stack
      });
      console.error('[PUSH] Chunk send error:', {
        message: err.message,
        stack: err.stack,
        chunkSize: chunk.length
      });
    }
  }

  console.log('[PUSH] Notification send complete:', { sent, failed, errors: errors.length });
  return { sent, failed, errors };
}

module.exports = { sendPushNotification };

