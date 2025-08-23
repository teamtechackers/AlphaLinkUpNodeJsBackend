'use strict';

const { query } = require('../config/db');
const { idEncode, idDecode } = require('../utils/idCodec');
const { logger } = require('../utils/logger');

class Job {
  constructor(data = {}) {
    this.job_id = data.job_id;
    this.user_id = data.user_id;
    this.job_title = data.job_title;
    this.company_name = data.company_name;
    this.job_description = data.job_description;
    this.job_type_id = data.job_type_id;
    this.pay_id = data.pay_id;
    this.country_id = data.country_id;
    this.state_id = data.state_id;
    this.city_id = data.city_id;
    this.experience_required = data.experience_required;
    this.salary_min = data.salary_min;
    this.salary_max = data.salary_max;
    this.job_status = data.job_status;
    this.deleted = data.deleted;
    this.created_dts = data.created_dts;
    this.updated_dts = data.updated_dts;
    
    // Joined fields
    this.job_type = data.job_type;
    this.pay = data.pay;
    this.country_name = data.country_name;
    this.state_name = data.state_name;
    this.city_name = data.city_name;
  }

  // Create new job
  static async create(jobData) {
    try {
      const result = await query(
        `INSERT INTO user_job_details (
          user_id, job_title, company_name, job_description, job_type_id,
          pay_id, country_id, state_id, city_id, experience_required,
          salary_min, salary_max, job_status, created_dts
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
        [
          jobData.user_id, jobData.job_title, jobData.company_name,
          jobData.job_description, jobData.job_type_id, jobData.pay_id,
          jobData.country_id, jobData.state_id, jobData.city_id,
          jobData.experience_required, jobData.salary_min, jobData.salary_max,
          jobData.job_status || 'active'
        ]
      );

      return result.insertId;
    } catch (error) {
      logger.error('Error creating job:', error);
      throw error;
    }
  }

  // Find job by ID
  static async findById(jobId) {
    try {
      const [job] = await query(
        `SELECT j.*, 
                jt.name AS job_type, p.name AS pay,
                c.name AS country_name, s.name AS state_name, ci.name AS city_name
         FROM user_job_details j
         JOIN job_type jt ON jt.id = j.job_type_id
         JOIN pay p ON p.id = j.pay_id
         JOIN countries c ON c.id = j.country_id
         JOIN states s ON s.id = j.state_id
         JOIN cities ci ON ci.id = j.city_id
         WHERE j.job_id = ? AND j.deleted = '0'`,
        [jobId]
      );

      return job ? new Job(job) : null;
    } catch (error) {
      logger.error('Error finding job by ID:', error);
      throw error;
    }
  }

  // Get jobs by user ID
  static async findByUserId(userId) {
    try {
      const jobs = await query(
        `SELECT j.*, 
                jt.name AS job_type, p.name AS pay,
                c.name AS country_name, s.name AS state_name, ci.name AS city_name
         FROM user_job_details j
         JOIN job_type jt ON jt.id = j.job_type_id
         JOIN pay p ON p.id = j.pay_id
         JOIN countries c ON c.id = j.country_id
         JOIN states s ON s.id = j.state_id
         JOIN cities ci ON ci.id = j.city_id
         WHERE j.user_id = ? AND j.deleted = '0'
         ORDER BY j.created_dts DESC`,
        [userId]
      );

      return jobs.map(job => new Job(job));
    } catch (error) {
      logger.error('Error finding jobs by user ID:', error);
      throw error;
    }
  }

  // Update job
  async update(updateData) {
    try {
      const result = await query(
        `UPDATE user_job_details SET 
          job_title = ?, company_name = ?, job_description = ?, job_type_id = ?,
          pay_id = ?, country_id = ?, state_id = ?, city_id = ?,
          experience_required = ?, salary_min = ?, salary_max = ?,
          job_status = ?, updated_dts = NOW()
         WHERE job_id = ? AND user_id = ?`,
        [
          updateData.job_title, updateData.company_name, updateData.job_description,
          updateData.job_type_id, updateData.pay_id, updateData.country_id,
          updateData.state_id, updateData.city_id, updateData.experience_required,
          updateData.salary_min, updateData.salary_max, updateData.job_status,
          this.job_id, this.user_id
        ]
      );

      if (result.affectedRows > 0) {
        Object.assign(this, updateData);
        this.updated_dts = new Date();
        return true;
      }

      return false;
    } catch (error) {
      logger.error('Error updating job:', error);
      throw error;
    }
  }

  // Soft delete job
  async softDelete() {
    try {
      const result = await query(
        "UPDATE user_job_details SET deleted = '1', updated_dts = NOW() WHERE job_id = ? AND user_id = ?",
        [this.job_id, this.user_id]
      );

      if (result.affectedRows > 0) {
        this.deleted = '1';
        this.updated_dts = new Date();
        return true;
      }

      return false;
    } catch (error) {
      logger.error('Error soft deleting job:', error);
      throw error;
    }
  }

  // Get job applicants
  static async getApplicants(jobId) {
    try {
      const applicants = await query(
        `SELECT u.user_id, u.full_name, u.email, u.mobile, u.profile_photo,
                uja.email AS application_email, uja.mobile AS application_mobile,
                uja.created_dts AS applied_date,
                ur.resume_file, ur.resume_title
         FROM user_job_applications uja
         JOIN users u ON u.user_id = uja.user_id
         LEFT JOIN user_resumes ur ON ur.resume_id = uja.resume_id
         WHERE uja.job_id = ? AND uja.status = 1
         ORDER BY uja.created_dts DESC`,
        [jobId]
      );

      return applicants;
    } catch (error) {
      logger.error('Error getting job applicants:', error);
      throw error;
    }
  }

  // Apply for a job
  static async applyForJob(applicationData) {
    try {
      const result = await query(
        `INSERT INTO user_job_applications (
          user_id, job_id, resume_id, email, mobile, status, created_dts
        ) VALUES (?, ?, ?, ?, ?, 1, NOW())`,
        [
          applicationData.user_id, applicationData.job_id,
          applicationData.resume_id, applicationData.email,
          applicationData.mobile
        ]
      );

      return result.insertId;
    } catch (error) {
      logger.error('Error applying for job:', error);
      throw error;
    }
  }

  // Check if user already applied for job
  static async hasApplied(userId, jobId) {
    try {
      const [application] = await query(
        'SELECT application_id FROM user_job_applications WHERE user_id = ? AND job_id = ? AND status = 1',
        [userId, jobId]
      );

      return !!application;
    } catch (error) {
      logger.error('Error checking job application:', error);
      throw error;
    }
  }

  // Search jobs
  static async searchJobs(criteria, pagination = { page: 1, limit: 20 }) {
    try {
      const { search, job_type_id, country_id, state_id, city_id, experience_level } = criteria;
      const { page, limit } = pagination;
      const offset = (page - 1) * limit;

      let whereClause = "WHERE j.deleted = '0' AND j.job_status = 'active'";
      let params = [];

      if (search) {
        whereClause += ' AND (j.job_title LIKE ? OR j.company_name LIKE ? OR j.job_description LIKE ?)';
        params.push(`%${search}%`, `%${search}%`, `%${search}%`);
      }

      if (job_type_id) {
        whereClause += ' AND j.job_type_id = ?';
        params.push(job_type_id);
      }

      if (country_id) {
        whereClause += ' AND j.country_id = ?';
        params.push(country_id);
      }

      if (state_id) {
        whereClause += ' AND j.state_id = ?';
        params.push(state_id);
      }

      if (city_id) {
        whereClause += ' AND j.city_id = ?';
        params.push(city_id);
      }

      if (experience_level) {
        whereClause += ' AND j.experience_required <= ?';
        params.push(experience_level);
      }

      const [total] = await query(
        `SELECT COUNT(*) AS total FROM user_job_details j ${whereClause}`,
        params
      );

      const jobs = await query(
        `SELECT j.*, 
                jt.name AS job_type, p.name AS pay,
                c.name AS country_name, s.name AS state_name, ci.name AS city_name,
                u.full_name AS posted_by
         FROM user_job_details j
         JOIN job_type jt ON jt.id = j.job_type_id
         JOIN pay p ON p.id = j.pay_id
         JOIN countries c ON c.id = j.country_id
         JOIN states s ON s.id = j.state_id
         JOIN cities ci ON ci.id = j.city_id
         JOIN users u ON u.user_id = j.user_id
         ${whereClause}
         ORDER BY j.created_dts DESC
         LIMIT ? OFFSET ?`,
        [...params, limit, offset]
      );

      return {
        jobs: jobs.map(job => new Job(job)),
        pagination: {
          page,
          limit,
          total: total.total,
          totalPages: Math.ceil(total.total / limit)
        }
      };
    } catch (error) {
      logger.error('Error searching jobs:', error);
      throw error;
    }
  }

  // Get job statistics
  static async getJobStats(userId = null) {
    try {
      let whereClause = "WHERE deleted = '0'";
      let params = [];

      if (userId) {
        whereClause += ' AND user_id = ?';
        params.push(userId);
      }

      const [stats] = await query(
        `SELECT 
          COUNT(*) AS total_jobs,
          COUNT(CASE WHEN job_status = 'active' THEN 1 END) AS active_jobs,
          COUNT(CASE WHEN job_status = 'closed' THEN 1 END) AS closed_jobs,
          COUNT(CASE WHEN job_status = 'inactive' THEN 1 END) AS inactive_jobs
         FROM user_job_details ${whereClause}`,
        params
      );

      return stats;
    } catch (error) {
      logger.error('Error getting job stats:', error);
      throw error;
    }
  }

  // Get recent jobs
  static async getRecentJobs(limit = 10) {
    try {
      const jobs = await query(
        `SELECT j.*, 
                jt.name AS job_type, p.name AS pay,
                c.name AS country_name, s.name AS state_name, ci.name AS city_name,
                u.full_name AS posted_by
         FROM user_job_details j
         JOIN job_type jt ON jt.id = j.job_type_id
         JOIN pay p ON p.id = j.pay_id
         JOIN countries c ON c.id = j.country_id
         JOIN states s ON s.id = j.state_id
         JOIN cities ci ON ci.id = j.city_id
         JOIN users u ON u.user_id = j.user_id
         WHERE j.deleted = '0' AND j.job_status = 'active'
         ORDER BY j.created_dts DESC
         LIMIT ?`,
        [limit]
      );

      return jobs.map(job => new Job(job));
    } catch (error) {
      logger.error('Error getting recent jobs:', error);
      throw error;
    }
  }

  // Get job by encoded ID
  static async findByEncodedId(encodedId) {
    try {
      const jobId = idDecode(encodedId);
      if (!jobId) return null;
      
      return await Job.findById(jobId);
    } catch (error) {
      logger.error('Error finding job by encoded ID:', error);
      return null;
    }
  }

  // Get encoded job ID for API responses
  getEncodedId() {
    return idEncode(this.job_id);
  }

  // Get public job data (for sharing)
  getPublicData() {
    return {
      job_id: this.getEncodedId(),
      job_title: this.job_title,
      company_name: this.company_name,
      job_description: this.job_description,
      job_type: this.job_type,
      pay: this.pay,
      country_name: this.country_name,
      state_name: this.state_name,
      city_name: this.city_name,
      experience_required: this.experience_required,
      salary_min: this.salary_min,
      salary_max: this.salary_max,
      job_status: this.job_status,
      created_dts: this.created_dts
    };
  }

  // Update job status
  async updateStatus(status) {
    try {
      const result = await query(
        'UPDATE user_job_details SET job_status = ?, updated_dts = NOW() WHERE job_id = ? AND user_id = ?',
        [status, this.job_id, this.user_id]
      );

      if (result.affectedRows > 0) {
        this.job_status = status;
        this.updated_dts = new Date();
        return true;
      }

      return false;
    } catch (error) {
      logger.error('Error updating job status:', error);
      throw error;
    }
  }

  // Get similar jobs
  static async getSimilarJobs(jobId, limit = 5) {
    try {
      const [currentJob] = await query(
        'SELECT job_type_id, country_id, city_id FROM user_job_details WHERE job_id = ?',
        [jobId]
      );

      if (!currentJob) return [];

      const similarJobs = await query(
        `SELECT j.*, 
                jt.name AS job_type, p.name AS pay,
                c.name AS country_name, s.name AS state_name, ci.name AS city_name
         FROM user_job_details j
         JOIN job_type jt ON jt.id = j.job_type_id
         JOIN pay p ON p.id = j.pay_id
         JOIN countries c ON c.id = j.country_id
         JOIN states s ON s.id = j.state_id
         JOIN cities ci ON ci.id = j.city_id
         WHERE j.job_id != ? AND j.deleted = '0' AND j.job_status = 'active'
         AND (j.job_type_id = ? OR j.country_id = ? OR j.city_id = ?)
         ORDER BY j.created_dts DESC
         LIMIT ?`,
        [jobId, currentJob.job_type_id, currentJob.country_id, currentJob.city_id, limit]
      );

      return similarJobs.map(job => new Job(job));
    } catch (error) {
      logger.error('Error getting similar jobs:', error);
      throw error;
    }
  }
}

module.exports = Job;
