const bcrypt = require('bcryptjs');
const { Op } = require('sequelize');
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

// DELETE /users/me
exports.deleteMe = async (req, res, next) => {
  try {
    const password = req.query.password || req.body?.password;
    if (!password) {
      return next(Object.assign(new Error('Password is required'), { status: 400 }));
    }

    const user = await User.findByPk(req.user.id);
    if (!user) return next(Object.assign(new Error('User not found'), { status: 404 }));

    const ok = await bcrypt.compare(password, user.passwordHash || '');
    if (!ok) return next(Object.assign(new Error('Password is incorrect'), { status: 400 }));

    await user.destroy();

    // Optionally, you can clear auth info client-side; JWTs are stateless
    res.status(200).json({ success: true, message: 'Account deleted successfully' });
  } catch (e) {
    next(e);
  }
};

// POST /users/drivers (broker-only)
exports.addDriver = async (req, res, next) => {
  try {
    const { name, phone } = req.body || {};
    if (!name || !phone) return next(Object.assign(new Error('Name and phone are required'), { status: 400 }));

    // Ensure caller is trucker/broker (role middleware also enforces)
    if (req.user?.role !== 'trucker' && req.user?.role !== 'admin') {
      return next(Object.assign(new Error('Forbidden'), { status: 403 }));
    }

    // Check if phone exists
    const existing = await require('../../models').User.findOne({ where: { phone } });
    if (existing) return next(Object.assign(new Error('An account with this phone number already exists'), { status: 409 }));

    // Create driver linked to broker
    const { User } = require('../../models');
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const exp = new Date(Date.now() + 10 * 60 * 1000);
    const driver = await User.create({
      name,
      phone,
      role: 'driver',
      brokerId: req.user.id,
      isApproved: true,
      isPhoneVerified: false,
      otpCode: code,
      otpExpires: exp
    });

    console.log(`[SMS] OTP to ${phone}: ${code}`);
    res.status(201).json({ driverId: driver.id, nextStep: 'verify_otp', message: 'OTP sent to driver' });
  } catch (e) {
    next(e);
  }
};

// GET /users/drivers (broker-only) - list drivers linked to this broker
exports.listDrivers = async (req, res, next) => {
  try {
    // Role already enforced by middleware; double-check for safety
    if (req.user?.role !== 'trucker' && req.user?.role !== 'admin') {
      return next(Object.assign(new Error('Forbidden'), { status: 403 }));
    }

    const q = (req.query.q || '').trim();
    const limit = Math.min(parseInt(req.query.limit || '20', 10) || 20, 100);
    const offset = parseInt(req.query.offset || '0', 10) || 0;
    const ipvRaw = req.query.isPhoneVerified;
    const truthy = new Set(['true','1','on','yes',1,true]);
    const falsy = new Set(['false','0','off','no',0,false]);

    const where = { brokerId: req.user.id, role: 'driver' };
    if (q) {
      where[Op.or] = [
        { name: { [Op.iLike]: `%${q}%` } },
        { phone: { [Op.iLike]: `%${q}%` } }
      ];
    }
    if (ipvRaw !== undefined) {
      if (truthy.has(ipvRaw)) where.isPhoneVerified = true;
      else if (falsy.has(ipvRaw)) where.isPhoneVerified = false;
    }

    const { rows, count } = await User.findAndCountAll({
      where,
      attributes: ['id','name','phone','role','isPhoneVerified','brokerId','createdAt'],
      limit,
      offset,
      order: [['createdAt','DESC']]
    });

    res.json({ success: true, data: { count, drivers: rows } });
  } catch (e) { next(e); }
};