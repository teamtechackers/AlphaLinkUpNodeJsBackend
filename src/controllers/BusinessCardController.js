'use strict';

const BusinessCardService = require('../services/BusinessCardService');
const QRCodeService = require('../services/QRCodeService');
const { logger } = require('../utils/logger');
const { successResponse, errorResponse } = require('../utils/response');
const { idEncode, idDecode } = require('../utils/idCodec');

class BusinessCardController {
  
  static async activateCard(req, res) {
    try {
      const { user_id, card_data } = req.body;
      
      if (!user_id || !card_data) {
        return errorResponse(res, 'User ID and card data are required', 400);
      }

      const decodedUserId = idDecode(user_id);
      if (!decodedUserId) {
        return errorResponse(res, 'Invalid user ID', 400);
      }

      if (!card_data.name || !card_data.mobile) {
        return errorResponse(res, 'Name and mobile are required for business card', 400);
      }

      const activatedCard = await BusinessCardService.activateCard(decodedUserId, card_data);
      
      const qrResult = await QRCodeService.generateBusinessCardQR(decodedUserId, card_data);
      
      if (qrResult.success) {
        await BusinessCardService.updateCard(activatedCard.id, {
          qr_code: qrResult.filename,
          qr_url: qrResult.url
        });
        
        activatedCard.qr_code = qrResult.filename;
        activatedCard.qr_url = qrResult.url;
      }

      logger.info(`Business card activated for user: ${decodedUserId}`);
      return successResponse(res, 'Business card activated successfully', { 
        card: activatedCard,
        qr_code: qrResult.success ? qrResult.url : null
      }, 201);
    } catch (error) {
      logger.error('Activate business card error:', error);
      
      if (error.message.includes('already activated')) {
        return errorResponse(res, 'Business card is already activated', 400);
      }
      
      if (error.message.includes('User not found')) {
        return errorResponse(res, 'User not found', 404);
      }
      
      return errorResponse(res, 'Failed to activate business card', 500);
    }
  }


  static async getBusinessCard(req, res) {
    try {
      const { user_id } = req.params;
      
      if (!user_id) {
        return errorResponse(res, 'User ID is required', 400);
      }

      // Decode user ID
      const decodedUserId = idDecode(user_id);
      if (!decodedUserId) {
        return errorResponse(res, 'Invalid user ID', 400);
      }

      const businessCard = await BusinessCardService.getBusinessCard(decodedUserId);
      
      if (!businessCard) {
        return errorResponse(res, 'Business card not found', 404);
      }

      return successResponse(res, 'Business card retrieved successfully', { businessCard });
    } catch (error) {
      logger.error('Get business card error:', error);
      return errorResponse(res, 'Failed to retrieve business card', 500);
    }
  }

  static async updateBusinessCard(req, res) {
    try {
      const { user_id } = req.params;
      const updateData = req.body;
      
      if (!user_id) {
        return errorResponse(res, 'User ID is required', 400);
      }

      if (Object.keys(updateData).length === 0) {
        return errorResponse(res, 'No update data provided', 400);
      }

      const decodedUserId = idDecode(user_id);
      if (!decodedUserId) {
        return errorResponse(res, 'Invalid user ID', 400);
      }

      const updatedCard = await BusinessCardService.updateBusinessCard(decodedUserId, updateData);
      
      if (updateData.name || updateData.mobile || updateData.company) {
        const qrResult = await QRCodeService.generateBusinessCardQR(decodedUserId, updatedCard);
        
        if (qrResult.success) {
          await BusinessCardService.updateCard(updatedCard.id, {
            qr_code: qrResult.filename,
            qr_url: qrResult.url
          });
          
          updatedCard.qr_code = qrResult.filename;
          updatedCard.qr_url = qrResult.url;
        }
      }

      logger.info(`Business card updated for user: ${decodedUserId}`);
      return successResponse(res, 'Business card updated successfully', { businessCard: updatedCard });
    } catch (error) {
      logger.error('Update business card error:', error);
      
      if (error.message.includes('Business card not found')) {
        return errorResponse(res, 'Business card not found', 404);
      }
      
      if (error.message.includes('not authorized')) {
        return errorResponse(res, 'You are not authorized to update this business card', 403);
      }
      
      return errorResponse(res, 'Failed to update business card', 500);
    }
  }

