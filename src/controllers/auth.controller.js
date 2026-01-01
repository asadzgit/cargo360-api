const { execFile } = require('child_process');
const bcrypt = require('bcryptjs');
const axios = require('axios');
const jwt = require('jsonwebtoken');
const { Op } = require('sequelize');
const { signupSchema, loginSchema, forgotPasswordSchema, resetPasswordSchema, phoneCheckSchema, phoneSignupSchema, verifyOtpSchema, setPinSchema, phoneLoginSchema, resendOtpSchema } = require('../validation/auth.schema');

const { jwt: jwtCfg } = require('../../config/env');
const { User, sequelize } = require('../../models/index');
const { generateToken, sendPasswordResetEmail, sendVerificationEmail } = require('../utils/emailService');
const { addEmailConfirmationJob } = require('../bullmq/email.queue');
const { ERROR_CODES, createError, handleJoiError, handleSequelizeError } = require('../utils/errorHandler');

function normalizeToGateway(pkPhone) {
  const trimmed = (pkPhone || '').replace(/\s+/g, '');
  if (/^\+92\d{10}$/.test(trimmed)) return trimmed.slice(1);   // +92312... -> 92312...
  if (/^0\d{10}$/.test(trimmed)) return '92' + trimmed.slice(1); // 03... -> 92...
  if (/^92\d{10}$/.test(trimmed)) return trimmed;               // already correct
  return trimmed; // fallback
}

// Put near other helpers
function normalizePhoneE164(pkPhone) {
  // Accept inputs like 0312..., 92312..., +92312...
  const trimmed = (pkPhone || '').replace(/\s+/g, '');
  if (trimmed.startsWith('+')) return trimmed;
  if (/^0\d{10}$/.test(trimmed)) {
    // 03123456789 -> +923123456789
    return '+92' + trimmed.slice(1);
  }
  if (/^92\d{10}$/.test(trimmed)) {
    // 923123456789 -> +923123456789
    return '+' + trimmed;
  }
  // Fallback: return as-is; log to help debug
  return trimmed;
}


// Core extractor and variants for Pakistan MSISDNs
function pkCore(msisdn) {
  const raw = (msisdn || '').replace(/\s+/g, '').replace(/^\+/, '');
  if (/^92\d{10}$/.test(raw)) return raw.slice(2);     // 923XXXXXXXXX -> 3XXXXXXXXX
  if (/^0\d{10}$/.test(raw)) return raw.slice(1);      // 03XXXXXXXXX  -> 3XXXXXXXXX
  if (/^3\d{9}$/.test(raw)) return raw;                // 3XXXXXXXXX    -> 3XXXXXXXXX
  return raw; // fallback (non-PK or unexpected)
}

function pkPhoneVariants(input) {
  const core = pkCore(input);
  if (!/^\d{10}$/.test(core)) {
    // If not a 10-digit core, still return trimmed + raw as best-effort
    const trimmed = (input || '').replace(/\s+/g, '');
    return Array.from(new Set([trimmed, trimmed.replace(/^\+/, '')]));
  }
  return [
    '+92' + core,  // E.164
    '92' + core,   // Gateway numeric
    '0' + core     // Local format
  ];
}

const signTokens = (user) => {
  const payload = { id: user.id, role: user.role };
  const accessToken = jwt.sign(payload, jwtCfg.accessSecret, { expiresIn: jwtCfg.accessExpires });
  const refreshToken = jwt.sign(payload, jwtCfg.refreshSecret, { expiresIn: jwtCfg.refreshExpires });
  return { accessToken, refreshToken };
};

