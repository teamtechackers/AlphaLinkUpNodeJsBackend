'use strict';

const rateLimit = require('express-rate-limit');
const slowDown = require('express-slow-down');
const { logger } = require('../utils/logger');

// General API rate limiting - DISABLED for testing
const apiLimiter = (req, res, next) => {
  // Rate limiting completely disabled
  next();
};

// Authentication rate limiting - DISABLED for testing
const authLimiter = (req, res, next) => {
  // Rate limiting completely disabled
  next();
};

// File upload rate limiting - DISABLED for testing
const uploadLimiter = (req, res, next) => {
  // Rate limiting completely disabled
  next();
};

// OTP rate limiting - DISABLED for testing
const otpLimiter = (req, res, next) => {
  // Rate limiting completely disabled
  next();
};

// Search rate limiting - DISABLED for testing
const searchLimiter = (req, res, next) => {
  // Rate limiting completely disabled
  next();
};

// Payment rate limiting - DISABLED for testing
const paymentLimiter = (req, res, next) => {
  // Rate limiting completely disabled
  next();
};

// Speed limiter - DISABLED for testing
const speedLimiter = (req, res, next) => {
  // Rate limiting completely disabled
  next();
};

// Dynamic rate limiting - DISABLED for testing
const dynamicLimiter = (req, res, next) => {
  // Rate limiting completely disabled
  next();
};

// Endpoint specific limiters - DISABLED for testing
const endpointSpecificLimiters = {
  // All rate limiting disabled
  chat: (req, res, next) => next(),
  search: (req, res, next) => next(),
  profile: (req, res, next) => next()
};

// Middleware to apply rate limiting based on endpoint
const applyEndpointLimiting = (endpointType) => {
  return (req, res, next) => {
    const limiter = endpointSpecificLimiters[endpointType];
    if (limiter) {
      return limiter(req, res, next);
    }
    next();
  };
};

// Whitelist certain IPs (for development/testing)
const whitelistIPs = (req, res, next) => {
  const whitelistedIPs = process.env.WHITELISTED_IPS ? 
    process.env.WHITELISTED_IPS.split(',') : [];
  
  if (whitelistedIPs.includes(req.ip)) {
    req.isWhitelisted = true;
  }
  
  next();
};

// Skip rate limiting for whitelisted IPs
const skipRateLimitForWhitelist = (limiter) => {
  return (req, res, next) => {
    if (req.isWhitelisted) {
      return next();
    }
    return limiter(req, res, next);
  };
};

module.exports = {
  apiLimiter: skipRateLimitForWhitelist(apiLimiter),
  authLimiter: skipRateLimitForWhitelist(authLimiter),
  uploadLimiter: skipRateLimitForWhitelist(uploadLimiter),
  otpLimiter: skipRateLimitForWhitelist(otpLimiter),
  searchLimiter: skipRateLimitForWhitelist(searchLimiter),
  paymentLimiter: skipRateLimitForWhitelist(paymentLimiter),
  speedLimiter: skipRateLimitForWhitelist(speedLimiter),
  dynamicLimiter,
  applyEndpointLimiting,
  whitelistIPs
};
