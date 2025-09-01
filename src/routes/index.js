'use strict';

const express = require('express');
const path = require('path');
const router = express.Router();

// Import controllers
const AuthController = require('../controllers/AuthController');
const ApiController = require('../controllers/apiController');
const AdminController = require('../controllers/AdminController');
const CountryController = require('../controllers/countryController');
const StateController = require('../controllers/stateController');
const CityController = require('../controllers/cityController');
const DashboardController = require('../controllers/dashboardController');

// Import middlewares
const authenticate = require('../middlewares/authenticate');
const adminAuth = require('../middlewares/adminAuth');
const validate = require('../middlewares/validation');
const rateLimiter = require('../middlewares/rateLimiter');
const { checkUser } = require('../middlewares/checkUser');
const { uploadProfilePhoto, uploadFormData, uploadEvents, uploadResume, uploadInvestor, uploadVisitingCards, uploadServices } = require('../middlewares/upload');

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
router.post('/Api-Logout', checkUser, ApiController.logout);

// Master Data Routes
router.get('/Api-Country-List', CountryController.getCountryList);
router.post('/Api-Country-List', uploadFormData.none(), CountryController.getCountryList);
router.get('/Api-State-List', StateController.getStateList);
router.post('/Api-State-List', uploadFormData.none(), StateController.getStateList);
router.get('/Api-City-List', CityController.getCityList);
router.post('/Api-City-List', uploadFormData.none(), CityController.getCityList);

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
router.post('/Api-View-Profile', uploadFormData.none(), ApiController.getProfile);
router.get('/Api-View-User-Detail-By-Mobile', ApiController.getUserDetailByMobile);
router.post('/Api-View-User-Detail-By-Mobile', uploadFormData.none(), ApiController.getUserDetailByMobile);
router.get('/Api-View-Profile-By-Mobile', ApiController.getUserProfileByMobile);
router.post('/Api-View-Profile-By-Mobile', uploadFormData.none(), ApiController.getUserProfileByMobile);
router.post('/Api-Save-Work-Details', uploadFormData.none(), ApiController.saveWorkDetails);
router.get('/Api-View-Work-Details', ApiController.getWorkDetails);
router.post('/Api-View-Work-Details', uploadFormData.none(), ApiController.getWorkDetails);
router.post('/Api-Delete-Work-Detail', uploadFormData.none(), ApiController.deleteWorkDetail);
router.post('/Api-Save-Project-Details', uploadFormData.single('project_logo'), ApiController.saveProjectDetails);
router.get('/Api-View-Project-Details', ApiController.getProjectDetails);
router.post('/Api-View-Project-Details', uploadFormData.none(), ApiController.getProjectDetails);
router.post('/Api-Delete-Project-Detail', uploadFormData.none(), ApiController.deleteProjectDetail);
router.post('/Api-Save-Education-Details', uploadFormData.none(), ApiController.saveEducationDetails);
router.get('/Api-View-Education-Details', ApiController.getEducationDetails);
router.post('/Api-Delete-Education-Detail', uploadFormData.none(), ApiController.deleteEducationDetail);
router.post('/Api-Save-Event-Organiser', uploadFormData.none(), ApiController.saveEventOrganiser);
router.post('/Api-Delete-Event-Organiser', uploadFormData.none(), ApiController.deleteEventOrganiser);
router.post('/Api-Save-Event-Attendee', uploadFormData.none(), ApiController.saveEventAttendee);
router.post('/Api-Delete-Event-Attendee', uploadFormData.none(), ApiController.deleteEventAttendee);
router.get('/Api-View-User-Detail-By-Qrcode', checkUser, ApiController.getUserDetailByQrCode);


// Dashboard Route - Support both GET and POST for form data
router.get('/Api-Dashboard', DashboardController.dashboard);
router.post('/Api-Dashboard', DashboardController.dashboard);
router.get('/Api-Legal-Terms', ApiController.legalTerms);

