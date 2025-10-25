'use strict';

const Admin = require('../models/Admin');
const User = require('../models/User');
const Job = require('../models/Job');
const Event = require('../models/Event');
const ServiceProvider = require('../models/ServiceProvider');
const Investor = require('../models/Investor');
const Report = require('../models/Report');
const Notification = require('../models/Notification');
const { logger } = require('../utils/logger');

class AdminService {
  // Admin authentication
  static async authenticateAdmin(username, password) {
    try {
      const admin = await Admin.findByUsername(username);
      if (!admin) {
        throw new Error('Invalid credentials');
      }

      const isValidPassword = await Admin.verifyPassword(password, admin.password);
      if (!isValidPassword) {
        throw new Error('Invalid credentials');
      }

      if (!admin.is_active) {
        throw new Error('Account is deactivated');
      }

      await Admin.updateLastLogin(admin.id);
      const token = Admin.generateAdminToken(admin);

      logger.info(`Admin ${username} authenticated successfully`);
      return {
        admin: {
          id: admin.id,
          username: admin.username,
          email: admin.email,
          role: admin.role,
          permissions: admin.permissions,
          last_login: admin.last_login
        },
        token
      };
    } catch (error) {
      logger.error('Admin authentication failed:', error);
      throw error;
    }
  }

  // Create new admin
  static async createAdmin(adminData, createdByAdminId) {
    try {
      const creator = await Admin.findById(createdByAdminId);
      if (!creator || !creator.hasPermission('admin_management')) {
        throw new Error('Insufficient permissions to create admin');
      }

      const validationErrors = AdminService.validateAdminData(adminData);
      if (validationErrors.length > 0) {
        throw new Error(`Validation failed: ${validationErrors.join(', ')}`);
      }

      const existingAdmin = await Admin.findByUsername(adminData.username) || 
                           await Admin.findByEmail(adminData.email);
      if (existingAdmin) {
        throw new Error('Username or email already exists');
      }

      const admin = await Admin.createWithDefaults(adminData);
      await Admin.logActivity(createdByAdminId, 'admin_created', {
        newAdminId: admin.id,
        newAdminUsername: admin.username
      });

      logger.info(`Admin ${admin.username} created by ${creator.username}`);
      return admin;
    } catch (error) {
      logger.error('Error creating admin:', error);
      throw error;
    }
  }

  // Get admin dashboard data
  static async getDashboardData(adminId) {
    try {
      const admin = await Admin.findById(adminId);
      if (!admin || !admin.is_active) {
        throw new Error('Admin not found or inactive');
      }

      const [
        userStats,
        jobStats,
        eventStats,
        serviceStats,
        investorStats,
        reportStats,
        systemHealth,
        recentActivity
      ] = await Promise.all([
        this.getUserStats(),
        this.getJobStats(),
        this.getEventStats(),
        this.getServiceStats(),
        this.getInvestorStats(),
        this.getReportStats(),
        this.getSystemHealth(),
        this.getRecentActivity()
      ]);

      return {
        userStats,
        jobStats,
        eventStats,
        serviceStats,
        investorStats,
        reportStats,
        systemHealth,
        recentActivity,
        generatedAt: new Date()
      };
    } catch (error) {
      logger.error('Error getting dashboard data:', error);
      throw error;
    }
  }

