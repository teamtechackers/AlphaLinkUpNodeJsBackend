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
}

module.exports = AdminController;
