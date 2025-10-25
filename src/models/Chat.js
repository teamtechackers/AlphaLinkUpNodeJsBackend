'use strict';

const { query } = require('../config/db');
const { idEncode, idDecode } = require('../utils/idCodec');
const { logger } = require('../utils/logger');

class Chat {
  constructor(data = {}) {
    this.chat_id = data.chat_id;
    this.sender_id = data.sender_id;
    this.receiver_id = data.receiver_id;
    this.message = data.message;
    this.message_type = data.message_type || 'text';
    this.is_read = data.is_read || 0;
    this.deleted = data.deleted || 0;
    this.created_dts = data.created_dts;
    this.updated_dts = data.updated_dts;
    
    // Joined fields
    this.sender_name = data.sender_name;
    this.sender_photo = data.sender_photo;
    this.receiver_name = data.receiver_name;
    this.receiver_photo = data.receiver_photo;
  }

  // Send a message
  static async sendMessage(messageData) {
    try {
      const result = await query(
        `INSERT INTO user_chats (
          sender_id, receiver_id, message, message_type, created_dts
        ) VALUES (?, ?, ?, ?, NOW())`,
        [
          messageData.sender_id, messageData.receiver_id,
          messageData.message, messageData.message_type || 'text'
        ]
      );

      return result.insertId;
    } catch (error) {
      logger.error('Error sending message:', error);
      throw error;
    }
  }

  // Get chat conversation between two users
  static async getConversation(userId1, userId2, pagination = { page: 1, limit: 50 }) {
    try {
      const { page, limit } = pagination;
      const offset = (page - 1) * limit;

      const [total] = await query(
        `SELECT COUNT(*) AS total 
         FROM user_chats 
         WHERE ((sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?))
         AND deleted = 0`,
        [userId1, userId2, userId2, userId1]
      );

      const messages = await query(
        `SELECT c.*, 
                s.full_name AS sender_name, s.profile_photo AS sender_photo,
                r.full_name AS receiver_name, r.profile_photo AS receiver_photo
         FROM user_chats c
         JOIN users s ON s.user_id = c.sender_id
         JOIN users r ON r.user_id = c.receiver_id
         WHERE ((c.sender_id = ? AND c.receiver_id = ?) OR (c.sender_id = ? AND c.receiver_id = ?))
         AND c.deleted = 0
         ORDER BY c.created_dts DESC
         LIMIT ? OFFSET ?`,
        [userId1, userId2, userId2, userId1, limit, offset]
      );

      return {
        messages: messages.map(msg => new Chat(msg)),
        pagination: {
          page,
          limit,
          total: total.total,
          totalPages: Math.ceil(total.total / limit)
        }
      };
    } catch (error) {
      logger.error('Error getting conversation:', error);
      throw error;
    }
  }

  // Get chat users list for a user
  static async getChatUsers(userId) {
    try {
      const chatUsers = await query(
        `SELECT DISTINCT 
                CASE 
                  WHEN c.sender_id = ? THEN c.receiver_id
                  ELSE c.sender_id
                END AS chat_user_id,
                u.full_name, u.profile_photo, u.mobile,
                MAX(c.created_dts) AS last_message_time,
                MAX(c.message) AS last_message,
                MAX(CASE WHEN c.sender_id = ? THEN 1 ELSE 0 END) AS is_sender,
                COUNT(CASE WHEN c.is_read = 0 AND c.receiver_id = ? THEN 1 END) AS unread_count
         FROM user_chats c
         JOIN users u ON u.user_id = CASE 
           WHEN c.sender_id = ? THEN c.receiver_id
           ELSE c.sender_id
         END
         WHERE (c.sender_id = ? OR c.receiver_id = ?) AND c.deleted = 0
         GROUP BY chat_user_id
         ORDER BY last_message_time DESC`,
        [userId, userId, userId, userId, userId, userId]
      );

      return chatUsers;
    } catch (error) {
      logger.error('Error getting chat users:', error);
      throw error;
    }
  }

  // Mark messages as read
  static async markAsRead(senderId, receiverId) {
    try {
      const result = await query(
        'UPDATE user_chats SET is_read = 1, updated_dts = NOW() WHERE sender_id = ? AND receiver_id = ? AND is_read = 0',
        [senderId, receiverId]
      );

      return result.affectedRows;
    } catch (error) {
      logger.error('Error marking messages as read:', error);
      throw error;
    }
  }

  // Get unread message count for a user
  static async getUnreadCount(userId) {
    try {
      const [result] = await query(
        'SELECT COUNT(*) AS count FROM user_chats WHERE receiver_id = ? AND is_read = 0 AND deleted = 0',
        [userId]
      );

      return result.count;
    } catch (error) {
      logger.error('Error getting unread count:', error);
      throw error;
    }
  }

