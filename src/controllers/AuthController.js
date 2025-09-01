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
      // Debug logging
      console.log('Request body:', req.body);
      console.log('Content-Type:', req.get('Content-Type'));
      
      // Get mobile from request body - handle different content types
      let mobile = req.body.mobile;
      
      // Handle multipart form data
      if (!mobile && req.files && req.files.mobile) {
        mobile = req.files.mobile;
      }
      
      // Handle form data that might be in different format
      if (!mobile && req.body && typeof req.body === 'object') {
        // Try different possible keys
        mobile = req.body.mobile || req.body['mobile'] || req.body.MOBILE;
      }
      
      if (!mobile) {
        console.log('Mobile not found in request body');
        console.log('Available body keys:', Object.keys(req.body));
        return errorResponse(res, 'Mobile number is required', 400);
      }
      
      console.log('Mobile number received:', mobile);

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
      // Debug logging
      console.log('Verify OTP - Request body:', req.body);
      console.log('Verify OTP - Content-Type:', req.get('Content-Type'));
      
      // Get form data from request body - check for case variations
      const { user_id, mobile, otp, verificationSid, token } = req.body;
      
      // Also check for alternative field names
      const otpValue = otp || req.body.OTP || req.body.otp_code || req.body.otpCode;
      const mobileValue = mobile || req.body.MOBILE || req.body.phone;
      const userIdValue = user_id || req.body.USER_ID || req.body.userId;
      const verificationSidValue = verificationSid || req.body.VERIFICATION_SID || req.body.verificationSid;
      const tokenValue = token || req.body.TOKEN;
      
      // Debug: Log each field
      console.log('Verify OTP - user_id:', userIdValue);
      console.log('Verify OTP - mobile:', mobileValue);
      console.log('Verify OTP - otp:', otpValue);
      console.log('Verify OTP - verificationSid:', verificationSidValue);
      console.log('Verify OTP - token:', tokenValue);
      
      // Check each field individually for better error reporting
      if (!userIdValue) {
        console.log('Verify OTP - Missing user_id');
        return errorResponse(res, 'user_id is required', 400);
      }
      if (!mobileValue) {
        console.log('Verify OTP - Missing mobile');
        return errorResponse(res, 'mobile is required', 400);
      }
      if (!otpValue || otpValue === undefined || otpValue === null || String(otpValue).trim() === '') {
        console.log('Verify OTP - Missing or empty OTP');
        console.log('Available body keys:', Object.keys(req.body));
        console.log('Raw OTP value:', otpValue);
        console.log('OTP type:', typeof otpValue);
        console.log('Full request body:', JSON.stringify(req.body, null, 2));
        return errorResponse(res, 'OTP code is required. Please enter the 6-digit code you received via SMS.', 400);
      }
      // verificationSid is optional (we use serviceId + mobile to verify)
      if (!verificationSidValue) {
        console.log('Verify OTP - verificationSid not provided; proceeding with serviceId only');
      }
      if (!tokenValue) {
        console.log('Verify OTP - Missing token');
        return errorResponse(res, 'token is required', 400);
      }

      // Decode user ID
      const decodedUserId = idDecode(userIdValue);
      if (!decodedUserId) {
        return errorResponse(res, 'Invalid user ID', 400);
      }

      // Get user details
      const user = await UserService.getUserById(decodedUserId);
      if (!user) {
        return errorResponse(res, 'User not found', 404);
      }

      // Validate unique token
      if (user.unique_token !== tokenValue) {
        return errorResponse(res, 'Invalid token', 400);
      }

      // Verify OTP with Twilio
      const verificationResult = await TwilioService.verifyOTP(mobileValue, otpValue, verificationSidValue);
      
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
      
      logger.info(`OTP verified successfully for user: ${mobile}`);
      return phpResponse(res, 'OTP verified successfully', {
        user_id: idEncode(decodedUserId),
        unique_token: tokenValue,
        profile_updated: user.profile_updated ? "1" : "0",
        country_id: (user.country_id !== null && user.country_id !== undefined) ? String(user.country_id) : "",
        country_name: user.country_name || ""
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