// Job Routes
router.post('/Api-Save-Job-Information', uploadFormData.none(), ApiController.saveJobInformation);
router.get('/Api-View-Job-Information', ApiController.getJobInformation);
router.post('/Api-View-Job-Information', uploadFormData.none(), ApiController.getJobInformation);
router.post('/Api-Apply-Job', uploadResume.single('resume_file'), ApiController.saveJobApplication);
router.get('/Api-View-Job-Details', ApiController.getJobDetail);
router.post('/Api-View-Job-Details', uploadFormData.none(), ApiController.getJobDetail);
router.get('/Api-Get-Job-Applicants-List', checkUser, ApiController.getJobApplicantsList);
router.get('/Api-View-Resumes', ApiController.getResumes);
router.post('/Api-View-Resumes', uploadFormData.none(), ApiController.getResumes);
router.post('/Api-Delete-Resume', uploadFormData.none(), ApiController.deleteResume);

// Event Routes
router.post('/Api-Save-Event-Information', uploadEvents.single('event_banner_file'), ApiController.saveEventInformation);
router.get('/Api-View-Event-Information', ApiController.getEventInformation);
router.post('/Api-View-Event-Information', uploadFormData.none(), ApiController.getEventInformation);
router.get('/Api-View-Event-Details', ApiController.getEventDetail);
router.post('/Api-View-Event-Details', uploadFormData.none(), ApiController.getEventDetail);
router.get('/Api-Event-Organisers-List', ApiController.getEventOrganisersList);
router.post('/Api-Event-Organisers-List', uploadFormData.none(), ApiController.getEventOrganisersList);
router.post('/Api-Save-Event-Organiser', uploadFormData.none(), ApiController.saveEventOrganiser);
router.post('/Api-Delete-Event-Organiser', uploadFormData.none(), ApiController.deleteEventOrganiser);
router.get('/Api-Event-Attendees-List', ApiController.getEventAttendeesList);
router.post('/Api-Event-Attendees-List', uploadFormData.none(), ApiController.getEventAttendeesList);
router.get('/Api-View-Events-Attended', ApiController.getEventsAttendedList);
router.post('/Api-View-Events-Attended', uploadFormData.none(), ApiController.getEventsAttendedList);
router.get('/Api-View-Events-Organised', ApiController.getEventsOrganisedList);
router.post('/Api-View-Events-Organised', uploadFormData.none(), ApiController.getEventsOrganisedList);
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
router.post('/Api-Add-Contact-Visiting-Card', uploadVisitingCards.fields([
  { name: 'visiting_card_front', maxCount: 1 },
  { name: 'visiting_card_back', maxCount: 1 }
]), ApiController.saveContactVisitingCard);
router.get('/Api-View-Contact-Visiting-Card', ApiController.getContactVisitingCardInformation);