  // Get unread messages for a specific conversation
  static async getUnreadMessages(senderId, receiverId) {
    try {
      const messages = await query(
        'SELECT * FROM user_chats WHERE sender_id = ? AND receiver_id = ? AND is_read = 0 AND deleted = 0 ORDER BY created_dts ASC',
        [senderId, receiverId]
      );

      return messages.map(msg => new Chat(msg));
    } catch (error) {
      logger.error('Error getting unread messages:', error);
      throw error;
    }
  }

  // Delete a message (soft delete)
  async deleteMessage() {
    try {
      const result = await query(
        'UPDATE user_chats SET deleted = 1, updated_dts = NOW() WHERE chat_id = ?',
        [this.chat_id]
      );

      if (result.affectedRows > 0) {
        this.deleted = 1;
        this.updated_dts = new Date();
        return true;
      }

      return false;
    } catch (error) {
      logger.error('Error deleting message:', error);
      throw error;
    }
  }

  // Edit a message
  async editMessage(newMessage) {
    try {
      const result = await query(
        'UPDATE user_chats SET message = ?, updated_dts = NOW() WHERE chat_id = ? AND sender_id = ?',
        [newMessage, this.chat_id, this.sender_id]
      );

      if (result.affectedRows > 0) {
        this.message = newMessage;
        this.updated_dts = new Date();
        return true;
      }

      return false;
    } catch (error) {
      logger.error('Error editing message:', error);
      throw error;
    }
  }

  // Get recent conversations for a user
  static async getRecentConversations(userId, limit = 10) {
    try {
      const conversations = await query(
        `SELECT DISTINCT 
                CASE 
                  WHEN c.sender_id = ? THEN c.receiver_id
                  ELSE c.sender_id
                END AS chat_user_id,
                u.full_name, u.profile_photo, u.mobile,
                MAX(c.created_dts) AS last_message_time,
                MAX(c.message) AS last_message,
                MAX(CASE WHEN c.sender_id = ? THEN 1 ELSE 0 END) AS is_sender,
                COUNT(CASE WHEN c.is_read = 0 AND c.receiver_id = ? THEN 1 END) AS unread_count
         FROM user_chats c
         JOIN users u ON u.user_id = CASE 
           WHEN c.sender_id = ? THEN c.receiver_id
           ELSE c.sender_id
         END
         WHERE (c.sender_id = ? OR c.receiver_id = ?) AND c.deleted = 0
         GROUP BY chat_user_id
         ORDER BY last_message_time DESC
         LIMIT ?`,
        [userId, userId, userId, userId, userId, userId, limit]
      );

      return conversations;
    } catch (error) {
      logger.error('Error getting recent conversations:', error);
      throw error;
    }
  }

  // Search messages in a conversation
  static async searchMessages(userId1, userId2, searchTerm, pagination = { page: 1, limit: 20 }) {
    try {
      const { page, limit } = pagination;
      const offset = (page - 1) * limit;

      const [total] = await query(
        `SELECT COUNT(*) AS total 
         FROM user_chats 
         WHERE ((sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?))
         AND deleted = 0 AND message LIKE ?`,
        [userId1, userId2, userId2, userId1, `%${searchTerm}%`]
      );

      const messages = await query(
        `SELECT c.*, 
                s.full_name AS sender_name, s.profile_photo AS sender_photo,
                r.full_name AS receiver_name, r.profile_photo AS receiver_photo
         FROM user_chats c
         JOIN users s ON s.user_id = c.sender_id
         JOIN users r ON r.user_id = c.receiver_id
         WHERE ((c.sender_id = ? AND c.receiver_id = ?) OR (c.sender_id = ? AND c.receiver_id = ?))
         AND c.deleted = 0 AND c.message LIKE ?
         ORDER BY c.created_dts DESC
         LIMIT ? OFFSET ?`,
        [userId1, userId2, userId2, userId1, `%${searchTerm}%`, limit, offset]
      );

      return {
        messages: messages.map(msg => new Chat(msg)),
        pagination: {
          page,
          limit,
          total: total.total,
          totalPages: Math.ceil(total.total / limit)
        }
      };
    } catch (error) {
      logger.error('Error searching messages:', error);
      throw error;
    }
  }

