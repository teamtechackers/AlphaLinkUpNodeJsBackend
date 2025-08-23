'use strict';

const Chat = require('../models/Chat');
const User = require('../models/User');
const Connection = require('../models/Connection');
const Notification = require('../models/Notification');
const { logger } = require('../utils/logger');

class ChatService {
  // Send a message
  static async sendMessage(senderId, receiverId, messageData) {
    try {
    // Validate message data
    const validationErrors = ChatService.validateMessageData(messageData);
    if (validationErrors.length > 0) {
      throw new Error(`Message validation failed: ${validationErrors.join(', ')}`);
    }

    // Check if users can communicate
    const canCommunicate = await ChatService.canUsersCommunicate(senderId, receiverId);
    if (!canCommunicate.allowed) {
      throw new Error(`Cannot send message: ${canCommunicate.reason}`);
    }

    // Create the message
    const message = await Chat.createMessage(senderId, receiverId, {
      message: messageData.message,
      message_type: messageData.messageType || 'text',
      attachments: messageData.attachments || [],
      reply_to: messageData.replyTo || null,
      is_edited: false,
      edited_at: null
    });

    // Update conversation last activity
    await Chat.updateConversationActivity(senderId, receiverId);

    // Send notification to receiver
    try {
      await Notification.createNotification({
        user_id: receiverId,
        type: 'new_message',
        title: 'New Message',
        message: `You have a new message from ${message.sender_name}`,
        data: {
          messageId: message.id,
          senderId: senderId,
          conversationId: message.conversation_id,
          preview: messageData.message.substring(0, 100)
        }
      });
    } catch (notificationError) {
      logger.warn('Failed to send message notification:', notificationError);
    }

    // Log message sent
    await ChatService.logChatAction('message_sent', {
      messageId: message.id,
      senderId,
      receiverId,
      messageType: messageData.messageType,
      hasAttachments: messageData.attachments && messageData.attachments.length > 0
    });

    logger.info(`Message sent from ${senderId} to ${receiverId}`);
    return message;
    } catch (error) {
      logger.error('Error sending message:', error);
      throw error;
    }
  }

  // Get conversation between two users
  static async getConversation(userId1, userId2, options = {}) {
    try {
      const {
        page = 1,
        limit = 50,
        beforeMessageId = null,
        afterMessageId = null,
        includeDeleted = false
      } = options;

      // Check if users can communicate
      const canCommunicate = await ChatService.canUsersCommunicate(userId1, userId2);
      if (!canCommunicate.allowed) {
        throw new Error(`Cannot access conversation: ${canCommunicate.reason}`);
      }

      // Get conversation messages
      const messages = await Chat.getConversation(userId1, userId2, {
        page,
        limit,
        beforeMessageId,
        afterMessageId,
        includeDeleted
      });

      // Mark messages as read for the requesting user
      if (messages.length > 0) {
        await Chat.markMessagesAsRead(userId1, userId2);
      }

      // Get conversation metadata
      const conversation = await Chat.getConversationMetadata(userId1, userId2);

      return {
        messages,
        conversation,
        pagination: {
          page,
          limit,
          total: messages.length,
          hasMore: messages.length === limit
        }
      };
    } catch (error) {
      logger.error('Error getting conversation:', error);
      throw error;
    }
  }

  // Get all conversations for a user
  static async getUserConversations(userId, options = {}) {
    try {
      const {
        page = 1,
        limit = 20,
        status = 'active',
        searchTerm = null,
        sortBy = 'last_activity',
        sortOrder = 'desc'
      } = options;

      const conversations = await Chat.getUserConversations(userId, {
        page,
        limit,
        status,
        searchTerm,
        sortBy,
        sortOrder
      });

      // Enrich conversations with user details
      const enrichedConversations = await Promise.all(
        conversations.map(async (conversation) => {
          const otherUserId = conversation.user1_id === userId ? conversation.user2_id : conversation.user1_id;
          const otherUser = await User.findById(otherUserId);
          
          return {
            ...conversation,
            otherUser: otherUser ? {
              id: otherUser.id,
              name: otherUser.name,
              profile_photo: otherUser.profile_photo,
              is_online: otherUser.is_online,
              last_seen: otherUser.last_seen
            } : null,
            unreadCount: await Chat.getUnreadCount(userId, otherUserId)
          };
        })
      );

      return {
        conversations: enrichedConversations,
        pagination: {
          page,
          limit,
          total: conversations.length,
          hasMore: conversations.length === limit
        }
      };
    } catch (error) {
      logger.error('Error getting user conversations:', error);
      throw error;
    }
  }

