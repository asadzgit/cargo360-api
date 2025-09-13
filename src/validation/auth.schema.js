
const Joi = require('joi');

exports.signupSchema = Joi.object({
  name: Joi.string().min(2).required(),
  email: Joi.string().email().required(),
  phone: Joi.string().min(6).optional(),
  password: Joi.string().min(6).required(),
  role: Joi.string().valid('customer','trucker','admin','driver').required()
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
