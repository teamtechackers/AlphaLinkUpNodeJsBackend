'use strict';

const { query } = require('../config/db');
const { idEncode, idDecode } = require('../utils/idCodec');
const { logger } = require('../utils/logger');

class WorkExperience {
  constructor(data = {}) {
    this.work_detail_id = data.work_detail_id;
    this.user_id = data.user_id;
    this.company_name = data.company_name;
    this.job_title = data.job_title;
    this.job_description = data.job_description;
    this.start_date = data.start_date;
    this.end_date = data.end_date;
    this.is_current_job = data.is_current_job || 0;
    this.country_id = data.country_id;
    this.state_id = data.state_id;
    this.city_id = data.city_id;
    this.status = data.status;
    this.created_dts = data.created_dts;
    this.updated_dts = data.updated_dts;
    
    // Joined fields
    this.country_name = data.country_name;
    this.state_name = data.state_name;
    this.city_name = data.city_name;
  }

  // Create new work experience record
  static async create(workData) {
    try {
      const result = await query(
        `INSERT INTO user_work_details (
          user_id, company_name, job_title, job_description, start_date, end_date,
          is_current_job, country_id, state_id, city_id, status, created_dts
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
        [
          workData.user_id, workData.company_name, workData.job_title,
          workData.job_description, workData.start_date, workData.end_date,
          workData.is_current_job || 0, workData.country_id, workData.state_id,
          workData.city_id, workData.status || 1
        ]
      );

      return result.insertId;
    } catch (error) {
      logger.error('Error creating work experience record:', error);
      throw error;
    }
  }

  // Find work experience by ID
  static async findById(workId) {
    try {
      const [work] = await query(
        `SELECT w.*, 
                c.name AS country_name, s.name AS state_name, ci.name AS city_name
         FROM user_work_details w
         LEFT JOIN countries c ON c.id = w.country_id
         LEFT JOIN states s ON s.id = w.state_id
         LEFT JOIN cities ci ON ci.id = w.city_id
         WHERE w.work_detail_id = ? AND w.status = 1`,
        [workId]
      );

      return work ? new WorkExperience(work) : null;
    } catch (error) {
      logger.error('Error finding work experience by ID:', error);
      throw error;
    }
  }

  // Get work experience records by user ID
  static async findByUserId(userId) {
    try {
      const workRecords = await query(
        `SELECT w.*, 
                c.name AS country_name, s.name AS state_name, ci.name AS city_name
         FROM user_work_details w
         LEFT JOIN countries c ON c.id = w.country_id
         LEFT JOIN states s ON s.id = w.state_id
         LEFT JOIN cities ci ON ci.id = w.city_id
         WHERE w.user_id = ? AND w.status = 1
         ORDER BY w.start_date DESC`,
        [userId]
      );

      return workRecords.map(work => new WorkExperience(work));
    } catch (error) {
      logger.error('Error finding work experience by user ID:', error);
      throw error;
    }
  }

  // Update work experience record
  async update(updateData) {
    try {
      const result = await query(
        `UPDATE user_work_details SET 
          company_name = ?, job_title = ?, job_description = ?, start_date = ?,
          end_date = ?, is_current_job = ?, country_id = ?, state_id = ?, city_id = ?,
          updated_dts = NOW()
         WHERE work_detail_id = ? AND user_id = ?`,
        [
          updateData.company_name, updateData.job_title, updateData.job_description,
          updateData.start_date, updateData.end_date, updateData.is_current_job,
          updateData.country_id, updateData.state_id, updateData.city_id,
          this.work_detail_id, this.user_id
        ]
      );

      if (result.affectedRows > 0) {
        Object.assign(this, updateData);
        this.updated_dts = new Date();
        return true;
      }

      return false;
    } catch (error) {
      logger.error('Error updating work experience record:', error);
      throw error;
    }
  }

  // Soft delete work experience record
  async softDelete() {
    try {
      const result = await query(
        'UPDATE user_work_details SET status = 0, updated_dts = NOW() WHERE work_detail_id = ? AND user_id = ?',
        [this.work_detail_id, this.user_id]
      );

      if (result.affectedRows > 0) {
        this.status = 0;
        this.updated_dts = new Date();
        return true;
      }

      return false;
    } catch (error) {
      logger.error('Error soft deleting work experience record:', error);
      throw error;
    }
  }

  // Get current job for a user
  static async getCurrentJob(userId) {
    try {
      const [currentJob] = await query(
        `SELECT w.*, 
                c.name AS country_name, s.name AS state_name, ci.name AS city_name
         FROM user_work_details w
         LEFT JOIN countries c ON c.id = w.country_id
         LEFT JOIN states s ON s.id = w.state_id
         LEFT JOIN cities ci ON ci.id = w.city_id
         WHERE w.user_id = ? AND w.is_current_job = 1 AND w.status = 1`,
        [userId]
      );

      return currentJob ? new WorkExperience(currentJob) : null;
    } catch (error) {
      logger.error('Error getting current job:', error);
      throw error;
    }
  }

  // Update current job status
  static async updateCurrentJobStatus(userId, workId) {
    try {
      // First, remove current job status from all other records
      await query(
        'UPDATE user_work_details SET is_current_job = 0, updated_dts = NOW() WHERE user_id = ? AND work_detail_id != ?',
        [userId, workId]
      );

      // Then, set the specified record as current job
      const result = await query(
        'UPDATE user_work_details SET is_current_job = 1, updated_dts = NOW() WHERE work_detail_id = ? AND user_id = ?',
        [workId, userId]
      );

      return result.affectedRows > 0;
    } catch (error) {
      logger.error('Error updating current job status:', error);
      throw error;
    }
  }

  // Get work experience statistics for a user
  static async getWorkStats(userId) {
    try {
      const [stats] = await query(
        `SELECT 
          COUNT(*) AS total_experience,
          COUNT(CASE WHEN is_current_job = 1 THEN 1 END) AS current_jobs,
          COUNT(CASE WHEN is_current_job = 0 THEN 1 END) AS past_jobs,
          MIN(start_date) AS earliest_experience,
          MAX(end_date) AS latest_experience
         FROM user_work_details 
         WHERE user_id = ? AND status = 1`,
        [userId]
      );

      return stats;
    } catch (error) {
      logger.error('Error getting work experience stats:', error);
      throw error;
    }
  }

  // Calculate total work experience in years
  static async getTotalExperienceYears(userId) {
    try {
      const workRecords = await query(
        'SELECT start_date, end_date, is_current_job FROM user_work_details WHERE user_id = ? AND status = 1',
        [userId]
      );

      let totalYears = 0;
      const now = new Date();

      for (const record of workRecords) {
        const start = new Date(record.start_date);
        const end = record.is_current_job ? now : new Date(record.end_date);
        
        if (start && end) {
          const diffTime = Math.abs(end - start);
          const diffYears = diffTime / (1000 * 60 * 60 * 24 * 365);
          totalYears += diffYears;
        }
      }

      return Math.round(totalYears * 10) / 10; // Round to 1 decimal place
    } catch (error) {
      logger.error('Error calculating total experience years:', error);
      throw error;
    }
  }

  // Search work experience by criteria
  static async searchWorkExperience(userId, criteria, pagination = { page: 1, limit: 20 }) {
    try {
      const { company_name, job_title, country_id, state_id, city_id } = criteria;
      const { page, limit } = pagination;
      const offset = (page - 1) * limit;

      let whereClause = 'WHERE w.user_id = ? AND w.status = 1';
      let params = [userId];

      if (company_name) {
        whereClause += ' AND w.company_name LIKE ?';
        params.push(`%${company_name}%`);
      }

      if (job_title) {
        whereClause += ' AND w.job_title LIKE ?';
        params.push(`%${job_title}%`);
      }

      if (country_id) {
        whereClause += ' AND w.country_id = ?';
        params.push(country_id);
      }

      if (state_id) {
        whereClause += ' AND w.state_id = ?';
        params.push(state_id);
      }

      if (city_id) {
        whereClause += ' AND w.city_id = ?';
        params.push(city_id);
      }

      const [total] = await query(
        `SELECT COUNT(*) AS total FROM user_work_details w ${whereClause}`,
        params
      );

      const workRecords = await query(
        `SELECT w.*, 
                c.name AS country_name, s.name AS state_name, ci.name AS city_name
         FROM user_work_details w
         LEFT JOIN countries c ON c.id = w.country_id
         LEFT JOIN states s ON s.id = w.state_id
         LEFT JOIN cities ci ON ci.id = w.city_id
         ${whereClause}
         ORDER BY w.start_date DESC
         LIMIT ? OFFSET ?`,
        [...params, limit, offset]
      );

      return {
        workRecords: workRecords.map(work => new WorkExperience(work)),
        pagination: {
          page,
          limit,
          total: total.total,
          totalPages: Math.ceil(total.total / limit)
        }
      };
    } catch (error) {
      logger.error('Error searching work experience:', error);
      throw error;
    }
  }

  // Get work experience by encoded ID
  static async findByEncodedId(encodedId) {
    try {
      const workId = idDecode(encodedId);
      if (!workId) return null;
      
      return await WorkExperience.findById(workId);
    } catch (error) {
      logger.error('Error finding work experience by encoded ID:', error);
      return null;
    }
  }

  // Get encoded work experience ID for API responses
  getEncodedId() {
    return idEncode(this.work_detail_id);
  }

  // Get public work experience data (for sharing)
  getPublicData() {
    return {
      work_detail_id: this.getEncodedId(),
      company_name: this.company_name,
      job_title: this.job_title,
      job_description: this.job_description,
      start_date: this.start_date,
      end_date: this.end_date,
      is_current_job: this.is_current_job,
      country_name: this.country_name,
      state_name: this.state_name,
      city_name: this.city_name,
      created_dts: this.created_dts
    };
  }

  // Check if work experience is current
  isCurrent() {
    return this.is_current_job === 1;
  }

  // Get work duration in years
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
    const end = this.is_current_job ? 'Present' : (this.end_date ? new Date(this.end_date).getFullYear() : 'N/A');
    
    return `${start} - ${end}`;
  }

  // Validate work experience dates
  static validateDates(startDate, endDate, isCurrentJob) {
    if (!startDate) return false;
    
    const start = new Date(startDate);
    const end = endDate ? new Date(endDate) : null;
    
    if (!isCurrentJob && end && start >= end) return false;
    
    return true;
  }

  // Get work experience summary
  static async getWorkSummary(userId) {
    try {
      const summary = await query(
        `SELECT 
          COUNT(*) AS total_positions,
          COUNT(CASE WHEN is_current_job = 1 THEN 1 END) AS current_position,
          GROUP_CONCAT(DISTINCT company_name) AS companies_worked,
          GROUP_CONCAT(DISTINCT job_title) AS job_titles
         FROM user_work_details 
         WHERE user_id = ? AND status = 1`,
        [userId]
      );

      return summary[0];
    } catch (error) {
      logger.error('Error getting work summary:', error);
      throw error;
    }
  }
}

module.exports = WorkExperience;
