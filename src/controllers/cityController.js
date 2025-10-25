const { query } = require('../config/db');
const { idEncode, idDecode } = require('../utils/idCodec');
const { errorResponse, phpResponse } = require('../utils/response');
const { logger } = require('../utils/logger');

const CityController = {
  
  async getCityList(req, res) {
    try {
      const { user_id, token, state_id } = { ...req.query, ...req.body };
      
      if (!user_id || !token || !state_id) {
        return errorResponse(res, 'user_id, token, and state_id are required', 400);
      }

  
      const decodedUserId = idDecode(user_id);
      if (!decodedUserId) {
        return errorResponse(res, 'Invalid user_id', 400);
      }

 
      const userCheck = await query('SELECT user_id FROM users WHERE user_id = ? AND unique_token = ? AND deleted = 0', [decodedUserId, token]);
      if (userCheck.length === 0) {
        return errorResponse(res, 'Invalid token or user not found', 401);
      }

      const rows = await query('SELECT id AS city_id, name AS city_name FROM cities WHERE state_id = ?', [state_id]);
      
      if (rows.length === 0) {
        return phpResponse(res, 'No cities found for this state', {
          city_list: []
        });
      }

      return phpResponse(res, 'City list retrieved successfully', {
        city_list: rows.map(row => ({
          city_id: row.city_id.toString(),
          city_name: row.city_name || ""
        }))
      });

    } catch (error) {
      console.error('getCityList error:', error);
      return errorResponse(res, 'Failed to get city list', 500);
    }
  },


  async viewCities(req, res) {
    try {
      const { user_id, token } = {
        ...req.query,
        ...req.body
      };

      console.log('viewCities - Parameters:', { user_id, token });

      if (!user_id || !token) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'user_id and token are required'
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

      const adminRows = await query('SELECT * FROM admin_users WHERE id = ? LIMIT 1', [decodedUserId]);
      if (!adminRows.length) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'Permission denied'
        });
      }


      const limit = 1000; 
      const cities = await query(`
        SELECT c.id, c.name, c.status, c.state_id, s.name as state_name 
        FROM cities c 
        LEFT JOIN states s ON c.state_id = s.id 
        WHERE c.deleted = 0 
        ORDER BY s.name ASC, c.name ASC
        LIMIT ?
      `, [limit]);

      return res.json({
        status: true,
        rcode: 200,
        user_id: idEncode(decodedUserId),
        unique_token: token,
        cities: cities || [],
        message: 'City list view data retrieved successfully',
        limit: limit,
        total_returned: cities ? cities.length : 0
      });

    } catch (error) {
      console.error('viewCities error:', error);
      return res.json({
        status: false,
        rcode: 500,
        message: 'Failed to retrieve city list view data'
      });
    }
  },

  async submitCities(req, res) {
    try {
      const { user_id, token, row_id, state_id, name, status } = {
        ...req.query,
        ...req.body
      };

      console.log('submitCities - Parameters:', { user_id, token, row_id, state_id, name, status });

      if (!user_id || !token) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'user_id and token are required'
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

      const adminRows = await query('SELECT * FROM admin_users WHERE id = ? LIMIT 1', [decodedUserId]);
      if (!adminRows.length) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'Permission denied'
        });
      }

      if (!state_id || !name) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'state_id and name are required'
        });
      }

      const admin = adminRows[0];

      if (!row_id || row_id === '') {
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

        return res.json({
          status: 'Success',
          info: info
        });

      } else {
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
  },

  async listCitiesAjax(req, res) {
    try {
      const { user_id, token } = {
        ...req.query,
        ...req.body
      };

      console.log('listCitiesAjax - Parameters:', { user_id, token });

      if (!user_id || !token) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'user_id and token are required'
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

      const adminRows = await query('SELECT * FROM admin_users WHERE id = ? LIMIT 1', [decodedUserId]);
      if (!adminRows.length) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'Permission denied'
        });
      }

      const drawValue = parseInt(req.body.draw || req.query.draw || 1);
      const startValue = parseInt(req.body.start || req.query.start || 0);
      const lengthValue = parseInt(req.body.length || req.query.length || 10);
      const searchValue = req.body.search?.value || req.query.search || '';

      const totalCountResult = await query('SELECT COUNT(*) as count FROM cities WHERE deleted = 0');
      const totalCount = totalCountResult[0]?.count || 0;

      let searchQuery = '';
      let searchParams = [];
      if (searchValue) {
        searchQuery = 'WHERE (cities.name LIKE ? OR states.name LIKE ?) AND cities.deleted = 0';
        searchParams.push(`%${searchValue}%`, `%${searchValue}%`);
      } else {
        searchQuery = 'WHERE cities.deleted = 0';
      }

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

        data.push([i, row.state_name, row.name, status, row.id.toString(), action]);
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
  },

  // Check duplicate cities - PHP compatible version
  async checkDuplicateCities(req, res) {
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
  },

  // Get city list for admin panel
  async getAdminCityList(req, res) {
    try {
      const { user_id, token, keys } = { ...req.query, ...req.body };

      if (!user_id || !token) {
        return errorResponse(res, 'user_id and token are required', 400);
      }

      // Decode user ID
      const decodedUserId = idDecode(user_id);
      if (!decodedUserId) {
        return errorResponse(res, 'Invalid user_id', 400);
      }

      // Verify admin user - check in users table
      const adminCheck = await query('SELECT user_id FROM users WHERE user_id = ? AND unique_token = ? AND deleted = 0', [decodedUserId, token]);
      if (adminCheck.length === 0) {
        return errorResponse(res, 'Invalid admin token', 401);
      }

      console.log('getAdminCityList - Parameters:', { user_id, token, keys });

      let cities;
      if (keys && keys !== '') {
        // Get cities for specific state
        cities = await query('SELECT id, name FROM cities WHERE state_id = ? AND deleted = 0 ORDER BY name ASC', [keys]);
      } else {
        // Get all cities
        cities = await query('SELECT c.id, c.name, s.name as state_name FROM cities c LEFT JOIN states s ON c.state_id = s.id WHERE c.deleted = 0 ORDER BY s.name, c.name ASC');
      }

      let option = "";
      if (cities && cities.length > 0) {
        option = "<option value=''>Select City</option>";
        for (const city of cities) {
          option += `<option value="${city.id}">${city.name}</option>`;
        }
      } else {
        option = "<option value=''>City List Empty</option>";
      }

      return res.json({
        status: true,
        message: 'City list retrieved successfully',
        data: option
      });

    } catch (error) {
      console.error('getAdminCityList error:', error);
      return errorResponse(res, 'Failed to get city list', 500);
    }
  },

  // View city management page
  async viewAdminCity(req, res) {
    try {
      const { user_id, token } = { ...req.query, ...req.body };

      if (!user_id || !token) {
        return errorResponse(res, 'user_id and token are required', 400);
      }

      // Decode user ID
      const decodedUserId = idDecode(user_id);
      if (!decodedUserId) {
        return errorResponse(res, 'Invalid user_id', 400);
      }

      // Verify admin user - check in users table
      const adminCheck = await query('SELECT user_id FROM users WHERE user_id = ? AND unique_token = ? AND deleted = 0', [decodedUserId, token]);
      if (adminCheck.length === 0) {
        return errorResponse(res, 'Invalid admin token', 401);
      }

      // Get city list view data
      const cityData = await query(`
        SELECT 
          c.id,
          c.name,
          c.state_id,
          s.name as state_name,
          c.status,
          c.created_dts,
          c.updated_dts
        FROM cities c
        LEFT JOIN states s ON c.state_id = s.id
        WHERE c.deleted = 0
        ORDER BY s.name, c.name ASC
      `);

      return res.json({
        status: true,
        message: 'City list view data retrieved successfully',
        data: cityData
      });

    } catch (error) {
      console.error('viewAdminCity error:', error);
      return errorResponse(res, 'Failed to retrieve city list view data', 500);
    }
  },

  // Submit city (add/edit)
  async submitAdminCity(req, res) {
    try {
      const { user_id, token, row_id, name, state_id, status } = { ...req.query, ...req.body };

      if (!user_id || !token || !name || !state_id) {
        return errorResponse(res, 'user_id, token, name, and state_id are required', 400);
      }

      // Decode user ID
      const decodedUserId = idDecode(user_id);
      if (!decodedUserId) {
        return errorResponse(res, 'Invalid user_id', 400);
      }

      // Verify admin user - check in users table
      const adminCheck = await query('SELECT user_id FROM users WHERE user_id = ? AND unique_token = ? AND deleted = 0', [decodedUserId, token]);
      if (adminCheck.length === 0) {
        return errorResponse(res, 'Invalid admin token', 401);
      }

      if (row_id) {
        // Update existing city (matching PHP exactly)
        const updateResult = await query(
          'UPDATE cities SET name = ?, state_id = ?, status = ?, updated_at = NOW() WHERE id = ?',
          [name, state_id, status || 1, row_id]
        );

        if (updateResult.affectedRows > 0) {
          logger.info('City updated successfully');
          return res.json({
            status: true,
            message: 'City updated successfully'
          });
        }
      } else {
        // Insert new city (matching PHP exactly)
        const insertResult = await query(
          'INSERT INTO cities (name, state_id, status, created_at, deleted) VALUES (?, ?, ?, NOW(), 0)',
          [name, state_id, status || 1]
        );

        if (insertResult.insertId) {
          logger.info('City added successfully');
          return res.json({
            status: true,
            message: 'City added successfully'
          });
        }
      }

      return errorResponse(res, 'Failed to submit city', 500);

    } catch (error) {
      console.error('submitAdminCity error:', error);
      logger.info('Failed to submit city');
      return errorResponse(res, 'Failed to submit city', 500);
    }
  },

  // Check duplicate city
  async checkAdminDuplicateCity(req, res) {
    try {
      const { user_id, token, name, state_id, row_id } = { ...req.query, ...req.body };

      if (!user_id || !token || !name || !state_id) {
        return errorResponse(res, 'user_id, token, name, and state_id are required', 400);
      }

      // Decode user ID
      const decodedUserId = idDecode(user_id);
      if (!decodedUserId) {
        return errorResponse(res, 'Invalid user_id', 400);
      }

      // Verify admin user - check in users table
      const adminCheck = await query('SELECT user_id FROM users WHERE user_id = ? AND unique_token = ? AND deleted = 0', [decodedUserId, token]);
      if (adminCheck.length === 0) {
        return errorResponse(res, 'Invalid admin token', 401);
      }

      let duplicateCheck;
      if (row_id) {
        // Editing existing city - exclude current record and check within same state
        duplicateCheck = await query(
          'SELECT id FROM cities WHERE name = ? AND state_id = ? AND id != ? AND deleted = 0',
          [name, state_id, row_id]
        );
      } else {
        // Adding new city - check within same state
        duplicateCheck = await query(
          'SELECT id FROM cities WHERE name = ? AND state_id = ? AND deleted = 0',
          [name, state_id]
        );
      }

      // Check for duplicate city name within the same state
      if (duplicateCheck.length > 0) {
        return res.json({
          status: false,
          message: 'City with this name already exists in the selected state'
        });
      }

      return res.json({
        status: true,
        message: 'City name is available'
      });

    } catch (error) {
      console.error('checkAdminDuplicateCity error:', error);
      return errorResponse(res, 'Failed to check duplicate city', 500);
    }
  },

  // Delete city
  async deleteAdminCity(req, res) {
    try {
      const { user_id, token, keys } = { ...req.query, ...req.body };

      if (!user_id || !token) {
        return errorResponse(res, 'user_id and token are required', 400);
      }

      // Check if keys (city ID) is provided
      if (!keys || keys === '') {
        return errorResponse(res, 'City ID is required', 400);
      }

      // Decode user ID
      const decodedUserId = idDecode(user_id);
      if (!decodedUserId) {
        return errorResponse(res, 'Invalid user_id', 400);
      }

      // Verify admin user - check in users table
      const adminCheck = await query('SELECT user_id FROM users WHERE user_id = ? AND unique_token = ? AND deleted = 0', [decodedUserId, token]);
      if (adminCheck.length === 0) {
        return errorResponse(res, 'Invalid admin token', 401);
      }

      // Soft delete the city (matching PHP exactly)
      const deleteResult = await query(
        'UPDATE cities SET deleted = 1, deleted_at = NOW() WHERE id = ?',
        [keys]
      );

      if (deleteResult.affectedRows > 0) {
        logger.info('City Deleted Successfully');
        return res.json({
          status: true,
          message: 'City deleted successfully'
        });
      }

      logger.info('Failed to delete city');
      return errorResponse(res, 'Failed to delete city', 500);

    } catch (error) {
      console.error('deleteAdminCity error:', error);
      return errorResponse(res, 'Failed to delete city', 500);
    }
  },

  // List cities AJAX (for admin panel DataTables)
  async listCitiesAjax(req, res) {
    try {
      const { user_id, token, draw, start, length, search, order } = { ...req.query, ...req.body };

      if (!user_id || !token) {
        return errorResponse(res, 'user_id and token are required', 400);
      }

      // Decode user ID
      const decodedUserId = idDecode(user_id);
      if (!decodedUserId) {
        return errorResponse(res, 'Invalid user_id', 400);
      }

      // Verify admin user - check in users table
      const adminCheck = await query('SELECT user_id FROM users WHERE user_id = ? AND unique_token = ? AND deleted = 0', [decodedUserId, token]);
      if (adminCheck.length === 0) {
        return errorResponse(res, 'Invalid admin token', 401);
      }

      console.log('listCitiesAjax - Parameters:', { user_id, token, draw, start, length, search, order });

      // DataTables parameters - match PHP format exactly
      const drawValue = parseInt(draw || 1);
      const startValue = parseInt(start || 0);
      const lengthValue = parseInt(length || 10);
      
      // Handle search parameter like PHP (search.value)
      let searchValue = '';
      if (search && typeof search === 'object' && search.value) {
        searchValue = search.value;
      } else if (typeof search === 'string') {
        searchValue = search;
      }

      // Get total count
      const totalCountResult = await query('SELECT COUNT(*) as count FROM cities WHERE deleted = 0');
      const totalCount = totalCountResult[0].count;

      // Build search condition
      let searchCondition = '';
      let searchParams = [];
      if (searchValue) {
        searchCondition = ' AND (c.name LIKE ? OR s.name LIKE ?)';
        searchParams = [`%${searchValue}%`, `%${searchValue}%`];
      }

      // Get filtered count
      const filteredCountResult = await query(
        `SELECT COUNT(*) as count FROM cities c 
         LEFT JOIN states s ON c.state_id = s.id 
         WHERE c.deleted = 0 ${searchCondition}`,
        searchParams
      );
      const filteredCount = filteredCountResult[0].count;

      // Handle ordering like PHP
      let orderBy = 'ORDER BY s.name ASC, c.name ASC'; // Default order
      if (order && Array.isArray(order) && order.length > 0) {
        const orderColumn = order[0].column || 0;
        const orderDir = order[0].dir || 'asc';
        
        // Map DataTables column indices to actual columns
        const columnMap = ['s.name', 'c.name', 'c.status'];
        const column = columnMap[orderColumn] || 's.name';
        orderBy = `ORDER BY ${column} ${orderDir.toUpperCase()}`;
      }

      // Get cities with pagination
      const cities = await query(
        `SELECT c.id, c.name, c.status, c.state_id, s.name as state_name 
         FROM cities c 
         LEFT JOIN states s ON c.state_id = s.id 
         WHERE c.deleted = 0 ${searchCondition}
         ${orderBy}
         LIMIT ? OFFSET ?`,
        [...searchParams, lengthValue, startValue]
      );

      // Format data for DataTables
      const data = [];
      let i = startValue;
      for (const city of cities) {
        i++;
        const status = city.status == 1 
          ? '<span class="badge bg-soft-success text-success">Active</span>'
          : '<span class="badge bg-soft-danger text-danger">Inactive</span>';
        
        let action = `<a href="javascript:void(0);" id="edit_${city.id}" data-id="${city.id}" data-state="${city.state_id}" data-name="${city.name}" data-status="${city.status}" onclick="viewEditDetails(${city.id});" class="action-icon"> <i class="mdi mdi-square-edit-outline"></i></a>`;
        action += `<a href="javascript:void(0);" class="action-icon delete_info" data-id="${city.id}"> <i class="mdi mdi-delete"></i></a>`;
        
        data.push([i, city.state_name || '', city.name, city.id.toString(), status, action]);
      }

      // Return DataTables format response
      return res.json({
        draw: drawValue,
        recordsTotal: totalCount,
        recordsFiltered: filteredCount,
        data: data
      });

    } catch (error) {
      console.error('listCitiesAjax error:', error);
      return errorResponse(res, 'Failed to get city list', 500);
    }
  }
};

module.exports = CityController;
