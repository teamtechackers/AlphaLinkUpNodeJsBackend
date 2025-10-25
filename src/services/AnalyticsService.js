'use strict';

const User = require('../models/User');
const Job = require('../models/Job');
const Event = require('../models/Event');
const ServiceProvider = require('../models/ServiceProvider');
const Investor = require('../models/Investor');
const Connection = require('../models/Connection');
const Chat = require('../models/Chat');
const Notification = require('../models/Notification');
const { logger } = require('../utils/logger');

class AnalyticsService {
  constructor() {
    this.cache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
  }

  // Get comprehensive platform analytics
  async getPlatformAnalytics(options = {}) {
    try {
      const {
        startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
        endDate = new Date(),
        includeCache = true
      } = options;

      const cacheKey = `platform_${startDate.getTime()}_${endDate.getTime()}`;
      
      if (includeCache && this.cache.has(cacheKey)) {
        const cached = this.cache.get(cacheKey);
        if (Date.now() - cached.timestamp < this.cacheTimeout) {
          return cached.data;
        }
      }

      const analytics = {
        overview: await this.getOverviewStats(startDate, endDate),
        userMetrics: await this.getUserMetrics(startDate, endDate),
        engagementMetrics: await this.getEngagementMetrics(startDate, endDate),
        businessMetrics: await this.getBusinessMetrics(startDate, endDate),
        growthMetrics: await this.getGrowthMetrics(startDate, endDate),
        geographicMetrics: await this.getGeographicMetrics(startDate, endDate),
        performanceMetrics: await this.getPerformanceMetrics(startDate, endDate),
        generatedAt: new Date()
      };

      // Cache the results
      this.cache.set(cacheKey, {
        data: analytics,
        timestamp: Date.now()
      });

      return analytics;
    } catch (error) {
      logger.error('Error getting platform analytics:', error);
      throw error;
    }
  }

  // Get overview statistics
  async getOverviewStats(startDate, endDate) {
    try {
      const [
        totalUsers,
        activeUsers,
        totalJobs,
        activeJobs,
        totalEvents,
        upcomingEvents,
        totalServices,
        activeServices,
        totalInvestors,
        activeInvestors
      ] = await Promise.all([
        User.getStats(),
        User.getActiveUsers(startDate, endDate),
        Job.getStats(),
        Job.getActiveJobs(startDate, endDate),
        Event.getStats(),
        Event.getUpcomingEvents(startDate, endDate),
        ServiceProvider.getStats(),
        ServiceProvider.getActiveServices(startDate, endDate),
        Investor.getStats(),
        Investor.getActiveInvestors(startDate, endDate)
      ]);

      return {
        totalUsers: totalUsers.total || 0,
        activeUsers: activeUsers.length || 0,
        totalJobs: totalJobs.total || 0,
        activeJobs: activeJobs.length || 0,
        totalEvents: totalEvents.total || 0,
        upcomingEvents: upcomingEvents.length || 0,
        totalServices: totalServices.total || 0,
        activeServices: activeServices.length || 0,
        totalInvestors: totalInvestors.total || 0,
        activeInvestors: activeInvestors.length || 0
      };
    } catch (error) {
      logger.error('Error getting overview stats:', error);
      throw error;
    }
  }

  // Get user metrics
  async getUserMetrics(startDate, endDate) {
    try {
      const [
        newRegistrations,
        profileCompletions,
        userRetention,
        userActivity,
        userSegments,
        topUsers
      ] = await Promise.all([
        this.getNewRegistrations(startDate, endDate),
        this.getProfileCompletions(startDate, endDate),
        this.calculateUserRetention(startDate, endDate),
        this.getUserActivity(startDate, endDate),
        this.getUserSegments(),
        this.getTopUsers(startDate, endDate)
      ]);

      return {
        newRegistrations,
        profileCompletions,
        userRetention,
        userActivity,
        userSegments,
        topUsers
      };
    } catch (error) {
      logger.error('Error getting user metrics:', error);
      throw error;
    }
  }

