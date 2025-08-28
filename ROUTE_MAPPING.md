# NodeJS to PHP Route Mapping

## Overview
All NodeJS routes have been updated to match the exact PHP route format. Instead of `/api/getCountryList`, routes now use `/Api-Country-List` format.

## Route Mappings

### Authentication Routes
| Old Route | New Route | Method | Controller |
|-----------|-----------|---------|------------|
| `/api/sendOtp` | `/Api-Send-Otp` | POST | AuthController.sendOtp |
| `/api/verifyOtp` | `/Api-Verify-Otp` | POST | AuthController.verifyOtp |
| `/api/login` | `/Api-Login` | POST | ApiController.login |
| `/api/logout` | `/Api-Logout` | POST | ApiController.logout |

### Master Data Routes
| Old Route | New Route | Method | Controller |
|-----------|-----------|---------|------------|
| `/api/getCountryList` | `/Api-Country-List` | GET | ApiController.getCountryList |
| `/api/getStateList` | `/Api-State-List` | GET | ApiController.getStateList |
| `/api/getCityList` | `/Api-City-List` | GET | ApiController.getCityList |
| `/api/getInterestsList` | `/Api-Interests-List` | GET | ApiController.getInterestsList |
| `/api/getEmploymentTypeList` | `/Api-Employment-Type-List` | GET | ApiController.getEmploymentTypeList |
| `/api/getJobTypeList` | `/Api-Job-Type-List` | GET | ApiController.getJobTypeList |
| `/api/getPayList` | `/Api-Pay-List` | GET | ApiController.getPayList |
| `/api/getEventModeList` | `/Api-Event-Mode-List` | GET | ApiController.getEventModeList |
| `/api/getEventTypeList` | `/Api-Event-Type-List` | GET | ApiController.getEventTypeList |
| `/api/getFundSizeList` | `/Api-Fund-Size-List` | GET | ApiController.getFundSizeList |

### Profile Routes
| Old Route | New Route | Method | Controller |
|-----------|-----------|---------|------------|
| `/api/updateProfile` | `/Api-Update-Profile` | POST | ApiController.updateProfile |
| `/api/getProfile` | `/Api-View-Profile` | GET | ApiController.getProfile |
| `/api/getUserDetailByMobile` | `/Api-View-User-Detail-By-Mobile` | GET | ApiController.getUserDetailByMobile |
| `/api/getUserProfileByMobile` | `/Api-View-Profile-By-Mobile` | GET | ApiController.getUserProfileByMobile |
| `/api/saveWorkDetails` | `/Api-Save-Work-Details` | POST | ApiController.saveWorkDetails |
| `/api/getWorkDetails` | `/Api-View-Work-Details` | GET | ApiController.getWorkDetails |
| `/api/deleteWorkDetail` | `/Api-Delete-Work-Detail` | POST | ApiController.deleteWorkDetail |
| `/api/saveProjectDetails` | `/Api-Save-Project-Details` | POST | ApiController.saveProjectDetails |
| `/api/getProjectDetails` | `/Api-View-Project-Details` | GET | ApiController.getProjectDetails |
| `/api/deleteProjectDetail` | `/Api-Delete-Project-Detail` | POST | ApiController.deleteProjectDetail |
| `/api/saveEducationDetails` | `/Api-Save-Education-Details` | POST | ApiController.saveEducationDetails |
| `/api/getEducationDetails` | `/Api-View-Education-Details` | GET | ApiController.getEducationDetails |
| `/api/deleteEducationDetail` | `/Api-Delete-Education-Detail` | POST | ApiController.deleteEducationDetail |
| `/api/saveEventOrganiser` | `/Api-Save-Event-Organiser` | POST | ApiController.saveEventOrganiser |
| `/api/getEventOrganisersList` | `/Api-Event-Organisers-List` | GET | ApiController.getEventOrganisersList |
| `/api/deleteEventOrganiser` | `/Api-Delete-Event-Organiser` | POST | ApiController.deleteEventOrganiser |
| `/api/getEventAttendeesList` | `/Api-Event-Attendees-List` | GET | ApiController.getEventAttendeesList |
| `/api/saveEventAttendee` | `/Api-Save-Event-Attendee` | POST | ApiController.saveEventAttendee |
| `/api/deleteEventAttendee` | `/Api-Delete-Event-Attendee` | POST | ApiController.deleteEventAttendee |
| `/api/getUserDetailByQrCode` | `/Api-View-User-Detail-By-Qrcode` | GET | ApiController.getUserDetailByQrCode |

