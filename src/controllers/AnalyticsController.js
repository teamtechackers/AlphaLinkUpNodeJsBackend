'use strict';

const AnalyticsService = require('../services/AnalyticsService');
const UserService = require('../services/UserService');
const JobService = require('../services/JobService');
const EventService = require('../services/EventService');
const { logger } = require('../utils/logger');
const { successResponse, errorResponse } = require('../utils/response');

class AnalyticsController {
  static async getPlatformOverview(req, res) {
    try {
      const { startDate, endDate, groupBy } = req.query;

      const overview = await AnalyticsService.getPlatformOverview({
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        groupBy: groupBy || 'day'
      });
      
      return successResponse(res, 'Platform overview analytics retrieved successfully', { overview });
    } catch (error) {
      logger.error('Get platform overview analytics error:', error);
      return errorResponse(res, 'Failed to retrieve platform overview analytics', 500);
    }
  }

  static async getUserAnalytics(req, res) {
    try {
      const { startDate, endDate, groupBy, metrics } = req.query;

      const analytics = await AnalyticsService.getUserAnalytics({
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        groupBy: groupBy || 'day',
        metrics: metrics ? metrics.split(',') : ['registrations', 'profile_completion', 'retention']
      });
      
      return successResponse(res, 'User analytics retrieved successfully', { analytics });
    } catch (error) {
      logger.error('Get user analytics error:', error);
      return errorResponse(res, 'Failed to retrieve user analytics', 500);
    }
  }

  static async getUserRegistrationAnalytics(req, res) {
    try {
      const { startDate, endDate, groupBy, source, location } = req.query;

      const analytics = await AnalyticsService.getUserRegistrationAnalytics({
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        groupBy: groupBy || 'day',
        source,
        location
      });
      
      return successResponse(res, 'User registration analytics retrieved successfully', { analytics });
    } catch (error) {
      logger.error('Get user registration analytics error:', error);
      return errorResponse(res, 'Failed to retrieve user registration analytics', 500);
    }
  }

  static async getUserRetentionAnalytics(req, res) {
    try {
      const { startDate, endDate, cohort, period } = req.query;

      const analytics = await AnalyticsService.getUserRetentionAnalytics({
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        cohort: cohort || 'month',
        period: period || '12'
      });
      
      return successResponse(res, 'User retention analytics retrieved successfully', { analytics });
    } catch (error) {
      logger.error('Get user retention analytics error:', error);
      return errorResponse(res, 'Failed to retrieve user retention analytics', 500);
    }
  }

  static async getUserProfileCompletionAnalytics(req, res) {
    try {
      const { startDate, endDate, groupBy, segments } = req.query;

      const analytics = await AnalyticsService.getUserProfileCompletionAnalytics({
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        groupBy: groupBy || 'day',
        segments: segments ? segments.split(',') : ['basic', 'professional', 'social']
      });
      
      return successResponse(res, 'User profile completion analytics retrieved successfully', { analytics });
    } catch (error) {
      logger.error('Get user profile completion analytics error:', error);
      return errorResponse(res, 'Failed to retrieve user profile completion analytics', 500);
    }
  }

  static async getUserSegmentationAnalytics(req, res) {
    try {
      const { startDate, endDate, criteria, groupBy } = req.query;

      const analytics = await AnalyticsService.getUserSegmentationAnalytics({
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        criteria: criteria ? JSON.parse(criteria) : ['location', 'profession', 'interests'],
        groupBy: groupBy || 'segment'
      });
      
      return successResponse(res, 'User segmentation analytics retrieved successfully', { analytics });
    } catch (error) {
      logger.error('Get user segmentation analytics error:', error);
      return errorResponse(res, 'Failed to retrieve user segmentation analytics', 500);
    }
  }

  static async getEngagementAnalytics(req, res) {
    try {
      const { startDate, endDate, groupBy, metrics } = req.query;

      const analytics = await AnalyticsService.getEngagementAnalytics({
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        groupBy: groupBy || 'day',
        metrics: metrics ? metrics.split(',') : ['connections', 'chat', 'notifications', 'search']
      });
      
      return successResponse(res, 'Engagement analytics retrieved successfully', { analytics });
    } catch (error) {
      logger.error('Get engagement analytics error:', error);
      return errorResponse(res, 'Failed to retrieve engagement analytics', 500);
    }
  }

