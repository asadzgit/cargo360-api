const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Op } = require('sequelize');
const { signupSchema, loginSchema, forgotPasswordSchema, resetPasswordSchema } = require('../validation/auth.schema');
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
    if (!token) return next(createError('Verification token is required', ERROR_CODES.MISSING_FIELD, 400));

    const user = await User.findOne({
      where: {
        emailVerificationToken: token,
        emailVerificationExpires: { [Op.gt]: new Date() }
      }
    });

    if (!user) {
      return next(createError('Invalid or expired verification token. Please request a new verification email.', ERROR_CODES.INVALID_TOKEN, 400));
    }

    // Update user as verified
    await user.update({
      isEmailVerified: true,
      emailVerificationToken: null,
      emailVerificationExpires: null
    });

    // Generate tokens for the user
    const tokens = signTokens(user);
    
    res.json({
      message: 'Email verified successfully',
      user: { id: user.id, name: user.name, role: user.role, isApproved: user.isApproved, isEmailVerified: true },
      ...tokens
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
