'use strict';

const { query } = require('../config/db');
const { idEncode, idDecode } = require('../utils/idCodec');

const CountryController = {

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


  async getAdminCountryList(req, res) {
    try {
      const { user_id, token } = {
        ...req.query,
        ...req.body
      };
      
      console.log('getCountryList - Parameters:', { user_id, token });
      
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

  async getAdminCountryLists(req, res) {
    try {
      const { user_id, token, draw, start, length, search, order } = {
        ...req.query,
        ...req.body
      };
      
      console.log('getCountryLists - Parameters:', { user_id, token, draw, start, length, search, order });
      
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

      let searchCondition = '';
      let searchParams = [];
      
      if (search && search.value) {
        searchCondition = 'AND (c.name LIKE ?)';
        searchParams.push(`%${search.value}%`);
      }

      const totalCountResult = await query(`
        SELECT COUNT(*) as total 
        FROM countries c 
        WHERE c.deleted = 0
      `);
      const totalCount = totalCountResult[0].total;

      const filteredCountResult = await query(`
        SELECT COUNT(*) as filtered 
        FROM countries c 
        WHERE c.deleted = 0 ${searchCondition}
      `, searchParams);
      const filteredCount = filteredCountResult[0].filtered;

      let orderClause = 'ORDER BY c.name ASC';
      if (order && order.length > 0) {
        const orderColumn = order[0].column;
        const orderDir = order[0].dir;
        const columns = ['c.id', 'c.name', 'c.status', 'c.created_at'];
        if (columns[orderColumn]) {
          orderClause = `ORDER BY ${columns[orderColumn]} ${orderDir.toUpperCase()}`;
        }
      }

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

  async saveAdminCountry(req, res) {
    try {
      const { user_id, token, id, name, status } = {
        ...req.query,
        ...req.body
      };
      
      console.log('saveCountry - Parameters:', { user_id, token, id, name, status });
      
      if (!user_id || !token) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'Token Mismatch Exception'
        });
      }
      
      if (!name || name.trim() === '') {
        return res.json({
          status: false,
          rcode: 500,
          message: 'Please enter mandatory fields'
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
        result = await query(`
          INSERT INTO countries (name, status, created_at, created_by, deleted, deleted_by, deleted_at)
          VALUES (?, ?, ?, ?, 0, NULL, NULL)
        `, [name.trim(), status || 1, currentTime, decodedUserId]);
      }

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

  async viewAdminAddEditForm(req, res) {
    try {
      const { user_id, token } = {
        ...req.query,
        ...req.body
      };
      
      const countryId = req.params.id || req.params[0];

      console.log('viewAddEditForm - Parameters:', { user_id, token, countryId });

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

      let countryData = null;
      
      if (countryId && countryId > 0) {
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

  async deleteAdminCountry(req, res) {
    try {
      const { user_id, token } = {
        ...req.query,
        ...req.body
      };
      
      const countryId = req.params.id || req.params[0];

      console.log('deleteCountry - Parameters:', { user_id, token, countryId });

      if (!user_id || !token) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'Token Mismatch Exception'
        });
      }
      
      if (!countryId || countryId <= 0) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'Please enter mandatory fields'
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

  async checkAdminDuplicateCountry(req, res) {
    try {
      const { user_id, token, name, id } = {
        ...req.query,
        ...req.body
      };

      console.log('checkDuplicateCountry - Parameters:', { user_id, token, name, id });

      if (!user_id || !token) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'Token Mismatch Exception'
        });
      }
      
      if (!name || name.trim() === '') {
        return res.json({
          status: false,
          rcode: 500,
          message: 'Please enter mandatory fields'
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

      let duplicateCheckQuery = 'SELECT COUNT(*) as count FROM countries WHERE name = ? AND deleted = 0';
      let duplicateCheckParams = [name.trim()];
      
      if (id && id > 0) {
        duplicateCheckQuery += ' AND id != ?';
        duplicateCheckParams.push(id);
      }
      
      const duplicateResult = await query(duplicateCheckQuery, duplicateCheckParams);
      const isDuplicate = duplicateResult[0].count > 0;

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
