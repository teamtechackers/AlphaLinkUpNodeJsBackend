'use strict';

const express = require('express');
const path = require('path');
const router = express.Router();

// Import controllers
const AuthController = require('../controllers/AuthController');
const ApiController = require('../controllers/apiController');
const AdminController = require('../controllers/AdminController');
const AdminPermissionController = require('../controllers/AdminPermissionController');
const CountryController = require('../controllers/countryController');
const StateController = require('../controllers/stateController');
const CityController = require('../controllers/cityController');
const DashboardController = require('../controllers/dashboardController');
const InterestController = require('../controllers/InterestController');
const EmploymentTypeController = require('../controllers/EmploymentTypeController');
const JobTypeController = require('../controllers/jobTypeController');
const PayController = require('../controllers/payController');
const EventModeController = require('../controllers/eventModeController');
const EventTypeController = require('../controllers/eventTypeController');
const FundController = require('../controllers/FundController');
const EventController = require('../controllers/EventController');
const UserProfileController = require('../controllers/userProfileController');
const JobController = require('../controllers/JobController');
const FolderController = require('../controllers/FolderController');
const FCMTokenController = require('../controllers/FCMTokenController');
const UserController = require('../controllers/UserController');

const authenticate = require('../middlewares/authenticate');
const adminAuth = require('../middlewares/adminAuth');
const validate = require('../middlewares/validation');
const rateLimiter = require('../middlewares/rateLimiter');
const { checkPermission, requireSuperAdmin } = require('../middlewares/checkPermission');

