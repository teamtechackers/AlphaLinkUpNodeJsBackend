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
  async logout(req, res) {
    try {
      let { user_id, token } = {
        ...req.query,
        ...req.body
      };
      
      if (user_id && typeof user_id === 'string') {
        user_id = decodeURIComponent(user_id);
      }
      
      console.log('logout - Parameters:', { user_id, token });
      console.log('logout - Raw body:', req.body);
      console.log('logout - Raw query:', req.query);
      
      if (!user_id || !token || user_id === 'null' || token === 'null') {
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

      await query(
        'UPDATE users SET logged_out_dts = NOW() WHERE user_id = ?',
        [decodedUserId]
      );

      return res.json({
        status: true,
        rcode: 200,
        user_id: "",
        unique_token: "",
        message: 'User logged out successfully'
      });
      
    } catch (error) {
      console.error('logout error:', error);
      return fail(res, 500, 'Failed to logout');
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
      
      const servicesRows = await query(
        `SELECT usps.*, 
                f.name as service_name
         FROM user_service_provider_services usps
         JOIN folders f ON f.id = usps.service_id
         WHERE usps.sp_id = ?
         ORDER BY usps.created_dts DESC`,
        [provider.sp_id]
      );
      
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
      
      const serviceProviderResult = await query(
        `INSERT INTO user_service_provider (user_id, country_id, state_id, city_id, description, status, deleted, created_dts) 
         VALUES (?, ?, ?, ?, ?, 1, 0, NOW())`,
        [decodedUserId, country_id, state_id, city_id, description || '']
      );
      
      const sp_id = serviceProviderResult.insertId;
      
      if (sp_id > 0) {
        const serviceIdsArray = service_ids.split(',');
        
        if (serviceIdsArray.length > 0) {
          const placeholders = serviceIdsArray.map(() => '?').join(',');
          const foldersList = await query(
            `SELECT id, name FROM folders WHERE id IN (${placeholders})`,
            serviceIdsArray
          );
          
          const servicesMap = {};
          if (foldersList && foldersList.length > 0) {
            foldersList.forEach(row => {
              servicesMap[row.id] = row.name;
            });
          }
          
          for (const serviceId of serviceIdsArray) {
            await query(
              `INSERT INTO user_service_provider_services (sp_id, service_id, service_name, company_name, tag_line, title, service_description, status, created_dts) 
               VALUES (?, ?, ?, '', '', '', '', 0, NOW())`,
              [sp_id, serviceId, servicesMap[serviceId] || '']
            );
          }
        }
        
        await query(
          'UPDATE users SET is_service_provider = 1 WHERE user_id = ?',
          [decodedUserId]
        );
        
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
      
      if (!user_id || !token) {
        return fail(res, 500, 'user_id and token are required');
      }
      
      if (!sp_id || sp_id <= 0 || !service_id || service_id <= 0 || (rating <= 0 && (!review || review === ""))) {
        return fail(res, 500, 'Please enter mandatory fields');
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
      
      await query(
        `UPDATE user_services_unlocked 
         SET rating = ?, review = ?, review_dts = NOW() 
         WHERE user_id = ? AND sp_id = ? AND service_id = ?`,
        [rating || 0, review || '', decodedUserId, sp_id, service_id]
      );
      
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
      
      if (!user_id || !token) {
        return fail(res, 500, 'user_id and token are required');
      }
      
      if (!usps_id || usps_id <= 0 || !company_name || company_name === "" || !service_description || service_description === "" || !tag_line || tag_line === "" || !title || title === "") {
        return fail(res, 500, 'Please enter mandatory fields');
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
      
      const updateData = {
        company_name: company_name,
        tag_line: tag_line,
        title: title,
        service_description: service_description,
        status: 1
      };
      
      if (req.files && req.files.service_image && req.files.service_image.length > 0) {
        const file = req.files.service_image[0];
        updateData.service_image = file.filename;
      }
      
      const updateFields = Object.keys(updateData).map(key => `${key} = ?`).join(', ');
      const updateValues = Object.values(updateData);
      
      await query(
        `UPDATE user_service_provider_services SET ${updateFields} WHERE usps_id = ?`,
        [...updateValues, usps_id]
      );
      
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
      
      const promotionsList = [];
      
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



  async saveContact(req, res) {
    try {
      const { user_id, token, contact_user_id, user_folder_id, user_sub_folder_id } = {
        ...req.query,
        ...req.body
      };
      
      console.log('saveContact - Parameters:', { user_id, token, contact_user_id, user_folder_id, user_sub_folder_id });
      
      if (!user_id || !token) {
        return fail(res, 500, 'user_id and token are required');
      }
      
      if (!user_folder_id || user_folder_id <= 0 || !contact_user_id || contact_user_id <= 0) {
        return fail(res, 500, 'Please enter mandatory fields');
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

      const existingContact = await query(
        'SELECT * FROM user_contacts WHERE user_folder_id = ? AND user_sub_folder_id = ? AND contact_user_id = ? AND status = 1',
        [user_folder_id, user_sub_folder_id, contact_user_id]
      );

      if (existingContact.length > 0) {
        return fail(res, 500, 'Contact already exists');
      }

      const result = await query(
        `INSERT INTO user_contacts (user_id, user_folder_id, user_sub_folder_id, contact_user_id, status, created_dts) 
         VALUES (?, ?, ?, ?, 1, NOW())`,
        [decodedUserId, user_folder_id, user_sub_folder_id, contact_user_id]
      );

      const uc_id = result.insertId;

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
      const { user_id, token, user_folder_id, user_sub_folder_id } = {
        ...req.query,
        ...req.body
      };
      
      console.log('saveContactVisitingCard - Parameters:', { user_id, token, user_folder_id, user_sub_folder_id });
      console.log('saveContactVisitingCard - Files:', req.files);
      
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

      const frontFile = req.files.visiting_card_front[0];
      const backFile = req.files.visiting_card_back[0];
      const frontFileName = frontFile.filename;
      const backFileName = backFile.filename;

      const result = await query(
        `INSERT INTO user_contacts_visiting_cards (user_id, user_folder_id, user_sub_folder_id, visiting_card_front, visiting_card_back, status, created_dts) 
         VALUES (?, ?, ?, ?, ?, 1, NOW())`,
        [decodedUserId, user_folder_id, user_sub_folder_id, frontFileName, backFileName]
      );

      const ucvc_id = result.insertId;

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
      const { user_id, token, business_name, name, business_location, country_id, state_id, city_id, description } = {
        ...req.query,
        ...req.body
      };
      
      console.log('activateCard - Parameters:', { user_id, token, business_name, name, business_location, country_id, state_id, city_id, description });
      console.log('activateCard - Files:', req.files);
      
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

      const cardResult = await query(
        `INSERT INTO user_business_cards (user_id, business_name, name, business_location, country_id, state_id, city_id, description, status, deleted, created_dts) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, 0, NOW())`,
        [decodedUserId, business_name, name, business_location, country_id, state_id, city_id, description || '']
      );

      const ubc_id = cardResult.insertId;

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

      await query(
        'UPDATE users SET card_requested = 1 WHERE user_id = ?',
        [decodedUserId]
      );

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

  async saveProjectDetails(req, res) {
    try {
      const { user_id, token, project_detail_id, project_name, description, project_url, start_month, start_year, closed_month, closed_year } = req.body;
      
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

      if (!project_name || !description || !start_month || !start_year || !closed_month || !closed_year) {
        return fail(res, 500, 'Please enter mandatory fields');
      }

      let finalProjectDetailId = project_detail_id || 0;

      let projectLogo = null;
      if (req.file && req.file.filename) {
        projectLogo = req.file.filename;
      }

      if (finalProjectDetailId == 0) {
        const result = await query(
          `INSERT INTO user_project_details (user_id, project_name, description, project_url, start_month, start_year, closed_month, closed_year, project_logo) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [decodedUserId, project_name, description, project_url || '', start_month, start_year, closed_month, closed_year, projectLogo]
        );
        finalProjectDetailId = result.insertId;
    } else {
        const updateFields = ['project_name = ?', 'description = ?', 'project_url = ?', 'start_month = ?', 'start_year = ?', 'closed_month = ?', 'closed_year = ?'];
        const updateValues = [project_name, description, project_url || '', start_month, start_year, closed_month, closed_year];
        
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

  async getServiceDetail(req, res) {
    try {
      const { user_id, token, usps_id } = {
        ...req.query,
        ...req.body
      };
      
      console.log('getServiceDetail - Parameters:', { user_id, token, usps_id });
      
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
            WHEN u.profile_photo != '' THEN CONCAT('${process.env.BASE_URL || req.protocol + '://' + req.get('host')}/uploads/profiles/', u.profile_photo)
            ELSE ''
          END AS profile_photo,
          CASE 
            WHEN usps.service_image != '' THEN CONCAT('${process.env.BASE_URL || req.protocol + '://' + req.get('host')}/uploads/services/', usps.service_image)
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

      const serviceUnlocked = await query(
        'SELECT * FROM user_services_unlocked WHERE sp_id = ? AND service_id = ? AND user_id = ?',
        [sp_id, service_id, decodedUserId]
      );

      const ratingsData = await query(`
        SELECT rating, COUNT(*) as count
        FROM user_services_unlocked
        WHERE sp_id = ? AND service_id = ? AND rating > 0
        GROUP BY rating
      `, [sp_id, service_id]);

      const ratings = {
        '1_star': 0,
        '2_star': 0,
        '3_star': 0,
        '4_star': 0,
        '5_star': 0,
        'total_ratings': 0,
        'total_reviews': 0
      };

      if (ratingsData && ratingsData.length > 0) {
        ratingsData.forEach(row => {
          const rating = row.rating;
          const count = parseInt(row.count);
          ratings[`${rating}_star`] = count;
          ratings.total_ratings += count;
        });
      }

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
      const { user_id, token, service_id } = {
        ...req.query,
        ...req.body
      };
      
      console.log('getAllServicesList - Parameters:', { user_id, token, service_id });
      
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

      const servicesList = await query(`
        SELECT 
          usps.*,
          countries.name AS country,
          states.name AS state,
          cities.name AS city,
          CASE 
            WHEN usps.service_image != '' THEN CONCAT('${process.env.BASE_URL || req.protocol + '://' + req.get('host')}/uploads/services/', usps.service_image)
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
      const { user_id, token, sp_id, service_id } = {
        ...req.query,
        ...req.body
      };
      
      console.log('serviceUnlock - Parameters:', { user_id, token, sp_id, service_id });
      
      if (!user_id || !token) {
        return fail(res, 500, 'user_id and token are required');
      }
      
      if (!sp_id || sp_id <= 0 || !service_id || service_id <= 0) {
        return fail(res, 500, 'Please enter mandatory fields');
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
      const { user_id, token, filter_date } = {
        ...req.query,
        ...req.body
      };
      
      console.log('getAllServiceUnlockList - Parameters:', { user_id, token, filter_date });
      
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
            WHEN u.profile_photo != '' THEN CONCAT('${process.env.BASE_URL || req.protocol + '://' + req.get('host')}/uploads/profiles/', u.profile_photo)
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
      
      if (filter_date && filter_date !== '') {
        queryString += ` AND DATE(usp.created_dts) = ?`;
        queryParams.push(filter_date);
      }
      
      queryString += ` GROUP BY usul.sp_id`;
      
      const serviceUnlockedDetails = await query(queryString, queryParams);

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
      const { user_id, token, name, country_id, state_id, city_id, fund_size_id, bio, linkedin_url } = {
        ...req.query,
        ...req.body
      };
      
      console.log('saveInvestor - Parameters:', { user_id, token, name, country_id, state_id, city_id, fund_size_id, bio, linkedin_url });
      
      if (!user_id || !token) {
        return fail(res, 500, 'user_id and token are required');
      }
      
      if (name === "" || country_id <= 0 || state_id <= 0 || city_id <= 0 || fund_size_id <= 0 || bio === "") {
        return fail(res, 500, 'Please enter mandatory fields');
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

      const existingInvestor = await query(
        'SELECT * FROM user_investor WHERE user_id = ?',
        [decodedUserId]
      );

      if (existingInvestor && existingInvestor.length > 0) {
        return fail(res, 500, 'User is already registered as an investor');
      }

      let imageFileName = '';
      if (req.file) {
        imageFileName = req.file.filename;
        console.log('Image uploaded:', imageFileName);
      }

      const investorResult = await query(
        `INSERT INTO user_investor (user_id, country_id, name, state_id, city_id, fund_size_id, bio, linkedin_url, image, status, created_dts, deleted) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, NOW(), 0)`,
        [decodedUserId, country_id, name, state_id, city_id, fund_size_id, bio, linkedin_url || '', imageFileName]
      );

      const investor_id = investorResult.insertId;

      if (investor_id > 0) {
        const reference_no = `INV-ALPHA-${investor_id.toString().padStart(3, '0')}`;
        await query(
          'UPDATE user_investor SET reference_no = ? WHERE investor_id = ?',
          [reference_no, investor_id]
        );

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
      const { user_id, token } = {
        ...req.query,
        ...req.body
      };
      
      console.log('getAllInvestorsList - Parameters:', { user_id, token });
      
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

      const investorsList = await query(`
        SELECT 
          ui.*,
          countries.name AS country,
          states.name AS state,
          cities.name AS city,
          fs.investment_range,
          CASE 
            WHEN ui.image != '' THEN CONCAT('${process.env.BASE_URL || req.protocol + '://' + req.get('host')}/uploads/investors/', ui.image)
            ELSE ''
          END AS image
       FROM user_investor ui
       JOIN countries ON countries.id = ui.country_id
       JOIN states ON states.id = ui.state_id
       JOIN cities ON cities.id = ui.city_id
       JOIN fund_size fs ON fs.id = ui.fund_size_id
        WHERE ui.user_id != ? AND ui.status = 1 AND ui.approval_status = 2
      `, [decodedUserId]);

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
      const { user_id, token, investor_id } = {
        ...req.query,
        ...req.body
      };
      
      console.log('getInvestorDetail - Parameters:', { user_id, token, investor_id });
      
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
      
      // Validate token
      if (user.unique_token !== token) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'Token Mismatch Exception'
        });
      }

      const investorDetail = await query(`
        SELECT 
          ui.*,
          countries.name AS country,
          states.name AS state,
          cities.name AS city,
          fs.investment_range,
          CASE 
            WHEN ui.image != '' THEN CONCAT('${process.env.BASE_URL || req.protocol + '://' + req.get('host')}/uploads/investors/', ui.image)
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

      investorDetail[0].no_of_meetings = 0;
      investorDetail[0].no_of_investments = 0;

      let meetingsTypeList = [];
      try {
        meetingsTypeList = await query('SELECT * FROM meetings_type WHERE status = 1');
      } catch (error) {
        console.log('meetings_type table not found, using empty array');
        meetingsTypeList = [];
      }

      const investorUnlocked = await query(`
        SELECT * FROM user_investors_unlocked 
        WHERE investor_id = ? AND user_id = ?
      `, [investor_id, decodedUserId]);

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

      const formattedMeetingType = (meetingsTypeList || []).map(meeting => ({
        meeting_id: (meeting.id || 0).toString(),
        name: meeting.name || "",
        mins: (meeting.mins || 0).toString(),
        amount: (meeting.amount || 0).toString(),
        type: meeting.type || ""
      }));

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
      const { user_id, token, investor_id, meeting_id, meeting_date, meeting_time } = {
        ...req.query,
        ...req.body
      };
      
      console.log('investorUnlock - Parameters:', { user_id, token, investor_id, meeting_id, meeting_date, meeting_time });
      
      if (!user_id || !token) {
        return fail(res, 500, 'user_id and token are required');
      }
      
      if (!investor_id || investor_id === "" || !meeting_date || meeting_date === "" || !meeting_time || meeting_time === "") {
        return fail(res, 500, 'Please enter mandatory fields');
      }
      
      const decodedUserId = idDecode(user_id);
      if (!decodedUserId) {
        return fail(res, 500, 'Invalid user ID');
      }
      
      const investorId = parseInt(investor_id);
      if (isNaN(investorId) || investorId <= 0) {
        return fail(res, 500, 'Invalid investor_id');
      }
      
      const userRows = await query('SELECT * FROM users WHERE user_id = ? LIMIT 1', [decodedUserId]);
      if (!userRows.length) {
        return fail(res, 500, 'Not A Valid User');
      }
      
      const user = userRows[0];
      
      if (user.unique_token !== token) {
        return fail(res, 500, 'Token Mismatch Exception');
      }

      const formattedMeetingDate = new Date(meeting_date).toISOString().split('T')[0];

      let insertQuery, insertParams;
      
      if (meeting_id && meeting_id !== "") {
        insertQuery = `INSERT INTO user_investors_unlocked (user_id, investor_id, meeting_id, meeting_date, meeting_time, meeting_location, meeting_url, created_dts) 
                      VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`;
        insertParams = [decodedUserId, investorId, meeting_id, formattedMeetingDate, meeting_time, '', ''];
      } else {
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
      const investorId = parseInt(investor_id);
      if (isNaN(investorId) || investorId <= 0) {
        return fail(res, 500, 'Invalid investor_id');
      }
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
      const updateResult = await query(
        `UPDATE user_investors_unlocked 
         SET rating = ?, review = ?, review_dts = NOW()
         WHERE user_id = ? AND investor_id = ? AND iu_id = ?`,
        [rating || null, review || '', decodedUserId, investorId, iuId]
      );
      if (updateResult.affectedRows > 0) {
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
      `, [`${process.env.BASE_URL || req.protocol + '://' + req.get('host')}/uploads/investors/`, decodedUserId]);
      let investor_id = 0;
      if (investorProfileData && investorProfileData.length > 0) {
        investor_id = investorProfileData[0].investor_id;
        investorProfileData[0].no_of_meetings = 0;
        investorProfileData[0].no_of_investments = 0;
      }
      const investorUnlockedData = await query(
        'SELECT * FROM user_investors_unlocked WHERE investor_id = ? AND user_id = ?',
        [investor_id, decodedUserId]
      );
      
      const ratingsStats = {
        '1_star': 0,
        '2_star': 0,
        '3_star': 0,
        '4_star': 0,
        '5_star': 0,
        'total_ratings': 0,
        'total_reviews': 0
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
          const count = row.count;
          if (rating >= 1 && rating <= 5) {
            ratingsStats[`${rating}_star`] = count;
            ratingsStats.total_ratings += count;
          }
        });
      }
      
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
      const queryParams = [`${process.env.BASE_URL || req.protocol + '://' + req.get('host')}/uploads/profiles/`, decodedUserId];
      if (filter_type === 'ready') {
        baseQuery += ' AND uiu.request_status = "Ready"';
      } else if (filter_type === 'scheduled') {
        baseQuery += ' AND uiu.request_status = "Scheduled"';
      } else if (filter_type === 'completed') {
        baseQuery += ' AND uiu.request_status IN ("Completed", "Missed")';
      }
      baseQuery += ' ORDER BY uiu.created_dts DESC';
      const userLists = await query(baseQuery, queryParams);
      
      const formattedUserLists = userLists.map(user => ({
        user_id: user.user_id.toString(),
        investor_id: user.investor_id.toString(),
        user_name: user.user_name || "",
        meeting_date: user.meeting_date || "",
        meeting_time: user.meeting_time || "",
        request_status: user.request_status || "",
        meeting_location: user.meeting_location || "",
        meeting_lat: user.meeting_lat || "",
        meeting_lng: user.meeting_lng || "",
        meeting_url: user.meeting_url || "",
        meeting_name: user.meeting_name || "",
        meeting_type: user.meeting_type || "",
        mins: user.mins || "",
        profile_photo: user.profile_photo || ""
      }));
      
      return res.json({
        status: true,
        rcode: 200,
        user_id: idEncode(decodedUserId),
        unique_token: token,
        user_lists: formattedUserLists
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
            WHEN ui.image != '' THEN CONCAT('${process.env.BASE_URL || req.protocol + '://' + req.get('host')}/uploads/investors/thumbs/', ui.image)
            ELSE ''
          END AS image,
          countries.name AS country,
          states.name AS state,
          cities.name AS city,
          COALESCE(mt.name, '') AS meeting_name,
          COALESCE(mt.type, '') AS meeting_type,
          COALESCE(mt.mins, '') AS mins
        FROM user_investors_unlocked uiul
        JOIN user_investor ui ON ui.investor_id = uiul.investor_id
        LEFT JOIN meetings_type mt ON mt.id = uiul.meeting_id
        LEFT JOIN countries ON countries.id = ui.country_id
        LEFT JOIN states ON states.id = ui.state_id
        LEFT JOIN cities ON cities.id = ui.city_id
        WHERE uiul.user_id = ?
      `;
      const queryParams = [decodedUserId];
      
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
      
      const formattedInvestorMeets = (investorMeets || []).map(meet => {
        let formattedDate = "";
        if (meet.meeting_date) {
          const date = new Date(meet.meeting_date);
          const day = String(date.getDate()).padStart(2, '0');
          const month = String(date.getMonth() + 1).padStart(2, '0');
          const year = date.getFullYear();
          formattedDate = `${day}-${month}-${year}`;
        }
        
        return {
          iu_id: String(meet.iu_id || 0),
          user_id: String(meet.user_id || 0),
          investor_id: String(meet.investor_id || 0),
          investor_name: meet.investor_name || "",
          meeting_date: formattedDate,
          meeting_time: meet.meeting_time || "",
          request_status: meet.request_status || "",
          meeting_location: meet.meeting_location || "",
          meeting_lat: meet.meeting_lat ? String(meet.meeting_lat) : "",
          meeting_lng: meet.meeting_lng ? String(meet.meeting_lng) : "",
          meeting_url: meet.meeting_url || "",
          meeting_name: meet.meeting_name || "",
          meeting_type: meet.meeting_type || "",
          mins: meet.mins ? String(meet.mins) : "",
          image: meet.image || "",
          review_status: meet.review ? "1" : "0"
        };
      });
      
      return res.json({
        status: true,
        rcode: 200,
        user_id: user_id,
        unique_token: token,
        investor_lists: formattedInvestorMeets
      });
      
    } catch (error) {
      console.error('getInvestorMeets error:', error);
      return fail(res, 500, 'Failed to get investor meets');
    }
  },

  // New API to check online users and active chat sessions
  async getOnlineUsersStatus(req, res) {
    try {
      const { user_id, token } = {
        ...req.query,
        ...req.body
      };
      
      console.log('getOnlineUsersStatus - Parameters:', { user_id, token });
      
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

      // Get WebSocket service instance
      const websocketService = require('../services/websocketService');
      
      // Get connected users
      const connectedUsers = Array.from(websocketService.connectedUsers.keys());
      const activeChatSessions = Array.from(websocketService.activeChatSessions.entries());
      const userLastActivity = Array.from(websocketService.userLastActivity.entries());
      
      // Get user names for connected users
      const userNames = {};
      for (const userId of connectedUsers) {
        const userData = await query('SELECT full_name, mobile FROM users WHERE user_id = ?', [userId]);
        if (userData.length > 0) {
          userNames[userId] = userData[0].full_name || userData[0].mobile || `User_${userId}`;
        }
      }
      
      return res.json({
        status: true,
        rcode: 200,
        message: 'Online users status fetched successfully',
        unique_token: token,
        data: {
          total_connected_users: connectedUsers.length,
          connected_users: connectedUsers.map(userId => ({
            user_id: userId,
            user_name: userNames[userId] || `User_${userId}`,
            last_activity: userLastActivity.find(([id]) => id === userId)?.[1] || null,
            is_online: true
          })),
          active_chat_sessions: activeChatSessions.map(([sessionKey, sessionData]) => ({
            session_key: sessionKey,
            participants: sessionKey.split('_'),
            is_active: sessionData.isActive,
            last_activity: sessionData.lastActivity,
            created_at: sessionData.createdAt
          })),
          total_active_sessions: activeChatSessions.length
        }
      });
      
    } catch (error) {
      console.error('getOnlineUsersStatus error:', error);
      return fail(res, 500, 'Failed to get online users status');
    }
  },

  async getChatUsersList(req, res) {
    try {
      const { user_id, token } = {
        ...req.query,
        ...req.body
      };
      
      console.log('getChatUsersList - Parameters:', { user_id, token });
      
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

      const baseUrl = process.env.BASE_URL || `${req.protocol}://${req.get('host')}`;
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
      const { user_id, token, current_user_id } = {
        ...req.query,
        ...req.body
      };
      
      console.log('getChat - Parameters:', { user_id, token, current_user_id });
      
      if (!user_id || !token) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'user_id and token are required'
        });
      }
      
      if (!current_user_id || current_user_id === "") {
        return res.json({
          status: false,
          rcode: 500,
          message: 'current_user_id is required'
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
      
 
      const currentUserId = parseInt(current_user_id);
      if (isNaN(currentUserId) || currentUserId <= 0) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'Invalid current_user_id'
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

      const baseUrl = process.env.BASE_URL || `${req.protocol}://${req.get('host')}`;
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

      const formattedChatDetails = (chatDetails || []).map(chat => ({
        chat_id: (chat.id || chat.chat_id || 0).toString(),
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
    console.log('🚀 saveChat function called');
    try {
      const { user_id, token, sender_id, receiver_id, message } = {
        ...req.query,
        ...req.body
      };
      
      console.log('💬 saveChat - Parameters:', { user_id, token, sender_id, receiver_id, message });
      console.log('💬 saveChat - Request body:', req.body);
      console.log('💬 saveChat - Request query:', req.query);
      console.log('💬 saveChat - User Agent:', req.get('User-Agent'));
      console.log('💬 saveChat - Content-Type:', req.get('Content-Type'));
      console.log('💬 saveChat - Headers:', req.headers);
      console.log('💬 saveChat - IP Address:', req.ip);
      console.log('💬 saveChat - Request Method:', req.method);
      console.log('💬 saveChat - Request URL:', req.url);
      
      if (!user_id || !token) {
        return fail(res, 500, 'user_id and token are required');
      }
      
      if (!sender_id || sender_id <= 0 || !receiver_id || receiver_id <= 0 || !message || message === "") {
        return fail(res, 500, 'Please enter mandatory fields');
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

      const senderId = parseInt(sender_id);
      const receiverId = parseInt(receiver_id);
      
      if (isNaN(senderId) || senderId <= 0 || isNaN(receiverId) || receiverId <= 0) {
        return fail(res, 500, 'Invalid sender_id or receiver_id');
      }

      const chatResult = await query(
        'INSERT INTO user_chats (sender_id, receiver_id, message, created_dts) VALUES (?, ?, ?, NOW())',
        [senderId, receiverId, message]
      );

      console.log(`💾 Chat insert result:`, chatResult);
      console.log(`💾 Chat insertId:`, chatResult.insertId);
      console.log(`💾 Chat insertId type:`, typeof chatResult.insertId);
      console.log(`💾 Chat insertId > 0:`, chatResult.insertId > 0);

      if (chatResult.insertId > 0) {
        console.log(`✅ Chat insert successful, proceeding with WebSocket check`);
        const senderRows = await query('SELECT full_name, profile_photo FROM users WHERE user_id = ?', [senderId]);
        const sender = senderRows[0] || {};

        const messageData = {
          chat_id: chatResult.insertId,
          sender_id: senderId,
          receiver_id: receiverId,
          message: message,
          sender_name: sender.full_name || '',
          sender_image: sender.profile_photo ? `${process.env.BASE_URL || 'http://localhost:3000'}/uploads/profiles/${sender.profile_photo}` : '',
          created_dts: new Date().toISOString(),
          timestamp: Date.now()
        };

        const websocketService = require('../services/websocketService');
        console.log(`🔌 WebSocket service loaded:`, websocketService);
        console.log(`🔌 WebSocket service io:`, websocketService.io);
        console.log(`🔌 Connected users map:`, websocketService.connectedUsers);
        console.log(`🔌 WebSocket service methods:`, Object.getOwnPropertyNames(Object.getPrototypeOf(websocketService)));
        
        console.log(`🔌 Total Connected Users: ${websocketService.connectedUsers.size}`);
        console.log(`🔌 Connected Users List:`, Array.from(websocketService.connectedUsers.keys()));
        console.log(`🔌 User Sockets List:`, Array.from(websocketService.userSockets.keys()));
        console.log(`🔌 Total Socket Connections: ${websocketService.io ? websocketService.io.sockets.sockets.size : 'WebSocket not initialized'}`);
        
        // Check if WebSocket service is initialized
        if (!websocketService.io) {
          console.log(`❌ WebSocket service not initialized, sending FCM notification only`);
          // Send FCM notification only
          try {
            const NotificationService = require('../notification/NotificationService');
            
            const receiverRows = await query('SELECT fcm_token, full_name FROM users WHERE user_id = ?', [receiverId]);
            const receiver = receiverRows[0] || {};
            
            if (receiver.fcm_token) {
              const notificationData = {
                title: `New message from ${sender.full_name || 'Someone'}`,
                body: message,
                data: {
                  type: 'chat_message',
                  sender_id: senderId.toString(),
                  receiver_id: receiverId.toString(),
                  chat_id: chatResult.insertId.toString(),
                  sender_name: sender.full_name || '',
                  message: message
                }
              };
              
              await NotificationService.sendNotification(receiverId, notificationData.title, notificationData.body, notificationData.data);
              console.log(`📱 FCM notification sent to receiver ${receiverId} (WebSocket not initialized)`);
            } else {
              console.log(`❌ No FCM token found for receiver ${receiverId}`);
            }
          } catch (notificationError) {
            console.error('Error sending FCM notification to receiver:', notificationError);
          }
          
          return res.json({
            status: true,
            rcode: 200,
            user_id: idEncode(decodedUserId),
            unique_token: token,
            message: 'Message sent successfully.',
            chat_id: chatResult.insertId
          });
        }
        
        // Check if receiver is connected via WebSocket
        const isReceiverConnected = websocketService.connectedUsers.has(String(receiverId));
        console.log(`🔌 Receiver ${receiverId} WebSocket connection status: ${isReceiverConnected ? 'CONNECTED' : 'DISCONNECTED'}`);
        console.log(`🔌 Looking for receiver ID: "${receiverId}" (type: ${typeof receiverId})`);
        console.log(`🔌 Available connected users:`, Array.from(websocketService.connectedUsers.keys()));
        console.log(`🔌 Available user sockets:`, Array.from(websocketService.userSockets.entries()));
        
        // Check if receiver is in active chat session with sender
        const isInActiveChat = websocketService.isInActiveChatSession(receiverId, senderId);
        console.log(`💬 Active chat session between ${senderId} and ${receiverId}: ${isInActiveChat}`);
        
        let messageSent = false;
        if (isReceiverConnected) {
          try {
            if (isInActiveChat) {
              // Both users are in active chat - send message without notification
              const messageDataWithFlags = {
                ...messageData,
                show_notification: false,
                is_active_chat: true
              };
              console.log(`🔌 Sending message to user ${receiverId} (active chat - no notification)`);
              messageSent = websocketService.sendMessageToUser(String(receiverId), messageDataWithFlags);
              console.log(`💬 Message sent via WebSocket (active chat - no notification): ${messageSent}`);
            } else {
              // Receiver not in active chat - send with notification
              const messageDataWithFlags = {
                ...messageData,
                show_notification: true,
                is_active_chat: false
              };
              console.log(`🔌 Sending message to user ${receiverId} (with notification)`);
              messageSent = websocketService.sendMessageToUser(String(receiverId), messageDataWithFlags);
              console.log(`💬 Message sent via WebSocket (with notification): ${messageSent}`);
            }
          } catch (wsError) {
            console.log(`❌ WebSocket send error:`, wsError.message);
            messageSent = false;
          }
        } else {
          console.log(`❌ Receiver ${receiverId} is not connected via WebSocket`);
        }
        
        if (!messageSent && !isInActiveChat) {
          try {
            const NotificationService = require('../notification/NotificationService');
            
            const receiverRows = await query('SELECT fcm_token, full_name FROM users WHERE user_id = ?', [receiverId]);
            const receiver = receiverRows[0] || {};
            
            if (receiver.fcm_token) {
              const notificationData = {
                title: `New message from ${sender.full_name || 'Someone'}`,
                body: message,
                data: {
                  type: 'chat_message',
                  sender_id: senderId.toString(),
                  receiver_id: receiverId.toString(),
                  chat_id: chatResult.insertId.toString(),
                  sender_name: sender.full_name || '',
                  message: message
                }
              };
              
              await NotificationService.sendNotification(receiverId, notificationData.title, notificationData.body, notificationData.data);
              console.log(`📱 FCM notification sent to receiver ${receiverId} (not connected via WebSocket)`);
            } else {
              console.log(`❌ No FCM token found for receiver ${receiverId}`);
            }
          } catch (notificationError) {
            console.error('Error sending FCM notification to receiver:', notificationError);
          }
        } else if (messageSent) {
          console.log(`🔌 Receiver ${receiverId} is connected via WebSocket - message sent via WebSocket`);
        } else if (isInActiveChat) {
          console.log(`💬 Both users in active chat session - no FCM notification sent`);
        }

        return res.json({
          status: true,
          rcode: 200,
          user_id: idEncode(decodedUserId),
          unique_token: token,
          message: 'Message sent successfully.',
          chat_id: chatResult.insertId
        });
      } else {
        console.log(`❌ Chat insert failed - insertId: ${chatResult.insertId}`);
        return fail(res, 500, 'Failed to save chat message');
      }
      
    } catch (error) {
      console.error('saveChat error:', error);
      return fail(res, 500, 'Failed to save chat message');
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
      
      if (user.unique_token !== token) {
        return fail(res, 500, 'Token Mismatch Exception');
      }

      if (resume_id <= 0) {
        return fail(res, 500, 'Please enter mandatory fields');
      }

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

  async viewResumes(req, res) {
    try {
      const { user_id, token } = {
        ...req.query,
        ...req.body
      };
      
      console.log('viewResumes - Parameters:', { user_id, token });
      
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
      
      const baseUrl = `${req.protocol}://${req.get('host')}`;
      const resumePath = `${baseUrl}/uploads/resumes/`;
      
      const resumeRows = await query(
        `SELECT *, 
                IF(resume_file != '', CONCAT(?, resume_file), '') AS resume_file, 
                IF(resume_file != '', SUBSTRING_INDEX(resume_file, '.', -1), '') AS resume_file_extension
         FROM user_resumes 
         WHERE user_id = ? AND status = 1 
         ORDER BY created_dts DESC`,
        [resumePath, decodedUserId]
      );
      
      const formattedResumes = resumeRows.map(resume => ({
        resume_id: resume.resume_id.toString(),
        user_id: resume.user_id.toString(),
        resume_title: resume.resume_title || "",
        resume_file: resume.resume_file || "",
        status: resume.status.toString(),
        created_dts: resume.created_dts || "",
        resume_file_extension: resume.resume_file_extension || ""
      }));
      
      return res.json({
        status: true,
        rcode: 200,
        user_id: idEncode(decodedUserId),
        unique_token: token,
        resumes_list: formattedResumes
      });
      
    } catch (error) {
      console.error('viewResumes error:', error);
      return fail(res, 500, 'Failed to retrieve resumes');
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

      const baseUrl = process.env.BASE_URL || `${req.protocol}://${req.get('host')}`;
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

      const baseUrl = process.env.BASE_URL || `${req.protocol}://${req.get('host')}`;
      const projectLogoPath = `${baseUrl}/uploads/project_logo/`;
      
      const projectDetailsRows = await query(
        `SELECT user_project_details.*, 
                IF(project_logo != '', CONCAT(?, project_logo), '') AS project_logo
         FROM user_project_details 
         WHERE user_id = ? 
         ORDER BY project_detail_id`,
        [projectLogoPath, decodedUserId]
      );

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

      if (!project_detail_id || project_detail_id <= 0) {
        return fail(res, 500, 'Please enter mandatory fields');
      }

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

  async genericHandler(req, res) {
    const methodName = req.route.path.split('/').pop();
    return ok(res, { message: `${methodName} endpoint called successfully` });
  },

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

      const investorId = parseInt(investor_id);
      if (isNaN(investorId) || investorId <= 0) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'Invalid investor ID'
        });
      }

      const meetingId = parseInt(meeting_id);
      if (isNaN(meetingId) || meetingId <= 0) {
      return res.json({
          status: false,
          rcode: 500,
          message: 'Invalid meeting ID'
        });
      }

              let formattedMeetingDate;
        try {
          let dateObj;
        
        if (meeting_date.includes('-')) {
          const parts = meeting_date.split('-');
          if (parts.length === 3) {
            if (parts[0].length === 2 && parts[1].length === 2 && parts[2].length === 4) {
              dateObj = new Date(parts[2], parts[1] - 1, parts[0]);
            } else if (parts[0].length === 4 && parts[1].length === 2 && parts[2].length === 2) {
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
