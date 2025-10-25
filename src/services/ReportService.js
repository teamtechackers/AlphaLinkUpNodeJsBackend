'use strict';

const Report = require('../models/Report');
const User = require('../models/User');
const Job = require('../models/Job');
const Event = require('../models/Event');
const ServiceProvider = require('../models/ServiceProvider');
const Notification = require('../models/Notification');
const { logger } = require('../utils/logger');

class ReportService {
  // Create a new report
  static async createReport(reportData) {
    try {
      // Validate report data
      const validationErrors = ReportService.validateReportData(reportData);
      if (validationErrors.length > 0) {
        throw new Error(`Validation failed: ${validationErrors.join(', ')}`);
      }

      // Check if similar report already exists
      const existingReport = await Report.findSimilarReport(reportData);
      if (existingReport) {
        // Update existing report instead of creating duplicate
        const updatedReport = await Report.updateEvidence(existingReport.id, {
          additionalEvidence: reportData.evidence,
          reporterId: reportData.reporter_id,
          timestamp: new Date()
        });

        logger.info(`Updated existing report ${existingReport.id} with additional evidence`);
        return updatedReport;
      }

      // Determine report priority
      const priority = ReportService.determinePriority(reportData);
      reportData.priority = priority;

      // Create the report
      const report = await Report.create(reportData);

      // Send notification to admins about new report
      try {
        await ReportService.notifyAdminsOfNewReport(report);
      } catch (notificationError) {
        logger.warn('Failed to notify admins of new report:', notificationError);
      }

      // Send confirmation to reporter
      try {
        await Notification.createNotification({
          user_id: reportData.reporter_id,
          type: 'report_submitted',
          title: 'Report Submitted',
          message: 'Your report has been submitted and is under review. We will notify you of any updates.',
          data: { reportId: report.id, contentType: reportData.content_type }
        });
      } catch (notificationError) {
        logger.warn('Failed to send report confirmation:', notificationError);
      }

      logger.info(`New report ${report.id} created for ${reportData.content_type} ${reportData.content_id}`);
      return report;
    } catch (error) {
      logger.error('Error creating report:', error);
      throw error;
    }
  }

  // Get report by ID
  static async getReport(reportId, userId = null) {
    try {
      const report = await Report.findById(reportId);
      if (!report) {
        throw new Error('Report not found');
      }

      // Check if user has permission to view this report
      if (userId && !ReportService.canUserViewReport(report, userId)) {
        throw new Error('Unauthorized to view this report');
      }

      // Include additional context based on content type
      const enrichedReport = await ReportService.enrichReportWithContext(report);

      return enrichedReport;
    } catch (error) {
      logger.error('Error getting report:', error);
      throw error;
    }
  }

  // Get reports with filtering and pagination
  static async getReports(options = {}) {
    try {
      const {
        page = 1,
        limit = 20,
        status = null,
        priority = null,
        contentType = null,
        assignedTo = null,
        startDate = null,
        endDate = null,
        sortBy = 'created_at',
        sortOrder = 'desc'
      } = options;

      // Build filter criteria
      const filters = {};
      if (status) filters.status = status;
      if (priority) filters.priority = priority;
      if (contentType) filters.content_type = contentType;
      if (assignedTo) filters.assigned_to = assignedTo;
      if (startDate || endDate) {
        filters.dateRange = { startDate, endDate };
      }

      const reports = await Report.getAll(filters, {
        page,
        limit,
        sortBy,
        sortOrder
      });

      // Enrich reports with context
      const enrichedReports = await Promise.all(
        reports.map(report => ReportService.enrichReportWithContext(report))
      );

      return {
        reports: enrichedReports,
        total: reports.length,
        page,
        limit,
        filters
      };
    } catch (error) {
      logger.error('Error getting reports:', error);
      throw error;
    }
  }

