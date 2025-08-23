'use strict';

const JobService = require('../services/JobService');
const NotificationService = require('../services/NotificationService');
const { logger } = require('../utils/logger');
const { successResponse, errorResponse } = require('../utils/response');

class JobController {
  // Create a new job posting
  static async createJob(req, res) {
    try {
      const userId = req.user.id;
      const jobData = req.body;
      
      // Validate required fields
      if (!jobData.title || !jobData.description || !jobData.company) {
        return errorResponse(res, 'Title, description, and company are required', 400);
      }

      // Create job
      const job = await JobService.createJob(userId, jobData);
      
      // Send notification to relevant users
      try {
        await NotificationService.sendJobNotification(job.id, 'job_created', {
          title: job.title,
          company: job.company,
          location: job.location
        });
      } catch (notificationError) {
        logger.warn('Failed to send job creation notification:', notificationError);
      }

      logger.info(`New job created: ${job.title} at ${job.company} by user ${userId}`);
      return successResponse(res, 'Job created successfully', { job }, 201);
    } catch (error) {
      logger.error('Create job error:', error);
      
      if (error.message.includes('Validation failed')) {
        return errorResponse(res, error.message, 400);
      }
      
      if (error.message.includes('User not authorized')) {
        return errorResponse(res, 'You are not authorized to create jobs', 403);
      }
      
      return errorResponse(res, 'Failed to create job', 500);
    }
  }

  // Get all jobs with filtering and pagination
  static async getJobs(req, res) {
    try {
      const {
        page = 1,
        limit = 20,
        status = 'active',
        category,
        location,
        type,
        experience,
        salary_min,
        salary_max,
        company,
        search,
        sort_by = 'created_at',
        sort_order = 'desc'
      } = req.query;

      const filters = {
        status,
        category,
        location,
        type,
        experience,
        salary_min: salary_min ? parseFloat(salary_min) : null,
        salary_max: salary_max ? parseFloat(salary_max) : null,
        company,
        search
      };

      const jobs = await JobService.getJobs(filters, {
        page: parseInt(page),
        limit: parseInt(limit),
        sortBy: sort_by,
        sortOrder: sort_order
      });

      return successResponse(res, 'Jobs retrieved successfully', { jobs });
    } catch (error) {
      logger.error('Get jobs error:', error);
      return errorResponse(res, 'Failed to retrieve jobs', 500);
    }
  }

  // Get a specific job by ID
  static async getJob(req, res) {
    try {
      const { jobId } = req.params;
      const userId = req.user?.id; // Optional for public access

      const job = await JobService.getJobById(jobId, userId);
      
      if (!job) {
        return errorResponse(res, 'Job not found', 404);
      }

      // Increment view count if user is authenticated
      if (userId) {
        try {
          await JobService.incrementJobViews(jobId, userId);
        } catch (viewError) {
          logger.warn('Failed to increment job views:', viewError);
        }
      }

      return successResponse(res, 'Job retrieved successfully', { job });
    } catch (error) {
      logger.error('Get job error:', error);
      
      if (error.message.includes('Job not found')) {
        return errorResponse(res, 'Job not found', 404);
      }
      
      return errorResponse(res, 'Failed to retrieve job', 500);
    }
  }

  // Update a job posting
  static async updateJob(req, res) {
    try {
      const userId = req.user.id;
      const { jobId } = req.params;
      const updateData = req.body;

      if (Object.keys(updateData).length === 0) {
        return errorResponse(res, 'No update data provided', 400);
      }

      const updatedJob = await JobService.updateJob(jobId, userId, updateData);
      
      logger.info(`Job ${jobId} updated by user ${userId}`);
      return successResponse(res, 'Job updated successfully', { job: updatedJob });
    } catch (error) {
      logger.error('Update job error:', error);
      
      if (error.message.includes('Job not found')) {
        return errorResponse(res, 'Job not found', 404);
      }
      
      if (error.message.includes('not authorized')) {
        return errorResponse(res, 'You are not authorized to update this job', 403);
      }
      
      if (error.message.includes('Validation failed')) {
        return errorResponse(res, error.message, 400);
      }
      
      return errorResponse(res, 'Failed to update job', 500);
    }
  }

