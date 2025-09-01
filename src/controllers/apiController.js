'use strict';

const md5 = require('md5');
const { query } = require('../config/db');
const { ok, fail, phpResponse } = require('../utils/response');
const { idEncode, idDecode } = require('../utils/idCodec');
const { sendOtp, verifyOtp } = require('../services/twilio');
const { generateToFile } = require('../services/qrcode');

// Utility function to generate image URLs
const getImageUrl = (req, path) => {
  const baseUrl = process.env.BASE_URL || `${req.protocol}://${req.get('host')}`;
  return path ? `${baseUrl}/${path}` : '';
};

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




  async getCityList(req, res) {
    try {
      const { user_id, token, state_id } = {
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
      
      if (!state_id) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'state_id is required'
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
      
    const rows = await query('SELECT id AS city_id, name AS city_name FROM cities WHERE state_id = ?', [state_id]);
      
      return res.json({
        status: true,
        rcode: 200,
        user_id: user_id,
        unique_token: token,
        city_list: rows.map(row => ({
          city_id: row.city_id.toString(),
          city_name: row.city_name || ""
        }))
      });
      
    } catch (error) {
      console.error('getCityList error:', error);
      return res.json({
        status: false,
        rcode: 500,
        message: 'Failed to get city list'
      });
    }
  },
  async getInterestsList(req, res) {
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
  },
  async getEmploymentTypeList(req, res) {
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
  },
  async getJobTypeList(req, res) {
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
      
    const rows = await query('SELECT id AS job_type_id, name AS job_type FROM job_type');
      
      return res.json({
        status: true,
        rcode: 200,
        user_id: user_id,
        unique_token: token,
        job_type_list: rows.map(row => ({
          job_type_id: row.job_type_id.toString(),
          job_type: row.job_type || ""
        }))
      });
      
    } catch (error) {
      console.error('getJobTypeList error:', error);
      return res.json({
        status: false,
        rcode: 500,
        message: 'Failed to get job type list'
      });
    }
  },
  async getPayList(req, res) {
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
      
    const rows = await query('SELECT id AS pay_id, name AS pay FROM pay');
      
      return res.json({
        status: true,
        rcode: 200,
        user_id: user_id,
        unique_token: token,
        pay_list: rows.map(row => ({
          pay_id: row.pay_id.toString(),
          pay: row.pay || ""
        }))
      });
      
    } catch (error) {
      console.error('getPayList error:', error);
      return res.json({
        status: false,
        rcode: 500,
        message: 'Failed to get pay list'
      });
    }
  },
  async getEventModeList(req, res) {
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
      
    const rows = await query('SELECT id AS event_mode_id, name AS event_mode FROM event_mode');
      
      return res.json({
        status: true,
        rcode: 200,
        user_id: user_id,
        unique_token: token,
        event_mode_list: rows.map(row => ({
          event_mode_id: row.event_mode_id.toString(),
          event_mode: row.event_mode || ""
        }))
      });
      
    } catch (error) {
      console.error('getEventModeList error:', error);
      return res.json({
        status: false,
        rcode: 500,
        message: 'Failed to get event mode list'
      });
    }
  },
  async getEventTypeList(req, res) {
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
      
    const rows = await query('SELECT id AS event_type_id, name AS event_type FROM event_type');
      
      return res.json({
        status: true,
        rcode: 200,
        user_id: user_id,
        unique_token: token,
        event_type_list: rows.map(row => ({
          event_type_id: row.event_type_id.toString(),
          event_type: row.event_type || ""
        }))
      });
      
    } catch (error) {
      console.error('getEventTypeList error:', error);
      return res.json({
        status: false,
        rcode: 500,
        message: 'Failed to get event type list'
      });
    }
  },
  async getFundSizeList(req, res) {
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
  },

  async getPromotionsList(req, res) {
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
      
      const promotionsList = await query('SELECT * FROM promotions WHERE status = 1');
      
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
      const { user_id, token } = {
        ...req.query,
        ...req.body
      };
      
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
      
      const servicesMasterList = await query('SELECT * FROM folders WHERE status = 1');
      
      // Convert all integer values to strings
      const formattedServicesList = (servicesMasterList || []).map(service => ({
        id: (service.id || 0).toString(),
        name: service.name || "",
        sort_order: (service.sort_order || 0).toString(),
        status: (service.status || 0).toString(),
        created_at: service.created_at || "",
        created_by: (service.created_by || 0).toString(),
        updated_at: service.updated_at || "",
        updated_by: (service.updated_by || 0).toString(),
        deleted: (service.deleted || 0).toString(),
        deleted_by: (service.deleted_by || 0).toString(),
        deleted_at: service.deleted_at || ""
      }));
      
      return res.json({
        status: true,
        rcode: 200,
        user_id: user_id,
        unique_token: token,
        services_master_list: formattedServicesList
      });
      
    } catch (error) {
      console.error('getServicesMasterList error:', error);
      return res.json({
        status: false,
        rcode: 500,
        message: 'Failed to get services master list'
      });
    }
  },

  async getServicesList(req, res) {
    try {
      const { user_id, token } = req.query;
      
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
      
      // Get service providers list with their services
      const serviceProviderRows = await query(
        `SELECT usp.*, 
                u.full_name,
                u.email,
                u.mobile,
                countries.name as country_name,
                states.name as state_name,
                cities.name as city_name
         FROM user_service_provider usp
         JOIN users u ON u.user_id = usp.user_id
         LEFT JOIN countries ON countries.id = usp.country_id
         LEFT JOIN states ON states.id = usp.state_id
         LEFT JOIN cities ON cities.id = usp.city_id
         WHERE usp.deleted = 0 AND usp.status = 1
         ORDER BY usp.created_dts DESC
         LIMIT 1`
      );
      
      if (serviceProviderRows.length === 0) {
        return res.json({
          status: true,
          rcode: 200,
          user_id: user_id,
          unique_token: token,
          service_provider_list: {}
        });
      }
      
      const provider = serviceProviderRows[0];
      
      // Get services for this provider
      const servicesRows = await query(
        `SELECT usps.*, 
                f.name as service_name
         FROM user_service_provider_services usps
         JOIN folders f ON f.id = usps.service_id
         WHERE usps.sp_id = ?
         ORDER BY usps.created_dts DESC`,
        [provider.sp_id]
      );
      
      // Format services with proper image URLs
      const services = servicesRows.map(service => ({
        usps_id: String(service.usps_id),
        service_id: String(service.service_id),
        service_name: service.service_name || '',
        company_name: service.company_name || '',
        tag_line: service.tag_line || null,
        title: service.title || '',
        service_description: service.service_description || null,
        avg_service_rating: service.avg_service_rating ? String(service.avg_service_rating) : '',
        service_image: service.service_image ? getImageUrl(req, `uploads/services/${service.service_image}`) : ''
      }));
      
      // Format service provider with nested services
      const serviceProviderList = {
        sp_id: String(provider.sp_id),
        country: provider.country_name || '',
        state: provider.state_name || '',
        city: provider.city_name || '',
        description: provider.description || '',
        avg_sp_rating: provider.avg_sp_rating ? String(provider.avg_sp_rating) : '',
        approval_status: String(provider.approval_status),
        services: services
      };
      
      return res.json({
        status: true,
        rcode: 200,
        user_id: user_id,
        unique_token: token,
        service_provider_list: serviceProviderList
      });
      
    } catch (error) {
      console.error('getServicesList error:', error);
      return res.json({
        status: false,
        rcode: 500,
        message: 'Failed to get services list'
      });
    }
  },

  async saveServiceProvider(req, res) {
    try {
      const { user_id, token, country_id, state_id, city_id, service_ids, description } = {
        ...req.query,
        ...req.body
      };
      
      console.log('saveServiceProvider - Parameters:', { user_id, token, country_id, state_id, city_id, service_ids, description });
      
      if (!user_id || !token) {
        return fail(res, 500, 'user_id and token are required');
      }
      
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
        // Use the filename generated by Multer (file is already saved to disk)
        updateData.service_image = file.filename;
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

  async getBusinessCardInformation(req, res) {
    try {
      const { user_id, token } = req.query;
      
      console.log('getBusinessCardInformation - Parameters:', { user_id, token });
      
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
      
      // Get business card information
      const businessCardRows = await query(
        `SELECT ubc.*, 
                countries.name as country_name,
                states.name as state_name,
                cities.name as city_name
         FROM user_business_cards ubc
         LEFT JOIN countries ON countries.id = ubc.country_id
         LEFT JOIN states ON states.id = ubc.state_id
         LEFT JOIN cities ON cities.id = ubc.city_id
         WHERE ubc.user_id = ? AND ubc.deleted = 0
         ORDER BY ubc.created_dts DESC`,
        [decodedUserId]
      );
      
      // Format business card info
      const businessCardInfo = businessCardRows.map(card => ({
        ubc_id: String(card.ubc_id),
        business_name: card.business_name || '',
        name: card.name || '',
        business_location: card.business_location || '',
        country_id: String(card.country_id || 0),
        state_id: String(card.state_id || 0),
        city_id: String(card.city_id || 0),
        country_name: card.country_name || '',
        state_name: card.state_name || '',
        city_name: card.city_name || '',
        description: card.description || '',
        card_status: String(card.card_status || 0),
        status: String(card.status || 0),
        created_dts: card.created_dts || ''
      }));
      
      // Get promotions list (empty for now)
      const promotionsList = [];
      
      // Return response in standard format
      return res.json({
        status: true,
        rcode: 200,
        user_id: user_id,
        unique_token: token,
        qr_image: user.qr_image ? `${process.env.BASE_URL || 'http://192.168.0.100:3000'}/${user.qr_image}` : '',
        business_card_info: businessCardInfo,
        promotions_list: promotionsList
      });
      
    } catch (error) {
      console.error('getBusinessCardInformation error:', error);
      return res.json({
        status: false,
        rcode: 500,
        message: 'Failed to get business card information'
      });
    }
  },

  // Profile (minimal parity)
  async getProfile(req, res) {
    try {
      const { user_id, token } = {
        ...req.query,
        ...req.body
      };
      
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
      
      // Get base URL for images (works for both localhost and live)
      const baseUrl = `${req.protocol}://${req.get('host')}`;
      const profilePath = `${baseUrl}/uploads/profiles/`;
      const qrPath = `${baseUrl}/uploads/qr_codes/`;
      
    const rows = await query(
      `SELECT user_id, COALESCE(full_name,'') AS full_name, COALESCE(email,'') AS email, mobile,
              COALESCE(address,'') AS address, users.city_id, COALESCE(cities.name,'') AS city,
              users.state_id, COALESCE(states.name,'') AS state, users.country_id, COALESCE(countries.name,'') AS country,
              COALESCE(interests.name,'') AS interests, COALESCE(linkedin_url,'') AS linkedin_url, COALESCE(summary,'') AS summary,
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
      
      // Get education details
      const educationRows = await query(
        `SELECT education_detail_id, user_id, institute_name, degree, start_date, end_date, status, created_dts
         FROM user_education_details 
         WHERE user_id = ? AND status = 1`, [decodedUserId]
      );

      // Get work details
      const workRows = await query(
        `SELECT work_detail_id, user_id, company_name, designation, start_date, end_date, currently_working, employment_type_id, status, created_dts
         FROM user_work_details 
         WHERE user_id = ? AND status = 1`, [decodedUserId]
      );

      // Get project details with dynamic project logo URLs
      const projectLogoPath = `${baseUrl}/uploads/project_logo/`;
      const projectRows = await query(
        `SELECT user_project_details.*, 
                IF(project_logo != '', CONCAT(?, project_logo), '') AS project_logo
         FROM user_project_details 
         WHERE user_id = ? AND status = 1
         ORDER BY project_detail_id`, [projectLogoPath, decodedUserId]
      );

      // Format user details to match PHP response exactly
      const formattedUserDetails = rows.map(user => ({
        user_id: user.user_id.toString(),
        full_name: user.full_name || "",
        email: user.email || "",
        mobile: user.mobile || "",
        address: user.address || "",
        city_id: user.city_id ? user.city_id.toString() : "",
        city: user.city || "",
        state_id: user.state_id ? user.state_id.toString() : "",
        state: user.state || "",
        country_id: user.country_id ? user.country_id.toString() : "",
        country: user.country || "",
        interests: user.interests || "",
        linkedin_url: user.linkedin_url || "",
        summary: user.summary || "",
        profile_photo: user.profile_photo || "",
        qr_image: user.qr_image || "",
        profile_updated: user.profile_updated ? user.profile_updated.toString() : "0",
        card_requested: user.card_requested ? user.card_requested.toString() : "0",
        is_service_provider: user.is_service_provider ? user.is_service_provider.toString() : "0",
        is_investor: user.is_investor ? user.is_investor.toString() : "0"
      }));

      // Convert all integer values to strings for education details
      const educationDetails = educationRows.map(row => ({
        education_detail_id: (row.education_detail_id || 0).toString(),
        user_id: (row.user_id || 0).toString(),
        institute_name: row.institute_name || "",
        degree: row.degree || "",
        start_date: row.start_date || "",
        end_date: row.end_date || "",
        status: (row.status || 0).toString(),
        created_dts: row.created_dts || ""
      }));

      // Convert all integer values to strings for work details
      const workDetails = workRows.map(row => ({
        work_detail_id: (row.work_detail_id || 0).toString(),
        user_id: (row.user_id || 0).toString(),
        company_name: row.company_name || "",
        designation: row.designation || "",
        start_date: row.start_date || "",
        end_date: row.end_date || "",
        currently_working: (row.currently_working || 0).toString(),
        employment_type_id: (row.employment_type_id || 0).toString(),
        status: (row.status || 0).toString(),
        created_dts: row.created_dts || ""
      }));

      // Convert all integer values to strings for project details
      const projectDetails = projectRows.map(row => ({
        project_detail_id: (row.project_detail_id || 0).toString(),
        user_id: (row.user_id || 0).toString(),
        project_name: row.project_name || "",
        description: row.description || "",
        project_url: row.project_url || "",
        start_month: row.start_month || "",
        start_year: row.start_year || "",
        closed_month: row.closed_month || "",
        closed_year: row.closed_year || "",
        project_logo: row.project_logo || "",
        status: (row.status || 0).toString(),
        created_dts: row.created_dts || "",
        created_by: row.created_by || "",
        updated_at: row.updated_at || "",
        updated_by: row.updated_by || "",
        deleted: (row.deleted || 0).toString(),
        deleted_by: row.deleted_by || "",
        deleted_at: row.deleted_at || ""
      }));

      // Return response in PHP format - exact match with same data types
      return res.json({
        status: true,
        rcode: 200,
        user_id: user_id,
        unique_token: token,
        user_details: formattedUserDetails,
        education_details: educationDetails,
        work_details: workDetails,
        project_details: projectDetails
      });
      
    } catch (error) {
      console.error('getProfile error:', error);
      return res.json({
        status: false,
        rcode: 500,
        message: 'Failed to get profile'
      });
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
      const { user_id, token, mobile_no } = {
        ...req.query,
        ...req.body
      };
      
      // Check if user_id, token, and mobile_no are provided
      if (!user_id || !token || !mobile_no) {
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
                users.city_id,
                COALESCE(cities.name, '') as city,
                users.state_id,
                COALESCE(states.name, '') as state,
                users.country_id,
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
      
      if (!userProfileRows.length) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'User not found with this mobile number'
        });
      }
      
      const userData = userProfileRows[0];
      
      // Get education details
      const educationRows = await query(
        `SELECT education_detail_id, user_id, institute_name, degree, start_date, end_date, status, created_dts
         FROM user_education_details 
         WHERE user_id = ? AND status = 1`, [userData.user_id]
      );

      // Get work details
      const workRows = await query(
        `SELECT work_detail_id, user_id, company_name, designation, start_date, end_date, currently_working, employment_type_id, status, created_dts
         FROM user_work_details 
         WHERE user_id = ? AND status = 1`, [userData.user_id]
      );

      // Get project details with dynamic project logo URLs
      const projectLogoPath = `${baseUrl}/uploads/project_logo/`;
      const projectRows = await query(
        `SELECT user_project_details.*, 
                IF(project_logo != '', CONCAT(?, project_logo), '') AS project_logo
         FROM user_project_details 
         WHERE user_id = ? AND status = 1
         ORDER BY project_detail_id`, [projectLogoPath, userData.user_id]
      );

      // Convert all integer values to strings for education details
      const educationDetails = educationRows.map(row => ({
        education_detail_id: (row.education_detail_id || 0).toString(),
        user_id: (row.user_id || 0).toString(),
        institute_name: row.institute_name || "",
        degree: row.degree || "",
        start_date: row.start_date || "",
        end_date: row.end_date || "",
        status: (row.status || 0).toString(),
        created_dts: row.created_dts || ""
      }));

      // Convert all integer values to strings for work details
      const workDetails = workRows.map(row => ({
        work_detail_id: (row.work_detail_id || 0).toString(),
        user_id: (row.user_id || 0).toString(),
        company_name: row.company_name || "",
        designation: row.designation || "",
        start_date: row.start_date || "",
        end_date: row.end_date || "",
        currently_working: (row.currently_working || 0).toString(),
        employment_type_id: (row.employment_type_id || 0).toString(),
        status: (row.status || 0).toString(),
        created_dts: row.created_dts || ""
      }));

      // Convert all integer values to strings for project details
      const projectDetails = projectRows.map(row => ({
        project_detail_id: (row.project_detail_id || 0).toString(),
        user_id: (row.user_id || 0).toString(),
        project_name: row.project_name || "",
        description: row.description || "",
        project_url: row.project_url || "",
        start_month: row.start_month || "",
        start_year: row.start_year || "",
        closed_month: row.closed_month || "",
        closed_year: row.closed_year || "",
        project_logo: row.project_logo || "",
        status: (row.status || 0).toString(),
        created_dts: row.created_dts || "",
        created_by: row.created_by || "",
        updated_at: row.updated_at || "",
        updated_by: row.updated_by || "",
        deleted: (row.deleted || 0).toString(),
        deleted_by: row.deleted_by || "",
        deleted_at: row.deleted_at || ""
      }));

      // Convert all integer values to strings for user details
      const userDetails = userProfileRows.map(row => ({
        user_id: row.user_id.toString(),
        full_name: row.full_name || "",
        email: row.email || "",
        mobile: row.mobile || "",
        address: row.address || "",
        city_id: row.city_id.toString(),
        city: row.city || "",
        state_id: row.state_id.toString(),
        state: row.state || "",
        country_id: row.country_id.toString(),
        country: row.country || "",
        interests: row.interests || "",
        linkedin_url: row.linkedin_url || "",
        summary: row.summary || "",
        profile_photo: row.profile_photo || "",
        qr_image: row.qr_image || "",
        profile_updated: row.profile_updated.toString(),
        card_requested: row.card_requested.toString(),
        is_service_provider: row.is_service_provider.toString(),
        is_investor: row.is_investor.toString()
      }));
      
      // Return response in PHP format
      return res.json({
        status: true,
        rcode: 200,
        user_id: user_id,
        unique_token: token,
        user_details: userDetails,
        education_details: educationDetails,
        work_details: workDetails,
        project_details: projectDetails
      });
      
    } catch (error) {
      console.error('getUserDetailByMobile error:', error);
      return res.json({
        status: false,
        rcode: 500,
        message: 'Failed to get user detail by mobile'
      });
    }
  },

  async getUserProfileByMobile(req, res) {
    try {
      // Support both query parameters and form data
      const { user_id, token, mobile_no } = {
        ...req.query,
        ...req.body
      };
      
      // Check if user_id and token are provided
      if (!user_id || !token) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'Token Mismatch Exception'
        });
      }
      
      if (!mobile_no) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'mobile_no is required'
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

      // Get user profile by mobile number with all required fields
      const baseUrl = `${req.protocol}://${req.get('host')}`;
      const profilePhotoPath = `${baseUrl}/uploads/profiles/`;
      const qrCodePath = `${baseUrl}/uploads/qr_codes/`;
      
      const userProfileRows = await query(`
        SELECT 
          u.user_id,
          COALESCE(u.full_name, '') as full_name,
          COALESCE(u.email, '') as email,
          u.mobile,
          COALESCE(u.address, '') as address,
          u.city_id,
          COALESCE(c.name, '') as city,
          u.state_id,
          COALESCE(s.name, '') as state,
          u.country_id,
          COALESCE(co.name, '') as country,
          COALESCE(u.interests, '') as interests,
          COALESCE(u.linkedin_url, '') as linkedin_url,
          COALESCE(u.summary, '') as summary,
          IF(u.profile_photo != '', CONCAT(?, u.profile_photo), '') AS profile_photo,
          IF(u.qr_image != '', CONCAT(?, u.qr_image), '') AS qr_image,
          u.profile_updated,
          u.card_requested,
          u.is_service_provider,
          u.is_investor
        FROM users u
        LEFT JOIN countries co ON co.id = u.country_id
        LEFT JOIN states s ON s.id = u.state_id
        LEFT JOIN cities c ON c.id = u.city_id
        WHERE u.mobile LIKE ? AND u.status = 1
        LIMIT 1
      `, [profilePhotoPath, qrCodePath, `%${mobile_no}%`]);

      if (!userProfileRows.length) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'User not found with this mobile number'
        });
      }

      const userData = userProfileRows[0];
      
      // Get education details
      const educationRows = await query(
        `SELECT education_detail_id, user_id, institute_name, degree, start_date, end_date, status, created_dts
         FROM user_education_details 
         WHERE user_id = ? AND status = 1`, [userData.user_id]
      );

      // Get work details
      const workRows = await query(
        `SELECT work_detail_id, user_id, company_name, designation, start_date, end_date, currently_working, employment_type_id, status, created_dts
         FROM user_work_details 
         WHERE user_id = ? AND status = 1`, [userData.user_id]
      );

      // Get project details with dynamic project logo URLs
      const projectLogoPath = `${baseUrl}/uploads/project_logo/`;
      const projectDetailsRows = await query(
        `SELECT user_project_details.*, 
                IF(project_logo != '', CONCAT(?, project_logo), '') AS project_logo
         FROM user_project_details 
         WHERE user_id = ? 
         ORDER BY project_detail_id`,
        [projectLogoPath, userData.user_id]
      );

      // Convert all integer values to strings for education details
      const educationDetails = educationRows.map(row => ({
        education_detail_id: (row.education_detail_id || 0).toString(),
        user_id: (row.user_id || 0).toString(),
        institute_name: row.institute_name || "",
        degree: row.degree || "",
        start_date: row.start_date || "",
        end_date: row.end_date || "",
        status: (row.status || 0).toString(),
        created_dts: row.created_dts || ""
      }));

      // Convert all integer values to strings for work details
      const workDetails = workRows.map(row => ({
        work_detail_id: (row.work_detail_id || 0).toString(),
        user_id: (row.user_id || 0).toString(),
        company_name: row.company_name || "",
        designation: row.designation || "",
        start_date: row.start_date || "",
        end_date: row.end_date || "",
        currently_working: (row.currently_working || 0).toString(),
        employment_type_id: (row.employment_type_id || 0).toString(),
        status: (row.status || 0).toString(),
        created_dts: row.created_dts || ""
      }));

      // Convert all integer values to strings for project details
      const projectDetails = projectDetailsRows.map(row => ({
        project_detail_id: (row.project_detail_id || 0).toString(),
        user_id: (row.user_id || 0).toString(),
        project_name: row.project_name || "",
        description: row.description || "",
        project_url: row.project_url || "",
        start_month: row.start_month || "",
        start_year: row.start_year || "",
        closed_month: row.closed_month || "",
        closed_year: row.closed_year || "",
        project_logo: row.project_logo || "",
        status: (row.status || 0).toString(),
        created_dts: row.created_dts || "",
        created_by: row.created_by || "",
        updated_at: row.updated_at || "",
        updated_by: row.updated_by || "",
        deleted: (row.deleted || 0).toString(),
        deleted_by: row.deleted_by || "",
        deleted_at: row.deleted_at || ""
      }));

      // Convert all integer values to strings
      const userDetails = [{
        user_id: userData.user_id.toString(),
        full_name: userData.full_name || "",
        email: userData.email || "",
        mobile: userData.mobile || "",
        address: userData.address || "",
        city_id: userData.city_id.toString(),
        city: userData.city || "",
        state_id: userData.state_id.toString(),
        state: userData.state || "",
        country_id: userData.country_id.toString(),
        country: userData.country || "",
        interests: userData.interests || "",
        linkedin_url: userData.linkedin_url || "",
        summary: userData.summary || "",
        profile_photo: userData.profile_photo || "",
        qr_image: userData.qr_image || "",
        profile_updated: userData.profile_updated.toString(),
        card_requested: userData.card_requested.toString(),
        is_service_provider: userData.is_service_provider.toString(),
        is_investor: userData.is_investor.toString()
      }];

      // Return response in PHP format (matching exactly)
      return res.json({
        status: true,
        rcode: 200,
        user_id: user_id,
        unique_token: token,
        user_details: userDetails,
        education_details: educationDetails,
        work_details: workDetails,
        project_details: projectDetails
      });
      
    } catch (error) {
      console.error('getUserProfileByMobile error:', error);
      return res.json({
        status: false,
        rcode: 500,
        message: 'Failed to get user profile by mobile'
      });
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
            WHEN u.profile_photo != '' THEN CONCAT('${process.env.BASE_URL || 'http://192.168.0.100:3000'}/uploads/profiles/', u.profile_photo)
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

      // Format user details to convert all numeric fields to strings
      const formattedUserDetails = {
        user_id: String(userDetails.user_id),
        full_name: userDetails.full_name || '',
        email: userDetails.email || '',
        mobile: userDetails.mobile || '',
        address: userDetails.address || '',
        city_id: String(userDetails.city_id || 0),
        city: userDetails.city || '',
        state_id: String(userDetails.state_id || 0),
        state: userDetails.state || '',
        country_id: String(userDetails.country_id || 0),
        country: userDetails.country || '',
        interests: userDetails.interests || '',
        linkedin_url: userDetails.linkedin_url || '',
        summary: userDetails.summary || '',
        profile_photo: userDetails.profile_photo || ''
      };

      // Return response in standard format (user_details as array for Flutter compatibility)
      return res.json({
        status: true,
        rcode: 200,
        user_id: idEncode(decodedUserId),
        unique_token: token,
        user_details: [formattedUserDetails]
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
            WHEN u.profile_photo != '' THEN CONCAT('${process.env.BASE_URL || 'http://192.168.0.100:3000'}/uploads/profiles/', u.profile_photo)
            ELSE ''
          END AS profile_photo
        FROM user_contacts uc
        JOIN users u ON u.user_id = uc.contact_user_id
        WHERE uc.user_id = ? 
        AND uc.user_folder_id = ? 
        AND uc.user_sub_folder_id = ? 
        AND uc.status = 1
      `, [decodedUserId, user_folder_id, user_sub_folder_id]);

      // Format contacts list to convert all numeric fields to strings
      const formattedContactsList = (contactsList || []).map(contact => ({
        contact_user_id: String(contact.contact_user_id),
        user_folder_id: String(contact.user_folder_id),
        user_sub_folder_id: String(contact.user_sub_folder_id),
        full_name: contact.full_name || '',
        email: contact.email || '',
        mobile: contact.mobile || '',
        profile_photo: contact.profile_photo || ''
      }));

      // Return response in standard format
      return res.json({
        status: true,
        rcode: 200,
        user_id: idEncode(decodedUserId),
        unique_token: token,
        contacts_list: formattedContactsList
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
        return res.json({
          status: false,
          rcode: 500,
          message: 'Token Mismatch Exception'
        });
      }
      
      if (!user_folder_id || user_folder_id <= 0 || !user_sub_folder_id || user_sub_folder_id <= 0) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'Please enter mandatory fields'
        });
      }
      
      if (!req.files || !req.files.visiting_card_front || !req.files.visiting_card_back) {
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

      // Get filenames from multer (files are already saved to disk)
      const frontFile = req.files.visiting_card_front[0];
      const backFile = req.files.visiting_card_back[0];
      const frontFileName = frontFile.filename;
      const backFileName = backFile.filename;

      // Save visiting card to sub folder
      const result = await query(
        `INSERT INTO user_contacts_visiting_cards (user_id, user_folder_id, user_sub_folder_id, visiting_card_front, visiting_card_back, status, created_dts) 
         VALUES (?, ?, ?, ?, ?, 1, NOW())`,
        [decodedUserId, user_folder_id, user_sub_folder_id, frontFileName, backFileName]
      );

      const ucvc_id = result.insertId;

      // Return response in PHP format - exact match with same data types
      return res.json({
        status: true,
        rcode: 200,
        user_id: user_id,
        unique_token: token,
        ucvc_id: ucvc_id.toString(),
        message: 'Visiting Card saved successfully'
      });
      
    } catch (error) {
      console.error('saveContactVisitingCard error:', error);
      return res.json({
        status: false,
        rcode: 500,
        message: 'Failed to save visiting card'
      });
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
        return res.json({
          status: false,
          rcode: 500,
          message: 'user_id and token are required'
        });
      }
      
      if (!business_name || !name || !business_location || !country_id || country_id <= 0 || !state_id || state_id <= 0 || !city_id || city_id <= 0) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'Please enter mandatory fields'
        });
      }
      
      if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
        console.log('activateCard - File validation failed:', { 
          hasFiles: !!req.files, 
          fileCount: req.files?.length,
          filesType: typeof req.files,
          isArray: Array.isArray(req.files)
        });
        return res.json({
          status: false,
          rcode: 500,
          message: 'Please upload business documents'
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

      // Return response in standard format
      return res.json({
        status: true,
        rcode: 200,
        user_id: idEncode(decodedUserId),
        unique_token: token,
        ubc_id: String(ubc_id),
        message: 'Card request sent for activation successfully'
      });
      
    } catch (error) {
      console.error('activateCard error:', error);
      return res.json({
        status: false,
        rcode: 500,
        message: 'Failed to activate card'
      });
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
          event_id: row.event_id.toString(),
          user_id: row.user_id.toString(),
          event_name: row.event_name || "",
          industry_type: row.industry_type || "",
          country_id: row.country_id ? row.country_id.toString() : "",
          state_id: row.state_id ? row.state_id.toString() : "",
          city_id: row.city_id ? row.city_id.toString() : "",
          event_venue: row.event_venue || "",
          event_link: row.event_link || "",
          event_lat: row.event_lat ? row.event_lat.toString() : "",
          event_lng: row.event_lng ? row.event_lng.toString() : "",
          event_geo_address: row.event_geo_address || "",
          event_date: row.event_date || "",
          event_start_time: row.event_start_time || "",
          event_end_time: row.event_end_time || "",
          event_mode_id: row.event_mode_id ? row.event_mode_id.toString() : "",
          event_type_id: row.event_type_id ? row.event_type_id.toString() : "",
          event_details: row.event_details || "",
          event_banner: row.event_banner || "",
          status: row.status ? row.status.toString() : "0",
          created_dts: row.created_dts || "",
          created_by: row.created_by ? row.created_by.toString() : null,
          updated_at: row.updated_at || null,
          updated_by: row.updated_by ? row.updated_by.toString() : null,
          deleted: row.deleted ? row.deleted.toString() : "0",
          deleted_by: row.deleted_by ? row.deleted_by.toString() : null,
          deleted_at: row.deleted_at || null,
          event_mode: row.event_mode || "",
          event_type: row.event_type || "",
          total_attendees: row.total_attendees ? row.total_attendees.toString() : "0",
          distance_in_km: row.distance_in_km ? row.distance_in_km.toString() : "0",
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
          const skillIds = job.skill_ids ? job.skill_ids.split(',') : [];
          
          // Create mapped_skills array
          const mappedSkills = skillIds.map((id, index) => ({
            id: id.trim(),
            skill: skills[index] ? skills[index].trim() : ""
          }));
          
          return {
            job_id: job.job_id.toString(),
            user_id: job.user_id.toString(),
            job_title: job.job_title || "",
            company_name: job.company_name || "",
            country_id: job.country_id ? job.country_id.toString() : "",
            state_id: job.state_id ? job.state_id.toString() : "",
            city_id: job.city_id ? job.city_id.toString() : "",
            address: job.address || "",
            job_lat: job.job_lat ? job.job_lat.toString() : "",
            job_lng: job.job_lng ? job.job_lng.toString() : "",
            job_type_id: job.job_type_id ? job.job_type_id.toString() : "",
            pay_id: job.pay_id ? job.pay_id.toString() : "",
            job_description: job.job_description || "",
            skill_ids: job.skill_ids || "",
            status: job.status ? job.status.toString() : "0",
            created_dts: job.created_dts || "",
            created_by: job.created_by ? job.created_by.toString() : null,
            updated_at: job.updated_at || null,
            updated_by: job.updated_by ? job.updated_by.toString() : null,
            deleted: job.deleted ? job.deleted.toString() : "0",
            deleted_by: job.deleted_by ? job.deleted_by.toString() : null,
            deleted_at: job.deleted_at || null,
            job_type: job.job_type_name || "",
            pay: job.pay_name || "",
            country: job.country_name || "",
            state: job.state_name || "",
            city: job.city_name || "",
            skill_names: job.skill_names || "",
            distance_in_km: job.distance_in_km ? job.distance_in_km.toString() : "0",
            mapped_skills: mappedSkills
          };
        });
      }
  
      return res.json({
        status: true,
        rcode: 200,
        user_id: user_id,
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
      const { user_id, token, keyword, job_type, skill, location, pay } = {
        ...req.query,
        ...req.body
      };
      
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
      
      // Format job information to match PHP response with all fields as strings
      const formattedJobs = rows.map(job => ({
        job_id: job.job_id.toString(),
        user_id: job.user_id.toString(),
        job_title: job.job_title || "",
        company_name: job.company_name || "",
        country_id: job.country_id ? job.country_id.toString() : "",
        state_id: job.state_id ? job.state_id.toString() : "",
        city_id: job.city_id ? job.city_id.toString() : "",
        address: job.address || "",
        job_lat: job.job_lat ? job.job_lat.toString() : "",
        job_lng: job.job_lng ? job.job_lng.toString() : "",
        job_type_id: job.job_type_id ? job.job_type_id.toString() : "",
        pay_id: job.pay_id ? job.pay_id.toString() : "",
        job_description: job.job_description || "",
        skill_ids: job.skill_ids || "",
        status: job.status ? job.status.toString() : "0",
        created_dts: job.created_dts || "",
        created_by: job.created_by ? job.created_by.toString() : null,
        updated_at: job.updated_at || null,
        updated_by: job.updated_by ? job.updated_by.toString() : null,
        deleted: job.deleted ? job.deleted.toString() : "0",
        deleted_by: job.deleted_by ? job.deleted_by.toString() : null,
        deleted_at: job.deleted_at || null,
        job_type: job.job_type || "",
        pay: job.pay || "",
        country: job.country || "",
        state: job.state || "",
        city: job.city || "",
        skill_names: job.skill_names || ""
      }));
      
      // Return response in PHP format
      return res.json({
        status: true,
        rcode: 200,
        user_id: user_id,
        unique_token: token,
        job_information: formattedJobs
      });
      
    } catch (error) {
      console.error('getJobInformation error:', error);
      return res.json({
        status: false,
        rcode: 500,
        message: 'Failed to get job information'
      });
    }
  },
  async getJobDetail(req, res) {
    try {
      const { user_id, token, job_id } = {
        ...req.query,
        ...req.body
      };
      
      // Check if user_id, token, and job_id are provided
      if (!user_id || !token || !job_id) {
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
        return res.json({
          status: false,
          rcode: 500,
          message: 'Job not found'
        });
      }
      
      // Process skills mapping (matching PHP implementation)
      const jobData = jobRows[0];
      let mappedSkills = [];
      if (jobData.skills && jobData.skill_ids) {
        const skillIds = jobData.skill_ids.split(',');
        const skills = jobData.skills.split(',');
        
        for (let i = 0; i < skillIds.length; i++) {
          mappedSkills.push({
            id: skillIds[i].toString(),
            skill: skills[i] || ""
          });
        }
      }
      
      // Convert all integer values to strings for job_detail
      const jobDetail = [{
        job_id: jobData.job_id.toString(),
        user_id: jobData.user_id.toString(),
        job_title: jobData.job_title || "",
        company_name: jobData.company_name || "",
        country_id: jobData.country_id.toString(),
        state_id: jobData.state_id.toString(),
        city_id: jobData.city_id.toString(),
        address: jobData.address || "",
        job_lat: jobData.job_lat || "",
        job_lng: jobData.job_lng || "",
        job_type_id: jobData.job_type_id.toString(),
        pay_id: jobData.pay_id.toString(),
        job_description: jobData.job_description || "",
        skill_ids: jobData.skill_ids || "",
        status: jobData.status.toString(),
        created_dts: jobData.created_dts || "",
        created_by: jobData.created_by || "",
        updated_at: jobData.updated_at || "",
        updated_by: jobData.updated_by || "",
        deleted: jobData.deleted.toString(),
        deleted_by: jobData.deleted_by || "",
        deleted_at: jobData.deleted_at || "",
        job_type: jobData.job_type || "",
        pay: jobData.pay || "",
        country: jobData.country || "",
        state: jobData.state || "",
        city: jobData.city || "",
        skills: jobData.skills || "",
        mapped_skills: mappedSkills
      }];
      
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
        [getImageUrl(req, 'uploads/profiles/'), getImageUrl(req, 'uploads/resumes/'), job_id]
      );
      
      // Check if user has applied for this job (ensure proper type comparison)
      const hasApplied = applicantsRows.some(applicant => parseInt(applicant.applicant_id) === parseInt(decodedUserId));
      
      // Convert all integer values to strings for applicants_list
      const applicantsList = applicantsRows.map(row => ({
        applicant_id: row.applicant_id.toString(),
        first_name: row.first_name || "",
        last_name: row.last_name || "",
        email: row.email || "",
        mobile: row.mobile || "",
        skills: row.skills || "",
        profile_photo: row.profile_photo || "",
        resume_file: row.resume_file || ""
      }));
      
      // Return response in PHP format
      return res.json({
        status: true,
        rcode: 200,
        user_id: user_id,
        unique_token: token,
        has_applied: hasApplied,
        job_detail: jobDetail,
        applicants_list: applicantsList
      });
      
    } catch (error) {
      console.error('getJobDetail error:', error);
      return res.json({
        status: false,
        rcode: 500,
        message: 'Failed to get job detail'
      });
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
      const { user_id, token } = {
        ...req.query,
        ...req.body
      };
      
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
      
      // Convert all integer values to strings
      const resumesList = rows.map(row => ({
        resume_id: row.resume_id.toString(),
        user_id: row.user_id.toString(),
        resume_title: row.resume_title || "",
        resume_file: row.resume_file || "",
        status: row.status.toString(),
        created_dts: row.created_dts || "",
        resume_file_extension: row.resume_file_extension || ""
      }));
      
      // Return response in PHP format
      return res.json({
        status: true,
        rcode: 200,
        user_id: user_id,
        unique_token: token,
        resumes_list: resumesList
      });
      
    } catch (error) {
      console.error('getResumes error:', error);
      return res.json({
        status: false,
        rcode: 500,
        message: 'Failed to get resumes'
      });
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
      const { user_id, token } = {
        ...req.query,
        ...req.body
      };
      
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
      
      // Convert all integer values to strings
      const eventInformation = rows.map(row => ({
        event_id: row.event_id.toString(),
        user_id: row.user_id.toString(),
        event_name: row.event_name || "",
        industry_type: row.industry_type || "",
        country_id: row.country_id.toString(),
        state_id: row.state_id.toString(),
        city_id: row.city_id.toString(),
        event_venue: row.event_venue || "",
        event_link: row.event_link || "",
        event_lat: row.event_lat || "",
        event_lng: row.event_lng || "",
        event_geo_address: row.event_geo_address || "",
        event_date: row.event_date || "",
        event_start_time: row.event_start_time || "",
        event_end_time: row.event_end_time || "",
        event_mode_id: row.event_mode_id.toString(),
        event_type_id: row.event_type_id.toString(),
        event_details: row.event_details || "",
        event_banner: row.event_banner || "",
        status: row.status.toString(),
        created_dts: row.created_dts || "",
        created_by: row.created_by || "",
        updated_at: row.updated_at || "",
        updated_by: row.updated_by || "",
        deleted: row.deleted.toString(),
        deleted_by: row.deleted_by || "",
        deleted_at: row.deleted_at || "",
        event_mode: row.event_mode || "",
        event_type: row.event_type || "",
        country: row.country || "",
        state: row.state || "",
        city: row.city || ""
      }));
      
      // Return response in PHP format
      return res.json({
        status: true,
        rcode: 200,
        user_id: user_id,
        unique_token: token,
        event_information: eventInformation
      });
      
    } catch (error) {
      console.error('getEventInformation error:', error);
      return res.json({
        status: false,
        rcode: 500,
        message: 'Failed to get event information'
      });
    }
  },
  async getEventDetail(req, res) {
    try {
      const { user_id, token, event_id } = {
        ...req.query,
        ...req.body
      };
      
      // Check if user_id, token, and event_id are provided
      if (!user_id || !token || !event_id) {
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
      
      // Get event detail with joins (matching PHP implementation)
      const baseUrl = `${req.protocol}://${req.get('host')}`;
      const eventBannerPath = `${baseUrl}/uploads/events/`;
      
      const eventRows = await query(
        `SELECT user_event_details.*, 
                DATE_FORMAT(event_date, '%Y-%m-%d') as event_date,
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
        return res.json({
          status: false,
          rcode: 500,
          message: 'Event not found'
        });
      }
      
      // Get event organisers list with full details
      const organisersRows = await query(
        `SELECT users.user_id AS organiser_id, 
                COALESCE(full_name,'') AS full_name, 
                COALESCE(email,'') AS email, 
                mobile,
                COALESCE(address,'') AS address,
                users.city_id,
                COALESCE(cities.name,'') AS city,
                users.state_id,
                COALESCE(states.name,'') AS state,
                users.country_id,
                COALESCE(countries.name,'') AS country,
                COALESCE(linkedin_url,'') AS linkedin_url,
                COALESCE(summary,'') AS summary,
                IF(profile_photo != '', CONCAT(?, profile_photo), '') AS profile_photo
         FROM event_organisers
         JOIN users ON users.user_id = event_organisers.user_id
         LEFT JOIN countries ON countries.id = users.country_id
         LEFT JOIN states ON states.id = users.state_id
         LEFT JOIN cities ON cities.id = users.city_id
         WHERE event_organisers.event_id = ?`,
        [`${baseUrl}/uploads/profiles/`, event_id]
      );
      
      // Get event attendees list with full details
      const attendeesRows = await query(
        `SELECT users.user_id AS attendee_id, 
                COALESCE(full_name,'') AS full_name, 
                COALESCE(email,'') AS email, 
                mobile,
                COALESCE(address,'') AS address,
                users.city_id,
                COALESCE(cities.name,'') AS city,
                users.state_id,
                COALESCE(states.name,'') AS state,
                users.country_id,
                COALESCE(countries.name,'') AS country,
                COALESCE(interests,'') AS interests,
                COALESCE(linkedin_url,'') AS linkedin_url,
                COALESCE(summary,'') AS summary,
                IF(profile_photo != '', CONCAT(?, profile_photo), '') AS profile_photo
         FROM event_attendees
         JOIN users ON users.user_id = event_attendees.user_id
         LEFT JOIN countries ON countries.id = users.country_id
         LEFT JOIN states ON states.id = users.state_id
         LEFT JOIN cities ON cities.id = users.city_id
         WHERE event_attendees.event_id = ?`,
        [`${baseUrl}/uploads/profiles/`, event_id]
      );
      
      // Check if user has attended or organised this event
      let has_attended = false;
      let has_organised = false;
      
      // Convert decodedUserId to integer for comparison
      const userIdForComparison = parseInt(decodedUserId);
      
      if (organisersRows.length > 0) {
        const organiserUserIds = organisersRows.map(row => parseInt(row.organiser_id));
        if (organiserUserIds.includes(userIdForComparison)) {
          has_organised = true;
        }
      }
      
      if (attendeesRows.length > 0) {
        const attendeeUserIds = attendeesRows.map(row => parseInt(row.attendee_id));
        if (attendeeUserIds.includes(userIdForComparison)) {
          has_attended = true;
        }
      }
      
      // Convert all integer values to strings for event_detail
      const eventDetail = eventRows.map(row => ({
        event_id: (row.event_id || 0).toString(),
        user_id: (row.user_id || 0).toString(),
        event_name: row.event_name || "",
        industry_type: row.industry_type || "",
        country_id: (row.country_id || 0).toString(),
        state_id: (row.state_id || 0).toString(),
        city_id: (row.city_id || 0).toString(),
        event_venue: row.event_venue || "",
        event_link: row.event_link || "",
        event_lat: row.event_lat || "",
        event_lng: row.event_lng || "",
        event_geo_address: row.event_geo_address || "",
        event_date: row.event_date || "",
        event_start_time: row.event_start_time || "",
        event_end_time: row.event_end_time || "",
        event_mode_id: (row.event_mode_id || 0).toString(),
        event_type_id: (row.event_type_id || 0).toString(),
        event_details: row.event_details || "",
        event_banner: row.event_banner || "",
        status: (row.status || 0).toString(),
        created_dts: row.created_dts || "",
        created_by: row.created_by ? row.created_by.toString() : "",
        updated_at: row.updated_at || "",
        updated_by: row.updated_by ? row.updated_by.toString() : "",
        deleted: (row.deleted || 0).toString(),
        deleted_by: row.deleted_by ? row.deleted_by.toString() : "",
        deleted_at: row.deleted_at || "",
        host_name: row.host_name || "",
        event_mode: row.event_mode || "",
        event_type: row.event_type || ""
      }));
      
      // Convert all integer values to strings for organisers_list
      const organisersList = organisersRows.map(row => ({
        organiser_id: (row.organiser_id || 0).toString(),
        full_name: row.full_name || "",
        email: row.email || "",
        mobile: row.mobile || "",
        address: row.address || "",
        city_id: (row.city_id || 0).toString(),
        city: row.city || "",
        state_id: (row.state_id || 0).toString(),
        state: row.state || "",
        country_id: (row.country_id || 0).toString(),
        country: row.country || "",
        linkedin_url: row.linkedin_url || "",
        summary: row.summary || "",
        profile_photo: row.profile_photo || ""
      }));
      
      // Convert all integer values to strings for attendees_list
      const attendeesList = attendeesRows.map(row => ({
        attendee_id: (row.attendee_id || 0).toString(),
        full_name: row.full_name || "",
        email: row.email || "",
        mobile: row.mobile || "",
        address: row.address || "",
        city_id: (row.city_id || 0).toString(),
        city: row.city || "",
        state_id: (row.state_id || 0).toString(),
        state: row.state || "",
        country_id: (row.country_id || 0).toString(),
        country: row.country || "",
        interests: row.interests || "",
        linkedin_url: row.linkedin_url || "",
        summary: row.summary || "",
        profile_photo: row.profile_photo || ""
      }));
      
      // Return response in PHP format
      return res.json({
        status: true,
        rcode: 200,
        user_id: user_id,
        unique_token: token,
        has_attended: has_attended,
        has_organised: has_organised,
        event_detail: eventDetail,
        organisers_list: organisersList,
        attendees_list: attendeesList
      });
      
    } catch (error) {
      console.error('getEventDetail error:', error);
      return res.json({
        status: false,
        rcode: 500,
        message: 'Failed to get event detail'
      });
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
      
      // Convert date from DD-MM-YYYY to YYYY-MM-DD format for MySQL
      let formattedEventDate = event_date;
      console.log('Original event_date:', event_date);
      if (event_date && event_date.includes('-')) {
        const dateParts = event_date.split('-');
        if (dateParts.length === 3) {
          // Convert DD-MM-YYYY to YYYY-MM-DD
          formattedEventDate = `${dateParts[2]}-${dateParts[1]}-${dateParts[0]}`;
          console.log('Converted event_date:', formattedEventDate);
        }
      }
      
      // Prepare event data
      const eventData = {
        event_name,
        industry_type,
        event_date: formattedEventDate,
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
      // Support both query parameters and form data
      const { user_id, token, event_id } = {
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

      // Convert all integer values to strings for organisers_list
      const formattedOrganisersList = (organisersListRows || []).map(organiser => ({
        organiser_id: String(organiser.organiser_id || 0),
        full_name: organiser.full_name || "",
        email: organiser.email || "",
        mobile: organiser.mobile || "",
        address: organiser.address || "",
        city_id: String(organiser.city_id || 0),
        city: organiser.city || "",
        state_id: String(organiser.state_id || 0),
        state: organiser.state || "",
        country_id: String(organiser.country_id || 0),
        country: organiser.country || "",
        linkedin_url: organiser.linkedin_url || "",
        summary: organiser.summary || "",
        profile_photo: organiser.profile_photo || ""
      }));

      return res.json({
        status: true,
        rcode: 200,
        user_id: idEncode(decodedUserId),
        unique_token: token,
        organisers_list: formattedOrganisersList
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
      // Support both query parameters and form data
      const { user_id, token, event_id } = {
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

      // Convert all integer values to strings for attendees_list
      const formattedAttendeesList = (attendeesListRows || []).map(attendee => ({
        attendee_id: String(attendee.attendee_id || 0),
        full_name: attendee.full_name || "",
        email: attendee.email || "",
        mobile: attendee.mobile || "",
        address: attendee.address || "",
        city_id: String(attendee.city_id || 0),
        city: attendee.city || "",
        state_id: String(attendee.state_id || 0),
        state: attendee.state || "",
        country_id: String(attendee.country_id || 0),
        country: attendee.country || "",
        interests: attendee.interests || "",
        linkedin_url: attendee.linkedin_url || "",
        summary: attendee.summary || "",
        profile_photo: attendee.profile_photo || ""
      }));

      return res.json({
        status: true,
        rcode: 200,
        user_id: idEncode(decodedUserId),
        unique_token: token,
        attendees_list: formattedAttendeesList
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

      // Convert all integer values to strings for attended_list
      const formattedAttendedList = (eventsAttendedList || []).map(event => ({
        event_id: String(event.event_id || 0),
        user_id: String(event.user_id || 0),
        event_name: event.event_name || "",
        industry_type: event.industry_type || "",
        country_id: String(event.country_id || 0),
        state_id: String(event.state_id || 0),
        city_id: String(event.city_id || 0),
        event_venue: event.event_venue || "",
        event_link: event.event_link || "",
        event_lat: event.event_lat || "",
        event_lng: event.event_lng || "",
        event_geo_address: event.event_geo_address || "",
        event_date: event.event_date || "",
        event_start_time: event.event_start_time || "",
        event_end_time: event.event_end_time || "",
        event_mode_id: String(event.event_mode_id || 0),
        event_type_id: String(event.event_type_id || 0),
        event_details: event.event_details || "",
        event_banner: event.event_banner || "",
        status: String(event.status || 0),
        created_dts: event.created_dts || "",
        created_by: event.created_by ? event.created_by.toString() : null,
        updated_at: event.updated_at || null,
        updated_by: event.updated_by ? event.updated_by.toString() : null,
        deleted: String(event.deleted || 0),
        deleted_by: event.deleted_by ? event.deleted_by.toString() : null,
        deleted_at: event.deleted_at || null,
        event_mode: event.event_mode || null,
        event_type: event.event_type || null,
        country: event.country || "",
        state: event.state || "",
        city: event.city || ""
      }));

      // Return response in PHP format (matching exactly)
      return res.json({
        status: true,
        rcode: 200,
        user_id: idEncode(decodedUserId),
        unique_token: token,
        attended_list: formattedAttendedList
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

      // Convert all integer values to strings for organised_list
      const formattedOrganisedList = (eventsOrganisedList || []).map(event => ({
        event_id: String(event.event_id || 0),
        user_id: String(event.user_id || 0),
        event_name: event.event_name || "",
        industry_type: event.industry_type || "",
        country_id: String(event.country_id || 0),
        state_id: String(event.state_id || 0),
        city_id: String(event.city_id || 0),
        event_venue: event.event_venue || "",
        event_link: event.event_link || "",
        event_lat: event.event_lat || "",
        event_lng: event.event_lng || "",
        event_geo_address: event.event_geo_address || "",
        event_date: event.event_date || "",
        event_start_time: event.event_start_time || "",
        event_end_time: event.event_end_time || "",
        event_mode_id: String(event.event_mode_id || 0),
        event_type_id: String(event.event_type_id || 0),
        event_details: event.event_details || "",
        event_banner: event.event_banner || "",
        status: String(event.status || 0),
        created_dts: event.created_dts || "",
        created_by: event.created_by ? event.created_by.toString() : null,
        updated_at: event.updated_at || null,
        updated_by: event.updated_by ? event.updated_by.toString() : null,
        deleted: String(event.deleted || 0),
        deleted_by: event.deleted_by ? event.deleted_by.toString() : null,
        deleted_at: event.deleted_at || null,
        event_mode: event.event_mode || null,
        event_type: event.event_type || null,
        country: event.country || "",
        state: event.state || "",
        city: event.city || ""
      }));

      // Return response in PHP format (matching exactly)
      return res.json({
        status: true,
        rcode: 200,
        user_id: idEncode(decodedUserId),
        unique_token: token,
        organised_list: formattedOrganisedList
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
        return res.json({
          status: false,
          rcode: 500,
          message: 'Token Mismatch Exception'
        });
      }
      
      if (!user_sub_folder_id) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'user_sub_folder_id is required'
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

      // Get contact visiting card information
      const contactCardInfo = await query(`
        SELECT 
          ucvc.*
        FROM user_contacts_visiting_cards ucvc
        WHERE ucvc.user_id = ? 
        AND ucvc.user_sub_folder_id = ? 
        AND ucvc.status = 1
      `, [decodedUserId, user_sub_folder_id]);

      // Convert all integer values to strings and generate proper image URLs to match Flutter model
      const formattedContactCardInfo = contactCardInfo.map(card => ({
        ucvc_id: String(card.ucvc_id || 0),
        user_id: String(card.user_id || 0),
        user_folder_id: String(card.user_folder_id || 0),
        user_sub_folder_id: String(card.user_sub_folder_id || 0),
        visiting_card_front: card.visiting_card_front ? getImageUrl(req, `uploads/visiting_cards/${card.visiting_card_front}`) : "",
        visiting_card_back: card.visiting_card_back ? getImageUrl(req, `uploads/visiting_cards/${card.visiting_card_back}`) : "",
        status: String(card.status || 0),
        created_dts: card.created_dts || ""
      }));

      // Return response in PHP format - exact match with same data types
      return res.json({
        status: true,
        rcode: 200,
        user_id: user_id,
        unique_token: token,
        contact_card_info: formattedContactCardInfo
      });
      
    } catch (error) {
      console.error('getContactVisitingCardInformation error:', error);
      return res.json({
        status: false,
        rcode: 500,
        message: 'Failed to get contact visiting card information'
      });
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
        return res.json({
          status: false,
          rcode: 500,
          message: 'user_id and token are required'
        });
      }
      
      if (!usps_id) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'usps_id is required'
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
        return res.json({
          status: false,
          rcode: 500,
          message: 'Service not found'
        });
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
            name: row.name || "",
            review: row.review || "",
            rating: row.rating ? parseInt(row.rating) : 0,
            review_date_time: row.review_dts ? Math.floor(new Date(row.review_dts).getTime() / 1000) : 0
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

      // Convert service detail with mixed string and integer values as per example
      const formattedServiceDetail = (serviceDetail || []).map(service => ({
        usps_id: (service.usps_id || 0).toString(),
        sp_id: (service.sp_id || 0).toString(),
        service_id: (service.service_id || 0).toString(),
        service_name: service.service_name || "",
        company_name: service.company_name || "",
        tag_line: service.tag_line || "",
        title: service.title || "",
        service_description: service.service_description || "",
        service_image: service.service_image || "",
        avg_service_rating: service.avg_service_rating ? service.avg_service_rating.toString() : "0",
        status: (service.status || 0).toString(),
        created_dts: service.created_dts || "",
        country: service.country || "",
        state: service.state || "",
        city: service.city || "",
        full_name: service.full_name || "",
        mobile: service.mobile || "",
        user_id: (service.user_id || 0).toString(),
        profile_photo: service.profile_photo || "",
        total_profile_views: totalProfileViews
      }));

      // Return response in PHP format (matching exactly)
      return res.json({
        status: true,
        rcode: 200,
        user_id: user_id,
        unique_token: token,
        service_detail: formattedServiceDetail,
        service_unlocked: (serviceUnlocked && serviceUnlocked.length > 0 ? 1 : 0),
        ratings: [ratings],
        reviews: reviews
      });
      
    } catch (error) {
      console.error('getServiceDetail error:', error);
      return res.json({
        status: false,
        rcode: 500,
        message: 'Failed to get service detail'
      });
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
        return res.json({
          status: false,
          rcode: 500,
          message: 'user_id and token are required'
        });
      }
      
      if (!service_id) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'service_id is required'
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

      // Convert all integer values to strings
      const formattedServicesList = (servicesList || []).map(service => ({
        usps_id: (service.usps_id || 0).toString(),
        sp_id: (service.sp_id || 0).toString(),
        service_id: (service.service_id || 0).toString(),
        service_name: service.service_name || "",
        company_name: service.company_name || "",
        tag_line: service.tag_line || "",
        title: service.title || "",
        service_description: service.service_description || "",
        service_image: service.service_image || "",
        avg_service_rating: service.avg_service_rating ? service.avg_service_rating.toString() : "",
        status: (service.status || 0).toString(),
        created_dts: service.created_dts || "",
        country: service.country || "",
        state: service.state || "",
        city: service.city || ""
      }));

      // Return response in PHP format (matching exactly)
      return res.json({
        status: true,
        rcode: 200,
        user_id: user_id,
        unique_token: token,
        services_list: formattedServicesList
      });
      
    } catch (error) {
      console.error('getAllServicesList error:', error);
      return res.json({
        status: false,
        rcode: 500,
        message: 'Failed to get all services list'
      });
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

      // Convert all numeric fields to strings to match Flutter model
      const formattedServiceUnlockedDetails = (serviceUnlockedDetails || []).map(service => ({
        sp_id: String(service.sp_id || 0),
        user_id: String(service.user_id || 0),
        country_id: String(service.country_id || 0),
        state_id: String(service.state_id || 0),
        city_id: String(service.city_id || 0),
        description: service.description || "",
        avg_sp_rating: service.avg_sp_rating ? String(service.avg_sp_rating) : "",
        approval_status: String(service.approval_status || 0),
        status: String(service.status || 0),
        created_dts: service.created_dts || "",
        created_by: service.created_by ? String(service.created_by) : "",
        updated_at: service.updated_at || "",
        updated_by: service.updated_by ? String(service.updated_by) : "",
        deleted: String(service.deleted || 0),
        deleted_by: service.deleted_by ? String(service.deleted_by) : "",
        deleted_at: service.deleted_at || "",
        full_name: service.full_name || "",
        email: service.email || "",
        mobile: service.mobile || "",
        country: service.country || "",
        state: service.state || "",
        city: service.city || "",
        profile_photo: service.profile_photo || ""
      }));

      // Return response in PHP format (matching exactly)
      return res.json({
        status: true,
        rcode: 200,
        user_id: idEncode(decodedUserId),
        unique_token: token,
        service_unlocked_detail: formattedServiceUnlockedDetails
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

      // Convert all integer values to strings
      const formattedInvestorsList = (investorsList || []).map(investor => ({
        investor_id: (investor.investor_id || 0).toString(),
        user_id: (investor.user_id || 0).toString(),
        reference_no: investor.reference_no || "",
        name: investor.name || "",
        country_id: (investor.country_id || 0).toString(),
        state_id: (investor.state_id || 0).toString(),
        city_id: (investor.city_id || 0).toString(),
        fund_size_id: (investor.fund_size_id || 0).toString(),
        linkedin_url: investor.linkedin_url || "",
        bio: investor.bio || "",
        image: investor.image || "",
        profile: investor.profile || "",
        investment_stage: investor.investment_stage || "",
        availability: investor.availability || "",
        meeting_city: investor.meeting_city || "",
        countries_to_invest: investor.countries_to_invest || "",
        investment_industry: investor.investment_industry || "",
        language: investor.language || "",
        avg_rating: investor.avg_rating ? investor.avg_rating.toString() : "",
        status: (investor.status || 0).toString(),
        approval_status: (investor.approval_status || 0).toString(),
        created_dts: investor.created_dts || "",
        created_by: investor.created_by ? investor.created_by.toString() : "",
        updated_at: investor.updated_at || "",
        updated_by: investor.updated_by ? investor.updated_by.toString() : "",
        deleted: (investor.deleted || 0).toString(),
        deleted_by: investor.deleted_by ? investor.deleted_by.toString() : "",
        deleted_at: investor.deleted_at || "",
        country: investor.country || "",
        state: investor.state || "",
        city: investor.city || "",
        investment_range: investor.investment_range || ""
      }));

      // Return response in PHP format (matching exactly)
      return res.json({
        status: true,
        rcode: 200,
        user_id: user_id,
        unique_token: token,
        investors_list: formattedInvestorsList
      });
      
    } catch (error) {
      console.error('getAllInvestorsList error:', error);
      return res.json({
        status: false,
        rcode: 500,
        message: 'Failed to get investors list'
      });
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
        return res.json({
          status: false,
          rcode: 500,
          message: 'user_id and token are required'
        });
      }
      
      if (!investor_id || investor_id <= 0) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'investor_id is required'
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
        return res.json({
          status: false,
          rcode: 500,
          message: 'Investor not found'
        });
      }

      // Add default values
      investorDetail[0].no_of_meetings = 0;
      investorDetail[0].no_of_investments = 0;

      // Get meetings type list (handle missing table gracefully)
      let meetingsTypeList = [];
      try {
        meetingsTypeList = await query('SELECT * FROM meetings_type WHERE status = 1');
      } catch (error) {
        console.log('meetings_type table not found, using empty array');
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
            review_date_time: row.review_dts ? Math.floor(new Date(row.review_dts).getTime() / 1000) : 0
          });
        });
      }

      // Convert all integer values to strings for investor_detail
      const formattedInvestorDetail = (investorDetail || []).map(investor => ({
        investor_id: String(investor.investor_id || 0),
        user_id: String(investor.user_id || 0),
        reference_no: investor.reference_no || "",
        name: investor.name || "",
        country_id: String(investor.country_id || 0),
        state_id: String(investor.state_id || 0),
        city_id: String(investor.city_id || 0),
        fund_size_id: String(investor.fund_size_id || 0),
        linkedin_url: investor.linkedin_url || "",
        bio: investor.bio || "",
        image: investor.image || "",
        profile: investor.profile || "",
        investment_stage: investor.investment_stage || "",
        availability: investor.availability || "",
        meeting_city: investor.meeting_city || "",
        countries_to_invest: investor.countries_to_invest || "",
        investment_industry: investor.investment_industry || "",
        language: investor.language || "",
        avg_rating: investor.avg_rating ? investor.avg_rating.toString() : "",
        status: String(investor.status || 0),
        approval_status: String(investor.approval_status || 0),
        created_dts: investor.created_dts || "",
        created_by: investor.created_by ? investor.created_by.toString() : null,
        updated_at: investor.updated_at || null,
        updated_by: investor.updated_by ? investor.updated_by.toString() : null,
        deleted: String(investor.deleted || 0),
        deleted_by: investor.deleted_by ? investor.deleted_by.toString() : "",
        deleted_at: investor.deleted_at || "",
        country: investor.country || "",
        state: investor.state || "",
        city: investor.city || "",
        investment_range: investor.investment_range || "",
        no_of_meetings: investor.no_of_meetings || 0,
        no_of_investments: investor.no_of_investments || 0
      }));

      // Convert all integer values to strings for meeting_type
      const formattedMeetingType = (meetingsTypeList || []).map(meeting => ({
        meeting_id: (meeting.id || 0).toString(),
        name: meeting.name || "",
        mins: (meeting.mins || 0).toString(),
        amount: (meeting.amount || 0).toString(),
        type: meeting.type || ""
      }));

      // Convert all integer values to strings for investor_unlocked
      const formattedInvestorUnlocked = (investorUnlocked || []).map(unlock => ({
        iu_id: String(unlock.iu_id || 0),
        user_id: String(unlock.user_id || 0),
        investor_id: String(unlock.investor_id || 0),
        meeting_id: String(unlock.meeting_id || 0),
        meeting_date: unlock.meeting_date || "",
        meeting_time: unlock.meeting_time || "",
        request_status: unlock.request_status || "",
        meeting_location: unlock.meeting_location || "",
        meeting_lat: unlock.meeting_lat ? String(unlock.meeting_lat) : "",
        meeting_lng: unlock.meeting_lng ? String(unlock.meeting_lng) : "",
        meeting_url: unlock.meeting_url || "",
        rating: unlock.rating ? String(unlock.rating) : null,
        review: unlock.review || null,
        status: String(unlock.status || 0),
        created_dts: unlock.created_dts || "",
        review_dts: unlock.review_dts || null
      }));

      // Return response in PHP format (matching exactly)
      return res.json({
        status: true,
        rcode: 200,
        user_id: user_id,
        unique_token: token,
        investor_detail: formattedInvestorDetail,
        meeting_type: formattedMeetingType,
        investor_unlocked: formattedInvestorUnlocked,
        ratings: [ratings],
        reviews: reviews
      });
      
    } catch (error) {
      console.error('getInvestorDetail error:', error);
      return res.json({
        status: false,
        rcode: 500,
        message: 'Failed to get investor detail'
      });
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
      
      // Convert all integer values to strings for investor_detail
      const formattedInvestorDetail = (investorProfileData || []).map(investor => ({
        investor_id: String(investor.investor_id || 0),
        user_id: String(investor.user_id || 0),
        reference_no: investor.reference_no || "",
        name: investor.name || "",
        country_id: String(investor.country_id || 0),
        state_id: String(investor.state_id || 0),
        city_id: String(investor.city_id || 0),
        fund_size_id: String(investor.fund_size_id || 0),
        linkedin_url: investor.linkedin_url || "",
        bio: investor.bio || "",
        image: investor.image || "",
        profile: investor.profile || "",
        investment_stage: investor.investment_stage || "",
        availability: investor.availability || "",
        meeting_city: investor.meeting_city || "",
        countries_to_invest: investor.countries_to_invest || "",
        investment_industry: investor.investment_industry || "",
        language: investor.language || "",
        avg_rating: investor.avg_rating ? investor.avg_rating.toString() : "",
        status: String(investor.status || 0),
        approval_status: String(investor.approval_status || 0),
        created_dts: investor.created_dts || "",
        created_by: investor.created_by ? investor.created_by.toString() : null,
        updated_at: investor.updated_at || null,
        updated_by: investor.updated_by ? investor.updated_by.toString() : null,
        deleted: String(investor.deleted || 0),
        deleted_by: investor.deleted_by ? investor.deleted_by.toString() : "",
        deleted_at: investor.deleted_at || "",
        country: investor.country || "",
        state: investor.state || "",
        city: investor.city || "",
        investment_range: investor.investment_range || "",
        no_of_meetings: investor.no_of_meetings || 0,
        no_of_investments: investor.no_of_investments || 0
      }));

      // Wrap ratings in array to match PHP format
      const ratingsArray = [ratingsStats];
      
      return res.json({
        status: true,
        rcode: 200,
        user_id: idEncode(decodedUserId),
        unique_token: token,
        investor_detail: formattedInvestorDetail,
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
      
      // Convert all numeric fields to strings to match Flutter model
      const formattedInvestorMeets = (investorMeets || []).map(meet => ({
        iu_id: String(meet.iu_id || 0),
        user_id: String(meet.user_id || 0),
        investor_id: String(meet.investor_id || 0),
        meeting_id: String(meet.meeting_id || 0),
        meeting_date: meet.meeting_date || "",
        meeting_time: meet.meeting_time || "",
        request_status: meet.request_status || "",
        meeting_location: meet.meeting_location || "",
        meeting_lat: meet.meeting_lat ? String(meet.meeting_lat) : "",
        meeting_lng: meet.meeting_lng ? String(meet.meeting_lng) : "",
        meeting_url: meet.meeting_url || "",
        rating: meet.rating ? String(meet.rating) : "",
        review: meet.review || "",
        status: String(meet.status || 0),
        created_dts: meet.created_dts || "",
        review_dts: meet.review_dts || "",
        investor_name: meet.investor_name || "",
        investor_profile: meet.investor_profile || "",
        investment_stage: meet.investment_stage || "",
        availability: meet.availability || "",
        meeting_city: meet.meeting_city || "",
        countries_to_invest: meet.countries_to_invest || "",
        investment_industry: meet.investment_industry || "",
        language: meet.language || "",
        avg_rating: meet.avg_rating ? String(meet.avg_rating) : "",
        investor_image: meet.investor_image || "",
        country: meet.country || "",
        state: meet.state || "",
        city: meet.city || ""
      }));
      
      // Return response in PHP format (matching exactly)
      return res.json({
        status: true,
        rcode: 200,
        user_id: idEncode(decodedUserId),
        unique_token: token,
        investor_lists: formattedInvestorMeets
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
        return res.json({
          status: false,
          rcode: 500,
          message: 'user_id and token are required'
        });
      }
      
      // Check if current_user_id is provided
      if (!current_user_id || current_user_id === "") {
        return res.json({
          status: false,
          rcode: 500,
          message: 'current_user_id is required'
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
      
      // Decode current_user_id
      // current_user_id is a regular integer, not base64 encoded
      const currentUserId = parseInt(current_user_id);
      if (isNaN(currentUserId) || currentUserId <= 0) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'Invalid current_user_id'
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

      // Convert all integer values to strings
      const formattedChatDetails = (chatDetails || []).map(chat => ({
        chat_id: (chat.chat_id || 0).toString(),
        sender_id: (chat.sender_id || 0).toString(),
        receiver_id: (chat.receiver_id || 0).toString(),
        message: chat.message || "",
        created_dts: chat.created_dts || "",
        sender_name: chat.sender_name || "",
        sender_profile_photo: chat.sender_profile_photo || "",
        receiver_name: chat.receiver_name || "",
        receiver_profile_photo: chat.receiver_profile_photo || ""
      }));

      return res.json({
        status: true,
        rcode: 200,
        user_id: user_id,
        unique_token: token,
        chat_detail: formattedChatDetails
      });
      
    } catch (error) {
      console.error('getChat error:', error);
      return res.json({
        status: false,
        rcode: 500,
        message: 'Failed to get chat details'
      });
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
        return res.json({
          status: false,
          rcode: 500,
          message: 'Token Mismatch Exception'
        });
      }
      
      if (!type) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'type is required'
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
      
      console.log('getFoldersListByType - Decoded user ID:', decodedUserId);
      
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
      console.log('getFoldersListByType - User data:', { 
        user_id: user.user_id, 
        network_folder_created: user.network_folder_created,
        services_folder_created: user.services_folder_created 
      });
      
      // Validate token
      if (user.unique_token !== token) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'Token Mismatch Exception'
        });
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

      // Add visiting cards count to folders list and convert all numeric values to strings
      if (foldersList.length > 0) {
        foldersList.forEach(folder => {
          folder.visiting_cards_count = visitingCardsCount[folder.user_folder_id] || "0";
        });
      }

      // Convert all integer values to strings to match the exact response format
      const formattedFoldersList = foldersList.map(folder => ({
        user_folder_id: (folder.user_folder_id || 0).toString(),
        user_id: (decodedUserId || 0).toString(),
        master_folder_id: (folder.master_folder_id || 0).toString(),
        type: folder.type || "",
        folder_name: folder.folder_name || "",
        status: "1", // Always 1 for active folders
        created_dts: folder.created_dts || new Date().toISOString().slice(0, 19).replace('T', ' '),
        contacts_count: (folder.contacts_count || 0).toString(),
        visiting_cards_count: (folder.visiting_cards_count || 0).toString()
      }));

      console.log('getFoldersListByType - Final folders list:', formattedFoldersList);
      
      // Return response in PHP format - exact match with same data types
      return res.json({
        status: true,
        rcode: 200,
        user_id: user_id,
        unique_token: token,
        folders_list: formattedFoldersList
      });
      
    } catch (error) {
      console.error('getFoldersListByType error:', error);
      return res.json({
        status: false,
        rcode: 500,
        message: 'Failed to get folders list'
      });
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
        return res.json({
          status: false,
          rcode: 500,
          message: 'Token Mismatch Exception'
        });
      }
      
      if (!user_folder_id) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'user_folder_id is required'
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

      // Add visiting cards count to sub folders list and convert all numeric values to strings
      if (subFoldersList.length > 0) {
        subFoldersList.forEach(folder => {
          folder.visiting_cards_count = visitingCardsCount[folder.user_sub_folder_id] || "0";
        });
      }

      // Convert all integer values to strings to match the exact response format
      const formattedSubFoldersList = subFoldersList.map(folder => ({
        user_sub_folder_id: (folder.user_sub_folder_id || 0).toString(),
        user_id: (decodedUserId || 0).toString(),
        user_folder_id: (folder.user_folder_id || 0).toString(),
        folder_name: folder.folder_name || "",
        status: "1", // Always 1 for active sub folders
        created_dts: folder.created_dts || new Date().toISOString().slice(0, 19).replace('T', ' '),
        contacts_count: (folder.contacts_count || 0).toString(),
        visiting_cards_count: (folder.visiting_cards_count || 0).toString()
      }));

      console.log('getSubFoldersList - Final sub folders list:', formattedSubFoldersList);
      
      // Return response in PHP format - exact match with same data types
      return res.json({
        status: true,
        rcode: 200,
        user_id: user_id,
        unique_token: token,
        sub_folders_list: formattedSubFoldersList
      });
      
    } catch (error) {
      console.error('getSubFoldersList error:', error);
      return res.json({
        status: false,
        rcode: 500,
        message: 'Failed to get sub folders list'
      });
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
      const { user_id, token } = {
        ...req.query,
        ...req.body
      };
      
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

      // Convert all integer values to strings
      const projectDetails = projectDetailsRows.map(row => ({
        project_detail_id: row.project_detail_id.toString(),
        user_id: row.user_id.toString(),
        project_name: row.project_name || "",
        description: row.description || "",
        project_url: row.project_url || "",
        start_month: row.start_month || "",
        start_year: row.start_year || "",
        closed_month: row.closed_month || "",
        closed_year: row.closed_year || "",
        project_logo: row.project_logo || "",
        status: row.status.toString(),
        created_dts: row.created_dts || "",
        created_by: row.created_by || "",
        updated_at: row.updated_at || "",
        updated_by: row.updated_by || "",
        deleted: row.deleted.toString(),
        deleted_by: row.deleted_by || "",
        deleted_at: row.deleted_at || ""
      }));

      return res.json({
        status: true,
        rcode: 200,
        user_id: user_id,
        unique_token: token,
        project_details: projectDetails
      });
      
    } catch (error) {
      console.error('getProjectDetails error:', error);
      return res.json({
        status: false,
        rcode: 500,
        message: 'Failed to get project details'
      });
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

      // Check mandatory fields
      if (!institute_name || !degree || !start_date || !end_date) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'Please enter mandatory fields'
        });
      }

      let finalEducationDetailId = education_detail_id || 0;

      // Format dates to Y-m-d format - handle both DD-MM-YYYY and YYYY-MM-DD formats
      let formattedStartDate, formattedEndDate;
      
      // Check if date is in DD-MM-YYYY format (from Flutter)
      if (start_date && start_date.includes('-') && start_date.split('-')[0].length === 2) {
        // Convert DD-MM-YYYY to YYYY-MM-DD
        const [day, month, year] = start_date.split('-');
        formattedStartDate = `${year}-${month}-${day}`;
      } else {
        // Assume it's already in YYYY-MM-DD format or use Date constructor
        formattedStartDate = new Date(start_date).toISOString().split('T')[0];
      }
      
      if (end_date) {
        // Check if date is in DD-MM-YYYY format (from Flutter)
        if (end_date.includes('-') && end_date.split('-')[0].length === 2) {
          // Convert DD-MM-YYYY to YYYY-MM-DD
          const [day, month, year] = end_date.split('-');
          formattedEndDate = `${year}-${month}-${day}`;
        } else {
          // Assume it's already in YYYY-MM-DD format or use Date constructor
          formattedEndDate = new Date(end_date).toISOString().split('T')[0];
        }
      } else {
        formattedEndDate = null;
      }

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
        user_id: user_id,
        unique_token: token,
        education_detail_id: finalEducationDetailId.toString(),
        message: 'Education Details saved successfully'
      });
      
    } catch (error) {
      console.error('saveEducationDetails error:', error);
      return res.json({
        status: false,
        rcode: 500,
        message: 'Failed to save education details'
      });
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
      const { user_id, token } = {
        ...req.query,
        ...req.body
      };
      
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
      
      // Convert all integer values to strings
      const workDetails = workDetailsRows.map(row => ({
        work_detail_id: (row.work_detail_id || 0).toString(),
        user_id: (row.user_id || 0).toString(),
        company_name: row.company_name || "",
        position: row.position || "",
        employment_type_id: (row.employment_type_id || 0).toString(),
        employment_type: row.employment_type || "",
        start_date: row.start_date || "",
        end_date: row.end_date || "",
        description: row.description || "",
        status: (row.status || 0).toString(),
        created_dts: row.created_dts || "",
        created_by: row.created_by || "",
        updated_at: row.updated_at || "",
        updated_by: row.updated_by || "",
        deleted: (row.deleted || 0).toString(),
        deleted_by: row.deleted_by || "",
        deleted_at: row.deleted_at || ""
      }));
      
      // Return response in PHP format
      return res.json({
        status: true,
        rcode: 200,
        user_id: user_id,
        unique_token: token,
        work_details: workDetails
      });
      
    } catch (error) {
      console.error('getWorkDetails error:', error);
      return res.json({
        status: false,
        rcode: 500,
        message: 'Failed to get work details'
      });
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

      // Check mandatory fields
      if (!company_name || !designation || !start_date || !employment_type_id) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'Please enter mandatory fields'
        });
      }

      // Format dates to Y-m-d format - handle both DD-MM-YYYY and YYYY-MM-DD formats
      let formattedStartDate, formattedEndDate;
      
      // Check if date is in DD-MM-YYYY format (from Flutter)
      if (start_date && start_date.includes('-') && start_date.split('-')[0].length === 2) {
        // Convert DD-MM-YYYY to YYYY-MM-DD
        const [day, month, year] = start_date.split('-');
        formattedStartDate = `${year}-${month}-${day}`;
      } else {
        // Assume it's already in YYYY-MM-DD format or use Date constructor
        formattedStartDate = new Date(start_date).toISOString().split('T')[0];
      }
      
      if (end_date) {
        // Check if date is in DD-MM-YYYY format (from Flutter)
        if (end_date.includes('-') && end_date.split('-')[0].length === 2) {
          // Convert DD-MM-YYYY to YYYY-MM-DD
          const [day, month, year] = end_date.split('-');
          formattedEndDate = `${year}-${month}-${day}`;
        } else {
          // Assume it's already in YYYY-MM-DD format or use Date constructor
          formattedEndDate = new Date(end_date).toISOString().split('T')[0];
        }
      } else {
        formattedEndDate = null;
      }

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
        const updateResult = await query(
          `UPDATE user_work_details 
           SET company_name = ?, designation = ?, start_date = ?, end_date = ?, currently_working = ?, employment_type_id = ?
           WHERE work_detail_id = ? AND user_id = ?`,
          [company_name, designation, formattedStartDate, formattedEndDate, currently_working || 0, employment_type_id, finalWorkDetailId, decodedUserId]
        );
        
        if (updateResult.affectedRows === 0) {
          return res.json({
            status: false,
            rcode: 500,
            message: 'Work detail not found or access denied'
          });
        }
      }
      
      // Return response in PHP format
      return res.json({
        status: true,
        rcode: 200,
        user_id: user_id,
        unique_token: token,
        work_detail_id: finalWorkDetailId.toString(),
        message: 'Work Details saved successfully'
      });
      
    } catch (error) {
      console.error('saveWorkDetails error:', error);
      return res.json({
        status: false,
        rcode: 500,
        message: 'Failed to save work details'
      });
    }
  },

  // Generic handler for missing methods
  async genericHandler(req, res) {
    const methodName = req.route.path.split('/').pop();
    return ok(res, { message: `${methodName} endpoint called successfully` });
  },

  // Frontend routes - PHP compatible version
  deleteRequest(req, res) {
    try {
      const html = '<!DOCTYPE html><html><head><title>Delete Request</title></head><body><h1>Delete Request Form</h1><form action="/thank-you" method="post"><input type="text" name="user_name" placeholder="Name"><input type="text" name="user_mobile_no" placeholder="Mobile"><input type="text" name="user_email_address" placeholder="Email"><textarea name="user_account_delete_reason" placeholder="Reason"></textarea><button type="submit">Submit</button></form></body></html>';
      res.setHeader('Content-Type', 'text/html');
      return res.send(html);
    } catch (error) {
      console.error('deleteRequest error:', error);
      return res.status(500).send('Internal Server Error');
    }
  },

  thankYou(req, res) {
    try {
      const html = '<!DOCTYPE html><html><head><title>Thank You</title></head><body><h1>Thank You!</h1><p>Your request for account deletion is received and we will contact you soon.</p></body></html>';
      res.setHeader('Content-Type', 'text/html');
      return res.send(html);
    } catch (error) {
      console.error('thankYou error:', error);
      return res.status(500).send('Internal Server Error');
    }
  },

  // Frontend routes - PHP compatible version
  deleteRequest(req, res) {
    try {
      const html = '<!DOCTYPE html><html><head><title>Delete Request</title></head><body><h1>Delete Request Form</h1><form action="/thank-you" method="post"><input type="text" name="user_name" placeholder="Name"><input type="text" name="user_mobile_no" placeholder="Mobile"><input type="text" name="user_email_address" placeholder="Email"><textarea name="user_account_delete_reason" placeholder="Reason"></textarea><button type="submit">Submit</button></form></body></html>';
      res.setHeader('Content-Type', 'text/html');
      return res.send(html);
    } catch (error) {
      console.error('deleteRequest error:', error);
      return res.status(500).send('Internal Server Error');
    }
  },

  thankYou(req, res) {
    try {
      const html = '<!DOCTYPE html><html><head><title>Thank You</title></head><body><h1>Thank You!</h1><p>Your request for account deletion is received and we will contact you soon.</p></body></html>';
      res.setHeader('Content-Type', 'text/html');
      return res.send(html);
    } catch (error) {
      console.error('thankYou error:', error);
      return res.status(500).send('Internal Server Error');
    }
  },

  // Investor Unlock - Save investor meeting request
  investorUnlock: async (req, res) => {
    try {
      const { user_id, token, investor_id, meeting_id, meeting_date, meeting_time } = { ...req.query, ...req.body };
      
      if (!user_id || !token) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'user_id and token are required'
        });
      }
      
      if (!investor_id || !meeting_id || !meeting_date || !meeting_time) {
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

      // Validate investor_id
      const investorId = parseInt(investor_id);
      if (isNaN(investorId) || investorId <= 0) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'Invalid investor ID'
        });
      }

      // Validate meeting_id
      const meetingId = parseInt(meeting_id);
      if (isNaN(meetingId) || meetingId <= 0) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'Invalid meeting ID'
        });
      }

      // Format meeting date to Y-m-d format
              let formattedMeetingDate;
        try {
          let dateObj;
        
        // Handle different date formats
        if (meeting_date.includes('-')) {
          const parts = meeting_date.split('-');
          if (parts.length === 3) {
            // Check if it's DD-MM-YYYY format
            if (parts[0].length === 2 && parts[1].length === 2 && parts[2].length === 4) {
              // DD-MM-YYYY format
              dateObj = new Date(parts[2], parts[1] - 1, parts[0]);
            } else if (parts[0].length === 4 && parts[1].length === 2 && parts[2].length === 2) {
              // YYYY-MM-DD format
              dateObj = new Date(meeting_date);
            } else {
              dateObj = new Date(meeting_date);
            }
          } else {
            dateObj = new Date(meeting_date);
          }
        } else if (meeting_date.includes('/')) {
          const parts = meeting_date.split('/');
          if (parts.length === 3) {
            // Check if it's DD/MM/YYYY format
            if (parts[0].length === 2 && parts[1].length === 2 && parts[2].length === 4) {
              // DD/MM/YYYY format
              dateObj = new Date(parts[2], parts[1] - 1, parts[0]);
            } else {
              dateObj = new Date(meeting_date);
            }
          } else {
            dateObj = new Date(meeting_date);
          }
        } else {
          // Try default parsing
          dateObj = new Date(meeting_date);
        }
        
        if (isNaN(dateObj.getTime())) {
          return res.json({
            status: false,
            rcode: 500,
            message: 'Invalid meeting date format. Please use DD-MM-YYYY, YYYY-MM-DD, or DD/MM/YYYY format'
          });
        }
        formattedMeetingDate = dateObj.toISOString().split('T')[0];
      } catch (error) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'Invalid meeting date format. Please use DD-MM-YYYY, YYYY-MM-DD, or DD/MM/YYYY format'
        });
      }
      
      // Insert into user_investors_unlocked table
      const insertResult = await query(`
        INSERT INTO user_investors_unlocked 
        (user_id, investor_id, meeting_id, meeting_date, meeting_time, request_status, meeting_location, meeting_url, status, created_dts) 
        VALUES (?, ?, ?, ?, ?, 'Pending', '', '', 1, NOW())
      `, [decodedUserId, investorId, meetingId, formattedMeetingDate, meeting_time]);

      if (insertResult.insertId && insertResult.insertId > 0) {
        return res.json({
          status: true,
          rcode: 200,
          user_id: user_id,
          unique_token: token,
          message: 'Request sent successfully'
        });
      } else {
        return res.json({
          status: false,
          rcode: 500,
          message: 'Please try again'
        });
      }
      
    } catch (error) {
      console.error('investorUnlock error:', error);
      return res.json({
        status: false,
        rcode: 500,
        message: 'Internal server error'
      });
    }
  }
};

module.exports = ApiController;