  // Get new user registrations
  async getNewRegistrations(startDate, endDate) {
    try {
      const users = await User.search({
        startDate,
        endDate,
        sortBy: 'created_at'
      });

      const dailyRegistrations = {};
      const weeklyRegistrations = {};
      const monthlyRegistrations = {};

      users.forEach(user => {
        const date = new Date(user.created_at);
        const dayKey = date.toISOString().split('T')[0];
        const weekKey = this.getWeekKey(date);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

        dailyRegistrations[dayKey] = (dailyRegistrations[dayKey] || 0) + 1;
        weeklyRegistrations[weekKey] = (weeklyRegistrations[weekKey] || 0) + 1;
        monthlyRegistrations[monthKey] = (monthlyRegistrations[monthKey] || 0) + 1;
      });

      return {
        total: users.length,
        daily: dailyRegistrations,
        weekly: weeklyRegistrations,
        monthly: monthlyRegistrations,
        trend: this.calculateTrend(Object.values(dailyRegistrations))
      };
    } catch (error) {
      logger.error('Error getting new registrations:', error);
      throw error;
    }
  }

  // Get profile completion metrics
  async getProfileCompletions(startDate, endDate) {
    try {
      const users = await User.search({
        startDate,
        endDate,
        includeInactive: true
      });

      const completionRanges = {
        '0-20%': 0,
        '21-40%': 0,
        '41-60%': 0,
        '61-80%': 0,
        '81-100%': 0
      };

      let totalCompletion = 0;

      users.forEach(user => {
        const completion = user.profileCompletion || 0;
        totalCompletion += completion;

        if (completion <= 20) completionRanges['0-20%']++;
        else if (completion <= 40) completionRanges['21-40%']++;
        else if (completion <= 60) completionRanges['41-60%']++;
        else if (completion <= 80) completionRanges['61-80%']++;
        else completionRanges['81-100%']++;
      });

      return {
        totalUsers: users.length,
        averageCompletion: users.length > 0 ? Math.round(totalCompletion / users.length) : 0,
        completionRanges,
        fullyCompleted: completionRanges['81-100%']
      };
    } catch (error) {
      logger.error('Error getting profile completions:', error);
      throw error;
    }
  }

  // Calculate user retention
  async calculateUserRetention(startDate, endDate) {
    try {
      const users = await User.search({
        startDate,
        endDate,
        includeInactive: true
      });

      const retentionData = {
        '1_day': 0,
        '7_days': 0,
        '30_days': 0,
        '90_days': 0
      };

      const now = new Date();
      users.forEach(user => {
        const lastLogin = new Date(user.last_login || user.created_at);
        const daysSinceLogin = Math.floor((now - lastLogin) / (1000 * 60 * 60 * 24));

        if (daysSinceLogin <= 1) retentionData['1_day']++;
        if (daysSinceLogin <= 7) retentionData['7_days']++;
        if (daysSinceLogin <= 30) retentionData['30_days']++;
        if (daysSinceLogin <= 90) retentionData['90_days']++;
      });

      const totalUsers = users.length;
      Object.keys(retentionData).forEach(key => {
        retentionData[key] = totalUsers > 0 ? Math.round((retentionData[key] / totalUsers) * 100) : 0;
      });

      return retentionData;
    } catch (error) {
      logger.error('Error calculating user retention:', error);
      throw error;
    }
  }

  // Get user activity metrics
  async getUserActivity(startDate, endDate) {
    try {
      const [
        loginActivity,
        profileUpdates,
        connectionActivity,
        jobApplications,
        eventRegistrations
      ] = await Promise.all([
        this.getLoginActivity(startDate, endDate),
        this.getProfileUpdateActivity(startDate, endDate),
        this.getConnectionActivity(startDate, endDate),
        this.getJobApplicationActivity(startDate, endDate),
        this.getEventRegistrationActivity(startDate, endDate)
      ]);

      return {
        loginActivity,
        profileUpdates,
        connectionActivity,
        jobApplications,
        eventRegistrations
      };
    } catch (error) {
      logger.error('Error getting user activity:', error);
      throw error;
    }
  }

