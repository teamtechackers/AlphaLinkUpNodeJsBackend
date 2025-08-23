'use strict';

const { query } = require('../config/db');
const { idEncode, idDecode } = require('../utils/idCodec');
const { logger } = require('../utils/logger');

class Report {
  constructor(data = {}) {
    this.id = data.id;
    this.reporter_id = data.reporter_id;
    this.reported_user_id = data.reported_user_id;
    this.reported_content_id = data.reported_content_id;
    this.content_type = data.content_type; // user, job, event, service, post, comment
    this.reason = data.reason;
    this.description = data.description;
    this.evidence = data.evidence;
    this.status = data.status; // pending, under_review, resolved, dismissed
    this.priority = data.priority; // low, medium, high, urgent
    this.assigned_admin_id = data.assigned_admin_id;
    this.resolution = data.resolution;
    this.resolved_by = data.resolved_by;
    this.resolved_at = data.resolved_at;
    this.created_at = data.created_at;
    this.updated_at = data.updated_at;
  }

  // Create a new report
  static async create(reportData) {
    try {
      const {
        reporter_id,
        reported_user_id,
        reported_content_id,
        content_type,
        reason,
        description,
        evidence = null
      } = reportData;

      // Check if similar report already exists
      const [existing] = await query(
        'SELECT id FROM reports WHERE reporter_id = ? AND reported_user_id = ? AND content_type = ? AND status IN ("pending", "under_review")',
        [reporter_id, reported_user_id, content_type]
      );

      if (existing) {
        throw new Error('Similar report already exists');
      }

      // Determine priority based on reason
      const priority = Report.determinePriority(reason);

      const result = await query(
        'INSERT INTO reports (reporter_id, reported_user_id, reported_content_id, content_type, reason, description, evidence, priority, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, "pending", NOW(), NOW())',
        [reporter_id, reported_user_id, reported_content_id, content_type, reason, description, evidence ? JSON.stringify(evidence) : null, priority]
      );

      const reportId = result.insertId;
      return await Report.findById(reportId);
    } catch (error) {
      logger.error('Error creating report:', error);
      throw error;
    }
  }

  // Get report by ID
  static async findById(reportId) {
    try {
      const [report] = await query(
        'SELECT * FROM reports WHERE id = ?',
        [reportId]
      );

      if (report && report.evidence) {
        try {
          report.evidence = JSON.parse(report.evidence);
        } catch (e) {
          report.evidence = null;
        }
      }

      return report;
    } catch (error) {
      logger.error('Error getting report by ID:', error);
      throw error;
    }
  }

  // Get all reports
  static async getAll(options = {}) {
    try {
      const { page = 1, limit = 20, status = null, priority = null, content_type = null } = options;
      const offset = (page - 1) * limit;

      let whereClause = 'WHERE 1=1';
      let params = [];

      if (status) {
        whereClause += ' AND status = ?';
        params.push(status);
      }

      if (priority) {
        whereClause += ' AND priority = ?';
        params.push(priority);
      }

      if (content_type) {
        whereClause += ' AND content_type = ?';
        params.push(content_type);
      }

      const reports = await query(
        `SELECT r.*, 
                u1.name as reporter_name, u1.email as reporter_email,
                u2.name as reported_user_name, u2.email as reported_user_email,
                a.username as assigned_admin_username
         FROM reports r
         LEFT JOIN users u1 ON r.reporter_id = u1.id
         LEFT JOIN users u2 ON r.reported_user_id = u2.id
         LEFT JOIN admins a ON r.assigned_admin_id = a.id
         ${whereClause} 
         ORDER BY r.priority DESC, r.created_at DESC 
         LIMIT ? OFFSET ?`,
        [...params, limit, offset]
      );

      // Parse evidence for each report
      reports.forEach(report => {
        if (report.evidence) {
          try {
            report.evidence = JSON.parse(report.evidence);
          } catch (e) {
            report.evidence = null;
          }
        }
      });

      return reports;
    } catch (error) {
      logger.error('Error getting all reports:', error);
      throw error;
    }
  }

