'use strict';

const db = require('../config/db');
const { logger } = require('../utils/logger');

class BusinessCard {
  /**
   * Create a new business card
   */
  static async createCard(cardData) {
    try {
      const query = `
        INSERT INTO business_cards (
          user_id, name, company, designation, mobile, email, website, 
          address, profile_photo, status, activated_at, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;
      
      const values = [
        cardData.user_id,
        cardData.name,
        cardData.company,
        cardData.designation,
        cardData.mobile,
        cardData.email,
        cardData.website,
        cardData.address,
        cardData.profile_photo,
        cardData.status,
        cardData.activated_at,
        cardData.created_at,
        cardData.updated_at
      ];

      const [result] = await db.execute(query, values);
      
      return {
        id: result.insertId,
        ...cardData
      };
    } catch (error) {
      logger.error('Create business card error:', error);
      throw error;
    }
  }

  /**
   * Get business card by user ID
   */
  static async getBusinessCardByUserId(userId) {
    try {
      const query = `
        SELECT * FROM business_cards 
        WHERE user_id = ? AND status != 'deleted'
        ORDER BY created_at DESC 
        LIMIT 1
      `;
      
      const [rows] = await db.execute(query, [userId]);
      
      if (rows.length === 0) {
        return null;
      }
      
      return rows[0];
    } catch (error) {
      logger.error('Get business card by user ID error:', error);
      throw error;
    }
  }

  /**
   * Get business card by ID
   */
  static async getBusinessCardById(cardId) {
    try {
      const query = `
        SELECT * FROM business_cards 
        WHERE id = ? AND status != 'deleted'
      `;
      
      const [rows] = await db.execute(query, [cardId]);
      
      if (rows.length === 0) {
        return null;
      }
      
      return rows[0];
    } catch (error) {
      logger.error('Get business card by ID error:', error);
      throw error;
    }
  }

  /**
   * Get business card by QR code
   */
  static async getBusinessCardByQR(qrCode) {
    try {
      const query = `
        SELECT bc.*, u.profile_photo as user_profile_photo
        FROM business_cards bc
        LEFT JOIN users u ON bc.user_id = u.user_id
        WHERE bc.qr_code = ? AND bc.status = 'active'
      `;
      
      const [rows] = await db.execute(query, [qrCode]);
      
      if (rows.length === 0) {
        return null;
      }
      
      return rows[0];
    } catch (error) {
      logger.error('Get business card by QR error:', error);
      throw error;
    }
  }

  /**
   * Update business card
   */
  static async updateCard(cardId, updateData) {
    try {
      const fields = Object.keys(updateData).map(key => `${key} = ?`).join(', ');
      const values = Object.values(updateData);
      
      const query = `
        UPDATE business_cards 
        SET ${fields}
        WHERE id = ?
      `;
      
      values.push(cardId);
      
      const [result] = await db.execute(query, values);
      
      if (result.affectedRows === 0) {
        throw new Error('Business card not found');
      }
      
      // Return updated card
      return await this.getBusinessCardById(cardId);
    } catch (error) {
      logger.error('Update business card error:', error);
      throw error;
    }
  }

  /**
   * Delete business card (soft delete)
   */
  static async deleteCard(cardId) {
    try {
      const query = `
        UPDATE business_cards 
        SET status = 'deleted', deleted_at = NOW(), updated_at = NOW()
        WHERE id = ?
      `;
      
      const [result] = await db.execute(query, [cardId]);
      
      if (result.affectedRows === 0) {
        throw new Error('Business card not found');
      }
      
      return { success: true };
    } catch (error) {
      logger.error('Delete business card error:', error);
      throw error;
    }
  }

  /**
   * Get business card statistics
   */
  static async getBusinessCardStats(userId) {
    try {
      const query = `
        SELECT 
          COUNT(DISTINCT v.id) as total_views,
          COUNT(DISTINCT s.id) as total_shares,
          COUNT(DISTINCT d.id) as total_downloads,
          MAX(v.viewed_at) as last_viewed,
          MAX(s.shared_at) as last_shared,
          COUNT(DISTINCT qr.id) as qr_scans,
          CASE 
            WHEN bc.name IS NOT NULL AND bc.mobile IS NOT NULL THEN 100
            WHEN bc.name IS NOT NULL OR bc.mobile IS NOT NULL THEN 50
            ELSE 0
          END as profile_completion
        FROM business_cards bc
        LEFT JOIN business_card_views v ON bc.id = v.card_id
        LEFT JOIN business_card_shares s ON bc.id = s.card_id
        LEFT JOIN business_card_downloads d ON bc.id = d.card_id
        LEFT JOIN business_card_qr_scans qr ON bc.id = qr.card_id
        WHERE bc.user_id = ? AND bc.status = 'active'
      `;
      
      const [rows] = await db.execute(query, [userId]);
      
      return rows[0] || {};
    } catch (error) {
      logger.error('Get business card stats error:', error);
      throw error;
    }
  }

  /**
   * Record business card view
   */
  static async recordView(cardId, viewData) {
    try {
      const query = `
        INSERT INTO business_card_views (
          card_id, viewer_ip, viewer_user_agent, viewed_at
        ) VALUES (?, ?, ?, ?)
      `;
      
      const values = [
        cardId,
        viewData.viewer_ip || null,
        viewData.viewer_user_agent || null,
        viewData.viewed_at
      ];

      await db.execute(query, values);
      
      // Update view count in business_cards table
      await db.execute(
        'UPDATE business_cards SET view_count = view_count + 1 WHERE id = ?',
        [cardId]
      );
      
      logger.debug(`Business card view recorded for card ${cardId}`);
    } catch (error) {
      logger.error('Record business card view error:', error);
      throw error;
    }
  }

  /**
   * Record business card share
   */
  static async recordShare(cardId, shareData) {
    try {
      const query = `
        INSERT INTO business_card_shares (
          card_id, share_type, recipient_email, message, shared_at
        ) VALUES (?, ?, ?, ?, ?)
      `;
      
      const values = [
        cardId,
        shareData.share_type,
        shareData.recipient_email || null,
        shareData.message || null,
        shareData.shared_at
      ];

      await db.execute(query, values);
      
      // Update share count in business_cards table
      await db.execute(
        'UPDATE business_cards SET share_count = share_count + 1 WHERE id = ?',
        [cardId]
      );
      
      logger.debug(`Business card share recorded for card ${cardId}`);
    } catch (error) {
      logger.error('Record business card share error:', error);
      throw error;
    }
  }

  /**
   * Record business card download
   */
  static async recordDownload(cardId, downloadData) {
    try {
      const query = `
        INSERT INTO business_card_downloads (
          card_id, downloader_ip, downloader_user_agent, downloaded_at
        ) VALUES (?, ?, ?, ?)
      `;
      
      const values = [
        cardId,
        downloadData.downloader_ip || null,
        downloadData.downloader_user_agent || null,
        downloadData.downloaded_at
      ];

      await db.execute(query, values);
      
      // Update download count in business_cards table
      await db.execute(
        'UPDATE business_cards SET download_count = download_count + 1 WHERE id = ?',
        [cardId]
      );
      
      logger.debug(`Business card download recorded for card ${cardId}`);
    } catch (error) {
      logger.error('Record business card download error:', error);
      throw error;
    }
  }

  /**
   * Record QR code scan
   */
  static async recordQRScan(cardId, scanData) {
    try {
      const query = `
        INSERT INTO business_card_qr_scans (
          card_id, scanner_ip, scanner_user_agent, scanned_at
        ) VALUES (?, ?, ?, ?)
      `;
      
      const values = [
        cardId,
        scanData.scanner_ip || null,
        scanData.scanner_user_agent || null,
        scanData.scanned_at
      ];

      await db.execute(query, values);
      
      logger.debug(`Business card QR scan recorded for card ${cardId}`);
    } catch (error) {
      logger.error('Record QR scan error:', error);
      throw error;
    }
  }

  /**
   * Get business card analytics
   */
  static async getBusinessCardAnalytics(userId, options = {}) {
    try {
      const { startDate, endDate, groupBy = 'day' } = options;
      
      let dateFilter = '';
      let values = [userId];
      
      if (startDate && endDate) {
        dateFilter = 'AND DATE(v.viewed_at) BETWEEN ? AND ?';
        values.push(startDate, endDate);
      } else if (startDate) {
        dateFilter = 'AND DATE(v.viewed_at) >= ?';
        values.push(startDate);
      } else if (endDate) {
        dateFilter = 'AND DATE(v.viewed_at) <= ?';
        values.push(endDate);
      }

      let groupByClause = 'DATE(v.viewed_at)';
      if (groupBy === 'hour') {
        groupByClause = 'DATE(v.viewed_at), HOUR(v.viewed_at)';
      } else if (groupBy === 'week') {
        groupByClause = 'YEARWEEK(v.viewed_at)';
      } else if (groupBy === 'month') {
        groupByClause = 'DATE_FORMAT(v.viewed_at, "%Y-%m")';
      }

      const query = `
        SELECT 
          ${groupByClause} as period,
          COUNT(*) as views,
          COUNT(DISTINCT v.viewer_ip) as unique_viewers
        FROM business_card_views v
        JOIN business_cards bc ON v.card_id = bc.id
        WHERE bc.user_id = ? ${dateFilter}
        GROUP BY ${groupByClause}
        ORDER BY period DESC
      `;
      
      const [rows] = await db.execute(query, values);
      
      return rows;
    } catch (error) {
      logger.error('Get business card analytics error:', error);
      throw error;
    }
  }

  /**
   * Get popular business cards
   */
  static async getPopularBusinessCards(limit = 10) {
    try {
      const query = `
        SELECT 
          bc.*,
          u.name as user_name,
          u.profile_photo as user_profile_photo,
          COUNT(DISTINCT v.id) as total_views,
          COUNT(DISTINCT s.id) as total_shares
        FROM business_cards bc
        LEFT JOIN users u ON bc.user_id = u.user_id
        LEFT JOIN business_card_views v ON bc.id = v.card_id
        LEFT JOIN business_card_shares s ON bc.id = s.card_id
        WHERE bc.status = 'active'
        GROUP BY bc.id
        ORDER BY total_views DESC, total_shares DESC
        LIMIT ?
      `;
      
      const [rows] = await db.execute(query, [limit]);
      
      return rows;
    } catch (error) {
      logger.error('Get popular business cards error:', error);
      throw error;
    }
  }

  /**
   * Search business cards
   */
  static async searchBusinessCards(searchTerm, options = {}) {
    try {
      const { page = 1, limit = 20, filters = {} } = options;
      const offset = (page - 1) * limit;
      
      let whereClause = 'bc.status = "active"';
      let values = [];
      
      if (searchTerm) {
        whereClause += ' AND (bc.name LIKE ? OR bc.company LIKE ? OR bc.designation LIKE ?)';
        const searchPattern = `%${searchTerm}%`;
        values.push(searchPattern, searchPattern, searchPattern);
      }
      
      if (filters.company) {
        whereClause += ' AND bc.company = ?';
        values.push(filters.company);
      }
      
      if (filters.designation) {
        whereClause += ' AND bc.designation = ?';
        values.push(filters.designation);
      }

      const query = `
        SELECT 
          bc.*,
          u.name as user_name,
          u.profile_photo as user_profile_photo
        FROM business_cards bc
        LEFT JOIN users u ON bc.user_id = u.user_id
        WHERE ${whereClause}
        ORDER BY bc.activated_at DESC
        LIMIT ? OFFSET ?
      `;
      
      values.push(limit, offset);
      
      const [rows] = await db.execute(query, values);
      
      // Get total count for pagination
      const countQuery = `
        SELECT COUNT(*) as total
        FROM business_cards bc
        WHERE ${whereClause}
      `;
      
      const [countRows] = await db.execute(countQuery, values.slice(0, -2));
      const total = countRows[0].total;
      
      return {
        cards: rows,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      logger.error('Search business cards error:', error);
      throw error;
    }
  }

  /**
   * Get business card by mobile number
   */
  static async getBusinessCardByMobile(mobile) {
    try {
      const query = `
        SELECT bc.*, u.profile_photo as user_profile_photo
        FROM business_cards bc
        LEFT JOIN users u ON bc.user_id = u.user_id
        WHERE bc.mobile = ? AND bc.status = 'active'
      `;
      
      const [rows] = await db.execute(query, [mobile]);
      
      if (rows.length === 0) {
        return null;
      }
      
      return rows[0];
    } catch (error) {
      logger.error('Get business card by mobile error:', error);
      throw error;
    }
  }

  /**
   * Get business card by email
   */
  static async getBusinessCardByEmail(email) {
    try {
      const query = `
        SELECT bc.*, u.profile_photo as user_profile_photo
        FROM business_cards bc
        LEFT JOIN users u ON bc.user_id = u.user_id
        WHERE bc.email = ? AND bc.status = 'active'
      `;
      
      const [rows] = await db.execute(query, [email]);
      
      if (rows.length === 0) {
        return null;
      }
      
      return rows[0];
    } catch (error) {
      logger.error('Get business card by email error:', error);
      throw error;
    }
  }
}

module.exports = BusinessCard;
