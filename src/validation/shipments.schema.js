const Joi = require('joi');

exports.createShipmentSchema = Joi.object({
  pickupLocation: Joi.string().required(),
  dropLocation: Joi.string().required(),
  cargoType: Joi.string().required(),
  cargoWeight: Joi.number().integer().min(1).required(),
  cargoSize: Joi.string().allow('', null),
  vehicleType: Joi.string().required(),
  budget: Joi.number().min(0).required()
});