  // Get user segments
  async getUserSegments() {
    try {
      const users = await User.search({ includeInactive: true });

      const segments = {
        byIndustry: {},
        byLocation: {},
        byExperience: {},
        byCompanySize: {},
        byRole: {}
      };

      users.forEach(user => {
        // Industry segmentation
        if (user.industry) {
          segments.byIndustry[user.industry] = (segments.byIndustry[user.industry] || 0) + 1;
        }

        // Location segmentation
        if (user.location) {
          segments.byLocation[user.location] = (segments.byLocation[user.location] || 0) + 1;
        }

        // Experience segmentation
        if (user.totalExperience) {
          let experienceLevel = 'entry';
          if (user.totalExperience >= 5) experienceLevel = 'senior';
          else if (user.totalExperience >= 2) experienceLevel = 'mid';
          
          segments.byExperience[experienceLevel] = (segments.byExperience[experienceLevel] || 0) + 1;
        }

        // Company size segmentation
        if (user.companySize) {
          segments.byCompanySize[user.companySize] = (segments.byCompanySize[user.companySize] || 0) + 1;
        }

        // Role segmentation
        if (user.title) {
          segments.byRole[user.title] = (segments.byRole[user.title] || 0) + 1;
        }
      });

      return segments;
    } catch (error) {
      logger.error('Error getting user segments:', error);
      throw error;
    }
  }

  // Get top users
  async getTopUsers(startDate, endDate, limit = 10) {
    try {
      const users = await User.search({
        startDate,
        endDate,
        sortBy: 'profileViews',
        limit
      });

      return users.map(user => ({
        id: user.id,
        name: user.name,
        profileViews: user.profileViews || 0,
        connectionCount: user.connectionCount || 0,
        profileCompletion: user.profileCompletion || 0,
        lastActive: user.last_login || user.updated_at
      }));
    } catch (error) {
      logger.error('Error getting top users:', error);
      throw error;
    }
  }

  // Get engagement metrics
  async getEngagementMetrics(startDate, endDate) {
    try {
      const [
        connectionMetrics,
        chatMetrics,
        notificationMetrics,
        searchMetrics,
        contentMetrics
      ] = await Promise.all([
        this.getConnectionMetrics(startDate, endDate),
        this.getChatMetrics(startDate, endDate),
        this.getNotificationMetrics(startDate, endDate),
        this.getSearchMetrics(startDate, endDate),
        this.getContentMetrics(startDate, endDate)
      ]);

      return {
        connectionMetrics,
        chatMetrics,
        notificationMetrics,
        searchMetrics,
        contentMetrics
      };
    } catch (error) {
      logger.error('Error getting engagement metrics:', error);
      throw error;
    }
  }

  // Get connection metrics
  async getConnectionMetrics(startDate, endDate) {
    try {
      const connections = await Connection.getAll();
      
      const metrics = {
        totalConnections: connections.length,
        newConnections: 0,
        connectionRequests: 0,
        acceptedConnections: 0,
        rejectedConnections: 0,
        averageConnectionsPerUser: 0
      };

      connections.forEach(connection => {
        const connectionDate = new Date(connection.created_at);
        if (connectionDate >= startDate && connectionDate <= endDate) {
          metrics.newConnections++;
        }

        if (connection.status === 'pending') metrics.connectionRequests++;
        else if (connection.status === 'accepted') metrics.acceptedConnections++;
        else if (connection.status === 'rejected') metrics.rejectedConnections++;
      });

      const totalUsers = await User.getStats();
      metrics.averageConnectionsPerUser = totalUsers.total > 0 ? 
        Math.round(metrics.totalConnections / totalUsers.total) : 0;

      return metrics;
    } catch (error) {
      logger.error('Error getting connection metrics:', error);
      throw error;
    }
  }

  // Get chat metrics
  async getChatMetrics(startDate, endDate) {
    try {
      const messages = await Chat.getAll();
      
      const metrics = {
        totalMessages: messages.length,
        activeConversations: 0,
        averageMessagesPerConversation: 0,
        messageActivity: {}
      };

      const conversations = new Set();
      messages.forEach(message => {
        conversations.add(message.conversation_id);
        
        const messageDate = new Date(message.created_at);
        const dayKey = messageDate.toISOString().split('T')[0];
        metrics.messageActivity[dayKey] = (metrics.messageActivity[dayKey] || 0) + 1;
      });

      metrics.activeConversations = conversations.size;
      metrics.averageMessagesPerConversation = conversations.size > 0 ? 
        Math.round(messages.length / conversations.size) : 0;

      return metrics;
    } catch (error) {
      logger.error('Error getting chat metrics:', error);
      throw error;
    }
  }

