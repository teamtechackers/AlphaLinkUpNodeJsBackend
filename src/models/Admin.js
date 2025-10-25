'use strict';

const { query } = require('../config/db');
const { logger } = require('../utils/logger');

class Admin {
  constructor(data = {}) {
    this.id = data.id;
    this.username = data.username;
    this.email = data.email;
    this.password = data.password;
    this.role = data.role; // super_admin, admin, moderator
    this.permissions = data.permissions;
    this.status = data.status;
    this.last_login = data.last_login;
    this.created_at = data.created_at;
    this.updated_at = data.updated_at;
  }

  // Create new admin
  static async create(adminData) {
    try {
      const { username, email, password, role = 'admin', permissions = null } = adminData;
      
      // Check if admin already exists
      const [existing] = await query(
        'SELECT id FROM admins WHERE username = ? OR email = ?',
        [username, email]
      );

      if (existing) {
        throw new Error('Admin with this username or email already exists');
      }

      const result = await query(
        'INSERT INTO admins (username, email, password, role, permissions, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, 1, NOW(), NOW())',
        [username, email, password, role, permissions ? JSON.stringify(permissions) : null]
      );

      const adminId = result.insertId;
      return await Admin.findById(adminId);
    } catch (error) {
      logger.error('Error creating admin:', error);
      throw error;
    }
  }

  // Get admin by ID
  static async findById(adminId) {
    try {
      const [admin] = await query(
        'SELECT * FROM admins WHERE id = ?',
        [adminId]
      );

      if (admin && admin.permissions) {
        try {
          admin.permissions = JSON.parse(admin.permissions);
        } catch (e) {
          admin.permissions = null;
        }
      }

      return admin;
    } catch (error) {
      logger.error('Error getting admin by ID:', error);
      throw error;
    }
  }

  // Get admin by username
  static async findByUsername(username) {
    try {
      const [admin] = await query(
        'SELECT * FROM admins WHERE username = ? AND status = 1',
        [username]
      );

      if (admin && admin.permissions) {
        try {
          admin.permissions = JSON.parse(admin.permissions);
        } catch (e) {
          admin.permissions = null;
        }
      }

      return admin;
    } catch (error) {
      logger.error('Error getting admin by username:', error);
      throw error;
    }
  }

  // Get admin by email
  static async findByEmail(email) {
    try {
      const [admin] = await query(
        'SELECT * FROM admins WHERE email = ? AND status = 1',
        [email]
      );

      if (admin && admin.permissions) {
        try {
          admin.permissions = JSON.parse(admin.permissions);
        } catch (e) {
          admin.permissions = null;
        }
      }

      return admin;
    } catch (error) {
      logger.error('Error getting admin by email:', error);
      throw error;
    }
  }

  // Update admin
  static async update(adminId, updateData) {
    try {
      const { username, email, role, permissions, status } = updateData;
      const updates = [];
      const params = [];

      if (username !== undefined) {
        updates.push('username = ?');
        params.push(username);
      }

      if (email !== undefined) {
        updates.push('email = ?');
        params.push(email);
      }

      if (role !== undefined) {
        updates.push('role = ?');
        params.push(role);
      }

      if (permissions !== undefined) {
        updates.push('permissions = ?');
        params.push(JSON.stringify(permissions));
      }

      if (status !== undefined) {
        updates.push('status = ?');
        params.push(status);
      }

      if (updates.length === 0) {
        throw new Error('No fields to update');
      }

      updates.push('updated_at = NOW()');
      params.push(adminId);

      await query(
        `UPDATE admins SET ${updates.join(', ')} WHERE id = ?`,
        params
      );

      return await Admin.findById(adminId);
    } catch (error) {
      logger.error('Error updating admin:', error);
      throw error;
    }
  }

  // Update admin password
  static async updatePassword(adminId, newPassword) {
    try {
      await query(
        'UPDATE admins SET password = ?, updated_at = NOW() WHERE id = ?',
        [newPassword, adminId]
      );
      return true;
    } catch (error) {
      logger.error('Error updating admin password:', error);
      throw error;
    }
  }