  // Delete a job posting
  static async deleteJob(req, res) {
    try {
      const userId = req.user.id;
      const { jobId } = req.params;

      await JobService.deleteJob(jobId, userId);
      
      logger.info(`Job ${jobId} deleted by user ${userId}`);
      return successResponse(res, 'Job deleted successfully');
    } catch (error) {
      logger.error('Delete job error:', error);
      
      if (error.message.includes('Job not found')) {
        return errorResponse(res, 'Job not found', 404);
      }
      
      if (error.message.includes('not authorized')) {
        return errorResponse(res, 'You are not authorized to delete this job', 403);
      }
      
      return errorResponse(res, 'Failed to delete job', 500);
    }
  }

  // Close a job posting
  static async closeJob(req, res) {
    try {
      const userId = req.user.id;
      const { jobId } = req.params;
      const { reason } = req.body;

      const closedJob = await JobService.closeJob(jobId, userId, reason);
      
      // Notify applicants about job closure
      try {
        await NotificationService.sendJobNotification(jobId, 'job_closed', {
          title: closedJob.title,
          company: closedJob.company,
          reason: reason || 'Position filled'
        });
      } catch (notificationError) {
        logger.warn('Failed to send job closure notification:', notificationError);
      }
      
      logger.info(`Job ${jobId} closed by user ${userId}`);
      return successResponse(res, 'Job closed successfully', { job: closedJob });
    } catch (error) {
      logger.error('Close job error:', error);
      
      if (error.message.includes('Job not found')) {
        return errorResponse(res, 'Job not found', 404);
      }
      
      if (error.message.includes('not authorized')) {
        return errorResponse(res, 'You are not authorized to close this job', 403);
      }
      
      if (error.message.includes('already closed')) {
        return errorResponse(res, 'Job is already closed', 400);
      }
      
      return errorResponse(res, 'Failed to close job', 500);
    }
  }

  // Reopen a closed job posting
  static async reopenJob(req, res) {
    try {
      const userId = req.user.id;
      const { jobId } = req.params;

      const reopenedJob = await JobService.reopenJob(jobId, userId);
      
      logger.info(`Job ${jobId} reopened by user ${userId}`);
      return successResponse(res, 'Job reopened successfully', { job: reopenedJob });
    } catch (error) {
      logger.error('Reopen job error:', error);
      
      if (error.message.includes('Job not found')) {
        return errorResponse(res, 'Job not found', 404);
      }
      
      if (error.message.includes('not authorized')) {
        return errorResponse(res, 'You are not authorized to reopen this job', 403);
      }
      
      if (error.message.includes('not closed')) {
        return errorResponse(res, 'Job is not closed', 400);
      }
      
      return errorResponse(res, 'Failed to reopen job', 500);
    }
  }

  // Apply for a job
  static async applyForJob(req, res) {
    try {
      const userId = req.user.id;
      const { jobId } = req.params;
      const applicationData = req.body;

      // Validate application data
      if (!applicationData.cover_letter && !applicationData.resume_id) {
        return errorResponse(res, 'Cover letter or resume is required', 400);
      }

      const application = await JobService.applyForJob(jobId, userId, applicationData);
      
      // Send application confirmation to applicant
      try {
        await NotificationService.createNotification({
          user_id: userId,
          type: 'job_application_submitted',
          title: 'Application Submitted',
          message: `Your application for ${application.job_title} has been submitted successfully.`,
          data: { jobId, applicationId: application.id }
        });
      } catch (notificationError) {
        logger.warn('Failed to send application confirmation:', notificationError);
      }

      // Send notification to job poster
      try {
        await NotificationService.createNotification({
          user_id: application.job_poster_id,
          type: 'new_job_application',
          title: 'New Job Application',
          message: `You have received a new application for ${application.job_title}.`,
          data: { jobId, applicationId: application.id, applicantId: userId }
        });
      } catch (notificationError) {
        logger.warn('Failed to send application notification to job poster:', notificationError);
      }
      
      logger.info(`Job application submitted by user ${userId} for job ${jobId}`);
      return successResponse(res, 'Application submitted successfully', { application }, 201);
    } catch (error) {
      logger.error('Apply for job error:', error);
      
      if (error.message.includes('Job not found')) {
        return errorResponse(res, 'Job not found', 404);
      }
      
      if (error.message.includes('Job is closed')) {
        return errorResponse(res, 'This job is no longer accepting applications', 400);
      }
      
      if (error.message.includes('already applied')) {
        return errorResponse(res, 'You have already applied for this job', 400);
      }
      
      if (error.message.includes('not eligible')) {
        return errorResponse(res, 'You are not eligible to apply for this job', 400);
      }
      
      return errorResponse(res, 'Failed to submit application', 500);
    }
  }

