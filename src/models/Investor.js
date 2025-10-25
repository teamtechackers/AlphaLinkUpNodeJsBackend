'use strict';

const { query } = require('../config/db');
const { idEncode, idDecode } = require('../utils/idCodec');
const { logger } = require('../utils/logger');

class Investor {
  constructor(data = {}) {
    this.investor_id = data.investor_id;
    this.user_id = data.user_id;
    this.company_name = data.company_name;
    this.investment_focus = data.investment_focus;
    this.fund_size_id = data.fund_size_id;
    this.country_id = data.country_id;
    this.state_id = data.state_id;
    this.city_id = data.city_id;
    this.address = data.address;
    this.website = data.website;
    this.contact_person = data.contact_person;
    this.contact_email = data.contact_email;
    this.contact_phone = data.contact_phone;
    this.investment_criteria = data.investment_criteria;
    this.approval_status = data.approval_status;
    this.status = data.status;
    this.deleted = data.deleted;
    this.created_dts = data.created_dts;
    this.updated_dts = data.updated_dts;
    
    // Joined fields
    this.fund_size = data.fund_size;
    this.investment_range = data.investment_range;
    this.country_name = data.country_name;
    this.state_name = data.state_name;
    this.city_name = data.city_name;
    this.user_name = data.user_name;
    this.user_mobile = data.user_mobile;
  }

