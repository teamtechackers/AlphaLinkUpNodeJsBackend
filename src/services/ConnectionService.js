'use strict';

const Connection = require('../models/Connection');
const User = require('../models/User');
const Notification = require('../models/Notification');
const { logger } = require('../utils/logger');

class ConnectionService {
  // Send connection request
  static async sendConnectionRequest(senderId, receiverId, message = '') {
    try {
      // Validate users exist
      const [sender, receiver] = await Promise.all([
        User.findById(senderId),
        User.findById(receiverId)
      ]);

      if (!sender || !receiver) {
        throw new Error('User not found');
      }

      // Check if users are the same
      if (senderId === receiverId) {
        throw new Error('Cannot send connection request to yourself');
      }

      // Check if connection already exists
      const existingConnection = await Connection.getConnection(senderId, receiverId);
      if (existingConnection) {
        throw new Error('Connection already exists');
      }

      // Check if request is already pending
      const pendingRequest = await Connection.getPendingRequest(senderId, receiverId);
      if (pendingRequest) {
        throw new Error('Connection request already pending');
      }

      // Create connection request
      const connection = await Connection.sendRequest(senderId, receiverId, message);

      // Send notification to receiver
      try {
        await Notification.createNotification({
          user_id: receiverId,
          type: 'new_connection',
          title: 'New Connection Request',
          message: `${sender.name} sent you a connection request`,
          data: {
            senderId,
            senderName: sender.name,
            connectionId: connection.id,
            message
          }
        });
      } catch (notificationError) {
        logger.warn('Failed to send connection notification:', notificationError);
      }

      // Update sender's sent requests count
      await User.updateConnectionStats(senderId);

      logger.info(`Connection request sent from ${senderId} to ${receiverId}`);
      return connection;
    } catch (error) {
      logger.error('Error sending connection request:', error);
      throw error;
    }
  }

  // Accept connection request
  static async acceptConnectionRequest(connectionId, userId) {
    try {
      // Get connection details
      const connection = await Connection.findById(connectionId);
      if (!connection) {
        throw new Error('Connection request not found');
      }

      // Verify user is the receiver
      if (connection.receiver_id !== userId) {
        throw new Error('Unauthorized to accept this connection request');
      }

      // Check if request is still pending
      if (connection.status !== 'pending') {
        throw new Error('Connection request is no longer pending');
      }

      // Accept the connection
      const updatedConnection = await Connection.acceptRequest(connectionId);

      // Send notification to sender
      try {
        const receiver = await User.findById(userId);
        await Notification.createNotification({
          user_id: connection.sender_id,
          type: 'connection_accepted',
          title: 'Connection Request Accepted',
          message: `${receiver.name} accepted your connection request`,
          data: {
            receiverId: userId,
            receiverName: receiver.name,
            connectionId: connection.id
          }
        });
      } catch (notificationError) {
        logger.warn('Failed to send acceptance notification:', notificationError);
      }

      // Update both users' connection stats
      await Promise.all([
        User.updateConnectionStats(connection.sender_id),
        User.updateConnectionStats(userId)
      ]);

      logger.info(`Connection request ${connectionId} accepted by ${userId}`);
      return updatedConnection;
    } catch (error) {
      logger.error('Error accepting connection request:', error);
      throw error;
    }
  }

  // Reject connection request
  static async rejectConnectionRequest(connectionId, userId, reason = '') {
    try {
      // Get connection details
      const connection = await Connection.findById(connectionId);
      if (!connection) {
        throw new Error('Connection request not found');
      }

      // Verify user is the receiver
      if (connection.receiver_id !== userId) {
        throw new Error('Unauthorized to reject this connection request');
      }

      // Check if request is still pending
      if (connection.status !== 'pending') {
        throw new Error('Connection request is no longer pending');
      }

      // Reject the connection
      const updatedConnection = await Connection.rejectRequest(connectionId, reason);

      // Send notification to sender
      try {
        const receiver = await User.findById(userId);
        await Notification.createNotification({
          user_id: connection.sender_id,
          type: 'connection_rejected',
          title: 'Connection Request Rejected',
          message: `${receiver.name} declined your connection request`,
          data: {
            receiverId: userId,
            receiverName: receiver.name,
            connectionId: connection.id,
            reason
          }
        });
      } catch (notificationError) {
        logger.warn('Failed to send rejection notification:', notificationError);
      }

      logger.info(`Connection request ${connectionId} rejected by ${userId}`);
      return updatedConnection;
    } catch (error) {
      logger.error('Error rejecting connection request:', error);
      throw error;
    }
  }