exports.signup = async (req, res, next) => {
  try {
    const data = await signupSchema.validateAsync(req.body, { stripUnknown: true });
    
    // Normalize email to lowercase for case-insensitive handling
    const normalizedEmail = (data.email || '').toLowerCase().trim();
    
    // Check for existing email (case-insensitive)
    const emailExists = await User.findOne({ 
      where: sequelize.where(
        sequelize.fn('LOWER', sequelize.col('email')),
        normalizedEmail
      )
    });
    if (emailExists) return next(createError('An account with this email already exists', ERROR_CODES.EMAIL_ALREADY_EXISTS, 409));
    
    // Normalize phone and check for existing within the same role
    const normalizedPhone = data.phone ? normalizePhoneE164(data.phone) : null;
    if (normalizedPhone) {
      const variants = pkPhoneVariants(normalizedPhone);
      
      // Check if phone exists for the same role
      const phoneExists = await User.findOne({ 
        where: { 
          phone: { [Op.in]: variants }, 
          role: data.role 
        } 
      });
      if (phoneExists) {
        return next(createError(`An account with this phone number already exists for role: ${data.role}`, ERROR_CODES.PHONE_ALREADY_EXISTS, 409));
      }

      // Additional check: driver and trucker cannot share phone numbers
      if (data.role === 'trucker') {
        const driverWithPhone = await User.findOne({ 
          where: { 
            phone: { [Op.in]: variants }, 
            role: 'driver' 
          } 
        });
        if (driverWithPhone) {
          return next(createError('This phone number is already used by a driver. Drivers and brokers cannot share phone numbers.', ERROR_CODES.PHONE_ALREADY_EXISTS, 409));
        }
      } else if (data.role === 'driver') {
        const truckerWithPhone = await User.findOne({ 
          where: { 
            phone: { [Op.in]: variants }, 
            role: 'trucker' 
          } 
        });
        if (truckerWithPhone) {
          return next(createError('This phone number is already used by a broker. Drivers and brokers cannot share phone numbers.', ERROR_CODES.PHONE_ALREADY_EXISTS, 409));
        }
      }
    }

    const passwordHash = await bcrypt.hash(data.password, 10);
    const role = data.role; // 'customer' | 'trucker' (admin seeded only)
    const isApproved = role === 'trucker' ? false : true;

    // Generate email verification token
    const emailVerificationToken = generateToken();
    const emailVerificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    const user = await User.create({
      name: data.name,
      company: data.company || null,
      email: normalizedEmail, // Save email in lowercase
      phone: normalizedPhone,
      passwordHash,
      role,
      isApproved,
      isEmailVerified: false,
      emailVerificationToken,
      emailVerificationExpires,
      hasSignedUp: role === 'driver' ? true : false // Set to true for drivers who sign up
    });

    // Add email confirmation job to BullMQ queue (non-blocking)
    try {
      await addEmailConfirmationJob({
        email: user.email,
        token: emailVerificationToken,
        name: user.name,
      });
      console.log(`[Signup] Email confirmation job added to queue for user: ${user.email}`);
    } catch (queueError) {
      console.error('[Signup] Failed to add email confirmation job to queue:', queueError);
      // Don't fail the signup if queue fails, but log it
      // The email can be resent later via resend verification endpoint
    }

    // Respond immediately without waiting for email to send
    // Don't return tokens until email is verified
    res.status(201).json({ 
      message: 'Account created successfully. Please check your email to verify your account.',
      user: { id: user.id, name: user.name, company: user.company, role: user.role, isApproved: user.isApproved, isEmailVerified: user.isEmailVerified }
    });
  } catch (e) { 
    if (e.isJoi) {
      return next(handleJoiError(e));
    }
    if (e.name && e.name.startsWith('Sequelize')) {
      return next(handleSequelizeError(e));
    }
    next(e); 
  }
};