  // Get job applications for a specific job
  static async getJobApplications(req, res) {
    try {
      const userId = req.user.id;
      const { jobId } = req.params;
      const { page = 1, limit = 20, status, sort_by = 'applied_at', sort_order = 'desc' } = req.query;

      const applications = await JobService.getJobApplications(jobId, userId, {
        page: parseInt(page),
        limit: parseInt(limit),
        status,
        sortBy: sort_by,
        sortOrder: sort_order
      });

      return successResponse(res, 'Applications retrieved successfully', { applications });
    } catch (error) {
      logger.error('Get job applications error:', error);
      
      if (error.message.includes('Job not found')) {
        return errorResponse(res, 'Job not found', 404);
      }
      
      if (error.message.includes('not authorized')) {
        return errorResponse(res, 'You are not authorized to view applications for this job', 403);
      }
      
      return errorResponse(res, 'Failed to retrieve applications', 500);
    }
  }

  // Get user's job applications
  static async getUserApplications(req, res) {
    try {
      const userId = req.user.id;
      const { page = 1, limit = 20, status, sort_by = 'applied_at', sort_order = 'desc' } = req.query;

      const applications = await JobService.getUserApplications(userId, {
        page: parseInt(page),
        limit: parseInt(limit),
        status,
        sortBy: sort_by,
        sortOrder: sort_order
      });

      return successResponse(res, 'Applications retrieved successfully', { applications });
    } catch (error) {
      logger.error('Get user applications error:', error);
      return errorResponse(res, 'Failed to retrieve applications', 500);
    }
  }

  // Update application status
  static async updateApplicationStatus(req, res) {
    try {
      const userId = req.user.id;
      const { applicationId } = req.params;
      const { status, feedback, interview_date, interview_location } = req.body;

      if (!status) {
        return errorResponse(res, 'Status is required', 400);
      }

      const updatedApplication = await JobService.updateApplicationStatus(applicationId, userId, {
        status,
        feedback,
        interview_date,
        interview_location
      });

      // Send notification to applicant about status change
      try {
        await NotificationService.createNotification({
          user_id: updatedApplication.applicant_id,
          type: 'application_status_updated',
          title: 'Application Status Updated',
          message: `Your application for ${updatedApplication.job_title} has been ${status}.`,
          data: { 
            jobId: updatedApplication.job_id, 
            applicationId, 
            status,
            feedback,
            interview_date,
            interview_location
          }
        });
      } catch (notificationError) {
        logger.warn('Failed to send status update notification:', notificationError);
      }
      
      logger.info(`Application ${applicationId} status updated to ${status} by user ${userId}`);
      return successResponse(res, 'Application status updated successfully', { application: updatedApplication });
    } catch (error) {
      logger.error('Update application status error:', error);
      
      if (error.message.includes('Application not found')) {
        return errorResponse(res, 'Application not found', 404);
      }
      
      if (error.message.includes('not authorized')) {
        return errorResponse(res, 'You are not authorized to update this application', 403);
      }
      
      if (error.message.includes('Invalid status')) {
        return errorResponse(res, 'Invalid application status', 400);
      }
      
      return errorResponse(res, 'Failed to update application status', 500);
    }
  }