  // Remove connection
  static async removeConnection(connectionId, userId) {
    try {
      // Get connection details
      const connection = await Connection.findById(connectionId);
      if (!connection) {
        throw new Error('Connection not found');
      }

      // Verify user is part of the connection
      if (connection.sender_id !== userId && connection.receiver_id !== userId) {
        throw new Error('Unauthorized to remove this connection');
      }

      // Check if connection is active
      if (connection.status !== 'accepted') {
        throw new Error('Connection is not active');
      }

      // Remove the connection
      await Connection.removeConnection(connectionId);

      // Send notification to the other user
      try {
        const otherUserId = connection.sender_id === userId ? connection.receiver_id : connection.sender_id;
        const user = await User.findById(userId);
        
        await Notification.createNotification({
          user_id: otherUserId,
          type: 'connection_removed',
          title: 'Connection Removed',
          message: `${user.name} removed you from their connections`,
          data: {
            userId,
            userName: user.name,
            connectionId: connection.id
          }
        });
      } catch (notificationError) {
        logger.warn('Failed to send removal notification:', notificationError);
      }

      // Update both users' connection stats
      await Promise.all([
        User.updateConnectionStats(connection.sender_id),
        User.updateConnectionStats(connection.receiver_id)
      ]);

      logger.info(`Connection ${connectionId} removed by ${userId}`);
      return { message: 'Connection removed successfully' };
    } catch (error) {
      logger.error('Error removing connection:', error);
      throw error;
    }
  }

  // Block user
  static async blockUser(userId, userToBlockId, reason = '') {
    try {
      // Validate users exist
      const [user, userToBlock] = await Promise.all([
        User.findById(userId),
        User.findById(userToBlockId)
      ]);

      if (!user || !userToBlock) {
        throw new Error('User not found');
      }

      // Check if users are the same
      if (userId === userToBlockId) {
        throw new Error('Cannot block yourself');
      }

      // Check if already blocked
      const existingBlock = await Connection.getBlockedUsers(userId);
      if (existingBlock.some(block => block.blocked_user_id === userToBlockId)) {
        throw new Error('User is already blocked');
      }

      // Block the user
      await Connection.blockUser(userId, userToBlockId, reason);

      // Remove any existing connections
      const existingConnection = await Connection.getConnection(userId, userToBlockId);
      if (existingConnection) {
        await Connection.removeConnection(existingConnection.id);
      }

      logger.info(`User ${userToBlockId} blocked by ${userId}`);
      return { message: 'User blocked successfully' };
    } catch (error) {
      logger.error('Error blocking user:', error);
      throw error;
    }
  }

  // Unblock user
  static async unblockUser(userId, userToUnblockId) {
    try {
      // Check if user is actually blocked
      const blockedUsers = await Connection.getBlockedUsers(userId);
      const isBlocked = blockedUsers.some(block => block.blocked_user_id === userToUnblockId);
      
      if (!isBlocked) {
        throw new Error('User is not blocked');
      }

      // Unblock the user
      await Connection.unblockUser(userId, userToUnblockId);

      logger.info(`User ${userToUnblockId} unblocked by ${userId}`);
      return { message: 'User unblocked successfully' };
    } catch (error) {
      logger.error('Error unblocking user:', error);
      throw error;
    }
  }

