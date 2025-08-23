'use strict';

const { query } = require('../config/db');
const bcrypt = require('bcryptjs');
const { idEncode, idDecode } = require('../utils/idCodec');
const { logger } = require('../utils/logger');

class User {
  constructor(data = {}) {
    this.user_id = data.user_id;
    this.username = data.username;
    this.email = data.email;
    this.mobile = data.mobile;
    this.password = data.password;
    this.full_name = data.full_name;
    this.address = data.address;
    this.country_id = data.country_id;
    this.state_id = data.state_id;
    this.city_id = data.city_id;
    this.interests = data.interests;
    this.linkedin_url = data.linkedin_url;
    this.summary = data.summary;
    this.profile_photo = data.profile_photo;
    this.qr_image = data.qr_image;
    this.unique_token = data.unique_token;
    this.role_id = data.role_id;
    this.status = data.status;
    this.profile_updated = data.profile_updated;
    this.card_requested = data.card_requested;
    this.is_service_provider = data.is_service_provider;
    this.is_investor = data.is_investor;
    this.created_dts = data.created_dts;
    this.updated_dts = data.updated_dts;
  }

  // Create new user
  static async create(userData) {
    try {
      // Handle password hashing - only hash if password is provided
      let hashedPassword = null;
      if (userData.password) {
        hashedPassword = await bcrypt.hash(userData.password, parseInt(process.env.BCRYPT_ROUNDS) || 12);
      }
      
      // Use provided unique_token or generate new one
      const uniqueToken = userData.unique_token || require('crypto').randomBytes(32).toString('hex');
      
      const result = await query(
        `INSERT INTO users (
          email, mobile, full_name, profile_photo, country_id, state_id, city_id, 
          unique_token, qr_image, verificationSid, otp_sent_dts, deleted, created_dts
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, '0', NOW())`,
        [
          userData.email || null, userData.mobile, userData.full_name || null, 
          userData.profile_photo || null, userData.country_id || null,
          userData.state_id || null, userData.city_id || null, uniqueToken, userData.qr_image || null,
          userData.verificationSid || null, userData.otp_sent_dts || null
        ]
      );

      return result.insertId;
    } catch (error) {
      logger.error('Error creating user:', error);
      throw error;
    }
  }

  // Find user by ID
  static async findById(userId) {
    try {
      const [user] = await query(
        `SELECT u.*, 
                c.name AS country_name, s.name AS state_name, ci.name AS city_name,
                i.name AS interest_name
         FROM users u
         LEFT JOIN countries c ON c.id = u.country_id
         LEFT JOIN states s ON s.id = u.state_id
         LEFT JOIN cities ci ON ci.id = u.city_id
         LEFT JOIN interests i ON i.id = u.interests
         WHERE u.user_id = ?`,
        [userId]
      );

      return user ? new User(user) : null;
    } catch (error) {
      logger.error('Error finding user by ID:', error);
      throw error;
    }
  }

  // Find user by username
  static async findByUsername(username) {
    try {
      const [user] = await query(
        'SELECT * FROM users WHERE username = ? AND status = 1',
        [username]
      );

      return user ? new User(user) : null;
    } catch (error) {
      logger.error('Error finding user by username:', error);
      throw error;
    }
  }

  // Find user by email
  static async findByEmail(email) {
    try {
      const [user] = await query(
        'SELECT * FROM users WHERE email = ? AND status = 1',
        [email]
      );

      return user ? new User(user) : null;
    } catch (error) {
      logger.error('Error finding user by email:', error);
      throw error;
    }
  }

  // Find user by mobile
  static async findByMobile(mobile) {
    try {
      const [user] = await query(
        'SELECT * FROM users WHERE mobile = ? ORDER BY user_id DESC LIMIT 1',
        [mobile]
      );

      return user ? new User(user) : null;
    } catch (error) {
      logger.error('Error finding user by mobile:', error);
      throw error;
    }
  }

  // Find user by QR code
  static async findByQRCode(qrCode) {
    try {
      const [user] = await query(
        'SELECT * FROM users WHERE qr_image = ? AND status = 1',
        [qrCode]
      );

      return user ? new User(user) : null;
    } catch (error) {
      logger.error('Error finding user by QR code:', error);
      throw error;
    }
  }

  // Find user by unique token
  static async findByToken(token) {
    try {
      const [user] = await query(
        'SELECT * FROM users WHERE unique_token = ? AND status = 1',
        [token]
      );

      return user ? new User(user) : null;
    } catch (error) {
      logger.error('Error finding user by token:', error);
      throw error;
    }
  }