### Dashboard Routes
| Old Route | New Route | Method | Controller |
|-----------|-----------|---------|------------|
| `/api/dashboard` | `/Api-Dashboard` | GET/POST | ApiController.dashboard |
| `/api/legalTerms` | `/Api-Legal-Terms` | GET | ApiController.legalTerms |

### Job Routes
| Old Route | New Route | Method | Controller |
|-----------|-----------|---------|------------|
| `/api/saveJobInformation` | `/Api-Save-Job-Information` | POST | ApiController.saveJobInformation |
| `/api/getJobInformation` | `/Api-View-Job-Information` | GET | ApiController.getJobInformation |
| `/api/saveJobApplication` | `/Api-Apply-Job` | POST | ApiController.saveJobApplication |
| `/api/getJobDetail` | `/Api-View-Job-Details` | GET | ApiController.getJobDetail |
| `/api/getJobApplicantsList` | `/Api-Get-Job-Applicants-List` | GET | ApiController.getJobApplicantsList |
| `/api/getResumes` | `/Api-View-Resumes` | GET | ApiController.getResumes |
| `/api/deleteResume` | `/Api-Delete-Resume` | POST | ApiController.deleteResume |

### Event Routes
| Old Route | New Route | Method | Controller |
|-----------|-----------|---------|------------|
| `/api/saveEventInformation` | `/Api-Save-Event-Information` | POST | ApiController.saveEventInformation |
| `/api/getEventInformation` | `/Api-View-Event-Information` | GET | ApiController.getEventInformation |
| `/api/getEventDetail` | `/Api-View-Event-Details` | GET | ApiController.getEventDetail |
| `/api/getEventOrganisersList` | `/Api-Event-Organisers-List` | GET | ApiController.getEventOrganisersList |
| `/api/saveEventOrganiser` | `/Api-Save-Event-Organiser` | POST | ApiController.saveEventOrganiser |
| `/api/deleteEventOrganiser` | `/Api-Delete-Event-Organiser` | POST | ApiController.deleteEventOrganiser |
| `/api/getEventAttendeesList` | `/Api-Event-Attendees-List` | GET | ApiController.getEventAttendeesList |
| `/api/getEventsAttendedList` | `/Api-View-Events-Attended` | GET | ApiController.getEventsAttendedList |
| `/api/getEventsOrganisedList` | `/Api-View-Events-Organised` | GET | ApiController.getEventsOrganisedList |
| `/api/saveEventAttendee` | `/Api-Save-Event-Attendee` | POST | ApiController.saveEventAttendee |
| `/api/deleteEventAttendee` | `/Api-Delete-Event-Attendee` | POST | ApiController.deleteEventAttendee |

### Folder Management Routes
| Old Route | New Route | Method | Controller |
|-----------|-----------|---------|------------|
| `/api/getFoldersListByType` | `/Api-Folders-List-By-Type` | GET | ApiController.getFoldersListByType |
| `/api/saveFolderByType` | `/Api-Add-Folder-By-Type` | POST | ApiController.saveFolderByType |
| `/api/getSubFoldersList` | `/Api-Sub-Folders-List` | GET | ApiController.getSubFoldersList |
| `/api/saveSubFolder` | `/Api-Add-Sub-Folder` | POST | ApiController.saveSubFolder |

### Contact Management Routes
| Old Route | New Route | Method | Controller |
|-----------|-----------|---------|------------|
| `/api/getContactsList` | `/Api-Contacts-List` | GET | ApiController.getContactsList |
| `/api/saveContact` | `/Api-Add-Contact` | POST | ApiController.saveContact |
| `/api/saveContactVisitingCard` | `/Api-Add-Contact-Visiting-Card` | POST | ApiController.saveContactVisitingCard |
| `/api/getContactVisitingCardInformation` | `/Api-View-Contact-Visiting-Card` | GET | ApiController.getContactVisitingCardInformation |