  // Get user connections
  static async getUserConnections(userId, options = {}) {
    try {
      const {
        status = 'accepted',
        page = 1,
        limit = 20,
        includeDetails = false
      } = options;

      // Get connections
      const connections = await Connection.getConnections(userId, status, page, limit);

      // Include user details if requested
      if (includeDetails) {
        const connectionDetails = await Promise.all(
          connections.map(async (connection) => {
            const otherUserId = connection.sender_id === userId ? 
              connection.receiver_id : connection.sender_id;
            const otherUser = await User.findById(otherUserId);
            
            return {
              ...connection,
              otherUser: {
                id: otherUser.id,
                name: otherUser.name,
                title: otherUser.title,
                company: otherUser.company,
                location: otherUser.location,
                profilePhoto: otherUser.profilePhoto,
                profileCompletion: otherUser.profileCompletion
              }
            };
          })
        );

        return {
          connections: connectionDetails,
          total: connections.length,
          page,
          limit
        };
      }

      return {
        connections,
        total: connections.length,
        page,
        limit
      };
    } catch (error) {
      logger.error('Error getting user connections:', error);
      throw error;
    }
  }

  // Get pending connection requests
  static async getPendingRequests(userId, options = {}) {
    try {
      const {
        page = 1,
        limit = 20,
        includeDetails = false
      } = options;

      // Get pending requests
      const pendingRequests = await Connection.getPendingRequests(userId, page, limit);

      // Include sender details if requested
      if (includeDetails) {
        const requestDetails = await Promise.all(
          pendingRequests.map(async (request) => {
            const sender = await User.findById(request.sender_id);
            
            return {
              ...request,
              sender: {
                id: sender.id,
                name: sender.name,
                title: sender.title,
                company: sender.company,
                location: sender.location,
                profilePhoto: sender.profilePhoto,
                profileCompletion: sender.profileCompletion
              }
            };
          })
        );

        return {
          pendingRequests: requestDetails,
          total: pendingRequests.length,
          page,
          limit
        };
      }

      return {
        pendingRequests,
        total: pendingRequests.length,
        page,
        limit
      };
    } catch (error) {
      logger.error('Error getting pending requests:', error);
      throw error;
    }
  }

  // Get sent connection requests
  static async getSentRequests(userId, options = {}) {
    try {
      const {
        page = 1,
        limit = 20,
        includeDetails = false
      } = options;

      // Get sent requests
      const sentRequests = await Connection.getSentRequests(userId, page, limit);

      // Include receiver details if requested
      if (includeDetails) {
        const requestDetails = await Promise.all(
          sentRequests.map(async (request) => {
            const receiver = await User.findById(request.receiver_id);
            
            return {
              ...request,
              receiver: {
                id: receiver.id,
                name: receiver.name,
                title: receiver.title,
                company: receiver.company,
                location: receiver.location,
                profilePhoto: receiver.profilePhoto,
                profileCompletion: receiver.profileCompletion
              }
            };
          })
        );

        return {
          sentRequests: requestDetails,
          total: sentRequests.length,
          page,
          limit
        };
      }

      return {
        sentRequests,
        total: sentRequests.length,
        page,
        limit
      };
    } catch (error) {
      logger.error('Error getting sent requests:', error);
      throw error;
    }
  }

  // Get blocked users
  static async getBlockedUsers(userId, options = {}) {
    try {
      const {
        page = 1,
        limit = 20,
        includeDetails = false
      } = options;

      // Get blocked users
      const blockedUsers = await Connection.getBlockedUsers(userId, page, limit);

      // Include user details if requested
      if (includeDetails) {
        const blockedUserDetails = await Promise.all(
          blockedUsers.map(async (block) => {
            const blockedUser = await User.findById(block.blocked_user_id);
            
            return {
              ...block,
              blockedUser: {
                id: blockedUser.id,
                name: blockedUser.name,
                title: blockedUser.title,
                company: blockedUser.company,
                location: blockedUser.location
              }
            };
          })
        );

        return {
          blockedUsers: blockedUserDetails,
          total: blockedUsers.length,
          page,
          limit
        };
      }

      return {
        blockedUsers,
        total: blockedUsers.length,
        page,
        limit
      };
    } catch (error) {
      logger.error('Error getting blocked users:', error);
      throw error;
    }
  }

