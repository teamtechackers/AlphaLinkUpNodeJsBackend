'use strict';

const SearchService = require('../services/SearchService');
const UserService = require('../services/UserService');
const JobService = require('../services/JobService');
const EventService = require('../services/EventService');
const { logger } = require('../utils/logger');
const { successResponse, errorResponse } = require('../utils/response');

class SearchController {
  // Global search across all entities
  static async globalSearch(req, res) {
    try {
      const { q, page = 1, limit = 20, filters, sort_by = 'relevance', sort_order = 'desc' } = req.query;
      
      if (!q || q.trim().length === 0) {
        return errorResponse(res, 'Search query is required', 400);
      }

      const results = await SearchService.globalSearch(q, {
        page: parseInt(page),
        limit: parseInt(limit),
        filters: filters ? JSON.parse(filters) : {},
        sortBy: sort_by,
        sortOrder: sort_order
      });

      return successResponse(res, 'Global search completed successfully', { results });
    } catch (error) {
      logger.error('Global search error:', error);
      return errorResponse(res, 'Search failed', 500);
    }
  }

  // Search users
  static async searchUsers(req, res) {
    try {
      const { q, page = 1, limit = 20, filters, sort_by = 'relevance', sort_order = 'desc' } = req.query;
      
      if (!q || q.trim().length === 0) {
        return errorResponse(res, 'Search query is required', 400);
      }

      const results = await SearchService.searchUsers(q, {
        page: parseInt(page),
        limit: parseInt(limit),
        filters: filters ? JSON.parse(filters) : {},
        sortBy: sort_by,
        sortOrder: sort_order
      });

      return successResponse(res, 'User search completed successfully', { results });
    } catch (error) {
      logger.error('Search users error:', error);
      return errorResponse(res, 'User search failed', 500);
    }
  }

  // Search jobs
  static async searchJobs(req, res) {
    try {
      const { q, page = 1, limit = 20, filters, sort_by = 'relevance', sort_order = 'desc' } = req.query;
      
      if (!q || q.trim().length === 0) {
        return errorResponse(res, 'Search query is required', 400);
      }

      const results = await SearchService.searchJobs(q, {
        page: parseInt(page),
        limit: parseInt(limit),
        filters: filters ? JSON.parse(filters) : {},
        sortBy: sort_by,
        sortOrder: sort_order
      });

      return successResponse(res, 'Job search completed successfully', { results });
    } catch (error) {
      logger.error('Search jobs error:', error);
      return errorResponse(res, 'Job search failed', 500);
    }
  }

  // Search events
  static async searchEvents(req, res) {
    try {
      const { q, page = 1, limit = 20, filters, sort_by = 'relevance', sort_order = 'desc' } = req.query;
      
      if (!q || q.trim().length === 0) {
        return errorResponse(res, 'Search query is required', 400);
      }

      const results = await SearchService.searchEvents(q, {
        page: parseInt(page),
        limit: parseInt(limit),
        filters: filters ? JSON.parse(filters) : {},
        sortBy: sort_by,
        sortOrder: sort_order
      });

      return successResponse(res, 'Event search completed successfully', { results });
    } catch (error) {
      logger.error('Search events error:', error);
      return errorResponse(res, 'Event search failed', 500);
    }
  }

  // Search services
  static async searchServices(req, res) {
    try {
      const { q, page = 1, limit = 20, filters, sort_by = 'relevance', sort_order = 'desc' } = req.query;
      
      if (!q || q.trim().length === 0) {
        return errorResponse(res, 'Search query is required', 400);
      }

      const results = await SearchService.searchServices(q, {
        page: parseInt(page),
        limit: parseInt(limit),
        filters: filters ? JSON.parse(filters) : {},
        sortBy: sort_by,
        sortOrder: sort_order
      });

      return successResponse(res, 'Service search completed successfully', { results });
    } catch (error) {
      logger.error('Search services error:', error);
      return errorResponse(res, 'Service search failed', 500);
    }
  }