  // Update report status
  static async updateReportStatus(reportId, status, updatedByUserId, notes = '') {
    try {
      // Check if user has permission to update report
      const user = await User.findById(updatedByUserId);
      if (!user || !ReportService.canUserUpdateReport(user)) {
        throw new Error('Insufficient permissions to update report');
      }

      // Get current report
      const report = await Report.findById(reportId);
      if (!report) {
        throw new Error('Report not found');
      }

      // Update report status
      const updatedReport = await Report.updateStatus(reportId, status, updatedByUserId, notes);

      // Handle status-specific actions
      await ReportService.handleStatusChange(report, status, updatedByUserId, notes);

      // Send notification to reporter about status update
      try {
        await Notification.createNotification({
          user_id: report.reporter_id,
          type: 'report_status_updated',
          title: 'Report Status Updated',
          message: `Your report has been ${status}${notes ? `: ${notes}` : ''}`,
          data: { reportId, status, notes }
        });
      } catch (notificationError) {
        logger.warn('Failed to send status update notification:', notificationError);
      }

      // Log the status update
      await ReportService.logReportAction(reportId, 'status_updated', {
        oldStatus: report.status,
        newStatus: status,
        updatedBy: updatedByUserId,
        notes
      });

      logger.info(`Report ${reportId} status updated to ${status} by ${updatedByUserId}`);
      return updatedReport;
    } catch (error) {
      logger.error('Error updating report status:', error);
      throw error;
    }
  }

  // Assign report to admin
  static async assignReportToAdmin(reportId, adminId, assignedByUserId) {
    try {
      // Check if user has permission to assign reports
      const user = await User.findById(assignedByUserId);
      if (!user || !ReportService.canUserAssignReports(user)) {
        throw new Error('Insufficient permissions to assign reports');
      }

      // Check if admin exists and has appropriate permissions
      const admin = await User.findById(adminId);
      if (!admin || !admin.hasPermission('content_moderation')) {
        throw new Error('Invalid admin or insufficient permissions');
      }

      // Assign report
      const updatedReport = await Report.assignToAdmin(reportId, adminId);

      // Send notification to assigned admin
      try {
        await Notification.createNotification({
          user_id: adminId,
          type: 'report_assigned',
          title: 'Report Assigned',
          message: 'A new report has been assigned to you for review.',
          data: { reportId, contentType: updatedReport.content_type }
        });
      } catch (notificationError) {
        logger.warn('Failed to send assignment notification:', notificationError);
      }

      // Log the assignment
      await ReportService.logReportAction(reportId, 'assigned_to_admin', {
        adminId,
        assignedBy: assignedByUserId
      });

      logger.info(`Report ${reportId} assigned to admin ${adminId} by ${assignedByUserId}`);
      return updatedReport;
    } catch (error) {
      logger.error('Error assigning report to admin:', error);
      throw error;
    }
  }

  // Add evidence to report
  static async addEvidence(reportId, evidenceData, addedByUserId) {
    try {
      // Check if user has permission to add evidence
      const user = await User.findById(addedByUserId);
      if (!user || !ReportService.canUserAddEvidence(user)) {
        throw new Error('Insufficient permissions to add evidence');
      }

      // Get current report
      const report = await Report.findById(reportId);
      if (!report) {
        throw new Error('Report not found');
      }

      // Add evidence
      const updatedReport = await Report.addEvidence(reportId, {
        ...evidenceData,
        addedBy: addedByUserId,
        timestamp: new Date()
      });

      // Log the evidence addition
      await ReportService.logReportAction(reportId, 'evidence_added', {
        evidenceType: evidenceData.type,
        addedBy: addedByUserId
      });

      logger.info(`Evidence added to report ${reportId} by ${addedByUserId}`);
      return updatedReport;
    } catch (error) {
      logger.error('Error adding evidence to report:', error);
      throw error;
    }
  }

  // Get urgent reports
  static async getUrgentReports(limit = 10) {
    try {
      const urgentReports = await Report.getUrgentReports(limit);
      
      // Enrich reports with context
      const enrichedReports = await Promise.all(
        urgentReports.map(report => ReportService.enrichReportWithContext(report))
      );

      return enrichedReports;
    } catch (error) {
      logger.error('Error getting urgent reports:', error);
      throw error;
    }
  }

  // Get reports by user
  static async getReportsByUser(userId, options = {}) {
    try {
      const {
        page = 1,
        limit = 20,
        status = null,
        contentType = null
      } = options;

      // Build filters
      const filters = { reporter_id: userId };
      if (status) filters.status = status;
      if (contentType) filters.content_type = contentType;

      const reports = await Report.getByUser(userId, filters, { page, limit });

      // Enrich reports with context
      const enrichedReports = await Promise.all(
        reports.map(report => ReportService.enrichReportWithContext(report))
      );

      return {
        reports: enrichedReports,
        total: reports.length,
        page,
        limit
      };
    } catch (error) {
      logger.error('Error getting reports by user:', error);
      throw error;
    }
  }

