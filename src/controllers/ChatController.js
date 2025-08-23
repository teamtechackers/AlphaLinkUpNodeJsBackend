'use strict';

const ChatService = require('../services/ChatService');
const NotificationService = require('../services/NotificationService');
const { logger } = require('../utils/logger');
const { successResponse, errorResponse } = require('../utils/response');

class ChatController {
  // Send a message
  static async sendMessage(req, res) {
    try {
      const senderId = req.user.id;
      const { receiverId } = req.params;
      const messageData = req.body;
      
      // Validate required fields
      if (!messageData.message || messageData.message.trim().length === 0) {
        return errorResponse(res, 'Message content is required', 400);
      }

      // Send message
      const message = await ChatService.sendMessage(senderId, receiverId, messageData);
      
      logger.info(`Message sent from ${senderId} to ${receiverId}`);
      return successResponse(res, 'Message sent successfully', { message }, 201);
    } catch (error) {
      logger.error('Send message error:', error);
      
      if (error.message.includes('Cannot send message')) {
        return errorResponse(res, error.message, 400);
      }
      
      if (error.message.includes('Validation failed')) {
        return errorResponse(res, error.message, 400);
      }
      
      return errorResponse(res, 'Failed to send message', 500);
    }
  }

  // Get conversation between two users
  static async getConversation(req, res) {
    try {
      const userId = req.user.id;
      const { otherUserId } = req.params;
      const { page = 1, limit = 50, beforeMessageId, afterMessageId, includeDeleted } = req.query;

      const conversation = await ChatService.getConversation(userId, otherUserId, {
        page: parseInt(page),
        limit: parseInt(limit),
        beforeMessageId,
        afterMessageId,
        includeDeleted: includeDeleted === 'true'
      });

      return successResponse(res, 'Conversation retrieved successfully', { conversation });
    } catch (error) {
      logger.error('Get conversation error:', error);
      
      if (error.message.includes('Cannot access conversation')) {
        return errorResponse(res, error.message, 403);
      }
      
      return errorResponse(res, 'Failed to retrieve conversation', 500);
    }
  }

  // Get all conversations for a user
  static async getUserConversations(req, res) {
    try {
      const userId = req.user.id;
      const { page = 1, limit = 20, status, searchTerm, sort_by = 'last_activity', sort_order = 'desc' } = req.query;

      const conversations = await ChatService.getUserConversations(userId, {
        page: parseInt(page),
        limit: parseInt(limit),
        status,
        searchTerm,
        sortBy: sort_by,
        sortOrder: sort_order
      });

      return successResponse(res, 'Conversations retrieved successfully', { conversations });
    } catch (error) {
      logger.error('Get user conversations error:', error);
      return errorResponse(res, 'Failed to retrieve conversations', 500);
    }
  }

  // Edit a message
  static async editMessage(req, res) {
    try {
      const userId = req.user.id;
      const { messageId } = req.params;
      const { message } = req.body;

      if (!message || message.trim().length === 0) {
        return errorResponse(res, 'Message content is required', 400);
      }

      const updatedMessage = await ChatService.editMessage(messageId, userId, message);
      
      logger.info(`Message ${messageId} edited by user ${userId}`);
      return successResponse(res, 'Message edited successfully', { message: updatedMessage });
    } catch (error) {
      logger.error('Edit message error:', error);
      
      if (error.message.includes('Message not found')) {
        return errorResponse(res, 'Message not found', 404);
      }
      
      if (error.message.includes('Cannot edit message')) {
        return errorResponse(res, error.message, 403);
      }
      
      if (error.message.includes('too old to edit')) {
        return errorResponse(res, error.message, 400);
      }
      
      return errorResponse(res, 'Failed to edit message', 500);
    }
  }

