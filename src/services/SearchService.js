'use strict';

const User = require('../models/User');
const Job = require('../models/Job');
const Event = require('../models/Event');
const ServiceProvider = require('../models/ServiceProvider');
const Investor = require('../models/Investor');
const Project = require('../models/Project');
const { logger } = require('../utils/logger');

class SearchService {
  constructor() {
    this.searchIndexes = new Map();
    this.searchHistory = new Map();
    this.initializeSearchIndexes();
  }

  // Initialize search indexes
  async initializeSearchIndexes() {
    try {
      // Initialize indexes for different entity types
      this.searchIndexes.set('users', new Map());
      this.searchIndexes.set('jobs', new Map());
      this.searchIndexes.set('events', new Map());
      this.searchIndexes.set('services', new Map());
      this.searchIndexes.set('investors', new Map());
      this.searchIndexes.set('projects', new Map());

      logger.info('Search indexes initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize search indexes:', error);
    }
  }

  // Global search across all entities
  async globalSearch(searchTerm, options = {}) {
    try {
      const {
        filters = {},
        sortBy = 'relevance',
        page = 1,
        limit = 20,
        includeInactive = false,
        userId = null
      } = options;

      // Validate search term
      if (!searchTerm || searchTerm.trim().length < 2) {
        throw new Error('Search term must be at least 2 characters long');
      }

      // Perform searches across all entity types
      const searchPromises = [
        this.searchUsers(searchTerm, { ...filters, page, limit, includeInactive, userId }),
        this.searchJobs(searchTerm, { ...filters, page, limit, includeInactive, userId }),
        this.searchEvents(searchTerm, { ...filters, page, limit, includeInactive, userId }),
        this.searchServices(searchTerm, { ...filters, page, limit, includeInactive, userId }),
        this.searchInvestors(searchTerm, { ...filters, page, limit, includeInactive, userId }),
        this.searchProjects(searchTerm, { ...filters, page, limit, includeInactive, userId })
      ];

      const results = await Promise.allSettled(searchPromises);
      
      // Combine and process results
      const combinedResults = this.combineSearchResults(results, searchTerm);
      
      // Sort combined results
      const sortedResults = this.sortGlobalResults(combinedResults, sortBy);
      
      // Apply pagination
      const paginatedResults = this.paginateResults(sortedResults, page, limit);
      
      // Log search activity
      if (userId) {
        this.logSearchActivity(userId, searchTerm, 'global', results.length);
      }

      return {
        query: searchTerm,
        totalResults: sortedResults.length,
        page,
        limit,
        totalPages: Math.ceil(sortedResults.length / limit),
        results: paginatedResults,
        facets: this.generateSearchFacets(sortedResults),
        suggestions: await this.generateSearchSuggestions(searchTerm)
      };
    } catch (error) {
      logger.error('Error in global search:', error);
      throw error;
    }
  }

  // Search users
  async searchUsers(searchTerm, options = {}) {
    try {
      const {
        filters = {},
        sortBy = 'relevance',
        page = 1,
        limit = 20,
        includeInactive = false,
        userId = null
      } = options;

      // Build search criteria
      const searchCriteria = {
        searchTerm,
        ...filters,
        includeInactive,
        excludeUserId: userId // Exclude current user from results
      };

      // Perform search
      const users = await User.search(searchCriteria);
      
      // Calculate relevance scores
      const scoredUsers = users.map(user => ({
        ...user,
        relevanceScore: this.calculateUserRelevance(user, searchTerm, filters),
        entityType: 'user'
      }));

      // Sort by relevance
      const sortedUsers = this.sortByRelevance(scoredUsers, sortBy);
      
      // Apply pagination
      const paginatedUsers = this.paginateResults(sortedUsers, page, limit);

      return {
        entityType: 'users',
        total: users.length,
        results: paginatedUsers,
        facets: this.generateUserFacets(users)
      };
    } catch (error) {
      logger.error('Error searching users:', error);
      throw error;
    }
  }

