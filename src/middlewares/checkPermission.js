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

      // Debug logging to help identify why access is denied
      logger.debug(`checkPermission: Checking key "${permissionKey}" for user_id: ${user_id}`);

      if (!user_id || !token) {
        logger.warn(`Permission check failed: Missing user_id or token for ${permissionKey}`);
        return res.json({
          status: false,
          rcode: 403,
          message: 'Authentication required'
        });
      }

      const decodedUserId = idDecode(user_id);
      if (!decodedUserId) {
        logger.warn(`Permission check failed: Invalid user ID format for ${permissionKey}`);
        return res.json({
          status: false,
          rcode: 403,
          message: 'Invalid user ID'
        });
      }

      // Check if this user is an admin FIRST
      const adminRows = await query(
        'SELECT * FROM admin_users WHERE id = ? LIMIT 1',
        [decodedUserId]
      );

      if (!adminRows.length) {
        logger.warn(`Permission check failed: User ${decodedUserId} is not in admin_users table`);
        return res.json({
          status: false,
          rcode: 403,
          message: 'Access denied. Admin only.'
        });
      }

      const admin = adminRows[0];

      // Validate Admin Token
      if (admin.token !== token) {
        // Fallback to older mechanism in case token is only in users table for old sessions
        const legacyCheck = await query('SELECT unique_token FROM users WHERE user_id = ? LIMIT 1', [decodedUserId]);
        if (!legacyCheck.length || legacyCheck[0].unique_token !== token) {
           logger.warn(`Permission check failed: Token mismatch for admin ${decodedUserId}`);
           return res.json({
             status: false,
             rcode: 403,
             message: 'Invalid admin token'
           });
        }
      }

      // Grab users context if available, otherwise fallback to admin ID
      const userRows = await query('SELECT * FROM users WHERE user_id = ? LIMIT 1', [decodedUserId]);
      const user = userRows.length > 0 ? userRows[0] : { user_id: decodedUserId };

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
        logger.warn(`Permission Denied: Admin ${decodedUserId} ("${admin.username}") does not have "${permissionKey}" permission`);
        return res.json({
          status: false,
          rcode: 403,
          message: `Access denied. Required permission: ${permissionKey}`
        });
      }

      logger.info(`Permission Granted: Admin ${decodedUserId} accessing "${permissionKey}"`);
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

    // Check if user is SuperAdmin FIRST
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

    const admin = adminRows[0];

    // Validate Admin Token
    if (admin.token !== token) {
      // Fallback
      const legacyCheck = await query('SELECT unique_token FROM users WHERE user_id = ? LIMIT 1', [decodedUserId]);
      if (!legacyCheck.length || legacyCheck[0].unique_token !== token) {
         return res.json({
           status: false,
           rcode: 403,
           message: 'Invalid admin token'
         });
      }
    }

    const userRows = await query(
      'SELECT * FROM users WHERE user_id = ? LIMIT 1',
      [decodedUserId]
    );
    const user = userRows.length > 0 ? userRows[0] : { id: decodedUserId };

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

/**
 * Middleware to check if user is ANY admin (super or sub)
 * Use this for routes that any authenticated admin should access.
 */
const requireAdmin = async (req, res, next) => {
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

    // Check if user is ANY admin (super or sub)
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

    // Validate Admin Token
    if (admin.token !== token) {
      const legacyCheck = await query('SELECT unique_token FROM users WHERE user_id = ? LIMIT 1', [decodedUserId]);
      if (!legacyCheck.length || legacyCheck[0].unique_token !== token) {
        return res.json({
          status: false,
          rcode: 403,
          message: 'Invalid admin token'
        });
      }
    }

    const userRows = await query(
      'SELECT * FROM users WHERE user_id = ? LIMIT 1',
      [decodedUserId]
    );
    const user = userRows.length > 0 ? userRows[0] : { id: decodedUserId };

    req.admin = admin;
    req.user = user;
    req.isSuperAdmin = admin.is_super_admin === 1;
    next();

  } catch (error) {
    logger.error('Admin auth check error:', error);
    return res.json({
      status: false,
      rcode: 500,
      message: 'Authorization check failed'
    });
  }
};

module.exports = {
  checkPermission,
  requireSuperAdmin,
  requireAdmin
};
