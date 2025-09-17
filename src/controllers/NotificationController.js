const { query } = require('../config/db');
const { logger } = require('../utils/logger');

class NotificationController {
    /**
     * Save notification to database
     * @param {Object} notificationData - Notification data
     * @param {number} notificationData.user_id - User ID
     * @param {string} notificationData.notification_type - Type: 'topic', 'chat', 'job', 'event', 'system', 'other'
     * @param {string} notificationData.title - Notification title
     * @param {string} notificationData.message - Notification message
     * @param {Object} notificationData.data - Additional data (optional)
     * @param {number} notificationData.source_id - Source ID (event_id, job_id, etc.)
     * @param {string} notificationData.source_type - Source type ('event', 'job', 'chat', etc.)
     * @param {string} notificationData.fcm_message_id - FCM message ID (optional)
     * @returns {Promise<Object>} - Result object
     */
    static async saveNotification(notificationData) {
        try {
            const {
                user_id,
                notification_type,
                title,
                message,
                data = null,
                source_id = null,
                source_type = null,
                fcm_message_id = null
            } = notificationData;

            // Validate required fields
            if (!user_id || !notification_type || !title || !message) {
                throw new Error('Missing required fields: user_id, notification_type, title, message');
            }

            // Validate notification_type
            const validTypes = ['topic', 'chat', 'job', 'event', 'system', 'other'];
            if (!validTypes.includes(notification_type)) {
                throw new Error(`Invalid notification_type. Must be one of: ${validTypes.join(', ')}`);
            }

            const sql = `
                INSERT INTO notifications 
                (user_id, notification_type, title, message, data, source_id, source_type, fcm_message_id, created_dts, status)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), 'sent')
            `;

            const dataJson = data ? JSON.stringify(data) : null;
            
            const result = await query(sql, [
                user_id,
                notification_type,
                title,
                message,
                dataJson,
                source_id,
                source_type,
                fcm_message_id
            ]);

            logger.info(`Notification saved successfully: ID ${result.insertId}, User: ${user_id}, Type: ${notification_type}`);

            // Broadcast dashboard update for notification count change
            try {
                const websocketService = require('../services/websocketService');
                websocketService.sendDashboardUpdateToUser(user_id.toString(), 'notification_created', {
                    notification_id: result.insertId,
                    notification_type: notification_type,
                    title: title,
                    message: message
                });
            } catch (wsError) {
                console.log('Dashboard update broadcast error:', wsError.message);
            }

            return {
                success: true,
                notification_id: result.insertId,
                message: 'Notification saved successfully'
            };

        } catch (error) {
            logger.error(`Error saving notification: ${error.message}`);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Fetch notifications for a user
     * @param {number} user_id - User ID
     * @param {Object} options - Query options
     * @param {number} options.limit - Number of notifications to fetch (default: 50)
     * @param {number} options.offset - Offset for pagination (default: 0)
     * @param {string} options.notification_type - Filter by type (optional)
     * @param {boolean} options.unread_only - Fetch only unread notifications (default: false)
     * @returns {Promise<Object>} - Result object with notifications
     */
    static async fetchNotifications(user_id, options = {}) {
        try {
            const {
                limit = 50,
                offset = 0,
                notification_type = null,
                unread_only = false
            } = options;

            if (!user_id) {
                throw new Error('user_id is required');
            }

            let sql = `
                SELECT 
                    id,
                    user_id,
                    notification_type,
                    title,
                    message,
                    data,
                    source_id,
                    source_type,
                    is_read,
                    created_dts,
                    read_dts,
                    status,
                    fcm_message_id
                FROM notifications 
                WHERE user_id = ?
            `;

            const params = [user_id];

            // Add filters
            if (notification_type) {
                sql += ` AND notification_type = ?`;
                params.push(notification_type);
            }

            if (unread_only) {
                sql += ` AND is_read = 0`;
            }

            // Add ordering and pagination
            sql += ` ORDER BY created_dts DESC LIMIT ? OFFSET ?`;
            params.push(limit, offset);

            const notifications = await query(sql, params);

            // Parse JSON data field (handle both string and object)
            const parsedNotifications = notifications.map(notification => ({
                ...notification,
                data: notification.data ? (typeof notification.data === 'string' ? JSON.parse(notification.data) : notification.data) : null
            }));

            logger.info(`Fetched ${parsedNotifications.length} notifications for user ${user_id}`);

            return {
                success: true,
                notifications: parsedNotifications,
                count: parsedNotifications.length
            };

        } catch (error) {
            logger.error(`Error fetching notifications: ${error.message}`);
            return {
                success: false,
                error: error.message,
                notifications: []
            };
        }
    }

    /**
     * Mark notification as read
     * @param {number} notification_id - Notification ID
     * @param {number} user_id - User ID (for security)
     * @returns {Promise<Object>} - Result object
     */
    static async markAsRead(notification_id, user_id) {
        try {
            if (!notification_id || !user_id) {
                throw new Error('notification_id and user_id are required');
            }

            const sql = `
                UPDATE notifications 
                SET is_read = 1, read_dts = NOW() 
                WHERE id = ? AND user_id = ?
            `;

            const result = await query(sql, [notification_id, user_id]);

            if (result.affectedRows === 0) {
                throw new Error('Notification not found or access denied');
            }

            logger.info(`Notification ${notification_id} marked as read for user ${user_id}`);

            // Broadcast dashboard update for notification count change
            try {
                const websocketService = require('../services/websocketService');
                websocketService.sendDashboardUpdateToUser(user_id.toString(), 'notification_read', {
                    notification_id: notification_id
                });
            } catch (wsError) {
                console.log('Dashboard update broadcast error:', wsError.message);
            }

            return {
                success: true,
                message: 'Notification marked as read'
            };

        } catch (error) {
            logger.error(`Error marking notification as read: ${error.message}`);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Mark all notifications as read for a user
     * @param {number} user_id - User ID
     * @returns {Promise<Object>} - Result object
     */
    static async markAllAsRead(user_id) {
        try {
            if (!user_id) {
                throw new Error('user_id is required');
            }

            const sql = `
                UPDATE notifications 
                SET is_read = 1, read_dts = NOW() 
                WHERE user_id = ? AND is_read = 0
            `;

            const result = await query(sql, [user_id]);

            logger.info(`Marked ${result.affectedRows} notifications as read for user ${user_id}`);

            // Broadcast dashboard update for notification count change
            try {
                const websocketService = require('../services/websocketService');
                websocketService.sendDashboardUpdateToUser(user_id.toString(), 'notifications_all_read', {
                    affected_rows: result.affectedRows
                });
            } catch (wsError) {
                console.log('Dashboard update broadcast error:', wsError.message);
            }

            return {
                success: true,
                message: `${result.affectedRows} notifications marked as read`,
                affected_rows: result.affectedRows
            };

        } catch (error) {
            logger.error(`Error marking all notifications as read: ${error.message}`);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Get notification statistics for a user
     * @param {number} user_id - User ID
     * @returns {Promise<Object>} - Result object with statistics
     */
    static async getNotificationStats(user_id) {
        try {
            if (!user_id) {
                throw new Error('user_id is required');
            }

            const sql = `
                SELECT 
                    COUNT(*) as total_notifications,
                    SUM(CASE WHEN is_read = 0 THEN 1 ELSE 0 END) as unread_count,
                    SUM(CASE WHEN is_read = 1 THEN 1 ELSE 0 END) as read_count,
                    notification_type,
                    COUNT(*) as type_count
                FROM notifications 
                WHERE user_id = ?
                GROUP BY notification_type
                WITH ROLLUP
            `;

            const stats = await query(sql, [user_id]);

            // Separate type-specific stats from total stats
            const typeStats = stats.filter(stat => stat.notification_type !== null);
            const totalStats = stats.find(stat => stat.notification_type === null);

            logger.info(`Fetched notification stats for user ${user_id}`);

            return {
                success: true,
                stats: {
                    total: totalStats ? totalStats.total_notifications : 0,
                    unread: totalStats ? totalStats.unread_count : 0,
                    read: totalStats ? totalStats.read_count : 0,
                    by_type: typeStats
                }
            };

        } catch (error) {
            logger.error(`Error fetching notification stats: ${error.message}`);
            return {
                success: false,
                error: error.message,
                stats: null
            };
        }
    }

    /**
     * Delete notification
     * @param {number} notification_id - Notification ID
     * @param {number} user_id - User ID (for security)
     * @returns {Promise<Object>} - Result object
     */
    static async deleteNotification(notification_id, user_id) {
        try {
            if (!notification_id || !user_id) {
                throw new Error('notification_id and user_id are required');
            }

            const sql = `DELETE FROM notifications WHERE id = ? AND user_id = ?`;
            const result = await query(sql, [notification_id, user_id]);

            if (result.affectedRows === 0) {
                throw new Error('Notification not found or access denied');
            }

            logger.info(`Notification ${notification_id} deleted for user ${user_id}`);

            return {
                success: true,
                message: 'Notification deleted successfully'
            };

        } catch (error) {
            logger.error(`Error deleting notification: ${error.message}`);
            return {
                success: false,
                error: error.message
            };
        }
    }
}

module.exports = NotificationController;