### Business Card Routes
| Old Route | New Route | Method | Controller |
|-----------|-----------|---------|------------|
| `/api/activateCard` | `/Api-Activate-Card` | POST | ApiController.activateCard |
| `/api/getBusinessCardInformation` | `/Api-View-Business-Card` | GET | ApiController.getBusinessCardInformation |

### Promotions Routes
| Old Route | New Route | Method | Controller |
|-----------|-----------|---------|------------|
| `/api/getPromotionsList` | `/Api-Promotions-List` | GET | ApiController.getPromotionsList |

### Services Routes
| Old Route | New Route | Method | Controller |
|-----------|-----------|---------|------------|
| `/api/getServicesMasterList` | `/Api-Service-Master-List` | GET | ApiController.getServicesMasterList |
| `/api/getServicesList` | `/Api-Services-List` | GET | ApiController.getServicesList |
| `/api/getAllServicesList` | `/Api-All-Services-List` | GET | ApiController.getAllServicesList |
| `/api/saveServiceProvider` | `/Api-Save-Service-Provider` | POST | ApiController.saveServiceProvider |
| `/api/saveReviewRating` | `/Api-Add-Review-Rating` | POST | ApiController.saveReviewRating |
| `/api/saveServiceDetails` | `/Api-Save-Service-Details` | POST | ApiController.saveServiceDetails |
| `/api/getServiceDetail` | `/Api-View-Service-Details` | GET | ApiController.getServiceDetail |
| `/api/serviceUnlock` | `/Api-Service-Unlock` | POST | ApiController.serviceUnlock |
| `/api/getAllServiceUnlockList` | `/Api-All-Service-Unlock-List` | GET | ApiController.getAllServiceUnlockList |

