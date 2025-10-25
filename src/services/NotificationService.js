'use strict';

const Notification = require('../models/Notification');
const User = require('../models/User');
const Settings = require('../models/Settings');
const { logger } = require('../utils/logger');
const { sendEmail } = require('./EmailService');

class NotificationService {
  // Create and send notification
  static async createNotification(notificationData) {
    try {
      // Validate notification data
      const validationErrors = NotificationService.validateNotificationData(notificationData);
      if (validationErrors.length > 0) {
        throw new Error(`Validation failed: ${validationErrors.join(', ')}`);
      }

      // Create notification
      const notification = await Notification.create(notificationData);

      // Check user notification preferences
      const userSettings = await Settings.get(notification.user_id, 'notifications.push');
      if (userSettings && userSettings.setting_value === true) {
        // Send push notification (would integrate with push service)
        try {
          await NotificationService.sendPushNotification(notification);
        } catch (pushError) {
          logger.warn('Failed to send push notification:', pushError);
        }
      }

      // Check if email notification is enabled
      const emailEnabled = await Settings.get(notification.user_id, 'notifications.email');
      if (emailEnabled && emailEnabled.setting_value === true) {
        // Send email notification
        try {
          await NotificationService.sendEmailNotification(notification);
        } catch (emailError) {
          logger.warn('Failed to send email notification:', emailError);
        }
      }

      return notification;
    } catch (error) {
      logger.error('Error creating notification:', error);
      throw error;
    }
  }

  // Create bulk notifications
  static async createBulkNotifications(notificationsData) {
    try {
      const notifications = await Notification.createBulk(notificationsData);

      // Process notifications based on user preferences
      for (const notification of notifications) {
        try {
          await NotificationService.processNotificationPreferences(notification);
        } catch (error) {
          logger.warn(`Failed to process notification preferences for ${notification.id}:`, error);
        }
      }

      return notifications;
    } catch (error) {
      logger.error('Error creating bulk notifications:', error);
      throw error;
    }
  }

  // Send system notification to multiple users
  static async sendSystemNotification(userIds, notificationData) {
    try {
      const notifications = await Notification.createSystemNotification(userIds, notificationData);

      // Process each notification based on user preferences
      for (const notificationId of notifications) {
        try {
          const notification = await Notification.findById(notificationId);
          await NotificationService.processNotificationPreferences(notification);
        } catch (error) {
          logger.warn(`Failed to process system notification ${notificationId}:`, error);
        }
      }

      return {
        total: userIds.length,
        sent: notifications.length,
        message: 'System notifications sent successfully'
      };
    } catch (error) {
      logger.error('Error sending system notifications:', error);
      throw error;
    }
  }

  // Mark notification as read
  static async markAsRead(notificationId, userId) {
    try {
      // Verify notification ownership
      const notification = await Notification.findById(notificationId);
      if (!notification || notification.user_id !== userId) {
        throw new Error('Notification not found or unauthorized');
      }

      const updatedNotification = await Notification.markAsRead(notificationId);
      return updatedNotification;
    } catch (error) {
      logger.error('Error marking notification as read:', error);
      throw error;
    }
  }

  // Mark all notifications as read for a user
  static async markAllAsRead(userId) {
    try {
      await Notification.markAllAsRead(userId);
      return { message: 'All notifications marked as read' };
    } catch (error) {
      logger.error('Error marking all notifications as read:', error);
      throw error;
    }
  }

  // Mark notifications as read by type
  static async markAsReadByType(userId, type) {
    try {
      await Notification.markAsReadByType(userId, type);
      return { message: `All ${type} notifications marked as read` };
    } catch (error) {
      logger.error('Error marking notifications as read by type:', error);
      throw error;
    }
  }

