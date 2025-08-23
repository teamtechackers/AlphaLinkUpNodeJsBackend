'use strict';

const BusinessCard = require('../models/BusinessCard');
const User = require('../models/User');
const EmailService = require('./EmailService');
const { logger } = require('../utils/logger');

class BusinessCardService {
  /**
   * Activate business card for user
   */
  static async activateCard(userId, cardData) {
    try {
      // Check if user exists
      const user = await User.getUserById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Check if business card already exists and is active
      const existingCard = await BusinessCard.getBusinessCardByUserId(userId);
      if (existingCard && existingCard.status === 'active') {
        throw new Error('Business card is already activated');
      }

      // Prepare card data
      const cardInfo = {
        user_id: userId,
        name: cardData.name,
        company: cardData.company || null,
        designation: cardData.designation || null,
        mobile: cardData.mobile,
        email: cardData.email || null,
        website: cardData.website || null,
        address: cardData.address || null,
        profile_photo: cardData.profile_photo || null,
        status: 'active',
        activated_at: new Date(),
        created_at: new Date(),
        updated_at: new Date()
      };

      let businessCard;
      
      if (existingCard) {
        // Update existing card
        businessCard = await BusinessCard.updateCard(existingCard.id, cardInfo);
      } else {
        // Create new card
        businessCard = await BusinessCard.createCard(cardInfo);
      }

      // Update user profile if card data is more complete
      if (cardData.name && (!user.name || user.name !== cardData.name)) {
        await User.updateUser(userId, { name: cardData.name });
      }

      logger.info(`Business card activated for user ${userId}`);
      return businessCard;
    } catch (error) {
      logger.error('Activate card error:', error);
      throw error;
    }
  }

  /**
   * Get business card by user ID
   */
  static async getBusinessCard(userId) {
    try {
      return await BusinessCard.getBusinessCardByUserId(userId);
    } catch (error) {
      logger.error('Get business card error:', error);
      throw error;
    }
  }

  /**
   * Update business card
   */
  static async updateBusinessCard(userId, updateData) {
    try {
      const businessCard = await BusinessCard.getBusinessCardByUserId(userId);
      if (!businessCard) {
        throw new Error('Business card not found');
      }

      // Update card
      const updatedCard = await BusinessCard.updateCard(businessCard.id, {
        ...updateData,
        updated_at: new Date()
      });

      logger.info(`Business card updated for user ${userId}`);
      return updatedCard;
    } catch (error) {
      logger.error('Update business card error:', error);
      throw error;
    }
  }

  /**
   * Update specific card fields
   */
  static async updateCard(cardId, updateData) {
    try {
      return await BusinessCard.updateCard(cardId, {
        ...updateData,
        updated_at: new Date()
      });
    } catch (error) {
      logger.error('Update card error:', error);
      throw error;
    }
  }

  /**
   * Deactivate business card
   */
  static async deactivateCard(userId) {
    try {
      const businessCard = await BusinessCard.getBusinessCardByUserId(userId);
      if (!businessCard) {
        throw new Error('Business card not found');
      }

      const deactivatedCard = await BusinessCard.updateCard(businessCard.id, {
        status: 'inactive',
        deactivated_at: new Date(),
        updated_at: new Date()
      });

      logger.info(`Business card deactivated for user ${userId}`);
      return deactivatedCard;
    } catch (error) {
      logger.error('Deactivate card error:', error);
      throw error;
    }
  }

  /**
   * Get business card by QR code
   */
  static async getBusinessCardByQR(qrCode) {
    try {
      return await BusinessCard.getBusinessCardByQR(qrCode);
    } catch (error) {
      logger.error('Get business card by QR error:', error);
      throw error;
    }
  }

  /**
   * Get business card statistics
   */
  static async getBusinessCardStats(userId) {
    try {
      const stats = await BusinessCard.getBusinessCardStats(userId);
      
      return {
        total_views: stats.total_views || 0,
        total_shares: stats.total_shares || 0,
        total_downloads: stats.total_downloads || 0,
        last_viewed: stats.last_viewed,
        last_shared: stats.last_shared,
        qr_scans: stats.qr_scans || 0,
        profile_completion: stats.profile_completion || 0
      };
    } catch (error) {
      logger.error('Get business card stats error:', error);
      throw error;
    }
  }

  /**
   * Share business card
   */
  static async shareBusinessCard(userId, shareData) {
    try {
      const businessCard = await BusinessCard.getBusinessCardByUserId(userId);
      if (!businessCard) {
        throw new Error('Business card not found');
      }

      const { share_type, recipient_email, message } = shareData;
      
      // Validate share type
      const validShareTypes = ['email', 'sms', 'whatsapp', 'link'];
      if (!validShareTypes.includes(share_type)) {
        throw new Error('Invalid share type');
      }

      // Record share activity
      await BusinessCard.recordShare(businessCard.id, {
        share_type,
        recipient_email,
        message,
        shared_at: new Date()
      });

      let shareResult = { success: true, share_type };

      // Handle different share types
      switch (share_type) {
        case 'email':
          if (recipient_email) {
            shareResult = await this.shareViaEmail(businessCard, recipient_email, message);
          }
          break;
        
        case 'sms':
          if (businessCard.mobile) {
            shareResult = await this.shareViaSMS(businessCard, message);
          }
          break;
        
        case 'whatsapp':
          shareResult = await this.shareViaWhatsApp(businessCard, message);
          break;
        
        case 'link':
          shareResult = await this.generateShareLink(businessCard);
          break;
      }

      logger.info(`Business card shared for user ${userId} via ${share_type}`);
      return shareResult;
    } catch (error) {
      logger.error('Share business card error:', error);
      throw error;
    }
  }

