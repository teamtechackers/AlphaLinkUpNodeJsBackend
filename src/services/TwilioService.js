'use strict';

const twilio = require('twilio');
const { logger } = require('../utils/logger');

class TwilioService {
  constructor() {
    this.client = null;
    this.verifyServiceSid = null;
    this.initializeTwilio();
  }

  /**
   * Initialize Twilio client with proper error handling
   * @throws {Error} If required Twilio credentials are missing
   */
  initializeTwilio() {
    // Check for required environment variables
    const requiredEnvVars = {
      TWILIO_ACCOUNT_SID: process.env.TWILIO_ACCOUNT_SID,
      TWILIO_AUTH_TOKEN: process.env.TWILIO_AUTH_TOKEN,
      TWILIO_VERIFY_SERVICE_SID: process.env.TWILIO_VERIFY_SERVICE_SID
    };

    // Validate all required credentials are present
    const missingCredentials = Object.entries(requiredEnvVars)
      .filter(([key, value]) => !value)
      .map(([key]) => key);

    if (missingCredentials.length > 0) {
      const errorMessage = `Missing required Twilio credentials: ${missingCredentials.join(', ')}. Please configure all required environment variables.`;
      logger.warn(errorMessage);
      logger.warn('Twilio service will be disabled. Running in simulation mode.');
      this.client = null;
      this.verifyServiceSid = null;
      return;
    }

    // Initialize Twilio client
    try {
      this.client = twilio(requiredEnvVars.TWILIO_ACCOUNT_SID, requiredEnvVars.TWILIO_AUTH_TOKEN);
      this.verifyServiceSid = requiredEnvVars.TWILIO_VERIFY_SERVICE_SID;
      
      logger.info('Twilio client initialized successfully');
      logger.info(`Using verification service: ${this.verifyServiceSid}`);
    } catch (error) {
      const errorMessage = `Failed to initialize Twilio client: ${error.message}`;
      logger.warn(errorMessage);
      logger.warn('Twilio service will be disabled. Running in simulation mode.');
      this.client = null;
      this.verifyServiceSid = null;
    }
  }

  /**
   * Send OTP to mobile number via Twilio Verify
   * @param {string} mobile - Mobile number in international format
   * @returns {Promise<Object>} Verification result with success status and verification SID
   */
  async sendOTP(mobile) {
    try {
      // Ensure Twilio client is initialized
      if (!this.client || !this.verifyServiceSid) {
        throw new Error('Twilio client not properly initialized');
      }

      // Format mobile number for Twilio
      const formattedMobile = this.formatMobileNumber(mobile);
      
      logger.info(`Sending OTP via Twilio to ${formattedMobile}`);
      
      // Send verification code via Twilio Verify
      const verification = await this.client.verify.v2
        .services(this.verifyServiceSid)
        .verifications
        .create({
          to: formattedMobile,
          channel: 'sms'
        });

      logger.info(`OTP sent successfully via Twilio to ${mobile}. Verification SID: ${verification.sid}`);
      
      return {
        success: true,
        verificationSid: verification.sid,
        status: verification.status,
        channel: verification.channel,
        to: formattedMobile
      };
    } catch (error) {
      logger.error('Twilio OTP send error:', error);
      
      // Handle specific Twilio error codes with user-friendly messages
      if (error.code === 60410) {
        return {
          success: false,
          error: 'Your phone number is blocked by our SMS provider due to security reasons. Please contact support.',
          blocked: true,
          code: 60410
        };
      }
      
      if (error.code === 60202) {
        return {
          success: false,
          error: 'Invalid phone number format. Please provide a valid international phone number.',
          code: 60202
        };
      }
      
      if (error.code === 60200) {
        return {
          success: false,
          error: 'Invalid verification service configuration. Please contact support.',
          code: 60200
        };
      }
      
      // Generic error for other cases
      return {
        success: false,
        error: `Failed to send OTP: ${error.message}`,
        code: error.code || 'UNKNOWN_ERROR'
      };
    }
  }

