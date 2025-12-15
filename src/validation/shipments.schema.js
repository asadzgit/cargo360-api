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
  budget: Joi.number().min(0).optional(),
  insurance: Joi.boolean().optional(),
  salesTax: Joi.boolean().optional(),
  numberOfVehicles: Joi.number().integer().min(1).optional(),
<<<<<<< Updated upstream
  deliveryDate: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).optional().allow('', null),
  clearingAgentNum: Joi.string().max(100).optional().allow('', null)
=======
  deliveryDate: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).optional().allow('', null)
>>>>>>> Stashed changes
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
  budget: Joi.number().min(0).optional(),
  insurance: Joi.boolean().optional(),
  salesTax: Joi.boolean().optional(),
  numberOfVehicles: Joi.number().integer().min(1).optional(),
<<<<<<< Updated upstream
  deliveryDate: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).optional().allow('', null),
  clearingAgentNum: Joi.string().max(100).optional().allow('', null)
=======
  deliveryDate: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).optional().allow('', null)
>>>>>>> Stashed changes
});

// Status update validation (for truckers)
exports.updateStatusSchema = Joi.object({
  status: Joi.string().valid('picked_up', 'confirmed', 'accepted', 'in_transit', 'delivered', 'cancelled').required()
});

// Assignment validation (for admin)
exports.assignmentSchema = Joi.object({
  assignment: Joi.string().valid('trucker', 'driver').required(),
  userId: Joi.number().integer().min(1).required()
});

// Assignment validation for broker (trucker) to assign a driver they own
exports.assignDriverByBrokerSchema = Joi.object({
  driverId: Joi.number().integer().min(1).required()
});

// Query parameters validation
exports.queryShipmentsSchema = Joi.object({
  status: Joi.string().valid('pending', 'confirmed', 'accepted', 'picked_up', 'in_transit', 'delivered', 'cancelled').optional(),
  vehicleType: Joi.string().optional()
});

// Cancel shipment validation
exports.cancelShipmentSchema = Joi.object({
  cancelReason: Joi.string().max(1000).optional().allow('', null),
  cancelledBy: Joi.string().valid('Customer', 'Super Admin').optional()
});