  // Withdraw job application
  static async withdrawApplication(req, res) {
    try {
      const userId = req.user.id;
      const { applicationId } = req.params;

      const withdrawnApplication = await JobService.withdrawApplication(applicationId, userId);
      
      logger.info(`Application ${applicationId} withdrawn by user ${userId}`);
      return successResponse(res, 'Application withdrawn successfully', { application: withdrawnApplication });
    } catch (error) {
      logger.error('Withdraw application error:', error);
      
      if (error.message.includes('Application not found')) {
        return errorResponse(res, 'Application not found', 404);
      }
      
      if (error.message.includes('not authorized')) {
        return errorResponse(res, 'You are not authorized to withdraw this application', 403);
      }
      
      if (error.message.includes('cannot be withdrawn')) {
        return errorResponse(res, 'This application cannot be withdrawn', 400);
      }
      
      return errorResponse(res, 'Failed to withdraw application', 500);
    }
  }

  // Search jobs
  static async searchJobs(req, res) {
    try {
      const { q, page = 1, limit = 20, filters } = req.query;
      
      if (!q || q.trim().length === 0) {
        return errorResponse(res, 'Search query is required', 400);
      }

      const results = await JobService.searchJobs(q, {
        page: parseInt(page),
        limit: parseInt(limit),
        filters: filters ? JSON.parse(filters) : {}
      });

      return successResponse(res, 'Search completed successfully', { results });
    } catch (error) {
      logger.error('Search jobs error:', error);
      return errorResponse(res, 'Search failed', 500);
    }
  }

  // Get job recommendations for user
  static async getJobRecommendations(req, res) {
    try {
      const userId = req.user.id;
      const { page = 1, limit = 20, category, location } = req.query;

      const recommendations = await JobService.getJobRecommendations(userId, {
        page: parseInt(page),
        limit: parseInt(limit),
        category,
        location
      });

      return successResponse(res, 'Job recommendations retrieved successfully', { recommendations });
    } catch (error) {
      logger.error('Get job recommendations error:', error);
      return errorResponse(res, 'Failed to retrieve job recommendations', 500);
    }
  }

  // Get job statistics
  static async getJobStats(req, res) {
    try {
      const userId = req.user.id;
      const { startDate, endDate, groupBy } = req.query;

      const stats = await JobService.getJobStatistics(userId, {
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        groupBy: groupBy || 'month'
      });

      return successResponse(res, 'Job statistics retrieved successfully', { stats });
    } catch (error) {
      logger.error('Get job stats error:', error);
      return errorResponse(res, 'Failed to retrieve job statistics', 500);
    }
  }

  // Get popular job categories
  static async getPopularJobCategories(req, res) {
    try {
      const categories = await JobService.getPopularJobCategories();
      return successResponse(res, 'Popular job categories retrieved successfully', { categories });
    } catch (error) {
      logger.error('Get popular job categories error:', error);
      return errorResponse(res, 'Failed to retrieve popular job categories', 500);
    }
  }

  // Get trending job locations
  static async getTrendingJobLocations(req, res) {
    try {
      const locations = await JobService.getTrendingJobLocations();
      return successResponse(res, 'Trending job locations retrieved successfully', { locations });
    } catch (error) {
      logger.error('Get trending job locations error:', error);
      return errorResponse(res, 'Failed to retrieve trending job locations', 500);
    }
  }

  // Save job for later
  static async saveJob(req, res) {
    try {
      const userId = req.user.id;
      const { jobId } = req.params;

      const savedJob = await JobService.saveJob(jobId, userId);
      
      logger.info(`Job ${jobId} saved by user ${userId}`);
      return successResponse(res, 'Job saved successfully', { savedJob });
    } catch (error) {
      logger.error('Save job error:', error);
      
      if (error.message.includes('Job not found')) {
        return errorResponse(res, 'Job not found', 404);
      }
      
      if (error.message.includes('already saved')) {
        return errorResponse(res, 'Job is already saved', 400);
      }
      
      return errorResponse(res, 'Failed to save job', 500);
    }
  }

  // Remove saved job
  static async removeSavedJob(req, res) {
    try {
      const userId = req.user.id;
      const { jobId } = req.params;

      await JobService.removeSavedJob(jobId, userId);
      
      logger.info(`Job ${jobId} removed from saved jobs by user ${userId}`);
      return successResponse(res, 'Job removed from saved jobs successfully');
    } catch (error) {
      logger.error('Remove saved job error:', error);
      
      if (error.message.includes('Job not found')) {
        return errorResponse(res, 'Job not found', 404);
      }
      
      if (error.message.includes('not saved')) {
        return errorResponse(res, 'Job is not in your saved jobs', 400);
      }
      
      return errorResponse(res, 'Failed to remove saved job', 500);
    }
  }