  // Delete a message
  static async deleteMessage(req, res) {
    try {
      const userId = req.user.id;
      const { messageId } = req.params;
      const { deleteType = 'for_me' } = req.body;

      const result = await ChatService.deleteMessage(messageId, userId, deleteType);
      
      logger.info(`Message ${messageId} deleted by user ${userId} (${deleteType})`);
      return successResponse(res, 'Message deleted successfully', { result });
    } catch (error) {
      logger.error('Delete message error:', error);
      
      if (error.message.includes('Message not found')) {
        return errorResponse(res, 'Message not found', 404);
      }
      
      if (error.message.includes('Cannot delete message')) {
        return errorResponse(res, error.message, 403);
      }
      
      return errorResponse(res, 'Failed to delete message', 500);
    }
  }

  // Mark messages as read
  static async markMessagesAsRead(req, res) {
    try {
      const userId = req.user.id;
      const { conversationUserId } = req.params;

      const result = await ChatService.markMessagesAsRead(userId, conversationUserId);
      
      logger.info(`Messages marked as read by user ${userId} for conversation with ${conversationUserId}`);
      return successResponse(res, 'Messages marked as read successfully', { result });
    } catch (error) {
      logger.error('Mark messages as read error:', error);
      return errorResponse(res, 'Failed to mark messages as read', 500);
    }
  }

  // Mark all messages as read
  static async markAllMessagesAsRead(req, res) {
    try {
      const userId = req.user.id;

      const result = await ChatService.markAllMessagesAsRead(userId);
      
      logger.info(`All messages marked as read by user ${userId}`);
      return successResponse(res, 'All messages marked as read successfully', { result });
    } catch (error) {
      logger.error('Mark all messages as read error:', error);
      return errorResponse(res, 'Failed to mark all messages as read', 500);
    }
  }

  // Get unread message count
  static async getUnreadCount(req, res) {
    try {
      const userId = req.user.id;
      const { conversationUserId } = req.query;

      const count = await ChatService.getUnreadCount(userId, conversationUserId);
      
      return successResponse(res, 'Unread count retrieved successfully', { count });
    } catch (error) {
      logger.error('Get unread count error:', error);
      return errorResponse(res, 'Failed to retrieve unread count', 500);
    }
  }

  // Search messages
  static async searchMessages(req, res) {
    try {
      const userId = req.user.id;
      const { q, page = 1, limit = 20, conversationUserId, messageType, startDate, endDate } = req.query;
      
      if (!q || q.trim().length === 0) {
        return errorResponse(res, 'Search query is required', 400);
      }

      const results = await ChatService.searchMessages(userId, q, {
        page: parseInt(page),
        limit: parseInt(limit),
        conversationUserId,
        messageType,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null
      });

      return successResponse(res, 'Search completed successfully', { results });
    } catch (error) {
      logger.error('Search messages error:', error);
      return errorResponse(res, 'Search failed', 500);
    }
  }

  // Get message statistics
  static async getMessageStats(req, res) {
    try {
      const userId = req.user.id;
      const { startDate, endDate, groupBy } = req.query;

      const stats = await ChatService.getMessageStats(userId, {
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        groupBy: groupBy || 'day'
      });

      return successResponse(res, 'Message statistics retrieved successfully', { stats });
    } catch (error) {
      logger.error('Get message stats error:', error);
      return errorResponse(res, 'Failed to retrieve message statistics', 500);
    }
  }

  // Create group chat
  static async createGroupChat(req, res) {
    try {
      const userId = req.user.id;
      const groupData = req.body;
      
      // Validate required fields
      if (!groupData.name || groupData.name.trim().length === 0) {
        return errorResponse(res, 'Group name is required', 400);
      }

      // Create group
      const group = await ChatService.createGroupChat(userId, groupData);
      
      logger.info(`Group chat "${groupData.name}" created by user ${userId}`);
      return successResponse(res, 'Group chat created successfully', { group }, 201);
    } catch (error) {
      logger.error('Create group chat error:', error);
      
      if (error.message.includes('Group validation failed')) {
        return errorResponse(res, error.message, 400);
      }
      
      if (error.message.includes('Cannot create group')) {
        return errorResponse(res, error.message, 403);
      }
      
      return errorResponse(res, 'Failed to create group chat', 500);
    }
  }

