'use strict';

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Settings = require('../models/Settings');
const Notification = require('../models/Notification');
const Connection = require('../models/Connection');
const { generateToken, generateRefreshToken } = require('../middlewares/auth');
const { logger } = require('../utils/logger');
const { sendEmail } = require('./EmailService');

class UserService {
  // User Registration
  static async register(userData) {
    try {
      // Validate user data
      const validationErrors = UserService.validateRegistrationData(userData);
      if (validationErrors.length > 0) {
        throw new Error(`Validation failed: ${validationErrors.join(', ')}`);
      }

      // Check if user already exists
      const existingUser = await User.findByEmail(userData.email);
      if (existingUser) {
        throw new Error('User with this email already exists');
      }

      // Hash password
      const saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
      const hashedPassword = await bcrypt.hash(userData.password, saltRounds);

      // Create user
      const user = await User.create({
        ...userData,
        password: hashedPassword
      });

      // Initialize default settings
      await Settings.initializeDefaults(user.id);

      // Send welcome email
      try {
        await sendEmail({
          to: user.email,
          subject: 'Welcome to AlphaLinkup!',
          template: 'welcome',
          data: { name: user.name }
        });
      } catch (emailError) {
        logger.warn('Failed to send welcome email:', emailError);
      }

      // Generate tokens
      const accessToken = generateToken({ userId: user.id, email: user.email });
      const refreshToken = generateRefreshToken({ userId: user.id });

      // Remove password from response
      delete user.password;

      return {
        user,
        accessToken,
        refreshToken,
        message: 'User registered successfully'
      };
    } catch (error) {
      logger.error('Error in user registration:', error);
      throw error;
    }
  }