exports.login = async (req, res, next) => {
  try {
    const data = await loginSchema.validateAsync(req.body, { stripUnknown: true });
    // Convert email to lowercase for case-insensitive login
    const normalizedEmail = (data.email || '').toLowerCase().trim();
    // Use case-insensitive query to handle existing data with mixed case
    const user = await User.findOne({ 
      where: sequelize.where(
        sequelize.fn('LOWER', sequelize.col('email')),
        normalizedEmail
      )
    });
    if (!user) return next(createError('Invalid email or password', ERROR_CODES.INVALID_CREDENTIALS, 401));
    const ok = await bcrypt.compare(data.password, user.passwordHash);
    if (!ok) return next(createError('Invalid email or password', ERROR_CODES.INVALID_CREDENTIALS, 401));
    
    // Check if email is verified
    if (!user.isEmailVerified) {
      return next(createError('Please verify your email address before logging in. Check your inbox for the verification link.', ERROR_CODES.EMAIL_NOT_VERIFIED, 403));
    }
    
    if (user.role === 'trucker' && !user.isApproved) {
      return next(createError('Your trucker account is pending admin approval. Please wait for approval before logging in.', ERROR_CODES.ACCOUNT_NOT_APPROVED, 403));
    }
    const tokens = signTokens(user);
    res.json({ user: { id: user.id, name: user.name, company: user.company, role: user.role, isApproved: user.isApproved, isEmailVerified: user.isEmailVerified }, ...tokens });
  } catch (e) { 
    if (e.isJoi) {
      return next(handleJoiError(e));
    }
    if (e.name && e.name.startsWith('Sequelize')) {
      return next(handleSequelizeError(e));
    }
    next(e); 
  }
};

exports.me = async (req, res, next) => {
  try {
    const user = await User.findByPk(req.user.id, { 
      attributes: ['id','name','company','email','phone','role','isApproved','isEmailVerified','cnic','license','vehicleRegistration'] 
    });
    res.json({ user });
  } catch (e) { 
    if (e.isJoi) {
      return next(handleJoiError(e));
    }
    if (e.name && e.name.startsWith('Sequelize')) {
      return next(handleSequelizeError(e));
    }
    next(e); 
  }
};

exports.refresh = async (req, res, next) => {
  try {
    const { refreshToken } = req.body || {};
    if (!refreshToken) return next(createError('Refresh token is required', ERROR_CODES.MISSING_FIELD, 400));
    const payload = jwt.verify(refreshToken, jwtCfg.refreshSecret);
    const user = await User.findByPk(payload.id);
    if (!user) return next(createError('User not found', ERROR_CODES.USER_NOT_FOUND, 404));
    const tokens = ((u)=> {
      const p = { id: u.id, role: u.role };
      return {
        accessToken: jwt.sign(p, jwtCfg.accessSecret, { expiresIn: jwtCfg.accessExpires }),
        refreshToken: jwt.sign(p, jwtCfg.refreshSecret, { expiresIn: jwtCfg.refreshExpires })
      };
    })(user);
    res.json(tokens);
  } catch (e) { 
    if (e.isJoi) {
      return next(handleJoiError(e));
    }
    if (e.name && e.name.startsWith('Sequelize')) {
      return next(handleSequelizeError(e));
    }
    next(e); 
  }
};

// Email verification endpoint
// GET /api/auth/verify-email?token=TOKEN
exports.verifyEmail = async (req, res, next) => {
  try {
    const { token } = req.query;
    
    // Validate token
    if (!token) {
      return next(createError('Verification token is required', ERROR_CODES.MISSING_FIELD, 400));
    }

    // Find user with valid token
    const user = await User.findOne({
      where: {
        emailVerificationToken: token,
        emailVerificationExpires: { [Op.gt]: new Date() }
      }
    });

    if (!user) {
      return next(createError('Invalid or expired verification token', ERROR_CODES.INVALID_TOKEN, 400));
    }

    // Update user as verified and remove verification token
    await user.update({
      isEmailVerified: true,
      emailVerificationToken: null,
      emailVerificationExpires: null
    });

    // Return success response
    res.json({
      success: true,
      message: 'Email verified successfully',
      user: {
        id: user.id,
        email: user.email,
        isEmailVerified: true
      }
    });
  } catch (e) {
    if (e.isJoi) {
      return next(handleJoiError(e));
    }
    if (e.name && e.name.startsWith('Sequelize')) {
      return next(handleSequelizeError(e));
    }
    next(e);
  }
};

