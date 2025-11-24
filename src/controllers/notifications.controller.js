const { Notification } = require('../../models');
const { createError, ERROR_CODES } = require('../utils/errorHandler');

// GET /notifications
exports.list = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const limit = Math.min(parseInt(req.query.limit || '50', 10) || 50, 100);
    const offset = parseInt(req.query.offset || '0', 10) || 0;
    const isRead = req.query.is_read;

    const where = { userId: userId };
    
    if (isRead !== undefined) {
      where.isRead = isRead === 'true' || isRead === true;
    }

    const notifications = await Notification.findAll({
      where,
      limit,
      offset,
      order: [['createdAt', 'DESC']]
    });

    const count = await Notification.count({ where });

    res.json({
      success: true,
      data: {
        notifications,
        count,
        limit,
        offset
      }
    });
  } catch (e) {
    next(e);
  }
};

// PUT /notifications/:id/read
exports.markAsRead = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const notificationId = parseInt(req.params.id, 10);

    if (isNaN(notificationId)) {
      return next(createError('Invalid notification ID', ERROR_CODES.INVALID_INPUT, 400));
    }

    const notification = await Notification.findOne({
      where: {
        id: notificationId,
        userId: userId
      }
    });

    if (!notification) {
      return next(createError('Notification not found', ERROR_CODES.NOT_FOUND, 404));
    }

    await notification.update({ isRead: true });

    res.json({
      success: true,
      message: 'Notification marked as read',
      notification
    });
  } catch (e) {
    next(e);
  }
};

