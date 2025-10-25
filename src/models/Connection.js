'use strict';

const { query } = require('../config/db');
const { idEncode, idDecode } = require('../utils/idCodec');
const { logger } = require('../utils/logger');

class Connection {
  constructor(data = {}) {
    this.id = data.id;
    this.user_id = data.user_id;
    this.connected_user_id = data.connected_user_id;
    this.status = data.status; // pending, accepted, rejected, blocked
    this.requested_at = data.requested_at;
    this.accepted_at = data.accepted_at;
    this.rejected_at = data.rejected_at;
    this.blocked_at = data.blocked_at;
    this.blocked_by = data.blocked_by;
    this.note = data.note;
    this.created_at = data.created_at;
    this.updated_at = data.updated_at;
  }

  // Send connection request
  static async sendRequest(userId, connectedUserId, note = null) {
    try {
      // Check if connection already exists
      const [existing] = await query(
        'SELECT * FROM connections WHERE (user_id = ? AND connected_user_id = ?) OR (user_id = ? AND connected_user_id = ?)',
        [userId, connectedUserId, connectedUserId, userId]
      );

      if (existing) {
        throw new Error('Connection already exists');
      }

      // Check if user is trying to connect with themselves
      if (userId === connectedUserId) {
        throw new Error('Cannot connect with yourself');
      }

      const result = await query(
        'INSERT INTO connections (user_id, connected_user_id, status, note, requested_at, created_at, updated_at) VALUES (?, ?, ?, ?, NOW(), NOW(), NOW())',
        [userId, connectedUserId, 'pending', note]
      );

      const connectionId = result.insertId;
      return await Connection.findById(connectionId);
    } catch (error) {
      logger.error('Error sending connection request:', error);
      throw error;
    }
  }

  // Accept connection request
  static async acceptRequest(connectionId, userId) {
    try {
      // Verify the connection request is for this user
      const [connection] = await query(
        'SELECT * FROM connections WHERE id = ? AND connected_user_id = ? AND status = "pending"',
        [connectionId, userId]
      );

      if (!connection) {
        throw new Error('Connection request not found or already processed');
      }

      await query(
        'UPDATE connections SET status = "accepted", accepted_at = NOW(), updated_at = NOW() WHERE id = ?',
        [connectionId]
      );

      return await Connection.findById(connectionId);
    } catch (error) {
      logger.error('Error accepting connection request:', error);
      throw error;
    }
  }

  // Reject connection request
  static async rejectRequest(connectionId, userId) {
    try {
      // Verify the connection request is for this user
      const [connection] = await query(
        'SELECT * FROM connections WHERE id = ? AND connected_user_id = ? AND status = "pending"',
        [connectionId, userId]
      );

      if (!connection) {
        throw new Error('Connection request not found or already processed');
      }

      await query(
        'UPDATE connections SET status = "rejected", rejected_at = NOW(), updated_at = NOW() WHERE id = ?',
        [connectionId]
      );

      return await Connection.findById(connectionId);
    } catch (error) {
      logger.error('Error rejecting connection request:', error);
      throw error;
    }
  }

  // Block user
  static async blockUser(userId, blockedUserId, blockedBy = null) {
    try {
      // Check if connection exists
      const [existing] = await query(
        'SELECT * FROM connections WHERE (user_id = ? AND connected_user_id = ?) OR (user_id = ? AND connected_user_id = ?)',
        [userId, blockedUserId, blockedUserId, userId]
      );

      if (existing) {
        // Update existing connection
        await query(
          'UPDATE connections SET status = "blocked", blocked_at = NOW(), blocked_by = ?, updated_at = NOW() WHERE id = ?',
          [blockedBy || userId, existing.id]
        );
      } else {
        // Create new blocked connection
        await query(
          'INSERT INTO connections (user_id, connected_user_id, status, blocked_at, blocked_by, created_at, updated_at) VALUES (?, ?, "blocked", NOW(), ?, NOW(), NOW())',
          [userId, blockedUserId, blockedBy || userId]
        );
      }

      return true;
    } catch (error) {
      logger.error('Error blocking user:', error);
      throw error;
    }
  }

  // Unblock user
  static async unblockUser(userId, blockedUserId) {
    try {
      await query(
        'DELETE FROM connections WHERE (user_id = ? AND connected_user_id = ?) OR (user_id = ? AND connected_user_id = ?)',
        [userId, blockedUserId, blockedUserId, userId]
      );
      return true;
    } catch (error) {
      logger.error('Error unblocking user:', error);
      throw error;
    }
  }

  // Remove connection
  static async removeConnection(userId, connectedUserId) {
    try {
      await query(
        'DELETE FROM connections WHERE (user_id = ? AND connected_user_id = ?) OR (user_id = ? AND connected_user_id = ?)',
        [userId, connectedUserId, connectedUserId, userId]
      );
      return true;
    } catch (error) {
      logger.error('Error removing connection:', error);
      throw error;
    }
  }

