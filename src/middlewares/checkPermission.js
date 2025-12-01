'use strict';

const { query } = require('../config/db');
const { idDecode } = require('../utils/idCodec');
const { logger } = require('../utils/logger');

/**
 * Middleware to check if admin has specific permission
 * @param {string} permissionKey - Permission key to check (e.g., 'users.edit')
 */
const checkPermission = (permissionKey) => {
  return async (req, res, next) => {
    try {
      const { user_id, token } = {
        ...req.query,
        ...req.body
      };

      // Debug logging
      logger.debug(`checkPermission called for: ${permissionKey}`);
      logger.debug(`user_id: ${user_id}, token: ${token ? 'present' : 'missing'}`);
      logger.debug(`req.body:`, req.body);
      logger.debug(`req.query:`, req.query);

      if (!user_id || !token) {
        return res.json({
          status: false,
          rcode: 403,
          message: 'Authentication required'
        });
      }

      const decodedUserId = idDecode(user_id);
      if (!decodedUserId) {
        return res.json({
          status: false,
          rcode: 403,
          message: 'Invalid user ID'
        });
      }

      // First check if user exists in users table and get their data
      const userRows = await query(
        'SELECT * FROM users WHERE user_id = ? LIMIT 1',
        [decodedUserId]
      );

      if (!userRows.length) {
        return res.json({
          status: false,
          rcode: 403,
          message: 'User not found'
        });
      }

      const user = userRows[0];

      // Validate token
      if (user.unique_token !== token) {
        return res.json({
          status: false,
          rcode: 403,
          message: 'Invalid token'
        });
      }

      // Check if this user is an admin
      const adminRows = await query(
        'SELECT * FROM admin_users WHERE id = ? LIMIT 1',
        [decodedUserId]
      );

      if (!adminRows.length) {
        return res.json({
          status: false,
          rcode: 403,
          message: 'Access denied. Admin only.'
        });
      }

      const admin = adminRows[0];

      // SuperAdmin has all permissions - BYPASS ALL CHECKS
      if (admin.is_super_admin === 1) {
        req.admin = admin;
        req.user = user;
        req.isSuperAdmin = true;
        return next();
      }

      // Check if SubAdmin has the required permission
      const permissionCheck = await query(
        `SELECT aup.* 
         FROM admin_user_permissions aup
         JOIN admin_permissions ap ON aup.permission_id = ap.permission_id
         WHERE aup.admin_user_id = ? AND ap.permission_key = ?
         LIMIT 1`,
        [decodedUserId, permissionKey]
      );

      if (permissionCheck.length === 0) {
        logger.warn(`Permission denied for admin ${decodedUserId}: ${permissionKey}`);
        return res.json({
          status: false,
          rcode: 403,
          message: `Access denied. Required permission: ${permissionKey}`
        });
      }

      req.admin = admin;
      req.user = user;
      req.isSuperAdmin = false;
      next();

    } catch (error) {
      logger.error('Permission check error:', error);
      return res.json({
        status: false,
        rcode: 500,
        message: 'Permission check failed'
      });
    }
  };
};

/**
 * Middleware to check if user is SuperAdmin only
 */
const requireSuperAdmin = async (req, res, next) => {
  try {
    const { user_id, token } = {
      ...req.query,
      ...req.body
    };

    if (!user_id || !token) {
      return res.json({
        status: false,
        rcode: 403,
        message: 'Authentication required'
      });
    }

    const decodedUserId = idDecode(user_id);
    if (!decodedUserId) {
      return res.json({
        status: false,
        rcode: 403,
        message: 'Invalid user ID'
      });
    }

    // First check if user exists in users table and validate token
    const userRows = await query(
      'SELECT * FROM users WHERE user_id = ? LIMIT 1',
      [decodedUserId]
    );

    if (!userRows.length) {
      return res.json({
        status: false,
        rcode: 403,
        message: 'User not found'
      });
    }

    const user = userRows[0];

    // Validate token
    if (user.unique_token !== token) {
      return res.json({
        status: false,
        rcode: 403,
        message: 'Invalid token'
      });
    }

    // Check if user is SuperAdmin
    const adminRows = await query(
      'SELECT * FROM admin_users WHERE id = ? AND is_super_admin = 1 LIMIT 1',
      [decodedUserId]
    );

    if (!adminRows.length) {
      return res.json({
        status: false,
        rcode: 403,
        message: 'Access denied. SuperAdmin only.'
      });
    }

    req.admin = adminRows[0];
    req.user = user;
    req.isSuperAdmin = true;
    next();

  } catch (error) {
    logger.error('SuperAdmin check error:', error);
    return res.json({
      status: false,
      rcode: 500,
      message: 'Authorization check failed'
    });
  }
};

module.exports = {
  checkPermission,
  requireSuperAdmin
};