// Resend verification email
exports.resendVerification = async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) return next(createError('Email address is required', ERROR_CODES.MISSING_FIELD, 400));

    // Normalize email to lowercase for case-insensitive lookup
    const normalizedEmail = (email || '').toLowerCase().trim();
    const user = await User.findOne({ 
      where: sequelize.where(
        sequelize.fn('LOWER', sequelize.col('email')),
        normalizedEmail
      )
    });
    if (!user) return next(createError('No account found with this email address', ERROR_CODES.USER_NOT_FOUND, 404));

    if (user.isEmailVerified) {
      return next(createError('This email address is already verified', ERROR_CODES.EMAIL_ALREADY_VERIFIED, 400));
    }

    // Generate new verification token
    const emailVerificationToken = generateToken();
    const emailVerificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    await user.update({
      emailVerificationToken,
      emailVerificationExpires
    });

    // Send verification email
    try {
      await sendVerificationEmail(user, emailVerificationToken);
      res.json({ message: 'Verification email sent successfully' });
    } catch (emailError) {
      console.error('Failed to send verification email:', emailError);
      return next(createError('Failed to send verification email. Please try again later.', ERROR_CODES.EMAIL_SEND_FAILED, 500));
    }
  } catch (e) { 
    if (e.isJoi) {
      return next(handleJoiError(e));
    }
    if (e.name && e.name.startsWith('Sequelize')) {
      return next(handleSequelizeError(e));
    }
    next(e); 
  }
};

// Forgot password endpoint
exports.forgotPassword = async (req, res, next) => {
  try {
    const data = await forgotPasswordSchema.validateAsync(req.body, { stripUnknown: true });
    const { email } = data;

    // Normalize email to lowercase for case-insensitive lookup
    const normalizedEmail = (email || '').toLowerCase().trim();
    const user = await User.findOne({ 
      where: sequelize.where(
        sequelize.fn('LOWER', sequelize.col('email')),
        normalizedEmail
      )
    });
    if (!user) {
      // Don't reveal if user exists or not for security
      return res.json({ message: 'If an account with that email exists, a password reset link has been sent.' });
    }

    // Generate 6-digit password reset code
    const passwordResetCode = Math.floor(100000 + Math.random() * 900000).toString();
    const passwordResetExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    await user.update({
      passwordResetToken: passwordResetCode, // Reusing existing field for code
      passwordResetExpires
    });

    // Send password reset email with code
    try {
      await sendPasswordResetEmail(user, passwordResetCode);
    } catch (emailError) {
      console.error('Failed to send password reset email:', emailError);
      // Continue anyway for security - don't reveal if email failed
    }

    res.json({ message: 'If an account with that email exists, a 6-digit confirmation code has been sent.' });
  } catch (e) { 
    if (e.isJoi) {
      return next(handleJoiError(e));
    }
    if (e.name && e.name.startsWith('Sequelize')) {
      return next(handleSequelizeError(e));
    }
    next(e); 
  }
};

// Reset password endpoint
exports.resetPassword = async (req, res, next) => {
  console.log(req.body);
  try {
    const data = await resetPasswordSchema.validateAsync(req.body, { stripUnknown: true });
    const { code, password } = data;

    const user = await User.findOne({
      where: {
        passwordResetToken: code,
        passwordResetExpires: { [Op.gt]: new Date() }
      }
    });

    if (!user) {
      return next(createError('Invalid or expired confirmation code. Please request a new password reset.', ERROR_CODES.INVALID_TOKEN, 400));
    }

    // Hash new password
    const passwordHash = await bcrypt.hash(password, 10);

    // Update user password and clear reset token
    await user.update({
      passwordHash,
      passwordResetToken: null,
      passwordResetExpires: null
    });

    res.json({ message: 'Password reset successfully' });
  } catch (e) { 
    if (e.isJoi) {
      return next(handleJoiError(e));
    }
    if (e.name && e.name.startsWith('Sequelize')) {
      return next(handleSequelizeError(e));
    }
    next(e); 
  }
};

