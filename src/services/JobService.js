'use strict';

const Job = require('../models/Job');
const User = require('../models/User');
const Notification = require('../models/Notification');
const { logger } = require('../utils/logger');
const { sendEmail } = require('./EmailService');

class JobService {
  // Create Job Posting
  static async createJob(jobData, employerId) {
    try {
      // Validate job data
      const validationErrors = JobService.validateJobData(jobData);
      if (validationErrors.length > 0) {
        throw new Error(`Validation failed: ${validationErrors.join(', ')}`);
      }

      // Verify employer exists and is active
      const employer = await User.findById(employerId);
      if (!employer || employer.status !== 1) {
        throw new Error('Invalid employer account');
      }

      // Create job
      const job = await Job.create({
        ...jobData,
        employer_id: employerId,
        status: 'active'
      });

      // Send job creation notification to relevant users
      try {
        await JobService.notifyJobCreation(job);
      } catch (notificationError) {
        logger.warn('Failed to send job creation notification:', notificationError);
      }

      return job;
    } catch (error) {
      logger.error('Error creating job:', error);
      throw error;
    }
  }

  // Update Job Posting
  static async updateJob(jobId, updateData, employerId) {
    try {
      // Verify job ownership
      const job = await Job.findById(jobId);
      if (!job) {
        throw new Error('Job not found');
      }

      if (job.employer_id !== employerId) {
        throw new Error('Unauthorized to update this job');
      }

      // Validate update data
      const validationErrors = JobService.validateJobUpdateData(updateData);
      if (validationErrors.length > 0) {
        throw new Error(`Validation failed: ${validationErrors.join(', ')}`);
      }

      // Update job
      const updatedJob = await Job.update(jobId, updateData);

      // Notify applicants if significant changes were made
      if (updateData.title || updateData.description || updateData.requirements) {
        try {
          await JobService.notifyJobUpdate(jobId, updateData);
        } catch (notificationError) {
          logger.warn('Failed to send job update notification:', notificationError);
        }
      }

      return updatedJob;
    } catch (error) {
      logger.error('Error updating job:', error);
      throw error;
    }
  }

  // Apply for Job
  static async applyForJob(jobId, applicantId, applicationData) {
    try {
      // Validate application data
      const validationErrors = JobService.validateApplicationData(applicationData);
      if (validationErrors.length > 0) {
        throw new Error(`Validation failed: ${validationErrors.join(', ')}`);
      }

      // Check if job exists and is active
      const job = await Job.findById(jobId);
      if (!job || job.status !== 'active') {
        throw new Error('Job not available for applications');
      }

      // Check if user has already applied
      const existingApplication = await Job.getApplication(jobId, applicantId);
      if (existingApplication) {
        throw new Error('You have already applied for this job');
      }

      // Verify applicant exists and is active
      const applicant = await User.findById(applicantId);
      if (!applicant || applicant.status !== 1) {
        throw new Error('Invalid applicant account');
      }

      // Create application
      const application = await Job.createApplication({
        job_id: jobId,
        applicant_id: applicantId,
        ...applicationData,
        status: 'pending'
      });

      // Send application confirmation to applicant
      try {
        await sendEmail({
          to: applicant.email,
          subject: 'Job Application Submitted',
          template: 'job_application_submitted',
          data: { 
            name: applicant.name, 
            jobTitle: job.title,
            company: job.company_name
          }
        });
      } catch (emailError) {
        logger.warn('Failed to send application confirmation email:', emailError);
      }

      // Send application notification to employer
      try {
        await JobService.notifyEmployerOfApplication(job, application, applicant);
      } catch (notificationError) {
        logger.warn('Failed to send employer notification:', notificationError);
      }

      return application;
    } catch (error) {
      logger.error('Error applying for job:', error);
      throw error;
    }
  }

