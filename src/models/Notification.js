'use strict';

const { query } = require('../config/db');
const { idEncode, idDecode } = require('../utils/idCodec');
const { logger } = require('../utils/logger');

class Notification {
  constructor(data = {}) {
    this.id = data.id;
    this.user_id = data.user_id;
    this.type = data.type;
    this.title = data.title;
    this.message = data.message;
    this.data = data.data;
    this.is_read = data.is_read || 0;
    this.read_at = data.read_at;
    this.created_at = data.created_at;
    this.updated_at = data.updated_at;
  }

  // Create a new notification
  static async create(notificationData) {
    try {
      const { user_id, type, title, message, data = null } = notificationData;
      
      const result = await query(
        'INSERT INTO notifications (user_id, type, title, message, data, created_at, updated_at) VALUES (?, ?, ?, ?, ?, NOW(), NOW())',
        [user_id, type, title, message, data ? JSON.stringify(data) : null]
      );

      const notificationId = result.insertId;
      return await Notification.findById(notificationId);
    } catch (error) {
      logger.error('Error creating notification:', error);
      throw error;
    }
  }

  // Get notification by ID
  static async findById(notificationId) {
    try {
      const [notification] = await query(
        'SELECT * FROM notifications WHERE id = ?',
        [notificationId]
      );

      if (notification && notification.data) {
        try {
          notification.data = JSON.parse(notification.data);
        } catch (e) {
          notification.data = null;
        }
      }

      return notification;
    } catch (error) {
      logger.error('Error getting notification by ID:', error);
      throw error;
    }
  }

