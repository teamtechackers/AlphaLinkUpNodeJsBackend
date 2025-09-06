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
const { query } = require('../config/db');
const { idDecode, idEncode } = require('../utils/idCodec');

class AdminController {
  // Admin login - PHP compatible version
  static async adminLogin(req, res) {
    try {
      // Support both query parameters and form data
      const { username, password } = {
        ...req.query,
        ...req.body
      };
      
      console.log('adminLogin - Parameters:', { username, password });
      
      // Check if username and password are provided
      if (!username || !password) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'Username and password are required'
        });
      }
      
      // Get admin user details and validate
      const adminRows = await query('SELECT * FROM admin_users WHERE username = ? LIMIT 1', [username]);
      if (!adminRows.length) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'Invalid login credentials'
        });
      }
      
      const admin = adminRows[0];
      
      // Validate password (using MD5 to match PHP)
      const crypto = require('crypto');
      const hashedPassword = crypto.createHash('md5').update(password).digest('hex');
      
      if (hashedPassword !== admin.password) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'Invalid login credentials'
        });
      }
      
      // Get role details
      const roleRows = await query('SELECT * FROM roles WHERE id = ? LIMIT 1', [admin.role_id]);
      const role = roleRows.length > 0 ? roleRows[0] : null;
      
      // Update last login (if there's a last_login field in admin_users)
      try {
        await query('UPDATE admin_users SET last_login = NOW() WHERE id = ?', [admin.id]);
      } catch (error) {
        console.log('No last_login field in admin_users table');
      }
      
      // Return response in PHP format (matching exactly)
      return res.json({
        status: true,
        rcode: 200,
        user_id: admin.id,
        username: admin.username,
        role_id: admin.role_id,
        role_name: role ? role.role_name : '',
        message: 'Admin login successful'
      });
      
    } catch (error) {
      console.error('adminLogin error:', error);
      return res.json({
        status: false,
        rcode: 500,
        message: 'Admin login failed'
      });
    }
  }

  // Permission denied - PHP compatible version
  static async permissionDenied(req, res) {
    try {
      // Return response in PHP format (matching exactly)
      return res.json({
        status: false,
        rcode: 403,
        message: 'Permission denied',
        error: 'Access forbidden'
      });
      
    } catch (error) {
      console.error('permissionDenied error:', error);
      return res.json({
        status: false,
        rcode: 500,
        message: 'Permission denied error'
      });
    }
  }




  
    // Get admin dashboard data - PHP compatible version
  static async getDashboard(req, res) {
    try {
      // Support both query parameters and form data
      const { user_id, token } = {
        ...req.query,
        ...req.body
      };
      
      console.log('getDashboard - Parameters:', { user_id, token });
      
      // Check if user_id and token are provided
      if (!user_id || !token) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'user_id and token are required'
        });
      }
      
      // Decode user ID
      const decodedUserId = idDecode(user_id);
      if (!decodedUserId) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'Invalid user ID'
        });
      }
      
      // Get user details and validate
      const userRows = await query('SELECT * FROM users WHERE user_id = ? LIMIT 1', [decodedUserId]);
      if (!userRows.length) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'Not A Valid User'
        });
      }
      
      const user = userRows[0];
      
      // Validate token
      if (user.unique_token !== token) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'Token Mismatch Exception'
        });
      }
      
      // Check if user is admin (role_id = 1 or 2)
      const adminRows = await query('SELECT * FROM admin_users WHERE id = ? LIMIT 1', [decodedUserId]);
      if (!adminRows.length) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'Permission denied'
        });
      }
      
      // Get dashboard counts (matching PHP exactly)
      const countUsers = await query('SELECT COUNT(*) as count FROM users');
      const countJobs = await query('SELECT COUNT(*) as count FROM user_job_details WHERE deleted = 0');
      const countEvents = await query('SELECT COUNT(*) as count FROM user_event_details WHERE deleted = 0');
      const countService = await query('SELECT COUNT(*) as count FROM user_service_provider WHERE deleted = 0');
      const countInvestor = await query('SELECT COUNT(*) as count FROM user_investor WHERE deleted = 0');
      
      // Get recent jobs with location details (matching PHP exactly)
      const listJobs = await query(`
        SELECT 
          user_job_details.job_title,
          user_job_details.company_name,
          user_job_details.address,
          countries.name as country_name,
          states.name as state_name,
          cities.name as city_name
        FROM user_job_details
        LEFT JOIN countries ON countries.id = user_job_details.country_id
        LEFT JOIN states ON states.id = user_job_details.state_id
        LEFT JOIN cities ON cities.id = user_job_details.city_id
        WHERE user_job_details.deleted = 0
        ORDER BY user_job_details.job_id DESC
        LIMIT 5
      `);
      
      // Get recent investors with location details (matching PHP exactly)
      const listInvestor = await query(`
        SELECT 
          user_investor.reference_no,
          user_investor.name,
          user_investor.bio,
          countries.name as country_name,
          states.name as state_name,
          cities.name as city_name
        FROM user_investor
        LEFT JOIN countries ON countries.id = user_investor.country_id
        LEFT JOIN states ON states.id = user_investor.state_id
        LEFT JOIN cities ON cities.id = user_investor.city_id
        WHERE user_investor.deleted = 0
        ORDER BY user_investor.investor_id DESC
        LIMIT 5
      `);
      
      // Return response in PHP format (matching exactly)
      return res.json({
        status: true,
        rcode: 200,
        user_id: idEncode(decodedUserId),
        unique_token: token,
        count_users: countUsers[0]?.count || 0,
        count_jobs: countJobs[0]?.count || 0,
        count_events: countEvents[0]?.count || 0,
        count_service: countService[0]?.count || 0,
        count_investor: countInvestor[0]?.count || 0,
        list_jobs: listJobs || [],
        list_investor: listInvestor || [],
        message: 'Dashboard data retrieved successfully'
      });
      
    } catch (error) {
      console.error('getDashboard error:', error);
      return res.json({
        status: false,
        rcode: 500,
        message: 'Failed to retrieve dashboard data'
      });
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









  // View cities - PHP compatible version
  static async viewCities(req, res) {
    try {
      // Support both query parameters and form data
      const { user_id, token } = {
        ...req.query,
        ...req.body
      };

      console.log('viewCities - Parameters:', { user_id, token });

      // Check if user_id and token are provided
      if (!user_id || !token) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'user_id and token are required'
        });
      }

      // Decode user ID
      const decodedUserId = idDecode(user_id);
      if (!decodedUserId) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'Invalid user ID'
        });
      }

      // Get user details and validate
      const userRows = await query('SELECT * FROM users WHERE user_id = ? LIMIT 1', [decodedUserId]);
      if (!userRows.length) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'Not A Valid User'
        });
      }

      const user = userRows[0];

      // Validate token
      if (user.unique_token !== token) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'Token Mismatch Exception'
        });
      }

      // Check if user is admin (role_id = 1 or 2)
      const adminRows = await query('SELECT * FROM admin_users WHERE id = ? LIMIT 1', [decodedUserId]);
      if (!adminRows.length) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'Permission denied'
        });
      }

      // Get all cities with state names (matching PHP exactly)
      const cities = await query(`
        SELECT c.id, c.name, c.status, c.state_id, s.name as state_name 
        FROM cities c 
        LEFT JOIN states s ON c.state_id = s.id 
        WHERE c.deleted = 0 
        ORDER BY s.name ASC, c.name ASC
      `);

      // Return response in PHP format (matching exactly)
      return res.json({
        status: true,
        rcode: 200,
        user_id: idEncode(decodedUserId),
        unique_token: token,
        cities: cities || [],
        message: 'City list view data retrieved successfully'
      });

    } catch (error) {
      console.error('viewCities error:', error);
      return res.json({
        status: false,
        rcode: 500,
        message: 'Failed to retrieve city list view data'
      });
    }
  }

  // Submit cities - PHP compatible version
  static async submitCities(req, res) {
    try {
      // Support both query parameters and form data
      const { user_id, token, row_id, state_id, name, status } = {
        ...req.query,
        ...req.body
      };

      console.log('submitCities - Parameters:', { user_id, token, row_id, state_id, name, status });

      // Check if user_id and token are provided
      if (!user_id || !token) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'user_id and token are required'
        });
      }

      // Decode user ID
      const decodedUserId = idDecode(user_id);
      if (!decodedUserId) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'Invalid user ID'
        });
      }

      // Get user details and validate
      const userRows = await query('SELECT * FROM users WHERE user_id = ? LIMIT 1', [decodedUserId]);
      if (!userRows.length) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'Not A Valid User'
        });
      }

      const user = userRows[0];

      // Validate token
      if (user.unique_token !== token) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'Token Mismatch Exception'
        });
      }

      // Check if user is admin (role_id = 1 or 2)
      const adminRows = await query('SELECT * FROM admin_users WHERE id = ? LIMIT 1', [decodedUserId]);
      if (!adminRows.length) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'Permission denied'
        });
      }

      // Check if required fields are provided
      if (!state_id || !name) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'state_id and name are required'
        });
      }

      // Get admin role_id
      const admin = adminRows[0];

      if (!row_id || row_id === '') {
        // Insert new city (matching PHP exactly)
        const insertData = {
          state_id: state_id,
          name: name.trim(),
          status: status !== undefined ? parseInt(status) : 1,
          created_at: new Date().toISOString().slice(0, 19).replace('T', ' '),
          created_by: admin.role_id
        };

        await query(
          'INSERT INTO cities (state_id, name, status, created_at, created_by, deleted) VALUES (?, ?, ?, ?, ?, 0)',
          [insertData.state_id, insertData.name, insertData.status, insertData.created_at, insertData.created_by]
        );

        const info = 'Data Created Successfully';

        // Return response in PHP format (matching exactly)
        return res.json({
          status: 'Success',
          info: info
        });

      } else {
        // Update existing city (matching PHP exactly)
        const updateData = {
          state_id: state_id,
          name: name.trim(),
          status: status !== undefined ? parseInt(status) : 1,
          updated_at: new Date().toISOString().slice(0, 19).replace('T', ' '),
          updated_by: admin.role_id
        };

        await query(
          'UPDATE cities SET state_id = ?, name = ?, status = ?, updated_at = ?, updated_by = ? WHERE id = ?',
          [updateData.state_id, updateData.name, updateData.status, updateData.updated_at, updateData.updated_by, row_id]
        );

        const info = 'Data Updated Successfully';

        // Return response in PHP format (matching exactly)
        return res.json({
          status: 'Success',
          info: info
        });
      }

    } catch (error) {
      console.error('submitCities error:', error);
      return res.json({
        status: 'Error',
        info: 'Failed to submit city'
      });
    }
  }

  // List cities ajax - PHP compatible version
  static async listCitiesAjax(req, res) {
    try {
      // Support both query parameters and form data
      const { user_id, token } = {
        ...req.query,
        ...req.body
      };

      console.log('listCitiesAjax - Parameters:', { user_id, token });

      // Check if user_id and token are provided
      if (!user_id || !token) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'user_id and token are required'
        });
      }

      // Decode user ID
      const decodedUserId = idDecode(user_id);
      if (!decodedUserId) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'Invalid user ID'
        });
      }

      // Get user details and validate
      const userRows = await query('SELECT * FROM users WHERE user_id = ? LIMIT 1', [decodedUserId]);
      if (!userRows.length) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'Not A Valid User'
        });
      }

      // Validate token
      if (user.unique_token !== token) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'Token Mismatch Exception'
        });
      }

      // Check if user is admin (role_id = 1 or 2)
      const adminRows = await query('SELECT * FROM admin_users WHERE id = ? LIMIT 1', [decodedUserId]);
      if (!adminRows.length) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'Permission denied'
        });
      }

      // DataTables parameters
      const drawValue = parseInt(req.body.draw || req.query.draw || 1);
      const startValue = parseInt(req.body.start || req.query.start || 0);
      const lengthValue = parseInt(req.body.length || req.query.length || 10);
      const searchValue = req.body.search?.value || req.query.search || '';

      // Get total count
      const totalCountResult = await query('SELECT COUNT(*) as count FROM cities WHERE deleted = 0');
      const totalCount = totalCountResult[0]?.count || 0;

      // Build search query
      let searchQuery = '';
      let searchParams = [];
      if (searchValue) {
        searchQuery = 'WHERE (cities.name LIKE ? OR states.name LIKE ?) AND cities.deleted = 0';
        searchParams.push(`%${searchValue}%`, `%${searchValue}%`);
      } else {
        searchQuery = 'WHERE cities.deleted = 0';
      }

      // Get filtered count
      let filteredCountQuery = `
        SELECT COUNT(*) as count
        FROM cities
        LEFT JOIN states ON cities.state_id = states.id
        ${searchQuery}
      `;
      const filteredCountResult = await query(filteredCountQuery, searchParams);
      const filteredCount = filteredCountResult[0]?.count || 0;

      // Get paginated data with state names
      let dataQuery = `
        SELECT
          cities.id,
          cities.name,
          cities.state_id,
          cities.status,
          states.name as state_name
        FROM cities
        LEFT JOIN states ON cities.state_id = states.id
        ${searchQuery}
        ORDER BY cities.id DESC
        LIMIT ?, ?
      `;
      const dataParams = [...searchParams, startValue, lengthValue];
      const cities = await query(dataQuery, dataParams);

      // Format data for DataTables (matching PHP exactly)
      const data = [];
      let i = startValue;
      for (const row of cities) {
        i++;

        // Status badge (matching PHP exactly)
        let status = '<span class="badge bg-soft-success text-success">Active</span>';
        if (row.status == 0) {
          status = '<span class="badge bg-soft-danger text-danger">Inactive</span>';
        }

        // Action buttons (matching PHP exactly)
        const action = `<a href="javascript:void(0);" id="edit_${row.id}" data-id="${row.id}" data-state="${row.state_id}" data-name="${row.name}" data-status="${row.status}" onclick="viewEditDetails(${row.id});" class="action-icon"> <i class="mdi mdi-square-edit-outline"></i></a>
                        <a href="javascript:void(0);" class="action-icon delete_info" data-id="${row.id}"> <i class="mdi mdi-delete"></i></a>`;

        data.push([i, row.state_name, row.name, status, action]);
      }

      // Return response in DataTables format (matching PHP exactly)
      return res.json({
        draw: drawValue,
        recordsTotal: totalCount,
        recordsFiltered: filteredCount,
        data: data
      });

    } catch (error) {
      console.error('listCitiesAjax error:', error);
      return res.json({
        status: false,
        rcode: 500,
          message: 'Failed to retrieve city list'
      });
    }
  }

  // Check duplicate cities - PHP compatible version
  static async checkDuplicateCities(req, res) {
    try {
      // Support both query parameters and form data
      const { user_id, token, sid, name, id } = {
        ...req.query,
        ...req.body
      };

      console.log('checkDuplicateCities - Parameters:', { user_id, token, sid, name, id });

      // Check if user_id and token are provided
      if (!user_id || !token) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'user_id and token are required'
        });
      }

      // Decode user ID
      const decodedUserId = idDecode(user_id);
      if (!decodedUserId) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'Invalid user ID'
        });
      }

      // Get user details and validate
      const userRows = await query('SELECT * FROM users WHERE user_id = ? LIMIT 1', [decodedUserId]);
      if (!userRows.length) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'Not A Valid User'
        });
      }

      const user = userRows[0];

      // Validate token
      if (user.unique_token !== token) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'Token Mismatch Exception'
        });
      }

      // Check if user is admin (role_id = 1 or 2)
      const adminRows = await query('SELECT * FROM admin_users WHERE id = ? LIMIT 1', [decodedUserId]);
      if (!adminRows.length) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'Permission denied'
        });
      }

      // Check if required fields are provided
      if (!sid || !name) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'sid and name are required'
        });
      }

      // Build condition for duplicate check (matching PHP exactly)
      let condition = '';
      let params = [];

      if (parseInt(id) > 0) {
        // Editing existing city - exclude current record and check within same state
        condition = 'id != ? AND deleted = 0 AND state_id = ? AND name = ?';
        params = [id, sid, name];
      } else {
        // Adding new city - check within same state
        condition = 'deleted = 0 AND state_id = ? AND name = ?';
        params = [sid, name];
      }

      // Check for duplicate city name within the same state
      const duplicateRows = await query(
        `SELECT COUNT(*) as count FROM cities WHERE ${condition}`,
        params
      );

      const hasDuplicate = duplicateRows[0]?.count > 0;

      // Return response in PHP format (matching exactly)
      return res.json({
        validate: hasDuplicate
      });

    } catch (error) {
      console.error('checkDuplicateCities error:', error);
      return res.json({
        status: false,
        rcode: 500,
        message: 'Failed to check duplicate city'
      });
    }
  }

  // View interests - PHP compatible version
  static async viewInterests(req, res) {
    try {
      // Support both query parameters and form data
      const { user_id, token } = {
        ...req.query,
        ...req.body
      };

      console.log('viewInterests - Parameters:', { user_id, token });

      // Check if user_id and token are provided
      if (!user_id || !token) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'user_id and token are required'
        });
      }

      // Decode user ID
      const decodedUserId = idDecode(user_id);
      if (!decodedUserId) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'Invalid user ID'
        });
      }

      // Get user details and validate
      const userRows = await query('SELECT * FROM users WHERE user_id = ? LIMIT 1', [decodedUserId]);
      if (!userRows.length) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'Not A Valid User'
        });
      }

      const user = userRows[0];

      // Validate token
      if (user.unique_token !== token) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'Token Mismatch Exception'
        });
      }

      // Check if user is admin (role_id = 1 or 2)
      const adminRows = await query('SELECT * FROM admin_users WHERE id = ? LIMIT 1', [decodedUserId]);
      if (!adminRows.length) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'Permission denied'
        });
      }

      // Get all interests ordered by name (matching PHP exactly)
      const interests = await query('SELECT * FROM interests WHERE deleted = 0 ORDER BY name ASC');

      // Return response in PHP format (matching exactly)
      return res.json({
        status: true,
        rcode: 200,
        user_id: idEncode(decodedUserId),
        unique_token: token,
        interests_list: interests || [],
        message: 'Interests list view data retrieved successfully'
      });

    } catch (error) {
      console.error('viewInterests error:', error);
      return res.json({
        status: false,
        rcode: 500,
        message: 'Failed to retrieve interests list view data'
      });
    }
  }

  // Submit interest - PHP compatible version
  static async submitInterest(req, res) {
    try {
      // Support both query parameters and form data
      const { user_id, token, row_id, name, status } = {
        ...req.query,
        ...req.body
      };

      console.log('submitInterest - Parameters:', { user_id, token, row_id, name, status });

      // Check if user_id and token are provided
      if (!user_id || !token) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'user_id and token are required'
        });
      }

      // Decode user ID
      const decodedUserId = idDecode(user_id);
      if (!decodedUserId) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'Invalid user ID'
        });
      }

      // Get user details and validate
      const userRows = await query('SELECT * FROM users WHERE user_id = ? LIMIT 1', [decodedUserId]);
      if (!userRows.length) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'Not A Valid User'
        });
      }

      const user = userRows[0];

      // Validate token
      if (user.unique_token !== token) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'Token Mismatch Exception'
        });
      }

      // Check if user is admin (role_id = 1 or 2)
      const adminRows = await query('SELECT * FROM admin_users WHERE id = ? LIMIT 1', [decodedUserId]);
      if (!adminRows.length) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'Permission denied'
        });
      }

      // Check if required fields are provided
      if (!name) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'name is required'
        });
      }

      // Get admin role_id
      const admin = adminRows[0];

      if (!row_id || row_id === '') {
        // Insert new interest (matching PHP exactly)
        const insertData = {
          name: name.trim(),
          status: status !== undefined ? parseInt(status) : 1,
          created_at: new Date().toISOString().slice(0, 19).replace('T', ' '),
          created_by: admin.role_id
        };

        await query(
          'INSERT INTO interests (name, status, created_at, created_by, deleted) VALUES (?, ?, ?, ?, 0)',
          [insertData.name, insertData.status, insertData.created_at, insertData.created_by]
        );

        const info = 'Data Created Successfully';

        // Return response in PHP format (matching exactly)
        return res.json({
          status: 'Success',
          info: info
        });

      } else {
        // Update existing interest (matching PHP exactly)
        const updateData = {
          name: name.trim(),
          status: status !== undefined ? parseInt(status) : 1,
          updated_at: new Date().toISOString().slice(0, 19).replace('T', ' '),
          updated_by: admin.role_id
        };

        await query(
          'UPDATE interests SET name = ?, status = ?, updated_at = ?, updated_by = ? WHERE id = ?',
          [updateData.name, updateData.status, updateData.updated_at, updateData.updated_by, row_id]
        );

        const info = 'Data Updated Successfully';

        // Return response in PHP format (matching exactly)
        return res.json({
          status: 'Success',
          info: info
        });
      }

    } catch (error) {
      console.error('submitInterest error:', error);
      return res.json({
        status: 'Error',
        info: 'Failed to submit interest'
      });
    }
  }

  // List interest ajax - PHP compatible version
  static async listInterestAjax(req, res) {
    try {
      // Support both query parameters and form data
      const { user_id, token } = {
        ...req.query,
        ...req.body
      };

      console.log('listInterestAjax - Parameters:', { user_id, token });

      // Check if user_id and token are provided
      if (!user_id || !token) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'user_id and token are required'
        });
      }

      // Decode user ID
      const decodedUserId = idDecode(user_id);
      if (!decodedUserId) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'Invalid user ID'
        });
      }

      // Get user details and validate
      const userRows = await query('SELECT * FROM users WHERE user_id = ? LIMIT 1', [decodedUserId]);
      if (!userRows.length) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'Not A Valid User'
        });
      }

      const user = userRows[0];

      // Validate token
      if (user.unique_token !== token) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'Token Mismatch Exception'
        });
      }

      // Check if user is admin (role_id = 1 or 2)
      const adminRows = await query('SELECT * FROM admin_users WHERE id = ? LIMIT 1', [decodedUserId]);
      if (!adminRows.length) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'Permission denied'
        });
      }

      // DataTables parameters
      const drawValue = parseInt(req.body.draw || req.query.draw || 1);
      const startValue = parseInt(req.body.start || req.query.start || 0);
      const lengthValue = parseInt(req.body.length || req.query.length || 10);
      const searchValue = req.body.search?.value || req.query.search || '';

      // Get total count
      const totalCountResult = await query('SELECT COUNT(*) as count FROM interests WHERE deleted = 0');
      const totalCount = totalCountResult[0]?.count || 0;

      // Build search query
      let searchQuery = '';
      let searchParams = [];
      if (searchValue) {
        searchQuery = 'WHERE name LIKE ? AND deleted = 0';
        searchParams.push(`%${searchValue}%`);
      } else {
        searchQuery = 'WHERE deleted = 0';
      }

      // Get filtered count
      let filteredCountQuery = `
        SELECT COUNT(*) as count
        FROM interests
        ${searchQuery}
      `;
      const filteredCountResult = await query(filteredCountQuery, searchParams);
      const filteredCount = filteredCountResult[0]?.count || 0;

      // Get paginated data
      let dataQuery = `
        SELECT
          id,
          name,
          status
        FROM interests
        ${searchQuery}
        ORDER BY id DESC
        LIMIT ?, ?
      `;
      const dataParams = [...searchParams, startValue, lengthValue];
      const interests = await query(dataQuery, dataParams);

      // Format data for DataTables (matching PHP exactly)
      const data = [];
      let i = startValue;
      for (const row of interests) {
        i++;

        // Status badge (matching PHP exactly)
        let status = '<span class="badge bg-soft-success text-success">Active</span>';
        if (row.status == 0) {
          status = '<span class="badge bg-soft-danger text-danger">Inactive</span>';
        }

        // Action buttons (matching PHP exactly)
        const action = `<a href="javascript:void(0);" id="edit_${row.id}" data-id="${row.id}" data-name="${row.name}" data-status="${row.status}" onclick="viewEditDetails(${row.id});" class="action-icon"> <i class="mdi mdi-square-edit-outline"></i></a>
                        <a href="javascript:void(0);" class="action-icon delete_info" data-id="${row.id}"> <i class="mdi mdi-delete"></i></a>`;

        data.push([i, row.name, status, action]);
      }

      // Return response in DataTables format (matching PHP exactly)
      return res.json({
        draw: drawValue,
        recordsTotal: totalCount,
        recordsFiltered: filteredCount,
        data: data
      });

    } catch (error) {
      console.error('listInterestAjax error:', error);
      return res.json({
        status: false,
        rcode: 500,
        message: 'Failed to retrieve interest list'
      });
    }
  }

  // Check duplicate interest - PHP compatible version
  static async checkDuplicateInterest(req, res) {
    try {
      // Support both query parameters and form data
      const { user_id, token, name, id } = {
        ...req.query,
        ...req.body
      };

      console.log('checkDuplicateInterest - Parameters:', { user_id, token, name, id });

      // Check if user_id and token are provided
      if (!user_id || !token) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'user_id and token are required'
        });
      }

      // Decode user ID
      const decodedUserId = idDecode(user_id);
      if (!decodedUserId) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'Invalid user ID'
        });
      }

      // Get user details and validate
      const userRows = await query('SELECT * FROM users WHERE user_id = ? LIMIT 1', [decodedUserId]);
      if (!userRows.length) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'Not A Valid User'
        });
      }

      const user = userRows[0];

      // Validate token
      if (user.unique_token !== token) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'Token Mismatch Exception'
        });
      }

      // Check if user is admin (role_id = 1 or 2)
      const adminRows = await query('SELECT * FROM admin_users WHERE id = ? LIMIT 1', [decodedUserId]);
      if (!adminRows.length) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'Permission denied'
        });
      }

      // Check if required fields are provided
      if (!name) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'name is required'
        });
      }

      // Build condition for duplicate check (matching PHP exactly)
      let condition = '';
      let params = [];

      if (parseInt(id) > 0) {
        // Editing existing interest - exclude current record
        condition = 'id != ? AND deleted = 0 AND name = ?';
        params = [id, name];
      } else {
        // Adding new interest
        condition = 'deleted = 0 AND name = ?';
        params = [name];
      }

      // Check for duplicate interest name
      const duplicateRows = await query(
        `SELECT COUNT(*) as count FROM interests WHERE ${condition}`,
        params
      );

      const hasDuplicate = duplicateRows[0]?.count > 0;

      // Return response in PHP format (matching exactly)
      return res.json({
        validate: hasDuplicate
      });

    } catch (error) {
      console.error('checkDuplicateInterest error:', error);
      return res.json({
        status: false,
        rcode: 500,
        message: 'Failed to check duplicate interest'
      });
    }
  }

  // Delete interest - PHP compatible version
  static async deleteInterest(req, res) {
    try {
      // Support both query parameters and form data
      const { user_id, token, keys } = {
        ...req.query,
        ...req.body
      };

      console.log('deleteInterest - Parameters:', { user_id, token, keys });

      // Check if user_id and token are provided
      if (!user_id || !token) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'user_id and token are required'
        });
      }

      // Decode user ID
      const decodedUserId = idDecode(user_id);
      if (!decodedUserId) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'Invalid user ID'
        });
      }

      // Get user details and validate
      const userRows = await query('SELECT * FROM users WHERE user_id = ? LIMIT 1', [decodedUserId]);
      if (!userRows.length) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'Not A Valid User'
        });
      }

      const user = userRows[0];

      // Validate token
      if (user.unique_token !== token) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'Token Mismatch Exception'
        });
      }

      // Check if user is admin (role_id = 1 or 2)
      const adminRows = await query('SELECT * FROM admin_users WHERE id = ? LIMIT 1', [decodedUserId]);
      if (!adminRows.length) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'Permission denied'
        });
      }

      // Check if keys (interest ID) is provided
      if (!keys) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'Interest ID is required'
        });
      }

      // Soft delete the interest (matching PHP exactly)
      const deleteData = {
        deleted: 1,
        deleted_at: new Date().toISOString().slice(0, 19).replace('T', ' '),
        deleted_by: adminRows[0].role_id
      };

      await query(
        'UPDATE interests SET deleted = ?, deleted_at = ?, deleted_by = ? WHERE id = ?',
        [deleteData.deleted, deleteData.deleted_at, deleteData.deleted_by, keys]
      );

      // Return response in PHP format (matching exactly)
      return res.json({
        status: 'Success',
        info: 'Interest Deleted Successfully'
      });

    } catch (error) {
      console.error('deleteInterest error:', error);
      return res.json({
        status: 'Error',
        info: 'Failed to delete interest'
      });
    }
  }

  // View job type - PHP compatible version
  static async viewJobType(req, res) {
    try {
      // Support both query parameters and form data
      const { user_id, token } = {
        ...req.query,
        ...req.body
      };

      console.log('viewJobType - Parameters:', { user_id, token });

      // Check if user_id and token are provided
      if (!user_id || !token) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'user_id and token are required'
        });
      }

      // Decode user ID
      const decodedUserId = idDecode(user_id);
      if (!decodedUserId) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'Invalid user ID'
        });
      }

      // Get user details and validate
      const userRows = await query('SELECT * FROM users WHERE user_id = ? LIMIT 1', [decodedUserId]);
      if (!userRows.length) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'Not A Valid User'
        });
      }

      const user = userRows[0];

      // Validate token
      if (user.unique_token !== token) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'Token Mismatch Exception'
        });
      }

      // Check if user is admin (role_id = 1 or 2)
      const adminRows = await query('SELECT * FROM admin_users WHERE id = ? LIMIT 1', [decodedUserId]);
      if (!adminRows.length) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'Permission denied'
        });
      }

      // Get all job types ordered by name (matching PHP exactly)
      const jobTypes = await query('SELECT * FROM job_type WHERE deleted = 0 ORDER BY name ASC');

      // Return response in PHP format (matching exactly)
      return res.json({
        status: true,
        rcode: 200,
        user_id: idEncode(decodedUserId),
        unique_token: token,
        job_type_list: jobTypes || [],
        message: 'Job type list view data retrieved successfully'
      });

    } catch (error) {
      console.error('viewJobType error:', error);
      return res.json({
        status: false,
        rcode: 500,
        message: 'Failed to retrieve job type list view data'
      });
    }
  }

  // Submit job type - PHP compatible version
  static async submitJobType(req, res) {
    try {
      // Support both query parameters and form data
      const { user_id, token, row_id, name, status } = {
        ...req.query,
        ...req.body
      };

      console.log('submitJobType - Parameters:', { user_id, token, row_id, name, status });

      // Check if user_id and token are provided
      if (!user_id || !token) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'user_id and token are required'
        });
      }

      // Decode user ID
      const decodedUserId = idDecode(user_id);
      if (!decodedUserId) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'Invalid user ID'
        });
      }

      // Get user details and validate
      const userRows = await query('SELECT * FROM users WHERE user_id = ? LIMIT 1', [decodedUserId]);
      if (!userRows.length) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'Not A Valid User'
        });
      }

      const user = userRows[0];

      // Validate token
      if (user.unique_token !== token) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'Token Mismatch Exception'
        });
      }

      // Check if user is admin (role_id = 1 or 2)
      const adminRows = await query('SELECT * FROM admin_users WHERE id = ? LIMIT 1', [decodedUserId]);
      if (!adminRows.length) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'Permission denied'
        });
      }

      // Check if required fields are provided
      if (!name) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'name is required'
        });
      }

      // Get admin role_id
      const admin = adminRows[0];

      if (!row_id || row_id === '') {
        // Insert new job type (matching PHP exactly)
        const insertData = {
          name: name.trim(),
          status: status !== undefined ? parseInt(status) : 1,
          created_at: new Date().toISOString().slice(0, 19).replace('T', ' '),
          created_by: admin.role_id
        };

        await query(
          'INSERT INTO job_type (name, status, created_at, created_by, deleted) VALUES (?, ?, ?, ?, 0)',
          [insertData.name, insertData.status, insertData.created_at, insertData.created_by]
        );

        const info = 'Data Created Successfully';

        // Return response in PHP format (matching exactly)
        return res.json({
          status: 'Success',
          info: info
        });

      } else {
        // Update existing job type (matching PHP exactly)
        const updateData = {
          name: name.trim(),
          status: status !== undefined ? parseInt(status) : 1,
          updated_at: new Date().toISOString().slice(0, 19).replace('T', ' '),
          updated_by: admin.role_id
        };

        await query(
          'UPDATE job_type SET name = ?, status = ?, updated_at = ?, updated_by = ? WHERE id = ?',
          [updateData.name, updateData.status, updateData.updated_at, updateData.updated_by, row_id]
        );

        const info = 'Data Updated Successfully';

        // Return response in PHP format (matching exactly)
        return res.json({
          status: 'Success',
          info: info
        });
      }

    } catch (error) {
      console.error('submitJobType error:', error);
      return res.json({
        status: 'Error',
        info: 'Failed to submit job type'
      });
    }
  }

  // List job type ajax - PHP compatible version
  static async listJobTypeAjax(req, res) {
    try {
      // Support both query parameters and form data
      const { user_id, token } = {
        ...req.query,
        ...req.body
      };

      console.log('listJobTypeAjax - Parameters:', { user_id, token });

      // Check if user_id and token are provided
      if (!user_id || !token) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'user_id and token are required'
        });
      }

      // Decode user ID
      const decodedUserId = idDecode(user_id);
      if (!decodedUserId) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'Invalid user ID'
        });
      }

      // Get user details and validate
      const userRows = await query('SELECT * FROM users WHERE user_id = ? LIMIT 1', [decodedUserId]);
      if (!userRows.length) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'Not A Valid User'
        });
      }

      const user = userRows[0];

      // Validate token
      if (user.unique_token !== token) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'Token Mismatch Exception'
        });
      }

      // Check if user is admin (role_id = 1 or 2)
      const adminRows = await query('SELECT * FROM admin_users WHERE id = ? LIMIT 1', [decodedUserId]);
      if (!adminRows.length) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'Permission denied'
        });
      }

      // DataTables parameters
      const drawValue = parseInt(req.body.draw || req.query.draw || 1);
      const startValue = parseInt(req.body.start || req.query.start || 0);
      const lengthValue = parseInt(req.body.length || req.query.length || 10);
      const searchValue = req.body.search?.value || req.query.search || '';

      // Get total count
      const totalCountResult = await query('SELECT COUNT(*) as count FROM job_type WHERE deleted = 0');
      const totalCount = totalCountResult[0]?.count || 0;

      // Build search query
      let searchQuery = '';
      let searchParams = [];
      if (searchValue) {
        searchQuery = 'WHERE name LIKE ? AND deleted = 0';
        searchParams.push(`%${searchValue}%`);
      } else {
        searchQuery = 'WHERE deleted = 0';
      }

      // Get filtered count
      let filteredCountQuery = `
        SELECT COUNT(*) as count
        FROM job_type
        ${searchQuery}
      `;
      const filteredCountResult = await query(filteredCountQuery, searchParams);
      const filteredCount = filteredCountResult[0]?.count || 0;

      // Get paginated data
      let dataQuery = `
        SELECT
          id,
          name,
          status
        FROM job_type
        ${searchQuery}
        ORDER BY id DESC
        LIMIT ?, ?
      `;
      const dataParams = [...searchParams, startValue, lengthValue];
      const jobTypes = await query(dataQuery, dataParams);

      // Format data for DataTables (matching PHP exactly)
      const data = [];
      let i = startValue;
      for (const row of jobTypes) {
        i++;

        // Status badge (matching PHP exactly)
        let status = '<span class="badge bg-soft-success text-success">Active</span>';
        if (row.status == 0) {
          status = '<span class="badge bg-soft-danger text-danger">Inactive</span>';
        }

        // Action buttons (matching PHP exactly)
        const action = `<a href="javascript:void(0);" id="edit_${row.id}" data-id="${row.id}" data-name="${row.name}" data-status="${row.status}" onclick="viewEditDetails(${row.id});" class="action-icon"> <i class="mdi mdi-square-edit-outline"></i></a>
                        <a href="javascript:void(0);" class="action-icon delete_info" data-id="${row.id}"> <i class="mdi mdi-delete"></i></a>`;

        data.push([i, row.name, status, action]);
      }

      // Return response in DataTables format (matching PHP exactly)
      return res.json({
        draw: drawValue,
        recordsTotal: totalCount,
        recordsFiltered: filteredCount,
        data: data
      });

    } catch (error) {
      console.error('listJobTypeAjax error:', error);
      return res.json({
        status: false,
        rcode: 500,
        message: 'Failed to retrieve job type list'
      });
    }
  }

  // Check duplicate job type - PHP compatible version
  static async checkDuplicateJobType(req, res) {
    try {
      // Support both query parameters and form data
      const { user_id, token, name, id } = {
        ...req.query,
        ...req.body
      };

      console.log('checkDuplicateJobType - Parameters:', { user_id, token, name, id });

      // Check if user_id and token are provided
      if (!user_id || !token) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'user_id and token are required'
        });
      }

      // Decode user ID
      const decodedUserId = idDecode(user_id);
      if (!decodedUserId) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'Invalid user ID'
        });
      }

      // Get user details and validate
      const userRows = await query('SELECT * FROM users WHERE user_id = ? LIMIT 1', [decodedUserId]);
      if (!userRows.length) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'Not A Valid User'
        });
      }

      const user = userRows[0];

      // Validate token
      if (user.unique_token !== token) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'Token Mismatch Exception'
        });
      }

      // Check if user is admin (role_id = 1 or 2)
      const adminRows = await query('SELECT * FROM admin_users WHERE id = ? LIMIT 1', [decodedUserId]);
      if (!adminRows.length) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'Permission denied'
        });
      }

      // Check if required fields are provided
      if (!name) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'name is required'
        });
      }

      // Build condition for duplicate check (matching PHP exactly)
      let condition = '';
      let params = [];

      if (parseInt(id) > 0) {
        // Editing existing job type - exclude current record
        condition = 'id != ? AND deleted = 0 AND name = ?';
        params = [id, name];
      } else {
        // Adding new job type
        condition = 'deleted = 0 AND name = ?';
        params = [name];
      }

      // Check for duplicate job type name
      const duplicateRows = await query(
        `SELECT COUNT(*) as count FROM job_type WHERE ${condition}`,
        params
      );

      const hasDuplicate = duplicateRows[0]?.count > 0;

      // Return response in PHP format (matching exactly)
      return res.json({
        validate: hasDuplicate
      });

    } catch (error) {
      console.error('checkDuplicateJobType error:', error);
      return res.json({
        status: false,
        rcode: 500,
        message: 'Failed to check duplicate job type'
      });
    }
  }

  // Delete job type - PHP compatible version
  static async deleteJobType(req, res) {
    try {
      // Support both query parameters and form data
      const { user_id, token, keys } = {
        ...req.query,
        ...req.body
      };

      console.log('deleteJobType - Parameters:', { user_id, token, keys });

      // Check if user_id and token are provided
      if (!user_id || !token) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'user_id and token are required'
        });
      }

      // Decode user ID
      const decodedUserId = idDecode(user_id);
      if (!decodedUserId) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'Invalid user ID'
        });
      }

      // Get user details and validate
      const userRows = await query('SELECT * FROM users WHERE user_id = ? LIMIT 1', [decodedUserId]);
      if (!userRows.length) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'Not A Valid User'
        });
      }

      const user = userRows[0];

      // Validate token
      if (user.unique_token !== token) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'Token Mismatch Exception'
        });
      }

      // Check if user is admin (role_id = 1 or 2)
      const adminRows = await query('SELECT * FROM admin_users WHERE id = ? LIMIT 1', [decodedUserId]);
      if (!adminRows.length) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'Permission denied'
        });
      }

      // Check if keys (job type ID) is provided
      if (!keys) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'Job Type ID is required'
        });
      }

      // Check if job type is used in user_job_details (matching PHP exactly)
      const jobDetails = await query('SELECT * FROM user_job_details WHERE job_type_id = ? AND deleted = 0', [keys]);
      
      if (jobDetails.length > 0) {
        return res.json({
          status: 'Error',
          info: 'Unable to Delete. Due to Job Type Active in Jobs'
        });
      }

      // Soft delete the job type (matching PHP exactly)
      const deleteData = {
        deleted: 1,
        deleted_at: new Date().toISOString().slice(0, 19).replace('T', ' '),
        deleted_by: adminRows[0].role_id
      };

      await query(
        'UPDATE job_type SET deleted = ?, deleted_at = ?, deleted_by = ? WHERE id = ?',
        [deleteData.deleted, deleteData.deleted_at, deleteData.deleted_by, keys]
      );

      // Return response in PHP format (matching exactly)
      return res.json({
        status: 'Success',
        info: 'Job Type Deleted Successfully'
      });

    } catch (error) {
      console.error('deleteJobType error:', error);
      return res.json({
        status: 'Error',
        info: 'Failed to delete job type'
      });
    }
  }

  // View pay - PHP compatible version
  static async viewPay(req, res) {
    try {
      // Support both query parameters and form data
      const { user_id, token } = {
        ...req.query,
        ...req.body
      };

      console.log('viewPay - Parameters:', { user_id, token });

      // Check if user_id and token are provided
      if (!user_id || !token) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'user_id and token are required'
        });
      }

      // Decode user ID
      const decodedUserId = idDecode(user_id);
      if (!decodedUserId) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'Invalid user ID'
        });
      }

      // Get user details and validate
      const userRows = await query('SELECT * FROM users WHERE user_id = ? LIMIT 1', [decodedUserId]);
      if (!userRows.length) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'Not A Valid User'
        });
      }

      const user = userRows[0];

      // Validate token
      if (user.unique_token !== token) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'Token Mismatch Exception'
        });
      }

      // Check if user is admin (role_id = 1 or 2)
      const adminRows = await query('SELECT * FROM admin_users WHERE id = ? LIMIT 1', [decodedUserId]);
      if (!adminRows.length) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'Permission denied'
        });
      }

      // Get all pay types ordered by name (matching PHP exactly)
      const payTypes = await query('SELECT * FROM pay WHERE deleted = 0 ORDER BY name ASC');

      // Return response in PHP format (matching exactly)
      return res.json({
        status: true,
        rcode: 200,
        user_id: idEncode(decodedUserId),
        unique_token: token,
        pay_list: payTypes || [],
        message: 'Pay list view data retrieved successfully'
      });

    } catch (error) {
      console.error('viewPay error:', error);
      return res.json({
        status: false,
        rcode: 500,
        message: 'Failed to retrieve pay list view data'
      });
    }
  }

  // Submit pay - PHP compatible version
  static async submitPay(req, res) {
    try {
      // Support both query parameters and form data
      const { user_id, token, row_id, name, status } = {
        ...req.query,
        ...req.body
      };

      console.log('submitPay - Parameters:', { user_id, token, row_id, name, status });

      // Check if user_id and token are provided
      if (!user_id || !token) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'user_id and token are required'
        });
      }

      // Decode user ID
      const decodedUserId = idDecode(user_id);
      if (!decodedUserId) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'Invalid user ID'
        });
      }

      // Get user details and validate
      const userRows = await query('SELECT * FROM users WHERE user_id = ? LIMIT 1', [decodedUserId]);
      if (!userRows.length) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'Not A Valid User'
        });
      }

      const user = userRows[0];

      // Validate token
      if (user.unique_token !== token) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'Token Mismatch Exception'
        });
      }

      // Check if user is admin (role_id = 1 or 2)
      const adminRows = await query('SELECT * FROM admin_users WHERE id = ? LIMIT 1', [decodedUserId]);
      if (!adminRows.length) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'Permission denied'
        });
      }

      // Check if required fields are provided
      if (!name) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'name is required'
        });
      }

      // Get admin role_id
      const admin = adminRows[0];

      if (!row_id || row_id === '') {
        // Insert new pay (matching PHP exactly)
        const insertData = {
          name: name.trim(),
          status: status !== undefined ? parseInt(status) : 1,
          created_at: new Date().toISOString().slice(0, 19).replace('T', ' '),
          created_by: admin.role_id
        };

        await query(
          'INSERT INTO pay (name, status, created_at, created_by, deleted) VALUES (?, ?, ?, ?, 0)',
          [insertData.name, insertData.status, insertData.created_at, insertData.created_by]
        );

        const info = 'Data Created Successfully';

        // Return response in PHP format (matching exactly)
        return res.json({
          status: 'Success',
          info: info
        });

      } else {
        // Update existing pay (matching PHP exactly)
        const updateData = {
          name: name.trim(),
          status: status !== undefined ? parseInt(status) : 1,
          updated_at: new Date().toISOString().slice(0, 19).replace('T', ' '),
          updated_by: admin.role_id
        };

        await query(
          'UPDATE pay SET name = ?, status = ?, updated_at = ?, updated_by = ? WHERE id = ?',
          [updateData.name, updateData.status, updateData.updated_at, updateData.updated_by, row_id]
        );

        const info = 'Data Updated Successfully';

        // Return response in PHP format (matching exactly)
        return res.json({
          status: 'Success',
          info: info
        });
      }

    } catch (error) {
      console.error('submitPay error:', error);
      return res.json({
        status: 'Error',
        info: 'Failed to submit pay'
      });
    }
  }

  // List pay ajax - PHP compatible version
  static async listPayAjax(req, res) {
    try {
      // Support both query parameters and form data
      const { user_id, token } = {
        ...req.query,
        ...req.body
      };

      console.log('listPayAjax - Parameters:', { user_id, token });

      // Check if user_id and token are provided
      if (!user_id || !token) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'user_id and token are required'
        });
      }

      // Decode user ID
      const decodedUserId = idDecode(user_id);
      if (!decodedUserId) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'Invalid user ID'
        });
      }

      // Get user details and validate
      const userRows = await query('SELECT * FROM users WHERE user_id = ? LIMIT 1', [decodedUserId]);
      if (!userRows.length) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'Not A Valid User'
        });
      }

      const user = userRows[0];

      // Validate token
      if (user.unique_token !== token) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'Token Mismatch Exception'
        });
      }

      // Check if user is admin (role_id = 1 or 2)
      const adminRows = await query('SELECT * FROM admin_users WHERE id = ? LIMIT 1', [decodedUserId]);
      if (!adminRows.length) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'Permission denied'
        });
      }

      // DataTables parameters
      const drawValue = parseInt(req.body.draw || req.query.draw || 1);
      const startValue = parseInt(req.body.start || req.query.start || 0);
      const lengthValue = parseInt(req.body.length || req.query.length || 10);
      const searchValue = req.body.search?.value || req.query.search || '';

      // Get total count
      const totalCountResult = await query('SELECT COUNT(*) as count FROM pay WHERE deleted = 0');
      const totalCount = totalCountResult[0]?.count || 0;

      // Build search query
      let searchQuery = '';
      let searchParams = [];
      if (searchValue) {
        searchQuery = 'WHERE name LIKE ? AND deleted = 0';
        searchParams.push(`%${searchValue}%`);
      } else {
        searchQuery = 'WHERE deleted = 0';
      }

      // Get filtered count
      let filteredCountQuery = `
        SELECT COUNT(*) as count
        FROM pay
        ${searchQuery}
      `;
      const filteredCountResult = await query(filteredCountQuery, searchParams);
      const filteredCount = filteredCountResult[0]?.count || 0;

      // Get paginated data
      let dataQuery = `
        SELECT
          id,
          name,
          status
        FROM pay
        ${searchQuery}
        ORDER BY id DESC
        LIMIT ?, ?
      `;
      const dataParams = [...searchParams, startValue, lengthValue];
      const payTypes = await query(dataQuery, dataParams);

      // Format data for DataTables (matching PHP exactly)
      const data = [];
      let i = startValue;
      for (const row of payTypes) {
        i++;

        // Status badge (matching PHP exactly)
        let status = '<span class="badge bg-soft-success text-success">Active</span>';
        if (row.status == 0) {
          status = '<span class="badge bg-soft-danger text-danger">Inactive</span>';
        }

        // Action buttons (matching PHP exactly)
        const action = `<a href="javascript:void(0);" id="edit_${row.id}" data-id="${row.id}" data-name="${row.name}" data-status="${row.status}" onclick="viewEditDetails(${row.id});" class="action-icon"> <i class="mdi mdi-square-edit-outline"></i></a>
                        <a href="javascript:void(0);" class="action-icon delete_info" data-id="${row.id}"> <i class="mdi mdi-delete"></i></a>`;

        data.push([i, row.name, status, action]);
      }

      // Return response in DataTables format (matching PHP exactly)
      return res.json({
        draw: drawValue,
        recordsTotal: totalCount,
        recordsFiltered: filteredCount,
        data: data
      });

    } catch (error) {
      console.error('listPayAjax error:', error);
      return res.json({
        status: false,
        rcode: 500,
        message: 'Failed to retrieve pay list'
      });
    }
  }

  // Check duplicate pay - PHP compatible version
  static async checkDuplicatePay(req, res) {
    try {
      // Support both query parameters and form data
      const { user_id, token, name, id } = {
        ...req.query,
        ...req.body
      };

      console.log('checkDuplicatePay - Parameters:', { user_id, token, name, id });

      // Check if user_id and token are provided
      if (!user_id || !token) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'user_id and token are required'
        });
      }

      // Decode user ID
      const decodedUserId = idDecode(user_id);
      if (!decodedUserId) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'Invalid user ID'
        });
      }

      // Get user details and validate
      const userRows = await query('SELECT * FROM users WHERE user_id = ? LIMIT 1', [decodedUserId]);
      if (!userRows.length) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'Not A Valid User'
        });
      }

      const user = userRows[0];

      // Validate token
      if (user.unique_token !== token) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'Token Mismatch Exception'
        });
      }

      // Check if user is admin (role_id = 1 or 2)
      const adminRows = await query('SELECT * FROM admin_users WHERE id = ? LIMIT 1', [decodedUserId]);
      if (!adminRows.length) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'Permission denied'
        });
      }

      // Check if required fields are provided
      if (!name) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'name is required'
        });
      }

      // Build condition for duplicate check (matching PHP exactly)
      let condition = '';
      let params = [];

      if (parseInt(id) > 0) {
        // Editing existing pay - exclude current record
        condition = 'id != ? AND deleted = 0 AND name = ?';
        params = [id, name];
      } else {
        // Adding new pay
        condition = 'deleted = 0 AND name = ?';
        params = [name];
      }

      // Check for duplicate pay name
      const duplicateRows = await query(
        `SELECT COUNT(*) as count FROM pay WHERE ${condition}`,
        params
      );

      const hasDuplicate = duplicateRows[0]?.count > 0;

      // Return response in PHP format (matching exactly)
      return res.json({
        validate: hasDuplicate
      });

    } catch (error) {
      console.error('checkDuplicatePay error:', error);
      return res.json({
        status: false,
        rcode: 500,
        message: 'Failed to check duplicate pay'
      });
    }
  }

  // Delete pay - PHP compatible version
  static async deletePay(req, res) {
    try {
      // Support both query parameters and form data
      const { user_id, token, keys } = {
        ...req.query,
        ...req.body
      };

      console.log('deletePay - Parameters:', { user_id, token, keys });

      // Check if user_id and token are provided
      if (!user_id || !token) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'user_id and token are required'
        });
      }

      // Decode user ID
      const decodedUserId = idDecode(user_id);
      if (!decodedUserId) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'Invalid user ID'
        });
      }

      // Get user details and validate
      const userRows = await query('SELECT * FROM users WHERE user_id = ? LIMIT 1', [decodedUserId]);
      if (!userRows.length) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'Not A Valid User'
        });
      }

      const user = userRows[0];

      // Validate token
      if (user.unique_token !== token) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'Token Mismatch Exception'
        });
      }

      // Check if user is admin (role_id = 1 or 2)
      const adminRows = await query('SELECT * FROM admin_users WHERE id = ? LIMIT 1', [decodedUserId]);
      if (!adminRows.length) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'Permission denied'
        });
      }

      // Check if keys (pay ID) is provided
      if (!keys) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'Pay ID is required'
        });
      }

      // Check if pay is used in user_job_details (matching PHP exactly)
      const jobDetails = await query('SELECT * FROM user_job_details WHERE pay_id = ? AND deleted = 0', [keys]);
      
      if (jobDetails.length > 0) {
        return res.json({
          status: 'Error',
          info: 'Unable to Delete. Due to Pay Active in Jobs'
        });
      }

      // Soft delete the pay (matching PHP exactly)
      const deleteData = {
        deleted: 1,
        deleted_at: new Date().toISOString().slice(0, 19).replace('T', ' '),
        deleted_by: adminRows[0].role_id
      };

      await query(
        'UPDATE pay SET deleted = ?, deleted_at = ?, deleted_by = ? WHERE id = ?',
        [deleteData.deleted, deleteData.deleted_at, deleteData.deleted_by, keys]
      );

      // Return response in PHP format (matching exactly)
      return res.json({
        status: 'Success',
        info: 'Pay Deleted Successfully'
      });

    } catch (error) {
      console.error('deletePay error:', error);
      return res.json({
        status: 'Error',
        info: 'Failed to delete pay'
      });
    }
  }





  // View industry type - PHP compatible version
  static async viewIndustryType(req, res) {
    try {
      // Support both query parameters and form data
      const { user_id, token } = {
        ...req.query,
        ...req.body
      };

      console.log('viewIndustryType - Parameters:', { user_id, token });

      // Check if user_id and token are provided
      if (!user_id || !token) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'user_id and token are required'
        });
      }

      // Decode user ID
      const decodedUserId = idDecode(user_id);
      if (!decodedUserId) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'Invalid user ID'
        });
      }

      // Get user details and validate
      const userRows = await query('SELECT * FROM users WHERE user_id = ? LIMIT 1', [decodedUserId]);
      if (!userRows.length) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'Not A Valid User'
        });
      }

      const user = userRows[0];

      // Validate token
      if (user.unique_token !== token) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'Token Mismatch Exception'
        });
      }

      // Check if user is admin (role_id = 1 or 2)
      const adminRows = await query('SELECT * FROM admin_users WHERE id = ? LIMIT 1', [decodedUserId]);
      if (!adminRows.length) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'Permission denied'
        });
      }

      // Get all industry types ordered by name (matching PHP exactly)
      const industryTypes = await query('SELECT * FROM industry_type WHERE deleted = 0 ORDER BY name ASC');

      // Return response in PHP format (matching exactly)
      return res.json({
        status: true,
        rcode: 200,
        user_id: idEncode(decodedUserId),
        unique_token: token,
        industry_type_list: industryTypes || [],
        message: 'Industry type list view data retrieved successfully'
      });

    } catch (error) {
      console.error('viewIndustryType error:', error);
      return res.json({
        status: false,
        rcode: 500,
        message: 'Failed to retrieve industry type list view data'
      });
    }
  }

  // Submit industry type - PHP compatible version
  static async submitIndustryType(req, res) {
    try {
      // Support both query parameters and form data
      const { user_id, token, row_id, name, status } = {
        ...req.query,
        ...req.body
      };

      console.log('submitIndustryType - Parameters:', { user_id, token, row_id, name, status });

      // Check if user_id and token are provided
      if (!user_id || !token) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'user_id and token are required'
        });
      }

      // Decode user ID
      const decodedUserId = idDecode(user_id);
      if (!decodedUserId) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'Invalid user ID'
        });
      }

      // Get user details and validate
      const userRows = await query('SELECT * FROM users WHERE user_id = ? LIMIT 1', [decodedUserId]);
      if (!userRows.length) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'Not A Valid User'
        });
      }

      const user = userRows[0];

      // Validate token
      if (user.unique_token !== token) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'Token Mismatch Exception'
        });
      }

      // Check if user is admin (role_id = 1 or 2)
      const adminRows = await query('SELECT * FROM admin_users WHERE id = ? LIMIT 1', [decodedUserId]);
      if (!adminRows.length) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'Permission denied'
        });
      }

      // Check if required fields are provided
      if (!name) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'name is required'
        });
      }

      // Get admin role_id
      const admin = adminRows[0];

      if (!row_id || row_id === '') {
        // Insert new industry type (matching PHP exactly)
        const insertData = {
          name: name.trim(),
          status: status !== undefined ? parseInt(status) : 1,
          created_at: new Date().toISOString().slice(0, 19).replace('T', ' '),
          created_by: admin.role_id
        };

        await query(
          'INSERT INTO industry_type (name, status, created_at, created_by, deleted) VALUES (?, ?, ?, ?, 0)',
          [insertData.name, insertData.status, insertData.created_at, insertData.created_by]
        );

        const info = 'Data Created Successfully';

        // Return response in PHP format (matching exactly)
        return res.json({
          status: 'Success',
          info: info
        });

      } else {
        // Update existing industry type (matching PHP exactly)
        const updateData = {
          name: name.trim(),
          status: status !== undefined ? parseInt(status) : 1,
          updated_at: new Date().toISOString().slice(0, 19).replace('T', ' '),
          updated_by: admin.role_id
        };

        await query(
          'UPDATE industry_type SET name = ?, status = ?, updated_at = ?, updated_by = ? WHERE id = ?',
          [updateData.name, updateData.status, updateData.updated_at, updateData.updated_by, row_id]
        );

        const info = 'Data Updated Successfully';

        // Return response in PHP format (matching exactly)
        return res.json({
          status: 'Success',
          info: info
        });
      }

    } catch (error) {
      console.error('submitIndustryType error:', error);
      return res.json({
        status: 'Error',
        info: 'Failed to submit industry type'
      });
    }
  }

  // List industry type ajax - PHP compatible version
  static async listIndustryTypeAjax(req, res) {
    try {
      // Support both query parameters and form data
      const { user_id, token } = {
        ...req.query,
        ...req.body
      };

      console.log('listIndustryTypeAjax - Parameters:', { user_id, token });

      // Check if user_id and token are provided
      if (!user_id || !token) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'user_id and token are required'
        });
      }

      // Decode user ID
      const decodedUserId = idDecode(user_id);
      if (!decodedUserId) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'Invalid user ID'
        });
      }

      // Get user details and validate
      const userRows = await query('SELECT * FROM users WHERE user_id = ? LIMIT 1', [decodedUserId]);
      if (!userRows.length) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'Not A Valid User'
        });
      }

      const user = userRows[0];

      // Validate token
      if (user.unique_token !== token) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'Token Mismatch Exception'
        });
      }

      // Check if user is admin (role_id = 1 or 2)
      const adminRows = await query('SELECT * FROM admin_users WHERE id = ? LIMIT 1', [decodedUserId]);
      if (!adminRows.length) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'Permission denied'
        });
      }

      // DataTables parameters
      const drawValue = parseInt(req.body.draw || req.query.draw || 1);
      const startValue = parseInt(req.body.start || req.query.start || 0);
      const lengthValue = parseInt(req.body.length || req.query.length || 10);
      const searchValue = req.body.search?.value || req.query.search || '';

      // Get total count
      const totalCountResult = await query('SELECT COUNT(*) as count FROM industry_type WHERE deleted = 0');
      const totalCount = totalCountResult[0]?.count || 0;

      // Build search query
      let searchQuery = '';
      let searchParams = [];
      if (searchValue) {
        searchQuery = 'WHERE name LIKE ? AND deleted = 0';
        searchParams.push(`%${searchValue}%`);
      } else {
        searchQuery = 'WHERE deleted = 0';
      }

      // Get filtered count
      let filteredCountQuery = `
        SELECT COUNT(*) as count
        FROM industry_type
        ${searchQuery}
      `;
      const filteredCountResult = await query(filteredCountQuery, searchParams);
      const filteredCount = filteredCountResult[0]?.count || 0;

      // Get paginated data
      let dataQuery = `
        SELECT
          id,
          name,
          status
        FROM industry_type
        ${searchQuery}
        ORDER BY id DESC
        LIMIT ?, ?
      `;
      const dataParams = [...searchParams, startValue, lengthValue];
      const industryTypes = await query(dataQuery, dataParams);

      // Format data for DataTables (matching PHP exactly)
      const data = [];
      let i = startValue;
      for (const row of industryTypes) {
        i++;

        // Status badge (matching PHP exactly)
        let status = '<span class="badge bg-soft-success text-success">Active</span>';
        if (row.status == 0) {
          status = '<span class="badge bg-soft-danger text-danger">Inactive</span>';
        }

        // Action buttons (matching PHP exactly)
        const action = `<a href="javascript:void(0);" id="edit_${row.id}" data-id="${row.id}" data-name="${row.name}" data-status="${row.status}" onclick="viewEditDetails(${row.id});" class="action-icon"> <i class="mdi mdi-square-edit-outline"></i></a>
                        <a href="javascript:void(0);" class="action-icon delete_info" data-id="${row.id}"> <i class="mdi mdi-delete"></i></a>`;

        data.push([i, row.name, status, action]);
      }

      // Return response in DataTables format (matching PHP exactly)
      return res.json({
        draw: drawValue,
        recordsTotal: totalCount,
        recordsFiltered: filteredCount,
        data: data
      });

    } catch (error) {
      console.error('listIndustryTypeAjax error:', error);
      return res.json({
        status: false,
        rcode: 500,
        message: 'Failed to retrieve industry type list'
      });
    }
  }

  // Check duplicate industry type - PHP compatible version
  static async checkDuplicateIndustryType(req, res) {
    try {
      // Support both query parameters and form data
      const { user_id, token, name, id } = {
        ...req.query,
        ...req.body
      };

      console.log('checkDuplicateIndustryType - Parameters:', { user_id, token, name, id });

      // Check if user_id and token are provided
      if (!user_id || !token) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'user_id and token are required'
        });
      }

      // Decode user ID
      const decodedUserId = idDecode(user_id);
      if (!decodedUserId) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'Invalid user ID'
        });
      }

      // Get user details and validate
      const userRows = await query('SELECT * FROM users WHERE user_id = ? LIMIT 1', [decodedUserId]);
      if (!userRows.length) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'Not A Valid User'
        });
      }

      const user = userRows[0];

      // Validate token
      if (user.unique_token !== token) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'Token Mismatch Exception'
        });
      }

      // Check if user is admin (role_id = 1 or 2)
      const adminRows = await query('SELECT * FROM admin_users WHERE id = ? LIMIT 1', [decodedUserId]);
      if (!adminRows.length) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'Permission denied'
        });
      }

      // Check if required fields are provided
      if (!name) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'name is required'
        });
      }

      // Build condition for duplicate check (matching PHP exactly)
      let condition = '';
      let params = [];

      if (parseInt(id) > 0) {
        // Editing existing industry type - exclude current record
        condition = 'id != ? AND deleted = 0 AND name = ?';
        params = [id, name];
      } else {
        // Adding new industry type
        condition = 'deleted = 0 AND name = ?';
        params = [name];
      }

      // Check for duplicate industry type name
      const duplicateRows = await query(
        `SELECT COUNT(*) as count FROM industry_type WHERE ${condition}`,
        params
      );

      const hasDuplicate = duplicateRows[0]?.count > 0;

      // Return response in PHP format (matching exactly)
      return res.json({
        validate: hasDuplicate
      });

    } catch (error) {
      console.error('checkDuplicateIndustryType error:', error);
      return res.json({
        status: false,
        rcode: 500,
        message: 'Failed to check duplicate industry type'
      });
    }
  }

  // Delete industry type - PHP compatible version
  static async deleteIndustryType(req, res) {
    try {
      // Support both query parameters and form data
      const { user_id, token, keys } = {
        ...req.query,
        ...req.body
      };

      console.log('deleteIndustryType - Parameters:', { user_id, token, keys });

      // Check if user_id and token are provided
      if (!user_id || !token) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'user_id and token are required'
        });
      }

      // Decode user ID
      const decodedUserId = idDecode(user_id);
      if (!decodedUserId) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'Invalid user ID'
        });
      }

      // Get user details and validate
      const userRows = await query('SELECT * FROM users WHERE user_id = ? LIMIT 1', [decodedUserId]);
      if (!userRows.length) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'Not A Valid User'
        });
      }

      const user = userRows[0];

      // Validate token
      if (user.unique_token !== token) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'Token Mismatch Exception'
        });
      }

      // Check if user is admin (role_id = 1 or 2)
      const adminRows = await query('SELECT * FROM admin_users WHERE id = ? LIMIT 1', [decodedUserId]);
      if (!adminRows.length) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'Permission denied'
        });
      }

      // Check if keys (industry type ID) is provided
      if (!keys) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'Industry type ID is required'
        });
      }

      // Check if industry type is used in user_personal_details (matching PHP exactly)
      const personalDetails = await query('SELECT * FROM user_personal_details WHERE industry_type_id = ? AND deleted = 0', [keys]);
      
      if (personalDetails.length > 0) {
        return res.json({
          status: 'Error',
          info: 'Unable to Delete. Due to Industry Type Active in User Personal Details'
        });
      }

      // Soft delete the industry type (matching PHP exactly)
      const deleteData = {
        deleted: 1,
        deleted_at: new Date().toISOString().slice(0, 19).replace('T', ' '),
        deleted_by: adminRows[0].role_id
      };

      await query(
        'UPDATE industry_type SET deleted = ?, deleted_at = ?, deleted_by = ? WHERE id = ?',
        [deleteData.deleted, deleteData.deleted_at, deleteData.deleted_by, keys]
      );

      // Return response in PHP format (matching exactly)
      return res.json({
        status: 'Success',
        info: 'Industry Type Deleted Successfully'
      });

    } catch (error) {
      console.error('deleteIndustryType error:', error);
      return res.json({
        status: 'Error',
        info: 'Failed to delete industry type'
      });
    }
  }

  // View fund size - PHP compatible version
  static async viewFundSize(req, res) {
    try {
      // Support both query parameters and form data
      const { user_id, token } = {
        ...req.query,
        ...req.body
      };

      console.log('viewFundSize - Parameters:', { user_id, token });

      // Check if user_id and token are provided
      if (!user_id || !token) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'user_id and token are required'
        });
      }

      // Decode user ID
      const decodedUserId = idDecode(user_id);
      if (!decodedUserId) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'Invalid user ID'
        });
      }

      // Get user details and validate
      const userRows = await query('SELECT * FROM users WHERE user_id = ? LIMIT 1', [decodedUserId]);
      if (!userRows.length) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'Not A Valid User'
        });
      }

      const user = userRows[0];

      // Validate token
      if (user.unique_token !== token) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'Token Mismatch Exception'
        });
      }

      // Check if user is admin (role_id = 1 or 2)
      const adminRows = await query('SELECT * FROM admin_users WHERE id = ? LIMIT 1', [decodedUserId]);
      if (!adminRows.length) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'Permission denied'
        });
      }

      // Get all fund sizes ordered by investment_range (matching PHP exactly)
      const fundSizes = await query('SELECT * FROM fund_size WHERE deleted = 0 ORDER BY investment_range ASC');

      // Return response in PHP format (matching exactly)
      return res.json({
        status: true,
        rcode: 200,
        user_id: idEncode(decodedUserId),
        unique_token: token,
        fund_size_list: fundSizes || [],
        message: 'Fund size list view data retrieved successfully'
      });

    } catch (error) {
      console.error('viewFundSize error:', error);
      return res.json({
        status: false,
        rcode: 500,
        message: 'Failed to retrieve fund size list view data'
      });
    }
  }

  // Submit fund size - PHP compatible version
  static async submitFundSize(req, res) {
    try {
      // Support both query parameters and form data
      const { user_id, token, row_id, investment_range, status } = {
        ...req.query,
        ...req.body
      };

      console.log('submitFundSize - Parameters:', { user_id, token, row_id, investment_range, status });

      // Check if user_id and token are provided
      if (!user_id || !token) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'user_id and token are required'
        });
      }

      // Decode user ID
      const decodedUserId = idDecode(user_id);
      if (!decodedUserId) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'Invalid user ID'
        });
      }

      // Get user details and validate
      const userRows = await query('SELECT * FROM users WHERE user_id = ? LIMIT 1', [decodedUserId]);
      if (!userRows.length) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'Not A Valid User'
        });
      }

      const user = userRows[0];

      // Validate token
      if (user.unique_token !== token) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'Token Mismatch Exception'
        });
      }

      // Check if user is admin (role_id = 1 or 2)
      const adminRows = await query('SELECT * FROM admin_users WHERE id = ? LIMIT 1', [decodedUserId]);
      if (!adminRows.length) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'Permission denied'
        });
      }

      // Check if required fields are provided
      if (!investment_range) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'investment_range is required'
        });
      }

      // Get admin role_id
      const admin = adminRows[0];

      if (!row_id || row_id === '') {
        // Insert new fund size (matching PHP exactly)
        const insertData = {
          investment_range: investment_range.trim(),
          status: status !== undefined ? parseInt(status) : 1,
          created_at: new Date().toISOString().slice(0, 19).replace('T', ' '),
          created_by: admin.role_id
        };

        await query(
          'INSERT INTO fund_size (investment_range, status, created_at, created_by, deleted) VALUES (?, ?, ?, ?, 0)',
          [insertData.investment_range, insertData.status, insertData.created_at, insertData.created_by]
        );

        const info = 'Data Created Successfully';

        // Return response in PHP format (matching exactly)
        return res.json({
          status: 'Success',
          info: info
        });

      } else {
        // Update existing fund size (matching PHP exactly)
        const updateData = {
          investment_range: investment_range.trim(),
          status: status !== undefined ? parseInt(status) : 1,
          updated_at: new Date().toISOString().slice(0, 19).replace('T', ' '),
          updated_by: admin.role_id
        };

        await query(
          'UPDATE fund_size SET investment_range = ?, status = ?, updated_at = ?, updated_by = ? WHERE id = ?',
          [updateData.investment_range, updateData.status, updateData.updated_at, updateData.updated_by, row_id]
        );

        const info = 'Data Updated Successfully';

        // Return response in PHP format (matching exactly)
        return res.json({
          status: 'Success',
          info: info
        });
      }

    } catch (error) {
      console.error('submitFundSize error:', error);
      return res.json({
        status: 'Error',
        info: 'Failed to submit fund size'
      });
    }
  }

  // List fund size ajax - PHP compatible version
  static async listFundSizeAjax(req, res) {
    try {
      // Support both query parameters and form data
      const { user_id, token } = {
        ...req.query,
        ...req.body
      };

      console.log('listFundSizeAjax - Parameters:', { user_id, token });

      // Check if user_id and token are provided
      if (!user_id || !token) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'user_id and token are required'
        });
      }

      // Decode user ID
      const decodedUserId = idDecode(user_id);
      if (!decodedUserId) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'Invalid user ID'
        });
      }

      // Get user details and validate
      const userRows = await query('SELECT * FROM users WHERE user_id = ? LIMIT 1', [decodedUserId]);
      if (!userRows.length) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'Not A Valid User'
        });
      }

      const user = userRows[0];

      // Validate token
      if (user.unique_token !== token) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'Token Mismatch Exception'
        });
      }

      // Check if user is admin (role_id = 1 or 2)
      const adminRows = await query('SELECT * FROM admin_users WHERE id = ? LIMIT 1', [decodedUserId]);
      if (!adminRows.length) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'Permission denied'
        });
      }

      // DataTables parameters
      const drawValue = parseInt(req.body.draw || req.query.draw || 1);
      const startValue = parseInt(req.body.start || req.query.start || 0);
      const lengthValue = parseInt(req.body.length || req.query.length || 10);
      const searchValue = req.body.search?.value || req.query.search || '';

      // Get total count
      const totalCountResult = await query('SELECT COUNT(*) as count FROM fund_size WHERE deleted = 0');
      const totalCount = totalCountResult[0]?.count || 0;

      // Build search query
      let searchQuery = '';
      let searchParams = [];
      if (searchValue) {
        searchQuery = 'WHERE investment_range LIKE ? AND deleted = 0';
        searchParams.push(`%${searchValue}%`);
      } else {
        searchQuery = 'WHERE deleted = 0';
      }

      // Get filtered count
      let filteredCountQuery = `
        SELECT COUNT(*) as count
        FROM fund_size
        ${searchQuery}
      `;
      const filteredCountResult = await query(filteredCountQuery, searchParams);
      const filteredCount = filteredCountResult[0]?.count || 0;

      // Get paginated data
      let dataQuery = `
        SELECT
          id,
          investment_range,
          status
        FROM fund_size
        ${searchQuery}
        ORDER BY id DESC
        LIMIT ?, ?
      `;
      const dataParams = [...searchParams, startValue, lengthValue];
      const fundSizes = await query(dataQuery, dataParams);

      // Format data for DataTables (matching PHP exactly)
      const data = [];
      let i = startValue;
      for (const row of fundSizes) {
        i++;

        // Status badge (matching PHP exactly)
        let status = '<span class="badge bg-soft-success text-success">Active</span>';
        if (row.status == 0) {
          status = '<span class="badge bg-soft-danger text-danger">Inactive</span>';
        }

        // Action buttons (matching PHP exactly)
        const action = `<a href="javascript:void(0);" id="edit_${row.id}" data-id="${row.id}" data-name="${row.name}" data-status="${row.status}" onclick="viewEditDetails(${row.id});" class="action-icon"> <i class="mdi mdi-square-edit-outline"></i></a>
                        <a href="javascript:void(0);" class="action-icon delete_info" data-id="${row.id}"> <i class="mdi mdi-delete"></i></a>`;

        data.push([i, row.name, status, action]);
      }

      // Return response in DataTables format (matching PHP exactly)
      return res.json({
        draw: drawValue,
        recordsTotal: totalCount,
        recordsFiltered: filteredCount,
        data: data
      });

    } catch (error) {
      console.error('listFundSizeAjax error:', error);
      return res.json({
        status: false,
        rcode: 500,
        message: 'Failed to retrieve fund size list'
      });
    }
  }

  // Check duplicate fund size - PHP compatible version
  static async checkDuplicateFundSize(req, res) {
    try {
      // Support both query parameters and form data
      const { user_id, token, name, id } = {
        ...req.query,
        ...req.body
      };

      console.log('checkDuplicateFundSize - Parameters:', { user_id, token, name, id });

      // Check if user_id and token are provided
      if (!user_id || !token) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'user_id and token are required'
        });
      }

      // Decode user ID
      const decodedUserId = idDecode(user_id);
      if (!decodedUserId) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'Invalid user ID'
        });
      }

      // Get user details and validate
      const userRows = await query('SELECT * FROM users WHERE user_id = ? LIMIT 1', [decodedUserId]);
      if (!userRows.length) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'Not A Valid User'
        });
      }

      const user = userRows[0];

      // Validate token
      if (user.unique_token !== token) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'Token Mismatch Exception'
        });
      }

      // Check if user is admin (role_id = 1 or 2)
      const adminRows = await query('SELECT * FROM admin_users WHERE id = ? LIMIT 1', [decodedUserId]);
      if (!adminRows.length) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'Permission denied'
        });
      }

      // Check if required fields are provided
      if (!name) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'name is required'
        });
      }

      // Build condition for duplicate check (matching PHP exactly)
      let condition = '';
      let params = [];

      if (parseInt(id) > 0) {
        // Editing existing fund size - exclude current record
        condition = 'id != ? AND deleted = 0 AND name = ?';
        params = [id, name];
      } else {
        // Adding new fund size
        condition = 'deleted = 0 AND name = ?';
        params = [name];
      }

      // Check for duplicate fund size name
      const duplicateRows = await query(
        `SELECT COUNT(*) as count FROM fund_size WHERE ${condition}`,
        params
      );

      const hasDuplicate = duplicateRows[0]?.count > 0;

      // Return response in PHP format (matching exactly)
      return res.json({
        validate: hasDuplicate
      });

    } catch (error) {
      console.error('checkDuplicateFundSize error:', error);
      return res.json({
        status: false,
        rcode: 500,
        message: 'Failed to check duplicate fund size'
      });
    }
  }

  // Delete fund size - PHP compatible version
  static async deleteFundSize(req, res) {
    try {
      // Support both query parameters and form data
      const { user_id, token, keys } = {
        ...req.query,
        ...req.body
      };

      console.log('deleteFundSize - Parameters:', { user_id, token, keys });

      // Check if user_id and token are provided
      if (!user_id || !token) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'user_id and token are required'
        });
      }

      // Decode user ID
      const decodedUserId = idDecode(user_id);
      if (!decodedUserId) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'Invalid user ID'
        });
      }

      // Get user details and validate
      const userRows = await query('SELECT * FROM users WHERE user_id = ? LIMIT 1', [decodedUserId]);
      if (!userRows.length) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'Not A Valid User'
        });
      }

      const user = userRows[0];

      // Validate token
      if (user.unique_token !== token) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'Token Mismatch Exception'
        });
      }

      // Check if user is admin (role_id = 1 or 2)
      const adminRows = await query('SELECT * FROM admin_users WHERE id = ? LIMIT 1', [decodedUserId]);
      if (!adminRows.length) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'Permission denied'
        });
      }

      // Check if keys (fund size ID) is provided
      if (!keys) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'Fund size ID is required'
        });
      }

      // Check if fund size is used in user_investor (matching PHP exactly)
      const investorDetails = await query('SELECT * FROM user_investor WHERE fund_size_id = ? AND deleted = 0', [keys]);
      
      if (investorDetails.length > 0) {
        return res.json({
          status: 'Error',
          info: 'Unable to Delete. Due to Fund Size Active in Investors'
        });
      }

      // Soft delete the fund size (matching PHP exactly)
      const deleteData = {
        deleted: 1,
        deleted_at: new Date().toISOString().slice(0, 19).replace('T', ' '),
        deleted_by: adminRows[0].role_id
      };

      await query(
        'UPDATE fund_size SET deleted = ?, deleted_at = ?, deleted_by = ? WHERE id = ?',
        [deleteData.deleted, deleteData.deleted_at, deleteData.deleted_by, keys]
      );

      // Return response in PHP format (matching exactly)
      return res.json({
        status: 'Success',
        info: 'Fund Size Deleted Successfully'
      });

    } catch (error) {
      console.error('deleteFundSize error:', error);
      return res.json({
        status: 'Error',
        info: 'Failed to delete fund size'
      });
    }
  }

  // View folders - PHP compatible version

  static async viewUsers(req, res) {
    try {
      // Support both query parameters and form data
      const { user_id, token } = {
        ...req.query,
        ...req.body
      };

      console.log('viewUsers - Parameters:', { user_id, token });

      // Check if user_id and token are provided
      if (!user_id || !token) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'user_id and token are required'
        });
      }

      // Decode user ID
      const decodedUserId = idDecode(user_id);
      if (!decodedUserId) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'Invalid user ID'
        });
      }

      // Check if user exists
      const userRows = await query('SELECT * FROM users WHERE user_id = ? LIMIT 1', [decodedUserId]);
      if (!userRows.length) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'User not found'
        });
      }

      // Check if user is admin (role_id = 1 or 2)
      const adminRows = await query('SELECT * FROM admin_users WHERE id = ? LIMIT 1', [decodedUserId]);
      if (!adminRows.length) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'Permission denied'
        });
      }

      // Get all countries ordered by name (matching PHP exactly)
      const countries = await query('SELECT * FROM countries WHERE status = 1 ORDER BY name ASC');

      // Return response in PHP format (matching exactly)
      return res.json({
        status: true,
        rcode: 200,
        user_id: user_id,
        unique_token: token,
        list_country: countries,
        message: 'Users list view data retrieved successfully'
      });

    } catch (error) {
      console.error('viewUsers error:', error);
      return res.json({
        status: false,
        rcode: 500,
        message: 'Failed to retrieve users list view data'
      });
    }
  }

  // Submit users - PHP compatible version
  static async submitUsers(req, res) {
    try {
      // Support both query parameters and form data
      const { user_id, token, row_id, full_name, mobile, email, address, country_id, state_id, city_id, status } = {
        ...req.query,
        ...req.body
      };

      console.log('submitUsers - Parameters:', { user_id, token, row_id, full_name, mobile, email, address, country_id, state_id, city_id, status });

      // Check if user_id and token are provided
      if (!user_id || !token) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'user_id and token are required'
        });
      }

      // Decode user ID
      const decodedUserId = idDecode(user_id);
      if (!decodedUserId) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'Invalid user ID'
        });
      }

      // Check if user exists
      const userRows = await query('SELECT * FROM users WHERE user_id = ? LIMIT 1', [decodedUserId]);
      if (!userRows.length) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'User not found'
        });
      }

      // Check if user is admin (role_id = 1 or 2)
      const adminRows = await query('SELECT * FROM admin_users WHERE id = ? LIMIT 1', [decodedUserId]);
      if (!adminRows.length) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'Permission denied'
        });
      }

      // Check if required fields are provided
      if (!full_name || !mobile || !email) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'full_name, mobile, and email are required'
        });
      }

      // Get admin role_id
      const admin = adminRows[0];

      // Check for duplicate mobile and email (matching PHP exactly)
      const mobileCheck = await query('SELECT * FROM users WHERE mobile = ? AND deleted = 0', [mobile]);
      const emailCheck = await query('SELECT * FROM users WHERE email = ? AND deleted = 0', [email]);

      if (!row_id || row_id === '') {
        // Insert new user (matching PHP exactly)
        if (mobileCheck.length > 0) {
          return res.json({
            status: 'Error',
            info: 'Mobile No Already Added'
          });
        }
        
        if (emailCheck.length > 0) {
          return res.json({
            status: 'Error',
            info: 'Email Address Already Added'
          });
        }

        // Generate unique token (matching PHP format: md5($mobile.date('YmdHis')))
        const now = new Date();
        const timestamp = now.getFullYear().toString() +
                         (now.getMonth() + 1).toString().padStart(2, '0') +
                         now.getDate().toString().padStart(2, '0') +
                         now.getHours().toString().padStart(2, '0') +
                         now.getMinutes().toString().padStart(2, '0') +
                         now.getSeconds().toString().padStart(2, '0');
        
        const str_token = mobile + timestamp;
        const crypto = require('crypto');
        const unique_token = crypto.createHash('md5').update(str_token).digest('hex');

        const insertData = {
          full_name: full_name.trim(),
          mobile: mobile.trim(),
          email: email.trim(),
          address: address ? address.trim() : '',
          country_id: country_id ? parseInt(country_id) : null,
          state_id: state_id ? parseInt(state_id) : null,
          city_id: city_id ? parseInt(city_id) : null,
          status: status !== undefined ? parseInt(status) : 1,
          unique_token: unique_token,
          created_dts: new Date().toISOString().slice(0, 19).replace('T', ' '),
          created_by: admin.role_id
        };

        await query(
          'INSERT INTO users (full_name, mobile, email, address, country_id, state_id, city_id, status, unique_token, created_dts, created_by, deleted) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)',
          [insertData.full_name, insertData.mobile, insertData.email, insertData.address, insertData.country_id, insertData.state_id, insertData.city_id, insertData.status, insertData.unique_token, insertData.created_dts, insertData.created_by]
        );

        return res.json({
          status: 'Success',
          info: 'User Created Successfully'
        });

      } else {
        // Update existing user (matching PHP exactly)
        let hasConflict = false;

        if (mobileCheck.length > 0 && mobileCheck[0].user_id != row_id) {
          hasConflict = true;
        }
        
        if (emailCheck.length > 0 && emailCheck[0].user_id != row_id) {
          hasConflict = true;
        }

        if (hasConflict) {
          return res.json({
            status: 'Error',
            info: 'Mobile or Email Already Added'
          });
        }

        const updateData = {
          full_name: full_name.trim(),
          mobile: mobile.trim(),
          email: email.trim(),
          address: address ? address.trim() : '',
          country_id: country_id ? parseInt(country_id) : null,
          state_id: state_id ? parseInt(state_id) : null,
          city_id: city_id ? parseInt(city_id) : null,
          status: status !== undefined ? parseInt(status) : 1,
          updated_at: new Date().toISOString().slice(0, 19).replace('T', ' '),
          updated_by: admin.role_id
        };

        await query(
          'UPDATE users SET full_name = ?, mobile = ?, email = ?, address = ?, country_id = ?, state_id = ?, city_id = ?, status = ?, updated_at = ?, updated_by = ? WHERE user_id = ?',
          [updateData.full_name, updateData.mobile, updateData.email, updateData.address, updateData.country_id, updateData.state_id, updateData.city_id, updateData.status, updateData.updated_at, updateData.updated_by, row_id]
        );

        return res.json({
          status: 'Success',
          info: 'User Updated Successfully'
        });
      }

    } catch (error) {
      console.error('submitUsers error:', error);
      return res.json({
        status: 'Error',
        info: 'Failed to submit user'
      });
    }
  }

  // List users ajax - PHP compatible version
  static async listUsersAjax(req, res) {
    try {
      // Support both query parameters and form data
      const { user_id, token } = {
        ...req.query,
        ...req.body
      };

      console.log('listUsersAjax - Parameters:', { user_id, token });

      // Check if user_id and token are provided
      if (!user_id || !token) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'user_id and token are required'
        });
      }

      // Decode user ID
      const decodedUserId = idDecode(user_id);
      if (!decodedUserId) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'Invalid user ID'
        });
      }

      // Check if user exists
      const userRows = await query('SELECT * FROM users WHERE user_id = ? LIMIT 1', [decodedUserId]);
      if (!userRows.length) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'User not found'
        });
      }

      // Check if user is admin (role_id = 1 or 2)
      const adminRows = await query('SELECT * FROM admin_users WHERE id = ? LIMIT 1', [decodedUserId]);
      if (!adminRows.length) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'Permission denied'
        });
      }

      // Get DataTables parameters (matching PHP exactly)
      const drawValue = parseInt(req.body.draw || req.query.draw || 1);
      const startValue = parseInt(req.body.start || req.query.start || 0);
      const lengthValue = parseInt(req.body.length || req.query.length || 10);
      const searchValue = req.body.search?.value || req.query.search || '';

      // Get total count
      const totalCountResult = await query('SELECT COUNT(*) as count FROM users WHERE deleted = 0');
      const totalCount = totalCountResult[0]?.count || 0;

      // Build search query
      let searchQuery = '';
      let searchParams = [];
      if (searchValue) {
        searchQuery = 'WHERE (full_name LIKE ? OR mobile LIKE ? OR email LIKE ?) AND deleted = 0';
        searchParams.push(`%${searchValue}%`, `%${searchValue}%`, `%${searchValue}%`);
      } else {
        searchQuery = 'WHERE deleted = 0';
      }

      // Get filtered count
      let filteredCountQuery = `
        SELECT COUNT(*) as count
        FROM users
        ${searchQuery}
      `;
      const filteredCountResult = await query(filteredCountQuery, searchParams);
      const filteredCount = filteredCountResult[0]?.count || 0;

      // Get paginated data
      let dataQuery = `
        SELECT
          user_id,
          full_name,
          mobile,
          email,
          status
        FROM users
        ${searchQuery}
        ORDER BY user_id DESC
        LIMIT ?, ?
      `;
      const dataParams = [...searchParams, startValue, lengthValue];
      const users = await query(dataQuery, dataParams);

      // Format data for DataTables (matching PHP exactly)
      const data = [];
      let i = startValue;
      for (const row of users) {
        i++;

        // Status badge (matching PHP exactly)
        let status = '<span class="badge bg-soft-success text-success">Active</span>';
        if (row.status == 0) {
          status = '<span class="badge bg-soft-danger text-danger">Inactive</span>';
        }

        // Action buttons (matching PHP exactly)
        const action = `<a href="javascript:void(0);" data-id="${row.user_id}" class="action-icon edit_info"><i class="mdi mdi-square-edit-outline"></i></a>
                        <a href="javascript:void(0);" data-id="${row.user_id}" class="action-icon delete_info"><i class="mdi mdi-delete"></i></a>`;

        data.push([i, row.full_name, row.mobile, row.email, status, action]);
      }

      // Return DataTables response (matching PHP exactly)
      return res.json({
        draw: drawValue,
        recordsTotal: totalCount,
        recordsFiltered: filteredCount,
        data: data
      });

    } catch (error) {
      console.error('listUsersAjax error:', error);
      return res.json({
        status: false,
        rcode: 500,
        message: 'Failed to retrieve users data'
      });
    }
  }

  // Edit users - PHP compatible version
  static async editUsers(req, res) {
    try {
      // Support both query parameters and form data
      const { user_id, token, keys } = {
        ...req.query,
        ...req.body
      };

      console.log('editUsers - Parameters:', { user_id, token, keys });

      // Check if user_id and token are provided
      if (!user_id || !token) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'user_id and token are required'
        });
      }

      // Decode user ID
      const decodedUserId = idDecode(user_id);
      if (!decodedUserId) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'Invalid user ID'
        });
      }

      // Check if user exists
      const userRows = await query('SELECT * FROM users WHERE user_id = ? LIMIT 1', [decodedUserId]);
      if (!userRows.length) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'User not found'
        });
      }

      // Check if user is admin (role_id = 1 or 2)
      const adminRows = await query('SELECT * FROM admin_users WHERE id = ? LIMIT 1', [decodedUserId]);
      if (!adminRows.length) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'Permission denied'
        });
      }

      // Check if user ID is provided
      if (!keys) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'User ID is required'
        });
      }

      // Get user details (matching PHP exactly)
      const userDetails = await query('SELECT * FROM users WHERE user_id = ?', [keys]);
      
      if (userDetails.length === 0) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'User not found'
        });
      }

      const user = userDetails[0];

      // Get state list for the user's country (matching PHP exactly)
      let listState = '<option value="">Select State</option>';
      if (user.country_id) {
        const states = await query('SELECT * FROM states WHERE country_id = ? AND status = 1 ORDER BY name ASC', [user.country_id]);
        if (states.length > 0) {
          for (const state of states) {
            const selected = state.id == user.state_id ? 'selected' : '';
            listState += `<option value="${state.id}" ${selected}>${state.name}</option>`;
          }
        } else {
          listState = '<option value="">State List Empty</option>';
        }
      } else {
        listState = '<option value="">State List Empty</option>';
      }

      // Get city list for the user's state (matching PHP exactly)
      let listCities = '<option value="">Select City</option>';
      if (user.state_id) {
        const cities = await query('SELECT * FROM cities WHERE state_id = ? AND status = 1 ORDER BY name ASC', [user.state_id]);
        if (cities.length > 0) {
          for (const city of cities) {
            const selected = city.id == user.city_id ? 'selected' : '';
            listCities += `<option value="${city.id}" ${selected}>${city.name}</option>`;
          }
        } else {
          listCities = '<option value="">City List Empty</option>';
        }
      } else {
        listCities = '<option value="">City List Empty</option>';
      }

      // Prepare response (matching PHP exactly)
      const response = {
        ...user,
        list_state: listState,
        list_cities: listCities
      };

      // Add profile photo URL if exists (matching PHP exactly)
      if (user.profile_photo) {
        response.profile_photo = `http://localhost:3000/uploads/profile_photos/${user.profile_photo}`;
      }

      return res.json(response);

    } catch (error) {
      console.error('editUsers error:', error);
      return res.json({
        status: false,
        rcode: 500,
        message: 'Failed to get user details'
      });
    }
  }

  // Check duplicate users - PHP compatible version
  static async checkDuplicateUsers(req, res) {
    try {
      // Support both query parameters and form data
      const { user_id, token, mobile, email, id } = {
        ...req.query,
        ...req.body
      };

      console.log('checkDuplicateUsers - Parameters:', { user_id, token, mobile, email, id });

      // Check if user_id and token are provided
      if (!user_id || !token) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'user_id and token are required'
        });
      }

      // Decode user ID
      const decodedUserId = idDecode(user_id);
      if (!decodedUserId) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'Invalid user ID'
        });
      }

      // Check if user exists
      const userRows = await query('SELECT * FROM users WHERE user_id = ? LIMIT 1', [decodedUserId]);
      if (!userRows.length) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'User not found'
        });
      }

      // Check if user is admin (role_id = 1 or 2)
      const adminRows = await query('SELECT * FROM admin_users WHERE id = ? LIMIT 1', [decodedUserId]);
      if (!adminRows.length) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'Permission denied'
        });
      }

      // Check if required fields are provided
      if (!mobile && !email) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'mobile or email is required'
        });
      }

      // Build condition for duplicate check (matching PHP exactly)
      let conditions = [];
      let params = [];

      if (mobile) {
        if (parseInt(id) > 0) {
          conditions.push('(mobile = ? AND user_id != ?)');
          params.push(mobile, id);
        } else {
          conditions.push('mobile = ?');
          params.push(mobile);
        }
      }

      if (email) {
        if (parseInt(id) > 0) {
          conditions.push('(email = ? AND user_id != ?)');
          params.push(email, id);
        } else {
          conditions.push('email = ?');
          params.push(email);
        }
      }

      // Add deleted condition
      conditions.push('deleted = 0');

      const condition = conditions.join(' OR ');

      // Check for duplicate (matching PHP exactly)
      const duplicateCheck = await query(
        `SELECT COUNT(*) as count FROM users WHERE ${condition}`,
        params
      );

      const isDuplicate = duplicateCheck[0]?.count > 0;

      // Return response in PHP format (matching exactly)
      return res.json({
        validate: isDuplicate
      });

    } catch (error) {
      console.error('checkDuplicateUsers error:', error);
      return res.json({
        status: false,
        rcode: 500,
        message: 'Failed to check duplicate user'
      });
    }
  }

  // Delete users - PHP compatible version
  static async deleteUsers(req, res) {
    try {
      // Support both query parameters and form data
      const { user_id, token, keys } = {
        ...req.query,
        ...req.body
      };

      console.log('deleteUsers - Parameters:', { user_id, token, keys });

      // Check if user_id and token are provided
      if (!user_id || !token) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'user_id and token are required'
        });
      }

      // Decode user ID
      const decodedUserId = idDecode(user_id);
      if (!decodedUserId) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'Invalid user ID'
        });
      }

      // Check if user exists
      const userRows = await query('SELECT * FROM users WHERE user_id = ? LIMIT 1', [decodedUserId]);
      if (!userRows.length) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'User not found'
        });
      }

      // Check if user is admin (role_id = 1 or 2)
      const adminRows = await query('SELECT * FROM admin_users WHERE id = ? LIMIT 1', [decodedUserId]);
      if (!adminRows.length) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'Permission denied'
        });
      }

      // Check if user ID is provided
      if (!keys) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'User ID is required'
        });
      }

      // Soft delete the user (matching PHP exactly)
      const deleteData = {
        deleted: 1,
        deleted_at: new Date().toISOString().slice(0, 19).replace('T', ' '),
        deleted_by: adminRows[0].role_id
      };

      await query(
        'UPDATE users SET deleted = ?, deleted_at = ?, deleted_by = ? WHERE user_id = ?',
        [deleteData.deleted, deleteData.deleted_at, deleteData.deleted_by, keys]
      );

      // Return response in PHP format (matching exactly)
      return res.json({
        status: 'Success',
        info: 'User Deleted Successfully'
      });

    } catch (error) {
      console.error('deleteUsers error:', error);
      return res.json({
        status: 'Error',
        info: 'Failed to delete user'
      });
    }
  }





  // View service provider - PHP compatible version
  static async viewServiceProvider(req, res) {
    try {
      // Support both query parameters and form data
      const { user_id, token } = {
        ...req.query,
        ...req.body
      };

      console.log('viewServiceProvider - Parameters:', { user_id, token });

      // Check if user_id and token are provided
      if (!user_id || !token) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'user_id and token are required'
        });
      }

      // Decode user ID
      const decodedUserId = idDecode(user_id);
      if (!decodedUserId) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'Invalid user ID'
        });
      }

      // Check if user exists
      const userRows = await query('SELECT * FROM users WHERE user_id = ? LIMIT 1', [decodedUserId]);
      if (!userRows.length) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'User not found'
        });
      }

      // Check if user is admin (role_id = 1 or 2)
      const adminRows = await query('SELECT * FROM admin_users WHERE id = ? LIMIT 1', [decodedUserId]);
      if (!adminRows.length) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'Permission denied'
        });
      }

      // Get all users ordered by full_name (matching PHP exactly)
      const users = await query('SELECT * FROM users WHERE deleted = 0 ORDER BY full_name ASC');

      // Get all countries ordered by name (matching PHP exactly)
      const countries = await query('SELECT * FROM countries WHERE status = 1 ORDER BY name ASC');

      // Return response in PHP format (matching exactly)
      return res.json({
        status: true,
        rcode: 200,
        user_id: user_id,
        unique_token: token,
        list_users: users,
        list_country: countries,
        message: 'Service provider list view data retrieved successfully'
      });

    } catch (error) {
      console.error('viewServiceProvider error:', error);
      return res.json({
        status: false,
        rcode: 500,
        message: 'Failed to retrieve service provider list view data'
      });
    }
  }

  // Submit service provider - PHP compatible version
  static async submitServiceProvider(req, res) {
    try {
      // Support both query parameters and form data
      const { user_id, token, row_id, sp_user_id, country_id, state_id, city_id, description, avg_sp_rating, approval_status, status } = {
        ...req.query,
        ...req.body
      };

      console.log('submitServiceProvider - Parameters:', { user_id, token, row_id, sp_user_id, country_id, state_id, city_id, description, avg_sp_rating, approval_status, status });

      // Check if user_id and token are provided
      if (!user_id || !token) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'user_id and token are required'
        });
      }

      // Decode user ID
      const decodedUserId = idDecode(user_id);
      if (!decodedUserId) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'Invalid user ID'
        });
      }

      // Check if user exists
      const userRows = await query('SELECT * FROM users WHERE user_id = ? LIMIT 1', [decodedUserId]);
      if (!userRows.length) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'User not found'
        });
      }

      // Check if user is admin (role_id = 1 or 2)
      const adminRows = await query('SELECT * FROM admin_users WHERE id = ? LIMIT 1', [decodedUserId]);
      if (!adminRows.length) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'Permission denied'
        });
      }

      // Check if required fields are provided
      if (!sp_user_id) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'user_id is required'
        });
      }

      // Get admin role_id
      const admin = adminRows[0];

      if (!row_id || row_id === '') {
        // Insert new service provider (matching PHP exactly)
        const insertData = {
          user_id: parseInt(sp_user_id),
          country_id: country_id ? parseInt(country_id) : null,
          state_id: state_id ? parseInt(state_id) : null,
          city_id: city_id ? parseInt(city_id) : null,
          description: description ? description.trim() : '',
          avg_sp_rating: avg_sp_rating ? parseFloat(avg_sp_rating) : 0,
          approval_status: approval_status ? parseInt(approval_status) : 1,
          status: status !== undefined ? parseInt(status) : 1,
          deleted: 0,
          created_dts: new Date().toISOString().slice(0, 19).replace('T', ' '),
          created_by: admin.role_id
        };

        await query(
          'INSERT INTO user_service_provider (user_id, country_id, state_id, city_id, description, avg_sp_rating, approval_status, status, deleted, created_dts, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
          [insertData.user_id, insertData.country_id, insertData.state_id, insertData.city_id, insertData.description, insertData.avg_sp_rating, insertData.approval_status, insertData.status, insertData.deleted, insertData.created_dts, insertData.created_by]
        );

        return res.json({
          status: 'Success',
          info: 'Service Provider Created Successfully'
        });

      } else {
        // Update existing service provider (matching PHP exactly)
        const updateData = {
          user_id: parseInt(sp_user_id),
          country_id: country_id ? parseInt(country_id) : null,
          state_id: state_id ? parseInt(state_id) : null,
          city_id: city_id ? parseInt(city_id) : null,
          description: description ? description.trim() : '',
          avg_sp_rating: avg_sp_rating ? parseFloat(avg_sp_rating) : 0,
          approval_status: approval_status ? parseInt(approval_status) : 1,
          status: status !== undefined ? parseInt(status) : 1,
          updated_at: new Date().toISOString().slice(0, 19).replace('T', ' '),
          updated_by: admin.role_id
        };

        await query(
          'UPDATE user_service_provider SET user_id = ?, country_id = ?, state_id = ?, city_id = ?, description = ?, avg_sp_rating = ?, approval_status = ?, status = ?, updated_at = ?, updated_by = ? WHERE sp_id = ?',
          [updateData.user_id, updateData.country_id, updateData.state_id, updateData.city_id, updateData.description, updateData.avg_sp_rating, updateData.approval_status, updateData.status, updateData.updated_at, updateData.updated_by, row_id]
        );

        return res.json({
          status: 'Success',
          info: 'Service Provider Updated Successfully'
        });
      }

    } catch (error) {
      console.error('submitServiceProvider error:', error);
      return res.json({
        status: 'Error',
        info: 'Failed to submit service provider'
      });
    }
  }

  // List service provider ajax - PHP compatible version
  static async listServiceProviderAjax(req, res) {
    try {
      // Support both query parameters and form data
      const { user_id, token } = {
        ...req.query,
        ...req.body
      };

      console.log('listServiceProviderAjax - Parameters:', { user_id, token });

      // Check if user_id and token are provided
      if (!user_id || !token) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'user_id and token are required'
        });
      }

      // Decode user ID
      const decodedUserId = idDecode(user_id);
      if (!decodedUserId) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'Invalid user ID'
        });
      }

      // Check if user exists
      const userRows = await query('SELECT * FROM users WHERE user_id = ? LIMIT 1', [decodedUserId]);
      if (!userRows.length) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'User not found'
        });
      }

      // Check if user is admin (role_id = 1 or 2)
      const adminRows = await query('SELECT * FROM admin_users WHERE id = ? LIMIT 1', [decodedUserId]);
      if (!adminRows.length) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'Permission denied'
        });
      }

      // Get DataTables parameters (matching PHP exactly)
      const drawValue = parseInt(req.body.draw || req.query.draw || 1);
      const startValue = parseInt(req.body.start || req.query.start || 0);
      const lengthValue = parseInt(req.body.length || req.query.length || 10);
      const searchValue = req.body.search?.value || req.query.search || '';

      // Get total count
      const totalCountResult = await query('SELECT COUNT(*) as count FROM user_service_provider WHERE deleted = 0');
      const totalCount = totalCountResult[0]?.count || 0;

      // Build search query
      let searchQuery = '';
      let searchParams = [];
      if (searchValue) {
        searchQuery = 'WHERE (users.full_name LIKE ? OR user_service_provider.description LIKE ? OR user_service_provider.approval_status LIKE ? OR user_service_provider.status LIKE ?) AND user_service_provider.deleted = 0';
        searchParams.push(`%${searchValue}%`, `%${searchValue}%`, `%${searchValue}%`, `%${searchValue}%`);
      } else {
        searchQuery = 'WHERE user_service_provider.deleted = 0';
      }

      // Get filtered count
      let filteredCountQuery = `
        SELECT COUNT(*) as count
        FROM user_service_provider
        LEFT JOIN users ON users.user_id = user_service_provider.user_id
        ${searchQuery}
      `;
      const filteredCountResult = await query(filteredCountQuery, searchParams);
      const filteredCount = filteredCountResult[0]?.count || 0;

      // Get paginated data
      let dataQuery = `
        SELECT
          users.full_name,
          user_service_provider.*
        FROM user_service_provider
        LEFT JOIN users ON users.user_id = user_service_provider.user_id
        ${searchQuery}
        ORDER BY users.full_name ASC
        LIMIT ?, ?
      `;
      const dataParams = [...searchParams, startValue, lengthValue];
      const serviceProviders = await query(dataQuery, dataParams);

      // Format data for DataTables (matching PHP exactly)
      const data = [];
      let i = startValue;
      for (const row of serviceProviders) {
        i++;

        // Approval status badge (matching PHP exactly)
        let appStatus = '<span class="badge bg-soft-warning text-warning">Pending</span>';
        if (row.approval_status == 2) {
          appStatus = '<span class="badge bg-soft-success text-success">Approved</span>';
        } else if (row.approval_status == 3) {
          appStatus = '<span class="badge bg-soft-danger text-danger">Rejected</span>';
        }

        // Status badge (matching PHP exactly)
        let status = '<span class="badge bg-soft-success text-success">Active</span>';
        if (row.status == 0) {
          status = '<span class="badge bg-soft-danger text-danger">Inactive</span>';
        }

        // Action buttons (matching PHP exactly)
        const action = `<a href="javascript:void(0);" data-id="${row.sp_id}" class="action-icon edit_info"><i class="mdi mdi-square-edit-outline"></i></a>
                        <a href="javascript:void(0);" data-id="${row.sp_id}" class="action-icon view_info"><i class="mdi mdi-eye"></i></a>
                        <a href="javascript:void(0);" data-id="${row.sp_id}" class="action-icon services_info"><i class="mdi mdi-server-network"></i></a>
                        <a href="javascript:void(0);" data-id="${row.sp_id}" class="action-icon delete_info"><i class="mdi mdi-delete"></i></a>`;

        data.push([i, row.full_name, row.description, appStatus, status, action]);
      }

      // Return DataTables response (matching PHP exactly)
      return res.json({
        draw: drawValue,
        recordsTotal: totalCount,
        recordsFiltered: filteredCount,
        data: data
      });

    } catch (error) {
      console.error('listServiceProviderAjax error:', error);
      return res.json({
        status: false,
        rcode: 500,
        message: 'Failed to retrieve service provider data'
      });
    }
  }

  // List service details ajax - PHP compatible version
  static async listServiceDetailsAjax(req, res) {
    try {
      // Support both query parameters and form data
      const { user_id, token, service_id } = {
        ...req.query,
        ...req.body
      };

      console.log('listServiceDetailsAjax - Parameters:', { user_id, token, service_id });

      // Check if user_id and token are provided
      if (!user_id || !token) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'user_id and token are required'
        });
      }

      // Decode user ID
      const decodedUserId = idDecode(user_id);
      if (!decodedUserId) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'Invalid user ID'
        });
      }

      // Check if user exists
      const userRows = await query('SELECT * FROM users WHERE user_id = ? LIMIT 1', [decodedUserId]);
      if (!userRows.length) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'User not found'
        });
      }

      // Check if user is admin (role_id = 1 or 2)
      const adminRows = await query('SELECT * FROM admin_users WHERE id = ? LIMIT 1', [decodedUserId]);
      if (!adminRows.length) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'Permission denied'
        });
      }

      // Check if service_id is provided
      if (!service_id) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'service_id is required'
        });
      }

      // Get DataTables parameters (matching PHP exactly)
      const drawValue = parseInt(req.body.draw || req.query.draw || 1);
      const startValue = parseInt(req.body.start || req.query.start || 0);
      const lengthValue = parseInt(req.body.length || req.query.length || 10);
      const searchValue = req.body.search?.value || req.query.search || '';

      // Get total count
      const totalCountResult = await query('SELECT COUNT(*) as count FROM user_service_provider_services WHERE sp_id = ?', [service_id]);
      const totalCount = totalCountResult[0]?.count || 0;

      // Build search query
      let searchQuery = '';
      let searchParams = [];
      if (searchValue) {
        searchQuery = 'WHERE (folders.name LIKE ? OR user_service_provider_services.service_name LIKE ? OR user_service_provider_services.company_name LIKE ? OR user_service_provider_services.title LIKE ? OR user_service_provider_services.status LIKE ? OR user_service_provider_services.created_dts LIKE ?) AND user_service_provider_services.sp_id = ?';
        searchParams.push(`%${searchValue}%`, `%${searchValue}%`, `%${searchValue}%`, `%${searchValue}%`, `%${searchValue}%`, `%${searchValue}%`, service_id);
      } else {
        searchQuery = 'WHERE user_service_provider_services.sp_id = ?';
        searchParams.push(service_id);
      }

      // Get filtered count
      let filteredCountQuery = `
        SELECT COUNT(*) as count
        FROM user_service_provider_services
        LEFT JOIN folders ON folders.id = user_service_provider_services.service_id
        ${searchQuery}
      `;
      const filteredCountResult = await query(filteredCountQuery, searchParams);
      const filteredCount = filteredCountResult[0]?.count || 0;

      // Get paginated data
      let dataQuery = `
        SELECT
          folders.name,
          user_service_provider_services.*
        FROM user_service_provider_services
        LEFT JOIN folders ON folders.id = user_service_provider_services.service_id
        ${searchQuery}
        ORDER BY user_service_provider_services.service_name ASC
        LIMIT ?, ?
      `;
      const dataParams = [...searchParams, startValue, lengthValue];
      const serviceDetails = await query(dataQuery, dataParams);

      // Format data for DataTables (matching PHP exactly)
      const data = [];
      let i = startValue;
      for (const row of serviceDetails) {
        i++;

        // Status badge (matching PHP exactly)
        let status = '<span class="badge bg-soft-success text-success">Active</span>';
        if (row.status == 0) {
          status = '<span class="badge bg-soft-danger text-danger">Inactive</span>';
        }

        // Created date (matching PHP exactly)
        const created = new Date(row.created_dts).toLocaleString('en-GB', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          hour12: true
        });

        // Service image (matching PHP exactly)
        const imagePath = row.service_image ? `http://localhost:3000/uploads/services/${row.service_image}` : '';
        const images = imagePath ? `<img src="${imagePath}" width="80px" />` : '';

        data.push([i, images, row.name, row.service_name, row.company_name, row.title, row.tag_line, row.service_description, row.avg_service_rating, status, created]);
      }

      // Return DataTables response (matching PHP exactly)
      return res.json({
        draw: drawValue,
        recordsTotal: totalCount,
        recordsFiltered: filteredCount,
        data: data
      });

    } catch (error) {
      console.error('listServiceDetailsAjax error:', error);
      return res.json({
        status: false,
        rcode: 500,
        message: 'Failed to retrieve service details data'
      });
    }
  }

  // Edit service provider - PHP compatible version
  static async editServiceProvider(req, res) {
    try {
      // Support both query parameters and form data
      const { user_id, token, keys } = {
        ...req.query,
        ...req.body
      };

      console.log('editServiceProvider - Parameters:', { user_id, token, keys });

      // Check if user_id and token are provided
      if (!user_id || !token) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'user_id and token are required'
        });
      }

      // Decode user ID
      const decodedUserId = idDecode(user_id);
      if (!decodedUserId) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'Invalid user ID'
        });
      }

      // Check if user exists
      const userRows = await query('SELECT * FROM users WHERE user_id = ? LIMIT 1', [decodedUserId]);
      if (!userRows.length) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'User not found'
        });
      }

      // Check if user is admin (role_id = 1 or 2)
      const adminRows = await query('SELECT * FROM admin_users WHERE id = ? LIMIT 1', [decodedUserId]);
      if (!adminRows.length) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'Permission denied'
        });
      }

      // Check if service provider ID is provided
      if (!keys) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'Service Provider ID is required'
        });
      }

      // Get service provider details (matching PHP exactly)
      const serviceProviderDetails = await query('SELECT * FROM user_service_provider WHERE sp_id = ?', [keys]);
      
      if (serviceProviderDetails.length === 0) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'Service provider not found'
        });
      }

      const serviceProvider = serviceProviderDetails[0];

      // Get state list for the service provider's country (matching PHP exactly)
      let listState = '<option value="">Select State</option>';
      if (serviceProvider.country_id) {
        const states = await query('SELECT * FROM states WHERE country_id = ? AND status = 1 ORDER BY name ASC', [serviceProvider.country_id]);
        if (states.length > 0) {
          for (const state of states) {
            const selected = state.id == serviceProvider.state_id ? 'selected' : '';
            listState += `<option value="${state.id}" ${selected}>${state.name}</option>`;
          }
        } else {
          listState = '<option value="">State List Empty</option>';
        }
      } else {
        listState = '<option value="">State List Empty</option>';
      }

      // Get city list for the service provider's state (matching PHP exactly)
      let listCities = '<option value="">Select City</option>';
      if (serviceProvider.state_id) {
        const cities = await query('SELECT * FROM cities WHERE state_id = ? AND status = 1 ORDER BY name ASC', [serviceProvider.state_id]);
        if (cities.length > 0) {
          for (const city of cities) {
            const selected = city.id == serviceProvider.city_id ? 'selected' : '';
            listCities += `<option value="${city.id}" ${selected}>${city.name}</option>`;
          }
        } else {
          listCities = '<option value="">City List Empty</option>';
        }
      } else {
        listCities = '<option value="">City List Empty</option>';
      }

      // Prepare response (matching PHP exactly)
      const response = {
        ...serviceProvider,
        list_state: listState,
        list_cities: listCities
      };

      return res.json(response);

    } catch (error) {
      console.error('editServiceProvider error:', error);
      return res.json({
        status: false,
        rcode: 500,
        message: 'Failed to get service provider details'
      });
    }
  }

  // Delete service provider - PHP compatible version
  static async deleteServiceProvider(req, res) {
    try {
      // Support both query parameters and form data
      const { user_id, token, keys } = {
        ...req.query,
        ...req.body
      };

      console.log('deleteServiceProvider - Parameters:', { user_id, token, keys });

      // Check if user_id and token are provided
      if (!user_id || !token) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'user_id and token are required'
        });
      }

      // Decode user ID
      const decodedUserId = idDecode(user_id);
      if (!decodedUserId) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'Invalid user ID'
        });
      }

      // Check if user exists
      const userRows = await query('SELECT * FROM users WHERE user_id = ? LIMIT 1', [decodedUserId]);
      if (!userRows.length) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'User not found'
        });
      }

      // Check if user is admin (role_id = 1 or 2)
      const adminRows = await query('SELECT * FROM admin_users WHERE id = ? LIMIT 1', [decodedUserId]);
      if (!adminRows.length) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'Permission denied'
        });
      }

      // Check if service provider ID is provided
      if (!keys) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'Service Provider ID is required'
        });
      }

      // Soft delete the service provider (matching PHP exactly)
      const deleteData = {
        deleted: 1,
        deleted_at: new Date().toISOString().slice(0, 19).replace('T', ' '),
        deleted_by: adminRows[0].role_id
      };

      await query(
        'UPDATE user_service_provider SET deleted = ?, deleted_at = ?, deleted_by = ? WHERE sp_id = ?',
        [deleteData.deleted, deleteData.deleted_at, deleteData.deleted_by, keys]
      );

      // Return response in PHP format (matching exactly)
      return res.json({
        status: 'Success',
        info: 'Service Provider Deleted Successfully'
      });

    } catch (error) {
      console.error('deleteServiceProvider error:', error);
      return res.json({
        status: 'Error',
        info: 'Failed to delete service provider'
      });
    }
  }

  // View service provider details - PHP compatible version
  static async viewServiceProviderDetails(req, res) {
    try {
      // Support both query parameters and form data
      const { user_id, token, keys } = {
        ...req.query,
        ...req.body
      };

      console.log('viewServiceProviderDetails - Parameters:', { user_id, token, keys });

      // Check if user_id and token are provided
      if (!user_id || !token) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'user_id and token are required'
        });
      }

      // Decode user ID
      const decodedUserId = idDecode(user_id);
      if (!decodedUserId) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'Invalid user ID'
        });
      }

      // Check if user exists
      const userRows = await query('SELECT * FROM users WHERE user_id = ? LIMIT 1', [decodedUserId]);
      if (!userRows.length) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'User not found'
        });
      }

      // Check if user is admin (role_id = 1 or 2)
      const adminRows = await query('SELECT * FROM admin_users WHERE id = ? LIMIT 1', [decodedUserId]);
      if (!adminRows.length) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'Permission denied'
        });
      }

      // Check if service provider ID is provided
      if (!keys) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'Service Provider ID is required'
        });
      }

      // Get service provider details with joins (matching PHP exactly)
      const detailsQuery = `
        SELECT 
          user_service_provider.*,
          countries.name as country_name,
          states.name as state_name,
          cities.name as city_name,
          users.full_name
        FROM user_service_provider
        LEFT JOIN countries ON countries.id = user_service_provider.country_id
        LEFT JOIN states ON states.id = user_service_provider.state_id
        LEFT JOIN cities ON cities.id = user_service_provider.city_id
        LEFT JOIN users ON users.user_id = user_service_provider.user_id
        WHERE user_service_provider.sp_id = ?
      `;
      
      const details = await query(detailsQuery, [keys]);
      
      if (details.length === 0) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'Service provider not found'
        });
      }

      // Return response in PHP format (matching exactly)
      return res.json(details[0]);

    } catch (error) {
      console.error('viewServiceProviderDetails error:', error);
      return res.json({
        status: false,
        rcode: 500,
        message: 'Failed to get service provider details'
      });
    }
  }

  // View card activation requests - PHP compatible version
  static async viewCardActivationRequests(req, res) {
    try {
      // Support both query parameters and form data
      const { user_id, token } = {
        ...req.query,
        ...req.body
      };

      console.log('viewCardActivationRequests - Parameters:', { user_id, token });

      // Check if user_id and token are provided
      if (!user_id || !token) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'user_id and token are required'
        });
      }

      // Decode user ID
      const decodedUserId = idDecode(user_id);
      if (!decodedUserId) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'Invalid user ID'
        });
      }

      // Check if user exists
      const userRows = await query('SELECT * FROM users WHERE user_id = ? LIMIT 1', [decodedUserId]);
      if (!userRows.length) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'User not found'
        });
      }

      // Check if user is admin (role_id = 1 or 2)
      const adminRows = await query('SELECT * FROM admin_users WHERE id = ? LIMIT 1', [decodedUserId]);
      if (!adminRows.length) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'Permission denied'
        });
      }

      // Get all users ordered by full_name (matching PHP exactly)
      const users = await query('SELECT * FROM users WHERE deleted = 0 ORDER BY full_name ASC');

      // Get all countries ordered by name (matching PHP exactly)
      const countries = await query('SELECT * FROM countries WHERE status = 1 ORDER BY name ASC');

      // Return response in PHP format (matching exactly)
      return res.json({
        status: true,
        rcode: 200,
        user_id: user_id,
        unique_token: token,
        list_users: users,
        list_country: countries,
        message: 'Card activation requests list view data retrieved successfully'
      });

    } catch (error) {
      console.error('viewCardActivationRequests error:', error);
      return res.json({
        status: false,
        rcode: 500,
        message: 'Failed to retrieve card activation requests list view data'
      });
    }
  }

  // Submit card activation requests - PHP compatible version
  static async submitCardActivationRequests(req, res) {
    try {
      // Support both query parameters and form data
      const { user_id, token, row_id, country_id, state_id, city_id, description, card_number, card_status, status, name, business_name, business_location, card_comments } = {
        ...req.query,
        ...req.body
      };
      
      // Extract service provider user_id from body (different from admin user_id)
      const sp_user_id = req.body.user_id;
      
      // Ensure admin user_id comes from query parameters
      const adminUserId = req.query.user_id;

      console.log('submitCardActivationRequests - Parameters:', { user_id, token, row_id, sp_user_id, country_id, state_id, city_id, description, card_number, card_status, status, name, business_name, business_location, card_comments });

      // Check if user_id and token are provided
      if (!adminUserId || !token) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'user_id and token are required'
        });
      }

      // Decode user ID
      const decodedUserId = idDecode(adminUserId);
      if (!decodedUserId) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'Invalid user ID'
        });
      }

      // Check if user exists
      const userRows = await query('SELECT * FROM users WHERE user_id = ? LIMIT 1', [decodedUserId]);
      if (!userRows.length) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'User not found'
        });
      }

      // Check if user is admin (role_id = 1 or 2)
      const adminRows = await query('SELECT * FROM admin_users WHERE id = ? LIMIT 1', [decodedUserId]);
      if (!adminRows.length) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'Permission denied'
        });
      }

      // Check if required fields are provided
      if (!sp_user_id) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'user_id is required'
        });
      }

      // Get admin role_id
      const admin = adminRows[0];

      if (!row_id || row_id === '') {
        // Insert new card activation request (matching PHP exactly)
        const insertData = {
          user_id: parseInt(sp_user_id),
          country_id: country_id ? parseInt(country_id) : 166, // Default to Pakistan
          state_id: state_id ? parseInt(state_id) : 2728, // Default to Punjab
          city_id: city_id ? parseInt(city_id) : 31439, // Default to Lahore
          description: description ? description.trim() : '',
          card_number: card_number ? card_number.trim() : '',
          card_status: card_status ? parseInt(card_status) : 1,
          status: status !== undefined ? parseInt(status) : 1,
          name: name ? name.trim() : '',
          business_name: business_name ? business_name.trim() : '',
          business_location: business_location ? business_location.trim() : '',
          deleted: 0,
          created_dts: new Date().toISOString().slice(0, 19).replace('T', ' '),
          created_by: admin.role_id
        };

        await query(
          'INSERT INTO user_business_cards (user_id, country_id, state_id, city_id, description, card_number, card_status, status, name, business_name, business_location, deleted, created_dts, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
          [insertData.user_id, insertData.country_id, insertData.state_id, insertData.city_id, insertData.description, insertData.card_number, insertData.card_status, insertData.status, insertData.name, insertData.business_name, insertData.business_location, insertData.deleted, insertData.created_dts, insertData.created_by]
        );

        return res.json({
          status: 'Success',
          info: 'Card Activation Request Created Successfully'
        });

      } else {
        // Update existing card activation request (matching PHP exactly)
        const updateData = {
          user_id: parseInt(sp_user_id),
          country_id: country_id ? parseInt(country_id) : 166, // Default to Pakistan
          state_id: state_id ? parseInt(state_id) : 2728, // Default to Punjab
          city_id: city_id ? parseInt(city_id) : 31439, // Default to Lahore
          description: description ? description.trim() : '',
          card_number: card_number ? card_number.trim() : '',
          card_status: card_status ? parseInt(card_status) : 1,
          status: status !== undefined ? parseInt(status) : 1,
          name: name ? name.trim() : '',
          business_name: business_name ? business_name.trim() : '',
          business_location: business_location ? business_location.trim() : '',
          updated_at: new Date().toISOString().slice(0, 19).replace('T', ' '),
          updated_by: admin.role_id
        };

        await query(
          'UPDATE user_business_cards SET user_id = ?, country_id = ?, state_id = ?, city_id = ?, description = ?, card_number = ?, card_status = ?, status = ?, name = ?, business_name = ?, business_location = ?, updated_at = ?, updated_by = ? WHERE ubc_id = ?',
          [updateData.user_id, updateData.country_id, updateData.state_id, updateData.city_id, updateData.description, updateData.card_number, updateData.card_status, updateData.status, updateData.name, updateData.business_name, updateData.business_location, updateData.updated_at, updateData.updated_by, row_id]
        );

        return res.json({
          status: 'Success',
          info: 'Card Activation Request Updated Successfully'
        });
      }

    } catch (error) {
      console.error('submitCardActivationRequests error:', error);
      return res.json({
        status: 'Error',
        info: 'Failed to submit card activation request'
      });
    }
  }

  // List card activation requests ajax - PHP compatible version
  static async listCardActivationRequestsAjax(req, res) {
    try {
      // Support both query parameters and form data
      const { user_id, token } = {
        ...req.query,
        ...req.body
      };

      console.log('listCardActivationRequestsAjax - Parameters:', { user_id, token });

      // Check if user_id and token are provided
      if (!user_id || !token) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'user_id and token are required'
        });
      }

      // Decode user ID
      const decodedUserId = idDecode(user_id);
      if (!decodedUserId) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'Invalid user ID'
        });
      }

      // Check if user exists
      const userRows = await query('SELECT * FROM users WHERE user_id = ? LIMIT 1', [decodedUserId]);
      if (!userRows.length) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'User not found'
        });
      }

      // Check if user is admin (role_id = 1 or 2)
      const adminRows = await query('SELECT * FROM admin_users WHERE id = ? LIMIT 1', [decodedUserId]);
      if (!adminRows.length) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'Permission denied'
        });
      }

      // Get DataTables parameters (matching PHP exactly)
      const drawValue = parseInt(req.body.draw || req.query.draw || 1);
      const startValue = parseInt(req.body.start || req.query.start || 0);
      const lengthValue = parseInt(req.body.length || req.query.length || 10);
      const searchValue = req.body.search?.value || req.query.search || '';

      // Get total count
      const totalCountResult = await query('SELECT COUNT(*) as count FROM user_business_cards WHERE deleted = 0');
      const totalCount = totalCountResult[0]?.count || 0;

      // Build search query
      let searchQuery = '';
      let searchParams = [];
      if (searchValue) {
        searchQuery = 'WHERE (users.full_name LIKE ? OR user_business_cards.description LIKE ? OR user_business_cards.card_status LIKE ? OR user_business_cards.status LIKE ?) AND user_business_cards.deleted = 0';
        searchParams.push(`%${searchValue}%`, `%${searchValue}%`, `%${searchValue}%`, `%${searchValue}%`);
      } else {
        searchQuery = 'WHERE user_business_cards.deleted = 0';
      }

      // Get filtered count
      let filteredCountQuery = `
        SELECT COUNT(*) as count
        FROM user_business_cards
        LEFT JOIN users ON users.user_id = user_business_cards.user_id
        ${searchQuery}
      `;
      const filteredCountResult = await query(filteredCountQuery, searchParams);
      const filteredCount = filteredCountResult[0]?.count || 0;

      // Get paginated data
      let dataQuery = `
        SELECT
          users.full_name,
          user_business_cards.*
        FROM user_business_cards
        LEFT JOIN users ON users.user_id = user_business_cards.user_id
        ${searchQuery}
        ORDER BY users.full_name ASC
        LIMIT ?, ?
      `;
      const dataParams = [...searchParams, startValue, lengthValue];
      const cardActivationRequests = await query(dataQuery, dataParams);

      // Format data for DataTables (matching PHP exactly)
      const data = [];
      let i = startValue;
      for (const row of cardActivationRequests) {
        i++;

        // Card status badge (matching PHP exactly)
        let cardStatus = '<span class="badge bg-soft-warning text-warning">Pending</span>';
        if (row.card_status == 2) {
          cardStatus = '<span class="badge bg-soft-success text-success">Approved</span>';
        } else if (row.card_status == 3) {
          cardStatus = '<span class="badge bg-soft-danger text-danger">Rejected</span>';
        }

        // Status badge (matching PHP exactly)
        let status = '<span class="badge bg-soft-success text-success">Active</span>';
        if (row.status == 0) {
          status = '<span class="badge bg-soft-danger text-danger">Inactive</span>';
        }

        // Action buttons (matching PHP exactly)
        const action = `<a href="javascript:void(0);" data-id="${row.ubc_id}" class="action-icon edit_info"><i class="mdi mdi-square-edit-outline"></i></a>
                        <a href="javascript:void(0);" data-id="${row.ubc_id}" class="action-icon delete_info"><i class="mdi mdi-delete"></i></a>`;

        data.push([i, row.full_name, row.description, cardStatus, status, action]);
      }

      // Return DataTables response (matching PHP exactly)
      return res.json({
        draw: drawValue,
        recordsTotal: totalCount,
        recordsFiltered: filteredCount,
        data: data
      });

    } catch (error) {
      console.error('listCardActivationRequestsAjax error:', error);
      return res.json({
        status: false,
        rcode: 500,
        message: 'Failed to retrieve card activation requests data'
      });
    }
  }

  // Edit card activation requests - PHP compatible version
  static async editCardActivationRequests(req, res) {
    try {
      // Support both query parameters and form data
      const { user_id, token, keys } = {
        ...req.query,
        ...req.body
      };

      console.log('editCardActivationRequests - Parameters:', { user_id, token, keys });

      // Check if user_id and token are provided
      if (!user_id || !token) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'user_id and token are required'
        });
      }

      // Decode user ID
      const decodedUserId = idDecode(user_id);
      if (!decodedUserId) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'Invalid user ID'
        });
      }

      // Check if user exists
      const userRows = await query('SELECT * FROM users WHERE user_id = ? LIMIT 1', [decodedUserId]);
      if (!userRows.length) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'User not found'
        });
      }

      // Check if user is admin (role_id = 1 or 2)
      const adminRows = await query('SELECT * FROM admin_users WHERE id = ? LIMIT 1', [decodedUserId]);
      if (!adminRows.length) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'Permission denied'
        });
      }

      // Check if card activation request ID is provided
      if (!keys) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'Card Activation Request ID is required'
        });
      }

      // Get card activation request details (matching PHP exactly)
      const cardActivationRequestDetails = await query('SELECT * FROM user_business_cards WHERE ubc_id = ?', [keys]);
      
      if (cardActivationRequestDetails.length === 0) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'Card activation request not found'
        });
      }

      const cardActivationRequest = cardActivationRequestDetails[0];

      // Get state list for the card activation request's country (matching PHP exactly)
      let listState = '<option value="">Select State</option>';
      if (cardActivationRequest.country_id) {
        const states = await query('SELECT * FROM states WHERE country_id = ? AND status = 1 ORDER BY name ASC', [cardActivationRequest.country_id]);
        if (states.length > 0) {
          for (const state of states) {
            const selected = state.id == cardActivationRequest.state_id ? 'selected' : '';
            listState += `<option value="${state.id}" ${selected}>${state.name}</option>`;
          }
        } else {
          listState = '<option value="">State List Empty</option>';
        }
      } else {
        listState = '<option value="">State List Empty</option>';
      }

      // Get city list for the card activation request's state (matching PHP exactly)
      let listCities = '<option value="">Select City</option>';
      if (cardActivationRequest.state_id) {
        const cities = await query('SELECT * FROM cities WHERE state_id = ? AND status = 1 ORDER BY name ASC', [cardActivationRequest.state_id]);
        if (cities.length > 0) {
          for (const city of cities) {
            const selected = city.id == cardActivationRequest.city_id ? 'selected' : '';
            listCities += `<option value="${city.id}" ${selected}>${city.name}</option>`;
          }
        } else {
          listCities = '<option value="">City List Empty</option>';
        }
      } else {
        listCities = '<option value="">City List Empty</option>';
      }

      // Prepare response (matching PHP exactly)
      const response = {
        ...cardActivationRequest,
        list_state: listState,
        list_cities: listCities
      };

      return res.json(response);

    } catch (error) {
      console.error('editCardActivationRequests error:', error);
      return res.json({
        status: false,
        rcode: 500,
        message: 'Failed to get card activation request details'
      });
    }
  }

  // Delete card activation requests - PHP compatible version
  static async deleteCardActivationRequests(req, res) {
    try {
      // Support both query parameters and form data
      const { user_id, token, keys } = {
        ...req.query,
        ...req.body
      };

      console.log('deleteCardActivationRequests - Parameters:', { user_id, token, keys });

      // Check if user_id and token are provided
      if (!user_id || !token) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'user_id and token are required'
        });
      }

      // Decode user ID
      const decodedUserId = idDecode(user_id);
      if (!decodedUserId) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'Invalid user ID'
        });
      }

      // Check if user exists
      const userRows = await query('SELECT * FROM users WHERE user_id = ? LIMIT 1', [decodedUserId]);
      if (!userRows.length) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'User not found'
        });
      }

      // Check if user is admin (role_id = 1 or 2)
      const adminRows = await query('SELECT * FROM admin_users WHERE id = ? LIMIT 1', [decodedUserId]);
      if (!adminRows.length) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'Permission denied'
        });
      }

      // Check if card activation request ID is provided
      if (!keys) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'Card Activation Request ID is required'
        });
      }

      // Soft delete the card activation request (matching PHP exactly)
      const deleteData = {
        deleted: 1,
        deleted_at: new Date().toISOString().slice(0, 19).replace('T', ' '),
        deleted_by: adminRows[0].role_id
      };

      await query(
        'UPDATE user_business_cards SET deleted = ?, deleted_at = ?, deleted_by = ? WHERE ubc_id = ?',
        [deleteData.deleted, deleteData.deleted_at, deleteData.deleted_by, keys]
      );

      // Return response in PHP format (matching exactly)
      return res.json({
        status: 'Success',
        info: 'Card Activation Request Deleted Successfully'
      });

    } catch (error) {
      console.error('deleteCardActivationRequests error:', error);
      return res.json({
        status: 'Error',
        info: 'Failed to delete card activation request'
      });
    }
  }

  // Images card activation requests - PHP compatible version
  static async imagesCardActivationRequests(req, res) {
    try {
      // Support both query parameters and form data
      const { user_id, token, keys } = {
        ...req.query,
        ...req.body
      };

      console.log('imagesCardActivationRequests - Parameters:', { user_id, token, keys });

      // Check if user_id and token are provided
      if (!user_id || !token) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'user_id and token are required'
        });
      }

      // Decode user ID
      const decodedUserId = idDecode(user_id);
      if (!decodedUserId) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'Invalid user ID'
        });
      }

      // Check if user exists
      const userRows = await query('SELECT * FROM users WHERE user_id = ? LIMIT 1', [decodedUserId]);
      if (!userRows.length) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'User not found'
        });
      }

      // Check if user is admin (role_id = 1 or 2)
      const adminRows = await query('SELECT * FROM admin_users WHERE id = ? LIMIT 1', [decodedUserId]);
      if (!adminRows.length) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'Permission denied'
        });
      }

      // Check if card activation request ID is provided
      if (!keys) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'Card Activation Request ID is required'
        });
      }

      // Get business card images (matching PHP exactly)
      const images = await query('SELECT * FROM user_business_card_files WHERE ubc_id = ? AND status = 1', [keys]);
      
      let lists = '';
      
      if (images.length > 0) {
        lists += '<div class="row">';
        for (const row of images) {
          const path = `http://localhost:3000/uploads/business_documents/${row.business_documents_file}`;
          lists += `
            <div class="col-md-4">
              <img src="${path}" width="100%" alt="No Image" />
            </div>
          `;
        }
        lists += '</div>';
      } else {
        lists = '<div class="alert alert-danger">No More Images</div>';
      }

      // Return HTML response (matching PHP exactly)
      return res.send(lists);

    } catch (error) {
      console.error('imagesCardActivationRequests error:', error);
      return res.send('<div class="alert alert-danger">Failed to load images</div>');
    }
  }

  // View employment type - PHP compatible version
  static async viewEmploymentType(req, res) {
    try {
      // Support both query parameters and form data
      const { user_id, token } = {
        ...req.query,
        ...req.body
      };

      console.log('viewEmploymentType - Parameters:', { user_id, token });

      // Check if user_id and token are provided
      if (!user_id || !token) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'user_id and token are required'
        });
      }

      // Decode user ID
      const decodedUserId = idDecode(user_id);
      if (!decodedUserId) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'Invalid user ID'
        });
      }

      // Get user details and validate
      const userRows = await query('SELECT * FROM users WHERE user_id = ? LIMIT 1', [decodedUserId]);
      if (!userRows.length) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'Not A Valid User'
        });
      }

      const user = userRows[0];

      // Validate token
      if (user.unique_token !== token) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'Token Mismatch Exception'
        });
      }

      // Check if user is admin (role_id = 1 or 2)
      const adminRows = await query('SELECT * FROM admin_users WHERE id = ? LIMIT 1', [decodedUserId]);
      if (!adminRows.length) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'Permission denied'
        });
      }

      // Get all employment types ordered by name (matching PHP exactly)
      const employmentTypes = await query('SELECT * FROM employment_type WHERE deleted = 0 ORDER BY name ASC');

      // Return response in PHP format (matching exactly)
      return res.json({
        status: true,
        rcode: 200,
        user_id: idEncode(decodedUserId),
        unique_token: token,
        employment_type_list: employmentTypes || [],
        message: 'Employment type list view data retrieved successfully'
      });

    } catch (error) {
      console.error('viewEmploymentType error:', error);
      return res.json({
        status: false,
        rcode: 500,
        message: 'Failed to retrieve employment type list view data'
      });
    }
  }

  // Submit employment type - PHP compatible version
  static async submitEmploymentType(req, res) {
    try {
      // Support both query parameters and form data
      const { user_id, token, row_id, name, status } = {
        ...req.query,
        ...req.body
      };

      console.log('submitEmploymentType - Parameters:', { user_id, token, row_id, name, status });

      // Check if user_id and token are provided
      if (!user_id || !token) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'user_id and token are required'
        });
      }

      // Decode user ID
      const decodedUserId = idDecode(user_id);
      if (!decodedUserId) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'Invalid user ID'
        });
      }

      // Get user details and validate
      const userRows = await query('SELECT * FROM users WHERE user_id = ? LIMIT 1', [decodedUserId]);
      if (!userRows.length) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'Not A Valid User'
        });
      }

      const user = userRows[0];

      // Validate token
      if (user.unique_token !== token) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'Token Mismatch Exception'
        });
      }

      // Check if user is admin (role_id = 1 or 2)
      const adminRows = await query('SELECT * FROM admin_users WHERE id = ? LIMIT 1', [decodedUserId]);
      if (!adminRows.length) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'Permission denied'
        });
      }

      // Check if required fields are provided
      if (!name) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'name is required'
        });
      }

      // Get admin role_id
      const admin = adminRows[0];

      if (!row_id || row_id === '') {
        // Insert new employment type (matching PHP exactly)
        const insertData = {
          name: name.trim(),
          status: status !== undefined ? parseInt(status) : 1,
          created_at: new Date().toISOString().slice(0, 19).replace('T', ' '),
          created_by: admin.role_id
        };

        await query(
          'INSERT INTO employment_type (name, status, created_at, created_by, deleted) VALUES (?, ?, ?, ?, 0)',
          [insertData.name, insertData.status, insertData.created_at, insertData.created_by]
        );

        const info = 'Data Created Successfully';

        // Return response in PHP format (matching exactly)
        return res.json({
          status: 'Success',
          info: info
        });

      } else {
        // Update existing employment type (matching PHP exactly)
        const updateData = {
          name: name.trim(),
          status: status !== undefined ? parseInt(status) : 1,
          updated_at: new Date().toISOString().slice(0, 19).replace('T', ' '),
          updated_by: admin.role_id
        };

        await query(
          'UPDATE employment_type SET name = ?, status = ?, updated_at = ?, updated_by = ? WHERE id = ?',
          [updateData.name, updateData.status, updateData.updated_at, updateData.updated_by, row_id]
        );

        const info = 'Data Updated Successfully';

        // Return response in PHP format (matching exactly)
        return res.json({
          status: 'Success',
          info: info
        });
      }

    } catch (error) {
      console.error('submitEmploymentType error:', error);
      return res.json({
        status: 'Error',
        info: 'Failed to submit employment type'
      });
    }
  }

  // List employment type ajax - PHP compatible version
  static async listEmploymentTypeAjax(req, res) {
    try {
      // Support both query parameters and form data
      const { user_id, token } = {
        ...req.query,
        ...req.body
      };

      console.log('listEmploymentTypeAjax - Parameters:', { user_id, token });

      // Check if user_id and token are provided
      if (!user_id || !token) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'user_id and token are required'
        });
      }

      // Decode user ID
      const decodedUserId = idDecode(user_id);
      if (!decodedUserId) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'Invalid user ID'
        });
      }

      // Get user details and validate
      const userRows = await query('SELECT * FROM users WHERE user_id = ? LIMIT 1', [decodedUserId]);
      if (!userRows.length) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'Not A Valid User'
        });
      }

      const user = userRows[0];

      // Validate token
      if (user.unique_token !== token) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'Token Mismatch Exception'
        });
      }

      // Check if user is admin (role_id = 1 or 2)
      const adminRows = await query('SELECT * FROM admin_users WHERE id = ? LIMIT 1', [decodedUserId]);
      if (!adminRows.length) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'Permission denied'
        });
      }

      // DataTables parameters
      const drawValue = parseInt(req.body.draw || req.query.draw || 1);
      const startValue = parseInt(req.body.start || req.query.start || 0);
      const lengthValue = parseInt(req.body.length || req.query.length || 10);
      const searchValue = req.body.search?.value || req.query.search || '';

      // Get total count
      const totalCountResult = await query('SELECT COUNT(*) as count FROM employment_type WHERE deleted = 0');
      const totalCount = totalCountResult[0]?.count || 0;

      // Build search query
      let searchQuery = '';
      let searchParams = [];
      if (searchValue) {
        searchQuery = 'WHERE name LIKE ? AND deleted = 0';
        searchParams.push(`%${searchValue}%`);
      } else {
        searchQuery = 'WHERE deleted = 0';
      }

      // Get filtered count
      let filteredCountQuery = `
        SELECT COUNT(*) as count
        FROM employment_type
        ${searchQuery}
      `;
      const filteredCountResult = await query(filteredCountQuery, searchParams);
      const filteredCount = filteredCountResult[0]?.count || 0;

      // Get paginated data
      let dataQuery = `
        SELECT
          id,
          name,
          status
        FROM employment_type
        ${searchQuery}
        ORDER BY id DESC
        LIMIT ?, ?
      `;
      const dataParams = [...searchParams, startValue, lengthValue];
      const employmentTypes = await query(dataQuery, dataParams);

      // Format data for DataTables (matching PHP exactly)
      const data = [];
      let i = startValue;
      for (const row of employmentTypes) {
        i++;

        // Status badge (matching PHP exactly)
        let status = '<span class="badge bg-soft-success text-success">Active</span>';
        if (row.status == 0) {
          status = '<span class="badge bg-soft-danger text-danger">Inactive</span>';
        }

        // Action buttons (matching PHP exactly)
        const action = `<a href="javascript:void(0);" id="edit_${row.id}" data-id="${row.id}" data-name="${row.name}" data-status="${row.status}" onclick="viewEditDetails(${row.id});" class="action-icon"> <i class="mdi mdi-square-edit-outline"></i></a>
                        <a href="javascript:void(0);" class="action-icon delete_info" data-id="${row.id}"> <i class="mdi mdi-delete"></i></a>`;

        data.push([i, row.name, status, action]);
      }

      // Return response in DataTables format (matching PHP exactly)
      return res.json({
        draw: drawValue,
        recordsTotal: totalCount,
        recordsFiltered: filteredCount,
        data: data
      });

    } catch (error) {
      console.error('listEmploymentTypeAjax error:', error);
      return res.json({
        status: false,
        rcode: 500,
        message: 'Failed to retrieve employment type list'
      });
    }
  }

  // Check duplicate employment type - PHP compatible version
  static async checkDuplicateEmploymentType(req, res) {
    try {
      // Support both query parameters and form data
      const { user_id, token, name, id } = {
        ...req.query,
        ...req.body
      };

      console.log('checkDuplicateEmploymentType - Parameters:', { user_id, token, name, id });

      // Check if user_id and token are provided
      if (!user_id || !token) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'user_id and token are required'
        });
      }

      // Decode user ID
      const decodedUserId = idDecode(user_id);
      if (!decodedUserId) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'Invalid user ID'
        });
      }

      // Get user details and validate
      const userRows = await query('SELECT * FROM users WHERE user_id = ? LIMIT 1', [decodedUserId]);
      if (!userRows.length) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'Not A Valid User'
        });
      }

      const user = userRows[0];

      // Validate token
      if (user.unique_token !== token) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'Token Mismatch Exception'
        });
      }

      // Check if user is admin (role_id = 1 or 2)
      const adminRows = await query('SELECT * FROM admin_users WHERE id = ? LIMIT 1', [decodedUserId]);
      if (!adminRows.length) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'Permission denied'
        });
      }

      // Check if required fields are provided
      if (!name) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'name is required'
        });
      }

      // Build condition for duplicate check (matching PHP exactly)
      let condition = '';
      let params = [];

      if (parseInt(id) > 0) {
        // Editing existing employment type - exclude current record
        condition = 'id != ? AND deleted = 0 AND name = ?';
        params = [id, name];
      } else {
        // Adding new employment type
        condition = 'deleted = 0 AND name = ?';
        params = [name];
      }

      // Check for duplicate employment type name
      const duplicateRows = await query(
        `SELECT COUNT(*) as count FROM employment_type WHERE ${condition}`,
        params
      );

      const hasDuplicate = duplicateRows[0]?.count > 0;

      // Return response in PHP format (matching exactly)
      return res.json({
        validate: hasDuplicate
      });

    } catch (error) {
      console.error('checkDuplicateEmploymentType error:', error);
      return res.json({
        status: false,
        rcode: 500,
        message: 'Failed to check duplicate employment type'
      });
    }
  }

  // Delete employment type - PHP compatible version
  static async deleteEmploymentType(req, res) {
    try {
      // Support both query parameters and form data
      const { user_id, token, keys } = {
        ...req.query,
        ...req.body
      };

      console.log('deleteEmploymentType - Parameters:', { user_id, token, keys });

      // Check if user_id and token are provided
      if (!user_id || !token) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'user_id and token are required'
        });
      }

      // Decode user ID
      const decodedUserId = idDecode(user_id);
      if (!decodedUserId) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'Invalid user ID'
        });
      }

      // Get user details and validate
      const userRows = await query('SELECT * FROM users WHERE user_id = ? LIMIT 1', [decodedUserId]);
      if (!userRows.length) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'Not A Valid User'
        });
      }

      const user = userRows[0];

      // Validate token
      if (user.unique_token !== token) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'Token Mismatch Exception'
        });
      }

      // Check if user is admin (role_id = 1 or 2)
      const adminRows = await query('SELECT * FROM admin_users WHERE id = ? LIMIT 1', [decodedUserId]);
      if (!adminRows.length) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'Permission denied'
        });
      }

      // Check if keys (employment type ID) is provided
      if (!keys) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'Employment Type ID is required'
        });
      }

      // Soft delete the employment type (matching PHP exactly)
      const deleteData = {
        deleted: 1,
        deleted_at: new Date().toISOString().slice(0, 19).replace('T', ' '),
        deleted_by: adminRows[0].role_id
      };

      await query(
        'UPDATE employment_type SET deleted = ?, deleted_at = ?, deleted_by = ? WHERE id = ?',
        [deleteData.deleted, deleteData.deleted_at, deleteData.deleted_by, keys]
      );

      // Return response in PHP format (matching exactly)
      return res.json({
        status: 'Success',
        info: 'Employment Type Deleted Successfully'
      });

    } catch (error) {
      console.error('deleteEmploymentType error:', error);
      return res.json({
        status: 'Error',
        info: 'Failed to delete employment type'
      });
    }
  }

  // Delete cities - PHP compatible version
  static async deleteCities(req, res) {
    try {
      // Support both query parameters and form data
      const { user_id, token, keys } = {
        ...req.query,
        ...req.body
      };

      console.log('deleteCities - Parameters:', { user_id, token, keys });

      // Check if user_id and token are provided
      if (!user_id || !token) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'user_id and token are required'
        });
      }

      // Decode user ID
      const decodedUserId = idDecode(user_id);
      if (!decodedUserId) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'Invalid user ID'
        });
      }

      // Get user details and validate
      const userRows = await query('SELECT * FROM users WHERE user_id = ? LIMIT 1', [decodedUserId]);
      if (!userRows.length) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'Not A Valid User'
        });
      }

      const user = userRows[0];

      // Validate token
      if (user.unique_token !== token) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'Token Mismatch Exception'
        });
      }

      // Check if user is admin (role_id = 1 or 2)
      const adminRows = await query('SELECT * FROM admin_users WHERE id = ? LIMIT 1', [decodedUserId]);
      if (!adminRows.length) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'Permission denied'
        });
      }

      // Check if keys (city ID) is provided
      if (!keys) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'City ID is required'
        });
      }

      // Soft delete the city (matching PHP exactly)
      const deleteData = {
        deleted: 1,
        deleted_at: new Date().toISOString().slice(0, 19).replace('T', ' '),
        deleted_by: adminRows[0].role_id
      };

      await query(
        'UPDATE cities SET deleted = ?, deleted_at = ?, deleted_by = ? WHERE id = ?',
        [deleteData.deleted, deleteData.deleted_at, deleteData.deleted_by, keys]
      );

      // Return response in PHP format (matching exactly)
      return res.json({
        status: 'Success',
        info: 'City Deleted Successfully'
      });

    } catch (error) {
      console.error('deleteCities error:', error);
      return res.json({
        status: 'Error',
        info: 'Failed to delete city'
      });
    }
  }





  // View investors - PHP compatible version
  static async viewInvestors(req, res) {
    try {
      // Support both query parameters and form data
      const { user_id, token } = {
        ...req.query,
        ...req.body
      };

      // Check if user_id and token are provided
      if (!user_id || !token) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'user_id and token are required'
        });
      }

      // Decode user ID
      const decodedUserId = idDecode(user_id);
      if (!decodedUserId) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'Invalid user ID'
        });
      }

      // Check if user exists
      const userRows = await query('SELECT * FROM users WHERE user_id = ? LIMIT 1', [decodedUserId]);
      if (!userRows.length) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'User not found'
        });
      }

      // Check if user is admin (role_id = 1 or 2)
      const adminRows = await query('SELECT * FROM admin_users WHERE id = ? LIMIT 1', [decodedUserId]);
      if (!adminRows.length) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'Permission denied'
        });
      }

      // Get users list (matching PHP exactly)
      const users = await query('SELECT * FROM users WHERE deleted = 0 ORDER BY full_name ASC');

      // Get countries list (matching PHP exactly)
      const countries = await query('SELECT * FROM countries WHERE status = 1 ORDER BY name ASC');

      // Get fund size list (matching PHP exactly)
      const fundSizes = await query('SELECT * FROM fund_size WHERE status = 1 ORDER BY investment_range ASC');

      return res.json({
        status: true,
        rcode: 200,
        user_id: user_id,
        unique_token: token,
        list_users: users,
        list_country: countries,
        list_fund: fundSizes,
        message: 'Investors list view data retrieved successfully'
      });

    } catch (error) {
      console.error('viewInvestors error:', error);
      return res.json({
        status: false,
        rcode: 500,
        message: 'Failed to retrieve investors list view data'
      });
    }
  }

  // Submit investors - PHP compatible version
  static async submitInvestors(req, res) {
    try {
      // Support both query parameters and form data
      const { user_id, token, row_id, user_id: sp_user_id, name, country_id, state_id, city_id, fund_size_id, linkedin_url, bio, availability, profile, investment_stage, meeting_city, countries_to_invest, investment_industry, language, approval_status, status } = {
        ...req.query,
        ...req.body
      };
      
      // Extract service provider user_id from body (different from admin user_id)
      const investorUserId = req.body.user_id;
      
      // Ensure admin user_id comes from query parameters
      const adminUserId = req.query.user_id;

      console.log('submitInvestors - Parameters:', { user_id, token, row_id, investorUserId, name, country_id, state_id, city_id, fund_size_id, linkedin_url, bio, availability, profile, investment_stage, meeting_city, countries_to_invest, investment_industry, language, approval_status, status });

      // Check if user_id and token are provided
      if (!adminUserId || !token) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'user_id and token are required'
        });
      }

      // Decode user ID
      const decodedUserId = idDecode(adminUserId);
      if (!decodedUserId) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'Invalid user ID'
        });
      }

      // Check if user exists
      const userRows = await query('SELECT * FROM users WHERE user_id = ? LIMIT 1', [decodedUserId]);
      if (!userRows.length) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'User not found'
        });
      }

      // Check if user is admin (role_id = 1 or 2)
      const adminRows = await query('SELECT * FROM admin_users WHERE id = ? LIMIT 1', [decodedUserId]);
      if (!adminRows.length) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'Permission denied'
        });
      }

      // Check if required fields are provided
      if (!investorUserId) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'user_id is required'
        });
      }

      // Get admin role_id
      const admin = adminRows[0];

      if (!row_id || row_id === '') {
        // Insert new investor (matching PHP exactly)
        const insertData = {
          user_id: parseInt(investorUserId),
          name: name ? name.trim() : '',
          country_id: country_id ? parseInt(country_id) : 166, // Default to Pakistan
          state_id: state_id ? parseInt(state_id) : 2728, // Default to Punjab
          city_id: city_id ? parseInt(city_id) : 31439, // Default to Lahore
          fund_size_id: fund_size_id ? parseInt(fund_size_id) : 1, // Default to first fund size
          linkedin_url: linkedin_url ? linkedin_url.trim() : '',
          bio: bio ? bio.trim() : '',
          availability: availability === 'Both' ? 'Online, In-Person' : (availability ? availability.trim() : ''),
          profile: profile ? profile.trim() : '',
          investment_stage: investment_stage ? investment_stage.trim() : '',
          meeting_city: meeting_city ? meeting_city.trim() : '',
          countries_to_invest: countries_to_invest ? countries_to_invest.trim() : '',
          investment_industry: investment_industry ? investment_industry.trim() : '',
          language: language ? language.trim() : '',
          approval_status: approval_status ? parseInt(approval_status) : 1,
          status: status !== undefined ? parseInt(status) : 1,
          image: '', // Default empty image
          deleted: 0,
          created_dts: new Date().toISOString().slice(0, 19).replace('T', ' '),
          created_by: admin.role_id
        };

        const result = await query(
          'INSERT INTO user_investor (user_id, name, country_id, state_id, city_id, fund_size_id, linkedin_url, bio, availability, profile, investment_stage, meeting_city, countries_to_invest, investment_industry, language, approval_status, status, image, deleted, created_dts, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
          [insertData.user_id, insertData.name, insertData.country_id, insertData.state_id, insertData.city_id, insertData.fund_size_id, insertData.linkedin_url, insertData.bio, insertData.availability, insertData.profile, insertData.investment_stage, insertData.meeting_city, insertData.countries_to_invest, insertData.investment_industry, insertData.language, insertData.approval_status, insertData.status, insertData.image, insertData.deleted, insertData.created_dts, insertData.created_by]
        );

        // Generate reference number (matching PHP exactly)
        const investorId = result.insertId;
        let referenceNo;
        if (investorId < 10) {
          referenceNo = "00" + investorId;
        } else if (investorId < 100) {
          referenceNo = "0" + investorId;
        } else {
          referenceNo = investorId.toString();
        }
        referenceNo = "INV-ALPHA-" + referenceNo;

        // Update with reference number
        await query('UPDATE user_investor SET reference_no = ? WHERE investor_id = ?', [referenceNo, investorId]);

        return res.json({
          status: 'Success',
          info: 'Investor Created Successfully'
        });

      } else {
        // Update existing investor (matching PHP exactly)
        const updateData = {
          user_id: parseInt(investorUserId),
          name: name ? name.trim() : '',
          country_id: country_id ? parseInt(country_id) : 166, // Default to Pakistan
          state_id: state_id ? parseInt(state_id) : 2728, // Default to Punjab
          city_id: city_id ? parseInt(city_id) : 31439, // Default to Lahore
          fund_size_id: fund_size_id ? parseInt(fund_size_id) : 1, // Default to first fund size
          linkedin_url: linkedin_url ? linkedin_url.trim() : '',
          bio: bio ? bio.trim() : '',
          availability: availability === 'Both' ? 'Online, In-Person' : (availability ? availability.trim() : ''),
          profile: profile ? profile.trim() : '',
          investment_stage: investment_stage ? investment_stage.trim() : '',
          meeting_city: meeting_city ? meeting_city.trim() : '',
          countries_to_invest: countries_to_invest ? countries_to_invest.trim() : '',
          investment_industry: investment_industry ? investment_industry.trim() : '',
          language: language ? language.trim() : '',
          approval_status: approval_status ? parseInt(approval_status) : 1,
          status: status !== undefined ? parseInt(status) : 1,
          updated_at: new Date().toISOString().slice(0, 19).replace('T', ' '),
          updated_by: admin.role_id
        };

        await query(
          'UPDATE user_investor SET user_id = ?, name = ?, country_id = ?, state_id = ?, city_id = ?, fund_size_id = ?, linkedin_url = ?, bio = ?, availability = ?, profile = ?, investment_stage = ?, meeting_city = ?, countries_to_invest = ?, investment_industry = ?, language = ?, approval_status = ?, status = ?, updated_at = ?, updated_by = ? WHERE investor_id = ?',
          [updateData.user_id, updateData.name, updateData.country_id, updateData.state_id, updateData.city_id, updateData.fund_size_id, updateData.linkedin_url, updateData.bio, updateData.availability, updateData.profile, updateData.investment_stage, updateData.meeting_city, updateData.countries_to_invest, updateData.investment_industry, updateData.language, updateData.approval_status, updateData.status, updateData.updated_at, updateData.updated_by, row_id]
        );

        return res.json({
          status: 'Success',
          info: 'Investor Updated Successfully'
        });
      }

    } catch (error) {
      console.error('submitInvestors error:', error);
      return res.json({
        status: 'Error',
        info: 'Failed to submit investor'
      });
    }
  }

  // List investors ajax - PHP compatible version
  static async listInvestorsAjax(req, res) {
    try {
      // Support both query parameters and form data
      const { user_id, token, draw, start, length, search, order, columns } = {
        ...req.query,
        ...req.body
      };

      // Check if user_id and token are provided
      if (!user_id || !token) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'user_id and token are required'
        });
      }

      // Decode user ID
      const decodedUserId = idDecode(user_id);
      if (!decodedUserId) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'Invalid user ID'
        });
      }

      // Check if user exists
      const userRows = await query('SELECT * FROM users WHERE user_id = ? LIMIT 1', [decodedUserId]);
      if (!userRows.length) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'User not found'
        });
      }

      // Check if user is admin (role_id = 1 or 2)
      const adminRows = await query('SELECT * FROM admin_users WHERE id = ? LIMIT 1', [decodedUserId]);
      if (!adminRows.length) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'Permission denied'
        });
      }

      // Build base query (matching PHP model exactly)
      let baseQuery = `
        SELECT users.full_name, user_investor.*
        FROM user_investor
        LEFT JOIN users ON users.user_id = user_investor.user_id
        WHERE user_investor.deleted = 0
      `;

      // Add search functionality (matching PHP model exactly)
      const searchableColumns = ['users.full_name', 'user_investor.reference_no', 'user_investor.name', 'user_investor.approval_status', 'user_investor.status'];
      if (search && search.value) {
        const searchConditions = searchableColumns.map(col => `${col} LIKE ?`).join(' OR ');
        baseQuery += ` AND (${searchConditions})`;
      }

      // Get total count
      const countQuery = baseQuery.replace('SELECT users.full_name, user_investor.*', 'SELECT COUNT(*) as total');
      const countResult = await query(countQuery, search && search.value ? searchableColumns.map(() => `%${search.value}%`) : []);
      const totalRecords = countResult[0].total;

      // Add ordering (matching PHP model exactly)
      const orderColumns = [null, 'users.full_name', 'user_investor.reference_no', 'user_investor.name', 'user_investor.approval_status', 'user_investor.status'];
      if (order && order[0]) {
        const orderColumn = orderColumns[order[0].column];
        const orderDir = order[0].dir;
        if (orderColumn) {
          baseQuery += ` ORDER BY ${orderColumn} ${orderDir}`;
        }
      } else {
        baseQuery += ' ORDER BY users.full_name ASC';
      }

      // Add pagination
      if (length && length !== -1) {
        baseQuery += ` LIMIT ${parseInt(start) || 0}, ${parseInt(length)}`;
      }

      // Execute query
      const investors = await query(baseQuery, search && search.value ? searchableColumns.map(() => `%${search.value}%`) : []);

      // Format data for DataTables (matching PHP exactly)
      const data = investors.map((row, index) => {
        const i = (parseInt(start) || 0) + index + 1;

        // Format approval status (matching PHP exactly)
        let appStatus = '<span class="badge bg-soft-warning text-warning">Pending</span>';
        if (row.approval_status == 2) {
          appStatus = '<span class="badge bg-soft-success text-success">Approved</span>';
        } else if (row.approval_status == 3) {
          appStatus = '<span class="badge bg-soft-danger text-danger">Rejected</span>';
        }

        // Format status (matching PHP exactly)
        const status = row.status == 1 ? '<span class="badge bg-soft-success text-success">Active</span>' : '<span class="badge bg-soft-danger text-danger">Inactive</span>';

        // Format action buttons (matching PHP exactly)
        const action = `
          <a href="javascript:void(0);" data-id="${row.investor_id}" class="action-icon edit_info"><i class="mdi mdi-square-edit-outline"></i></a>
          <a href="javascript:void(0);" data-id="${row.investor_id}" class="action-icon view_info"><i class="mdi mdi-eye"></i></a>
          <a href="javascript:void(0);" data-id="${row.investor_id}" class="action-icon delete_info"><i class="mdi mdi-delete"></i></a>
        `;

        return [i, row.full_name, row.reference_no, row.name, appStatus, status, action];
      });

      return res.json({
        draw: parseInt(draw) || 1,
        recordsTotal: totalRecords,
        recordsFiltered: totalRecords,
        data: data
      });

    } catch (error) {
      console.error('listInvestorsAjax error:', error);
      return res.json({
        status: false,
        rcode: 500,
        message: 'Failed to retrieve investors list'
      });
    }
  }

  // Edit investors - PHP compatible version
  static async editInvestors(req, res) {
    try {
      // Support both query parameters and form data
      const { user_id, token, keys } = {
        ...req.query,
        ...req.body
      };

      // Check if user_id and token are provided
      if (!user_id || !token) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'user_id and token are required'
        });
      }

      // Decode user ID
      const decodedUserId = idDecode(user_id);
      if (!decodedUserId) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'Invalid user ID'
        });
      }

      // Check if user exists
      const userRows = await query('SELECT * FROM users WHERE user_id = ? LIMIT 1', [decodedUserId]);
      if (!userRows.length) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'User not found'
        });
      }

      // Check if user is admin (role_id = 1 or 2)
      const adminRows = await query('SELECT * FROM admin_users WHERE id = ? LIMIT 1', [decodedUserId]);
      if (!adminRows.length) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'Permission denied'
        });
      }

      // Check if keys is provided
      if (!keys) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'Investor ID is required'
        });
      }

      // Get investor details (matching PHP exactly)
      const investorRows = await query('SELECT * FROM user_investor WHERE investor_id = ? LIMIT 1', [keys]);
      if (!investorRows.length) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'Investor not found'
        });
      }

      const details = investorRows[0];

      // Get state list (matching PHP exactly)
      const stateRows = await query('SELECT * FROM states WHERE country_id = ? ORDER BY name ASC', [details.country_id]);
      let listState = '<option value="">Select State</option>';
      stateRows.forEach(state => {
        const selected = state.id == details.state_id ? 'selected' : '';
        listState += `<option value="${state.id}" ${selected}>${state.name}</option>`;
      });

      // Get city list if state_id exists (matching PHP exactly)
      let listCities = '<option value="">Select City</option>';
      if (details.state_id) {
        const cityRows = await query('SELECT * FROM cities WHERE state_id = ? ORDER BY name ASC', [details.state_id]);
        cityRows.forEach(city => {
          const selected = city.id == details.city_id ? 'selected' : '';
          listCities += `<option value="${city.id}" ${selected}>${city.name}</option>`;
        });
      }

      // Add image URL if exists (matching PHP exactly)
      if (details.image) {
        details.image = `http://localhost:3000/uploads/investors/${details.image}`;
      }

      // Add dropdown lists to details
      details.list_state = listState;
      details.list_cities = listCities;

      return res.json(details);

    } catch (error) {
      console.error('editInvestors error:', error);
      return res.json({
        status: false,
        rcode: 500,
        message: 'Failed to retrieve investor details'
      });
    }
  }

  // Delete investors - PHP compatible version
  static async deleteInvestors(req, res) {
    try {
      // Support both query parameters and form data
      const { user_id, token, keys } = {
        ...req.query,
        ...req.body
      };

      // Check if user_id and token are provided
      if (!user_id || !token) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'user_id and token are required'
        });
      }

      // Decode user ID
      const decodedUserId = idDecode(user_id);
      if (!decodedUserId) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'Invalid user ID'
        });
      }

      // Check if user exists
      const userRows = await query('SELECT * FROM users WHERE user_id = ? LIMIT 1', [decodedUserId]);
      if (!userRows.length) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'User not found'
        });
      }

      // Check if user is admin (role_id = 1 or 2)
      const adminRows = await query('SELECT * FROM admin_users WHERE id = ? LIMIT 1', [decodedUserId]);
      if (!adminRows.length) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'Permission denied'
        });
      }

      // Check if keys is provided
      if (!keys) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'Investor ID is required'
        });
      }

      // Get admin role_id
      const admin = adminRows[0];

      // Soft delete investor (matching PHP exactly)
      await query(
        'UPDATE user_investor SET status = 0, deleted = 1, deleted_at = ?, deleted_by = ? WHERE investor_id = ?',
        [new Date().toISOString().slice(0, 19).replace('T', ' '), admin.role_id, keys]
      );

      return res.json({
        status: 'Success',
        info: 'Investor Deleted Successfully'
      });

    } catch (error) {
      console.error('deleteInvestors error:', error);
      return res.json({
        status: 'Error',
        info: 'Failed to delete investor'
      });
    }
  }

  // View investors details - PHP compatible version
  static async viewInvestorsDetails(req, res) {
    try {
      // Support both query parameters and form data
      const { user_id, token, keys } = {
        ...req.query,
        ...req.body
      };

      // Check if user_id and token are provided
      if (!user_id || !token) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'user_id and token are required'
        });
      }

      // Decode user ID
      const decodedUserId = idDecode(user_id);
      if (!decodedUserId) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'Invalid user ID'
        });
      }

      // Check if user exists
      const userRows = await query('SELECT * FROM users WHERE user_id = ? LIMIT 1', [decodedUserId]);
      if (!userRows.length) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'User not found'
        });
      }

      // Check if user is admin (role_id = 1 or 2)
      const adminRows = await query('SELECT * FROM admin_users WHERE id = ? LIMIT 1', [decodedUserId]);
      if (!adminRows.length) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'Permission denied'
        });
      }

      // Check if keys is provided
      if (!keys) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'Investor ID is required'
        });
      }

      // Get investor details with joins (matching PHP exactly)
      const detailsRows = await query(`
        SELECT user_investor.*, countries.name as country_name, states.name as state_name, cities.name as city_name, users.full_name
        FROM user_investor
        LEFT JOIN countries ON countries.id = user_investor.country_id
        LEFT JOIN states ON states.id = user_investor.state_id
        LEFT JOIN cities ON cities.id = user_investor.city_id
        LEFT JOIN users ON users.user_id = user_investor.user_id
        WHERE user_investor.investor_id = ?
        LIMIT 1
      `, [keys]);

      if (!detailsRows.length) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'Investor not found'
        });
      }

      return res.json(detailsRows[0]);

    } catch (error) {
      console.error('viewInvestorsDetails error:', error);
      return res.json({
        status: false,
        rcode: 500,
        message: 'Failed to retrieve investor details'
      });
    }
  }

  // View jobs - PHP compatible version
  static async viewJobs(req, res) {
    try {
      // Support both query parameters and form data
      const { user_id, token } = {
        ...req.query,
        ...req.body
      };

      // Check if user_id and token are provided
      if (!user_id || !token) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'user_id and token are required'
        });
      }

      // Decode user ID
      const decodedUserId = idDecode(user_id);
      if (!decodedUserId) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'Invalid user ID'
        });
      }

      // Check if user exists
      const userRows = await query('SELECT * FROM users WHERE user_id = ? LIMIT 1', [decodedUserId]);
      if (!userRows.length) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'User not found'
        });
      }

      // Check if user is admin (role_id = 1 or 2)
      const adminRows = await query('SELECT * FROM admin_users WHERE id = ? LIMIT 1', [decodedUserId]);
      if (!adminRows.length) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'Permission denied'
        });
      }

      // Get users list (matching PHP exactly)
      const users = await query('SELECT * FROM users WHERE deleted = 0 ORDER BY full_name ASC');

      // Get countries list (matching PHP exactly)
      const countries = await query('SELECT * FROM countries WHERE status = 1 ORDER BY name ASC');

      // Get job types list (matching PHP exactly)
      const jobTypes = await query('SELECT * FROM job_type WHERE status = 1 ORDER BY name ASC');

      // Get pay types list (matching PHP exactly)
      const payTypes = await query('SELECT * FROM pay WHERE status = 1 ORDER BY name ASC');

      return res.json({
        status: true,
        rcode: 200,
        user_id: user_id,
        unique_token: token,
        list_users: users,
        list_country: countries,
        list_job_type: jobTypes,
        list_pay: payTypes,
        message: 'Jobs list view data retrieved successfully'
      });

    } catch (error) {
      console.error('viewJobs error:', error);
      return res.json({
        status: false,
        rcode: 500,
        message: 'Failed to retrieve jobs list view data'
      });
    }
  }

  // Submit jobs - PHP compatible version
  static async submitJobs(req, res) {
    try {
      // Support both query parameters and form data
      const { user_id, token, row_id, user_id: job_user_id, job_title, company_name, country_id, state_id, city_id, address, job_lat, job_lng, job_type_id, pay_id, job_description, status } = {
        ...req.query,
        ...req.body
      };
      
      // Extract job user_id from body (different from admin user_id)
      const jobUserId = req.body.user_id;
      
      // Ensure admin user_id comes from query parameters
      const adminUserId = req.query.user_id;

      console.log('submitJobs - Parameters:', { user_id, token, row_id, jobUserId, job_title, company_name, country_id, state_id, city_id, address, job_lat, job_lng, job_type_id, pay_id, job_description, status });

      // Check if user_id and token are provided
      if (!adminUserId || !token) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'user_id and token are required'
        });
      }

      // Decode user ID
      const decodedUserId = idDecode(adminUserId);
      if (!decodedUserId) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'Invalid user ID'
        });
      }

      // Check if user exists
      const userRows = await query('SELECT * FROM users WHERE user_id = ? LIMIT 1', [decodedUserId]);
      if (!userRows.length) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'User not found'
        });
      }

      // Check if user is admin (role_id = 1 or 2)
      const adminRows = await query('SELECT * FROM admin_users WHERE id = ? LIMIT 1', [decodedUserId]);
      if (!adminRows.length) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'Permission denied'
        });
      }

      // Check if required fields are provided
      if (!jobUserId) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'user_id is required'
        });
      }

      // Get admin role_id
      const admin = adminRows[0];

      if (!row_id || row_id === '') {
        // Insert new job (matching PHP exactly)
        const insertData = {
          user_id: parseInt(jobUserId),
          job_title: job_title ? job_title.trim() : '',
          company_name: company_name ? company_name.trim() : '',
          country_id: country_id ? parseInt(country_id) : 166, // Default to Pakistan
          state_id: state_id ? parseInt(state_id) : 2728, // Default to Punjab
          city_id: city_id ? parseInt(city_id) : 31439, // Default to Lahore
          address: address ? address.trim() : '',
          job_lat: job_lat ? parseFloat(job_lat) : null,
          job_lng: job_lng ? parseFloat(job_lng) : null,
          job_type_id: job_type_id ? parseInt(job_type_id) : null,
          pay_id: pay_id ? parseInt(pay_id) : null,
          job_description: job_description ? job_description.trim() : '',
          status: status !== undefined ? parseInt(status) : 1,
          deleted: 0,
          created_dts: new Date().toISOString().slice(0, 19).replace('T', ' '),
          created_by: admin.role_id
        };

        await query(
          'INSERT INTO user_job_details (user_id, job_title, company_name, country_id, state_id, city_id, address, job_lat, job_lng, job_type_id, pay_id, job_description, status, deleted, created_dts, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
          [insertData.user_id, insertData.job_title, insertData.company_name, insertData.country_id, insertData.state_id, insertData.city_id, insertData.address, insertData.job_lat, insertData.job_lng, insertData.job_type_id, insertData.pay_id, insertData.job_description, insertData.status, insertData.deleted, insertData.created_dts, insertData.created_by]
        );

        return res.json({
          status: 'Success',
          info: 'Job Created Successfully'
        });

      } else {
        // Update existing job (matching PHP exactly)
        const updateData = {
          user_id: parseInt(jobUserId),
          job_title: job_title ? job_title.trim() : '',
          company_name: company_name ? company_name.trim() : '',
          country_id: country_id ? parseInt(country_id) : 166, // Default to Pakistan
          state_id: state_id ? parseInt(state_id) : 2728, // Default to Punjab
          city_id: city_id ? parseInt(city_id) : 31439, // Default to Lahore
          address: address ? address.trim() : '',
          job_lat: job_lat ? parseFloat(job_lat) : null,
          job_lng: job_lng ? parseFloat(job_lng) : null,
          job_type_id: job_type_id ? parseInt(job_type_id) : null,
          pay_id: pay_id ? parseInt(pay_id) : null,
          job_description: job_description ? job_description.trim() : '',
          status: status !== undefined ? parseInt(status) : 1,
          updated_at: new Date().toISOString().slice(0, 19).replace('T', ' '),
          updated_by: admin.role_id
        };

        await query(
          'UPDATE user_job_details SET user_id = ?, job_title = ?, company_name = ?, country_id = ?, state_id = ?, city_id = ?, address = ?, job_lat = ?, job_lng = ?, job_type_id = ?, pay_id = ?, job_description = ?, status = ?, updated_at = ?, updated_by = ? WHERE job_id = ?',
          [updateData.user_id, updateData.job_title, updateData.company_name, updateData.country_id, updateData.state_id, updateData.city_id, updateData.address, updateData.job_lat, updateData.job_lng, updateData.job_type_id, updateData.pay_id, updateData.job_description, updateData.status, updateData.updated_at, updateData.updated_by, row_id]
        );

        return res.json({
          status: 'Success',
          info: 'Job Updated Successfully'
        });
      }

    } catch (error) {
      console.error('submitJobs error:', error);
      return res.json({
        status: 'Error',
        info: 'Failed to submit job'
      });
    }
  }

  // List jobs ajax - PHP compatible version
  static async listJobsAjax(req, res) {
    try {
      // Support both query parameters and form data
      const { user_id, token, draw, start, length, search, order, columns } = {
        ...req.query,
        ...req.body
      };

      // Check if user_id and token are provided
      if (!user_id || !token) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'user_id and token are required'
        });
      }

      // Decode user ID
      const decodedUserId = idDecode(user_id);
      if (!decodedUserId) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'Invalid user ID'
        });
      }

      // Check if user exists
      const userRows = await query('SELECT * FROM users WHERE user_id = ? LIMIT 1', [decodedUserId]);
      if (!userRows.length) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'User not found'
        });
      }

      // Check if user is admin (role_id = 1 or 2)
      const adminRows = await query('SELECT * FROM admin_users WHERE id = ? LIMIT 1', [decodedUserId]);
      if (!adminRows.length) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'Permission denied'
        });
      }

      // Build base query (matching PHP model exactly)
      let baseQuery = `
        SELECT users.full_name, user_job_details.*
        FROM user_job_details
        LEFT JOIN users ON users.user_id = user_job_details.user_id
        WHERE user_job_details.deleted = 0
      `;

      // Add search functionality (matching PHP model exactly)
      const searchableColumns = ['users.full_name', 'user_job_details.job_title', 'user_job_details.company_name', 'user_job_details.approval_status', 'user_job_details.status'];
      if (search && search.value) {
        const searchConditions = searchableColumns.map(col => `${col} LIKE ?`).join(' OR ');
        baseQuery += ` AND (${searchConditions})`;
      }

      // Get total count
      const countQuery = baseQuery.replace('SELECT users.full_name, user_job_details.*', 'SELECT COUNT(*) as total');
      const countResult = await query(countQuery, search && search.value ? searchableColumns.map(() => `%${search.value}%`) : []);
      const totalRecords = countResult[0].total;

      // Add ordering (matching PHP model exactly)
      const orderColumns = [null, 'users.full_name', 'user_job_details.job_title', 'user_job_details.company_name', 'user_job_details.approval_status', 'user_job_details.status'];
      if (order && order[0]) {
        const orderColumn = orderColumns[order[0].column];
        const orderDir = order[0].dir;
        if (orderColumn) {
          baseQuery += ` ORDER BY ${orderColumn} ${orderDir}`;
        }
      } else {
        baseQuery += ' ORDER BY users.full_name ASC';
      }

      // Add pagination
      if (length && length !== -1) {
        baseQuery += ` LIMIT ${parseInt(start) || 0}, ${parseInt(length)}`;
      }

      // Execute query
      const jobs = await query(baseQuery, search && search.value ? searchableColumns.map(() => `%${search.value}%`) : []);

      // Format data for DataTables (matching PHP exactly)
      const data = jobs.map((row, index) => {
        const i = (parseInt(start) || 0) + index + 1;

        // Format status (matching PHP exactly)
        const status = row.status == 1 ? '<span class="badge bg-soft-success text-success">Active</span>' : '<span class="badge bg-soft-danger text-danger">Inactive</span>';

        // Format action buttons (matching PHP exactly)
        const action = `
          <a href="javascript:void(0);" data-id="${row.job_id}" class="action-icon edit_info"><i class="mdi mdi-square-edit-outline"></i></a>
          <a href="javascript:void(0);" data-id="${row.job_id}" class="action-icon view_info"><i class="mdi mdi-eye"></i></a>
          <a href="javascript:void(0);" data-id="${row.job_id}" class="action-icon delete_info"><i class="mdi mdi-delete"></i></a>
        `;

        return [i, row.full_name, row.job_title, row.company_name, status, action];
      });

      return res.json({
        draw: parseInt(draw) || 1,
        recordsTotal: totalRecords,
        recordsFiltered: totalRecords,
        data: data
      });

    } catch (error) {
      console.error('listJobsAjax error:', error);
      return res.json({
        status: false,
        rcode: 500,
        message: 'Failed to retrieve jobs list'
      });
    }
  }

  // Edit jobs - PHP compatible version
  static async editJobs(req, res) {
    try {
      // Support both query parameters and form data
      const { user_id, token, keys } = {
        ...req.query,
        ...req.body
      };

      // Check if user_id and token are provided
      if (!user_id || !token) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'user_id and token are required'
        });
      }

      // Decode user ID
      const decodedUserId = idDecode(user_id);
      if (!decodedUserId) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'Invalid user ID'
        });
      }

      // Check if user exists
      const userRows = await query('SELECT * FROM users WHERE user_id = ? LIMIT 1', [decodedUserId]);
      if (!userRows.length) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'User not found'
        });
      }

      // Check if user is admin (role_id = 1 or 2)
      const adminRows = await query('SELECT * FROM admin_users WHERE id = ? LIMIT 1', [decodedUserId]);
      if (!adminRows.length) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'Permission denied'
        });
      }

      // Check if keys is provided
      if (!keys) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'Job ID is required'
        });
      }

      // Get job details (matching PHP exactly)
      const jobRows = await query('SELECT * FROM user_job_details WHERE job_id = ? LIMIT 1', [keys]);
      if (!jobRows.length) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'Job not found'
        });
      }

      const details = jobRows[0];

      // Get state list (matching PHP exactly)
      const stateRows = await query('SELECT * FROM states WHERE country_id = ? ORDER BY name ASC', [details.country_id]);
      let listState = '<option value="">Select State</option>';
      stateRows.forEach(state => {
        const selected = state.id == details.state_id ? 'selected' : '';
        listState += `<option value="${state.id}" ${selected}>${state.name}</option>`;
      });

      // Get city list if state_id exists (matching PHP exactly)
      let listCities = '<option value="">Select City</option>';
      if (details.state_id) {
        const cityRows = await query('SELECT * FROM cities WHERE state_id = ? ORDER BY name ASC', [details.state_id]);
        cityRows.forEach(city => {
          const selected = city.id == details.city_id ? 'selected' : '';
          listCities += `<option value="${city.id}" ${selected}>${city.name}</option>`;
        });
      }

      // Add dropdown lists to details
      details.list_state = listState;
      details.list_cities = listCities;

      return res.json(details);

    } catch (error) {
      console.error('editJobs error:', error);
      return res.json({
        status: false,
        rcode: 500,
        message: 'Failed to retrieve job details'
      });
    }
  }

  // Delete jobs - PHP compatible version
  static async deleteJobs(req, res) {
    try {
      // Support both query parameters and form data
      const { user_id, token, keys } = {
        ...req.query,
        ...req.body
      };

      // Check if user_id and token are provided
      if (!user_id || !token) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'user_id and token are required'
        });
      }

      // Decode user ID
      const decodedUserId = idDecode(user_id);
      if (!decodedUserId) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'Invalid user ID'
        });
      }

      // Check if user exists
      const userRows = await query('SELECT * FROM users WHERE user_id = ? LIMIT 1', [decodedUserId]);
      if (!userRows.length) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'User not found'
        });
      }

      // Check if user is admin (role_id = 1 or 2)
      const adminRows = await query('SELECT * FROM admin_users WHERE id = ? LIMIT 1', [decodedUserId]);
      if (!adminRows.length) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'Permission denied'
        });
      }

      // Check if keys is provided
      if (!keys) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'Job ID is required'
        });
      }

      // Get admin role_id
      const admin = adminRows[0];

      // Soft delete job (matching PHP exactly)
      await query(
        'UPDATE user_job_details SET deleted = 1, deleted_at = ?, deleted_by = ? WHERE job_id = ?',
        [new Date().toISOString().slice(0, 19).replace('T', ' '), admin.role_id, keys]
      );

      return res.json({
        status: 'Success',
        info: 'Job Deleted Successfully'
      });

    } catch (error) {
      console.error('deleteJobs error:', error);
      return res.json({
        status: 'Error',
        info: 'Failed to delete job'
      });
    }
  }

  // View jobs details - PHP compatible version
  static async viewJobsDetails(req, res) {
    try {
      // Support both query parameters and form data
      const { user_id, token, keys } = {
        ...req.query,
        ...req.body
      };

      // Check if user_id and token are provided
      if (!user_id || !token) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'user_id and token are required'
        });
      }

      // Decode user ID
      const decodedUserId = idDecode(user_id);
      if (!decodedUserId) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'Invalid user ID'
        });
      }

      // Check if user exists
      const userRows = await query('SELECT * FROM users WHERE user_id = ? LIMIT 1', [decodedUserId]);
      if (!userRows.length) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'User not found'
        });
      }

      // Check if user is admin (role_id = 1 or 2)
      const adminRows = await query('SELECT * FROM admin_users WHERE id = ? LIMIT 1', [decodedUserId]);
      if (!adminRows.length) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'Permission denied'
        });
      }

      // Check if keys is provided
      if (!keys) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'Job ID is required'
        });
      }

      // Get job details with joins (matching PHP exactly)
      const detailsRows = await query(`
        SELECT user_job_details.*, countries.name as country_name, states.name as state_name, cities.name as city_name, users.full_name, job_type.name as job_type_name, pay.name as pay_name
        FROM user_job_details
        LEFT JOIN countries ON countries.id = user_job_details.country_id
        LEFT JOIN states ON states.id = user_job_details.state_id
        LEFT JOIN cities ON cities.id = user_job_details.city_id
        LEFT JOIN users ON users.user_id = user_job_details.user_id
        LEFT JOIN job_type ON job_type.id = user_job_details.job_type_id
        LEFT JOIN pay ON pay.id = user_job_details.pay_id
        WHERE user_job_details.job_id = ?
        LIMIT 1
      `, [keys]);

      if (!detailsRows.length) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'Job not found'
        });
      }

      return res.json(detailsRows[0]);

    } catch (error) {
      console.error('viewJobsDetails error:', error);
      return res.json({
        status: false,
        rcode: 500,
        message: 'Failed to retrieve job details'
      });
    }
  }

  // View events - PHP compatible version
  static async viewEvents(req, res) {
    try {
      // Support both query parameters and form data
      const { user_id, token } = {
        ...req.query,
        ...req.body
      };

      // Check if user_id and token are provided
      if (!user_id || !token) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'user_id and token are required'
        });
      }

      // Decode user ID
      const decodedUserId = idDecode(user_id);
      if (!decodedUserId) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'Invalid user ID'
        });
      }

      // Check if user exists
      const userRows = await query('SELECT * FROM users WHERE user_id = ? LIMIT 1', [decodedUserId]);
      if (!userRows.length) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'User not found'
        });
      }

      // Check if user is admin (role_id = 1 or 2)
      const adminRows = await query('SELECT * FROM admin_users WHERE id = ? LIMIT 1', [decodedUserId]);
      if (!adminRows.length) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'Permission denied'
        });
      }

      // Get users list (matching PHP exactly)
      const users = await query('SELECT * FROM users WHERE deleted = 0 ORDER BY full_name ASC');

      // Get countries list (matching PHP exactly)
      const countries = await query('SELECT * FROM countries WHERE status = 1 ORDER BY name ASC');

      // Get event modes list (matching PHP exactly)
      const eventModes = await query('SELECT * FROM event_mode WHERE status = 1 AND deleted = 0 ORDER BY name ASC');

      // Get event types list (matching PHP exactly)
      const eventTypes = await query('SELECT * FROM event_type WHERE status = 1 AND deleted = 0 ORDER BY name ASC');

      // Get industry types list (matching PHP exactly)
      const industryTypes = await query('SELECT * FROM industry_type WHERE status = 1 AND deleted = 0 ORDER BY name ASC');

      return res.json({
        status: true,
        rcode: 200,
        user_id: user_id,
        unique_token: token,
        list_users: users,
        list_country: countries,
        list_event_mode: eventModes,
        list_event_type: eventTypes,
        list_industry_type: industryTypes,
        message: 'Events list view data retrieved successfully'
      });

    } catch (error) {
      console.error('viewEvents error:', error);
      return res.json({
        status: false,
        rcode: 500,
        message: 'Failed to retrieve events list view data'
      });
    }
  }

  // Submit events - PHP compatible version
  static async submitEvents(req, res) {
    try {
      // Support both query parameters and form data
      const { user_id, token, row_id, user_id: event_user_id, event_name, industry_type, country_id, state_id, city_id, event_venue, event_link, event_lat, event_lng, event_geo_address, event_date, event_start_time, event_end_time, event_mode_id, event_type_id, event_details, status } = {
        ...req.query,
        ...req.body
      };
      
      // Extract event user_id from body (different from admin user_id)
      const eventUserId = req.body.user_id;
      
      // Ensure admin user_id comes from query parameters
      const adminUserId = req.query.user_id;

      console.log('submitEvents - Parameters:', { user_id, token, row_id, eventUserId, event_name, industry_type, country_id, state_id, city_id, event_venue, event_link, event_lat, event_lng, event_geo_address, event_date, event_start_time, event_end_time, event_mode_id, event_type_id, event_details, status });

      // Check if user_id and token are provided
      if (!adminUserId || !token) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'user_id and token are required'
        });
      }

      // Decode user ID
      const decodedUserId = idDecode(adminUserId);
      if (!decodedUserId) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'Invalid user ID'
        });
      }

      // Check if user exists
      const userRows = await query('SELECT * FROM users WHERE user_id = ? LIMIT 1', [decodedUserId]);
      if (!userRows.length) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'User not found'
        });
      }

      // Check if user is admin (role_id = 1 or 2)
      const adminRows = await query('SELECT * FROM admin_users WHERE id = ? LIMIT 1', [decodedUserId]);
      if (!adminRows.length) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'Permission denied'
        });
      }

      // Check if required fields are provided
      if (!eventUserId) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'user_id is required'
        });
      }

      // Get admin role_id
      const admin = adminRows[0];

      if (!row_id || row_id === '') {
        // Insert new event (matching PHP exactly)
        const insertData = {
          user_id: parseInt(eventUserId),
          event_name: event_name ? event_name.trim() : '',
          industry_type: industry_type ? industry_type.trim() : '',
          country_id: country_id ? parseInt(country_id) : 166, // Default to Pakistan
          state_id: state_id ? parseInt(state_id) : 2728, // Default to Punjab
          city_id: city_id ? parseInt(city_id) : 31439, // Default to Lahore
          event_venue: event_venue ? event_venue.trim() : '',
          event_link: event_link ? event_link.trim() : '',
          event_lat: event_lat ? event_lat.toString() : '',
          event_lng: event_lng ? event_lng.toString() : '',
          event_geo_address: event_geo_address ? event_geo_address.trim() : '',
          event_date: event_date ? event_date.trim() : null,
          event_start_time: event_start_time ? event_start_time.trim() : null,
          event_end_time: event_end_time ? event_end_time.trim() : null,
          event_mode_id: event_mode_id ? parseInt(event_mode_id) : null,
          event_type_id: event_type_id ? parseInt(event_type_id) : null,
          event_details: event_details ? event_details.trim() : '',
          event_banner: '', // Default empty string for event_banner
          status: status !== undefined ? parseInt(status) : 1,
          deleted: 0,
          created_dts: new Date().toISOString().slice(0, 19).replace('T', ' '),
          created_by: admin.role_id
        };

        await query(
          'INSERT INTO user_event_details (user_id, event_name, industry_type, country_id, state_id, city_id, event_venue, event_link, event_lat, event_lng, event_geo_address, event_date, event_start_time, event_end_time, event_mode_id, event_type_id, event_details, event_banner, status, deleted, created_dts, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
          [insertData.user_id, insertData.event_name, insertData.industry_type, insertData.country_id, insertData.state_id, insertData.city_id, insertData.event_venue, insertData.event_link, insertData.event_lat, insertData.event_lng, insertData.event_geo_address, insertData.event_date, insertData.event_start_time, insertData.event_end_time, insertData.event_mode_id, insertData.event_type_id, insertData.event_details, insertData.event_banner, insertData.status, insertData.deleted, insertData.created_dts, insertData.created_by]
        );

        return res.json({
          status: 'Success',
          info: 'Event Created Successfully'
        });

      } else {
        // Update existing event (matching PHP exactly)
        const updateData = {
          user_id: parseInt(eventUserId),
          event_name: event_name ? event_name.trim() : '',
          industry_type: industry_type ? industry_type.trim() : '',
          country_id: country_id ? parseInt(country_id) : 166, // Default to Pakistan
          state_id: state_id ? parseInt(state_id) : 2728, // Default to Punjab
          city_id: city_id ? parseInt(city_id) : 31439, // Default to Lahore
          event_venue: event_venue ? event_venue.trim() : '',
          event_link: event_link ? event_link.trim() : '',
          event_lat: event_lat ? event_lat.toString() : '',
          event_lng: event_lng ? event_lng.toString() : '',
          event_geo_address: event_geo_address ? event_geo_address.trim() : '',
          event_date: event_date ? event_date.trim() : null,
          event_start_time: event_start_time ? event_start_time.trim() : null,
          event_end_time: event_end_time ? event_end_time.trim() : null,
          event_mode_id: event_mode_id ? parseInt(event_mode_id) : null,
          event_type_id: event_type_id ? parseInt(event_type_id) : null,
          event_details: event_details ? event_details.trim() : '',
          status: status !== undefined ? parseInt(status) : 1,
          updated_at: new Date().toISOString().slice(0, 19).replace('T', ' '),
          updated_by: admin.role_id
        };

        await query(
          'UPDATE user_event_details SET user_id = ?, event_name = ?, industry_type = ?, country_id = ?, state_id = ?, city_id = ?, event_venue = ?, event_link = ?, event_lat = ?, event_lng = ?, event_geo_address = ?, event_date = ?, event_start_time = ?, event_end_time = ?, event_mode_id = ?, event_type_id = ?, event_details = ?, status = ?, updated_at = ?, updated_by = ? WHERE event_id = ?',
          [updateData.user_id, updateData.event_name, updateData.industry_type, updateData.country_id, updateData.state_id, updateData.city_id, updateData.event_venue, updateData.event_link, updateData.event_lat, updateData.event_lng, updateData.event_geo_address, updateData.event_date, updateData.event_start_time, updateData.event_end_time, updateData.event_mode_id, updateData.event_type_id, updateData.event_details, updateData.status, updateData.updated_at, updateData.updated_by, row_id]
        );

        return res.json({
          status: 'Success',
          info: 'Event Updated Successfully'
        });
      }

    } catch (error) {
      console.error('submitEvents error:', error);
      return res.json({
        status: 'Error',
        info: 'Failed to submit event'
      });
    }
  }

  // List events ajax - PHP compatible version
  static async listEventsAjax(req, res) {
    try {
      // Support both query parameters and form data
      const { user_id, token, draw, start, length, search, order, columns } = {
        ...req.query,
        ...req.body
      };

      // Check if user_id and token are provided
      if (!user_id || !token) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'user_id and token are required'
        });
      }

      // Decode user ID
      const decodedUserId = idDecode(user_id);
      if (!decodedUserId) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'Invalid user ID'
        });
      }

      // Check if user exists
      const userRows = await query('SELECT * FROM users WHERE user_id = ? LIMIT 1', [decodedUserId]);
      if (!userRows.length) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'User not found'
        });
      }

      // Check if user is admin (role_id = 1 or 2)
      const adminRows = await query('SELECT * FROM admin_users WHERE id = ? LIMIT 1', [decodedUserId]);
      if (!adminRows.length) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'Permission denied'
        });
      }

      // Build base query (matching PHP model exactly)
      let baseQuery = `
        SELECT users.full_name, user_event_details.*
        FROM user_event_details
        LEFT JOIN users ON users.user_id = user_event_details.user_id
        WHERE user_event_details.deleted = 0
      `;

      // Add search functionality (matching PHP model exactly)
      const searchableColumns = ['users.full_name', 'user_event_details.event_name', 'user_event_details.event_venue', 'user_event_details.status'];
      if (search && search.value) {
        const searchConditions = searchableColumns.map(col => `${col} LIKE ?`).join(' OR ');
        baseQuery += ` AND (${searchConditions})`;
      }

      // Get total count
      const countQuery = baseQuery.replace('SELECT users.full_name, user_event_details.*', 'SELECT COUNT(*) as total');
      const countResult = await query(countQuery, search && search.value ? searchableColumns.map(() => `%${search.value}%`) : []);
      const totalRecords = countResult[0].total;

      // Add ordering (matching PHP model exactly)
      const orderColumns = [null, 'users.full_name', 'user_event_details.event_name', 'user_event_details.event_venue', 'user_event_details.status'];
      if (order && order[0]) {
        const orderColumn = orderColumns[order[0].column];
        const orderDir = order[0].dir;
        if (orderColumn) {
          baseQuery += ` ORDER BY ${orderColumn} ${orderDir}`;
        }
      } else {
        baseQuery += ' ORDER BY users.full_name ASC';
      }

      // Add pagination
      if (length && length !== -1) {
        baseQuery += ` LIMIT ${parseInt(start) || 0}, ${parseInt(length)}`;
      }

      // Execute query
      const events = await query(baseQuery, search && search.value ? searchableColumns.map(() => `%${search.value}%`) : []);

      // Format data for DataTables (matching PHP exactly)
      const data = events.map((row, index) => {
        const i = (parseInt(start) || 0) + index + 1;

        // Format status (matching PHP exactly)
        const status = row.status == 1 ? '<span class="badge bg-soft-success text-success">Active</span>' : '<span class="badge bg-soft-danger text-danger">Inactive</span>';

        // Format action buttons (matching PHP exactly)
        const action = `
          <a href="javascript:void(0);" data-id="${row.event_id}" class="action-icon edit_info"><i class="mdi mdi-square-edit-outline"></i></a>
          <a href="javascript:void(0);" data-id="${row.event_id}" class="action-icon view_info"><i class="mdi mdi-eye"></i></a>
          <a href="javascript:void(0);" data-id="${row.event_id}" class="action-icon delete_info"><i class="mdi mdi-delete"></i></a>
        `;

        return [i, row.full_name, row.event_name, row.event_venue, status, action];
      });

      return res.json({
        draw: parseInt(draw) || 1,
        recordsTotal: totalRecords,
        recordsFiltered: totalRecords,
        data: data
      });

    } catch (error) {
      console.error('listEventsAjax error:', error);
      return res.json({
        status: false,
        rcode: 500,
        message: 'Failed to retrieve events list'
      });
    }
  }

  // Edit events - PHP compatible version
  static async editEvents(req, res) {
    try {
      // Support both query parameters and form data
      const { user_id, token, keys } = {
        ...req.query,
        ...req.body
      };

      // Check if user_id and token are provided
      if (!user_id || !token) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'user_id and token are required'
        });
      }

      // Decode user ID
      const decodedUserId = idDecode(user_id);
      if (!decodedUserId) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'Invalid user ID'
        });
      }

      // Check if user exists
      const userRows = await query('SELECT * FROM users WHERE user_id = ? LIMIT 1', [decodedUserId]);
      if (!userRows.length) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'User not found'
        });
      }

      // Check if user is admin (role_id = 1 or 2)
      const adminRows = await query('SELECT * FROM admin_users WHERE id = ? LIMIT 1', [decodedUserId]);
      if (!adminRows.length) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'Permission denied'
        });
      }

      // Check if keys is provided
      if (!keys) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'Event ID is required'
        });
      }

      // Get event details (matching PHP exactly)
      const eventRows = await query('SELECT * FROM user_event_details WHERE event_id = ? LIMIT 1', [keys]);
      if (!eventRows.length) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'Event not found'
        });
      }

      const details = eventRows[0];

      // Get state list (matching PHP exactly)
      const stateRows = await query('SELECT * FROM states WHERE country_id = ? ORDER BY name ASC', [details.country_id]);
      let listState = '<option value="">Select State</option>';
      stateRows.forEach(state => {
        const selected = state.id == details.state_id ? 'selected' : '';
        listState += `<option value="${state.id}" ${selected}>${state.name}</option>`;
      });

      // Get city list if state_id exists (matching PHP exactly)
      let listCities = '<option value="">Select City</option>';
      if (details.state_id) {
        const cityRows = await query('SELECT * FROM cities WHERE state_id = ? ORDER BY name ASC', [details.state_id]);
        cityRows.forEach(city => {
          const selected = city.id == details.city_id ? 'selected' : '';
          listCities += `<option value="${city.id}" ${selected}>${city.name}</option>`;
        });
      }

      // Add dropdown lists to details
      details.list_state = listState;
      details.list_cities = listCities;

      // Add event banner URL if exists (matching PHP exactly)
      if (details.event_banner) {
        details.event_banner = `http://localhost:3000/uploads/events/${details.event_banner}`;
      }

      return res.json(details);

    } catch (error) {
      console.error('editEvents error:', error);
      return res.json({
        status: false,
        rcode: 500,
        message: 'Failed to retrieve event details'
      });
    }
  }

  // Delete events - PHP compatible version
  static async deleteEvents(req, res) {
    try {
      // Support both query parameters and form data
      const { user_id, token, keys } = {
        ...req.query,
        ...req.body
      };

      // Check if user_id and token are provided
      if (!user_id || !token) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'user_id and token are required'
        });
      }

      // Decode user ID
      const decodedUserId = idDecode(user_id);
      if (!decodedUserId) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'Invalid user ID'
        });
      }

      // Check if user exists
      const userRows = await query('SELECT * FROM users WHERE user_id = ? LIMIT 1', [decodedUserId]);
      if (!userRows.length) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'User not found'
        });
      }

      // Check if user is admin (role_id = 1 or 2)
      const adminRows = await query('SELECT * FROM admin_users WHERE id = ? LIMIT 1', [decodedUserId]);
      if (!adminRows.length) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'Permission denied'
        });
      }

      // Check if keys is provided
      if (!keys) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'Event ID is required'
        });
      }

      // Get admin role_id
      const admin = adminRows[0];

      // Soft delete event (matching PHP exactly)
      await query(
        'UPDATE user_event_details SET deleted = 1, deleted_at = ?, deleted_by = ? WHERE event_id = ?',
        [new Date().toISOString().slice(0, 19).replace('T', ' '), admin.role_id, keys]
      );

      return res.json({
        status: 'Success',
        info: 'Event Deleted Successfully'
      });

    } catch (error) {
      console.error('deleteEvents error:', error);
      return res.json({
        status: 'Error',
        info: 'Failed to delete event'
      });
    }
  }

  // View events details - PHP compatible version
  static async viewEventsDetails(req, res) {
    try {
      // Support both query parameters and form data
      const { user_id, token, keys } = {
        ...req.query,
        ...req.body
      };

      // Check if user_id and token are provided
      if (!user_id || !token) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'user_id and token are required'
        });
      }

      // Decode user ID
      const decodedUserId = idDecode(user_id);
      if (!decodedUserId) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'Invalid user ID'
        });
      }

      // Check if user exists
      const userRows = await query('SELECT * FROM users WHERE user_id = ? LIMIT 1', [decodedUserId]);
      if (!userRows.length) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'User not found'
        });
      }

      // Check if user is admin (role_id = 1 or 2)
      const adminRows = await query('SELECT * FROM admin_users WHERE id = ? LIMIT 1', [decodedUserId]);
      if (!adminRows.length) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'Permission denied'
        });
      }

      // Check if keys is provided
      if (!keys) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'Event ID is required'
        });
      }

      // Get event details with joins (matching PHP exactly)
      const detailsRows = await query(`
        SELECT user_event_details.*, countries.name as country_name, states.name as state_name, cities.name as city_name, users.full_name, event_mode.name as event_mode_name, event_type.name as event_type_name, industry_type.name as industry_name
        FROM user_event_details
        LEFT JOIN countries ON countries.id = user_event_details.country_id
        LEFT JOIN states ON states.id = user_event_details.state_id
        LEFT JOIN cities ON cities.id = user_event_details.city_id
        LEFT JOIN users ON users.user_id = user_event_details.user_id
        LEFT JOIN event_mode ON event_mode.id = user_event_details.event_mode_id
        LEFT JOIN event_type ON event_type.id = user_event_details.event_type_id
        LEFT JOIN industry_type ON industry_type.id = user_event_details.industry_type
        WHERE user_event_details.event_id = ?
        LIMIT 1
      `, [keys]);

      if (!detailsRows.length) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'Event not found'
        });
      }

      const details = detailsRows[0];

      // Format dates and times (matching PHP exactly)
      if (details.event_date) {
        const date = new Date(details.event_date);
        details.event_date = date.toLocaleDateString('en-GB'); // dd-mm-yyyy format
      }
      if (details.event_start_time) {
        const time = new Date(`2000-01-01T${details.event_start_time}`);
        details.event_start_time = time.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
      }
      if (details.event_end_time) {
        const time = new Date(`2000-01-01T${details.event_end_time}`);
        details.event_end_time = time.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
      }
      if (details.event_banner) {
        details.event_banner = `http://localhost:3000/uploads/events/${details.event_banner}`;
      }

      return res.json(details);

    } catch (error) {
      console.error('viewEventsDetails error:', error);
      return res.json({
        status: false,
        rcode: 500,
        message: 'Failed to retrieve event details'
      });
    }
  }
}

module.exports = AdminController;