  // Add members to group
  static async addGroupMembers(req, res) {
    try {
      const userId = req.user.id;
      const { groupId } = req.params;
      const { memberIds } = req.body;

      if (!memberIds || !Array.isArray(memberIds) || memberIds.length === 0) {
        return errorResponse(res, 'Member IDs array is required', 400);
      }

      const result = await ChatService.addGroupMembers(groupId, memberIds, userId);
      
      logger.info(`Members added to group ${groupId} by user ${userId}`);
      return successResponse(res, 'Members added successfully', { result });
    } catch (error) {
      logger.error('Add group members error:', error);
      
      if (error.message.includes('Cannot add members')) {
        return errorResponse(res, error.message, 403);
      }
      
      return errorResponse(res, 'Failed to add group members', 500);
    }
  }

  // Remove member from group
  static async removeGroupMember(req, res) {
    try {
      const userId = req.user.id;
      const { groupId, memberId } = req.params;

      const result = await ChatService.removeGroupMember(groupId, memberId, userId);
      
      logger.info(`Member ${memberId} removed from group ${groupId} by user ${userId}`);
      return successResponse(res, 'Member removed successfully', { result });
    } catch (error) {
      logger.error('Remove group member error:', error);
      
      if (error.message.includes('Cannot remove members')) {
        return errorResponse(res, error.message, 403);
      }
      
      return errorResponse(res, 'Failed to remove group member', 500);
    }
  }

  // Send group message
  static async sendGroupMessage(req, res) {
    try {
      const userId = req.user.id;
      const { groupId } = req.params;
      const messageData = req.body;
      
      // Validate required fields
      if (!messageData.message || messageData.message.trim().length === 0) {
        return errorResponse(res, 'Message content is required', 400);
      }

      // Send group message
      const message = await ChatService.sendGroupMessage(groupId, userId, messageData);
      
      logger.info(`Group message sent in group ${groupId} by user ${userId}`);
      return successResponse(res, 'Group message sent successfully', { message }, 201);
    } catch (error) {
      logger.error('Send group message error:', error);
      
      if (error.message.includes('User is not a member')) {
        return errorResponse(res, error.message, 403);
      }
      
      if (error.message.includes('Validation failed')) {
        return errorResponse(res, error.message, 400);
      }
      
      return errorResponse(res, 'Failed to send group message', 500);
    }
  }

  // Get group messages
  static async getGroupMessages(req, res) {
    try {
      const userId = req.user.id;
      const { groupId } = req.params;
      const { page = 1, limit = 50, beforeMessageId, afterMessageId } = req.query;

      const messages = await ChatService.getGroupMessages(groupId, userId, {
        page: parseInt(page),
        limit: parseInt(limit),
        beforeMessageId,
        afterMessageId
      });

      return successResponse(res, 'Group messages retrieved successfully', { messages });
    } catch (error) {
      logger.error('Get group messages error:', error);
      
      if (error.message.includes('User is not a member')) {
        return errorResponse(res, error.message, 403);
      }
      
      return errorResponse(res, 'Failed to retrieve group messages', 500);
    }
  }

  // Get user groups
  static async getUserGroups(req, res) {
    try {
      const userId = req.user.id;
      const { page = 1, limit = 20, status, searchTerm } = req.query;

      const groups = await ChatService.getUserGroups(userId, {
        page: parseInt(page),
        limit: parseInt(limit),
        status,
        searchTerm
      });

      return successResponse(res, 'User groups retrieved successfully', { groups });
    } catch (error) {
      logger.error('Get user groups error:', error);
      return errorResponse(res, 'Failed to retrieve user groups', 500);
    }
  }

  // Archive conversation
  static async archiveConversation(req, res) {
    try {
      const userId = req.user.id;
      const { conversationUserId } = req.params;

      const result = await ChatService.archiveConversation(userId, conversationUserId);
      
      logger.info(`Conversation with ${conversationUserId} archived by user ${userId}`);
      return successResponse(res, 'Conversation archived successfully', { result });
    } catch (error) {
      logger.error('Archive conversation error:', error);
      return errorResponse(res, 'Failed to archive conversation', 500);
    }
  }