  static async getConnectionAnalytics(req, res) {
    try {
      const { startDate, endDate, groupBy, type } = req.query;

      const analytics = await AnalyticsService.getConnectionAnalytics({
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        groupBy: groupBy || 'day',
        type
      });
      
      return successResponse(res, 'Connection analytics retrieved successfully', { analytics });
    } catch (error) {
      logger.error('Get connection analytics error:', error);
      return errorResponse(res, 'Failed to retrieve connection analytics', 500);
    }
  }

  static async getChatAnalytics(req, res) {
    try {
      const { startDate, endDate, groupBy, metrics } = req.query;

      const analytics = await AnalyticsService.getChatAnalytics({
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        groupBy: groupBy || 'day',
        metrics: metrics ? metrics.split(',') : ['messages', 'conversations', 'response_time']
      });
      
      return successResponse(res, 'Chat analytics retrieved successfully', { analytics });
    } catch (error) {
      logger.error('Get chat analytics error:', error);
      return errorResponse(res, 'Failed to retrieve chat analytics', 500);
    }
  }

  static async getNotificationAnalytics(req, res) {
    try {
      const { startDate, endDate, groupBy, type } = req.query;

      const analytics = await AnalyticsService.getNotificationAnalytics({
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        groupBy: groupBy || 'day',
        type
      });
      
      return successResponse(res, 'Notification analytics retrieved successfully', { analytics });
    } catch (error) {
      logger.error('Get notification analytics error:', error);
      return errorResponse(res, 'Failed to retrieve notification analytics', 500);
    }
  }

  static async getSearchAnalytics(req, res) {
    try {
      const { startDate, endDate, groupBy, type } = req.query;

      const analytics = await AnalyticsService.getSearchAnalytics({
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        groupBy: groupBy || 'day',
        type
      });
      
      return successResponse(res, 'Search analytics retrieved successfully', { analytics });
    } catch (error) {
      logger.error('Get search analytics error:', error);
      return errorResponse(res, 'Failed to retrieve search analytics', 500);
    }
  }

  static async getBusinessAnalytics(req, res) {
    try {
      const { startDate, endDate, groupBy, metrics } = req.query;

      const analytics = await AnalyticsService.getBusinessAnalytics({
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        groupBy: groupBy || 'day',
        metrics: metrics ? metrics.split(',') : ['jobs', 'events', 'services', 'investors']
      });
      
      return successResponse(res, 'Business analytics retrieved successfully', { analytics });
    } catch (error) {
      logger.error('Get business analytics error:', error);
      return errorResponse(res, 'Failed to retrieve business analytics', 500);
    }
  }

  static async getJobAnalytics(req, res) {
    try {
      const { startDate, endDate, groupBy, metrics } = req.query;

      const analytics = await AnalyticsService.getJobAnalytics({
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        groupBy: groupBy || 'day',
        metrics: metrics ? metrics.split(',') : ['postings', 'applications', 'views', 'conversions']
      });
      
      return successResponse(res, 'Job analytics retrieved successfully', { analytics });
    } catch (error) {
      logger.error('Get job analytics error:', error);
      return errorResponse(res, 'Failed to retrieve job analytics', 500);
    }
  }

  static async getEventAnalytics(req, res) {
    try {
      const { startDate, endDate, groupBy, metrics } = req.query;

      const analytics = await AnalyticsService.getEventAnalytics({
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        groupBy: groupBy || 'day',
        metrics: metrics ? metrics.split(',') : ['creations', 'registrations', 'attendance', 'engagement']
      });
      
      return successResponse(res, 'Event analytics retrieved successfully', { analytics });
    } catch (error) {
      logger.error('Get event analytics error:', error);
      return errorResponse(res, 'Failed to retrieve event analytics', 500);
    }
  }

  static async getServiceAnalytics(req, res) {
    try {
      const { startDate, endDate, groupBy, metrics } = req.query;

      const analytics = await AnalyticsService.getServiceAnalytics({
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        groupBy: groupBy || 'day',
        metrics: metrics ? metrics.split(',') : ['listings', 'views', 'inquiries', 'bookings']
      });
      
      return successResponse(res, 'Service analytics retrieved successfully', { analytics });
    } catch (error) {
      logger.error('Get service analytics error:', error);
      return errorResponse(res, 'Failed to retrieve service analytics', 500);
    }
  }

  static async getInvestorAnalytics(req, res) {
    try {
      const { startDate, endDate, groupBy, metrics } = req.query;

      const analytics = await AnalyticsService.getInvestorAnalytics({
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        groupBy: groupBy || 'day',
        metrics: metrics ? metrics.split(',') : ['registrations', 'profile_views', 'connections', 'inquiries']
      });
      
      return successResponse(res, 'Investor analytics retrieved successfully', { analytics });
    } catch (error) {
      logger.error('Get investor analytics error:', error);
      return errorResponse(res, 'Failed to retrieve investor analytics', 500);
    }
  }

