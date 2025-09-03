'use strict';

const { query } = require('../config/db');
const { ok, fail } = require('../utils/response');
const { idEncode, idDecode } = require('../utils/idCodec');

class EventController {
  
  // API function - Get event information
  static async getEventInformation(req, res) {
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
      const baseUrl = process.env.BASE_URL || `${req.protocol}://${req.get('host')}`;
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
  }
 static async saveEventOrganiser(req, res) {
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
  }
  static async getEventDetail(req, res) {
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
      const baseUrl = process.env.BASE_URL || `${req.protocol}://${req.get('host')}`;
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
  }
  static async saveEventInformation(req, res) {
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
      const baseUrl = process.env.BASE_URL || `${req.protocol}://${req.get('host')}`;
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
  }

  static async getEventOrganisersList(req, res) {
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
      const baseUrl = process.env.BASE_URL || `${req.protocol}://${req.get('host')}`;
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
  }

  static async deleteEventOrganiser(req, res) {
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
  }

  static async getEventAttendeesList(req, res) {
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
      const baseUrl = process.env.BASE_URL || `${req.protocol}://${req.get('host')}`;
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
  }

  static async getEventsAttendedList(req, res) {
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
            WHEN ued.event_banner != '' THEN CONCAT('${process.env.BASE_URL || req.protocol + '://' + req.get('host')}/uploads/events/', ued.event_banner)
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
  }

  static async getEventsOrganisedList(req, res) {
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
            WHEN ued.event_banner != '' THEN CONCAT('${process.env.BASE_URL || req.protocol + '://' + req.get('host')}/uploads/events/', ued.event_banner)
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
  }

  static async saveEventAttendee(req, res) {
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
  }

  static async deleteEventAttendee(req, res) {
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
  }

}

module.exports = EventController;