const { checkUser } = require('../middlewares/checkUser');
const { uploadProfilePhoto, uploadFormData, uploadEvents, uploadResume, uploadInvestor, uploadVisitingCards, uploadServices, uploadProjectLogo, uploadBusinessDocs, uploadBusinessCards } = require('../middlewares/upload');
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
router.post('/Api-Send-Otp', uploadFormData.any(), AuthController.sendOtp);
router.post('/Api-Verify-Otp', uploadFormData.any(), AuthController.verifyOtp);
router.post('/Api-Login', ApiController.login);
router.post('/Api-Logout', uploadFormData.none(), ApiController.logout);
router.get('/Api-Logout', ApiController.logout);
// Master Data Routes
router.get('/Api-Country-List', CountryController.getCountryList);
router.post('/Api-Country-List', uploadFormData.none(), CountryController.getCountryList);
router.get('/Api-State-List', StateController.getStateList);
router.post('/Api-State-List', uploadFormData.none(), StateController.getStateList);
router.get('/Api-City-List', CityController.getCityList);
router.post('/Api-City-List', uploadFormData.none(), CityController.getCityList);
router.get('/Api-Interests-List', InterestController.getInterestsList);
router.post('/Api-Interests-List', uploadFormData.none(), InterestController.getInterestsList);
router.get('/Api-Employment-Type-List', EmploymentTypeController.getEmploymentTypeList);
router.post('/Api-Employment-Type-List', uploadFormData.none(), EmploymentTypeController.getEmploymentTypeList);
router.get('/Api-Job-Type-List', JobTypeController.getJobTypeList);
router.post('/Api-Job-Type-List', uploadFormData.none(), JobTypeController.getJobTypeList);
router.get('/Api-Pay-List', PayController.getPayList);
router.post('/Api-Pay-List', uploadFormData.none(), PayController.getPayList);
router.get('/Api-Event-Mode-List', EventModeController.getEventModeList);
router.post('/Api-Event-Mode-List', uploadFormData.none(), EventModeController.getEventModeList);
router.get('/Api-Event-Type-List', EventTypeController.getEventTypeList);
router.post('/Api-Event-Type-List', uploadFormData.none(), EventTypeController.getEventTypeList);
router.get('/Api-Fund-Size-List', FundController.getFundSizeList);
router.post('/Api-Fund-Size-List', uploadFormData.none(), FundController.getFundSizeList);
router.get('/Api-User-List', UserController.fetchUserByNameId);
router.post('/Api-User-List', uploadFormData.none(), UserController.fetchUserByNameId);
router.get('/Api-Industry-Type-List', UserController.fetchIndustryTypeByNameId);
router.post('/Api-Industry-Type-List', uploadFormData.none(), UserController.fetchIndustryTypeByNameId);
// Profile Routes
router.post('/Api-Update-Profile', uploadProfilePhoto.single('profile_photo'), UserProfileController.updateProfile);
router.get('/Api-View-Profile', UserProfileController.getProfile);
router.post('/Api-View-Profile', uploadFormData.none(), UserProfileController.getProfile);
router.get('/Api-View-User-Detail-By-Mobile', UserProfileController.getUserDetailByMobile);
router.post('/Api-View-User-Detail-By-Mobile', uploadFormData.none(), UserProfileController.getUserDetailByMobile);
router.get('/Api-View-Profile-By-Mobile', UserProfileController.getUserProfileByMobile);
router.post('/Api-View-Profile-By-Mobile', uploadFormData.none(), UserProfileController.getUserProfileByMobile);
router.post('/Api-User-Deleted-Account', uploadFormData.none(), UserProfileController.requestAccountDeletion);
router.post('/Api-Save-Work-Details', uploadFormData.none(), UserProfileController.saveWorkDetails);
router.get('/Api-View-Work-Details', UserProfileController.getWorkDetails);
router.post('/Api-View-Work-Details', uploadFormData.none(), UserProfileController.getWorkDetails);
router.post('/Api-Delete-Work-Detail', uploadFormData.none(), UserProfileController.deleteWorkDetail);
router.post('/Api-Save-Project-Details', uploadProjectLogo.single('project_logo'), ApiController.saveProjectDetails);
router.get('/Api-View-Project-Details', ApiController.getProjectDetails);
router.post('/Api-View-Project-Details', uploadFormData.none(), ApiController.getProjectDetails);
router.post('/Api-Delete-Project-Detail', uploadFormData.none(), ApiController.deleteProjectDetail);
router.post('/Api-Save-Education-Details', uploadFormData.none(), UserProfileController.saveEducationDetails);
router.get('/Api-View-Education-Details', UserProfileController.getEducationDetails);
router.post('/Api-Delete-Education-Detail', uploadFormData.none(), UserProfileController.deleteEducationDetail);
router.post('/Api-Save-Event-Organiser', uploadFormData.none(), EventController.saveEventOrganiser);
router.post('/Api-Delete-Event-Organiser', uploadFormData.none(), EventController.deleteEventOrganiser);
router.post('/Api-Save-Event-Attendee', uploadFormData.none(), EventController.saveEventAttendee);
router.post('/Api-Delete-Event-Attendee', uploadFormData.none(), EventController.deleteEventAttendee);
router.get('/Api-View-User-Detail-By-Qrcode', checkUser, UserProfileController.getUserDetailByQrCode);
// Dashboard Route - Support both GET and POST for form data
router.get('/Api-Dashboard', DashboardController.dashboard);
router.post('/Api-Dashboard', DashboardController.dashboard);
router.get('/Api-Legal-Terms', ApiController.legalTerms);
// Job Routes
router.post('/Api-Save-Job-Information', uploadFormData.none(), JobController.saveJobInformation);
router.get('/Api-View-Job-Information', JobController.getJobInformation);
router.post('/Api-View-Job-Information', uploadFormData.none(), JobController.getJobInformation);
router.post('/Api-Apply-Job', uploadResume.single('resume_file'), JobController.saveJobApplication);
router.post('/Api-Delete-Resume', uploadFormData.none(), ApiController.deleteResume);
router.get('/Api-View-Resumes', ApiController.viewResumes);
router.post('/Api-View-Resumes', uploadFormData.none(), ApiController.viewResumes);
router.get('/Api-View-Job-Details', JobController.getJobDetail);
router.post('/Api-View-Job-Details', uploadFormData.none(), JobController.getJobDetail);
// Removed unused job-related routes
// Event Routes
router.post('/Api-Save-Event-Information', uploadEvents.single('event_banner_file'), EventController.saveEventInformation);
router.get('/Api-View-Event-Information', EventController.getEventInformation);
router.post('/Api-View-Event-Information', uploadFormData.none(), EventController.getEventInformation);
router.get('/Api-View-Event-Details', EventController.getEventDetail);
router.post('/Api-View-Event-Details', uploadFormData.none(), EventController.getEventDetail);
router.get('/Api-Event-Organisers-List', EventController.getEventOrganisersList);
router.post('/Api-Event-Organisers-List', uploadFormData.none(), EventController.getEventOrganisersList);
router.post('/Api-Save-Event-Organiser', uploadFormData.none(), EventController.saveEventOrganiser);
router.post('/Api-Delete-Event-Organiser', uploadFormData.none(), EventController.deleteEventOrganiser);
router.get('/Api-Event-Attendees-List', EventController.getEventAttendeesList);
router.post('/Api-Event-Attendees-List', uploadFormData.none(), EventController.getEventAttendeesList);
router.get('/Api-View-Events-Attended', EventController.getEventsAttendedList);
router.post('/Api-View-Events-Attended', uploadFormData.none(), EventController.getEventsAttendedList);
router.get('/Api-View-Events-Organised', EventController.getEventsOrganisedList);
router.post('/Api-View-Events-Organised', uploadFormData.none(), EventController.getEventsOrganisedList);
router.post('/Api-Save-Event-Attendee', uploadFormData.none(), EventController.saveEventAttendee);
router.post('/Api-Delete-Event-Attendee', uploadFormData.none(), EventController.deleteEventAttendee);
// Folder Management Routes
router.get('/Api-Folders-List-By-Type', FolderController.getFoldersListByType);
router.post('/Api-Add-Folder-By-Type', uploadFormData.none(), FolderController.saveFolderByType);
router.get('/Api-Sub-Folders-List', FolderController.getSubFoldersList);
router.post('/Api-Add-Sub-Folder', uploadFormData.none(), FolderController.saveSubFolder);
router.post('/Api-Delete-Sub-Folder', uploadFormData.none(), FolderController.deleteSubFolder);
// Contact Management Routes
router.get('/Api-Contacts-List', FolderController.getContactsList);
router.post('/Api-Add-Contact', uploadFormData.none(), ApiController.saveContact);
router.post('/Api-Add-Contact-Visiting-Card', uploadVisitingCards.fields([
  { name: 'visiting_card_front', maxCount: 1 },
  { name: 'visiting_card_back', maxCount: 1 }
]), ApiController.saveContactVisitingCard);
router.get('/Api-View-Contact-Visiting-Card', FolderController.getContactVisitingCardInformation);
// Business Card Routes
router.get('/Api-Activate-Card', ApiController.activateCard);
router.post('/Api-Activate-Card', uploadBusinessDocs.array('business_documents_file', 10), ApiController.activateCard);
// Promotions Routes
router.get('/Api-Promotions-List', ApiController.getPromotionsList);
// Services Master Routes
router.get('/Api-Service-Master-List', ApiController.getServicesMasterList);
router.post('/Api-Service-Master-List', uploadFormData.none(), ApiController.getServicesMasterList);
// Services List Routes
router.get('/Api-Services-List', ApiController.getServicesList);
router.get('/Api-All-Services-List', ApiController.getAllServicesList);
router.post('/Api-All-Services-List', uploadFormData.none(), ApiController.getAllServicesList);
// Service Provider Routes
router.post('/Api-Save-Service-Provider', uploadFormData.none(), ApiController.saveServiceProvider);
// Review Rating Routes
router.post('/Api-Add-Review-Rating', uploadFormData.none(), ApiController.saveReviewRating);
// Service Details Routes
router.post('/Api-Save-Service-Details', uploadServices.fields([{ name: 'service_image', maxCount: 1 }]), ApiController.saveServiceDetails);
router.get('/Api-View-Service-Details', ApiController.getServiceDetail);
router.post('/Api-View-Service-Details', uploadFormData.none(), ApiController.getServiceDetail);
// Service Unlock Routes
router.get('/Api-Service-Unlock', ApiController.serviceUnlock);
router.post('/Api-Service-Unlock', uploadFormData.none(), ApiController.serviceUnlock);
router.get('/Api-All-Service-Unlock-List', ApiController.getAllServiceUnlockList);
router.post('/Api-All-Service-Unlock-List', uploadFormData.none(), ApiController.getAllServiceUnlockList);
// Admin Routes
router.get('/admin-login', AdminController.adminLogin);
router.post('/admin-login', uploadFormData.none(), AdminController.adminLogin);
router.get('/permission-denied', AdminController.permissionDenied);
router.get('/admin-dashboard', AdminController.getDashboard);
router.post('/admin-dashboard', uploadFormData.none(), AdminController.getDashboard);
router.get('/list-country', checkPermission('master_data.view'), CountryController.getAdminCountryList);
router.post('/list-country', checkPermission('master_data.view'), uploadFormData.none(), CountryController.getAdminCountryList);
router.get('/list-country-ajax', checkPermission('master_data.view'), CountryController.getAdminCountryLists);
router.post('/list-country-ajax', checkPermission('master_data.view'), uploadFormData.none(), CountryController.getAdminCountryLists);
router.get('/save-country', checkPermission('master_data.create'), CountryController.saveAdminCountry);
router.post('/save-country', checkPermission('master_data.create'), uploadFormData.none(), CountryController.saveAdminCountry);
router.get('/edit-country/:id', checkPermission('master_data.edit'), CountryController.viewAdminAddEditForm);
router.post('/edit-country/:id', checkPermission('master_data.edit'), uploadFormData.none(), CountryController.viewAdminAddEditForm);
router.get('/delete-country/:id', checkPermission('master_data.delete'), CountryController.deleteAdminCountry);
router.post('/delete-country/:id', checkPermission('master_data.delete'), uploadFormData.none(), CountryController.deleteAdminCountry);
router.get('/check-duplicate-country', checkPermission('master_data.view'), CountryController.checkAdminDuplicateCountry);
router.post('/check-duplicate-country', checkPermission('master_data.view'), uploadFormData.none(), CountryController.checkAdminDuplicateCountry);
router.get('/list-state', checkPermission('master_data.view'), StateController.viewAdminState);
router.post('/list-state', checkPermission('master_data.view'), uploadFormData.none(), StateController.viewAdminState);
router.get('/submit-state', checkPermission('master_data.create'), StateController.submitAdminState);
router.post('/submit-state', checkPermission('master_data.create'), uploadFormData.none(), StateController.submitAdminState);
router.get('/update-state', checkPermission('master_data.edit'), StateController.updateStateById);
router.post('/update-state', checkPermission('master_data.edit'), uploadFormData.none(), StateController.updateStateById);
router.get('/list-state-ajax', checkPermission('master_data.view'), StateController.listAdminStateAjax);
router.post('/list-state-ajax', checkPermission('master_data.view'), uploadFormData.none(), StateController.listAdminStateAjax);
router.get('/check-duplicate-state', checkPermission('master_data.view'), StateController.checkAdminDuplicateState);
router.post('/check-duplicate-state', checkPermission('master_data.view'), uploadFormData.none(), StateController.checkAdminDuplicateState);
router.get('/delete-state', checkPermission('master_data.delete'), StateController.deleteAdminState);
router.post('/delete-state', checkPermission('master_data.delete'), uploadFormData.none(), StateController.deleteAdminState);
router.get('/submit-cities', checkPermission('master_data.create'), CityController.submitCities);
router.post('/submit-cities', checkPermission('master_data.create'), uploadFormData.none(), CityController.submitCities);
router.get('/check-duplicate-cities', checkPermission('master_data.view'), CityController.checkDuplicateCities);
router.post('/check-duplicate-cities', checkPermission('master_data.view'), uploadFormData.none(), CityController.checkDuplicateCities);
router.get('/delete-cities', checkPermission('master_data.delete'), AdminController.deleteCities);
router.post('/delete-cities', checkPermission('master_data.delete'), uploadFormData.none(), AdminController.deleteCities);
router.get('/list-employment-type', checkPermission('master_data.view'), EmploymentTypeController.adminViewEmploymentType);
router.post('/list-employment-type', checkPermission('master_data.view'), uploadFormData.none(), EmploymentTypeController.adminViewEmploymentType);
router.get('/submit-employment-type', checkPermission('master_data.create'), EmploymentTypeController.adminSubmitEmploymentType);
router.post('/submit-employment-type', checkPermission('master_data.create'), uploadFormData.none(), EmploymentTypeController.adminSubmitEmploymentType);
router.get('/list-employment-type-ajax', checkPermission('master_data.view'), EmploymentTypeController.adminListEmploymentTypeAjax);
router.post('/list-employment-type-ajax', checkPermission('master_data.view'), uploadFormData.none(), EmploymentTypeController.adminListEmploymentTypeAjax);
router.get('/check-duplicate-employment-type', checkPermission('master_data.view'), EmploymentTypeController.adminCheckDuplicateEmploymentType);
router.post('/check-duplicate-employment-type', checkPermission('master_data.view'), uploadFormData.none(), EmploymentTypeController.adminCheckDuplicateEmploymentType);
router.get('/get-employment-type-list', checkPermission('master_data.view'), EmploymentTypeController.adminListEmploymentTypeAjax);
router.get('/delete-employment-type', checkPermission('master_data.delete'), EmploymentTypeController.adminDeleteEmploymentType);
router.post('/delete-employment-type', checkPermission('master_data.delete'), uploadFormData.none(), EmploymentTypeController.adminDeleteEmploymentType);
router.get('/list-interests', checkPermission('master_data.view'), InterestController.viewInterests);
router.post('/list-interests', checkPermission('master_data.view'), uploadFormData.none(), InterestController.viewInterests);
router.get('/submit-interest', checkPermission('master_data.create'), InterestController.submitInterest);
router.post('/submit-interest', checkPermission('master_data.create'), uploadFormData.none(), InterestController.submitInterest);
router.get('/list-interest-ajax', checkPermission('master_data.view'), InterestController.adminListInterestAjax);
router.post('/list-interest-ajax', checkPermission('master_data.view'), uploadFormData.none(), InterestController.adminListInterestAjax);
router.get('/check-duplicate-interest', checkPermission('master_data.view'), InterestController.checkDuplicateInterest);
router.post('/check-duplicate-interest', checkPermission('master_data.view'), uploadFormData.none(), InterestController.checkDuplicateInterest);
router.get('/delete-interest', checkPermission('master_data.delete'), InterestController.deleteInterest);
router.post('/delete-interest', checkPermission('master_data.delete'), uploadFormData.none(), InterestController.deleteInterest);
router.get('/list-job-type', checkPermission('master_data.view'), JobTypeController.adminViewJobType);
router.post('/list-job-type', checkPermission('master_data.view'), uploadFormData.none(), JobTypeController.adminViewJobType);
router.get('/submit-job-type', checkPermission('master_data.create'), JobTypeController.adminSubmitJobType);
router.post('/submit-job-type', checkPermission('master_data.create'), uploadFormData.none(), JobTypeController.adminSubmitJobType);
router.get('/list-job-type-ajax', checkPermission('master_data.view'), JobTypeController.adminListJobTypeAjax);
router.post('/list-job-type-ajax', checkPermission('master_data.view'), uploadFormData.none(), JobTypeController.adminListJobTypeAjax);
router.get('/check-duplicate-job-type', checkPermission('master_data.view'), JobTypeController.adminCheckDuplicateJobType);
router.post('/check-duplicate-job-type', checkPermission('master_data.view'), uploadFormData.none(), JobTypeController.adminCheckDuplicateJobType);
router.get('/delete-job-type', checkPermission('master_data.delete'), JobTypeController.adminDeleteJobType);
router.post('/delete-job-type', checkPermission('master_data.delete'), uploadFormData.none(), JobTypeController.adminDeleteJobType);
router.get('/list-pay', checkPermission('master_data.view'), PayController.adminViewPay);
router.post('/list-pay', checkPermission('master_data.view'), uploadFormData.none(), PayController.adminViewPay);
router.get('/submit-pay', checkPermission('master_data.create'), PayController.adminSubmitPay);
router.post('/submit-pay', checkPermission('master_data.create'), uploadFormData.none(), PayController.adminSubmitPay);
router.get('/list-pay-ajax', checkPermission('master_data.view'), PayController.adminListPayAjax);
router.post('/list-pay-ajax', checkPermission('master_data.view'), uploadFormData.none(), PayController.adminListPayAjax);
router.get('/check-duplicate-pay', checkPermission('master_data.view'), PayController.adminCheckDuplicatePay);
router.post('/check-duplicate-pay', checkPermission('master_data.view'), uploadFormData.none(), PayController.adminCheckDuplicatePay);
router.get('/delete-pay', checkPermission('master_data.delete'), PayController.adminDeletePay);
router.post('/delete-pay', checkPermission('master_data.delete'), uploadFormData.none(), PayController.adminDeletePay);
router.get('/list-event-mode', checkPermission('master_data.view'), EventModeController.adminViewEventMode);
router.post('/list-event-mode', checkPermission('master_data.view'), uploadFormData.none(), EventModeController.adminViewEventMode);
router.get('/submit-event-mode', checkPermission('master_data.create'), EventModeController.adminSubmitEventMode);
router.post('/submit-event-mode', checkPermission('master_data.create'), uploadFormData.none(), EventModeController.adminSubmitEventMode);
router.get('/list-event-mode-ajax', checkPermission('master_data.view'), EventModeController.adminListEventModeAjax);
router.post('/list-event-mode-ajax', checkPermission('master_data.view'), uploadFormData.none(), EventModeController.adminListEventModeAjax);
router.get('/check-duplicate-event-mode', checkPermission('master_data.view'), EventModeController.adminCheckDuplicateEventMode);
router.post('/check-duplicate-event-mode', checkPermission('master_data.view'), uploadFormData.none(), EventModeController.adminCheckDuplicateEventMode);
router.get('/delete-event-mode', checkPermission('master_data.delete'), EventModeController.adminDeleteEventMode);
router.post('/delete-event-mode', checkPermission('master_data.delete'), uploadFormData.none(), EventModeController.adminDeleteEventMode);
router.get('/list-event-type', checkPermission('master_data.view'), EventTypeController.adminViewEventType);
router.post('/list-event-type', checkPermission('master_data.view'), uploadFormData.none(), EventTypeController.adminViewEventType);
router.get('/submit-event-type', checkPermission('master_data.create'), EventTypeController.adminSubmitEventType);
router.post('/submit-event-type', checkPermission('master_data.create'), uploadFormData.none(), EventTypeController.adminSubmitEventType);
router.get('/list-event-type-ajax', checkPermission('master_data.view'), EventTypeController.adminListEventTypeAjax);
router.post('/list-event-type-ajax', checkPermission('master_data.view'), uploadFormData.none(), EventTypeController.adminListEventTypeAjax);
router.get('/check-duplicate-event-type', checkPermission('master_data.view'), EventTypeController.adminCheckDuplicateEventType);
router.post('/check-duplicate-event-type', checkPermission('master_data.view'), uploadFormData.none(), EventTypeController.adminCheckDuplicateEventType);
router.get('/delete-event-type', checkPermission('master_data.delete'), EventTypeController.adminDeleteEventType);
router.post('/delete-event-type', checkPermission('master_data.delete'), uploadFormData.none(), EventTypeController.adminDeleteEventType);
router.get('/list-industry-type', checkPermission('master_data.view'), AdminController.viewIndustryType);
router.post('/list-industry-type', checkPermission('master_data.view'), uploadFormData.none(), AdminController.viewIndustryType);
router.get('/submit-industry-type', checkPermission('master_data.create'), AdminController.submitIndustryType);
router.post('/submit-industry-type', checkPermission('master_data.create'), uploadFormData.none(), AdminController.submitIndustryType);
router.get('/list-industry-type-ajax', checkPermission('master_data.view'), AdminController.listIndustryTypeAjax);
router.post('/list-industry-type-ajax', checkPermission('master_data.view'), uploadFormData.none(), AdminController.listIndustryTypeAjax);
router.get('/check-duplicate-industry-type', checkPermission('master_data.view'), AdminController.checkDuplicateIndustryType);
router.post('/check-duplicate-industry-type', checkPermission('master_data.view'), uploadFormData.none(), AdminController.checkDuplicateIndustryType);
router.get('/delete-industry-type', checkPermission('master_data.delete'), AdminController.deleteIndustryType);
router.post('/delete-industry-type', checkPermission('master_data.delete'), uploadFormData.none(), AdminController.deleteIndustryType);
router.get('/list-fund-size', checkPermission('master_data.view'), FundController.viewFundSize);
router.post('/list-fund-size', checkPermission('master_data.view'), uploadFormData.none(), FundController.viewFundSize);
router.get('/submit-fund-size', checkPermission('master_data.create'), FundController.submitFundSize);
router.post('/submit-fund-size', checkPermission('master_data.create'), FundController.submitFundSize);
router.get('/list-fund-size-ajax', checkPermission('master_data.view'), FundController.listFundSizeAjax);
router.post('/list-fund-size-ajax', checkPermission('master_data.view'), uploadFormData.none(), FundController.listFundSizeAjax);
router.get('/check-duplicate-fund-size', checkPermission('master_data.view'), FundController.checkDuplicateFundSize);
router.post('/check-duplicate-fund-size', checkPermission('master_data.view'), uploadFormData.none(), FundController.checkDuplicateFundSize);
router.get('/delete-fund-size', checkPermission('master_data.delete'), FundController.deleteFundSize);
router.post('/delete-fund-size', checkPermission('master_data.delete'), uploadFormData.none(), FundController.deleteFundSize);