  // Search jobs
  async searchJobs(searchTerm, options = {}) {
    try {
      const {
        filters = {},
        sortBy = 'relevance',
        page = 1,
        limit = 20,
        includeInactive = false,
        userId = null
      } = options;

      // Build search criteria
      const searchCriteria = {
        searchTerm,
        ...filters,
        includeInactive
      };

      // Perform search
      const jobs = await Job.search(searchCriteria);
      
      // Calculate relevance scores
      const scoredJobs = jobs.map(job => ({
        ...job,
        relevanceScore: this.calculateJobRelevance(job, searchTerm, filters),
        entityType: 'job'
      }));

      // Sort by relevance
      const sortedJobs = this.sortByRelevance(scoredJobs, sortBy);
      
      // Apply pagination
      const paginatedJobs = this.paginateResults(sortedJobs, page, limit);

      return {
        entityType: 'jobs',
        total: jobs.length,
        results: paginatedJobs,
        facets: this.generateJobFacets(jobs)
      };
    } catch (error) {
      logger.error('Error searching jobs:', error);
      throw error;
    }
  }

  // Search events
  async searchEvents(searchTerm, options = {}) {
    try {
      const {
        filters = {},
        sortBy = 'relevance',
        page = 1,
        limit = 20,
        includeInactive = false,
        userId = null
      } = options;

      // Build search criteria
      const searchCriteria = {
        searchTerm,
        ...filters,
        includeInactive
      };

      // Perform search
      const events = await Event.search(searchCriteria);
      
      // Calculate relevance scores
      const scoredEvents = events.map(event => ({
        ...event,
        relevanceScore: this.calculateEventRelevance(event, searchTerm, filters),
        entityType: 'event'
      }));

      // Sort by relevance
      const sortedEvents = this.sortByRelevance(scoredEvents, sortBy);
      
      // Apply pagination
      const paginatedEvents = this.paginateResults(sortedEvents, page, limit);

      return {
        entityType: 'events',
        total: events.length,
        results: paginatedEvents,
        facets: this.generateEventFacets(events)
      };
    } catch (error) {
      logger.error('Error searching events:', error);
      throw error;
    }
  }

  // Search services
  async searchServices(searchTerm, options = {}) {
    try {
      const {
        filters = {},
        sortBy = 'relevance',
        page = 1,
        limit = 20,
        includeInactive = false,
        userId = null
      } = options;

      // Build search criteria
      const searchCriteria = {
        searchTerm,
        ...filters,
        includeInactive
      };

      // Perform search
      const services = await ServiceProvider.search(searchCriteria);
      
      // Calculate relevance scores
      const scoredServices = services.map(service => ({
        ...service,
        relevanceScore: this.calculateServiceRelevance(service, searchTerm, filters),
        entityType: 'service'
      }));

      // Sort by relevance
      const sortedServices = this.sortByRelevance(scoredServices, sortBy);
      
      // Apply pagination
      const paginatedServices = this.paginateResults(sortedServices, page, limit);

      return {
        entityType: 'services',
        total: services.length,
        results: paginatedServices,
        facets: this.generateServiceFacets(services)
      };
    } catch (error) {
      logger.error('Error searching services:', error);
      throw error;
    }
  }

  // Search investors
  async searchInvestors(searchTerm, options = {}) {
    try {
      const {
        filters = {},
        sortBy = 'relevance',
        page = 1,
        limit = 20,
        includeInactive = false,
        userId = null
      } = options;

      // Build search criteria
      const searchCriteria = {
        searchTerm,
        ...filters,
        includeInactive
      };

      // Perform search
      const investors = await Investor.search(searchCriteria);
      
      // Calculate relevance scores
      const scoredInvestors = investors.map(investor => ({
        ...investor,
        relevanceScore: this.calculateInvestorRelevance(investor, searchTerm, filters),
        entityType: 'investor'
      }));

      // Sort by relevance
      const sortedInvestors = this.sortByRelevance(scoredInvestors, sortBy);
      
      // Apply pagination
      const paginatedInvestors = this.paginateResults(sortedInvestors, page, limit);

      return {
        entityType: 'investors',
        total: investors.length,
        results: paginatedInvestors,
        facets: this.generateInvestorFacets(investors)
      };
    } catch (error) {
      logger.error('Error searching investors:', error);
      throw error;
    }
  }

