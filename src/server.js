'use strict';

// Load environment variables first
require('dotenv').config({ path: './.env' });

const app = require('./app');
const { logger } = require('./utils/logger');
const websocketService = require('./services/websocketService');

// Import database connection
const db = require('./config/db');

// Import scheduled tasks
const scheduledTasks = require('./utils/scheduledTasks');

// Environment variables
const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';

// Graceful shutdown function
const gracefulShutdown = async (signal) => {
  logger.info(`Received ${signal}. Starting graceful shutdown...`);
  
  try {
    // Close database connections
    if (db && typeof db.end === 'function') {
      await db.end();
      logger.info('Database connections closed');
    }
    
    // Stop scheduled tasks
    if (scheduledTasks && typeof scheduledTasks.stop === 'function') {
      scheduledTasks.stop();
      logger.info('Scheduled tasks stopped');
    }
    
    logger.info('Graceful shutdown completed');
    process.exit(0);
  } catch (error) {
    logger.error('Error during graceful shutdown:', error);
    process.exit(1);
  }
};

// Start server
const startServer = async () => {
  try {
    // Test database connection
    if (db && typeof db.query === 'function') {
      await db.query('SELECT 1');
      logger.info('Database connection established');
    }
    
    // Start scheduled tasks
    if (scheduledTasks && typeof scheduledTasks.start === 'function') {
      scheduledTasks.start();
      logger.info('Scheduled tasks started');
    }
    
    // Start HTTP server - bind to all interfaces for external access
    const server = app.listen(PORT, '0.0.0.0', () => {
      logger.info(`🚀 AlphaLinkup Backend Server Started Successfully!`);
      logger.info(`📍 Environment: ${NODE_ENV}`);
      logger.info(`🌐 Server running on port: ${PORT}`);
      logger.info(`🔗 Health check: http://13.126.159.246:${PORT}/health`);
      logger.info(`📊 API version: http://13.126.159.246:${PORT}/version`);
      logger.info(`📚 API documentation: http://13.126.159.246:${PORT}/api/v1`);
      logger.info(`⏰ Started at: ${new Date().toISOString()}`);
      
      // Initialize WebSocket service
      websocketService.initialize(server);
      logger.info(`🔌 WebSocket server initialized on port: ${PORT}`);
      
                 // Log available endpoints
           logger.info('📋 Available API Endpoints:');
           logger.info('   🔐 Auth: /api/v1/auth');
           logger.info('   👥 Users: /api/v1/users');
           logger.info('   💼 Jobs: /api/v1/jobs');
           logger.info('   🎉 Events: /api/v1/events');
           logger.info('   💬 Chat: /api/v1/chat');
           logger.info('   🔐 Admin: /api/v1/admin');
           logger.info('   🔍 Search: /api/v1/search');
           logger.info('   📊 Analytics: /api/v1/analytics');
           logger.info('   💳 Payments: /api/v1/payments');
           logger.info('   💼 Business Cards: /api/v1/business-cards');
           logger.info('   🔓 Unlocks: /api/v1/unlocks');
           logger.info('   📱 Contacts: /api/v1/contacts');
           logger.info('   📊 Master Data: /api/v1/master-data');
    });
    
    // Server error handling
    server.on('error', (error) => {
      if (error.syscall !== 'listen') {
        throw error;
      }
      
      const bind = typeof PORT === 'string' ? 'Pipe ' + PORT : 'Port ' + PORT;
      
      switch (error.code) {
        case 'EACCES':
          logger.error(`${bind} requires elevated privileges`);
          process.exit(1);
          break;
        case 'EADDRINUSE':
          logger.error(`${bind} is already in use`);
          process.exit(1);
          break;
        default:
          throw error;
      }
    });
    
    // Handle server close
    server.on('close', () => {
      logger.info('HTTP server closed');
    });
    
    // Graceful shutdown handlers
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    
    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      logger.error('Uncaught Exception:', error);
      gracefulShutdown('uncaughtException');
    });
    
    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
      gracefulShutdown('unhandledRejection');
    });
    
    // Handle process warnings
    process.on('warning', (warning) => {
      logger.warn('Process warning:', warning.name, warning.message, warning.stack);
    });
    
    return server;
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Start the server if this file is run directly
if (require.main === module) {
  startServer();
}

module.exports = { startServer, gracefulShutdown };


