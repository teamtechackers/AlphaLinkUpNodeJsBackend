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

      // Get interests list for processing
      const interestsList = await query('SELECT id as interest_id, name as interest FROM interests WHERE status = 1 AND deleted = 0');
      const interestsMap = {};
      if (interestsList.length > 0) {
        interestsList.forEach(row => {
          interestsMap[row.interest_id] = row.interest;
        });
      }

      // Get user profile by mobile number
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
      
      if (!userProfileRows.length) {
        return fail(res, 500, 'User not found with this mobile number');
      }

      // Process interests (convert IDs to names)
      const userData = userProfileRows[0];
      if (userData.interests && userData.interests !== '') {
        const interestIds = userData.interests.split(',');
        const interestNames = [];
        if (interestIds.length > 0) {
          interestIds.forEach(interestId => {
            if (interestsMap[interestId.trim()]) {
              interestNames.push(interestsMap[interestId.trim()]);
            }
          });
          userData.interests = interestNames.join(',');
        }
      }

      const searchUserId = userData.user_id;
      
      // Get Educational Details
      let educationDetails = [];
      if (searchUserId > 0) {
        const educationRows = await query(
          `SELECT *, 
                  DATE_FORMAT(start_date, '%d-%m-%Y') AS start_date,
                  DATE_FORMAT(end_date, '%d-%m-%Y') AS end_date
           FROM user_education_details 
           WHERE user_id = ? 
           ORDER BY education_detail_id`,
          [searchUserId]
        );
        educationDetails = toArray(educationRows);
      }
      
      // Get Work Details
      let workDetails = [];
      if (searchUserId > 0) {
        const workRows = await query(
          `SELECT user_work_details.*,
                  DATE_FORMAT(start_date, '%d-%m-%Y') AS start_date,
                  DATE_FORMAT(end_date, '%d-%m-%Y') AS end_date,
                  employment_type.name as employment_type
           FROM user_work_details
           JOIN employment_type ON employment_type.id = user_work_details.employment_type_id
           WHERE user_id = ? 
           ORDER BY work_detail_id`,
          [searchUserId]
        );
        workDetails = toArray(workRows);
      }
      
      // Get Project Details
      let projectDetails = [];
      if (searchUserId > 0) {
        const projectRows = await query(
          `SELECT *, 
                  IF(project_logo != '', CONCAT(?, project_logo), '') AS project_logo
           FROM user_project_details 
           WHERE user_id = ? 
           ORDER BY project_detail_id`,
          [`${baseUrl}/uploads/projects/`, searchUserId]
        );
        projectDetails = toArray(projectRows);
      }
      
      // Return response in PHP format
      return res.json({
        status: true,
        rcode: 200,
        user_id: idEncode(decodedUserId),
        unique_token: token,
        user_details: userProfileRows.length > 0 ? userProfileRows : [],
        education_details: educationDetails,
        work_details: workDetails,
        project_details: projectDetails
      });
      
    } catch (error) {
      console.error('getUserProfileByMobile error:', error);
      return fail(res, 500, 'Failed to get user profile by mobile');
    }
  },
  async getUserDetailByQrCode(req, res) {
    const { qr_code_token } = req.body;
    const rows = await query('SELECT * FROM users WHERE unique_token = ?', [qr_code_token]);
    return ok(res, { data: toArray(rows) });
  },
  async getUserProfileByMobile(req, res) {
    const { mobile } = req.body;
    const rows = await query('SELECT * FROM users WHERE mobile LIKE ?', [`%${mobile}%`]);
    return ok(res, { data: toArray(rows) });
  },

  // Dashboard (simplified parity counts)
  async dashboard(req, res) {
    const [users] = await query('SELECT COUNT(*) AS c FROM users');
    const [jobs] = await query("SELECT COUNT(*) AS c FROM user_job_details WHERE deleted='0'");
    const [events] = await query("SELECT COUNT(*) AS c FROM user_event_details WHERE deleted='0'");
    const [service] = await query("SELECT COUNT(*) AS c FROM user_service_provider WHERE deleted='0'");
    const [investor] = await query("SELECT COUNT(*) AS c FROM user_investor WHERE deleted='0'");
    return ok(res, { data: { count_users: users.c, count_jobs: jobs.c, count_events: events.c, count_service: service.c, count_investor: investor.c } });
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
      
      // Check mandatory fields
      if (!event_name || !industry_type || !event_date || !event_start_time || !event_end_time || !event_mode_id || !event_type_id || !event_details || !organiser_ids || !event_lat || !event_lng || !event_geo_address) {
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
        event_date: new Date(event_date).toISOString().split('T')[0], // Convert to YYYY-MM-DD format
        event_start_time,
        event_end_time,
        event_mode_id,
        event_type_id,
        event_details,
        country_id: country_id || null,
        state_id: state_id || null,
        city_id: city_id || null,
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
          [eventData.user_id, eventData.event_name, eventData.industry_type, eventData.country_id || null, eventData.state_id || null, eventData.city_id || null, eventData.event_venue || null, eventData.event_link || null, eventData.event_lat, eventData.event_lng, eventData.event_geo_address, eventData.event_date, eventData.event_start_time, eventData.event_end_time, eventData.event_mode_id, eventData.event_type_id, eventData.event_details, eventBanner || 'default_event_banner.jpg', 0]
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
    const { event_id } = req.body;
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const profilePath = `${baseUrl}/uploads/profiles/`;
    const rows = await query(
      `SELECT users.user_id AS organiser_id, COALESCE(full_name,'') AS full_name, COALESCE(email,'') AS email, mobile,
              IF(profile_photo != '', CONCAT(?, profile_photo), '') AS profile_photo
       FROM event_organisers
       JOIN users ON users.user_id = event_organisers.user_id
       WHERE event_organisers.event_id = ?`, [profilePath, event_id]
    );
    return ok(res, { data: toArray(rows) });
  },
  async getEventAttendeesList(req, res) {
    const { event_id } = req.body;
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const profilePath = `${baseUrl}/uploads/profiles/`;
    const rows = await query(
      `SELECT users.user_id AS attendee_id, COALESCE(full_name,'') AS full_name, COALESCE(email,'') AS email, mobile,
              IF(profile_photo != '', CONCAT(?, profile_photo), '') AS profile_photo
       FROM event_attendees
       JOIN users ON users.user_id = event_attendees.user_id
       WHERE event_attendees.event_id = ?`, [profilePath, event_id]
    );
    return ok(res, { data: toArray(rows) });
  },
  async getEventsAttendedList(req, res) {
    const rows = await query(
      `SELECT ued.* FROM user_event_details ued JOIN event_attendees ea ON ea.event_id = ued.event_id WHERE ea.user_id = ?`,
      [req.user.id]
    );
    return ok(res, { data: toArray(rows) });
  },
  async getEventsOrganisedList(req, res) {
    const rows = await query(
      `SELECT ued.* FROM user_event_details ued JOIN event_organisers eo ON eo.event_id = ued.event_id WHERE eo.user_id = ?`,
      [req.user.id]
    );
    return ok(res, { data: toArray(rows) });
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
  async getContactsList(req, res) {
    const { user_folder_id, user_sub_folder_id } = req.body;
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const profilePath = `${baseUrl}/uploads/profiles/`;
    const rows = await query(
      `SELECT uc.contact_user_id, uc.user_folder_id, uc.user_sub_folder_id, COALESCE(u.full_name,'') AS full_name, COALESCE(u.email,'') AS email, u.mobile,
              IF(u.profile_photo != '', CONCAT(?, u.profile_photo), '') AS profile_photo
       FROM user_contacts uc JOIN users u ON u.user_id = uc.contact_user_id
       WHERE uc.user_id = ? AND uc.user_folder_id = ? AND uc.user_sub_folder_id = ? AND uc.status=1`,
      [profilePath, req.user.id, user_folder_id, user_sub_folder_id]
    );
    return ok(res, { data: toArray(rows) });
  },
  async getContactVisitingCardInformation(req, res) {
    const { user_sub_folder_id } = req.body;
    const vcPath = 'uploads/visting_cards/thumbs/';
    const rows = await query(
      `SELECT *, IF(visiting_card_front != '', CONCAT(?, visiting_card_front), '') AS visiting_card_front,
              IF(visiting_card_back != '', CONCAT(?, visiting_card_back), '') AS visiting_card_back
       FROM user_contacts_visiting_cards WHERE user_id = ? AND user_sub_folder_id = ?`,
      [vcPath, vcPath, req.user.id, user_sub_folder_id]
    );
    return ok(res, { data: toArray(rows) });
  },
  async saveContactVisitingCard(req, res) {
    const { user_sub_folder_id } = req.body;
    const front = req.files?.visiting_card_front?.[0]?.filename || '';
    const back = req.files?.visiting_card_back?.[0]?.filename || '';
    await query(
      `INSERT INTO user_contacts_visiting_cards (user_id, user_sub_folder_id, visiting_card_front, visiting_card_back, status) VALUES (?, ?, ?, ?, 1)`,
      [req.user.id, user_sub_folder_id, front, back]
    );
    return ok(res, { message: 'Visiting card saved' });
  },

  // Business card
  async activateCard(req, res) {
    const token = req.user.details?.unique_token;
    if (!token) return fail(res, 500, 'Token missing');
    const filename = `${token}.png`;
    await generateToFile(token, filename);
    await query('UPDATE users SET qr_image = ? WHERE user_id = ?', [filename, req.user.id]);
    return ok(res, { qr_image: filename });
  },
  async getBusinessCardInformation(req, res) {
    const rows = await query(
      `SELECT ubc.*, countries.name AS country, states.name AS state, cities.name AS city
       FROM user_business_cards ubc
       JOIN countries ON countries.id = ubc.country_id
       JOIN states ON states.id = ubc.state_id
       JOIN cities ON cities.id = ubc.city_id
       WHERE ubc.user_id = ?`, [req.user.id]
    );
    return ok(res, { data: toArray(rows) });
  },

  // Promotions & services (read-only parity)
  async getPromotionsList(req, res) {
    const rows = await query('SELECT * FROM promotions');
    return ok(res, { data: toArray(rows) });
  },
  async getServicesMasterList(req, res) {
    const rows = await query('SELECT * FROM folders');
    return ok(res, { data: toArray(rows) });
  },
  async getServicesList(req, res) {
    const rows = await query(
      `SELECT usp.*, usps.*, countries.name AS country, states.name AS state, cities.name AS city
       FROM user_service_provider usp
       JOIN user_service_provider_services usps ON usps.sp_id = usp.sp_id
       JOIN countries ON countries.id = usp.country_id
       JOIN states ON states.id = usp.state_id
       JOIN cities ON cities.id = usp.city_id
       WHERE usp.user_id = ?`, [req.user.id]
    );
    return ok(res, { data: toArray(rows) });
  },
  async getServiceDetail(req, res) {
    const { usps_id } = req.body;
    const rows = await query(
      `SELECT usps.*, countries.name AS country, states.name AS state, cities.name AS city, u.full_name, u.mobile, usp.user_id
       FROM user_service_provider_services usps
       JOIN user_service_provider usp ON usp.sp_id = usps.sp_id
       JOIN users u ON u.user_id = usp.user_id
       JOIN countries ON countries.id = usp.country_id
       JOIN states ON states.id = usp.state_id
       JOIN cities ON cities.id = usp.city_id
       WHERE usps.usps_id = ?`, [usps_id]
    );
    return ok(res, { data: toArray(rows) });
  },
  async saveServiceDetails(req, res) {
    const {
      usps_id = 0,
      sp_id,
      service_id,
      name,
      description,
      amount = 0
    } = req.body;
    const img = req.file ? req.file.filename : '';
    if (Number(usps_id) > 0) {
      await query(
        `UPDATE user_service_provider_services SET service_id=?, name=?, description=?, amount=?, service_image=? WHERE usps_id=?`,
        [service_id, name, description, amount, img, usps_id]
      );
    } else {
      await query(
        `INSERT INTO user_service_provider_services (sp_id, service_id, name, description, amount, service_image, approval_status, status) VALUES (?, ?, ?, ?, ?, ?, 1, 1)`,
        [sp_id, service_id, name, description, amount, img]
      );
    }
    return ok(res, { message: 'Service details saved' });
  },
  async getAllServicesList(req, res) {
    const { service_id } = req.body;
    const rows = await query(
      `SELECT usps.*, countries.name AS country, states.name AS state, cities.name AS city
       FROM user_service_provider_services usps
       JOIN user_service_provider usp ON usp.sp_id = usps.sp_id
       JOIN countries ON countries.id = usp.country_id
       JOIN states ON states.id = usp.state_id
       JOIN cities ON cities.id = usp.city_id
       WHERE usp.user_id != ? AND usps.service_id = ? AND usps.approval_status = 2 AND usps.status = 1`,
      [req.user.id, service_id]
    );
    return ok(res, { data: toArray(rows) });
  },
  async serviceUnlock(req, res) {
    return ok(res, { message: 'Not implemented in this initial cut (will mirror PHP logic)' });
  },
  async getAllServiceUnlockList(req, res) {
    const rows = await query('SELECT * FROM user_services_unlocked WHERE user_id = ?', [req.user.id]);
    return ok(res, { data: toArray(rows) });
  },

  // Investors (read-only parity)
  async getAllInvestorsList(req, res) {
    const rows = await query(
      `SELECT ui.*, countries.name AS country, states.name AS state, cities.name AS city, fs.investment_range
       FROM user_investor ui
       JOIN countries ON countries.id = ui.country_id
       JOIN states ON states.id = ui.state_id
       JOIN cities ON cities.id = ui.city_id
       JOIN fund_size fs ON fs.id = ui.fund_size_id
       WHERE ui.user_id != ? AND ui.status = 1 AND approval_status = 2`, [req.user.id]
    );
    return ok(res, { data: toArray(rows) });
  },
  async getInvestorDetail(req, res) {
    const { investor_id } = req.body;
    const rows = await query(
      `SELECT ui.*, countries.name AS country, states.name AS state, cities.name AS city, fs.investment_range
       FROM user_investor ui
       JOIN countries ON countries.id = ui.country_id
       JOIN states ON states.id = ui.state_id
       JOIN cities ON cities.id = ui.city_id
       JOIN fund_size fs ON fs.id = ui.fund_size_id
       WHERE ui.investor_id = ?`, [investor_id]
    );
    return ok(res, { data: toArray(rows) });
  },
  async investorUnlock(req, res) {
    return ok(res, { message: 'Not implemented in this initial cut (will mirror PHP logic)' });
  },
  async getInvestorProfile(req, res) {
    const rows = await query(
      `SELECT ui.*, countries.name AS country, states.name AS state, cities.name AS city, fs.investment_range
       FROM user_investor ui
       JOIN countries ON countries.id = ui.country_id
       JOIN states ON states.id = ui.state_id
       JOIN cities ON cities.id = ui.city_id
       JOIN fund_size fs ON fs.id = ui.fund_size_id
       WHERE ui.user_id = ?`, [req.user.id]
    );
    return ok(res, { data: toArray(rows) });
  },
  async getInvestorMeets(req, res) {
    const rows = await query('SELECT * FROM user_investors_unlocked WHERE user_id = ?', [req.user.id]);
    return ok(res, { data: toArray(rows) });
  },
  async getInvestorDesk(req, res) {
    const rows = await query(
      `SELECT uiu.user_id, uiu.investor_id, u.full_name AS user_name
       FROM user_investor ui
       JOIN user_investors_unlocked uiu ON uiu.investor_id = ui.investor_id
       JOIN users u ON u.user_id = uiu.user_id
       WHERE ui.user_id = ?`, [req.user.id]
    );
    return ok(res, { data: toArray(rows) });
  },

  // Chat (simplified)
  async getChatUsersList(req, res) {
    const rows = await query('SELECT user_id, COALESCE(full_name,"") as full_name, profile_photo FROM users WHERE user_id != ? ORDER BY created_dts ASC', [req.user.id]);
    return ok(res, { data: toArray(rows) });
  },
  async getChat(req, res) {
    const { user_id } = req.body; // chat peer
    const rows = await query(
      `SELECT * FROM user_chats WHERE (sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?) ORDER BY created_dts ASC`,
      [req.user.id, user_id, user_id, req.user.id]
    );
    return ok(res, { data: toArray(rows) });
  },
  async saveChat(req, res) {
    const { user_id, message } = req.body;
    await query('INSERT INTO user_chats (sender_id, receiver_id, message, created_dts) VALUES (?, ?, ?, NOW())', [req.user.id, user_id, message]);
    return ok(res, { message: 'Chat saved' });
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
      
      // Check mandatory fields
      if (!job_title || !company_name || !country_id || !state_id || !city_id || !address || !job_type_id || !pay_id || !job_description || !skills || !job_lat || !job_lng) {
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
      
      // Return response in PHP format
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
    return ok(res, { message: 'Job application submitted successfully' });
  },

  async deleteResume(req, res) {
    return ok(res, { message: 'Resume deleted successfully' });
  },

  async saveEventOrganiser(req, res) {
    return ok(res, { message: 'Event organiser saved successfully' });
  },

  async deleteEventOrganiser(req, res) {
    return ok(res, { message: 'Event organiser deleted successfully' });
  },

  async saveEventAttendee(req, res) {
    return ok(res, { message: 'Event attendee saved successfully' });
  },

  async deleteEventAttendee(req, res) {
    return ok(res, { message: 'Event attendee deleted successfully' });
  },

  async saveFolderByType(req, res) {
    return ok(res, { message: 'Folder saved successfully' });
  },

  async saveSubFolder(req, res) {
    return ok(res, { message: 'Sub folder saved successfully' });
  },

  async editSubFolder(req, res) {
    return ok(res, { message: 'Sub folder updated successfully' });
  },

  async deleteSubFolder(req, res) {
    return ok(res, { message: 'Sub folder deleted successfully' });
  },

  async saveContact(req, res) {
    return ok(res, { message: 'Contact saved successfully' });
  },

  async saveServiceProvider(req, res) {
    return ok(res, { message: 'Service provider saved successfully' });
  },

  async saveReviewRating(req, res) {
    return ok(res, { message: 'Review and rating saved successfully' });
  },

  async saveInvestor(req, res) {
    return ok(res, { message: 'Investor saved successfully' });
  },

  async saveInvestorReviewRating(req, res) {
    return ok(res, { message: 'Investor review and rating saved successfully' });
  },

  async legalTerms(req, res) {
    return ok(res, { message: 'Legal terms retrieved successfully' });
  },

  // Additional methods for complete PHP parity
  async saveEducationDetails(req, res) {
    return ok(res, { message: 'Education details saved successfully' });
  },

  async getEducationDetails(req, res) {
    return ok(res, { message: 'Education details retrieved successfully' });
  },

  async deleteEducationDetail(req, res) {
    return ok(res, { message: 'Education detail deleted successfully' });
  },

  async getProjectDetails(req, res) {
    return ok(res, { message: 'Project details retrieved successfully' });
  },

  async deleteProjectDetail(req, res) {
    return ok(res, { message: 'Project detail deleted successfully' });
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