  // Check if users are connected
  static async areUsersConnected(userId1, userId2) {
    try {
      const connection = await Connection.areConnected(userId1, userId2);
      return {
        connected: !!connection,
        connection: connection || null
      };
    } catch (error) {
      logger.error('Error checking connection status:', error);
      throw error;
    }
  }

  // Check if connection request is pending
  static async isConnectionPending(senderId, receiverId) {
    try {
      const pendingRequest = await Connection.hasPendingRequest(senderId, receiverId);
      return {
        pending: !!pendingRequest,
        request: pendingRequest || null
      };
    } catch (error) {
      logger.error('Error checking pending request:', error);
      throw error;
    }
  }

  // Get connection suggestions
  static async getConnectionSuggestions(userId, options = {}) {
    try {
      const {
        limit = 10,
        includeMutualConnections = true,
        excludeBlocked = true
      } = options;

      // Get user's current connections and blocked users
      const [connections, blockedUsers] = await Promise.all([
        Connection.getConnections(userId, 'accepted'),
        excludeBlocked ? Connection.getBlockedUsers(userId) : []
      ]);

      const connectedUserIds = new Set(connections.map(c => 
        c.sender_id === userId ? c.receiver_id : c.sender_id
      ));
      const blockedUserIds = new Set(blockedUsers.map(b => b.blocked_user_id));

      // Get potential connections (users not connected and not blocked)
      const potentialConnections = await User.search({
        excludeIds: [...connectedUserIds, ...blockedUserIds, userId],
        limit: limit * 2 // Get more to filter by relevance
      });

      // Calculate relevance scores
      const scoredSuggestions = potentialConnections.map(user => ({
        ...user,
        relevanceScore: this.calculateConnectionRelevance(user, connections)
      }));

      // Sort by relevance and limit results
      const sortedSuggestions = scoredSuggestions
        .sort((a, b) => b.relevanceScore - a.relevanceScore)
        .slice(0, limit);

      // Include mutual connections if requested
      if (includeMutualConnections) {
        for (const suggestion of sortedSuggestions) {
          const mutualConnections = await this.getMutualConnections(userId, suggestion.id);
          suggestion.mutualConnections = mutualConnections.length;
        }
      }

      return sortedSuggestions;
    } catch (error) {
      logger.error('Error getting connection suggestions:', error);
      throw error;
    }
  }

  // Get mutual connections
  static async getMutualConnections(userId1, userId2) {
    try {
      const mutualConnections = await Connection.getMutualConnections(userId1, userId2);
      return mutualConnections;
    } catch (error) {
      logger.error('Error getting mutual connections:', error);
      throw error;
    }
  }

  // Get connection statistics
  static async getConnectionStats(userId) {
    try {
      const [
        totalConnections,
        pendingRequests,
        sentRequests,
        blockedUsers
      ] = await Promise.all([
        Connection.getConnections(userId, 'accepted'),
        Connection.getPendingRequests(userId),
        Connection.getSentRequests(userId),
        Connection.getBlockedUsers(userId)
      ]);

      return {
        totalConnections: totalConnections.length,
        pendingRequests: pendingRequests.length,
        sentRequests: sentRequests.length,
        blockedUsers: blockedUsers.length,
        totalRequests: pendingRequests.length + sentRequests.length
      };
    } catch (error) {
      logger.error('Error getting connection stats:', error);
      throw error;
    }
  }

  // Search connections
  static async searchConnections(userId, searchTerm, options = {}) {
    try {
      const {
        status = 'accepted',
        page = 1,
        limit = 20
      } = options;

      // Get user's connections
      const connections = await Connection.getConnections(userId, status);
      
      // Get user details for connections
      const connectionDetails = await Promise.all(
        connections.map(async (connection) => {
          const otherUserId = connection.sender_id === userId ? 
            connection.receiver_id : connection.sender_id;
          const otherUser = await User.findById(otherUserId);
          
          return {
            ...connection,
            otherUser
          };
        })
      );

      // Filter by search term
      const filteredConnections = connectionDetails.filter(connection => {
        const user = connection.otherUser;
        const searchLower = searchTerm.toLowerCase();
        
        return (
          user.name?.toLowerCase().includes(searchLower) ||
          user.title?.toLowerCase().includes(searchLower) ||
          user.company?.toLowerCase().includes(searchLower) ||
          user.location?.toLowerCase().includes(searchLower) ||
          user.skills?.some(skill => skill.toLowerCase().includes(searchLower))
        );
      });

      // Apply pagination
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      const paginatedConnections = filteredConnections.slice(startIndex, endIndex);

      return {
        connections: paginatedConnections,
        total: filteredConnections.length,
        page,
        limit,
        totalPages: Math.ceil(filteredConnections.length / limit)
      };
    } catch (error) {
      logger.error('Error searching connections:', error);
      throw error;
    }
  }