  // User Login
  static async login(email, password) {
    try {
      // Find user by email
      const user = await User.findByEmail(email);
      if (!user) {
        throw new Error('Invalid email or password');
      }

      // Check if user is active
      if (user.status !== 1) {
        throw new Error('Account is deactivated. Please contact support.');
      }

      // Verify password
      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        throw new Error('Invalid email or password');
      }

      // Update last login
      await User.updateLastLogin(user.id);

      // Generate tokens
      const accessToken = generateToken({ userId: user.id, email: user.email });
      const refreshToken = generateRefreshToken({ userId: user.id });

      // Remove password from response
      delete user.password;

      return {
        user,
        accessToken,
        refreshToken,
        message: 'Login successful'
      };
    } catch (error) {
      logger.error('Error in user login:', error);
      throw error;
    }
  }

  // Refresh Token
  static async refreshToken(refreshToken) {
    try {
      const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET);
      
      // Check if user exists and is active
      const user = await User.findById(decoded.userId);
      if (!user || user.status !== 1) {
        throw new Error('Invalid refresh token');
      }

      // Generate new tokens
      const newAccessToken = generateToken({ userId: user.id, email: user.email });
      const newRefreshToken = generateRefreshToken({ userId: user.id });

      return {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken
      };
    } catch (error) {
      logger.error('Error refreshing token:', error);
      throw new Error('Invalid refresh token');
    }
  }

  // Get User Profile
  static async getProfile(userId, requestingUserId = null) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Check if requesting user can see this profile
      const canViewFullProfile = await UserService.canViewFullProfile(userId, requestingUserId);
      
      if (!canViewFullProfile) {
        // Return limited profile information
        return UserService.getLimitedProfile(user);
      }

      // Get additional profile data
      const [education, workExperience, projects, connections] = await Promise.all([
        User.getEducation(userId),
        User.getWorkExperience(userId),
        User.getProjects(userId),
        Connection.getStats(userId)
      ]);

      return {
        ...user,
        education,
        workExperience,
        projects,
        connections
      };
    } catch (error) {
      logger.error('Error getting user profile:', error);
      throw error;
    }
  }

  // Update User Profile
  static async updateProfile(userId, updateData) {
    try {
      // Validate update data
      const validationErrors = UserService.validateProfileUpdateData(updateData);
      if (validationErrors.length > 0) {
        throw new Error(`Validation failed: ${validationErrors.join(', ')}`);
      }

      // Update user profile
      const updatedUser = await User.update(userId, updateData);

      // Send profile update notification to connections
      try {
        await UserService.notifyProfileUpdate(userId);
      } catch (notificationError) {
        logger.warn('Failed to send profile update notification:', notificationError);
      }

      return updatedUser;
    } catch (error) {
      logger.error('Error updating user profile:', error);
      throw error;
    }
  }

  // Change Password
  static async changePassword(userId, currentPassword, newPassword) {
    try {
      // Get current user
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Verify current password
      const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
      if (!isCurrentPasswordValid) {
        throw new Error('Current password is incorrect');
      }

      // Validate new password
      if (newPassword.length < 6) {
        throw new Error('New password must be at least 6 characters long');
      }

      // Hash new password
      const saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
      const hashedNewPassword = await bcrypt.hash(newPassword, saltRounds);

      // Update password
      await User.updatePassword(userId, hashedNewPassword);

      // Send password change notification
      try {
        await sendEmail({
          to: user.email,
          subject: 'Password Changed Successfully',
          template: 'password_changed',
          data: { name: user.name }
        });
      } catch (emailError) {
        logger.warn('Failed to send password change email:', emailError);
      }

      return { message: 'Password changed successfully' };
    } catch (error) {
      logger.error('Error changing password:', error);
      throw error;
    }
  }

  // Forgot Password
  static async forgotPassword(email) {
    try {
      const user = await User.findByEmail(email);
      if (!user) {
        // Don't reveal if user exists or not
        return { message: 'If an account with this email exists, a reset link has been sent.' };
      }

      // Generate reset token
      const resetToken = jwt.sign(
        { userId: user.id, type: 'password_reset' },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
      );

      // Store reset token in user settings
      await Settings.set(user.id, 'password_reset_token', resetToken, 'string');
      await Settings.set(user.id, 'password_reset_expires', new Date(Date.now() + 3600000).toISOString(), 'string');

      // Send reset email
      const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
      
      await sendEmail({
        to: user.email,
        subject: 'Password Reset Request',
        template: 'password_reset',
        data: { name: user.name, resetLink }
      });

      return { message: 'If an account with this email exists, a reset link has been sent.' };
    } catch (error) {
      logger.error('Error in forgot password:', error);
      throw error;
    }
  }

  // Reset Password
  static async resetPassword(resetToken, newPassword) {
    try {
      // Verify reset token
      const decoded = jwt.verify(resetToken, process.env.JWT_SECRET);
      if (decoded.type !== 'password_reset') {
        throw new Error('Invalid reset token');
      }

      // Check if token is stored and not expired
      const storedToken = await Settings.get(decoded.userId, 'password_reset_token');
      const expiresAt = await Settings.get(decoded.userId, 'password_reset_expires');

      if (!storedToken || storedToken.setting_value !== resetToken) {
        throw new Error('Invalid reset token');
      }

      if (new Date(expiresAt.setting_value) < new Date()) {
        throw new Error('Reset token has expired');
      }

      // Validate new password
      if (newPassword.length < 6) {
        throw new Error('New password must be at least 6 characters long');
      }

      // Hash new password
      const saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
      const hashedNewPassword = await bcrypt.hash(newPassword, saltRounds);

      // Update password
      await User.updatePassword(decoded.userId, hashedNewPassword);

      // Clear reset token
      await Settings.delete(decoded.userId, 'password_reset_token');
      await Settings.delete(decoded.userId, 'password_reset_expires');

      // Get user for email
      const user = await User.findById(decoded.userId);

      // Send confirmation email
      try {
        await sendEmail({
          to: user.email,
          subject: 'Password Reset Successful',
          template: 'password_reset_success',
          data: { name: user.name }
        });
      } catch (emailError) {
        logger.warn('Failed to send password reset confirmation email:', emailError);
      }

      return { message: 'Password reset successfully' };
    } catch (error) {
      logger.error('Error resetting password:', error);
      throw error;
    }
  }

  // Search Users
  static async searchUsers(searchParams, requestingUserId = null) {
    try {
      const { query, location, skills, experience, page = 1, limit = 20 } = searchParams;
      
      const users = await User.search({
        query,
        location,
        skills,
        experience,
        page,
        limit
      });

      // Filter sensitive information based on requesting user
      if (requestingUserId) {
        users.forEach(user => {
          if (!UserService.canViewFullProfile(user.id, requestingUserId)) {
            user = UserService.getLimitedProfile(user);
          }
        });
      }

      return users;
    } catch (error) {
      logger.error('Error searching users:', error);
      throw error;
    }
  }

  // Get User Recommendations
  static async getUserRecommendations(userId, options = {}) {
    try {
      const { page = 1, limit = 20 } = options;

      // Get user's connections
      const connections = await Connection.getAcceptedConnections(userId);
      const connectionIds = connections.map(c => c.other_user_id);

      // Get user's interests and skills
      const user = await User.findById(userId);
      const userInterests = user.interests ? user.interests.split(',') : [];
      const userSkills = user.skills ? user.skills.split(',') : [];

      // Get recommendations based on connections and interests
      const recommendations = await User.getRecommendations({
        userId,
        excludeIds: [userId, ...connectionIds],
        interests: userInterests,
        skills: userSkills,
        page,
        limit
      });

      return recommendations;
    } catch (error) {
      logger.error('Error getting user recommendations:', error);
      throw error;
    }
  }

  // Deactivate Account
  static async deactivateAccount(userId, reason = null) {
    try {
      // Update user status
      await User.update(userId, { status: 0, deactivated_at: new Date() });

      // Store deactivation reason
      if (reason) {
        await Settings.set(userId, 'deactivation_reason', reason, 'string');
      }

      // Send deactivation notification to connections
      try {
        await UserService.notifyAccountDeactivation(userId, reason);
      } catch (notificationError) {
        logger.warn('Failed to send deactivation notification:', notificationError);
      }

      return { message: 'Account deactivated successfully' };
    } catch (error) {
      logger.error('Error deactivating account:', error);
      throw error;
    }
  }

  // Reactivate Account
  static async reactivateAccount(userId) {
    try {
      // Update user status
      await User.update(userId, { status: 1, deactivated_at: null });

      // Clear deactivation reason
      await Settings.delete(userId, 'deactivation_reason');

      // Send reactivation notification
      try {
        const user = await User.findById(userId);
        await sendEmail({
          to: user.email,
          subject: 'Account Reactivated',
          template: 'account_reactivated',
          data: { name: user.name }
        });
      } catch (emailError) {
        logger.warn('Failed to send reactivation email:', emailError);
      }

      return { message: 'Account reactivated successfully' };
    } catch (error) {
      logger.error('Error reactivating account:', error);
      throw error;
    }
  }

  // Get User Statistics
  static async getUserStats(userId) {
    try {
      const [userStats, connectionStats, activityStats] = await Promise.all([
        User.getStats(userId),
        Connection.getStats(userId),
        User.getActivityStats(userId)
      ]);

      return {
        profile: userStats,
        connections: connectionStats,
        activity: activityStats
      };
    } catch (error) {
      logger.error('Error getting user statistics:', error);
      throw error;
    }
  }

  // Helper Methods

  static canViewFullProfile(profileUserId, requestingUserId) {
    if (!requestingUserId) return false;
    if (profileUserId === requestingUserId) return true;
    
    // Check if users are connected
    return Connection.areConnected(profileUserId, requestingUserId);
  }

  static getLimitedProfile(user) {
    const limitedProfile = {
      id: user.id,
      name: user.name,
      headline: user.headline,
      profile_photo: user.profile_photo,
      location: user.location,
      industry: user.industry,
      company: user.company,
      // Don't include: email, phone, address, etc.
    };

    return limitedProfile;
  }

  static async notifyProfileUpdate(userId) {
    try {
      const connections = await Connection.getAcceptedConnections(userId);
      const user = await User.findById(userId);

      const notifications = connections.map(connection => ({
        user_id: connection.other_user_id,
        type: 'profile_update',
        title: 'Profile Updated',
        message: `${user.name} updated their profile`,
        data: { userId, userName: user.name }
      }));

      await Notification.createBulk(notifications);
    } catch (error) {
      logger.error('Error notifying profile update:', error);
      throw error;
    }
  }

  static async notifyAccountDeactivation(userId, reason) {
    try {
      const connections = await Connection.getAcceptedConnections(userId);
      const user = await User.findById(userId);

      const notifications = connections.map(connection => ({
        user_id: connection.other_user_id,
        type: 'account_deactivated',
        title: 'Connection Deactivated',
        message: `${user.name} has deactivated their account`,
        data: { userId, userName: user.name, reason }
      }));

      await Notification.createBulk(notifications);
    } catch (error) {
      logger.error('Error notifying account deactivation:', error);
      throw error;
    }
  }

  // Validation Methods

  static validateRegistrationData(userData) {
    const errors = [];

    if (!userData.name || userData.name.trim().length < 2) {
      errors.push('Name must be at least 2 characters long');
    }

    if (!userData.email || !userData.email.includes('@')) {
      errors.push('Valid email is required');
    }

    if (!userData.password || userData.password.length < 6) {
      errors.push('Password must be at least 6 characters long');
    }

    if (userData.phone && !/^\+?[\d\s\-\(\)]+$/.test(userData.phone)) {
      errors.push('Invalid phone number format');
    }

    return errors;
  }

  static validateProfileUpdateData(updateData) {
    const errors = [];

    if (updateData.name && updateData.name.trim().length < 2) {
      errors.push('Name must be at least 2 characters long');
    }

    if (updateData.email && !updateData.email.includes('@')) {
      errors.push('Valid email is required');
    }

    if (updateData.phone && !/^\+?[\d\s\-\(\)]+$/.test(updateData.phone)) {
      errors.push('Invalid phone number format');
    }

    if (updateData.birth_date) {
      const birthDate = new Date(updateData.birth_date);
      const today = new Date();
      const age = today.getFullYear() - birthDate.getFullYear();
      
      if (age < 13 || age > 120) {
        errors.push('Invalid birth date');
      }
    }

    return errors;
  }

  // User lookup methods
  static async getUserByMobile(mobile) {
    try {
      const user = await User.findByMobile(mobile);
      if (!user) {
        return null;
      }

      // Remove sensitive information
      const { password, ...safeUser } = user;
      return safeUser;
    } catch (error) {
      logger.error('Error getting user by mobile:', error);
      throw error;
    }
  }

  // Generate unique token for user (matching PHP format: md5($mobile.date('YmdHis')))
  static generateUniqueToken(mobile) {
    const now = new Date();
    const timestamp = now.getFullYear().toString() +
                     (now.getMonth() + 1).toString().padStart(2, '0') +
                     now.getDate().toString().padStart(2, '0') +
                     now.getHours().toString().padStart(2, '0') +
                     now.getMinutes().toString().padStart(2, '0') +
                     now.getSeconds().toString().padStart(2, '0');
    
    const str_token = mobile + timestamp;
    const crypto = require('crypto');
    return crypto.createHash('md5').update(str_token).digest('hex');
  }

  static async getUserByQRCode(qrCode) {
    try {
      const user = await User.findByQRCode(qrCode);
      if (!user) {
        return null;
      }

      // Remove sensitive information
      const { password, ...safeUser } = user;
      return safeUser;
    } catch (error) {
      logger.error('Error getting user by QR code:', error);
      throw error;
    }
  }

  // Create new user
  static async createUser(userData) {
    try {
      const user = await User.create(userData);
      return user;
    } catch (error) {
      logger.error('Error creating user:', error);
      throw error;
    }
  }

  // Update user
  static async updateUser(userId, updateData) {
    try {
      const result = await User.updateById(userId, updateData);
      return result;
    } catch (error) {
      logger.error('Error updating user:', error);
      throw error;
    }
  }

  // Get user by ID
  static async getUserById(userId) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        return null;
      }

      // Remove sensitive information
      const { password, ...safeUser } = user;
      return safeUser;
    } catch (error) {
      logger.error('Error getting user by ID:', error);
      throw error;
    }
  }

  /**
   * Generate authentication token for user
   * @param {number} userId - User ID
   * @returns {string} JWT token
   */
  static async generateAuthToken(userId) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Generate JWT token
      const accessToken = generateToken({ userId: user.user_id, email: user.email });
      
      return accessToken;
    } catch (error) {
      logger.error('Error generating auth token:', error);
      throw error;
    }
  }
}

module.exports = UserService;
