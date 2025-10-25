'use strict';

const UserService = require('../services/UserService');
const SettingsService = require('../services/SettingsService');
const NotificationService = require('../services/NotificationService');
const ConnectionService = require('../services/ConnectionService');
const { logger } = require('../utils/logger');
const { successResponse, errorResponse } = require('../utils/response');
const { query } = require('../config/db');
const { idDecode } = require('../utils/idCodec');

class UserController {
  // User Registration
  static async register(req, res) {
    try {
      const userData = req.body;
      
      // Validate required fields
      if (!userData.email || !userData.password || !userData.name) {
        return errorResponse(res, 'Email, password, and name are required', 400);
      }

      // Create user
      const user = await UserService.register(userData);
      
      // Send welcome notification
      try {
        await NotificationService.sendWelcomeNotification(user.id);
      } catch (notificationError) {
        logger.warn('Failed to send welcome notification:', notificationError);
      }

      logger.info(`New user registered: ${user.email}`);
      return successResponse(res, 'User registered successfully', {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          status: user.status,
          created_at: user.created_at
        }
      }, 201);
    } catch (error) {
      logger.error('User registration error:', error);
      
      if (error.message.includes('already exists')) {
        return errorResponse(res, 'User with this email already exists', 409);
      }
      
      return errorResponse(res, 'Registration failed', 500);
    }
  }

  // User Login
  static async login(req, res) {
    try {
      const { email, password } = req.body;
      
      if (!email || !password) {
        return errorResponse(res, 'Email and password are required', 400);
      }

      const result = await UserService.login(email, password);
      
      logger.info(`User logged in: ${email}`);
      return successResponse(res, 'Login successful', {
        user: {
          id: result.user.id,
          name: result.user.name,
          email: result.user.email,
          status: result.user.status,
          profile_photo: result.user.profile_photo
        },
        token: result.token,
        refreshToken: result.refreshToken
      });
    } catch (error) {
      logger.error('User login error:', error);
      
      if (error.message.includes('Invalid credentials')) {
        return errorResponse(res, 'Invalid email or password', 401);
      }
      
      if (error.message.includes('Account not verified')) {
        return errorResponse(res, 'Please verify your email before logging in', 401);
      }
      
      if (error.message.includes('Account suspended')) {
        return errorResponse(res, 'Your account has been suspended', 403);
      }
      
      return errorResponse(res, 'Login failed', 500);
    }
  }

  // Refresh Token
  static async refreshToken(req, res) {
    try {
      const { refreshToken } = req.body;
      
      if (!refreshToken) {
        return errorResponse(res, 'Refresh token is required', 400);
      }

      const result = await UserService.refreshToken(refreshToken);
      
      logger.info(`Token refreshed for user: ${result.user.id}`);
      return successResponse(res, 'Token refreshed successfully', {
        token: result.token,
        refreshToken: result.refreshToken
      });
    } catch (error) {
      logger.error('Token refresh error:', error);
      
      if (error.message.includes('Invalid refresh token')) {
        return errorResponse(res, 'Invalid refresh token', 401);
      }
      
      if (error.message.includes('Token expired')) {
        return errorResponse(res, 'Refresh token expired', 401);
      }
      
      return errorResponse(res, 'Token refresh failed', 500);
    }
  }

  // Get User Profile
  static async getProfile(req, res) {
    try {
      const userId = req.user.id;
      const profile = await UserService.getUserProfile(userId);
      
      return successResponse(res, 'Profile retrieved successfully', { profile });
    } catch (error) {
      logger.error('Get profile error:', error);
      return errorResponse(res, 'Failed to retrieve profile', 500);
    }
  }

  // Update User Profile
  static async updateProfile(req, res) {
    try {
      const userId = req.user.id;
      const updateData = req.body;
      
      // Validate update data
      if (Object.keys(updateData).length === 0) {
        return errorResponse(res, 'No update data provided', 400);
      }

      const updatedProfile = await UserService.updateUserProfile(userId, updateData);
      
      logger.info(`Profile updated for user: ${userId}`);
      return successResponse(res, 'Profile updated successfully', { profile: updatedProfile });
    } catch (error) {
      logger.error('Update profile error:', error);
      
      if (error.message.includes('Validation failed')) {
        return errorResponse(res, error.message, 400);
      }
      
      return errorResponse(res, 'Failed to update profile', 500);
    }
  }

  // Upload Profile Photo
  static async uploadProfilePhoto(req, res) {
    try {
      const userId = req.user.id;
      
      if (!req.file) {
        return errorResponse(res, 'Profile photo is required', 400);
      }

      const photoUrl = await UserService.uploadProfilePhoto(userId, req.file);
      
      logger.info(`Profile photo uploaded for user: ${userId}`);
      return successResponse(res, 'Profile photo uploaded successfully', { photoUrl });
    } catch (error) {
      logger.error('Upload profile photo error:', error);
      
      if (error.message.includes('Invalid file type')) {
        return errorResponse(res, 'Invalid file type. Only images are allowed', 400);
      }
      
      if (error.message.includes('File too large')) {
        return errorResponse(res, 'File size too large', 400);
      }
      
      return errorResponse(res, 'Failed to upload profile photo', 500);
    }
  }

  // Change Password
  static async changePassword(req, res) {
    try {
      const userId = req.user.id;
      const { currentPassword, newPassword } = req.body;
      
      if (!currentPassword || !newPassword) {
        return errorResponse(res, 'Current password and new password are required', 400);
      }

      await UserService.changePassword(userId, currentPassword, newPassword);
      
      // Send security notification
      try {
        await NotificationService.sendSecurityAlert(userId, 'password_changed');
      } catch (notificationError) {
        logger.warn('Failed to send password change notification:', notificationError);
      }
      
      logger.info(`Password changed for user: ${userId}`);
      return successResponse(res, 'Password changed successfully');
    } catch (error) {
      logger.error('Change password error:', error);
      
      if (error.message.includes('Current password is incorrect')) {
        return errorResponse(res, 'Current password is incorrect', 400);
      }
      
      if (error.message.includes('New password must be different')) {
        return errorResponse(res, 'New password must be different from current password', 400);
      }
      
      return errorResponse(res, 'Failed to change password', 500);
    }
  }

  // Forgot Password
  static async forgotPassword(req, res) {
    try {
      const { email } = req.body;
      
      if (!email) {
        return errorResponse(res, 'Email is required', 400);
      }

      await UserService.forgotPassword(email);
      
      logger.info(`Password reset requested for: ${email}`);
      return successResponse(res, 'Password reset instructions sent to your email');
    } catch (error) {
      logger.error('Forgot password error:', error);
      
      if (error.message.includes('User not found')) {
        return errorResponse(res, 'If an account exists with this email, reset instructions will be sent', 200);
      }
      
      return errorResponse(res, 'Failed to process password reset request', 500);
    }
  }

  // Reset Password
  static async resetPassword(req, res) {
    try {
      const { token, newPassword } = req.body;
      
      if (!token || !newPassword) {
        return errorResponse(res, 'Reset token and new password are required', 400);
      }

      await UserService.resetPassword(token, newPassword);
      
      logger.info('Password reset completed successfully');
      return successResponse(res, 'Password reset successfully');
    } catch (error) {
      logger.error('Reset password error:', error);
      
      if (error.message.includes('Invalid or expired token')) {
        return errorResponse(res, 'Invalid or expired reset token', 400);
      }
      
      return errorResponse(res, 'Failed to reset password', 500);
    }
  }

  // Verify Email
  static async verifyEmail(req, res) {
    try {
      const { token } = req.params;
      
      if (!token) {
        return errorResponse(res, 'Verification token is required', 400);
      }

      const result = await UserService.verifyEmail(token);
      
      logger.info(`Email verified for user: ${result.user.id}`);
      return successResponse(res, 'Email verified successfully', {
        user: {
          id: result.user.id,
          name: result.user.name,
          email: result.user.email,
          status: result.user.status
        }
      });
    } catch (error) {
      logger.error('Verify email error:', error);
      
      if (error.message.includes('Invalid or expired token')) {
        return errorResponse(res, 'Invalid or expired verification token', 400);
      }
      
      return errorResponse(res, 'Failed to verify email', 500);
    }
  }

  // Resend Verification Email
  static async resendVerificationEmail(req, res) {
    try {
      const { email } = req.body;
      
      if (!email) {
        return errorResponse(res, 'Email is required', 400);
      }

      await UserService.resendVerificationEmail(email);
      
      logger.info(`Verification email resent to: ${email}`);
      return successResponse(res, 'Verification email sent successfully');
    } catch (error) {
      logger.error('Resend verification email error:', error);
      
      if (error.message.includes('User not found')) {
        return errorResponse(res, 'If an account exists with this email, verification instructions will be sent', 200);
      }
      
      if (error.message.includes('Email already verified')) {
        return errorResponse(res, 'Email is already verified', 400);
      }
      
      return errorResponse(res, 'Failed to resend verification email', 500);
    }
  }

  // Get User Settings
  static async getSettings(req, res) {
    try {
      const userId = req.user.id;
      const { category, format } = req.query;
      
      const settings = await SettingsService.getUserSettings(userId, {
        category,
        format: format || 'object'
      });
      
      return successResponse(res, 'Settings retrieved successfully', { settings });
    } catch (error) {
      logger.error('Get settings error:', error);
      return errorResponse(res, 'Failed to retrieve settings', 500);
    }
  }

  // Update User Settings
  static async updateSettings(req, res) {
    try {
      const userId = req.user.id;
      const updates = req.body;
      
      if (Object.keys(updates).length === 0) {
        return errorResponse(res, 'No settings to update', 400);
      }

      const result = await SettingsService.updateSettings(userId, updates);
      
      logger.info(`Settings updated for user: ${userId}`);
      return successResponse(res, 'Settings updated successfully', { result });
    } catch (error) {
      logger.error('Update settings error:', error);
      
      if (error.message.includes('Validation failed')) {
        return errorResponse(res, error.message, 400);
      }
      
      return errorResponse(res, 'Failed to update settings', 500);
    }
  }

  // Reset Settings to Defaults
  static async resetSettings(req, res) {
    try {
      const userId = req.user.id;
      const { category } = req.query;
      
      const result = await SettingsService.resetToDefaults(userId, category);
      
      logger.info(`Settings reset for user: ${userId}${category ? ` (${category})` : ''}`);
      return successResponse(res, 'Settings reset to defaults successfully', { result });
    } catch (error) {
      logger.error('Reset settings error:', error);
      return errorResponse(res, 'Failed to reset settings', 500);
    }
  }

  // Get User Notifications
  static async getNotifications(req, res) {
    try {
      const userId = req.user.id;
      const { page = 1, limit = 20, type, status } = req.query;
      
      const notifications = await NotificationService.getUserNotifications(userId, {
        page: parseInt(page),
        limit: parseInt(limit),
        type,
        status
      });
      
      return successResponse(res, 'Notifications retrieved successfully', { notifications });
    } catch (error) {
      logger.error('Get notifications error:', error);
      return errorResponse(res, 'Failed to retrieve notifications', 500);
    }
  }

  // Mark Notification as Read
  static async markNotificationAsRead(req, res) {
    try {
      const userId = req.user.id;
      const { notificationId } = req.params;
      
      const result = await NotificationService.markAsRead(notificationId, userId);
      
      logger.info(`Notification ${notificationId} marked as read by user: ${userId}`);
      return successResponse(res, 'Notification marked as read', { result });
    } catch (error) {
      logger.error('Mark notification as read error:', error);
      
      if (error.message.includes('Notification not found')) {
        return errorResponse(res, 'Notification not found', 404);
      }
      
      return errorResponse(res, 'Failed to mark notification as read', 500);
    }
  }

  // Mark All Notifications as Read
  static async markAllNotificationsAsRead(req, res) {
    try {
      const userId = req.user.id;
      const { type } = req.query;
      
      const result = await NotificationService.markAllAsRead(userId, type);
      
      logger.info(`All notifications marked as read for user: ${userId}`);
      return successResponse(res, 'All notifications marked as read', { result });
    } catch (error) {
      logger.error('Mark all notifications as read error:', error);
      return errorResponse(res, 'Failed to mark notifications as read', 500);
    }
  }

  // Get User Connections
  static async getConnections(req, res) {
    try {
      const userId = req.user.id;
      const { page = 1, limit = 20, status, searchTerm } = req.query;
      
      const connections = await ConnectionService.getUserConnections(userId, {
        page: parseInt(page),
        limit: parseInt(limit),
        status,
        searchTerm
      });
      
      return successResponse(res, 'Connections retrieved successfully', { connections });
    } catch (error) {
      logger.error('Get connections error:', error);
      return errorResponse(res, 'Failed to retrieve connections', 500);
    }
  }

  // Send Connection Request
  static async sendConnectionRequest(req, res) {
    try {
      const senderId = req.user.id;
      const { receiverId, message } = req.body;
      
      if (!receiverId) {
        return errorResponse(res, 'Receiver ID is required', 400);
      }

      if (senderId === receiverId) {
        return errorResponse(res, 'Cannot send connection request to yourself', 400);
      }

      const connection = await ConnectionService.sendConnectionRequest(senderId, receiverId, message);
      
      logger.info(`Connection request sent from ${senderId} to ${receiverId}`);
      return successResponse(res, 'Connection request sent successfully', { connection });
    } catch (error) {
      logger.error('Send connection request error:', error);
      
      if (error.message.includes('already connected')) {
        return errorResponse(res, 'Users are already connected', 400);
      }
      
      if (error.message.includes('request pending')) {
        return errorResponse(res, 'Connection request already pending', 400);
      }
      
      if (error.message.includes('blocked')) {
        return errorResponse(res, 'Cannot send connection request to blocked user', 400);
      }
      
      return errorResponse(res, 'Failed to send connection request', 500);
    }
  }

  // Accept Connection Request
  static async acceptConnectionRequest(req, res) {
    try {
      const userId = req.user.id;
      const { connectionId } = req.params;
      
      const connection = await ConnectionService.acceptConnectionRequest(connectionId, userId);
      
      logger.info(`Connection request ${connectionId} accepted by user: ${userId}`);
      return successResponse(res, 'Connection request accepted successfully', { connection });
    } catch (error) {
      logger.error('Accept connection request error:', error);
      
      if (error.message.includes('Connection not found')) {
        return errorResponse(res, 'Connection request not found', 404);
      }
      
      if (error.message.includes('not authorized')) {
        return errorResponse(res, 'Not authorized to accept this connection request', 403);
      }
      
      return errorResponse(res, 'Failed to accept connection request', 500);
    }
  }

  // Reject Connection Request
  static async rejectConnectionRequest(req, res) {
    try {
      const userId = req.user.id;
      const { connectionId } = req.params;
      const { reason } = req.body;
      
      const connection = await ConnectionService.rejectConnectionRequest(connectionId, userId, reason);
      
      logger.info(`Connection request ${connectionId} rejected by user: ${userId}`);
      return successResponse(res, 'Connection request rejected successfully', { connection });
    } catch (error) {
      logger.error('Reject connection request error:', error);
      
      if (error.message.includes('Connection not found')) {
        return errorResponse(res, 'Connection request not found', 404);
      }
      
      if (error.message.includes('not authorized')) {
        return errorResponse(res, 'Not authorized to reject this connection request', 403);
      }
      
      return errorResponse(res, 'Failed to reject connection request', 500);
    }
  }

  // Remove Connection
  static async removeConnection(req, res) {
    try {
      const userId = req.user.id;
      const { connectionId } = req.params;
      
      const result = await ConnectionService.removeConnection(connectionId, userId);
      
      logger.info(`Connection ${connectionId} removed by user: ${userId}`);
      return successResponse(res, 'Connection removed successfully', { result });
    } catch (error) {
      logger.error('Remove connection error:', error);
      
      if (error.message.includes('Connection not found')) {
        return errorResponse(res, 'Connection not found', 404);
      }
      
      if (error.message.includes('not authorized')) {
        return errorResponse(res, 'Not authorized to remove this connection', 403);
      }
      
      return errorResponse(res, 'Failed to remove connection', 500);
    }
  }

  // Block User
  static async blockUser(req, res) {
    try {
      const userId = req.user.id;
      const { userToBlockId, reason } = req.body;
      
      if (!userToBlockId) {
        return errorResponse(res, 'User ID to block is required', 400);
      }

      if (userId === userToBlockId) {
        return errorResponse(res, 'Cannot block yourself', 400);
      }

      const result = await ConnectionService.blockUser(userId, userToBlockId, reason);
      
      logger.info(`User ${userToBlockId} blocked by user: ${userId}`);
      return successResponse(res, 'User blocked successfully', { result });
    } catch (error) {
      logger.error('Block user error:', error);
      
      if (error.message.includes('already blocked')) {
        return errorResponse(res, 'User is already blocked', 400);
      }
      
      return errorResponse(res, 'Failed to block user', 500);
    }
  }

  // Unblock User
  static async unblockUser(req, res) {
    try {
      const userId = req.user.id;
      const { userToUnblockId } = req.params;
      
      const result = await ConnectionService.unblockUser(userId, userToUnblockId);
      
      logger.info(`User ${userToUnblockId} unblocked by user: ${userId}`);
      return successResponse(res, 'User unblocked successfully', { result });
    } catch (error) {
      logger.error('Unblock user error:', error);
      
      if (error.message.includes('not blocked')) {
        return errorResponse(res, 'User is not blocked', 400);
      }
      
      return errorResponse(res, 'Failed to unblock user', 500);
    }
  }

  // Get Connection Suggestions
  static async getConnectionSuggestions(req, res) {
    try {
      const userId = req.user.id;
      const { page = 1, limit = 20, filters } = req.query;
      
      const suggestions = await ConnectionService.getConnectionSuggestions(userId, {
        page: parseInt(page),
        limit: parseInt(limit),
        filters: filters ? JSON.parse(filters) : {}
      });
      
      return successResponse(res, 'Connection suggestions retrieved successfully', { suggestions });
    } catch (error) {
      logger.error('Get connection suggestions error:', error);
      return errorResponse(res, 'Failed to retrieve connection suggestions', 500);
    }
  }

  // Search Users
  static async searchUsers(req, res) {
    try {
      const { q, page = 1, limit = 20, filters } = req.query;
      
      if (!q || q.trim().length === 0) {
        return errorResponse(res, 'Search query is required', 400);
      }

      const results = await UserService.searchUsers(q, {
        page: parseInt(page),
        limit: parseInt(limit),
        filters: filters ? JSON.parse(filters) : {}
      });
      
      return successResponse(res, 'Search completed successfully', { results });
    } catch (error) {
      logger.error('Search users error:', error);
      return errorResponse(res, 'Search failed', 500);
    }
  }

  // Get User Recommendations
  static async getUserRecommendations(req, res) {
    try {
      const userId = req.user.id;
      const { page = 1, limit = 20, type } = req.query;
      
      const recommendations = await UserService.getUserRecommendations(userId, {
        page: parseInt(page),
        limit: parseInt(limit),
        type
      });
      
      return successResponse(res, 'Recommendations retrieved successfully', { recommendations });
    } catch (error) {
      logger.error('Get user recommendations error:', error);
      return errorResponse(res, 'Failed to retrieve recommendations', 500);
    }
  }

  // Deactivate Account
  static async deactivateAccount(req, res) {
    try {
      const userId = req.user.id;
      const { reason, password } = req.body;
      
      if (!password) {
        return errorResponse(res, 'Password is required to deactivate account', 400);
      }

      await UserService.deactivateAccount(userId, password, reason);
      
      logger.info(`Account deactivated for user: ${userId}`);
      return successResponse(res, 'Account deactivated successfully');
    } catch (error) {
      logger.error('Deactivate account error:', error);
      
      if (error.message.includes('Invalid password')) {
        return errorResponse(res, 'Invalid password', 400);
      }
      
      return errorResponse(res, 'Failed to deactivate account', 500);
    }
  }

  // Reactivate Account
  static async reactivateAccount(req, res) {
    try {
      const { email, password } = req.body;
      
      if (!email || !password) {
        return errorResponse(res, 'Email and password are required', 400);
      }

      const result = await UserService.reactivateAccount(email, password);
      
      logger.info(`Account reactivated for user: ${result.user.id}`);
      return successResponse(res, 'Account reactivated successfully', {
        user: {
          id: result.user.id,
          name: result.user.name,
          email: result.user.email,
          status: result.user.status
        },
        token: result.token
      });
    } catch (error) {
      logger.error('Reactivate account error:', error);
      
      if (error.message.includes('Invalid credentials')) {
        return errorResponse(res, 'Invalid email or password', 400);
      }
      
      if (error.message.includes('Account not deactivated')) {
        return errorResponse(res, 'Account is not deactivated', 400);
      }
      
      return errorResponse(res, 'Failed to reactivate account', 500);
    }
  }

  // Get User Statistics
  static async getUserStats(req, res) {
    try {
      const userId = req.user.id;
      const stats = await UserService.getUserStatistics(userId);
      
      return successResponse(res, 'User statistics retrieved successfully', { stats });
    } catch (error) {
      logger.error('Get user stats error:', error);
      return errorResponse(res, 'Failed to retrieve user statistics', 500);
    }
  }

  // Export User Data
  static async exportUserData(req, res) {
    try {
      const userId = req.user.id;
      const { format = 'json' } = req.query;
      
      const data = await UserService.exportUserData(userId, format);
      
      if (format === 'json') {
        return successResponse(res, 'User data exported successfully', { data });
      } else {
        // For CSV format, set appropriate headers
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="user_data_${userId}.csv"`);
        return res.send(data);
      }
    } catch (error) {
      logger.error('Export user data error:', error);
      return errorResponse(res, 'Failed to export user data', 500);
    }
  }


  // Fetch users by name and ID (similar to state list format)
  static async fetchUserByNameId(req, res) {
    try {
      const { user_id, token } = {
        ...req.query,
        ...req.body
      };
      
      if (!user_id || !token) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'user_id and token are required'
        });
      }
      
      // Decode user ID
      const decodedUserId = idDecode(user_id);
      if (!decodedUserId) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'Invalid user ID'
        });
      }
      
      // Get user details and validate
      const userRows = await query('SELECT * FROM users WHERE user_id = ? LIMIT 1', [decodedUserId]);
      if (!userRows.length) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'Not A Valid User'
        });
      }
      
      const user = userRows[0];
      
      // Validate token
      if (user.unique_token !== token) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'Token Mismatch Exception'
        });
      }

      // Get all users list with name and ID
      const usersList = await query(`
        SELECT 
          user_id,
          CASE 
            WHEN full_name IS NOT NULL AND full_name != '' THEN full_name
            WHEN mobile IS NOT NULL AND mobile != '' THEN CONCAT('User_', user_id)
            WHEN email IS NOT NULL AND email != '' THEN CONCAT('User_', user_id)
            ELSE CONCAT('User_', user_id)
          END as user_name
        FROM users 
        WHERE deleted = 0 
        ORDER BY 
          CASE 
            WHEN full_name IS NOT NULL AND full_name != '' THEN full_name
            WHEN mobile IS NOT NULL AND mobile != '' THEN CONCAT('User_', user_id)
            WHEN email IS NOT NULL AND email != '' THEN CONCAT('User_', user_id)
            ELSE CONCAT('User_', user_id)
          END ASC
      `);
      
      return res.json({
        status: true,
        rcode: 200,
        user_id: user_id,
        unique_token: token,
        user_list: usersList.map(user => ({
          user_id: user.user_id.toString(),
          user_name: user.user_name || ""
        }))
      });
      
    } catch (error) {
      console.error('fetchUserByNameId error:', error);
      return res.json({
        status: false,
        rcode: 500,
        message: 'Failed to get user list'
      });
    }
  }

  // Fetch industry types by name and ID (similar to state list format)
  static async fetchIndustryTypeByNameId(req, res) {
    try {
      const { user_id, token } = {
        ...req.query,
        ...req.body
      };
      
      if (!user_id || !token) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'user_id and token are required'
        });
      }
      
      // Decode user ID
      const decodedUserId = idDecode(user_id);
      if (!decodedUserId) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'Invalid user ID'
        });
      }
      
      // Get user details and validate
      const userRows = await query('SELECT * FROM users WHERE user_id = ? LIMIT 1', [decodedUserId]);
      if (!userRows.length) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'Not A Valid User'
        });
      }
      
      const user = userRows[0];
      
      // Validate token
      if (user.unique_token !== token) {
        return res.json({
          status: false,
          rcode: 500,
          message: 'Token Mismatch Exception'
        });
      }

      // Get all industry types list with name and ID
      const industryTypesList = await query(`
        SELECT 
          id as industry_type_id,
          name as industry_type_name
        FROM industry_type 
        WHERE deleted = 0 
        ORDER BY name ASC
      `);
      
      return res.json({
        status: true,
        rcode: 200,
        user_id: user_id,
        unique_token: token,
        industry_type_list: industryTypesList.map(industry => ({
          industry_type_id: industry.industry_type_id.toString(),
          industry_type_name: industry.industry_type_name || ""
        }))
      });
      
    } catch (error) {
      console.error('fetchIndustryTypeByNameId error:', error);
      return res.json({
        status: false,
        rcode: 500,
        message: 'Failed to get industry type list'
      });
    }
  }
}

module.exports = UserController;
