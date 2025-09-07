const Joi = require('joi');

exports.createVehicleSchema = Joi.object({
  vehicleType: Joi.string().required(),
  make: Joi.string().required(),
  model: Joi.string().required(),
  year: Joi.number().integer().min(1950).max(2100).required(),
  color: Joi.string().allow('', null),
  registrationNumber: Joi.string().required(),
  chassisNumber: Joi.string().allow('', null),
  engineNumber: Joi.string().allow('', null),
  capacityKg: Joi.number().integer().min(1).required(),
  dimensions: Joi.string().allow('', null)
});