// --- Deletion link flow (token -> cookie -> delete) ---
// In-memory single-use JTI tracker (per-process)
const usedDeletionJtis = new Map(); // jti -> expiry timestamp (ms)
function markJtiUsed(jti, ttlMs) { usedDeletionJtis.set(jti, Date.now() + ttlMs); }
function isJtiUsed(jti) {
  const exp = usedDeletionJtis.get(jti);
  if (!exp) return false;
  if (Date.now() > exp) { usedDeletionJtis.delete(jti); return false; }
  return true;
}
setInterval(() => {
  const now = Date.now();
  for (const [jti, exp] of usedDeletionJtis.entries()) if (now > exp) usedDeletionJtis.delete(jti);
}, 60_000).unref?.();

// POST /auth/deletion-link (auth required)
exports.getDeletionLink = async (req, res, next) => {
  try {
    const userId = req.user?.id;
    if (!userId) return next(createError('Unauthorized', ERROR_CODES.UNAUTHORIZED, 401));
    const crypto = require('crypto');
    const jti = (crypto.randomUUID?.() || crypto.randomBytes(16).toString('hex'));
    const ttlSec = 10 * 60; // 10 minutes
    const token = jwt.sign({ sub: String(userId), scope: 'delete_account', jti }, jwtCfg.accessSecret, { expiresIn: ttlSec });
    const frontendBase = process.env.CLIENT_DELETE_BASE_URL || 'https://cargo360pk.com/delete-mobile-account';
    const url = `${frontendBase}#token=${token}`;
    res.json({ token, url, expiresIn: ttlSec });
  } catch (e) { next(e); }
};

// POST /auth/deletion/validate  Body: { token }
exports.validateDeletion = async (req, res, next) => {
  try {
    const { token } = req.body || {};
    const secure = process.env.NODE_ENV === 'production';
    const sameSite = process.env.CROSS_SITE_COOKIE === '1' ? 'none' : 'lax';
    if (!token) return next(createError('Token is required', ERROR_CODES.MISSING_FIELD, 400));
    let payload;
    try { payload = jwt.verify(token, jwtCfg.accessSecret); }
    catch { return next(createError('Invalid or expired token', ERROR_CODES.INVALID_TOKEN, 401)); }
    if (payload.scope !== 'delete_account' || !payload.sub || !payload.jti) return next(createError('Invalid token', ERROR_CODES.INVALID_TOKEN, 401));
    if (isJtiUsed(payload.jti)) return next(createError('Token already used', ERROR_CODES.INVALID_TOKEN, 401));
    const remainingMs = payload.exp * 1000 - Date.now();
    if (remainingMs <= 0) return next(createError('Token expired', ERROR_CODES.TOKEN_EXPIRED, 401));
    markJtiUsed(payload.jti, remainingMs);

    const delSessTtlSec = Math.min(Math.floor(remainingMs / 1000), 10 * 60);
    const delSess = jwt.sign({ sub: String(payload.sub), scope: 'deletion_session' }, jwtCfg.accessSecret, { expiresIn: delSessTtlSec });
    res.cookie('del_sess', delSess,
       { httpOnly: true,
          secure: sameSite === 'none' ? true : secure,
         sameSite: 'lax', maxAge: delSessTtlSec * 1000, path: '/' });
    res.status(204).send();
  } catch (e) { next(e); }
};