  // Search projects
  async searchProjects(searchTerm, options = {}) {
    try {
      const {
        filters = {},
        sortBy = 'relevance',
        page = 1,
        limit = 20,
        includeInactive = false,
        userId = null
      } = options;

      // Build search criteria
      const searchCriteria = {
        searchTerm,
        ...filters,
        includeInactive
      };

      // Perform search
      const projects = await Project.search(searchCriteria);
      
      // Calculate relevance scores
      const scoredProjects = projects.map(project => ({
        ...project,
        relevanceScore: this.calculateProjectRelevance(project, searchTerm, filters),
        entityType: 'project'
      }));

      // Sort by relevance
      const sortedProjects = this.sortByRelevance(scoredProjects, sortBy);
      
      // Apply pagination
      const paginatedProjects = this.paginateResults(sortedProjects, page, limit);

      return {
        entityType: 'projects',
        total: projects.length,
        results: paginatedProjects,
        facets: this.generateProjectFacets(projects)
      };
    } catch (error) {
      logger.error('Error searching projects:', error);
      throw error;
    }
  }

  // Calculate user relevance score
  calculateUserRelevance(user, searchTerm, filters) {
    let score = 0;
    const term = searchTerm.toLowerCase();

    // Name matching (highest weight)
    if (user.name && user.name.toLowerCase().includes(term)) {
      score += 100;
      if (user.name.toLowerCase().startsWith(term)) {
        score += 50; // Bonus for prefix match
      }
    }

    // Skills matching
    if (user.skills) {
      const skills = Array.isArray(user.skills) ? user.skills : [user.skills];
      skills.forEach(skill => {
        if (skill.toLowerCase().includes(term)) {
          score += 30;
        }
      });
    }

    // Location matching
    if (user.location && user.location.toLowerCase().includes(term)) {
      score += 25;
    }

    // Company matching
    if (user.company && user.company.toLowerCase().includes(term)) {
      score += 20;
    }

    // Title matching
    if (user.title && user.title.toLowerCase().includes(term)) {
      score += 15;
    }

    // Profile completeness bonus
    if (user.profileCompletion > 80) {
      score += 10;
    }

    // Connection count bonus
    if (user.connectionCount > 100) {
      score += 5;
    }

    return score;
  }

  // Calculate job relevance score
  calculateJobRelevance(job, searchTerm, filters) {
    let score = 0;
    const term = searchTerm.toLowerCase();

    // Title matching (highest weight)
    if (job.title && job.title.toLowerCase().includes(term)) {
      score += 100;
      if (job.title.toLowerCase().startsWith(term)) {
        score += 50;
      }
    }

    // Company matching
    if (job.company && job.company.toLowerCase().includes(term)) {
      score += 40;
    }

    // Description matching
    if (job.description && job.description.toLowerCase().includes(term)) {
      score += 30;
    }

    // Skills matching
    if (job.requiredSkills) {
      const skills = Array.isArray(job.requiredSkills) ? job.requiredSkills : [job.requiredSkills];
      skills.forEach(skill => {
        if (skill.toLowerCase().includes(term)) {
          score += 25;
        }
      });
    }

    // Location matching
    if (job.location && job.location.toLowerCase().includes(term)) {
      score += 20;
    }

    // Recency bonus
    const daysSincePosted = Math.floor((Date.now() - new Date(job.created_at).getTime()) / (1000 * 60 * 60 * 24));
    if (daysSincePosted <= 7) {
      score += 15;
    } else if (daysSincePosted <= 30) {
      score += 10;
    }

    return score;
  }

