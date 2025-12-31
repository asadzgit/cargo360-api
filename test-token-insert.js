/**
 * Helper script to manually insert a device token for testing
 * 
 * Usage:
 * 1. Get your Expo push token from mobile app
 * 2. Get your JWT access token (from login)
 * 3. Run: node test-token-insert.js <accessToken> <expoPushToken>
 * 
 * Or modify the script below with your values and run: node test-token-insert.js
 */

const { DeviceToken } = require('./models');

async function insertToken(userId, expoPushToken) {
  try {
    console.log('Inserting token for user:', userId);
    console.log('Token preview:', expoPushToken.substring(0, 30) + '...');

    // Check if already exists
    const existing = await DeviceToken.findOne({
      where: {
        userId: userId,
        expoPushToken: expoPushToken
      }
    });

    if (existing) {
      console.log('Token already exists:', existing.id);
      return existing;
    }

    // Create new token
    const token = await DeviceToken.create({
      userId: userId,
      expoPushToken: expoPushToken
    });

    console.log('Token inserted successfully:', token.id);
    return token;
  } catch (error) {
    console.error('Error inserting token:', error);
    throw error;
  }
}

// Get values from command line or modify here
const userId = process.argv[2] || 172; // Your user ID
const expoPushToken = process.argv[3] || 'ExponentPushToken[YOUR_TOKEN_HERE]';

if (expoPushToken === 'ExponentPushToken[YOUR_TOKEN_HERE]') {
  console.error('Error: Please provide a real Expo push token');
  console.error('Usage: node test-token-insert.js <userId> <expoPushToken>');
  console.error('Example: node test-token-insert.js 172 ExponentPushToken[abc123...]');
  process.exit(1);
}

// Validate token format
if (!expoPushToken.startsWith('ExponentPushToken[')) {
  console.error('Error: Invalid token format. Must start with ExponentPushToken[');
  process.exit(1);
}

insertToken(userId, expoPushToken)
  .then(() => {
    console.log('Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Failed:', error);
    process.exit(1);
  });


