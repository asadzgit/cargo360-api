const { Document, ClearanceDocumentRequest } = require('../../models');
const {
  generateUploadSignatureSchema,
  saveDocumentSchema,
  updateDocumentSchema
} = require('../validation/documents.schema');
const {
  generateUploadSignature,
  validateCloudinaryUrl,
  extractPublicIdFromUrl
} = require('../utils/cloudinary');
const { createError, ERROR_CODES, handleJoiError } = require('../utils/errorHandler');

// POST /documents/upload-signature
exports.generateUploadSignature = async (req, res, next) => {
  try {
    const data = await generateUploadSignatureSchema.validateAsync(req.body, { stripUnknown: true });
    const userId = req.user.id;

    const signatureData = generateUploadSignature(
      userId,
      data.documentType,
      data.fileName
    );

    res.json({
      success: true,
      data: signatureData
    });
  } catch (e) {
    if (e.isJoi) {
      return next(handleJoiError(e));
    }
    next(e);
  }
};

// POST /documents
exports.save = async (req, res, next) => {
  try {
    const data = await saveDocumentSchema.validateAsync(req.body, { stripUnknown: true });
    const userId = req.user.id;

    // Validate that fileUrl is from Cloudinary
    if (!validateCloudinaryUrl(data.fileUrl)) {
      return next(createError(
        'Invalid file URL. File must be uploaded to Cloudinary.',
        ERROR_CODES.INVALID_INPUT,
        400
      ));
    }

    // Extract public_id from URL if not provided
    const publicId = data.publicId || extractPublicIdFromUrl(data.fileUrl);

    // If requestId is provided, validate it exists and belongs to user
    if (data.requestId) {
      const request = await ClearanceDocumentRequest.findOne({
        where: {
          id: data.requestId,
          createdBy: userId
        }
      });

      if (!request) {
        return next(createError(
          'Clearance document request not found or unauthorized',
          ERROR_CODES.NOT_FOUND,
          404
        ));
      }
    }

    const document = await Document.create({
      documentType: data.documentType,
      fileUrl: data.fileUrl,
      fileName: data.fileName,
      fileSize: data.fileSize || null,
      mimeType: data.mimeType || null,
      fileKey: publicId, // Store public_id as fileKey for deletion
      requestId: data.requestId || null,
      uploadedBy: userId
    });

    const created = await Document.findByPk(document.id, {
      include: [
        { model: ClearanceDocumentRequest, as: 'Request', required: false }
      ]
    });

    res.status(201).json({
      success: true,
      message: 'Document saved successfully',
      data: { document: created }
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

// GET /documents
exports.list = async (req, res, next) => {
  try {
    const { requestId, documentType } = req.query;
    const userId = req.user.id;

    const where = { uploadedBy: userId };

    if (requestId) {
      where.requestId = parseInt(requestId, 10);
    }

    if (documentType) {
      where.documentType = documentType;
    }

    const documents = await Document.findAll({
      where,
      include: [
        { model: ClearanceDocumentRequest, as: 'Request', required: false }
      ],
      order: [['createdAt', 'DESC']]
    });

    res.json({
      success: true,
      data: { documents }
    });
  } catch (e) {
    next(e);
  }
};

// GET /documents/:id
exports.getById = async (req, res, next) => {
  try {
    const documentId = parseInt(req.params.id, 10);
    const userId = req.user.id;

    if (isNaN(documentId)) {
      return next(createError('Invalid document ID', ERROR_CODES.INVALID_INPUT, 400));
    }

    const document = await Document.findOne({
      where: {
        id: documentId,
        uploadedBy: userId
      },
      include: [
        { model: ClearanceDocumentRequest, as: 'Request', required: false }
      ]
    });

    if (!document) {
      return next(createError('Document not found', ERROR_CODES.NOT_FOUND, 404));
    }

    res.json({
      success: true,
      data: { document }
    });
  } catch (e) {
    next(e);
  }
};

// DELETE /documents/:id
exports.delete = async (req, res, next) => {
  try {
    const documentId = parseInt(req.params.id, 10);
    const userId = req.user.id;

    if (isNaN(documentId)) {
      return next(createError('Invalid document ID', ERROR_CODES.INVALID_INPUT, 400));
    }

    const document = await Document.findOne({
      where: {
        id: documentId,
        uploadedBy: userId
      }
    });

    if (!document) {
      return next(createError('Document not found', ERROR_CODES.NOT_FOUND, 404));
    }

    // Delete from Cloudinary if fileKey exists
    if (document.fileKey) {
      try {
        const { deleteFromCloudinary } = require('../utils/cloudinary');
        await deleteFromCloudinary(document.fileKey);
      } catch (cloudinaryError) {
        console.error('Failed to delete from Cloudinary:', cloudinaryError);
        // Continue with database deletion even if Cloudinary deletion fails
      }
    }

    await document.destroy();

    res.json({
      success: true,
      message: 'Document deleted successfully'
    });
  } catch (e) {
    next(e);
  }
};

