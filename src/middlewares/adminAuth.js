'use strict';

const { logger } = require('../utils/logger');
const { errorResponse, unauthorized, forbidden } = require('../utils/response');

/**
 * Middleware to check if the authenticated user has admin privileges
 */
const adminAuth = async (req, res, next) => {
  try {
    // Check if user exists (should be set by authenticate middleware)
    if (!req.user) {
      return unauthorized(res, 'Authentication required');
    }

    // Check if user has admin role (role_id 1 is typically admin)
    if (!req.user.role_id || req.user.role_id !== 1) {
      logger.warn(`Non-admin user ${req.user.id} attempted to access admin route: ${req.originalUrl}`);
      return forbidden(res, 'Admin access required');
    }

    // Check if admin account is active
    if (req.user.status !== 1) {
      logger.warn(`Inactive admin user ${req.user.id} attempted to access admin route: ${req.originalUrl}`);
      return forbidden(res, 'Admin account is not active');
    }

    // Check if admin has required permissions for specific routes
    const requiredPermissions = getRequiredPermissions(req.method, req.route?.path);
    if (requiredPermissions && requiredPermissions.length > 0) {
      const hasPermission = await checkUserPermissions(req.user.id, requiredPermissions);
      if (!hasPermission) {
        logger.warn(`Admin user ${req.user.id} lacks required permissions for route: ${req.originalUrl}`);
        return forbidden(res, 'Insufficient permissions');
      }
    }

    // Admin authentication successful
    logger.debug(`Admin user ${req.user.id} authenticated for route: ${req.originalUrl}`);
    next();
  } catch (error) {
    logger.error('Admin authentication error:', error);
    return errorResponse(res, 'Admin authentication failed', 500);
  }
};

/**
 * Get required permissions for a specific route
 */
const getRequiredPermissions = (method, path) => {
  // Define route-specific permissions
  const routePermissions = {
    'GET /dashboard': ['view_dashboard'],
    'GET /users': ['view_users'],
    'PUT /users/:userId/status': ['manage_users'],
    'PUT /users/bulk-status': ['manage_users'],
    'GET /moderation': ['view_moderation'],
    'PUT /reports/:reportId/assign': ['assign_reports'],
    'PUT /reports/:reportId/status': ['update_reports'],
    'GET /notifications': ['view_notifications'],
    'POST /notifications': ['send_notifications'],
    'GET /activity-log': ['view_activity_log'],
    'POST /activity-log': ['log_actions'],
    'GET /system/health': ['view_system_health'],
    'GET /system/performance': ['view_performance_metrics'],
    'GET /analytics/users': ['view_user_analytics'],
    'GET /analytics/business': ['view_business_analytics'],
    'GET /export': ['export_data'],
    'GET /permissions': ['view_permissions'],
    'PUT /profile': ['manage_profile'],
    'PUT /change-password': ['manage_profile'],
    'GET /stats': ['view_statistics']
  };

  const routeKey = `${method} ${path}`;
  return routePermissions[routeKey] || [];
};

/**
 * Check if user has required permissions
 */
const checkUserPermissions = async (userId, requiredPermissions) => {
  try {
    // This would typically check against a permissions database
    // For now, we'll assume all admins have basic permissions
    // In a real implementation, you would:
    // 1. Query the user's permissions from the database
    // 2. Check if they have all required permissions
    // 3. Return true/false accordingly
    
    // Placeholder implementation
    return true;
  } catch (error) {
    logger.error('Permission check error:', error);
    return false;
  }
};

module.exports = adminAuth;
