// Error codes for different types of errors
const ERROR_CODES = {
  // Validation errors (4000-4099)
  VALIDATION_ERROR: 4000,
  INVALID_EMAIL: 4001,
  INVALID_PASSWORD: 4002,
  INVALID_PHONE: 4003,
  INVALID_NAME: 4004,
  INVALID_ROLE: 4005,
  MISSING_FIELD: 4006,
  INVALID_INPUT: 4007,
  
  // Authentication errors (4100-4199)
  INVALID_CREDENTIALS: 4100,
  EMAIL_NOT_VERIFIED: 4101,
  ACCOUNT_NOT_APPROVED: 4102,
  TOKEN_EXPIRED: 4103,
  INVALID_TOKEN: 4104,
  UNAUTHORIZED: 4105,
  
  // User management errors (4200-4299)
  EMAIL_ALREADY_EXISTS: 4200,
  USER_NOT_FOUND: 4201,
  EMAIL_ALREADY_VERIFIED: 4202,
  PHONE_ALREADY_EXISTS: 4203,
  NOT_FOUND: 4204,
  
  // Database constraint errors (4300-4399)
  REQUIRED_FIELD_MISSING: 4300,
  INVALID_ENUM_VALUE: 4301,
  UNIQUE_CONSTRAINT_VIOLATION: 4302,
  
  // System errors (5000-5099)
  EMAIL_SEND_FAILED: 5000,
  DATABASE_ERROR: 5001,
  INTERNAL_ERROR: 5002
};

// Create a standardized error response
const createError = (message, code, status = 400) => {
  const error = new Error(message);
  error.status = status;
  error.code = code;
  return error;
};

// Handle Joi validation errors
const handleJoiError = (joiError) => {
  const details = joiError.details[0];
  let message = '';
  let code = ERROR_CODES.VALIDATION_ERROR;
  
  switch (details.context.key) {
    case 'email':
      message = 'Please provide a valid email address';
      code = ERROR_CODES.INVALID_EMAIL;
      break;
    case 'password':
      if (details.type === 'string.min') {
        message = 'Password must be at least 6 characters long';
      } else {
        message = 'Password is required';
      }
      code = ERROR_CODES.INVALID_PASSWORD;
      break;
    case 'name':
      if (details.type === 'string.min') {
        message = 'Name must be at least 2 characters long';
      } else {
        message = 'Name is required';
      }
      code = ERROR_CODES.INVALID_NAME;
      break;
    case 'phone':
      if (details.type === 'string.min') {
        message = 'Phone number must be at least 6 characters long';
      } else {
        message = 'Phone number is required';
      }
      code = ERROR_CODES.INVALID_PHONE;
      break;
    case 'role':
      if (details.type === 'any.only') {
        message = 'Role must be either "customer" or "trucker"';
      } else {
        message = 'Role is required';
      }
      code = ERROR_CODES.INVALID_ROLE;
      break;
    case 'token':
      message = 'Token is required';
      code = ERROR_CODES.MISSING_FIELD;
      break;
    default:
      message = details.message.replace(/"/g, '');
      code = ERROR_CODES.VALIDATION_ERROR;
  }
  
  return createError(message, code, 400);
};

// Handle Sequelize database errors
const handleSequelizeError = (sequelizeError) => {
  // Handle unique constraint violations
  if (sequelizeError.name === 'SequelizeUniqueConstraintError') {
    const field = sequelizeError.errors[0]?.path;
    
    switch (field) {
      case 'email':
        return createError('An account with this email already exists', ERROR_CODES.EMAIL_ALREADY_EXISTS, 409);
      case 'phone':
        return createError('An account with this phone number already exists', ERROR_CODES.PHONE_ALREADY_EXISTS, 409);
      default:
        return createError('This value already exists in the system', ERROR_CODES.UNIQUE_CONSTRAINT_VIOLATION, 409);
    }
  }
  
  // Handle validation errors (NOT NULL constraints, etc.)
  if (sequelizeError.name === 'SequelizeValidationError') {
    const field = sequelizeError.errors[0]?.path;
    const validationType = sequelizeError.errors[0]?.validatorKey;
    
    if (validationType === 'notNull') {
      switch (field) {
        case 'name':
          return createError('Name is required', ERROR_CODES.INVALID_NAME, 400);
        case 'email':
          return createError('Email is required', ERROR_CODES.INVALID_EMAIL, 400);
        case 'passwordHash':
          return createError('Password is required', ERROR_CODES.INVALID_PASSWORD, 400);
        default:
          return createError(`${field} is required`, ERROR_CODES.REQUIRED_FIELD_MISSING, 400);
      }
    }
  }
  
  // Handle foreign key constraint errors
  if (sequelizeError.name === 'SequelizeForeignKeyConstraintError') {
    return createError('Referenced record does not exist', ERROR_CODES.DATABASE_ERROR, 400);
  }
  
  // Handle enum constraint violations
  if (sequelizeError.name === 'SequelizeDatabaseError' && sequelizeError.message.includes('invalid input value for enum')) {
    return createError('Invalid role. Must be either "customer" or "trucker"', ERROR_CODES.INVALID_ENUM_VALUE, 400);
  }
  
  // Default database error
  return createError(`Database operation failed ${sequelizeError.message}`, ERROR_CODES.DATABASE_ERROR, 500);
};

// Format error response for client
const formatErrorResponse = (error) => {
  return {
    error: error.message || 'An error occurred',
    code: error.code || ERROR_CODES.INTERNAL_ERROR,
    status: error.status || 500
  };
};

module.exports = {
  ERROR_CODES,
  createError,
  handleJoiError,
  handleSequelizeError,
  formatErrorResponse
};
