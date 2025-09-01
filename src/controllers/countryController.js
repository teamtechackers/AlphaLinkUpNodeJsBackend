'use strict';

const { query } = require('../config/db');
const { idEncode, idDecode } = require('../utils/idCodec');

const CountryController = {

  // ===== API CONTROLLER FUNCTIONS =====

  // Get country list for mobile app
  async getCountryList(req, res) {
    console.log('=== getCountryList method called ===');
    try {
      const { user_id, token } = {
        ...req.query,
        ...req.body
      };
      
      console.log('Method - user_id:', user_id);
      console.log('Method - token:', token);

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
          message: 'Not A Valid User'
        });
      }

      // Check if user exists and has valid token
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

      const rows = await query('SELECT id AS country_id, name AS country_name FROM countries');

      return res.json({
        status: true,
        rcode: 200,
        user_id: user_id,
        unique_token: token,
        country_list: rows.map(row => ({
          country_id: row.country_id.toString(),
          country_name: row.country_name || ""
        }))
      });
      
    } catch (error) {
      console.error('getCountryList error:', error);
      return res.json({
        status: false,
        rcode: 500,
        message: 'Failed to get country list'
      });
    }
  },

  // ===== ADMIN CONTROLLER FUNCTIONS =====

  // Get country list for admin - PHP compatible version
  async getAdminCountryList(req, res) {
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
          message: 'Token Mismatch Exception'
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

      // Get countries list
      const countriesList = await query(`
        SELECT 
          c.id,
          c.name,
          c.status,
          c.created_at,
          c.created_by,
          c.updated_at,
          c.updated_by,
          c.deleted,
          c.deleted_by,
          c.deleted_at
        FROM countries c
        WHERE c.deleted = 0
        ORDER BY c.name ASC
      `);

      // Return response in PHP format (matching exactly)
      return res.json({
        status: true,
        rcode: 200,
        user_id: idEncode(decodedUserId),
        unique_token: token,
        countries_list: countriesList || []
      });
      
    } catch (error) {
      console.error('getCountryList error:', error);
      return res.json({
        status: false,
        rcode: 500,
        message: 'Failed to retrieve country list'
      });
    }
  },

  // Get country list for DataTables - PHP compatible version
  async getAdminCountryLists(req, res) {
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
          message: 'Token Mismatch Exception'
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

      // Build search condition
      let searchCondition = '';
      let searchParams = [];
      
      if (search && search.value) {
        searchCondition = 'AND (c.name LIKE ?)';
        searchParams.push(`%${search.value}%`);
      }

      // Get total count
      const totalCountResult = await query(`
        SELECT COUNT(*) as total 
        FROM countries c 
        WHERE c.deleted = 0
      `);
      const totalCount = totalCountResult[0].total;

      // Get filtered count
      const filteredCountResult = await query(`
        SELECT COUNT(*) as filtered 
        FROM countries c 
        WHERE c.deleted = 0 ${searchCondition}
      `, searchParams);
      const filteredCount = filteredCountResult[0].filtered;

      // Build order clause
      let orderClause = 'ORDER BY c.name ASC';
      if (order && order.length > 0) {
        const orderColumn = order[0].column;
        const orderDir = order[0].dir;
        const columns = ['c.id', 'c.name', 'c.status', 'c.created_at'];
        if (columns[orderColumn]) {
          orderClause = `ORDER BY ${columns[orderColumn]} ${orderDir.toUpperCase()}`;
        }
      }

      // Get paginated data
      const countriesList = await query(`
        SELECT 
          c.id,
          c.name,
          c.status,
          c.created_at,
          c.created_by,
          c.updated_at,
          c.updated_by,
          c.deleted,
          c.deleted_by,
          c.deleted_at
        FROM countries c
        WHERE c.deleted = 0 ${searchCondition}
        ${orderClause}
        LIMIT ? OFFSET ?
      `, [...searchParams, parseInt(length), parseInt(start)]);

      // Return DataTables format response
      return res.json({
        draw: parseInt(draw),
        recordsTotal: totalCount,
        recordsFiltered: filteredCount,
        data: countriesList || []
      });
      
    } catch (error) {
      console.error('getCountryLists error:', error);
      return res.json({
        status: false,
        rcode: 500,
        message: 'Failed to retrieve country lists'
      });
    }
  },

  // Save country - PHP compatible version
  async saveAdminCountry(req, res) {
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
          message: 'Token Mismatch Exception'
        });
      }
      
      // Check mandatory fields
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

      // Check for duplicate name
      let duplicateCheckQuery = 'SELECT COUNT(*) as count FROM countries WHERE name = ? AND deleted = 0';
      let duplicateCheckParams = [name.trim()];
      
      if (id && id > 0) {
        duplicateCheckQuery += ' AND id != ?';
        duplicateCheckParams.push(id);
      }
      
      const duplicateResult = await query(duplicateCheckQuery, duplicateCheckParams);
      
      if (duplicateResult[0].count > 0) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'Country name already exists'
        });
      }

      let result;
      const currentTime = new Date().toISOString().slice(0, 19).replace('T', ' ');

      if (id && id > 0) {
        // Update existing country
        result = await query(`
          UPDATE countries 
          SET name = ?, status = ?, updated_at = ?, updated_by = ?
          WHERE id = ? AND deleted = 0
        `, [name.trim(), status || 1, currentTime, decodedUserId, id]);
        
        if (result.affectedRows === 0) {
          return res.json({
            status: false,
            rcode: 500,
            message: 'Country not found or already deleted'
          });
        }
      } else {
        // Insert new country
        result = await query(`
          INSERT INTO countries (name, status, created_at, created_by, deleted, deleted_by, deleted_at)
          VALUES (?, ?, ?, ?, 0, NULL, NULL)
        `, [name.trim(), status || 1, currentTime, decodedUserId]);
      }

      // Return success response
      return res.json({
        status: true,
        rcode: 200,
        user_id: idEncode(decodedUserId),
        unique_token: token,
        message: id && id > 0 ? 'Country updated successfully' : 'Country added successfully',
        country_id: id && id > 0 ? id : result.insertId
      });
      
    } catch (error) {
      console.error('saveCountry error:', error);
      return res.json({
        status: false,
        rcode: 500,
        message: 'Failed to save country'
      });
    }
  },

  // View/Edit country form - PHP compatible version
  async viewAdminAddEditForm(req, res) {
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
          message: 'Token Mismatch Exception'
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

      let countryData = null;
      
      if (countryId && countryId > 0) {
        // Get country details for editing
        const countryRows = await query(`
          SELECT 
            c.id,
            c.name,
            c.status,
            c.created_at,
            c.created_by,
            c.updated_at,
            c.updated_by,
            c.deleted,
            c.deleted_by,
            c.deleted_at
          FROM countries c
          WHERE c.id = ? AND c.deleted = 0
        `, [countryId]);
        
        if (countryRows.length > 0) {
          countryData = countryRows[0];
        } else {
          return res.json({
            status: false,
            rcode: 500,
            message: 'Country not found'
          });
        }
      }

      // Return response in PHP format
      return res.json({
        status: true,
        rcode: 200,
        user_id: idEncode(decodedUserId),
        unique_token: token,
        country_data: countryData,
        is_edit: countryId && countryId > 0
      });
      
    } catch (error) {
      console.error('viewAddEditForm error:', error);
      return res.json({
        status: false,
        rcode: 500,
        message: 'Failed to retrieve country details'
      });
    }
  },

  // Delete country - PHP compatible version
  async deleteAdminCountry(req, res) {
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
          message: 'Token Mismatch Exception'
        });
      }
      
      // Check if country ID is provided
      if (!countryId || countryId <= 0) {
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

      // Check if country exists and is not already deleted
      const countryRows = await query(`
        SELECT id, name FROM countries 
        WHERE id = ? AND deleted = 0
      `, [countryId]);
      
      if (countryRows.length === 0) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'Country not found or already deleted'
        });
      }

      // Check if country is being used in other tables
      const stateCount = await query('SELECT COUNT(*) as count FROM states WHERE country_id = ? AND deleted = 0', [countryId]);
      const userCount = await query('SELECT COUNT(*) as count FROM users WHERE country_id = ?', [countryId]);
      
      if (stateCount[0].count > 0) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'Cannot delete country. It is being used in states.'
        });
      }
      
      if (userCount[0].count > 0) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'Cannot delete country. It is being used by users.'
        });
      }

      // Soft delete the country
      const currentTime = new Date().toISOString().slice(0, 19).replace('T', ' ');
      const result = await query(`
        UPDATE countries 
        SET deleted = 1, deleted_by = ?, deleted_at = ?
        WHERE id = ?
      `, [decodedUserId, currentTime, countryId]);

      if (result.affectedRows === 0) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'Failed to delete country'
        });
      }

      // Return success response
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
  },

  // Check duplicate country - PHP compatible version
  async checkAdminDuplicateCountry(req, res) {
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

      // Check for duplicate name
      let duplicateCheckQuery = 'SELECT COUNT(*) as count FROM countries WHERE name = ? AND deleted = 0';
      let duplicateCheckParams = [name.trim()];
      
      if (id && id > 0) {
        duplicateCheckQuery += ' AND id != ?';
        duplicateCheckParams.push(id);
      }
      
      const duplicateResult = await query(duplicateCheckQuery, duplicateCheckParams);
      const isDuplicate = duplicateResult[0].count > 0;

      // Return response in PHP format
      return res.json({
        status: true,
        rcode: 200,
        user_id: idEncode(decodedUserId),
        unique_token: token,
        is_duplicate: isDuplicate,
        message: isDuplicate ? 'Country name already exists' : 'Country name is available'
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

};

module.exports = CountryController;
