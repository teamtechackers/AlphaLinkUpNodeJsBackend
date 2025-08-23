'use strict';

const nodemailer = require('nodemailer');
const fs = require('fs').promises;
const path = require('path');
const { logger } = require('../utils/logger');

class EmailService {
  constructor() {
    this.transporter = null;
    this.templates = {};
    this.initializeTransporter();
    this.loadTemplates();
  }

  // Initialize email transporter
  async initializeTransporter() {
    try {
      // Check if SMTP configuration is available
      if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
        logger.warn('SMTP configuration not found. Email service will be in simulation mode.');
        this.transporter = null;
        return;
      }

      this.transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT) || 587,
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS
        },
        tls: {
          rejectUnauthorized: false
        }
      });

      // Verify connection
      await this.transporter.verify();
      logger.info('Email service initialized successfully');
    } catch (error) {
      logger.warn('Failed to initialize email service. Running in simulation mode:', error.message);
      this.transporter = null;
    }
  }

  // Load email templates
  async loadTemplates() {
    try {
      const templatesDir = path.join(__dirname, '../templates/emails');
      const templateFiles = await fs.readdir(templatesDir);

      for (const file of templateFiles) {
        if (file.endsWith('.html')) {
          const templateName = path.basename(file, '.html');
          const templatePath = path.join(templatesDir, file);
          const templateContent = await fs.readFile(templatePath, 'utf8');
          this.templates[templateName] = templateContent;
        }
      }

      logger.info(`Loaded ${Object.keys(this.templates).length} email templates`);
    } catch (error) {
      logger.warn('Failed to load email templates:', error);
      // Use default templates if loading fails
      this.loadDefaultTemplates();
    }
  }

  // Load default templates if file loading fails
  loadDefaultTemplates() {
    this.templates = {
      welcome: this.getDefaultWelcomeTemplate(),
      password_reset: this.getDefaultPasswordResetTemplate(),
      password_reset_success: this.getDefaultPasswordResetSuccessTemplate(),
      password_changed: this.getDefaultPasswordChangedTemplate(),
      account_reactivated: this.getDefaultAccountReactivatedTemplate(),
      job_application_submitted: this.getDefaultJobApplicationSubmittedTemplate(),
      application_shortlisted: this.getDefaultApplicationShortlistedTemplate(),
      application_hired: this.getDefaultApplicationHiredTemplate(),
      application_rejected: this.getDefaultApplicationRejectedTemplate(),
      event_registration_confirmed: this.getDefaultEventRegistrationConfirmedTemplate(),
      event_registration_cancelled: this.getDefaultEventRegistrationCancelledTemplate(),
      event_cancelled: this.getDefaultEventCancelledTemplate(),
      event_rescheduled: this.getDefaultEventRescheduledTemplate(),
      event_reminder: this.getDefaultEventReminderTemplate(),
      connection_request: this.getDefaultConnectionRequestTemplate(),
      connection_accepted: this.getDefaultConnectionAcceptedTemplate(),
      profile_update: this.getDefaultProfileUpdateTemplate(),
      new_job_opportunity: this.getDefaultNewJobOpportunityTemplate(),
      new_event: this.getDefaultNewEventTemplate()
    };
  }

  // Send email
  async sendEmail(emailOptions) {
    try {
      if (!this.transporter) {
        // In simulation mode, log the email instead of sending
        logger.info('Email service in simulation mode. Logging email:', {
          to: emailOptions.to,
          subject: emailOptions.subject,
          template: emailOptions.template || 'custom'
        });
        
        return {
          success: true,
          messageId: `sim_${Date.now()}`,
          message: 'Email logged (simulation mode)'
        };
      }

      const {
        to,
        subject,
        template,
        data = {},
        attachments = [],
        cc = null,
        bcc = null,
        replyTo = null
      } = emailOptions;

      // Validate required fields
      if (!to || !subject) {
        throw new Error('Recipient and subject are required');
      }

      // Get template content
      let htmlContent = '';
      if (template && this.templates[template]) {
        htmlContent = this.renderTemplate(template, data);
      } else if (emailOptions.html) {
        htmlContent = emailOptions.html;
      } else {
        htmlContent = emailOptions.text || 'No content provided';
      }

      // Prepare email
      const mailOptions = {
        from: process.env.SMTP_FROM || process.env.SMTP_USER,
        to,
        subject,
        html: htmlContent,
        text: this.htmlToText(htmlContent),
        attachments,
        cc,
        bcc,
        replyTo
      };

      // Send email
      const result = await this.transporter.sendMail(mailOptions);
      
      logger.info(`Email sent successfully to ${to}`, {
        messageId: result.messageId,
        template: template || 'custom'
      });

      return {
        success: true,
        messageId: result.messageId,
        message: 'Email sent successfully'
      };
    } catch (error) {
      logger.error('Failed to send email:', error);
      throw error;
    }
  }

  // Send bulk emails
  async sendBulkEmails(emails) {
    try {
      if (!this.transporter) {
        // In simulation mode, log the bulk emails instead of sending
        logger.info('Email service in simulation mode. Logging bulk emails:', {
          count: emails.length,
          recipients: emails.map(e => e.to)
        });
        
        return emails.map(email => ({
          success: true,
          messageId: `sim_bulk_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          message: 'Email logged (simulation mode)',
          to: email.to
        }));
      }

      const results = [];
      const batchSize = 10; // Process in batches to avoid overwhelming the SMTP server

      for (let i = 0; i < emails.length; i += batchSize) {
        const batch = emails.slice(i, i + batchSize);
        const batchPromises = batch.map(email => this.sendEmail(email));
        
        const batchResults = await Promise.allSettled(batchPromises);
        results.push(...batchResults);

        // Add delay between batches
        if (i + batchSize < emails.length) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      const successful = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;

      logger.info(`Bulk email sending completed: ${successful} successful, ${failed} failed`);

      return {
        total: emails.length,
        successful,
        failed,
        results
      };
    } catch (error) {
      logger.error('Failed to send bulk emails:', error);
      throw error;
    }
  }

  // Render template with data
  renderTemplate(templateName, data) {
    try {
      let template = this.templates[templateName];
      if (!template) {
        throw new Error(`Template '${templateName}' not found`);
      }

      // Replace placeholders with data
      for (const [key, value] of Object.entries(data)) {
        const placeholder = new RegExp(`{{${key}}}`, 'g');
        template = template.replace(placeholder, value || '');
      }

      // Replace common placeholders
      template = template
        .replace(/{{app_name}}/g, process.env.APP_NAME || 'AlphaLinkup')
        .replace(/{{app_url}}/g, process.env.FRONTEND_URL || 'https://alphalinkup.com')
        .replace(/{{support_email}}/g, process.env.SUPPORT_EMAIL || 'support@alphalinkup.com')
        .replace(/{{current_year}}/g, new Date().getFullYear().toString());

      return template;
    } catch (error) {
      logger.error(`Failed to render template '${templateName}':`, error);
      throw error;
    }
  }

  // Convert HTML to plain text
  htmlToText(html) {
    return html
      .replace(/<[^>]*>/g, '') // Remove HTML tags
      .replace(/&nbsp;/g, ' ') // Replace &nbsp; with space
      .replace(/&amp;/g, '&') // Replace &amp; with &
      .replace(/&lt;/g, '<') // Replace &lt; with <
      .replace(/&gt;/g, '>') // Replace &gt; with >
      .replace(/&quot;/g, '"') // Replace &quot; with "
      .replace(/\s+/g, ' ') // Replace multiple spaces with single space
      .trim();
  }

  // Test email service
  async testConnection() {
    try {
      if (!this.transporter) {
        return { success: false, message: 'Email service not initialized' };
      }

      await this.transporter.verify();
      return { success: true, message: 'Email service connection successful' };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  // Get email statistics
  async getEmailStats() {
    try {
      // This would typically integrate with your email service provider's API
      // For now, return basic stats
      return {
        service: 'SMTP',
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT,
        secure: process.env.SMTP_SECURE === 'true',
        status: this.transporter ? 'connected' : 'disconnected'
      };
    } catch (error) {
      logger.error('Failed to get email stats:', error);
      throw error;
    }
  }

  // Default Templates

  getDefaultWelcomeTemplate() {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Welcome to AlphaLinkup</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #2c3e50;">Welcome to AlphaLinkup!</h1>
          <p>Hi {{name}},</p>
          <p>Welcome to AlphaLinkup! We're excited to have you join our professional networking platform.</p>
          <p>Here's what you can do to get started:</p>
          <ul>
            <li>Complete your profile</li>
            <li>Connect with other professionals</li>
            <li>Explore job opportunities</li>
            <li>Join events and workshops</li>
          </ul>
          <p>If you have any questions, feel free to reach out to our support team.</p>
          <p>Best regards,<br>The AlphaLinkup Team</p>
        </div>
      </body>
      </html>
    `;
  }

  getDefaultPasswordResetTemplate() {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Password Reset Request</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #2c3e50;">Password Reset Request</h1>
          <p>Hi {{name}},</p>
          <p>We received a request to reset your password. Click the link below to proceed:</p>
          <p><a href="{{resetLink}}" style="background-color: #3498db; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px;">Reset Password</a></p>
          <p>If you didn't request this, please ignore this email.</p>
          <p>This link will expire in 1 hour.</p>
          <p>Best regards,<br>The AlphaLinkup Team</p>
        </div>
      </body>
      </html>
    `;
  }

  getDefaultPasswordResetSuccessTemplate() {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Password Reset Successful</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #27ae60;">Password Reset Successful</h1>
          <p>Hi {{name}},</p>
          <p>Your password has been successfully reset. You can now log in with your new password.</p>
          <p>If you didn't make this change, please contact our support team immediately.</p>
          <p>Best regards,<br>The AlphaLinkup Team</p>
        </div>
      </body>
      </html>
    `;
  }

  getDefaultPasswordChangedTemplate() {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Password Changed</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #27ae60;">Password Changed Successfully</h1>
          <p>Hi {{name}},</p>
          <p>Your password has been changed successfully. If you didn't make this change, please contact our support team immediately.</p>
          <p>Best regards,<br>The AlphaLinkup Team</p>
        </div>
      </body>
      </html>
    `;
  }

  getDefaultJobApplicationSubmittedTemplate() {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Job Application Submitted</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #27ae60;">Application Submitted Successfully</h1>
          <p>Hi {{name}},</p>
          <p>Your application for <strong>{{jobTitle}}</strong> at <strong>{{company}}</strong> has been submitted successfully.</p>
          <p>We'll review your application and get back to you soon. You can track your application status in your dashboard.</p>
          <p>Best regards,<br>The AlphaLinkup Team</p>
        </div>
      </body>
      </html>
    `;
  }

  getDefaultEventRegistrationConfirmedTemplate() {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Event Registration Confirmed</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #27ae60;">Event Registration Confirmed</h1>
          <p>Hi {{name}},</p>
          <p>Your registration for <strong>{{eventTitle}}</strong> has been confirmed!</p>
          <p><strong>Event Details:</strong></p>
          <ul>
            <li>Date: {{eventDate}}</li>
            <li>Location: {{eventLocation}}</li>
          </ul>
          <p>We look forward to seeing you there!</p>
          <p>Best regards,<br>The AlphaLinkup Team</p>
        </div>
      </body>
      </html>
    `;
  }

  getDefaultConnectionRequestTemplate() {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>New Connection Request</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #3498db;">New Connection Request</h1>
          <p>Hi {{name}},</p>
          <p>You have a new connection request from <strong>{{requesterName}}</strong>.</p>
          <p>Log in to your account to accept or decline this request.</p>
          <p>Best regards,<br>The AlphaLinkup Team</p>
        </div>
      </body>
      </html>
    `;
  }

  // Additional default templates...
  getDefaultAccountReactivatedTemplate() {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Account Reactivated</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #27ae60;">Account Reactivated</h1>
          <p>Hi {{name}},</p>
          <p>Your account has been reactivated successfully. Welcome back to AlphaLinkup!</p>
          <p>Best regards,<br>The AlphaLinkup Team</p>
        </div>
      </body>
      </html>
    `;
  }

  getDefaultApplicationShortlistedTemplate() {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Application Shortlisted</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #f39c12;">Congratulations! You've Been Shortlisted</h1>
          <p>Hi {{name}},</p>
          <p>Great news! Your application for <strong>{{jobTitle}}</strong> at <strong>{{company}}</strong> has been shortlisted.</p>
          <p>We'll be in touch soon with next steps.</p>
          <p>Best regards,<br>The AlphaLinkup Team</p>
        </div>
      </body>
      </html>
    `;
  }

  getDefaultApplicationHiredTemplate() {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Congratulations! You're Hired!</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #27ae60;">Congratulations! You're Hired!</h1>
          <p>Hi {{name}},</p>
          <p>Fantastic news! You've been hired for <strong>{{jobTitle}}</strong> at <strong>{{company}}</strong>!</p>
          <p>We'll contact you soon with onboarding details.</p>
          <p>Best regards,<br>The AlphaLinkup Team</p>
        </div>
      </body>
      </html>
    `;
  }

  getDefaultApplicationRejectedTemplate() {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Application Update</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #e74c3c;">Application Update</h1>
          <p>Hi {{name}},</p>
          <p>Thank you for your interest in <strong>{{jobTitle}}</strong> at <strong>{{company}}</strong>.</p>
          <p>After careful consideration, we regret to inform you that we have selected another candidate for this position.</p>
          <p>We encourage you to continue applying for other opportunities on our platform.</p>
          <p>Best regards,<br>The AlphaLinkup Team</p>
        </div>
      </body>
      </html>
    `;
  }

  getDefaultEventRegistrationCancelledTemplate() {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Event Registration Cancelled</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #e74c3c;">Event Registration Cancelled</h1>
          <p>Hi {{name}},</p>
          <p>Your registration for <strong>{{eventTitle}}</strong> has been cancelled.</p>
          <p>We hope to see you at future events!</p>
          <p>Best regards,<br>The AlphaLinkup Team</p>
        </div>
      </body>
      </html>
    `;
  }

  getDefaultEventCancelledTemplate() {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Event Cancelled</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #e74c3c;">Event Cancelled</h1>
          <p>Hi {{name}},</p>
          <p>We regret to inform you that <strong>{{eventTitle}}</strong> has been cancelled.</p>
          <p>Reason: {{reason}}</p>
          <p>We apologize for any inconvenience caused.</p>
          <p>Best regards,<br>The AlphaLinkup Team</p>
        </div>
      </body>
      </html>
    `;
  }

  getDefaultEventRescheduledTemplate() {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Event Rescheduled</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #f39c12;">Event Rescheduled</h1>
          <p>Hi {{name}},</p>
          <p><strong>{{eventTitle}}</strong> has been rescheduled.</p>
          <p><strong>New Date:</strong> {{newDate}}</p>
          <p><strong>New Location:</strong> {{newLocation}}</p>
          <p>We apologize for any inconvenience caused.</p>
          <p>Best regards,<br>The AlphaLinkup Team</p>
        </div>
      </body>
      </html>
    `;
  }

  getDefaultEventReminderTemplate() {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Event Reminder</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #3498db;">Event Reminder</h1>
          <p>Hi {{name}},</p>
          <p>This is a friendly reminder that <strong>{{eventTitle}}</strong> is starting soon!</p>
          <p><strong>Date:</strong> {{eventDate}}</p>
          <p><strong>Location:</strong> {{eventLocation}}</p>
          <p>We look forward to seeing you there!</p>
          <p>Best regards,<br>The AlphaLinkup Team</p>
        </div>
      </body>
      </html>
    `;
  }

  getDefaultConnectionAcceptedTemplate() {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Connection Accepted</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #27ae60;">Connection Accepted</h1>
          <p>Hi {{name}},</p>
          <p><strong>{{accepterName}}</strong> has accepted your connection request!</p>
          <p>You can now message each other and view each other's profiles.</p>
          <p>Best regards,<br>The AlphaLinkup Team</p>
        </div>
      </body>
      </html>
    `;
  }

  getDefaultProfileUpdateTemplate() {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Profile Updated</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #27ae60;">Profile Updated</h1>
          <p>Hi {{name}},</p>
          <p>Your profile has been updated successfully.</p>
          <p>Keep your profile current to get the most out of AlphaLinkup!</p>
          <p>Best regards,<br>The AlphaLinkup Team</p>
        </div>
      </body>
      </html>
    `;
  }

  getDefaultNewJobOpportunityTemplate() {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>New Job Opportunity</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #3498db;">New Job Opportunity</h1>
          <p>Hi {{name}},</p>
          <p>A new job opportunity that matches your profile has been posted!</p>
          <p><strong>{{jobTitle}}</strong> at <strong>{{company}}</strong></p>
          <p>Log in to your account to view the full job description and apply.</p>
          <p>Best regards,<br>The AlphaLinkup Team</p>
        </div>
      </body>
      </html>
    `;
  }

  getDefaultNewEventTemplate() {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>New Event</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #3498db;">New Event</h1>
          <p>Hi {{name}},</p>
          <p>A new event that might interest you has been posted!</p>
          <p><strong>{{eventTitle}}</strong></p>
          <p>Log in to your account to view event details and register.</p>
          <p>Best regards,<br>The AlphaLinkup Team</p>
        </div>
      </body>
      </html>
    `;
  }
}

// Create singleton instance
const emailService = new EmailService();

// Export both the class and the singleton instance
module.exports = {
  EmailService,
  sendEmail: (options) => emailService.sendEmail(options),
  sendBulkEmails: (emails) => emailService.sendBulkEmails(emails),
  testConnection: () => emailService.testConnection(),
  getEmailStats: () => emailService.getEmailStats()
};
