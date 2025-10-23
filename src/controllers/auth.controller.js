const bcrypt = require('bcryptjs');
const axios = require('axios');
const jwt = require('jsonwebtoken');
const { Op } = require('sequelize');
const { signupSchema, loginSchema, forgotPasswordSchema, resetPasswordSchema, phoneCheckSchema, phoneSignupSchema, verifyOtpSchema, setPinSchema, phoneLoginSchema, resendOtpSchema } = require('../validation/auth.schema');

const { jwt: jwtCfg } = require('../../config/env');
const { User } = require('../../models/index');
const { generateToken, sendVerificationEmail, sendPasswordResetEmail } = require('../utils/emailService');
const { ERROR_CODES, createError, handleJoiError, handleSequelizeError } = require('../utils/errorHandler');

const signTokens = (user) => {
  const payload = { id: user.id, role: user.role };
  const accessToken = jwt.sign(payload, jwtCfg.accessSecret, { expiresIn: jwtCfg.accessExpires });
  const refreshToken = jwt.sign(payload, jwtCfg.refreshSecret, { expiresIn: jwtCfg.refreshExpires });
  return { accessToken, refreshToken };
};

exports.signup = async (req, res, next) => {
  try {
    const data = await signupSchema.validateAsync(req.body, { stripUnknown: true });
    
    // Check for existing email
    const emailExists = await User.findOne({ where: { email: data.email } });
    if (emailExists) return next(createError('An account with this email already exists', ERROR_CODES.EMAIL_ALREADY_EXISTS, 409));
    
    // Check for existing phone (only if phone is provided)
    if (data.phone) {
      const phoneExists = await User.findOne({ where: { phone: data.phone } });
      if (phoneExists) return next(createError('An account with this phone number already exists', ERROR_CODES.PHONE_ALREADY_EXISTS, 409));
    }

    const passwordHash = await bcrypt.hash(data.password, 10);
    const role = data.role; // 'customer' | 'trucker' (admin seeded only)
    const isApproved = role === 'trucker' ? false : true;

    // Generate email verification token
    const emailVerificationToken = generateToken();
    const emailVerificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    const user = await User.create({
      name: data.name,
      email: data.email,
      phone: data.phone,
      passwordHash,
      role,
      isApproved,
      isEmailVerified: false,
      emailVerificationToken,
      emailVerificationExpires
    });

    // Send verification email
    try {
      await sendVerificationEmail(user, emailVerificationToken);
    } catch (emailError) {
      console.error('Failed to send verification email:', emailError);
      // Don't fail the signup if email fails, but log it
    }

    // Don't return tokens until email is verified
    res.status(201).json({ 
      message: 'Account created successfully. Please check your email to verify your account.',
      user: { id: user.id, name: user.name, role: user.role, isApproved: user.isApproved, isEmailVerified: user.isEmailVerified }
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
    const user = await User.findOne({ where: { email: data.email } });
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
    res.json({ user: { id: user.id, name: user.name, role: user.role, isApproved: user.isApproved, isEmailVerified: user.isEmailVerified }, ...tokens });
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
    const user = await User.findByPk(req.user.id, { attributes: ['id','name','email','phone','role','isApproved','isEmailVerified'] });
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
exports.verifyEmail = async (req, res, next) => {
  try {
    const { token } = req.query;
    if (!token) {
      const clientUrl = process.env.CLIENT_URL || 'http://localhost:4000';
      return res.redirect(302, `${clientUrl}/verification-failure`);
    }

    const user = await User.findOne({
      where: {
        emailVerificationToken: token,
        emailVerificationExpires: { [Op.gt]: new Date() }
      }
    });

    if (!user) {
      const clientUrl = process.env.CLIENT_URL || 'http://localhost:4000';
      return res.redirect(302, `${clientUrl}/verification-failure`);
    }

    // Update user as verified
    await user.update({
      isEmailVerified: true,
      emailVerificationToken: null,
      emailVerificationExpires: null
    });

    // Redirect to client success page instead of returning JSON
    const clientUrl = process.env.CLIENT_URL || 'http://localhost:4000';
    return res.redirect(302, `${clientUrl}/verification-success`);
  } catch (e) { 
      try {
        const clientUrl = process.env.CLIENT_URL || 'http://localhost:4000';
        return res.redirect(302, `${clientUrl}/verification-failure`);
      } catch (_) {
        // Fallback to default error handling if redirect fails
        if (e.isJoi) return next(handleJoiError(e));
        if (e.name && e.name.startsWith('Sequelize')) return next(handleSequelizeError(e));
        next(e);
      }
  }
};

// Resend verification email
exports.resendVerification = async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) return next(createError('Email address is required', ERROR_CODES.MISSING_FIELD, 400));

    const user = await User.findOne({ where: { email } });
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

    const user = await User.findOne({ where: { email } });
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
function genOtp() { return Math.floor(100000 + Math.random() * 900000).toString(); }

async function sendOtpSms(phone, code) {
  const url = 'https://secure.h3techs.com/sms/api/send';
  const payload = {
    email: 'asadmahmood41999@gmail.com',
    key: '104c92c66802b374db7787ecfd4e27ec09',
    mask: 'CARGO360',
    to: phone,
    message: `Cargo360 verification code: ${code}. Expires in 5 minutes. Do not share this code with anyone.`
  };
  try {
    const response = await axios.post(url, payload, { timeout: 15000 });
    const smsResponse = response.data.sms;
    console.log('[OTP] Response', smsResponse);
    if (smsResponse.code !== '000' || smsResponse.response !== 'Message Queued Successfully') {
      throw new Error(`OTP SMS failed: ${smsResponse.code} ${smsResponse.response}`);
    }
  } catch (err) {
    // Log server-provided details if present
    const status = err.response?.status;
    const data = err.response?.data;
    console.error('[OTP] Error', { status, data, message: err.message });
    throw err;
  }
}
// POST /auth/phone/check
exports.phoneCheck = async (req, res, next) => {
  try {
    const data = await phoneCheckSchema.validateAsync(req.body, { stripUnknown: true });
    const { phone } = data;
    const user = await User.findOne({ where: { phone } });

    if (!user) {
      return res.json({ exists: false, nextStep: 'signup_required' });
    }

    if (!(user.role === 'trucker' || user.role === 'driver')) {
      return next(createError('Phone belongs to another account type', ERROR_CODES.UNAUTHORIZED, 403));
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

    if (!(role === 'trucker' || role === 'driver')) {
      return next(createError('Invalid role', ERROR_CODES.INVALID_ROLE, 400));
    }

    const exists = await User.findOne({ where: { phone } });
    if (exists) return next(createError('An account with this phone number already exists', ERROR_CODES.PHONE_ALREADY_EXISTS, 409));

    const code = genOtp();
    const exp = new Date(Date.now() + 10 * 60 * 1000);
    const user = await User.create({
      name,
      phone,
      role,
      isApproved: role === 'trucker' ? false : true,
      isEmailVerified: false,
      isPhoneVerified: false,
      otpCode: code,
      otpExpires: exp
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
    const user = await User.findOne({ where: { phone } });
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
    const user = await User.findOne({ where: { phone } });
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
    const user = await User.findOne({ where: { phone } });
    if (!user) return next(createError('Invalid phone or PIN', ERROR_CODES.INVALID_CREDENTIALS, 401));
    if (!user.isPhoneVerified) return next(createError('Please verify your phone number first', ERROR_CODES.UNAUTHORIZED, 403));
    const ok = await bcrypt.compare(pin, user.passwordHash || '');
    if (!ok) return next(createError('Invalid phone or PIN', ERROR_CODES.INVALID_CREDENTIALS, 401));
    const tokens = signTokens(user);
    res.json({ user: { id: user.id, name: user.name, role: user.role, isApproved: user.isApproved, isPhoneVerified: user.isPhoneVerified }, ...tokens });
  } catch (e) {
    if (e.isJoi) return next(handleJoiError(e));
    next(e);
  }
};

// POST /auth/phone/resend-otp
exports.resendOtp = async (req, res, next) => {
  try {
    const { phone } = await resendOtpSchema.validateAsync(req.body, { stripUnknown: true });
    const user = await User.findOne({ where: { phone } });
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