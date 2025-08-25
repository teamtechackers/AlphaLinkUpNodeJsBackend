'use strict';

const ServiceUnlockService = require('../services/ServiceUnlockService');
const { logger } = require('../utils/logger');
const { successResponse, errorResponse } = require('../utils/response');
const { idEncode, idDecode } = require('../utils/idCodec');

class ServiceUnlockController {
  /**
   * Unlock a service for a user
   */
  static async unlockService(req, res) {
    try {
      const { service_id, unlock_type, payment_method } = req.body;
      const userId = req.user.id;
      
      if (!service_id || !unlock_type) {
        return errorResponse(res, 'Service ID and unlock type are required', 400);
      }

      // service_id is a regular integer, not base64 encoded
      const serviceId = parseInt(service_id);
      if (isNaN(serviceId) || serviceId <= 0) {
        return errorResponse(res, 'Invalid service ID', 400);
      }
      
      const unlockResult = await ServiceUnlockService.unlockService(userId, serviceId, {
        unlock_type,
        payment_method,
        unlocked_at: new Date()
      });

      logger.info(`Service unlocked for user ${userId}: ${serviceId}`);
      return successResponse(res, 'Service unlocked successfully', { unlock: unlockResult });
    } catch (error) {
      logger.error('Unlock service error:', error);
      
      if (error.message.includes('already unlocked')) {
        return errorResponse(res, 'Service is already unlocked', 400);
      }
      
      if (error.message.includes('Service not found')) {
        return errorResponse(res, 'Service not found', 404);
      }
      
      if (error.message.includes('insufficient credits')) {
        return errorResponse(res, 'Insufficient credits to unlock service', 400);
      }
      
      return errorResponse(res, 'Failed to unlock service', 500);
    }
  }

  /**
   * Get all unlocked services for a user
   */
  static async getUserUnlockedServices(req, res) {
    try {
      const userId = req.user.id;
      const { page = 1, limit = 20, service_type } = req.query;
      
      const unlockedServices = await ServiceUnlockService.getUserUnlockedServices(userId, {
        page: parseInt(page),
        limit: parseInt(limit),
        service_type
      });

      return successResponse(res, 'Unlocked services retrieved successfully', { unlockedServices });
    } catch (error) {
      logger.error('Get user unlocked services error:', error);
      return errorResponse(res, 'Failed to retrieve unlocked services', 500);
    }
  }

  /**
   * Get unlock history for a user
   */
  static async getUserUnlockHistory(req, res) {
    try {
      const userId = req.user.id;
      const { page = 1, limit = 20, start_date, end_date } = req.query;
      
      const unlockHistory = await ServiceUnlockService.getUserUnlockHistory(userId, {
        page: parseInt(page),
        limit: parseInt(limit),
        start_date: start_date ? new Date(start_date) : null,
        end_date: end_date ? new Date(end_date) : null
      });

      return successResponse(res, 'Unlock history retrieved successfully', { unlockHistory });
    } catch (error) {
      logger.error('Get user unlock history error:', error);
      return errorResponse(res, 'Failed to retrieve unlock history', 500);
    }
  }

  /**
   * Get service unlock statistics
   */
  static async getServiceUnlockStats(req, res) {
    try {
      const { service_id } = req.params;
      const { start_date, end_date } = req.query;
      
      // service_id is a regular integer, not base64 encoded
      const serviceId = parseInt(service_id);
      if (isNaN(serviceId) || serviceId <= 0) {
        return errorResponse(res, 'Invalid service ID', 400);
      }
      
      const stats = await ServiceUnlockService.getServiceUnlockStats(serviceId, {
        start_date: start_date ? new Date(start_date) : null,
        end_date: end_date ? new Date(end_date) : null
      });

      return successResponse(res, 'Service unlock statistics retrieved successfully', { stats });
    } catch (error) {
      logger.error('Get service unlock stats error:', error);
      return errorResponse(res, 'Failed to retrieve unlock statistics', 500);
    }
  }

  /**
   * Get all service unlocks (admin only)
   */
  static async getAllServiceUnlocks(req, res) {
    try {
      const { page = 1, limit = 50, service_type, unlock_type, start_date, end_date } = req.query;
      
      const allUnlocks = await ServiceUnlockService.getAllServiceUnlocks({
        page: parseInt(page),
        limit: parseInt(limit),
        service_type,
        unlock_type,
        start_date: start_date ? new Date(start_date) : null,
        end_date: end_date ? new Date(end_date) : null
      });

      return successResponse(res, 'All service unlocks retrieved successfully', { allUnlocks });
    } catch (error) {
      logger.error('Get all service unlocks error:', error);
      return errorResponse(res, 'Failed to retrieve service unlocks', 500);
    }
  }

