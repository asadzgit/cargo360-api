const { ClearanceDocumentRequest, User, Shipment, Document } = require('../../models');
const { 
  createClearanceRequestSchema, 
  updateClearanceRequestSchema,
  updateStatusSchema 
} = require('../validation/clearanceRequests.schema');
const { createError, ERROR_CODES, handleJoiError } = require('../utils/errorHandler');
const { Op } = require('sequelize');

// POST /clearance-requests
exports.create = async (req, res, next) => {
  try {
    const data = await createClearanceRequestSchema.validateAsync(req.body, { stripUnknown: true });
    const { documentIds, ...requestData } = data;
    
    // Create the request
    const request = await ClearanceDocumentRequest.create({
      ...requestData,
      createdBy: req.user.id,
      status: 'pending'
    });

    // Link documents if provided
    if (documentIds && Array.isArray(documentIds) && documentIds.length > 0) {
      // Validate all documents belong to the user and are not already linked
      const documents = await Document.findAll({
        where: {
          id: { [Op.in]: documentIds },
          uploadedBy: req.user.id,
          requestId: null // Only link documents that aren't already linked
        }
      });

      if (documents.length !== documentIds.length) {
        return next(createError(
          'Some documents not found, already linked to another request, or unauthorized',
          ERROR_CODES.INVALID_INPUT,
          400
        ));
      }

      // Update documents with requestId
      await Document.update(
        { requestId: request.id },
        { where: { id: { [Op.in]: documentIds } } }
      );
    }

    const created = await ClearanceDocumentRequest.findByPk(request.id, {
      include: [
        { model: User, as: 'Creator', attributes: ['id', 'name', 'company', 'email'] },
        { model: Shipment, as: 'Shipment', attributes: ['id', 'pickupLocation', 'dropLocation'], required: false },
        { model: Document, as: 'Documents', required: false }
      ]
    });

    res.status(201).json({
      success: true,
      message: 'Clearance document request created successfully',
      data: { request: created }
    });
  } catch (e) {
    if (e.isJoi) {
      return next(handleJoiError(e));
    }
    if (e.name && e.name.startsWith('Sequelize')) {
      return next(createError('Database error', ERROR_CODES.DATABASE_ERROR, 500));
    }
    next(e);
  }
};

// GET /clearance-requests
exports.list = async (req, res, next) => {
  try {
    const { 
      requestType, 
      status, 
      city, 
      containerType,
      limit = 50, 
      offset = 0 
    } = req.query;

    const where = {};
    
    // Filter by user role
    if (req.user.role === 'customer') {
      where.createdBy = req.user.id;
    }
    // Admin and moderators can see all

    if (requestType) {
      where.requestType = requestType;
    }
    if (status) {
      where.status = status;
    }
    if (city) {
      where.city = city;
    }
    if (containerType) {
      where.containerType = containerType;
    }

    const limitNum = Math.min(parseInt(limit, 10) || 50, 100);
    const offsetNum = parseInt(offset, 10) || 0;

    const { count, rows } = await ClearanceDocumentRequest.findAndCountAll({
      where,
      include: [
        { model: User, as: 'Creator', attributes: ['id', 'name', 'company', 'email'] },
        { model: User, as: 'Reviewer', attributes: ['id', 'name', 'company'], required: false },
        { model: Shipment, as: 'Shipment', attributes: ['id', 'pickupLocation', 'dropLocation'], required: false },
        { model: Document, as: 'Documents', required: false }
      ],
      limit: limitNum,
      offset: offsetNum,
      order: [['createdAt', 'DESC']]
    });

    res.json({
      success: true,
      data: {
        requests: rows,
        count,
        limit: limitNum,
        offset: offsetNum
      }
    });
  } catch (e) {
    next(e);
  }
};

