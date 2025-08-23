'use strict';

const UserService = require('../services/UserService');
const TwilioService = require('../services/TwilioService');
const QRCodeService = require('../services/QRCodeService');
const { logger } = require('../utils/logger');
const { successResponse, errorResponse, phpResponse } = require('../utils/response');
const { idEncode, idDecode } = require('../utils/idCodec');

class AuthController {
  /**
   * Send OTP to mobile number
   */
  static async sendOtp(req, res) {
    try {
      const { mobile } = req.body;
      
      if (!mobile) {
        return errorResponse(res, 'Mobile number is required', 400);
      }

      // Check if user already exists
      const existingUser = await UserService.getUserByMobile(mobile);
      
      if (!existingUser) {
        // New user - create account and send OTP
        const uniqueToken = await UserService.generateUniqueToken(mobile);
        const qrImage = await QRCodeService.generateQRCode(uniqueToken);
        
        // Send OTP via Twilio
        const verificationResult = await TwilioService.sendOTP(mobile);
        
        if (!verificationResult.success) {
          // Handle specific Twilio errors
          if (verificationResult.blocked) {
            return errorResponse(res, verificationResult.error, 403);
          }
          
          if (verificationResult.code === 60202) {
            return errorResponse(res, verificationResult.error, 400);
          }
          
          if (verificationResult.code === 60200) {
            return errorResponse(res, verificationResult.error, 500);
          }
          
          return errorResponse(res, verificationResult.error, 500);
        }

        // Create new user
        const userData = {
          mobile,
          unique_token: uniqueToken,
          verificationSid: verificationResult.verificationSid,
          qr_image: qrImage.filepath, // Extract just the filepath
          otp_sent_dts: new Date(),
          created_dts: new Date()
        };

        const newUserId = await UserService.createUser(userData);
        
        logger.info(`OTP sent to new user: ${mobile}`);
        return phpResponse(res, 'OTP sent successfully', {
          user_id: idEncode(newUserId),
          unique_token: uniqueToken,
          verificationSid: verificationResult.verificationSid
        });
      } else {
        // Existing user - check OTP cooldown
        const lastOtpSent = existingUser.otp_sent_dts;
        const currentTime = new Date();
        const timeDifference = (currentTime - lastOtpSent) / 1000; // in seconds
        
        // Check if 60 seconds have passed (PHP backend uses 60 seconds)
        if (timeDifference < 60) {
          return errorResponse(res, 'OTP already sent within the last 1 minute', 400);
        }

        // Resend OTP
        const verificationResult = await TwilioService.sendOTP(mobile);
        
        if (!verificationResult.success) {
          // Handle specific Twilio errors
          if (verificationResult.blocked) {
            return errorResponse(res, verificationResult.error, 403);
          }
          
          if (verificationResult.code === 60202) {
            return errorResponse(res, verificationResult.error, 400);
          }
          
          if (verificationResult.code === 60200) {
            return errorResponse(res, verificationResult.error, 500);
          }
          
          return errorResponse(res, verificationResult.error, 500);
        }

        // Update user with new verification SID and timestamp
        const updateData = {
          verificationSid: verificationResult.verificationSid,
          otp_sent_dts: currentTime
        };

        // Generate new QR code if not exists
        if (!existingUser.qr_image) {
          const qrImage = await QRCodeService.generateQRCode(existingUser.unique_token);
          updateData.qr_image = qrImage.filepath; // Extract just the filepath
        }

        await UserService.updateUser(existingUser.user_id, updateData);
        
        logger.info(`OTP resent to existing user: ${mobile}`);
        return phpResponse(res, 'OTP sent successfully', {
          user_id: idEncode(existingUser.user_id),
          unique_token: existingUser.unique_token,
          verificationSid: verificationResult.verificationSid
        });
      }
    } catch (error) {
      logger.error('Send OTP error:', error);
      
      // Handle Twilio initialization errors
      if (error.message.includes('Missing required Twilio credentials')) {
        return errorResponse(res, 'SMS service is not properly configured. Please contact support.', 500);
      }
      
      if (error.message.includes('Twilio client not properly initialized')) {
        return errorResponse(res, 'SMS service initialization failed. Please contact support.', 500);
      }
      
      return errorResponse(res, 'Failed to send OTP. Please try again later.', 500);
    }
  }