  // Get chat statistics for a user
  static async getChatStats(userId) {
    try {
      const [stats] = await query(
        `SELECT 
          COUNT(DISTINCT CASE WHEN c.sender_id = ? THEN c.receiver_id ELSE c.sender_id END) AS total_conversations,
          COUNT(CASE WHEN c.receiver_id = ? AND c.is_read = 0 THEN 1 END) AS total_unread,
          COUNT(CASE WHEN c.sender_id = ? THEN 1 END) AS total_sent,
          COUNT(CASE WHEN c.receiver_id = ? THEN 1 END) AS total_received
         FROM user_chats c
         WHERE (c.sender_id = ? OR c.receiver_id = ?) AND c.deleted = 0`,
        [userId, userId, userId, userId, userId, userId]
      );

      return stats;
    } catch (error) {
      logger.error('Error getting chat stats:', error);
      throw error;
    }
  }

  // Get chat by encoded ID
  static async findByEncodedId(encodedId) {
    try {
      const chatId = idDecode(encodedId);
      if (!chatId) return null;
      
      const [chat] = await query(
        `SELECT c.*, 
                s.full_name AS sender_name, s.profile_photo AS sender_photo,
                r.full_name AS receiver_name, r.profile_photo AS receiver_photo
         FROM user_chats c
         JOIN users s ON s.user_id = c.sender_id
         JOIN users r ON r.user_id = c.receiver_id
         WHERE c.chat_id = ? AND c.deleted = 0`,
        [chatId]
      );

      return chat ? new Chat(chat) : null;
    } catch (error) {
      logger.error('Error finding chat by encoded ID:', error);
      return null;
    }
  }

  // Get encoded chat ID for API responses
  getEncodedId() {
    return idEncode(this.chat_id);
  }

  // Get public chat data (for sharing)
  getPublicData() {
    return {
      chat_id: this.getEncodedId(),
      sender_id: this.sender_id,
      receiver_id: this.receiver_id,
      message: this.message,
      message_type: this.message_type,
      is_read: this.is_read,
      created_dts: this.created_dts,
      sender_name: this.sender_name,
      sender_photo: this.sender_photo,
      receiver_name: this.receiver_name,
      receiver_photo: this.receiver_photo
    };
  }

  // Check if user can edit message
  canEdit(userId) {
    // Users can only edit their own messages
    return this.sender_id === userId;
  }

  // Check if user can delete message
  canDelete(userId) {
    // Users can only delete their own messages
    return this.sender_id === userId;
  }

  // Get message age in minutes
  getMessageAge() {
    const now = new Date();
    const messageTime = new Date(this.created_dts);
    const diffMs = now - messageTime;
    return Math.floor(diffMs / (1000 * 60));
  }

  // Check if message can be edited (within 5 minutes)
  canBeEdited() {
    return this.getMessageAge() <= 5;
  }

  // Get formatted message time
  getFormattedTime() {
    const messageTime = new Date(this.created_dts);
    const now = new Date();
    const diffMs = now - messageTime;
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMinutes < 1) return 'Just now';
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return messageTime.toLocaleDateString();
  }

  // Get chat participants
  static async getChatParticipants(chatId) {
    try {
      const participants = await query(
        `SELECT DISTINCT u.user_id, u.full_name, u.profile_photo, u.mobile
         FROM user_chats c
         JOIN users u ON u.user_id IN (c.sender_id, c.receiver_id)
         WHERE c.chat_id = ? AND c.deleted = 0`,
        [chatId]
      );

      return participants;
    } catch (error) {
      logger.error('Error getting chat participants:', error);
      throw error;
    }
  }

  // Check if users have a conversation
  static async hasConversation(userId1, userId2) {
    try {
      const [result] = await query(
        `SELECT COUNT(*) AS count 
         FROM user_chats 
         WHERE ((sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?))
         AND deleted = 0`,
        [userId1, userId2, userId2, userId1]
      );

      return result.count > 0;
    } catch (error) {
      logger.error('Error checking conversation existence:', error);
      throw error;
    }
  }

  // Get last message in conversation
  static async getLastMessage(userId1, userId2) {
    try {
      const [message] = await query(
        `SELECT c.*, 
                s.full_name AS sender_name, s.profile_photo AS sender_photo
         FROM user_chats c
         JOIN users s ON s.user_id = c.sender_id
         WHERE ((c.sender_id = ? AND c.receiver_id = ?) OR (c.sender_id = ? AND c.receiver_id = ?))
         AND c.deleted = 0
         ORDER BY c.created_dts DESC
         LIMIT 1`,
        [userId1, userId2, userId2, userId1]
      );

      return message ? new Chat(message) : null;
    } catch (error) {
      logger.error('Error getting last message:', error);
      throw error;
    }
  }
}

module.exports = Chat;