| `/admin-login` | `/admin-login` | GET/POST | AdminController.adminLogin |
| `/permission-denied` | `/permission-denied` | GET | AdminController.permissionDenied |
| `/admin-dashboard` | `/admin-dashboard` | GET/POST | AdminController.getDashboard |
| `/list-country` | `/list-country` | GET/POST | AdminController.getCountryList |
| `/list-country-ajax` | `/list-country-ajax` | GET/POST | AdminController.getCountryLists |
| `/save-country` | `/save-country` | GET/POST | AdminController.saveCountry |
| `/edit-country/:id` | `/edit-country/:id` | GET/POST | AdminController.viewAddEditForm |
| `/delete-country/:id` | `/delete-country/:id` | GET/POST | AdminController.deleteCountry |
| `/check-duplicate-country` | `/check-duplicate-country` | GET/POST | AdminController.checkDuplicateCountry |
| `/list-state` | `/list-state` | GET/POST | AdminController.viewState |
| `/submit_state` | `/submit_state` | GET/POST | AdminController.submitState |
| `/list_state_ajax` | `/list_state_ajax` | GET/POST | AdminController.listStateAjax |
| `/check_duplicate_state` | `/check_duplicate_state` | GET/POST | AdminController.checkDuplicateState |
| `/delete_state` | `/delete_state` | GET/POST | AdminController.deleteState |
| `/list-city` | `/list-city` | GET/POST | AdminController.viewCities |
| `/submit_cities` | `/submit_cities` | GET/POST | AdminController.submitCities |
| `/list_cities_ajax` | `/list_cities_ajax` | GET/POST | AdminController.listCitiesAjax |
| `/check_duplicate_cities` | `/check_duplicate_cities` | GET/POST | AdminController.checkDuplicateCities |
| `/delete_cities` | `/delete_cities` | GET/POST | AdminController.deleteCities |
| `/list-employment-type` | `/list-employment-type` | GET/POST | AdminController.viewEmploymentType |
| `/submit_employment_type` | `/submit_employment_type` | GET/POST | AdminController.submitEmploymentType |
| `/list_employment_type_ajax` | `/list_employment_type_ajax` | GET/POST | AdminController.listEmploymentTypeAjax |
| `/check_duplicate_employment_type` | `/check_duplicate_employment_type` | GET/POST | AdminController.checkDuplicateEmploymentType |
| `/delete_employment_type` | `/delete_employment_type` | GET/POST | AdminController.deleteEmploymentType |
| `/list-interests` | `/list-interests` | GET/POST | AdminController.viewInterests |
| `/submit_interest` | `/submit_interest` | GET/POST | AdminController.submitInterest |
| `/list_interest_ajax` | `/list_interest_ajax` | GET/POST | AdminController.listInterestAjax |
| `/check_duplicate_interest` | `/check_duplicate_interest` | GET/POST | AdminController.checkDuplicateInterest |
| `/delete_interest` | `/delete_interest` | GET/POST | AdminController.deleteInterest |
| `/list-job-type` | `/list-job-type` | GET/POST | AdminController.viewJobType |
| `/submit_job_type` | `/submit_job_type` | GET/POST | AdminController.submitJobType |
| `/list_job_type_ajax` | `/list_job_type_ajax` | GET/POST | AdminController.listJobTypeAjax |
| `/check_duplicate_job_type` | `/check_duplicate_job_type` | GET/POST | AdminController.checkDuplicateJobType |
| `/delete_job_type` | `/delete_job_type` | GET/POST | AdminController.deleteJobType |
| `/list-pay` | `/list-pay` | GET/POST | AdminController.viewPay |
| `/submit_pay` | `/submit_pay` | GET/POST | AdminController.submitPay |
| `/list_pay_ajax` | `/list_pay_ajax` | GET/POST | AdminController.listPayAjax |
| `/check_duplicate_pay` | `/check_duplicate_pay` | GET/POST | AdminController.checkDuplicatePay |
| `/delete_pay` | `/delete_pay` | GET/POST | AdminController.deletePay |
| `/list-event-mode` | `/list-event-mode` | GET/POST | AdminController.viewEventMode |
| `/submit_event_mode` | `/submit_event_mode` | GET/POST | AdminController.submitEventMode |
| `/list_event_mode_ajax` | `/list_event_mode_ajax` | GET/POST | AdminController.listEventModeAjax |
| `/check_duplicate_event_mode` | `/check_duplicate_event_mode` | GET/POST | AdminController.checkDuplicateEventMode |
| `/delete_event_mode` | `/delete_event_mode` | GET/POST | AdminController.deleteEventMode |
| `/list-event-type` | `/list-event-type` | GET/POST | AdminController.viewEventType |
| `/submit_event_type` | `/submit_event_type` | GET/POST | AdminController.submitEventType |
| `/list_event_type_ajax` | `/list_event_type_ajax` | GET/POST | AdminController.listEventTypeAjax |
| `/check_duplicate_event_type` | `/check_duplicate_event_type` | GET/POST | AdminController.checkDuplicateEventType |
| `/delete_event_type` | `/delete_event_type` | GET/POST | AdminController.deleteEventType |
| `/list-industry-type` | `/list-industry-type` | GET/POST | AdminController.viewIndustryType |
| `/submit_industry_type` | `/submit_industry_type` | GET/POST | AdminController.submitIndustryType |
| `/list_industry_type_ajax` | `/list_industry_type_ajax` | GET/POST | AdminController.listIndustryTypeAjax |
| `/check_duplicate_industry_type` | `/check_duplicate_industry_type` | GET/POST | AdminController.checkDuplicateIndustryType |
| `/delete_industry_type` | `/delete_industry_type` | GET/POST | AdminController.deleteIndustryType |
| `/list-fund-size` | `/list-fund-size` | GET/POST | AdminController.viewFundSize |
| `/submit_fund_size` | `/submit_fund_size` | GET/POST | AdminController.submitFundSize |
| `/list_fund_size_ajax` | `/list_fund_size_ajax` | GET/POST | AdminController.listFundSizeAjax |
| `/check_duplicate_fund_size` | `/check_duplicate_fund_size` | GET/POST | AdminController.checkDuplicateFundSize |
| `/delete_fund_size` | `/delete_fund_size` | GET/POST | AdminController.deleteFundSize |
| `/list-folders` | `/list-folders` | GET/POST | AdminController.viewFolders |
| `/submit_folders` | `/submit_folders` | GET/POST | AdminController.submitFolders |
| `/list_folders_ajax` | `/list_folders_ajax` | GET/POST | AdminController.listFoldersAjax |
| `/check_duplicate_folders` | `/check_duplicate_folders` | GET/POST | AdminController.checkDuplicateFolders |
| `/delete_folders` | `/delete_folders` | GET/POST | AdminController.deleteFolders |
| `/list-users` | `/list-users` | GET/POST | AdminController.viewUsers |
| `/submit_users` | `/submit_users` | GET/POST | AdminController.submitUsers |
| `/list_users_ajax` | `/list_users_ajax` | GET/POST | AdminController.listUsersAjax |
| `/edit_users` | `/edit_users` | GET/POST | AdminController.editUsers |
| `/check_duplicate_users` | `/check_duplicate_users` | GET/POST | AdminController.checkDuplicateUsers |
| `/delete_users` | `/delete_users` | GET/POST | AdminController.deleteUsers |
| `/get_state_list` | `/get_state_list` | GET/POST | AdminController.getStateList |
| `/get_city_list` | `/get_city_list` | GET/POST | AdminController.getCityList |
| `/list-service-provider` | `/list-service-provider` | GET/POST | AdminController.viewServiceProvider |
| `/list_service_provider_ajax` | `/list_service_provider_ajax` | GET/POST | AdminController.listServiceProviderAjax |
| `/list_service_details_ajax` | `/list_service_details_ajax` | GET/POST | AdminController.listServiceDetailsAjax |
| `/submit_service_provider` | `/submit_service_provider` | GET/POST | AdminController.submitServiceProvider |
| `/edit_service_provider` | `/edit_service_provider` | GET/POST | AdminController.editServiceProvider |
| `/delete_service_provider` | `/delete_service_provider` | GET/POST | AdminController.deleteServiceProvider |
| `/view_service_provider_details` | `/view_service_provider_details` | GET/POST | AdminController.viewServiceProviderDetails |
| `/list-card-activation-requests` | `/list-card-activation-requests` | GET/POST | AdminController.viewCardActivationRequests |
| `/list_card_activation_requests_ajax` | `/list_card_activation_requests_ajax` | GET/POST | AdminController.listCardActivationRequestsAjax |
| `/submit_card_activation_requests` | `/submit_card_activation_requests` | GET/POST | AdminController.submitCardActivationRequests |
| `/edit_card_activation_requests` | `/edit_card_activation_requests` | GET/POST | AdminController.editCardActivationRequests |
| `/delete_card_activation_requests` | `/delete_card_activation_requests` | GET/POST | AdminController.deleteCardActivationRequests |
| `/images_card_activation_requests` | `/images_card_activation_requests` | GET/POST | AdminController.imagesCardActivationRequests |