  // Edit a message
  static async editMessage(messageId, userId, newMessage) {
    try {
      // Get the message
      const message = await Chat.getMessageById(messageId);
      if (!message) {
        throw new Error('Message not found');
      }

      // Check if user can edit this message
      if (message.sender_id !== userId) {
        throw new Error('Cannot edit message from another user');
      }

      // Check if message is too old to edit
      const messageAge = Date.now() - new Date(message.created_at).getTime();
      const maxEditAge = 15 * 60 * 1000; // 15 minutes
      if (messageAge > maxEditAge) {
        throw new Error('Message is too old to edit');
      }

      // Update the message
      const updatedMessage = await Chat.updateMessage(messageId, {
        message: newMessage,
        is_edited: true,
        edited_at: new Date()
      });

      // Log message edit
      await ChatService.logChatAction('message_edited', {
        messageId,
        userId,
        oldMessage: message.message,
        newMessage
      });

      logger.info(`Message ${messageId} edited by user ${userId}`);
      return updatedMessage;
    } catch (error) {
      logger.error('Error editing message:', error);
      throw error;
    }
  }

  // Delete a message
  static async deleteMessage(messageId, userId, deleteType = 'for_me') {
    try {
      // Get the message
      const message = await Chat.getMessageById(messageId);
      if (!message) {
        throw new Error('Message not found');
      }

      // Check if user can delete this message
      if (message.sender_id !== userId && deleteType === 'for_everyone') {
        throw new Error('Cannot delete message from another user for everyone');
      }

      // Delete the message
      const result = await Chat.deleteMessage(messageId, userId, deleteType);

      // Log message deletion
      await ChatService.logChatAction('message_deleted', {
        messageId,
        userId,
        deleteType,
        wasSender: message.sender_id === userId
      });

      logger.info(`Message ${messageId} deleted by user ${userId} (${deleteType})`);
      return result;
    } catch (error) {
      logger.error('Error deleting message:', error);
      throw error;
    }
  }

  // Mark messages as read
  static async markMessagesAsRead(userId, conversationUserId) {
    try {
      const result = await Chat.markMessagesAsRead(userId, conversationUserId);
      
      // Log read action
      await ChatService.logChatAction('messages_read', {
        userId,
        conversationUserId,
        readCount: result.updatedCount
      });

      return result;
    } catch (error) {
      logger.error('Error marking messages as read:', error);
      throw error;
    }
  }

  // Mark all messages as read
  static async markAllMessagesAsRead(userId) {
    try {
      const result = await Chat.markAllMessagesAsRead(userId);
      
      // Log bulk read action
      await ChatService.logChatAction('all_messages_read', {
        userId,
        readCount: result.updatedCount
      });

      return result;
    } catch (error) {
      logger.error('Error marking all messages as read:', error);
      throw error;
    }
  }

  // Get unread message count
  static async getUnreadCount(userId, conversationUserId = null) {
    try {
      if (conversationUserId) {
        return await Chat.getUnreadCount(userId, conversationUserId);
      } else {
        return await Chat.getTotalUnreadCount(userId);
      }
    } catch (error) {
      logger.error('Error getting unread count:', error);
      throw error;
    }
  }

  // Search messages
  static async searchMessages(userId, searchTerm, options = {}) {
    try {
      const {
        conversationUserId = null,
        messageType = null,
        startDate = null,
        endDate = null,
        page = 1,
        limit = 20
      } = options;

      const messages = await Chat.searchMessages(userId, searchTerm, {
        conversationUserId,
        messageType,
        startDate,
        endDate,
        page,
        limit
      });

      // Log search action
      await ChatService.logChatAction('messages_searched', {
        userId,
        searchTerm,
        resultCount: messages.length,
        filters: { conversationUserId, messageType, startDate, endDate }
      });

      return {
        messages,
        pagination: {
          page,
          limit,
          total: messages.length,
          hasMore: messages.length === limit
        }
      };
    } catch (error) {
      logger.error('Error searching messages:', error);
      throw error;
    }
  }