router.get('/list-folders', checkPermission('master_data.view'), FolderController.viewFolders);
router.post('/list-folders', checkPermission('master_data.view'), uploadFormData.none(), FolderController.viewFolders);
router.get('/submit-folders', checkPermission('master_data.create'), FolderController.submitFolders);
router.post('/submit-folders', checkPermission('master_data.create'), uploadFormData.none(), FolderController.submitFolders);
router.get('/list-folders-ajax', checkPermission('master_data.view'), FolderController.listFoldersAjax);
router.post('/list-folders-ajax', checkPermission('master_data.view'), uploadFormData.none(), FolderController.listFoldersAjax);
router.get('/check-duplicate-folders', checkPermission('master_data.view'), FolderController.checkDuplicateFolder);
router.post('/check-duplicate-folders', checkPermission('master_data.view'), uploadFormData.none(), FolderController.checkDuplicateFolder);
router.get('/delete-folders', checkPermission('master_data.delete'), FolderController.deleteFolders);
router.post('/delete-folders', checkPermission('master_data.delete'), uploadFormData.none(), FolderController.deleteFolders);
router.get('/list-users', checkPermission('users.view'), AdminController.viewUsers);
router.post('/list-users', checkPermission('users.view'), uploadFormData.none(), AdminController.viewUsers);
router.get('/submit-users', AdminController.submitUsers);
// Multer first, then manual permission check inside controller
router.post('/submit-users', uploadProfilePhoto.single('profile_photo'), AdminController.submitUsers);
router.get('/list-users-ajax', checkPermission('users.view'), AdminController.listUsersAjax);
router.post('/list-users-ajax', checkPermission('users.view'), uploadFormData.none(), AdminController.listUsersAjax);
router.get('/edit-users', checkPermission('users.edit'), AdminController.editUsers);
router.post('/edit-users', checkPermission('users.edit'), uploadFormData.none(), AdminController.editUsers);
router.get('/check-duplicate-users', AdminController.checkDuplicateUsers);
router.post('/check-duplicate-users', uploadFormData.none(), AdminController.checkDuplicateUsers);
router.get('/delete-users', checkPermission('users.delete'), AdminController.deleteUsers);
router.post('/delete-users', checkPermission('users.delete'), uploadFormData.none(), AdminController.deleteUsers);
router.get('/get-state-list', StateController.getAdminStateList);
router.post('/get-state-list', uploadFormData.none(), StateController.getAdminStateList);

