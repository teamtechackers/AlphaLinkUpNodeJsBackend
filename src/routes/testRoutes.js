'use strict';

const express = require('express');
const router = express.Router();

// Import controllers
const AuthController = require('../controllers/AuthController');
const UserController = require('../controllers/UserController');
const JobController = require('../controllers/JobController');

const ChatController = require('../controllers/ChatController');
const AdminController = require('../controllers/AdminController');
const SearchController = require('../controllers/SearchController');
const AnalyticsController = require('../controllers/AnalyticsController');
const PaymentController = require('../controllers/PaymentController');
const BusinessCardController = require('../controllers/BusinessCardController');
const ServiceUnlockController = require('../controllers/ServiceUnlockController');
const InvestorUnlockController = require('../controllers/InvestorUnlockController');
const ContactController = require('../controllers/ContactController');
const MasterDataController = require('../controllers/MasterDataController');

// Import middlewares
const authenticate = require('../middlewares/authenticate');
const adminAuth = require('../middlewares/adminAuth');

// Health check endpoint
router.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    message: 'AlphaLinkup Backend is running',
    timestamp: new Date().toISOString(),
    version: process.env.APP_VERSION || '1.0.0'
  });
});

// API versioning
router.get('/version', (req, res) => {
  res.status(200).json({
    version: 'v1',
    status: 'active',
    lastUpdated: new Date().toISOString()
  });
});

// Mount route modules
router.use('/api/v1/auth', require('./authRoutes'));
router.use('/api/v1/users', require('./userRoutes'));
router.use('/api/v1/jobs', require('./jobRoutes'));
router.use('/api/v1/events', require('./eventRoutes'));
router.use('/api/v1/chat', require('./chatRoutes'));
router.use('/api/v1/admin', require('./adminRoutes'));
router.use('/api/v1/search', require('./searchRoutes'));
router.use('/api/v1/analytics', require('./analyticsRoutes'));
router.use('/api/v1/payments', require('./paymentRoutes'));
router.use('/api/v1/business-cards', require('./businessCardRoutes'));
router.use('/api/v1/unlocks', require('./unlockRoutes'));
router.use('/api/v1/contacts', require('./contactRoutes'));
router.use('/api/v1/master-data', require('./masterDataRoutes'));

// 404 handler for undefined routes
router.use('*', (req, res) => {
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

module.exports = router;
