const bcrypt = require('bcryptjs');
const { Op } = require('sequelize');
const { updateMeSchema } = require('../validation/profile.schema');
const { User } = require('../../models');
const { sendUserNotification } = require('../helpers/notify');

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
      company: user.company,
      email: user.email,
      phone: user.phone,
      role: user.role,
      isApproved: user.isApproved,
      isEmailVerified: user.isEmailVerified
    };

    // Send push notification about profile update (non-blocking)
    try {
      await sendUserNotification(
        user.id,
        "Profile Updated",
        "Your profile has been updated successfully.",
        {
          type: 'profile_updated',
          userId: user.id
        }
      );
    } catch (notificationError) {
      console.error('Failed to send profile update notification:', notificationError);
      // Don't fail the request if notification fails
    }

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
    if (!phone) return next(Object.assign(new Error('Phone is required'), { status: 400 }));

    // Ensure caller is trucker/broker (role middleware also enforces)
    if (req.user?.role !== 'trucker' && req.user?.role !== 'admin') {
      return next(Object.assign(new Error('Forbidden'), { status: 403 }));
    }

    const { User, BrokerDriver } = require('../../models');
    
    // Normalize phone variants for lookup
    const normalizePhoneE164 = (pkPhone) => {
      const trimmed = (pkPhone || '').replace(/\s+/g, '');
      if (trimmed.startsWith('+')) return trimmed;
      if (/^0\d{10}$/.test(trimmed)) return '+92' + trimmed.slice(1);
      if (/^92\d{10}$/.test(trimmed)) return '+' + trimmed;
      return trimmed;
    };
    
    const pkPhoneVariants = (input) => {
      const pkCore = (msisdn) => {
        const raw = (msisdn || '').replace(/\s+/g, '').replace(/^\+/, '');
        if (/^92\d{10}$/.test(raw)) return raw.slice(2);
        if (/^0\d{10}$/.test(raw)) return raw.slice(1);
        if (/^3\d{9}$/.test(raw)) return raw;
        return raw;
      };
      const core = pkCore(input);
      if (!/^\d{10}$/.test(core)) {
        const trimmed = (input || '').replace(/\s+/g, '');
        return Array.from(new Set([trimmed, trimmed.replace(/^\+/, '')]));
      }
      return ['+92' + core, '92' + core, '0' + core];
    };

    const phoneNormalized = normalizePhoneE164(phone);
    const phoneVariants = pkPhoneVariants(phoneNormalized);

    // Check if driver already exists with this phone
    let driver = await User.findOne({ 
      where: { 
        phone: { [Op.in]: phoneVariants },
        role: 'driver'
      } 
    });

    if (driver) {
      // Driver exists - check if already linked to this broker
      const existingLink = await BrokerDriver.findOne({
        where: {
          brokerId: req.user.id,
          driverId: driver.id
        }
      });

      if (existingLink) {
        return res.status(200).json({ 
          success: true,
          driverId: driver.id, 
          message: 'Driver is already linked to your account',
          alreadyLinked: true
        });
      }

      // Link existing driver to this broker
      await BrokerDriver.create({
        brokerId: req.user.id,
        driverId: driver.id
      });

      return res.status(200).json({ 
        success: true,
        driverId: driver.id, 
        message: 'Driver linked to your account successfully',
        wasExisting: true
      });
    }

    // Driver doesn't exist - create new driver
    if (!name) return next(Object.assign(new Error('Name is required for new driver'), { status: 400 }));

    // Check if a trucker (broker) exists with this phone (not allowed)
    const truckerWithPhone = await User.findOne({
      where: {
        phone: { [Op.in]: phoneVariants },
        role: 'trucker'
      }
    });

    if (truckerWithPhone) {
      return next(Object.assign(
        new Error('This phone number is already used by a broker. Drivers and brokers cannot share phone numbers.'), 
        { status: 409 }
      ));
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const exp = new Date(Date.now() + 10 * 60 * 1000);
    driver = await User.create({
      name,
      phone: phoneNormalized,
      role: 'driver',
      brokerId: req.user.id, // Keep for backward compatibility
      isApproved: true,
      isPhoneVerified: false,
      otpCode: code,
      otpExpires: exp
    });

    // Create broker-driver relationship in junction table
    await BrokerDriver.create({
      brokerId: req.user.id,
      driverId: driver.id
    });

    console.log(`[SMS] OTP to ${phone}: ${code}`);
    res.status(201).json({ 
      success: true,
      driverId: driver.id, 
      nextStep: 'verify_otp', 
      message: 'Driver created and OTP sent',
      wasExisting: false
    });
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

    const { User, BrokerDriver } = require('../../models');
    const { Sequelize } = require('sequelize');
    
    const q = (req.query.q || '').trim();
    const limit = Math.min(parseInt(req.query.limit || '20', 10) || 20, 100);
    const offset = parseInt(req.query.offset || '0', 10) || 0;
    const ipvRaw = req.query.isPhoneVerified;
    const truthy = new Set(['true','1','on','yes',1,true]);
    const falsy = new Set(['false','0','off','no',0,false]);

    // Build where clause for User model
    const userWhere = { role: 'driver' };
    if (q) {
      userWhere[Op.or] = [
        { name: { [Op.iLike]: `%${q}%` } },
        { phone: { [Op.iLike]: `%${q}%` } }
      ];
    }
    if (ipvRaw !== undefined) {
      if (truthy.has(ipvRaw)) userWhere.isPhoneVerified = true;
      else if (falsy.has(ipvRaw)) userWhere.isPhoneVerified = false;
    }

    // Get drivers linked to this broker through BrokerDriver junction table
    const brokerDriverLinks = await BrokerDriver.findAll({
      where: { brokerId: req.user.id },
      include: [{
        model: User,
        as: 'Driver',
        where: userWhere,
        attributes: ['id','name','phone','role','isPhoneVerified','brokerId','createdAt']
      }],
      limit,
      offset,
      order: [[{ model: User, as: 'Driver' }, 'createdAt', 'DESC']]
    });

    // Count total drivers for this broker matching the criteria
    const count = await BrokerDriver.count({
      where: { brokerId: req.user.id },
      include: [{
        model: User,
        as: 'Driver',
        where: userWhere,
        attributes: []
      }]
    });

    // Extract driver data from the results
    const drivers = brokerDriverLinks.map(link => link.Driver);

    res.json({ success: true, data: { count, drivers } });
  } catch (e) { next(e); }
};