  /**
   * Verify OTP code with Twilio Verify
   * @param {string} mobile - Mobile number in international format
   * @param {string} otp - The OTP code entered by user
   * @param {string} verificationSid - Verification SID from sendOTP response
   * @returns {Promise<Object>} Verification result with success status
   */
  async verifyOTP(mobile, otp, verificationSid) {
    try {
      // Ensure Twilio client is initialized
      if (!this.client || !this.verifyServiceSid) {
        throw new Error('Twilio client not properly initialized');
      }

      // Validate input parameters
      if (!otp || !verificationSid) {
        throw new Error('OTP code and verification SID are required');
      }

      // Format mobile number for Twilio
      const formattedMobile = this.formatMobileNumber(mobile);
      
      logger.info(`Verifying OTP for ${formattedMobile} with code: ${otp}`);
      
      // Verify the code with Twilio Verify using configured serviceId.
      // Some SDKs accept either VE... verificationSid or only serviceId+to+code.
      // We standardize on serviceId + to + code to avoid 20404 for old VE IDs.
      const serviceId = this.verifyServiceSid;
      logger.info(`Using service ID: ${serviceId} for verification`);

      const payload = { to: formattedMobile, code: otp };
      // If verificationSid provided, include it for completeness (Twilio ignores it in this call)
      if (verificationSid) {
        payload.verificationSid = verificationSid;
      }

      const verificationCheck = await this.client.verify.v2
        .services(serviceId)
        .verificationChecks
        .create(payload);

      const isSuccess = verificationCheck.status === 'approved';
      
      if (isSuccess) {
        logger.info(`OTP verification successful for ${mobile}`);
      } else {
        logger.warn(`OTP verification failed for ${mobile}. Status: ${verificationCheck.status}`);
      }
      
      return {
        success: isSuccess,
        status: verificationCheck.status,
        message: isSuccess ? 'OTP verified successfully' : 'Invalid OTP code',
        verificationSid: verificationCheck.sid
      };
    } catch (error) {
      logger.error('Twilio OTP verification error:', error);
      
      // Handle specific Twilio error codes
      if (error.code === 20404) {
        return {
          success: false,
          error: 'Verification service not found. Please try sending a new OTP.',
          code: 20404
        };
      }
      
      if (error.code === 60202) {
        return {
          success: false,
          error: 'Invalid phone number format.',
          code: 60202
        };
      }
      
      if (error.code === 60200) {
        return {
          success: false,
          error: 'Invalid verification service configuration. Please contact support.',
          code: 60200
        };
      }
      
      // Generic error for other cases
      return {
        success: false,
        error: `OTP verification failed: ${error.message}`,
        code: error.code || 'UNKNOWN_ERROR'
      };
    }
  }

  /**
   * Send SMS message (for other notifications)
   * @param {string} to - Recipient phone number
   * @param {string} message - SMS message content
   * @returns {Promise<Object>} SMS send result
   */
  async sendSMS(to, message) {
    try {
      if (!this.client) {
        throw new Error('Twilio client not initialized');
      }

      if (!process.env.TWILIO_PHONE_NUMBER) {
        throw new Error('TWILIO_PHONE_NUMBER environment variable not configured');
      }

      const formattedMobile = this.formatMobileNumber(to);
      
      const sms = await this.client.messages.create({
        body: message,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: formattedMobile
      });

      logger.info(`SMS sent successfully via Twilio to ${to}. Message SID: ${sms.sid}`);
      
      return {
        success: true,
        messageSid: sms.sid,
        status: sms.status,
        to: formattedMobile
      };
    } catch (error) {
      logger.error('Twilio SMS send error:', error);
      return {
        success: false,
        error: `Failed to send SMS: ${error.message}`,
        code: error.code || 'UNKNOWN_ERROR'
      };
    }
  }

  /**
   * Format mobile number for Twilio API
   * @param {string} mobile - Raw mobile number
   * @returns {string} Formatted mobile number
   */
  formatMobileNumber(mobile) {
    if (!mobile) {
      throw new Error('Mobile number is required');
    }

    // Remove any non-digit characters except +
    let formatted = mobile.replace(/[^\d+]/g, '').trim();
    
    // Ensure it starts with +
    if (!formatted.startsWith('+')) {
      // For Pakistani numbers starting with 92, add +92
      if (formatted.startsWith('92')) {
        formatted = `+${formatted}`;
      } else {
        // Add country code if not present (default to +1 for US)
        const countryCode = process.env.DEFAULT_COUNTRY_CODE || '1';
        formatted = `+${countryCode}${formatted}`;
      }
    }
    
    // Validate the format
    if (!/^\+\d{10,15}$/.test(formatted)) {
      throw new Error('Invalid mobile number format. Please provide a valid international phone number.');
    }
    
    return formatted;
  }

  /**
   * Get service status and configuration
   * @returns {Object} Service status information
   */
  getServiceStatus() {
    return {
      configured: !!(this.client && this.verifyServiceSid),
      verifyServiceSid: this.verifyServiceSid,
      accountSid: process.env.TWILIO_ACCOUNT_SID ? 'configured' : 'missing',
      authToken: process.env.TWILIO_AUTH_TOKEN ? 'configured' : 'missing',
      phoneNumber: process.env.TWILIO_PHONE_NUMBER ? 'configured' : 'missing'
    };
  }

  /**
   * Test Twilio connectivity
   * @returns {Promise<Object>} Connectivity test result
   */
  async testConnectivity() {
    try {
      if (!this.client) {
        throw new Error('Twilio client not initialized');
      }

      // Try to fetch account information to test connectivity
      const account = await this.client.api.accounts(process.env.TWILIO_ACCOUNT_SID).fetch();
      
      return {
        success: true,
        message: 'Twilio connectivity test successful',
        accountSid: account.sid,
        accountStatus: account.status
      };
    } catch (error) {
      logger.error('Twilio connectivity test failed:', error);
      return {
        success: false,
        error: `Connectivity test failed: ${error.message}`,
        code: error.code || 'UNKNOWN_ERROR'
      };
    }
  }
}

// Create and export singleton instance
const twilioService = new TwilioService();

module.exports = twilioService;