  // Get reports by user
  static async getByUser(userId, options = {}) {
    try {
      const { page = 1, limit = 20, status = null } = options;
      const offset = (page - 1) * limit;

      let whereClause = 'WHERE (reporter_id = ? OR reported_user_id = ?)';
      let params = [userId, userId];

      if (status) {
        whereClause += ' AND status = ?';
        params.push(status);
      }

      const reports = await query(
        `SELECT r.*, 
                u1.name as reporter_name, u1.email as reporter_email,
                u2.name as reported_user_name, u2.email as reported_user_email
         FROM reports r
         LEFT JOIN users u1 ON r.reporter_id = u1.id
         LEFT JOIN users u2 ON r.reported_user_id = u2.id
         ${whereClause} 
         ORDER BY r.created_at DESC 
         LIMIT ? OFFSET ?`,
        [...params, limit, offset]
      );

      // Parse evidence for each report
      reports.forEach(report => {
        if (report.evidence) {
          try {
            report.evidence = JSON.parse(report.evidence);
          } catch (e) {
            report.evidence = null;
          }
        }
      });

      return reports;
    } catch (error) {
      logger.error('Error getting reports by user:', error);
      throw error;
    }
  }

  // Update report status
  static async updateStatus(reportId, status, adminId = null, resolution = null) {
    try {
      const updates = ['status = ?', 'updated_at = NOW()'];
      const params = [status];

      if (adminId) {
        updates.push('assigned_admin_id = ?');
        params.push(adminId);
      }

      if (status === 'resolved' || status === 'dismissed') {
        updates.push('resolved_by = ?');
        updates.push('resolved_at = NOW()');
        params.push(adminId);
      }

      if (resolution) {
        updates.push('resolution = ?');
        params.push(resolution);
      }

      params.push(reportId);

      await query(
        `UPDATE reports SET ${updates.join(', ')} WHERE id = ?`,
        params
      );

      return await Report.findById(reportId);
    } catch (error) {
      logger.error('Error updating report status:', error);
      throw error;
    }
  }

  // Assign report to admin
  static async assignToAdmin(reportId, adminId) {
    try {
      await query(
        'UPDATE reports SET assigned_admin_id = ?, status = "under_review", updated_at = NOW() WHERE id = ?',
        [adminId, reportId]
      );

      return await Report.findById(reportId);
    } catch (error) {
      logger.error('Error assigning report to admin:', error);
      throw error;
    }
  }

  // Add evidence to report
  static async addEvidence(reportId, evidence) {
    try {
      const [currentReport] = await query(
        'SELECT evidence FROM reports WHERE id = ?',
        [reportId]
      );

      let currentEvidence = [];
      if (currentReport && currentReport.evidence) {
        try {
          currentEvidence = JSON.parse(currentReport.evidence);
        } catch (e) {
          currentEvidence = [];
        }
      }

      currentEvidence.push({
        ...evidence,
        added_at: new Date().toISOString()
      });

      await query(
        'UPDATE reports SET evidence = ?, updated_at = NOW() WHERE id = ?',
        [JSON.stringify(currentEvidence), reportId]
      );

      return await Report.findById(reportId);
    } catch (error) {
      logger.error('Error adding evidence to report:', error);
      throw error;
    }
  }

  // Get report statistics
  static async getStats(options = {}) {
    try {
      const { startDate = null, endDate = null } = options;

      let whereClause = 'WHERE 1=1';
      let params = [];

      if (startDate) {
        whereClause += ' AND created_at >= ?';
        params.push(startDate);
      }

      if (endDate) {
        whereClause += ' AND created_at <= ?';
        params.push(endDate);
      }

      const [total] = await query(
        `SELECT COUNT(*) as count FROM reports ${whereClause}`,
        params
      );

      const [statusStats] = await query(
        `SELECT status, COUNT(*) as count FROM reports ${whereClause} GROUP BY status`,
        params
      );

      const [priorityStats] = await query(
        `SELECT priority, COUNT(*) as count FROM reports ${whereClause} GROUP BY priority`,
        params
      );

      const [contentTypeStats] = await query(
        `SELECT content_type, COUNT(*) as count FROM reports ${whereClause} GROUP BY content_type`,
        params
      );

      const [reasonStats] = await query(
        `SELECT reason, COUNT(*) as count FROM reports ${whereClause} GROUP BY reason`,
        params
      );

      return {
        total: total.count,
        byStatus: statusStats,
        byPriority: priorityStats,
        byContentType: contentTypeStats,
        byReason: reasonStats
      };
    } catch (error) {
      logger.error('Error getting report statistics:', error);
      throw error;
    }
  }

