'use strict';

const InvestorUnlockService = require('../services/InvestorUnlockService');
const { logger } = require('../utils/logger');
const { successResponse, errorResponse } = require('../utils/response');
const { idEncode, idDecode } = require('../utils/idCodec');

class InvestorUnlockController {
  /**
   * Unlock an investor profile for a user
   */
  static async unlockInvestor(req, res) {
    try {
      const { investor_id, unlock_type, payment_method } = req.body;
      const userId = req.user.id;
      
      if (!investor_id || !unlock_type) {
        return errorResponse(res, 'Investor ID and unlock type are required', 400);
      }

      // investor_id is a regular integer, not base64 encoded
      const investorId = parseInt(investor_id);
      if (isNaN(investorId) || investorId <= 0) {
        return errorResponse(res, 'Invalid investor ID', 400);
      }
      
      const unlockResult = await InvestorUnlockService.unlockInvestor(userId, investorId, {
        unlock_type,
        payment_method,
        unlocked_at: new Date()
      });

      logger.info(`Investor unlocked for user ${userId}: ${investorId}`);
      return successResponse(res, 'Investor unlocked successfully', { unlock: unlockResult });
    } catch (error) {
      logger.error('Unlock investor error:', error);
      
      if (error.message.includes('already unlocked')) {
        return errorResponse(res, 'Investor is already unlocked', 400);
      }
      
      if (error.message.includes('Investor not found')) {
        return errorResponse(res, 'Investor not found', 404);
      }
      
      if (error.message.includes('insufficient credits')) {
        return errorResponse(res, 'Insufficient credits to unlock investor', 400);
      }
      
      return errorResponse(res, 'Failed to unlock investor', 500);
    }
  }

  /**
   * Get all unlocked investors for a user
   */
  static async getUserUnlockedInvestors(req, res) {
    try {
      const userId = req.user.id;
      const { page = 1, limit = 20, investor_type } = req.query;
      
      const unlockedInvestors = await InvestorUnlockService.getUserUnlockedInvestors(userId, {
        page: parseInt(page),
        limit: parseInt(limit),
        investor_type
      });

      return successResponse(res, 'Unlocked investors retrieved successfully', { unlockedInvestors });
    } catch (error) {
      logger.error('Get user unlocked investors error:', error);
      return errorResponse(res, 'Failed to retrieve unlocked investors', 500);
    }
  }

