const { DeviceToken } = require('../../models');
const { createError, ERROR_CODES } = require('../utils/errorHandler');

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

    res.status(201).json({ 
      success: true, 
      message: 'Device token registered successfully',
      deviceToken 
    });
  } catch (e) {
    if (e.name && e.name.startsWith('Sequelize')) {
      // Handle unique constraint violation (shouldn't happen due to check above, but just in case)
      if (e.name === 'SequelizeUniqueConstraintError') {
        return res.json({ 
          success: true, 
          message: 'Device token already registered' 
        });
      }
      return next(createError('Database error', ERROR_CODES.DATABASE_ERROR, 500));
    }
    next(e);
  }
};