  // Get urgent reports
  static async getUrgentReports() {
    try {
      const reports = await query(
        `SELECT r.*, 
                u1.name as reporter_name, u1.email as reporter_email,
                u2.name as reported_user_name, u2.email as reported_user_email
         FROM reports r
         LEFT JOIN users u1 ON r.reporter_id = u1.id
         LEFT JOIN users u2 ON r.reported_user_id = u2.id
         WHERE r.priority = "urgent" AND r.status IN ("pending", "under_review")
         ORDER BY r.created_at ASC`
      );

      // Parse evidence for each report
      reports.forEach(report => {
        if (report.evidence) {
          try {
            report.evidence = JSON.parse(report.evidence);
          } catch (e) {
            report.evidence = null;
          }
        }
      });

      return reports;
    } catch (error) {
      logger.error('Error getting urgent reports:', error);
      throw error;
    }
  }

  // Search reports
  static async search(searchTerm, options = {}) {
    try {
      const { page = 1, limit = 20, status = null, priority = null } = options;
      const offset = (page - 1) * limit;

      let whereClause = 'WHERE (r.reason LIKE ? OR r.description LIKE ? OR u1.name LIKE ? OR u2.name LIKE ?)';
      let params = [`%${searchTerm}%`, `%${searchTerm}%`, `%${searchTerm}%`, `%${searchTerm}%`];

      if (status) {
        whereClause += ' AND r.status = ?';
        params.push(status);
      }

      if (priority) {
        whereClause += ' AND r.priority = ?';
        params.push(priority);
      }

      const reports = await query(
        `SELECT r.*, 
                u1.name as reporter_name, u1.email as reporter_email,
                u2.name as reported_user_name, u2.email as reported_user_email,
                a.username as assigned_admin_username
         FROM reports r
         LEFT JOIN users u1 ON r.reporter_id = u1.id
         LEFT JOIN users u2 ON r.reported_user_id = u2.id
         LEFT JOIN admins a ON r.assigned_admin_id = a.id
         ${whereClause} 
         ORDER BY r.priority DESC, r.created_at DESC 
         LIMIT ? OFFSET ?`,
        [...params, limit, offset]
      );

      // Parse evidence for each report
      reports.forEach(report => {
        if (report.evidence) {
          try {
            report.evidence = JSON.parse(report.evidence);
          } catch (e) {
            report.evidence = null;
          }
        }
      });

      return reports;
    } catch (error) {
      logger.error('Error searching reports:', error);
      throw error;
    }
  }

  // Get reports by admin
  static async getByAdmin(adminId, options = {}) {
    try {
      const { page = 1, limit = 20, status = null } = options;
      const offset = (page - 1) * limit;

      let whereClause = 'WHERE r.assigned_admin_id = ?';
      let params = [adminId];

      if (status) {
        whereClause += ' AND r.status = ?';
        params.push(status);
      }

      const reports = await query(
        `SELECT r.*, 
                u1.name as reporter_name, u1.email as reporter_email,
                u2.name as reported_user_name, u2.email as reported_user_email
         FROM reports r
         LEFT JOIN users u1 ON r.reporter_id = u1.id
         LEFT JOIN users u2 ON r.reported_user_id = u2.id
         ${whereClause} 
         ORDER BY r.priority DESC, r.created_at DESC 
         LIMIT ? OFFSET ?`,
        [...params, limit, offset]
      );

      // Parse evidence for each report
      reports.forEach(report => {
        if (report.evidence) {
          try {
            report.evidence = JSON.parse(report.evidence);
          } catch (e) {
            report.evidence = null;
          }
        }
      });

      return reports;
    } catch (error) {
      logger.error('Error getting reports by admin:', error);
      throw error;
    }
  }