  /**
   * Revoke service unlock (admin only)
   */
  static async revokeServiceUnlock(req, res) {
    try {
      const { unlock_id } = req.params;
      const { reason } = req.body;
      const adminId = req.user.id;
      
      const revokedUnlock = await ServiceUnlockService.revokeServiceUnlock(unlock_id, {
        revoked_by: adminId,
        revoked_at: new Date(),
        reason: reason || 'Admin revoked access'
      });

      logger.info(`Service unlock revoked by admin ${adminId}: ${unlock_id}`);
      return successResponse(res, 'Service unlock revoked successfully', { revokedUnlock });
    } catch (error) {
      logger.error('Revoke service unlock error:', error);
      
      if (error.message.includes('Unlock not found')) {
        return errorResponse(res, 'Service unlock not found', 404);
      }
      
      return errorResponse(res, 'Failed to revoke service unlock', 500);
    }
  }

  /**
   * Get unlock analytics
   */
  static async getUnlockAnalytics(req, res) {
    try {
      const { start_date, end_date, group_by = 'day' } = req.query;
      
      const analytics = await ServiceUnlockService.getUnlockAnalytics({
        start_date: start_date ? new Date(start_date) : null,
        end_date: end_date ? new Date(end_date) : null,
        group_by
      });

      return successResponse(res, 'Unlock analytics retrieved successfully', { analytics });
    } catch (error) {
      logger.error('Get unlock analytics error:', error);
      return errorResponse(res, 'Failed to retrieve unlock analytics', 500);
    }
  }

  /**
   * Export unlock data
   */
  static async exportUnlockData(req, res) {
    try {
      const { format = 'json', start_date, end_date, service_type } = req.query;
      
      const data = await ServiceUnlockService.exportUnlockData({
        format,
        start_date: start_date ? new Date(start_date) : null,
        end_date: end_date ? new Date(end_date) : null,
        service_type
      });

      if (format === 'json') {
        return successResponse(res, 'Unlock data exported successfully', { data });
      } else {
        // For CSV format, set appropriate headers
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="service_unlocks_${Date.now()}.csv"`);
        return res.send(data);
      }
    } catch (error) {
      logger.error('Export unlock data error:', error);
      return errorResponse(res, 'Failed to export unlock data', 500);
    }
  }

  /**
   * Get unlock recommendations
   */
  static async getUnlockRecommendations(req, res) {
    try {
      const userId = req.user.id;
      const { limit = 10, service_type } = req.query;
      
      const recommendations = await ServiceUnlockService.getUnlockRecommendations(userId, {
        limit: parseInt(limit),
        service_type
      });

      return successResponse(res, 'Unlock recommendations retrieved successfully', { recommendations });
    } catch (error) {
      logger.error('Get unlock recommendations error:', error);
      return errorResponse(res, 'Failed to retrieve unlock recommendations', 500);
    }
  }

  /**
   * Check if service is unlocked for user
   */
  static async checkServiceUnlockStatus(req, res) {
    try {
      const { service_id } = req.params;
      const userId = req.user.id;
      
      const decodedServiceId = idDecode(service_id) || service_id;
      
      const unlockStatus = await ServiceUnlockService.checkServiceUnlockStatus(userId, decodedServiceId);

      return successResponse(res, 'Service unlock status checked successfully', { unlockStatus });
    } catch (error) {
      logger.error('Check service unlock status error:', error);
      return errorResponse(res, 'Failed to check service unlock status', 500);
    }
  }

  /**
   * Get unlock pricing information
   */
  static async getUnlockPricing(req, res) {
    try {
      const { service_id } = req.params;
      
      const decodedServiceId = idDecode(service_id) || service_id;
      
      const pricing = await ServiceUnlockService.getUnlockPricing(decodedServiceId);

      return successResponse(res, 'Unlock pricing retrieved successfully', { pricing });
    } catch (error) {
      logger.error('Get unlock pricing error:', error);
      
      if (error.message.includes('Service not found')) {
        return errorResponse(res, 'Service not found', 404);
      }
      
      return errorResponse(res, 'Failed to retrieve unlock pricing', 500);
    }
  }
}

module.exports = ServiceUnlockController;