  // Get user notifications with filtering
  static async getUserNotifications(userId, options = {}) {
    try {
      const {
        page = 1,
        limit = 20,
        type = null,
        isRead = null,
        startDate = null,
        endDate = null
      } = options;

      // Build filter options
      const filterOptions = {
        page,
        limit,
        type,
        isRead
      };

      // Add date filtering if provided
      if (startDate || endDate) {
        filterOptions.startDate = startDate;
        filterOptions.endDate = endDate;
      }

      const notifications = await Notification.getByUserId(userId, filterOptions);
      return notifications;
    } catch (error) {
      logger.error('Error getting user notifications:', error);
      throw error;
    }
  }

  // Get notification statistics for a user
  static async getUserNotificationStats(userId) {
    try {
      const stats = await Notification.getStats(userId);
      return stats;
    } catch (error) {
      logger.error('Error getting user notification stats:', error);
      throw error;
    }
  }

  // Search notifications
  static async searchNotifications(userId, searchTerm, options = {}) {
    try {
      const notifications = await Notification.search(userId, searchTerm, options);
      return notifications;
    } catch (error) {
      logger.error('Error searching notifications:', error);
      throw error;
    }
  }

  // Delete notification
  static async deleteNotification(notificationId, userId) {
    try {
      // Verify notification ownership
      const notification = await Notification.findById(notificationId);
      if (!notification || notification.user_id !== userId) {
        throw new Error('Notification not found or unauthorized');
      }

      await Notification.delete(notificationId);
      return { message: 'Notification deleted successfully' };
    } catch (error) {
      logger.error('Error deleting notification:', error);
      throw error;
    }
  }

  // Delete all notifications for a user
  static async deleteAllNotifications(userId) {
    try {
      await Notification.deleteAllForUser(userId);
      return { message: 'All notifications deleted successfully' };
    } catch (error) {
      logger.error('Error deleting all notifications:', error);
      throw error;
    }
  }

  // Delete read notifications for a user
  static async deleteReadNotifications(userId) {
    try {
      await Notification.deleteReadForUser(userId);
      return { message: 'Read notifications deleted successfully' };
    } catch (error) {
      logger.error('Error deleting read notifications:', error);
      throw error;
    }
  }

  // Get unread notification count
  static async getUnreadCount(userId) {
    try {
      const count = await Notification.getUnreadCount(userId);
      return count;
    } catch (error) {
      logger.error('Error getting unread notification count:', error);
      throw error;
    }
  }

  // Send notification to specific user groups
  static async sendToUserGroup(groupCriteria, notificationData) {
    try {
      // Find users based on criteria
      const users = await User.search(groupCriteria);
      const userIds = users.map(user => user.id);

      if (userIds.length === 0) {
        return { message: 'No users found matching criteria', sent: 0 };
      }

      // Send notifications
      const result = await NotificationService.sendSystemNotification(userIds, notificationData);
      return result;
    } catch (error) {
      logger.error('Error sending notifications to user group:', error);
      throw error;
    }
  }

  // Send notification to users by location
  static async sendToUsersByLocation(location, notificationData) {
    try {
      const users = await User.search({ location });
      const userIds = users.map(user => user.id);

      if (userIds.length === 0) {
        return { message: 'No users found in specified location', sent: 0 };
      }

      const result = await NotificationService.sendSystemNotification(userIds, notificationData);
      return result;
    } catch (error) {
      logger.error('Error sending notifications to users by location:', error);
      throw error;
    }
  }

  // Send notification to users by skills
  static async sendToUsersBySkills(skills, notificationData) {
    try {
      const users = await User.search({ skills });
      const userIds = users.map(user => user.id);

      if (userIds.length === 0) {
        return { message: 'No users found with specified skills', sent: 0 };
      }

      const result = await NotificationService.sendSystemNotification(userIds, notificationData);
      return result;
    } catch (error) {
      logger.error('Error sending notifications to users by skills:', error);
      throw error;
    }
  }

