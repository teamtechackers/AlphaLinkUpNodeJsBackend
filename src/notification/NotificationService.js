const admin = require('firebase-admin');
const path = require('path');

// Initialize Firebase Admin SDK with fallback to serviceAccountKey.json
if (!admin.apps.length) {
  const hasEnvCreds = !!(
    process.env.FIREBASE_PROJECT_ID &&
    process.env.FIREBASE_CLIENT_EMAIL &&
    process.env.FIREBASE_PRIVATE_KEY
  );

  try {
    if (hasEnvCreds) {
      // Use environment variables first
      const envCert = {
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        // Support escaped newlines in env var
        privateKey: (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n')
      };

      admin.initializeApp({
        credential: admin.credential.cert(envCert)
      });
      console.log('Firebase initialized from environment variables');
    } else {
      // Fallback to serviceAccountKey.json
      const serviceAccountPath = path.join(__dirname, '../../serviceAccountKey.json');
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccountPath)
      });
      console.log('Firebase initialized from serviceAccountKey.json');
    }
  } catch (err) {
    // Defer initialization failure until first use to avoid hard crash at boot
    // Consumers will see a meaningful error when attempting to send notifications
    console.error('Firebase Admin initialization error:', err && err.message ? err.message : err);
  }
}

class NotificationService {
 