  // Get report reasons
  static getReportReasons() {
    return [
      { value: 'spam', label: 'Spam', description: 'Unwanted or repetitive content' },
      { value: 'inappropriate', label: 'Inappropriate Content', description: 'Content that violates community guidelines' },
      { value: 'harassment', label: 'Harassment', description: 'Bullying, threats, or abusive behavior' },
      { value: 'fake_profile', label: 'Fake Profile', description: 'Impersonation or false identity' },
      { value: 'scam', label: 'Scam', description: 'Fraudulent or deceptive content' },
      { value: 'copyright', label: 'Copyright Violation', description: 'Unauthorized use of copyrighted material' },
      { value: 'privacy', label: 'Privacy Violation', description: 'Sharing of private or personal information' },
      { value: 'other', label: 'Other', description: 'Other violations not listed above' }
    ];
  }

  // Determine priority based on reason
  static determinePriority(reason) {
    const highPriorityReasons = ['harassment', 'scam', 'fake_profile'];
    const mediumPriorityReasons = ['inappropriate', 'copyright', 'privacy'];
    
    if (highPriorityReasons.includes(reason)) {
      return 'high';
    } else if (mediumPriorityReasons.includes(reason)) {
      return 'medium';
    } else {
      return 'low';
    }
  }

  // Get report priorities
  static getReportPriorities() {
    return [
      { value: 'low', label: 'Low', description: 'Minor violations' },
      { value: 'medium', label: 'Medium', description: 'Moderate violations' },
      { value: 'high', label: 'High', description: 'Serious violations' },
      { value: 'urgent', label: 'Urgent', description: 'Critical violations requiring immediate attention' }
    ];
  }

  // Get report statuses
  static getReportStatuses() {
    return [
      { value: 'pending', label: 'Pending', description: 'Awaiting review' },
      { value: 'under_review', label: 'Under Review', description: 'Currently being reviewed' },
      { value: 'resolved', label: 'Resolved', description: 'Issue has been resolved' },
      { value: 'dismissed', label: 'Dismissed', description: 'Report was dismissed' }
    ];
  }

  // Get content types
  static getContentTypes() {
    return [
      { value: 'user', label: 'User Profile', description: 'User profile or account' },
      { value: 'job', label: 'Job Posting', description: 'Job advertisement or posting' },
      { value: 'event', label: 'Event', description: 'Event or gathering' },
      { value: 'service', label: 'Service', description: 'Service offering' },
      { value: 'post', label: 'Post', description: 'General post or content' },
      { value: 'comment', label: 'Comment', description: 'Comment on content' }
    ];
  }

  // Validate report data
  static validateReportData(reportData) {
    const errors = [];

    if (!reportData.reporter_id) {
      errors.push('Reporter ID is required');
    }

    if (!reportData.reported_user_id && !reportData.reported_content_id) {
      errors.push('Either reported user ID or content ID is required');
    }

    if (!reportData.content_type) {
      errors.push('Content type is required');
    }

    if (!reportData.reason) {
      errors.push('Report reason is required');
    }

    if (!reportData.description || reportData.description.length < 10) {
      errors.push('Description must be at least 10 characters long');
    }

    const validReasons = Report.getReportReasons().map(r => r.value);
    if (!validReasons.includes(reportData.reason)) {
      errors.push('Invalid report reason');
    }

    const validContentTypes = Report.getContentTypes().map(t => t.value);
    if (!validContentTypes.includes(reportData.content_type)) {
      errors.push('Invalid content type');
    }

    return errors;
  }

  // Clean old resolved reports
  static async cleanOldReports(daysOld = 90) {
    try {
      const result = await query(
        'DELETE FROM reports WHERE status IN ("resolved", "dismissed") AND resolved_at < DATE_SUB(NOW(), INTERVAL ? DAY)',
        [daysOld]
      );
      return result.affectedRows;
    } catch (error) {
      logger.error('Error cleaning old reports:', error);
      throw error;
    }
  }
}

module.exports = Report;
