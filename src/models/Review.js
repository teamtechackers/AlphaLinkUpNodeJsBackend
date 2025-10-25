'use strict';

const { query } = require('../config/db');
const { idEncode, idDecode } = require('../utils/idCodec');
const { logger } = require('../utils/logger');

class Review {
  constructor(data = {}) {
    this.review_id = data.review_id;
    this.user_id = data.user_id;
    this.service_id = data.service_id;
    this.investor_id = data.investor_id;
    this.rating = data.rating;
    this.review = data.review;
    this.review_type = data.review_type || 'service'; // 'service' or 'investor'
    this.status = data.status;
    this.created_dts = data.created_dts;
    this.updated_dts = data.updated_dts;
    
    // Joined fields
    this.user_name = data.user_name;
    this.user_photo = data.user_photo;
    this.service_name = data.service_name;
    this.investor_name = data.investor_name;
  }

  // Create new review
  static async create(reviewData) {
    try {
      const result = await query(
        `INSERT INTO user_reviews (
          user_id, service_id, investor_id, rating, review, review_type, status, created_dts
        ) VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
        [
          reviewData.user_id, reviewData.service_id, reviewData.investor_id,
          reviewData.rating, reviewData.review, reviewData.review_type || 'service',
          reviewData.status || 1
        ]
      );

      return result.insertId;
    } catch (error) {
      logger.error('Error creating review:', error);
      throw error;
    }
  }

  // Find review by ID
  static async findById(reviewId) {
    try {
      const [review] = await query(
        `SELECT r.*, 
                u.full_name AS user_name, u.profile_photo AS user_photo
         FROM user_reviews r
         JOIN users u ON u.user_id = r.user_id
         WHERE r.review_id = ? AND r.status = 1`,
        [reviewId]
      );

      return review ? new Review(review) : null;
    } catch (error) {
      logger.error('Error finding review by ID:', error);
      throw error;
    }
  }

  // Get reviews by service ID
  static async findByServiceId(serviceId, pagination = { page: 1, limit: 20 }) {
    try {
      const { page, limit } = pagination;
      const offset = (page - 1) * limit;

      const [total] = await query(
        'SELECT COUNT(*) AS total FROM user_reviews WHERE service_id = ? AND status = 1',
        [serviceId]
      );

      const reviews = await query(
        `SELECT r.*, 
                u.full_name AS user_name, u.profile_photo AS user_photo
         FROM user_reviews r
         JOIN users u ON u.user_id = r.user_id
         WHERE r.service_id = ? AND r.status = 1
         ORDER BY r.created_dts DESC
         LIMIT ? OFFSET ?`,
        [serviceId, limit, offset]
      );

      return {
        reviews: reviews.map(review => new Review(review)),
        pagination: {
          page,
          limit,
          total: total.total,
          totalPages: Math.ceil(total.total / limit)
        }
      };
    } catch (error) {
      logger.error('Error finding reviews by service ID:', error);
      throw error;
    }
  }

  // Get reviews by investor ID
  static async findByInvestorId(investorId, pagination = { page: 1, limit: 20 }) {
    try {
      const { page, limit } = pagination;
      const offset = (page - 1) * limit;

      const [total] = await query(
        'SELECT COUNT(*) AS total FROM user_reviews WHERE investor_id = ? AND status = 1',
        [investorId]
      );

      const reviews = await query(
        `SELECT r.*, 
                u.full_name AS user_name, u.profile_photo AS user_photo
         FROM user_reviews r
         JOIN users u ON u.user_id = r.user_id
         WHERE r.investor_id = ? AND r.status = 1
         ORDER BY r.created_dts DESC
         LIMIT ? OFFSET ?`,
        [investorId, limit, offset]
      );

      return {
        reviews: reviews.map(review => new Review(review)),
        pagination: {
          page,
          limit,
          total: total.total,
          totalPages: Math.ceil(total.total / limit)
        }
      };
    } catch (error) {
      logger.error('Error finding reviews by investor ID:', error);
      throw error;
    }
  }

  // Get reviews by user ID
  static async findByUserId(userId, pagination = { page: 1, limit: 20 }) {
    try {
      const { page, limit } = pagination;
      const offset = (page - 1) * limit;

      const [total] = await query(
        'SELECT COUNT(*) AS total FROM user_reviews WHERE user_id = ? AND status = 1',
        [userId]
      );

      const reviews = await query(
        `SELECT r.*, 
                CASE 
                  WHEN r.review_type = 'service' THEN usps.name
                  WHEN r.review_type = 'investor' THEN i.company_name
                END AS reviewed_item_name
         FROM user_reviews r
         LEFT JOIN user_service_provider_services usps ON usps.usps_id = r.service_id AND r.review_type = 'service'
         LEFT JOIN user_investor i ON i.investor_id = r.investor_id AND r.review_type = 'investor'
         WHERE r.user_id = ? AND r.status = 1
         ORDER BY r.created_dts DESC
         LIMIT ? OFFSET ?`,
        [userId, limit, offset]
      );

      return {
        reviews: reviews.map(review => new Review(review)),
        pagination: {
          page,
          limit,
          total: total.total,
          totalPages: Math.ceil(total.total / limit)
        }
      };
    } catch (error) {
      logger.error('Error finding reviews by user ID:', error);
      throw error;
    }
  }

  // Update review
  async update(updateData) {
    try {
      const result = await query(
        `UPDATE user_reviews SET 
          rating = ?, review = ?, updated_dts = NOW()
         WHERE review_id = ? AND user_id = ?`,
        [updateData.rating, updateData.review, this.review_id, this.user_id]
      );

      if (result.affectedRows > 0) {
        Object.assign(this, updateData);
        this.updated_dts = new Date();
        return true;
      }

      return false;
    } catch (error) {
      logger.error('Error updating review:', error);
      throw error;
    }
  }

  // Soft delete review
  async softDelete() {
    try {
      const result = await query(
        'UPDATE user_reviews SET status = 0, updated_dts = NOW() WHERE review_id = ? AND user_id = ?',
        [this.review_id, this.user_id]
      );

      if (result.affectedRows > 0) {
        this.status = 0;
        this.updated_dts = new Date();
        return true;
      }

      return false;
    } catch (error) {
      logger.error('Error soft deleting review:', error);
      throw error;
    }
  }

  // Check if user has already reviewed
  static async hasUserReviewed(userId, serviceId = null, investorId = null) {
    try {
      let whereClause = 'WHERE user_id = ? AND status = 1';
      let params = [userId];

      if (serviceId) {
        whereClause += ' AND service_id = ?';
        params.push(serviceId);
      }

      if (investorId) {
        whereClause += ' AND investor_id = ?';
        params.push(investorId);
      }

      const [review] = await query(
        `SELECT review_id FROM user_reviews ${whereClause}`,
        params
      );

      return !!review;
    } catch (error) {
      logger.error('Error checking if user has reviewed:', error);
      throw error;
    }
  }

  // Get average rating for a service
  static async getAverageRatingForService(serviceId) {
    try {
      const [result] = await query(
        'SELECT AVG(rating) AS average_rating, COUNT(*) AS total_reviews FROM user_reviews WHERE service_id = ? AND status = 1',
        [serviceId]
      );

      return {
        average_rating: result.average_rating ? parseFloat(result.average_rating).toFixed(1) : 0,
        total_reviews: result.total_reviews
      };
    } catch (error) {
      logger.error('Error getting average rating for service:', error);
      throw error;
    }
  }

  // Get average rating for an investor
  static async getAverageRatingForInvestor(investorId) {
    try {
      const [result] = await query(
        'SELECT AVG(rating) AS average_rating, COUNT(*) AS total_reviews FROM user_reviews WHERE investor_id = ? AND status = 1',
        [investorId]
      );

      return {
        average_rating: result.average_rating ? parseFloat(result.average_rating).toFixed(1) : 0,
        total_reviews: result.total_reviews
      };
    } catch (error) {
      logger.error('Error getting average rating for investor:', error);
      throw error;
    }
  }

  // Get rating distribution for a service
  static async getRatingDistributionForService(serviceId) {
    try {
      const distribution = await query(
        `SELECT rating, COUNT(*) AS count
         FROM user_reviews 
         WHERE service_id = ? AND status = 1
         GROUP BY rating
         ORDER BY rating DESC`,
        [serviceId]
      );

      return distribution;
    } catch (error) {
      logger.error('Error getting rating distribution for service:', error);
      throw error;
    }
  }

  // Get rating distribution for an investor
  static async getRatingDistributionForInvestor(investorId) {
    try {
      const distribution = await query(
        `SELECT rating, COUNT(*) AS count
         FROM user_reviews 
         WHERE investor_id = ? AND status = 1
         GROUP BY rating
         ORDER BY rating DESC`,
        [investorId]
      );

      return distribution;
    } catch (error) {
      logger.error('Error getting rating distribution for investor:', error);
      throw error;
    }
  }

  // Get recent reviews
  static async getRecentReviews(limit = 10) {
    try {
      const reviews = await query(
        `SELECT r.*, 
                u.full_name AS user_name, u.profile_photo AS user_photo,
                CASE 
                  WHEN r.review_type = 'service' THEN usps.name
                  WHEN r.review_type = 'investor' THEN i.company_name
                END AS reviewed_item_name
         FROM user_reviews r
         JOIN users u ON u.user_id = r.user_id
         LEFT JOIN user_service_provider_services usps ON usps.usps_id = r.service_id AND r.review_type = 'service'
         LEFT JOIN user_investor i ON i.investor_id = r.investor_id AND r.review_type = 'investor'
         WHERE r.status = 1
         ORDER BY r.created_dts DESC
         LIMIT ?`,
        [limit]
      );

      return reviews.map(review => new Review(review));
    } catch (error) {
      logger.error('Error getting recent reviews:', error);
      throw error;
    }
  }

  // Search reviews
  static async searchReviews(criteria, pagination = { page: 1, limit: 20 }) {
    try {
      const { search, rating, review_type, user_id } = criteria;
      const { page, limit } = pagination;
      const offset = (page - 1) * limit;

      let whereClause = 'WHERE r.status = 1';
      let params = [];

      if (search) {
        whereClause += ' AND r.review LIKE ?';
        params.push(`%${search}%`);
      }

      if (rating) {
        whereClause += ' AND r.rating = ?';
        params.push(rating);
      }

      if (review_type) {
        whereClause += ' AND r.review_type = ?';
        params.push(review_type);
      }

      if (user_id) {
        whereClause += ' AND r.user_id = ?';
        params.push(user_id);
      }

      const [total] = await query(
        `SELECT COUNT(*) AS total FROM user_reviews r ${whereClause}`,
        params
      );

      const reviews = await query(
        `SELECT r.*, 
                u.full_name AS user_name, u.profile_photo AS user_photo,
                CASE 
                  WHEN r.review_type = 'service' THEN usps.name
                  WHEN r.review_type = 'investor' THEN i.company_name
                END AS reviewed_item_name
         FROM user_reviews r
         JOIN users u ON u.user_id = r.user_id
         LEFT JOIN user_service_provider_services usps ON usps.usps_id = r.service_id AND r.review_type = 'service'
         LEFT JOIN user_investor i ON i.investor_id = r.investor_id AND r.review_type = 'investor'
         ${whereClause}
         ORDER BY r.created_dts DESC
         LIMIT ? OFFSET ?`,
        [...params, limit, offset]
      );

      return {
        reviews: reviews.map(review => new Review(review)),
        pagination: {
          page,
          limit,
          total: total.total,
          totalPages: Math.ceil(total.total / limit)
        }
      };
    } catch (error) {
      logger.error('Error searching reviews:', error);
      throw error;
    }
  }

  // Get review statistics
  static async getReviewStats(userId = null) {
    try {
      let whereClause = 'WHERE status = 1';
      let params = [];

      if (userId) {
        whereClause += ' AND user_id = ?';
        params.push(userId);
      }

      const [stats] = await query(
        `SELECT 
          COUNT(*) AS total_reviews,
          AVG(rating) AS average_rating,
          COUNT(CASE WHEN rating = 5 THEN 1 END) AS five_star,
          COUNT(CASE WHEN rating = 4 THEN 1 END) AS four_star,
          COUNT(CASE WHEN rating = 3 THEN 1 END) AS three_star,
          COUNT(CASE WHEN rating = 2 THEN 1 END) AS two_star,
          COUNT(CASE WHEN rating = 1 THEN 1 END) AS one_star
         FROM user_reviews ${whereClause}`,
        params
      );

      return {
        ...stats,
        average_rating: stats.average_rating ? parseFloat(stats.average_rating).toFixed(1) : 0
      };
    } catch (error) {
      logger.error('Error getting review stats:', error);
      throw error;
    }
  }

  // Get review by encoded ID
  static async findByEncodedId(encodedId) {
    try {
      const reviewId = idDecode(encodedId);
      if (!reviewId) return null;
      
      return await Review.findById(reviewId);
    } catch (error) {
      logger.error('Error finding review by encoded ID:', error);
      return null;
    }
  }

  // Get encoded review ID for API responses
  getEncodedId() {
    return idEncode(this.review_id);
  }

  // Get public review data (for sharing)
  getPublicData() {
    return {
      review_id: this.getEncodedId(),
      user_id: this.user_id,
      service_id: this.service_id,
      investor_id: this.investor_id,
      rating: this.rating,
      review: this.review,
      review_type: this.review_type,
      user_name: this.user_name,
      user_photo: this.user_photo,
      created_dts: this.created_dts
    };
  }

  // Validate rating
  static validateRating(rating) {
    return rating >= 1 && rating <= 5 && Number.isInteger(rating);
  }

  // Get star rating display
  getStarRating() {
    const stars = '★'.repeat(this.rating) + '☆'.repeat(5 - this.rating);
    return stars;
  }

  // Get rating text
  getRatingText() {
    const ratingTexts = {
      1: 'Poor',
      2: 'Fair',
      3: 'Good',
      4: 'Very Good',
      5: 'Excellent'
    };
    return ratingTexts[this.rating] || 'Unknown';
  }

  // Check if user can edit review
  canEdit(userId) {
    // Users can only edit their own reviews
    return this.user_id === userId;
  }

  // Check if user can delete review
  canDelete(userId) {
    // Users can only delete their own reviews
    return this.user_id === userId;
  }
}

module.exports = Review;