  // Get message statistics
  static async getMessageStats(userId, options = {}) {
    try {
      const {
        startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
        endDate = new Date(),
        groupBy = 'day'
      } = options;

      const stats = await Chat.getMessageStats(userId, { startDate, endDate, groupBy });

      // Add additional calculated statistics
      const enrichedStats = {
        ...stats,
        averageMessagesPerDay: await ChatService.calculateAverageMessagesPerDay(userId, startDate, endDate),
        topConversations: await ChatService.getTopConversations(userId, startDate, endDate),
        messageTrends: await ChatService.calculateMessageTrends(userId, startDate, endDate)
      };

      return enrichedStats;
    } catch (error) {
      logger.error('Error getting message statistics:', error);
      throw error;
    }
  }

  // Create group chat
  static async createGroupChat(creatorId, groupData) {
    try {
      // Validate group data
      const validationErrors = ChatService.validateGroupData(groupData);
      if (validationErrors.length > 0) {
        throw new Error(`Group validation failed: ${validationErrors.join(', ')}`);
      }

      // Check if creator can create group
      const canCreate = await ChatService.canUserCreateGroup(creatorId);
      if (!canCreate.allowed) {
        throw new Error(`Cannot create group: ${canCreate.reason}`);
      }

      // Create the group
      const group = await Chat.createGroupChat(creatorId, {
        name: groupData.name,
        description: groupData.description,
        avatar: groupData.avatar,
        is_private: groupData.isPrivate || false,
        max_members: groupData.maxMembers || 100
      });

      // Add initial members
      if (groupData.members && groupData.members.length > 0) {
        await ChatService.addGroupMembers(group.id, groupData.members, creatorId);
      }

      // Send group creation notification
      try {
        await Notification.createNotification({
          user_id: creatorId,
          type: 'group_created',
          title: 'Group Created',
          message: `Group "${groupData.name}" has been created successfully.`,
          data: { groupId: group.id, groupName: groupData.name }
        });
      } catch (notificationError) {
        logger.warn('Failed to send group creation notification:', notificationError);
      }

      logger.info(`Group chat "${groupData.name}" created by user ${creatorId}`);
      return group;
    } catch (error) {
      logger.error('Error creating group chat:', error);
      throw error;
    }
  }

  // Add members to group
  static async addGroupMembers(groupId, memberIds, addedByUserId) {
    try {
      // Check if user can add members
      const canAdd = await ChatService.canUserAddGroupMembers(groupId, addedByUserId);
      if (!canAdd.allowed) {
        throw new Error(`Cannot add members: ${canAdd.reason}`);
      }

      // Add members
      const result = await Chat.addGroupMembers(groupId, memberIds, addedByUserId);

      // Send notifications to new members
      for (const memberId of memberIds) {
        try {
          await Notification.createNotification({
            user_id: memberId,
            type: 'added_to_group',
            title: 'Added to Group',
            message: `You have been added to a group chat.`,
            data: { groupId, addedBy: addedByUserId }
          });
        } catch (notificationError) {
          logger.warn('Failed to send group addition notification:', notificationError);
        }
      }

      // Log member addition
      await ChatService.logChatAction('group_members_added', {
        groupId,
        addedBy: addedByUserId,
        memberIds,
        addedCount: result.addedCount
      });

      return result;
    } catch (error) {
      logger.error('Error adding group members:', error);
      throw error;
    }
  }

  // Remove member from group
  static async removeGroupMember(groupId, memberId, removedByUserId) {
    try {
      // Check if user can remove members
      const canRemove = await ChatService.canUserRemoveGroupMembers(groupId, removedByUserId);
      if (!canRemove.allowed) {
        throw new Error(`Cannot remove members: ${canRemove.reason}`);
      }

      // Remove member
      const result = await Chat.removeGroupMember(groupId, memberId, removedByUserId);

      // Send notification to removed member
      try {
        await Notification.createNotification({
          user_id: memberId,
          type: 'removed_from_group',
          title: 'Removed from Group',
          message: `You have been removed from a group chat.`,
          data: { groupId, removedBy: removedByUserId }
        });
      } catch (notificationError) {
        logger.warn('Failed to send group removal notification:', notificationError);
      }

      // Log member removal
      await ChatService.logChatAction('group_member_removed', {
        groupId,
        removedBy: removedByUserId,
        memberId
      });

      return result;
    } catch (error) {
      logger.error('Error removing group member:', error);
      throw error;
    }
  }