  // Search investors
  static async searchInvestors(req, res) {
    try {
      const { q, page = 1, limit = 20, filters, sort_by = 'relevance', sort_order = 'desc' } = req.query;
      
      if (!q || q.trim().length === 0) {
        return errorResponse(res, 'Search query is required', 400);
      }

      const results = await SearchService.searchInvestors(q, {
        page: parseInt(page),
        limit: parseInt(limit),
        filters: filters ? JSON.parse(filters) : {},
        sortBy: sort_by,
        sortOrder: sort_order
      });

      return successResponse(res, 'Investor search completed successfully', { results });
    } catch (error) {
      logger.error('Search investors error:', error);
      return errorResponse(res, 'Investor search failed', 500);
    }
  }

  // Search projects
  static async searchProjects(req, res) {
    try {
      const { q, page = 1, limit = 20, filters, sort_by = 'relevance', sort_order = 'desc' } = req.query;
      
      if (!q || q.trim().length === 0) {
        return errorResponse(res, 'Search query is required', 400);
      }

      const results = await SearchService.searchProjects(q, {
        page: parseInt(page),
        limit: parseInt(limit),
        filters: filters ? JSON.parse(filters) : {},
        sortBy: sort_by,
        sortOrder: sort_order
      });

      return successResponse(res, 'Project search completed successfully', { results });
    } catch (error) {
      logger.error('Search projects error:', error);
      return errorResponse(res, 'Project search failed', 500);
    }
  }

  // Get search suggestions
  static async getSearchSuggestions(req, res) {
    try {
      const { q, type, limit = 10 } = req.query;
      
      if (!q || q.trim().length === 0) {
        return errorResponse(res, 'Search query is required', 400);
      }

      const suggestions = await SearchService.getSearchSuggestions(q, {
        type,
        limit: parseInt(limit)
      });

      return successResponse(res, 'Search suggestions retrieved successfully', { suggestions });
    } catch (error) {
      logger.error('Get search suggestions error:', error);
      return errorResponse(res, 'Failed to retrieve search suggestions', 500);
    }
  }

  // Get search filters
  static async getSearchFilters(req, res) {
    try {
      const { type } = req.query;

      const filters = await SearchService.getSearchFilters(type);
      
      return successResponse(res, 'Search filters retrieved successfully', { filters });
    } catch (error) {
      logger.error('Get search filters error:', error);
      return errorResponse(res, 'Failed to retrieve search filters', 500);
    }
  }

  // Get search analytics
  static async getSearchAnalytics(req, res) {
    try {
      const userId = req.user?.id;
      const { startDate, endDate, groupBy } = req.query;

      const analytics = await SearchService.getSearchAnalytics(userId, {
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        groupBy: groupBy || 'day'
      });
      
      return successResponse(res, 'Search analytics retrieved successfully', { analytics });
    } catch (error) {
      logger.error('Get search analytics error:', error);
      return errorResponse(res, 'Failed to retrieve search analytics', 500);
    }
  }

  // Get popular searches
  static async getPopularSearches(req, res) {
    try {
      const { type, period = '7d', limit = 20 } = req.query;

      const searches = await SearchService.getPopularSearches({
        type,
        period,
        limit: parseInt(limit)
      });
      
      return successResponse(res, 'Popular searches retrieved successfully', { searches });
    } catch (error) {
      logger.error('Get popular searches error:', error);
      return errorResponse(res, 'Failed to retrieve popular searches', 500);
    }
  }

  // Get trending searches
  static async getTrendingSearches(req, res) {
    try {
      const { type, period = '24h', limit = 20 } = req.query;

      const searches = await SearchService.getTrendingSearches({
        type,
        period,
        limit: parseInt(limit)
      });
      
      return successResponse(res, 'Trending searches retrieved successfully', { searches });
    } catch (error) {
      logger.error('Get trending searches error:', error);
      return errorResponse(res, 'Failed to retrieve trending searches', 500);
    }
  }

