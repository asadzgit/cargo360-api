const Joi = require('joi');

exports.createDiscountRequestSchema = Joi.object({
  requestAmount: Joi.number().positive().required()
});

exports.decideDiscountRequestSchema = Joi.object({
  action: Joi.string().valid('accept', 'reject').required(),
  counterOffer: Joi.number().positive().optional()
});
