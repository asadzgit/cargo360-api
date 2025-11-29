const cloudinary = require('cloudinary').v2;
const crypto = require('crypto');
const { cloudinary: cloudinaryConfig } = require('../../config/env');

// Initialize Cloudinary
cloudinary.config({
  cloud_name: cloudinaryConfig.cloudName,
  api_key: cloudinaryConfig.apiKey,
  api_secret: cloudinaryConfig.apiSecret
});

/**
 * Generate upload signature for direct frontend upload
 * @param {number} userId - User ID
 * @param {string} documentType - Type of document
 * @param {string} fileName - Original file name
 * @returns {Object} Upload signature and parameters
 */
function generateUploadSignature(userId, documentType, fileName) {
  const timestamp = Math.round(new Date().getTime() / 1000);
  
  // Folder structure: {userId}/{documentType}/
  const folder = `${userId}/${documentType}`;
  
  // Generate unique public_id from fileName and timestamp
  const fileExtension = fileName.split('.').pop();
  const baseName = fileName.replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9]/g, '_');
  const publicId = `${folder}/${baseName}_${timestamp}`;
  
  // Parameters for upload
  const params = {
    folder: folder,
    public_id: publicId,
    timestamp: timestamp,
    // Optional: Add resource type, allowed formats, etc.
    resource_type: 'auto', // auto-detect: image, video, raw, etc.
    allowed_formats: ['pdf', 'jpg', 'jpeg', 'png', 'doc', 'docx'],
    max_file_size: 10485760, // 10MB in bytes
  };
  
  // Create signature
  const signature = cloudinary.utils.api_sign_request(params, cloudinaryConfig.apiSecret);
  
  return {
    signature,
    timestamp,
    folder,
    publicId,
    uploadUrl: `https://api.cloudinary.com/v1_1/${cloudinaryConfig.cloudName}/auto/upload`,
    params: {
      ...params,
      api_key: cloudinaryConfig.apiKey
    }
  };
}

/**
 * Delete file from Cloudinary
 * @param {string} publicId - Cloudinary public ID
 * @param {string} resourceType - Resource type (image, video, raw, auto)
 * @returns {Promise} Cloudinary deletion result
 */
async function deleteFromCloudinary(publicId, resourceType = 'auto') {
  try {
    const result = await cloudinary.uploader.destroy(publicId, {
      resource_type: resourceType
    });
    return result;
  } catch (error) {
    console.error('Cloudinary deletion error:', error);
    throw error;
  }
}

/**
 * Validate that file URL is from our Cloudinary account
 * @param {string} fileUrl - File URL to validate
 * @returns {boolean} True if valid Cloudinary URL
 */
function validateCloudinaryUrl(fileUrl) {
  if (!fileUrl || typeof fileUrl !== 'string') return false;
  
  const cloudinaryUrlPattern = new RegExp(
    `https://res\\.cloudinary\\.com/${cloudinaryConfig.cloudName}/.+`
  );
  
  return cloudinaryUrlPattern.test(fileUrl);
}

/**
 * Extract public_id from Cloudinary URL
 * @param {string} fileUrl - Cloudinary file URL
 * @returns {string|null} Public ID or null
 */
function extractPublicIdFromUrl(fileUrl) {
  if (!validateCloudinaryUrl(fileUrl)) return null;
  
  try {
    // Cloudinary URL format: https://res.cloudinary.com/{cloud_name}/{resource_type}/upload/v{version}/{public_id}.{format}
    const urlParts = fileUrl.split('/upload/');
    if (urlParts.length < 2) return null;
    
    const afterUpload = urlParts[1];
    // Remove version if present (v1234567890/)
    const withoutVersion = afterUpload.replace(/^v\d+\//, '');
    // Remove file extension
    const publicId = withoutVersion.replace(/\.[^/.]+$/, '');
    
    return publicId;
  } catch (error) {
    console.error('Error extracting public_id:', error);
    return null;
  }
}

module.exports = {
  generateUploadSignature,
  deleteFromCloudinary,
  validateCloudinaryUrl,
  extractPublicIdFromUrl,
  cloudinary // Export cloudinary instance for advanced usage
};

