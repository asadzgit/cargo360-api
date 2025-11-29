const Joi = require('joi');

// Allowed document types
const allowedDocumentTypes = [
  'commercial_invoice',
  'packing_list',
  'bill_of_lading',
  'insurance',
  'pol',
  'pod',
  'product',
  'ex_works',
  'others'
];

// Generate upload signature schema
exports.generateUploadSignatureSchema = Joi.object({
  documentType: Joi.string().valid(...allowedDocumentTypes).required()
    .messages({
      'any.only': `documentType must be one of: ${allowedDocumentTypes.join(', ')}`
    }),
  fileName: Joi.string().min(1).max(255).required()
    .messages({
      'string.min': 'File name is required',
      'string.max': 'File name must be less than 255 characters'
    })
});

// Save document metadata schema
exports.saveDocumentSchema = Joi.object({
  documentType: Joi.string().valid(...allowedDocumentTypes).required(),
  fileUrl: Joi.string().uri().required()
    .messages({
      'string.uri': 'File URL must be a valid URL',
      'any.required': 'File URL is required'
    }),
  fileName: Joi.string().min(1).max(255).required(),
  fileSize: Joi.number().integer().min(1).max(10485760).optional() // Max 10MB
    .messages({
      'number.max': 'File size must be less than 10MB'
    }),
  mimeType: Joi.string().max(100).optional()
    .messages({
      'string.max': 'MIME type must be less than 100 characters'
    }),
  publicId: Joi.string().max(500).optional()
    .messages({
      'string.max': 'Public ID must be less than 500 characters'
    }),
  requestId: Joi.number().integer().min(1).optional().allow(null)
});

// Update document schema (for linking to request)
exports.updateDocumentSchema = Joi.object({
  requestId: Joi.number().integer().min(1).optional().allow(null)
});