  // Get connection by ID
  static async findById(connectionId) {
    try {
      const [connection] = await query(
        'SELECT * FROM connections WHERE id = ?',
        [connectionId]
      );
      return connection;
    } catch (error) {
      logger.error('Error getting connection by ID:', error);
      throw error;
    }
  }

  // Get connection between two users
  static async getConnection(userId1, userId2) {
    try {
      const [connection] = await query(
        'SELECT * FROM connections WHERE (user_id = ? AND connected_user_id = ?) OR (user_id = ? AND connected_user_id = ?)',
        [userId1, userId2, userId2, userId1]
      );
      return connection;
    } catch (error) {
      logger.error('Error getting connection between users:', error);
      throw error;
    }
  }

  // Get all connections for a user
  static async getConnections(userId, options = {}) {
    try {
      const { status = null, page = 1, limit = 20 } = options;
      const offset = (page - 1) * limit;

      let whereClause = 'WHERE (user_id = ? OR connected_user_id = ?)';
      let params = [userId, userId];

      if (status) {
        whereClause += ' AND status = ?';
        params.push(status);
      }

      const connections = await query(
        `SELECT c.*, 
                CASE 
                  WHEN c.user_id = ? THEN c.connected_user_id 
                  ELSE c.user_id 
                END as other_user_id,
                CASE 
                  WHEN c.user_id = ? THEN 'sent' 
                  ELSE 'received' 
                END as request_direction
         FROM connections c 
         ${whereClause} 
         ORDER BY c.updated_at DESC 
         LIMIT ? OFFSET ?`,
        [...params, userId, userId, limit, offset]
      );

      return connections;
    } catch (error) {
      logger.error('Error getting connections:', error);
      throw error;
    }
  }

  // Get pending connection requests
  static async getPendingRequests(userId, options = {}) {
    try {
      const { page = 1, limit = 20 } = options;
      const offset = (page - 1) * limit;

      const requests = await query(
        'SELECT * FROM connections WHERE connected_user_id = ? AND status = "pending" ORDER BY requested_at DESC LIMIT ? OFFSET ?',
        [userId, limit, offset]
      );

      return requests;
    } catch (error) {
      logger.error('Error getting pending requests:', error);
      throw error;
    }
  }

  // Get sent connection requests
  static async getSentRequests(userId, options = {}) {
    try {
      const { page = 1, limit = 20 } = options;
      const offset = (page - 1) * limit;

      const requests = await query(
        'SELECT * FROM connections WHERE user_id = ? AND status = "pending" ORDER BY requested_at DESC LIMIT ? OFFSET ?',
        [userId, limit, offset]
      );

      return requests;
    } catch (error) {
      logger.error('Error getting sent requests:', error);
      throw error;
    }
  }

  // Get accepted connections
  static async getAcceptedConnections(userId, options = {}) {
    try {
      const { page = 1, limit = 20 } = options;
      const offset = (page - 1) * limit;

      const connections = await query(
        `SELECT c.*, 
                CASE 
                  WHEN c.user_id = ? THEN c.connected_user_id 
                  ELSE c.user_id 
                END as other_user_id
         FROM connections c 
         WHERE (c.user_id = ? OR c.connected_user_id = ?) AND c.status = "accepted" 
         ORDER BY c.accepted_at DESC 
         LIMIT ? OFFSET ?`,
        [userId, userId, userId, limit, offset]
      );

      return connections;
    } catch (error) {
      logger.error('Error getting accepted connections:', error);
      throw error;
    }
  }

  // Get blocked users
  static async getBlockedUsers(userId, options = {}) {
    try {
      const { page = 1, limit = 20 } = options;
      const offset = (page - 1) * limit;

      const blockedUsers = await query(
        `SELECT c.*, 
                CASE 
                  WHEN c.user_id = ? THEN c.connected_user_id 
                  ELSE c.user_id 
                END as blocked_user_id
         FROM connections c 
         WHERE (c.user_id = ? OR c.connected_user_id = ?) AND c.status = "blocked" 
         ORDER BY c.blocked_at DESC 
         LIMIT ? OFFSET ?`,
        [userId, userId, userId, limit, offset]
      );

      return blockedUsers;
    } catch (error) {
      logger.error('Error getting blocked users:', error);
      throw error;
    }
  }

  // Check if users are connected
  static async areConnected(userId1, userId2) {
    try {
      const [connection] = await query(
        'SELECT status FROM connections WHERE (user_id = ? AND connected_user_id = ?) OR (user_id = ? AND connected_user_id = ?)',
        [userId1, userId2, userId2, userId1]
      );

      return connection ? connection.status === 'accepted' : false;
    } catch (error) {
      logger.error('Error checking connection status:', error);
      throw error;
    }
  }

  // Check if connection request exists
  static async hasPendingRequest(userId1, userId2) {
    try {
      const [connection] = await query(
        'SELECT id FROM connections WHERE (user_id = ? AND connected_user_id = ?) OR (user_id = ? AND connected_user_id = ?)',
        [userId1, userId2, userId2, userId1]
      );

      return connection ? connection.status === 'pending' : false;
    } catch (error) {
      logger.error('Error checking pending request:', error);
      throw error;
    }
  }

