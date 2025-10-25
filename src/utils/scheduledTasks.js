'use strict';

const cron = require('node-cron');
const { logger } = require('./logger');

class ScheduledTasks {
  constructor() {
    this.tasks = new Map();
    this.isRunning = false;
  }

  /**
   * Start all scheduled tasks
   */
  start() {
    if (this.isRunning) {
      logger.warn('Scheduled tasks are already running');
      return;
    }

    try {
      this.isRunning = true;
      logger.info('Starting scheduled tasks...');

      // Start all registered tasks
      this.tasks.forEach((task, name) => {
        if (task.cronJob && !task.cronJob.running) {
          task.cronJob.start();
          logger.info(`Started scheduled task: ${name}`);
        }
      });

      logger.info('All scheduled tasks started successfully');
    } catch (error) {
      logger.error('Error starting scheduled tasks:', error);
      this.isRunning = false;
      throw error;
    }
  }

  /**
   * Stop all scheduled tasks
   */
  stop() {
    if (!this.isRunning) {
      logger.warn('Scheduled tasks are not running');
      return;
    }

    try {
      this.isRunning = false;
      logger.info('Stopping scheduled tasks...');

      // Stop all registered tasks
      this.tasks.forEach((task, name) => {
        if (task.cronJob && task.cronJob.running) {
          task.cronJob.stop();
          logger.info(`Stopped scheduled task: ${name}`);
        }
      });

      logger.info('All scheduled tasks stopped successfully');
    } catch (error) {
      logger.error('Error stopping scheduled tasks:', error);
      throw error;
    }
  }

  /**
   * Add a new scheduled task
   */
  addTask(name, schedule, handler, options = {}) {
    try {
      if (this.tasks.has(name)) {
        logger.warn(`Task ${name} already exists, replacing it`);
        this.removeTask(name);
      }

      const cronJob = cron.schedule(schedule, async () => {
        try {
          logger.debug(`Executing scheduled task: ${name}`);
          await handler();
          logger.debug(`Completed scheduled task: ${name}`);
        } catch (error) {
          logger.error(`Error executing scheduled task ${name}:`, error);
        }
      }, {
        scheduled: false, // Don't start automatically
        timezone: options.timezone || 'UTC',
        ...options
      });

      this.tasks.set(name, {
        cronJob,
        schedule,
        handler,
        options,
        createdAt: new Date()
      });

      logger.info(`Added scheduled task: ${name} with schedule: ${schedule}`);

      // Start the task if scheduler is running
      if (this.isRunning) {
        cronJob.start();
        logger.info(`Started newly added task: ${name}`);
      }

      return true;
    } catch (error) {
      logger.error(`Error adding scheduled task ${name}:`, error);
      return false;
    }
  }

  /**
   * Remove a scheduled task
   */
  removeTask(name) {
    try {
      const task = this.tasks.get(name);
      if (!task) {
        logger.warn(`Task ${name} not found`);
        return false;
      }

      if (task.cronJob && task.cronJob.running) {
        task.cronJob.stop();
      }

      this.tasks.delete(name);
      logger.info(`Removed scheduled task: ${name}`);
      return true;
    } catch (error) {
      logger.error(`Error removing scheduled task ${name}:`, error);
      return false;
    }
  }

  /**
   * Get task information
   */
  getTask(name) {
    return this.tasks.get(name);
  }

  /**
   * Get all tasks
   */
  getAllTasks() {
    return Array.from(this.tasks.entries()).map(([name, task]) => ({
      name,
      schedule: task.schedule,
      isRunning: task.cronJob?.running || false,
      createdAt: task.createdAt,
      options: task.options
    }));
  }

  /**
   * Initialize default scheduled tasks
   */
  initializeDefaultTasks() {
    logger.info('Initializing default scheduled tasks...');

    // Database cleanup task (daily at 2 AM)
    this.addTask('database-cleanup', '0 2 * * *', async () => {
      logger.info('Running database cleanup task...');
      // This would call database cleanup functions
      // await DatabaseService.cleanupOldRecords();
    }, { timezone: 'UTC' });

    // Email queue processing (every 5 minutes)
    this.addTask('email-queue', '*/5 * * * *', async () => {
      logger.info('Processing email queue...');
      // This would process pending emails
      // await EmailService.processQueue();
    });

    // Analytics data aggregation (hourly)
    this.addTask('analytics-aggregation', '0 * * * *', async () => {
      logger.info('Running analytics data aggregation...');
      // This would aggregate analytics data
      // await AnalyticsService.aggregateData();
    });

    // System health check (every 15 minutes)
    this.addTask('health-check', '*/15 * * * *', async () => {
      logger.info('Running system health check...');
      // This would check system health
      // await SystemService.healthCheck();
    });

    // Cache cleanup (every 6 hours)
    this.addTask('cache-cleanup', '0 */6 * * *', async () => {
      logger.info('Running cache cleanup...');
      // This would clean up expired cache entries
      // await CacheService.cleanup();
    });

    // Backup task (daily at 3 AM)
    this.addTask('backup', '0 3 * * *', async () => {
      logger.info('Running backup task...');
      // This would create system backups
      // await BackupService.createBackup();
    }, { timezone: 'UTC' });

    // User activity cleanup (weekly on Sunday at 1 AM)
    this.addTask('activity-cleanup', '0 1 * * 0', async () => {
      logger.info('Running user activity cleanup...');
      // This would clean up old user activity logs
      // await UserService.cleanupOldActivity();
    }, { timezone: 'UTC' });

    // Payment reconciliation (daily at 4 AM)
    this.addTask('payment-reconciliation', '0 4 * * *', async () => {
      logger.info('Running payment reconciliation...');
      // This would reconcile payment records
      // await PaymentService.reconcilePayments();
    }, { timezone: 'UTC' });

    logger.info('Default scheduled tasks initialized successfully');
  }

  /**
   * Get task statistics
   */
  getStats() {
    const totalTasks = this.tasks.size;
    const runningTasks = Array.from(this.tasks.values()).filter(task => 
      task.cronJob?.running
    ).length;

    return {
      totalTasks,
      runningTasks,
      stoppedTasks: totalTasks - runningTasks,
      isSchedulerRunning: this.isRunning,
      uptime: this.isRunning ? Date.now() - this.startTime : 0
    };
  }
}

// Create and export singleton instance
const scheduledTasks = new ScheduledTasks();

// Initialize default tasks
scheduledTasks.initializeDefaultTasks();

module.exports = scheduledTasks;
