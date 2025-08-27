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