  // Get reports by admin
  static async getReportsByAdmin(adminId, options = {}) {
    try {
      const {
        page = 1,
        limit = 20,
        status = null,
        priority = null
      } = options;

      // Build filters
      const filters = { assigned_to: adminId };
      if (status) filters.status = status;
      if (priority) filters.priority = priority;

      const reports = await Report.getByAdmin(adminId, filters, { page, limit });

      // Enrich reports with context
      const enrichedReports = await Promise.all(
        reports.map(report => ReportService.enrichReportWithContext(report))
      );

      return {
        reports: enrichedReports,
        total: reports.length,
        page,
        limit
      };
    } catch (error) {
      logger.error('Error getting reports by admin:', error);
      throw error;
    }
  }

  // Search reports
  static async searchReports(searchTerm, options = {}) {
    try {
      const {
        page = 1,
        limit = 20,
        filters = {}
      } = options;

      const reports = await Report.search(searchTerm, filters, { page, limit });

      // Enrich reports with context
      const enrichedReports = await Promise.all(
        reports.map(report => ReportService.enrichReportWithContext(report))
      );

      return {
        reports: enrichedReports,
        total: reports.length,
        page,
        limit,
        searchTerm
      };
    } catch (error) {
      logger.error('Error searching reports:', error);
      throw error;
    }
  }

  // Get report statistics
  static async getReportStats(options = {}) {
    try {
      const {
        startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
        endDate = new Date(),
        groupBy = 'day'
      } = options;

      const stats = await Report.getStats({ startDate, endDate, groupBy });

      // Add additional calculated statistics
      const enrichedStats = {
        ...stats,
        averageResolutionTime: await ReportService.calculateAverageResolutionTime(startDate, endDate),
        topReportedContent: await ReportService.getTopReportedContent(startDate, endDate),
        reportTrends: await ReportService.calculateReportTrends(startDate, endDate)
      };

      return enrichedStats;
    } catch (error) {
      logger.error('Error getting report statistics:', error);
      throw error;
    }
  }

  // Bulk update reports
  static async bulkUpdateReports(reportIds, updateData, updatedByUserId) {
    try {
      // Check if user has permission for bulk updates
      const user = await User.findById(updatedByUserId);
      if (!user || !ReportService.canUserBulkUpdateReports(user)) {
        throw new Error('Insufficient permissions for bulk updates');
      }

      const results = [];
      const errors = [];

      for (const reportId of reportIds) {
        try {
          let result;
          if (updateData.status) {
            result = await this.updateReportStatus(reportId, updateData.status, updatedByUserId, updateData.notes);
          } else if (updateData.assigned_to) {
            result = await this.assignReportToAdmin(reportId, updateData.assigned_to, updatedByUserId);
          }
          results.push(result);
        } catch (error) {
          errors.push({
            reportId,
            error: error.message
          });
        }
      }

      // Log bulk operation
      await ReportService.logReportAction('bulk', 'bulk_update', {
        totalReports: reportIds.length,
        successful: results.length,
        failed: errors.length,
        updateData,
        updatedBy: updatedByUserId
      });

      return {
        total: reportIds.length,
        successful: results.length,
        failed: errors.length,
        results,
        errors
      };
    } catch (error) {
      logger.error('Error in bulk update reports:', error);
      throw error;
    }
  }

  // Clean old reports
  static async cleanOldReports(daysOld = 365) {
    try {
      const deletedCount = await Report.cleanOldReports(daysOld);
      
      logger.info(`Cleaned ${deletedCount} old reports older than ${daysOld} days`);
      return {
        deletedCount,
        message: `Cleaned ${deletedCount} old reports successfully`
      };
    } catch (error) {
      logger.error('Error cleaning old reports:', error);
      throw error;
    }
  }

  // Export reports
  static async exportReports(format = 'json', options = {}) {
    try {
      const reports = await this.getReports(options);
      
      switch (format) {
        case 'json':
          return JSON.stringify(reports, null, 2);
        case 'csv':
          return this.convertReportsToCSV(reports.reports);
        default:
          return reports;
      }
    } catch (error) {
      logger.error('Error exporting reports:', error);
      throw error;
    }
  }

