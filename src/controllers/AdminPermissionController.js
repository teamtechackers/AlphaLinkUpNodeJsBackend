'use strict';

const { query } = require('../config/db');
const { idEncode, idDecode } = require('../utils/idCodec');
const { logger } = require('../utils/logger');
const bcrypt = require('bcryptjs');

class AdminPermissionController {
  
  // Get all permissions
  static async getAllPermissions(req, res) {
    try {
      const permissions = await query(`
        SELECT 
          permission_id,
          module_name,
          permission_key,
          permission_name,
          description
        FROM admin_permissions
        ORDER BY module_name, permission_id
      `);

      // Group by module
      const grouped = permissions.reduce((acc, perm) => {
        if (!acc[perm.module_name]) {
          acc[perm.module_name] = [];
        }
        acc[perm.module_name].push({
          permission_id: String(perm.permission_id),
          permission_key: perm.permission_key,
          permission_name: perm.permission_name,
          description: perm.description
        });
        return acc;
      }, {});

      return res.json({
        status: true,
        rcode: 200,
        permissions: grouped
      });

    } catch (error) {
      logger.error('Get permissions error:', error);
      return res.json({
        status: false,
        rcode: 500,
        message: 'Failed to fetch permissions'
      });
    }
  }

  // Create SubAdmin
  static async createSubAdmin(req, res) {
    try {
      const { user_id, token, username, password, email, full_name, permissions } = req.body;

      if (!username || !password) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'Username and password are required'
        });
      }

      // Check if username already exists
      const existing = await query(
        'SELECT id FROM admin_users WHERE username = ?',
        [username]
      );

      if (existing.length > 0) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'Username already exists'
        });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 12);

      // Create SubAdmin
      const result = await query(
        `INSERT INTO admin_users (username, password, email, full_name, is_super_admin, created_at)
         VALUES (?, ?, ?, ?, 0, NOW())`,
        [username, hashedPassword, email || '', full_name || '']
      );

      const newAdminId = result.insertId;
      const decodedUserId = idDecode(user_id);

      // Assign permissions
      if (permissions && Array.isArray(permissions) && permissions.length > 0) {
        const permissionValues = permissions.map(permId => 
          [newAdminId, permId, decodedUserId]
        );

        const placeholders = permissionValues.map(() => '(?, ?, ?)').join(',');
        const flatValues = permissionValues.flat();

        await query(
          `INSERT INTO admin_user_permissions (admin_user_id, permission_id, granted_by)
           VALUES ${placeholders}`,
          flatValues
        );
      }

      logger.info(`SubAdmin created: ${username} by admin ${decodedUserId}`);

      return res.json({
        status: true,
        rcode: 200,
        message: 'SubAdmin created successfully',
        admin_id: String(newAdminId)
      });

    } catch (error) {
      logger.error('Create SubAdmin error:', error);
      return res.json({
        status: false,
        rcode: 500,
        message: 'Failed to create SubAdmin'
      });
    }
  }

  // Create SuperAdmin (VERY RESTRICTED - Use with caution)
  static async createSuperAdmin(req, res) {
    try {
      const { master_key, username, password, email, full_name } = req.body;

      // Master key validation (change this to your secure key)
      const MASTER_KEY = process.env.MASTER_ADMIN_KEY || 'CHANGE_THIS_SUPER_SECRET_KEY_2024';
      
      if (master_key !== MASTER_KEY) {
        logger.warn('Unauthorized SuperAdmin creation attempt');
        return res.json({
          status: false,
          rcode: 403,
          message: 'Invalid master key. Unauthorized.'
        });
      }

      if (!username || !password) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'Username and password are required'
        });
      }

      // Check if username already exists
      const existing = await query(
        'SELECT id FROM admin_users WHERE username = ?',
        [username]
      );

      if (existing.length > 0) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'Username already exists'
        });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 12);

      // Create SuperAdmin
      const result = await query(
        `INSERT INTO admin_users (username, password, email, full_name, is_super_admin, created_at)
         VALUES (?, ?, ?, ?, 1, NOW())`,
        [username, hashedPassword, email || '', full_name || '']
      );

      const newSuperAdminId = result.insertId;

      logger.info(`SuperAdmin created: ${username}`);

      return res.json({
        status: true,
        rcode: 200,
        message: 'SuperAdmin created successfully',
        admin_id: String(newSuperAdminId)
      });

    } catch (error) {
      logger.error('Create SuperAdmin error:', error);
      return res.json({
        status: false,
        rcode: 500,
        message: 'Failed to create SuperAdmin'
      });
    }
  }

  // Get SubAdmin list
  static async getSubAdminList(req, res) {
    try {
      const admins = await query(`
        SELECT 
          id,
          username,
          email,
          full_name,
          is_super_admin,
          created_at
        FROM admin_users
        ORDER BY created_at DESC
      `);

      const formattedAdmins = await Promise.all(admins.map(async (admin) => {
        // Get permissions for this admin
        const perms = await query(`
          SELECT ap.permission_id, ap.permission_key, ap.permission_name, ap.module_name
          FROM admin_user_permissions aup
          JOIN admin_permissions ap ON aup.permission_id = ap.permission_id
          WHERE aup.admin_user_id = ?
        `, [admin.id]);

        return {
          admin_id: String(admin.id),
          username: admin.username,
          email: admin.email || '',
          full_name: admin.full_name || '',
          is_super_admin: admin.is_super_admin === 1,
          created_at: admin.created_at,
          permissions: perms.map(p => ({
            permission_id: String(p.permission_id),
            permission_key: p.permission_key,
            permission_name: p.permission_name,
            module_name: p.module_name
          }))
        };
      }));

      return res.json({
        status: true,
        rcode: 200,
        admins: formattedAdmins
      });

    } catch (error) {
      logger.error('Get SubAdmin list error:', error);
      return res.json({
        status: false,
        rcode: 500,
        message: 'Failed to fetch SubAdmin list'
      });
    }
  }

  // Update SubAdmin permissions
  static async updateSubAdminPermissions(req, res) {
    try {
      const { user_id, token, admin_id, permissions } = req.body;

      if (!admin_id || !permissions || !Array.isArray(permissions)) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'Admin ID and permissions array are required'
        });
      }

      const decodedUserId = idDecode(user_id);

      // Delete existing permissions
      await query(
        'DELETE FROM admin_user_permissions WHERE admin_user_id = ?',
        [admin_id]
      );

      // Insert new permissions
      if (permissions.length > 0) {
        const permissionValues = permissions.map(permId => 
          [admin_id, permId, decodedUserId]
        );

        const placeholders = permissionValues.map(() => '(?, ?, ?)').join(',');
        const flatValues = permissionValues.flat();

        await query(
          `INSERT INTO admin_user_permissions (admin_user_id, permission_id, granted_by)
           VALUES ${placeholders}`,
          flatValues
        );
      }

      logger.info(`SubAdmin permissions updated for admin ${admin_id} by ${decodedUserId}`);

      return res.json({
        status: true,
        rcode: 200,
        message: 'Permissions updated successfully'
      });

    } catch (error) {
      logger.error('Update permissions error:', error);
      return res.json({
        status: false,
        rcode: 500,
        message: 'Failed to update permissions'
      });
    }
  }

  // Delete SubAdmin
  static async deleteSubAdmin(req, res) {
    try {
      const { admin_id } = req.body;

      if (!admin_id) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'Admin ID is required'
        });
      }

      // Check if trying to delete SuperAdmin
      const adminCheck = await query(
        'SELECT is_super_admin FROM admin_users WHERE id = ?',
        [admin_id]
      );

      if (adminCheck.length > 0 && adminCheck[0].is_super_admin === 1) {
        return res.json({
          status: false,
          rcode: 403,
          message: 'Cannot delete SuperAdmin'
        });
      }

      // Delete admin (permissions will be deleted automatically due to CASCADE)
      await query('DELETE FROM admin_users WHERE id = ?', [admin_id]);

      logger.info(`SubAdmin deleted: ${admin_id}`);

      return res.json({
        status: true,
        rcode: 200,
        message: 'SubAdmin deleted successfully'
      });

    } catch (error) {
      logger.error('Delete SubAdmin error:', error);
      return res.json({
        status: false,
        rcode: 500,
        message: 'Failed to delete SubAdmin'
      });
    }
  }
}

module.exports = AdminPermissionController;