// Business Card Routes
router.get('/Api-Activate-Card', ApiController.activateCard);
router.post('/Api-Activate-Card', uploadFormData.array('business_documents_file', 10), ApiController.activateCard);

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
router.get('/list-country', CountryController.getAdminCountryList);
router.post('/list-country', uploadFormData.none(), CountryController.getAdminCountryList);
router.get('/list-country-ajax', CountryController.getAdminCountryLists);
router.post('/list-country-ajax', uploadFormData.none(), CountryController.getAdminCountryLists);
router.get('/save-country', CountryController.saveAdminCountry);
router.post('/save-country', uploadFormData.none(), CountryController.saveAdminCountry);
router.get('/edit-country/:id', CountryController.viewAdminAddEditForm);
router.post('/edit-country/:id', uploadFormData.none(), CountryController.viewAdminAddEditForm);
router.get('/delete-country/:id', CountryController.deleteAdminCountry);
router.post('/delete-country/:id', uploadFormData.none(), CountryController.deleteAdminCountry);
router.get('/check-duplicate-country', CountryController.checkAdminDuplicateCountry);
router.post('/check-duplicate-country', uploadFormData.none(), CountryController.checkAdminDuplicateCountry);
router.get('/list-state', StateController.viewAdminState);
router.post('/list-state', uploadFormData.none(), StateController.viewAdminState);
router.get('/submit_state', StateController.submitAdminState);
router.post('/submit_state', uploadFormData.none(), StateController.submitAdminState);
router.get('/list_state_ajax', StateController.listAdminStateAjax);
router.post('/list_state_ajax', uploadFormData.none(), StateController.listAdminStateAjax);
router.get('/check_duplicate_state', StateController.checkAdminDuplicateState);
router.post('/check_duplicate_state', uploadFormData.none(), StateController.checkAdminDuplicateState);
router.get('/delete_state', StateController.deleteAdminState);
router.post('/delete_state', uploadFormData.none(), StateController.deleteAdminState);
router.get('/list-city', AdminController.viewCities);
router.post('/list-city', uploadFormData.none(), AdminController.viewCities);
router.get('/submit_cities', AdminController.submitCities);
router.post('/submit_cities', uploadFormData.none(), AdminController.submitCities);
router.get('/list_cities_ajax', AdminController.listCitiesAjax);
router.post('/list_cities_ajax', uploadFormData.none(), AdminController.listCitiesAjax);
router.get('/check_duplicate_cities', AdminController.checkDuplicateCities);
router.post('/check_duplicate_cities', uploadFormData.none(), AdminController.checkDuplicateCities);
router.get('/delete_cities', AdminController.deleteCities);
router.post('/delete_cities', uploadFormData.none(), AdminController.deleteCities);
router.get('/list-employment-type', AdminController.viewEmploymentType);
router.post('/list-employment-type', uploadFormData.none(), AdminController.viewEmploymentType);
router.get('/submit_employment_type', AdminController.submitEmploymentType);
router.post('/submit_employment_type', uploadFormData.none(), AdminController.submitEmploymentType);
router.get('/list_employment_type_ajax', AdminController.listEmploymentTypeAjax);
router.post('/list_employment_type_ajax', uploadFormData.none(), AdminController.listEmploymentTypeAjax);
router.get('/check_duplicate_employment_type', AdminController.checkDuplicateEmploymentType);
router.post('/check_duplicate_employment_type', uploadFormData.none(), AdminController.checkDuplicateEmploymentType);
router.get('/delete_employment_type', AdminController.deleteEmploymentType);
router.post('/delete_employment_type', uploadFormData.none(), AdminController.deleteEmploymentType);
router.get('/list-interests', AdminController.viewInterests);
router.post('/list-interests', uploadFormData.none(), AdminController.viewInterests);
router.get('/submit_interest', AdminController.submitInterest);
router.post('/submit_interest', uploadFormData.none(), AdminController.submitInterest);
router.get('/list_interest_ajax', AdminController.listInterestAjax);
router.post('/list_interest_ajax', uploadFormData.none(), AdminController.listInterestAjax);
router.get('/check_duplicate_interest', AdminController.checkDuplicateInterest);
router.post('/check_duplicate_interest', uploadFormData.none(), AdminController.checkDuplicateInterest);
router.get('/delete_interest', AdminController.deleteInterest);
router.post('/delete_interest', uploadFormData.none(), AdminController.deleteInterest);
router.get('/list-job-type', AdminController.viewJobType);
router.post('/list-job-type', uploadFormData.none(), AdminController.viewJobType);
router.get('/submit_job_type', AdminController.submitJobType);
router.post('/submit_job_type', uploadFormData.none(), AdminController.submitJobType);
router.get('/list_job_type_ajax', AdminController.listJobTypeAjax);
router.post('/list_job_type_ajax', uploadFormData.none(), AdminController.listJobTypeAjax);
router.get('/check_duplicate_job_type', AdminController.checkDuplicateJobType);
router.post('/check_duplicate_job_type', uploadFormData.none(), AdminController.checkDuplicateJobType);
router.get('/delete_job_type', AdminController.deleteJobType);
router.post('/delete_job_type', uploadFormData.none(), AdminController.deleteJobType);
router.get('/list-pay', AdminController.viewPay);
router.post('/list-pay', uploadFormData.none(), AdminController.viewPay);
router.get('/submit_pay', AdminController.submitPay);
router.post('/submit_pay', uploadFormData.none(), AdminController.submitPay);
router.get('/list_pay_ajax', AdminController.listPayAjax);
router.post('/list_pay_ajax', uploadFormData.none(), AdminController.listPayAjax);
router.get('/check_duplicate_pay', AdminController.checkDuplicatePay);
router.post('/check_duplicate_pay', uploadFormData.none(), AdminController.checkDuplicatePay);
router.get('/delete_pay', AdminController.deletePay);
router.post('/delete_pay', uploadFormData.none(), AdminController.deletePay);
router.get('/list-event-mode', AdminController.viewEventMode);
router.post('/list-event-mode', uploadFormData.none(), AdminController.viewEventMode);
router.get('/submit_event_mode', AdminController.submitEventMode);
router.post('/submit_event_mode', uploadFormData.none(), AdminController.submitEventMode);
router.get('/list_event_mode_ajax', AdminController.listEventModeAjax);
router.post('/list_event_mode_ajax', uploadFormData.none(), AdminController.listEventModeAjax);
router.get('/check_duplicate_event_mode', AdminController.checkDuplicateEventMode);
router.post('/check_duplicate_event_mode', uploadFormData.none(), AdminController.checkDuplicateEventMode);
router.get('/delete_event_mode', AdminController.deleteEventMode);
router.post('/delete_event_mode', uploadFormData.none(), AdminController.deleteEventMode);
router.get('/list-event-type', AdminController.viewEventType);
router.post('/list-event-type', uploadFormData.none(), AdminController.viewEventType);
router.get('/submit_event_type', AdminController.submitEventType);
router.post('/submit_event_type', uploadFormData.none(), AdminController.submitEventType);
router.get('/list_event_type_ajax', AdminController.listEventTypeAjax);
router.post('/list_event_type_ajax', uploadFormData.none(), AdminController.listEventTypeAjax);
router.get('/check_duplicate_event_type', AdminController.checkDuplicateEventType);
router.post('/check_duplicate_event_type', uploadFormData.none(), AdminController.checkDuplicateEventType);
router.get('/delete_event_type', AdminController.deleteEventType);
router.post('/delete_event_type', uploadFormData.none(), AdminController.deleteEventType);
router.get('/list-industry-type', AdminController.viewIndustryType);
router.post('/list-industry-type', uploadFormData.none(), AdminController.viewIndustryType);
router.get('/submit_industry_type', AdminController.submitIndustryType);
router.post('/submit_industry_type', uploadFormData.none(), AdminController.submitIndustryType);
router.get('/list_industry_type_ajax', AdminController.listIndustryTypeAjax);
router.post('/list_industry_type_ajax', uploadFormData.none(), AdminController.listIndustryTypeAjax);
router.get('/check_duplicate_industry_type', AdminController.checkDuplicateIndustryType);
router.post('/check_duplicate_industry_type', uploadFormData.none(), AdminController.checkDuplicateIndustryType);
router.get('/delete_industry_type', AdminController.deleteIndustryType);
router.post('/delete_industry_type', uploadFormData.none(), AdminController.deleteIndustryType);
router.get('/list-fund-size', AdminController.viewFundSize);
router.post('/list-fund-size', uploadFormData.none(), AdminController.viewFundSize);
router.get('/submit_fund_size', AdminController.submitFundSize);
router.post('/submit_fund_size', uploadFormData.none(), AdminController.submitFundSize);
router.get('/list_fund_size_ajax', AdminController.listFundSizeAjax);
router.post('/list_fund_size_ajax', uploadFormData.none(), AdminController.listFundSizeAjax);
router.get('/check_duplicate_fund_size', AdminController.checkDuplicateFundSize);
router.post('/check_duplicate_fund_size', uploadFormData.none(), AdminController.checkDuplicateFundSize);
router.get('/delete_fund_size', AdminController.deleteFundSize);
router.post('/delete_fund_size', uploadFormData.none(), AdminController.deleteFundSize);
router.get('/list-folders', AdminController.viewFolders);
router.post('/list-folders', uploadFormData.none(), AdminController.viewFolders);
router.get('/submit_folders', AdminController.submitFolders);
router.post('/submit_folders', uploadFormData.none(), AdminController.submitFolders);
router.get('/list_folders_ajax', AdminController.listFoldersAjax);
router.post('/list_folders_ajax', uploadFormData.none(), AdminController.listFoldersAjax);
router.get('/check_duplicate_folders', AdminController.checkDuplicateFolders);
router.post('/check_duplicate_folders', uploadFormData.none(), AdminController.checkDuplicateFolders);
router.get('/delete_folders', AdminController.deleteFolders);
router.post('/delete_folders', uploadFormData.none(), AdminController.deleteFolders);
router.get('/list-users', AdminController.viewUsers);
router.post('/list-users', uploadFormData.none(), AdminController.viewUsers);
router.get('/submit_users', AdminController.submitUsers);
router.post('/submit_users', uploadFormData.none(), AdminController.submitUsers);
router.get('/list_users_ajax', AdminController.listUsersAjax);
router.post('/list_users_ajax', uploadFormData.none(), AdminController.listUsersAjax);
router.get('/edit_users', AdminController.editUsers);
router.post('/edit_users', uploadFormData.none(), AdminController.editUsers);
router.get('/check_duplicate_users', AdminController.checkDuplicateUsers);
router.post('/check_duplicate_users', uploadFormData.none(), AdminController.checkDuplicateUsers);
router.get('/delete_users', AdminController.deleteUsers);
router.post('/delete_users', uploadFormData.none(), AdminController.deleteUsers);
router.get('/get_state_list', StateController.getAdminStateList);
router.post('/get_state_list', uploadFormData.none(), StateController.getAdminStateList);

