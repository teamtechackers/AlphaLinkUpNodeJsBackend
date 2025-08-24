'use strict';

const express = require('express');
const path = require('path');
const router = express.Router();

// Import controllers
const AuthController = require('../controllers/AuthController');
const ApiController = require('../controllers/apiController');

// Import middlewares
const authenticate = require('../middlewares/authenticate');
const adminAuth = require('../middlewares/adminAuth');
const validate = require('../middlewares/validation');
const rateLimiter = require('../middlewares/rateLimiter');
const { checkUser } = require('../middlewares/checkUser');
const { uploadProfilePhoto, uploadFormData, uploadEvents, uploadResume } = require('../middlewares/upload');

// Serve static files (images, uploads)
router.use('/uploads', express.static(path.join(__dirname, '../../uploads')));

// Health check endpoint
router.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    message: 'AlphaLinkup Backend is running',
    timestamp: new Date().toISOString(),
    version: process.env.APP_VERSION || '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    uptime: process.uptime()
  });
});

// API version endpoint
router.get('/version', (req, res) => {
  res.status(200).json({
    version: 'v1',
    status: 'active',
    lastUpdated: new Date().toISOString(),
    features: [
      'User Management',
      'Job Management',
      'Event Management',
      'Chat System',
      'Admin Functions',
      'Advanced Search',
      'Analytics & Reporting',
      'Payment Processing',
      'Business Cards',
      'Service/Investor Unlocks',
      'Contact Management',
      'Master Data Management'
    ]
  });
});

// PHP Aligned API Routes - Exact match with routes.php
// Authentication Routes
router.post('/api/sendOtp', AuthController.sendOtp);
router.post('/api/verifyOtp', AuthController.verifyOtp);
router.post('/api/login', ApiController.login);
router.post('/api/logout', checkUser, ApiController.logout);

// Master Data Routes
router.get('/api/getCountryList', ApiController.getCountryList);
router.get('/api/getStateList', ApiController.getStateList);
router.get('/api/getCityList', ApiController.getCityList);
router.get('/api/getInterestsList', ApiController.getInterestsList);
router.get('/api/getEmploymentTypeList', ApiController.getEmploymentTypeList);
router.get('/api/getJobTypeList', ApiController.getJobTypeList);
router.get('/api/getPayList', ApiController.getPayList);
router.get('/api/getEventModeList', ApiController.getEventModeList);
router.get('/api/getEventTypeList', ApiController.getEventTypeList);
router.get('/api/getFundSizeList', ApiController.getFundSizeList);

// Profile Routes
router.post('/api/updateProfile', uploadProfilePhoto.single('profile_photo'), ApiController.updateProfile);
router.get('/api/getProfile', ApiController.getProfile);
router.get('/api/getUserDetailByMobile', ApiController.getUserDetailByMobile);
router.get('/api/getUserProfileByMobile', ApiController.getUserProfileByMobile);
router.post('/api/saveWorkDetails', uploadFormData.none(), ApiController.saveWorkDetails);
router.get('/api/getWorkDetails', ApiController.getWorkDetails);
router.post('/api/deleteWorkDetail', uploadFormData.none(), ApiController.deleteWorkDetail);
router.post('/api/saveProjectDetails', uploadFormData.single('project_logo'), ApiController.saveProjectDetails);
router.get('/api/getProjectDetails', ApiController.getProjectDetails);
router.post('/api/deleteProjectDetail', uploadFormData.none(), ApiController.deleteProjectDetail);
router.post('/api/saveEducationDetails', uploadFormData.none(), ApiController.saveEducationDetails);
router.get('/api/getEducationDetails', ApiController.getEducationDetails);
router.post('/api/deleteEducationDetail', uploadFormData.none(), ApiController.deleteEducationDetail);
router.post('/api/saveEventOrganiser', uploadFormData.none(), ApiController.saveEventOrganiser);
router.get('/api/getEventOrganisersList', ApiController.getEventOrganisersList);
router.post('/api/deleteEventOrganiser', uploadFormData.none(), ApiController.deleteEventOrganiser);
router.get('/api/getEventAttendeesList', ApiController.getEventAttendeesList);
router.post('/api/saveEventAttendee', uploadFormData.none(), ApiController.saveEventAttendee);
router.post('/api/deleteEventAttendee', uploadFormData.none(), ApiController.deleteEventAttendee);
router.get('/api/getUserDetailByQrCode', checkUser, ApiController.getUserDetailByQrCode);


// Dashboard Route - Support both GET and POST for form data
router.get('/api/dashboard', ApiController.dashboard);
router.post('/api/dashboard', ApiController.dashboard);
router.get('/api/legalTerms', ApiController.legalTerms);

// Job Routes
router.post('/api/saveJobInformation', uploadFormData.none(), ApiController.saveJobInformation);
router.get('/api/getJobInformation', ApiController.getJobInformation);
router.post('/api/saveJobApplication', uploadResume.single('resume_file'), ApiController.saveJobApplication);
router.get('/api/getJobDetail', ApiController.getJobDetail);
router.get('/api/getJobApplicantsList', checkUser, ApiController.getJobApplicantsList);
router.get('/api/getResumes', ApiController.getResumes);
router.post('/api/deleteResume', uploadFormData.none(), ApiController.deleteResume);

// Event Routes
router.post('/api/saveEventInformation', uploadEvents.single('event_banner_file'), ApiController.saveEventInformation);
router.get('/api/getEventInformation', ApiController.getEventInformation);
router.get('/api/getEventDetail', ApiController.getEventDetail);
router.get('/api/getEventOrganisersList', ApiController.getEventOrganisersList);
router.post('/api/saveEventOrganiser', uploadFormData.none(), ApiController.saveEventOrganiser);
router.post('/api/deleteEventOrganiser', uploadFormData.none(), ApiController.deleteEventOrganiser);
router.get('/api/getEventAttendeesList', ApiController.getEventAttendeesList);
router.post('/api/saveEventAttendee', uploadFormData.none(), ApiController.saveEventAttendee);
router.post('/api/deleteEventAttendee', uploadFormData.none(), ApiController.deleteEventAttendee);

// Folder Management Routes
router.get('/api/getFoldersListByType', ApiController.getFoldersListByType);
router.post('/api/saveFolderByType', uploadFormData.none(), ApiController.saveFolderByType);

// Note: Additional event management, folder, contact, business card, service, investor, and chat routes
// will be implemented as needed to match PHP backend functionality

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
      api: '/api',
      note: 'All API endpoints are now under /api/ with exact PHP route names'
    }
  });
});

module.exports = router;