## Investors Admin Routes

| Old Route | New Route | Method | Controller Method |
|-----------|-----------|--------|-------------------|
| `/list-investors` | `/list-investors` | GET/POST | AdminController.viewInvestors |
| `/list_investors_ajax` | `/list_investors_ajax` | GET/POST | AdminController.listInvestorsAjax |
| `/submit_investors` | `/submit_investors` | GET/POST | AdminController.submitInvestors |
| `/edit_investors` | `/edit_investors` | GET/POST | AdminController.editInvestors |
| `/delete_investors` | `/delete_investors` | GET/POST | AdminController.deleteInvestors |
| `/view_investors_details` | `/view_investors_details` | GET/POST | AdminController.viewInvestorsDetails |

## Jobs Admin Routes

| Old Route | New Route | Method | Controller Method |
|-----------|-----------|--------|-------------------|
| `/list-jobs` | `/list-jobs` | GET/POST | AdminController.viewJobs |
| `/list_jobs_ajax` | `/list_jobs_ajax` | GET/POST | AdminController.listJobsAjax |
| `/submit_jobs` | `/submit_jobs` | GET/POST | AdminController.submitJobs |
| `/edit_jobs` | `/edit_jobs` | GET/POST | AdminController.editJobs |
| `/delete_jobs` | `/delete_jobs` | GET/POST | AdminController.deleteJobs |
| `/view_jobs_details` | `/view_jobs_details` | GET/POST | AdminController.viewJobsDetails |