// Admin City Routes
router.get('/list-city', CityController.viewAdminCity);
router.post('/list-city', uploadFormData.none(), CityController.viewAdminCity);
router.get('/submit_city', CityController.submitAdminCity);
router.post('/submit_city', uploadFormData.none(), CityController.submitAdminCity);
router.get('/check_duplicate_city', CityController.checkAdminDuplicateCity);
router.post('/check_duplicate_city', uploadFormData.none(), CityController.checkAdminDuplicateCity);
router.get('/delete_city', CityController.deleteAdminCity);
router.post('/delete_city', uploadFormData.none(), CityController.deleteAdminCity);
router.get('/get_city_list', CityController.getAdminCityList);
router.post('/get_city_list', uploadFormData.none(), CityController.getAdminCityList);

// Admin Dashboard Routes
router.get('/admin-dashboard', DashboardController.getAdminDashboard);
router.post('/admin-dashboard', uploadFormData.none(), DashboardController.getAdminDashboard);
router.get('/admin-user-overview', DashboardController.getAdminUserOverview);
router.post('/admin-user-overview', uploadFormData.none(), DashboardController.getAdminUserOverview);

router.get('/list-service-provider', AdminController.viewServiceProvider);
router.post('/list-service-provider', uploadFormData.none(), AdminController.viewServiceProvider);
router.get('/list_service_provider_ajax', AdminController.listServiceProviderAjax);
router.post('/list_service_provider_ajax', uploadFormData.none(), AdminController.listServiceProviderAjax);
router.get('/list_service_details_ajax', AdminController.listServiceDetailsAjax);
router.post('/list_service_details_ajax', uploadFormData.none(), AdminController.listServiceDetailsAjax);
router.get('/submit_service_provider', AdminController.submitServiceProvider);
router.post('/submit_service_provider', uploadFormData.none(), AdminController.submitServiceProvider);
router.get('/edit_service_provider', AdminController.editServiceProvider);
router.post('/edit_service_provider', uploadFormData.none(), AdminController.editServiceProvider);
router.get('/delete_service_provider', AdminController.deleteServiceProvider);
router.post('/delete_service_provider', uploadFormData.none(), AdminController.deleteServiceProvider);
router.get('/view_service_provider_details', AdminController.viewServiceProviderDetails);
router.post('/view_service_provider_details', uploadFormData.none(), AdminController.viewServiceProviderDetails);
router.get('/list-card-activation-requests', AdminController.viewCardActivationRequests);
router.post('/list-card-activation-requests', uploadFormData.none(), AdminController.viewCardActivationRequests);
router.get('/list_card_activation_requests_ajax', AdminController.listCardActivationRequestsAjax);
router.post('/list_card_activation_requests_ajax', uploadFormData.none(), AdminController.listCardActivationRequestsAjax);
router.get('/submit_card_activation_requests', AdminController.submitCardActivationRequests);
router.post('/submit_card_activation_requests', uploadFormData.none(), AdminController.submitCardActivationRequests);
router.get('/edit_card_activation_requests', AdminController.editCardActivationRequests);
router.post('/edit_card_activation_requests', uploadFormData.none(), AdminController.editCardActivationRequests);
router.get('/delete_card_activation_requests', AdminController.deleteCardActivationRequests);
router.post('/delete_card_activation_requests', uploadFormData.none(), AdminController.deleteCardActivationRequests);
router.get('/images_card_activation_requests', AdminController.imagesCardActivationRequests);
router.post('/images_card_activation_requests', uploadFormData.none(), AdminController.imagesCardActivationRequests);