  // Update last login
  static async updateLastLogin(adminId) {
    try {
      await query(
        'UPDATE admins SET last_login = NOW() WHERE id = ?',
        [adminId]
      );
      return true;
    } catch (error) {
      logger.error('Error updating admin last login:', error);
      throw error;
    }
  }

  // Delete admin
  static async delete(adminId) {
    try {
      await query('DELETE FROM admins WHERE id = ?', [adminId]);
      return true;
    } catch (error) {
      logger.error('Error deleting admin:', error);
      throw error;
    }
  }

  // Get all admins
  static async getAll(options = {}) {
    try {
      const { page = 1, limit = 20, role = null, status = null } = options;
      const offset = (page - 1) * limit;

      let whereClause = 'WHERE 1=1';
      let params = [];

      if (role) {
        whereClause += ' AND role = ?';
        params.push(role);
      }

      if (status !== null) {
        whereClause += ' AND status = ?';
        params.push(status);
      }

      const admins = await query(
        `SELECT * FROM admins ${whereClause} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
        [...params, limit, offset]
      );

      // Parse permissions for each admin
      admins.forEach(admin => {
        if (admin.permissions) {
          try {
            admin.permissions = JSON.parse(admin.permissions);
          } catch (e) {
            admin.permissions = null;
          }
        }
      });

      return admins;
    } catch (error) {
      logger.error('Error getting all admins:', error);
      throw error;
    }
  }

  // Get admin statistics
  static async getStats() {
    try {
      const [total] = await query('SELECT COUNT(*) as count FROM admins');
      const [active] = await query('SELECT COUNT(*) as count FROM admins WHERE status = 1');
      const [inactive] = await query('SELECT COUNT(*) as count FROM admins WHERE status = 0');

      const [roleStats] = await query(
        'SELECT role, COUNT(*) as count FROM admins GROUP BY role'
      );

      return {
        total: total.count,
        active: active.count,
        inactive: inactive.count,
        byRole: roleStats
      };
    } catch (error) {
      logger.error('Error getting admin statistics:', error);
      throw error;
    }
  }

  // Check admin permissions
  static hasPermission(admin, permission) {
    if (!admin || !admin.permissions) return false;
    
    if (admin.role === 'super_admin') return true;
    
    return admin.permissions.includes(permission);
  }

  // Get default permissions for roles
  static getDefaultPermissions(role) {
    const permissions = {
      super_admin: [
        'user.manage', 'user.view', 'user.delete',
        'admin.manage', 'admin.view', 'admin.delete',
        'content.moderate', 'content.delete',
        'system.settings', 'system.logs',
        'analytics.view', 'reports.view'
      ],
      admin: [
        'user.manage', 'user.view',
        'content.moderate', 'content.delete',
        'analytics.view', 'reports.view'
      ],
      moderator: [
        'user.view',
        'content.moderate',
        'reports.view'
      ]
    };

    return permissions[role] || [];
  }

  // Create admin with default permissions
  static async createWithDefaults(adminData) {
    try {
      const { role = 'admin' } = adminData;
      const defaultPermissions = Admin.getDefaultPermissions(role);
      
      const admin = await Admin.create({
        ...adminData,
        permissions: defaultPermissions
      });

      return admin;
    } catch (error) {
      logger.error('Error creating admin with defaults:', error);
      throw error;
    }
  }

  // Search admins
  static async search(searchTerm, options = {}) {
    try {
      const { page = 1, limit = 20, role = null } = options;
      const offset = (page - 1) * limit;

      let whereClause = 'WHERE (username LIKE ? OR email LIKE ?)';
      let params = [`%${searchTerm}%`, `%${searchTerm}%`];

      if (role) {
        whereClause += ' AND role = ?';
        params.push(role);
      }

      const admins = await query(
        `SELECT * FROM admins ${whereClause} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
        [...params, limit, offset]
      );

      // Parse permissions for each admin
      admins.forEach(admin => {
        if (admin.permissions) {
          try {
            admin.permissions = JSON.parse(admin.permissions);
          } catch (e) {
            admin.permissions = null;
          }
        }
      });

      return admins;
    } catch (error) {
      logger.error('Error searching admins:', error);
      throw error;
    }
  }