  // Update Application Status
  static async updateApplicationStatus(applicationId, status, employerId, feedback = null) {
    try {
      // Get application
      const application = await Job.getApplicationById(applicationId);
      if (!application) {
        throw new Error('Application not found');
      }

      // Get job to verify employer
      const job = await Job.findById(application.job_id);
      if (!job || job.employer_id !== employerId) {
        throw new Error('Unauthorized to update this application');
      }

      // Update application status
      const updatedApplication = await Job.updateApplication(applicationId, {
        status,
        feedback,
        reviewed_at: new Date()
      });

      // Send status update notification to applicant
      try {
        await JobService.notifyApplicationStatusUpdate(application, status, feedback);
      } catch (notificationError) {
        logger.warn('Failed to send status update notification:', notificationError);
      }

      return updatedApplication;
    } catch (error) {
      logger.error('Error updating application status:', error);
      throw error;
    }
  }

  // Search Jobs
  static async searchJobs(searchParams, userId = null) {
    try {
      const {
        query,
        location,
        jobType,
        experienceLevel,
        salaryMin,
        salaryMax,
        skills,
        company,
        remote,
        page = 1,
        limit = 20,
        sortBy = 'created_at',
        sortOrder = 'desc'
      } = searchParams;

      // Build search criteria
      const searchCriteria = {
        query,
        location,
        jobType,
        experienceLevel,
        salaryMin,
        salaryMax,
        skills,
        company,
        remote,
        page,
        limit,
        sortBy,
        sortOrder
      };

      // Perform search
      const jobs = await Job.search(searchCriteria);

      // If user is authenticated, add application status
      if (userId) {
        const jobsWithApplicationStatus = await Promise.all(
          jobs.map(async (job) => {
            const application = await Job.getApplication(job.id, userId);
            return {
              ...job,
              hasApplied: !!application,
              applicationStatus: application ? application.status : null
            };
          })
        );
        return jobsWithApplicationStatus;
      }

      return jobs;
    } catch (error) {
      logger.error('Error searching jobs:', error);
      throw error;
    }
  }

  // Get Job Recommendations
  static async getJobRecommendations(userId, options = {}) {
    try {
      const { page = 1, limit = 20 } = options;

      // Get user profile
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Extract user preferences
      const userSkills = user.skills ? user.skills.split(',') : [];
      const userExperience = user.total_experience || 0;
      const userLocation = user.location;
      const userInterests = user.interests ? user.interests.split(',') : [];

      // Get recommended jobs based on user profile
      const recommendations = await Job.getRecommendations({
        skills: userSkills,
        experience: userExperience,
        location: userLocation,
        interests: userInterests,
        excludeApplied: true,
        userId,
        page,
        limit
      });

      return recommendations;
    } catch (error) {
      logger.error('Error getting job recommendations:', error);
      throw error;
    }
  }

  // Get Job Statistics
  static async getJobStats(employerId = null) {
    try {
      let stats;
      
      if (employerId) {
        // Get employer-specific stats
        stats = await Job.getEmployerStats(employerId);
      } else {
        // Get general job stats
        stats = await Job.getStats();
      }

      return stats;
    } catch (error) {
      logger.error('Error getting job statistics:', error);
      throw error;
    }
  }

  // Get Application Statistics
  static async getApplicationStats(jobId, employerId) {
    try {
      // Verify job ownership
      const job = await Job.findById(jobId);
      if (!job || job.employer_id !== employerId) {
        throw new Error('Unauthorized to view this job');
      }

      const stats = await Job.getApplicationStats(jobId);
      return stats;
    } catch (error) {
      logger.error('Error getting application statistics:', error);
      throw error;
    }
  }

  // Close Job Posting
  static async closeJob(jobId, employerId) {
    try {
      // Verify job ownership
      const job = await Job.findById(jobId);
      if (!job || job.employer_id !== employerId) {
        throw new Error('Unauthorized to close this job');
      }

      // Update job status
      const updatedJob = await Job.update(jobId, {
        status: 'closed',
        closed_at: new Date()
      });

      // Notify applicants that job is closed
      try {
        await JobService.notifyJobClosure(jobId);
      } catch (notificationError) {
        logger.warn('Failed to send job closure notification:', notificationError);
      }

      return updatedJob;
    } catch (error) {
      logger.error('Error closing job:', error);
      throw error;
    }
  }