// Investors admin routes
router.get('/list-investors', AdminController.viewInvestors);
router.post('/list-investors', uploadFormData.none(), AdminController.viewInvestors);
router.get('/list_investors_ajax', AdminController.listInvestorsAjax);
router.post('/list_investors_ajax', uploadFormData.none(), AdminController.listInvestorsAjax);
router.get('/submit_investors', AdminController.submitInvestors);
router.post('/submit_investors', uploadFormData.none(), AdminController.submitInvestors);
router.get('/edit_investors', AdminController.editInvestors);
router.post('/edit_investors', uploadFormData.none(), AdminController.editInvestors);
router.get('/delete_investors', AdminController.deleteInvestors);
router.post('/delete_investors', uploadFormData.none(), AdminController.deleteInvestors);
router.get('/view_investors_details', AdminController.viewInvestorsDetails);
router.post('/view_investors_details', uploadFormData.none(), AdminController.viewInvestorsDetails);

// Jobs admin routes
router.get('/list-jobs', AdminController.viewJobs);
router.post('/list-jobs', uploadFormData.none(), AdminController.viewJobs);
router.get('/list_jobs_ajax', AdminController.listJobsAjax);
router.post('/list_jobs_ajax', uploadFormData.none(), AdminController.listJobsAjax);
router.get('/submit_jobs', AdminController.submitJobs);
router.post('/submit_jobs', uploadFormData.none(), AdminController.submitJobs);
router.get('/edit_jobs', AdminController.editJobs);
router.post('/edit_jobs', uploadFormData.none(), AdminController.editJobs);
router.get('/delete_jobs', AdminController.deleteJobs);
router.post('/delete_jobs', uploadFormData.none(), AdminController.deleteJobs);
router.get('/view_jobs_details', AdminController.viewJobsDetails);
router.post('/view_jobs_details', uploadFormData.none(), AdminController.viewJobsDetails);