  // Create new investor
  static async create(investorData) {
    try {
      const result = await query(
        `INSERT INTO user_investor (
          user_id, company_name, investment_focus, fund_size_id, country_id, state_id, city_id,
          address, website, contact_person, contact_email, contact_phone,
          investment_criteria, approval_status, status, created_dts
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
        [
          investorData.user_id, investorData.company_name, investorData.investment_focus,
          investorData.fund_size_id, investorData.country_id, investorData.state_id,
          investorData.city_id, investorData.address, investorData.website,
          investorData.contact_person, investorData.contact_email, investorData.contact_phone,
          investorData.investment_criteria, investorData.approval_status || 1,
          investorData.status || 1
        ]
      );

      return result.insertId;
    } catch (error) {
      logger.error('Error creating investor:', error);
      throw error;
    }
  }

  // Find investor by ID
  static async findById(investorId) {
    try {
      const [investor] = await query(
        `SELECT i.*, 
                fs.investment_range AS fund_size,
                c.name AS country_name, s.name AS state_name, ci.name AS city_name,
                u.full_name AS user_name, u.mobile AS user_mobile
         FROM user_investor i
         JOIN fund_size fs ON fs.id = i.fund_size_id
         JOIN countries c ON c.id = i.country_id
         JOIN states s ON s.id = i.state_id
         JOIN cities ci ON ci.id = i.city_id
         JOIN users u ON u.user_id = i.user_id
         WHERE i.investor_id = ? AND i.deleted = '0'`,
        [investorId]
      );

      return investor ? new Investor(investor) : null;
    } catch (error) {
      logger.error('Error finding investor by ID:', error);
      throw error;
    }
  }

  // Find investor by user ID
  static async findByUserId(userId) {
    try {
      const [investor] = await query(
        `SELECT i.*, 
                fs.investment_range AS fund_size,
                c.name AS country_name, s.name AS state_name, ci.name AS city_name
         FROM user_investor i
         JOIN fund_size fs ON fs.id = i.fund_size_id
         JOIN countries c ON c.id = i.country_id
         JOIN states s ON s.id = i.state_id
         JOIN cities ci ON ci.id = i.city_id
         WHERE i.user_id = ? AND i.deleted = '0'`,
        [userId]
      );

      return investor ? new Investor(investor) : null;
    } catch (error) {
      logger.error('Error finding investor by user ID:', error);
      throw error;
    }
  }

  // Update investor
  async update(updateData) {
    try {
      const result = await query(
        `UPDATE user_investor SET 
          company_name = ?, investment_focus = ?, fund_size_id = ?, country_id = ?,
          state_id = ?, city_id = ?, address = ?, website = ?, contact_person = ?,
          contact_email = ?, contact_phone = ?, investment_criteria = ?,
          updated_dts = NOW()
         WHERE investor_id = ? AND user_id = ?`,
        [
          updateData.company_name, updateData.investment_focus, updateData.fund_size_id,
          updateData.country_id, updateData.state_id, updateData.city_id,
          updateData.address, updateData.website, updateData.contact_person,
          updateData.contact_email, updateData.contact_phone, updateData.investment_criteria,
          this.investor_id, this.user_id
        ]
      );

      if (result.affectedRows > 0) {
        Object.assign(this, updateData);
        this.updated_dts = new Date();
        return true;
      }

      return false;
    } catch (error) {
      logger.error('Error updating investor:', error);
      throw error;
    }
  }

  // Soft delete investor
  async softDelete() {
    try {
      const result = await query(
        "UPDATE user_investor SET deleted = '1', updated_dts = NOW() WHERE investor_id = ? AND user_id = ?",
        [this.investor_id, this.user_id]
      );

      if (result.affectedRows > 0) {
        this.deleted = '1';
        this.updated_dts = new Date();
        return true;
      }

      return false;
    } catch (error) {
      logger.error('Error soft deleting investor:', error);
      throw error;
    }
  }

  // Update approval status
  async updateApprovalStatus(status) {
    try {
      const result = await query(
        'UPDATE user_investor SET approval_status = ?, updated_dts = NOW() WHERE investor_id = ?',
        [status, this.investor_id]
      );

      if (result.affectedRows > 0) {
        this.approval_status = status;
        this.updated_dts = new Date();
        return true;
      }

      return false;
    } catch (error) {
      logger.error('Error updating approval status:', error);
      throw error;
    }
  }

  // Get all approved investors
  static async getAllApprovedInvestors(excludeUserId = null, pagination = { page: 1, limit: 20 }) {
    try {
      const { page, limit } = pagination;
      const offset = (page - 1) * limit;

      let whereClause = "WHERE i.deleted = '0' AND i.status = 1 AND i.approval_status = 2";
      let params = [];

      if (excludeUserId) {
        whereClause += ' AND i.user_id != ?';
        params.push(excludeUserId);
      }

      const [total] = await query(
        `SELECT COUNT(*) AS total FROM user_investor i ${whereClause}`,
        params
      );

      const investors = await query(
        `SELECT i.*, 
                fs.investment_range AS fund_size,
                c.name AS country_name, s.name AS state_name, ci.name AS city_name,
                u.full_name AS user_name, u.mobile AS user_mobile
         FROM user_investor i
         JOIN fund_size fs ON fs.id = i.fund_size_id
         JOIN countries c ON c.id = i.country_id
         JOIN states s ON s.id = i.state_id
         JOIN cities ci ON ci.id = i.city_id
         JOIN users u ON u.user_id = i.user_id
         ${whereClause}
         ORDER BY i.created_dts DESC
         LIMIT ? OFFSET ?`,
        [...params, limit, offset]
      );

      return {
        investors: investors.map(investor => new Investor(investor)),
        pagination: {
          page,
          limit,
          total: total.total,
          totalPages: Math.ceil(total.total / limit)
        }
      };
    } catch (error) {
      logger.error('Error getting all approved investors:', error);
      throw error;
    }
  }

  // Search investors
  static async searchInvestors(criteria, pagination = { page: 1, limit: 20 }) {
    try {
      const { search, fund_size_id, country_id, state_id, city_id, investment_focus } = criteria;
      const { page, limit } = pagination;
      const offset = (page - 1) * limit;

      let whereClause = "WHERE i.deleted = '0' AND i.status = 1 AND i.approval_status = 2";
      let params = [];

      if (search) {
        whereClause += ' AND (i.company_name LIKE ? OR i.investment_focus LIKE ? OR i.investment_criteria LIKE ?)';
        params.push(`%${search}%`, `%${search}%`, `%${search}%`);
      }

      if (fund_size_id) {
        whereClause += ' AND i.fund_size_id = ?';
        params.push(fund_size_id);
      }

      if (country_id) {
        whereClause += ' AND i.country_id = ?';
        params.push(country_id);
      }

      if (state_id) {
        whereClause += ' AND i.state_id = ?';
        params.push(state_id);
      }

      if (city_id) {
        whereClause += ' AND i.city_id = ?';
        params.push(city_id);
      }

      if (investment_focus) {
        whereClause += ' AND i.investment_focus LIKE ?';
        params.push(`%${investment_focus}%`);
      }

      const [total] = await query(
        `SELECT COUNT(*) AS total FROM user_investor i ${whereClause}`,
        params
      );

      const investors = await query(
        `SELECT i.*, 
                fs.investment_range AS fund_size,
                c.name AS country_name, s.name AS state_name, ci.name AS city_name,
                u.full_name AS user_name, u.mobile AS user_mobile
         FROM user_investor i
         JOIN fund_size fs ON fs.id = i.fund_size_id
         JOIN countries c ON c.id = i.country_id
         JOIN states s ON s.id = i.state_id
         JOIN cities ci ON ci.id = i.city_id
         JOIN users u ON u.user_id = i.user_id
         ${whereClause}
         ORDER BY i.created_dts DESC
         LIMIT ? OFFSET ?`,
        [...params, limit, offset]
      );

      return {
        investors: investors.map(investor => new Investor(investor)),
        pagination: {
          page,
          limit,
          total: total.total,
          totalPages: Math.ceil(total.total / limit)
        }
      };
    } catch (error) {
      logger.error('Error searching investors:', error);
      throw error;
    }
  }

  // Check if user can unlock investor
  static async canUnlockInvestor(userId, investorId) {
    try {
      // Check if user has already unlocked this investor
      const [unlocked] = await query(
        'SELECT unlock_id FROM user_investors_unlocked WHERE user_id = ? AND investor_id = ?',
        [userId, investorId]
      );

      return !unlocked; // Can unlock if not already unlocked
    } catch (error) {
      logger.error('Error checking investor unlock status:', error);
      throw error;
    }
  }

  // Unlock investor for user
  static async unlockInvestor(userId, investorId) {
    try {
      const result = await query(
        'INSERT INTO user_investors_unlocked (user_id, investor_id, created_dts) VALUES (?, ?, NOW())',
        [userId, investorId]
      );

      return result.insertId;
    } catch (error) {
      logger.error('Error unlocking investor:', error);
      throw error;
    }
  }

  // Get unlocked investors for user
  static async getUnlockedInvestors(userId) {
    try {
      const investors = await query(
        `SELECT uiu.*, i.company_name, i.investment_focus,
                fs.investment_range AS fund_size,
                c.name AS country_name, s.name AS state_name, ci.name AS city_name
         FROM user_investors_unlocked uiu
         JOIN user_investor i ON i.investor_id = uiu.investor_id
         JOIN fund_size fs ON fs.id = i.fund_size_id
         JOIN countries c ON c.id = i.country_id
         JOIN states s ON s.id = i.state_id
         JOIN cities ci ON ci.id = i.city_id
         WHERE uiu.user_id = ?
         ORDER BY uiu.created_dts DESC`,
        [userId]
      );

      return investors;
    } catch (error) {
      logger.error('Error getting unlocked investors:', error);
      throw error;
    }
  }

  // Get investor meets (users who unlocked this investor)
  static async getInvestorMeets(investorId) {
    try {
      const meets = await query(
        `SELECT uiu.*, u.full_name, u.email, u.mobile, u.profile_photo
         FROM user_investors_unlocked uiu
         JOIN users u ON u.user_id = uiu.user_id
         WHERE uiu.investor_id = ?
         ORDER BY uiu.created_dts DESC`,
        [investorId]
      );

      return meets;
    } catch (error) {
      logger.error('Error getting investor meets:', error);
      throw error;
    }
  }

  // Get investor desk (investors unlocked by user)
  static async getInvestorDesk(userId) {
    try {
      const desk = await query(
        `SELECT uiu.user_id, uiu.investor_id, u.full_name AS user_name,
                i.company_name, i.investment_focus
         FROM user_investor i
         JOIN user_investors_unlocked uiu ON uiu.investor_id = i.investor_id
         JOIN users u ON u.user_id = uiu.user_id
         WHERE i.user_id = ?
         ORDER BY uiu.created_dts DESC`,
        [userId]
      );

      return desk;
    } catch (error) {
      logger.error('Error getting investor desk:', error);
      throw error;
    }
  }

  // Get investor statistics
  static async getInvestorStats(userId = null) {
    try {
      let whereClause = "WHERE i.deleted = '0'";
      let params = [];

      if (userId) {
        whereClause += ' AND i.user_id = ?';
        params.push(userId);
      }

      const [stats] = await query(
        `SELECT 
          COUNT(*) AS total_investors,
          COUNT(CASE WHEN i.approval_status = 1 THEN 1 END) AS pending_approval,
          COUNT(CASE WHEN i.approval_status = 2 THEN 1 END) AS approved,
          COUNT(CASE WHEN i.approval_status = 3 THEN 1 END) AS rejected
         FROM user_investor i ${whereClause}`,
        params
      );

      return stats;
    } catch (error) {
      logger.error('Error getting investor stats:', error);
      throw error;
    }
  }

  // Get investor by encoded ID
  static async findByEncodedId(encodedId) {
    try {
      const investorId = idDecode(encodedId);
      if (!investorId) return null;
      
      return await Investor.findById(investorId);
    } catch (error) {
      logger.error('Error finding investor by encoded ID:', error);
      return null;
    }
  }

  // Get encoded investor ID for API responses
  getEncodedId() {
    return idEncode(this.investor_id);
  }

  // Get public investor data (for sharing)
  getPublicData() {
    return {
      investor_id: this.getEncodedId(),
      company_name: this.company_name,
      investment_focus: this.investment_focus,
      fund_size: this.fund_size,
      investment_range: this.investment_range,
      country_name: this.country_name,
      state_name: this.state_name,
      city_name: this.city_name,
      address: this.address,
      website: this.website,
      contact_person: this.contact_person,
      contact_email: this.contact_email,
      contact_phone: this.contact_phone,
      investment_criteria: this.investment_criteria,
      user_name: this.user_name,
      user_mobile: this.user_mobile,
      created_dts: this.created_dts
    };
  }

  // Get similar investors
  static async getSimilarInvestors(investorId, limit = 5) {
    try {
      const [currentInvestor] = await query(
        'SELECT fund_size_id, country_id, city_id FROM user_investor WHERE investor_id = ?',
        [investorId]
      );

      if (!currentInvestor) return [];

      const similarInvestors = await query(
        `SELECT i.*, 
                fs.investment_range AS fund_size,
                c.name AS country_name, s.name AS state_name, ci.name AS city_name
         FROM user_investor i
         JOIN fund_size fs ON fs.id = i.fund_size_id
         JOIN countries c ON c.id = i.country_id
         JOIN states s ON s.id = i.state_id
         JOIN cities ci ON ci.id = i.city_id
         WHERE i.investor_id != ? AND i.deleted = '0' AND i.status = 1 AND i.approval_status = 2
         AND (i.fund_size_id = ? OR i.country_id = ? OR i.city_id = ?)
         ORDER BY i.created_dts DESC
         LIMIT ?`,
        [investorId, currentInvestor.fund_size_id, currentInvestor.country_id, currentInvestor.city_id, limit]
      );

      return similarInvestors.map(investor => new Investor(investor));
    } catch (error) {
      logger.error('Error getting similar investors:', error);
      throw error;
    }
  }

  // Get top investors by unlock count
  static async getTopInvestors(limit = 10) {
    try {
      const topInvestors = await query(
        `SELECT i.*, 
                fs.investment_range AS fund_size,
                c.name AS country_name, s.name AS state_name, ci.name AS city_name,
                COUNT(uiu.unlock_id) AS unlock_count
         FROM user_investor i
         JOIN fund_size fs ON fs.id = i.fund_size_id
         JOIN countries c ON c.id = i.country_id
         JOIN states s ON s.id = i.state_id
         JOIN cities ci ON ci.id = i.city_id
         LEFT JOIN user_investors_unlocked uiu ON uiu.investor_id = i.investor_id
         WHERE i.deleted = '0' AND i.status = 1 AND i.approval_status = 2
         GROUP BY i.investor_id
         ORDER BY unlock_count DESC, i.created_dts DESC
         LIMIT ?`,
        [limit]
      );

      return topInvestors.map(investor => new Investor(investor));
    } catch (error) {
      logger.error('Error getting top investors:', error);
      throw error;
    }
  }
}

module.exports = Investor;
