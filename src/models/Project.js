'use strict';

const { query } = require('../config/db');
const { idEncode, idDecode } = require('../utils/idCodec');
const { logger } = require('../utils/logger');

class Project {
  constructor(data = {}) {
    this.project_detail_id = data.project_detail_id;
    this.user_id = data.user_id;
    this.project_title = data.project_title;
    this.project_description = data.project_description;
    this.project_logo = data.project_logo;
    this.project_url = data.project_url;
    this.technologies_used = data.technologies_used;
    this.start_date = data.start_date;
    this.end_date = data.end_date;
    this.is_ongoing = data.is_ongoing || 0;
    this.status = data.status;
    this.created_dts = data.created_dts;
    this.updated_dts = data.updated_dts;
  }

  // Create new project
  static async create(projectData) {
    try {
      const result = await query(
        `INSERT INTO user_project_details (
          user_id, project_title, project_description, project_logo, project_url,
          technologies_used, start_date, end_date, is_ongoing, status, created_dts
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
        [
          projectData.user_id, projectData.project_title, projectData.project_description,
          projectData.project_logo, projectData.project_url, projectData.technologies_used,
          projectData.start_date, projectData.end_date, projectData.is_ongoing || 0,
          projectData.status || 1
        ]
      );

      return result.insertId;
    } catch (error) {
      logger.error('Error creating project:', error);
      throw error;
    }
  }

  // Find project by ID
  static async findById(projectId) {
    try {
      const [project] = await query(
        'SELECT * FROM user_project_details WHERE project_detail_id = ? AND status = 1',
        [projectId]
      );

      return project ? new Project(project) : null;
    } catch (error) {
      logger.error('Error finding project by ID:', error);
      throw error;
    }
  }

  // Get projects by user ID
  static async findByUserId(userId) {
    try {
      const projects = await query(
        'SELECT * FROM user_project_details WHERE user_id = ? AND status = 1 ORDER BY start_date DESC',
        [userId]
      );

      return projects.map(project => new Project(project));
    } catch (error) {
      logger.error('Error finding projects by user ID:', error);
      throw error;
    }
  }

  // Update project
  async update(updateData) {
    try {
      const result = await query(
        `UPDATE user_project_details SET 
          project_title = ?, project_description = ?, project_logo = ?, project_url = ?,
          technologies_used = ?, start_date = ?, end_date = ?, is_ongoing = ?,
          updated_dts = NOW()
         WHERE project_detail_id = ? AND user_id = ?`,
        [
          updateData.project_title, updateData.project_description, updateData.project_logo,
          updateData.project_url, updateData.technologies_used, updateData.start_date,
          updateData.end_date, updateData.is_ongoing, this.project_detail_id, this.user_id
        ]
      );

      if (result.affectedRows > 0) {
        Object.assign(this, updateData);
        this.updated_dts = new Date();
        return true;
      }

      return false;
    } catch (error) {
      logger.error('Error updating project:', error);
      throw error;
    }
  }

  // Soft delete project
  async softDelete() {
    try {
      const result = await query(
        'UPDATE user_project_details SET status = 0, updated_dts = NOW() WHERE project_detail_id = ? AND user_id = ?',
        [this.project_detail_id, this.user_id]
      );

      if (result.affectedRows > 0) {
        this.status = 0;
        this.updated_dts = new Date();
        return true;
      }

      return false;
    } catch (error) {
      logger.error('Error soft deleting project:', error);
      throw error;
    }
  }

  // Update project logo
  async updateLogo(logoPath) {
    try {
      const result = await query(
        'UPDATE user_project_details SET project_logo = ?, updated_dts = NOW() WHERE project_detail_id = ? AND user_id = ?',
        [logoPath, this.project_detail_id, this.user_id]
      );

      if (result.affectedRows > 0) {
        this.project_logo = logoPath;
        this.updated_dts = new Date();
        return true;
      }

      return false;
    } catch (error) {
      logger.error('Error updating project logo:', error);
      throw error;
    }
  }

  // Get ongoing projects for a user
  static async getOngoingProjects(userId) {
    try {
      const projects = await query(
        'SELECT * FROM user_project_details WHERE user_id = ? AND is_ongoing = 1 AND status = 1 ORDER BY start_date DESC',
        [userId]
      );

      return projects.map(project => new Project(project));
    } catch (error) {
      logger.error('Error getting ongoing projects:', error);
      throw error;
    }
  }

  // Get completed projects for a user
  static async getCompletedProjects(userId) {
    try {
      const projects = await query(
        'SELECT * FROM user_project_details WHERE user_id = ? AND is_ongoing = 0 AND status = 1 ORDER BY end_date DESC',
        [userId]
      );

      return projects.map(project => new Project(project));
    } catch (error) {
      logger.error('Error getting completed projects:', error);
      throw error;
    }
  }

  // Search projects by criteria
  static async searchProjects(userId, criteria, pagination = { page: 1, limit: 20 }) {
    try {
      const { search, technologies, is_ongoing, start_date_from, start_date_to } = criteria;
      const { page, limit } = pagination;
      const offset = (page - 1) * limit;

      let whereClause = 'WHERE user_id = ? AND status = 1';
      let params = [userId];

      if (search) {
        whereClause += ' AND (project_title LIKE ? OR project_description LIKE ?)';
        params.push(`%${search}%`, `%${search}%`);
      }

      if (technologies) {
        whereClause += ' AND technologies_used LIKE ?';
        params.push(`%${technologies}%`);
      }

      if (is_ongoing !== undefined) {
        whereClause += ' AND is_ongoing = ?';
        params.push(is_ongoing);
      }

      if (start_date_from) {
        whereClause += ' AND start_date >= ?';
        params.push(start_date_from);
      }

      if (start_date_to) {
        whereClause += ' AND start_date <= ?';
        params.push(start_date_to);
      }

      const [total] = await query(
        `SELECT COUNT(*) AS total FROM user_project_details ${whereClause}`,
        params
      );

      const projects = await query(
        `SELECT * FROM user_project_details ${whereClause}
         ORDER BY start_date DESC
         LIMIT ? OFFSET ?`,
        [...params, limit, offset]
      );

      return {
        projects: projects.map(project => new Project(project)),
        pagination: {
          page,
          limit,
          total: total.total,
          totalPages: Math.ceil(total.total / limit)
        }
      };
    } catch (error) {
      logger.error('Error searching projects:', error);
      throw error;
    }
  }

  // Get project statistics for a user
  static async getProjectStats(userId) {
    try {
      const [stats] = await query(
        `SELECT 
          COUNT(*) AS total_projects,
          COUNT(CASE WHEN is_ongoing = 1 THEN 1 END) AS ongoing_projects,
          COUNT(CASE WHEN is_ongoing = 0 THEN 1 END) AS completed_projects,
          MIN(start_date) AS earliest_project,
          MAX(end_date) AS latest_project
         FROM user_project_details 
         WHERE user_id = ? AND status = 1`,
        [userId]
      );

      return stats;
    } catch (error) {
      logger.error('Error getting project stats:', error);
      throw error;
    }
  }

  // Get projects by technology
  static async getProjectsByTechnology(userId, technology) {
    try {
      const projects = await query(
        'SELECT * FROM user_project_details WHERE user_id = ? AND technologies_used LIKE ? AND status = 1 ORDER BY start_date DESC',
        [userId, `%${technology}%`]
      );

      return projects.map(project => new Project(project));
    } catch (error) {
      logger.error('Error getting projects by technology:', error);
      throw error;
    }
  }

  // Get recent projects
  static async getRecentProjects(userId, limit = 5) {
    try {
      const projects = await query(
        'SELECT * FROM user_project_details WHERE user_id = ? AND status = 1 ORDER BY created_dts DESC LIMIT ?',
        [userId, limit]
      );

      return projects.map(project => new Project(project));
    } catch (error) {
      logger.error('Error getting recent projects:', error);
      throw error;
    }
  }

  // Get project by encoded ID
  static async findByEncodedId(encodedId) {
    try {
      const projectId = idDecode(encodedId);
      if (!projectId) return null;
      
      return await Project.findById(projectId);
    } catch (error) {
      logger.error('Error finding project by encoded ID:', error);
      return null;
    }
  }

  // Get encoded project ID for API responses
  getEncodedId() {
    return idEncode(this.project_detail_id);
  }

  // Get public project data (for sharing)
  getPublicData() {
    return {
      project_detail_id: this.getEncodedId(),
      project_title: this.project_title,
      project_description: this.project_description,
      project_logo: this.project_logo,
      project_url: this.project_url,
      technologies_used: this.technologies_used,
      start_date: this.start_date,
      end_date: this.end_date,
      is_ongoing: this.is_ongoing,
      created_dts: this.created_dts
    };
  }

  // Check if project is ongoing
  isOngoing() {
    return this.is_ongoing === 1;
  }

  // Get project duration in months
  getDuration() {
    if (!this.start_date) return 0;
    
    const start = new Date(this.start_date);
    const end = this.end_date ? new Date(this.end_date) : new Date();
    
    const diffTime = Math.abs(end - start);
    const diffMonths = Math.ceil(diffTime / (1000 * 60 * 60 * 24 * 30));
    
    return diffMonths;
  }

  // Get formatted date range
  getFormattedDateRange() {
    if (!this.start_date) return 'N/A';
    
    const start = new Date(this.start_date).getFullYear();
    const end = this.is_ongoing ? 'Present' : (this.end_date ? new Date(this.end_date).getFullYear() : 'N/A');
    
    return `${start} - ${end}`;
  }

  // Validate project dates
  static validateDates(startDate, endDate, isOngoing) {
    if (!startDate) return false;
    
    const start = new Date(startDate);
    const end = endDate ? new Date(endDate) : null;
    
    if (!isOngoing && end && start >= end) return false;
    
    return true;
  }

  // Get project summary
  static async getProjectSummary(userId) {
    try {
      const summary = await query(
        `SELECT 
          COUNT(*) AS total_projects,
          COUNT(CASE WHEN is_ongoing = 1 THEN 1 END) AS ongoing_projects,
          GROUP_CONCAT(DISTINCT technologies_used) AS technologies_used,
          GROUP_CONCAT(DISTINCT project_title) AS project_titles
         FROM user_project_details 
         WHERE user_id = ? AND status = 1`,
        [userId]
      );

      return summary[0];
    } catch (error) {
      logger.error('Error getting project summary:', error);
      throw error;
    }
  }

  // Get projects by year
  static async getProjectsByYear(userId, year) {
    try {
      const projects = await query(
        'SELECT * FROM user_project_details WHERE user_id = ? AND YEAR(start_date) = ? AND status = 1 ORDER BY start_date DESC',
        [userId, year]
      );

      return projects.map(project => new Project(project));
    } catch (error) {
      logger.error('Error getting projects by year:', error);
      throw error;
    }
  }

  // Get project timeline
  static async getProjectTimeline(userId) {
    try {
      const timeline = await query(
        `SELECT 
          YEAR(start_date) AS year,
          COUNT(*) AS project_count,
          GROUP_CONCAT(project_title) AS projects
         FROM user_project_details 
         WHERE user_id = ? AND status = 1
         GROUP BY YEAR(start_date)
         ORDER BY year DESC`,
        [userId]
      );

      return timeline;
    } catch (error) {
      logger.error('Error getting project timeline:', error);
      throw error;
    }
  }
}

module.exports = Project;
