'use strict';

const AdminService = require('../services/AdminService');
const UserService = require('../services/UserService');
const JobService = require('../services/JobService');
const EventService = require('../services/EventService');
const ReportService = require('../services/ReportService');
const NotificationService = require('../services/NotificationService');
const AnalyticsService = require('../services/AnalyticsService');
const { logger } = require('../utils/logger');
const { successResponse, errorResponse } = require('../utils/response');

class AdminController {
  // Admin login
  static async adminLogin(req, res) {
    try {
      const { email, password } = req.body;
      
      // Validate required fields
      if (!email || !password) {
        return errorResponse(res, 'Email and password are required', 400);
      }

      const result = await AdminService.adminLogin(email, password);
      
      logger.info(`Admin login successful: ${email}`);
      return successResponse(res, 'Admin login successful', { 
        admin: result.admin,
        token: result.token 
      });
    } catch (error) {
      logger.error('Admin login error:', error);
      
      if (error.message.includes('Invalid credentials')) {
        return errorResponse(res, 'Invalid email or password', 401);
      }
      
      if (error.message.includes('Account not found')) {
        return errorResponse(res, 'Admin account not found', 404);
      }
      
      if (error.message.includes('Account disabled')) {
        return errorResponse(res, 'Account is disabled', 403);
      }
      
      return errorResponse(res, 'Admin login failed', 500);
    }
  }

  // Get admin dashboard data
  static async getDashboardData(req, res) {
    try {
      const adminId = req.user.id;
      const { period = '30d' } = req.query;

      const dashboardData = await AdminService.getDashboardData(adminId, period);
      
      return successResponse(res, 'Dashboard data retrieved successfully', { dashboardData });
    } catch (error) {
      logger.error('Get dashboard data error:', error);
      
      if (error.message.includes('not authorized')) {
        return errorResponse(res, 'You are not authorized to access dashboard data', 403);
      }
      
      return errorResponse(res, 'Failed to retrieve dashboard data', 500);
    }
  }

  // Get platform overview statistics
  static async getPlatformOverview(req, res) {
    try {
      const adminId = req.user.id;
      const { startDate, endDate } = req.query;

      const overview = await AnalyticsService.getPlatformOverview({
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null
      });
      
      return successResponse(res, 'Platform overview retrieved successfully', { overview });
    } catch (error) {
      logger.error('Get platform overview error:', error);
      
      if (error.message.includes('not authorized')) {
        return errorResponse(res, 'You are not authorized to access platform overview', 403);
      }
      
      return errorResponse(res, 'Failed to retrieve platform overview', 500);
    }
  }

  // Get user management data
  static async getUserManagementData(req, res) {
    try {
      const adminId = req.user.id;
      const { page = 1, limit = 20, status, role, search, sort_by = 'created_at', sort_order = 'desc' } = req.query;

      const users = await AdminService.getUserManagementData(adminId, {
        page: parseInt(page),
        limit: parseInt(limit),
        status,
        role,
        search,
        sortBy: sort_by,
        sortOrder: sort_order
      });
      
      return successResponse(res, 'User management data retrieved successfully', { users });
    } catch (error) {
      logger.error('Get user management data error:', error);
      
      if (error.message.includes('not authorized')) {
        return errorResponse(res, 'You are not authorized to access user management data', 403);
      }
      
      return errorResponse(res, 'Failed to retrieve user management data', 500);
    }
  }

  // Update user status
  static async updateUserStatus(req, res) {
    try {
      const adminId = req.user.id;
      const { userId } = req.params;
      const { status, reason } = req.body;

      if (!status) {
        return errorResponse(res, 'Status is required', 400);
      }

      const updatedUser = await AdminService.updateUserStatus(adminId, userId, { status, reason });
      
      // Send notification to user about status change
      try {
        await NotificationService.createNotification({
          user_id: userId,
          type: 'account_status_changed',
          title: 'Account Status Updated',
          message: `Your account status has been changed to ${status}.`,
          data: { status, reason, updatedBy: adminId }
        });
      } catch (notificationError) {
        logger.warn('Failed to send status change notification:', notificationError);
      }
      
      logger.info(`User ${userId} status updated to ${status} by admin ${adminId}`);
      return successResponse(res, 'User status updated successfully', { user: updatedUser });
    } catch (error) {
      logger.error('Update user status error:', error);
      
      if (error.message.includes('User not found')) {
        return errorResponse(res, 'User not found', 404);
      }
      
      if (error.message.includes('not authorized')) {
        return errorResponse(res, 'You are not authorized to update user status', 403);
      }
      
      if (error.message.includes('Invalid status')) {
        return errorResponse(res, 'Invalid user status', 400);
      }
      
      return errorResponse(res, 'Failed to update user status', 500);
    }
  }