  static async sendNotification(userId, title, body, data = {}) {
    try {
      const { query } = require('../config/db');
      const userRows = await query('SELECT fcm_token FROM users WHERE user_id = ? LIMIT 1', [userId]);
      
      if (!userRows.length) {
        throw new Error('User not found');
      }

      const fcmToken = userRows[0].fcm_token;
      if (!fcmToken) {
        throw new Error('User FCM token not found');
      }

      const message = {
        token: fcmToken,
        notification: {
          title: title,
          body: body,
        },
        data: {
          ...data,
          timestamp: new Date().toISOString(),
        },
        android: {
          notification: {
            sound: 'default',
          },
        },
        apns: {
          payload: {
            aps: {
              sound: 'default',
              badge: 1,
            },
          },
        },
      };

      const response = await admin.messaging().send(message);
      
      console.log('Notification sent successfully:', {
        userId,
        messageId: response,
        title,
        body
      });

      return {
        success: true,
        messageId: response,
        message: 'Notification sent successfully'
      };

    } catch (error) {
      console.error('Error sending notification:', error);
      throw new Error(`Failed to send notification: ${error.message}`);
    }
  }

  
  static async sendBulkNotification(userIds, title, body, data = {}) {
    try {
      if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
        throw new Error('userIds array is required');
      }

      // Get FCM tokens for all users
      const { query } = require('../config/db');
      const placeholders = userIds.map(() => '?').join(',');
      const userRows = await query(
        `SELECT fcm_token FROM users WHERE user_id IN (${placeholders}) AND fcm_token IS NOT NULL`,
        userIds
      );

      if (userRows.length === 0) {
        throw new Error('No valid FCM tokens found');
      }

      const tokens = userRows.map(row => row.fcm_token);

      const baseMessage = {
        notification: {
          title: title,
          body: body,
        },
        data: {
          ...data,
          timestamp: new Date().toISOString(),
        },
        android: {
          notification: {
            sound: 'default',
          },
        },
        apns: {
          payload: {
            aps: {
              sound: 'default',
              badge: 1,
            },
          },
        },
      };

      // Send individual notifications
      let successCount = 0;
      let failureCount = 0;
      
      for (const token of tokens) {
        try {
          const individualMessage = {
            ...baseMessage,
            token: token
          };
          await admin.messaging().send(individualMessage);
          successCount++;
        } catch (error) {
          console.error('Error sending to token:', token, error);
          failureCount++;
        }
      }
      
      console.log('Bulk notification sent:', {
        totalTokens: tokens.length,
        successCount: successCount,
        failureCount: failureCount,
        title,
        body
      });

      return {
        success: true,
        totalTokens: tokens.length,
        successCount: successCount,
        failureCount: failureCount,
        message: 'Bulk notification sent successfully'
      };

    } catch (error) {
      console.error('Error sending bulk notification:', error);
      throw new Error(`Failed to send bulk notification: ${error.message}`);
    }
  }

 
  static async sendTopicNotification(topic, title, body, data = {}) {
    try {
      const message = {
        topic: topic,
        notification: {
          title: title,
          body: body,
        },
        data: {
          ...data,
          timestamp: new Date().toISOString(),
        },
        android: {
          notification: {
            sound: 'default',
          },
        },
        apns: {
          payload: {
            aps: {
              sound: 'default',
              badge: 1,
            },
          },
        },
      };

      const response = await admin.messaging().send(message);
      
      console.log('Topic notification sent:', {
        topic,
        messageId: response,
        title,
        body
      });

      return {
        success: true,
        messageId: response,
        message: 'Topic notification sent successfully'
      };

    } catch (error) {
      console.error('Error sending topic notification:', error);
      throw new Error(`Failed to send topic notification: ${error.message}`);
    }
  }

 
  static async subscribeToTopic(userId, topic) {
    try {
      // Get user's FCM token
      const { query } = require('../config/db');
      const userRows = await query('SELECT fcm_token FROM users WHERE user_id = ? LIMIT 1', [userId]);
      
      if (!userRows.length) {
        throw new Error('User not found');
      }

      const fcmToken = userRows[0].fcm_token;
      if (!fcmToken) {
        throw new Error('User FCM token not found');
      }

      // Subscribe to topic
      const response = await admin.messaging().subscribeToTopic(fcmToken, topic);
      
      console.log('User subscribed to topic:', {
        userId,
        topic,
        successCount: response.successCount,
        failureCount: response.failureCount
      });

      return {
        success: true,
        successCount: response.successCount,
        failureCount: response.failureCount,
        message: 'Successfully subscribed to topic'
      };

    } catch (error) {
      console.error('Error subscribing to topic:', error);
      throw new Error(`Failed to subscribe to topic: ${error.message}`);
    }
  }

  
  static async unsubscribeFromTopic(userId, topic) {
    try {
      // Get user's FCM token
      const { query } = require('../config/db');
      const userRows = await query('SELECT fcm_token FROM users WHERE user_id = ? LIMIT 1', [userId]);
      
      if (!userRows.length) {
        throw new Error('User not found');
      }

      const fcmToken = userRows[0].fcm_token;
      if (!fcmToken) {
        throw new Error('User FCM token not found');
      }

      // Unsubscribe from topic
      const response = await admin.messaging().unsubscribeFromTopic(fcmToken, topic);
      
      console.log('User unsubscribed from topic:', {
        userId,
        topic,
        successCount: response.successCount,
        failureCount: response.failureCount
      });

      return {
        success: true,
        successCount: response.successCount,
        failureCount: response.failureCount,
        message: 'Successfully unsubscribed from topic'
      };

    } catch (error) {
      console.error('Error unsubscribing from topic:', error);
      throw new Error(`Failed to unsubscribe from topic: ${error.message}`);
    }
  }

  static async sendJobNotification(jobData) {
    try {
      const { query } = require('../config/db');
      
      // Get users interested in job notifications
      const userRows = await query(
        'SELECT user_id, fcm_token FROM users WHERE fcm_token IS NOT NULL'
      );

      if (userRows.length === 0) {
        console.log('No users subscribed to job notifications');
        return { success: true, message: 'No users to notify' };
      }

      const tokens = userRows.map(row => row.fcm_token);

      const baseMessage = {
        notification: {
          title: 'New Job Available!',
          body: `${jobData.title} - ${jobData.location || 'Location not specified'}`,
        },
        data: {
          type: 'job',
          jobId: jobData.job_id?.toString() || '',
          timestamp: new Date().toISOString(),
        },
        android: {
          notification: {
            sound: 'default',
          },
        },
        apns: {
          payload: {
            aps: {
              sound: 'default',
              badge: 1,
            },
          },
        },
      };

      // Send individual notifications
      let successCount = 0;
      let failureCount = 0;
      
      for (const token of tokens) {
        try {
          const individualMessage = {
            ...baseMessage,
            token: token
          };
          await admin.messaging().send(individualMessage);
          successCount++;
        } catch (error) {
          console.error('Error sending to token:', token, error);
          failureCount++;
        }
      }
      
      const response = {
        successCount: successCount,
        failureCount: failureCount
      };
      
      console.log('Job notification sent:', {
        jobId: jobData.job_id,
        totalTokens: tokens.length,
        successCount: response.successCount,
        failureCount: response.failureCount
      });

      return {
        success: true,
        totalTokens: tokens.length,
        successCount: response.successCount,
        failureCount: response.failureCount,
        message: 'Job notification sent successfully'
      };

    } catch (error) {
      console.error('Error sending job notification:', error);
      throw new Error(`Failed to send job notification: ${error.message}`);
    }
  }

 
  static async sendEventNotification(eventData) {
    try {
      const { query } = require('../config/db');
      
      const userRows = await query(
        'SELECT user_id, fcm_token FROM users WHERE fcm_token IS NOT NULL'
      );

      if (userRows.length === 0) {
        console.log('No users subscribed to event notifications');
        return { success: true, message: 'No users to notify' };
      }

      const tokens = userRows.map(row => row.fcm_token);

      const baseMessage = {
        notification: {
          title: 'New Event Available!',
          body: `${eventData.title} - ${eventData.location || 'Location not specified'}`,
        },
        data: {
          type: 'event',
          eventId: eventData.event_id?.toString() || '',
          timestamp: new Date().toISOString(),
        },
        android: {
          notification: {
            sound: 'default',
          },
        },
        apns: {
          payload: {
            aps: {
              sound: 'default',
              badge: 1,
            },
          },
        },
      };

      let successCount = 0;
      let failureCount = 0;
      
      for (const token of tokens) {
        try {
          const individualMessage = {
            ...baseMessage,
            token: token
          };
          await admin.messaging().send(individualMessage);
          successCount++;
        } catch (error) {
          console.error('Error sending to token:', token, error);
          failureCount++;
        }
      }
      
      const response = {
        successCount: successCount,
        failureCount: failureCount
      };
      
      console.log('Event notification sent:', {
        eventId: eventData.event_id,
        totalTokens: tokens.length,
        successCount: response.successCount,
        failureCount: response.failureCount
      });

      return {
        success: true,
        totalTokens: tokens.length,
        successCount: response.successCount,
        failureCount: response.failureCount,
        message: 'Event notification sent successfully'
      };

    } catch (error) {
      console.error('Error sending event notification:', error);
      throw new Error(`Failed to send event notification: ${error.message}`);
    }
  }
}

module.exports = NotificationService;