  // Utility methods

  static validateReportData(reportData) {
    const errors = [];

    if (!reportData.reporter_id) {
      errors.push('Reporter ID is required');
    }

    if (!reportData.content_type) {
      errors.push('Content type is required');
    }

    if (!reportData.content_id) {
      errors.push('Content ID is required');
    }

    if (!reportData.reason) {
      errors.push('Report reason is required');
    }

    if (!reportData.description || reportData.description.trim().length < 10) {
      errors.push('Description must be at least 10 characters long');
    }

    // Validate content type
    const validContentTypes = ['user', 'job', 'event', 'service', 'message', 'comment'];
    if (!validContentTypes.includes(reportData.content_type)) {
      errors.push('Invalid content type');
    }

    return errors;
  }

  static determinePriority(reportData) {
    // High priority for safety/legal issues
    const highPriorityKeywords = ['harassment', 'abuse', 'illegal', 'dangerous', 'scam', 'fraud'];
    const description = reportData.description.toLowerCase();
    
    if (highPriorityKeywords.some(keyword => description.includes(keyword))) {
      return 'high';
    }

    // Medium priority for policy violations
    const mediumPriorityKeywords = ['spam', 'inappropriate', 'misleading', 'copyright'];
    if (mediumPriorityKeywords.some(keyword => description.includes(keyword))) {
      return 'medium';
    }

    return 'low';
  }

  static canUserViewReport(report, userId) {
    // Users can view their own reports
    if (report.reporter_id === userId) {
      return true;
    }

    // Admins can view all reports
    // This would typically check user permissions
    return false;
  }

  static canUserUpdateReport(user) {
    // Check if user has admin or moderator permissions
    return user.role === 'admin' || user.role === 'moderator';
  }

  static canUserAssignReports(user) {
    // Check if user has admin permissions
    return user.role === 'admin';
  }

  static canUserAddEvidence(user) {
    // Users can add evidence to their own reports
    // Admins can add evidence to any report
    return true;
  }

  static canUserBulkUpdateReports(user) {
    // Check if user has admin permissions
    return user.role === 'admin';
  }

  static async enrichReportWithContext(report) {
    try {
      const enrichedReport = { ...report };

      // Add content details based on content type
      switch (report.content_type) {
        case 'user':
          const user = await User.findById(report.content_id);
          enrichedReport.contentDetails = user ? {
            name: user.name,
            email: user.email,
            status: user.status
          } : null;
          break;

        case 'job':
          const job = await Job.findById(report.content_id);
          enrichedReport.contentDetails = job ? {
            title: job.title,
            company: job.company,
            status: job.status
          } : null;
          break;

        case 'event':
          const event = await Event.findById(report.content_id);
          enrichedReport.contentDetails = event ? {
            title: event.title,
            organizer: event.organizer,
            status: event.status
          } : null;
          break;

        case 'service':
          const service = await ServiceProvider.findById(report.content_id);
          enrichedReport.contentDetails = service ? {
            serviceName: service.serviceName,
            providerName: service.providerName,
            status: service.status
          } : null;
          break;

        default:
          enrichedReport.contentDetails = null;
      }

      // Add reporter details
      const reporter = await User.findById(report.reporter_id);
      enrichedReport.reporterDetails = reporter ? {
        name: reporter.name,
        email: reporter.email
      } : null;

      // Add assigned admin details if assigned
      if (report.assigned_to) {
        const admin = await User.findById(report.assigned_to);
        enrichedReport.assignedAdminDetails = admin ? {
          name: admin.name,
          email: admin.email
        } : null;
      }

      return enrichedReport;
    } catch (error) {
      logger.error('Error enriching report with context:', error);
      return report;
    }
  }

  static async handleStatusChange(report, newStatus, updatedByUserId, notes) {
    try {
      switch (newStatus) {
        case 'resolved':
          // Mark content as reviewed
          await ReportService.markContentAsReviewed(report);
          break;
        case 'dismissed':
          // No action needed
          break;
        case 'escalated':
          // Notify higher-level admins
          await ReportService.escalateReport(report, updatedByUserId);
          break;
        case 'under_investigation':
          // Start investigation process
          await ReportService.startInvestigation(report, updatedByUserId);
          break;
      }
    } catch (error) {
      logger.error('Error handling status change:', error);
    }
  }