  // Unarchive conversation
  static async unarchiveConversation(req, res) {
    try {
      const userId = req.user.id;
      const { conversationUserId } = req.params;

      const result = await ChatService.unarchiveConversation(userId, conversationUserId);
      
      logger.info(`Conversation with ${conversationUserId} unarchived by user ${userId}`);
      return successResponse(res, 'Conversation unarchived successfully', { result });
    } catch (error) {
      logger.error('Unarchive conversation error:', error);
      return errorResponse(res, 'Failed to unarchive conversation', 500);
    }
  }

  // Get archived conversations
  static async getArchivedConversations(req, res) {
    try {
      const userId = req.user.id;
      const { page = 1, limit = 20, searchTerm } = req.query;

      const conversations = await ChatService.getArchivedConversations(userId, {
        page: parseInt(page),
        limit: parseInt(limit),
        searchTerm
      });

      return successResponse(res, 'Archived conversations retrieved successfully', { conversations });
    } catch (error) {
      logger.error('Get archived conversations error:', error);
      return errorResponse(res, 'Failed to retrieve archived conversations', 500);
    }
  }

  // Get chat analytics
  static async getChatAnalytics(req, res) {
    try {
      const userId = req.user.id;
      const { startDate, endDate } = req.query;

      const analytics = await ChatService.getChatAnalytics(userId, {
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null
      });

      return successResponse(res, 'Chat analytics retrieved successfully', { analytics });
    } catch (error) {
      logger.error('Get chat analytics error:', error);
      return errorResponse(res, 'Failed to retrieve chat analytics', 500);
    }
  }

  // Get conversation suggestions
  static async getConversationSuggestions(req, res) {
    try {
      const userId = req.user.id;
      const { page = 1, limit = 20, filters } = req.query;

      const suggestions = await ChatService.getConnectionSuggestions(userId, {
        page: parseInt(page),
        limit: parseInt(limit),
        filters: filters ? JSON.parse(filters) : {}
      });

      return successResponse(res, 'Conversation suggestions retrieved successfully', { suggestions });
    } catch (error) {
      logger.error('Get conversation suggestions error:', error);
      return errorResponse(res, 'Failed to retrieve conversation suggestions', 500);
    }
  }

  // Block user from chat
  static async blockUserFromChat(req, res) {
    try {
      const userId = req.user.id;
      const { userToBlockId } = req.params;
      const { reason } = req.body;

      if (!userToBlockId) {
        return errorResponse(res, 'User ID to block is required', 400);
      }

      if (userId === userToBlockId) {
        return errorResponse(res, 'Cannot block yourself', 400);
      }

      const result = await ChatService.blockUser(userId, userToBlockId, reason);
      
      logger.info(`User ${userToBlockId} blocked from chat by user ${userId}`);
      return successResponse(res, 'User blocked successfully', { result });
    } catch (error) {
      logger.error('Block user from chat error:', error);
      
      if (error.message.includes('already blocked')) {
        return errorResponse(res, 'User is already blocked', 400);
      }
      
      return errorResponse(res, 'Failed to block user', 500);
    }
  }

  // Unblock user from chat
  static async unblockUserFromChat(req, res) {
    try {
      const userId = req.user.id;
      const { userToUnblockId } = req.params;

      const result = await ChatService.unblockUser(userId, userToUnblockId);
      
      logger.info(`User ${userToUnblockId} unblocked from chat by user ${userId}`);
      return successResponse(res, 'User unblocked successfully', { result });
    } catch (error) {
      logger.error('Unblock user from chat error:', error);
      
      if (error.message.includes('not blocked')) {
        return errorResponse(res, 'User is not blocked', 400);
      }
      
      return errorResponse(res, 'Failed to unblock user', 500);
    }
  }

  // Get blocked users
  static async getBlockedUsers(req, res) {
    try {
      const userId = req.user.id;
      const { page = 1, limit = 20 } = req.query;

      const blockedUsers = await ChatService.getBlockedUsers(userId, {
        page: parseInt(page),
        limit: parseInt(limit)
      });

      return successResponse(res, 'Blocked users retrieved successfully', { blockedUsers });
    } catch (error) {
      logger.error('Get blocked users error:', error);
      return errorResponse(res, 'Failed to retrieve blocked users', 500);
    }
  }