// POST /auth/deletion/confirm  Body: { password, token? } or Authorization: Bearer <token>
exports.confirmDeletion = async (req, res, next) => {
  try {
    const password = req.body?.password;
    if (!password) {
      return next(createError('Password is required', ERROR_CODES.MISSING_FIELD, 400));
    }

    // Read the one-time deletion token directly from body or Authorization header
    const bodyToken = req.body?.token;
    const authHeader = req.headers.authorization || '';
    const bearer = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : undefined;
    const rawToken = bodyToken || bearer;
    if (!rawToken) {
      return next(createError('Deletion token is required', ERROR_CODES.MISSING_FIELD, 400));
    }

    // Verify and enforce scope + single-use (JTI)
    let payload;
    try { payload = jwt.verify(rawToken, jwtCfg.accessSecret); }
    catch { return next(createError('Invalid or expired token', ERROR_CODES.INVALID_TOKEN, 401)); }

    if (!payload.sub || payload.scope !== 'delete_account' || !payload.jti) {
      return next(createError('Invalid token', ERROR_CODES.INVALID_TOKEN, 401));
    }

    //  TODO: Uncomment and fix me afterwards
    // Single-use check
    // if (isJtiUsed(payload.jti)) {
    //   return next(createError('Token already used', ERROR_CODES.INVALID_TOKEN, 401));
    // }
    const remainingMs = (payload.exp * 1000) - Date.now();
    if (remainingMs <= 0) {
      return next(createError('Token expired', ERROR_CODES.TOKEN_EXPIRED, 401));
    }
    markJtiUsed(payload.jti, remainingMs);

    // Verify password and delete
    const user = await User.findByPk(payload.sub);
    if (!user) return next(createError('User not found', ERROR_CODES.USER_NOT_FOUND, 404));

    const ok = await bcrypt.compare(password, user.passwordHash || '');
    if (!ok) return next(createError('Password is incorrect', ERROR_CODES.INVALID_CREDENTIALS, 401));

    await user.destroy();

    res.json({ success: true, message: 'Account deleted successfully' });
  } catch (e) { next(e); }
};

// ---------------- Phone-based OTP/PIN flow ----------------
function genOtp() { 
  return Math.floor(100000 + Math.random() * 900000).toString(); 
}

async function sendOtpSms(phone, code) {
  const url = process.env.SMS_GATEWAY_URL || 'https://secure.h3techs.com/sms/api/send';
  const email = process.env.SMS_GATEWAY_EMAIL || 'asadmahmood41999@gmail.com';
  const key   = process.env.SMS_GATEWAY_KEY   || '104c92c66802b374db7787ecfd4e27ec09';
  // Use the exact approved mask that works in your curl; change if needed
  const mask  = process.env.SMS_SENDER_MASK   || 'H3 TEST SMS';
  const to    = normalizeToGateway(phone);
  const message = `Cargo360 verification code: ${code}. Expires in 5 minutes. Do not share this code with anyone.`;

  console.log('[OTP] curl sending', { to, mask, url });

  const args = [
    '-sS',
    '-X', 'POST', url,
    '-d', `email=${email}`,
    '-d', `key=${key}`,
    '-d', `mask=${encodeURIComponent(mask)}`,   // curl handles encoding; safe to pre-encode spaces
    '-d', `to=${to}`,
    '-d', `message=${encodeURIComponent(message)}`
  ];

  const stdout = await new Promise((resolve, reject) => {
    execFile('curl', args, { timeout: 15000 }, (error, out, err) => {
      if (error) {
        console.error('[OTP] curl error', { code: error.code, message: error.message, stderr: err });
        return reject(error);
      }
      if (err) console.warn('[OTP] curl stderr', err);
      console.log('[OTP] curl stdout', out);
      resolve(out);
    });
  });

  // Provider usually returns JSON with { sms: { code: '000', response: 'Message Queued Successfully', ... } }
  try {
    const parsed = JSON.parse(stdout);
    console.log(`parsed response: ${parsed}`);
    
    const sms = parsed.sms || parsed;
    if (!(sms.code === '000' && /Queued/i.test(sms.response))) {
      throw new Error(`OTP SMS failed: ${sms.code} ${sms.response}`);
    }
  } catch (e) {
    // If body isn’t JSON, rely on stdout logs; only throw if this was a JSON parse error AND body contained obvious error text
    if (e.name !== 'SyntaxError') throw e;
  }
}