  // Bulk update user status
  static async bulkUpdateUserStatus(req, res) {
    try {
      const adminId = req.user.id;
      const { userIds, status, reason } = req.body;

      if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
        return errorResponse(res, 'User IDs array is required', 400);
      }

      if (!status) {
        return errorResponse(res, 'Status is required', 400);
      }

      const result = await AdminService.bulkUpdateUserStatus(adminId, userIds, { status, reason });
      
      // Send notifications to users about status changes
      try {
        for (const userId of userIds) {
          await NotificationService.createNotification({
            user_id: userId,
            type: 'account_status_changed',
            title: 'Account Status Updated',
            message: `Your account status has been changed to ${status}.`,
            data: { status, reason, updatedBy: adminId }
          });
        }
      } catch (notificationError) {
        logger.warn('Failed to send bulk status change notifications:', notificationError);
      }
      
      logger.info(`Bulk user status update: ${userIds.length} users updated to ${status} by admin ${adminId}`);
      return successResponse(res, 'User statuses updated successfully', { result });
    } catch (error) {
      logger.error('Bulk update user status error:', error);
      
      if (error.message.includes('not authorized')) {
        return errorResponse(res, 'You are not authorized to perform bulk user updates', 403);
      }
      
      if (error.message.includes('Invalid status')) {
        return errorResponse(res, 'Invalid user status', 400);
      }
      
      return errorResponse(res, 'Failed to update user statuses', 500);
    }
  }

  // Get content moderation data
  static async getContentModerationData(req, res) {
    try {
      const adminId = req.user.id;
      const { page = 1, limit = 20, status, priority, type, assignedTo, sort_by = 'created_at', sort_order = 'desc' } = req.query;

      const reports = await ReportService.getReports({
        page: parseInt(page),
        limit: parseInt(limit),
        status,
        priority,
        type,
        assignedTo,
        sortBy: sort_by,
        sortOrder: sort_order
      });
      
      return successResponse(res, 'Content moderation data retrieved successfully', { reports });
    } catch (error) {
      logger.error('Get content moderation data error:', error);
      
      if (error.message.includes('not authorized')) {
        return errorResponse(res, 'You are not authorized to access content moderation data', 403);
      }
      
      return errorResponse(res, 'Failed to retrieve content moderation data', 500);
    }
  }

  // Assign report to admin
  static async assignReportToAdmin(req, res) {
    try {
      const adminId = req.user.id;
      const { reportId } = req.params;
      const { assignedToAdminId, notes } = req.body;

      if (!assignedToAdminId) {
        return errorResponse(res, 'Assigned admin ID is required', 400);
      }

      const result = await ReportService.assignReportToAdmin(reportId, assignedToAdminId, adminId);
      
      logger.info(`Report ${reportId} assigned to admin ${assignedToAdminId} by admin ${adminId}`);
      return successResponse(res, 'Report assigned successfully', { result });
    } catch (error) {
      logger.error('Assign report to admin error:', error);
      
      if (error.message.includes('Report not found')) {
        return errorResponse(res, 'Report not found', 404);
      }
      
      if (error.message.includes('not authorized')) {
        return errorResponse(res, 'You are not authorized to assign reports', 403);
      }
      
      return errorResponse(res, 'Failed to assign report', 500);
    }
  }

  // Update report status
  static async updateReportStatus(req, res) {
    try {
      const adminId = req.user.id;
      const { reportId } = req.params;
      const { status, notes } = req.body;

      if (!status) {
        return errorResponse(res, 'Status is required', 400);
      }

      const updatedReport = await ReportService.updateReportStatus(reportId, status, adminId, notes);
      
      logger.info(`Report ${reportId} status updated to ${status} by admin ${adminId}`);
      return successResponse(res, 'Report status updated successfully', { report: updatedReport });
    } catch (error) {
      logger.error('Update report status error:', error);
      
      if (error.message.includes('Report not found')) {
        return errorResponse(res, 'Report not found', 404);
      }
      
      if (error.message.includes('not authorized')) {
        return errorResponse(res, 'You are not authorized to update report status', 403);
      }
      
      if (error.message.includes('Invalid status')) {
        return errorResponse(res, 'Invalid report status', 400);
      }
      
      return errorResponse(res, 'Failed to update report status', 500);
    }
  }

  // Get system notifications
  static async getSystemNotifications(req, res) {
    try {
      const adminId = req.user.id;
      const { page = 1, limit = 20, type, status, sort_by = 'created_at', sort_order = 'desc' } = req.query;

      const notifications = await AdminService.getSystemNotifications(adminId, {
        page: parseInt(page),
        limit: parseInt(limit),
        type,
        status,
        sortBy: sort_by,
        sortOrder: sort_order
      });
      
      return successResponse(res, 'System notifications retrieved successfully', { notifications });
    } catch (error) {
      logger.error('Get system notifications error:', error);
      
      if (error.message.includes('not authorized')) {
        return errorResponse(res, 'You are not authorized to access system notifications', 403);
      }
      
      return errorResponse(res, 'Failed to retrieve system notifications', 500);
    }
  }

  // Send system notification
  static async sendSystemNotification(req, res) {
    try {
      const adminId = req.user.id;
      const notificationData = req.body;
      
      // Validate required fields
      if (!notificationData.title || !notificationData.message || !notificationData.type) {
        return errorResponse(res, 'Title, message, and type are required', 400);
      }

      const notification = await AdminService.sendSystemNotification(adminId, notificationData);
      
      logger.info(`System notification sent by admin ${adminId}: ${notificationData.title}`);
      return successResponse(res, 'System notification sent successfully', { notification }, 201);
    } catch (error) {
      logger.error('Send system notification error:', error);
      
      if (error.message.includes('not authorized')) {
        return errorResponse(res, 'You are not authorized to send system notifications', 403);
      }
      
      if (error.message.includes('Validation failed')) {
        return errorResponse(res, error.message, 400);
      }
      
      return errorResponse(res, 'Failed to send system notification', 500);
    }
  }

  // Get admin activity log
  static async getAdminActivityLog(req, res) {
    try {
      const adminId = req.user.id;
      const { page = 1, limit = 20, action, targetType, startDate, endDate, sort_by = 'created_at', sort_order = 'desc' } = req.query;

      const activities = await AdminService.getAdminActivityLog(adminId, {
        page: parseInt(page),
        limit: parseInt(limit),
        action,
        targetType,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        sortBy: sort_by,
        sortOrder: sort_order
      });
      
      return successResponse(res, 'Admin activity log retrieved successfully', { activities });
    } catch (error) {
      logger.error('Get admin activity log error:', error);
      
      if (error.message.includes('not authorized')) {
        return errorResponse(res, 'You are not authorized to access admin activity log', 403);
      }
      
      return errorResponse(res, 'Failed to retrieve admin activity log', 500);
    }
  }

  // Get system health data
  static async getSystemHealth(req, res) {
    try {
      const adminId = req.user.id;

      const healthData = await AdminService.getSystemHealth(adminId);
      
      return successResponse(res, 'System health data retrieved successfully', { healthData });
    } catch (error) {
      logger.error('Get system health error:', error);
      
      if (error.message.includes('not authorized')) {
        return errorResponse(res, 'You are not authorized to access system health data', 403);
      }
      
      return errorResponse(res, 'Failed to retrieve system health data', 500);
    }
  }

  // Get performance metrics
  static async getPerformanceMetrics(req, res) {
    try {
      const adminId = req.user.id;
      const { startDate, endDate, groupBy } = req.query;

      const metrics = await AnalyticsService.getPerformanceMetrics({
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        groupBy: groupBy || 'hour'
      });
      
      return successResponse(res, 'Performance metrics retrieved successfully', { metrics });
    } catch (error) {
      logger.error('Get performance metrics error:', error);
      
      if (error.message.includes('not authorized')) {
        return errorResponse(res, 'You are not authorized to access performance metrics', 403);
      }
      
      return errorResponse(res, 'Failed to retrieve performance metrics', 500);
    }
  }

  // Get user analytics
  static async getUserAnalytics(req, res) {
    try {
      const adminId = req.user.id;
      const { startDate, endDate, groupBy } = req.query;

      const analytics = await AnalyticsService.getUserAnalytics({
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        groupBy: groupBy || 'day'
      });
      
      return successResponse(res, 'User analytics retrieved successfully', { analytics });
    } catch (error) {
      logger.error('Get user analytics error:', error);
      
      if (error.message.includes('not authorized')) {
        return errorResponse(res, 'You are not authorized to access user analytics', 403);
      }
      
      return errorResponse(res, 'Failed to retrieve user analytics', 500);
    }
  }

  // Get business metrics
  static async getBusinessMetrics(req, res) {
    try {
      const adminId = req.user.id;
      const { startDate, endDate, groupBy } = req.query;

      const metrics = await AnalyticsService.getBusinessMetrics({
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        groupBy: groupBy || 'day'
      });
      
      return successResponse(res, 'Business metrics retrieved successfully', { metrics });
    } catch (error) {
      logger.error('Get business metrics error:', error);
      
      if (error.message.includes('not authorized')) {
        return errorResponse(res, 'You are not authorized to access business metrics', 403);
      }
      
      return errorResponse(res, 'Failed to retrieve business metrics', 500);
    }
  }

  // Export admin data
  static async exportAdminData(req, res) {
    try {
      const adminId = req.user.id;
      const { dataType, format = 'json', startDate, endDate, filters } = req.query;

      if (!dataType) {
        return errorResponse(res, 'Data type is required', 400);
      }

      const data = await AdminService.exportAdminData(adminId, {
        dataType,
        format,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        filters: filters ? JSON.parse(filters) : {}
      });

      if (format === 'json') {
        return successResponse(res, 'Admin data exported successfully', { data });
      } else {
        // For CSV format, set appropriate headers
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="admin_${dataType}.csv"`);
        return res.send(data);
      }
    } catch (error) {
      logger.error('Export admin data error:', error);
      
      if (error.message.includes('not authorized')) {
        return errorResponse(res, 'You are not authorized to export admin data', 403);
      }
      
      if (error.message.includes('Invalid data type')) {
        return errorResponse(res, 'Invalid data type', 400);
      }
      
      return errorResponse(res, 'Failed to export admin data', 500);
    }
  }

  // Get admin permissions
  static async getAdminPermissions(req, res) {
    try {
      const adminId = req.user.id;

      const permissions = await AdminService.getAdminPermissions(adminId);
      
      return successResponse(res, 'Admin permissions retrieved successfully', { permissions });
    } catch (error) {
      logger.error('Get admin permissions error:', error);
      
      if (error.message.includes('not authorized')) {
        return errorResponse(res, 'You are not authorized to access admin permissions', 403);
      }
      
      return errorResponse(res, 'Failed to retrieve admin permissions', 500);
    }
  }

  // Update admin profile
  static async updateAdminProfile(req, res) {
    try {
      const adminId = req.user.id;
      const updateData = req.body;

      if (Object.keys(updateData).length === 0) {
        return errorResponse(res, 'No update data provided', 400);
      }

      const updatedAdmin = await AdminService.updateAdminProfile(adminId, updateData);
      
      logger.info(`Admin profile updated by admin ${adminId}`);
      return successResponse(res, 'Admin profile updated successfully', { admin: updatedAdmin });
    } catch (error) {
      logger.error('Update admin profile error:', error);
      
      if (error.message.includes('Validation failed')) {
        return errorResponse(res, error.message, 400);
      }
      
      return errorResponse(res, 'Failed to update admin profile', 500);
    }
  }

  // Change admin password
  static async changeAdminPassword(req, res) {
    try {
      const adminId = req.user.id;
      const { currentPassword, newPassword } = req.body;

      if (!currentPassword || !newPassword) {
        return errorResponse(res, 'Current password and new password are required', 400);
      }

      await AdminService.changeAdminPassword(adminId, currentPassword, newPassword);
      
      logger.info(`Admin password changed by admin ${adminId}`);
      return successResponse(res, 'Password changed successfully');
    } catch (error) {
      logger.error('Change admin password error:', error);
      
      if (error.message.includes('Current password is incorrect')) {
        return errorResponse(res, 'Current password is incorrect', 400);
      }
      
      if (error.message.includes('Validation failed')) {
        return errorResponse(res, error.message, 400);
      }
      
      return errorResponse(res, 'Failed to change password', 500);
    }
  }

  // Get admin statistics
  static async getAdminStats(req, res) {
    try {
      const adminId = req.user.id;
      const { startDate, endDate } = req.query;

      const stats = await AdminService.getAdminStats(adminId, {
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null
      });
      
      return successResponse(res, 'Admin statistics retrieved successfully', { stats });
    } catch (error) {
      logger.error('Get admin stats error:', error);
      
      if (error.message.includes('not authorized')) {
        return errorResponse(res, 'You are not authorized to access admin statistics', 403);
      }
      
      return errorResponse(res, 'Failed to retrieve admin statistics', 500);
    }
  }

  // Log admin action
  static async logAdminAction(req, res) {
    try {
      const adminId = req.user.id;
      const { action, targetType, targetId, details } = req.body;

      if (!action) {
        return errorResponse(res, 'Action is required', 400);
      }

      const logEntry = await AdminService.logAdminAction(adminId, {
        action,
        targetType,
        targetId,
        details
      });
      
      logger.info(`Admin action logged: ${action} by admin ${adminId}`);
      return successResponse(res, 'Admin action logged successfully', { logEntry });
    } catch (error) {
      logger.error('Log admin action error:', error);
      return errorResponse(res, 'Failed to log admin action', 500);
    }
  }
}

module.exports = AdminController;
