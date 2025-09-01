'use strict';

const rateLimit = require('express-rate-limit');
const slowDown = require('express-slow-down');
const { logger } = require('../utils/logger');

// General API rate limiting
const apiLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 200, // limit each IP to 200 requests per windowMs (increased from 100)
  message: {
    status: false,
    message: 'Too many requests from this IP, please try again later.',
    rcode: 429
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  handler: (req, res) => {
    logger.warn(`Rate limit exceeded for IP: ${req.ip}`);
    res.status(429).json({
      status: false,
      message: 'Too many requests from this IP, please try again later.',
      rcode: 429
    });
  }
});

// Stricter rate limiting for authentication endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 requests per windowMs
  message: {
    status: false,
    message: 'Too many authentication attempts, please try again later.',
    rcode: 429
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn(`Auth rate limit exceeded for IP: ${req.ip}`);
    res.status(429).json({
      status: false,
      message: 'Too many authentication attempts, please try again later.',
      rcode: 429
    });
  }
});

// Rate limiting for file uploads
const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // limit each IP to 10 uploads per hour
  message: {
    status: false,
    message: 'Too many file uploads, please try again later.',
    rcode: 429
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn(`Upload rate limit exceeded for IP: ${req.ip}`);
    res.status(429).json({
      status: false,
      message: 'Too many file uploads, please try again later.',
      rcode: 429
    });
  }
});

// Rate limiting for OTP requests
const otpLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // limit each IP to 3 OTP requests per hour
  message: {
    status: false,
    message: 'Too many OTP requests, please try again later.',
    rcode: 429
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn(`OTP rate limit exceeded for IP: ${req.ip}`);
    res.status(429).json({
      status: false,
      message: 'Too many OTP requests, please try again later.',
      rcode: 429
    });
  }
});

// Rate limiting for search endpoints
const searchLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30, // limit each IP to 30 search requests per 15 minutes
  message: {
    status: false,
    message: 'Too many search requests, please try again later.',
    rcode: 429
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn(`Search rate limit exceeded for IP: ${req.ip}`);
    res.status(429).json({
      status: false,
      message: 'Too many search requests, please try again later.',
      rcode: 429
    });
  }
});

// Rate limiting for payment endpoints
const paymentLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // limit each IP to 20 payment requests per 15 minutes
  message: {
    status: false,
    message: 'Too many payment requests, please try again later.',
    rcode: 429
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn(`Payment rate limit exceeded for IP: ${req.ip}`);
    res.status(429).json({
      status: false,
      message: 'Too many payment requests, please try again later.',
      rcode: 429
    });
  }
});

// Slow down responses for repeated requests
const speedLimiter = slowDown({
  windowMs: 15 * 60 * 1000, // 15 minutes
  delayAfter: 50, // allow 50 requests per 15 minutes, then...
  delayMs: () => 500 // begin adding 500ms of delay per request above 50
});

// Dynamic rate limiting based on user role
const dynamicLimiter = (req, res, next) => {
  const user = req.user;
  
  if (!user) {
    // Guest users get stricter limits
    return rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 30
    })(req, res, next);
  }

  // Premium users get higher limits
  if (user.role_id === 2) { // Assuming role_id 2 is premium
    return rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 200
    })(req, res, next);
  }

  // Regular users get standard limits
  return rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100
  })(req, res, next);
};

// Rate limiting for specific endpoints
const endpointSpecificLimiters = {
  // Chat endpoints - allow more frequent requests
  chat: rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 20 // 20 chat messages per minute
  }),

  // Search endpoints - moderate limits
  search: rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 10 // 10 searches per minute
  }),

  // Profile updates - increased limits for mobile app
  profile: rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 50 // 50 profile requests per 15 minutes (increased from 5)
  })
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