  // Reopen Job Posting
  static async reopenJob(jobId, employerId) {
    try {
      // Verify job ownership
      const job = await Job.findById(jobId);
      if (!job || job.employer_id !== employerId) {
        throw new Error('Unauthorized to reopen this job');
      }

      // Update job status
      const updatedJob = await Job.update(jobId, {
        status: 'active',
        closed_at: null
      });

      return updatedJob;
    } catch (error) {
      logger.error('Error reopening job:', error);
      throw error;
    }
  }

  // Get Employer Jobs
  static async getEmployerJobs(employerId, options = {}) {
    try {
      const { page = 1, limit = 20, status = null } = options;

      const jobs = await Job.getByEmployer(employerId, {
        page,
        limit,
        status
      });

      return jobs;
    } catch (error) {
      logger.error('Error getting employer jobs:', error);
      throw error;
    }
  }

  // Get User Applications
  static async getUserApplications(userId, options = {}) {
    try {
      const { page = 1, limit = 20, status = null } = options;

      const applications = await Job.getUserApplications(userId, {
        page,
        limit,
        status
      });

      // Add job details to applications
      const applicationsWithJobDetails = await Promise.all(
        applications.map(async (application) => {
          const job = await Job.findById(application.job_id);
          return {
            ...application,
            job
          };
        })
      );

      return applicationsWithJobDetails;
    } catch (error) {
      logger.error('Error getting user applications:', error);
      throw error;
    }
  }

  // Save Job for Later
  static async saveJob(jobId, userId) {
    try {
      // Check if job exists and is active
      const job = await Job.findById(jobId);
      if (!job || job.status !== 'active') {
        throw new Error('Job not available for saving');
      }

      // Check if already saved
      const existingSave = await Job.getSavedJob(jobId, userId);
      if (existingSave) {
        throw new Error('Job already saved');
      }

      // Save job
      const savedJob = await Job.saveJob(jobId, userId);
      return savedJob;
    } catch (error) {
      logger.error('Error saving job:', error);
      throw error;
    }
  }

  // Remove Saved Job
  static async removeSavedJob(jobId, userId) {
    try {
      await Job.removeSavedJob(jobId, userId);
      return { message: 'Job removed from saved list' };
    } catch (error) {
      logger.error('Error removing saved job:', error);
      throw error;
    }
  }

  // Get Saved Jobs
  static async getSavedJobs(userId, options = {}) {
    try {
      const { page = 1, limit = 20 } = options;

      const savedJobs = await Job.getSavedJobs(userId, {
        page,
        limit
      });

      return savedJobs;
    } catch (error) {
      logger.error('Error getting saved jobs:', error);
      throw error;
    }
  }

  // Notification Methods

  static async notifyJobCreation(job) {
    try {
      // Get relevant users based on job criteria
      const relevantUsers = await User.search({
        skills: job.required_skills ? job.required_skills.split(',') : [],
        location: job.location,
        experience: job.experience_level,
        limit: 100
      });

      // Create notifications
      const notifications = relevantUsers.map(user => ({
        user_id: user.id,
        type: 'new_job',
        title: 'New Job Opportunity',
        message: `New ${job.job_type} position at ${job.company_name}`,
        data: { jobId: job.id, jobTitle: job.title, company: job.company_name }
      }));

      await Notification.createBulk(notifications);
    } catch (error) {
      logger.error('Error notifying job creation:', error);
      throw error;
    }
  }

  static async notifyJobUpdate(jobId, updateData) {
    try {
      // Get all applicants
      const applications = await Job.getApplications(jobId);
      
      const notifications = applications.map(application => ({
        user_id: application.applicant_id,
        type: 'job_updated',
        title: 'Job Updated',
        message: 'A job you applied for has been updated',
        data: { jobId, updates: updateData }
      }));

      await Notification.createBulk(notifications);
    } catch (error) {
      logger.error('Error notifying job update:', error);
      throw error;
    }
  }

  static async notifyEmployerOfApplication(job, application, applicant) {
    try {
      // Get employer
      const employer = await User.findById(job.employer_id);
      
      await Notification.create({
        user_id: employer.id,
        type: 'new_application',
        title: 'New Job Application',
        message: `${applicant.name} applied for ${job.title}`,
        data: { 
          jobId: job.id, 
          jobTitle: job.title, 
          applicantId: applicant.id,
          applicantName: applicant.name,
          applicationId: application.id
        }
      });
    } catch (error) {
      logger.error('Error notifying employer of application:', error);
      throw error;
    }
  }