  static async markContentAsReviewed(report) {
    try {
      // Mark the reported content as reviewed
      // This would typically update the content's moderation status
      logger.info(`Content ${report.content_id} marked as reviewed`);
    } catch (error) {
      logger.error('Error marking content as reviewed:', error);
    }
  }

  static async escalateReport(report, escalatedByUserId) {
    try {
      // Find higher-level admins to notify
      const admins = await User.search({ role: 'admin', is_active: true });
      
      // Send escalation notifications
      for (const admin of admins) {
        try {
          await Notification.createNotification({
            user_id: admin.id,
            type: 'report_escalated',
            title: 'Report Escalated',
            message: `Report ${report.id} has been escalated and requires attention.`,
            data: { reportId: report.id, escalatedBy: escalatedByUserId }
          });
        } catch (notificationError) {
          logger.warn('Failed to send escalation notification:', notificationError);
        }
      }

      logger.info(`Report ${report.id} escalated by ${escalatedByUserId}`);
    } catch (error) {
      logger.error('Error escalating report:', error);
    }
  }

  static async startInvestigation(report, startedByUserId) {
    try {
      // Start investigation process
      // This could involve creating investigation tasks, setting deadlines, etc.
      logger.info(`Investigation started for report ${report.id} by ${startedByUserId}`);
    } catch (error) {
      logger.error('Error starting investigation:', error);
    }
  }

  static async notifyAdminsOfNewReport(report) {
    try {
      // Find available admins
      const admins = await User.search({ role: 'admin', is_active: true });
      
      // Send notifications to admins
      for (const admin of admins) {
        try {
          await Notification.createNotification({
            user_id: admin.id,
            type: 'new_report',
            title: 'New Report Received',
            message: `A new ${report.priority} priority report has been submitted.`,
            data: { reportId: report.id, contentType: report.content_type, priority: report.priority }
          });
        } catch (notificationError) {
          logger.warn('Failed to send admin notification:', notificationError);
        }
      }
    } catch (error) {
      logger.error('Error notifying admins of new report:', error);
    }
  }

  static async logReportAction(reportId, action, details) {
    try {
      // Log report actions for audit trail
      // This would typically write to an audit log
      logger.info(`Report action logged: ${action} for report ${reportId}`, details);
    } catch (error) {
      logger.error('Error logging report action:', error);
    }
  }

  static async calculateAverageResolutionTime(startDate, endDate) {
    try {
      // Calculate average time to resolve reports
      // This would typically query resolved reports and calculate average time
      return {
        averageDays: 3.5,
        totalResolved: 45
      };
    } catch (error) {
      logger.error('Error calculating average resolution time:', error);
      return {};
    }
  }

  static async getTopReportedContent(startDate, endDate) {
    try {
      // Get most frequently reported content
      // This would typically aggregate report data
      return [
        { contentId: '123', contentType: 'user', reportCount: 15, reason: 'harassment' },
        { contentId: '456', contentType: 'job', reportCount: 8, reason: 'spam' },
        { contentId: '789', contentType: 'event', reportCount: 6, reason: 'inappropriate' }
      ];
    } catch (error) {
      logger.error('Error getting top reported content:', error);
      return [];
    }
  }

  static async calculateReportTrends(startDate, endDate) {
    try {
      // Calculate report trends over time
      // This would typically analyze report data by date
      return {
        daily: [5, 8, 3, 12, 7, 9, 4],
        weekly: [35, 42, 28, 51, 38],
        trend: 'increasing'
      };
    } catch (error) {
      logger.error('Error calculating report trends:', error);
      return {};
    }
  }

  static convertReportsToCSV(reports) {
    const headers = [
      'Report ID',
      'Content Type',
      'Content ID',
      'Reporter',
      'Reason',
      'Status',
      'Priority',
      'Created At',
      'Assigned To'
    ];

    const rows = reports.map(report => [
      report.id,
      report.content_type,
      report.content_id,
      report.reporterDetails?.name || 'Unknown',
      report.reason,
      report.status,
      report.priority,
      report.created_at,
      report.assignedAdminDetails?.name || 'Unassigned'
    ]);

    return [headers, ...rows]
      .map(row => row.map(field => `"${field || ''}"`).join(','))
      .join('\n');
  }
}

module.exports = ReportService;
