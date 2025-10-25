'use strict';

const { query } = require('../config/db');
const { idDecode, idEncode } = require('../utils/idCodec');

class FundController {
  // API function - Get fund size list
  static async getFundSizeList(req, res) {
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
      
    const rows = await query('SELECT id AS fund_size_id, investment_range FROM fund_size');
      
      return res.json({
        status: true,
        rcode: 200,
        user_id: user_id,
        unique_token: token,
        fund_size_list: rows.map(row => ({
          fund_size_id: row.fund_size_id.toString(),
          investment_range: row.investment_range || ""
        }))
      });
      
    } catch (error) {
      console.error('getFundSizeList error:', error);
      return res.json({
        status: false,
        rcode: 500,
        message: 'Failed to get fund size list'
      });
    }
  }

  // Admin function - View fund size
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

  // Admin function - Submit fund size
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
          message: 'Please enter mandatory fields'
        });
      }

      let finalRowId = row_id || 0;

      if (finalRowId == 0) {
        // Insert new fund size
        const result = await query(
          'INSERT INTO fund_size (investment_range, status, deleted) VALUES (?, ?, 0)',
          [investment_range, status || 1]
        );
        finalRowId = result.insertId;
      } else {
        // Update existing fund size
        const updateResult = await query(
          'UPDATE fund_size SET investment_range = ?, status = ? WHERE id = ?',
          [investment_range, status || 1, finalRowId]
        );
        
        if (updateResult.affectedRows === 0) {
          return res.json({
            status: false,
            rcode: 500,
            message: 'Fund size not found'
          });
        }
      }

      // Return response in PHP format
      return res.json({
        status: true,
        rcode: 200,
        user_id: idEncode(decodedUserId),
        unique_token: token,
        row_id: finalRowId.toString(),
        message: 'Fund size saved successfully'
      });

    } catch (error) {
      console.error('submitFundSize error:', error);
      return res.json({
        status: false,
        rcode: 500,
        message: 'Failed to save fund size'
      });
    }
  }

  // Admin function - List fund size ajax
  static async listFundSizeAjax(req, res) {
    try {
      // Support both query parameters and form data
      const { user_id, token } = {
        ...req.query,
        ...req.body
      };

      console.log('FUND_CONTROLLER - listFundSizeAjax - Parameters:', { user_id, token });

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

      // Get fund sizes with DataTables parameters
      const { draw, start, length, search, order, columns } = req.query;
      
      let whereClause = 'WHERE deleted = 0';
      let queryParams = [];
      
      // Add search functionality
      if (search && search.value) {
        whereClause += ' AND (investment_range LIKE ?)';
        queryParams.push(`%${search.value}%`);
      }
      
      // Add ordering
      let orderClause = 'ORDER BY investment_range ASC';
      if (order && order.length > 0) {
        const orderColumn = columns[order[0].column];
        const orderDir = order[0].dir;
        orderClause = `ORDER BY ${orderColumn.data} ${orderDir}`;
      }
      
      // Get total count
      const totalCountResult = await query('SELECT COUNT(*) as total FROM fund_size WHERE deleted = 0');
      const totalCount = totalCountResult[0].total;
      
      // Get filtered count
      const filteredCountResult = await query(`SELECT COUNT(*) as filtered FROM fund_size ${whereClause}`, queryParams);
      const filteredCount = filteredCountResult[0].filtered;
      
      // Get data with pagination
      const limit = length ? parseInt(length) : 10;
      const offset = start ? parseInt(start) : 0;
      
      const fundSizes = await query(
        `SELECT * FROM fund_size ${whereClause} ${orderClause} LIMIT ? OFFSET ?`,
        [...queryParams, limit, offset]
      );
      
      // Format data for DataTables
      const data = fundSizes.map(fundSize => ({
        id: fundSize.id.toString(),
        investment_range: fundSize.investment_range || '',
        status: fundSize.status ? 'Active' : 'Inactive',
        created_at: fundSize.created_at || '',
        updated_at: fundSize.updated_at || ''
      }));

      // Return DataTables response format
      return res.json({
        draw: parseInt(draw || 1),
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

  // Admin function - Delete fund size
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

      // Check if keys are provided
      if (!keys) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'Please select items to delete'
        });
      }

      // Parse keys (can be comma-separated string or array)
      const keysArray = Array.isArray(keys) ? keys : keys.split(',');
      
      if (keysArray.length === 0) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'Please select items to delete'
        });
      }

      // Soft delete fund sizes (set deleted = 1)
      const placeholders = keysArray.map(() => '?').join(',');
      const result = await query(
        `UPDATE fund_size SET deleted = 1, deleted_at = NOW(), deleted_by = ? WHERE id IN (${placeholders})`,
        [decodedUserId, ...keysArray]
      );

      // Return response in PHP format
      return res.json({
        status: true,
        rcode: 200,
        user_id: idEncode(decodedUserId),
        unique_token: token,
        message: `${result.affectedRows} fund size(s) deleted successfully`
      });

    } catch (error) {
      console.error('deleteFundSize error:', error);
      return res.json({
        status: false,
        rcode: 500,
        message: 'Failed to delete fund size(s)'
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
          message: 'Token Mismatch Exception'
        });
      }
      
      // Check if name is provided
      if (!name || name.trim() === '') {
        return res.json({
          status: false,
          rcode: 500,
          message: 'Please enter mandatory fields'
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

      // Check for duplicate name (matching PHP exactly)
      let duplicateCheckQuery = 'SELECT COUNT(*) as count FROM fund_size WHERE investment_range = ? AND deleted = 0';
      let duplicateCheckParams = [name.trim()];
      
      if (id && id > 0) {
        duplicateCheckQuery += ' AND id != ?';
        duplicateCheckParams.push(id);
      }
      
      const duplicateResult = await query(duplicateCheckQuery, duplicateCheckParams);
      const isDuplicate = duplicateResult[0].count > 0;

      // Return response matching PHP exactly
      return res.json({
        validate: isDuplicate
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
}

module.exports = FundController;