  static async getGrowthAnalytics(req, res) {
    try {
      const { startDate, endDate, groupBy, metrics } = req.query;

      const analytics = await AnalyticsService.getGrowthAnalytics({
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        groupBy: groupBy || 'month',
        metrics: metrics ? metrics.split(',') : ['user_growth', 'revenue_growth', 'engagement_growth', 'market_expansion']
      });
      
      return successResponse(res, 'Growth analytics retrieved successfully', { analytics });
    } catch (error) {
      logger.error('Get growth analytics error:', error);
      return errorResponse(res, 'Failed to retrieve growth analytics', 500);
    }
  }

  static async getGeographicAnalytics(req, res) {
    try {
      const { startDate, endDate, groupBy, metrics, regions } = req.query;

      const analytics = await AnalyticsService.getGeographicAnalytics({
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        groupBy: groupBy || 'country',
        metrics: metrics ? metrics.split(',') : ['users', 'activity', 'growth', 'engagement'],
        regions: regions ? regions.split(',') : []
      });
      
      return successResponse(res, 'Geographic analytics retrieved successfully', { analytics });
    } catch (error) {
      logger.error('Get geographic analytics error:', error);
      return errorResponse(res, 'Failed to retrieve geographic analytics', 500);
    }
  }

  static async getPerformanceAnalytics(req, res) {
    try {
      const { startDate, endDate, groupBy, metrics } = req.query;

      const analytics = await AnalyticsService.getPerformanceAnalytics({
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        groupBy: groupBy || 'hour',
        metrics: metrics ? metrics.split(',') : ['response_time', 'uptime', 'error_rate', 'throughput']
      });
      
      return successResponse(res, 'Performance analytics retrieved successfully', { analytics });
    } catch (error) {
      logger.error('Get performance analytics error:', error);
      return errorResponse(res, 'Failed to retrieve performance analytics', 500);
    }
  }

  static async getCustomReport(req, res) {
    try {
      const { reportConfig } = req.body;

      if (!reportConfig) {
        return errorResponse(res, 'Report configuration is required', 400);
      }

      const report = await AnalyticsService.getCustomReport(reportConfig);
      
      return successResponse(res, 'Custom report generated successfully', { report });
    } catch (error) {
      logger.error('Get custom report error:', error);
      
      if (error.message.includes('Invalid report configuration')) {
        return errorResponse(res, 'Invalid report configuration', 400);
      }
      
      return errorResponse(res, 'Failed to generate custom report', 500);
    }
  }

