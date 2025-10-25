'use strict';

const { query } = require('../config/db');
const { idEncode, idDecode } = require('../utils/idCodec');
const { logger } = require('../utils/logger');

class Event {
  constructor(data = {}) {
    this.event_id = data.event_id;
    this.user_id = data.user_id;
    this.event_title = data.event_title;
    this.event_description = data.event_description;
    this.event_date = data.event_date;
    this.event_mode_id = data.event_mode_id;
    this.event_type_id = data.event_type_id;
    this.event_venue = data.event_venue;
    this.country_id = data.country_id;
    this.state_id = data.state_id;
    this.city_id = data.city_id;
    this.event_lat = data.event_lat;
    this.event_lng = data.event_lng;
    this.event_link = data.event_link;
    this.event_banner = data.event_banner;
    this.deleted = data.deleted;
    this.created_dts = data.created_dts;
    this.updated_dts = data.updated_dts;
    
    // Joined fields
    this.event_mode = data.event_mode;
    this.event_type = data.event_type;
    this.country_name = data.country_name;
    this.state_name = data.state_name;
    this.city_name = data.city_name;
    this.organizer_name = data.organizer_name;
  }

  // Create new event
  static async create(eventData) {
    try {
      const result = await query(
        `INSERT INTO user_event_details (
          user_id, event_title, event_description, event_date, event_mode_id,
          event_type_id, event_venue, country_id, state_id, city_id,
          event_lat, event_lng, event_link, event_banner, created_dts
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
        [
          eventData.user_id, eventData.event_title, eventData.event_description,
          eventData.event_date, eventData.event_mode_id, eventData.event_type_id,
          eventData.event_venue, eventData.country_id, eventData.state_id,
          eventData.city_id, eventData.event_lat, eventData.event_lng,
          eventData.event_link, eventData.event_banner
        ]
      );

      return result.insertId;
    } catch (error) {
      logger.error('Error creating event:', error);
      throw error;
    }
  }

  // Find event by ID
  static async findById(eventId) {
    try {
      const [event] = await query(
        `SELECT e.*, 
                em.name AS event_mode, et.name AS event_type,
                c.name AS country_name, s.name AS state_name, ci.name AS city_name,
                u.full_name AS organizer_name
         FROM user_event_details e
         JOIN event_mode em ON em.id = e.event_mode_id
         JOIN event_type et ON et.id = e.event_type_id
         JOIN countries c ON c.id = e.country_id
         JOIN states s ON s.id = e.state_id
         JOIN cities ci ON ci.id = e.city_id
         JOIN users u ON u.user_id = e.user_id
         WHERE e.event_id = ? AND e.deleted = '0'`,
        [eventId]
      );

      return event ? new Event(event) : null;
    } catch (error) {
      logger.error('Error finding event by ID:', error);
      throw error;
    }
  }

  // Get events by user ID
  static async findByUserId(userId) {
    try {
      const events = await query(
        `SELECT e.*, 
                em.name AS event_mode, et.name AS event_type,
                c.name AS country_name, s.name AS state_name, ci.name AS city_name
         FROM user_event_details e
         JOIN event_mode em ON em.id = e.event_mode_id
         JOIN event_type et ON et.id = e.event_type_id
         JOIN countries c ON c.id = e.country_id
         JOIN states s ON s.id = e.state_id
         JOIN cities ci ON ci.id = e.city_id
         WHERE e.user_id = ? AND e.deleted = '0'
         ORDER BY e.event_date ASC`,
        [userId]
      );

      return events.map(event => new Event(event));
    } catch (error) {
      logger.error('Error finding events by user ID:', error);
      throw error;
    }
  }

  // Update event
  async update(updateData) {
    try {
      const result = await query(
        `UPDATE user_event_details SET 
          event_title = ?, event_description = ?, event_date = ?, event_mode_id = ?,
          event_type_id = ?, event_venue = ?, country_id = ?, state_id = ?, city_id = ?,
          event_lat = ?, event_lng = ?, event_link = ?, event_banner = ?,
          updated_dts = NOW()
         WHERE event_id = ? AND user_id = ?`,
        [
          updateData.event_title, updateData.event_description, updateData.event_date,
          updateData.event_mode_id, updateData.event_type_id, updateData.event_venue,
          updateData.country_id, updateData.state_id, updateData.city_id,
          updateData.event_lat, updateData.event_lng, updateData.event_link,
          updateData.event_banner, this.event_id, this.user_id
        ]
      );

      if (result.affectedRows > 0) {
        Object.assign(this, updateData);
        this.updated_dts = new Date();
        return true;
      }

      return false;
    } catch (error) {
      logger.error('Error updating event:', error);
      throw error;
    }
  }

  // Soft delete event
  async softDelete() {
    try {
      const result = await query(
        "UPDATE user_event_details SET deleted = '1', updated_dts = NOW() WHERE event_id = ? AND user_id = ?",
        [this.event_id, this.user_id]
      );

      if (result.affectedRows > 0) {
        this.deleted = '1';
        this.updated_dts = new Date();
        return true;
      }

      return false;
    } catch (error) {
      logger.error('Error soft deleting event:', error);
      throw error;
    }
  }

  // Add event organizer
  static async addOrganizer(eventId, userId) {
    try {
      const result = await query(
        'INSERT INTO event_organisers (event_id, user_id, created_dts) VALUES (?, ?, NOW())',
        [eventId, userId]
      );

      return result.insertId;
    } catch (error) {
      logger.error('Error adding event organizer:', error);
      throw error;
    }
  }

  // Remove event organizer
  static async removeOrganizer(eventId, userId) {
    try {
      const result = await query(
        'DELETE FROM event_organisers WHERE event_id = ? AND user_id = ?',
        [eventId, userId]
      );

      return result.affectedRows > 0;
    } catch (error) {
      logger.error('Error removing event organizer:', error);
      throw error;
    }
  }

  // Get event organizers
  static async getOrganizers(eventId) {
    try {
      const organizers = await query(
        `SELECT u.user_id, u.full_name, u.email, u.mobile, u.profile_photo,
                eo.created_dts AS added_date
         FROM event_organisers eo
         JOIN users u ON u.user_id = eo.user_id
         WHERE eo.event_id = ?
         ORDER BY eo.created_dts ASC`,
        [eventId]
      );

      return organizers;
    } catch (error) {
      logger.error('Error getting event organizers:', error);
      throw error;
    }
  }

  // Add event attendee
  static async addAttendee(eventId, userId) {
    try {
      const result = await query(
        'INSERT INTO event_attendees (event_id, user_id, created_dts) VALUES (?, ?, NOW())',
        [eventId, userId]
      );

      return result.insertId;
    } catch (error) {
      logger.error('Error adding event attendee:', error);
      throw error;
    }
  }

  // Remove event attendee
  static async removeAttendee(eventId, userId) {
    try {
      const result = await query(
        'DELETE FROM event_attendees WHERE event_id = ? AND user_id = ?',
        [eventId, userId]
      );

      return result.affectedRows > 0;
    } catch (error) {
      logger.error('Error removing event attendee:', error);
      throw error;
    }
  }

  // Get event attendees
  static async getAttendees(eventId) {
    try {
      const attendees = await query(
        `SELECT u.user_id, u.full_name, u.email, u.mobile, u.profile_photo,
                ea.created_dts AS registered_date
         FROM event_attendees ea
         JOIN users u ON u.user_id = ea.user_id
         WHERE ea.event_id = ?
         ORDER BY ea.created_dts ASC`,
        [eventId]
      );

      return attendees;
    } catch (error) {
      logger.error('Error getting event attendees:', error);
      throw error;
    }
  }

  // Check if user is attending event
  static async isAttending(eventId, userId) {
    try {
      const [attendee] = await query(
        'SELECT attendee_id FROM event_attendees WHERE event_id = ? AND user_id = ?',
        [eventId, userId]
      );

      return !!attendee;
    } catch (error) {
      logger.error('Error checking event attendance:', error);
      throw error;
    }
  }

  // Check if user is organizing event
  static async isOrganizing(eventId, userId) {
    try {
      const [organizer] = await query(
        'SELECT organiser_id FROM event_organisers WHERE event_id = ? AND user_id = ?',
        [eventId, userId]
      );

      return !!organizer;
    } catch (error) {
      logger.error('Error checking event organization:', error);
      throw error;
    }
  }

  // Get events organized by user
  static async getEventsOrganized(userId) {
    try {
      const events = await query(
        `SELECT e.*, 
                em.name AS event_mode, et.name AS event_type,
                c.name AS country_name, s.name AS state_name, ci.name AS city_name
         FROM user_event_details e
         JOIN event_organisers eo ON eo.event_id = e.event_id
         JOIN event_mode em ON em.id = e.event_mode_id
         JOIN event_type et ON et.id = e.event_type_id
         JOIN countries c ON c.id = e.country_id
         JOIN states s ON s.id = e.state_id
         JOIN cities ci ON ci.id = e.city_id
         WHERE eo.user_id = ? AND e.deleted = '0'
         ORDER BY e.event_date ASC`,
        [userId]
      );

      return events.map(event => new Event(event));
    } catch (error) {
      logger.error('Error getting events organized by user:', error);
      throw error;
    }
  }

  // Get events attended by user
  static async getEventsAttended(userId) {
    try {
      const events = await query(
        `SELECT e.*, 
                em.name AS event_mode, et.name AS event_type,
                c.name AS country_name, s.name AS state_name, ci.name AS city_name
         FROM user_event_details e
         JOIN event_attendees ea ON ea.event_id = e.event_id
         JOIN event_mode em ON em.id = e.event_mode_id
         JOIN event_type et ON et.id = e.event_type_id
         JOIN countries c ON c.id = e.country_id
         JOIN states s ON s.id = e.state_id
         JOIN cities ci ON ci.id = e.city_id
         WHERE ea.user_id = ? AND e.deleted = '0'
         ORDER BY e.event_date ASC`,
        [userId]
      );

      return events.map(event => new Event(event));
    } catch (error) {
      logger.error('Error getting events attended by user:', error);
      throw error;
    }
  }

  // Search events
  static async searchEvents(criteria, pagination = { page: 1, limit: 20 }) {
    try {
      const { search, event_type_id, event_mode_id, country_id, state_id, city_id, date_from, date_to } = criteria;
      const { page, limit } = pagination;
      const offset = (page - 1) * limit;

      let whereClause = "WHERE e.deleted = '0'";
      let params = [];

      if (search) {
        whereClause += ' AND (e.event_title LIKE ? OR e.event_description LIKE ? OR e.event_venue LIKE ?)';
        params.push(`%${search}%`, `%${search}%`, `%${search}%`);
      }

      if (event_type_id) {
        whereClause += ' AND e.event_type_id = ?';
        params.push(event_type_id);
      }

      if (event_mode_id) {
        whereClause += ' AND e.event_mode_id = ?';
        params.push(event_mode_id);
      }

      if (country_id) {
        whereClause += ' AND e.country_id = ?';
        params.push(country_id);
      }

      if (state_id) {
        whereClause += ' AND e.state_id = ?';
        params.push(state_id);
      }

      if (city_id) {
        whereClause += ' AND e.city_id = ?';
        params.push(city_id);
      }

      if (date_from) {
        whereClause += ' AND e.event_date >= ?';
        params.push(date_from);
      }

      if (date_to) {
        whereClause += ' AND e.event_date <= ?';
        params.push(date_to);
      }

      const [total] = await query(
        `SELECT COUNT(*) AS total FROM user_event_details e ${whereClause}`,
        params
      );

      const events = await query(
        `SELECT e.*, 
                em.name AS event_mode, et.name AS event_type,
                c.name AS country_name, s.name AS state_name, ci.name AS city_name,
                u.full_name AS organizer_name
         FROM user_event_details e
         JOIN event_mode em ON em.id = e.event_mode_id
         JOIN event_type et ON et.id = e.event_type_id
         JOIN countries c ON c.id = e.country_id
         JOIN states s ON s.id = e.state_id
         JOIN cities ci ON ci.id = e.city_id
         JOIN users u ON u.user_id = e.user_id
         ${whereClause}
         ORDER BY e.event_date ASC
         LIMIT ? OFFSET ?`,
        [...params, limit, offset]
      );

      return {
        events: events.map(event => new Event(event)),
        pagination: {
          page,
          limit,
          total: total.total,
          totalPages: Math.ceil(total.total / limit)
        }
      };
    } catch (error) {
      logger.error('Error searching events:', error);
      throw error;
    }
  }

  // Get upcoming events
  static async getUpcomingEvents(limit = 10) {
    try {
      const events = await query(
        `SELECT e.*, 
                em.name AS event_mode, et.name AS event_type,
                c.name AS country_name, s.name AS state_name, ci.name AS city_name,
                u.full_name AS organizer_name
         FROM user_event_details e
         JOIN event_mode em ON em.id = e.event_mode_id
         JOIN event_type et ON et.id = e.event_type_id
         JOIN countries c ON c.id = e.country_id
         JOIN states s ON s.id = e.state_id
         JOIN cities ci ON ci.id = e.city_id
         JOIN users u ON u.user_id = e.user_id
         WHERE e.deleted = '0' AND e.event_date >= CURDATE()
         ORDER BY e.event_date ASC
         LIMIT ?`,
        [limit]
      );

      return events.map(event => new Event(event));
    } catch (error) {
      logger.error('Error getting upcoming events:', error);
      throw error;
    }
  }

  // Get event statistics
  static async getEventStats(userId = null) {
    try {
      let whereClause = "WHERE deleted = '0'";
      let params = [];

      if (userId) {
        whereClause += ' AND user_id = ?';
        params.push(userId);
      }

      const [stats] = await query(
        `SELECT 
          COUNT(*) AS total_events,
          COUNT(CASE WHEN event_date >= CURDATE() THEN 1 END) AS upcoming_events,
          COUNT(CASE WHEN event_date < CURDATE() THEN 1 END) AS past_events
         FROM user_event_details ${whereClause}`,
        params
      );

      return stats;
    } catch (error) {
      logger.error('Error getting event stats:', error);
      throw error;
    }
  }

  // Get event by encoded ID
  static async findByEncodedId(encodedId) {
    try {
      const eventId = idDecode(encodedId);
      if (!eventId) return null;
      
      return await Event.findById(eventId);
    } catch (error) {
      logger.error('Error finding event by encoded ID:', error);
      return null;
    }
  }

  // Get encoded event ID for API responses
  getEncodedId() {
    return idEncode(this.event_id);
  }

  // Get public event data (for sharing)
  getPublicData() {
    return {
      event_id: this.getEncodedId(),
      event_title: this.event_title,
      event_description: this.event_description,
      event_date: this.event_date,
      event_mode: this.event_mode,
      event_type: this.event_type,
      event_venue: this.event_venue,
      country_name: this.country_name,
      state_name: this.state_name,
      city_name: this.city_name,
      event_lat: this.event_lat,
      event_lng: this.event_lng,
      event_link: this.event_link,
      event_banner: this.event_banner,
      organizer_name: this.organizer_name,
      created_dts: this.created_dts
    };
  }

  // Update event banner
  async updateBanner(bannerPath) {
    try {
      const result = await query(
        'UPDATE user_event_details SET event_banner = ?, updated_dts = NOW() WHERE event_id = ? AND user_id = ?',
        [bannerPath, this.event_id, this.user_id]
      );

      if (result.affectedRows > 0) {
        this.event_banner = bannerPath;
        this.updated_dts = new Date();
        return true;
      }

      return false;
    } catch (error) {
      logger.error('Error updating event banner:', error);
      throw error;
    }
  }

  // Get similar events
  static async getSimilarEvents(eventId, limit = 5) {
    try {
      const [currentEvent] = await query(
        'SELECT event_type_id, country_id, city_id FROM user_event_details WHERE event_id = ?',
        [eventId]
      );

      if (!currentEvent) return [];

      const similarEvents = await query(
        `SELECT e.*, 
                em.name AS event_mode, et.name AS event_type,
                c.name AS country_name, s.name AS state_name, ci.name AS city_name
         FROM user_event_details e
         JOIN event_mode em ON em.id = e.event_mode_id
         JOIN event_type et ON et.id = e.event_type_id
         JOIN countries c ON c.id = e.country_id
         JOIN states s ON s.id = e.state_id
         JOIN cities ci ON ci.id = e.city_id
         WHERE e.event_id != ? AND e.deleted = '0' AND e.event_date >= CURDATE()
         AND (e.event_type_id = ? OR e.country_id = ? OR e.city_id = ?)
         ORDER BY e.event_date ASC
         LIMIT ?`,
        [eventId, currentEvent.event_type_id, currentEvent.country_id, currentEvent.city_id, limit]
      );

      return similarEvents.map(event => new Event(event));
    } catch (error) {
      logger.error('Error getting similar events:', error);
      throw error;
    }
  }
}

module.exports = Event;