// Admin City Routes
router.get('/list-city', CityController.viewCities);
router.post('/list-city', uploadFormData.none(), CityController.viewCities);
router.get('/submit-city', CityController.submitAdminCity);
router.post('/submit-city', uploadFormData.none(), CityController.submitAdminCity);
router.get('/check-duplicate-city', CityController.checkAdminDuplicateCity);
router.post('/check-duplicate-city', uploadFormData.none(), CityController.checkAdminDuplicateCity);
router.get('/delete-city', CityController.deleteAdminCity);
router.post('/delete-city', uploadFormData.none(), CityController.deleteAdminCity);
router.get('/get-city-list', CityController.getAdminCityList);
router.post('/get-city-list', uploadFormData.none(), CityController.getAdminCityList);
router.get('/list-cities-ajax', CityController.listCitiesAjax);
router.post('/list-cities-ajax', uploadFormData.none(), CityController.listCitiesAjax);
router.get('/list_cities_ajax', CityController.listCitiesAjax);
router.post('/list_cities_ajax', uploadFormData.none(), CityController.listCitiesAjax);

// Admin Dashboard Routes
router.get('/admin-dashboard', checkPermission('reports.view'), DashboardController.getAdminDashboard);
router.post('/admin-dashboard', checkPermission('reports.view'), uploadFormData.none(), DashboardController.getAdminDashboard);
router.get('/admin-user-overview', checkPermission('reports.view'), DashboardController.getAdminUserOverview);
router.post('/admin-user-overview', checkPermission('reports.view'), uploadFormData.none(), DashboardController.getAdminUserOverview);
router.get('/Api-Admin-Deletion-Requests', checkPermission('users.delete'), AdminController.getDeletionRequests);
router.post('/Api-Admin-Deletion-Requests', checkPermission('users.delete'), uploadFormData.none(), AdminController.getDeletionRequests);