  // Get notification metrics
  async getNotificationMetrics(startDate, endDate) {
    try {
      const notifications = await Notification.getAll();
      
      const metrics = {
        totalNotifications: notifications.length,
        notificationsByType: {},
        readRate: 0,
        deliveryRate: 0
      };

      let readCount = 0;
      notifications.forEach(notification => {
        // Count by type
        const type = notification.type || 'unknown';
        metrics.notificationsByType[type] = (metrics.notificationsByType[type] || 0) + 1;
        
        // Count read notifications
        if (notification.is_read) readCount++;
      });

      metrics.readRate = notifications.length > 0 ? 
        Math.round((readCount / notifications.length) * 100) : 0;
      metrics.deliveryRate = 95; // Mock delivery rate

      return metrics;
    } catch (error) {
      logger.error('Error getting notification metrics:', error);
      throw error;
    }
  }

  // Get business metrics
  async getBusinessMetrics(startDate, endDate) {
    try {
      const [
        jobMetrics,
        eventMetrics,
        serviceMetrics,
        investorMetrics
      ] = await Promise.all([
        this.getJobMetrics(startDate, endDate),
        this.getEventMetrics(startDate, endDate),
        this.getServiceMetrics(startDate, endDate),
        this.getInvestorMetrics(startDate, endDate)
      ]);

      return {
        jobMetrics,
        eventMetrics,
        serviceMetrics,
        investorMetrics
      };
    } catch (error) {
      logger.error('Error getting business metrics:', error);
      throw error;
    }
  }

  // Get job metrics
  async getJobMetrics(startDate, endDate) {
    try {
      const jobs = await Job.getAll();
      const applications = await Job.getAllApplications();
      
      const metrics = {
        totalJobs: jobs.length,
        activeJobs: 0,
        totalApplications: applications.length,
        averageApplicationsPerJob: 0,
        jobFillRate: 0,
        jobsByCategory: {},
        jobsByLocation: {}
      };

      let activeJobsCount = 0;
      let filledJobsCount = 0;

      jobs.forEach(job => {
        if (job.status === 'active') activeJobsCount++;
        if (job.status === 'filled') filledJobsCount++;

        // Count by category
        if (job.category) {
          metrics.jobsByCategory[job.category] = (metrics.jobsByCategory[job.category] || 0) + 1;
        }

        // Count by location
        if (job.location) {
          metrics.jobsByLocation[job.location] = (metrics.jobsByLocation[job.location] || 0) + 1;
        }
      });

      metrics.activeJobs = activeJobsCount;
      metrics.averageApplicationsPerJob = jobs.length > 0 ? 
        Math.round(applications.length / jobs.length) : 0;
      metrics.jobFillRate = jobs.length > 0 ? 
        Math.round((filledJobsCount / jobs.length) * 100) : 0;

      return metrics;
    } catch (error) {
      logger.error('Error getting job metrics:', error);
      throw error;
    }
  }

  // Get event metrics
  async getEventMetrics(startDate, endDate) {
    try {
      const events = await Event.getAll();
      const registrations = await Event.getAllRegistrations();
      
      const metrics = {
        totalEvents: events.length,
        upcomingEvents: 0,
        totalRegistrations: registrations.length,
        averageRegistrationsPerEvent: 0,
        eventsByType: {},
        eventsByMode: {}
      };

      let upcomingCount = 0;
      events.forEach(event => {
        if (new Date(event.startDate) > new Date()) {
          upcomingCount++;
        }

        // Count by type
        if (event.eventType) {
          metrics.eventsByType[event.eventType] = (metrics.eventsByType[event.eventType] || 0) + 1;
        }

        // Count by mode
        if (event.eventMode) {
          metrics.eventsByMode[event.eventMode] = (metrics.eventsByMode[event.eventMode] || 0) + 1;
        }
      });

      metrics.upcomingEvents = upcomingCount;
      metrics.averageRegistrationsPerEvent = events.length > 0 ? 
        Math.round(registrations.length / events.length) : 0;

      return metrics;
    } catch (error) {
      logger.error('Error getting event metrics:', error);
      throw error;
    }
  }

