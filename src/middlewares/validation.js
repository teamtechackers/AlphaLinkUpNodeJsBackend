'use strict';

const Joi = require('joi');
const { validationError } = require('../utils/response');

// Common validation schemas
const commonSchemas = {
  id: Joi.number().integer().positive(),
  userId: Joi.number().integer().positive(),
  mobile: Joi.string().pattern(/^[0-9]{10}$/).messages({
    'string.pattern.base': 'Mobile number must be 10 digits'
  }),
  email: Joi.string().email().messages({
    'string.email': 'Please provide a valid email address'
  }),
  name: Joi.string().min(2).max(100).trim(),
  description: Joi.string().max(1000).allow('', null),
  status: Joi.number().valid(0, 1),
  pagination: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20)
  })
};

// Validation schemas for different endpoints
const validationSchemas = {
  // Authentication
  login: Joi.object({
    username: Joi.string().required().messages({
      'any.required': 'Username is required'
    }),
    password: Joi.string().required().min(6).messages({
      'any.required': 'Password is required',
      'string.min': 'Password must be at least 6 characters'
    })
  }),

  sendOtp: Joi.object({
    mobile: commonSchemas.mobile.required().messages({
      'any.required': 'Mobile number is required'
    })
  }),

  verifyOtp: Joi.object({
    mobile: commonSchemas.mobile.required(),
    verification_sid: Joi.string().required(),
    otp: Joi.string().length(6).pattern(/^[0-9]+$/).required().messages({
      'string.length': 'OTP must be 6 digits',
      'string.pattern.base': 'OTP must contain only numbers'
    })
  }),

  // Profile
  updateProfile: Joi.object({
    full_name: commonSchemas.name.required(),
    email: commonSchemas.email.required(),
    mobile: commonSchemas.mobile.required(),
    address: Joi.string().max(500).allow('', null),
    country_id: commonSchemas.id.required(),
    state_id: commonSchemas.id.required(),
    city_id: commonSchemas.id.required(),
    interests: Joi.string().max(500).allow('', null),
    linkedin_url: Joi.string().uri().allow('', null),
    summary: Joi.string().max(1000).allow('', null)
  }),

  // Job
  saveJobInformation: Joi.object({
    job_title: commonSchemas.name.required(),
    company_name: commonSchemas.name.required(),
    job_description: commonSchemas.description.required(),
    job_type_id: commonSchemas.id.required(),
    pay_id: commonSchemas.id.required(),
    country_id: commonSchemas.id.required(),
    state_id: commonSchemas.id.required(),
    city_id: commonSchemas.id.required(),
    experience_required: Joi.number().integer().min(0).max(50),
    salary_min: Joi.number().positive().allow(null),
    salary_max: Joi.number().positive().allow(null),
    job_status: Joi.string().valid('active', 'inactive', 'closed').default('active')
  }),

  // Event
  saveEventInformation: Joi.object({
    event_title: commonSchemas.name.required(),
    event_description: commonSchemas.description.required(),
    event_date: Joi.date().iso().greater('now').required().messages({
      'date.greater': 'Event date must be in the future'
    }),
    event_mode_id: commonSchemas.id.required(),
    event_type_id: commonSchemas.id.required(),
    event_venue: Joi.string().max(200).allow('', null),
    country_id: commonSchemas.id.required(),
    state_id: commonSchemas.id.required(),
    city_id: commonSchemas.id.required(),
    event_lat: Joi.number().min(-90).max(90).allow(0, null),
    event_lng: Joi.number().min(-180).max(180).allow(0, null),
    event_link: Joi.string().uri().allow('', null)
  }),

  // Chat
  sendMessage: Joi.object({
    content: Joi.string().required().max(1000).messages({
      'any.required': 'Message content is required',
      'string.max': 'Message content cannot exceed 1000 characters'
    }),
    message_type: Joi.string().valid('text', 'image', 'file', 'location').default('text'),
    reply_to: Joi.number().integer().positive().allow(null)
  }),

  // Business Card
  createBusinessCard: Joi.object({
    full_name: commonSchemas.name.required(),
    company_name: commonSchemas.name.required(),
    job_title: commonSchemas.name.required(),
    email: commonSchemas.email.required(),
    mobile: commonSchemas.mobile.required(),
    website: Joi.string().uri().allow('', null),
    address: Joi.string().max(500).allow('', null),
    linkedin_url: Joi.string().uri().allow('', null),
    twitter_url: Joi.string().uri().allow('', null),
    facebook_url: Joi.string().uri().allow('', null),
    instagram_url: Joi.string().uri().allow('', null),
    bio: Joi.string().max(1000).allow('', null),
    skills: Joi.array().items(Joi.string()).max(20),
    interests: Joi.array().items(Joi.string()).max(20)
  }),

  // Service Unlock
  unlockService: Joi.object({
    service_id: commonSchemas.id.required(),
    unlock_type: Joi.string().valid('contact', 'profile', 'full').required(),
    payment_method: Joi.string().valid('stripe', 'paypal', 'razorpay').required(),
    payment_token: Joi.string().required()
  }),

  // Contact
  addContact: Joi.object({
    full_name: commonSchemas.name.required(),
    email: commonSchemas.email.allow('', null),
    mobile: commonSchemas.mobile.allow('', null),
    company: Joi.string().max(100).allow('', null),
    job_title: Joi.string().max(100).allow('', null),
    address: Joi.string().max(500).allow('', null),
    notes: Joi.string().max(1000).allow('', null),
    tags: Joi.array().items(Joi.string()).max(10),
    folder_id: Joi.number().integer().positive().allow(null)
  }),

  // Master Data
  addMasterDataItem: Joi.object({
    name: commonSchemas.name.required(),
    code: Joi.string().max(50).allow('', null),
    description: commonSchemas.description,
    parent_id: commonSchemas.id.allow(null),
    sort_order: Joi.number().integer().min(0).default(0),
    is_active: Joi.boolean().default(true)
  })
};

/**
 * Generic validation middleware
 * @param {Object} schema - Joi validation schema
 * @returns {Function} Express middleware function
 */
function validate(schema) {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
      allowUnknown: false
    });

    if (error) {
      const errors = error.details.reduce((acc, detail) => {
        const field = detail.path.join('.');
        acc[field] = detail.message;
        return acc;
      }, {});

      return validationError(res, 'Validation failed', errors);
    }

    // Replace req.body with validated data
    req.body = value;
    next();
  };
}

/**
 * Validate query parameters
 * @param {Object} schema - Joi validation schema
 * @returns {Function} Express middleware function
 */
function validateQuery(schema) {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.query, {
      abortEarly: false,
      stripUnknown: true,
      allowUnknown: false
    });

    if (error) {
      const errors = error.details.reduce((acc, detail) => {
        const field = detail.path.join('.');
        acc[field] = detail.message;
        return acc;
      }, {});

      return validationError(res, 'Query validation failed', errors);
    }

    // Replace req.query with validated data
    req.query = value;
    next();
  };
}

/**
 * Validate URL parameters
 * @param {Object} schema - Joi validation schema
 * @returns {Function} Express middleware function
 */
function validateParams(schema) {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.params, {
      abortEarly: false,
      stripUnknown: true,
      allowUnknown: false
    });

    if (error) {
      const errors = error.details.reduce((acc, detail) => {
        const field = detail.path.join('.');
        acc[field] = detail.message;
        return acc;
      }, {});

      return validationError(res, 'Parameter validation failed', errors);
    }

    // Replace req.params with validated data
    req.params = value;
    next();
  };
}

module.exports = {
  validate,
  validateQuery,
  validateParams,
  validationSchemas,
  commonSchemas
};