  static async deactivateCard(req, res) {
    try {
      const { user_id } = req.params;
      
      if (!user_id) {
        return errorResponse(res, 'User ID is required', 400);
      }

      const decodedUserId = idDecode(user_id);
      if (!decodedUserId) {
        return errorResponse(res, 'Invalid user ID', 400);
      }

      const deactivatedCard = await BusinessCardService.deactivateCard(decodedUserId);
      
      logger.info(`Business card deactivated for user: ${decodedUserId}`);
      return successResponse(res, 'Business card deactivated successfully', { businessCard: deactivatedCard });
    } catch (error) {
      logger.error('Deactivate business card error:', error);
      
      if (error.message.includes('Business card not found')) {
        return errorResponse(res, 'Business card not found', 404);
      }
      
      if (error.message.includes('not authorized')) {
        return errorResponse(res, 'You are not authorized to deactivate this business card', 403);
      }
      
      return errorResponse(res, 'Failed to deactivate business card', 500);
    }
  }

  
  static async getBusinessCardByQR(req, res) {
    try {
      const { qr_code } = req.params;
      
      if (!qr_code) {
        return errorResponse(res, 'QR code is required', 400);
      }

      const businessCard = await BusinessCardService.getBusinessCardByQR(qr_code);
      
      if (!businessCard) {
        return errorResponse(res, 'Business card not found', 404);
      }

      const publicCard = {
        user_id: idEncode(businessCard.user_id),
        name: businessCard.name,
        company: businessCard.company,
        designation: businessCard.designation,
        mobile: businessCard.mobile,
        email: businessCard.email,
        website: businessCard.website,
        address: businessCard.address,
        profile_photo: businessCard.profile_photo,
        qr_url: businessCard.qr_url,
        status: businessCard.status,
        activated_at: businessCard.activated_at
      };

      return successResponse(res, 'Business card retrieved successfully', { businessCard: publicCard });
    } catch (error) {
      logger.error('Get business card by QR error:', error);
      return errorResponse(res, 'Failed to retrieve business card', 500);
    }
  }


  static async getBusinessCardStats(req, res) {
    try {
      const userId = req.user.id;
      
      const stats = await BusinessCardService.getBusinessCardStats(userId);
      
      return successResponse(res, 'Business card statistics retrieved successfully', { stats });
    } catch (error) {
      logger.error('Get business card stats error:', error);
      return errorResponse(res, 'Failed to retrieve business card statistics', 500);
    }
  }

 
  static async shareBusinessCard(req, res) {
    try {
      const { user_id } = req.params;
      const { share_type, recipient_email, message } = req.body;
      
      if (!user_id || !share_type) {
        return errorResponse(res, 'User ID and share type are required', 400);
      }

      const decodedUserId = idDecode(user_id);
      if (!decodedUserId) {
        return errorResponse(res, 'Invalid user ID', 400);
      }

      const shareResult = await BusinessCardService.shareBusinessCard(decodedUserId, {
        share_type,
        recipient_email,
        message
      });

      logger.info(`Business card shared for user: ${decodedUserId} via ${share_type}`);
      return successResponse(res, 'Business card shared successfully', { shareResult });
    } catch (error) {
      logger.error('Share business card error:', error);
      
      if (error.message.includes('Business card not found')) {
        return errorResponse(res, 'Business card not found', 404);
      }
      
      if (error.message.includes('Invalid share type')) {
        return errorResponse(res, 'Invalid share type', 400);
      }
      
      return errorResponse(res, 'Failed to share business card', 500);
    }
  }

  
  static async exportBusinessCard(req, res) {
    try {
      const { user_id } = req.params;
      const { format = 'json' } = req.query;
      
      if (!user_id) {
        return errorResponse(res, 'User ID is required', 400);
      }

      const decodedUserId = idDecode(user_id);
      if (!decodedUserId) {
        return errorResponse(res, 'Invalid user ID', 400);
      }

      const data = await BusinessCardService.exportBusinessCard(decodedUserId, format);

      if (format === 'json') {
        return successResponse(res, 'Business card data exported successfully', { data });
      } else {
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="business_card_${user_id}.csv"`);
        return res.send(data);
      }
    } catch (error) {
      logger.error('Export business card error:', error);
      
      if (error.message.includes('Business card not found')) {
        return errorResponse(res, 'Business card not found', 404);
      }
      
      return errorResponse(res, 'Failed to export business card data', 500);
    }
  }
}

module.exports = BusinessCardController;
