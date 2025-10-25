'use strict';

const jwt = require('jsonwebtoken');
const { query } = require('../config/db');
const { errorResponse, unauthorized } = require('../utils/response');
const { logger } = require('../utils/logger');

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-key';

// Generate JWT token
function generateToken(payload, expiresIn = process.env.JWT_EXPIRES_IN || '24h') {
  return jwt.sign(payload, JWT_SECRET, { expiresIn });
}

// Generate refresh token
function generateRefreshToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { 
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' 
  });
}

// Verify JWT token
function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    logger.error('Token verification failed:', error.message);
    return null;
  }
}

// Main authentication middleware
async function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return unauthorized(res, 'Access token required');
    }

    const token = authHeader.substring(7);
    const decoded = verifyToken(token);
    
    if (!decoded) {
      return unauthorized(res, 'Invalid or expired token');
    }

    // Get user details from database
    const [user] = await query(
      'SELECT user_id, username, email, mobile, role_id, status FROM users WHERE user_id = ? AND status = 1',
      [decoded.user_id]
    );

    if (!user) {
      return unauthorized(res, 'User not found or inactive');
    }

    req.user = {
      id: user.user_id,
      username: user.username,
      email: user.email,
      mobile: user.mobile,
      role_id: user.role_id,
      status: user.status
    };

    next();
  } catch (error) {
    logger.error('Authentication error:', error);
    return errorResponse(res, 'Authentication failed', 500);
  }
}

// Role-based access control
function requireRole(roles) {
  return (req, res, next) => {
    if (!req.user) {
      return unauthorized(res, 'Authentication required');
    }

    const userRole = req.user.role_id;
    if (!roles.includes(userRole)) {
      return errorResponse(res, 'Insufficient permissions', 403);
    }

    next();
  };
}

// Optional authentication (for endpoints that work with or without auth)
function optionalAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      req.user = null;
      return next();
    }

    const token = authHeader.substring(7);
    const decoded = verifyToken(token);
    
    if (decoded) {
      // Get user details from database
      query(
        'SELECT user_id, username, email, mobile, role_id, status FROM users WHERE user_id = ? AND status = 1',
        [decoded.user_id]
      ).then(([user]) => {
        if (user) {
          req.user = {
            id: user.user_id,
            username: user.username,
            email: user.email,
            mobile: user.mobile,
            role_id: user.role_id,
            status: user.status
          };
        }
        next();
      }).catch(() => {
        req.user = null;
        next();
      });
    } else {
      req.user = null;
      next();
    }
  } catch (error) {
    logger.error('Optional authentication error:', error);
    req.user = null;
    next();
  }
}

// Rate limiting for authentication endpoints
function authRateLimit(req, res, next) {
  // This would typically integrate with express-rate-limit
  // For now, just pass through
  next();
}

module.exports = {
  generateToken,
  generateRefreshToken,
  verifyToken,
  authenticate,
  requireRole,
  optionalAuth,
  authRateLimit
};