  // Get chat history
  static async getChatHistory(req, res) {
    try {
      const userId = req.user.id;
      const { conversationUserId } = req.params;
      const { startDate, endDate, page = 1, limit = 50 } = req.query;

      const history = await ChatService.getConversation(userId, conversationUserId, {
        page: parseInt(page),
        limit: parseInt(limit),
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null
      });

      return successResponse(res, 'Chat history retrieved successfully', { history });
    } catch (error) {
      logger.error('Get chat history error:', error);
      
      if (error.message.includes('Cannot access conversation')) {
        return errorResponse(res, error.message, 403);
      }
      
      return errorResponse(res, 'Failed to retrieve chat history', 500);
    }
  }

  // Export chat data
  static async exportChatData(req, res) {
    try {
      const userId = req.user.id;
      const { conversationUserId } = req.params;
      const { format = 'json', startDate, endDate } = req.query;

      const data = await ChatService.exportChatData(userId, conversationUserId, {
        format,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null
      });

      if (format === 'json') {
        return successResponse(res, 'Chat data exported successfully', { data });
      } else {
        // For CSV format, set appropriate headers
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="chat_${conversationUserId}.csv"`);
        return res.send(data);
      }
    } catch (error) {
      logger.error('Export chat data error:', error);
      
      if (error.message.includes('Cannot access conversation')) {
        return errorResponse(res, error.message, 403);
      }
      
      return errorResponse(res, 'Failed to export chat data', 500);
    }
  }

  // Clear chat history
  static async clearChatHistory(req, res) {
    try {
      const userId = req.user.id;
      const { conversationUserId } = req.params;
      const { clearType = 'for_me' } = req.body;

      const result = await ChatService.clearChatHistory(userId, conversationUserId, clearType);
      
      logger.info(`Chat history cleared by user ${userId} for conversation with ${conversationUserId} (${clearType})`);
      return successResponse(res, 'Chat history cleared successfully', { result });
    } catch (error) {
      logger.error('Clear chat history error:', error);
      
      if (error.message.includes('Cannot access conversation')) {
        return errorResponse(res, error.message, 403);
      }
      
      return errorResponse(res, 'Failed to clear chat history', 500);
    }
  }

  // Get chat insights
  static async getChatInsights(req, res) {
    try {
      const userId = req.user.id;
      const { conversationUserId } = req.params;
      const { startDate, endDate } = req.query;

      const insights = await ChatService.getChatInsights(userId, conversationUserId, {
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null
      });
      
      return successResponse(res, 'Chat insights retrieved successfully', { insights });
    } catch (error) {
      logger.error('Get chat insights error:', error);
      
      if (error.message.includes('Cannot access conversation')) {
        return errorResponse(res, error.message, 403);
      }
      
      return errorResponse(res, 'Failed to retrieve chat insights', 500);
    }
  }

  // Send typing indicator
  static async sendTypingIndicator(req, res) {
    try {
      const userId = req.user.id;
      const { receiverId } = req.params;
      const { isTyping } = req.body;

      // This would typically be handled by WebSocket for real-time updates
      // For now, we'll just acknowledge the request
      
      logger.info(`Typing indicator sent by user ${userId} to ${receiverId}: ${isTyping}`);
      return successResponse(res, 'Typing indicator sent successfully');
    } catch (error) {
      logger.error('Send typing indicator error:', error);
      return errorResponse(res, 'Failed to send typing indicator', 500);
    }
  }

  // Mark message as delivered
  static async markMessageAsDelivered(req, res) {
    try {
      const userId = req.user.id;
      const { messageId } = req.params;

      // This would typically be handled by WebSocket for real-time updates
      // For now, we'll just acknowledge the request
      
      logger.info(`Message ${messageId} marked as delivered by user ${userId}`);
      return successResponse(res, 'Message marked as delivered successfully');
    } catch (error) {
      logger.error('Mark message as delivered error:', error);
      return errorResponse(res, 'Failed to mark message as delivered', 500);
    }
  }
}

module.exports = ChatController;