// POST /auth/phone/check
exports.phoneCheck = async (req, res, next) => {
  try {
    const data = await phoneCheckSchema.validateAsync(req.body, { stripUnknown: true });
    const { phone: inputPhone, role } = data;
    const variants = pkPhoneVariants(inputPhone);
    const user = await User.findOne({ where: { phone: { [Op.in]: variants }, role: role } });

    if (!user) {
      return res.json({ exists: false, nextStep: 'signup_required' });
    }

    if (!user.isPhoneVerified) {
      const code = genOtp();
      const exp = new Date(Date.now() + 10 * 60 * 1000);
      await user.update({ otpCode: code, otpExpires: exp });
      await sendOtpSms(user.phone, code);
      return res.json({
        exists: true,
        userId: user.id,
        isPhoneVerified: false,
        hasPin: !!user.passwordHash,
        nextStep: 'verify_otp',
        message: 'OTP sent'
      });
    }

    const hasPin = !!user.passwordHash;
    return res.json({
      exists: true,
      userId: user.id,
      isPhoneVerified: true,
      hasPin,
      nextStep: hasPin ? 'enter_pin' : 'set_pin'
    });
  } catch (e) {
    if (e.isJoi) return next(handleJoiError(e));
    next(e);
  }
};

// POST /auth/phone/signup
exports.phoneSignup = async (req, res, next) => {
  try {
    const data = await phoneSignupSchema.validateAsync(req.body, { stripUnknown: true });
    const { name, phone, role } = data;
    const phoneNormalized = normalizePhoneE164(phone);

    if (!(role === 'trucker' || role === 'driver')) {
      return next(createError('Invalid role', ERROR_CODES.INVALID_ROLE, 400));
    }

    const variants = pkPhoneVariants(phoneNormalized);

    // Check if phone exists for the same role
    const exists = await User.findOne({ 
      where: { 
        phone: { [Op.in]: variants }, 
        role: role 
      } 
    });
    if (exists) {
      return next(createError(`An account with this phone number already exists for role: ${role}`, ERROR_CODES.PHONE_ALREADY_EXISTS, 409));
    }

    // Additional check: driver and trucker cannot share phone numbers
    if (role === 'trucker') {
      const driverWithPhone = await User.findOne({ 
        where: { 
          phone: { [Op.in]: variants }, 
          role: 'driver' 
        } 
      });
      if (driverWithPhone) {
        return next(createError('This phone number is already used by a driver. Drivers and brokers cannot share phone numbers.', ERROR_CODES.PHONE_ALREADY_EXISTS, 409));
      }
    } else if (role === 'driver') {
      const truckerWithPhone = await User.findOne({ 
        where: { 
          phone: { [Op.in]: variants }, 
          role: 'trucker' 
        } 
      });
      if (truckerWithPhone) {
        return next(createError('This phone number is already used by a broker. Drivers and brokers cannot share phone numbers.', ERROR_CODES.PHONE_ALREADY_EXISTS, 409));
      }
    }

    const code = genOtp();
    const exp = new Date(Date.now() + 10 * 60 * 1000);
    const user = await User.create({
      name,
      phone: phoneNormalized,
      role,
      isApproved: role === 'trucker' ? false : true,
      isEmailVerified: false,
      isPhoneVerified: false,
      otpCode: code,
      otpExpires: exp,
      hasSignedUp: role === 'driver' ? true : false // Set to true for drivers who sign up via phone
    });

    await sendOtpSms(phone, code);
    res.status(201).json({ userId: user.id, nextStep: 'verify_otp', message: 'OTP sent' });
  } catch (e) {
    if (e.isJoi) return next(handleJoiError(e));
    if (e.name && e.name.startsWith('Sequelize')) return next(handleSequelizeError(e));
    next(e);
  }
};

