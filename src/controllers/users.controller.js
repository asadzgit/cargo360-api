const bcrypt = require('bcryptjs');
const { updateMeSchema } = require('../validation/profile.schema');
const { User } = require('../../models');

// PATCH /users/me
exports.updateMe = async (req, res, next) => {
  try {
    const data = await updateMeSchema.validateAsync(req.body, { stripUnknown: true });

    const user = await User.findByPk(req.user.id);
    if (!user) return next(Object.assign(new Error('User not found'), { status: 404 }));

    // Handle password change if requested
    if (data.currentPassword && data.newPassword) {
      const ok = await bcrypt.compare(data.currentPassword, user.passwordHash || '');
      if (!ok) return next(Object.assign(new Error('Current password is incorrect'), { status: 400 }));
      const newHash = await bcrypt.hash(data.newPassword, 10);
      await user.update({ passwordHash: newHash });
    }

    // Update profile fields if provided
    const patch = {};
    if (typeof data.name === 'string') patch.name = data.name;
    if (typeof data.phone === 'string') patch.phone = data.phone;

    if (Object.keys(patch).length > 0) {
      await user.update(patch);
    }

    const result = {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      isApproved: user.isApproved,
      isEmailVerified: user.isEmailVerified
    };

    res.json({ success: true, message: 'Profile updated successfully', user: result });
  } catch (e) {
    if (e.isJoi) {
      return next(Object.assign(new Error(e.details?.[0]?.message || 'Invalid data'), { status: 400 }));
    }
    next(e);
  }
};
