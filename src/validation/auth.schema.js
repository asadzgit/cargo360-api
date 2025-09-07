
const Joi = require('joi');

exports.signupSchema = Joi.object({
  name: Joi.string().min(2).required(),
  email: Joi.string().email().required(),
  phone: Joi.string().min(6).required(),
  password: Joi.string().min(6).required(),
  role: Joi.string().valid('customer','trucker').required()
});

exports.loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required()
});
