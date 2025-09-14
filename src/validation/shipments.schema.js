const Joi = require('joi');

// Create shipment validation
exports.createShipmentSchema = Joi.object({
  pickupLocation: Joi.string().min(5).max(500).required(),
  dropLocation: Joi.string().min(5).max(500).required(),
  cargoType: Joi.string().min(2).max(100).required(),
  description: Joi.string().min(10).max(1000).optional().allow('', null),
  vehicleType: Joi.string().required(),
  cargoWeight: Joi.number().integer().min(1).optional(),
  cargoSize: Joi.string().max(50).optional().allow('', null),
  budget: Joi.number().min(0).optional()
});

// Update shipment validation (for customers)
exports.updateShipmentSchema = Joi.object({
  pickupLocation: Joi.string().min(5).max(500).optional(),
  dropLocation: Joi.string().min(5).max(500).optional(),
  cargoType: Joi.string().min(2).max(100).optional(),
  description: Joi.string().min(10).max(1000).optional().allow('', null),
  vehicleType: Joi.string().optional(),
  cargoWeight: Joi.number().integer().min(1).optional(),
  cargoSize: Joi.string().max(50).optional().allow('', null),
  budget: Joi.number().min(0).optional()
});

// Status update validation (for truckers)
exports.updateStatusSchema = Joi.object({
  status: Joi.string().valid('picked_up', 'accepted', 'in_transit', 'delivered', 'cancelled').required()
});

// Assignment validation (for admin)
exports.assignmentSchema = Joi.object({
  assignment: Joi.string().valid('trucker', 'driver').required(),
  userId: Joi.number().integer().min(1).required()
});

// Query parameters validation
exports.queryShipmentsSchema = Joi.object({
  status: Joi.string().valid('pending', 'accepted', 'picked_up', 'in_transit', 'delivered', 'cancelled').optional(),
  vehicleType: Joi.string().optional()
});
