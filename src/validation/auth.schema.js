const Joi = require('joi');

exports.signupSchema = Joi.object({
  name: Joi.string().min(2).required(),
  company: Joi.string()
    .min(3)
    .pattern(/^[a-zA-Z0-9\s]+$/)
    .custom((value, helpers) => {
      // Count letters in the company name
      const letterCount = (value.match(/[a-zA-Z]/g) || []).length;
      // Check if it's only digits
      const isOnlyDigits = /^\d+$/.test(value.replace(/\s/g, ''));
      
      if (letterCount < 3) {
        return helpers.error('string.minLetters');
      }
      if (isOnlyDigits) {
        return helpers.error('string.noDigitsOnly');
      }
      return value;
    })
    .when('role', {
      is: 'customer',
      then: Joi.required().messages({
        'string.min': 'Company name must be at least 3 characters',
        'string.pattern.base': 'Company name can only contain letters, numbers, and spaces',
        'string.minLetters': 'Company name must contain at least 3 letters',
        'string.noDigitsOnly': 'Company name cannot contain only digits'
      }),
      otherwise: Joi.optional()
    }),
  email: Joi.string().email().required(),
  phone: Joi.string().min(6).optional(),
  password: Joi.string().min(6).required(),
  role: Joi.string().valid('customer','trucker','admin','driver','moderator').required()
});

exports.loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required()
});

exports.forgotPasswordSchema = Joi.object({
  email: Joi.string().email().required()
});

exports.resetPasswordSchema = Joi.object({
  code: Joi.string().length(6).pattern(/^\d{6}$/).required().messages({
    'string.length': 'Confirmation code must be exactly 6 digits',
    'string.pattern.base': 'Confirmation code must contain only numbers'
  }),
  password: Joi.string().min(6).required()
});

// --- Phone-based OTP/PIN flow schemas ---
exports.phoneCheckSchema = Joi.object({
  phone: Joi.string().min(6).required(),
  role: Joi.string().valid('trucker','driver').required()
});

exports.phoneSignupSchema = Joi.object({
  name: Joi.string().min(2).required(),
  phone: Joi.string().min(6).required(),
  role: Joi.string().valid('trucker','driver').required()
});

exports.verifyOtpSchema = Joi.object({
  phone: Joi.string().min(6).required(),
  otp: Joi.string().length(6).pattern(/^\d{6}$/).required()
});

exports.setPinSchema = Joi.object({
  phone: Joi.string().min(6).required(),
  pin: Joi.string().length(6).pattern(/^\d{6}$/).required()
});

exports.phoneLoginSchema = Joi.object({
  phone: Joi.string().min(6).required(),
  pin: Joi.string().length(6).pattern(/^\d{6}$/).required()
});

exports.resendOtpSchema = Joi.object({
  phone: Joi.string().min(6).required()
});