  // Send group message
  static async sendGroupMessage(groupId, senderId, messageData) {
    try {
      // Check if user is member of group
      const isMember = await Chat.isGroupMember(groupId, senderId);
      if (!isMember) {
        throw new Error('User is not a member of this group');
      }

      // Validate message data
      const validationErrors = ChatService.validateMessageData(messageData);
      if (validationErrors.length > 0) {
        throw new Error(`Message validation failed: ${validationErrors.join(', ')}`);
      }

      // Create group message
      const message = await Chat.createGroupMessage(groupId, senderId, {
        message: messageData.message,
        message_type: messageData.messageType || 'text',
        attachments: messageData.attachments || [],
        reply_to: messageData.replyTo || null,
        is_edited: false,
        edited_at: null
      });

      // Update group last activity
      await Chat.updateGroupActivity(groupId);

      // Send notifications to group members (excluding sender)
      const groupMembers = await Chat.getGroupMembers(groupId);
      const membersToNotify = groupMembers.filter(member => member.user_id !== senderId);

      for (const member of membersToNotify) {
        try {
          await Notification.createNotification({
            user_id: member.user_id,
            type: 'new_group_message',
            title: 'New Group Message',
            message: `New message in group chat`,
            data: {
              messageId: message.id,
              groupId,
              senderId,
              preview: messageData.message.substring(0, 100)
            }
          });
        } catch (notificationError) {
          logger.warn('Failed to send group message notification:', notificationError);
        }
      }

      // Log group message
      await ChatService.logChatAction('group_message_sent', {
        messageId: message.id,
        groupId,
        senderId,
        messageType: messageData.messageType,
        hasAttachments: messageData.attachments && messageData.attachments.length > 0
      });

      logger.info(`Group message sent in group ${groupId} by user ${senderId}`);
      return message;
    } catch (error) {
      logger.error('Error sending group message:', error);
      throw error;
    }
  }

  // Get group messages
  static async getGroupMessages(groupId, userId, options = {}) {
    try {
      const {
        page = 1,
        limit = 50,
        beforeMessageId = null,
        afterMessageId = null
      } = options;

      // Check if user is member of group
      const isMember = await Chat.isGroupMember(groupId, userId);
      if (!isMember) {
        throw new Error('User is not a member of this group');
      }

      // Get group messages
      const messages = await Chat.getGroupMessages(groupId, {
        page,
        limit,
        beforeMessageId,
        afterMessageId
      });

      // Mark messages as read for the user
      if (messages.length > 0) {
        await Chat.markGroupMessagesAsRead(groupId, userId);
      }

      return {
        messages,
        pagination: {
          page,
          limit,
          total: messages.length,
          hasMore: messages.length === limit
        }
      };
    } catch (error) {
      logger.error('Error getting group messages:', error);
      throw error;
    }
  }

  // Get user groups
  static async getUserGroups(userId, options = {}) {
    try {
      const {
        page = 1,
        limit = 20,
        status = 'active',
        searchTerm = null
      } = options;

      const groups = await Chat.getUserGroups(userId, {
        page,
        limit,
        status,
        searchTerm
      });

      // Enrich groups with member count and unread count
      const enrichedGroups = await Promise.all(
        groups.map(async (group) => {
          const memberCount = await Chat.getGroupMemberCount(group.id);
          const unreadCount = await Chat.getGroupUnreadCount(group.id, userId);

          return {
            ...group,
            memberCount,
            unreadCount
          };
        })
      );

      return {
        groups: enrichedGroups,
        pagination: {
          page,
          limit,
          total: groups.length,
          hasMore: groups.length === limit
        }
      };
    } catch (error) {
      logger.error('Error getting user groups:', error);
      throw error;
    }
  }

