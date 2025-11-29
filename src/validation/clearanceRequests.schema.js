const Joi = require('joi');

// Base schema for common fields
const baseClearanceRequestSchema = {
  shipmentId: Joi.number().integer().min(1).optional().allow(null),
  requestType: Joi.string().valid('import', 'export', 'freight_forwarding').required(),
  containerType: Joi.string().valid('LCL', 'FCL').required()
};

// Create clearance request schema with conditional validation
exports.createClearanceRequestSchema = Joi.object({
  ...baseClearanceRequestSchema,
  city: Joi.string().valid('LHR', 'KHI').when('requestType', {
    is: Joi.string().valid('import', 'export'),
    then: Joi.required(),
    otherwise: Joi.optional().allow(null)
  }),
  transportMode: Joi.string().valid('air', 'sea', 'air_only').when('requestType', {
    is: Joi.string().valid('import', 'export'),
    then: Joi.required(),
    otherwise: Joi.optional().allow(null)
  }),
  port: Joi.string().max(100).when('city', {
    is: 'KHI',
    then: Joi.optional().allow(null),
    otherwise: Joi.optional().allow(null)
  }),
  // Freight Forwarding LCL fields
  cbm: Joi.number().positive().when('requestType', {
    is: 'freight_forwarding',
    then: Joi.when('containerType', {
      is: 'LCL',
      then: Joi.required(),
      otherwise: Joi.optional().allow(null)
    }),
    otherwise: Joi.optional().allow(null)
  }),
  packages: Joi.number().integer().min(1).when('requestType', {
    is: 'freight_forwarding',
    then: Joi.when('containerType', {
      is: 'LCL',
      then: Joi.required(),
      otherwise: Joi.optional().allow(null)
    }),
    otherwise: Joi.optional().allow(null)
  }),
  // Freight Forwarding FCL fields
  containerSize: Joi.string().valid('20ft', '40ft', 'reefer').when('requestType', {
    is: 'freight_forwarding',
    then: Joi.when('containerType', {
      is: 'FCL',
      then: Joi.required(),
      otherwise: Joi.optional().allow(null)
    }),
    otherwise: Joi.optional().allow(null)
  }),
  numberOfContainers: Joi.number().integer().min(1).when('requestType', {
    is: 'freight_forwarding',
    then: Joi.when('containerType', {
      is: 'FCL',
      then: Joi.required(),
      otherwise: Joi.optional().allow(null)
    }),
    otherwise: Joi.optional().allow(null)
  }),
  // Common optional fields
  pol: Joi.string().max(200).optional().allow(null, ''),
  pod: Joi.string().max(200).optional().allow(null, ''),
  product: Joi.string().max(500).optional().allow(null, ''),
  incoterms: Joi.string().max(100).optional().allow(null, ''),
  // Document IDs to link to this request
  documentIds: Joi.array().items(Joi.number().integer().min(1)).optional()
    .messages({
      'array.base': 'documentIds must be an array of document IDs'
    })
});

// Update clearance request schema
exports.updateClearanceRequestSchema = Joi.object({
  shipmentId: Joi.number().integer().min(1).optional().allow(null),
  city: Joi.string().valid('LHR', 'KHI').optional().allow(null),
  transportMode: Joi.string().valid('air', 'sea', 'air_only').optional().allow(null),
  containerType: Joi.string().valid('LCL', 'FCL').optional(),
  port: Joi.string().max(100).optional().allow(null, ''),
  cbm: Joi.number().positive().optional().allow(null),
  packages: Joi.number().integer().min(1).optional().allow(null),
  containerSize: Joi.string().valid('20ft', '40ft', 'reefer').optional().allow(null),
  numberOfContainers: Joi.number().integer().min(1).optional().allow(null),
  pol: Joi.string().max(200).optional().allow(null, ''),
  pod: Joi.string().max(200).optional().allow(null, ''),
  product: Joi.string().max(500).optional().allow(null, ''),
  incoterms: Joi.string().max(100).optional().allow(null, '')
});

// Update status schema (for admin)
exports.updateStatusSchema = Joi.object({
  status: Joi.string().valid('pending', 'under_review', 'approved', 'rejected').required(),
  reviewNotes: Joi.string().max(1000).optional().allow(null, '')
});