router.get('/list-service-provider', checkPermission('services.view'), AdminController.viewServiceProvider);
router.post('/list-service-provider', checkPermission('services.view'), uploadFormData.none(), AdminController.viewServiceProvider);
router.get('/list-service-provider-ajax', checkPermission('services.view'), AdminController.listServiceProviderAjax);
router.post('/list-service-provider-ajax', checkPermission('services.view'), uploadFormData.none(), AdminController.listServiceProviderAjax);
router.get('/list-service-details-ajax', checkPermission('services.view'), AdminController.listServiceDetailsAjax);
router.post('/list-service-details-ajax', checkPermission('services.view'), uploadFormData.none(), AdminController.listServiceDetailsAjax);
router.get('/submit-service-provider', checkPermission('services.create'), AdminController.submitServiceProvider);
router.post('/submit-service-provider', checkPermission('services.create'), uploadFormData.none(), AdminController.submitServiceProvider);
router.get('/edit-service-provider', checkPermission('services.edit'), AdminController.editServiceProvider);
router.post('/edit-service-provider', checkPermission('services.edit'), uploadFormData.none(), AdminController.editServiceProvider);
router.get('/delete-service-provider', checkPermission('services.delete'), AdminController.deleteServiceProvider);
router.post('/delete-service-provider', checkPermission('services.delete'), uploadFormData.none(), AdminController.deleteServiceProvider);
router.get('/view-service-provider-details', checkPermission('services.view'), AdminController.viewServiceProviderDetails);
router.post('/view-service-provider-details', checkPermission('services.view'), uploadFormData.none(), AdminController.viewServiceProviderDetails);
router.get('/list-card-activation-requests', checkPermission('cards.view'), AdminController.viewCardActivationRequests);
router.post('/list-card-activation-requests', checkPermission('cards.view'), uploadFormData.none(), AdminController.viewCardActivationRequests);
router.get('/list-card-activation-requests-ajax', checkPermission('cards.view'), AdminController.listCardActivationRequestsAjax);
router.post('/list-card-activation-requests-ajax', checkPermission('cards.view'), uploadFormData.none(), AdminController.listCardActivationRequestsAjax);
router.get('/submit-card-activation-requests', checkPermission('cards.approve'), AdminController.submitCardActivationRequests);
router.post('/submit-card-activation-requests', checkPermission('cards.approve'), uploadFormData.none(), AdminController.submitCardActivationRequests);
router.get('/edit-card-activation-requests', checkPermission('cards.approve'), AdminController.editCardActivationRequests);
router.post('/edit-card-activation-requests', checkPermission('cards.approve'), uploadFormData.none(), AdminController.editCardActivationRequests);
router.get('/delete-card-activation-requests', checkPermission('cards.approve'), AdminController.deleteCardActivationRequests);
router.post('/delete-card-activation-requests', checkPermission('cards.approve'), uploadFormData.none(), AdminController.deleteCardActivationRequests);
router.get('/images-card-activation-requests', checkPermission('cards.view'), AdminController.imagesCardActivationRequests);
router.post('/images-card-activation-requests', checkPermission('cards.view'), uploadFormData.none(), AdminController.imagesCardActivationRequests);