  // Utility methods

  static validateMessageData(messageData) {
    const errors = [];

    if (!messageData.message || messageData.message.trim().length === 0) {
      errors.push('Message content is required');
    }

    if (messageData.message && messageData.message.length > 5000) {
      errors.push('Message is too long (max 5000 characters)');
    }

    if (messageData.attachments && messageData.attachments.length > 10) {
      errors.push('Too many attachments (max 10)');
    }

    if (messageData.messageType && !['text', 'image', 'file', 'audio', 'video'].includes(messageData.messageType)) {
      errors.push('Invalid message type');
    }

    return errors;
  }

  static validateGroupData(groupData) {
    const errors = [];

    if (!groupData.name || groupData.name.trim().length === 0) {
      errors.push('Group name is required');
    }

    if (groupData.name && groupData.name.length > 100) {
      errors.push('Group name is too long (max 100 characters)');
    }

    if (groupData.description && groupData.description.length > 500) {
      errors.push('Group description is too long (max 500 characters)');
    }

    if (groupData.maxMembers && (groupData.maxMembers < 2 || groupData.maxMembers > 1000)) {
      errors.push('Group size must be between 2 and 1000 members');
    }

    return errors;
  }

  static async canUsersCommunicate(userId1, userId2) {
    try {
      // Check if users exist and are active
      const user1 = await User.findById(userId1);
      const user2 = await User.findById(userId2);

      if (!user1 || !user1.is_active) {
        return { allowed: false, reason: 'Sender account not found or inactive' };
      }

      if (!user2 || !user2.is_active) {
        return { allowed: false, reason: 'Receiver account not found or inactive' };
      }

      // Check if users are blocked
      const isBlocked = await Connection.isUserBlocked(userId1, userId2);
      if (isBlocked) {
        return { allowed: false, reason: 'Users are blocked from communicating' };
      }

      // Check if users are connected (optional - can be configured)
      const requireConnection = process.env.REQUIRE_CONNECTION_FOR_CHAT === 'true';
      if (requireConnection) {
        const areConnected = await Connection.areUsersConnected(userId1, userId2);
        if (!areConnected) {
          return { allowed: false, reason: 'Users must be connected to chat' };
        }
      }

      return { allowed: true };
    } catch (error) {
      logger.error('Error checking if users can communicate:', error);
      return { allowed: false, reason: 'Error checking communication permissions' };
    }
  }

  static async canUserCreateGroup(userId) {
    try {
      // Check if user exists and is active
      const user = await User.findById(userId);
      if (!user || !user.is_active) {
        return { allowed: false, reason: 'User account not found or inactive' };
      }

      // Check user's group creation limit
      const userGroups = await Chat.getUserGroups(userId, { status: 'active' });
      const maxGroups = user.role === 'admin' ? 50 : 10; // Admins can create more groups

      if (userGroups.length >= maxGroups) {
        return { allowed: false, reason: 'User has reached maximum group creation limit' };
      }

      return { allowed: true };
    } catch (error) {
      logger.error('Error checking if user can create group:', error);
      return { allowed: false, reason: 'Error checking group creation permissions' };
    }
  }

  static async canUserAddGroupMembers(groupId, userId) {
    try {
      // Check if user is group admin or moderator
      const groupRole = await Chat.getUserGroupRole(groupId, userId);
      if (!groupRole || !['admin', 'moderator'].includes(groupRole.role)) {
        return { allowed: false, reason: 'User does not have permission to add members' };
      }

      return { allowed: true };
    } catch (error) {
      logger.error('Error checking if user can add group members:', error);
      return { allowed: false, reason: 'Error checking permissions' };
    }
  }

  static async canUserRemoveGroupMembers(groupId, userId) {
    try {
      // Check if user is group admin
      const groupRole = await Chat.getUserGroupRole(groupId, userId);
      if (!groupRole || groupRole.role !== 'admin') {
        return { allowed: false, reason: 'Only group admins can remove members' };
      }

      return { allowed: true };
    } catch (error) {
      logger.error('Error checking if user can remove group members:', error);
      return { allowed: false, reason: 'Error checking permissions' };
    }
  }

