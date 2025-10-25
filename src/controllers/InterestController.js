'use strict';

const { logger } = require('../utils/logger');
const { successResponse, errorResponse } = require('../utils/response');
const { query } = require('../config/db');
const { idDecode, idEncode } = require('../utils/idCodec');

/**
 * InterestController - Admin Functions
 * Handles all interest management operations for admin users
 * All functions require admin authentication and token validation
 */
class InterestController {
  
  // API function for getting interests list
  static async getInterestsList(req, res) {
    try {
      const { user_id, token } = {
        ...req.query,
        ...req.body
      };
      
      if (!user_id || !token) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'Token Mismatch Exception'
        });
      }
      
      const decodedUserId = idDecode(user_id);
      if (!decodedUserId) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'Invalid user ID'
        });
      }
      
      const userRows = await query('SELECT * FROM users WHERE user_id = ? LIMIT 1', [decodedUserId]);
      if (!userRows.length) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'Not A Valid User'
        });
      }
      
      const user = userRows[0];
      
      if (user.unique_token !== token) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'Token Mismatch Exception'
        });
      }
      
    const rows = await query('SELECT id AS interest_id, name AS interest FROM interests');
      
      return res.json({
        status: true,
        rcode: 200,
        user_id: user_id,
        unique_token: token,
        interest_list: rows.map(row => ({
          interest_id: row.interest_id.toString(),
          interest: row.interest || ""
        }))
      });
      
    } catch (error) {
      console.error('getInterestsList error:', error);
      return res.json({
        status: false,
        rcode: 500,
        message: 'Failed to get interests list'
      });
    }
  }

  static async adminViewInterests(req, res) {
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

  static async adminSubmitInterest(req, res) {
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
          status: 'Error',
          info: 'user_id and token are required'
        });
      }

      // Decode user ID
      const decodedUserId = idDecode(user_id);
      if (!decodedUserId) {
        return res.json({
          status: 'Error',
          info: 'Invalid user ID'
        });
      }

      // Get user details and validate
      const userRows = await query('SELECT * FROM users WHERE user_id = ? LIMIT 1', [decodedUserId]);
      if (!userRows.length) {
        return res.json({
          status: 'Error',
          info: 'Not A Valid User'
        });
      }

      const user = userRows[0];

      // Validate token
      if (user.unique_token !== token) {
        return res.json({
          status: 'Error',
          info: 'Token Mismatch Exception'
        });
      }

      // Check if user is admin (role_id = 1 or 2)
      const adminRows = await query('SELECT * FROM admin_users WHERE id = ? LIMIT 1', [decodedUserId]);
      if (!adminRows.length) {
        return res.json({
          status: 'Error',
          info: 'Permission denied'
        });
      }

      // Validate required fields
      if (!name || !status) {
        return res.json({
          status: 'Error',
          info: 'Interest name and status are required'
        });
      }

      let info = '';

      if (!row_id || row_id === '0') {
        // Insert new interest (matching PHP exactly)
        const currentTime = new Date().toISOString().slice(0, 19).replace('T', ' ');
        await query(
          'INSERT INTO interests (name, status, created_at, created_by, deleted) VALUES (?, ?, ?, ?, 0)',
          [name, status, currentTime, decodedUserId]
        );
        info = 'Data Created Successfully';
      } else {
        // Update existing interest (matching PHP exactly)
        const currentTime = new Date().toISOString().slice(0, 19).replace('T', ' ');
        await query(
          'UPDATE interests SET name = ?, status = ?, updated_at = ?, updated_by = ? WHERE id = ?',
          [name, status, currentTime, decodedUserId, row_id]
        );
        info = 'Data Updated Successfully';
      }

      // Return response in PHP format (matching exactly)
      return res.json({
        status: 'Success',
        info: info
      });

    } catch (error) {
      console.error('submitInterest error:', error);
      return res.json({
        status: 'Error',
        info: 'Failed to submit interest'
      });
    }
  }

  static async adminListInterestAjax(req, res) {
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

      // Get DataTable parameters
      const draw = parseInt(req.body.draw) || 1;
      const start = parseInt(req.body.start) || 0;
      const length = parseInt(req.body.length) || 10;
      const searchValue = req.body.search?.value || '';

      // Get total count
      const totalCountResult = await query('SELECT COUNT(*) as count FROM interests WHERE deleted = 0');
      const totalCount = totalCountResult[0].count;

      // Build query for filtered data
      let dataQuery = `
        FROM interests
        WHERE deleted = 0
      `;
      let dataParams = [];

      // Add search filter
      if (searchValue) {
        dataQuery += ' AND name LIKE ?';
        dataParams.push(`%${searchValue}%`);
      }

      // Get filtered count
      const filteredCountResult = await query(`SELECT COUNT(*) as count ${dataQuery}`, dataParams);
      const filteredCount = filteredCountResult[0].count;

      // Get data with pagination
      dataQuery = `
        SELECT * ${dataQuery}
        ORDER BY name ASC
        LIMIT ? OFFSET ?
      `;
      dataParams.push(length, start);

      const interests = await query(dataQuery, dataParams);

      // Format data for DataTable
      const data = [];
      for (const row of interests) {
        const i = data.length + 1;
        
        // Format status
        let status = '<span class="badge bg-soft-success text-success">Active</span>';
        if (row.status == 0) {
          status = '<span class="badge bg-soft-danger text-danger">Inactive</span>';
        }

        // Format action buttons
        const action = `<a href="javascript:void(0);" id="edit_${row.id}" data-id="${row.id}" data-name="${row.name}" data-status="${row.status}" onclick="viewEditDetails(${row.id});" class="action-icon"> <i class="mdi mdi-square-edit-outline"></i></a>`;
        const deleteAction = `<a href="javascript:void(0);" class="action-icon delete_info" data-id="${row.id}"> <i class="mdi mdi-delete"></i></a>`;

        data.push([i, row.name, status, row.id.toString(), action + deleteAction]);
      }

      // Return response in PHP format (matching exactly)
      return res.json({
        draw: draw,
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

  static async adminCheckDuplicateInterest(req, res) {
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

      // Validate required fields
      if (!name) {
        return res.json({
          validate: false,
          message: 'Interest name is required'
        });
      }

      // Build condition for duplicate check
      let condition = '';
      if (id && id > 0) {
        // Editing existing interest - exclude current record
        condition = `id != ${id} AND deleted = '0' AND name = '${name}'`;
      } else {
        // Adding new interest
        condition = `deleted = '0' AND name = '${name}'`;
      }

      // Check for duplicate interest name
      const duplicateResult = await query(
        `SELECT COUNT(*) as count FROM interests WHERE ${condition}`,
        []
      );

      const isDuplicate = duplicateResult[0].count > 0;

      // Return response in PHP format (matching exactly)
      return res.json({
        validate: !isDuplicate
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

  static async adminDeleteInterest(req, res) {
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
          status: 'Error',
          info: 'user_id and token are required'
        });
      }

      // Decode user ID
      const decodedUserId = idDecode(user_id);
      if (!decodedUserId) {
        return res.json({
          status: 'Error',
          info: 'Invalid user ID'
        });
      }

      // Get user details and validate
      const userRows = await query('SELECT * FROM users WHERE user_id = ? LIMIT 1', [decodedUserId]);
      if (!userRows.length) {
        return res.json({
          status: 'Error',
          info: 'Not A Valid User'
        });
      }

      const user = userRows[0];

      // Validate token
      if (user.unique_token !== token) {
        return res.json({
          status: 'Error',
          info: 'Token Mismatch Exception'
        });
      }

      // Check if user is admin (role_id = 1 or 2)
      const adminRows = await query('SELECT * FROM admin_users WHERE id = ? LIMIT 1', [decodedUserId]);
      if (!adminRows.length) {
        return res.json({
          status: 'Error',
          info: 'Permission denied'
        });
      }

      // Check if keys (interest ID) is provided
      if (!keys) {
        return res.json({
          status: 'Error',
          message: 'Interest ID is required'
        });
      }

      // Soft delete the interest (matching PHP exactly)
      const currentTime = new Date().toISOString().slice(0, 19).replace('T', ' ');
      await query(
        'UPDATE interests SET deleted = ?, deleted_at = ?, deleted_by = ? WHERE id = ?',
        [1, currentTime, decodedUserId, keys]
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
}

module.exports = InterestController;