  static async exportAnalyticsData(req, res) {
    try {
      const { dataType, format = 'json', startDate, endDate, filters } = req.query;

      if (!dataType) {
        return errorResponse(res, 'Data type is required', 400);
      }

      const data = await AnalyticsService.exportAnalyticsData({
        dataType,
        format,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        filters: filters ? JSON.parse(filters) : {}
      });

      if (format === 'json') {
        return successResponse(res, 'Analytics data exported successfully', { data });
      } else {
        // For CSV format, set appropriate headers
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="analytics_${dataType}.csv"`);
        return res.send(data);
      }
    } catch (error) {
      logger.error('Export analytics data error:', error);
      
      if (error.message.includes('Invalid data type')) {
        return errorResponse(res, 'Invalid data type', 400);
      }
      
      return errorResponse(res, 'Failed to export analytics data', 500);
    }
  }

  static async getAnalyticsDashboard(req, res) {
    try {
      const { dashboardType = 'overview', startDate, endDate, refresh = false } = req.query;

      const dashboard = await AnalyticsService.getAnalyticsDashboard({
        dashboardType,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        refresh: refresh === 'true'
      });
      
      return successResponse(res, 'Analytics dashboard retrieved successfully', { dashboard });
    } catch (error) {
      logger.error('Get analytics dashboard error:', error);
      
      if (error.message.includes('Invalid dashboard type')) {
        return errorResponse(res, 'Invalid dashboard type', 400);
      }
      
      return errorResponse(res, 'Failed to retrieve analytics dashboard', 500);
    }
  }

  static async getRealTimeAnalytics(req, res) {
    try {
      const { metrics, interval = '5m' } = req.query;

      const analytics = await AnalyticsService.getRealTimeAnalytics({
        metrics: metrics ? metrics.split(',') : ['active_users', 'current_activity', 'system_status'],
        interval
      });
      
      return successResponse(res, 'Real-time analytics retrieved successfully', { analytics });
    } catch (error) {
      logger.error('Get real-time analytics error:', error);
      return errorResponse(res, 'Failed to retrieve real-time analytics', 500);
    }
  }

  static async getAnalyticsInsights(req, res) {
    try {
      const { startDate, endDate, type, limit = 10 } = req.query;

      const insights = await AnalyticsService.getAnalyticsInsights({
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        type,
        limit: parseInt(limit)
      });
      
      return successResponse(res, 'Analytics insights retrieved successfully', { insights });
    } catch (error) {
      logger.error('Get analytics insights error:', error);
      return errorResponse(res, 'Failed to retrieve analytics insights', 500);
    }
  }

  // Get analytics trends
  static async getAnalyticsTrends(req, res) {
    try {
      const { startDate, endDate, metrics, groupBy } = req.query;

      const trends = await AnalyticsService.getAnalyticsTrends({
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        metrics: metrics ? metrics.split(',') : ['user_growth', 'engagement', 'revenue'],
        groupBy: groupBy || 'week'
      });
      
      return successResponse(res, 'Analytics trends retrieved successfully', { trends });
    } catch (error) {
      logger.error('Get analytics trends error:', error);
      return errorResponse(res, 'Failed to retrieve analytics trends', 500);
    }
  }

  // Get analytics comparison
  static async getAnalyticsComparison(req, res) {
    try {
      const { baselineStart, baselineEnd, comparisonStart, comparisonEnd, metrics } = req.query;

      if (!baselineStart || !baselineEnd || !comparisonStart || !comparisonEnd) {
        return errorResponse(res, 'All date ranges are required for comparison', 400);
      }

      const comparison = await AnalyticsService.getAnalyticsComparison({
        baselineStart: new Date(baselineStart),
        baselineEnd: new Date(baselineEnd),
        comparisonStart: new Date(comparisonStart),
        comparisonEnd: new Date(comparisonEnd),
        metrics: metrics ? metrics.split(',') : ['users', 'engagement', 'revenue']
      });
      
      return successResponse(res, 'Analytics comparison retrieved successfully', { comparison });
    } catch (error) {
      logger.error('Get analytics comparison error:', error);
      return errorResponse(res, 'Failed to retrieve analytics comparison', 500);
    }
  }

  // Get analytics forecast
  static async getAnalyticsForecast(req, res) {
    try {
      const { startDate, periods, metrics, confidence = 0.95 } = req.query;

      if (!startDate || !periods) {
        return errorResponse(res, 'Start date and number of periods are required', 400);
      }

      const forecast = await AnalyticsService.getAnalyticsForecast({
        startDate: new Date(startDate),
        periods: parseInt(periods),
        metrics: metrics ? metrics.split(',') : ['users', 'revenue', 'engagement'],
        confidence: parseFloat(confidence)
      });
      
      return successResponse(res, 'Analytics forecast retrieved successfully', { forecast });
    } catch (error) {
      logger.error('Get analytics forecast error:', error);
      
      if (error.message.includes('Invalid forecast parameters')) {
        return errorResponse(res, 'Invalid forecast parameters', 400);
      }
      
      return errorResponse(res, 'Failed to retrieve analytics forecast', 500);
    }
  }

  static async getAnalyticsAlerts(req, res) {
    try {
      const { status, severity, startDate, endDate, page = 1, limit = 20 } = req.query;

      const alerts = await AnalyticsService.getAnalyticsAlerts({
        status,
        severity,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        page: parseInt(page),
        limit: parseInt(limit)
      });
      
      return successResponse(res, 'Analytics alerts retrieved successfully', { alerts });
    } catch (error) {
      logger.error('Get analytics alerts error:', error);
      return errorResponse(res, 'Failed to retrieve analytics alerts', 500);
    }
  }

  // Create analytics alert
  static async createAnalyticsAlert(req, res) {
    try {
      const alertData = req.body;
      
      // Validate required fields
      if (!alertData.name || !alertData.condition || !alertData.threshold) {
        return errorResponse(res, 'Name, condition, and threshold are required', 400);
      }

      const alert = await AnalyticsService.createAnalyticsAlert(alertData);
      
      logger.info(`Analytics alert created: ${alertData.name}`);
      return successResponse(res, 'Analytics alert created successfully', { alert }, 201);
    } catch (error) {
      logger.error('Create analytics alert error:', error);
      
      if (error.message.includes('Invalid alert configuration')) {
        return errorResponse(res, 'Invalid alert configuration', 400);
      }
      
      return errorResponse(res, 'Failed to create analytics alert', 500);
    }
  }
}

module.exports = AnalyticsController;