  // Update user profile
  async updateProfile(updateData) {
    try {
      const result = await query(
        `UPDATE users SET 
          full_name = ?, email = ?, mobile = ?, address = ?,
          country_id = ?, state_id = ?, city_id = ?, interests = ?,
          linkedin_url = ?, summary = ?, profile_updated = 1,
          updated_dts = NOW()
         WHERE user_id = ?`,
        [
          updateData.full_name, updateData.email, updateData.mobile,
          updateData.address, updateData.country_id, updateData.state_id,
          updateData.city_id, updateData.interests, updateData.linkedin_url,
          updateData.summary, this.user_id
        ]
      );

      if (result.affectedRows > 0) {
        Object.assign(this, updateData);
        this.profile_updated = 1;
        this.updated_dts = new Date();
        return true;
      }

      return false;
    } catch (error) {
      logger.error('Error updating user profile:', error);
      throw error;
    }
  }

  // Update profile photo
  async updateProfilePhoto(photoPath) {
    try {
      const result = await query(
        'UPDATE users SET profile_photo = ?, updated_dts = NOW() WHERE user_id = ?',
        [photoPath, this.user_id]
      );

      if (result.affectedRows > 0) {
        this.profile_photo = photoPath;
        this.updated_dts = new Date();
        return true;
      }

      return false;
    } catch (error) {
      logger.error('Error updating profile photo:', error);
      throw error;
    }
  }

  // Update QR image
  async updateQRImage(qrPath) {
    try {
      const result = await query(
        'UPDATE users SET qr_image = ?, updated_dts = NOW() WHERE user_id = ?',
        [qrPath, this.user_id]
      );

      if (result.affectedRows > 0) {
        this.qr_image = qrPath;
        this.updated_dts = new Date();
        return true;
      }

      return false;
    } catch (error) {
      logger.error('Error updating QR image:', error);
      throw error;
    }
  }

  // Change password
  async changePassword(newPassword) {
    try {
      const hashedPassword = await bcrypt.hash(newPassword, parseInt(process.env.BCRYPT_ROUNDS) || 12);
      
      const result = await query(
        'UPDATE users SET password = ?, updated_dts = NOW() WHERE user_id = ?',
        [hashedPassword, this.user_id]
      );

      if (result.affectedRows > 0) {
        this.password = hashedPassword;
        this.updated_dts = new Date();
        return true;
      }

      return false;
    } catch (error) {
      logger.error('Error changing password:', error);
      throw error;
    }
  }

  // Verify password
  async verifyPassword(password) {
    try {
      return await bcrypt.compare(password, this.password);
    } catch (error) {
      logger.error('Error verifying password:', error);
      return false;
    }
  }

  // Update status
  async updateStatus(status) {
    try {
      const result = await query(
        'UPDATE users SET status = ?, updated_dts = NOW() WHERE user_id = ?',
        [status, this.user_id]
      );

      if (result.affectedRows > 0) {
        this.status = status;
        this.updated_dts = new Date();
        return true;
      }

      return false;
    } catch (error) {
      logger.error('Error updating user status:', error);
      throw error;
    }
  }

  // Generic update method
  static async updateById(userId, updateData) {
    try {
      const setClause = Object.keys(updateData)
        .map(key => `${key} = ?`)
        .join(', ');
      
      const values = [...Object.values(updateData), userId];
      
      const result = await query(
        `UPDATE users SET ${setClause}, updated_at = NOW() WHERE user_id = ?`,
        values
      );

      return result.affectedRows > 0;
    } catch (error) {
      logger.error('Error updating user by ID:', error);
      throw error;
    }
  }

  // Get encoded user ID for API responses
  getEncodedId() {
    return idEncode(this.user_id);
  }

  // Get user dashboard data
  static async getDashboardData(userId) {
    try {
      const [userCount] = await query('SELECT COUNT(*) AS count FROM users WHERE status = 1');
      const [jobCount] = await query("SELECT COUNT(*) AS count FROM user_job_details WHERE deleted = '0'");
      const [eventCount] = await query("SELECT COUNT(*) AS count FROM user_event_details WHERE deleted = '0'");
      const [serviceCount] = await query("SELECT COUNT(*) AS count FROM user_service_provider WHERE deleted = '0'");
      const [investorCount] = await query("SELECT COUNT(*) AS count FROM user_investor WHERE deleted = '0'");

      return {
        count_users: userCount.count,
        count_jobs: jobCount.count,
        count_events: eventCount.count,
        count_service: serviceCount.count,
        count_investor: investorCount.count
      };
    } catch (error) {
      logger.error('Error getting dashboard data:', error);
      throw error;
    }
  }

