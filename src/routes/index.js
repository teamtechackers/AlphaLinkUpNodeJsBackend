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
const { uploadProfilePhoto, uploadFormData, uploadEvents } = require('../middlewares/upload');

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
router.get('/api/getUserDetailByMobile', checkUser, ApiController.getUserDetailByMobile);
router.get('/api/getUserDetailByQrCode', checkUser, ApiController.getUserDetailByQrCode);
router.get('/api/getUserProfileByMobile', checkUser, ApiController.getUserProfileByMobile);

// Education/Project/Work Routes
router.post('/api/saveEducationDetails', checkUser, ApiController.genericHandler);
router.get('/api/getEducationDetails', checkUser, ApiController.genericHandler);
router.post('/api/deleteEducationDetail', checkUser, ApiController.genericHandler);

router.post('/api/saveProjectDetails', checkUser, ApiController.saveProjectDetails);
router.get('/api/getProjectDetails', checkUser, ApiController.genericHandler);
router.post('/api/deleteProjectDetail', checkUser, ApiController.genericHandler);

router.post('/api/saveWorkDetails', checkUser, ApiController.genericHandler);
router.get('/api/getWorkDetails', checkUser, ApiController.genericHandler);
router.post('/api/deleteWorkDetail', checkUser, ApiController.genericHandler);

// Dashboard Route
router.get('/api/dashboard', checkUser, ApiController.dashboard);

// Job Routes
router.post('/api/saveJobInformation', uploadFormData.none(), ApiController.saveJobInformation);
router.get('/api/getJobInformation', ApiController.getJobInformation);
router.post('/api/saveJobApplication', checkUser, ApiController.genericHandler);
router.get('/api/getJobDetail', checkUser, ApiController.getJobDetail);
router.get('/api/getJobApplicantsList', checkUser, ApiController.getJobApplicantsList);
router.get('/api/getResumes', checkUser, ApiController.getResumes);
router.post('/api/deleteResume', checkUser, ApiController.genericHandler);

// Event Routes
router.post('/api/saveEventInformation', uploadEvents.single('event_banner_file'), ApiController.saveEventInformation);
router.get('/api/getEventInformation', ApiController.getEventInformation);
router.get('/api/getEventDetail', checkUser, ApiController.getEventDetail);
router.get('/api/getEventOrganisersList', checkUser, ApiController.getEventOrganisersList);
router.post('/api/saveEventOrganiser', checkUser, ApiController.genericHandler);
router.post('/api/deleteEventOrganiser', checkUser, ApiController.genericHandler);
router.get('/api/getEventAttendeesList', checkUser, ApiController.getEventAttendeesList);
router.post('/api/saveEventAttendee', checkUser, ApiController.genericHandler);
router.post('/api/deleteEventAttendee', checkUser, ApiController.genericHandler);

router.get('/api/getEventsAttendedList', checkUser, ApiController.getEventsAttendedList);
router.get('/api/getEventsOrganisedList', checkUser, ApiController.getEventsOrganisedList);

// Folder Routes
router.get('/api/getFoldersListByType', checkUser, ApiController.getFoldersListByType);
router.post('/api/saveFolderByType', checkUser, ApiController.genericHandler);

router.get('/api/getSubFoldersList', checkUser, ApiController.getSubFoldersList);
router.post('/api/saveSubFolder', checkUser, ApiController.genericHandler);
router.post('/api/editSubFolder', checkUser, ApiController.genericHandler);
router.post('/api/deleteSubFolder', checkUser, ApiController.genericHandler);

// Contact Routes
router.post('/api/saveContact', checkUser, ApiController.genericHandler);
router.get('/api/getContactsList', checkUser, ApiController.getContactsList);

router.post('/api/saveContactVisitingCard', checkUser, ApiController.saveContactVisitingCard);
router.get('/api/getContactVisitingCardInformation', checkUser, ApiController.getContactVisitingCardInformation);

// Legal Terms Route
router.get('/api/legalTerms', checkUser, ApiController.legalTerms);

// Business Card Routes
router.post('/api/activateCard', checkUser, ApiController.activateCard);
router.get('/api/getBusinessCardInformation', checkUser, ApiController.getBusinessCardInformation);

// Promotions Route
router.get('/api/getPromotionsList', checkUser, ApiController.getPromotionsList);

// Service Routes
router.get('/api/getServicesMasterList', checkUser, ApiController.getServicesMasterList);
router.post('/api/saveServiceProvider', checkUser, ApiController.genericHandler);
router.get('/api/getServicesList', checkUser, ApiController.getServicesList);
router.post('/api/saveServiceDetails', checkUser, ApiController.saveServiceDetails);
router.get('/api/getServiceDetail', checkUser, ApiController.getServiceDetail);
router.get('/api/getAllServicesList', checkUser, ApiController.getAllServicesList);

// Unlock Routes
router.post('/api/serviceUnlock', checkUser, ApiController.serviceUnlock);
router.get('/api/getAllServiceUnlockList', checkUser, ApiController.getAllServiceUnlockList);

// Review/Rating Routes
router.post('/api/saveReviewRating', checkUser, ApiController.genericHandler);

// Investor Routes
router.post('/api/saveInvestor', checkUser, ApiController.genericHandler);
router.get('/api/getAllInvestorsList', checkUser, ApiController.getAllInvestorsList);
router.get('/api/getInvestorDetail', checkUser, ApiController.getInvestorDetail);
router.post('/api/investorUnlock', checkUser, ApiController.investorUnlock);
router.post('/api/saveInvestorReviewRating', checkUser, ApiController.genericHandler);
router.get('/api/getInvestorProfile', checkUser, ApiController.getInvestorProfile);
router.get('/api/getInvestorMeets', checkUser, ApiController.getInvestorMeets);
router.get('/api/getInvestorDesk', checkUser, ApiController.getInvestorDesk);

// Chat Routes
router.get('/api/getChatUsersList', checkUser, ApiController.getChatUsersList);
router.post('/api/saveChat', checkUser, ApiController.saveChat);
router.get('/api/getChat', checkUser, ApiController.getChat);

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


