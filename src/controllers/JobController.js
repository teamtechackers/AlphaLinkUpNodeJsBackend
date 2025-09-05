'use strict';

const { query } = require('../config/db');
const { ok, fail } = require('../utils/response');
const { idEncode, idDecode } = require('../utils/idCodec');

class JobController {
  // API function - Get job information with search filters
  static async getJobInformation(req, res) {
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
  }

  // API function - Get job details with applicants
  static async getJobDetail(req, res) {
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
           LEFT JOIN skills ON FIND_IN_SET(skills.id, user_job_details.skill_ids)
           WHERE user_job_details.job_id = ? AND user_job_details.deleted = 0
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
      const baseUrl = process.env.BASE_URL || `${req.protocol}://${req.get('host')}`;
      const profilePath = `${baseUrl}/uploads/profiles/`;
      const resumePath = `${baseUrl}/uploads/resumes/`;
      
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
        [profilePath, resumePath, job_id]
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
  }

  // API function - Save job information
  static async saveJobInformation(req, res) {
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
      if (job_title === "" || company_name === "" || country_id === "" || state_id === "" || city_id === "" || address === "" || job_type_id === "" || pay_id === "" || job_description === "" || job_lat === "" || job_lng === "") {
        return fail(res, 500, 'Please enter mandatory fields');
      }
      
      // Check if skills are provided
      if (!skills || skills === "" || skills.trim() === "") {
        return fail(res, 500, 'Skills are not added please add skills');
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
  }

  // API function - Apply for job
  static async saveJobApplication(req, res) {
    try {
      // Support both query parameters and form data
      const { user_id, token, job_id, first_name, last_name, email, mobile, skills, resume_id, resume_title, resume_file } = {
        ...req.query,
        ...req.body
      };
      
      console.log('saveJobApplication - Received parameters:', {
        user_id, token, job_id, first_name, last_name, email, mobile, skills, resume_id, resume_title, resume_file
      });
      
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
      
      // Check if job_id is provided
      if (!job_id) {
        return fail(res, 500, 'job_id is required');
      }
      
      // Check if user has already applied for this job
      const existingApplication = await query(
        'SELECT * FROM user_job_applications WHERE user_id = ? AND job_id = ?',
        [decodedUserId, job_id]
      );
      
      if (existingApplication.length > 0) {
        return fail(res, 500, 'You have already applied for this job');
      }
      
      // Handle resume file upload
      let finalResumeId = resume_id;
      if (req.file && req.file.filename) {
        // Save resume file information
        const resumeResult = await query(
          'INSERT INTO user_resumes (user_id, resume_title, resume_file, created_dts) VALUES (?, ?, ?, NOW())',
          [decodedUserId, resume_title || 'Job Application Resume', req.file.filename]
        );
        finalResumeId = resumeResult.insertId;
      }
      
      // Save job application
      const applicationResult = await query(
        'INSERT INTO user_job_applications (user_id, job_id, first_name, last_name, email, mobile, skills, resume_id, created_dts) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())',
        [decodedUserId, job_id, first_name || '', last_name || '', email || '', mobile || '', skills || '', finalResumeId]
      );
      
      // Return response in PHP format
      return res.json({
        status: true,
        rcode: 200,
        user_id: idEncode(decodedUserId),
        unique_token: token,
        application_id: applicationResult.insertId,
        message: 'Job application submitted successfully'
      });
      
    } catch (error) {
      console.error('saveJobApplication error:', error);
      return fail(res, 500, 'Failed to submit job application');
    }
  }

  // Admin function - View jobs
  static async adminViewJobs(req, res) {
    try {
      // Support both query parameters and form data
      const { user_id, token } = {
        ...req.query,
        ...req.body
      };

      console.log('adminViewJobs - Parameters:', { user_id, token });

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

      // Check if user exists
      const userRows = await query('SELECT * FROM users WHERE user_id = ? LIMIT 1', [decodedUserId]);
      if (!userRows.length) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'User not found'
        });
      }