  // Calculate connection relevance score
  static calculateConnectionRelevance(user, userConnections) {
    let score = 0;

    // Location matching
    if (user.location) {
      const locationMatches = userConnections.filter(conn => 
        conn.otherUser?.location === user.location
      ).length;
      score += locationMatches * 10;
    }

    // Company matching
    if (user.company) {
      const companyMatches = userConnections.filter(conn => 
        conn.otherUser?.company === user.company
      ).length;
      score += companyMatches * 15;
    }

    // Industry matching
    if (user.industry) {
      const industryMatches = userConnections.filter(conn => 
        conn.otherUser?.industry === user.industry
      ).length;
      score += industryMatches * 12;
    }

    // Skills matching
    if (user.skills && Array.isArray(user.skills)) {
      user.skills.forEach(skill => {
        const skillMatches = userConnections.filter(conn => 
          conn.otherUser?.skills?.includes(skill)
        ).length;
        score += skillMatches * 8;
      });
    }

    // Profile completion bonus
    if (user.profileCompletion > 80) {
      score += 20;
    }

    return score;
  }

  // Get connection network insights
  static async getNetworkInsights(userId) {
    try {
      const [
        connections,
        pendingRequests,
        sentRequests,
        blockedUsers
      ] = await Promise.all([
        Connection.getConnections(userId, 'accepted'),
        Connection.getPendingRequests(userId),
        Connection.getSentRequests(userId),
        Connection.getBlockedUsers(userId)
      ]);

      // Get detailed user information for connections
      const connectionDetails = await Promise.all(
        connections.map(async (connection) => {
          const otherUserId = connection.sender_id === userId ? 
            connection.receiver_id : connection.sender_id;
          const otherUser = await User.findById(otherUserId);
          
          return {
            ...connection,
            otherUser
          };
        })
      );

      // Analyze network
      const insights = {
        totalConnections: connections.length,
        pendingRequests: pendingRequests.length,
        sentRequests: sentRequests.length,
        blockedUsers: blockedUsers.length,
        networkStrength: this.calculateNetworkStrength(connectionDetails),
        topIndustries: this.getTopIndustries(connectionDetails),
        topLocations: this.getTopLocations(connectionDetails),
        topCompanies: this.getTopCompanies(connectionDetails),
        skillDistribution: this.getSkillDistribution(connectionDetails),
        connectionGrowth: await this.getConnectionGrowth(userId)
      };

      return insights;
    } catch (error) {
      logger.error('Error getting network insights:', error);
      throw error;
    }
  }

  // Calculate network strength
  static calculateNetworkStrength(connections) {
    if (connections.length === 0) return 0;

    let totalStrength = 0;
    connections.forEach(connection => {
      const user = connection.otherUser;
      let userStrength = 0;

      // Profile completion
      if (user.profileCompletion) {
        userStrength += user.profileCompletion * 0.3;
      }

      // Connection count
      if (user.connectionCount) {
        userStrength += Math.min(user.connectionCount * 0.5, 50);
      }

      // Experience
      if (user.totalExperience) {
        userStrength += Math.min(user.totalExperience * 2, 40);
      }

      totalStrength += userStrength;
    });

    return Math.round(totalStrength / connections.length);
  }