  // Send notification to users by interests
  static async sendToUsersByInterests(interests, notificationData) {
    try {
      const users = await User.search({ interests });
      const userIds = users.map(user => user.id);

      if (userIds.length === 0) {
        return { message: 'No users found with specified interests', sent: 0 };
      }

      const result = await NotificationService.sendSystemNotification(userIds, notificationData);
      return result;
    } catch (error) {
      logger.error('Error sending notifications to users by interests:', error);
      throw error;
    }
  }

  // Process notification preferences and send appropriate notifications
  static async processNotificationPreferences(notification) {
    try {
      const userId = notification.user_id;

      // Check push notification preference
      const pushEnabled = await Settings.get(userId, 'notifications.push');
      if (pushEnabled && pushEnabled.setting_value === true) {
        await NotificationService.sendPushNotification(notification);
      }

      // Check email notification preference
      const emailEnabled = await Settings.get(userId, 'notifications.email');
      if (emailEnabled && emailEnabled.setting_value === true) {
        await NotificationService.sendEmailNotification(notification);
      }

      // Check SMS notification preference
      const smsEnabled = await Settings.get(userId, 'notifications.sms');
      if (smsEnabled && smsEnabled.setting_value === true) {
        await NotificationService.sendSMSNotification(notification);
      }
    } catch (error) {
      logger.error('Error processing notification preferences:', error);
      throw error;
    }
  }

  // Send push notification
  static async sendPushNotification(notification) {
    try {
      // This would integrate with a push notification service (Firebase, OneSignal, etc.)
      // For now, we'll log the attempt
      logger.info('Push notification would be sent:', {
        notificationId: notification.id,
        userId: notification.user_id,
        title: notification.title,
        message: notification.message
      });

      // TODO: Implement actual push notification logic
      // Example:
      // await pushService.send({
      //   userId: notification.user_id,
      //   title: notification.title,
      //   body: notification.message,
      //   data: notification.data
      // });

      return true;
    } catch (error) {
      logger.error('Error sending push notification:', error);
      throw error;
    }
  }

  // Send email notification
  static async sendEmailNotification(notification) {
    try {
      // Get user details
      const user = await User.findById(notification.user_id);
      if (!user) {
        throw new Error('User not found');
      }

      // Determine email template based on notification type
      const template = NotificationService.getEmailTemplateForType(notification.type);
      
      // Send email
      await sendEmail({
        to: user.email,
        subject: notification.title,
        template,
        data: {
          name: user.name,
          title: notification.title,
          message: notification.message,
          ...notification.data
        }
      });

      return true;
    } catch (error) {
      logger.error('Error sending email notification:', error);
      throw error;
    }
  }

  // Send SMS notification
  static async sendSMSNotification(notification) {
    try {
      // This would integrate with an SMS service (Twilio, etc.)
      // For now, we'll log the attempt
      logger.info('SMS notification would be sent:', {
        notificationId: notification.id,
        userId: notification.user_id,
        message: notification.message
      });

      // TODO: Implement actual SMS logic
      // Example:
      // await smsService.send({
      //   to: user.phone,
      //   message: notification.message
      // });

      return true;
    } catch (error) {
      logger.error('Error sending SMS notification:', error);
      throw error;
    }
  }

  // Get email template for notification type
  static getEmailTemplateForType(notificationType) {
    const templateMap = {
      'profile_update': 'profile_update',
      'new_connection': 'connection_request',
      'connection_accepted': 'connection_accepted',
      'new_job': 'new_job_opportunity',
      'job_application': 'job_application_submitted',
      'application_update': 'application_status_update',
      'new_event': 'new_event',
      'event_registration': 'event_registration_confirmed',
      'event_update': 'event_updated',
      'event_reminder': 'event_reminder',
      'system': 'system_notification',
      'security': 'security_alert',
      'welcome': 'welcome'
    };

    return templateMap[notificationType] || 'general_notification';
  }

