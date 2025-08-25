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
const { uploadProfilePhoto, uploadFormData, uploadEvents, uploadResume, uploadInvestor } = require('../middlewares/upload');

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
router.post('/Api-Send-Otp', AuthController.sendOtp);
router.post('/Api-Verify-Otp', AuthController.verifyOtp);
router.post('/Api-Login', ApiController.login);
router.post('/Api-Logout', checkUser, ApiController.logout);

// Master Data Routes
router.get('/Api-Country-List', ApiController.getCountryList);
router.post('/Api-Country-List', uploadFormData.none(), ApiController.getCountryList);
router.get('/Api-State-List', ApiController.getStateList);
router.post('/Api-State-List', uploadFormData.none(), ApiController.getStateList);
router.get('/Api-City-List', ApiController.getCityList);
router.post('/Api-City-List', uploadFormData.none(), ApiController.getCityList);
router.get('/Api-Interests-List', ApiController.getInterestsList);
router.post('/Api-Interests-List', uploadFormData.none(), ApiController.getInterestsList);
router.get('/Api-Employment-Type-List', ApiController.getEmploymentTypeList);
router.post('/Api-Employment-Type-List', uploadFormData.none(), ApiController.getEmploymentTypeList);
router.get('/Api-Job-Type-List', ApiController.getJobTypeList);
router.post('/Api-Job-Type-List', uploadFormData.none(), ApiController.getJobTypeList);
router.get('/Api-Pay-List', ApiController.getPayList);
router.post('/Api-Pay-List', uploadFormData.none(), ApiController.getPayList);
router.get('/Api-Event-Mode-List', ApiController.getEventModeList);
router.post('/Api-Event-Mode-List', uploadFormData.none(), ApiController.getEventModeList);
router.get('/Api-Event-Type-List', ApiController.getEventTypeList);
router.post('/Api-Event-Type-List', uploadFormData.none(), ApiController.getEventTypeList);
router.get('/Api-Fund-Size-List', ApiController.getFundSizeList);
router.post('/Api-Fund-Size-List', uploadFormData.none(), ApiController.getFundSizeList);

// Profile Routes
router.post('/Api-Update-Profile', uploadProfilePhoto.single('profile_photo'), ApiController.updateProfile);
router.get('/Api-View-Profile', ApiController.getProfile);
router.get('/Api-View-User-Detail-By-Mobile', ApiController.getUserDetailByMobile);
router.get('/Api-View-User-Profile-By-Mobile', ApiController.getUserProfileByMobile);
router.post('/Api-Save-Work-Details', uploadFormData.none(), ApiController.saveWorkDetails);
router.get('/Api-View-Work-Details', ApiController.getWorkDetails);
router.post('/Api-Delete-Work-Detail', uploadFormData.none(), ApiController.deleteWorkDetail);
router.post('/Api-Save-Project-Details', uploadFormData.single('project_logo'), ApiController.saveProjectDetails);
router.get('/Api-View-Project-Details', ApiController.getProjectDetails);
router.post('/Api-Delete-Project-Detail', uploadFormData.none(), ApiController.deleteProjectDetail);
router.post('/Api-Save-Education-Details', uploadFormData.none(), ApiController.saveEducationDetails);
router.get('/Api-View-Education-Details', ApiController.getEducationDetails);
router.post('/Api-Delete-Education-Detail', uploadFormData.none(), ApiController.deleteEducationDetail);
router.post('/Api-Save-Event-Organiser', uploadFormData.none(), ApiController.saveEventOrganiser);
router.get('/Api-Event-Organisers-List', ApiController.getEventOrganisersList);
router.post('/Api-Delete-Event-Organiser', uploadFormData.none(), ApiController.deleteEventOrganiser);
router.get('/Api-Event-Attendees-List', ApiController.getEventAttendeesList);
router.post('/Api-Save-Event-Attendee', uploadFormData.none(), ApiController.saveEventAttendee);
router.post('/Api-Delete-Event-Attendee', uploadFormData.none(), ApiController.deleteEventAttendee);
router.get('/Api-View-User-Detail-By-Qrcode', checkUser, ApiController.getUserDetailByQrCode);


// Dashboard Route - Support both GET and POST for form data
router.get('/Api-Dashboard', ApiController.dashboard);
router.post('/Api-Dashboard', ApiController.dashboard);
router.get('/Api-Legal-Terms', ApiController.legalTerms);

// Job Routes
router.post('/Api-Save-Job-Information', uploadFormData.none(), ApiController.saveJobInformation);
router.get('/Api-View-Job-Information', ApiController.getJobInformation);
router.post('/Api-Save-Job-Application', uploadResume.single('resume_file'), ApiController.saveJobApplication);
router.get('/Api-View-Job-Details', ApiController.getJobDetail);
router.get('/Api-Get-Job-Applicants-List', checkUser, ApiController.getJobApplicantsList);
router.get('/Api-View-Resumes', ApiController.getResumes);
router.post('/Api-Delete-Resume', uploadFormData.none(), ApiController.deleteResume);