  // Get top industries in network
  static getTopIndustries(connections) {
    const industries = {};
    connections.forEach(connection => {
      const industry = connection.otherUser?.industry;
      if (industry) {
        industries[industry] = (industries[industry] || 0) + 1;
      }
    });

    return Object.entries(industries)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([industry, count]) => ({ industry, count }));
  }

  // Get top locations in network
  static getTopLocations(connections) {
    const locations = {};
    connections.forEach(connection => {
      const location = connection.otherUser?.location;
      if (location) {
        locations[location] = (locations[location] || 0) + 1;
      }
    });

    return Object.entries(locations)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([location, count]) => ({ location, count }));
  }

  // Get top companies in network
  static getTopCompanies(connections) {
    const companies = {};
    connections.forEach(connection => {
      const company = connection.otherUser?.company;
      if (company) {
        companies[company] = (companies[company] || 0) + 1;
      }
    });

    return Object.entries(companies)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([company, count]) => ({ company, count }));
  }

  // Get skill distribution in network
  static getSkillDistribution(connections) {
    const skills = {};
    connections.forEach(connection => {
      const userSkills = connection.otherUser?.skills;
      if (userSkills && Array.isArray(userSkills)) {
        userSkills.forEach(skill => {
          skills[skill] = (skills[skill] || 0) + 1;
        });
      }
    });

    return Object.entries(skills)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([skill, count]) => ({ skill, count }));
  }

  // Get connection growth over time
  static async getConnectionGrowth(userId) {
    try {
      // This would typically query historical connection data
      // For now, return mock growth data
      return {
        last30Days: 5,
        last90Days: 12,
        last6Months: 25,
        lastYear: 45
      };
    } catch (error) {
      logger.error('Error getting connection growth:', error);
      return {};
    }
  }

  // Bulk operations
  static async bulkSendRequests(senderId, receiverIds, message = '') {
    try {
      const results = [];
      const errors = [];

      for (const receiverId of receiverIds) {
        try {
          const result = await this.sendConnectionRequest(senderId, receiverId, message);
          results.push(result);
        } catch (error) {
          errors.push({
            receiverId,
            error: error.message
          });
        }
      }

      return {
        successful: results.length,
        failed: errors.length,
        total: receiverIds.length,
        results,
        errors
      };
    } catch (error) {
      logger.error('Error in bulk send requests:', error);
      throw error;
    }
  }

  // Export connections data
  static async exportConnections(userId, format = 'json') {
    try {
      const connections = await Connection.getConnections(userId, 'accepted');
      
      const exportData = await Promise.all(
        connections.map(async (connection) => {
          const otherUserId = connection.sender_id === userId ? 
            connection.receiver_id : connection.sender_id;
          const otherUser = await User.findById(otherUserId);
          
          return {
            connectionId: connection.id,
            connectedSince: connection.updated_at,
            user: {
              id: otherUser.id,
              name: otherUser.name,
              email: otherUser.email,
              title: otherUser.title,
              company: otherUser.company,
              location: otherUser.location,
              industry: otherUser.industry,
              skills: otherUser.skills
            }
          };
        })
      );

      switch (format) {
        case 'json':
          return JSON.stringify(exportData, null, 2);
        case 'csv':
          return this.convertConnectionsToCSV(exportData);
        default:
          return exportData;
      }
    } catch (error) {
      logger.error('Error exporting connections:', error);
      throw error;
    }
  }

  // Convert connections to CSV
  static convertConnectionsToCSV(connections) {
    const headers = [
      'Connection ID',
      'Connected Since',
      'User ID',
      'Name',
      'Email',
      'Title',
      'Company',
      'Location',
      'Industry',
      'Skills'
    ];

    const rows = connections.map(conn => [
      conn.connectionId,
      conn.connectedSince,
      conn.user.id,
      conn.user.name,
      conn.user.email,
      conn.user.title,
      conn.user.company,
      conn.user.location,
      conn.user.industry,
      Array.isArray(conn.user.skills) ? conn.user.skills.join('; ') : conn.user.skills
    ]);

    return [headers, ...rows]
      .map(row => row.map(field => `"${field || ''}"`).join(','))
      .join('\n');
  }
}

module.exports = ConnectionService;