  // Get admin activity log
  static async getActivityLog(adminId, options = {}) {
    try {
      const { page = 1, limit = 20, action = null, startDate = null, endDate = null } = options;
      const offset = (page - 1) * limit;

      let whereClause = 'WHERE admin_id = ?';
      let params = [adminId];

      if (action) {
        whereClause += ' AND action = ?';
        params.push(action);
      }

      if (startDate) {
        whereClause += ' AND created_at >= ?';
        params.push(startDate);
      }

      if (endDate) {
        whereClause += ' AND created_at <= ?';
        params.push(endDate);
      }

      const activities = await query(
        `SELECT * FROM admin_activity_log ${whereClause} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
        [...params, limit, offset]
      );

      return activities;
    } catch (error) {
      logger.error('Error getting admin activity log:', error);
      throw error;
    }
  }

  // Log admin activity
  static async logActivity(adminId, action, details = null, targetId = null) {
    try {
      await query(
        'INSERT INTO admin_activity_log (admin_id, action, details, target_id, created_at) VALUES (?, ?, ?, ?, NOW())',
        [adminId, action, details ? JSON.stringify(details) : null, targetId]
      );
      return true;
    } catch (error) {
      logger.error('Error logging admin activity:', error);
      throw error;
    }
  }

  // Get admin dashboard data
  static async getDashboardData() {
    try {
      const [totalUsers] = await query('SELECT COUNT(*) as count FROM users WHERE status = 1');
      const [totalJobs] = await query('SELECT COUNT(*) as count FROM jobs WHERE status = 1');
      const [totalEvents] = await query('SELECT COUNT(*) as count FROM events WHERE status = 1');
      const [totalServices] = await query('SELECT COUNT(*) as count FROM service_providers WHERE status = 1');

      const [recentUsers] = await query(
        'SELECT COUNT(*) as count FROM users WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)'
      );

      const [recentJobs] = await query(
        'SELECT COUNT(*) as count FROM jobs WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)'
      );

      const [pendingApprovals] = await query(
        'SELECT COUNT(*) as count FROM service_providers WHERE approval_status = "pending"'
      );

      return {
        overview: {
          totalUsers: totalUsers.count,
          totalJobs: totalJobs.count,
          totalEvents: totalEvents.count,
          totalServices: totalServices.count
        },
        recent: {
          newUsers: recentUsers.count,
          newJobs: recentJobs.count
        },
        pending: {
          approvals: pendingApprovals.count
        }
      };
    } catch (error) {
      logger.error('Error getting admin dashboard data:', error);
      throw error;
    }
  }

  // Get system health status
  static async getSystemHealth() {
    try {
      const health = {
        database: 'healthy',
        services: 'healthy',
        lastCheck: new Date().toISOString()
      };

      // Check database connection
      try {
        await query('SELECT 1');
      } catch (error) {
        health.database = 'unhealthy';
        health.databaseError = error.message;
      }

      // Check file system
      try {
        const fs = require('fs');
        const uploadPath = process.env.UPLOAD_PATH || 'uploads';
        if (!fs.existsSync(uploadPath)) {
          fs.mkdirSync(uploadPath, { recursive: true });
        }
      } catch (error) {
        health.services = 'unhealthy';
        health.fileSystemError = error.message;
      }

      return health;
    } catch (error) {
      logger.error('Error getting system health:', error);
      throw error;
    }
  }

  // Get admin roles
  static getRoles() {
    return [
      { value: 'super_admin', label: 'Super Administrator', description: 'Full system access' },
      { value: 'admin', label: 'Administrator', description: 'System administration access' },
      { value: 'moderator', label: 'Moderator', description: 'Content moderation access' }
    ];
  }

  // Validate admin data
  static validateAdminData(adminData) {
    const errors = [];

    if (!adminData.username || adminData.username.length < 3) {
      errors.push('Username must be at least 3 characters long');
    }

    if (!adminData.email || !adminData.email.includes('@')) {
      errors.push('Valid email is required');
    }

    if (!adminData.password || adminData.password.length < 6) {
      errors.push('Password must be at least 6 characters long');
    }

    if (adminData.role && !['super_admin', 'admin', 'moderator'].includes(adminData.role)) {
      errors.push('Invalid role specified');
    }

    return errors;
  }
}

module.exports = Admin;