// Event Routes
router.post('/Api-Save-Event-Information', uploadEvents.single('event_banner_file'), ApiController.saveEventInformation);
router.get('/Api-View-Event-Information', ApiController.getEventInformation);
router.get('/Api-View-Event-Details', ApiController.getEventDetail);
router.get('/Api-Event-Organisers-List', ApiController.getEventOrganisersList);
router.post('/Api-Save-Event-Organiser', uploadFormData.none(), ApiController.saveEventOrganiser);
router.post('/Api-Delete-Event-Organiser', uploadFormData.none(), ApiController.deleteEventOrganiser);
router.get('/Api-Event-Attendees-List', ApiController.getEventAttendeesList);
router.get('/Api-View-Events-Attended', ApiController.getEventsAttendedList);
router.get('/Api-View-Events-Organised', ApiController.getEventsOrganisedList);
router.post('/Api-Save-Event-Attendee', uploadFormData.none(), ApiController.saveEventAttendee);
router.post('/Api-Delete-Event-Attendee', uploadFormData.none(), ApiController.deleteEventAttendee);

// Folder Management Routes
router.get('/Api-Folders-List-By-Type', ApiController.getFoldersListByType);
router.post('/Api-Add-Folder-By-Type', uploadFormData.none(), ApiController.saveFolderByType);
router.get('/Api-Sub-Folders-List', ApiController.getSubFoldersList);
router.post('/Api-Add-Sub-Folder', uploadFormData.none(), ApiController.saveSubFolder);

// Contact Management Routes
router.get('/Api-Contacts-List', ApiController.getContactsList);
router.post('/Api-Add-Contact', uploadFormData.none(), ApiController.saveContact);
router.post('/Api-Add-Contact-Visiting-Card', uploadFormData.fields([
  { name: 'visiting_card_front', maxCount: 1 },
  { name: 'visiting_card_back', maxCount: 1 }
]), ApiController.saveContactVisitingCard);
router.get('/Api-View-Contact-Visiting-Card', ApiController.getContactVisitingCardInformation);

// Business Card Routes
router.post('/Api-Activate-Card', uploadFormData.array('business_documents_file[]', 10), ApiController.activateCard);

// Promotions Routes
router.get('/Api-Promotions-List', ApiController.getPromotionsList);

// Services Master Routes
router.get('/Api-Service-Master-List', ApiController.getServicesMasterList);

// Services List Routes
router.get('/Api-Services-List', ApiController.getServicesList);
router.get('/Api-All-Services-List', ApiController.getAllServicesList);

// Service Provider Routes
router.post('/Api-Save-Service-Provider', uploadFormData.none(), ApiController.saveServiceProvider);

// Review Rating Routes
router.post('/Api-Add-Review-Rating', uploadFormData.none(), ApiController.saveReviewRating);

// Service Details Routes
router.post('/Api-Save-Service-Details', uploadFormData.fields([{ name: 'service_image', maxCount: 1 }]), ApiController.saveServiceDetails);
router.get('/Api-View-Service-Details', ApiController.getServiceDetail);

// Service Unlock Routes
router.post('/Api-Service-Unlock', uploadFormData.none(), ApiController.serviceUnlock);
router.get('/Api-All-Service-Unlock-List', ApiController.getAllServiceUnlockList);

// Investor Routes
router.post('/Api-Save-Investor', uploadInvestor.single('image'), ApiController.saveInvestor);
router.get('/Api-All-Investors-List', ApiController.getAllInvestorsList);
router.get('/Api-View-Investor-Details', ApiController.getInvestorDetail);
router.post('/Api-Investor-Unlock', uploadFormData.none(), ApiController.investorUnlock);
router.post('/Api-Add-Investor-Review-Rating', uploadFormData.none(), ApiController.saveInvestorReviewRating);
router.get('/Api-My-Investor-Profile', ApiController.getMyInvestorProfile);
router.get('/Api-My-Investor-Meets', ApiController.getInvestorMeets);
router.get('/Api-Investor-Desk', ApiController.getInvestorDesk);

// Chat Routes
router.post('/Api-Save-Chat', uploadFormData.none(), ApiController.saveChat);
router.get('/Api-View-Chat', ApiController.getChat);
router.get('/Api-Chat-Users-List', ApiController.getChatUsersList);

// Business Card Routes
router.get('/Api-View-Business-Card', ApiController.getBusinessCardInformation);

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
      note: 'All API endpoints now use exact PHP route names (e.g., /Api-Country-List)'
    }
  });
});

module.exports = router;