// Investors admin routes
router.get('/list-investors', checkPermission('investors.view'), AdminController.viewInvestors);
router.post('/list-investors', checkPermission('investors.view'), uploadFormData.none(), AdminController.viewInvestors);
router.get('/list-investors-ajax', checkPermission('investors.view'), AdminController.listInvestorsAjax);
router.post('/list-investors-ajax', checkPermission('investors.view'), uploadFormData.none(), AdminController.listInvestorsAjax);
router.get('/list_investors_ajax', checkPermission('investors.view'), AdminController.listInvestorsAjax);
router.post('/list_investors_ajax', checkPermission('investors.view'), uploadFormData.none(), AdminController.listInvestorsAjax);
router.get('/submit-investors', checkPermission('investors.create'), AdminController.submitInvestors);
router.post('/submit-investors', checkPermission('investors.create'), uploadInvestor.single('image'), AdminController.submitInvestors);
router.get('/edit-investors', checkPermission('investors.edit'), AdminController.editInvestors);
router.post('/edit-investors', checkPermission('investors.edit'), uploadFormData.none(), AdminController.editInvestors);
router.get('/delete-investors', checkPermission('investors.delete'), AdminController.deleteInvestors);
router.post('/delete-investors', checkPermission('investors.delete'), uploadFormData.none(), AdminController.deleteInvestors);
router.get('/view-investors-details', checkPermission('investors.view'), AdminController.viewInvestorsDetails);
router.post('/view-investors-details', checkPermission('investors.view'), uploadFormData.none(), AdminController.viewInvestorsDetails);