  // Get user statistics
  static async getUserStats() {
    try {
      const [
        totalUsers,
        activeUsers,
        newUsersToday,
        newUsersThisWeek,
        newUsersThisMonth
      ] = await Promise.all([
        User.getStats(),
        User.getActiveUsers(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)),
        User.getNewUsers(new Date(), new Date()),
        User.getNewUsers(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), new Date()),
        User.getNewUsers(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), new Date())
      ]);

      return {
        total: totalUsers.total || 0,
        active: activeUsers.length || 0,
        newToday: newUsersToday.length || 0,
        newThisWeek: newUsersThisWeek.length || 0,
        newThisMonth: newUsersThisMonth.length || 0
      };
    } catch (error) {
      logger.error('Error getting user stats:', error);
      throw error;
    }
  }

  // Get job statistics
  static async getJobStats() {
    try {
      const [
        totalJobs,
        activeJobs,
        filledJobs,
        newJobsToday,
        applicationsToday
      ] = await Promise.all([
        Job.getStats(),
        Job.getActiveJobs(),
        Job.getFilledJobs(),
        Job.getNewJobs(new Date(), new Date()),
        Job.getApplications(new Date(), new Date())
      ]);

      return {
        total: totalJobs.total || 0,
        active: activeJobs.length || 0,
        filled: filledJobs.length || 0,
        newToday: newJobsToday.length || 0,
        applicationsToday: applicationsToday.length || 0
      };
    } catch (error) {
      logger.error('Error getting job stats:', error);
      throw error;
    }
  }

  // Get event statistics
  static async getEventStats() {
    try {
      const [
        totalEvents,
        upcomingEvents,
        pastEvents,
        newEventsToday,
        registrationsToday
      ] = await Promise.all([
        Event.getStats(),
        Event.getUpcomingEvents(),
        Event.getPastEvents(),
        Event.getNewEvents(new Date(), new Date()),
        Event.getRegistrations(new Date(), new Date())
      ]);

      return {
        total: totalEvents.total || 0,
        upcoming: upcomingEvents.length || 0,
        past: pastEvents.length || 0,
        newToday: newEventsToday.length || 0,
        registrationsToday: registrationsToday.length || 0
      };
    } catch (error) {
      logger.error('Error getting event stats:', error);
      throw error;
    }
  }

  // Get service statistics
  static async getServiceStats() {
    try {
      const [
        totalServices,
        activeServices,
        pendingApproval,
        approvedServices,
        rejectedServices
      ] = await Promise.all([
        ServiceProvider.getStats(),
        ServiceProvider.getActiveServices(),
        ServiceProvider.getPendingApproval(),
        ServiceProvider.getApprovedServices(),
        ServiceProvider.getRejectedServices()
      ]);

      return {
        total: totalServices.total || 0,
        active: activeServices.length || 0,
        pendingApproval: pendingApproval.length || 0,
        approved: approvedServices.length || 0,
        rejected: rejectedServices.length || 0
      };
    } catch (error) {
      logger.error('Error getting service stats:', error);
      throw error;
    }
  }

  // Get investor statistics
  static async getInvestorStats() {
    try {
      const [
        totalInvestors,
        activeInvestors,
        pendingApproval,
        approvedInvestors,
        rejectedInvestors
      ] = await Promise.all([
        Investor.getStats(),
        Investor.getActiveInvestors(),
        Investor.getPendingApproval(),
        Investor.getApprovedInvestors(),
        Investor.getRejectedInvestors()
      ]);

      return {
        total: totalInvestors.total || 0,
        active: activeInvestors.length || 0,
        pendingApproval: pendingApproval.length || 0,
        approved: approvedInvestors.length || 0,
        rejected: rejectedInvestors.length || 0
      };
    } catch (error) {
      logger.error('Error getting investor stats:', error);
      throw error;
    }
  }

  // Get report statistics
  static async getReportStats() {
    try {
      const [
        totalReports,
        pendingReports,
        resolvedReports,
        urgentReports
      ] = await Promise.all([
        Report.getStats(),
        Report.getByStatus('pending'),
        Report.getByStatus('resolved'),
        Report.getUrgentReports()
      ]);

      return {
        total: totalReports.total || 0,
        pending: pendingReports.length || 0,
        resolved: resolvedReports.length || 0,
        urgent: urgentReports.length || 0
      };
    } catch (error) {
      logger.error('Error getting report stats:', error);
      throw error;
    }
  }

  // Get system health
  static async getSystemHealth() {
    try {
      const health = await Admin.getSystemHealth();
      return health;
    } catch (error) {
      logger.error('Error getting system health:', error);
      throw error;
    }
  }

  // Get recent activity
  static async getRecentActivity(limit = 50) {
    try {
      const activity = await Admin.getActivityLog(limit);
      return activity;
    } catch (error) {
      logger.error('Error getting recent activity:', error);
      throw error;
    }
  }

  // Update user status
  static async updateUserStatus(userId, status, updatedByAdminId, reason = '') {
    try {
      const admin = await Admin.findById(updatedByAdminId);
      if (!admin || !admin.hasPermission('user_management')) {
        throw new Error('Insufficient permissions to update user status');
      }

      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      const updatedUser = await User.updateStatus(userId, status);

      try {
        await Notification.createNotification({
          user_id: userId,
          type: 'account_status',
          title: 'Account Status Updated',
          message: `Your account status has been updated to: ${status}`,
          data: { status, reason, updatedBy: admin.username }
        });
      } catch (notificationError) {
        logger.warn('Failed to send status update notification:', notificationError);
      }

      await Admin.logActivity(updatedByAdminId, 'user_status_updated', {
        userId,
        oldStatus: user.status,
        newStatus: status,
        reason
      });

      logger.info(`User ${userId} status updated to ${status} by admin ${updatedByAdminId}`);
      return updatedUser;
    } catch (error) {
      logger.error('Error updating user status:', error);
      throw error;
    }
  }

  // Content moderation
  static async moderateContent(contentId, contentType, action, moderatedByAdminId, reason = '') {
    try {
      const admin = await Admin.findById(moderatedByAdminId);
      if (!admin || !admin.hasPermission('content_moderation')) {
        throw new Error('Insufficient permissions for content moderation');
      }

      let result;
      switch (contentType) {
        case 'job':
          result = await this.moderateJob(contentId, action, reason);
          break;
        case 'event':
          result = await this.moderateEvent(contentId, action, reason);
          break;
        case 'service':
          result = await this.moderateService(contentId, action, reason);
          break;
        case 'user':
          result = await this.moderateUser(contentId, action, reason);
          break;
        default:
          throw new Error(`Unknown content type: ${contentType}`);
      }

      await Admin.logActivity(moderatedByAdminId, 'content_moderated', {
        contentType,
        contentId,
        action,
        reason
      });

      logger.info(`Content ${contentId} of type ${contentType} moderated with action ${action} by admin ${moderatedByAdminId}`);
      return result;
    } catch (error) {
      logger.error('Error moderating content:', error);
      throw error;
    }
  }

  // Moderate job
  static async moderateJob(jobId, action, reason) {
    try {
      const job = await Job.findById(jobId);
      if (!job) {
        throw new Error('Job not found');
      }

      switch (action) {
        case 'approve':
          await Job.updateStatus(jobId, 'active');
          break;
        case 'reject':
          await Job.updateStatus(jobId, 'rejected');
          break;
        case 'suspend':
          await Job.updateStatus(jobId, 'suspended');
          break;
        default:
          throw new Error(`Unknown moderation action: ${action}`);
      }

      try {
        await Notification.createNotification({
          user_id: job.employer_id,
          type: 'job_moderated',
          title: 'Job Posting Moderated',
          message: `Your job posting "${job.title}" has been ${action}${reason ? `: ${reason}` : ''}`,
          data: { jobId, action, reason }
        });
      } catch (notificationError) {
        logger.warn('Failed to send job moderation notification:', notificationError);
      }

      return { message: `Job ${action} successfully` };
    } catch (error) {
      logger.error('Error moderating job:', error);
      throw error;
    }
  }

  // Moderate event
  static async moderateEvent(eventId, action, reason) {
    try {
      const event = await Event.findById(eventId);
      if (!event) {
        throw new Error('Event not found');
      }

      switch (action) {
        case 'approve':
          await Event.updateStatus(eventId, 'active');
          break;
        case 'reject':
          await Event.updateStatus(eventId, 'rejected');
          break;
        case 'suspend':
          await Event.updateStatus(eventId, 'suspended');
          break;
        default:
          throw new Error(`Unknown moderation action: ${action}`);
      }

      try {
        await Notification.createNotification({
          user_id: event.organizer_id,
          type: 'event_moderated',
          title: 'Event Moderated',
          message: `Your event "${event.title}" has been ${action}${reason ? `: ${reason}` : ''}`,
          data: { eventId, action, reason }
        });
      } catch (notificationError) {
        logger.warn('Failed to send event moderation notification:', notificationError);
      }

      return { message: `Event ${action} successfully` };
    } catch (error) {
      logger.error('Error moderating event:', error);
      throw error;
    }
  }

  // Moderate service
  static async moderateService(serviceId, action, reason) {
    try {
      const service = await ServiceProvider.findById(serviceId);
      if (!service) {
        throw new Error('Service not found');
      }

      switch (action) {
        case 'approve':
          await ServiceProvider.updateApprovalStatus(serviceId, 'approved');
          break;
        case 'reject':
          await ServiceProvider.updateApprovalStatus(serviceId, 'rejected');
          break;
        case 'suspend':
          await ServiceProvider.updateApprovalStatus(serviceId, 'suspended');
          break;
        default:
          throw new Error(`Unknown moderation action: ${action}`);
      }

      try {
        await Notification.createNotification({
          user_id: service.provider_id,
          type: 'service_moderated',
          title: 'Service Moderated',
          message: `Your service "${service.serviceName}" has been ${action}${reason ? `: ${reason}` : ''}`,
          data: { serviceId, action, reason }
        });
      } catch (notificationError) {
        logger.warn('Failed to send service moderation notification:', notificationError);
      }

      return { message: `Service ${action} successfully` };
    } catch (error) {
      logger.error('Error moderating service:', error);
      throw error;
    }
  }

  // Moderate user
  static async moderateUser(userId, action, reason) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      switch (action) {
        case 'warn':
          await Notification.createNotification({
            user_id: userId,
            type: 'admin_warning',
            title: 'Administrative Warning',
            message: `You have received an administrative warning: ${reason}`,
            data: { action, reason }
          });
          break;
        case 'suspend':
          await User.updateStatus(userId, 'suspended');
          break;
        case 'ban':
          await User.updateStatus(userId, 'banned');
          break;
        default:
          throw new Error(`Unknown moderation action: ${action}`);
      }

      return { message: `User ${action} successfully` };
    } catch (error) {
      logger.error('Error moderating user:', error);
      throw error;
    }
  }

  // Send system-wide notification
  static async sendSystemNotification(notificationData, sentByAdminId) {
    try {
      const admin = await Admin.findById(sentByAdminId);
      if (!admin || !admin.hasPermission('system_notifications')) {
        throw new Error('Insufficient permissions to send system notifications');
      }

      const users = await User.getActiveUsers();
      const userIds = users.map(user => user.id);

      const result = await Notification.sendSystemNotification(userIds, {
        type: 'system',
        title: notificationData.title,
        message: notificationData.message,
        data: notificationData.data || {}
      });

      await Admin.logActivity(sentByAdminId, 'system_notification_sent', {
        title: notificationData.title,
        recipients: userIds.length,
        result
      });

      logger.info(`System notification sent to ${userIds.length} users by admin ${sentByAdminId}`);
      return result;
    } catch (error) {
      logger.error('Error sending system notification:', error);
      throw error;
    }
  }

  // Utility methods

  static validateAdminData(adminData) {
    const errors = [];

    if (!adminData.username || adminData.username.trim().length < 3) {
      errors.push('Username must be at least 3 characters long');
    }

    if (!adminData.email || !this.isValidEmail(adminData.email)) {
      errors.push('Valid email is required');
    }

    if (!adminData.password || adminData.password.length < 8) {
      errors.push('Password must be at least 8 characters long');
    }

    if (adminData.role && !['admin', 'super_admin', 'moderator'].includes(adminData.role)) {
      errors.push('Invalid role specified');
    }

    return errors;
  }

  static isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
}

module.exports = AdminService;
