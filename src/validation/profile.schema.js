const Joi = require('joi');

// At least one of: name, phone, company, cnic, license, vehicleRegistration, (currentPassword & newPassword)
exports.updateMeSchema = Joi.object({
  name: Joi.string().min(2).optional(),
  phone: Joi.string().min(6).optional(),
  company: Joi.string().min(1).optional().allow(''),
  cnic: Joi.string().min(1).optional().allow(''),
  license: Joi.string().min(1).optional().allow(''),
  vehicleRegistration: Joi.string().min(1).optional().allow(''),
  currentPassword: Joi.string().min(6).optional(),
  newPassword: Joi.string().min(6).optional()
})
  .custom((value, helpers) => {
    const hasProfile = !!(value.name || value.phone || value.company !== undefined || 
                          value.cnic !== undefined || value.license !== undefined || 
                          value.vehicleRegistration !== undefined);
    const hasPasswordAny = value.currentPassword || value.newPassword;
    const hasPasswordBoth = value.currentPassword && value.newPassword;

    if (!hasProfile && !hasPasswordAny) {
      return helpers.error('any.custom', {
        message: 'Provide at least one field to update (name, phone, company, cnic, license, vehicleRegistration, or currentPassword + newPassword)'
      });
    }
    if (hasPasswordAny && !hasPasswordBoth) {
      return helpers.error('any.custom', {
        message: 'Both currentPassword and newPassword are required to change password'
      });
    }
    return value;
  }, 'updateMe validation');