// Jobs admin routes
router.get('/list-jobs', checkPermission('jobs.view'), JobController.adminViewJobs);
router.post('/list-jobs', checkPermission('jobs.view'), uploadFormData.none(), JobController.adminViewJobs);
router.get('/list-jobs-ajax', checkPermission('jobs.view'), JobController.adminListJobsAjax);
router.post('/list-jobs-ajax', checkPermission('jobs.view'), uploadFormData.none(), JobController.adminListJobsAjax);
router.get('/list_jobs_ajax', checkPermission('jobs.view'), JobController.adminListJobsAjax);
router.post('/list_jobs_ajax', checkPermission('jobs.view'), uploadFormData.none(), JobController.adminListJobsAjax);
router.get('/submit-jobs', checkPermission('jobs.create'), JobController.adminSubmitJobs);
router.post('/submit-jobs', checkPermission('jobs.create'), uploadFormData.none(), JobController.adminSubmitJobs);
router.get('/edit-jobs', checkPermission('jobs.edit'), JobController.adminEditJobs);
router.post('/edit-jobs', checkPermission('jobs.edit'), uploadFormData.none(), JobController.adminEditJobs);
router.get('/delete-jobs', checkPermission('jobs.delete'), JobController.adminDeleteJobs);
router.post('/delete-jobs', checkPermission('jobs.delete'), uploadFormData.none(), JobController.adminDeleteJobs);
router.get('/view-jobs-details', checkPermission('jobs.view'), JobController.adminViewJobsDetails);
router.post('/view-jobs-details', checkPermission('jobs.view'), uploadFormData.none(), JobController.adminViewJobsDetails);
// Events admin routes
router.get('/list-events', checkPermission('events.view'), EventController.viewEvents);
router.post('/list-events', checkPermission('events.view'), uploadFormData.none(), EventController.viewEvents);
router.get('/list-events-ajax', checkPermission('events.view'), EventController.listEventsAjax);
router.post('/list-events-ajax', checkPermission('events.view'), uploadFormData.none(), EventController.listEventsAjax);
router.get('/list_events_ajax', checkPermission('events.view'), EventController.listEventsAjax);
router.post('/list_events_ajax', checkPermission('events.view'), uploadFormData.none(), EventController.listEventsAjax);
router.get('/submit-events', checkPermission('events.create'), EventController.submitEvents);
router.post('/submit-events', checkPermission('events.create'), uploadEvents.single('event_banner_file'), EventController.submitEvents);
router.get('/edit-events', checkPermission('events.edit'), EventController.editEvents);
router.post('/edit-events', checkPermission('events.edit'), uploadFormData.none(), EventController.editEvents);
router.get('/delete-events', checkPermission('events.delete'), EventController.deleteEvents);
router.post('/delete-events', checkPermission('events.delete'), uploadFormData.none(), EventController.deleteEvents);
router.get('/view-events-details', checkPermission('events.view'), EventController.viewEventsDetails);
router.post('/view-events-details', checkPermission('events.view'), uploadFormData.none(), EventController.viewEventsDetails);

// Frontend Routes - Temporarily disabled
// router.get('/legal-terms', ApiController.legalTerms);
// router.get('/delete-request', ApiController.deleteRequest);
// router.get('/thank-you', ApiController.thankYou);
// router.post('/thank-you', uploadFormData.none(), ApiController.thankYou);
// Investor Routes
router.post('/Api-Save-Investor', uploadInvestor.single('image'), ApiController.saveInvestor);
router.get('/Api-All-Investors-List', ApiController.getAllInvestorsList);
router.post('/Api-All-Investors-List', uploadFormData.none(), ApiController.getAllInvestorsList);
router.get('/Api-View-Investor-Details', ApiController.getInvestorDetail);
router.post('/Api-View-Investor-Details', uploadFormData.none(), ApiController.getInvestorDetail);
router.get('/Api-Investor-Unlock', ApiController.investorUnlock);
router.post('/Api-Investor-Unlock', uploadFormData.none(), ApiController.investorUnlock);
router.post('/Api-Add-Investor-Review-Rating', uploadFormData.none(), ApiController.saveInvestorReviewRating);
router.get('/Api-My-Investor-Profile', ApiController.getMyInvestorProfile);
router.post('/Api-My-Investor-Profile', uploadFormData.none(), ApiController.getMyInvestorProfile);
router.get('/Api-My-Investor-Meets', ApiController.getInvestorMeets);
// Admin Meeting Requests API
router.get('/Api-Admin-Meeting-Requests', checkPermission('meetings.view'), ApiController.getAdminMeetingRequests);
router.post('/Api-Admin-Meeting-Requests', checkPermission('meetings.view'), uploadFormData.none(), ApiController.getAdminMeetingRequests);

