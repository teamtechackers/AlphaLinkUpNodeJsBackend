# AlphaLinkup NodeJS Routes Alignment Report

Generated: 2025-08-23T05:26:23.056Z

## Summary

- **PHP Routes**: 3
- **NodeJS Routes**: 370
- **Postman Requests**: 83

## Analysis Results

- **Missing in NodeJS**: 3
- **Mismatched in NodeJS**: 3
- **Extra in NodeJS**: 340
- **PHP vs Postman Conflicts**: 0

## A. Missing in NodeJS (must be added)

| Method | Path | Controller | Action |
|--------|------|------------|--------|
| GET | /404_override | | |
| GET | /default_controller | | |
| GET | /404_override | | |

## B. Mismatched in NodeJS (must be renamed/updated)

| NodeJS (Current) | PHP (Target) |
|------------------|--------------|
| GET /dashboard | GET /404_override |
| GET /dashboard | GET /default_controller |
| GET /dashboard | GET /404_override |

## C. Extra in NodeJS (must be removed)

| File | Method | Path | Handler | Line |
|------|--------|------|---------|------|
| src/routes/adminRoutes.js | POST | /login |  | 19 |
| src/routes/adminRoutes.js | GET | /dashboard | AdminController.getDashboardData); | 30 |
| src/routes/adminRoutes.js | GET | /overview | AdminController.getPlatformOverview); | 31 |
| src/routes/adminRoutes.js | GET | /users | AdminController.getUserManagementData); | 34 |
| src/routes/adminRoutes.js | PUT | /users/:userId/status |  | 35 |
| src/routes/adminRoutes.js | PUT | /users/bulk-status |  | 40 |
| src/routes/adminRoutes.js | GET | /moderation | AdminController.getContentModerationData); | 46 |
| src/routes/adminRoutes.js | PUT | /reports/:reportId/assign |  | 47 |
| src/routes/adminRoutes.js | PUT | /reports/:reportId/status |  | 52 |
| src/routes/adminRoutes.js | GET | /notifications | AdminController.getSystemNotifications); | 58 |
| src/routes/adminRoutes.js | POST | /notifications |  | 59 |
| src/routes/adminRoutes.js | GET | /activity-log | AdminController.getAdminActivityLog); | 65 |
| src/routes/adminRoutes.js | POST | /activity-log |  | 66 |
| src/routes/adminRoutes.js | GET | /system/health | AdminController.getSystemHealth); | 72 |
| src/routes/adminRoutes.js | GET | /system/performance | AdminController.getPerformanceMetrics); | 73 |
| src/routes/adminRoutes.js | GET | /analytics/users | AdminController.getUserAnalytics); | 76 |
| src/routes/adminRoutes.js | GET | /analytics/business | AdminController.getBusinessMetrics); | 77 |
| src/routes/adminRoutes.js | GET | /export | AdminController.exportAdminData); | 80 |
| src/routes/adminRoutes.js | GET | /permissions | AdminController.getAdminPermissions); | 83 |
| src/routes/adminRoutes.js | PUT | /profile |  | 84 |
| src/routes/adminRoutes.js | PUT | /change-password |  | 89 |
| src/routes/adminRoutes.js | GET | /stats | AdminController.getAdminStats); | 95 |
| src/routes/analyticsRoutes.js | GET | /overview | AnalyticsController.getPlatformOverview); | 21 |
| src/routes/analyticsRoutes.js | GET | /users | AnalyticsController.getUserAnalytics); | 24 |
| src/routes/analyticsRoutes.js | GET | /users/registrations | AnalyticsController.getUserRegistrationAnalytics); | 25 |
| src/routes/analyticsRoutes.js | GET | /users/retention | AnalyticsController.getUserRetentionAnalytics); | 26 |
| src/routes/analyticsRoutes.js | GET | /users/profile-completion | AnalyticsController.getUserProfileCompletionAnalytics); | 27 |
| src/routes/analyticsRoutes.js | GET | /users/segmentation | AnalyticsController.getUserSegmentationAnalytics); | 28 |
| src/routes/analyticsRoutes.js | GET | /engagement | AnalyticsController.getEngagementAnalytics); | 31 |
| src/routes/analyticsRoutes.js | GET | /connections | AnalyticsController.getConnectionAnalytics); | 32 |
| src/routes/analyticsRoutes.js | GET | /chat | AnalyticsController.getChatAnalytics); | 33 |
| src/routes/analyticsRoutes.js | GET | /notifications | AnalyticsController.getNotificationAnalytics); | 34 |
| src/routes/analyticsRoutes.js | GET | /search | AnalyticsController.getSearchAnalytics); | 35 |
| src/routes/analyticsRoutes.js | GET | /business | AnalyticsController.getBusinessAnalytics); | 38 |
| src/routes/analyticsRoutes.js | GET | /jobs | AnalyticsController.getJobAnalytics); | 39 |
| src/routes/analyticsRoutes.js | GET | /events | AnalyticsController.getEventAnalytics); | 40 |
| src/routes/analyticsRoutes.js | GET | /services | AnalyticsController.getServiceAnalytics); | 41 |
| src/routes/analyticsRoutes.js | GET | /investors | AnalyticsController.getInvestorAnalytics); | 42 |
| src/routes/analyticsRoutes.js | GET | /growth | AnalyticsController.getGrowthAnalytics); | 45 |
| src/routes/analyticsRoutes.js | GET | /geographic | AnalyticsController.getGeographicAnalytics); | 46 |
| src/routes/analyticsRoutes.js | GET | /performance | AnalyticsController.getPerformanceAnalytics); | 49 |
| src/routes/analyticsRoutes.js | POST | /custom-report |  | 52 |
| src/routes/analyticsRoutes.js | GET | /dashboard | AnalyticsController.getAnalyticsDashboard); | 57 |
| src/routes/analyticsRoutes.js | GET | /real-time | AnalyticsController.getRealTimeAnalytics); | 58 |
| src/routes/analyticsRoutes.js | GET | /insights | AnalyticsController.getAnalyticsInsights); | 61 |
| src/routes/analyticsRoutes.js | GET | /trends | AnalyticsController.getAnalyticsTrends); | 62 |
| src/routes/analyticsRoutes.js | GET | /comparison | AnalyticsController.getAnalyticsComparison); | 63 |
| src/routes/analyticsRoutes.js | GET | /forecast | AnalyticsController.getAnalyticsForecast); | 64 |
| src/routes/analyticsRoutes.js | GET | /alerts | AnalyticsController.getAnalyticsAlerts); | 67 |
| src/routes/analyticsRoutes.js | POST | /alerts |  | 68 |
| src/routes/analyticsRoutes.js | GET | /export | AnalyticsController.exportAnalyticsData); | 74 |
| src/routes/authRoutes.js | POST | /send-otp | AuthController.sendOtp); | 10 |
| src/routes/authRoutes.js | POST | /verify-otp | AuthController.verifyOtp); | 11 |
| src/routes/authRoutes.js | GET | /user/mobile/:mobile | AuthController.getUserByMobile); | 14 |
| src/routes/authRoutes.js | GET | /user/qr/:qr_code | AuthController.getUserByQRCode); | 15 |
| src/routes/authRoutes.js | GET | /status | AuthController.checkAuthStatus); | 18 |
| src/routes/authRoutes.js | POST | /logout | AuthController.logout); | 21 |
| src/routes/businessCardRoutes.js | GET | /qr/:qr_code | BusinessCardController.getBusinessCardByQR); | 18 |
| src/routes/businessCardRoutes.js | POST | /activate |  | 21 |
| src/routes/businessCardRoutes.js | GET | /:user_id |  | 28 |
| src/routes/businessCardRoutes.js | PUT | /:user_id |  | 33 |
| src/routes/businessCardRoutes.js | DELETE | /:user_id |  | 40 |
| src/routes/businessCardRoutes.js | GET | /:user_id/stats |  | 46 |
| src/routes/businessCardRoutes.js | POST | /:user_id/share |  | 52 |
| src/routes/businessCardRoutes.js | GET | /:user_id/export |  | 59 |
| src/routes/chatRoutes.js | POST | /messages/:receiverId | ChatController.sendMessage); | 16 |
| src/routes/chatRoutes.js | GET | /conversations/:otherUserId | ChatController.getConversation); | 18 |
| src/routes/chatRoutes.js | GET | /conversations | ChatController.getUserConversations); | 19 |
| src/routes/chatRoutes.js | GET | /conversations/:conversationUserId/archive | ChatController.archiveConversation); | 20 |
| src/routes/chatRoutes.js | GET | /conversations/:conversationUserId/unarchive | ChatController.unarchiveConversation); | 21 |
| src/routes/chatRoutes.js | GET | /conversations/archived | ChatController.getArchivedConversations); | 22 |
| src/routes/chatRoutes.js | PUT | /messages/:messageId | ChatController.editMessage); | 25 |
| src/routes/chatRoutes.js | DELETE | /messages/:messageId | ChatController.deleteMessage); | 27 |
| src/routes/chatRoutes.js | PUT | /conversations/:conversationUserId/read | ChatController.markMessagesAsRead); | 29 |
| src/routes/chatRoutes.js | PUT | /conversations/read-all | ChatController.markAllMessagesAsRead); | 30 |
| src/routes/chatRoutes.js | GET | /unread/count | ChatController.getUnreadCount); | 31 |
| src/routes/chatRoutes.js | GET | /messages/search | ChatController.searchMessages); | 34 |
| src/routes/chatRoutes.js | GET | /messages/stats | ChatController.getMessageStats); | 35 |
| src/routes/chatRoutes.js | GET | /analytics | ChatController.getChatAnalytics); | 36 |
| src/routes/chatRoutes.js | POST | /groups | ChatController.createGroupChat); | 39 |
| src/routes/chatRoutes.js | GET | /groups | ChatController.getUserGroups); | 41 |
| src/routes/chatRoutes.js | POST | /groups/:groupId/members | ChatController.addGroupMembers); | 42 |
| src/routes/chatRoutes.js | DELETE | /groups/:groupId/members/:memberId | ChatController.removeGroupMember); | 44 |
| src/routes/chatRoutes.js | POST | /groups/:groupId/messages | ChatController.sendGroupMessage); | 47 |
| src/routes/chatRoutes.js | GET | /groups/:groupId/messages | ChatController.getGroupMessages); | 49 |
| src/routes/chatRoutes.js | POST | /block/:userToBlockId | ChatController.blockUserFromChat); | 52 |
| src/routes/chatRoutes.js | DELETE | /block/:userToUnblockId | ChatController.unblockUserFromChat); | 54 |
| src/routes/chatRoutes.js | GET | /blocked | ChatController.getBlockedUsers); | 55 |
| src/routes/chatRoutes.js | GET | /history/:conversationUserId | ChatController.getChatHistory); | 58 |
| src/routes/chatRoutes.js | GET | /:conversationUserId/export | ChatController.exportChatData); | 59 |
| src/routes/chatRoutes.js | DELETE | /:conversationUserId/history | ChatController.clearChatHistory); | 60 |
| src/routes/chatRoutes.js | GET | /:conversationUserId/insights | ChatController.getChatInsights); | 62 |
| src/routes/chatRoutes.js | POST | /typing/:receiverId | ChatController.sendTypingIndicator); | 65 |
| src/routes/chatRoutes.js | PUT | /messages/:messageId/delivered | ChatController.markMessageAsDelivered); | 67 |
| src/routes/chatRoutes.js | GET | /suggestions | ChatController.getConversationSuggestions); | 70 |
| src/routes/contactRoutes.js | POST | / |  | 18 |
| src/routes/contactRoutes.js | GET | / |  | 25 |
| src/routes/contactRoutes.js | GET | /search |  | 31 |
| src/routes/contactRoutes.js | GET | /stats |  | 37 |
| src/routes/contactRoutes.js | GET | /suggestions |  | 43 |
| src/routes/contactRoutes.js | GET | /categories |  | 49 |
| src/routes/contactRoutes.js | POST | /categories |  | 55 |
| src/routes/contactRoutes.js | PUT | /categories/:category_id |  | 62 |
| src/routes/contactRoutes.js | DELETE | /categories/:category_id |  | 69 |
| src/routes/contactRoutes.js | GET | /:contact_id |  | 76 |
| src/routes/contactRoutes.js | PUT | /:contact_id |  | 82 |
| src/routes/contactRoutes.js | DELETE | /:contact_id |  | 89 |
| src/routes/contactRoutes.js | PUT | /:contact_id/move |  | 95 |
| src/routes/contactRoutes.js | POST | /import |  | 103 |
| src/routes/contactRoutes.js | GET | /export |  | 110 |
| src/routes/contactRoutes.js | POST | /sync |  | 117 |
| src/routes/eventRoutes.js | GET | / | EventController.getEvents); | 18 |
| src/routes/eventRoutes.js | GET | /:eventId | EventController.getEvent); | 19 |
| src/routes/eventRoutes.js | GET | /categories/popular | EventController.getPopularEventCategories); | 20 |
| src/routes/eventRoutes.js | GET | /locations/trending | EventController.getTrendingEventLocations); | 21 |
| src/routes/eventRoutes.js | POST | / |  | 27 |
| src/routes/eventRoutes.js | PUT | /:eventId |  | 33 |
| src/routes/eventRoutes.js | DELETE | /:eventId | EventController.deleteEvent); | 38 |
| src/routes/eventRoutes.js | PUT | /:eventId/cancel |  | 39 |
| src/routes/eventRoutes.js | PUT | /:eventId/reschedule |  | 43 |
| src/routes/eventRoutes.js | POST | /:eventId/register |  | 49 |
| src/routes/eventRoutes.js | DELETE | /:eventId/register | EventController.cancelRegistration); | 54 |
| src/routes/eventRoutes.js | GET | /:eventId/registrations | EventController.getEventRegistrations); | 55 |
| src/routes/eventRoutes.js | GET | /registrations/my | EventController.getUserRegistrations); | 56 |
| src/routes/eventRoutes.js | PUT | /registrations/:registrationId/status |  | 57 |
| src/routes/eventRoutes.js | GET | /search | EventController.searchEvents); | 63 |
| src/routes/eventRoutes.js | GET | /recommendations | EventController.getEventRecommendations); | 64 |
| src/routes/eventRoutes.js | GET | /stats | EventController.getEventStats); | 67 |
| src/routes/eventRoutes.js | GET | /:eventId/insights | EventController.getEventInsights); | 68 |
| src/routes/eventRoutes.js | POST | /:eventId/save | EventController.saveEvent); | 71 |
| src/routes/eventRoutes.js | DELETE | /:eventId/save | EventController.removeSavedEvent); | 72 |
| src/routes/eventRoutes.js | GET | /saved | EventController.getSavedEvents); | 73 |
| src/routes/eventRoutes.js | POST | /:eventId/share |  | 74 |
| src/routes/eventRoutes.js | POST | /:eventId/report |  | 80 |
| src/routes/eventRoutes.js | POST | /:eventId/reminders |  | 86 |
| src/routes/eventRoutes.js | GET | /:eventId/export | EventController.exportEventData); | 92 |
| src/routes/index.js | GET | /health | (req | 20 |
| src/routes/index.js | GET | /version | (req | 32 |
| src/routes/jobRoutes.js | GET | / | JobController.getJobs); | 18 |
| src/routes/jobRoutes.js | GET | /:jobId | JobController.getJob); | 19 |
| src/routes/jobRoutes.js | GET | /categories/popular | JobController.getPopularJobCategories); | 20 |
| src/routes/jobRoutes.js | GET | /locations/trending | JobController.getTrendingJobLocations); | 21 |
| src/routes/jobRoutes.js | POST | / |  | 27 |
| src/routes/jobRoutes.js | PUT | /:jobId |  | 33 |
| src/routes/jobRoutes.js | DELETE | /:jobId | JobController.deleteJob); | 38 |
| src/routes/jobRoutes.js | PUT | /:jobId/close | JobController.closeJob); | 39 |
| src/routes/jobRoutes.js | PUT | /:jobId/reopen | JobController.reopenJob); | 40 |
| src/routes/jobRoutes.js | POST | /:jobId/apply |  | 43 |
| src/routes/jobRoutes.js | GET | /:jobId/applications | JobController.getJobApplications); | 48 |
| src/routes/jobRoutes.js | GET | /applications/my | JobController.getUserApplications); | 49 |
| src/routes/jobRoutes.js | PUT | /applications/:applicationId/status |  | 50 |
| src/routes/jobRoutes.js | DELETE | /applications/:applicationId | JobController.withdrawApplication); | 54 |
| src/routes/jobRoutes.js | GET | /search | JobController.searchJobs); | 57 |
| src/routes/jobRoutes.js | GET | /recommendations | JobController.getJobRecommendations); | 58 |
| src/routes/jobRoutes.js | GET | /stats | JobController.getJobStats); | 61 |
| src/routes/jobRoutes.js | GET | /:jobId/insights | JobController.getJobInsights); | 62 |
| src/routes/jobRoutes.js | POST | /:jobId/save | JobController.saveJob); | 65 |
| src/routes/jobRoutes.js | DELETE | /:jobId/save | JobController.removeSavedJob); | 66 |
| src/routes/jobRoutes.js | GET | /saved | JobController.getSavedJobs); | 67 |
| src/routes/jobRoutes.js | POST | /:jobId/share |  | 68 |
| src/routes/jobRoutes.js | POST | /:jobId/report |  | 74 |
| src/routes/jobRoutes.js | GET | /:jobId/export | JobController.exportJobData); | 80 |
| src/routes/masterDataRoutes.js | GET | /categories |  | 19 |
| src/routes/masterDataRoutes.js | GET | /categories/:category |  | 24 |
| src/routes/masterDataRoutes.js | GET | /categories/:category/items/:item_id |  | 29 |
| src/routes/masterDataRoutes.js | GET | /location-hierarchy |  | 34 |
| src/routes/masterDataRoutes.js | GET | /search |  | 39 |
| src/routes/masterDataRoutes.js | GET | /suggestions |  | 44 |
| src/routes/masterDataRoutes.js | GET | /stats |  | 49 |
| src/routes/masterDataRoutes.js | GET | /export |  | 54 |
| src/routes/masterDataRoutes.js | GET | /validate |  | 59 |
| src/routes/masterDataRoutes.js | GET | /categories/:category/items/:item_id/dependencies |  | 64 |
| src/routes/masterDataRoutes.js | POST | /categories/:category/items |  | 70 |
| src/routes/masterDataRoutes.js | PUT | /categories/:category/items/:item_id |  | 78 |
| src/routes/masterDataRoutes.js | DELETE | /categories/:category/items/:item_id |  | 86 |
| src/routes/masterDataRoutes.js | POST | /import |  | 93 |
| src/routes/masterDataRoutes.js | POST | /bulk-update |  | 101 |
| src/routes/masterDataRoutes.js | GET | /audit-log |  | 109 |
| src/routes/masterDataRoutes.js | POST | /sync |  | 116 |
| src/routes/paymentRoutes.js | GET | /plans | PaymentController.getSubscriptionPlans); | 18 |
| src/routes/paymentRoutes.js | GET | /plans/:planId | PaymentController.getPlanDetails); | 19 |
| src/routes/paymentRoutes.js | POST | /process |  | 25 |
| src/routes/paymentRoutes.js | POST | /subscriptions |  | 32 |
| src/routes/paymentRoutes.js | GET | /subscriptions | PaymentController.getUserSubscriptions); | 37 |
| src/routes/paymentRoutes.js | GET | /subscriptions/:subscriptionId | PaymentController.getSubscriptionDetails); | 38 |
| src/routes/paymentRoutes.js | PUT | /subscriptions/:subscriptionId/cancel |  | 39 |
| src/routes/paymentRoutes.js | PUT | /subscriptions/:subscriptionId/renew |  | 44 |
| src/routes/paymentRoutes.js | PUT | /subscriptions/:subscriptionId/upgrade |  | 49 |
| src/routes/paymentRoutes.js | POST | /payments/:paymentId/refund |  | 55 |
| src/routes/paymentRoutes.js | GET | /payments/history | PaymentController.getPaymentHistory); | 61 |
| src/routes/paymentRoutes.js | GET | /payments/stats | PaymentController.getPaymentStats); | 62 |
| src/routes/paymentRoutes.js | GET | /payments/analytics | PaymentController.getPaymentAnalytics); | 63 |
| src/routes/paymentRoutes.js | GET | /billing | PaymentController.getBillingInformation); | 66 |
| src/routes/paymentRoutes.js | PUT | /billing |  | 67 |
| src/routes/paymentRoutes.js | GET | /payments/:paymentId/invoice | PaymentController.generateInvoice); | 73 |
| src/routes/paymentRoutes.js | GET | /methods | PaymentController.getPaymentMethods); | 76 |
| src/routes/paymentRoutes.js | POST | /methods |  | 77 |
| src/routes/paymentRoutes.js | DELETE | /methods/:methodId | PaymentController.removePaymentMethod); | 82 |
| src/routes/paymentRoutes.js | PUT | /methods/:methodId/default | PaymentController.setDefaultPaymentMethod); | 83 |
| src/routes/paymentRoutes.js | GET | /spending-limit | PaymentController.getDailySpendingLimit); | 86 |
| src/routes/paymentRoutes.js | PUT | /spending-limit |  | 87 |
| src/routes/searchRoutes.js | GET | /global |  | 18 |
| src/routes/searchRoutes.js | GET | /users |  | 24 |
| src/routes/searchRoutes.js | GET | /jobs |  | 30 |
| src/routes/searchRoutes.js | GET | /events |  | 36 |
| src/routes/searchRoutes.js | GET | /services |  | 42 |
| src/routes/searchRoutes.js | GET | /investors |  | 48 |
| src/routes/searchRoutes.js | GET | /projects |  | 54 |
| src/routes/searchRoutes.js | GET | /suggestions |  | 61 |
| src/routes/searchRoutes.js | GET | /filters | SearchController.getSearchFilters); | 66 |
| src/routes/searchRoutes.js | GET | /popular | SearchController.getPopularSearches); | 67 |
| src/routes/searchRoutes.js | GET | /trending | SearchController.getTrendingSearches); | 68 |
| src/routes/searchRoutes.js | GET | /analytics | SearchController.getSearchAnalytics); | 74 |
| src/routes/searchRoutes.js | GET | /insights | SearchController.getSearchInsights); | 75 |
| src/routes/searchRoutes.js | GET | /history | SearchController.getSearchHistory); | 78 |
| src/routes/searchRoutes.js | DELETE | /history | SearchController.clearSearchHistory); | 79 |
| src/routes/searchRoutes.js | POST | /queries |  | 82 |
| src/routes/searchRoutes.js | GET | /queries | SearchController.getSavedSearchQueries); | 87 |
| src/routes/searchRoutes.js | DELETE | /queries/:queryId | SearchController.deleteSavedSearchQuery); | 88 |
| src/routes/searchRoutes.js | GET | /recommendations | SearchController.getSearchRecommendations); | 91 |
| src/routes/searchRoutes.js | GET | /performance | SearchController.getSearchPerformanceMetrics); | 94 |
| src/routes/searchRoutes.js | GET | /relevance | SearchController.getSearchRelevanceScores); | 95 |
| src/routes/searchRoutes.js | PUT | /relevance |  | 96 |
| src/routes/searchRoutes.js | GET | /autocomplete | SearchController.getAutocompleteSuggestions); | 102 |
| src/routes/searchRoutes.js | GET | /facets | SearchController.getSearchFacets); | 103 |
| src/routes/searchRoutes.js | GET | /export | SearchController.exportSearchResults); | 106 |
| src/routes/testRoutes.js | GET | /health | (req | 27 |
| src/routes/testRoutes.js | GET | /version | (req | 37 |
| src/routes/unlockRoutes.js | POST | /services |  | 20 |
| src/routes/unlockRoutes.js | GET | /services/user |  | 27 |
| src/routes/unlockRoutes.js | GET | /services/user/history |  | 33 |
| src/routes/unlockRoutes.js | GET | /services/:service_id/stats |  | 39 |
| src/routes/unlockRoutes.js | GET | /services/:service_id/status |  | 44 |
| src/routes/unlockRoutes.js | GET | /services/:service_id/pricing |  | 50 |
| src/routes/unlockRoutes.js | GET | /services/recommendations |  | 55 |
| src/routes/unlockRoutes.js | GET | /services/admin/all |  | 62 |
| src/routes/unlockRoutes.js | PUT | /services/admin/:unlock_id/revoke |  | 69 |
| src/routes/unlockRoutes.js | GET | /services/admin/analytics |  | 77 |
| src/routes/unlockRoutes.js | GET | /services/admin/export |  | 84 |
| src/routes/unlockRoutes.js | POST | /investors |  | 92 |
| src/routes/unlockRoutes.js | GET | /investors/user |  | 99 |
| src/routes/unlockRoutes.js | GET | /investors/user/history |  | 105 |
| src/routes/unlockRoutes.js | GET | /investors/:investor_id/stats |  | 111 |
| src/routes/unlockRoutes.js | GET | /investors/:investor_id/status |  | 116 |
| src/routes/unlockRoutes.js | GET | /investors/:investor_id/pricing |  | 122 |
| src/routes/unlockRoutes.js | GET | /investors/recommendations |  | 127 |
| src/routes/unlockRoutes.js | GET | /investors/user/meets |  | 134 |
| src/routes/unlockRoutes.js | POST | /investors/meeting-request |  | 140 |
| src/routes/unlockRoutes.js | GET | /investors/:investor_id/desk |  | 147 |
| src/routes/unlockRoutes.js | GET | /investors/admin/all |  | 154 |
| src/routes/unlockRoutes.js | PUT | /investors/admin/:unlock_id/revoke |  | 161 |
| src/routes/unlockRoutes.js | GET | /investors/admin/analytics |  | 169 |
| src/routes/unlockRoutes.js | GET | /investors/admin/export |  | 176 |
| src/routes/userRoutes.js | POST | /register |  | 18 |
| src/routes/userRoutes.js | POST | /login |  | 24 |
| src/routes/userRoutes.js | POST | /forgot-password |  | 30 |
| src/routes/userRoutes.js | POST | /reset-password |  | 36 |
| src/routes/userRoutes.js | POST | /verify-email |  | 42 |
| src/routes/userRoutes.js | POST | /resend-verification |  | 48 |
| src/routes/userRoutes.js | POST | /refresh-token | UserController.refreshToken); | 58 |
| src/routes/userRoutes.js | GET | /profile | UserController.getProfile); | 61 |
| src/routes/userRoutes.js | PUT | /profile |  | 62 |
| src/routes/userRoutes.js | POST | /profile/photo |  | 67 |
| src/routes/userRoutes.js | PUT | /change-password |  | 73 |
| src/routes/userRoutes.js | GET | /settings | UserController.getSettings); | 79 |
| src/routes/userRoutes.js | PUT | /settings |  | 80 |
| src/routes/userRoutes.js | POST | /settings/reset | UserController.resetSettings); | 84 |
| src/routes/userRoutes.js | GET | /notifications | UserController.getNotifications); | 87 |
| src/routes/userRoutes.js | PUT | /notifications/:notificationId/read | UserController.markNotificationAsRead); | 88 |
| src/routes/userRoutes.js | PUT | /notifications/read-all | UserController.markAllNotificationsAsRead); | 89 |
| src/routes/userRoutes.js | GET | /connections | UserController.getConnections); | 92 |
| src/routes/userRoutes.js | POST | /connections/:userId/send | UserController.sendConnectionRequest); | 93 |
| src/routes/userRoutes.js | PUT | /connections/:userId/accept | UserController.acceptConnectionRequest); | 94 |
| src/routes/userRoutes.js | PUT | /connections/:userId/reject | UserController.rejectConnectionRequest); | 95 |
| src/routes/userRoutes.js | DELETE | /connections/:userId | UserController.removeConnection); | 96 |
| src/routes/userRoutes.js | POST | /block/:userId |  | 99 |
| src/routes/userRoutes.js | DELETE | /block/:userId | UserController.unblockUser); | 103 |
| src/routes/userRoutes.js | GET | /connections/suggestions | UserController.getConnectionSuggestions); | 106 |
| src/routes/userRoutes.js | GET | /search | UserController.searchUsers); | 109 |
| src/routes/userRoutes.js | GET | /recommendations | UserController.getUserRecommendations); | 110 |
| src/routes/userRoutes.js | POST | /deactivate |  | 113 |
| src/routes/userRoutes.js | POST | /reactivate | UserController.reactivateAccount); | 117 |
| src/routes/userRoutes.js | GET | /stats | UserController.getUserStats); | 120 |
| src/routes/userRoutes.js | GET | /export | UserController.exportUserData); | 123 |
| src/routes/v1/api.js | POST | /Api-Send-Otp | ApiController.sendOtp); | 11 |
| src/routes/v1/api.js | POST | /Api-Verify-Otp | ApiController.verifyOtp); | 12 |
| src/routes/v1/api.js | POST | /Api-Login | ApiController.login); // parity placeholder | 14 |
| src/routes/v1/api.js | POST | /Api-Logout | checkUser | 15 |
| src/routes/v1/api.js | POST | /Api-Country-List | checkUser | 17 |
| src/routes/v1/api.js | POST | /Api-State-List | checkUser | 18 |
| src/routes/v1/api.js | POST | /Api-City-List | checkUser | 19 |
| src/routes/v1/api.js | POST | /Api-Interests-List | checkUser | 20 |
| src/routes/v1/api.js | POST | /Api-Employment-Type-List | checkUser | 21 |
| src/routes/v1/api.js | POST | /Api-Job-Type-List | checkUser | 22 |
| src/routes/v1/api.js | POST | /Api-Pay-List | checkUser | 23 |
| src/routes/v1/api.js | POST | /Api-Event-Mode-List | checkUser | 24 |
| src/routes/v1/api.js | POST | /Api-Event-Type-List | checkUser | 25 |
| src/routes/v1/api.js | POST | /Api-Fund-Size-List | checkUser | 26 |
| src/routes/v1/api.js | POST | /Api-Update-Profile | checkUser | 28 |
| src/routes/v1/api.js | POST | /Api-View-Profile | checkUser | 29 |
| src/routes/v1/api.js | POST | /Api-View-User-Detail-By-Mobile | checkUser | 30 |
| src/routes/v1/api.js | POST | /Api-View-User-Detail-By-Qrcode | checkUser | 31 |
| src/routes/v1/api.js | POST | /Api-View-Profile-By-Mobile | checkUser | 32 |
| src/routes/v1/api.js | POST | /Api-Dashboard | checkUser | 34 |
| src/routes/v1/api.js | POST | /Api-View-Job-Information | checkUser | 36 |
| src/routes/v1/api.js | POST | /Api-View-Job-Details | checkUser | 37 |
| src/routes/v1/api.js | POST | /Api-Job-Applicants-List | checkUser | 38 |
| src/routes/v1/api.js | POST | /Api-View-Resumes | checkUser | 39 |
| src/routes/v1/api.js | POST | /Api-View-Event-Information | checkUser | 41 |
| src/routes/v1/api.js | POST | /Api-View-Event-Details | checkUser | 42 |
| src/routes/v1/api.js | POST | /Api-Event-Organisers-List | checkUser | 43 |
| src/routes/v1/api.js | POST | /Api-Event-Attendees-List | checkUser | 44 |
| src/routes/v1/api.js | POST | /Api-View-Events-Attended | checkUser | 46 |
| src/routes/v1/api.js | POST | /Api-View-Events-Organised | checkUser | 47 |
| src/routes/v1/api.js | POST | /Api-Folders-List-By-Type | checkUser | 49 |
| src/routes/v1/api.js | POST | /Api-Sub-Folders-List | checkUser | 50 |
| src/routes/v1/api.js | POST | /Api-Contacts-List | checkUser | 51 |
| src/routes/v1/api.js | POST | /Api-View-Contact-Visiting-Card | checkUser | 53 |
| src/routes/v1/api.js | POST | /Api-Activate-Card | checkUser | 55 |
| src/routes/v1/api.js | POST | /Api-View-Business-Card | checkUser | 56 |
| src/routes/v1/api.js | POST | /Api-Promotions-List | checkUser | 58 |
| src/routes/v1/api.js | POST | /Api-Service-Master-List | checkUser | 60 |
| src/routes/v1/api.js | POST | /Api-Services-List | checkUser | 61 |
| src/routes/v1/api.js | POST | /Api-View-Service-Details | checkUser | 62 |
| src/routes/v1/api.js | POST | /Api-All-Services-List | checkUser | 64 |
| src/routes/v1/api.js | POST | /Api-Service-Unlock | checkUser | 66 |
| src/routes/v1/api.js | POST | /Api-All-Service-Unlock-List | checkUser | 67 |
| src/routes/v1/api.js | POST | /Api-All-Investors-List | checkUser | 69 |
| src/routes/v1/api.js | POST | /Api-View-Investor-Details | checkUser | 70 |
| src/routes/v1/api.js | POST | /Api-Investor-Unlock | checkUser | 71 |
| src/routes/v1/api.js | POST | /Api-My-Investor-Profile | checkUser | 72 |
| src/routes/v1/api.js | POST | /Api-My-Investor-Meets | checkUser | 73 |
| src/routes/v1/api.js | POST | /Api-Investor-Desk | checkUser | 74 |
| src/routes/v1/api.js | POST | /Api-Chat-Users-List | checkUser | 76 |
| src/routes/v1/api.js | POST | /Api-View-Chat | checkUser | 77 |
| src/routes/v1/api.js | POST | /Api-Save-Chat | checkUser | 78 |
| src/routes/v1/api.js | POST | /Api-Save-Project-Details | checkUser | 81 |
| src/routes/v1/api.js | POST | /Api-Save-Event-Information | checkUser | 82 |
| src/routes/v1/api.js | POST | /Api-Save-Service-Details | checkUser | 83 |
| src/routes/v1/api.js | POST | /Api-Add-Contact-Visiting-Card | checkUser | 84 |

## Route Mapping Table

| NodeJS (Before) | PHP Target | HTTP Method |
|------------------|------------|-------------|
| | /404_override | GET |
| | /default_controller | GET |
| | /404_override | GET |
| | /404_override | GET |
| | /default_controller | GET |
| | /404_override | GET |

## Implementation Notes

1. **Only change route path strings** - do not modify controllers, services, models, or business logic
2. **Keep existing Express param names** (e.g., :userId stays :userId)
3. **PHP routes take precedence** over Postman collection
4. **Remove legacy routes** that don't match PHP endpoints
5. **Update mount paths** in app.js and route files as needed

