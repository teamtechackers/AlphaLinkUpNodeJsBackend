const NotificationController = require('./src/controllers/NotificationController');

async function testNotifications() {
    console.log('🧪 Testing NotificationController functions...\n');

    try {
        // Test 1: Fetch notifications for user 1
        console.log('1. Testing fetchNotifications...');
        const fetchResult = await NotificationController.fetchNotifications(1, { limit: 5 });
        console.log('✅ Fetch result:', JSON.stringify(fetchResult, null, 2));
        console.log('');

        // Test 2: Get notification stats for user 1
        console.log('2. Testing getNotificationStats...');
        const statsResult = await NotificationController.getNotificationStats(1);
        console.log('✅ Stats result:', JSON.stringify(statsResult, null, 2));
        console.log('');

        // Test 3: Mark a notification as read
        console.log('3. Testing markAsRead...');
        if (fetchResult.success && fetchResult.notifications.length > 0) {
            const firstNotification = fetchResult.notifications[0];
            const markReadResult = await NotificationController.markAsRead(firstNotification.id, 1);
            console.log('✅ Mark as read result:', JSON.stringify(markReadResult, null, 2));
        }
        console.log('');

        // Test 4: Save a new notification
        console.log('4. Testing saveNotification...');
        const newNotification = {
            user_id: 1,
            notification_type: 'system',
            title: 'Test Notification',
            message: 'This is a test notification from the test script',
            data: { test: true, timestamp: new Date().toISOString() },
            source_id: 999,
            source_type: 'test'
        };
        const saveResult = await NotificationController.saveNotification(newNotification);
        console.log('✅ Save result:', JSON.stringify(saveResult, null, 2));
        console.log('');

        console.log('🎉 All tests completed successfully!');

    } catch (error) {
        console.error('❌ Test failed:', error.message);
    }

    process.exit(0);
}

testNotifications();
