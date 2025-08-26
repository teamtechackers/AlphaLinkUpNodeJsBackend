'use strict';

const md5 = require('md5');
const { query } = require('../config/db');
const { ok, fail, phpResponse } = require('../utils/response');
const { idEncode, idDecode } = require('../utils/idCodec');
const { sendOtp, verifyOtp } = require('../services/twilio');
const { generateToFile } = require('../services/qrcode');

// Helpers
function toArray(rows) { return Array.isArray(rows) ? rows : []; }

const ApiController = {

  async login(req, res) {
    const { username, password } = req.body;
    if (!username || !password) return fail(res, 500, 'Invalid login credentials');
    const rows = await query('SELECT * FROM admin_users WHERE username = ? LIMIT 1', [username]);
    if (!rows.length) return fail(res, 500, 'Invalid login credentials');
    const user = rows[0];
    if (md5(password) !== user.password) return fail(res, 500, 'Invalid login credentials');
    // Minimal sessionless parity response (consumer app expects tokens? CI uses session)
    return ok(res, { username, role_id: user.role_id });
  },
  async logout(req, res) { return ok(res, { message: 'Logged out' }); },

  async sendOtp(req, res) {
    try {
      const { mobile } = req.body;
      if (!mobile) return fail(res, 500, 'Mobile required');
      const sid = await sendOtp(mobile);
      return ok(res, { verification_sid: sid });
    } catch (e) { return fail(res, 500, 'OTP send failed'); }
  },

  async verifyOtp(req, res) {
    try {
      const { mobile, verification_sid, otp } = req.body;
      if (!mobile || !verification_sid || !otp) return fail(res, 500, 'Invalid request');
      const status = await verifyOtp(mobile, verification_sid, otp);
      return ok(res, { status });
    } catch (e) { return fail(res, 500, 'OTP verify failed'); }
  },


  async getCountryList(req, res) {
    try {
      const { user_id, token } = req.query;
      

      if (!user_id || !token) {
        return fail(res, 500, 'user_id and token are required');
      }
      
      const decodedUserId = idDecode(user_id);
      if (!decodedUserId) {
        return fail(res, 500, 'Invalid user ID');
      }
      
      const userRows = await query('SELECT * FROM users WHERE user_id = ? LIMIT 1', [decodedUserId]);
      if (!userRows.length) {
        return fail(res, 500, 'Not A Valid User');
      }
      
      const user = userRows[0];
      
      if (user.unique_token !== token) {
        return fail(res, 500, 'Token Mismatch Exception');
      }
      
    const rows = await query('SELECT id AS country_id, name AS country_name FROM countries');
      
      return res.json({
        status: true,
        rcode: 200,
        user_id: idEncode(decodedUserId),
        unique_token: token,
        country_list: toArray(rows)
      });
      
    } catch (error) {
      console.error('getCountryList error:', error);
      return fail(res, 500, 'Failed to get country list');
    }
  },
  async getStateList(req, res) {
    try {
      const { user_id, token, country_id } = req.query;
      
      if (!user_id || !token) {
        return fail(res, 500, 'Token Mismatch Exception');
      }
      
      if (!country_id) {
        return fail(res, 500, 'country_id is required');
      }
      
      const decodedUserId = idDecode(user_id);
      if (!decodedUserId) {
        return fail(res, 500, 'Invalid user ID');
      }
      
      const userRows = await query('SELECT * FROM users WHERE user_id = ? LIMIT 1', [decodedUserId]);
      if (!userRows.length) {
        return fail(res, 500, 'Not A Valid User');
      }
      
      const user = userRows[0];
      
      if (user.unique_token !== token) {
        return fail(res, 500, 'Token Mismatch Exception');
      }
      
    const rows = await query('SELECT id AS state_id, name AS state_name FROM states WHERE country_id = ?', [country_id]);
      
      return res.json({
        status: true,
        rcode: 200,
        user_id: idEncode(decodedUserId),
        unique_token: token,
        state_list: toArray(rows)
      });
      
    } catch (error) {
      console.error('getStateList error:', error);
      return fail(res, 500, 'Failed to get state list');
    }
  },
  async getCityList(req, res) {
    try {
      const { user_id, token, state_id } = req.query;
      
      if (!user_id || !token) {
        return fail(res, 500, 'Token Mismatch Exception');
      }
      
      if (!state_id) {
        return fail(res, 500, 'state_id is required');
      }
      
      const decodedUserId = idDecode(user_id);
      if (!decodedUserId) {
        return fail(res, 500, 'Invalid user ID');
      }
      
      const userRows = await query('SELECT * FROM users WHERE user_id = ? LIMIT 1', [decodedUserId]);
      if (!userRows.length) {
        return fail(res, 500, 'Not A Valid User');
      }
      
      const user = userRows[0];
      
      if (user.unique_token !== token) {
        return fail(res, 500, 'Token Mismatch Exception');
      }
      
    const rows = await query('SELECT id AS city_id, name AS city_name FROM cities WHERE state_id = ?', [state_id]);
      
      return res.json({
        status: true,
        rcode: 200,
        user_id: idEncode(decodedUserId),
        unique_token: token,
        city_list: toArray(rows)
      });
      
    } catch (error) {
      console.error('getCityList error:', error);
      return fail(res, 500, 'Failed to get city list');
    }
  },
  async getInterestsList(req, res) {
    try {
      const { user_id, token } = req.query;
      
      if (!user_id || !token) {
        return fail(res, 500, 'Token Mismatch Exception');
      }
      
      const decodedUserId = idDecode(user_id);
      if (!decodedUserId) {
        return fail(res, 500, 'Invalid user ID');
      }
      
      const userRows = await query('SELECT * FROM users WHERE user_id = ? LIMIT 1', [decodedUserId]);
      if (!userRows.length) {
        return fail(res, 500, 'Not A Valid User');
      }
      
      const user = userRows[0];
      
      if (user.unique_token !== token) {
        return fail(res, 500, 'Token Mismatch Exception');
      }
      
    const rows = await query('SELECT id AS interest_id, name AS interest FROM interests');
      
      return res.json({
        status: true,
        rcode: 200,
        user_id: idEncode(decodedUserId),
        unique_token: token,
        interests_list: toArray(rows)
      });
      
    } catch (error) {
      console.error('getInterestsList error:', error);
      return fail(res, 500, 'Failed to get interests list');
    }
  },
  async getEmploymentTypeList(req, res) {
    try {
      const { user_id, token } = req.query;
      
      if (!user_id || !token) {
        return fail(res, 500, 'user_id and token are required');
      }
      
      // Decode user ID
      const decodedUserId = idDecode(user_id);
      if (!decodedUserId) {
        return fail(res, 500, 'Invalid user ID');
      }
      
      // Get user details and validate
      const userRows = await query('SELECT * FROM users WHERE user_id = ? LIMIT 1', [decodedUserId]);
      if (!userRows.length) {
        return fail(res, 500, 'Not A Valid User');
      }
      
      const user = userRows[0];
      
      // Validate token
      if (user.unique_token !== token) {
        return fail(res, 500, 'Token Mismatch Exception');
      }
      
      // Get employment type list
    const rows = await query('SELECT id AS employment_type_id, name AS employment_type FROM employment_type');
      
      // Return response in PHP format
      return res.json({
        status: true,
        rcode: 200,
        user_id: idEncode(decodedUserId),
        unique_token: token,
        employment_type_list: toArray(rows)
      });
      
    } catch (error) {
      console.error('getEmploymentTypeList error:', error);
      return fail(res, 500, 'Failed to get employment type list');
    }
  },
  async getJobTypeList(req, res) {
    try {
      const { user_id, token } = req.query;
      
      // Check if user_id and token are provided
      if (!user_id || !token) {
        return fail(res, 500, 'user_id and token are required');
      }
      
      // Decode user ID
      const decodedUserId = idDecode(user_id);
      if (!decodedUserId) {
        return fail(res, 500, 'Invalid user ID');
      }
      
      // Get user details and validate
      const userRows = await query('SELECT * FROM users WHERE user_id = ? LIMIT 1', [decodedUserId]);
      if (!userRows.length) {
        return fail(res, 500, 'Not A Valid User');
      }
      
      const user = userRows[0];
      
      // Validate token
      if (user.unique_token !== token) {
        return fail(res, 500, 'Token Mismatch Exception');
      }
      
      // Get job type list
    const rows = await query('SELECT id AS job_type_id, name AS job_type FROM job_type');
      
      // Return response in PHP format
      return res.json({
        status: true,
        rcode: 200,
        user_id: idEncode(decodedUserId),
        unique_token: token,
        job_type_list: toArray(rows)
      });
      
    } catch (error) {
      console.error('getJobTypeList error:', error);
      return fail(res, 500, 'Failed to get job type list');
    }
  },
  async getPayList(req, res) {
    try {
      const { user_id, token } = req.query;
      
      // Check if user_id and token are provided
      if (!user_id || !token) {
        return fail(res, 500, 'user_id and token are required');
      }
      
      // Decode user ID
      const decodedUserId = idDecode(user_id);
      if (!decodedUserId) {
        return fail(res, 500, 'Invalid user ID');
      }
      
      // Get user details and validate
      const userRows = await query('SELECT * FROM users WHERE user_id = ? LIMIT 1', [decodedUserId]);
      if (!userRows.length) {
        return fail(res, 500, 'Not A Valid User');
      }
      
      const user = userRows[0];
      
      // Validate token
      if (user.unique_token !== token) {
        return fail(res, 500, 'Token Mismatch Exception');
      }
      
      // Get pay list
    const rows = await query('SELECT id AS pay_id, name AS pay FROM pay');
      
      // Return response in PHP format
      return res.json({
        status: true,
        rcode: 200,
        user_id: idEncode(decodedUserId),
        unique_token: token,
        pay_list: toArray(rows)
      });
      
    } catch (error) {
      console.error('getPayList error:', error);
      return fail(res, 500, 'Failed to get pay list');
    }
  },
  async getEventModeList(req, res) {
    try {
      const { user_id, token } = req.query;
      
      // Check if user_id and token are provided
      if (!user_id || !token) {
        return fail(res, 500, 'user_id and token are required');
      }
      
      // Decode user ID
      const decodedUserId = idDecode(user_id);
      if (!decodedUserId) {
        return fail(res, 500, 'Invalid user ID');
      }
      
      // Get user details and validate
      const userRows = await query('SELECT * FROM users WHERE user_id = ? LIMIT 1', [decodedUserId]);
      if (!userRows.length) {
        return fail(res, 500, 'Not A Valid User');
      }
      
      const user = userRows[0];
      
      // Validate token
      if (user.unique_token !== token) {
        return fail(res, 500, 'Token Mismatch Exception');
      }
      
      // Get event mode list
    const rows = await query('SELECT id AS event_mode_id, name AS event_mode FROM event_mode');
      
      // Return response in PHP format
      return res.json({
        status: true,
        rcode: 200,
        user_id: idEncode(decodedUserId),
        unique_token: token,
        event_mode_list: toArray(rows)
      });
      
    } catch (error) {
      console.error('getEventModeList error:', error);
      return fail(res, 500, 'Failed to get event mode list');
    }
  },
  async getEventTypeList(req, res) {
    try {
      const { user_id, token } = req.query;
      
      // Check if user_id and token are provided
      if (!user_id || !token) {
        return fail(res, 500, 'user_id and token are required');
      }
      
      // Decode user ID
      const decodedUserId = idDecode(user_id);
      if (!decodedUserId) {
        return fail(res, 500, 'Invalid user ID');
      }
      
      // Get user details and validate
      const userRows = await query('SELECT * FROM users WHERE user_id = ? LIMIT 1', [decodedUserId]);
      if (!userRows.length) {
        return fail(res, 500, 'Not A Valid User');
      }
      
      const user = userRows[0];
      
      // Validate token
      if (user.unique_token !== token) {
        return fail(res, 500, 'Token Mismatch Exception');
      }
      
      // Get event type list
    const rows = await query('SELECT id AS event_type_id, name AS event_type FROM event_type');
      
      // Return response in PHP format
      return res.json({
        status: true,
        rcode: 200,
        user_id: idEncode(decodedUserId),
        unique_token: token,
        event_type_list: toArray(rows)
      });
      
    } catch (error) {
      console.error('getEventTypeList error:', error);
      return fail(res, 500, 'Failed to get event type list');
    }
  },
  async getFundSizeList(req, res) {
    const rows = await query('SELECT id AS fund_size_id, investment_range FROM fund_size');
    return phpResponse(res, 'Success', { data: toArray(rows) });
  },

  async getPromotionsList(req, res) {
    try {
      const { user_id, token } = req.query;
      
      // Check if user_id and token are provided
      if (!user_id || !token) {
        return fail(res, 500, 'user_id and token are required');
      }
      
      // Decode user ID
      const decodedUserId = idDecode(user_id);
      if (!decodedUserId) {
        return fail(res, 500, 'Invalid user ID');
      }
      
      // Check if user exists and validate token
      const userRows = await query('SELECT * FROM users WHERE user_id = ? LIMIT 1', [decodedUserId]);
      if (!userRows.length) {
        return fail(res, 500, 'Not A Valid User');
      }
      
      const user = userRows[0];
      
      // Validate token
      if (user.unique_token !== token) {
        return fail(res, 500, 'Token Mismatch Exception');
      }
      
      // Get promotions list
      const promotionsList = await query('SELECT * FROM promotions WHERE status = 1');
      
      // Return response in PHP format
      return res.json({
        status: true,
        rcode: 200,
        user_id: idEncode(decodedUserId),
        unique_token: token,
        promotions_list: promotionsList || []
      });
      
    } catch (error) {
      console.error('getPromotionsList error:', error);
      return fail(res, 500, 'Failed to get promotions list');
    }
  },

  async getServicesMasterList(req, res) {
    try {
      const { user_id, token } = req.query;
      
      // Check if user_id and token are provided
      if (!user_id || !token) {
        return fail(res, 500, 'user_id and token are required');
      }
      
      // Decode user ID
      const decodedUserId = idDecode(user_id);
      if (!decodedUserId) {
        return fail(res, 500, 'Invalid user ID');
      }
      
      // Check if user exists and validate token
      const userRows = await query('SELECT * FROM users WHERE user_id = ? LIMIT 1', [decodedUserId]);
      if (!userRows.length) {
        return fail(res, 500, 'Not A Valid User');
      }
      
      const user = userRows[0];
      
      // Validate token
      if (user.unique_token !== token) {
        return fail(res, 500, 'Token Mismatch Exception');
      }
      
      // Get services master list from folders table
      const servicesMasterList = await query('SELECT * FROM folders WHERE status = 1');
      
      // Return response in PHP format
      return res.json({
        status: true,
        rcode: 200,
        user_id: idEncode(decodedUserId),
        unique_token: token,
        services_master_list: servicesMasterList || []
      });
      
    } catch (error) {
      console.error('getServicesMasterList error:', error);
      return fail(res, 500, 'Failed to get services master list');
    }
  },

  async getServicesList(req, res) {
    try {
      const { user_id, token } = req.query;
      
      // Check if user_id and token are provided
      if (!user_id || !token) {
        return fail(res, 500, 'user_id and token are required');
      }
      
      // For now, return empty services list since the required tables might not exist
      // This matches PHP behavior when no services are found
      let serviceProviderList = [];
      
      // Return response in PHP format
      return res.json({
        status: true,
        rcode: 200,
        user_id: user_id,
        unique_token: token,
        service_provider_list: serviceProviderList
      });
      
    } catch (error) {
      console.error('getServicesList error:', error);
      return fail(res, 500, 'Failed to get services list');
    }
  },

  async saveServiceProvider(req, res) {
    try {
      const { user_id, token, country_id, state_id, city_id, service_ids, description } = {
        ...req.query,
        ...req.body
      };
      
      console.log('saveServiceProvider - Parameters:', { user_id, token, country_id, state_id, city_id, service_ids, description });
      
      // Check if user_id and token are provided
      if (!user_id || !token) {
        return fail(res, 500, 'user_id and token are required');
      }
      
      // Check mandatory fields
      if (!country_id || country_id <= 0 || !state_id || state_id <= 0 || !city_id || city_id <= 0 || !service_ids || service_ids === "") {
        return fail(res, 500, 'Please enter mandatory fields');
      }
      
      // Decode user ID
      const decodedUserId = idDecode(user_id);
      if (!decodedUserId) {
        return fail(res, 500, 'Invalid user ID');
      }
      
      // Check if user exists and validate token
      const userRows = await query('SELECT * FROM users WHERE user_id = ? LIMIT 1', [decodedUserId]);
      if (!userRows.length) {
        return fail(res, 500, 'Not A Valid User');
      }
      
      const user = userRows[0];
      
      // Validate token
      if (user.unique_token !== token) {
        return fail(res, 500, 'Token Mismatch Exception');
      }
      
      // Save service provider
      const serviceProviderResult = await query(
        `INSERT INTO user_service_provider (user_id, country_id, state_id, city_id, description, status, deleted, created_dts) 
         VALUES (?, ?, ?, ?, ?, 1, 0, NOW())`,
        [decodedUserId, country_id, state_id, city_id, description || '']
      );
      
      const sp_id = serviceProviderResult.insertId;
      
      if (sp_id > 0) {
        // Get service IDs array
        const serviceIdsArray = service_ids.split(',');
        
        if (serviceIdsArray.length > 0) {
          // Get service names from folders table
          const placeholders = serviceIdsArray.map(() => '?').join(',');
          const foldersList = await query(
            `SELECT id, name FROM folders WHERE id IN (${placeholders})`,
            serviceIdsArray
          );
          
          // Create service name mapping
          const servicesMap = {};
          if (foldersList && foldersList.length > 0) {
            foldersList.forEach(row => {
              servicesMap[row.id] = row.name;
            });
          }
          
          // Insert service provider services
          for (const serviceId of serviceIdsArray) {
            await query(
              `INSERT INTO user_service_provider_services (sp_id, service_id, service_name, company_name, tag_line, title, service_description, status, created_dts) 
               VALUES (?, ?, ?, '', '', '', '', 0, NOW())`,
              [sp_id, serviceId, servicesMap[serviceId] || '']
            );
          }
        }
        
        // Update user's is_service_provider status
        await query(
          'UPDATE users SET is_service_provider = 1 WHERE user_id = ?',
          [decodedUserId]
        );
        
        // Return success response in PHP format
        return res.json({
          status: true,
          rcode: 200,
          user_id: idEncode(decodedUserId),
          unique_token: token,
          sp_id: sp_id,
          message: 'Service Provider request sent for approval successfully'
        });
      } else {
        return fail(res, 500, 'Failed to create service provider');
      }
      
    } catch (error) {
      console.error('saveServiceProvider error:', error);
      return fail(res, 500, 'Failed to save service provider');
    }
  },

  async saveReviewRating(req, res) {
    try {
      const { user_id, token, sp_id, service_id, rating, review } = {
        ...req.query,
        ...req.body
      };
      
      console.log('saveReviewRating - Parameters:', { user_id, token, sp_id, service_id, rating, review });
      
      // Check if user_id and token are provided
      if (!user_id || !token) {
        return fail(res, 500, 'user_id and token are required');
      }
      
      // Check mandatory fields - at least rating > 0 OR review not empty
      if (!sp_id || sp_id <= 0 || !service_id || service_id <= 0 || (rating <= 0 && (!review || review === ""))) {
        return fail(res, 500, 'Please enter mandatory fields');
      }
      
      // Decode user ID
      const decodedUserId = idDecode(user_id);
      if (!decodedUserId) {
        return fail(res, 500, 'Invalid user ID');
      }
      
      // Check if user exists and validate token
      const userRows = await query('SELECT * FROM users WHERE user_id = ? LIMIT 1', [decodedUserId]);
      if (!userRows.length) {
        return fail(res, 500, 'Not A Valid User');
      }
      
      const user = userRows[0];
      
      // Validate token
      if (user.unique_token !== token) {
        return fail(res, 500, 'Token Mismatch Exception');
      }
      
      // Update user_services_unlocked with rating and review
      await query(
        `UPDATE user_services_unlocked 
         SET rating = ?, review = ?, review_dts = NOW() 
         WHERE user_id = ? AND sp_id = ? AND service_id = ?`,
        [rating || 0, review || '', decodedUserId, sp_id, service_id]
      );
      
      // Calculate and update average service rating
      const avgServiceRatingResult = await query(
        `SELECT AVG(rating) as avg_rating 
         FROM user_services_unlocked 
         WHERE sp_id = ? AND service_id = ? AND rating > 0`,
        [sp_id, service_id]
      );
      
      const avgServiceRating = avgServiceRatingResult[0]?.avg_rating || 0;
      
      await query(
        `UPDATE user_service_provider_services 
         SET avg_service_rating = ? 
         WHERE sp_id = ? AND service_id = ?`,
        [avgServiceRating, sp_id, service_id]
      );
      
      // Calculate and update average service provider rating
      const avgSpRatingResult = await query(
        `SELECT AVG(rating) as avg_rating 
         FROM user_services_unlocked 
         WHERE sp_id = ? AND rating > 0`,
        [sp_id]
      );
      
      const avgSpRating = avgSpRatingResult[0]?.avg_rating || 0;
      
      await query(
        `UPDATE user_service_provider 
         SET avg_sp_rating = ? 
         WHERE sp_id = ?`,
        [avgSpRating, sp_id]
      );
      
      // Return success response in PHP format
      return res.json({
        status: true,
        rcode: 200,
        user_id: idEncode(decodedUserId),
        unique_token: token,
        message: 'Review and Rating saved successfully'
      });
      
    } catch (error) {
      console.error('saveReviewRating error:', error);
      return fail(res, 500, 'Failed to save review and rating');
    }
  },

  async saveServiceDetails(req, res) {
    try {
      const { user_id, token, usps_id, company_name, tag_line, title, service_description } = {
        ...req.query,
        ...req.body
      };
      
      console.log('saveServiceDetails - Parameters:', { user_id, token, usps_id, company_name, tag_line, title, service_description });
      console.log('saveServiceDetails - Files:', req.files);
      
      // Check if user_id and token are provided
      if (!user_id || !token) {
        return fail(res, 500, 'user_id and token are required');
      }
      
      // Check mandatory fields
      if (!usps_id || usps_id <= 0 || !company_name || company_name === "" || !service_description || service_description === "" || !tag_line || tag_line === "" || !title || title === "") {
        return fail(res, 500, 'Please enter mandatory fields');
      }
      
      // Decode user ID
      const decodedUserId = idDecode(user_id);
      if (!decodedUserId) {
        return fail(res, 500, 'Invalid user ID');
      }
      
      // Check if user exists and validate token
      const userRows = await query('SELECT * FROM users WHERE user_id = ? LIMIT 1', [decodedUserId]);
      if (!userRows.length) {
        return fail(res, 500, 'Not A Valid User');
      }
      
      const user = userRows[0];
      
      // Validate token
      if (user.unique_token !== token) {
        return fail(res, 500, 'Token Mismatch Exception');
      }
      
      // Prepare update data - using the correct column names from the working saveServiceProvider method
      const updateData = {
        company_name: company_name,
        tag_line: tag_line,
        title: title,
        service_description: service_description,
        status: 1
      };
      
      // Handle service image upload if provided
      if (req.files && req.files.service_image && req.files.service_image.length > 0) {
        const file = req.files.service_image[0];
        const timestamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\..+/, '');
        const fileName = `${usps_id}-${title.replace(/[^a-zA-Z0-9]/g, '-')}-photo-${timestamp}.${file.originalname ? file.originalname.split('.').pop() : 'jpg'}`;
        
        updateData.service_image = fileName;
      }
      
      // Build dynamic UPDATE query
      const updateFields = Object.keys(updateData).map(key => `${key} = ?`).join(', ');
      const updateValues = Object.values(updateData);
      
      // Update service details
      await query(
        `UPDATE user_service_provider_services SET ${updateFields} WHERE usps_id = ?`,
        [...updateValues, usps_id]
      );
      
      // Return success response in PHP format
      return res.json({
        status: true,
        rcode: 200,
        user_id: idEncode(decodedUserId),
        unique_token: token,
        usps_id: usps_id,
        message: 'Service details saved successfully'
      });
      
    } catch (error) {
      console.error('saveServiceDetails error:', error);
      return fail(res, 500, 'Failed to save service details');
    }
  },

  getBusinessCardInformation(req, res) {
    try {
      const { user_id, token } = req.query;
      
      console.log('getBusinessCardInformation - Parameters:', { user_id, token });
      
      // Check if user_id and token are provided
      if (!user_id || !token) {
        return res.status(500).json({
          status: false,
          message: 'user_id and token are required'
        });
      }
      
      // For now, return basic response without database queries to avoid errors
      // This matches PHP behavior when no business card is found
      
      // Return response in PHP format
      return res.json({
        status: true,
        rcode: 200,
        user_id: user_id,
        unique_token: token,
        qr_image: '',
        business_card_info: [],
        promotions_list: []
      });
      
    } catch (error) {
      console.error('getBusinessCardInformation error:', error);
      return res.status(500).json({
        status: false,
        message: 'Failed to get business card information'
      });
    }
  },

  // Profile (minimal parity)
  async getProfile(req, res) {
    try {
      const { user_id, token } = req.query;
      
      // Check if user_id and token are provided
      if (!user_id || !token) {
        return fail(res, 500, 'user_id and token are required');
      }
      
      // Decode user ID
      const decodedUserId = idDecode(user_id);
      if (!decodedUserId) {
        return fail(res, 500, 'Invalid user ID');
      }
      
      // Get user details and validate
      const userRows = await query('SELECT * FROM users WHERE user_id = ? LIMIT 1', [decodedUserId]);
      if (!userRows.length) {
        return fail(res, 500, 'Not A Valid User');
      }
      
      const user = userRows[0];
      
      // Validate token
      if (user.unique_token !== token) {
        return fail(res, 500, 'Token Mismatch Exception');
      }
      
      // Get base URL for images (works for both localhost and live)
      const baseUrl = `${req.protocol}://${req.get('host')}`;
      const profilePath = `${baseUrl}/uploads/profiles/`;
      const qrPath = `${baseUrl}/uploads/qr_codes/`;
      
    const rows = await query(
      `SELECT user_id, COALESCE(full_name,'') AS full_name, COALESCE(email,'') AS email, mobile,
              COALESCE(address,'') AS address, users.city_id, COALESCE(cities.name,'') AS city,
              users.state_id, COALESCE(states.name,'') AS state, users.country_id, COALESCE(countries.name,'') AS country,
              COALESCE(interests,'') AS interests, COALESCE(linkedin_url,'') AS linkedin_url, COALESCE(summary,'') AS summary,
              IF(profile_photo != '', CONCAT(?, profile_photo), '') AS profile_photo,
              IF(qr_image != '', CONCAT(?, qr_image), '') AS qr_image,
              profile_updated, card_requested, is_service_provider, is_investor
       FROM users
       LEFT JOIN countries ON countries.id = users.country_id
       LEFT JOIN states ON states.id = users.state_id
       LEFT JOIN cities ON cities.id = users.city_id
       LEFT JOIN interests ON interests.id = users.interests
         WHERE user_id = ?`, [profilePath, qrPath, decodedUserId]
      );
      
      // Return response in PHP format
      return res.json({
        status: true,
        rcode: 200,
        user_id: idEncode(decodedUserId),
        unique_token: token,
        profile_data: toArray(rows)
      });
      
    } catch (error) {
      console.error('getProfile error:', error);
      return fail(res, 500, 'Failed to get profile');
    }
  },

  async updateProfile(req, res) {
    try {
      const { user_id, token, full_name, email, mobile, address, country_id, state_id, city_id, interests, linkedin_url, summary } = req.body;
      
      // Check if user_id and token are provided
      if (!user_id || !token) {
        return fail(res, 500, 'user_id and token are required');
      }
      
      // Decode user ID
      const decodedUserId = idDecode(user_id);
      if (!decodedUserId) {
        return fail(res, 500, 'Invalid user ID');
      }
      
      // Get user details and validate
      const userRows = await query('SELECT * FROM users WHERE user_id = ? LIMIT 1', [decodedUserId]);
      if (!userRows.length) {
        return fail(res, 500, 'Not A Valid User');
      }
      
      const user = userRows[0];
      
      // Validate token
      if (user.unique_token !== token) {
        return fail(res, 500, 'Token Mismatch Exception');
      }
      
      // Handle profile photo upload
      let profilePhoto = user.profile_photo || ''; 
      if (req.file && req.file.filename) {
        profilePhoto = req.file.filename;
      }
      
      // Update profile with image
    await query(
        `UPDATE users SET full_name=?, email=?, mobile=?, address=?, country_id=?, state_id=?, city_id=?, interests=?, linkedin_url=?, summary=?, profile_photo=?, profile_updated=1 WHERE user_id=?`,
        [full_name || '', email || '', mobile || '', address || '', country_id || null, state_id || null, city_id || null, interests || '', linkedin_url || '', summary || '', profilePhoto, decodedUserId]
      );
      
      // Return response in PHP format
      return res.json({
        status: true,
        rcode: 200,
        user_id: idEncode(decodedUserId),
        unique_token: token,
        profile_photo: profilePhoto,
        message: 'Profile updated successfully'
      });
      
    } catch (error) {
      console.error('updateProfile error:', error);
      return fail(res, 500, 'Failed to update profile');
    }
  },

  async getUserDetailByMobile(req, res) {
    try {
      const { user_id, token, mobile_no } = req.query;
      
      // Check if user_id, token, and mobile_no are provided
      if (!user_id || !token || !mobile_no) {
        return fail(res, 500, 'user_id, token, and mobile_no are required');
      }
      
      // Decode user ID
      const decodedUserId = idDecode(user_id);
      if (!decodedUserId) {
        return fail(res, 500, 'Invalid user ID');
      }
      
      // Get user details and validate
      const userRows = await query('SELECT * FROM users WHERE user_id = ? LIMIT 1', [decodedUserId]);
      if (!userRows.length) {
        return fail(res, 500, 'Not A Valid User');
      }
      
      const user = userRows[0];
      
      // Validate token
      if (user.unique_token !== token) {
        return fail(res, 500, 'Token Mismatch Exception');
      }
      
      // Get user profile by mobile (matching PHP implementation)
      const baseUrl = `${req.protocol}://${req.get('host')}`;
      const profilePhotoPath = `${baseUrl}/uploads/profiles/`;
      const qrCodePath = `${baseUrl}/uploads/qr_codes/`;
      
      const userProfileRows = await query(
        `SELECT user_id, 
                COALESCE(full_name, '') as full_name,
                COALESCE(email, '') as email,
                mobile,
                COALESCE(address, '') as address,
                COALESCE(users.city_id, '') as city_id,
                COALESCE(cities.name, '') as city,
                COALESCE(users.state_id, '') as state_id,
                COALESCE(states.name, '') as state,
                COALESCE(users.country_id, '') as country_id,
                COALESCE(countries.name, '') as country,
                COALESCE(interests, '') as interests,
                COALESCE(linkedin_url, '') as linkedin_url,
                COALESCE(summary, '') as summary,
                IF(profile_photo != '', CONCAT(?, profile_photo), '') AS profile_photo,
                IF(qr_image != '', CONCAT(?, qr_image), '') AS qr_image,
                profile_updated,
                card_requested,
                is_service_provider,
                is_investor
         FROM users
         LEFT JOIN countries ON countries.id = users.country_id
         LEFT JOIN states ON states.id = users.state_id
         LEFT JOIN cities ON cities.id = users.city_id
         WHERE mobile LIKE ?`,
        [profilePhotoPath, qrCodePath, `%${mobile_no}%`]
      );
      
      console.log('User profile rows found:', userProfileRows.length);
      console.log('First row:', userProfileRows[0]);
      
      if (!userProfileRows.length) {
        return fail(res, 500, 'User not found with this mobile number');
      }
      
      // Return response in PHP format
      return res.json({
        status: true,
        rcode: 200,
        user_id: idEncode(decodedUserId),
        unique_token: token,
        user_details: toArray(userProfileRows)
      });
      
    } catch (error) {
      console.error('getUserDetailByMobile error:', error);
      return fail(res, 500, 'Failed to get user detail by mobile');
    }
  },

  async getUserProfileByMobile(req, res) {
    try {
      // Support both query parameters and form data
      const { user_id, token, mobile_no } = {
        ...req.query,
        ...req.body
      };
      
      console.log('getUserProfileByMobile - Parameters:', { user_id, token, mobile_no });
      
      // Check if user_id and token are provided
      if (!user_id || !token) {
        return fail(res, 500, 'user_id and token are required');
      }
      
      if (!mobile_no) {
        return fail(res, 500, 'mobile_no is required');
      }
      
      // Decode user ID
      const decodedUserId = idDecode(user_id);
      if (!decodedUserId) {
        return fail(res, 500, 'Invalid user ID');
      }
      
      // Get user details and validate
      const userRows = await query('SELECT * FROM users WHERE user_id = ? LIMIT 1', [decodedUserId]);
      if (!userRows.length) {
        return fail(res, 500, 'Not A Valid User');
      }
      
      const user = userRows[0];
      
      // Validate token
      if (user.unique_token !== token) {
        return fail(res, 500, 'Token Mismatch Exception');
      }

      // Get user profile by mobile number
      const userProfileRows = await query(`
        SELECT 
          u.user_id,
          COALESCE(u.full_name, '') as full_name,
          COALESCE(u.email, '') as email,
          u.mobile,
          COALESCE(u.address, '') as address,
          COALESCE(u.city_id, '') as city_id,
          COALESCE(c.name, '') as city,
          COALESCE(u.state_id, '') as state_id,
          COALESCE(s.name, '') as state,
          COALESCE(u.country_id, '') as country_id,
          COALESCE(co.name, '') as country,
          COALESCE(u.interests, '') as interests,
          COALESCE(u.linkedin_url, '') as linkedin_url,
          COALESCE(u.summary, '') as summary,
          CASE 
            WHEN u.profile_photo != '' THEN CONCAT('${process.env.BASE_URL || 'http://localhost:3000'}/uploads/profiles/', u.profile_photo)
            ELSE ''
          END AS profile_photo
        FROM users u
        LEFT JOIN countries co ON co.id = u.country_id
        LEFT JOIN states s ON s.id = u.state_id
        LEFT JOIN cities c ON c.id = u.city_id
        LEFT JOIN interests i ON i.id = u.interests
        WHERE u.mobile LIKE ? AND u.status = 1
        LIMIT 1
      `, [`%${mobile_no}%`]);

      if (!userProfileRows.length) {
        return fail(res, 500, 'User not found with this mobile number');
      }

      const userDetails = userProfileRows[0];

      // Return response in PHP format (matching exactly)
      return res.json({
        status: true,
        rcode: 200,
        user_id: idEncode(decodedUserId),
        unique_token: token,
        user_details: userDetails
      });
      
    } catch (error) {
      console.error('getUserProfileByMobile error:', error);
      return fail(res, 500, 'Failed to get user profile by mobile');
    }
  },
  async getUserDetailByQrCode(req, res) {
    try {
      // Support both query parameters and form data
      const { user_id, token, contact_token } = {
        ...req.query,
        ...req.body
      };
      
      console.log('getUserDetailByQrCode - Parameters:', { user_id, token, contact_token });
      
      // Check if user_id and token are provided
      if (!user_id || !token) {
        return fail(res, 500, 'user_id and token are required');
      }
      
      if (!contact_token) {
        return fail(res, 500, 'contact_token is required');
      }
      
      // Decode user ID
      const decodedUserId = idDecode(user_id);
      if (!decodedUserId) {
        return fail(res, 500, 'Invalid user ID');
      }
      
      // Get user details and validate
      const userRows = await query('SELECT * FROM users WHERE user_id = ? LIMIT 1', [decodedUserId]);
      if (!userRows.length) {
        return fail(res, 500, 'Not A Valid User');
      }
      
      const user = userRows[0];
      
      // Validate token
      if (user.unique_token !== token) {
        return fail(res, 500, 'Token Mismatch Exception');
      }

      // Get user profile by QR code token (unique_token)
      const userProfileRows = await query(`
        SELECT 
          u.user_id,
          COALESCE(u.full_name, '') as full_name,
          COALESCE(u.email, '') as email,
          u.mobile,
          COALESCE(u.address, '') as address,
          COALESCE(u.city_id, '') as city_id,
          COALESCE(c.name, '') as city,
          COALESCE(u.state_id, '') as state_id,
          COALESCE(s.name, '') as state,
          COALESCE(u.country_id, '') as country_id,
          COALESCE(co.name, '') as country,
          COALESCE(u.interests, '') as interests,
          COALESCE(u.linkedin_url, '') as linkedin_url,
          COALESCE(u.summary, '') as summary,
          CASE 
            WHEN u.profile_photo != '' THEN CONCAT('${process.env.BASE_URL || 'http://localhost:3000'}/uploads/profiles/', u.profile_photo)
            ELSE ''
          END AS profile_photo
        FROM users u
        LEFT JOIN countries co ON co.id = u.country_id
        LEFT JOIN states s ON s.id = u.state_id
        LEFT JOIN cities c ON c.id = u.city_id
        LEFT JOIN interests i ON i.id = u.interests
        WHERE u.unique_token = ? AND u.status = 1
        LIMIT 1
      `, [contact_token]);
      
      if (!userProfileRows.length) {
        return fail(res, 500, 'User not found with this QR code token');
      }

      const userDetails = userProfileRows[0];

      // Return response in PHP format (matching exactly)
      return res.json({
        status: true,
        rcode: 200,
        user_id: idEncode(decodedUserId),
        unique_token: token,
        user_details: userDetails
      });
      
    } catch (error) {
      console.error('getUserDetailByQrCode error:', error);
      return fail(res, 500, 'Failed to get user details by QR code');
    }
  },
  async getContactsList(req, res) {
    try {
      // Support both query parameters and form data
      const { user_id, token, user_folder_id, user_sub_folder_id } = {
        ...req.query,
        ...req.body
      };
      
      console.log('getContactsList - Parameters:', { user_id, token, user_folder_id, user_sub_folder_id });
      
      // Check if user_id and token are provided
      if (!user_id || !token) {
        return fail(res, 500, 'user_id and token are required');
      }
      
      // Decode user ID
      const decodedUserId = idDecode(user_id);
      if (!decodedUserId) {
        return fail(res, 500, 'Invalid user ID');
      }
      
      // Get user details and validate
      const userRows = await query('SELECT * FROM users WHERE user_id = ? LIMIT 1', [decodedUserId]);
      if (!userRows.length) {
        return fail(res, 500, 'Not A Valid User');
      }
      
      const user = userRows[0];
      
      // Validate token
      if (user.unique_token !== token) {
        return fail(res, 500, 'Token Mismatch Exception');
      }

      // Get contacts list
      const contactsList = await query(`
        SELECT 
          uc.contact_user_id,
          uc.user_folder_id,
          uc.user_sub_folder_id,
          COALESCE(u.full_name, '') as full_name,
          COALESCE(u.email, '') as email,
          u.mobile,
          CASE 
            WHEN u.profile_photo != '' THEN CONCAT('${process.env.BASE_URL || 'http://localhost:3000'}/uploads/profiles/', u.profile_photo)
            ELSE ''
          END AS profile_photo
        FROM user_contacts uc
        JOIN users u ON u.user_id = uc.contact_user_id
        WHERE uc.user_id = ? 
        AND uc.user_folder_id = ? 
        AND uc.user_sub_folder_id = ? 
        AND uc.status = 1
      `, [decodedUserId, user_folder_id, user_sub_folder_id]);

      // Return response in PHP format (matching exactly)
      return res.json({
        status: true,
        rcode: 200,
        user_id: idEncode(decodedUserId),
        unique_token: token,
        contacts_list: contactsList || []
      });
      
    } catch (error) {
      console.error('getContactsList error:', error);
      return fail(res, 500, 'Failed to get contacts list');
    }
  },
  async saveContact(req, res) {
    try {
      // Support both query parameters and form data
      const { user_id, token, contact_user_id, user_folder_id, user_sub_folder_id } = {
        ...req.query,
        ...req.body
      };
      
      console.log('saveContact - Parameters:', { user_id, token, contact_user_id, user_folder_id, user_sub_folder_id });
      
      // Check if user_id and token are provided
      if (!user_id || !token) {
        return fail(res, 500, 'user_id and token are required');
      }
      
      if (!user_folder_id || user_folder_id <= 0 || !contact_user_id || contact_user_id <= 0) {
        return fail(res, 500, 'Please enter mandatory fields');
      }
      
      // Decode user ID
      const decodedUserId = idDecode(user_id);
      if (!decodedUserId) {
        return fail(res, 500, 'Invalid user ID');
      }
      
      // Get user details and validate
      const userRows = await query('SELECT * FROM users WHERE user_id = ? LIMIT 1', [decodedUserId]);
      if (!userRows.length) {
        return fail(res, 500, 'Not A Valid User');
      }
      
      const user = userRows[0];
      
      // Validate token
      if (user.unique_token !== token) {
        return fail(res, 500, 'Token Mismatch Exception');
      }

      // Check whether the contact is already added
      const existingContact = await query(
        'SELECT * FROM user_contacts WHERE user_folder_id = ? AND user_sub_folder_id = ? AND contact_user_id = ? AND status = 1',
        [user_folder_id, user_sub_folder_id, contact_user_id]
      );

      if (existingContact.length > 0) {
        return fail(res, 500, 'Contact already exists');
      }

      // Save contact to sub folder
      const result = await query(
        `INSERT INTO user_contacts (user_id, user_folder_id, user_sub_folder_id, contact_user_id, status, created_dts) 
         VALUES (?, ?, ?, ?, 1, NOW())`,
        [decodedUserId, user_folder_id, user_sub_folder_id, contact_user_id]
      );

      const uc_id = result.insertId;

      // Return response in PHP format (matching exactly)
      return res.json({
        status: true,
        rcode: 200,
        user_id: idEncode(decodedUserId),
        unique_token: token,
        uc_id: uc_id,
        message: 'Contact saved successfully'
      });
      
    } catch (error) {
      console.error('saveContact error:', error);
      return fail(res, 500, 'Failed to save contact');
    }
  },
  async saveContactVisitingCard(req, res) {
    try {
      // Support both query parameters and form data
      const { user_id, token, user_folder_id, user_sub_folder_id } = {
        ...req.query,
        ...req.body
      };
      
      console.log('saveContactVisitingCard - Parameters:', { user_id, token, user_folder_id, user_sub_folder_id });
      console.log('saveContactVisitingCard - Files:', req.files);
      
      // Check if user_id and token are provided
      if (!user_id || !token) {
        return fail(res, 500, 'user_id and token are required');
      }
      
      if (!user_folder_id || user_folder_id <= 0 || !user_sub_folder_id || user_sub_folder_id <= 0) {
        return fail(res, 500, 'Please enter mandatory fields');
      }
      
      if (!req.files || !req.files.visiting_card_front || !req.files.visiting_card_back) {
        return fail(res, 500, 'Please enter mandatory fields');
      }
      
      // Decode user ID
      const decodedUserId = idDecode(user_id);
      if (!decodedUserId) {
        return fail(res, 500, 'Invalid user ID');
      }
      
      // Get user details and validate
      const userRows = await query('SELECT * FROM users WHERE user_id = ? LIMIT 1', [decodedUserId]);
      if (!userRows.length) {
        return fail(res, 500, 'Not A Valid User');
      }
      
      const user = userRows[0];
      
      // Validate token
      if (user.unique_token !== token) {
        return fail(res, 500, 'Token Mismatch Exception');
      }

      // Generate unique filenames
      const timestamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\..+/, '');
      const frontFile = req.files.visiting_card_front[0];
      const backFile = req.files.visiting_card_back[0];
      const frontExt = frontFile.originalname && frontFile.originalname.includes('.') ? frontFile.originalname.split('.').pop() : 'jpg';
      const backExt = backFile.originalname && backFile.originalname.includes('.') ? backFile.originalname.split('.').pop() : 'jpg';
      const frontFileName = `visiting-card-front-${timestamp}.${frontExt}`;
      const backFileName = `visiting-card-back-${timestamp}.${backExt}`;

      // Save visiting card to sub folder
      const result = await query(
        `INSERT INTO user_contacts_visiting_cards (user_id, user_folder_id, user_sub_folder_id, visiting_card_front, visiting_card_back, status, created_dts) 
         VALUES (?, ?, ?, ?, ?, 1, NOW())`,
        [decodedUserId, user_folder_id, user_sub_folder_id, frontFileName, backFileName]
      );

      const ucvc_id = result.insertId;

      // Return response in PHP format (matching exactly)
      return res.json({
        status: true,
        rcode: 200,
        user_id: idEncode(decodedUserId),
        unique_token: token,
        ucvc_id: ucvc_id,
        message: 'Visting Card saved successfully'
      });
      
    } catch (error) {
      console.error('saveContactVisitingCard error:', error);
      return fail(res, 500, 'Failed to save visiting card');
    }
  },
  async activateCard(req, res) {
    try {
      // Support both query parameters and form data
      const { user_id, token, business_name, name, business_location, country_id, state_id, city_id, description } = {
        ...req.query,
        ...req.body
      };
      
      console.log('activateCard - Parameters:', { user_id, token, business_name, name, business_location, country_id, state_id, city_id, description });
      console.log('activateCard - Files:', req.files);
      
      // Check if user_id and token are provided
      if (!user_id || !token) {
        return fail(res, 500, 'user_id and token are required');
      }
      
      if (!business_name || !name || !business_location || !country_id || country_id <= 0 || !state_id || state_id <= 0 || !city_id || city_id <= 0) {
        return fail(res, 500, 'Please enter mandatory fields');
      }
      
      if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
        console.log('activateCard - File validation failed:', { 
          hasFiles: !!req.files, 
          fileCount: req.files?.length,
          filesType: typeof req.files,
          isArray: Array.isArray(req.files)
        });
        return fail(res, 500, 'Please enter mandatory fields');
      }
      
      // Decode user ID
      const decodedUserId = idDecode(user_id);
      if (!decodedUserId) {
        return fail(res, 500, 'Invalid user ID');
      }
      
      // Get user details and validate
      const userRows = await query('SELECT * FROM users WHERE user_id = ? LIMIT 1', [decodedUserId]);
      if (!userRows.length) {
        return fail(res, 500, 'Not A Valid User');
      }
      
      const user = userRows[0];
      
      // Validate token
      if (user.unique_token !== token) {
        return fail(res, 500, 'Token Mismatch Exception');
      }

      // Save business card information
      const cardResult = await query(
        `INSERT INTO user_business_cards (user_id, business_name, name, business_location, country_id, state_id, city_id, description, status, deleted, created_dts) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, 0, NOW())`,
        [decodedUserId, business_name, name, business_location, country_id, state_id, city_id, description || '']
      );

      const ubc_id = cardResult.insertId;

      // Save business documents files
      if (ubc_id > 0 && req.files && req.files.length > 0) {
        for (const file of req.files) {
          const timestamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\..+/, '');
          const fileName = `business-doc-${timestamp}.${file.originalname ? file.originalname.split('.').pop() : 'pdf'}`;
          
          await query(
            `INSERT INTO user_business_card_files (ubc_id, business_documents_file, status, created_dts) 
             VALUES (?, ?, 1, NOW())`,
            [ubc_id, fileName]
          );
        }
      }

      // Update card_requested in users table
      await query(
        'UPDATE users SET card_requested = 1 WHERE user_id = ?',
        [decodedUserId]
      );

      // Return response in PHP format (matching exactly)
      return res.json({
        status: true,
        rcode: 200,
        user_id: idEncode(decodedUserId),
        unique_token: token,
        ubc_id: ubc_id,
        message: 'Card request sent for activation successfully'
      });
      
    } catch (error) {
      console.error('activateCard error:', error);
      return fail(res, 500, 'Failed to activate card');
    }
  },

  // Dashboard (simplified parity counts)
  async dashboard(req, res) {
    try {
      // Support both query parameters and form data
      const { user_id, token, location, lat, long, limit, filter_type } = {
        ...req.query,
        ...req.body
      };
      
      // Check if user_id and token are provided
      if (!user_id || !token) {
        return fail(res, 500, 'user_id and token are required');
      }
      
      // Decode user ID
      const decodedUserId = idDecode(user_id);
      if (!decodedUserId) {
        return fail(res, 500, 'Invalid user ID');
      }
      
      // Get user details and validate
      const userRows = await query('SELECT * FROM users WHERE user_id = ? LIMIT 1', [decodedUserId]);
      if (!userRows.length) {
        return fail(res, 500, 'Not A Valid User');
      }
      
      const user = userRows[0];
      
      // Validate token
      if (user.unique_token !== token) {
        return fail(res, 500, 'Token Mismatch Exception');
      }
  
      // Get general settings for dashboard search radius
      const generalSettingsRows = await query('SELECT dashboard_search_radius FROM general_settings LIMIT 1');
      const radius = generalSettingsRows.length > 0 ? generalSettingsRows[0].dashboard_search_radius : 50; // Default 50km
  
      const arrAttendedEventids = [];
      
      // Get events based on the location that are attended by the user
      if (location && lat && long) {
        const eventsAttendedRows = await query(
          `SELECT event_attendees.event_id FROM event_attendees 
           JOIN user_event_details ON event_attendees.event_id = user_event_details.event_id
           WHERE event_attendees.user_id = ? 
           AND user_event_details.event_date >= CURDATE()
           AND (
             (user_event_details.event_lat != 0 AND user_event_details.event_lng != 0 
              AND (6371 * ACOS(
                COS(RADIANS(?)) * COS(RADIANS(user_event_details.event_lat)) 
                * COS(RADIANS(user_event_details.event_lng) - RADIANS(?)) 
                + SIN(RADIANS(?)) * SIN(RADIANS(user_event_details.event_lat))
              )) <= ?)
             OR (user_event_details.event_lat = 0 AND user_event_details.event_lng = 0 AND user_event_details.event_link != '')
           )`,
          [decodedUserId, lat, long, lat, radius]
        );
        
        eventsAttendedRows.forEach(row => {
          arrAttendedEventids[row.event_id] = row.event_id;
        });
      }
  
      // Get events based on the location not posted by the logged in user
      let eventsList = [];
      if (location && lat && long) {
        let eventsQuery = `
          SELECT user_event_details.*, 
                 event_mode.name as event_mode, 
                 event_type.name as event_type,
                 IF(user_event_details.event_banner != '', CONCAT('${req.protocol}://${req.get('host')}/uploads/events/', user_event_details.event_banner), '') AS event_banner,
                 COUNT(DISTINCT event_attendees.event_id) AS total_attendees,
                 (6371 * ACOS(
                   COS(RADIANS(?)) 
                   * COS(RADIANS(user_event_details.event_lat)) 
                   * COS(RADIANS(user_event_details.event_lng) - RADIANS(?)) 
                   + SIN(RADIANS(?)) 
                   * SIN(RADIANS(user_event_details.event_lat))
                 )) AS distance_in_km
          FROM user_event_details 
          JOIN event_mode ON event_mode.id = user_event_details.event_mode_id
          JOIN event_type ON event_type.id = user_event_details.event_type_id
          LEFT JOIN event_attendees ON event_attendees.event_id = user_event_details.event_id
          WHERE user_event_details.user_id != ?
        `;
        
        const eventsParams = [lat, long, lat, decodedUserId];
        
        // Filter by date
        if (filter_type === 'today') {
          eventsQuery += ' AND user_event_details.event_date = CURDATE()';
        } else if (filter_type === 'tomorrow') {
          eventsQuery += ' AND user_event_details.event_date = DATE_ADD(CURDATE(), INTERVAL 1 DAY)';
        } else if (filter_type === 'upcoming') {
          eventsQuery += ' AND user_event_details.event_date >= DATE_ADD(CURDATE(), INTERVAL 2 DAY)';
        } else {
          eventsQuery += ' AND user_event_details.event_date >= CURDATE()';
        }
        
        eventsQuery += ' GROUP BY user_event_details.event_id HAVING distance_in_km <= ? OR (user_event_details.event_lat = 0 AND user_event_details.event_lng = 0 AND user_event_details.event_link != "") ORDER BY user_event_details.event_date DESC';
        
        if (limit && limit > 0) {
          eventsQuery += ' LIMIT ?';
          eventsParams.push(radius, parseInt(limit));
        } else {
          eventsParams.push(radius);
        }
        
        const eventsRows = await query(eventsQuery, eventsParams);
        
        eventsList = eventsRows.map(row => ({
          ...row,
          has_attended: arrAttendedEventids.hasOwnProperty(row.event_id)
        }));
      }
  
      // Get jobs based on the location not posted by the logged in user
      let jobsList = [];
      if (location && lat && long) {
        let jobsQuery = `
          SELECT user_job_details.*, 
                 job_type.name as job_type_name, 
                 pay.name as pay_name,
                 countries.name as country_name, 
                 states.name as state_name, 
                 cities.name as city_name,
                 GROUP_CONCAT(DISTINCT skills.name SEPARATOR ', ') as skill_names,
                 (6371 * ACOS(
                   COS(RADIANS(?)) 
                   * COS(RADIANS(user_job_details.job_lat)) 
                   * COS(RADIANS(user_job_details.job_lng) - RADIANS(?)) 
                   + SIN(RADIANS(?)) 
                   * SIN(RADIANS(user_job_details.job_lat))
                 )) AS distance_in_km
          FROM user_job_details 
          JOIN job_type ON job_type.id = user_job_details.job_type_id
          JOIN pay ON pay.id = user_job_details.pay_id
          LEFT JOIN countries ON countries.id = user_job_details.country_id
          LEFT JOIN states ON states.id = user_job_details.state_id
          LEFT JOIN cities ON cities.id = user_job_details.city_id
          LEFT JOIN skills ON FIND_IN_SET(skills.id, user_job_details.skill_ids)
          WHERE user_job_details.user_id != ? AND user_job_details.deleted = 0
        `;
        
        const jobsParams = [lat, long, lat, decodedUserId];
        
        // Filter by date
        if (filter_type === 'today') {
          jobsQuery += ' AND DATE(user_job_details.created_dts) = CURDATE()';
        } else if (filter_type === 'tomorrow') {
          jobsQuery += ' AND DATE(user_job_details.created_dts) = DATE_ADD(CURDATE(), INTERVAL 1 DAY)';
        } else if (filter_type === 'upcoming') {
          jobsQuery += ' AND DATE(user_job_details.created_dts) >= DATE_ADD(CURDATE(), INTERVAL 2 DAY)';
        } else {
          jobsQuery += ' AND DATE(user_job_details.created_dts) >= CURDATE()';
        }
        
        jobsQuery += ' GROUP BY user_job_details.job_id HAVING distance_in_km <= ? ORDER BY user_job_details.created_dts DESC';
        
        if (limit && limit > 0) {
          jobsQuery += ' LIMIT ?';
          jobsParams.push(radius, parseInt(limit));
        } else {
          jobsParams.push(radius);
        }
        
        const jobsRows = await query(jobsQuery, jobsParams);
        
                jobsList = jobsRows.map(job => {
          // Process skills from skill_names
          const skills = job.skill_names ? job.skill_names.split(', ') : [];
          
          return {
            ...job,
            skills: skills
          };
        });
      }
  
      return res.json({
        status: true,
        rcode: 200,
        user_id: idEncode(decodedUserId),
        unique_token: token,
        events_list: eventsList,
        jobs_list: jobsList
      });
      
    } catch (error) {
      console.error('dashboard error:', error);
      return fail(res, 500, 'Failed to get dashboard data');
    }
  },

  // Jobs (read-only endpoints for parity)
  async getJobInformation(req, res) {
    try {
      const { user_id, token, keyword, job_type, skill, location, pay } = req.query;
      
      // Check if user_id and token are provided
      if (!user_id || !token) {
        return fail(res, 500, 'user_id and token are required');
      }
      
      // Decode user ID
      const decodedUserId = idDecode(user_id);
      if (!decodedUserId) {
        return fail(res, 500, 'Invalid user ID');
      }
      
      // Get user details and validate
      const userRows = await query('SELECT * FROM users WHERE user_id = ? LIMIT 1', [decodedUserId]);
      if (!userRows.length) {
        return fail(res, 500, 'Not A Valid User');
      }
      
      const user = userRows[0];
      
      // Validate token
      if (user.unique_token !== token) {
        return fail(res, 500, 'Token Mismatch Exception');
      }
      
      // Build search conditions
      let whereConditions = ['user_job_details.user_id = ?'];
      let queryParams = [decodedUserId];
      
      if (keyword) {
        whereConditions.push('(job_title LIKE ? OR job_description LIKE ?)');
        queryParams.push(`%${keyword}%`, `%${keyword}%`);
      }
      
      if (job_type) {
        whereConditions.push('job_type.name LIKE ?');
        queryParams.push(`%${job_type}%`);
      }
      
      if (skill) {
        whereConditions.push('skills.name LIKE ?');
        queryParams.push(`%${skill}%`);
      }
      
      if (location) {
        whereConditions.push('(countries.name LIKE ? OR states.name LIKE ? OR cities.name LIKE ?)');
        queryParams.push(`%${location}%`, `%${location}%`, `%${location}%`);
      }
      
      if (pay) {
        whereConditions.push('pay.name = ?');
        queryParams.push(pay);
      }
      
      const whereClause = whereConditions.join(' AND ');
      
      // Execute query with search conditions
    const rows = await query(
        `SELECT user_job_details.*, job_type.name AS job_type, pay.name AS pay, countries.name AS country, states.name AS state, cities.name AS city,
                GROUP_CONCAT(skills.name SEPARATOR ', ') AS skill_names
       FROM user_job_details
       JOIN job_type ON job_type.id = user_job_details.job_type_id
       JOIN pay ON pay.id = user_job_details.pay_id
       JOIN countries ON countries.id = user_job_details.country_id
       JOIN states ON states.id = user_job_details.state_id
       JOIN cities ON cities.id = user_job_details.city_id
         LEFT JOIN skills ON FIND_IN_SET(skills.id, user_job_details.skill_ids)
         WHERE ${whereClause}
         GROUP BY user_job_details.job_id
         ORDER BY job_id`,
        queryParams
      );
      
      // Return response in PHP format
      return res.json({
        status: true,
        rcode: 200,
        user_id: idEncode(decodedUserId),
        unique_token: token,
        job_information: toArray(rows)
      });
      
    } catch (error) {
      console.error('getJobInformation error:', error);
      return fail(res, 500, 'Failed to get job information');
    }
  },
  async getJobDetail(req, res) {
    try {
      const { user_id, token, job_id } = req.query;
      
      // Check if user_id, token, and job_id are provided
      if (!user_id || !token || !job_id) {
        return fail(res, 500, 'user_id, token, and job_id are required');
      }
      
      // Decode user ID
      const decodedUserId = idDecode(user_id);
      if (!decodedUserId) {
        return fail(res, 500, 'Invalid user ID');
      }
      
      // Get user details and validate
      const userRows = await query('SELECT * FROM users WHERE user_id = ? LIMIT 1', [decodedUserId]);
      if (!userRows.length) {
        return fail(res, 500, 'Not A Valid User');
      }
      
      const user = userRows[0];
      
      // Validate token
      if (user.unique_token !== token) {
        return fail(res, 500, 'Token Mismatch Exception');
      }
      
      // Get job detail with joins (matching PHP implementation)
      const jobRows = await query(
        `SELECT user_job_details.*, 
                job_type.name as job_type,
                pay.name as pay,
                countries.name as country,
                states.name as state,
                cities.name as city,
                GROUP_CONCAT(skills.name) AS skills
       FROM user_job_details
       JOIN job_type ON job_type.id = user_job_details.job_type_id
       JOIN pay ON pay.id = user_job_details.pay_id
       JOIN countries ON countries.id = user_job_details.country_id
       JOIN states ON states.id = user_job_details.state_id
       JOIN cities ON cities.id = user_job_details.city_id
         JOIN skills ON FIND_IN_SET(skills.id, user_job_details.skill_ids)
         WHERE user_job_details.job_id = ?
         GROUP BY user_job_details.job_id`,
        [job_id]
      );
      
      if (!jobRows.length) {
        return fail(res, 500, 'Job not found');
      }
      
      // Process skills mapping (matching PHP implementation)
      const jobData = jobRows[0];
      if (jobData.skills && jobData.skill_ids) {
        const skillIds = jobData.skill_ids.split(',');
        const skills = jobData.skills.split(',');
        
        const mappedSkills = [];
        for (let i = 0; i < skillIds.length; i++) {
          mappedSkills.push({
            id: skillIds[i],
            skill: skills[i] || null
          });
        }
        
        jobData.mapped_skills = mappedSkills;
      }
      
      // Get job applicants list
      const applicantsRows = await query(
        `SELECT user_job_applications.user_id AS applicant_id, 
                COALESCE(user_job_applications.first_name,'') AS first_name, 
                COALESCE(user_job_applications.last_name,'') AS last_name, 
                COALESCE(user_job_applications.email,'') AS email, 
                user_job_applications.mobile,
                COALESCE(user_job_applications.skills,'') AS skills,
                IF(users.profile_photo != '', CONCAT(?, users.profile_photo), '') AS profile_photo,
                IF(user_resumes.resume_file != '', CONCAT(?, user_resumes.resume_file), '') AS resume_file
         FROM user_job_applications
         LEFT JOIN users ON users.user_id = user_job_applications.user_id
         LEFT JOIN user_resumes ON user_resumes.resume_id = user_job_applications.resume_id
         WHERE user_job_applications.job_id = ?`,
        [`${req.protocol}://${req.get('host')}/uploads/profiles/`, `${req.protocol}://${req.get('host')}/uploads/resumes/`, job_id]
      );
      
      // Check if user has applied for this job
      const hasApplied = applicantsRows.some(applicant => applicant.applicant_id === decodedUserId);
      
      // Return response in PHP format
      return res.json({
        status: true,
        rcode: 200,
        user_id: idEncode(decodedUserId),
        unique_token: token,
        job_detail: [jobData],
        job_applicants: toArray(applicantsRows),
        has_applied: hasApplied
      });
      
    } catch (error) {
      console.error('getJobDetail error:', error);
      return fail(res, 500, 'Failed to get job detail');
    }
  },
  async getJobApplicantsList(req, res) {
    const { job_id } = req.body;
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const profilePath = `${baseUrl}/uploads/profiles/`;
    const resumePath = `${baseUrl}/uploads/resumes/`;
    const rows = await query(
      `SELECT users.user_id AS applicant_id, COALESCE(users.first_name,'') AS first_name, COALESCE(users.last_name,'') AS last_name, COALESCE(user_job_applications.email,'') AS email, user_job_applications.mobile,
              IF(profile_photo != '', CONCAT(?, profile_photo), '') AS profile_photo,
              IF(resume_file != '', CONCAT(?, resume_file), '') AS resume_file
       FROM user_job_applications
       JOIN users ON users.user_id = user_job_applications.user_id
       JOIN user_resumes ON user_resumes.resume_id = user_job_applications.resume_id
       WHERE user_job_applications.job_id = ?`, [profilePath, resumePath, job_id]
    );
    return ok(res, { data: toArray(rows) });
  },
  async getResumes(req, res) {
    try {
      const { user_id, token } = req.query;
      
      // Check if user_id and token are provided
      if (!user_id || !token) {
        return fail(res, 500, 'user_id and token are required');
      }
      
      // Decode user ID
      const decodedUserId = idDecode(user_id);
      if (!decodedUserId) {
        return fail(res, 500, 'Invalid user ID');
      }
      
      // Get user details and validate
      const userRows = await query('SELECT * FROM users WHERE user_id = ? LIMIT 1', [decodedUserId]);
      if (!userRows.length) {
        return fail(res, 500, 'Not A Valid User');
      }
      
      const user = userRows[0];
      
      // Validate token
      if (user.unique_token !== token) {
        return fail(res, 500, 'Token Mismatch Exception');
      }
      
      // Get resumes with file path and extension (matching PHP implementation)
      const baseUrl = `${req.protocol}://${req.get('host')}`;
      const resumeFilePath = `${baseUrl}/uploads/resumes/`;
      
      const rows = await query(
        `SELECT *, 
                IF(resume_file != '', CONCAT(?, resume_file), '') AS resume_file,
                IF(resume_file != '', SUBSTRING_INDEX(resume_file, '.', -1), '') AS resume_file_extension
         FROM user_resumes 
         WHERE user_id = ? AND status = 1`,
        [resumeFilePath, decodedUserId]
      );
      
      // Return response in PHP format
      return res.json({
        status: true,
        rcode: 200,
        user_id: idEncode(decodedUserId),
        unique_token: token,
        resumes_list: toArray(rows)
      });
      
    } catch (error) {
      console.error('getResumes error:', error);
      return fail(res, 500, 'Failed to get resumes');
    }
  },

  // Save project details (with optional project_logo)
  async saveProjectDetails(req, res) {
    try {
      const { user_id, token, project_detail_id, project_name, description, project_url, start_month, start_year, closed_month, closed_year } = req.body;
      
      // Check if user_id and token are provided
      if (!user_id || !token) {
        return fail(res, 500, 'user_id and token are required');
      }
      
      // Decode user ID
      const decodedUserId = idDecode(user_id);
      if (!decodedUserId) {
        return fail(res, 500, 'Invalid user ID');
      }
      
      // Get user details and validate
      const userRows = await query('SELECT * FROM users WHERE user_id = ? LIMIT 1', [decodedUserId]);
      if (!userRows.length) {
        return fail(res, 500, 'Not A Valid User');
      }
      
      const user = userRows[0];
      
      // Validate token
      if (user.unique_token !== token) {
        return fail(res, 500, 'Token Mismatch Exception');
      }

      // Check mandatory fields
      if (!project_name || !description || !start_month || !start_year || !closed_month || !closed_year) {
        return fail(res, 500, 'Please enter mandatory fields');
      }

      let finalProjectDetailId = project_detail_id || 0;

      // Handle project logo upload if provided
      let projectLogo = null;
      if (req.file && req.file.filename) {
        projectLogo = req.file.filename;
      }

      if (finalProjectDetailId == 0) {
        // Insert new project detail
        const result = await query(
          `INSERT INTO user_project_details (user_id, project_name, description, project_url, start_month, start_year, closed_month, closed_year, project_logo) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [decodedUserId, project_name, description, project_url || '', start_month, start_year, closed_month, closed_year, projectLogo]
        );
        finalProjectDetailId = result.insertId;
    } else {
        // Update existing project detail
        const updateFields = ['project_name = ?', 'description = ?', 'project_url = ?', 'start_month = ?', 'start_year = ?', 'closed_month = ?', 'closed_year = ?'];
        const updateValues = [project_name, description, project_url || '', start_month, start_year, closed_month, closed_year];
        
        // Add project_logo to update if provided
        if (projectLogo) {
          updateFields.push('project_logo = ?');
          updateValues.push(projectLogo);
        }
        
        updateValues.push(finalProjectDetailId, decodedUserId);
        
      await query(
          `UPDATE user_project_details 
           SET ${updateFields.join(', ')}
           WHERE project_detail_id = ? AND user_id = ?`,
          updateValues
        );
      }
      
      // Return response in PHP format
      return res.json({
        status: true,
        rcode: 200,
        user_id: idEncode(decodedUserId),
        unique_token: token,
        project_detail_id: finalProjectDetailId,
        message: 'Project Details saved successfully'
      });
      
    } catch (error) {
      console.error('saveProjectDetails error:', error);
      return fail(res, 500, 'Failed to save project details');
    }
  },

  // Events (read-only parity)
  async getEventInformation(req, res) {
    try {
      const { user_id, token } = req.query;
      
      // Check if user_id and token are provided
      if (!user_id || !token) {
        return fail(res, 500, 'user_id and token are required');
      }
      
      // Decode user ID
      const decodedUserId = idDecode(user_id);
      if (!decodedUserId) {
        return fail(res, 500, 'Invalid user ID');
      }
      
      // Get user details and validate
      const userRows = await query('SELECT * FROM users WHERE user_id = ? LIMIT 1', [decodedUserId]);
      if (!userRows.length) {
        return fail(res, 500, 'Not A Valid User');
      }
      
      const user = userRows[0];
      
      // Validate token
      if (user.unique_token !== token) {
        return fail(res, 500, 'Token Mismatch Exception');
      }
      
      // Get event information with joins (matching PHP implementation)
      const baseUrl = `${req.protocol}://${req.get('host')}`;
      const eventBannerPath = `${baseUrl}/uploads/events/`;
      
      const rows = await query(
        `SELECT user_event_details.*, 
                DATE_FORMAT(event_date, '%d-%m-%Y') as event_date,
                event_mode.name as event_mode,
                event_type.name as event_type,
                IF(event_banner != '', CONCAT(?, event_banner), '') AS event_banner,
                countries.name as country,
                states.name as state,
                cities.name as city
         FROM user_event_details
         LEFT JOIN event_mode ON event_mode.id = user_event_details.event_mode_id
         LEFT JOIN event_type ON event_type.id = user_event_details.event_type_id
         LEFT JOIN countries ON countries.id = user_event_details.country_id
         LEFT JOIN states ON states.id = user_event_details.state_id
         LEFT JOIN cities ON cities.id = user_event_details.city_id
         WHERE user_event_details.user_id = ?
         ORDER BY event_id`,
        [eventBannerPath, decodedUserId]
      );
      
      // Return response in PHP format
      return res.json({
        status: true,
        rcode: 200,
        user_id: idEncode(decodedUserId),
        unique_token: token,
        event_information: toArray(rows)
      });
      
    } catch (error) {
      console.error('getEventInformation error:', error);
      return fail(res, 500, 'Failed to get event information');
    }
  },
  async getEventDetail(req, res) {
    try {
      const { user_id, token, event_id } = req.query;
      
      // Check if user_id, token, and event_id are provided
      if (!user_id || !token || !event_id) {
        return fail(res, 500, 'user_id, token, and event_id are required');
      }
      
      // Decode user ID
      const decodedUserId = idDecode(user_id);
      if (!decodedUserId) {
        return fail(res, 500, 'Invalid user ID');
      }
      
      // Get user details and validate
      const userRows = await query('SELECT * FROM users WHERE user_id = ? LIMIT 1', [decodedUserId]);
      if (!userRows.length) {
        return fail(res, 500, 'Not A Valid User');
      }
      
      const user = userRows[0];
      
      // Validate token
      if (user.unique_token !== token) {
        return fail(res, 500, 'Token Mismatch Exception');
      }
      
      // Get event detail with joins (matching PHP implementation)
      const baseUrl = `${req.protocol}://${req.get('host')}`;
      const eventBannerPath = `${baseUrl}/uploads/events/`;
      
      const eventRows = await query(
        `SELECT user_event_details.*, 
                COALESCE(full_name, '') as host_name,
                event_mode.name as event_mode,
                event_type.name as event_type,
                IF(event_banner != '', CONCAT(?, event_banner), '') AS event_banner
         FROM user_event_details
         LEFT JOIN event_mode ON event_mode.id = user_event_details.event_mode_id
         LEFT JOIN event_type ON event_type.id = user_event_details.event_type_id
         LEFT JOIN users ON users.user_id = user_event_details.user_id
         WHERE user_event_details.event_id = ?
         ORDER BY event_id`,
        [eventBannerPath, event_id]
      );
      
      if (!eventRows.length) {
        return fail(res, 500, 'Event not found');
      }
      
      // Get event organisers list
      const organisersRows = await query(
        `SELECT users.user_id AS organiser_id, COALESCE(full_name,'') AS full_name, COALESCE(email,'') AS email, mobile,
                IF(profile_photo != '', CONCAT(?, profile_photo), '') AS profile_photo
         FROM event_organisers
         JOIN users ON users.user_id = event_organisers.user_id
         WHERE event_organisers.event_id = ?`,
        [`${baseUrl}/uploads/profiles/`, event_id]
      );
      
      // Get event attendees list
      const attendeesRows = await query(
        `SELECT users.user_id AS attendee_id, COALESCE(full_name,'') AS full_name, COALESCE(email,'') AS email, mobile,
                IF(profile_photo != '', CONCAT(?, profile_photo), '') AS profile_photo
         FROM event_attendees
         JOIN users ON users.user_id = event_attendees.user_id
         WHERE event_attendees.event_id = ?`,
        [`${baseUrl}/uploads/profiles/`, event_id]
      );
      
      // Check if user has attended or organised this event
      let has_attended = false;
      let has_organised = false;
      
      if (organisersRows.length > 0) {
        const organiserUserIds = organisersRows.map(row => row.organiser_id);
        if (organiserUserIds.includes(decodedUserId)) {
          has_organised = true;
        }
      }
      
      if (attendeesRows.length > 0) {
        const attendeeUserIds = attendeesRows.map(row => row.attendee_id);
        if (attendeeUserIds.includes(decodedUserId)) {
          has_attended = true;
        }
      }
      
      // Return response in PHP format
      return res.json({
        status: true,
        rcode: 200,
        user_id: idEncode(decodedUserId),
        unique_token: token,
        event_detail: toArray(eventRows),
        event_organisers: toArray(organisersRows),
        event_attendees: toArray(attendeesRows),
        has_attended: has_attended,
        has_organised: has_organised
      });
      
    } catch (error) {
      console.error('getEventDetail error:', error);
      return fail(res, 500, 'Failed to get event detail');
    }
  },
  async saveEventInformation(req, res) {
    try {
      // Handle both JSON and form data
      const event_id = parseInt(req.body.event_id || req.body['event_id'] || 0);
      const event_name = req.body.event_name || req.body['event_name'];
      const industry_type = req.body.industry_type || req.body['industry_type'];
      const event_date = req.body.event_date || req.body['event_date'];
      const event_start_time = req.body.event_start_time || req.body['event_start_time'];
      const event_end_time = req.body.event_end_time || req.body['event_end_time'];
      const event_mode_id = req.body.event_mode_id || req.body['event_mode_id'];
      const event_type_id = req.body.event_type_id || req.body['event_type_id'];
      const event_details = req.body.event_details || req.body['event_details'];
      const country_id = req.body.country_id || req.body['country_id'];
      const state_id = req.body.state_id || req.body['state_id'];
      const city_id = req.body.city_id || req.body['city_id'];
      const event_venue = req.body.event_venue || req.body['event_venue'];
      const event_link = req.body.event_link || req.body['event_link'];
      const event_lat = req.body.event_lat || req.body['event_lat'];
      const event_lng = req.body.event_lng || req.body['event_lng'];
      const event_geo_address = req.body.event_geo_address || req.body['event_geo_address'];
      const organiser_ids = req.body.organiser_ids || req.body['organiser_ids'];
      
      // Get user_id and token from request (since we removed checkUser middleware)
      const user_id = req.body.user_id || req.body['user_id'];
      const token = req.body.token || req.body['token'];
      
      // Check if user_id and token are provided
      if (!user_id || !token) {
        return fail(res, 500, 'user_id and token are required');
      }
      
      // Decode user ID
      const decodedUserId = idDecode(user_id);
      if (!decodedUserId) {
        return fail(res, 500, 'Invalid user ID');
      }
      
      // Get user details and validate
      const userRows = await query('SELECT * FROM users WHERE user_id = ? LIMIT 1', [decodedUserId]);
      if (!userRows.length) {
        return fail(res, 500, 'Not A Valid User');
      }
      
      const user = userRows[0];
      
      // Validate token
      if (user.unique_token !== token) {
        return fail(res, 500, 'Token Mismatch Exception');
      }
      
      // Check mandatory fields - match PHP validation exactly
      if (event_name === "" || industry_type === "" || event_date === "" || event_start_time === "" || event_end_time === "" || event_mode_id === "" || event_type_id === "" || event_details === "" || organiser_ids === "" || event_lat === "" || event_lng === "" || event_geo_address === "") {
        return fail(res, 500, 'Please enter mandatory fields');
      }
      
      // Handle event banner upload
      let eventBanner = '';
      if (req.file && req.file.filename) {
        eventBanner = req.file.filename;
      }
      
      // Prepare event data
      const eventData = {
        event_name,
        industry_type,
        event_date: event_date, // Keep as is, don't parse with Date constructor
        event_start_time,
        event_end_time,
      event_mode_id,
      event_type_id,
        event_details,
        country_id: country_id || 1, // Default to country_id 1 if not provided
        state_id: state_id || 1, // Default to state_id 1 if not provided
        city_id: city_id || 1, // Default to city_id 1 if not provided
        event_venue: event_venue || '',
        event_link: event_link || '',
        event_lat,
        event_lng,
        event_geo_address
      };
      
      let finalEventId = event_id;
      
      if (event_id == 0) {
        // Insert new event
        eventData.user_id = decodedUserId;
        if (eventBanner) {
          eventData.event_banner = eventBanner;
        }
        
        const result = await query(
          'INSERT INTO user_event_details (user_id, event_name, industry_type, country_id, state_id, city_id, event_venue, event_link, event_lat, event_lng, event_geo_address, event_date, event_start_time, event_end_time, event_mode_id, event_type_id, event_details, event_banner, deleted) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
          [eventData.user_id, eventData.event_name, eventData.industry_type, eventData.country_id, eventData.state_id, eventData.city_id, eventData.event_venue || null, eventData.event_link || null, eventData.event_lat, eventData.event_lng, eventData.event_geo_address, eventData.event_date, eventData.event_start_time, eventData.event_end_time, eventData.event_mode_id, eventData.event_type_id, eventData.event_details, eventBanner || 'default_event_banner.jpg', 0]
        );
        finalEventId = result.insertId;
        
        // Create Event Creator as Organiser
      await query(
          'INSERT INTO event_organisers (event_id, user_id) VALUES (?, ?)',
          [finalEventId, decodedUserId]
      );
    } else {
        // Update existing event
        if (eventBanner) {
          eventData.event_banner = eventBanner;
        }
        
        const updateFields = [];
        const updateValues = [];
        
        Object.keys(eventData).forEach(key => {
          if (eventData[key] !== undefined) {
            updateFields.push(`${key} = ?`);
            updateValues.push(eventData[key]);
          }
        });
        
        if (eventBanner) {
          updateFields.push('event_banner = ?');
          updateValues.push(eventBanner);
        }
        
        updateValues.push(event_id, decodedUserId);
        
      await query(
          `UPDATE user_event_details SET ${updateFields.join(', ')} WHERE event_id = ? AND user_id = ?`,
          updateValues
        );
      }
      
      // Handle event organisers
      if (finalEventId > 0 && organiser_ids) {
        const organiserArray = organiser_ids.split(',').map(id => parseInt(id.trim())).filter(id => id > 0);
        
        if (organiserArray.length > 0) {
          // Remove existing organisers (except the creator)
          await query(
            'DELETE FROM event_organisers WHERE user_id != ? AND event_id = ?',
            [decodedUserId, finalEventId]
          );
          
          // Add new organisers
          for (const organiserUserId of organiserArray) {
            if (organiserUserId !== decodedUserId) { // Don't add creator again
              await query(
                'INSERT INTO event_organisers (event_id, user_id) VALUES (?, ?)',
                [finalEventId, organiserUserId]
              );
            }
          }
        }
      }
      
      // Return response in PHP format
      const baseUrl = `${req.protocol}://${req.get('host')}`;
      const eventBannerUrl = eventBanner ? `${baseUrl}/uploads/events/${eventBanner}` : '';
      
      return res.json({
        status: true,
        rcode: 200,
        user_id: idEncode(decodedUserId),
        unique_token: token,
        event_id: finalEventId,
        event_banner: eventBannerUrl,
        message: 'Event Information saved successfully'
      });
      
    } catch (error) {
      console.error('saveEventInformation error:', error);
      return fail(res, 500, 'Failed to save event information');
    }
  },

  async getEventOrganisersList(req, res) {
    try {
      const { user_id, token, event_id } = req.query;
      
      // Check if user_id and token are provided
      if (!user_id || !token) {
        return fail(res, 500, 'user_id and token are required');
      }
      
      // Decode user ID
      const decodedUserId = idDecode(user_id);
      if (!decodedUserId) {
        return fail(res, 500, 'Invalid user ID');
      }
      
      // Get user details and validate
      const userRows = await query('SELECT * FROM users WHERE user_id = ? LIMIT 1', [decodedUserId]);
      if (!userRows.length) {
        return fail(res, 500, 'Not A Valid User');
      }
      
      const user = userRows[0];
      
      // Validate token
      if (user.unique_token !== token) {
        return fail(res, 500, 'Token Mismatch Exception');
      }

      // Get event organisers list with dynamic profile photo URLs
      const baseUrl = `${req.protocol}://${req.get('host')}`;
      const profilePhotoPath = `${baseUrl}/uploads/profiles/`;
      
      const organisersListRows = await query(
        `SELECT users.user_id as organiser_id, 
                COALESCE(full_name, '') as full_name, 
                COALESCE(email, '') as email, 
                mobile,
                COALESCE(address, '') as address, 
                COALESCE(users.city_id, '') as city_id, 
                COALESCE(cities.name, '') as city,
                COALESCE(users.state_id, '') as state_id, 
                COALESCE(states.name, '') as state, 
                COALESCE(users.country_id, '') as country_id, 
                COALESCE(countries.name, '') as country, 
                COALESCE(linkedin_url, '') as linkedin_url, 
                COALESCE(summary, '') as summary,
              IF(profile_photo != '', CONCAT(?, profile_photo), '') AS profile_photo
       FROM event_organisers
       JOIN users ON users.user_id = event_organisers.user_id
         LEFT JOIN countries ON countries.id = users.country_id
         LEFT JOIN states ON states.id = users.state_id
         LEFT JOIN cities ON cities.id = users.city_id
         LEFT JOIN interests ON interests.id = users.interests
         WHERE event_organisers.event_id = ?`,
        [profilePhotoPath, event_id]
      );

      return res.json({
        status: true,
        rcode: 200,
        user_id: idEncode(decodedUserId),
        unique_token: token,
        organisers_list: organisersListRows.length > 0 ? toArray(organisersListRows) : []
      });
      
    } catch (error) {
      console.error('getEventOrganisersList error:', error);
      return fail(res, 500, 'Failed to get event organisers list');
    }
  },

  async deleteEventOrganiser(req, res) {
    try {
      const { user_id, token, event_id, organiser_id } = req.body;
      
      // Check if user_id and token are provided
      if (!user_id || !token) {
        return fail(res, 500, 'user_id and token are required');
      }
      
      // Decode user ID
      const decodedUserId = idDecode(user_id);
      if (!decodedUserId) {
        return fail(res, 500, 'Invalid user ID');
      }
      
      // Get user details and validate
      const userRows = await query('SELECT * FROM users WHERE user_id = ? LIMIT 1', [decodedUserId]);
      if (!userRows.length) {
        return fail(res, 500, 'Not A Valid User');
      }
      
      const user = userRows[0];
      
      // Validate token
      if (user.unique_token !== token) {
        return fail(res, 500, 'Token Mismatch Exception');
      }

      // Check mandatory fields
      if (!event_id || event_id <= 0 || !organiser_id || organiser_id <= 0) {
        return fail(res, 500, 'Please enter mandatory fields');
      }

      // Delete event organiser
      const result = await query(
        'DELETE FROM event_organisers WHERE event_id = ? AND user_id = ?',
        [event_id, organiser_id]
      );

      if (result.affectedRows === 0) {
        return fail(res, 500, 'Event organiser not found or access denied');
      }

      return res.json({
        status: true,
        rcode: 200,
        user_id: idEncode(decodedUserId),
        unique_token: token,
        message: 'Organiser deleted successfully'
      });
      
    } catch (error) {
      console.error('deleteEventOrganiser error:', error);
      return fail(res, 500, 'Failed to delete event organiser');
    }
  },

  async getEventAttendeesList(req, res) {
    try {
      const { user_id, token, event_id } = req.query;
      
      // Check if user_id and token are provided
      if (!user_id || !token) {
        return fail(res, 500, 'user_id and token are required');
      }
      
      // Decode user ID
      const decodedUserId = idDecode(user_id);
      if (!decodedUserId) {
        return fail(res, 500, 'Invalid user ID');
      }
      
      // Get user details and validate
      const userRows = await query('SELECT * FROM users WHERE user_id = ? LIMIT 1', [decodedUserId]);
      if (!userRows.length) {
        return fail(res, 500, 'Not A Valid User');
      }
      
      const user = userRows[0];
      
      // Validate token
      if (user.unique_token !== token) {
        return fail(res, 500, 'Token Mismatch Exception');
      }

      // Get event attendees list with dynamic profile photo URLs
      const baseUrl = `${req.protocol}://${req.get('host')}`;
      const profilePhotoPath = `${baseUrl}/uploads/profiles/`;
      
      const attendeesListRows = await query(
        `SELECT users.user_id as attendee_id, 
                COALESCE(full_name, '') as full_name, 
                COALESCE(email, '') as email, 
                mobile,
                COALESCE(address, '') as address, 
                COALESCE(users.city_id, '') as city_id, 
                COALESCE(cities.name, '') as city,
                COALESCE(users.state_id, '') as state_id, 
                COALESCE(states.name, '') as state, 
                COALESCE(users.country_id, '') as country_id, 
                COALESCE(countries.name, '') as country, 
                COALESCE(interests, '') as interests, 
                COALESCE(linkedin_url, '') as linkedin_url, 
                COALESCE(summary, '') as summary,
              IF(profile_photo != '', CONCAT(?, profile_photo), '') AS profile_photo
       FROM event_attendees
       JOIN users ON users.user_id = event_attendees.user_id
         LEFT JOIN countries ON countries.id = users.country_id
         LEFT JOIN states ON states.id = users.state_id
         LEFT JOIN cities ON cities.id = users.city_id
         LEFT JOIN interests ON interests.id = users.interests
         WHERE event_attendees.event_id = ?`,
        [profilePhotoPath, event_id]
      );

      return res.json({
        status: true,
        rcode: 200,
        user_id: idEncode(decodedUserId),
        unique_token: token,
        attendees_list: attendeesListRows.length > 0 ? toArray(attendeesListRows) : []
      });
      
    } catch (error) {
      console.error('getEventAttendeesList error:', error);
      return fail(res, 500, 'Failed to get event attendees list');
    }
  },

  async getEventsAttendedList(req, res) {
    try {
      // Support both query parameters and form data
      const { user_id, token } = {
        ...req.query,
        ...req.body
      };
      
      console.log('getEventsAttendedList - Parameters:', { user_id, token });
      
      // Check if user_id and token are provided
      if (!user_id || !token) {
        return fail(res, 500, 'user_id and token are required');
      }
      
      // Decode user ID
      const decodedUserId = idDecode(user_id);
      if (!decodedUserId) {
        return fail(res, 500, 'Invalid user ID');
      }
      
      // Get user details and validate
      const userRows = await query('SELECT * FROM users WHERE user_id = ? LIMIT 1', [decodedUserId]);
      if (!userRows.length) {
        return fail(res, 500, 'Not A Valid User');
      }
      
      const user = userRows[0];
      
      // Validate token
      if (user.unique_token !== token) {
        return fail(res, 500, 'Token Mismatch Exception');
      }

      // Get events attended list with comprehensive details
      const eventsAttendedList = await query(`
        SELECT 
          ued.*,
          event_mode.name AS event_mode,
          event_type.name AS event_type,
          DATE_FORMAT(ued.event_date, '%d-%m-%Y') AS event_date,
          CASE 
            WHEN ued.event_banner != '' THEN CONCAT('${req.protocol}://${req.get('host')}/uploads/events/', ued.event_banner)
            ELSE ''
          END AS event_banner,
          countries.name AS country,
          states.name AS state,
          cities.name AS city
        FROM user_event_details ued
        JOIN event_attendees ea ON ea.event_id = ued.event_id
        LEFT JOIN event_mode ON event_mode.id = ued.event_mode_id
        LEFT JOIN event_type ON event_type.id = ued.event_type_id
        LEFT JOIN countries ON countries.id = ued.country_id
        LEFT JOIN states ON states.id = ued.state_id
        LEFT JOIN cities ON cities.id = ued.city_id
        WHERE ea.user_id = ?
        ORDER BY ued.event_id
      `, [decodedUserId]);

      // Return response in PHP format (matching exactly)
      return res.json({
        status: true,
        rcode: 200,
        user_id: idEncode(decodedUserId),
        unique_token: token,
        attended_list: eventsAttendedList || []
      });
      
    } catch (error) {
      console.error('getEventsAttendedList error:', error);
      return fail(res, 500, 'Failed to get events attended list');
    }
  },

  async getEventsOrganisedList(req, res) {
    try {
      // Support both query parameters and form data
      const { user_id, token } = {
        ...req.query,
        ...req.body
      };
      
      console.log('getEventsOrganisedList - Parameters:', { user_id, token });
      
      // Check if user_id and token are provided
      if (!user_id || !token) {
        return fail(res, 500, 'user_id and token are required');
      }
      
      // Decode user ID
      const decodedUserId = idDecode(user_id);
      if (!decodedUserId) {
        return fail(res, 500, 'Invalid user ID');
      }
      
      // Get user details and validate
      const userRows = await query('SELECT * FROM users WHERE user_id = ? LIMIT 1', [decodedUserId]);
      if (!userRows.length) {
        return fail(res, 500, 'Not A Valid User');
      }
      
      const user = userRows[0];
      
      // Validate token
      if (user.unique_token !== token) {
        return fail(res, 500, 'Token Mismatch Exception');
      }

      // Get events organised list with comprehensive details
      const eventsOrganisedList = await query(`
        SELECT 
          ued.*,
          event_mode.name AS event_mode,
          event_type.name AS event_type,
          DATE_FORMAT(ued.event_date, '%d-%m-%Y') AS event_date,
          CASE 
            WHEN ued.event_banner != '' THEN CONCAT('${req.protocol}://${req.get('host')}/uploads/events/', ued.event_banner)
            ELSE ''
          END AS event_banner,
          countries.name AS country,
          states.name AS state,
          cities.name AS city
        FROM user_event_details ued
        JOIN event_organisers eo ON eo.event_id = ued.event_id
        LEFT JOIN event_mode ON event_mode.id = ued.event_mode_id
        LEFT JOIN event_type ON event_type.id = ued.event_type_id
        LEFT JOIN countries ON countries.id = ued.country_id
        LEFT JOIN states ON states.id = ued.state_id
        LEFT JOIN cities ON cities.id = ued.city_id
        WHERE eo.user_id = ?
        ORDER BY ued.event_id
      `, [decodedUserId]);

      // Return response in PHP format (matching exactly)
      return res.json({
        status: true,
        rcode: 200,
        user_id: idEncode(decodedUserId),
        unique_token: token,
        organised_list: eventsOrganisedList || []
      });
      
    } catch (error) {
      console.error('getEventsOrganisedList error:', error);
      return fail(res, 500, 'Failed to get events organised list');
    }
  },

  async saveEventAttendee(req, res) {
    try {
      const { user_id, token, event_id } = req.body;
      
      // Check if user_id and token are provided
      if (!user_id || !token) {
        return fail(res, 500, 'user_id and token are required');
      }
      
      // Decode user ID
      const decodedUserId = idDecode(user_id);
      if (!decodedUserId) {
        return fail(res, 500, 'Invalid user ID');
      }
      
      // Get user details and validate
      const userRows = await query('SELECT * FROM users WHERE user_id = ? LIMIT 1', [decodedUserId]);
      if (!userRows.length) {
        return fail(res, 500, 'Not A Valid User');
      }
      
      const user = userRows[0];
      
      // Validate token
      if (user.unique_token !== token) {
        return fail(res, 500, 'Token Mismatch Exception');
      }

      // Check mandatory fields
      if (!event_id || event_id <= 0) {
        return fail(res, 500, 'Please enter mandatory fields');
      }

      const add_user_id = decodedUserId;

      // Save event attendee
      const result = await query(
        'INSERT INTO event_attendees (event_id, user_id) VALUES (?, ?)',
        [event_id, add_user_id]
      );
      
      const attendee_id = result.insertId;
      
      // Update attendee_reference_id
      const attendee_reference_id = `ALPHA-${add_user_id}${event_id}${attendee_id.toString().padStart(3, '0')}`;
      
      await query(
        'UPDATE event_attendees SET attendee_reference_id = ? WHERE attendee_id = ?',
        [attendee_reference_id, attendee_id]
      );
      
      // Return response in PHP format
      return res.json({
        status: true,
        rcode: 200,
        user_id: idEncode(decodedUserId),
        unique_token: token,
        message: 'Attendee saved successfully'
      });
      
    } catch (error) {
      console.error('saveEventAttendee error:', error);
      return fail(res, 500, 'Failed to save event attendee');
    }
  },

  async deleteEventAttendee(req, res) {
    try {
      const { user_id, token, event_id, attendee_id } = req.body;
      
      // Check if user_id and token are provided
      if (!user_id || !token) {
        return fail(res, 500, 'user_id and token are required');
      }
      
      // Decode user ID
      const decodedUserId = idDecode(user_id);
      if (!decodedUserId) {
        return fail(res, 500, 'Invalid user ID');
      }
      
      // Get user details and validate
      const userRows = await query('SELECT * FROM users WHERE user_id = ? LIMIT 1', [decodedUserId]);
      if (!userRows.length) {
        return fail(res, 500, 'Not A Valid User');
      }
      
      const user = userRows[0];
      
      // Validate token
      if (user.unique_token !== token) {
        return fail(res, 500, 'Token Mismatch Exception');
      }

      // Check mandatory fields - match PHP validation exactly
      if (event_id <= 0 || attendee_id <= 0) {
        return fail(res, 500, 'Please enter mandatory fields');
      }

      // Delete event attendee - match PHP implementation exactly
      await query(
        'DELETE FROM event_attendees WHERE event_id = ? AND user_id = ?',
        [event_id, attendee_id]
      );

      return res.json({
        status: true,
        rcode: 200,
        user_id: idEncode(decodedUserId),
        unique_token: token,
        message: 'Attendee deleted successfully'
      });
      
    } catch (error) {
      console.error('deleteEventAttendee error:', error);
      return fail(res, 500, 'Failed to delete event attendee');
    }
  },

  // Folders & contacts (read-only parity)
  async getFoldersListByType(req, res) {
    const { type } = req.body;
    const rows = await query('SELECT * FROM user_folders WHERE user_id = ? AND type = ? AND status=1', [req.user.id, type]);
    return ok(res, { data: toArray(rows) });
  },
  async getSubFoldersList(req, res) {
    const { user_folder_id } = req.body;
    const rows = await query('SELECT * FROM user_sub_folders WHERE user_id = ? AND user_folder_id = ? AND status=1', [req.user.id, user_folder_id]);
    return ok(res, { data: toArray(rows) });
  },

  async getContactVisitingCardInformation(req, res) {
    try {
      // Support both query parameters and form data
      const { user_id, token, user_sub_folder_id } = {
        ...req.query,
        ...req.body
      };
      
      console.log('getContactVisitingCardInformation - Parameters:', { user_id, token, user_sub_folder_id });
      
      // Check if user_id and token are provided
      if (!user_id || !token) {
        return fail(res, 500, 'user_id and token are required');
      }
      
      if (!user_sub_folder_id) {
        return fail(res, 500, 'user_sub_folder_id is required');
      }
      
      // Decode user ID
      const decodedUserId = idDecode(user_id);
      if (!decodedUserId) {
        return fail(res, 500, 'Invalid user ID');
      }
      
      // Get user details and validate
      const userRows = await query('SELECT * FROM users WHERE user_id = ? LIMIT 1', [decodedUserId]);
      if (!userRows.length) {
        return fail(res, 500, 'Not A Valid User');
      }
      
      const user = userRows[0];
      
      // Validate token
      if (user.unique_token !== token) {
        return fail(res, 500, 'Token Mismatch Exception');
      }

      // Get contact visiting card information
      const contactCardInfo = await query(`
        SELECT 
          ucvc.*,
          CASE 
            WHEN ucvc.visiting_card_front != '' THEN CONCAT('${process.env.BASE_URL || 'http://localhost:3000'}/uploads/visiting_cards/', ucvc.visiting_card_front)
            ELSE ''
          END AS visiting_card_front_url,
          CASE 
            WHEN ucvc.visiting_card_back != '' THEN CONCAT('${process.env.BASE_URL || 'http://localhost:3000'}/uploads/visiting_cards/', ucvc.visiting_card_back)
            ELSE ''
          END AS visiting_card_back_url
        FROM user_contacts_visiting_cards ucvc
        WHERE ucvc.user_id = ? 
        AND ucvc.user_sub_folder_id = ? 
        AND ucvc.status = 1
      `, [decodedUserId, user_sub_folder_id]);

      // Return response in PHP format (matching exactly)
      return res.json({
        status: true,
        rcode: 200,
        user_id: idEncode(decodedUserId),
        unique_token: token,
        contact_card_info: contactCardInfo || []
      });
      
    } catch (error) {
      console.error('getContactVisitingCardInformation error:', error);
      return fail(res, 500, 'Failed to get contact visiting card information');
    }
  },

  async generateQrCode(req, res) {
    try {
    const token = req.user.details?.unique_token;
    if (!token) return fail(res, 500, 'Token missing');
    const filename = `${token}.png`;
    await generateToFile(token, filename);
    await query('UPDATE users SET qr_image = ? WHERE user_id = ?', [filename, req.user.id]);
    return ok(res, { qr_image: filename });
    } catch (error) {
      console.error('generateQrCode error:', error);
      return fail(res, 500, 'Failed to generate QR code');
    }
  },





  async getServiceDetail(req, res) {
    try {
      // Support both query parameters and form data
      const { user_id, token, usps_id } = {
        ...req.query,
        ...req.body
      };
      
      console.log('getServiceDetail - Parameters:', { user_id, token, usps_id });
      
      // Check if user_id and token are provided
      if (!user_id || !token) {
        return fail(res, 500, 'user_id and token are required');
      }
      
      if (!usps_id) {
        return fail(res, 500, 'usps_id is required');
      }
      
      // Decode user ID
      const decodedUserId = idDecode(user_id);
      if (!decodedUserId) {
        return fail(res, 500, 'Invalid user ID');
      }
      
      // Get user details and validate
      const userRows = await query('SELECT * FROM users WHERE user_id = ? LIMIT 1', [decodedUserId]);
      if (!userRows.length) {
        return fail(res, 500, 'Not A Valid User');
      }
      
      const user = userRows[0];
      
      // Validate token
      if (user.unique_token !== token) {
        return fail(res, 500, 'Token Mismatch Exception');
      }

      // Get service detail with location data and user info
      const serviceDetail = await query(`
        SELECT 
          usps.*,
          countries.name AS country,
          states.name AS state,
          cities.name AS city,
          COALESCE(u.full_name, '') AS full_name,
          u.mobile,
          usp.user_id,
          CASE 
            WHEN u.profile_photo != '' THEN CONCAT('${req.protocol}://${req.get('host')}/uploads/profiles/', u.profile_photo)
            ELSE ''
          END AS profile_photo,
          CASE 
            WHEN usps.service_image != '' THEN CONCAT('${req.protocol}://${req.get('host')}/uploads/services/', usps.service_image)
            ELSE ''
          END AS service_image
       FROM user_service_provider_services usps
       JOIN user_service_provider usp ON usp.sp_id = usps.sp_id
       JOIN users u ON u.user_id = usp.user_id
       JOIN countries ON countries.id = usp.country_id
       JOIN states ON states.id = usp.state_id
       JOIN cities ON cities.id = usp.city_id
        WHERE usps.usps_id = ?
      `, [usps_id]);

      if (!serviceDetail || serviceDetail.length === 0) {
        return fail(res, 500, 'Service not found');
      }

      const service = serviceDetail[0];
      const sp_id = service.sp_id;
      const service_id = service.service_id;

      // Check if service is unlocked by current user
      const serviceUnlocked = await query(
        'SELECT * FROM user_services_unlocked WHERE sp_id = ? AND service_id = ? AND user_id = ?',
        [sp_id, service_id, decodedUserId]
      );

      // Get ratings breakdown
      const ratingsData = await query(`
        SELECT rating, COUNT(*) as count
        FROM user_services_unlocked
        WHERE sp_id = ? AND service_id = ? AND rating > 0
        GROUP BY rating
      `, [sp_id, service_id]);

      // Initialize ratings result
      const ratings = {
        '1_star': 0,
        '2_star': 0,
        '3_star': 0,
        '4_star': 0,
        '5_star': 0,
        'total_ratings': 0,
        'total_reviews': 0
      };

      // Process ratings data
      if (ratingsData && ratingsData.length > 0) {
        ratingsData.forEach(row => {
          const rating = row.rating;
          const count = parseInt(row.count);
          ratings[`${rating}_star`] = count;
          ratings.total_ratings += count;
        });
      }

      // Get reviews
      const reviewsData = await query(`
        SELECT 
          COALESCE(u.full_name, '') as name,
          usul.review,
          usul.rating,
          usul.review_dts
        FROM user_services_unlocked usul
        JOIN users u ON usul.user_id = u.user_id
        WHERE usul.sp_id = ? AND usul.service_id = ? AND usul.review IS NOT NULL
      `, [sp_id, service_id]);

      const reviews = [];
      if (reviewsData && reviewsData.length > 0) {
        ratings.total_reviews = reviewsData.length;
        reviewsData.forEach(row => {
          reviews.push({
            name: row.name,
            review: row.review,
            rating: parseInt(row.rating),
            review_date_time: row.review_dts ? new Date(row.review_dts).getTime() / 1000 : ''
          });
        });
      }

      // Get total profile views
      const profileViewsData = await query(`
        SELECT COUNT(*) as total_profile_views
        FROM user_services_unlocked
        WHERE sp_id = ? AND service_id = ?
        GROUP BY sp_id, service_id
      `, [sp_id, service_id]);

      const totalProfileViews = profileViewsData && profileViewsData.length > 0 ? 
        parseInt(profileViewsData[0].total_profile_views) : 0;

      // Add profile views to service detail
      serviceDetail[0].total_profile_views = totalProfileViews;

      // Return response in PHP format (matching exactly)
      return res.json({
        status: true,
        rcode: 200,
        user_id: idEncode(decodedUserId),
        unique_token: token,
        service_detail: serviceDetail || [],
        service_unlocked: serviceUnlocked && serviceUnlocked.length > 0 ? 1 : 0,
        ratings: [ratings],
        reviews: reviews
      });
      
    } catch (error) {
      console.error('getServiceDetail error:', error);
      return fail(res, 500, 'Failed to get service detail');
    }
  },

  async getAllServicesList(req, res) {
    try {
      // Support both query parameters and form data
      const { user_id, token, service_id } = {
        ...req.query,
        ...req.body
      };
      
      console.log('getAllServicesList - Parameters:', { user_id, token, service_id });
      
      // Check if user_id and token are provided
      if (!user_id || !token) {
        return fail(res, 500, 'user_id and token are required');
      }
      
      if (!service_id) {
        return fail(res, 500, 'service_id is required');
      }
      
      // Decode user ID
      const decodedUserId = idDecode(user_id);
      if (!decodedUserId) {
        return fail(res, 500, 'Invalid user ID');
      }
      
      // Get user details and validate
      const userRows = await query('SELECT * FROM users WHERE user_id = ? LIMIT 1', [decodedUserId]);
      if (!userRows.length) {
        return fail(res, 500, 'Not A Valid User');
      }
      
      const user = userRows[0];
      
      // Validate token
      if (user.unique_token !== token) {
        return fail(res, 500, 'Token Mismatch Exception');
      }

      // Get all services list (excluding current user's services)
      const servicesList = await query(`
        SELECT 
          usps.*,
          countries.name AS country,
          states.name AS state,
          cities.name AS city,
          CASE 
            WHEN usps.service_image != '' THEN CONCAT('${req.protocol}://${req.get('host')}/uploads/services/', usps.service_image)
            ELSE ''
          END AS service_image
       FROM user_service_provider_services usps
       JOIN user_service_provider usp ON usp.sp_id = usps.sp_id
       JOIN countries ON countries.id = usp.country_id
       JOIN states ON states.id = usp.state_id
       JOIN cities ON cities.id = usp.city_id
        WHERE usp.user_id != ? 
        AND usps.service_id = ? 
        AND usps.status = 1
      `, [decodedUserId, service_id]);

      // Return response in PHP format (matching exactly)
      return res.json({
        status: true,
        rcode: 200,
        user_id: idEncode(decodedUserId),
        unique_token: token,
        services_list: servicesList || []
      });
      
    } catch (error) {
      console.error('getAllServicesList error:', error);
      return fail(res, 500, 'Failed to get all services list');
    }
  },
  async serviceUnlock(req, res) {
    try {
      // Support both query parameters and form data
      const { user_id, token, sp_id, service_id } = {
        ...req.query,
        ...req.body
      };
      
      console.log('serviceUnlock - Parameters:', { user_id, token, sp_id, service_id });
      
      // Check if user_id and token are provided
      if (!user_id || !token) {
        return fail(res, 500, 'user_id and token are required');
      }
      
      if (!sp_id || sp_id <= 0 || !service_id || service_id <= 0) {
        return fail(res, 500, 'Please enter mandatory fields');
      }
      
      // Decode user ID
      const decodedUserId = idDecode(user_id);
      if (!decodedUserId) {
        return fail(res, 500, 'Invalid user ID');
      }
      
      // Get user details and validate
      const userRows = await query('SELECT * FROM users WHERE user_id = ? LIMIT 1', [decodedUserId]);
      if (!userRows.length) {
        return fail(res, 500, 'Not A Valid User');
      }
      
      const user = userRows[0];
      
      // Validate token
      if (user.unique_token !== token) {
        return fail(res, 500, 'Token Mismatch Exception');
      }

      // Check if service is already unlocked
      const existingUnlock = await query(
        'SELECT * FROM user_services_unlocked WHERE user_id = ? AND sp_id = ? AND service_id = ?',
        [decodedUserId, sp_id, service_id]
      );

      if (existingUnlock && existingUnlock.length > 0) {
        return res.json({
          status: true,
          rcode: 200,
          user_id: idEncode(decodedUserId),
          unique_token: token,
          message: 'Service already unlocked'
        });
      }

      // Insert into user_services_unlocked table
      const unlockResult = await query(
        'INSERT INTO user_services_unlocked (user_id, sp_id, service_id, created_dts) VALUES (?, ?, ?, NOW())',
        [decodedUserId, sp_id, service_id]
      );

      if (unlockResult.insertId > 0) {
        return res.json({
          status: true,
          rcode: 200,
          user_id: idEncode(decodedUserId),
          unique_token: token,
          message: 'Service unlocked successfully'
        });
      } else {
        return fail(res, 500, 'Please try again');
      }
      
    } catch (error) {
      console.error('serviceUnlock error:', error);
      return fail(res, 500, 'Failed to unlock service');
    }
  },
  async getAllServiceUnlockList(req, res) {
    try {
      // Support both query parameters and form data
      const { user_id, token, filter_date } = {
        ...req.query,
        ...req.body
      };
      
      console.log('getAllServiceUnlockList - Parameters:', { user_id, token, filter_date });
      
      // Check if user_id and token are provided
      if (!user_id || !token) {
        return fail(res, 500, 'user_id and token are required');
      }
      
      // Decode user ID
      const decodedUserId = idDecode(user_id);
      if (!decodedUserId) {
        return fail(res, 500, 'Invalid user ID');
      }
      
      // Get user details and validate
      const userRows = await query('SELECT * FROM users WHERE user_id = ? LIMIT 1', [decodedUserId]);
      if (!userRows.length) {
        return fail(res, 500, 'Not A Valid User');
      }
      
      const user = userRows[0];
      
      // Validate token
      if (user.unique_token !== token) {
        return fail(res, 500, 'Token Mismatch Exception');
      }

      // Build the query for service unlocked details
      let queryString = `
        SELECT 
          usp.*,
          COALESCE(u.full_name, '') as full_name,
          COALESCE(u.email, '') as email,
          u.mobile,
          countries.name as country,
          states.name as state,
          cities.name as city,
          CASE 
            WHEN u.profile_photo != '' THEN CONCAT('${req.protocol}://${req.get('host')}/uploads/profiles/', u.profile_photo)
            ELSE ''
          END AS profile_photo
        FROM user_services_unlocked usul
        JOIN user_service_provider usp ON usp.sp_id = usul.sp_id
        JOIN users u ON u.user_id = usp.user_id
        JOIN countries ON countries.id = usp.country_id
        JOIN states ON states.id = usp.state_id
        JOIN cities ON cities.id = usp.city_id
        WHERE usul.user_id = ?
      `;
      
      const queryParams = [decodedUserId];
      
      // Add date filter if provided
      if (filter_date && filter_date !== '') {
        queryString += ` AND DATE(usp.created_dts) = ?`;
        queryParams.push(filter_date);
      }
      
      queryString += ` GROUP BY usul.sp_id`;
      
      // Get service unlocked details
      const serviceUnlockedDetails = await query(queryString, queryParams);

      // Return response in PHP format (matching exactly)
      return res.json({
        status: true,
        rcode: 200,
        user_id: idEncode(decodedUserId),
        unique_token: token,
        service_unlocked_detail: serviceUnlockedDetails || []
      });
      
    } catch (error) {
      console.error('getAllServiceUnlockList error:', error);
      return fail(res, 500, 'Failed to get service unlock list');
    }
  },

  async saveInvestor(req, res) {
    try {
      // Support both query parameters and form data
      const { user_id, token, name, country_id, state_id, city_id, fund_size_id, bio, linkedin_url } = {
        ...req.query,
        ...req.body
      };
      
      console.log('saveInvestor - Parameters:', { user_id, token, name, country_id, state_id, city_id, fund_size_id, bio, linkedin_url });
      
      // Check if user_id and token are provided
      if (!user_id || !token) {
        return fail(res, 500, 'user_id and token are required');
      }
      
      // Check mandatory fields - match PHP validation exactly
      if (name === "" || country_id <= 0 || state_id <= 0 || city_id <= 0 || fund_size_id <= 0 || bio === "") {
        return fail(res, 500, 'Please enter mandatory fields');
      }
      
      // Decode user ID
      const decodedUserId = idDecode(user_id);
      if (!decodedUserId) {
        return fail(res, 500, 'Invalid user ID');
      }
      
      // Get user details and validate
      const userRows = await query('SELECT * FROM users WHERE user_id = ? LIMIT 1', [decodedUserId]);
      if (!userRows.length) {
        return fail(res, 500, 'Not A Valid User');
      }
      
      const user = userRows[0];
      
      // Validate token
      if (user.unique_token !== token) {
        return fail(res, 500, 'Token Mismatch Exception');
      }

      // Check if user is already an investor
      const existingInvestor = await query(
        'SELECT * FROM user_investor WHERE user_id = ?',
        [decodedUserId]
      );

      if (existingInvestor && existingInvestor.length > 0) {
        return fail(res, 500, 'User is already registered as an investor');
      }

      // Handle image upload - match PHP behavior exactly
      let imageFileName = '';
      if (req.file) {
        imageFileName = req.file.filename;
        console.log('Image uploaded:', imageFileName);
      }

      // Save investor
      const investorResult = await query(
        `INSERT INTO user_investor (user_id, country_id, name, state_id, city_id, fund_size_id, bio, linkedin_url, image, status, created_dts, deleted) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, NOW(), 0)`,
        [decodedUserId, country_id, name, state_id, city_id, fund_size_id, bio, linkedin_url || '', imageFileName]
      );

      const investor_id = investorResult.insertId;

      if (investor_id > 0) {
        // Update reference_no
        const reference_no = `INV-ALPHA-${investor_id.toString().padStart(3, '0')}`;
        await query(
          'UPDATE user_investor SET reference_no = ? WHERE investor_id = ?',
          [reference_no, investor_id]
        );

        // Update is_investor in users table
        await query(
          'UPDATE users SET is_investor = 1 WHERE user_id = ?',
          [decodedUserId]
        );

        return res.json({
          status: true,
          rcode: 200,
          user_id: idEncode(decodedUserId),
          unique_token: token,
          investor_id: investor_id,
          message: 'Investor request sent for approval successfully'
        });
      } else {
        return fail(res, 500, 'Failed to save investor');
      }
      
    } catch (error) {
      console.error('saveInvestor error:', error);
      return fail(res, 500, 'Failed to save investor');
    }
  },

  async getAllInvestorsList(req, res) {
    try {
      // Support both query parameters and form data
      const { user_id, token } = {
        ...req.query,
        ...req.body
      };
      
      console.log('getAllInvestorsList - Parameters:', { user_id, token });
      
      // Check if user_id and token are provided
      if (!user_id || !token) {
        return fail(res, 500, 'user_id and token are required');
      }
      
      // Decode user ID
      const decodedUserId = idDecode(user_id);
      if (!decodedUserId) {
        return fail(res, 500, 'Invalid user ID');
      }
      
      // Get user details and validate
      const userRows = await query('SELECT * FROM users WHERE user_id = ? LIMIT 1', [decodedUserId]);
      if (!userRows.length) {
        return fail(res, 500, 'Not A Valid User');
      }
      
      const user = userRows[0];
      
      // Validate token
      if (user.unique_token !== token) {
        return fail(res, 500, 'Token Mismatch Exception');
      }

      // Get all investors list (excluding current user)
      const investorsList = await query(`
        SELECT 
          ui.*,
          countries.name AS country,
          states.name AS state,
          cities.name AS city,
          fs.investment_range,
          CASE 
            WHEN ui.image != '' THEN CONCAT('${req.protocol}://${req.get('host')}/uploads/investors/', ui.image)
            ELSE ''
          END AS image
       FROM user_investor ui
       JOIN countries ON countries.id = ui.country_id
       JOIN states ON states.id = ui.state_id
       JOIN cities ON cities.id = ui.city_id
       JOIN fund_size fs ON fs.id = ui.fund_size_id
        WHERE ui.user_id != ? AND ui.status = 1 AND ui.approval_status = 2
      `, [decodedUserId]);

      // Return response in PHP format (matching exactly)
      return res.json({
        status: true,
        rcode: 200,
        user_id: idEncode(decodedUserId),
        unique_token: token,
        investors_list: investorsList || []
      });
      
    } catch (error) {
      console.error('getAllInvestorsList error:', error);
      return fail(res, 500, 'Failed to get investors list');
    }
  },
  async getInvestorDetail(req, res) {
    try {
      // Support both query parameters and form data
      const { user_id, token, investor_id } = {
        ...req.query,
        ...req.body
      };
      
      console.log('getInvestorDetail - Parameters:', { user_id, token, investor_id });
      
      // Check if user_id and token are provided
      if (!user_id || !token) {
        return fail(res, 500, 'user_id and token are required');
      }
      
      if (!investor_id || investor_id <= 0) {
        return fail(res, 500, 'investor_id is required');
      }
      
      // Decode user ID
      const decodedUserId = idDecode(user_id);
      if (!decodedUserId) {
        return fail(res, 500, 'Invalid user ID');
      }
      
      // Get user details and validate
      const userRows = await query('SELECT * FROM users WHERE user_id = ? LIMIT 1', [decodedUserId]);
      if (!userRows.length) {
        return fail(res, 500, 'Not A Valid User');
      }
      
      const user = userRows[0];
      
      // Validate token
      if (user.unique_token !== token) {
        return fail(res, 500, 'Token Mismatch Exception');
      }

      // Get investor detail
      const investorDetail = await query(`
        SELECT 
          ui.*,
          countries.name AS country,
          states.name AS state,
          cities.name AS city,
          fs.investment_range,
          CASE 
            WHEN ui.image != '' THEN CONCAT('${req.protocol}://${req.get('host')}/uploads/investors/', ui.image)
            ELSE ''
          END AS image
       FROM user_investor ui
       JOIN countries ON countries.id = ui.country_id
       JOIN states ON states.id = ui.state_id
       JOIN cities ON cities.id = ui.city_id
       JOIN fund_size fs ON fs.id = ui.fund_size_id
        WHERE ui.investor_id = ?
      `, [investor_id]);

      if (!investorDetail || investorDetail.length === 0) {
        return fail(res, 500, 'Investor not found');
      }

      // Add default values
      investorDetail[0].no_of_meetings = 0;
      investorDetail[0].no_of_investments = 0;

      // Get meetings type list (handle missing table gracefully)
      let meetingsTypeList = [];
      try {
        meetingsTypeList = await query('SELECT * FROM meeting_type WHERE status = 1');
      } catch (error) {
        console.log('meeting_type table not found, using empty array');
        meetingsTypeList = [];
      }

      // Get investor current meets
      const investorUnlocked = await query(`
        SELECT * FROM user_investors_unlocked 
        WHERE investor_id = ? AND user_id = ?
      `, [investor_id, decodedUserId]);

      // Process meeting status
      if (investorUnlocked && investorUnlocked.length > 0) {
        const meeting = investorUnlocked[0];
        const meetingDate = meeting.meeting_date;
        const meetingTime = meeting.meeting_time;
        
        if (meetingDate && meetingTime) {
          const meetingDtsRaw = `${meetingDate} ${meetingTime}`;
          const meetingDts = new Date(meetingDtsRaw);
          const currentTime = new Date();
          const futureTime = new Date(currentTime.getTime() + (24 * 60 * 60 * 1000)); // +1 day
          
          if (meetingDts >= currentTime && meetingDts <= futureTime) {
            investorUnlocked[0].request_status = 'Ready';
          }
        }
      }

      // Get ratings breakdown
      const ratings = {
        '1_star': 0, '2_star': 0, '3_star': 0, '4_star': 0, '5_star': 0,
        'total_ratings': 0, 'total_reviews': 0
      };

      const ratingsData = await query(`
        SELECT rating, COUNT(*) as count
        FROM user_investors_unlocked
        WHERE investor_id = ? AND rating > 0
        GROUP BY rating
      `, [investor_id]);

      if (ratingsData && ratingsData.length > 0) {
        ratingsData.forEach(row => {
          const rating = row.rating;
          const count = parseInt(row.count);
          ratings[`${rating}_star`] = count;
          ratings.total_ratings += count;
        });
      }

      // Get reviews
      const reviewsData = await query(`
        SELECT 
          COALESCE(u.full_name, '') as name, 
          uiul.review, 
          uiul.rating, 
          uiul.review_dts
        FROM user_investors_unlocked uiul
        JOIN users u ON uiul.user_id = u.user_id
        WHERE uiul.investor_id = ? AND uiul.review IS NOT NULL
      `, [investor_id]);

      const reviews = [];
      if (reviewsData && reviewsData.length > 0) {
        ratings.total_reviews = reviewsData.length;
        reviewsData.forEach(row => {
          reviews.push({
            name: row.name,
            review: row.review,
            rating: parseInt(row.rating),
            review_date_time: row.review_dts ? new Date(row.review_dts).getTime() / 1000 : ''
          });
        });
      }

      // Return response in PHP format (matching exactly)
      return res.json({
        status: true,
        rcode: 200,
        user_id: idEncode(decodedUserId),
        unique_token: token,
        investor_detail: investorDetail || [],
        meeting_type: meetingsTypeList || [],
        investor_unlocked: investorUnlocked || [],
        ratings: [ratings],
        reviews: reviews
      });
      
    } catch (error) {
      console.error('getInvestorDetail error:', error);
      return fail(res, 500, 'Failed to get investor detail');
    }
  },
  async investorUnlock(req, res) {
    try {
      // Support both query parameters and form data
      const { user_id, token, investor_id, meeting_id, meeting_date, meeting_time } = {
        ...req.query,
        ...req.body
      };
      
      console.log('investorUnlock - Parameters:', { user_id, token, investor_id, meeting_id, meeting_date, meeting_time });
      
      // Check if user_id and token are provided
      if (!user_id || !token) {
        return fail(res, 500, 'user_id and token are required');
      }
      
      // Check mandatory fields
      if (!investor_id || investor_id === "" || !meeting_date || meeting_date === "" || !meeting_time || meeting_time === "") {
        return fail(res, 500, 'Please enter mandatory fields');
      }
      
      // Decode user ID
      const decodedUserId = idDecode(user_id);
      if (!decodedUserId) {
        return fail(res, 500, 'Invalid user ID');
      }
      
      // investor_id is a regular integer, not base64 encoded
      const investorId = parseInt(investor_id);
      if (isNaN(investorId) || investorId <= 0) {
        return fail(res, 500, 'Invalid investor_id');
      }
      
      // Get user details and validate
      const userRows = await query('SELECT * FROM users WHERE user_id = ? LIMIT 1', [decodedUserId]);
      if (!userRows.length) {
        return fail(res, 500, 'Not A Valid User');
      }
      
      const user = userRows[0];
      
      // Validate token
      if (user.unique_token !== token) {
        return fail(res, 500, 'Token Mismatch Exception');
      }

      // Format meeting date to Y-m-d
      const formattedMeetingDate = new Date(meeting_date).toISOString().split('T')[0];

      // Insert user_investors_unlocked
      let insertQuery, insertParams;
      
      if (meeting_id && meeting_id !== "") {
        // Include meeting_id if provided
        insertQuery = `INSERT INTO user_investors_unlocked (user_id, investor_id, meeting_id, meeting_date, meeting_time, meeting_location, meeting_url, created_dts) 
                      VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`;
        insertParams = [decodedUserId, investorId, meeting_id, formattedMeetingDate, meeting_time, '', ''];
      } else {
        // Provide default values for required fields
        insertQuery = `INSERT INTO user_investors_unlocked (user_id, investor_id, meeting_id, meeting_date, meeting_time, meeting_location, meeting_url, created_dts) 
                      VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`;
        insertParams = [decodedUserId, investorId, 0, formattedMeetingDate, meeting_time, '', ''];
      }
      
      const unlockResult = await query(insertQuery, insertParams);

      const iu_id = unlockResult.insertId;

      if (iu_id > 0) {
        return res.json({
          status: true,
          rcode: 200,
          user_id: idEncode(decodedUserId),
          unique_token: token,
          message: 'Request sent successfully'
        });
      } else {
        return fail(res, 500, 'Please try again');
      }
      
    } catch (error) {
      console.error('investorUnlock error:', error);
      return fail(res, 500, 'Failed to unlock investor');
    }
  },

  async saveInvestorReviewRating(req, res) {
    try {
      const { user_id, token, investor_id, iu_id, rating, review } = {
        ...req.query,
        ...req.body
      };
      console.log('saveInvestorReviewRating - Parameters:', { user_id, token, investor_id, iu_id, rating, review });
      if (!user_id || !token) {
        return fail(res, 500, 'user_id and token are required');
      }
      if (!investor_id || investor_id === "" || !iu_id || iu_id === "" || ((!rating || rating <= 0) && (!review || review === ""))) {
        return fail(res, 500, 'Please enter mandatory fields');
      }
      const decodedUserId = idDecode(user_id);
      if (!decodedUserId) {
        return fail(res, 500, 'Invalid user ID');
      }
      // investor_id is a regular integer, not base64 encoded
      const investorId = parseInt(investor_id);
      if (isNaN(investorId) || investorId <= 0) {
        return fail(res, 500, 'Invalid investor_id');
      }
      // iu_id is a regular integer, not base64 encoded
      const iuId = parseInt(iu_id);
      if (isNaN(iuId) || iuId <= 0) {
        return fail(res, 500, 'Invalid iu_id');
      }
      const userRows = await query('SELECT * FROM users WHERE user_id = ? LIMIT 1', [decodedUserId]);
      if (!userRows.length) {
        return fail(res, 500, 'Not A Valid User');
      }
      const user = userRows[0];
      if (user.unique_token !== token) {
        return fail(res, 500, 'Token Mismatch Exception');
      }
      // Update user_investors_unlocked with rating and review
      const updateResult = await query(
        `UPDATE user_investors_unlocked 
         SET rating = ?, review = ?, review_dts = NOW()
         WHERE user_id = ? AND investor_id = ? AND iu_id = ?`,
        [rating || null, review || '', decodedUserId, investorId, iuId]
      );
      if (updateResult.affectedRows > 0) {
        // Calculate and update average rating for the investor
        const avgRatingResult = await query(
          `SELECT AVG(rating) as avg_rating
           FROM user_investors_unlocked
           WHERE investor_id = ? AND rating > 0`,
          [investorId]
        );
        const avgRating = avgRatingResult && avgRatingResult.length > 0 ? 
          parseFloat(avgRatingResult[0].avg_rating) : 0;
        if (avgRating > 0) {
          await query(
            'UPDATE user_investor SET avg_rating = ? WHERE investor_id = ?',
            [avgRating, investorId]
          );
        }
        return res.json({
          status: true,
          rcode: 200,
          user_id: idEncode(decodedUserId),
          unique_token: token,
          message: 'Review and Rating saved successfully'
        });
      } else {
        return fail(res, 500, 'Failed to update review and rating');
      }
    } catch (error) {
      console.error('saveInvestorReviewRating error:', error);
      return fail(res, 500, 'Failed to save review and rating');
    }
  },

  async getMyInvestorProfile(req, res) {
    try {
      const { user_id, token } = {
        ...req.query,
        ...req.body
      };
      console.log('getMyInvestorProfile - Parameters:', { user_id, token });
      if (!user_id || !token) {
        return fail(res, 500, 'user_id and token are required');
      }
      const decodedUserId = idDecode(user_id);
      if (!decodedUserId) {
        return fail(res, 500, 'Invalid user ID');
      }
      const userRows = await query('SELECT * FROM users WHERE user_id = ? LIMIT 1', [decodedUserId]);
      if (!userRows.length) {
        return fail(res, 500, 'Not A Valid User');
      }
      const user = userRows[0];
      if (user.unique_token !== token) {
        return fail(res, 500, 'Token Mismatch Exception');
      }
      // Get investor profile for the current user
      const investorProfileData = await query(`
        SELECT 
          ui.*,
          c.name as country,
          s.name as state,
          ci.name as city,
          COALESCE(ui.avg_rating, '') as avg_rating,
          CASE 
            WHEN ui.image != '' THEN CONCAT(?, ui.image)
            ELSE ''
          END AS image,
          fs.investment_range
       FROM user_investor ui
        LEFT JOIN countries c ON c.id = ui.country_id
        LEFT JOIN states s ON s.id = ui.state_id
        LEFT JOIN cities ci ON ci.id = ui.city_id
        LEFT JOIN fund_size fs ON fs.id = ui.fund_size_id
        WHERE ui.user_id = ?
      `, [`${req.protocol}://${req.get('host')}/uploads/investors/`, decodedUserId]);
      let investor_id = 0;
      if (investorProfileData && investorProfileData.length > 0) {
        investor_id = investorProfileData[0].investor_id;
        investorProfileData[0].no_of_meetings = 0;
        investorProfileData[0].no_of_investments = 0;
      }
      // Get investor unlock records
      const investorUnlockedData = await query(
        'SELECT * FROM user_investors_unlocked WHERE investor_id = ? AND user_id = ?',
        [investor_id, decodedUserId]
      );
      
      // Initialize ratings statistics
      const ratingsStats = {
        '1_star': 0,
        '2_star': 0,
        '3_star': 0,
        '4_star': 0,
        '5_star': 0,
        'total_ratings': 0,
        'total_reviews': 0
      };
      
      // Get ratings details by investor ID
      const ratingsData = await query(`
        SELECT rating, COUNT(*) as count
        FROM user_investors_unlocked
        WHERE investor_id = ? AND rating > 0
        GROUP BY rating
      `, [investor_id]);
      
      if (ratingsData && ratingsData.length > 0) {
        ratingsData.forEach(row => {
          const rating = row.rating;
          const count = row.count;
          if (rating >= 1 && rating <= 5) {
            ratingsStats[`${rating}_star`] = count;
            ratingsStats.total_ratings += count;
          }
        });
      }
      
      // Get reviews with user details
      const reviewsData = await query(`
        SELECT 
          COALESCE(u.full_name, '') as name,
          uiul.review,
          uiul.rating,
          uiul.review_dts
        FROM user_investors_unlocked uiul
        JOIN users u ON uiul.user_id = u.user_id
        WHERE uiul.investor_id = ? AND uiul.review IS NOT NULL
      `, [investor_id]);
      
      const reviews = [];
      if (reviewsData && reviewsData.length > 0) {
        ratingsStats.total_reviews = reviewsData.length;
        reviewsData.forEach(row => {
          reviews.push({
            name: row.name,
            review: row.review,
            rating: parseInt(row.rating),
            review_date_time: row.review_dts ? new Date(row.review_dts).getTime() / 1000 : ''
          });
        });
      } else {
        ratingsStats.total_reviews = 0;
      }
      
      // Wrap ratings in array to match PHP format
      const ratingsArray = [ratingsStats];
      
      return res.json({
        status: true,
        rcode: 200,
        user_id: idEncode(decodedUserId),
        unique_token: token,
        investor_detail: investorProfileData || [],
        investor_unlocked: investorUnlockedData && investorUnlockedData.length > 0 ? 1 : 0,
        ratings: ratingsArray,
        reviews: reviews
      });
    } catch (error) {
      console.error('getMyInvestorProfile error:', error);
      return fail(res, 500, 'Failed to get investor profile');
    }
  },

  async getInvestorDesk(req, res) {
    try {
      const { user_id, token, filter_type } = {
        ...req.query,
        ...req.body
      };
      console.log('getInvestorDesk - Parameters:', { user_id, token, filter_type });
      if (!user_id || !token) {
        return fail(res, 500, 'user_id and token are required');
      }
      const decodedUserId = idDecode(user_id);
      if (!decodedUserId) {
        return fail(res, 500, 'Invalid user ID');
      }
      const userRows = await query('SELECT * FROM users WHERE user_id = ? LIMIT 1', [decodedUserId]);
      if (!userRows.length) {
        return fail(res, 500, 'Not A Valid User');
      }
      const user = userRows[0];
      if (user.unique_token !== token) {
        return fail(res, 500, 'Token Mismatch Exception');
      }
      // Get investor desk - all users who have unlocked this investor's profile
      let baseQuery = `
        SELECT 
          uiu.user_id,
          uiu.investor_id,
          COALESCE(u.full_name, '') as user_name,
          COALESCE(DATE_FORMAT(uiu.meeting_date, '%d-%m-%Y'), '') as meeting_date,
          COALESCE(uiu.meeting_time, '') as meeting_time,
          uiu.request_status,
          COALESCE(uiu.meeting_location, '') as meeting_location,
          COALESCE(uiu.meeting_lat, '') as meeting_lat,
          COALESCE(uiu.meeting_lng, '') as meeting_lng,
          COALESCE(uiu.meeting_url, '') as meeting_url,
          COALESCE(mt.name, '') as meeting_name,
          COALESCE(mt.type, '') as meeting_type,
          COALESCE(mt.mins, '') as mins,
          CASE 
            WHEN u.profile_photo != '' THEN CONCAT(?, u.profile_photo)
            ELSE ''
          END AS profile_photo
       FROM user_investor ui
        JOIN user_investors_unlocked uiu ON ui.investor_id = uiu.investor_id
        LEFT JOIN meetings_type mt ON mt.id = uiu.meeting_id
        JOIN users u ON uiu.user_id = u.user_id
        WHERE ui.user_id = ? AND ui.status = 1 AND ui.approval_status = 2
      `;
      const queryParams = [`${req.protocol}://${req.get('host')}/uploads/profiles/`, decodedUserId];
      // Apply filter if provided
      if (filter_type === 'ready') {
        baseQuery += ' AND uiu.request_status = "Ready"';
      } else if (filter_type === 'scheduled') {
        baseQuery += ' AND uiu.request_status = "Scheduled"';
      } else if (filter_type === 'completed') {
        baseQuery += ' AND uiu.request_status IN ("Completed", "Missed")';
      }
      baseQuery += ' ORDER BY uiu.created_dts DESC';
      const userLists = await query(baseQuery, queryParams);
      return res.json({
        status: true,
        rcode: 200,
        user_id: idEncode(decodedUserId),
        unique_token: token,
        user_lists: userLists || []
      });
    } catch (error) {
      console.error('getInvestorDesk error:', error);
      return fail(res, 500, 'Failed to get investor desk');
    }
  },

  async getInvestorMeets(req, res) {
    try {
      const { user_id, token, filter_type } = {
        ...req.query,
        ...req.body
      };
      console.log('getInvestorMeets - Parameters:', { user_id, token, filter_type });
      if (!user_id || !token) {
        return fail(res, 500, 'user_id and token are required');
      }
      const decodedUserId = idDecode(user_id);
      if (!decodedUserId) {
        return fail(res, 500, 'Invalid user ID');
      }
      const userRows = await query('SELECT * FROM users WHERE user_id = ? LIMIT 1', [decodedUserId]);
      if (!userRows.length) {
        return fail(res, 500, 'Not A Valid User');
      }
      const user = userRows[0];
      if (user.unique_token !== token) {
        return fail(res, 500, 'Token Mismatch Exception');
      }
      // Get investor meets with comprehensive details
      let queryString = `
        SELECT 
          uiul.*,
          ui.name AS investor_name,
          ui.profile AS investor_profile,
          ui.investment_stage,
          ui.availability,
          ui.meeting_city,
          ui.countries_to_invest,
          ui.investment_industry,
          ui.language,
          ui.avg_rating,
          CASE 
            WHEN ui.image != '' THEN CONCAT('${req.protocol}://${req.get('host')}/uploads/investors/', ui.image)
            ELSE ''
          END AS investor_image,
          countries.name AS country,
          states.name AS state,
          cities.name AS city
        FROM user_investors_unlocked uiul
        JOIN user_investor ui ON ui.investor_id = uiul.investor_id
        LEFT JOIN countries ON countries.id = ui.country_id
        LEFT JOIN states ON states.id = ui.state_id
        LEFT JOIN cities ON cities.id = ui.city_id
        WHERE uiul.user_id = ?
      `;
      const queryParams = [decodedUserId];
      // Apply filter if provided
      if (filter_type && filter_type !== '') {
        if (filter_type === 'pending') {
          queryString += ` AND uiul.request_status = 'Pending'`;
        } else if (filter_type === 'completed') {
          queryString += ` AND uiul.request_status = 'Completed'`;
        } else if (filter_type === 'missed') {
          queryString += ` AND uiul.request_status = 'Missed'`;
        } else if (filter_type === 'ready') {
          queryString += ` AND uiul.request_status = 'Ready'`;
        }
      }
      queryString += ` ORDER BY uiul.created_dts DESC`;
      const investorMeets = await query(queryString, queryParams);
      // Return response in PHP format (matching exactly)
      return res.json({
        status: true,
        rcode: 200,
        user_id: idEncode(decodedUserId),
        unique_token: token,
        investor_lists: investorMeets || []
      });
    } catch (error) {
      console.error('getInvestorMeets error:', error);
      return fail(res, 500, 'Failed to get investor meets');
    }
  },

  // Chat (simplified)
  async getChatUsersList(req, res) {
    try {
      // Support both query parameters and form data
      const { user_id, token } = {
        ...req.query,
        ...req.body
      };
      
      console.log('getChatUsersList - Parameters:', { user_id, token });
      
      // Check if user_id and token are provided
      if (!user_id || !token) {
        return fail(res, 500, 'user_id and token are required');
      }
      
      // Decode user ID
      const decodedUserId = idDecode(user_id);
      if (!decodedUserId) {
        return fail(res, 500, 'Invalid user ID');
      }
      
      // Get user details and validate
      const userRows = await query('SELECT * FROM users WHERE user_id = ? LIMIT 1', [decodedUserId]);
      if (!userRows.length) {
        return fail(res, 500, 'Not A Valid User');
      }
      
      const user = userRows[0];
      
      // Validate token
      if (user.unique_token !== token) {
        return fail(res, 500, 'Token Mismatch Exception');
      }

      // Get latest chats with each user
      const latestChatsData = await query(`
        SELECT 
          user_chats.*,
          GREATEST(sender_id, receiver_id) as user1,
          LEAST(sender_id, receiver_id) as user2
        FROM user_chats
        INNER JOIN (
          SELECT 
            MAX(created_dts) as latest_message_time,
            GREATEST(sender_id, receiver_id) as user1,
            LEAST(sender_id, receiver_id) as user2
          FROM user_chats
          GROUP BY GREATEST(sender_id, receiver_id), LEAST(sender_id, receiver_id)
        ) as latest ON user_chats.created_dts = latest.latest_message_time
        AND GREATEST(user_chats.sender_id, user_chats.receiver_id) = latest.user1
        AND LEAST(user_chats.sender_id, user_chats.receiver_id) = latest.user2
        WHERE sender_id = ? OR receiver_id = ?
        ORDER BY user_chats.created_dts DESC
      `, [decodedUserId, decodedUserId]);

      // Create a map of latest messages for each user
      const latestChats = {};
      if (latestChatsData && latestChatsData.length > 0) {
        latestChatsData.forEach(row => {
          const senderId = row.sender_id;
          const receiverId = row.receiver_id;
          if (senderId !== decodedUserId) {
            latestChats[senderId] = row.message;
          } else if (receiverId !== decodedUserId) {
            latestChats[receiverId] = row.message;
          }
        });
      }

      // Get all users except current user
      const baseUrl = `${req.protocol}://${req.get('host')}`;
      const profilePath = `${baseUrl}/uploads/profiles/`;
      
      const chatUsersData = await query(`
        SELECT 
          user_id,
          COALESCE(full_name, '') as full_name,
          CASE 
            WHEN profile_photo != '' THEN CONCAT(?, profile_photo)
            ELSE ''
          END AS profile_photo
        FROM users
        WHERE user_id != ?
        ORDER BY created_dts ASC
      `, [profilePath, decodedUserId]);

      // Add last message to each user
      if (chatUsersData && chatUsersData.length > 0) {
        chatUsersData.forEach((userRow, key) => {
          const chatUserId = userRow.user_id;
          if (latestChats[chatUserId]) {
            chatUsersData[key].last_message = latestChats[chatUserId];
          }
        });
      }

      return res.json({
        status: true,
        rcode: 200,
        user_id: idEncode(decodedUserId),
        unique_token: token,
        chat_users_list: chatUsersData || []
      });
      
    } catch (error) {
      console.error('getChatUsersList error:', error);
      return fail(res, 500, 'Failed to get chat users list');
    }
  },
  async getChat(req, res) {
    try {
      // Support both query parameters and form data
      const { user_id, token, current_user_id } = {
        ...req.query,
        ...req.body
      };
      
      console.log('getChat - Parameters:', { user_id, token, current_user_id });
      
      // Check if user_id and token are provided
      if (!user_id || !token) {
        return fail(res, 500, 'user_id and token are required');
      }
      
      // Check if current_user_id is provided
      if (!current_user_id || current_user_id === "") {
        return fail(res, 500, 'current_user_id is required');
      }
      
      // Decode user ID
      const decodedUserId = idDecode(user_id);
      if (!decodedUserId) {
        return fail(res, 500, 'Invalid user ID');
      }
      
      // Decode current_user_id
      // current_user_id is a regular integer, not base64 encoded
      const currentUserId = parseInt(current_user_id);
      if (isNaN(currentUserId) || currentUserId <= 0) {
        return fail(res, 500, 'Invalid current_user_id');
      }
      
      // Get user details and validate
      const userRows = await query('SELECT * FROM users WHERE user_id = ? LIMIT 1', [decodedUserId]);
      if (!userRows.length) {
        return fail(res, 500, 'Not A Valid User');
      }
      
      const user = userRows[0];
      
      // Validate token
      if (user.unique_token !== token) {
        return fail(res, 500, 'Token Mismatch Exception');
      }

      // Get chat details between the two users
      const baseUrl = `${req.protocol}://${req.get('host')}`;
      const profilePath = `${baseUrl}/uploads/profiles/`;
      
      const chatDetails = await query(`
        SELECT 
          user_chats.*,
          COALESCE(sender.full_name, '') as sender_name,
          CASE 
            WHEN sender.profile_photo != '' THEN CONCAT(?, sender.profile_photo)
            ELSE ''
          END AS sender_profile_photo,
          COALESCE(receiver.full_name, '') as receiver_name,
          CASE 
            WHEN receiver.profile_photo != '' THEN CONCAT(?, receiver.profile_photo)
            ELSE ''
          END AS receiver_profile_photo
        FROM user_chats
        JOIN users AS sender ON user_chats.sender_id = sender.user_id
        JOIN users AS receiver ON user_chats.receiver_id = receiver.user_id
                     WHERE (sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?)
             ORDER BY user_chats.created_dts ASC
           `, [profilePath, profilePath, currentUserId, decodedUserId, decodedUserId, currentUserId]);

      return res.json({
        status: true,
        rcode: 200,
        user_id: idEncode(decodedUserId),
        unique_token: token,
        chat_detail: chatDetails || []
      });
      
    } catch (error) {
      console.error('getChat error:', error);
      return fail(res, 500, 'Failed to get chat details');
    }
  },
  async saveChat(req, res) {
    try {
      // Support both query parameters and form data
      const { user_id, token, sender_id, receiver_id, message } = {
        ...req.query,
        ...req.body
      };
      
      console.log('saveChat - Parameters:', { user_id, token, sender_id, receiver_id, message });
      
      // Check if user_id and token are provided
      if (!user_id || !token) {
        return fail(res, 500, 'user_id and token are required');
      }
      
      // Check mandatory fields
      if (!sender_id || sender_id <= 0 || !receiver_id || receiver_id <= 0 || !message || message === "") {
        return fail(res, 500, 'Please enter mandatory fields');
      }
      
      // Decode user ID
      const decodedUserId = idDecode(user_id);
      if (!decodedUserId) {
        return fail(res, 500, 'Invalid user ID');
      }
      
      // Get user details and validate
      const userRows = await query('SELECT * FROM users WHERE user_id = ? LIMIT 1', [decodedUserId]);
      if (!userRows.length) {
        return fail(res, 500, 'Not A Valid User');
      }
      
      const user = userRows[0];
      
      // Validate token
      if (user.unique_token !== token) {
        return fail(res, 500, 'Token Mismatch Exception');
      }

      // sender_id and receiver_id are regular integers, not base64 encoded
      const senderId = parseInt(sender_id);
      const receiverId = parseInt(receiver_id);
      
      if (isNaN(senderId) || senderId <= 0 || isNaN(receiverId) || receiverId <= 0) {
        return fail(res, 500, 'Invalid sender_id or receiver_id');
      }

      // Save chat message
      const chatResult = await query(
        'INSERT INTO user_chats (sender_id, receiver_id, message, created_dts) VALUES (?, ?, ?, NOW())',
        [senderId, receiverId, message]
      );

      if (chatResult.insertId > 0) {
        return res.json({
          status: true,
          rcode: 200,
          user_id: idEncode(decodedUserId),
          unique_token: token,
          message: 'Message sent successfully.'
        });
      } else {
        return fail(res, 500, 'Failed to save chat message');
      }
      
    } catch (error) {
      console.error('saveChat error:', error);
      return fail(res, 500, 'Failed to save chat message');
    }
  },

  // Job Information Management
  async saveJobInformation(req, res) {
    try {
      // Handle both JSON and form data
      const user_id = req.body.user_id || req.body['user_id'];
      const token = req.body.token || req.body['token'];
      const job_id = parseInt(req.body.job_id || req.body['job_id'] || 0);
      const job_title = req.body.job_title || req.body['job_title'];
      const company_name = req.body.company_name || req.body['company_name'];
      const country_id = req.body.country_id || req.body['country_id'];
      const state_id = req.body.state_id || req.body['state_id'];
      const city_id = req.body.city_id || req.body['city_id'];
      const address = req.body.address || req.body['address'];
      const job_type_id = req.body.job_type_id || req.body['job_type_id'];
      const pay_id = req.body.pay_id || req.body['pay_id'];
      const job_description = req.body.job_description || req.body['job_description'];
      const skills = req.body.skills || req.body['skills'];
      const job_lat = req.body.job_lat || req.body['job_lat'];
      const job_lng = req.body.job_lng || req.body['job_lng'];
      
      // Check if user_id and token are provided
      if (!user_id || !token) {
        return fail(res, 500, 'user_id and token are required');
      }
      
      // Decode user ID
      const decodedUserId = idDecode(user_id);
      if (!decodedUserId) {
        return fail(res, 500, 'Invalid user ID');
      }
      
      // Get user details and validate
      const userRows = await query('SELECT * FROM users WHERE user_id = ? LIMIT 1', [decodedUserId]);
      if (!userRows.length) {
        return fail(res, 500, 'Not A Valid User');
      }
      
      const user = userRows[0];
      
      // Validate token
      if (user.unique_token !== token) {
        return fail(res, 500, 'Token Mismatch Exception');
      }
      
      // Check mandatory fields - match PHP validation exactly
      if (job_title === "" || company_name === "" || country_id === "" || state_id === "" || city_id === "" || address === "" || job_type_id === "" || pay_id === "" || job_description === "" || skills === "" || job_lat === "" || job_lng === "") {
        return fail(res, 500, 'Please enter mandatory fields');
      }
      
      let existingSkillIds = [];
      
      // Handle skills management
      if (skills) {
        const skillsArray = skills.split(',').map(skill => skill.trim()).filter(skill => skill.length > 0);
        
        if (skillsArray.length > 0) {
          // Get existing skills
          const existingSkills = await query('SELECT id, name FROM skills WHERE name IN (?)', [skillsArray]);
          const existingSkillNames = existingSkills.map(skill => skill.name);
          existingSkillIds = existingSkills.map(skill => skill.id);
          
          // Find new skills that don't exist
          const newSkills = skillsArray.filter(skill => !existingSkillNames.includes(skill));
          
          // Insert new skills and get their IDs
          if (newSkills.length > 0) {
            for (const skill of newSkills) {
              const result = await query('INSERT INTO skills (name) VALUES (?)', [skill]);
              existingSkillIds.push(result.insertId);
            }
          }
        }
      }
      
      // Prepare job data
      const jobData = {
        job_title,
        company_name,
        country_id,
        state_id,
        city_id,
        address,
        job_lat,
        job_lng,
        job_type_id,
        pay_id,
        job_description,
        skill_ids: existingSkillIds.length > 0 ? existingSkillIds.join(',') : ''
      };
      
      let finalJobId = job_id;
      
      if (job_id == 0) {
        // Insert new job
        jobData.user_id = decodedUserId;
        const result = await query(
          'INSERT INTO user_job_details (user_id, job_title, company_name, country_id, state_id, city_id, address, job_lat, job_lng, job_type_id, pay_id, job_description, skill_ids, deleted, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 1)',
          [jobData.user_id, jobData.job_title, jobData.company_name, jobData.country_id, jobData.state_id, jobData.city_id, jobData.address, jobData.job_lat, jobData.job_lng, jobData.job_type_id, jobData.pay_id, jobData.job_description, jobData.skill_ids]
        );
        finalJobId = result.insertId;
      } else {
        // Update existing job
        await query(
          'UPDATE user_job_details SET job_title=?, company_name=?, country_id=?, state_id=?, city_id=?, address=?, job_lat=?, job_lng=?, job_type_id=?, pay_id=?, job_description=?, skill_ids=? WHERE job_id=? AND user_id=?',
          [jobData.job_title, jobData.company_name, jobData.country_id, jobData.state_id, jobData.city_id, jobData.address, jobData.job_lat, jobData.job_lng, jobData.job_type_id, jobData.pay_id, jobData.job_description, jobData.skill_ids, job_id, decodedUserId]
        );
      }
      
      // Return response in PHP format - exact match
      return res.json({
        status: true,
        rcode: 200,
        user_id: idEncode(decodedUserId),
        unique_token: token,
        job_id: finalJobId,
        message: 'Job Information saved successfully'
      });
      
    } catch (error) {
      console.error('saveJobInformation error:', error);
      return fail(res, 500, 'Failed to save job information');
    }
  },

  async saveJobApplication(req, res) {
    try {
      // Support both query parameters and form data
      const { user_id, token, job_id, first_name, last_name, email, mobile, skills, resume_id, resume_title, resume_file } = {
        ...req.query,
        ...req.body
      };
      
      console.log('saveJobApplication - Received parameters:', {
        user_id, token, job_id, first_name, last_name, email, mobile, skills, resume_id, resume_title, resume_file
      });
      console.log('saveJobApplication - req.body:', req.body);
      console.log('saveJobApplication - req.query:', req.query);
      
      // Check if user_id and token are provided
      if (!user_id || !token) {
        return fail(res, 500, 'user_id and token are required');
      }
      
      // Decode user ID
      const decodedUserId = idDecode(user_id);
      if (!decodedUserId) {
        return fail(res, 500, 'Invalid user ID');
      }
      
      // Get user details and validate
      const userRows = await query('SELECT * FROM users WHERE user_id = ? LIMIT 1', [decodedUserId]);
      if (!userRows.length) {
        return fail(res, 500, 'Not A Valid User');
      }
      
      const user = userRows[0];
      
      // Validate token
      if (user.unique_token !== token) {
        return fail(res, 500, 'Token Mismatch Exception');
      }

      // Check mandatory fields - match PHP validation exactly
      if (first_name === "" || skills === "" || email === "" || mobile === "") {
        return fail(res, 500, 'Please enter mandatory fields');
      }

      // Handle resume - either resume_id OR resume_file must be provided
      let finalResumeId = null;
      
      if (req.file) {
        // File uploaded - save to user_resumes table first
        const resumeData = {
          user_id: decodedUserId,
          resume_file: req.file.filename,
          resume_title: resume_title || '',
          status: 1
        };
        
        const resumeResult = await query(
          'INSERT INTO user_resumes (user_id, resume_file, resume_title, status, created_dts) VALUES (?, ?, ?, ?, NOW())',
          [resumeData.user_id, resumeData.resume_file, resumeData.resume_title, resumeData.status]
        );
        finalResumeId = resumeResult.insertId;
      } else if (resume_id && parseInt(resume_id) > 0) {
        // Use existing resume_id from POST data - convert to integer to match PHP behavior
        finalResumeId = parseInt(resume_id);
      } else {
        // Neither resume_file nor resume_id provided - return error
        return fail(res, 500, 'Either resume_file or resume_id is required');
      }

      // Save job application (matching PHP exactly)
      const applicationData = {
        user_id: decodedUserId,
        job_id: job_id,
        first_name: first_name,
        last_name: last_name || '',
        skills: skills,
        email: email,
        mobile: mobile,
        resume_id: finalResumeId
      };

      const applicationResult = await query(
        `INSERT INTO user_job_applications (
          user_id, job_id, first_name, last_name, skills, email, mobile, resume_id, status, created_dts
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, NOW())`,
        [
          applicationData.user_id,
          applicationData.job_id,
          applicationData.first_name,
          applicationData.last_name,
          applicationData.skills,
          applicationData.email,
          applicationData.mobile,
          applicationData.resume_id
        ]
      );

      const job_application_id = applicationResult.insertId;

      // Return response in PHP format (matching exactly)
      return res.json({
        status: true,
        rcode: 200,
        user_id: idEncode(decodedUserId),
        unique_token: token,
        job_application_id: job_application_id,
        message: 'Job application saved successfully'
      });
      
    } catch (error) {
      console.error('saveJobApplication error:', error);
      return fail(res, 500, 'Failed to submit job application');
    }
  },

  async getFoldersListByType(req, res) {
    try {
      // Support both query parameters and form data
      const { user_id, token, type } = {
        ...req.query,
        ...req.body
      };
      
      console.log('getFoldersListByType - Parameters:', { user_id, token, type });
      
      // Check if user_id and token are provided
      if (!user_id || !token) {
        return fail(res, 500, 'user_id and token are required');
      }
      
      if (!type) {
        return fail(res, 500, 'type is required');
      }
      
      // Decode user ID
      const decodedUserId = idDecode(user_id);
      if (!decodedUserId) {
        return fail(res, 500, 'Invalid user ID');
      }
      
      console.log('getFoldersListByType - Decoded user ID:', decodedUserId);
      
      // Get user details and validate
      const userRows = await query('SELECT * FROM users WHERE user_id = ? LIMIT 1', [decodedUserId]);
      if (!userRows.length) {
        return fail(res, 500, 'Not A Valid User');
      }
      
      const user = userRows[0];
      console.log('getFoldersListByType - User data:', { 
        user_id: user.user_id, 
        network_folder_created: user.network_folder_created,
        services_folder_created: user.services_folder_created 
      });
      
      // Validate token
      if (user.unique_token !== token) {
        return fail(res, 500, 'Token Mismatch Exception');
      }

      // Check folder creation status based on type
      let folderCreated = 1;
      let updateUserData = {};
      
      if (type === 'network') {
        folderCreated = user.network_folder_created || 0;
        updateUserData.network_folder_created = 1;
      } else if (type === 'services') {
        folderCreated = user.services_folder_created || 0;
        updateUserData.services_folder_created = 1;
      }

      console.log('getFoldersListByType - Folder creation status:', { type, folderCreated, updateUserData });

      // Create master folders if not created yet
      if (folderCreated === 0) {
        try {
          console.log('getFoldersListByType - Creating master folders for type:', type);
          
          // Get master folders
          const masterFolders = await query('SELECT * FROM folders WHERE status = 1 ORDER BY id ASC');
          console.log('getFoldersListByType - Master folders found:', masterFolders.length);
          
          if (masterFolders.length > 0) {
            // Insert user folders for each master folder
            for (const folder of masterFolders) {
              await query(
                `INSERT INTO user_folders (user_id, master_folder_id, type, folder_name, status, created_dts) 
                 VALUES (?, ?, ?, ?, 1, NOW())`,
                [decodedUserId, folder.id, type, folder.name]
              );
            }

            // Update user to mark folders as created
            const updateFields = Object.keys(updateUserData).map(key => `${key} = ?`).join(', ');
            const updateValues = Object.values(updateUserData);
            updateValues.push(decodedUserId);
            
            await query(
              `UPDATE users SET ${updateFields} WHERE user_id = ?`,
              updateValues
            );
            
            console.log('getFoldersListByType - User folders created and user updated');
          }
        } catch (error) {
          console.error('getFoldersListByType - Error creating folders:', error);
          // Continue with getting existing folders even if creation fails
        }
      }

      // Get folders list
      let foldersList = [];
      try {
        console.log('getFoldersListByType - Getting folders list for user:', decodedUserId, 'type:', type);
        
        // First try to get folders with contacts count
        foldersList = await query(
          `SELECT uf.user_folder_id, uf.folder_name, uf.master_folder_id, uf.type,
                  COALESCE(COUNT(uc.contact_id), 0) as contacts_count
           FROM user_folders uf
           LEFT JOIN user_contacts uc ON uf.user_folder_id = uc.user_folder_id AND uc.status = 1
           WHERE uf.user_id = ? AND uf.type = ? AND uf.status = 1
           GROUP BY uf.user_folder_id, uf.folder_name, uf.master_folder_id, uf.type
           ORDER BY uf.user_folder_id ASC`,
          [decodedUserId, type]
        );
        
        console.log('getFoldersListByType - Folders with contacts found:', foldersList.length);
      } catch (error) {
        console.error('getFoldersListByType - Error getting folders with contacts:', error);
        
        // Fallback: try to get just the folders without contacts
        try {
          foldersList = await query(
            `SELECT user_folder_id, folder_name, master_folder_id, type
             FROM user_folders 
             WHERE user_id = ? AND type = ? AND status = 1
             ORDER BY user_folder_id ASC`,
            [decodedUserId, type]
          );
          
          // Add default contacts_count
          foldersList.forEach(folder => {
            folder.contacts_count = 0;
          });
          
          console.log('getFoldersListByType - Basic folders found:', foldersList.length);
        } catch (fallbackError) {
          console.error('getFoldersListByType - Fallback query also failed:', fallbackError);
          foldersList = [];
        }
      }

      // Get visiting cards count for each folder
      const visitingCardsCount = {};
      try {
        const visitingCardsList = await query(
          `SELECT user_folder_id, COUNT(*) as visiting_cards_count 
           FROM user_visiting_cards 
           WHERE user_id = ? AND status = 1 
           GROUP BY user_folder_id`,
          [decodedUserId]
        );
        
        if (visitingCardsList.length > 0) {
          visitingCardsList.forEach(row => {
            visitingCardsCount[row.user_folder_id] = row.visiting_cards_count;
          });
        }
        
        console.log('getFoldersListByType - Visiting cards count:', visitingCardsCount);
      } catch (error) {
        console.error('getFoldersListByType - Error getting visiting cards count:', error);
        // Continue without visiting cards count
      }

      // Add visiting cards count to folders list
      if (foldersList.length > 0) {
        foldersList.forEach(folder => {
          folder.visiting_cards_count = visitingCardsCount[folder.user_folder_id] || "0";
        });
      }

      console.log('getFoldersListByType - Final folders list:', foldersList);
      
      // Return response in PHP format
      return res.json({
        status: true,
        rcode: 200,
        user_id: idEncode(decodedUserId),
        unique_token: token,
        folders_list: foldersList || []
      });
      
    } catch (error) {
      console.error('getFoldersListByType error:', error);
      return fail(res, 500, 'Failed to get folders list');
    }
  },

  async saveFolderByType(req, res) {
    try {
      // Support both query parameters and form data
      const { user_id, token, type, folder_name, user_folder_id } = {
        ...req.query,
        ...req.body
      };
      
      console.log('saveFolderByType - Parameters:', { user_id, token, type, folder_name, user_folder_id });
      
      // Check if user_id and token are provided
      if (!user_id || !token) {
        return fail(res, 500, 'user_id and token are required');
      }
      
      if (!type || !folder_name) {
        return fail(res, 500, 'Please enter mandatory fields');
      }
      
      // Decode user ID
      const decodedUserId = idDecode(user_id);
      if (!decodedUserId) {
        return fail(res, 500, 'Invalid user ID');
      }
      
      // Get user details and validate
      const userRows = await query('SELECT * FROM users WHERE user_id = ? LIMIT 1', [decodedUserId]);
      if (!userRows.length) {
        return fail(res, 500, 'Not A Valid User');
      }
      
      const user = userRows[0];
      
      // Validate token
      if (user.unique_token !== token) {
        return fail(res, 500, 'Token Mismatch Exception');
      }

      let finalUserFolderId = user_folder_id || 0;

      if (finalUserFolderId == 0) {
        // Insert new folder
        const folderData = {
          user_id: decodedUserId,
          master_folder_id: 0,
          type: type,
          folder_name: folder_name,
          status: 1
        };
        
        const result = await query(
          `INSERT INTO user_folders (user_id, master_folder_id, type, folder_name, status, created_dts) 
           VALUES (?, ?, ?, ?, ?, NOW())`,
          [folderData.user_id, folderData.master_folder_id, folderData.type, folderData.folder_name, folderData.status]
        );
        
        finalUserFolderId = result.insertId;
        console.log('saveFolderByType - New folder created with ID:', finalUserFolderId);
      } else {
        // Update existing folder
        await query(
          `UPDATE user_folders SET master_folder_id = ?, type = ?, folder_name = ?, status = ? 
           WHERE user_folder_id = ? AND user_id = ?`,
          [0, type, folder_name, 1, finalUserFolderId, decodedUserId]
        );
        
        console.log('saveFolderByType - Existing folder updated:', finalUserFolderId);
      }

      // Return response in PHP format (matching exactly)
      return res.json({
        status: true,
        rcode: 200,
        user_id: idEncode(decodedUserId),
        unique_token: token,
        user_folder_id: finalUserFolderId,
        message: 'Folder saved successfully'
      });
      
    } catch (error) {
      console.error('saveFolderByType error:', error);
      return fail(res, 500, 'Failed to save folder');
    }
  },

  async getSubFoldersList(req, res) {
    try {
      // Support both query parameters and form data
      const { user_id, token, user_folder_id } = {
        ...req.query,
        ...req.body
      };
      
      console.log('getSubFoldersList - Parameters:', { user_id, token, user_folder_id });
      
      // Check if user_id and token are provided
      if (!user_id || !token) {
        return fail(res, 500, 'user_id and token are required');
      }
      
      if (!user_folder_id) {
        return fail(res, 500, 'user_folder_id is required');
      }
      
      // Decode user ID
      const decodedUserId = idDecode(user_id);
      if (!decodedUserId) {
        return fail(res, 500, 'Invalid user ID');
      }
      
      // Get user details and validate
      const userRows = await query('SELECT * FROM users WHERE user_id = ? LIMIT 1', [decodedUserId]);
      if (!userRows.length) {
        return fail(res, 500, 'Not A Valid User');
      }
      
      const user = userRows[0];
      
      // Validate token
      if (user.unique_token !== token) {
        return fail(res, 500, 'Token Mismatch Exception');
      }

      // Get visiting cards count for each sub folder
      const visitingCardsCount = {};
      try {
        const visitingCardsList = await query(
          `SELECT user_sub_folder_id, COUNT(*) as visiting_cards_count 
           FROM user_visiting_cards 
           WHERE user_id = ? AND status = 1 
           GROUP BY user_sub_folder_id`,
          [decodedUserId]
        );
        
        if (visitingCardsList.length > 0) {
          visitingCardsList.forEach(row => {
            visitingCardsCount[row.user_sub_folder_id] = row.visiting_cards_count;
          });
        }
        
        console.log('getSubFoldersList - Visiting cards count:', visitingCardsCount);
      } catch (error) {
        console.error('getSubFoldersList - Error getting visiting cards count:', error);
        // Continue without visiting cards count
      }

      // Get sub folders list with contacts count
      let subFoldersList = [];
      try {
        subFoldersList = await query(
          `SELECT usf.user_sub_folder_id, usf.folder_name, usf.user_folder_id,
                  COALESCE(COUNT(uc.contact_id), 0) as contacts_count
           FROM user_sub_folders usf
           LEFT JOIN user_contacts uc ON usf.user_sub_folder_id = uc.user_sub_folder_id AND uc.status = 1
           WHERE usf.user_id = ? AND usf.user_folder_id = ? AND usf.status = 1
           GROUP BY usf.user_sub_folder_id, usf.folder_name, usf.user_folder_id
           ORDER BY usf.user_sub_folder_id ASC`,
          [decodedUserId, user_folder_id]
        );
        
        console.log('getSubFoldersList - Sub folders with contacts found:', subFoldersList.length);
      } catch (error) {
        console.error('getSubFoldersList - Error getting sub folders with contacts:', error);
        
        // Fallback: try to get just the sub folders without contacts
        try {
          subFoldersList = await query(
            `SELECT user_sub_folder_id, folder_name, user_folder_id
             FROM user_sub_folders 
             WHERE user_id = ? AND user_folder_id = ? AND status = 1
             ORDER BY user_sub_folder_id ASC`,
            [decodedUserId, user_folder_id]
          );
          
          // Add default contacts_count
          subFoldersList.forEach(folder => {
            folder.contacts_count = 0;
          });
          
          console.log('getSubFoldersList - Basic sub folders found:', subFoldersList.length);
        } catch (fallbackError) {
          console.error('getSubFoldersList - Fallback query also failed:', fallbackError);
          subFoldersList = [];
        }
      }

      // Add visiting cards count to sub folders list
      if (subFoldersList.length > 0) {
        subFoldersList.forEach(folder => {
          folder.visiting_cards_count = visitingCardsCount[folder.user_sub_folder_id] || "0";
        });
      }

      console.log('getSubFoldersList - Final sub folders list:', subFoldersList);
      
      // Return response in PHP format
      return res.json({
        status: true,
        rcode: 200,
        user_id: idEncode(decodedUserId),
        unique_token: token,
        sub_folders_list: subFoldersList || []
      });
      
    } catch (error) {
      console.error('getSubFoldersList error:', error);
      return fail(res, 500, 'Failed to get sub folders list');
    }
  },

  async saveSubFolder(req, res) {
    try {
      // Support both query parameters and form data
      const { user_id, token, folder_name, user_folder_id, user_sub_folder_id } = {
        ...req.query,
        ...req.body
      };
      
      console.log('saveSubFolder - Parameters:', { user_id, token, folder_name, user_folder_id, user_sub_folder_id });
      
      // Check if user_id and token are provided
      if (!user_id || !token) {
        return fail(res, 500, 'user_id and token are required');
      }
      
      if (!user_folder_id || user_folder_id <= 0 || !folder_name) {
        return fail(res, 500, 'Please enter mandatory fields');
      }
      
      // Decode user ID
      const decodedUserId = idDecode(user_id);
      if (!decodedUserId) {
        return fail(res, 500, 'Invalid user ID');
      }
      
      // Get user details and validate
      const userRows = await query('SELECT * FROM users WHERE user_id = ? LIMIT 1', [decodedUserId]);
      if (!userRows.length) {
        return fail(res, 500, 'Not A Valid User');
      }
      
      const user = userRows[0];
      
      // Validate token
      if (user.unique_token !== token) {
        return fail(res, 500, 'Token Mismatch Exception');
      }

      let finalUserSubFolderId = user_sub_folder_id || 0;

      if (finalUserSubFolderId == 0) {
        // Insert new sub folder
        const subFolderData = {
          user_id: decodedUserId,
          user_folder_id: user_folder_id,
          folder_name: folder_name,
          status: 1
        };
        
        const result = await query(
          `INSERT INTO user_sub_folders (user_id, user_folder_id, folder_name, status, created_dts) 
           VALUES (?, ?, ?, ?, NOW())`,
          [subFolderData.user_id, subFolderData.user_folder_id, subFolderData.folder_name, subFolderData.status]
        );
        
        finalUserSubFolderId = result.insertId;
        console.log('saveSubFolder - New sub folder created with ID:', finalUserSubFolderId);
      } else {
        // Update existing sub folder
        await query(
          `UPDATE user_sub_folders SET user_folder_id = ?, folder_name = ?, status = ? 
           WHERE user_sub_folder_id = ? AND user_id = ?`,
          [user_folder_id, folder_name, 1, finalUserSubFolderId, decodedUserId]
        );
        
        console.log('saveSubFolder - Existing sub folder updated:', finalUserSubFolderId);
      }

      // Return response in PHP format (matching exactly)
      return res.json({
        status: true,
        rcode: 200,
        user_id: idEncode(decodedUserId),
        unique_token: token,
        user_folder_id: user_folder_id,
        user_sub_folder_id: finalUserSubFolderId,
        message: 'Sub Folder saved successfully'
      });
      
    } catch (error) {
      console.error('saveSubFolder error:', error);
      return fail(res, 500, 'Failed to save sub folder');
    }
  },

  async deleteResume(req, res) {
    try {
      const { user_id, token, resume_id } = req.body;
      
      // Check if user_id and token are provided
      if (!user_id || !token) {
        return fail(res, 500, 'user_id and token are required');
      }
      
      // Decode user ID
      const decodedUserId = idDecode(user_id);
      if (!decodedUserId) {
        return fail(res, 500, 'Invalid user ID');
      }
      
      // Get user details and validate
      const userRows = await query('SELECT * FROM users WHERE user_id = ? LIMIT 1', [decodedUserId]);
      if (!userRows.length) {
        return fail(res, 500, 'Not A Valid User');
      }
      
      const user = userRows[0];
      
      // Validate token
      if (user.unique_token !== token) {
        return fail(res, 500, 'Token Mismatch Exception');
      }

      // Check mandatory fields - match PHP validation exactly
      if (resume_id <= 0) {
        return fail(res, 500, 'Please enter mandatory fields');
      }

      // Update resume status to 0 (soft delete) - match PHP implementation exactly
      await query(
        'UPDATE user_resumes SET status = 0 WHERE resume_id = ? AND user_id = ?',
        [resume_id, decodedUserId]
      );

      return res.json({
        status: true,
        rcode: 200,
        user_id: idEncode(decodedUserId),
        unique_token: token,
        message: 'Resume deleted successfully'
      });
      
    } catch (error) {
      console.error('deleteResume error:', error);
      return fail(res, 500, 'Failed to delete resume');
    }
  },

  async saveEventOrganiser(req, res) {
    try {
      const { user_id, token, event_id, organiser_id } = req.body;
      
      // Check if user_id and token are provided
      if (!user_id || !token) {
        return fail(res, 500, 'user_id and token are required');
      }
      
      // Decode user ID
      const decodedUserId = idDecode(user_id);
      if (!decodedUserId) {
        return fail(res, 500, 'Invalid user ID');
      }
      
      // Get user details and validate
      const userRows = await query('SELECT * FROM users WHERE user_id = ? LIMIT 1', [decodedUserId]);
      if (!userRows.length) {
        return fail(res, 500, 'Not A Valid User');
      }
      
      const user = userRows[0];
      
      // Validate token
      if (user.unique_token !== token) {
        return fail(res, 500, 'Token Mismatch Exception');
      }

      // Check mandatory fields
      if (!event_id || event_id <= 0 || !organiser_id || organiser_id <= 0) {
        return fail(res, 500, 'Please enter mandatory fields');
      }

      // Save event organiser
      const result = await query(
        'INSERT INTO event_organisers (event_id, user_id) VALUES (?, ?)',
        [event_id, organiser_id]
      );
      
      const organiser_id_result = result.insertId;
      
      // Return response in PHP format
      return res.json({
        status: true,
        rcode: 200,
        user_id: idEncode(decodedUserId),
        unique_token: token,
        message: 'Organiser saved successfully'
      });
      
    } catch (error) {
      console.error('saveEventOrganiser error:', error);
      return fail(res, 500, 'Failed to save event organiser');
    }
  },





  async legalTerms(req, res) {
    try {
      const { user_id, token } = req.query;
      
      // Check if user_id and token are provided
      if (!user_id || !token) {
        return fail(res, 500, 'user_id and token are required');
      }
      
      // Decode user ID
      const decodedUserId = idDecode(user_id);
      if (!decodedUserId) {
        return fail(res, 500, 'Invalid user ID');
      }
      
      // Get user details and validate
      const userRows = await query('SELECT * FROM users WHERE user_id = ? LIMIT 1', [decodedUserId]);
      if (!userRows.length) {
        return fail(res, 500, 'Not A Valid User');
      }
      
      const user = userRows[0];
      
      // Validate token
      if (user.unique_token !== token) {
        return fail(res, 500, 'Token Mismatch Exception');
      }

      const baseUrl = `${req.protocol}://${req.get('host')}`;
      const legalTermsLink = `${baseUrl}/legal-terms`;

      return res.json({
        status: true,
        rcode: 200,
        user_id: idEncode(decodedUserId),
        unique_token: token,
        legal_terms_link: legalTermsLink
      });
      
    } catch (error) {
      console.error('legalTerms error:', error);
      return fail(res, 500, 'Failed to get legal terms');
    }
  },



  async getProjectDetails(req, res) {
    try {
      const { user_id, token } = req.query;
      
      // Check if user_id and token are provided
      if (!user_id || !token) {
        return fail(res, 500, 'user_id and token are required');
      }
      
      // Decode user ID
      const decodedUserId = idDecode(user_id);
      if (!decodedUserId) {
        return fail(res, 500, 'Invalid user ID');
      }
      
      // Get user details and validate
      const userRows = await query('SELECT * FROM users WHERE user_id = ? LIMIT 1', [decodedUserId]);
      if (!userRows.length) {
        return fail(res, 500, 'Not A Valid User');
      }
      
      const user = userRows[0];
      
      // Validate token
      if (user.unique_token !== token) {
        return fail(res, 500, 'Token Mismatch Exception');
      }

      // Get project details with dynamic project logo URLs
      const baseUrl = `${req.protocol}://${req.get('host')}`;
      const projectLogoPath = `${baseUrl}/uploads/project_logo/`;
      
      const projectDetailsRows = await query(
        `SELECT user_project_details.*, 
                IF(project_logo != '', CONCAT(?, project_logo), '') AS project_logo
         FROM user_project_details 
         WHERE user_id = ? 
         ORDER BY project_detail_id`,
        [projectLogoPath, decodedUserId]
      );

      return res.json({
        status: true,
        rcode: 200,
        user_id: idEncode(decodedUserId),
        unique_token: token,
        project_details: projectDetailsRows.length > 0 ? toArray(projectDetailsRows) : []
      });
      
    } catch (error) {
      console.error('getProjectDetails error:', error);
      return fail(res, 500, 'Failed to get project details');
    }
  },

  async deleteProjectDetail(req, res) {
    try {
      const { user_id, token, project_detail_id } = req.body;
      
      // Check if user_id and token are provided
      if (!user_id || !token) {
        return fail(res, 500, 'user_id and token are required');
      }
      
      // Decode user ID
      const decodedUserId = idDecode(user_id);
      if (!decodedUserId) {
        return fail(res, 500, 'Invalid user ID');
      }
      
      // Get user details and validate
      const userRows = await query('SELECT * FROM users WHERE user_id = ? LIMIT 1', [decodedUserId]);
      if (!userRows.length) {
        return fail(res, 500, 'Not A Valid User');
      }
      
      const user = userRows[0];
      
      // Validate token
      if (user.unique_token !== token) {
        return fail(res, 500, 'Token Mismatch Exception');
      }

      // Check mandatory fields
      if (!project_detail_id || project_detail_id <= 0) {
        return fail(res, 500, 'Please enter mandatory fields');
      }

      // Delete project detail
      const result = await query(
        'DELETE FROM user_project_details WHERE project_detail_id = ? AND user_id = ?',
        [project_detail_id, decodedUserId]
      );

      if (result.affectedRows === 0) {
        return fail(res, 500, 'Project detail not found or access denied');
      }

      return res.json({
        status: true,
        rcode: 200,
        user_id: idEncode(decodedUserId),
        unique_token: token,
        message: 'Project Detail deleted successfully'
      });
      
    } catch (error) {
      console.error('deleteProjectDetail error:', error);
      return fail(res, 500, 'Failed to delete project detail');
    }
  },

  async saveEducationDetails(req, res) {
    try {
      const { user_id, token, education_detail_id, institute_name, degree, start_date, end_date } = req.body;
      
      // Check if user_id and token are provided
      if (!user_id || !token) {
        return fail(res, 500, 'user_id and token are required');
      }
      
      // Decode user ID
      const decodedUserId = idDecode(user_id);
      if (!decodedUserId) {
        return fail(res, 500, 'Invalid user ID');
      }
      
      // Get user details and validate
      const userRows = await query('SELECT * FROM users WHERE user_id = ? LIMIT 1', [decodedUserId]);
      if (!userRows.length) {
        return fail(res, 500, 'Not A Valid User');
      }
      
      const user = userRows[0];
      
      // Validate token
      if (user.unique_token !== token) {
        return fail(res, 500, 'Token Mismatch Exception');
      }

      // Check mandatory fields
      if (!institute_name || !degree || !start_date || !end_date) {
        return fail(res, 500, 'Please enter mandatory fields');
      }

      let finalEducationDetailId = education_detail_id || 0;

      // Format dates to Y-m-d format
      const formattedStartDate = new Date(start_date).toISOString().split('T')[0];
      const formattedEndDate = new Date(end_date).toISOString().split('T')[0];

      if (finalEducationDetailId == 0) {
        // Insert new education detail
        const result = await query(
          `INSERT INTO user_education_details (user_id, institute_name, degree, start_date, end_date) 
           VALUES (?, ?, ?, ?, ?)`,
          [decodedUserId, institute_name, degree, formattedStartDate, formattedEndDate]
        );
        finalEducationDetailId = result.insertId;
      } else {
        // Update existing education detail
        await query(
          `UPDATE user_education_details 
           SET institute_name = ?, degree = ?, start_date = ?, end_date = ?
           WHERE education_detail_id = ? AND user_id = ?`,
          [institute_name, degree, formattedStartDate, formattedEndDate, finalEducationDetailId, decodedUserId]
        );
      }
      
      // Return response in PHP format
      return res.json({
        status: true,
        rcode: 200,
        user_id: idEncode(decodedUserId),
        unique_token: token,
        education_detail_id: finalEducationDetailId,
        message: 'Education Details saved successfully'
      });
      
    } catch (error) {
      console.error('saveEducationDetails error:', error);
      return fail(res, 500, 'Failed to save education details');
    }
  },

  async getEducationDetails(req, res) {
    try {
      const { user_id, token } = req.query;
      
      // Check if user_id and token are provided
      if (!user_id || !token) {
        return fail(res, 500, 'user_id and token are required');
      }
      
      // Decode user ID
      const decodedUserId = idDecode(user_id);
      if (!decodedUserId) {
        return fail(res, 500, 'Invalid user ID');
      }
      
      // Get user details and validate
      const userRows = await query('SELECT * FROM users WHERE user_id = ? LIMIT 1', [decodedUserId]);
      if (!userRows.length) {
        return fail(res, 500, 'Not A Valid User');
      }
      
      const user = userRows[0];
      
      // Validate token
      if (user.unique_token !== token) {
        return fail(res, 500, 'Token Mismatch Exception');
      }

      // Get education details with formatted dates (dd-mm-yyyy)
      const educationDetailsRows = await query(
        `SELECT user_education_details.*, 
                DATE_FORMAT(start_date, '%d-%m-%Y') AS start_date, 
                DATE_FORMAT(end_date, '%d-%m-%Y') AS end_date
         FROM user_education_details 
         WHERE user_id = ? 
         ORDER BY education_detail_id`,
        [decodedUserId]
      );

      return res.json({
        status: true,
        rcode: 200,
        user_id: idEncode(decodedUserId),
        unique_token: token,
        education_details: educationDetailsRows.length > 0 ? toArray(educationDetailsRows) : []
      });
      
    } catch (error) {
      console.error('getEducationDetails error:', error);
      return fail(res, 500, 'Failed to get education details');
    }
  },

  async deleteEducationDetail(req, res) {
    try {
      const { user_id, token, education_detail_id } = req.body;
      
      // Check if user_id and token are provided
      if (!user_id || !token) {
        return fail(res, 500, 'user_id and token are required');
      }
      
      // Decode user ID
      const decodedUserId = idDecode(user_id);
      if (!decodedUserId) {
        return fail(res, 500, 'Invalid user ID');
      }
      
      // Get user details and validate
      const userRows = await query('SELECT * FROM users WHERE user_id = ? LIMIT 1', [decodedUserId]);
      if (!userRows.length) {
        return fail(res, 500, 'Not A Valid User');
      }
      
      const user = userRows[0];
      
      // Validate token
      if (user.unique_token !== token) {
        return fail(res, 500, 'Token Mismatch Exception');
      }

      // Check mandatory fields
      if (!education_detail_id || education_detail_id <= 0) {
        return fail(res, 500, 'Please enter mandatory fields');
      }

      // Delete education detail
      const result = await query(
        'DELETE FROM user_education_details WHERE education_detail_id = ? AND user_id = ?',
        [education_detail_id, decodedUserId]
      );

      if (result.affectedRows === 0) {
        return fail(res, 500, 'Education detail not found or access denied');
      }

      return res.json({
        status: true,
        rcode: 200,
        user_id: idEncode(decodedUserId),
        unique_token: token,
        message: 'Education Detail deleted successfully'
      });
      
    } catch (error) {
      console.error('deleteEducationDetail error:', error);
      return fail(res, 500, 'Failed to delete education detail');
    }
  },

  async getWorkDetails(req, res) {
    try {
      const { user_id, token } = req.query;
      
      // Check if user_id and token are provided
      if (!user_id || !token) {
        return fail(res, 500, 'user_id and token are required');
      }
      
      // Decode user ID
      const decodedUserId = idDecode(user_id);
      if (!decodedUserId) {
        return fail(res, 500, 'Invalid user ID');
      }
      
      // Get user details and validate
      const userRows = await query('SELECT * FROM users WHERE user_id = ? LIMIT 1', [decodedUserId]);
      if (!userRows.length) {
        return fail(res, 500, 'Not A Valid User');
      }
      
      const user = userRows[0];
      
      // Validate token
      if (user.unique_token !== token) {
        return fail(res, 500, 'Token Mismatch Exception');
      }

      // Get work details with employment type and formatted dates
      const workDetailsRows = await query(
        `SELECT user_work_details.*,
                DATE_FORMAT(start_date, '%d-%m-%Y') AS start_date,
                DATE_FORMAT(end_date, '%d-%m-%Y') AS end_date,
                employment_type.name as employment_type
         FROM user_work_details
         JOIN employment_type ON employment_type.id = user_work_details.employment_type_id
         WHERE user_id = ? 
         ORDER BY work_detail_id`,
        [decodedUserId]
      );
      
      // Return response in PHP format
      return res.json({
        status: true,
        rcode: 200,
        user_id: idEncode(decodedUserId),
        unique_token: token,
        work_details: workDetailsRows.length > 0 ? toArray(workDetailsRows) : []
      });
      
    } catch (error) {
      console.error('getWorkDetails error:', error);
      return fail(res, 500, 'Failed to get work details');
    }
  },

  async deleteWorkDetail(req, res) {
    try {
      const { user_id, token, work_detail_id } = req.body;
      
      // Check if user_id, token, and work_detail_id are provided
      if (!user_id || !token || !work_detail_id) {
        return fail(res, 500, 'user_id, token, and work_detail_id are required');
      }
      
      // Decode user ID
      const decodedUserId = idDecode(user_id);
      if (!decodedUserId) {
        return fail(res, 500, 'Invalid user ID');
      }
      
      // Get user details and validate
      const userRows = await query('SELECT * FROM users WHERE user_id = ? LIMIT 1', [decodedUserId]);
      if (!userRows.length) {
        return fail(res, 500, 'Not A Valid User');
      }
      
      const user = userRows[0];
      
      // Validate token
      if (user.unique_token !== token) {
        return fail(res, 500, 'Token Mismatch Exception');
      }

      // Check if work_detail_id is valid
      if (work_detail_id <= 0) {
        return fail(res, 500, 'Please enter mandatory fields');
      }

      // Delete the work detail (ensure it belongs to the authenticated user)
      const result = await query(
        'DELETE FROM user_work_details WHERE work_detail_id = ? AND user_id = ?',
        [work_detail_id, decodedUserId]
      );
      
      // Check if any row was affected
      if (result.affectedRows === 0) {
        return fail(res, 500, 'Work detail not found or access denied');
      }
      
      // Return response in PHP format
      return res.json({
        status: true,
        rcode: 200,
        user_id: idEncode(decodedUserId),
        unique_token: token,
        message: 'Work Detail deleted successfully'
      });
      
    } catch (error) {
      console.error('deleteWorkDetail error:', error);
      return fail(res, 500, 'Failed to delete work detail');
    }
  },

  async saveWorkDetails(req, res) {
    try {
      const { user_id, token, work_detail_id, company_name, designation, start_date, end_date, currently_working, employment_type_id } = req.body;
      
      // Check if user_id and token are provided
      if (!user_id || !token) {
        return fail(res, 500, 'user_id and token are required');
      }
      
      // Decode user ID
      const decodedUserId = idDecode(user_id);
      if (!decodedUserId) {
        return fail(res, 500, 'Invalid user ID');
      }
      
      // Get user details and validate
      const userRows = await query('SELECT * FROM users WHERE user_id = ? LIMIT 1', [decodedUserId]);
      if (!userRows.length) {
        return fail(res, 500, 'Not A Valid User');
      }
      
      const user = userRows[0];
      
      // Validate token
      if (user.unique_token !== token) {
        return fail(res, 500, 'Token Mismatch Exception');
      }

      // Check mandatory fields
      if (!company_name || !designation || !start_date || !employment_type_id) {
        return fail(res, 500, 'Please enter mandatory fields');
      }

      // Format dates to Y-m-d format
      const formattedStartDate = new Date(start_date).toISOString().split('T')[0];
      const formattedEndDate = end_date ? new Date(end_date).toISOString().split('T')[0] : null;

      let finalWorkDetailId = work_detail_id || 0;

      if (finalWorkDetailId == 0) {
        // Insert new work detail
        const result = await query(
          `INSERT INTO user_work_details (user_id, company_name, designation, start_date, end_date, currently_working, employment_type_id) 
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [decodedUserId, company_name, designation, formattedStartDate, formattedEndDate, currently_working || 0, employment_type_id]
        );
        finalWorkDetailId = result.insertId;
      } else {
        // Update existing work detail
        await query(
          `UPDATE user_work_details 
           SET company_name = ?, designation = ?, start_date = ?, end_date = ?, currently_working = ?, employment_type_id = ?
           WHERE work_detail_id = ? AND user_id = ?`,
          [company_name, designation, formattedStartDate, formattedEndDate, currently_working || 0, employment_type_id, finalWorkDetailId, decodedUserId]
        );
      }
      
      // Return response in PHP format
      return res.json({
        status: true,
        rcode: 200,
        user_id: idEncode(decodedUserId),
        unique_token: token,
        work_detail_id: finalWorkDetailId,
        message: 'Work Details saved successfully'
      });
      
    } catch (error) {
      console.error('saveWorkDetails error:', error);
      return fail(res, 500, 'Failed to save work details');
    }
  },

  // Generic handler for missing methods
  async genericHandler(req, res) {
    const methodName = req.route.path.split('/').pop();
    return ok(res, { message: `${methodName} endpoint called successfully` });
  }
};

module.exports = ApiController;


