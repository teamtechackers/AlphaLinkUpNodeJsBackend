'use strict';

const { query } = require('../config/db');
const { idEncode, idDecode } = require('../utils/idCodec');

const StateController = {

  // ===== API CONTROLLER FUNCTIONS =====

  // Get state list for mobile app
  async getStateList(req, res) {
    try {
      const { user_id, token, country_id } = {
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
      
      if (!country_id) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'country_id is required'
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
      
      const rows = await query('SELECT id AS state_id, name AS state_name FROM states WHERE country_id = ?', [country_id]);
      
      return res.json({
        status: true,
        rcode: 200,
        user_id: user_id,
        unique_token: token,
        state_list: rows.map(row => ({
          state_id: row.state_id.toString(),
          state_name: row.state_name || ""
        }))
      });
      
    } catch (error) {
      console.error('getStateList error:', error);
      return res.json({
        status: false,
        rcode: 500,
        message: 'Failed to get state list'
      });
    }
  },

  // ===== ADMIN CONTROLLER FUNCTIONS =====

  // View state list - PHP compatible version
  async viewAdminState(req, res) {
    try {
      // Support both query parameters and form data
      const { user_id, token } = {
        ...req.query,
        ...req.body
      };

      console.log('viewAdminState - Parameters:', { user_id, token });

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

      // Get all states with country names (matching PHP exactly)
      const states = await query(`
        SELECT s.id, s.name, s.status, s.country_id, c.name as country_name 
        FROM states s 
        LEFT JOIN countries c ON s.country_id = c.id 
        WHERE s.deleted = 0 
        ORDER BY c.name ASC, s.name ASC
      `);

      // Return response in PHP format (matching exactly)
      return res.json({
        status: true,
        rcode: 200,
        user_id: idEncode(decodedUserId),
        unique_token: token,
        states: states || [],
        message: 'State list view data retrieved successfully'
      });

    } catch (error) {
      console.error('viewAdminState error:', error);
      return res.json({
        status: false,
        rcode: 500,
        message: 'Failed to retrieve state list view data'
      });
    }
  },

  // Submit state - PHP compatible version
  async submitAdminState(req, res) {
    try {
      // Support both query parameters and form data
      const { user_id, token, row_id, country_id, name, status } = {
        ...req.query,
        ...req.body
      };

      console.log('submitAdminState - Parameters:', { user_id, token, row_id, country_id, name, status });

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

      // Get admin role_id
      const admin = adminRows[0];

      // Check mandatory fields
      if (!country_id || !name || name.trim() === '') {
        return res.json({
          status: 'Error',
          info: 'Country and state name are required'
        });
      }

      // Check if status is provided
      const stateStatus = status !== undefined ? parseInt(status) : 1;

      if (parseInt(row_id) === 0) {
        // Insert new state (matching PHP exactly)
        const insertData = {
          country_id: parseInt(country_id),
          name: name.trim(),
          status: stateStatus,
          created_at: new Date().toISOString().slice(0, 19).replace('T', ' '),
          created_by: admin.role_id
        };

        const insertResult = await query(
          'INSERT INTO states (country_id, name, status, created_at, created_by, deleted) VALUES (?, ?, ?, ?, ?, 0)',
          [insertData.country_id, insertData.name, insertData.status, insertData.created_at, insertData.created_by]
        );

        const newId = insertResult.insertId;

        return res.json({
          status: 'Success',
          info: 'Data created successfully',
          id: newId
        });

      } else {
        // Update existing state (matching PHP exactly)
        const updateData = {
          country_id: parseInt(country_id),
          name: name.trim(),
          status: stateStatus,
          updated_at: new Date().toISOString().slice(0, 19).replace('T', ' '),
          updated_by: admin.role_id
        };

        await query(
          'UPDATE states SET country_id = ?, name = ?, status = ?, updated_at = ?, updated_by = ? WHERE id = ?',
          [updateData.country_id, updateData.name, updateData.status, updateData.updated_at, updateData.updated_by, row_id]
        );

        return res.json({
          status: 'Success',
          info: 'Data updated successfully',
          id: parseInt(row_id)
        });
      }

    } catch (error) {
      console.error('submitAdminState error:', error);
      return res.json({
        status: 'Error',
        info: 'Failed to submit state'
      });
    }
  },

  // List state ajax - DataTables format (PHP compatible)
  async listAdminStateAjax(req, res) {
    try {
      // Support both query parameters and form data
      const { user_id, token, draw, start, length, search, order } = {
        ...req.query,
        ...req.body
      };

      console.log('listAdminStateAjax - Parameters:', { user_id, token, draw, start, length, search, order });

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
      const userRows = await query('SELECT user_id FROM users WHERE user_id = ? AND unique_token = ? AND deleted = 0', [decodedUserId, token]);
      if (!userRows.length) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'Not A Valid User'
        });
      }

      // Parse DataTables parameters
      const drawParam = parseInt(draw) || 1;
      const startParam = parseInt(start) || 0;
      const lengthParam = parseInt(length) || 10;
      const searchValue = search?.value || '';
      const orderColumn = order?.[0]?.column || 1;
      const orderDir = order?.[0]?.dir || 'asc';

      // Get total count
      const totalCountResult = await query('SELECT COUNT(*) as count FROM states WHERE deleted = 0');
      const recordsTotal = totalCountResult[0].count;

      // Get filtered count
      let filteredCount = recordsTotal;
      if (searchValue) {
        const filteredCountResult = await query(`
          SELECT COUNT(*) as count FROM states s 
          LEFT JOIN countries c ON s.country_id = c.id 
          WHERE s.deleted = 0 AND (s.name LIKE ? OR c.name LIKE ?)
        `, [`%${searchValue}%`, `%${searchValue}%`]);
        filteredCount = filteredCountResult[0].count;
      }

      // Build ORDER BY clause
      const orderColumns = ['s.id', 'c.name', 's.name', 's.status'];
      const orderByColumn = orderColumns[orderColumn] || 's.name';
      const orderByDir = orderDir.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';

      // Get states with pagination and search
      let statesQuery = `
        SELECT s.id, s.name, s.status, s.country_id, c.name as country_name 
        FROM states s 
        LEFT JOIN countries c ON s.country_id = c.id 
        WHERE s.deleted = 0
      `;
      
      const queryParams = [];
      if (searchValue) {
        statesQuery += ` AND (s.name LIKE ? OR c.name LIKE ?)`;
        queryParams.push(`%${searchValue}%`, `%${searchValue}%`);
      }
      
      statesQuery += ` ORDER BY ${orderByColumn} ${orderByDir} LIMIT ? OFFSET ?`;
      queryParams.push(lengthParam, startParam);

      const states = await query(statesQuery, queryParams);

      // Format data for DataTables
      const data = states.map((state, index) => {
        const rowNumber = startParam + index + 1;
        const statusBadge = state.status == 1 
          ? '<span class="badge bg-soft-success text-success">Active</span>'
          : '<span class="badge bg-soft-danger text-danger">Inactive</span>';
        
        let action = `<a href="javascript:void(0);" id="edit_${state.id}" data-id="${state.id}" data-country="${state.country_id}" data-name="${state.name}" data-status="${state.status}" onclick="viewEditDetails(${state.id});" class="action-icon"> <i class="mdi mdi-square-edit-outline"></i></a>`;
        action += `<a href="javascript:void(0);" class="action-icon delete_info" data-id="${state.id}"> <i class="mdi mdi-delete"></i></a>`;

        return [
          rowNumber,
          state.country_name || '',
          state.name,
          state.id.toString(),  // State ID add karna
          statusBadge,
          action
        ];
      });

      // Return DataTables format
      return res.json({
        draw: drawParam,
        recordsTotal: recordsTotal,
        recordsFiltered: filteredCount,
        data: data
      });

    } catch (error) {
      console.error('listAdminStateAjax error:', error);
      return res.json({
        status: false,
        rcode: 500,
        message: 'Failed to retrieve state list'
      });
    }
  },

  // Get state list for admin - PHP compatible version
  async getAdminStateList(req, res) {
    try {
      // Support both query parameters and form data
      const { user_id, token, keys } = {
        ...req.query,
        ...req.body
      };

      console.log('getAdminStateList - Parameters:', { user_id, token, keys });

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

      // Get states based on keys (country_id) if provided
      let statesQuery = `
        SELECT 
          s.id,
          s.country_id,
          s.name,
          s.status,
          s.created_at,
          s.created_by,
          s.updated_at,
          s.updated_by,
          s.deleted,
          s.deleted_by,
          s.deleted_at,
          c.name as country_name
        FROM states s
        LEFT JOIN countries c ON c.id = s.country_id
        WHERE s.deleted = 0
      `;
      
      let queryParams = [];
      
      if (keys && keys.trim() !== '') {
        statesQuery += ' AND s.country_id = ?';
        queryParams.push(keys);
      }
      
      statesQuery += ' ORDER BY c.name ASC, s.name ASC';
      
      const states = await query(statesQuery, queryParams);

      // Return response in PHP format (matching exactly)
      return res.json({
        status: true,
        rcode: 200,
        user_id: idEncode(decodedUserId),
        unique_token: token,
        states: states || [],
        message: 'State list retrieved successfully'
      });

    } catch (error) {
      console.error('getAdminStateList error:', error);
      return res.json({
        status: false,
        rcode: 500,
        message: 'Failed to get state list'
      });
    }
  },

  // Delete state - PHP compatible version
  async deleteAdminState(req, res) {
    try {
      // Support both query parameters and form data
      const { user_id, token, keys } = {
        ...req.query,
        ...req.body
      };

      console.log('deleteAdminState - Parameters:', { user_id, token, keys });

      // Check if user_id and token are provided
      if (!user_id || !token) {
        return res.json({
          status: 'Error',
          info: 'user_id and token are required'
        });
      }

      // Check if keys (state ID) is provided
      if (!keys || keys.trim() === '') {
        return res.json({
          status: 'Error',
          info: 'State ID is required'
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

      // Get admin role_id
      const admin = adminRows[0];

      // Check if state exists and is not already deleted
      const stateRows = await query(`
        SELECT id, name FROM states 
        WHERE id = ? AND deleted = 0
      `, [keys]);
      
      if (stateRows.length === 0) {
        return res.json({
          status: 'Error',
          info: 'State not found or already deleted'
        });
      }

      // Check if state is being used in other tables
      const cityCount = await query('SELECT COUNT(*) as count FROM cities WHERE state_id = ? AND deleted = 0', [keys]);
      const userCount = await query('SELECT COUNT(*) as count FROM users WHERE state_id = ?', [keys]);
      
      if (cityCount[0].count > 0) {
        return res.json({
          status: 'Error',
          info: 'Cannot delete state. It is being used in cities.'
        });
      }
      
      if (userCount[0].count > 0) {
        return res.json({
          status: 'Error',
          info: 'Cannot delete state. It is being used by users.'
        });
      }

      // Soft delete the state
      const currentTime = new Date().toISOString().slice(0, 19).replace('T', ' ');
      const result = await query(`
        UPDATE states 
        SET deleted = 1, deleted_by = ?, deleted_at = ?
        WHERE id = ?
      `, [admin.role_id, currentTime, keys]);

      if (result.affectedRows === 0) {
        return res.json({
          status: 'Error',
          info: 'Failed to delete state'
        });
      }

      // Return success response
      return res.json({
        status: 'Success',
        info: 'State deleted successfully'
      });

    } catch (error) {
      console.error('deleteAdminState error:', error);
      return res.json({
        status: 'Error',
        info: 'Failed to delete state'
      });
    }
  },

  // Check duplicate state - PHP compatible version
  async checkAdminDuplicateState(req, res) {
    try {
      // Support both query parameters and form data
      const { user_id, token, cid, name, id } = {
        ...req.query,
        ...req.body
      };

      console.log('checkAdminDuplicateState - Parameters:', { user_id, token, cid, name, id });

      // Check if user_id and token are provided
      if (!user_id || !token) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'user_id and token are required'
        });
      }

      // Check if required fields are provided
      if (!cid || !name || name.trim() === '') {
        return res.json({
          status: false,
          rcode: 500,
          message: 'Country ID and state name are required'
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

      // Check for duplicate state name within the same country
      let duplicateCheckQuery = 'SELECT COUNT(*) as count FROM states WHERE country_id = ? AND name = ? AND deleted = 0';
      let duplicateCheckParams = [parseInt(cid), name.trim()];
      
      if (id && id > 0) {
        duplicateCheckQuery += ' AND id != ?';
        duplicateCheckParams.push(id);
      }
      
      const duplicateResult = await query(duplicateCheckQuery, duplicateCheckParams);
      const isDuplicate = duplicateResult[0].count > 0;

      // Return response in PHP format (matching exactly)
      return res.json({
        status: true,
        rcode: 200,
        user_id: idEncode(decodedUserId),
        unique_token: token,
        is_duplicate: isDuplicate,
        message: isDuplicate ? 'State name already exists in this country' : 'State name is available'
      });

    } catch (error) {
      console.error('checkAdminDuplicateState error:', error);
      return res.json({
        status: false,
        rcode: 500,
        message: 'Failed to check duplicate state'
      });
    }
  },

  // Simple state update by ID - Direct update API
  async updateStateById(req, res) {
    try {
      // Support both query parameters and form data
      const { user_id, token, state_id, country_id, name, status } = {
        ...req.query,
        ...req.body
      };

      console.log('updateStateById - Parameters:', { user_id, token, state_id, country_id, name, status });

      // Check if user_id and token are provided
      if (!user_id || !token) {
        return res.json({
          status: 'Error',
          info: 'user_id and token are required'
        });
      }

      // Check if state_id is provided
      if (!state_id) {
        return res.json({
          status: 'Error',
          info: 'state_id is required'
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

      // Check if user is admin
      const adminRows = await query('SELECT * FROM admin_users WHERE id = ? LIMIT 1', [decodedUserId]);
      if (!adminRows.length) {
        return res.json({
          status: 'Error',
          info: 'Permission denied'
        });
      }

      const admin = adminRows[0];

      // Check if state exists
      const stateRows = await query('SELECT * FROM states WHERE id = ? AND deleted = 0', [state_id]);
      if (!stateRows.length) {
        return res.json({
          status: 'Error',
          info: 'State not found'
        });
      }

      // Prepare update data
      const updateData = {
        updated_at: new Date().toISOString().slice(0, 19).replace('T', ' '),
        updated_by: admin.role_id
      };

      // Build dynamic update query
      let updateQuery = 'UPDATE states SET updated_at = ?, updated_by = ?';
      let queryParams = [updateData.updated_at, updateData.updated_by];

      if (country_id) {
        updateQuery += ', country_id = ?';
        queryParams.push(parseInt(country_id));
      }

      if (name && name.trim() !== '') {
        updateQuery += ', name = ?';
        queryParams.push(name.trim());
      }

      if (status !== undefined) {
        updateQuery += ', status = ?';
        queryParams.push(parseInt(status));
      }

      updateQuery += ' WHERE id = ?';
      queryParams.push(state_id);

      // Execute update
      const result = await query(updateQuery, queryParams);

      if (result.affectedRows === 0) {
        return res.json({
          status: 'Error',
          info: 'No changes made to state'
        });
      }

      // Return success response
      return res.json({
        status: 'Success',
        info: 'State updated successfully',
        id: parseInt(state_id),
        updated_fields: {
          country_id: country_id ? parseInt(country_id) : 'unchanged',
          name: name ? name.trim() : 'unchanged',
          status: status !== undefined ? parseInt(status) : 'unchanged'
        }
      });

    } catch (error) {
      console.error('updateStateById error:', error);
      return res.json({
        status: 'Error',
        info: 'Failed to update state'
      });
    }
  }

};

module.exports = StateController;