  static async notifyApplicationStatusUpdate(application, status, feedback) {
    try {
      const statusMessages = {
        'reviewed': 'Your application is under review',
        'shortlisted': 'Congratulations! You have been shortlisted',
        'rejected': 'Your application was not selected for this position',
        'hired': 'Congratulations! You have been hired for this position'
      };

      await Notification.create({
        user_id: application.applicant_id,
        type: 'application_status_update',
        title: 'Application Status Update',
        message: statusMessages[status] || 'Your application status has been updated',
        data: { 
          applicationId: application.id,
          status,
          feedback
        }
      });

      // Send email notification for important status changes
      if (['shortlisted', 'hired', 'rejected'].includes(status)) {
        try {
          const applicant = await User.findById(application.applicant_id);
          const job = await Job.findById(application.job_id);
          
          await sendEmail({
            to: applicant.email,
            subject: `Application ${status.charAt(0).toUpperCase() + status.slice(1)}`,
            template: `application_${status}`,
            data: { 
              name: applicant.name,
              jobTitle: job.title,
              company: job.company_name,
              feedback
            }
          });
        } catch (emailError) {
          logger.warn('Failed to send application status email:', emailError);
        }
      }
    } catch (error) {
      logger.error('Error notifying application status update:', error);
      throw error;
    }
  }

  static async notifyJobClosure(jobId) {
    try {
      // Get all applicants
      const applications = await Job.getApplications(jobId);
      
      const notifications = applications.map(application => ({
        user_id: application.applicant_id,
        type: 'job_closed',
        title: 'Job Position Closed',
        message: 'A job you applied for has been closed',
        data: { jobId }
      }));

      await Notification.createBulk(notifications);
    } catch (error) {
      logger.error('Error notifying job closure:', error);
      throw error;
    }
  }

  // Validation Methods

  static validateJobData(jobData) {
    const errors = [];

    if (!jobData.title || jobData.title.trim().length < 5) {
      errors.push('Job title must be at least 5 characters long');
    }

    if (!jobData.description || jobData.description.trim().length < 50) {
      errors.push('Job description must be at least 50 characters long');
    }

    if (!jobData.company_name || jobData.company_name.trim().length < 2) {
      errors.push('Company name is required');
    }

    if (!jobData.location || jobData.location.trim().length < 2) {
      errors.push('Job location is required');
    }

    if (jobData.salary_min && jobData.salary_max && 
        parseFloat(jobData.salary_min) > parseFloat(jobData.salary_max)) {
      errors.push('Minimum salary cannot be greater than maximum salary');
    }

    if (jobData.application_deadline) {
      const deadline = new Date(jobData.application_deadline);
      if (deadline <= new Date()) {
        errors.push('Application deadline must be in the future');
      }
    }

    return errors;
  }

  static validateJobUpdateData(updateData) {
    const errors = [];

    if (updateData.title && updateData.title.trim().length < 5) {
      errors.push('Job title must be at least 5 characters long');
    }

    if (updateData.description && updateData.description.trim().length < 50) {
      errors.push('Job description must be at least 50 characters long');
    }

    if (updateData.salary_min && updateData.salary_max && 
        parseFloat(updateData.salary_min) > parseFloat(updateData.salary_max)) {
      errors.push('Minimum salary cannot be greater than maximum salary');
    }

    if (updateData.application_deadline) {
      const deadline = new Date(updateData.application_deadline);
      if (deadline <= new Date()) {
        errors.push('Application deadline must be in the future');
      }
    }

    return errors;
  }

  static validateApplicationData(applicationData) {
    const errors = [];

    if (!applicationData.cover_letter || applicationData.cover_letter.trim().length < 50) {
      errors.push('Cover letter must be at least 50 characters long');
    }

    if (applicationData.expected_salary && 
        (!Number.isFinite(applicationData.expected_salary) || applicationData.expected_salary < 0)) {
      errors.push('Expected salary must be a valid positive number');
    }

    return errors;
  }
}

module.exports = JobService;
