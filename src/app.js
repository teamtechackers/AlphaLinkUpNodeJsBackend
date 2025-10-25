'use strict';

// Load environment variables first
require('dotenv').config();

const express = require('express');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const slowDown = require('express-slow-down');

// Import routes
const routes = require('./routes');

// Import middlewares
const { errorHandler } = require('./middlewares/error');

// Import utilities
const { logger } = require('./utils/logger');

// Create Express app
const app = express();

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'", "https:"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"]
    }
  },
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// CORS configuration
app.use(cors({
  origin: [
    'http://13.126.159.246:3000',
    'http://localhost:3000',
    'http://localhost:3001',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:3001'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin']
}));

// Compression middleware
app.use(compression());

// Body parsing middleware
app.use(express.json({ 
  limit: process.env.MAX_PAYLOAD_SIZE || '10mb',
  verify: (req, res, buf) => {
    req.rawBody = buf;
  }
}));
app.use(express.urlencoded({ 
  extended: true, 
  limit: process.env.MAX_PAYLOAD_SIZE || '10mb' 
}));

// Multipart form data middleware - handled per route as needed

// Logging middleware
if (process.env.NODE_ENV === 'production') {
  app.use(morgan('combined', {
    stream: {
      write: (message) => logger.info(message.trim())
    }
  }));
} else {
  app.use(morgan('dev'));
}

// Global rate limiting
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.GLOBAL_RATE_LIMIT || 1000, // limit each IP to 1000 requests per windowMs
  message: {
    status: 'error',
    message: 'Too many requests from this IP, please try again later.',
    retryAfter: Math.ceil(15 * 60 / 1000) // 15 minutes in seconds
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn(`Rate limit exceeded for IP: ${req.ip}`);
    res.status(429).json({
      status: 'error',
      message: 'Too many requests from this IP, please try again later.',
      retryAfter: Math.ceil(15 * 60 / 1000)
    });
  }
});

// Apply global rate limiting to all routes
app.use(globalLimiter);

// Slow down middleware for repeated requests
const speedLimiter = slowDown({
  windowMs: 15 * 60 * 1000, // 15 minutes
  delayAfter: 100, // allow 100 requests per 15 minutes, then...
  delayMs: () => 500 // begin adding 500ms of delay per request above 100
});

app.use(speedLimiter);

// Request logging middleware
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.originalUrl} - IP: ${req.ip} - User-Agent: ${req.get('User-Agent')}`);
  next();
});

// Static file serving for uploads
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Health and version endpoints are now handled in routes/index.js

// Mount API routes
app.use('/', routes);

// 404 handler for undefined routes
app.use('*', (req, res) => {
  logger.warn(`Route not found: ${req.method} ${req.originalUrl}`);
  res.status(404).json({
    status: 'error',
    message: 'Route not found',
    path: req.originalUrl,
    method: req.method,
    timestamp: new Date().toISOString(),
            availableEndpoints: {
          health: '/health',
          version: '/version',
          api: '/api/v1',
          auth: '/api/v1/auth',
          users: '/api/v1/users',
          jobs: '/api/v1/jobs',
          events: '/api/v1/events',
          chat: '/api/v1/chat',
          admin: '/api/v1/admin',
          search: '/api/v1/search',
          analytics: '/api/v1/analytics',
          payments: '/api/v1/payments',
          businessCards: '/api/v1/business-cards',
          unlocks: '/api/v1/unlocks',
          contacts: '/api/v1/contacts',
          masterData: '/api/v1/master-data'
        }
  });
});

// Global error handling middleware
app.use(errorHandler);

// Graceful shutdown handling
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  process.exit(0);
});

// Unhandled promise rejection handler
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Uncaught exception handler
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

module.exports = app;