  // Get search history
  static async getSearchHistory(req, res) {
    try {
      const userId = req.user.id;
      const { page = 1, limit = 20, type, sort_by = 'searched_at', sort_order = 'desc' } = req.query;

      const history = await SearchService.getSearchHistory(userId, {
        page: parseInt(page),
        limit: parseInt(limit),
        type,
        sortBy: sort_by,
        sortOrder: sort_order
      });
      
      return successResponse(res, 'Search history retrieved successfully', { history });
    } catch (error) {
      logger.error('Get search history error:', error);
      return errorResponse(res, 'Failed to retrieve search history', 500);
    }
  }

  // Clear search history
  static async clearSearchHistory(req, res) {
    try {
      const userId = req.user.id;
      const { type } = req.query;

      const result = await SearchService.clearSearchHistory(userId, type);
      
      logger.info(`Search history cleared for user ${userId}`);
      return successResponse(res, 'Search history cleared successfully', { result });
    } catch (error) {
      logger.error('Clear search history error:', error);
      return errorResponse(res, 'Failed to clear search history', 500);
    }
  }

  // Save search query
  static async saveSearchQuery(req, res) {
    try {
      const userId = req.user.id;
      const { query, type, filters } = req.body;

      if (!query || query.trim().length === 0) {
        return errorResponse(res, 'Search query is required', 400);
      }

      const savedQuery = await SearchService.saveSearchQuery(userId, {
        query,
        type,
        filters
      });
      
      logger.info(`Search query saved by user ${userId}: ${query}`);
      return successResponse(res, 'Search query saved successfully', { savedQuery }, 201);
    } catch (error) {
      logger.error('Save search query error:', error);
      
      if (error.message.includes('Query already saved')) {
        return errorResponse(res, 'This search query is already saved', 400);
      }
      
      return errorResponse(res, 'Failed to save search query', 500);
    }
  }

  // Get saved search queries
  static async getSavedSearchQueries(req, res) {
    try {
      const userId = req.user.id;
      const { page = 1, limit = 20, type, sort_by = 'saved_at', sort_order = 'desc' } = req.query;

      const queries = await SearchService.getSavedSearchQueries(userId, {
        page: parseInt(page),
        limit: parseInt(limit),
        type,
        sortBy: sort_by,
        sortOrder: sort_order
      });
      
      return successResponse(res, 'Saved search queries retrieved successfully', { queries });
    } catch (error) {
      logger.error('Get saved search queries error:', error);
      return errorResponse(res, 'Failed to retrieve saved search queries', 500);
    }
  }

  // Delete saved search query
  static async deleteSavedSearchQuery(req, res) {
    try {
      const userId = req.user.id;
      const { queryId } = req.params;

      await SearchService.deleteSavedSearchQuery(queryId, userId);
      
      logger.info(`Saved search query ${queryId} deleted by user ${userId}`);
      return successResponse(res, 'Saved search query deleted successfully');
    } catch (error) {
      logger.error('Delete saved search query error:', error);
      
      if (error.message.includes('Query not found')) {
        return errorResponse(res, 'Saved search query not found', 404);
      }
      
      if (error.message.includes('not authorized')) {
        return errorResponse(res, 'You are not authorized to delete this query', 403);
      }
      
      return errorResponse(res, 'Failed to delete saved search query', 500);
    }
  }

  // Get search recommendations
  static async getSearchRecommendations(req, res) {
    try {
      const userId = req.user.id;
      const { type, limit = 10 } = req.query;

      const recommendations = await SearchService.getSearchRecommendations(userId, {
        type,
        limit: parseInt(limit)
      });
      
      return successResponse(res, 'Search recommendations retrieved successfully', { recommendations });
    } catch (error) {
      logger.error('Get search recommendations error:', error);
      return errorResponse(res, 'Failed to retrieve search recommendations', 500);
    }
  }

  // Get search insights
  static async getSearchInsights(req, res) {
    try {
      const userId = req.user.id;
      const { startDate, endDate } = req.query;

      const insights = await SearchService.getSearchInsights(userId, {
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null
      });
      
      return successResponse(res, 'Search insights retrieved successfully', { insights });
    } catch (error) {
      logger.error('Get search insights error:', error);
      return errorResponse(res, 'Failed to retrieve search insights', 500);
    }
  }