// Admin User Profile API
router.get('/Api-Admin-User-Profile', checkPermission('users.view'), ApiController.getAdminUserProfile);
router.post('/Api-Admin-User-Profile', checkPermission('users.view'), uploadFormData.none(), ApiController.getAdminUserProfile);

// Admin Investor Profile API
router.get('/Api-Admin-Investor-Profile', checkPermission('investors.view'), ApiController.getAdminInvestorProfile);
router.post('/Api-Admin-Investor-Profile', checkPermission('investors.view'), uploadFormData.none(), ApiController.getAdminInvestorProfile);

// Admin Update Meeting Request API
router.post('/Api-Admin-Update-Meeting-Request', checkPermission('meetings.update'), uploadFormData.none(), ApiController.updateAdminMeetingRequest);

// Admin Get Investor Meeting Requests API
router.get('/Api-Admin-Investor-Meeting-Requests', checkPermission('meetings.view'), ApiController.getAdminInvestorMeetingRequests);
router.post('/Api-Admin-Investor-Meeting-Requests', checkPermission('meetings.view'), uploadFormData.none(), ApiController.getAdminInvestorMeetingRequests);

// Get Requestor Details API
router.get('/Api-Get-Requestor-Details', checkPermission('users.view'), uploadFormData.none(), ApiController.getRequestorDetails);
router.post('/Api-Get-Requestor-Details', checkPermission('users.view'), uploadFormData.none(), ApiController.getRequestorDetails);

router.post('/Api-My-Investor-Meets', uploadFormData.none(), ApiController.getInvestorMeets);
router.get('/Api-Investor-Desk', ApiController.getInvestorDesk);
// Chat Routes
router.post('/Api-Save-Chat', uploadFormData.none(), ApiController.saveChat);
router.get('/Api-View-Chat', ApiController.getChat);
router.post('/Api-View-Chat', uploadFormData.none(), ApiController.getChat);
router.get('/Api-Chat-Users-List', ApiController.getChatUsersList);
router.post('/Api-Chat-Users-List', uploadFormData.none(), ApiController.getChatUsersList);
router.post('/Api-Online-Users-Status', uploadFormData.none(), ApiController.getOnlineUsersStatus);

// Business Card Routes
router.get('/Api-View-Business-Card', ApiController.getBusinessCardInformation);

// Note: Additional event management, folder, contact, business card, service, investor, and chat routes
// will be implemented as needed to match PHP backend functionality

// ===== FCM TOKEN ROUTES =====
router.get('/Api-Update-FCM-Token', uploadFormData.none(), FCMTokenController.updateFCMToken);
router.post('/Api-Update-FCM-Token', uploadFormData.none(), FCMTokenController.updateFCMToken);
router.get('/Api-Get-FCM-Token', uploadFormData.none(), FCMTokenController.getFCMToken);
router.post('/Api-Get-FCM-Token', uploadFormData.none(), FCMTokenController.getFCMToken);

// ==================== NOTIFICATION ROUTES ====================
console.log('🔔 Registering notification routes...');
console.log('🔔 getNotificationStats method:', typeof ApiController.getNotificationStats);
router.get('/Api-Notification-Stats', uploadFormData.none(), ApiController.getNotificationStats);
router.get('/Api-Notifications-List', uploadFormData.none(), ApiController.getNotificationsList);
router.post('/Api-Notification-Mark-Read', uploadFormData.none(), ApiController.markNotificationAsRead);
router.post('/Api-Notifications-Mark-All-Read', uploadFormData.none(), ApiController.markAllNotificationsAsRead);
router.post('/Api-Notification-Delete', uploadFormData.none(), ApiController.deleteNotification);
console.log('🔔 Notification routes registered successfully');

// ==================== ADMIN PERMISSION MANAGEMENT ROUTES (SuperAdmin Only) ====================
router.get('/admin-permissions-list', requireSuperAdmin, AdminPermissionController.getAllPermissions);
router.post('/admin-permissions-list', requireSuperAdmin, uploadFormData.none(), AdminPermissionController.getAllPermissions);
router.post('/admin-create-subadmin', requireSuperAdmin, uploadFormData.none(), AdminPermissionController.createSubAdmin);
router.post('/admin-create-superadmin', uploadFormData.none(), AdminPermissionController.createSuperAdmin);
router.get('/admin-subadmin-list', requireSuperAdmin, AdminPermissionController.getSubAdminList);
router.post('/admin-subadmin-list', requireSuperAdmin, uploadFormData.none(), AdminPermissionController.getSubAdminList);
router.post('/admin-update-subadmin-permissions', requireSuperAdmin, uploadFormData.none(), AdminPermissionController.updateSubAdminPermissions);
router.post('/admin-delete-subadmin', requireSuperAdmin, uploadFormData.none(), AdminPermissionController.deleteSubAdmin);

// 404 handler for undefined routes (MUST be at the end)
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