  // Calculate event relevance score
  calculateEventRelevance(event, searchTerm, filters) {
    let score = 0;
    const term = searchTerm.toLowerCase();

    // Title matching (highest weight)
    if (event.title && event.title.toLowerCase().includes(term)) {
      score += 100;
      if (event.title.toLowerCase().startsWith(term)) {
        score += 50;
      }
    }

    // Description matching
    if (event.description && event.description.toLowerCase().includes(term)) {
      score += 40;
    }

    // Organizer matching
    if (event.organizer && event.organizer.toLowerCase().includes(term)) {
      score += 30;
    }

    // Location matching
    if (event.location && event.location.toLowerCase().includes(term)) {
      score += 25;
    }

    // Event type matching
    if (event.eventType && event.eventType.toLowerCase().includes(term)) {
      score += 20;
    }

    // Upcoming event bonus
    if (event.startDate && new Date(event.startDate) > new Date()) {
      score += 15;
    }

    return score;
  }

  // Calculate service relevance score
  calculateServiceRelevance(service, searchTerm, filters) {
    let score = 0;
    const term = searchTerm.toLowerCase();

    // Service name matching (highest weight)
    if (service.serviceName && service.serviceName.toLowerCase().includes(term)) {
      score += 100;
      if (service.serviceName.toLowerCase().startsWith(term)) {
        score += 50;
      }
    }

    // Description matching
    if (service.description && service.description.toLowerCase().includes(term)) {
      score += 40;
    }

    // Category matching
    if (service.category && service.category.toLowerCase().includes(term)) {
      score += 35;
    }

    // Provider name matching
    if (service.providerName && service.providerName.toLowerCase().includes(term)) {
      score += 30;
    }

    // Skills matching
    if (service.skills) {
      const skills = Array.isArray(service.skills) ? service.skills : [service.skills];
      skills.forEach(skill => {
        if (skill.toLowerCase().includes(term)) {
          score += 25;
        }
      });
    }

    // Rating bonus
    if (service.averageRating > 4.0) {
      score += 10;
    }

    return score;
  }

  // Calculate investor relevance score
  calculateInvestorRelevance(investor, searchTerm, filters) {
    let score = 0;
    const term = searchTerm.toLowerCase();

    // Name matching (highest weight)
    if (investor.name && investor.name.toLowerCase().includes(term)) {
      score += 100;
      if (investor.name.toLowerCase().startsWith(term)) {
        score += 50;
      }
    }

    // Company matching
    if (investor.company && investor.company.toLowerCase().includes(term)) {
      score += 40;
    }

    // Investment focus matching
    if (investor.investmentFocus) {
      const focus = Array.isArray(investor.investmentFocus) ? investor.investmentFocus : [investor.investmentFocus];
      focus.forEach(focusArea => {
        if (focusArea.toLowerCase().includes(term)) {
          score += 35;
        }
      });
    }

    // Description matching
    if (investor.description && investor.description.toLowerCase().includes(term)) {
      score += 30;
    }

    // Location matching
    if (investor.location && investor.location.toLowerCase().includes(term)) {
      score += 25;
    }

    // Fund size bonus
    if (investor.fundSize === 'large') {
      score += 15;
    }

    return score;
  }

  // Calculate project relevance score
  calculateProjectRelevance(project, searchTerm, filters) {
    let score = 0;
    const term = searchTerm.toLowerCase();

    // Project name matching (highest weight)
    if (project.projectName && project.projectName.toLowerCase().includes(term)) {
      score += 100;
      if (project.projectName.toLowerCase().startsWith(term)) {
        score += 50;
      }
    }

    // Description matching
    if (project.description && project.description.toLowerCase().includes(term)) {
      score += 40;
    }

    // Technologies matching
    if (project.technologies) {
      const technologies = Array.isArray(project.technologies) ? project.technologies : [project.technologies];
      technologies.forEach(tech => {
        if (tech.toLowerCase().includes(term)) {
          score += 35;
        }
      });
    }

    // Category matching
    if (project.category && project.category.toLowerCase().includes(term)) {
      score += 30;
    }

    // URL matching
    if (project.projectUrl && project.projectUrl.toLowerCase().includes(term)) {
      score += 20;
    }

    // Completion status bonus
    if (project.status === 'completed') {
      score += 10;
    }

    return score;
  }