// GET /clearance-requests/:id
exports.getById = async (req, res, next) => {
  try {
    const requestId = parseInt(req.params.id, 10);

    if (isNaN(requestId)) {
      return next(createError('Invalid request ID', ERROR_CODES.INVALID_INPUT, 400));
    }

    const where = { id: requestId };
    
    // Customers can only see their own requests
    if (req.user.role === 'customer') {
      where.createdBy = req.user.id;
    }

    const request = await ClearanceDocumentRequest.findOne({
      where,
      include: [
        { model: User, as: 'Creator', attributes: ['id', 'name', 'company', 'email', 'phone'] },
        { model: User, as: 'Reviewer', attributes: ['id', 'name', 'company'], required: false },
        { model: Shipment, as: 'Shipment', attributes: ['id', 'pickupLocation', 'dropLocation', 'status'], required: false },
        { model: Document, as: 'Documents', required: false }
      ]
    });

    if (!request) {
      return next(createError('Clearance document request not found', ERROR_CODES.NOT_FOUND, 404));
    }

    res.json({
      success: true,
      data: { request }
    });
  } catch (e) {
    next(e);
  }
};

// PUT /clearance-requests/:id
exports.update = async (req, res, next) => {
  try {
    const requestId = parseInt(req.params.id, 10);

    if (isNaN(requestId)) {
      return next(createError('Invalid request ID', ERROR_CODES.INVALID_INPUT, 400));
    }

    const data = await updateClearanceRequestSchema.validateAsync(req.body, { stripUnknown: true });

    const where = { id: requestId };
    
    // Customers can only update their own pending requests
    if (req.user.role === 'customer') {
      where.createdBy = req.user.id;
      where.status = 'pending';
    }

    const request = await ClearanceDocumentRequest.findOne({ where });

    if (!request) {
      return next(createError('Clearance document request not found or cannot be updated', ERROR_CODES.NOT_FOUND, 404));
    }

    await request.update(data);

    const updated = await ClearanceDocumentRequest.findByPk(request.id, {
      include: [
        { model: User, as: 'Creator', attributes: ['id', 'name', 'company', 'email'] },
        { model: Shipment, as: 'Shipment', attributes: ['id', 'pickupLocation', 'dropLocation'], required: false },
        { model: Document, as: 'Documents', required: false }
      ]
    });

    res.json({
      success: true,
      message: 'Clearance document request updated successfully',
      data: { request: updated }
    });
  } catch (e) {
    if (e.isJoi) {
      return next(handleJoiError(e));
    }
    next(e);
  }
};

// PUT /clearance-requests/:id/status (Admin/Moderator only)
exports.updateStatus = async (req, res, next) => {
  try {
    const requestId = parseInt(req.params.id, 10);

    if (isNaN(requestId)) {
      return next(createError('Invalid request ID', ERROR_CODES.INVALID_INPUT, 400));
    }

    const data = await updateStatusSchema.validateAsync(req.body, { stripUnknown: true });

    const request = await ClearanceDocumentRequest.findByPk(requestId);

    if (!request) {
      return next(createError('Clearance document request not found', ERROR_CODES.NOT_FOUND, 404));
    }

    await request.update({
      status: data.status,
      reviewedBy: req.user.id,
      reviewNotes: data.reviewNotes || null
    });

    const updated = await ClearanceDocumentRequest.findByPk(request.id, {
      include: [
        { model: User, as: 'Creator', attributes: ['id', 'name', 'company', 'email'] },
        { model: User, as: 'Reviewer', attributes: ['id', 'name', 'company'] },
        { model: Shipment, as: 'Shipment', attributes: ['id', 'pickupLocation', 'dropLocation'], required: false },
        { model: Document, as: 'Documents', required: false }
      ]
    });

    res.json({
      success: true,
      message: `Request status updated to ${data.status}`,
      data: { request: updated }
    });
  } catch (e) {
    if (e.isJoi) {
      return next(handleJoiError(e));
    }
    next(e);
  }
};

// DELETE /clearance-requests/:id
exports.delete = async (req, res, next) => {
  try {
    const requestId = parseInt(req.params.id, 10);

    if (isNaN(requestId)) {
      return next(createError('Invalid request ID', ERROR_CODES.INVALID_INPUT, 400));
    }

    const where = { id: requestId };
    
    // Customers can only delete their own pending requests
    if (req.user.role === 'customer') {
      where.createdBy = req.user.id;
      where.status = 'pending';
    }

    const request = await ClearanceDocumentRequest.findOne({ where });

    if (!request) {
      return next(createError('Clearance document request not found or cannot be deleted', ERROR_CODES.NOT_FOUND, 404));
    }

    await request.destroy();

    res.json({
      success: true,
      message: 'Clearance document request deleted successfully'
    });
  } catch (e) {
    next(e);
  }
};

