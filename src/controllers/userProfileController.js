const { query } = require('../config/db');
const { ok, fail } = require('../utils/response');
const { idEncode, idDecode } = require('../utils/idCodec');

class UserProfileController {
  
  // API function - Get user profile
  static async getProfile(req, res) {
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
              users.interests, COALESCE(linkedin_url,'') AS linkedin_url, COALESCE(summary,'') AS summary,
              IF(profile_photo != '', CONCAT(?, profile_photo), '') AS profile_photo,
              IF(qr_image != '', CONCAT(?, qr_image), '') AS qr_image,
              profile_updated, card_requested, is_service_provider, is_investor
       FROM users
       LEFT JOIN countries ON countries.id = users.country_id
       LEFT JOIN states ON states.id = users.state_id
       LEFT JOIN cities ON cities.id = users.city_id
         WHERE user_id = ?`, [profilePath, qrPath, decodedUserId]
      );
      
      // Get interest names from IDs
      let interestNames = '';
      if (rows.length > 0 && rows[0].interests) {
        const interestIds = rows[0].interests.split(',').filter(id => id.trim() !== '');
        if (interestIds.length > 0) {
          const placeholders = interestIds.map(() => '?').join(',');
          const interestRows = await query(
            `SELECT name FROM interests WHERE id IN (${placeholders}) AND status = 1`,
            interestIds
          );
          interestNames = interestRows.map(row => row.name).join(', ');
        }
      }
      
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

      // Get project details with dynamic project logo URLs (handle missing table gracefully)
      let projectRows = [];
      try {
        const projectLogoPath = `${baseUrl}/uploads/project_logo/`;
        projectRows = await query(
          `SELECT user_project_details.*, 
                  IF(project_logo != '', CONCAT(?, project_logo), '') AS project_logo
           FROM user_project_details 
           WHERE user_id = ? AND status = 1
           ORDER BY project_detail_id`, [projectLogoPath, decodedUserId]
        );
      } catch (error) {
        console.log('Project details table not found, using empty array');
        projectRows = [];
      }

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
        interests: interestNames || "",
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
        project_details: projectDetails.length > 0 ? projectDetails : false
      });
      
    } catch (error) {
      console.error('getProfile error:', error);
      return res.json({
        status: false,
        rcode: 500,
        message: 'Failed to get profile'
      });
    }
  }

  static async updateProfile(req, res) {
    try {
      const { user_id, token, full_name, email, mobile, address, country_id, state_id, city_id, interests, linkedin_url, summary } = req.body;
      
      console.log('updateProfile - Parameters:', { user_id, token, full_name, email, mobile, address, country_id, state_id, city_id, interests, linkedin_url, summary });
      
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
      
      // Process interests - handle both string and array formats
      let processedInterests = '';
      if (interests) {
        if (Array.isArray(interests)) {
          // If interests is an array, join with commas
          processedInterests = interests.join(',');
        } else if (typeof interests === 'string') {
          // If interests is a string, use as is
          processedInterests = interests;
        }
      }
      
      console.log('updateProfile - Processed interests:', processedInterests);
      
      // Update profile with image
    await query(
        `UPDATE users SET full_name=?, email=?, mobile=?, address=?, country_id=?, state_id=?, city_id=?, interests=?, linkedin_url=?, summary=?, profile_photo=?, profile_updated=1 WHERE user_id=?`,
        [full_name || '', email || '', mobile || '', address || '', country_id || null, state_id || null, city_id || null, processedInterests, linkedin_url || '', summary || '', profilePhoto, decodedUserId]
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
  }

  static async getUserDetailByMobile(req, res) {
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
  }

  static async getUserProfileByMobile(req, res) {
    try {
      // Support both query parameters and form data
      const { mobile_no } = {
        ...req.query,
        ...req.body
      };
      
      if (!mobile_no) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'mobile_no is required'
        });
      }

      // Get user profile by mobile number with all required fields
      const baseUrl = `${req.protocol}://${req.get('host')}`;
      const profilePhotoPath = `${baseUrl}/uploads/profiles/`;
      const qrCodePath = `${baseUrl}/uploads/qr_codes/`;
      
      // Clean mobile number for better matching
      const cleanMobile = mobile_no.replace(/[^\d+]/g, ''); // Remove spaces and special chars except +
      
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
        WHERE (u.mobile = ? OR u.mobile LIKE ? OR REPLACE(REPLACE(u.mobile, ' ', ''), '+', '') = REPLACE(REPLACE(?, ' ', ''), '+', '')) AND u.status = 1
        LIMIT 1
      `, [profilePhotoPath, qrCodePath, mobile_no, `%${cleanMobile}%`, cleanMobile]);

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
  }
  static async getUserDetailByQrCode(req, res) {
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
  }
  // Admin function - Update admin profile
  static async adminUpdateAdminProfile(req, res) {
    try {
      const { admin_id, ...updateData } = req.body;
      
      if (!admin_id) {
        return res.status(400).json({
          status: false,
          rcode: 400,
          message: 'Admin ID is required'
        });
      }
      
      const updatedAdmin = await query(
        'UPDATE admin_users SET ? WHERE id = ?',
        [updateData, admin_id]
      );
      
      return res.json({
        status: true,
        rcode: 200,
        message: 'Admin profile updated successfully',
        data: { admin_id: admin_id }
      });
      
    } catch (error) {
      console.error('adminUpdateAdminProfile error:', error);
      return res.status(500).json({
        status: false,
        rcode: 500,
        message: 'Failed to update admin profile'
      });
    }
  }

  // API function - Save work details
  static async saveWorkDetails(req, res) {
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
  }

  // API function - Get work details
  static async getWorkDetails(req, res) {
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
      
      // Get work details with employment type
      const workDetailsRows = await query(`
        SELECT wd.work_detail_id, wd.user_id, wd.company_name, wd.designation,
               DATE_FORMAT(wd.start_date, '%d-%m-%Y') as start_date,
               DATE_FORMAT(wd.end_date, '%d-%m-%Y') as end_date,
               wd.currently_working, wd.employment_type_id, wd.status, wd.created_dts,
               et.name as employment_type
        FROM user_work_details wd
        LEFT JOIN employment_type et ON et.id = wd.employment_type_id
        WHERE wd.user_id = ? AND wd.status = 1
        ORDER BY wd.created_dts DESC
      `, [decodedUserId]);
      
      return res.json({
        status: true,
        rcode: 200,
        user_id: user_id,
        unique_token: token,
        work_details: workDetailsRows
      });
      
    } catch (error) {
      console.error('getWorkDetails error:', error);
      return res.json({
        status: false,
        rcode: 500,
        message: 'Failed to get work details'
      });
    }
  }

  // API function - Delete work detail
  static async deleteWorkDetail(req, res) {
    try {
      const { user_id, token, work_detail_id } = req.body;
      
      if (!user_id || !token || !work_detail_id) {
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
      
      // Soft delete work detail
      const result = await query(
        'UPDATE user_work_details SET status = 0 WHERE work_detail_id = ? AND user_id = ?',
        [work_detail_id, decodedUserId]
      );
      
      if (result.affectedRows === 0) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'Work detail not found or access denied'
        });
      }
      
      return res.json({
        status: true,
        rcode: 200,
        user_id: user_id,
        unique_token: token,
        message: 'Work detail deleted successfully'
      });
      
    } catch (error) {
      console.error('deleteWorkDetail error:', error);
      return res.json({
        status: false,
        rcode: 500,
        message: 'Failed to delete work detail'
      });
    }
  }

 
  static async saveEducationDetails(req, res) {
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
  }
  static async getEducationDetails(req, res) {
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
  }

  static async deleteEducationDetail(req, res) {
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
  }
  // API function - Get project details
  static async getProjectDetails(req, res) {
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
      
      const baseUrl = process.env.BASE_URL || `${req.protocol}://${req.get('host')}`;
      const projectLogoPath = `${baseUrl}/uploads/project_logo/`;
      
      const projectDetailsRows = await query(`
        SELECT user_project_details.*,
               IF(project_logo != '', CONCAT(?, project_logo), '') AS project_logo
        FROM user_project_details 
        WHERE user_id = ? AND status = 1
        ORDER BY project_detail_id
      `, [projectLogoPath, decodedUserId]);
      
      return res.json({
        status: true,
        rcode: 200,
        user_id: user_id,
        unique_token: token,
        project_details: projectDetailsRows
      });
      
    } catch (error) {
      console.error('getProjectDetails error:', error);
      return res.json({
        status: false,
        rcode: 500,
        message: 'Failed to get project details'
      });
    }
  }

  
  // API function - Get work details
  static async getWorkDetails(req, res) {
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
  }

  // API function - Delete work detail
  static async deleteWorkDetail(req, res) {
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
  }

  // API function - Save work details
  static async saveWorkDetails(req, res) {
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
  }
}

module.exports = UserProfileController;