  // Sort by relevance
  sortByRelevance(results, sortBy) {
    switch (sortBy) {
      case 'relevance':
        return results.sort((a, b) => b.relevanceScore - a.relevanceScore);
      case 'date':
        return results.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      case 'name':
        return results.sort((a, b) => (a.name || a.title || '').localeCompare(b.name || b.title || ''));
      case 'popularity':
        return results.sort((a, b) => (b.views || 0) - (a.views || 0));
      default:
        return results.sort((a, b) => b.relevanceScore - a.relevanceScore);
    }
  }

  // Combine search results from different entities
  combineSearchResults(results, searchTerm) {
    const combined = [];
    
    results.forEach((result, index) => {
      if (result.status === 'fulfilled' && result.value && result.value.results) {
        combined.push(...result.value.results);
      }
    });

    return combined;
  }

  // Sort global results
  sortGlobalResults(results, sortBy) {
    return this.sortByRelevance(results, sortBy);
  }

  // Apply pagination
  paginateResults(results, page, limit) {
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    return results.slice(startIndex, endIndex);
  }

  // Generate search facets
  generateSearchFacets(results) {
    const facets = {
      entityTypes: {},
      locations: {},
      categories: {},
      skills: {},
      companies: {}
    };

    results.forEach(result => {
      // Entity type counts
      facets.entityTypes[result.entityType] = (facets.entityTypes[result.entityType] || 0) + 1;

      // Location counts
      if (result.location) {
        facets.locations[result.location] = (facets.locations[result.location] || 0) + 1;
      }

      // Category counts
      if (result.category) {
        facets.categories[result.category] = (facets.categories[result.category] || 0) + 1;
      }

      // Skills counts
      if (result.skills) {
        const skills = Array.isArray(result.skills) ? result.skills : [result.skills];
        skills.forEach(skill => {
          facets.skills[skill] = (facets.skills[skill] || 0) + 1;
        });
      }

      // Company counts
      if (result.company) {
        facets.companies[result.company] = (facets.companies[result.company] || 0) + 1;
      }
    });

    return facets;
  }

  // Generate user facets
  generateUserFacets(users) {
    const facets = {
      locations: {},
      skills: {},
      companies: {},
      titles: {},
      industries: {}
    };

    users.forEach(user => {
      if (user.location) {
        facets.locations[user.location] = (facets.locations[user.location] || 0) + 1;
      }
      if (user.skills) {
        const skills = Array.isArray(user.skills) ? user.skills : [user.skills];
        skills.forEach(skill => {
          facets.skills[skill] = (facets.skills[skill] || 0) + 1;
        });
      }
      if (user.company) {
        facets.companies[user.company] = (facets.companies[user.company] || 0) + 1;
      }
      if (user.title) {
        facets.titles[user.title] = (facets.titles[user.title] || 0) + 1;
      }
      if (user.industry) {
        facets.industries[user.industry] = (facets.industries[user.industry] || 0) + 1;
      }
    });

    return facets;
  }

  // Generate job facets
  generateJobFacets(jobs) {
    const facets = {
      locations: {},
      companies: {},
      jobTypes: {},
      experienceLevels: {},
      salaryRanges: {}
    };

    jobs.forEach(job => {
      if (job.location) {
        facets.locations[job.location] = (facets.locations[job.location] || 0) + 1;
      }
      if (job.company) {
        facets.companies[job.company] = (facets.companies[job.company] || 0) + 1;
      }
      if (job.jobType) {
        facets.jobTypes[job.jobType] = (facets.jobTypes[job.jobType] || 0) + 1;
      }
      if (job.experienceLevel) {
        facets.experienceLevels[job.experienceLevel] = (facets.experienceLevels[job.experienceLevel] || 0) + 1;
      }
      if (job.salaryRange) {
        facets.salaryRanges[job.salaryRange] = (facets.salaryRanges[job.salaryRange] || 0) + 1;
      }
    });

    return facets;
  }

