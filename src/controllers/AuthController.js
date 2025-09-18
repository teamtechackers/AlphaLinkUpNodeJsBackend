'use strict';

const UserService = require('../services/UserService');
const TwilioService = require('../services/TwilioService');
const QRCodeService = require('../services/QRCodeService');
const { logger } = require('../utils/logger');
const { successResponse, errorResponse, phpResponse } = require('../utils/response');
const { idEncode, idDecode } = require('../utils/idCodec');

class AuthController {
 
  static async sendOtp(req, res) {
    try {

      console.log('Request body:', req.body);
      console.log('Content-Type:', req.get('Content-Type'));
      
      let mobile = req.body.mobile;
      
      if (!mobile && req.files && req.files.mobile) {
        mobile = req.files.mobile;
      }
      
      if (!mobile && req.body && typeof req.body === 'object') {
        mobile = req.body.mobile || req.body['mobile'] || req.body.MOBILE;
      }
      
      if (!mobile) {
        console.log('Mobile not found in request body');
        console.log('Available body keys:', Object.keys(req.body));
        return errorResponse(res, 'Mobile number is required', 400);
      }
      
      console.log('Mobile number received:', mobile);

      const existingUser = await UserService.getUserByMobile(mobile);
      
      if (!existingUser) {
        const uniqueToken = await UserService.generateUniqueToken(mobile);
        const qrImage = await QRCodeService.generateQRCode(uniqueToken);
        
        const verificationResult = await TwilioService.sendOTP(mobile);
        
        if (!verificationResult.success) {
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
        const lastOtpSent = existingUser.otp_sent_dts;
        const currentTime = new Date();
        const timeDifference = (currentTime - lastOtpSent) / 1000; // in seconds
        
        if (timeDifference < 60) {
          return errorResponse(res, 'OTP already sent within the last 1 minute', 400);
        }

        const verificationResult = await TwilioService.sendOTP(mobile);
        
        if (!verificationResult.success) {
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

        const updateData = {
          verificationSid: verificationResult.verificationSid,
          otp_sent_dts: currentTime
        };

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
      
      if (error.message.includes('Missing required Twilio credentials')) {
        return errorResponse(res, 'SMS service is not properly configured. Please contact support.', 500);
      }
      
      if (error.message.includes('Twilio client not properly initialized')) {
        return errorResponse(res, 'SMS service initialization failed. Please contact support.', 500);
      }
      
      return errorResponse(res, 'Failed to send OTP. Please try again later.', 500);
    }
  }

 
  static async verifyOtp(req, res) {
    try {
      console.log('Verify OTP - Request body:', req.body);
      console.log('Verify OTP - Content-Type:', req.get('Content-Type'));
      
      const { user_id, mobile, otp, verificationSid, token } = req.body;
      
      const otpValue = otp || req.body.OTP || req.body.otp_code || req.body.otpCode;
      const mobileValue = mobile || req.body.MOBILE || req.body.phone;
      const userIdValue = user_id || req.body.USER_ID || req.body.userId;
      const verificationSidValue = verificationSid || req.body.VERIFICATION_SID || req.body.verificationSid;
      const tokenValue = token || req.body.TOKEN;
      
      console.log('Verify OTP - user_id:', userIdValue);
      console.log('Verify OTP - mobile:', mobileValue);
      console.log('Verify OTP - otp:', otpValue);
      console.log('Verify OTP - verificationSid:', verificationSidValue);
      console.log('Verify OTP - token:', tokenValue);
      
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
      if (!verificationSidValue) {
        console.log('Verify OTP - verificationSid not provided; proceeding with serviceId only');
      }
      if (!tokenValue) {
        console.log('Verify OTP - Missing token');
        return errorResponse(res, 'token is required', 400);
      }

      const decodedUserId = idDecode(userIdValue);
      if (!decodedUserId) {
        return errorResponse(res, 'Invalid user ID', 400);
      }

      const user = await UserService.getUserById(decodedUserId);
      if (!user) {
        return errorResponse(res, 'User not found', 404);
      }

      if (user.unique_token !== tokenValue) {
        return errorResponse(res, 'Invalid token', 400);
      }

      const verificationResult = await TwilioService.verifyOTP(mobileValue, otpValue, verificationSidValue);
      
      if (!verificationResult.success) {
        if (verificationResult.code === 20404) {
          return errorResponse(res, 'Verification session expired. Please request a new OTP.', 400);
        }
          
        if (verificationResult.code === 60202) {
          return errorResponse(res, 'Invalid phone number format.', 400);
        }
          
        if (verificationResult.code === 60200) {
          return errorResponse(res, 'Verification service error. Please contact support.', 500);
        }
          
        return errorResponse(res, 'Invalid OTP code. Please check and try again.', 400);
      }

      const fcm_token = req.body.fcm_token || req.body.fcmToken;
      
      // Debug FCM token
      console.log('Verify OTP - FCM token received:', fcm_token);
      console.log('Verify OTP - FCM token type:', typeof fcm_token);
      console.log('Verify OTP - FCM token length:', fcm_token ? fcm_token.length : 'null/undefined');
      
      // FCM token is required
      if (!fcm_token) {
        console.log('Verify OTP - Missing FCM token');
        return errorResponse(res, 'FCM token is required for verification', 400);
      }
      
      const updateData = {
        otp_verified_dts: new Date(),
        status: 1,
        fcm_token: fcm_token
      };
      
      console.log('Verify OTP - FCM token added to updateData');

      await UserService.updateUser(decodedUserId, updateData);
      
      try {
        const NotificationService = require('../notification/NotificationService');
        await Promise.all([
          NotificationService.subscribeToTopic(decodedUserId, 'job-notifications'),
          NotificationService.subscribeToTopic(decodedUserId, 'event-notifications'),
          NotificationService.subscribeToTopic(decodedUserId, 'general-notifications')
        ]);
        console.log('User subscribed to notification topics:', decodedUserId);
      } catch (topicError) {
        console.error('Topic subscription error:', topicError);
      }
      
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
      
      if (error.message.includes('Missing required Twilio credentials')) {
        return errorResponse(res, 'SMS service is not properly configured. Please contact support.', 500);
      }
      
      if (error.message.includes('Twilio client not properly initialized')) {
        return errorResponse(res, 'SMS service initialization failed. Please contact support.', 500);
      }
      
      return errorResponse(res, 'Failed to verify OTP. Please try again later.', 500);
    }
  }

 
  static async logout(req, res) {
    try {
      const userId = req.user.id;
      
      try {
        const NotificationService = require('../notification/NotificationService');
        await Promise.all([
          NotificationService.unsubscribeFromTopic(userId, 'job-notifications'),
          NotificationService.unsubscribeFromTopic(userId, 'event-notifications'),
          NotificationService.unsubscribeFromTopic(userId, 'general-notifications')
        ]);
        console.log('User unsubscribed from notification topics:', userId);
      } catch (topicError) {
        console.error('Topic unsubscription error:', topicError);
      }
      
   
      const updateData = {
        fcm_token: null
      };
      await UserService.updateUser(userId, updateData);
      
      await UserService.invalidateToken(userId);
      
      logger.info(`User logged out: ${userId}`);
      return successResponse(res, 'Logged out successfully');
    } catch (error) {
      logger.error('Logout error:', error);
      return errorResponse(res, 'Failed to logout', 500);
    }
  }

 
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
