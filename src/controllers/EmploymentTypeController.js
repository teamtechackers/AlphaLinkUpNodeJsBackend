'use strict';

const { logger } = require('../utils/logger');
const { successResponse, errorResponse } = require('../utils/response');
const { query } = require('../config/db');
const { idDecode, idEncode } = require('../utils/idCodec');


class EmploymentTypeController {

  // API function for getting employment type list
  static async getEmploymentTypeList(req, res) {
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
      
    const rows = await query('SELECT id AS employment_type_id, name AS employment_type FROM employment_type');
      
      return res.json({
        status: true,
        rcode: 200,
        user_id: user_id,
        unique_token: token,
        employment_type_list: rows.map(row => ({
          employment_type_id: row.employment_type_id.toString(),
          employment_type: row.employment_type || ""
        }))
      });
      
    } catch (error) {
      console.error('getEmploymentTypeList error:', error);
      return res.json({
        status: false,
        rcode: 500,
        message: 'Failed to get employment type list'
      });
    }
  }

  static async adminViewEmploymentType(req, res) {
    try {
     
      const { user_id, token } = {
        ...req.query,
        ...req.body
      };

      console.log('viewEmploymentType - Parameters:', { user_id, token });

      
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

  static async adminSubmitEmploymentType(req, res) {
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
          info: 'Employment type name and status are required'
        });
      }

      let info = '';

      if (!row_id || row_id === '0') {
        // Insert new employment type (matching PHP exactly)
        const currentTime = new Date().toISOString().slice(0, 19).replace('T', ' ');
        await query(
          'INSERT INTO employment_type (name, status, created_at, created_by, deleted) VALUES (?, ?, ?, ?, 0)',
          [name, status, currentTime, decodedUserId]
        );
        info = 'Data Created Successfully';
      } else {
        // Update existing employment type (matching PHP exactly)
        const currentTime = new Date().toISOString().slice(0, 19).replace('T', ' ');
        await query(
          'UPDATE employment_type SET name = ?, status = ?, updated_at = ?, updated_by = ? WHERE id = ?',
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
      console.error('submitEmploymentType error:', error);
      return res.json({
        status: 'Error',
        info: 'Failed to submit employment type'
      });
    }
  }

  static async adminListEmploymentTypeAjax(req, res) {
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

      // Get DataTable parameters
      const draw = parseInt(req.body.draw) || 1;
      const start = parseInt(req.body.start) || 0;
      const length = parseInt(req.body.length) || 10;
      const searchValue = req.body.search?.value || '';

      // Get total count
      const totalCountResult = await query('SELECT COUNT(*) as count FROM employment_type WHERE deleted = 0');
      const totalCount = totalCountResult[0].count;

      // Build query for filtered data
      let dataQuery = `
        FROM employment_type
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

      const employmentTypes = await query(dataQuery, dataParams);

      // Format data for DataTable
      const data = [];
      for (const row of employmentTypes) {
        const i = data.length + 1;
        console.log('Row ID type:', typeof row.id, 'Value:', row.id);
        
        // Format status
        let status = '<span class="badge bg-soft-success text-success">Active</span>';
        if (row.status == 0) {
          status = '<span class="badge bg-soft-danger text-danger">Inactive</span>';
        }

        // Format action buttons
        const action = `<a href="javascript:void(0);" id="edit_${row.id}" data-id="${row.id}" data-name="${row.name}" data-status="${row.status}" onclick="viewEditDetails(${row.id});" class="action-icon"> <i class="mdi mdi-square-edit-outline"></i></a>`;
        const deleteAction = `<a href="javascript:void(0);" class="action-icon delete_info" data-id="${row.id}"> <i class="mdi mdi-delete"></i></a>`;

        data.push([i, String(row.id), row.name, status, action + deleteAction]);
      }

      // Return response in PHP format (matching exactly)
      return res.json({
        draw: draw,
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

  static async adminCheckDuplicateEmploymentType(req, res) {
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

      // Validate required fields
      if (!name) {
        return res.json({
          validate: false,
          message: 'Employment type name is required'
        });
      }

      // Build condition for duplicate check
      let condition = '';
      if (id && id > 0) {
        // Editing existing employment type - exclude current record
        condition = `id != ${id} AND deleted = '0' AND name = '${name}'`;
      } else {
        // Adding new employment type
        condition = `deleted = '0' AND name = '${name}'`;
      }

      // Check for duplicate employment type name
      const duplicateResult = await query(
        `SELECT COUNT(*) as count FROM employment_type WHERE ${condition}`,
        []
      );

      const isDuplicate = duplicateResult[0].count > 0;

      // Return response in PHP format (matching exactly)
      return res.json({
        validate: !isDuplicate
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

  static async adminDeleteEmploymentType(req, res) {
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

      // Check if keys (employment type ID) is provided
      if (!keys) {
        return res.json({
          status: 'Error',
          message: 'Employment type ID is required'
        });
      }

      // Soft delete the employment type (matching PHP exactly)
      const currentTime = new Date().toISOString().slice(0, 19).replace('T', ' ');
      await query(
        'UPDATE employment_type SET deleted = ?, deleted_at = ?, deleted_by = ? WHERE id = ?',
        [1, currentTime, decodedUserId, keys]
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
}

module.exports = EmploymentTypeController;