  // Generate event facets
  generateEventFacets(events) {
    const facets = {
      locations: {},
      eventTypes: {},
      eventModes: {},
      organizers: {},
      dates: {}
    };

    events.forEach(event => {
      if (event.location) {
        facets.locations[event.location] = (facets.locations[event.location] || 0) + 1;
      }
      if (event.eventType) {
        facets.eventTypes[event.eventType] = (facets.eventTypes[event.eventType] || 0) + 1;
      }
      if (event.eventMode) {
        facets.eventModes[event.eventMode] = (facets.eventModes[event.eventMode] || 0) + 1;
      }
      if (event.organizer) {
        facets.organizers[event.organizer] = (facets.organizers[event.organizer] || 0) + 1;
      }
      if (event.startDate) {
        const month = new Date(event.startDate).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
        facets.dates[month] = (facets.dates[month] || 0) + 1;
      }
    });

    return facets;
  }

  // Generate service facets
  generateServiceFacets(services) {
    const facets = {
      categories: {},
      locations: {},
      providers: {},
      priceRanges: {},
      ratings: {}
    };

    services.forEach(service => {
      if (service.category) {
        facets.categories[service.category] = (facets.categories[service.category] || 0) + 1;
      }
      if (service.location) {
        facets.locations[service.location] = (facets.locations[service.location] || 0) + 1;
      }
      if (service.providerName) {
        facets.providers[service.providerName] = (facets.providers[service.providerName] || 0) + 1;
      }
      if (service.priceRange) {
        facets.priceRanges[service.priceRange] = (facets.priceRanges[service.priceRange] || 0) + 1;
      }
      if (service.averageRating) {
        const rating = Math.floor(service.averageRating);
        facets.ratings[rating] = (facets.ratings[rating] || 0) + 1;
      }
    });

    return facets;
  }

  // Generate investor facets
  generateInvestorFacets(investors) {
    const facets = {
      locations: {},
      investmentFocus: {},
      fundSizes: {},
      companies: {},
      stages: {}
    };

    investors.forEach(investor => {
      if (investor.location) {
        facets.locations[investor.location] = (facets.locations[investor.location] || 0) + 1;
      }
      if (investor.investmentFocus) {
        const focus = Array.isArray(investor.investmentFocus) ? investor.investmentFocus : [investor.investmentFocus];
        focus.forEach(focusArea => {
          facets.investmentFocus[focusArea] = (facets.investmentFocus[focusArea] || 0) + 1;
        });
      }
      if (investor.fundSize) {
        facets.fundSizes[investor.fundSize] = (facets.fundSizes[investor.fundSize] || 0) + 1;
      }
      if (investor.company) {
        facets.companies[investor.company] = (facets.companies[investor.company] || 0) + 1;
      }
      if (investor.investmentStage) {
        facets.stages[investor.investmentStage] = (facets.stages[investor.investmentStage] || 0) + 1;
      }
    });

    return facets;
  }

  // Generate project facets
  generateProjectFacets(projects) {
    const facets = {
      categories: {},
      technologies: {},
      statuses: {},
      owners: {},
      years: {}
    };

    projects.forEach(project => {
      if (project.category) {
        facets.categories[project.category] = (facets.categories[project.category] || 0) + 1;
      }
      if (project.technologies) {
        const technologies = Array.isArray(project.technologies) ? project.technologies : [project.technologies];
        technologies.forEach(tech => {
          facets.technologies[tech] = (facets.technologies[tech] || 0) + 1;
        });
      }
      if (project.status) {
        facets.statuses[project.status] = (facets.statuses[project.status] || 0) + 1;
      }
      if (project.ownerName) {
        facets.owners[project.ownerName] = (facets.owners[project.ownerName] || 0) + 1;
      }
      if (project.startDate) {
        const year = new Date(project.startDate).getFullYear();
        facets.years[year] = (facets.years[year] || 0) + 1;
      }
    });

    return facets;
  }

  // Generate search suggestions
  async generateSearchSuggestions(searchTerm) {
    try {
      const suggestions = [];
      const term = searchTerm.toLowerCase();

      // Get popular searches
      const popularSearches = await this.getPopularSearches();
      
      // Get trending searches
      const trendingSearches = await this.getTrendingSearches();

      // Combine and filter suggestions
      const allSuggestions = [...popularSearches, ...trendingSearches];
      
      allSuggestions.forEach(suggestion => {
        if (suggestion.toLowerCase().includes(term) && !suggestions.includes(suggestion)) {
          suggestions.push(suggestion);
        }
      });

      // Limit suggestions
      return suggestions.slice(0, 10);
    } catch (error) {
      logger.error('Error generating search suggestions:', error);
      return [];
    }
  }