  /**
   * Share business card via email
   */
  static async shareViaEmail(businessCard, recipientEmail, message) {
    try {
      const emailData = {
        to: recipientEmail,
        subject: `${businessCard.name} - Business Card`,
        template: 'business_card_share',
        data: {
          businessCard,
          message: message || `Check out ${businessCard.name}'s business card`,
          shareUrl: `${process.env.FRONTEND_URL}/card/${businessCard.id}`,
          qrCode: businessCard.qr_url
        }
      };

      const emailResult = await EmailService.sendEmail(emailData);
      
      return {
        success: emailResult.success,
        share_type: 'email',
        recipient_email: recipientEmail,
        email_sent: emailResult.success
      };
    } catch (error) {
      logger.error('Share via email error:', error);
      return {
        success: false,
        share_type: 'email',
        error: error.message
      };
    }
  }

  /**
   * Share business card via SMS
   */
  static async shareViaSMS(businessCard, message) {
    try {
      // This would integrate with SMS service (Twilio, etc.)
      const smsMessage = message || `Check out ${businessCard.name}'s business card: ${process.env.FRONTEND_URL}/card/${businessCard.id}`;
      
      // Placeholder for SMS integration
      logger.info(`SMS share prepared for ${businessCard.mobile}: ${smsMessage}`);
      
      return {
        success: true,
        share_type: 'sms',
        recipient_mobile: businessCard.mobile,
        message: smsMessage
      };
    } catch (error) {
      logger.error('Share via SMS error:', error);
      return {
        success: false,
        share_type: 'sms',
        error: error.message
      };
    }
  }

  /**
   * Share business card via WhatsApp
   */
  static async shareViaWhatsApp(businessCard, message) {
    try {
      const whatsappMessage = message || `Check out ${businessCard.name}'s business card: ${process.env.FRONTEND_URL}/card/${businessCard.id}`;
      const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(whatsappMessage)}`;
      
      return {
        success: true,
        share_type: 'whatsapp',
        whatsapp_url: whatsappUrl,
        message: whatsappMessage
      };
    } catch (error) {
      logger.error('Share via WhatsApp error:', error);
      return {
        success: false,
        share_type: 'whatsapp',
        error: error.message
      };
    }
  }

  /**
   * Generate share link
   */
  static async generateShareLink(businessCard) {
    try {
      const shareUrl = `${process.env.FRONTEND_URL}/card/${businessCard.id}`;
      
      return {
        success: true,
        share_type: 'link',
        share_url: shareUrl,
        qr_code: businessCard.qr_url
      };
    } catch (error) {
      logger.error('Generate share link error:', error);
      return {
        success: false,
        share_type: 'link',
        error: error.message
      };
    }
  }

  /**
   * Export business card data
   */
  static async exportBusinessCard(userId, format = 'json') {
    try {
      const businessCard = await BusinessCard.getBusinessCardByUserId(userId);
      if (!businessCard) {
        throw new Error('Business card not found');
      }

      if (format === 'json') {
        return businessCard;
      } else if (format === 'csv') {
        return this.convertToCSV(businessCard);
      } else {
        throw new Error('Unsupported export format');
      }
    } catch (error) {
      logger.error('Export business card error:', error);
      throw error;
    }
  }

  /**
   * Convert business card to CSV
   */
  static convertToCSV(businessCard) {
    const headers = [
      'Name',
      'Company',
      'Designation',
      'Mobile',
      'Email',
      'Website',
      'Address',
      'Status',
      'Activated At'
    ];

    const values = [
      businessCard.name || '',
      businessCard.company || '',
      businessCard.designation || '',
      businessCard.mobile || '',
      businessCard.email || '',
      businessCard.website || '',
      businessCard.address || '',
      businessCard.status || '',
      businessCard.activated_at || ''
    ];

    return [headers.join(','), values.join(',')].join('\n');
  }

  /**
   * Get business card analytics
   */
  static async getBusinessCardAnalytics(userId, options = {}) {
    try {
      const { startDate, endDate, groupBy = 'day' } = options;
      
      const analytics = await BusinessCard.getBusinessCardAnalytics(userId, {
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        groupBy
      });

      return analytics;
    } catch (error) {
      logger.error('Get business card analytics error:', error);
      throw error;
    }
  }

  /**
   * Record business card view
   */
  static async recordView(cardId, viewerData = {}) {
    try {
      await BusinessCard.recordView(cardId, {
        viewer_ip: viewerData.ip,
        viewer_user_agent: viewerData.userAgent,
        viewed_at: new Date()
      });

      logger.debug(`Business card view recorded for card ${cardId}`);
    } catch (error) {
      logger.error('Record view error:', error);
      // Don't throw error for analytics recording
    }
  }

  /**
   * Get popular business cards
   */
  static async getPopularBusinessCards(limit = 10) {
    try {
      return await BusinessCard.getPopularBusinessCards(limit);
    } catch (error) {
      logger.error('Get popular business cards error:', error);
      throw error;
    }
  }
}

module.exports = BusinessCardService;