  // Get connection statistics
  static async getStats(userId) {
    try {
      const [total] = await query(
        'SELECT COUNT(*) as count FROM connections WHERE (user_id = ? OR connected_user_id = ?)',
        [userId, userId]
      );

      const [accepted] = await query(
        'SELECT COUNT(*) as count FROM connections WHERE (user_id = ? OR connected_user_id = ?) AND status = "accepted"',
        [userId, userId]
      );

      const [pending] = await query(
        'SELECT COUNT(*) as count FROM connections WHERE connected_user_id = ? AND status = "pending"',
        [userId]
      );

      const [sent] = await query(
        'SELECT COUNT(*) as count FROM connections WHERE user_id = ? AND status = "pending"',
        [userId]
      );

      const [blocked] = await query(
        'SELECT COUNT(*) as count FROM connections WHERE (user_id = ? OR connected_user_id = ?) AND status = "blocked"',
        [userId, userId]
      );

      return {
        total: total.count,
        accepted: accepted.count,
        pending: pending.count,
        sent: sent.count,
        blocked: blocked.count
      };
    } catch (error) {
      logger.error('Error getting connection statistics:', error);
      throw error;
    }
  }

  // Search connections
  static async searchConnections(userId, searchTerm, options = {}) {
    try {
      const { page = 1, limit = 20, status = null } = options;
      const offset = (page - 1) * limit;

      let whereClause = 'WHERE (c.user_id = ? OR c.connected_user_id = ?)';
      let params = [userId, userId];

      if (status) {
        whereClause += ' AND c.status = ?';
        params.push(status);
      }

      whereClause += ' AND (u.name LIKE ? OR u.email LIKE ?)';
      params.push(`%${searchTerm}%`, `%${searchTerm}%`);

      const connections = await query(
        `SELECT c.*, u.name, u.email, u.profile_photo,
                CASE 
                  WHEN c.user_id = ? THEN c.connected_user_id 
                  ELSE c.user_id 
                END as other_user_id
         FROM connections c 
         JOIN users u ON (c.user_id = u.id OR c.connected_user_id = u.id)
         ${whereClause} 
         ORDER BY c.updated_at DESC 
         LIMIT ? OFFSET ?`,
        [...params, userId, limit, offset]
      );

      return connections;
    } catch (error) {
      logger.error('Error searching connections:', error);
      throw error;
    }
  }

  // Get mutual connections
  static async getMutualConnections(userId1, userId2, options = {}) {
    try {
      const { page = 1, limit = 20 } = options;
      const offset = (page - 1) * limit;

      const mutualConnections = await query(
        `SELECT DISTINCT u.id, u.name, u.email, u.profile_photo
         FROM users u
         JOIN connections c1 ON (c1.user_id = u.id OR c1.connected_user_id = u.id)
         JOIN connections c2 ON (c2.user_id = u.id OR c2.connected_user_id = u.id)
         WHERE c1.status = "accepted" 
           AND c2.status = "accepted"
           AND ((c1.user_id = ? AND c1.connected_user_id = u.id) OR (c1.connected_user_id = ? AND c1.user_id = u.id))
           AND ((c2.user_id = ? AND c2.connected_user_id = u.id) OR (c2.connected_user_id = ? AND c2.user_id = u.id))
           AND u.id NOT IN (?, ?)
         ORDER BY u.name ASC
         LIMIT ? OFFSET ?`,
        [userId1, userId1, userId2, userId2, userId1, userId2, limit, offset]
      );

      return mutualConnections;
    } catch (error) {
      logger.error('Error getting mutual connections:', error);
      throw error;
    }
  }

  // Get connection suggestions
  static async getSuggestions(userId, options = {}) {
    try {
      const { page = 1, limit = 20, excludeIds = [] } = options;
      const offset = (page - 1) * limit;

      let excludeClause = '';
      let params = [userId, userId];

      if (excludeIds.length > 0) {
        excludeClause = 'AND u.id NOT IN (' + excludeIds.map(() => '?').join(',') + ')';
        params.push(...excludeIds);
      }

      const suggestions = await query(
        `SELECT u.id, u.name, u.email, u.profile_photo, u.headline,
                COUNT(DISTINCT c.id) as mutual_connections
         FROM users u
         LEFT JOIN connections c ON (c.user_id = u.id OR c.connected_user_id = u.id)
         WHERE u.id != ? 
           AND u.status = 1
           AND u.id NOT IN (
             SELECT DISTINCT 
               CASE 
                 WHEN user_id = ? THEN connected_user_id 
                 ELSE user_id 
               END
             FROM connections 
             WHERE (user_id = ? OR connected_user_id = ?)
           )
           ${excludeClause}
         GROUP BY u.id
         ORDER BY mutual_connections DESC, u.name ASC
         LIMIT ? OFFSET ?`,
        [...params, userId, userId, limit, offset]
      );

      return suggestions;
    } catch (error) {
      logger.error('Error getting connection suggestions:', error);
      throw error;
    }
  }
}

module.exports = Connection;
