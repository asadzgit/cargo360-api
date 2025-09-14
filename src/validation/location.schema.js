const Joi = require('joi');

// Location tracking validation
exports.locationTrackingSchema = Joi.object({
  latitude: Joi.number().min(-90).max(90).required(),
  longitude: Joi.number().min(-180).max(180).required(),
  accuracy: Joi.number().min(0).optional(),
  speed: Joi.number().min(0).optional(),
  heading: Joi.number().min(0).max(360).optional(),
  timestamp: Joi.date().iso().required()
});