  // Get notifications for a user
  static async getByUserId(userId, options = {}) {
    try {
      const { page = 1, limit = 20, type = null, isRead = null } = options;
      const offset = (page - 1) * limit;

      let whereClause = 'WHERE user_id = ?';
      let params = [userId];

      if (type) {
        whereClause += ' AND type = ?';
        params.push(type);
      }

      if (isRead !== null) {
        whereClause += ' AND is_read = ?';
        params.push(isRead);
      }

      const notifications = await query(
        `SELECT * FROM notifications ${whereClause} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
        [...params, limit, offset]
      );

      // Parse JSON data for each notification
      notifications.forEach(notification => {
        if (notification.data) {
          try {
            notification.data = JSON.parse(notification.data);
          } catch (e) {
            notification.data = null;
          }
        }
      });

      return notifications;
    } catch (error) {
      logger.error('Error getting notifications by user ID:', error);
      throw error;
    }
  }

  // Get unread notifications count for a user
  static async getUnreadCount(userId) {
    try {
      const [result] = await query(
        'SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = 0',
        [userId]
      );
      return result.count;
    } catch (error) {
      logger.error('Error getting unread notifications count:', error);
      throw error;
    }
  }

  // Mark notification as read
  static async markAsRead(notificationId) {
    try {
      await query(
        'UPDATE notifications SET is_read = 1, read_at = NOW(), updated_at = NOW() WHERE id = ?',
        [notificationId]
      );
      return await Notification.findById(notificationId);
    } catch (error) {
      logger.error('Error marking notification as read:', error);
      throw error;
    }
  }

  // Mark all notifications as read for a user
  static async markAllAsRead(userId) {
    try {
      await query(
        'UPDATE notifications SET is_read = 1, read_at = NOW(), updated_at = NOW() WHERE user_id = ? AND is_read = 0',
        [userId]
      );
      return true;
    } catch (error) {
      logger.error('Error marking all notifications as read:', error);
      throw error;
    }
  }

  // Mark notifications as read by type
  static async markAsReadByType(userId, type) {
    try {
      await query(
        'UPDATE notifications SET is_read = 1, read_at = NOW(), updated_at = NOW() WHERE user_id = ? AND type = ? AND is_read = 0',
        [userId, type]
      );
      return true;
    } catch (error) {
      logger.error('Error marking notifications as read by type:', error);
      throw error;
    }
  }

  // Delete notification
  static async delete(notificationId) {
    try {
      await query('DELETE FROM notifications WHERE id = ?', [notificationId]);
      return true;
    } catch (error) {
      logger.error('Error deleting notification:', error);
      throw error;
    }
  }

  // Delete all notifications for a user
  static async deleteAllForUser(userId) {
    try {
      await query('DELETE FROM notifications WHERE user_id = ?', [userId]);
      return true;
    } catch (error) {
      logger.error('Error deleting all notifications for user:', error);
      throw error;
    }
  }

  // Delete read notifications for a user
  static async deleteReadForUser(userId) {
    try {
      await query('DELETE FROM notifications WHERE user_id = ? AND is_read = 1', [userId]);
      return true;
    } catch (error) {
      logger.error('Error deleting read notifications for user:', error);
      throw error;
    }
  }

  // Get notification statistics for a user
  static async getStats(userId) {
    try {
      const [total] = await query(
        'SELECT COUNT(*) as count FROM notifications WHERE user_id = ?',
        [userId]
      );

      const [unread] = await query(
        'SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = 0',
        [userId]
      );

      const [typeStats] = await query(
        'SELECT type, COUNT(*) as count FROM notifications WHERE user_id = ? GROUP BY type',
        [userId]
      );

      return {
        total: total.count,
        unread: unread.count,
        read: total.count - unread.count,
        byType: typeStats
      };
    } catch (error) {
      logger.error('Error getting notification statistics:', error);
      throw error;
    }
  }

  // Create system notification
  static async createSystemNotification(userIds, notificationData) {
    try {
      const { type, title, message, data = null } = notificationData;
      const notifications = [];

      for (const userId of userIds) {
        const result = await query(
          'INSERT INTO notifications (user_id, type, title, message, data, created_at, updated_at) VALUES (?, ?, ?, ?, ?, NOW(), NOW())',
          [userId, type, title, message, data ? JSON.stringify(data) : null]
        );
        notifications.push(result.insertId);
      }

      return notifications;
    } catch (error) {
      logger.error('Error creating system notifications:', error);
      throw error;
    }
  }

  // Create bulk notifications
  static async createBulk(notificationsData) {
    try {
      const notifications = [];
      
      for (const notificationData of notificationsData) {
        const notification = await Notification.create(notificationData);
        notifications.push(notification);
      }

      return notifications;
    } catch (error) {
      logger.error('Error creating bulk notifications:', error);
      throw error;
    }
  }

  // Search notifications
  static async search(userId, searchTerm, options = {}) {
    try {
      const { page = 1, limit = 20, type = null } = options;
      const offset = (page - 1) * limit;

      let whereClause = 'WHERE user_id = ? AND (title LIKE ? OR message LIKE ?)';
      let params = [userId, `%${searchTerm}%`, `%${searchTerm}%`];

      if (type) {
        whereClause += ' AND type = ?';
        params.push(type);
      }

      const notifications = await query(
        `SELECT * FROM notifications ${whereClause} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
        [...params, limit, offset]
      );

      // Parse JSON data for each notification
      notifications.forEach(notification => {
        if (notification.data) {
          try {
            notification.data = JSON.parse(notification.data);
          } catch (e) {
            notification.data = null;
          }
        }
      });

      return notifications;
    } catch (error) {
      logger.error('Error searching notifications:', error);
      throw error;
    }
  }

  // Get notification types
  static async getTypes() {
    try {
      const types = await query(
        'SELECT DISTINCT type FROM notifications ORDER BY type ASC'
      );
      return types.map(t => t.type);
    } catch (error) {
      logger.error('Error getting notification types:', error);
      throw error;
    }
  }

  // Clean old notifications
  static async cleanOldNotifications(daysOld = 90) {
    try {
      const result = await query(
        'DELETE FROM notifications WHERE created_at < DATE_SUB(NOW(), INTERVAL ? DAY)',
        [daysOld]
      );
      return result.affectedRows;
    } catch (error) {
      logger.error('Error cleaning old notifications:', error);
      throw error;
    }
  }
}

module.exports = Notification;