  // Clean old notifications
  static async cleanOldNotifications(daysOld = 90) {
    try {
      const deletedCount = await Notification.cleanOldNotifications(daysOld);
      logger.info(`Cleaned ${deletedCount} old notifications`);
      return { deletedCount, message: 'Old notifications cleaned successfully' };
    } catch (error) {
      logger.error('Error cleaning old notifications:', error);
      throw error;
    }
  }

  // Get notification types
  static async getNotificationTypes() {
    try {
      const types = await Notification.getTypes();
      return types;
    } catch (error) {
      logger.error('Error getting notification types:', error);
      throw error;
    }
  }

  // Get notification statistics
  static async getNotificationStats(options = {}) {
    try {
      const stats = await Notification.getStats(options);
      return stats;
    } catch (error) {
      logger.error('Error getting notification statistics:', error);
      throw error;
    }
  }

  // Send welcome notification to new users
  static async sendWelcomeNotification(userId) {
    try {
      const notification = await NotificationService.createNotification({
        user_id: userId,
        type: 'welcome',
        title: 'Welcome to AlphaLinkup!',
        message: 'Welcome to our professional networking platform. We\'re excited to have you on board!',
        data: { type: 'welcome' }
      });

      return notification;
    } catch (error) {
      logger.error('Error sending welcome notification:', error);
      throw error;
    }
  }

  // Send security alert notification
  static async sendSecurityAlert(userId, alertType, details = {}) {
    try {
      const alertMessages = {
        'password_changed': 'Your password was changed successfully',
        'login_new_device': 'New device login detected',
        'suspicious_activity': 'Suspicious activity detected on your account',
        'account_locked': 'Your account has been temporarily locked for security reasons'
      };

      const notification = await NotificationService.createNotification({
        user_id: userId,
        type: 'security',
        title: 'Security Alert',
        message: alertMessages[alertType] || 'Security alert on your account',
        data: { alertType, details }
      });

      return notification;
    } catch (error) {
      logger.error('Error sending security alert:', error);
      throw error;
    }
  }

  // Send reminder notifications
  static async sendReminderNotifications(reminderType, criteria, message) {
    try {
      let users = [];

      switch (reminderType) {
        case 'profile_completion':
          users = await User.search({ profileCompletion: 'incomplete' });
          break;
        case 'event_reminder':
          users = await User.search({ hasUpcomingEvents: true });
          break;
        case 'connection_suggestion':
          users = await User.search({ lowConnections: true });
          break;
        default:
          throw new Error(`Unknown reminder type: ${reminderType}`);
      }

      const userIds = users.map(user => user.id);

      if (userIds.length === 0) {
        return { message: 'No users found for reminder', sent: 0 };
      }

      const notifications = userIds.map(userId => ({
        user_id: userId,
        type: 'reminder',
        title: 'Reminder',
        message,
        data: { reminderType }
      }));

      const result = await NotificationService.createBulkNotifications(notifications);
      return result;
    } catch (error) {
      logger.error('Error sending reminder notifications:', error);
      throw error;
    }
  }

  // Validation Methods

  static validateNotificationData(notificationData) {
    const errors = [];

    if (!notificationData.user_id) {
      errors.push('User ID is required');
    }

    if (!notificationData.type) {
      errors.push('Notification type is required');
    }

    if (!notificationData.title || notificationData.title.trim().length < 1) {
      errors.push('Notification title is required');
    }

    if (!notificationData.message || notificationData.message.trim().length < 1) {
      errors.push('Notification message is required');
    }

    // Validate notification type
    const validTypes = [
      'profile_update', 'new_connection', 'connection_accepted', 'connection_request',
      'new_job', 'job_application', 'application_update', 'new_event',
      'event_registration', 'event_update', 'event_reminder', 'system',
      'security', 'welcome', 'reminder'
    ];

    if (!validTypes.includes(notificationData.type)) {
      errors.push('Invalid notification type');
    }

    return errors;
  }
}

module.exports = NotificationService;