      // Check if user is admin
      const adminRows = await query('SELECT * FROM admin_users WHERE id = ? LIMIT 1', [decodedUserId]);
      if (!adminRows.length) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'Permission denied'
        });
      }

      return res.json({
        status: true,
        rcode: 200,
        user_id: user_id,
        unique_token: token,
        message: 'Jobs view page loaded successfully'
      });

    } catch (error) {
      console.error('adminViewJobs error:', error);
      return res.json({
        status: false,
        rcode: 500,
        message: 'Failed to load jobs view'
      });
    }
  }

  // Admin function - Edit jobs
  static async adminEditJobs(req, res) {
    try {
      // Support both query parameters and form data
      const { user_id, token, row_id } = {
        ...req.query,
        ...req.body
      };

      console.log('adminEditJobs - Parameters:', { user_id, token, row_id });

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

      // Check if user exists
      const userRows = await query('SELECT * FROM users WHERE user_id = ? LIMIT 1', [decodedUserId]);
      if (!userRows.length) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'User not found'
        });
      }

      // Check if user is admin
      const adminRows = await query('SELECT * FROM admin_users WHERE id = ? LIMIT 1', [decodedUserId]);
      if (!adminRows.length) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'Permission denied'
        });
      }

      return res.json({
        status: true,
        rcode: 200,
        user_id: user_id,
        unique_token: token,
        message: 'Jobs edit page loaded successfully'
      });

    } catch (error) {
      console.error('adminEditJobs error:', error);
      return res.json({
        status: false,
        rcode: 500,
        message: 'Failed to load jobs edit'
      });
    }
  }

  // Admin function - Submit jobs
  static async adminSubmitJobs(req, res) {
    try {
      // Support both query parameters and form data
      const { user_id, token, row_id, user_id: job_user_id, job_title, company_name, country_id, state_id, city_id, address, job_lat, job_lng, job_type_id, pay_id, job_description, status } = {
        ...req.query,
        ...req.body
      };
      
      // Extract job user_id from body (different from admin user_id)
      const jobUserId = req.body.user_id;
      
      // Ensure admin user_id comes from query parameters
      const adminUserId = req.query.user_id;

      console.log('adminSubmitJobs - Parameters:', { user_id, token, row_id, jobUserId, job_title, company_name, country_id, state_id, city_id, address, job_lat, job_lng, job_type_id, pay_id, job_description, status });

      // Check if user_id and token are provided
      if (!adminUserId || !token) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'user_id and token are required'
        });
      }

      // Decode user ID
      const decodedUserId = idDecode(adminUserId);
      if (!decodedUserId) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'Invalid user ID'
        });
      }

      // Check if user exists
      const userRows = await query('SELECT * FROM users WHERE user_id = ? LIMIT 1', [decodedUserId]);
      if (!userRows.length) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'User not found'
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
      if (!jobUserId) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'user_id is required'
        });
      }

      // Get admin role_id
      const admin = adminRows[0];

      if (!row_id || row_id === '') {
        // Insert new job (matching PHP exactly)
        const insertData = {
          user_id: parseInt(jobUserId),
          job_title: job_title ? job_title.trim() : '',
          company_name: company_name ? company_name.trim() : '',
          country_id: country_id ? parseInt(country_id) : 166, // Default to Pakistan
          state_id: state_id ? parseInt(state_id) : 2728, // Default to Punjab
          city_id: city_id ? parseInt(city_id) : 31439, // Default to Lahore
          address: address ? address.trim() : '',
          job_lat: job_lat ? parseFloat(job_lat) : null,
          job_lng: job_lng ? parseFloat(job_lng) : null,
          job_type_id: job_type_id ? parseInt(job_type_id) : null,
          pay_id: pay_id ? parseInt(pay_id) : null,
          job_description: job_description ? job_description.trim() : '',
          status: status !== undefined ? parseInt(status) : 1,
          deleted: 0,
          created_dts: new Date().toISOString().slice(0, 19).replace('T', ' '),
          created_by: admin.role_id
        };

        await query(
          'INSERT INTO user_job_details (user_id, job_title, company_name, country_id, state_id, city_id, address, job_lat, job_lng, job_type_id, pay_id, job_description, status, deleted, created_dts, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
          [insertData.user_id, insertData.job_title, insertData.company_name, insertData.country_id, insertData.state_id, insertData.city_id, insertData.address, insertData.job_lat, insertData.job_lng, insertData.job_type_id, insertData.pay_id, insertData.job_description, insertData.status, insertData.deleted, insertData.created_dts, insertData.created_by]
        );

        return res.json({
          status: 'Success',
          info: 'Job Created Successfully'
        });

      } else {
        // Update existing job (matching PHP exactly)
        const updateData = {
          user_id: parseInt(jobUserId),
          job_title: job_title ? job_title.trim() : '',
          company_name: company_name ? company_name.trim() : '',
          country_id: country_id ? parseInt(country_id) : 166,
          state_id: state_id ? parseInt(state_id) : 2728,
          city_id: city_id ? parseInt(city_id) : 31439,
          address: address ? address.trim() : '',
          job_lat: job_lat ? parseFloat(job_lat) : null,
          job_lng: job_lng ? parseFloat(job_lng) : null,
          job_type_id: job_type_id ? parseInt(job_type_id) : null,
          pay_id: pay_id ? parseInt(pay_id) : null,
          job_description: job_description ? job_description.trim() : '',
          status: status !== undefined ? parseInt(status) : 1,
          updated_at: new Date().toISOString().slice(0, 19).replace('T', ' '),
          updated_by: admin.role_id
        };

        await query(
          'UPDATE user_job_details SET user_id = ?, job_title = ?, company_name = ?, country_id = ?, state_id = ?, city_id = ?, address = ?, job_lat = ?, job_lng = ?, job_type_id = ?, pay_id = ?, job_description = ?, status = ?, updated_at = ?, updated_by = ? WHERE job_id = ?',
          [updateData.user_id, updateData.job_title, updateData.company_name, updateData.country_id, updateData.state_id, updateData.city_id, updateData.address, updateData.job_lat, updateData.job_lng, updateData.job_type_id, updateData.pay_id, updateData.job_description, updateData.status, updateData.updated_at, updateData.updated_by, row_id]
        );

        return res.json({
          status: 'Success',
          info: 'Job Updated Successfully'
        });
      }

    } catch (error) {
      console.error('adminSubmitJobs error:', error);
      return res.json({
        status: 'Error',
        info: 'Failed to process job'
      });
    }
  }

  // Admin function - List jobs (AJAX)
  static async adminListJobsAjax(req, res) {
    try {
      // Support both query parameters and form data
      const { user_id, token } = {
        ...req.query,
        ...req.body
      };

      console.log('adminListJobsAjax - Parameters:', { user_id, token });

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

      // Check if user exists
      const userRows = await query('SELECT * FROM users WHERE user_id = ? LIMIT 1', [decodedUserId]);
      if (!userRows.length) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'User not found'
        });
      }

      // Check if user is admin
      const adminRows = await query('SELECT * FROM admin_users WHERE id = ? LIMIT 1', [decodedUserId]);
      if (!adminRows.length) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'Permission denied'
        });
      }

      // Get jobs list with user details
      const jobsList = await query(`
        SELECT 
          ujd.job_id,
          ujd.user_id,
          ujd.job_title,
          ujd.company_name,
          ujd.country_id,
          ujd.state_id,
          ujd.city_id,
          ujd.address,
          ujd.job_lat,
          ujd.job_lng,
          ujd.job_type_id,
          ujd.pay_id,
          ujd.job_description,
          ujd.status,
          ujd.created_dts,
          ujd.created_by,
          ujd.updated_at,
          ujd.updated_by,
          ujd.deleted,
          ujd.deleted_by,
          ujd.deleted_at,
          u.full_name as user_name,
          u.email as user_email,
          u.mobile as user_mobile,
          c.name as country_name,
          s.name as state_name,
          ci.name as city_name,
          jt.name as job_type_name,
          p.name as pay_name
        FROM user_job_details ujd
        LEFT JOIN users u ON ujd.user_id = u.user_id
        LEFT JOIN countries c ON ujd.country_id = c.id
        LEFT JOIN states s ON ujd.state_id = s.id
        LEFT JOIN cities ci ON ujd.city_id = ci.id
        LEFT JOIN job_type jt ON ujd.job_type_id = jt.id
        LEFT JOIN pay p ON ujd.pay_id = p.id
        WHERE ujd.deleted = 0
        ORDER BY ujd.job_id DESC
      `);

      // Format jobs list
      const formattedJobsList = jobsList.map(job => ({
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
        status: job.status ? job.status.toString() : "0",
        created_dts: job.created_dts || "",
        created_by: job.created_by ? job.created_by.toString() : "",
        updated_at: job.updated_at || "",
        updated_by: job.updated_by ? job.updated_by.toString() : "",
        deleted: job.deleted ? job.deleted.toString() : "0",
        deleted_by: job.deleted_by ? job.deleted_by.toString() : "",
        deleted_at: job.deleted_at || "",
        user_name: job.user_name || "",
        user_email: job.user_email || "",
        user_mobile: job.user_mobile || "",
        country_name: job.country_name || "",
        state_name: job.state_name || "",
        city_name: job.city_name || "",
        job_type_name: job.job_type_name || "",
        pay_name: job.pay_name || ""
      }));

      return res.json({
        status: true,
        rcode: 200,
        user_id: user_id,
        unique_token: token,
        jobs_list: formattedJobsList
      });

    } catch (error) {
      console.error('adminListJobsAjax error:', error);
      return res.json({
        status: false,
        rcode: 500,
        message: 'Failed to get jobs list'
      });
    }
  }

  // Admin function - Delete jobs
  static async adminDeleteJobs(req, res) {
    try {
      // Support both query parameters and form data
      const { user_id, token, row_id } = {
        ...req.query,
        ...req.body
      };

      console.log('adminDeleteJobs - Parameters:', { user_id, token, row_id });

      // Check if user_id and token are provided
      if (!user_id || !token) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'user_id and token are required'
        });
      }

      if (!row_id) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'row_id is required'
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

      // Check if user exists
      const userRows = await query('SELECT * FROM users WHERE user_id = ? LIMIT 1', [decodedUserId]);
      if (!userRows.length) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'User not found'
        });
      }

      // Check if user is admin
      const adminRows = await query('SELECT * FROM admin_users WHERE id = ? LIMIT 1', [decodedUserId]);
      if (!adminRows.length) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'Permission denied'
        });
      }

      // Soft delete job
      await query(
        'UPDATE user_job_details SET deleted = 1, deleted_by = ?, deleted_at = NOW() WHERE job_id = ?',
        [decodedUserId, row_id]
      );

      return res.json({
        status: 'Success',
        info: 'Job Deleted Successfully'
      });

    } catch (error) {
      console.error('adminDeleteJobs error:', error);
      return res.json({
        status: 'Error',
        info: 'Failed to delete job'
      });
    }
  }

  // Admin function - View jobs details
  static async adminViewJobsDetails(req, res) {
    try {
      // Support both query parameters and form data
      const { user_id, token, row_id } = {
        ...req.query,
        ...req.body
      };

      console.log('adminViewJobsDetails - Parameters:', { user_id, token, row_id });

      // Check if user_id and token are provided
      if (!user_id || !token) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'user_id and token are required'
        });
      }

      if (!row_id) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'row_id is required'
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

      // Check if user exists
      const userRows = await query('SELECT * FROM users WHERE user_id = ? LIMIT 1', [decodedUserId]);
      if (!userRows.length) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'User not found'
        });
      }

      // Check if user is admin
      const adminRows = await query('SELECT * FROM admin_users WHERE id = ? LIMIT 1', [decodedUserId]);
      if (!adminRows.length) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'Permission denied'
        });
      }

      // Get job details
      const jobDetails = await query(`
        SELECT 
          ujd.*,
          u.full_name as user_name,
          u.email as user_email,
          u.mobile as user_mobile,
          c.name as country_name,
          s.name as state_name,
          ci.name as city_name,
          jt.name as job_type_name,
          p.name as pay_name
        FROM user_job_details ujd
        LEFT JOIN users u ON ujd.user_id = u.user_id
        LEFT JOIN countries c ON ujd.country_id = c.id
        LEFT JOIN states s ON ujd.state_id = s.id
        LEFT JOIN cities ci ON ujd.city_id = ci.id
        LEFT JOIN job_type jt ON ujd.job_type_id = jt.id
        LEFT JOIN pay p ON ujd.pay_id = p.id
        WHERE ujd.job_id = ? AND ujd.deleted = 0
      `, [row_id]);

      if (!jobDetails.length) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'Job not found'
        });
      }

      const job = jobDetails[0];

      // Format job details
      const formattedJobDetails = {
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
        status: job.status ? job.status.toString() : "0",
        created_dts: job.created_dts || "",
        created_by: job.created_by ? job.created_by.toString() : "",
        updated_at: job.updated_at || "",
        updated_by: job.updated_by ? job.updated_by.toString() : "",
        deleted: job.deleted ? job.deleted.toString() : "0",
        deleted_by: job.deleted_by ? job.deleted_by.toString() : "",
        deleted_at: job.deleted_at || "",
        user_name: job.user_name || "",
        user_email: job.user_email || "",
        user_mobile: job.user_mobile || "",
        country_name: job.country_name || "",
        state_name: job.state_name || "",
        city_name: job.city_name || "",
        job_type_name: job.job_type_name || "",
        pay_name: job.pay_name || ""
      };

      return res.json({
        status: true,
        rcode: 200,
        user_id: user_id,
        unique_token: token,
        job_details: formattedJobDetails
      });

    } catch (error) {
      console.error('adminViewJobsDetails error:', error);
      return res.json({
        status: false,
        rcode: 500,
        message: 'Failed to get job details'
      });
    }
  }
}

module.exports = JobController;