## Events Admin Routes

| Old Route | New Route | Method | Controller Method |
|-----------|-----------|--------|-------------------|
| `/list-events` | `/list-events` | GET/POST | AdminController.viewEvents |
| `/list_events_ajax` | `/list_events_ajax` | GET/POST | AdminController.listEventsAjax |
| `/submit_events` | `/submit_events` | GET/POST | AdminController.submitEvents |
| `/edit_events` | `/edit_events` | GET/POST | AdminController.editEvents |
| `/delete_events` | `/delete_events` | GET/POST | AdminController.deleteEvents |
| `/view_events_details` | `/view_events_details` | GET/POST | AdminController.viewEventsDetails |

## Frontend Routes

| Old Route | New Route | Method | Controller Method |
|-----------|-----------|--------|-------------------|
| `/legal-terms` | `/legal-terms` | GET | ApiController.legalTerms |
| `/delete-request` | `/delete-request` | GET | ApiController.deleteRequest |
| `/thank-you` | `/thank-you` | GET/POST | ApiController.thankYou |

### Investor Routes
| Old Route | New Route | Method | Controller |
|-----------|-----------|---------|------------|
| `/api/saveInvestor` | `/Api-Save-Investor` | POST | ApiController.saveInvestor |
| `/api/getAllInvestorsList` | `/Api-All-Investors-List` | GET | ApiController.getAllInvestorsList |
| `/api/getInvestorDetail` | `/Api-View-Investor-Details` | GET | ApiController.getInvestorDetail |
| `/api/investorUnlock` | `/Api-Investor-Unlock` | POST | ApiController.investorUnlock |
| `/api/saveInvestorReviewRating` | `/Api-Add-Investor-Review-Rating` | POST | ApiController.saveInvestorReviewRating |
| `/api/getInvestorProfile` | `/Api-My-Investor-Profile` | GET | ApiController.getMyInvestorProfile |
| `/api/getInvestorMeets` | `/Api-My-Investor-Meets` | GET | ApiController.getInvestorMeets |
| `/api/getInvestorDesk` | `/Api-Investor-Desk` | GET | ApiController.getInvestorDesk |

### Chat Routes
| Old Route | New Route | Method | Controller |
|-----------|-----------|---------|------------|
| `/api/saveChat` | `/Api-Save-Chat` | POST | ApiController.saveChat |
| `/api/getChat` | `/Api-View-Chat` | GET | ApiController.getChat |
| `/api/getChatUsersList` | `/Api-Chat-Users-List` | GET | ApiController.getChatUsersList |

## Usage Examples

### Before (Old Format)
```javascript
// Old way
fetch('/api/getCountryList?user_id=Njg=&token=abc123')
fetch('/api/getProfile?user_id=Njg=&token=abc123')
```

### After (New Format)
```javascript
// New way - matches PHP exactly
fetch('/Api-Country-List?user_id=Njg=&token=abc123')
fetch('/Api-View-Profile?user_id=Njg=&token=abc123')
```

## Benefits

1. **Exact PHP Match**: Routes now match the PHP backend exactly
2. **Consistent Naming**: All routes follow the same `Api-` prefix pattern
3. **Better Readability**: Route names are more descriptive and clear
4. **Easier Migration**: Frontend can be updated to use the same route names as PHP
5. **Maintenance**: Easier to maintain consistency between PHP and NodeJS backends

## Migration Notes

- All existing functionality remains the same
- Only the route URLs have changed
- Controllers and methods remain unchanged
- Authentication and middleware remain the same
- Response formats remain identical to PHP

## Testing

All routes have been tested and are working correctly with the new format. The server will return a 404 error for old route formats, directing users to use the new PHP-aligned route names.
