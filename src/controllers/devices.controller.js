const { DeviceToken, User } = require('../../models');
const { createError, ERROR_CODES } = require('../utils/errorHandler');
const { sendUserNotification } = require('../helpers/notify');

// POST /devices/register
exports.register = async (req, res, next) => {
  try {
    const { token } = req.body;

    if (!token || typeof token !== 'string') {
      return next(createError('Token is required', ERROR_CODES.MISSING_FIELD, 400));
    }

    const userId = req.user.id;

    // Check if token already exists for this user
    const existing = await DeviceToken.findOne({
      where: {
        userId: userId,
        expoPushToken: token
      }
    });

    if (existing) {
      return res.json({ 
        success: true, 
        message: 'Device token already registered',
        deviceToken: existing 
      });
    }

    // Create new device token
    const deviceToken = await DeviceToken.create({
      userId: userId,
      expoPushToken: token
    });

    console.log('[DEVICE] Token registered:', {
      userId: userId,
      tokenId: deviceToken.id,
      tokenPreview: token.substring(0, 30) + '...'
    });

    res.status(201).json({ 
      success: true, 
      message: 'Device token registered successfully',
      deviceToken 
    });
  } catch (e) {
    if (e.name && e.name.startsWith('Sequelize')) {
      // Handle unique constraint violation (shouldn't happen due to check above, but just in case)
      if (e.name === 'SequelizeUniqueConstraintError') {
        console.log('[DEVICE] Token already exists for user:', userId);
        return res.json({ 
          success: true, 
          message: 'Device token already registered' 
        });
      }
      console.error('[DEVICE] Database error:', e);
      return next(createError('Database error', ERROR_CODES.DATABASE_ERROR, 500));
    }
    console.error('[DEVICE] Unexpected error:', e);
    next(e);
  }
};

// GET /devices/test-notification - Test notification endpoint
exports.testNotification = async (req, res, next) => {
  try {
    const userId = req.user.id;
    
    console.log('[TEST] Testing notification for user:', userId);
    
    // Check if user has device tokens
    const tokens = await DeviceToken.findAll({
      where: { userId: userId },
      attributes: ['id', 'expoPushToken', 'createdAt'],
    });

    console.log('[TEST] Found device tokens:', tokens.length);

    if (tokens.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No device tokens registered. Please register a device token first.',
        tokens: []
      });
    }

    // Send test notification
    const result = await sendUserNotification(
      userId,
      "Test Notification",
      "This is a test notification to verify push notifications are working.",
      {
        type: 'test',
        timestamp: new Date().toISOString()
      }
    );

    res.json({
      success: true,
      message: 'Test notification sent',
      data: {
        tokensCount: tokens.length,
        tokens: tokens.map(t => ({
          id: t.id,
          tokenPreview: t.expoPushToken.substring(0, 30) + '...',
          createdAt: t.createdAt
        })),
        notificationResult: result
      }
    });
  } catch (e) {
    console.error('[TEST] Error sending test notification:', e);
    next(e);
  }
};

// GET /devices/my-tokens - List user's device tokens
exports.listMyTokens = async (req, res, next) => {
  try {
    const userId = req.user.id;
    
    console.log('[DEVICE] Listing tokens for user:', userId);
    
    const tokens = await DeviceToken.findAll({
      where: { userId: userId },
      attributes: ['id', 'expoPushToken', 'createdAt', 'updatedAt'],
      order: [['createdAt', 'DESC']]
    });

    console.log('[DEVICE] Found tokens:', tokens.length);

    res.json({
      success: true,
      data: {
        count: tokens.length,
        tokens: tokens.map(t => ({
          id: t.id,
          tokenPreview: t.expoPushToken.substring(0, 30) + '...',
          fullToken: t.expoPushToken, // Include full token for debugging
          createdAt: t.createdAt,
          updatedAt: t.updatedAt
        })),
        message: tokens.length === 0 
          ? 'No device tokens registered. Please register a token from your mobile app using POST /devices/register'
          : `${tokens.length} device token(s) registered`
      }
    });
  } catch (e) {
    console.error('[DEVICE] Error listing tokens:', e);
    next(e);
  }
};

