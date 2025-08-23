'use strict';

const { query } = require('../config/db');
const { idEncode, idDecode } = require('../utils/idCodec');
const { logger } = require('../utils/logger');

class Education {
  constructor(data = {}) {
    this.education_detail_id = data.education_detail_id;
    this.user_id = data.user_id;
    this.degree = data.degree;
    this.institution = data.institution;
    this.field_of_study = data.field_of_study;
    this.start_date = data.start_date;
    this.end_date = data.end_date;
    this.grade = data.grade;
    this.description = data.description;
    this.status = data.status;
    this.created_dts = data.created_dts;
    this.updated_dts = data.updated_dts;
  }

  // Create new education record
  static async create(educationData) {
    try {
      const result = await query(
        `INSERT INTO user_education_details (
          user_id, degree, institution, field_of_study, start_date, end_date,
          grade, description, status, created_dts
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
        [
          educationData.user_id, educationData.degree, educationData.institution,
          educationData.field_of_study, educationData.start_date, educationData.end_date,
          educationData.grade, educationData.description, educationData.status || 1
        ]
      );

      return result.insertId;
    } catch (error) {
      logger.error('Error creating education record:', error);
      throw error;
    }
  }

  // Find education by ID
  static async findById(educationId) {
    try {
      const [education] = await query(
        'SELECT * FROM user_education_details WHERE education_detail_id = ? AND status = 1',
        [educationId]
      );

      return education ? new Education(education) : null;
    } catch (error) {
      logger.error('Error finding education by ID:', error);
      throw error;
    }
  }

  // Get education records by user ID
  static async findByUserId(userId) {
    try {
      const educationRecords = await query(
        'SELECT * FROM user_education_details WHERE user_id = ? AND status = 1 ORDER BY start_date DESC',
        [userId]
      );

      return educationRecords.map(edu => new Education(edu));
    } catch (error) {
      logger.error('Error finding education by user ID:', error);
      throw error;
    }
  }

  // Update education record
  async update(updateData) {
    try {
      const result = await query(
        `UPDATE user_education_details SET 
          degree = ?, institution = ?, field_of_study = ?, start_date = ?,
          end_date = ?, grade = ?, description = ?, updated_dts = NOW()
         WHERE education_detail_id = ? AND user_id = ?`,
        [
          updateData.degree, updateData.institution, updateData.field_of_study,
          updateData.start_date, updateData.end_date, updateData.grade,
          updateData.description, this.education_detail_id, this.user_id
        ]
      );

      if (result.affectedRows > 0) {
        Object.assign(this, updateData);
        this.updated_dts = new Date();
        return true;
      }

      return false;
    } catch (error) {
      logger.error('Error updating education record:', error);
      throw error;
    }
  }

  // Soft delete education record
  async softDelete() {
    try {
      const result = await query(
        'UPDATE user_education_details SET status = 0, updated_dts = NOW() WHERE education_detail_id = ? AND user_id = ?',
        [this.education_detail_id, this.user_id]
      );

      if (result.affectedRows > 0) {
        this.status = 0;
        this.updated_dts = new Date();
        return true;
      }

      return false;
    } catch (error) {
      logger.error('Error soft deleting education record:', error);
      throw error;
    }
  }

  // Get education statistics for a user
  static async getEducationStats(userId) {
    try {
      const [stats] = await query(
        `SELECT 
          COUNT(*) AS total_education,
          COUNT(CASE WHEN end_date IS NULL THEN 1 END) AS ongoing_education,
          COUNT(CASE WHEN end_date IS NOT NULL THEN 1 END) AS completed_education,
          MIN(start_date) AS earliest_education,
          MAX(end_date) AS latest_education
         FROM user_education_details 
         WHERE user_id = ? AND status = 1`,
        [userId]
      );

      return stats;
    } catch (error) {
      logger.error('Error getting education stats:', error);
      throw error;
    }
  }

  // Get education by encoded ID
  static async findByEncodedId(encodedId) {
    try {
      const educationId = idDecode(encodedId);
      if (!educationId) return null;
      
      return await Education.findById(educationId);
    } catch (error) {
      logger.error('Error finding education by encoded ID:', error);
      return null;
    }
  }

  // Get encoded education ID for API responses
  getEncodedId() {
    return idEncode(this.education_detail_id);
  }

  // Get public education data (for sharing)
  getPublicData() {
    return {
      education_detail_id: this.getEncodedId(),
      degree: this.degree,
      institution: this.institution,
      field_of_study: this.field_of_study,
      start_date: this.start_date,
      end_date: this.end_date,
      grade: this.grade,
      description: this.description,
      created_dts: this.created_dts
    };
  }

  // Check if education is ongoing
  isOngoing() {
    return !this.end_date;
  }

  // Get education duration in years
  getDuration() {
    if (!this.start_date) return 0;
    
    const start = new Date(this.start_date);
    const end = this.end_date ? new Date(this.end_date) : new Date();
    
    const diffTime = Math.abs(end - start);
    const diffYears = Math.ceil(diffTime / (1000 * 60 * 60 * 24 * 365));
    
    return diffYears;
  }

  // Get formatted date range
  getFormattedDateRange() {
    if (!this.start_date) return 'N/A';
    
    const start = new Date(this.start_date).getFullYear();
    const end = this.end_date ? new Date(this.end_date).getFullYear() : 'Present';
    
    return `${start} - ${end}`;
  }

  // Validate education dates
  static validateDates(startDate, endDate) {
    if (!startDate) return false;
    
    const start = new Date(startDate);
    const end = endDate ? new Date(endDate) : null;
    
    if (end && start >= end) return false;
    
    return true;
  }
}

module.exports = Education;