  // Get popular searches
  async getPopularSearches() {
    try {
      // This would typically query a search analytics table
      // For now, return some common searches
      return [
        'Software Engineer',
        'Marketing Manager',
        'Data Scientist',
        'Product Manager',
        'UX Designer',
        'Business Analyst',
        'Sales Representative',
        'Project Manager',
        'Financial Analyst',
        'Human Resources'
      ];
    } catch (error) {
      logger.error('Error getting popular searches:', error);
      return [];
    }
  }

  // Get trending searches
  async getTrendingSearches() {
    try {
      // This would typically query recent search patterns
      // For now, return some trending searches
      return [
        'Remote Work',
        'AI/ML',
        'Blockchain',
        'Sustainability',
        'Digital Marketing',
        'Cloud Computing',
        'Cybersecurity',
        'E-commerce',
        'Mobile Development',
        'Data Analytics'
      ];
    } catch (error) {
      logger.error('Error getting trending searches:', error);
      return [];
    }
  }

  // Log search activity
  logSearchActivity(userId, searchTerm, searchType, resultCount) {
    try {
      if (!this.searchHistory.has(userId)) {
        this.searchHistory.set(userId, []);
      }

      const searchLog = {
        timestamp: new Date(),
        searchTerm,
        searchType,
        resultCount,
        userId
      };

      this.searchHistory.get(userId).push(searchLog);

      // Keep only last 100 searches per user
      if (this.searchHistory.get(userId).length > 100) {
        this.searchHistory.get(userId).shift();
      }

      logger.info(`Search logged: ${searchType} search by user ${userId} for "${searchTerm}" returned ${resultCount} results`);
    } catch (error) {
      logger.error('Error logging search activity:', error);
    }
  }

  // Get search history for a user
  getUserSearchHistory(userId, limit = 20) {
    try {
      if (!this.searchHistory.has(userId)) {
        return [];
      }

      const history = this.searchHistory.get(userId);
      return history.slice(-limit).reverse();
    } catch (error) {
      logger.error('Error getting user search history:', error);
      return [];
    }
  }

  // Get search analytics
  async getSearchAnalytics(options = {}) {
    try {
      const {
        startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
        endDate = new Date(),
        groupBy = 'day'
      } = options;

      // This would typically query a search analytics table
      // For now, return mock analytics
      const analytics = {
        totalSearches: 0,
        uniqueUsers: 0,
        averageResultsPerSearch: 0,
        topSearches: [],
        searchTrends: {},
        entityTypeDistribution: {},
        locationDistribution: {}
      };

      // Calculate from search history
      this.searchHistory.forEach((userHistory, userId) => {
        const userSearches = userHistory.filter(search => 
          search.timestamp >= startDate && search.timestamp <= endDate
        );
        
        analytics.totalSearches += userSearches.length;
        analytics.uniqueUsers++;
        
        userSearches.forEach(search => {
          analytics.averageResultsPerSearch += search.resultCount;
        });
      });

      if (analytics.totalSearches > 0) {
        analytics.averageResultsPerSearch = Math.round(analytics.averageResultsPerSearch / analytics.totalSearches);
      }

      return analytics;
    } catch (error) {
      logger.error('Error getting search analytics:', error);
      throw error;
    }
  }

  // Clear search history for a user
  clearUserSearchHistory(userId) {
    try {
      this.searchHistory.delete(userId);
      logger.info(`Search history cleared for user ${userId}`);
      return { message: 'Search history cleared successfully' };
    } catch (error) {
      logger.error('Error clearing search history:', error);
      throw error;
    }
  }

  // Clear all search history
  clearAllSearchHistory() {
    try {
      this.searchHistory.clear();
      logger.info('All search history cleared');
      return { message: 'All search history cleared successfully' };
    } catch (error) {
      logger.error('Error clearing all search history:', error);
      throw error;
    }
  }
}

module.exports = SearchService;