// POST /auth/phone/verify-otp
exports.verifyOtp = async (req, res, next) => {
  try {
    const { phone, otp } = await verifyOtpSchema.validateAsync(req.body, { stripUnknown: true });
    const user = await User.findOne({ where: { phone: { [Op.in]: pkPhoneVariants(phone) } } });
    if (!user) return next(createError('User not found', ERROR_CODES.USER_NOT_FOUND, 404));
    if (!user.otpCode || !user.otpExpires || new Date(user.otpExpires) < new Date()) {
      return next(createError('Invalid or expired OTP', ERROR_CODES.INVALID_TOKEN, 400));
    }
    if (user.otpCode !== otp) {
      return next(createError('Invalid or expired OTP', ERROR_CODES.INVALID_TOKEN, 400));
    }
    await user.update({ isPhoneVerified: true, otpCode: null, otpExpires: null });
    res.json({ success: true, nextStep: user.passwordHash ? 'enter_pin' : 'set_pin' });
  } catch (e) {
    if (e.isJoi) return next(handleJoiError(e));
    next(e);
  }
};

// POST /auth/phone/set-pin
exports.setPin = async (req, res, next) => {
  try {
    const { phone, pin } = await setPinSchema.validateAsync(req.body, { stripUnknown: true });
    const user = await User.findOne({ where: { phone: { [Op.in]: pkPhoneVariants(phone) } } });
    if (!user) return next(createError('User not found', ERROR_CODES.USER_NOT_FOUND, 404));
    if (!user.isPhoneVerified) return next(createError('Phone not verified', ERROR_CODES.UNAUTHORIZED, 403));
    const hash = await bcrypt.hash(pin, 10);
    await user.update({ passwordHash: hash });
    res.json({ success: true, nextStep: 'enter_pin' });
  } catch (e) {
    if (e.isJoi) return next(handleJoiError(e));
    next(e);
  }
};

// POST /auth/phone/login
exports.phoneLogin = async (req, res, next) => {
  try {
    const { phone, pin } = await phoneLoginSchema.validateAsync(req.body, { stripUnknown: true });
    const user = await User.findOne({ where: { phone: { [Op.in]: pkPhoneVariants(phone) } } });
    if (!user) return next(createError('Invalid phone or PIN', ERROR_CODES.INVALID_CREDENTIALS, 401));
    if (!user.isPhoneVerified) return next(createError('Please verify your phone number first', ERROR_CODES.UNAUTHORIZED, 403));
    const ok = await bcrypt.compare(pin, user.passwordHash || '');
    if (!ok) return next(createError('Invalid phone or PIN', ERROR_CODES.INVALID_CREDENTIALS, 401));
    const tokens = signTokens(user);
    res.json({ user: { id: user.id, name: user.name, company: user.company, phone: user.phone, role: user.role, isApproved: user.isApproved, isPhoneVerified: user.isPhoneVerified }, ...tokens });
  } catch (e) {
    if (e.isJoi) return next(handleJoiError(e));
    next(e);
  }
};

// POST /auth/phone/resend-otp
exports.resendOtp = async (req, res, next) => {
  try {
    const { phone } = await resendOtpSchema.validateAsync(req.body, { stripUnknown: true });
    const user = await User.findOne({ where: { phone: { [Op.in]: pkPhoneVariants(phone) } } });
    if (!user) return next(createError('User not found', ERROR_CODES.USER_NOT_FOUND, 404));
    const code = genOtp();
    const exp = new Date(Date.now() + 10 * 60 * 1000);
    await user.update({ otpCode: code, otpExpires: exp });
    await sendOtpSms(phone, code);
    res.json({ success: true, message: 'OTP resent' });
  } catch (e) {
    if (e.isJoi) return next(handleJoiError(e));
    next(e);
  }
};