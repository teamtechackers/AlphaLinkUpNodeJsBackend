const { query } = require('../config/db');
const { idEncode, idDecode } = require('../utils/idCodec');
const { errorResponse, phpResponse } = require('../utils/response');
const { logger } = require('../utils/logger');

const DashboardController = {
  
  async dashboard(req, res) {
    try {
      const { user_id, token, location, lat, long, limit, start, length, filter_type } = { ...req.query, ...req.body };
      
      if (!user_id || !token) {
        return errorResponse(res, 'user_id and token are required', 400);
      }

      const decodedUserId = idDecode(user_id);
      if (!decodedUserId) {
        return errorResponse(res, 'Invalid user_id', 400);
      }

      const userCheck = await query('SELECT user_id FROM users WHERE user_id = ? AND unique_token = ? AND deleted = 0', [decodedUserId, token]);
      if (userCheck.length === 0) {
        return errorResponse(res, 'Invalid token or user not found', 401);
      }

      let paginationStart = 0;
      let paginationLength = 20; 
      
      if (start !== undefined && start !== null && start !== '') {
        paginationStart = parseInt(start) || 0;
      }
      
      if (length !== undefined && length !== null && length !== '') {
        paginationLength = parseInt(length) || 20;
      } else if (limit !== undefined && limit !== null && limit !== '') {
        paginationLength = parseInt(limit) || 20;
      }
      
      paginationStart = Math.max(0, paginationStart);
      paginationLength = Math.max(1, Math.min(100, paginationLength)); // Max 100 items per request

      
      const hasCoordinates = lat && long;
      const isZeroCoordinates = hasCoordinates && parseFloat(lat) === 0 && parseFloat(long) === 0;
      const isValidCoordinates = hasCoordinates && !isZeroCoordinates;
      
      if (hasCoordinates && !isValidCoordinates && !isZeroCoordinates) {
        return errorResponse(res, 'Invalid coordinates provided', 400);
      } else if (location && !hasCoordinates) {
        return errorResponse(res, 'If location is provided, lat and long are also required', 400);
      }

      const generalSettingsRows = await query('SELECT dashboard_search_radius FROM general_settings LIMIT 1');
      const radius = generalSettingsRows.length > 0 ? generalSettingsRows[0].dashboard_search_radius : 50; // Default 50km

      const arrAttendedEventids = [];
      
      if (hasCoordinates && !isZeroCoordinates) {
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

      let eventsList = [];
      if (hasCoordinates && !isZeroCoordinates) {
        let eventsQuery = `
          SELECT user_event_details.*, 
                 event_mode.name as event_mode, 
                 event_type.name as event_type,
                 IF(user_event_details.event_banner != '', CONCAT('${process.env.BASE_URL || req.protocol + '://' + req.get('host')}/uploads/events/', user_event_details.event_banner), '') AS event_banner,
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
          WHERE user_event_details.user_id != ? AND user_event_details.deleted = 0
        `;
        
        const eventsParams = [lat, long, lat, decodedUserId];
        
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
        
        eventsQuery += ' LIMIT ? OFFSET ?';
        eventsParams.push(radius, paginationLength, paginationStart);
        
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
      } else {
        let eventsQuery = `
          SELECT user_event_details.*, 
                 event_mode.name as event_mode, 
                 event_type.name as event_type,
                 IF(user_event_details.event_banner != '', CONCAT('${process.env.BASE_URL || req.protocol + '://' + req.get('host')}/uploads/events/', user_event_details.event_banner), '') AS event_banner,
                 COUNT(DISTINCT event_attendees.event_id) AS total_attendees
          FROM user_event_details 
          JOIN event_mode ON event_mode.id = user_event_details.event_mode_id
          JOIN event_type ON event_type.id = user_event_details.event_type_id
          LEFT JOIN event_attendees ON event_attendees.event_id = user_event_details.event_id
          WHERE user_event_details.user_id != ? AND user_event_details.deleted = 0
        `;
        
        const eventsParams = [decodedUserId];
        
        if (filter_type === 'today') {
          eventsQuery += ' AND user_event_details.event_date = CURDATE()';
        } else if (filter_type === 'tomorrow') {
          eventsQuery += ' AND user_event_details.event_date = DATE_ADD(CURDATE(), INTERVAL 1 DAY)';
        } else if (filter_type === 'upcoming') {
          eventsQuery += ' AND user_event_details.event_date >= DATE_ADD(CURDATE(), INTERVAL 2 DAY)';
        } else {
          eventsQuery += ' AND user_event_details.event_date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)';
        }
        
        eventsQuery += ' GROUP BY user_event_details.event_id ORDER BY user_event_details.created_dts DESC';
        
        eventsQuery += ' LIMIT ? OFFSET ?';
        eventsParams.push(paginationLength, paginationStart);
        
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
          distance_in_km: "0",
          has_attended: false
        }));
      }

      let jobsList = [];
      if (hasCoordinates && !isZeroCoordinates) {
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
        
        jobsQuery += ' LIMIT ? OFFSET ?';
        jobsParams.push(radius, paginationLength, paginationStart);
        
        const jobsRows = await query(jobsQuery, jobsParams);
        
        jobsList = jobsRows.map(job => {
          const skills = job.skill_names ? job.skill_names.split(', ') : [];
          const skillIds = job.skill_ids ? job.skill_ids.split(',') : [];
          
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
      } else {
        let jobsQuery = `
          SELECT user_job_details.*, 
                 job_type.name as job_type_name, 
                 pay.name as pay_name,
                 countries.name as country_name, 
                 states.name as state_name, 
                 cities.name as city_name,
                 GROUP_CONCAT(DISTINCT skills.name SEPARATOR ', ') as skill_names
          FROM user_job_details 
          JOIN job_type ON job_type.id = user_job_details.job_type_id
          JOIN pay ON pay.id = user_job_details.pay_id
          LEFT JOIN countries ON countries.id = user_job_details.country_id
          LEFT JOIN states ON states.id = user_job_details.state_id
          LEFT JOIN cities ON cities.id = user_job_details.city_id
          LEFT JOIN skills ON FIND_IN_SET(skills.id, user_job_details.skill_ids)
          WHERE user_job_details.user_id != ? AND user_job_details.deleted = 0
        `;
        
        const jobsParams = [decodedUserId];
        
        if (filter_type === 'today') {
          jobsQuery += ' AND DATE(user_job_details.created_dts) = CURDATE()';
        } else if (filter_type === 'tomorrow') {
          jobsQuery += ' AND DATE(user_job_details.created_dts) = DATE_ADD(CURDATE(), INTERVAL 1 DAY)';
        } else if (filter_type === 'upcoming') {
          jobsQuery += ' AND DATE(user_job_details.created_dts) >= DATE_ADD(CURDATE(), INTERVAL 2 DAY)';
        } else {
          jobsQuery += ' AND user_job_details.created_dts >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)';
        }
        
        jobsQuery += ' GROUP BY user_job_details.job_id ORDER BY user_job_details.created_dts DESC';
        
        jobsQuery += ' LIMIT ? OFFSET ?';
        jobsParams.push(paginationLength, paginationStart);
        
        const jobsRows = await query(jobsQuery, jobsParams);
        
        jobsList = jobsRows.map(job => {
          const skills = job.skill_names ? job.skill_names.split(', ') : [];
          const skillIds = job.skill_ids ? job.skill_ids.split(',') : [];
          
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
            distance_in_km: "0",
            mapped_skills: mappedSkills
          };
        });
      }

      let unreadNotificationCount = 0;
      try {
        const NotificationController = require('./NotificationController');
        const notificationStats = await NotificationController.getNotificationStats(decodedUserId);
        if (notificationStats.success) {
          unreadNotificationCount = parseInt(notificationStats.stats.unread) || 0;
        }
      } catch (notificationError) {
        console.log('Error fetching notification count:', notificationError.message);
        unreadNotificationCount = 0;
      }

      return res.json({
        status: true,
        rcode: 200,
        user_id: user_id,
        unique_token: token,
        events_list: eventsList,
        jobs_list: jobsList,
        unread_notification_count: unreadNotificationCount,
        pagination: {
          start: paginationStart,
          length: paginationLength,
          events_count: eventsList.length,
          jobs_count: jobsList.length,
          has_more_events: eventsList.length === paginationLength,
          has_more_jobs: jobsList.length === paginationLength
        }
      });

    } catch (error) {
      console.error('Dashboard error:', error);
      logger.error('Dashboard error:', error);
      return errorResponse(res, 'Failed to retrieve dashboard data', 500);
    }
  },

  async getAdminDashboard(req, res) {
    try {
      const { user_id, token } = { ...req.query, ...req.body };

      if (!user_id || !token) {
        return errorResponse(res, 'user_id and token are required', 400);
      }

      const adminCheck = await query('SELECT user_id FROM admin_users WHERE user_id = ? AND unique_token = ? AND deleted = 0', [user_id, token]);
      if (adminCheck.length === 0) {
        return errorResponse(res, 'Invalid admin token', 401);
      }

      const [totalUsers] = await query('SELECT COUNT(*) as count FROM users WHERE deleted = 0');
      const [totalJobs] = await query('SELECT COUNT(*) as count FROM user_job_details WHERE deleted = 0');
      const [totalEvents] = await query('SELECT COUNT(*) as count FROM user_event_details WHERE deleted = 0');
      const [totalServices] = await query('SELECT COUNT(*) as count FROM user_service_provider WHERE deleted = 0');
      const [totalInvestors] = await query('SELECT COUNT(*) as count FROM user_investor WHERE deleted = 0');
      const [totalBusinessCards] = await query('SELECT COUNT(*) as count FROM user_business_cards WHERE deleted = 0');

      const recentUsers = await query('SELECT user_id, full_name, email, created_dts FROM users WHERE deleted = 0 ORDER BY created_dts DESC LIMIT 5');
      const recentJobs = await query('SELECT job_id, job_title, company_name, created_dts FROM user_job_details WHERE deleted = 0 ORDER BY created_dts DESC LIMIT 5');
      const recentEvents = await query('SELECT event_id, event_name, event_date, created_dts FROM user_event_details WHERE deleted = 0 ORDER BY created_dts DESC LIMIT 5');

      return res.json({
        status: true,
        message: 'Admin dashboard data retrieved successfully',
        data: {
          system_stats: {
            total_users: String(totalUsers.count || 0),
            total_jobs: String(totalJobs.count || 0),
            total_events: String(totalEvents.count || 0),
            total_services: String(totalServices.count || 0),
            total_investors: String(totalInvestors.count || 0),
            total_business_cards: String(totalBusinessCards.count || 0)
          },
          recent_activities: {
            recent_users: recentUsers.map(user => ({
              user_id: String(user.user_id),
              full_name: user.full_name || '',
              email: user.email || '',
              created_dts: user.created_dts || ''
            })),
            recent_jobs: recentJobs.map(job => ({
              job_id: String(job.job_id),
              job_title: job.job_title || '',
              company_name: job.company_name || '',
              created_dts: job.created_dts || ''
            })),
            recent_events: recentEvents.map(event => ({
              event_id: String(event.event_id),
              event_name: event.event_name || '',
              event_date: event.event_date || '',
              created_dts: event.created_dts || ''
            }))
          }
        }
      });

    } catch (error) {
      console.error('Admin dashboard error:', error);
      logger.error('Admin dashboard error:', error);
      return errorResponse(res, 'Failed to retrieve admin dashboard data', 500);
    }
  },


  async getAdminUserOverview(req, res) {
    try {
      const { user_id, token } = { ...req.query, ...req.body };

      if (!user_id || !token) {
        return errorResponse(res, 'user_id and token are required', 400);
      }

      const adminCheck = await query('SELECT user_id FROM admin_users WHERE user_id = ? AND unique_token = ? AND deleted = 0', [user_id, token]);
      if (adminCheck.length === 0) {
        return errorResponse(res, 'Invalid admin token', 401);
      }

      const usersByCountry = await query(`
        SELECT 
          c.name as country_name,
          COUNT(u.user_id) as user_count
        FROM users u
        LEFT JOIN countries c ON u.country_id = c.id
        WHERE u.deleted = 0
        GROUP BY u.country_id, c.name
        ORDER BY user_count DESC
        LIMIT 10
      `);

      const usersByStatus = await query(`
        SELECT 
          status,
          COUNT(*) as count
        FROM users
        WHERE deleted = 0
        GROUP BY status
      `);

      const userTrend = await query(`
        SELECT 
          DATE(created_dts) as date,
          COUNT(*) as count
        FROM users
        WHERE deleted = 0 
        AND created_dts >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
        GROUP BY DATE(created_dts)
        ORDER BY date ASC
      `);

      return res.json({
        status: true,
        message: 'Admin user overview retrieved successfully',
        data: {
          users_by_country: usersByCountry.map(item => ({
            country_name: item.country_name || 'Unknown',
            user_count: String(item.user_count || 0)
          })),
          users_by_status: usersByStatus.map(item => ({
            status: String(item.status || 0),
            count: String(item.count || 0)
          })),
          user_registration_trend: userTrend.map(item => ({
            date: item.date || '',
            count: String(item.count || 0)
          }))
        }
      });

    } catch (error) {
      console.error('Admin user overview error:', error);
      logger.error('Admin user overview error:', error);
      return errorResponse(res, 'Failed to retrieve admin user overview', 500);
    }
  }
};

module.exports = DashboardController;