  // Get growth metrics
  async getGrowthMetrics(startDate, endDate) {
    try {
      const [
        userGrowth,
        jobGrowth,
        eventGrowth,
        serviceGrowth
      ] = await Promise.all([
        this.calculateGrowthRate('users', startDate, endDate),
        this.calculateGrowthRate('jobs', startDate, endDate),
        this.calculateGrowthRate('events', startDate, endDate),
        this.calculateGrowthRate('services', startDate, endDate)
      ]);

      return {
        userGrowth,
        jobGrowth,
        eventGrowth,
        serviceGrowth
      };
    } catch (error) {
      logger.error('Error getting growth metrics:', error);
      throw error;
    }
  }

  // Calculate growth rate for a metric
  async calculateGrowthRate(metric, startDate, endDate) {
    try {
      // This would typically query historical data
      // For now, return mock growth rates
      const mockGrowthRates = {
        users: 15.5,
        jobs: 8.2,
        events: 12.7,
        services: 6.8
      };

      return {
        metric,
        growthRate: mockGrowthRates[metric] || 0,
        period: `${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}`
      };
    } catch (error) {
      logger.error(`Error calculating growth rate for ${metric}:`, error);
      throw error;
    }
  }

  // Get geographic metrics
  async getGeographicMetrics(startDate, endDate) {
    try {
      const users = await User.search({ includeInactive: true });
      
      const geographicData = {
        topCountries: {},
        topCities: {},
        userDistribution: {},
        activityByLocation: {}
      };

      users.forEach(user => {
        if (user.country) {
          geographicData.topCountries[user.country] = (geographicData.topCountries[user.country] || 0) + 1;
        }
        
        if (user.city) {
          geographicData.topCities[user.city] = (geographicData.topCities[user.city] || 0) + 1;
        }
      });

      // Sort and get top locations
      geographicData.topCountries = this.sortObjectByValue(geographicData.topCountries, 10);
      geographicData.topCities = this.sortObjectByValue(geographicData.topCities, 10);

      return geographicData;
    } catch (error) {
      logger.error('Error getting geographic metrics:', error);
      throw error;
    }
  }

  // Get performance metrics
  async getPerformanceMetrics(startDate, endDate) {
    try {
      const metrics = {
        systemHealth: await this.getSystemHealth(),
        responseTimes: await this.getResponseTimes(),
        errorRates: await this.getErrorRates(),
        uptime: await this.getUptime()
      };

      return metrics;
    } catch (error) {
      logger.error('Error getting performance metrics:', error);
      throw error;
    }
  }

  // Get system health
  async getSystemHealth() {
    try {
      // This would typically check various system components
      return {
        database: 'healthy',
        cache: 'healthy',
        externalServices: 'healthy',
        overall: 'healthy',
        lastChecked: new Date()
      };
    } catch (error) {
      logger.error('Error getting system health:', error);
      throw error;
    }
  }

  // Get response times
  async getResponseTimes() {
    try {
      // This would typically query performance monitoring data
      return {
        average: 150, // ms
        p95: 300,     // ms
        p99: 500,     // ms
        lastUpdated: new Date()
      };
    } catch (error) {
      logger.error('Error getting response times:', error);
      throw error;
    }
  }

  // Get error rates
  async getErrorRates() {
    try {
      // This would typically query error logs
      return {
        totalErrors: 0,
        errorRate: 0.01, // 1%
        lastUpdated: new Date()
      };
    } catch (error) {
      logger.error('Error getting error rates:', error);
      throw error;
    }
  }

  // Get uptime
  async getUptime() {
    try {
      // This would typically query uptime monitoring data
      return {
        current: 99.9, // %
        last24Hours: 99.8,
        last7Days: 99.7,
        last30Days: 99.6
      };
    } catch (error) {
      logger.error('Error getting uptime:', error);
      throw error;
    }
  }