  // Get user's saved jobs
  static async getSavedJobs(req, res) {
    try {
      const userId = req.user.id;
      const { page = 1, limit = 20, sort_by = 'saved_at', sort_order = 'desc' } = req.query;

      const savedJobs = await JobService.getSavedJobs(userId, {
        page: parseInt(page),
        limit: parseInt(limit),
        sortBy: sort_by,
        sortOrder: sort_order
      });

      return successResponse(res, 'Saved jobs retrieved successfully', { savedJobs });
    } catch (error) {
      logger.error('Get saved jobs error:', error);
      return errorResponse(res, 'Failed to retrieve saved jobs', 500);
    }
  }

  // Share job
  static async shareJob(req, res) {
    try {
      const userId = req.user.id;
      const { jobId } = req.params;
      const { shareType, recipientEmail, message } = req.body;

      if (!shareType) {
        return errorResponse(res, 'Share type is required', 400);
      }

      const shareResult = await JobService.shareJob(jobId, userId, {
        shareType,
        recipientEmail,
        message
      });

      logger.info(`Job ${jobId} shared by user ${userId} via ${shareType}`);
      return successResponse(res, 'Job shared successfully', { shareResult });
    } catch (error) {
      logger.error('Share job error:', error);
      
      if (error.message.includes('Job not found')) {
        return errorResponse(res, 'Job not found', 404);
      }
      
      if (error.message.includes('Invalid share type')) {
        return errorResponse(res, 'Invalid share type', 400);
      }
      
      return errorResponse(res, 'Failed to share job', 500);
    }
  }

  // Report job
  static async reportJob(req, res) {
    try {
      const userId = req.user.id;
      const { jobId } = req.params;
      const { reason, description } = req.body;

      if (!reason) {
        return errorResponse(res, 'Report reason is required', 400);
      }

      const report = await JobService.reportJob(jobId, userId, {
        reason,
        description
      });

      logger.info(`Job ${jobId} reported by user ${userId} for reason: ${reason}`);
      return successResponse(res, 'Job reported successfully', { report });
    } catch (error) {
      logger.error('Report job error:', error);
      
      if (error.message.includes('Job not found')) {
        return errorResponse(res, 'Job not found', 404);
      }
      
      if (error.message.includes('already reported')) {
        return errorResponse(res, 'You have already reported this job', 400);
      }
      
      return errorResponse(res, 'Failed to report job', 500);
    }
  }

  // Get job insights
  static async getJobInsights(req, res) {
    try {
      const userId = req.user.id;
      const { jobId } = req.params;

      const insights = await JobService.getJobInsights(jobId, userId);
      
      return successResponse(res, 'Job insights retrieved successfully', { insights });
    } catch (error) {
      logger.error('Get job insights error:', error);
      
      if (error.message.includes('Job not found')) {
        return errorResponse(res, 'Job not found', 404);
      }
      
      if (error.message.includes('not authorized')) {
        return errorResponse(res, 'You are not authorized to view insights for this job', 403);
      }
      
      return errorResponse(res, 'Failed to retrieve job insights', 500);
    }
  }

  // Export job data
  static async exportJobData(req, res) {
    try {
      const userId = req.user.id;
      const { jobId } = req.params;
      const { format = 'json' } = req.query;

      const data = await JobService.exportJobData(jobId, userId, format);

      if (format === 'json') {
        return successResponse(res, 'Job data exported successfully', { data });
      } else {
        // For CSV format, set appropriate headers
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="job_${jobId}.csv"`);
        return res.send(data);
      }
    } catch (error) {
      logger.error('Export job data error:', error);
      
      if (error.message.includes('Job not found')) {
        return errorResponse(res, 'Job not found', 404);
      }
      
      if (error.message.includes('not authorized')) {
        return errorResponse(res, 'You are not authorized to export this job data', 403);
      }
      
      return errorResponse(res, 'Failed to export job data', 500);
    }
  }
}

module.exports = JobController;