  static async logChatAction(action, details) {
    try {
      // Log chat actions for audit trail
      // This would typically write to an audit log
      logger.info(`Chat action logged: ${action}`, {
        ...details,
        timestamp: new Date()
      });
    } catch (error) {
      logger.error('Error logging chat action:', error);
    }
  }

  static async calculateAverageMessagesPerDay(userId, startDate, endDate) {
    try {
      // Calculate average messages per day for user
      // This would typically query message data and calculate average
      return {
        average: 15.5,
        totalDays: 30,
        totalMessages: 465
      };
    } catch (error) {
      logger.error('Error calculating average messages per day:', error);
      return {};
    }
  }

  static async getTopConversations(userId, startDate, endDate) {
    try {
      // Get user's most active conversations
      // This would typically aggregate message data
      return [
        { userId: '123', messageCount: 150, lastActivity: new Date() },
        { userId: '456', messageCount: 89, lastActivity: new Date() },
        { userId: '789', messageCount: 67, lastActivity: new Date() }
      ];
    } catch (error) {
      logger.error('Error getting top conversations:', error);
      return [];
    }
  }

  static async calculateMessageTrends(userId, startDate, endDate) {
    try {
      // Calculate message trends over time
      // This would typically analyze message data by date
      return {
        daily: [12, 15, 8, 20, 18, 14, 16],
        weekly: [85, 92, 78, 105, 88],
        trend: 'increasing'
      };
    } catch (error) {
      logger.error('Error calculating message trends:', error);
      return {};
    }
  }

  // Get chat analytics
  static async getChatAnalytics(userId, options = {}) {
    try {
      const {
        startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        endDate = new Date()
      } = options;

      const [messageStats, conversationStats, groupStats] = await Promise.all([
        this.getMessageStats(userId, { startDate, endDate }),
        Chat.getConversationStats(userId, { startDate, endDate }),
        Chat.getGroupChatStats(userId, { startDate, endDate })
      ]);

      return {
        messageStats,
        conversationStats,
        groupStats,
        summary: {
          totalMessages: messageStats.totalMessages || 0,
          totalConversations: conversationStats.totalConversations || 0,
          totalGroups: groupStats.totalGroups || 0,
          averageResponseTime: await ChatService.calculateAverageResponseTime(userId, startDate, endDate)
        }
      };
    } catch (error) {
      logger.error('Error getting chat analytics:', error);
      throw error;
    }
  }

  static async calculateAverageResponseTime(userId, startDate, endDate) {
    try {
      // Calculate average response time for user
      // This would typically analyze message timestamps
      return {
        averageMinutes: 45.2,
        totalResponses: 120,
        fastestResponse: 2,
        slowestResponse: 180
      };
    } catch (error) {
      logger.error('Error calculating average response time:', error);
      return {};
    }
  }

  // Archive conversation
  static async archiveConversation(userId, conversationUserId) {
    try {
      const result = await Chat.archiveConversation(userId, conversationUserId);
      
      // Log archive action
      await ChatService.logChatAction('conversation_archived', {
        userId,
        conversationUserId
      });

      return result;
    } catch (error) {
      logger.error('Error archiving conversation:', error);
      throw error;
    }
  }

  // Unarchive conversation
  static async unarchiveConversation(userId, conversationUserId) {
    try {
      const result = await Chat.unarchiveConversation(userId, conversationUserId);
      
      // Log unarchive action
      await ChatService.logChatAction('conversation_unarchived', {
        userId,
        conversationUserId
      });

      return result;
    } catch (error) {
      logger.error('Error unarchiving conversation:', error);
      throw error;
    }
  }

  // Get archived conversations
  static async getArchivedConversations(userId, options = {}) {
    try {
      const {
        page = 1,
        limit = 20,
        searchTerm = null
      } = options;

      const conversations = await Chat.getArchivedConversations(userId, {
        page,
        limit,
        searchTerm
      });

      return {
        conversations,
        pagination: {
          page,
          limit,
          total: conversations.length,
          hasMore: conversations.length === limit
        }
      };
    } catch (error) {
      logger.error('Error getting archived conversations:', error);
      throw error;
    }
  }
}

module.exports = ChatService;
