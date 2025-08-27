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

  // Get country list - PHP compatible version
  static async getCountryList(req, res) {
    try {
      // Support both query parameters and form data
      const { user_id, token } = {
        ...req.query,
        ...req.body
      };
      
      console.log('getCountryList - Parameters:', { user_id, token });
      
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
      
      // Get all countries (matching PHP exactly)
      const countries = await query('SELECT * FROM countries ORDER BY name ASC');
      
      // Return response in PHP format (matching exactly)
      return res.json({
        status: true,
        rcode: 200,
        user_id: idEncode(decodedUserId),
        unique_token: token,
        countries: countries || [],
        message: 'Country list retrieved successfully'
      });
      
    } catch (error) {
      console.error('getCountryList error:', error);
      return res.json({
        status: false,
        rcode: 500,
        message: 'Failed to retrieve country list'
      });
    }
  }

  // Get country list for DataTables - PHP compatible version
  static async getCountryLists(req, res) {
    try {
      // Support both query parameters and form data
      const { user_id, token, draw, start, length, search, order } = {
        ...req.query,
        ...req.body
      };
      
      console.log('getCountryLists - Parameters:', { user_id, token, draw, start, length, search, order });
      
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
      const orderColumn = req.body.order?.[0]?.column || req.query.orderColumn || 1;
      const orderDir = req.body.order?.[0]?.dir || req.query.orderDir || 'asc';
      
      // Build search query
      let searchQuery = '';
      let searchParams = [];
      if (searchValue) {
        searchQuery = 'WHERE name LIKE ? AND deleted = 0';
        searchParams.push(`%${searchValue}%`);
      } else {
        searchQuery = 'WHERE deleted = 0';
      }
      
      // Get total count
      const totalCountResult = await query('SELECT COUNT(*) as count FROM countries WHERE deleted = 0');
      const totalCount = totalCountResult[0]?.count || 0;
      
      // Get filtered count
      let filteredCountQuery = 'SELECT COUNT(*) as count FROM countries ' + searchQuery;
      const filteredCountResult = await query(filteredCountQuery, searchParams);
      const filteredCount = filteredCountResult[0]?.count || 0;
      
      // Get paginated data
      let dataQuery = `
        SELECT * FROM countries 
        ${searchQuery}
        ORDER BY name ASC
        LIMIT ?, ?
      `;
      const dataParams = [...searchParams, startValue, lengthValue];
      const countries = await query(dataQuery, dataParams);
      
      // Format data for DataTables (matching PHP exactly)
      const data = [];
      let i = startValue;
      for (const row of countries) {
        i++;
        
        // Status badge (matching PHP exactly)
        let status = '<span class="badge bg-soft-success text-success">Active</span>';
        if (row.status == 0) {
          status = '<span class="badge bg-soft-danger text-danger">Inactive</span>';
        }
        
        // Action buttons (matching PHP exactly)
        const action = `<a href="javascript:void(0);" id="edit_${row.id}" data-id="${row.id}" data-name="${row.name}" data-status="${row.status}" onclick="viewEditDetails(${row.id});" class="action-icon"> <i class="mdi mdi-square-edit-outline"></i></a>
                        <a href="delete-country/${row.id}" onclick="return confirm('Are you sure you want to delete this record?');" class="action-icon"> <i class="mdi mdi-delete"></i></a>`;
        
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
      console.error('getCountryLists error:', error);
      return res.json({
        status: false,
        rcode: 500,
        message: 'Failed to retrieve country lists'
      });
          }
    }

    // Save country - PHP compatible version
    static async saveCountry(req, res) {
      try {
        // Support both query parameters and form data
        const { user_id, token, id, name, status } = {
          ...req.query,
          ...req.body
        };
        
        console.log('saveCountry - Parameters:', { user_id, token, id, name, status });
        
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
        
        // Get admin role_id
        const admin = adminRows[0];
        
        // Check mandatory fields
        if (!name || name.trim() === '') {
          return res.json({
            status: false,
            rcode: 500,
            message: 'Country name is required'
          });
        }
        
        // Check if status is provided
        const countryStatus = status !== undefined ? parseInt(status) : 1;
        
        if (parseInt(id) === 0) {
          // Insert new country (matching PHP exactly)
          const insertData = {
            name: name.trim(),
            status: countryStatus,
            created_at: new Date().toISOString().slice(0, 19).replace('T', ' '),
            created_by: admin.role_id
          };
          
          const insertResult = await query(
            'INSERT INTO countries (name, status, created_at, created_by, deleted) VALUES (?, ?, ?, ?, 0)',
            [insertData.name, insertData.status, insertData.created_at, insertData.created_by]
          );
          
          const newId = insertResult.insertId;
          
          return res.json({
            status: true,
            rcode: 200,
            user_id: idEncode(decodedUserId),
            unique_token: token,
            country_id: newId,
            message: 'Data created successfully'
          });
          
        } else {
          // Update existing country (matching PHP exactly)
          const updateData = {
            name: name.trim(),
            status: countryStatus,
            updated_at: new Date().toISOString().slice(0, 19).replace('T', ' '),
            updated_by: admin.role_id
          };
          
          await query(
            'UPDATE countries SET name = ?, status = ?, updated_at = ?, updated_by = ? WHERE id = ?',
            [updateData.name, updateData.status, updateData.updated_at, updateData.updated_by, id]
          );
          
          return res.json({
            status: true,
            rcode: 200,
            user_id: idEncode(decodedUserId),
            unique_token: token,
            country_id: parseInt(id),
            message: 'Data updated successfully'
          });
        }
        
      } catch (error) {
        console.error('saveCountry error:', error);
        return res.json({
          status: false,
          rcode: 500,
          message: 'Failed to save country'
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

  // View/Edit country form - PHP compatible version
  static async viewAddEditForm(req, res) {
    try {
      // Support both query parameters and form data
      const { user_id, token } = {
        ...req.query,
        ...req.body
      };

      // Get country ID from URL parameter
      const countryId = req.params.id || req.params[0];

      console.log('viewAddEditForm - Parameters:', { user_id, token, countryId });

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

      // Check if country ID is provided
      if (!countryId) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'Country ID is required'
        });
      }

      // Get country details for editing
      const countryRows = await query('SELECT * FROM countries WHERE id = ? AND deleted = 0 LIMIT 1', [countryId]);
      if (!countryRows.length) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'Country not found'
        });
      }

      const country = countryRows[0];

      // Return response in PHP format (matching exactly)
      return res.json({
        status: true,
        rcode: 200,
        user_id: idEncode(decodedUserId),
        unique_token: token,
        country: {
          id: country.id,
          name: country.name,
          status: country.status
        },
        message: 'Country details retrieved successfully'
      });

    } catch (error) {
      console.error('viewAddEditForm error:', error);
      return res.json({
        status: false,
        rcode: 500,
        message: 'Failed to retrieve country details'
      });
    }
  }

  // Delete country - PHP compatible version
  static async deleteCountry(req, res) {
    try {
      // Support both query parameters and form data
      const { user_id, token } = {
        ...req.query,
        ...req.body
      };

      // Get country ID from URL parameter
      const countryId = req.params.id || req.params[0];

      console.log('deleteCountry - Parameters:', { user_id, token, countryId });

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

      // Check if country ID is provided
      if (!countryId) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'Country ID is required'
        });
      }

      // Check whether this country is mapped to state (matching PHP exactly)
      const stateExists = await query('SELECT COUNT(*) as count FROM states WHERE country_id = ?', [countryId]);
      const hasStates = stateExists[0]?.count > 0;

      if (hasStates) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'Could not delete as state already mapped to country'
        });
      }

      // Soft delete the country (matching PHP exactly)
      const deleteData = {
        deleted: 1,
        deleted_at: new Date().toISOString().slice(0, 19).replace('T', ' '),
        deleted_by: adminRows[0].role_id
      };

      await query(
        'UPDATE countries SET deleted = ?, deleted_at = ?, deleted_by = ? WHERE id = ?',
        [deleteData.deleted, deleteData.deleted_at, deleteData.deleted_by, countryId]
      );

      // Return response in PHP format (matching exactly)
      return res.json({
        status: true,
        rcode: 200,
        user_id: idEncode(decodedUserId),
        unique_token: token,
        message: 'Country deleted successfully'
      });

    } catch (error) {
      console.error('deleteCountry error:', error);
      return res.json({
        status: false,
        rcode: 500,
        message: 'Failed to delete country'
      });
    }
  }

  // Check duplicate country - PHP compatible version
  static async checkDuplicateCountry(req, res) {
    try {
      // Support both query parameters and form data
      const { user_id, token, name, id } = {
        ...req.query,
        ...req.body
      };

      console.log('checkDuplicateCountry - Parameters:', { user_id, token, name, id });

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

      // Check if name is provided
      if (!name) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'Country name is required'
        });
      }

      // Build condition for duplicate check (matching PHP exactly)
      let condition = '';
      let params = [];

      if (parseInt(id) > 0) {
        // Editing existing country - exclude current record
        condition = 'id != ? AND deleted = 0 AND name = ?';
        params = [id, name];
      } else {
        // Adding new country
        condition = 'deleted = 0 AND name = ?';
        params = [name];
      }

      // Check for duplicate country name
      const duplicateRows = await query(
        `SELECT COUNT(*) as count FROM countries WHERE ${condition}`,
        params
      );

      const hasDuplicate = duplicateRows[0]?.count > 0;

      // Return response in PHP format (matching exactly)
      return res.json({
        validate: hasDuplicate
      });

    } catch (error) {
      console.error('checkDuplicateCountry error:', error);
      return res.json({
        status: false,
        rcode: 500,
        message: 'Failed to check duplicate country'
      });
    }
  }

  // View state list - PHP compatible version
  static async viewState(req, res) {
    try {
      // Support both query parameters and form data
      const { user_id, token } = {
        ...req.query,
        ...req.body
      };

      console.log('viewState - Parameters:', { user_id, token });

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

      // Get all active countries ordered by name (matching PHP exactly)
      const countries = await query('SELECT * FROM countries WHERE status = 1 AND deleted = 0 ORDER BY name ASC');

      // Return response in PHP format (matching exactly)
      return res.json({
        status: true,
        rcode: 200,
        user_id: idEncode(decodedUserId),
        unique_token: token,
        list_country: countries || [],
        message: 'State list view data retrieved successfully'
      });

    } catch (error) {
      console.error('viewState error:', error);
      return res.json({
        status: false,
        rcode: 500,
        message: 'Failed to retrieve state list view data'
      });
    }
  }

  // Submit state - PHP compatible version
  static async submitState(req, res) {
    try {
      // Support both query parameters and form data
      const { user_id, token, row_id, country_id, name, status } = {
        ...req.query,
        ...req.body
      };

      console.log('submitState - Parameters:', { user_id, token, row_id, country_id, name, status });

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
      if (!country_id || !name) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'country_id and name are required'
        });
      }

      // Get admin role_id
      const admin = adminRows[0];

      if (!row_id || row_id === '') {
        // Insert new state (matching PHP exactly)
        const insertData = {
          country_id: country_id,
          name: name.trim(),
          status: status !== undefined ? parseInt(status) : 1,
          created_at: new Date().toISOString().slice(0, 19).replace('T', ' '),
          created_by: admin.role_id
        };

        const insertResult = await query(
          'INSERT INTO states (country_id, name, status, created_at, created_by, deleted) VALUES (?, ?, ?, ?, ?, 0)',
          [insertData.country_id, insertData.name, insertData.status, insertData.created_at, insertData.created_by]
        );

        const info = 'Data Created Successfully';

        // Return response in PHP format (matching exactly)
        return res.json({
          status: 'Success',
          info: info
        });

      } else {
        // Update existing state (matching PHP exactly)
        const updateData = {
          country_id: country_id,
          name: name.trim(),
          status: status !== undefined ? parseInt(status) : 1,
          updated_at: new Date().toISOString().slice(0, 19).replace('T', ' '),
          updated_by: admin.role_id
        };

        await query(
          'UPDATE states SET country_id = ?, name = ?, status = ?, updated_at = ?, updated_by = ? WHERE id = ?',
          [updateData.country_id, updateData.name, updateData.status, updateData.updated_at, updateData.updated_by, row_id]
        );

        const info = 'Data Updated Successfully';

        // Return response in PHP format (matching exactly)
        return res.json({
          status: 'Success',
          info: info
        });
      }

    } catch (error) {
      console.error('submitState error:', error);
      return res.json({
        status: 'Error',
        info: 'Failed to submit state'
      });
    }
  }

  // List state ajax - PHP compatible version
  static async listStateAjax(req, res) {
    try {
      // Support both query parameters and form data
      const { user_id, token } = {
        ...req.query,
        ...req.body
      };

      console.log('listStateAjax - Parameters:', { user_id, token });

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
      const totalCountResult = await query('SELECT COUNT(*) as count FROM states WHERE deleted = 0');
      const totalCount = totalCountResult[0]?.count || 0;

      // Build search query
      let searchQuery = '';
      let searchParams = [];
      if (searchValue) {
        searchQuery = 'WHERE (states.name LIKE ? OR countries.name LIKE ?) AND states.deleted = 0';
        searchParams.push(`%${searchValue}%`, `%${searchValue}%`);
      } else {
        searchQuery = 'WHERE states.deleted = 0';
      }

      // Get filtered count
      let filteredCountQuery = `
        SELECT COUNT(*) as count 
        FROM states 
        LEFT JOIN countries ON states.country_id = countries.id 
        ${searchQuery}
      `;
      const filteredCountResult = await query(filteredCountQuery, searchParams);
      const filteredCount = filteredCountResult[0]?.count || 0;

      // Get paginated data with country names
      let dataQuery = `
        SELECT 
          states.id,
          states.name,
          states.country_id,
          states.status,
          countries.name as country_name
        FROM states 
        LEFT JOIN countries ON states.country_id = countries.id 
        ${searchQuery}
        ORDER BY states.id DESC
        LIMIT ?, ?
      `;
      const dataParams = [...searchParams, startValue, lengthValue];
      const states = await query(dataQuery, dataParams);

      // Format data for DataTables (matching PHP exactly)
      const data = [];
      let i = startValue;
      for (const row of states) {
        i++;

        // Status badge (matching PHP exactly)
        let status = '<span class="badge bg-soft-success text-success">Active</span>';
        if (row.status == 0) {
          status = '<span class="badge bg-soft-danger text-danger">Inactive</span>';
        }

        // Action buttons (matching PHP exactly)
        const action = `<a href="javascript:void(0);" id="edit_${row.id}" data-id="${row.id}" data-country="${row.country_id}" data-name="${row.name}" data-status="${row.status}" onclick="viewEditDetails(${row.id});" class="action-icon"> <i class="mdi mdi-square-edit-outline"></i></a>
                        <a href="javascript:void(0);" class="action-icon delete_info" data-id="${row.id}"> <i class="mdi mdi-delete"></i></a>`;

        data.push([i, row.country_name, row.name, status, action]);
      }

      // Return response in DataTables format (matching PHP exactly)
      return res.json({
        draw: drawValue,
        recordsTotal: totalCount,
        recordsFiltered: filteredCount,
        data: data
      });

    } catch (error) {
      console.error('listStateAjax error:', error);
      return res.json({
        status: false,
        rcode: 500,
        message: 'Failed to retrieve state list'
      });
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

      // Get all active states ordered by name (matching PHP exactly)
      const states = await query('SELECT * FROM states WHERE status = 1 AND deleted = 0 ORDER BY name ASC');

      // Return response in PHP format (matching exactly)
      return res.json({
        status: true,
        rcode: 200,
        user_id: idEncode(decodedUserId),
        unique_token: token,
        list_state: states || [],
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

  // Delete state - PHP compatible version
  static async deleteState(req, res) {
    try {
      // Support both query parameters and form data
      const { user_id, token, keys } = {
        ...req.query,
        ...req.body
      };

      console.log('deleteState - Parameters:', { user_id, token, keys });

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

      // Check if keys (state ID) is provided
      if (!keys) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'State ID is required'
        });
      }

      // Check if state is mapped to cities (matching PHP exactly)
      const cityExists = await query('SELECT COUNT(*) as count FROM cities WHERE state_id = ?', [keys]);
      const hasCities = cityExists[0]?.count > 0;

      if (hasCities) {
        return res.json({
          status: 'Error',
          info: 'Could Not Delete as state already mapped to Cities'
        });
      }

      // Soft delete the state (matching PHP exactly)
      const deleteData = {
        deleted: 1,
        deleted_at: new Date().toISOString().slice(0, 19).replace('T', ' '),
        deleted_by: adminRows[0].role_id
      };

      await query(
        'UPDATE states SET deleted = ?, deleted_at = ?, deleted_by = ? WHERE id = ?',
        [deleteData.deleted, deleteData.deleted_at, deleteData.deleted_by, keys]
      );

      // Return response in PHP format (matching exactly)
      return res.json({
        status: 'Success',
        info: 'State Deleted Successfully'
      });

    } catch (error) {
      console.error('deleteState error:', error);
      return res.json({
        status: 'Error',
        info: 'Failed to delete state'
      });
    }
  }

  // Check duplicate state - PHP compatible version
  static async checkDuplicateState(req, res) {
    try {
      // Support both query parameters and form data
      const { user_id, token, cid, name, id } = {
        ...req.query,
        ...req.body
      };

      console.log('checkDuplicateState - Parameters:', { user_id, token, cid, name, id });

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
      if (!cid || !name) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'cid and name are required'
        });
      }

      // Build condition for duplicate check (matching PHP exactly)
      let condition = '';
      let params = [];

      if (parseInt(id) > 0) {
        // Editing existing state - exclude current record and check within same country
        condition = 'id != ? AND deleted = 0 AND country_id = ? AND name = ?';
        params = [id, cid, name];
      } else {
        // Adding new state - check within same country
        condition = 'deleted = 0 AND country_id = ? AND name = ?';
        params = [cid, name];
      }

      // Check for duplicate state name within the same country
      const duplicateRows = await query(
        `SELECT COUNT(*) as count FROM states WHERE ${condition}`,
        params
      );

      const hasDuplicate = duplicateRows[0]?.count > 0;

      // Return response in PHP format (matching exactly)
      return res.json({
        validate: hasDuplicate
      });

    } catch (error) {
      console.error('checkDuplicateState error:', error);
      return res.json({
        status: false,
        rcode: 500,
        message: 'Failed to check duplicate state'
      });
    }
  }
}

module.exports = AdminController;