  // Export search results
  static async exportSearchResults(req, res) {
    try {
      const { q, type, format = 'json', filters } = req.query;
      
      if (!q || q.trim().length === 0) {
        return errorResponse(res, 'Search query is required', 400);
      }

      const data = await SearchService.exportSearchResults(q, {
        type,
        format,
        filters: filters ? JSON.parse(filters) : {}
      });

      if (format === 'json') {
        return successResponse(res, 'Search results exported successfully', { data });
      } else {
        // For CSV format, set appropriate headers
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="search_${type || 'all'}.csv"`);
        return res.send(data);
      }
    } catch (error) {
      logger.error('Export search results error:', error);
      return errorResponse(res, 'Failed to export search results', 500);
    }
  }

  // Get search performance metrics
  static async getSearchPerformanceMetrics(req, res) {
    try {
      const { startDate, endDate, groupBy } = req.query;

      const metrics = await SearchService.getSearchPerformanceMetrics({
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        groupBy: groupBy || 'hour'
      });
      
      return successResponse(res, 'Search performance metrics retrieved successfully', { metrics });
    } catch (error) {
      logger.error('Get search performance metrics error:', error);
      return errorResponse(res, 'Failed to retrieve search performance metrics', 500);
    }
  }

  // Get search relevance scores
  static async getSearchRelevanceScores(req, res) {
    try {
      const { q, type, entityId } = req.query;
      
      if (!q || q.trim().length === 0) {
        return errorResponse(res, 'Search query is required', 400);
      }

      const scores = await SearchService.getSearchRelevanceScores(q, type, entityId);
      
      return successResponse(res, 'Search relevance scores retrieved successfully', { scores });
    } catch (error) {
      logger.error('Get search relevance scores error:', error);
      return errorResponse(res, 'Failed to retrieve search relevance scores', 500);
    }
  }

  // Update search relevance
  static async updateSearchRelevance(req, res) {
    try {
      const userId = req.user.id;
      const { query, entityType, entityId, relevance } = req.body;

      if (!query || !entityType || !entityId || relevance === undefined) {
        return errorResponse(res, 'Query, entity type, entity ID, and relevance are required', 400);
      }

      const result = await SearchService.updateSearchRelevance(userId, {
        query,
        entityType,
        entityId,
        relevance
      });
      
      logger.info(`Search relevance updated by user ${userId} for ${entityType} ${entityId}`);
      return successResponse(res, 'Search relevance updated successfully', { result });
    } catch (error) {
      logger.error('Update search relevance error:', error);
      
      if (error.message.includes('Invalid relevance score')) {
        return errorResponse(res, 'Invalid relevance score', 400);
      }
      
      return errorResponse(res, 'Failed to update search relevance', 500);
    }
  }

  // Get search suggestions for autocomplete
  static async getAutocompleteSuggestions(req, res) {
    try {
      const { q, type, limit = 5 } = req.query;
      
      if (!q || q.trim().length === 0) {
        return errorResponse(res, 'Search query is required', 400);
      }

      const suggestions = await SearchService.getAutocompleteSuggestions(q, {
        type,
        limit: parseInt(limit)
      });
      
      return successResponse(res, 'Autocomplete suggestions retrieved successfully', { suggestions });
    } catch (error) {
      logger.error('Get autocomplete suggestions error:', error);
      return errorResponse(res, 'Failed to retrieve autocomplete suggestions', 500);
    }
  }

  // Get search facets
  static async getSearchFacets(req, res) {
    try {
      const { q, type, filters } = req.query;
      
      if (!q || q.trim().length === 0) {
        return errorResponse(res, 'Search query is required', 400);
      }

      const facets = await SearchService.getSearchFacets(q, {
        type,
        filters: filters ? JSON.parse(filters) : {}
      });
      
      return successResponse(res, 'Search facets retrieved successfully', { facets });
    } catch (error) {
      logger.error('Get search facets error:', error);
      return errorResponse(res, 'Failed to retrieve search facets', 500);
    }
  }
}

module.exports = SearchController;