  // Generate custom report
  async generateCustomReport(reportConfig) {
    try {
      const {
        metrics = [],
        filters = {},
        startDate,
        endDate,
        format = 'json'
      } = reportConfig;

      const reportData = {};

      for (const metric of metrics) {
        switch (metric) {
          case 'users':
            reportData.users = await this.getUserMetrics(startDate, endDate);
            break;
          case 'jobs':
            reportData.jobs = await this.getJobMetrics(startDate, endDate);
            break;
          case 'events':
            reportData.events = await this.getEventMetrics(startDate, endDate);
            break;
          case 'engagement':
            reportData.engagement = await this.getEngagementMetrics(startDate, endDate);
            break;
          case 'growth':
            reportData.growth = await this.getGrowthMetrics(startDate, endDate);
            break;
          default:
            logger.warn(`Unknown metric: ${metric}`);
        }
      }

      // Apply filters if specified
      if (Object.keys(filters).length > 0) {
        reportData.filters = filters;
      }

      reportData.generatedAt = new Date();
      reportData.reportConfig = reportConfig;

      return reportData;
    } catch (error) {
      logger.error('Error generating custom report:', error);
      throw error;
    }
  }

  // Export analytics data
  async exportAnalyticsData(analyticsType, options = {}) {
    try {
      const {
        format = 'json',
        startDate,
        endDate,
        filters = {}
      } = options;

      let data;
      switch (analyticsType) {
        case 'users':
          data = await this.getUserMetrics(startDate, endDate);
          break;
        case 'jobs':
          data = await this.getJobMetrics(startDate, endDate);
          break;
        case 'events':
          data = await this.getEventMetrics(startDate, endDate);
          break;
        case 'engagement':
          data = await this.getEngagementMetrics(startDate, endDate);
          break;
        case 'platform':
          data = await this.getPlatformAnalytics({ startDate, endDate });
          break;
        default:
          throw new Error(`Unknown analytics type: ${analyticsType}`);
      }

      // Apply filters
      if (Object.keys(filters).length > 0) {
        data = this.applyFilters(data, filters);
      }

      // Format data based on export format
      switch (format) {
        case 'json':
          return JSON.stringify(data, null, 2);
        case 'csv':
          return this.convertToCSV(data);
        default:
          return data;
      }
    } catch (error) {
      logger.error('Error exporting analytics data:', error);
      throw error;
    }
  }

  // Utility methods

  getWeekKey(date) {
    const year = date.getFullYear();
    const week = Math.ceil((date.getDate() + new Date(year, date.getMonth(), 1).getDay()) / 7);
    return `${year}-W${String(week).padStart(2, '0')}`;
  }

  calculateTrend(values) {
    if (values.length < 2) return 'stable';
    
    const recent = values.slice(-7);
    const previous = values.slice(-14, -7);
    
    const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
    const previousAvg = previous.reduce((a, b) => a + b, 0) / previous.length;
    
    if (recentAvg > previousAvg * 1.1) return 'increasing';
    if (recentAvg < previousAvg * 0.9) return 'decreasing';
    return 'stable';
  }

  sortObjectByValue(obj, limit = 10) {
    return Object.entries(obj)
      .sort(([,a], [,b]) => b - a)
      .slice(0, limit)
      .reduce((r, [k, v]) => ({ ...r, [k]: v }), {});
  }

  applyFilters(data, filters) {
    // This would implement filtering logic based on filter criteria
    return data;
  }

  convertToCSV(data) {
    // This would implement CSV conversion logic
    return 'CSV conversion not implemented yet';
  }

  // Clear cache
  clearCache() {
    this.cache.clear();
    logger.info('Analytics cache cleared');
    return { message: 'Cache cleared successfully' };
  }

  // Get cache statistics
  getCacheStats() {
    const stats = {
      totalEntries: this.cache.size,
      memoryUsage: process.memoryUsage(),
      cacheTimeout: this.cacheTimeout
    };

    return stats;
  }
}

module.exports = AnalyticsService;
