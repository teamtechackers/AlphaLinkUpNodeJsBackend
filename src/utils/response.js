'use strict';

/**
 * Send a successful response
 * @param {Object} res - Express response object
 * @param {string} message - Success message
 * @param {Object} data - Response data
 * @param {number} statusCode - HTTP status code (default: 200)
 */
function successResponse(res, message = 'Success', data = {}, statusCode = 200) {
  return res.status(statusCode).json({
    status: true,
    message,
    data,
    timestamp: new Date().toISOString()
  });
}

/**
 * Send a PHP-compatible response (matches PHP backend format exactly)
 * @param {Object} res - Express response object
 * @param {string} message - Success message
 * @param {Object} data - Response data
 * @param {number} statusCode - HTTP status code (default: 200)
 */
function phpResponse(res, message = 'Success', data = {}, statusCode = 200) {
  return res.status(statusCode).json({
    status: true,
    rcode: statusCode,
    message,
    ...data
  });
}

/**
 * Send an error response
 * @param {Object} res - Express response object
 * @param {string} message - Error message
 * @param {number} statusCode - HTTP status code (default: 500)
 * @param {Object} extra - Additional error information
 */
function errorResponse(res, message = 'Internal Server Error', statusCode = 500, extra = {}) {
  return res.status(statusCode).json({
    status: false,
    message,
    error: {
      code: statusCode,
      timestamp: new Date().toISOString(),
      ...extra
    }
  });
}

/**
 * Send a validation error response
 * @param {Object} res - Express response object
 * @param {string} message - Validation error message
 * @param {Object} errors - Validation errors object
 */
function validationError(res, message = 'Validation failed', errors = {}) {
  return res.status(400).json({
    status: false,
    message,
    error: {
      code: 400,
      type: 'VALIDATION_ERROR',
      errors,
      timestamp: new Date().toISOString()
    }
  });
}

/**
 * Send a not found response
 * @param {Object} res - Express response object
 * @param {string} message - Not found message
 */
function notFound(res, message = 'Resource not found') {
  return res.status(404).json({
    status: false,
    message,
    error: {
      code: 404,
      type: 'NOT_FOUND',
      timestamp: new Date().toISOString()
    }
  });
}

/**
 * Send an unauthorized response
 * @param {Object} res - Express response object
 * @param {string} message - Unauthorized message
 */
function unauthorized(res, message = 'Unauthorized access') {
  return res.status(401).json({
    status: false,
    message,
    error: {
      code: 401,
      type: 'UNAUTHORIZED',
      timestamp: new Date().toISOString()
    }
  });
}

/**
 * Send a forbidden response
 * @param {Object} res - Express response object
 * @param {string} message - Forbidden message
 */
function forbidden(res, message = 'Access forbidden') {
  return res.status(403).json({
    status: false,
    message,
    error: {
      code: 403,
      type: 'FORBIDDEN',
      timestamp: new Date().toISOString()
    }
  });
}

/**
 * Send a conflict response
 * @param {Object} res - Express response object
 * @param {string} message - Conflict message
 */
function conflict(res, message = 'Resource conflict') {
  return res.status(409).json({
    status: false,
    message,
    error: {
      code: 409,
      type: 'CONFLICT',
      timestamp: new Date().toISOString()
    }
  });
}

/**
 * Send a rate limit exceeded response
 * @param {Object} res - Express response object
 * @param {string} message - Rate limit message
 */
function rateLimitExceeded(res, message = 'Too many requests') {
  return res.status(429).json({
    status: false,
    message,
    error: {
      code: 429,
      type: 'RATE_LIMIT_EXCEEDED',
      timestamp: new Date().toISOString()
    }
  });
}

// Legacy functions for backward compatibility
function ok(res, data = {}) {
  return successResponse(res, 'Success', data, 200);
}

function fail(res, rcode = 500, message = 'Error', extra = {}) {
  return errorResponse(res, message, rcode, extra);
}

module.exports = {
  // New standardized functions
  successResponse,
  errorResponse,
  validationError,
  notFound,
  unauthorized,
  forbidden,
  conflict,
  rateLimitExceeded,
  phpResponse,
  
  // Legacy functions for backward compatibility
  ok,
  fail
};