  // Search users by criteria
  static async searchUsers(criteria, pagination = { page: 1, limit: 20 }) {
    try {
      const { search, country_id, state_id, city_id, interests } = criteria;
      const { page, limit } = pagination;
      const offset = (page - 1) * limit;

      let whereClause = 'WHERE u.status = 1';
      let params = [];

      if (search) {
        whereClause += ' AND (u.full_name LIKE ? OR u.email LIKE ? OR u.mobile LIKE ?)';
        params.push(`%${search}%`, `%${search}%`, `%${search}%`);
      }

      if (country_id) {
        whereClause += ' AND u.country_id = ?';
        params.push(country_id);
      }

      if (state_id) {
        whereClause += ' AND u.state_id = ?';
        params.push(state_id);
      }

      if (city_id) {
        whereClause += ' AND u.city_id = ?';
        params.push(city_id);
      }

      if (interests) {
        whereClause += ' AND u.interests = ?';
        params.push(interests);
      }

      const [users] = await query(
        `SELECT COUNT(*) AS total FROM users u ${whereClause}`,
        params
      );

      const userList = await query(
        `SELECT u.user_id, u.full_name, u.email, u.mobile, u.profile_photo,
                c.name AS country_name, s.name AS state_name, ci.name AS city_name
         FROM users u
         LEFT JOIN countries c ON c.id = u.country_id
         LEFT JOIN states s ON s.id = u.state_id
         LEFT JOIN cities ci ON ci.id = u.city_id
         ${whereClause}
         ORDER BY u.created_dts DESC
         LIMIT ? OFFSET ?`,
        [...params, limit, offset]
      );

      return {
        users: userList,
        pagination: {
          page,
          limit,
          total: users.total,
          totalPages: Math.ceil(users.total / limit)
        }
      };
    } catch (error) {
      logger.error('Error searching users:', error);
      throw error;
    }
  }

  // Get user statistics
  static async getUserStats(userId) {
    try {
      const [jobStats] = await query(
        "SELECT COUNT(*) AS total_jobs FROM user_job_details WHERE user_id = ? AND deleted = '0'"
      );
      
      const [eventStats] = await query(
        "SELECT COUNT(*) AS total_events FROM user_event_details WHERE user_id = ? AND deleted = '0'"
      );
      
      const [contactStats] = await query(
        'SELECT COUNT(*) AS total_contacts FROM user_contacts WHERE user_id = ? AND status = 1'
      );
      
      const [serviceStats] = await query(
        "SELECT COUNT(*) AS total_services FROM user_service_provider WHERE user_id = ? AND deleted = '0'"
      );

      return {
        total_jobs: jobStats.total_jobs,
        total_events: eventStats.total_events,
        total_contacts: contactStats.total_contacts,
        total_services: serviceStats.total_services
      };
    } catch (error) {
      logger.error('Error getting user stats:', error);
      throw error;
    }
  }

  // Soft delete user
  async softDelete() {
    try {
      const result = await query(
        'UPDATE users SET status = 0, deleted_dts = NOW() WHERE user_id = ?',
        [this.user_id]
      );

      if (result.affectedRows > 0) {
        this.status = 0;
        this.deleted_dts = new Date();
        return true;
      }

      return false;
    } catch (error) {
      logger.error('Error soft deleting user:', error);
      throw error;
    }
  }

  // Restore deleted user
  async restore() {
    try {
      const result = await query(
        'UPDATE users SET status = 1, deleted_dts = NULL WHERE user_id = ?',
        [this.user_id]
      );

      if (result.affectedRows > 0) {
        this.status = 1;
        this.deleted_dts = null;
        return true;
      }

      return false;
    } catch (error) {
      logger.error('Error restoring user:', error);
      throw error;
    }
  }

  // Get public profile (for sharing)
  getPublicProfile() {
    return {
      user_id: this.getEncodedId(),
      full_name: this.full_name,
      email: this.email,
      mobile: this.mobile,
      profile_photo: this.profile_photo,
      qr_image: this.qr_image,
      country_id: this.country_id,
      state_id: this.state_id,
      city_id: this.city_id,
      interests: this.interests,
      linkedin_url: this.linkedin_url,
      summary: this.summary,
      is_service_provider: this.is_service_provider,
      is_investor: this.is_investor
    };
  }

  // Check if user has specific permission
  hasPermission(permission) {
    // Basic permission system - can be extended
    const permissions = {
      'admin': [1], // role_id 1 is admin
      'premium': [1, 2], // role_id 1 and 2 are premium
      'basic': [1, 2, 3] // all roles have basic access
    };

    return permissions[permission]?.includes(this.role_id) || false;
  }
}

module.exports = User;