  /**
   * Get unlock history for a user
   */
  static async getUserUnlockHistory(req, res) {
    try {
      const userId = req.user.id;
      const { page = 1, limit = 20, start_date, end_date } = req.query;
      
      const unlockHistory = await InvestorUnlockService.getUserUnlockHistory(userId, {
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
   * Get investor unlock statistics
   */
  static async getInvestorUnlockStats(req, res) {
    try {
      const { investor_id } = req.params;
      const { start_date, end_date } = req.query;
      
      // investor_id is a regular integer, not base64 encoded
      const investorId = parseInt(investor_id);
      if (isNaN(investorId) || investorId <= 0) {
        return errorResponse(res, 'Invalid investor ID', 400);
      }
      
      const stats = await InvestorUnlockService.getInvestorUnlockStats(investorId, {
        start_date: start_date ? new Date(start_date) : null,
        end_date: end_date ? new Date(end_date) : null
      });

      return successResponse(res, 'Investor unlock statistics retrieved successfully', { stats });
    } catch (error) {
      logger.error('Get investor unlock stats error:', error);
      return errorResponse(res, 'Failed to retrieve unlock statistics', 500);
    }
  }

  /**
   * Get all investor unlocks (admin only)
   */
  static async getAllInvestorUnlocks(req, res) {
    try {
      const { page = 1, limit = 50, investor_type, unlock_type, start_date, end_date } = req.query;
      
      const allUnlocks = await InvestorUnlockService.getAllInvestorUnlocks({
        page: parseInt(page),
        limit: parseInt(limit),
        investor_type,
        unlock_type,
        start_date: start_date ? new Date(start_date) : null,
        end_date: end_date ? new Date(end_date) : null
      });

      return successResponse(res, 'All investor unlocks retrieved successfully', { allUnlocks });
    } catch (error) {
      logger.error('Get all investor unlocks error:', error);
      return errorResponse(res, 'Failed to retrieve investor unlocks', 500);
    }
  }

  /**
   * Revoke investor unlock (admin only)
   */
  static async revokeInvestorUnlock(req, res) {
    try {
      const { unlock_id } = req.params;
      const { reason } = req.body;
      const adminId = req.user.id;
      
      const revokedUnlock = await InvestorUnlockService.revokeInvestorUnlock(unlock_id, {
        revoked_by: adminId,
        revoked_at: new Date(),
        reason: reason || 'Admin revoked access'
      });

      logger.info(`Investor unlock revoked by admin ${adminId}: ${unlock_id}`);
      return successResponse(res, 'Investor unlock revoked successfully', { revokedUnlock });
    } catch (error) {
      logger.error('Revoke investor unlock error:', error);
      
      if (error.message.includes('Unlock not found')) {
        return errorResponse(res, 'Investor unlock not found', 404);
      }
      
      return errorResponse(res, 'Failed to revoke investor unlock', 500);
    }
  }

  /**
   * Get unlock analytics
   */
  static async getUnlockAnalytics(req, res) {
    try {
      const { start_date, end_date, group_by = 'day' } = req.query;
      
      const analytics = await InvestorUnlockService.getUnlockAnalytics({
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
      const { format = 'json', start_date, end_date, investor_type } = req.query;
      
      const data = await InvestorUnlockService.exportUnlockData({
        format,
        start_date: start_date ? new Date(start_date) : null,
        end_date: end_date ? new Date(end_date) : null,
        investor_type
      });

      if (format === 'json') {
        return successResponse(res, 'Unlock data exported successfully', { data });
      } else {
        // For CSV format, set appropriate headers
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="investor_unlocks_${Date.now()}.csv"`);
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
      const { limit = 10, investor_type } = req.query;
      
      const recommendations = await InvestorUnlockService.getUnlockRecommendations(userId, {
        limit: parseInt(limit),
        investor_type
      });

      return successResponse(res, 'Unlock recommendations retrieved successfully', { recommendations });
    } catch (error) {
      logger.error('Get unlock recommendations error:', error);
      return errorResponse(res, 'Failed to retrieve unlock recommendations', 500);
    }
  }

  /**
   * Check if investor is unlocked for user
   */
  static async checkInvestorUnlockStatus(req, res) {
    try {
      const { investor_id } = req.params;
      const userId = req.user.id;
      
      const decodedInvestorId = idDecode(investor_id) || investor_id;
      
      const unlockStatus = await InvestorUnlockService.checkInvestorUnlockStatus(userId, decodedInvestorId);

      return successResponse(res, 'Investor unlock status checked successfully', { unlockStatus });
    } catch (error) {
      logger.error('Check investor unlock status error:', error);
      return errorResponse(res, 'Failed to check investor unlock status', 500);
    }
  }

  /**
   * Get unlock pricing information
   */
  static async getUnlockPricing(req, res) {
    try {
      const { investor_id } = req.params;
      
      const decodedInvestorId = idDecode(investor_id) || investor_id;
      
      const pricing = await InvestorUnlockService.getUnlockPricing(decodedInvestorId);

      return successResponse(res, 'Unlock pricing retrieved successfully', { pricing });
    } catch (error) {
      logger.error('Get unlock pricing error:', error);
      
      if (error.message.includes('Investor not found')) {
        return errorResponse(res, 'Investor not found', 404);
      }
      
      return errorResponse(res, 'Failed to retrieve unlock pricing', 500);
    }
  }

  /**
   * Get investor meet requests
   */
  static async getInvestorMeets(req, res) {
    try {
      const userId = req.user.id;
      const { page = 1, limit = 20, status } = req.query;
      
      const meets = await InvestorUnlockService.getInvestorMeets(userId, {
        page: parseInt(page),
        limit: parseInt(limit),
        status
      });

      return successResponse(res, 'Investor meets retrieved successfully', { meets });
    } catch (error) {
      logger.error('Get investor meets error:', error);
      return errorResponse(res, 'Failed to retrieve investor meets', 500);
    }
  }

  /**
   * Request investor meeting
   */
  static async requestInvestorMeeting(req, res) {
    try {
      const { investor_id, meeting_type, message, preferred_date } = req.body;
      const userId = req.user.id;
      
      if (!investor_id || !meeting_type) {
        return errorResponse(res, 'Investor ID and meeting type are required', 400);
      }

      const decodedInvestorId = idDecode(investor_id) || investor_id;
      
      const meetingRequest = await InvestorUnlockService.requestInvestorMeeting(userId, decodedInvestorId, {
        meeting_type,
        message,
        preferred_date: preferred_date ? new Date(preferred_date) : null,
        requested_at: new Date()
      });

      logger.info(`Investor meeting requested by user ${userId} with investor ${decodedInvestorId}`);
      return successResponse(res, 'Meeting request sent successfully', { meetingRequest });
    } catch (error) {
      logger.error('Request investor meeting error:', error);
      
      if (error.message.includes('Investor not unlocked')) {
        return errorResponse(res, 'Investor profile must be unlocked first', 400);
      }
      
      if (error.message.includes('Meeting already requested')) {
        return errorResponse(res, 'Meeting already requested with this investor', 400);
      }
      
      return errorResponse(res, 'Failed to request investor meeting', 500);
    }
  }

  /**
   * Get investor desk information
   */
  static async getInvestorDesk(req, res) {
    try {
      const { investor_id } = req.params;
      const userId = req.user.id;
      
      const decodedInvestorId = idDecode(investor_id) || investor_id;
      
      const investorDesk = await InvestorUnlockService.getInvestorDesk(userId, decodedInvestorId);

      return successResponse(res, 'Investor desk information retrieved successfully', { investorDesk });
    } catch (error) {
      logger.error('Get investor desk error:', error);
      
      if (error.message.includes('Investor not unlocked')) {
        return errorResponse(res, 'Investor profile must be unlocked first', 400);
      }
      
      return errorResponse(res, 'Failed to retrieve investor desk information', 500);
    }
  }
}

module.exports = InvestorUnlockController;