  /**
   * Verify OTP and authenticate user
   */
  static async verifyOtp(req, res) {
    try {
      const { user_id, mobile, otp, verificationSid, token } = req.body;
      
      if (!user_id || !mobile || !otp || !verificationSid || !token) {
        return errorResponse(res, 'All fields are required', 400);
      }

      // Decode user ID
      const decodedUserId = idDecode(user_id);
      if (!decodedUserId) {
        return errorResponse(res, 'Invalid user ID', 400);
      }

      // Get user details
      const user = await UserService.getUserById(decodedUserId);
      if (!user) {
        return errorResponse(res, 'User not found', 404);
      }

      // Validate unique token
      if (user.unique_token !== token) {
        return errorResponse(res, 'Invalid token', 400);
      }

      // Verify OTP with Twilio
      const verificationResult = await TwilioService.verifyOTP(mobile, otp, verificationSid);
      
      if (!verificationResult.success) {
        // Handle specific Twilio verification errors
        if (verificationResult.code === 20404) {
          return errorResponse(res, 'Verification session expired. Please request a new OTP.', 400);
        }
        
        if (verificationResult.code === 60202) {
          return errorResponse(res, 'Invalid phone number format.', 400);
        }
        
        if (verificationResult.code === 60200) {
          return errorResponse(res, 'Verification service error. Please contact support.', 500);
        }
        
        // For invalid OTP codes, return a generic message for security
        return errorResponse(res, 'Invalid OTP code. Please check and try again.', 400);
      }

      // Update user verification status
      const updateData = {
        otp_verified_dts: new Date(),
        status: 1
      };

      await UserService.updateUser(decodedUserId, updateData);

      // Generate JWT token
      const jwtToken = await UserService.generateAuthToken(decodedUserId);
      
      logger.info(`OTP verified successfully for user: ${mobile}`);
      return phpResponse(res, 'OTP verified successfully', {
        user_id: idEncode(decodedUserId),
        unique_token: token,
        profile_updated: user.profile_updated || false,
        country_id: user.country_id,
        jwtToken
      });
    } catch (error) {
      logger.error('Verify OTP error:', error.message, error.stack);
      
      // Handle Twilio initialization errors
      if (error.message.includes('Missing required Twilio credentials')) {
        return errorResponse(res, 'SMS service is not properly configured. Please contact support.', 500);
      }
      
      if (error.message.includes('Twilio client not properly initialized')) {
        return errorResponse(res, 'SMS service initialization failed. Please contact support.', 500);
      }
      
      return errorResponse(res, 'Failed to verify OTP. Please try again later.', 500);
    }
  }

  /**
   * Logout user
   */
  static async logout(req, res) {
    try {
      const userId = req.user.id;
      
      // Invalidate token (add to blacklist or update user)
      await UserService.invalidateToken(userId);
      
      logger.info(`User logged out: ${userId}`);
      return successResponse(res, 'Logged out successfully');
    } catch (error) {
      logger.error('Logout error:', error);
      return errorResponse(res, 'Failed to logout', 500);
    }
  }

  /**
   * Get user profile by mobile number
   */
  static async getUserByMobile(req, res) {
    try {
      const { mobile } = req.params;
      
      if (!mobile) {
        return errorResponse(res, 'Mobile number is required', 400);
      }

      const user = await UserService.getUserByMobile(mobile);
      
      if (!user) {
        return errorResponse(res, 'User not found', 404);
      }

      // Return public profile information
      const profile = {
        user_id: idEncode(user.id),
        name: user.name,
        email: user.email,
        mobile: user.mobile,
        profile_photo: user.profile_photo,
        country_id: user.country_id,
        status: user.status,
        profile_updated: user.profile_updated
      };

      return successResponse(res, 'User profile retrieved successfully', { profile });
    } catch (error) {
      logger.error('Get user by mobile error:', error);
      return errorResponse(res, 'Failed to retrieve user profile', 500);
    }
  }

  /**
   * Get user profile by QR code
   */
  static async getUserByQRCode(req, res) {
    try {
      const { qr_code } = req.params;
      
      if (!qr_code) {
        return errorResponse(res, 'QR code is required', 400);
      }

      const user = await UserService.getUserByQRCode(qr_code);
      
      if (!user) {
        return errorResponse(res, 'User not found', 404);
      }

      // Return public profile information
      const profile = {
        user_id: idEncode(user.id),
        name: user.name,
        email: user.email,
        mobile: user.mobile,
        profile_photo: user.profile_photo,
        country_id: user.country_id,
        status: user.status,
        profile_updated: user.profile_updated
      };

      return successResponse(res, 'User profile retrieved successfully', { profile });
    } catch (error) {
      logger.error('Get user by QR code error:', error);
      return errorResponse(res, 'Failed to retrieve user profile', 500);
    }
  }

  /**
   * Check user authentication status
   */
  static async checkAuthStatus(req, res) {
    try {
      const userId = req.user.id;
      
      const user = await UserService.getUserById(userId);
      
      if (!user) {
        return errorResponse(res, 'User not found', 404);
      }

      const authStatus = {
        is_authenticated: true,
        user_id: idEncode(user.id),
        status: user.status,
        profile_updated: user.profile_updated,
        otp_verified: user.otp_verified
      };

      return successResponse(res, 'Authentication status checked successfully', { authStatus });
    } catch (error) {
      logger.error('Check auth status error:', error);
      return errorResponse(res, 'Failed to check authentication status', 500);
    }
  }
}

module.exports = AuthController;