// Events admin routes
router.get('/list-events', AdminController.viewEvents);
router.post('/list-events', uploadFormData.none(), AdminController.viewEvents);
router.get('/list_events_ajax', AdminController.listEventsAjax);
router.post('/list_events_ajax', uploadFormData.none(), AdminController.listEventsAjax);
router.get('/submit_events', AdminController.submitEvents);
router.post('/submit_events', uploadFormData.none(), AdminController.submitEvents);
router.get('/edit_events', AdminController.editEvents);
router.post('/edit_events', uploadFormData.none(), AdminController.editEvents);
router.get('/delete_events', AdminController.deleteEvents);
router.post('/delete_events', uploadFormData.none(), AdminController.deleteEvents);
router.get('/view_events_details', AdminController.viewEventsDetails);
router.post('/view_events_details', uploadFormData.none(), AdminController.viewEventsDetails);

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
router.post('/Api-My-Investor-Meets', uploadFormData.none(), ApiController.getInvestorMeets);
router.get('/Api-Investor-Desk', ApiController.getInvestorDesk);

// Chat Routes
router.post('/Api-Save-Chat', uploadFormData.none(), ApiController.saveChat);
router.get('/Api-View-Chat', ApiController.getChat);
router.post('/Api-View-Chat', uploadFormData.none(), ApiController.getChat);
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


