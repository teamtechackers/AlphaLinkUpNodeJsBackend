const { google } = require('googleapis');
const { logger } = require('../utils/logger');

class GoogleCalendarService {
  constructor() {
    this.calendar = null;
    this.initialized = false;
    this.initializeCalendar();
  }

  initializeCalendar() {
    try {
      // Check if Firebase credentials are available (we'll use same service account)
      const hasCredentials = !!(
        process.env.FIREBASE_PROJECT_ID &&
        process.env.FIREBASE_CLIENT_EMAIL &&
        (process.env.FIREBASE_PRIVATE_KEY || process.env.FIREBASE_PRIVATE_KEY_BASE64)
      );

      if (!hasCredentials) {
        logger.warn('Google Calendar: Service account credentials not found. Google Meet link generation disabled.');
        return;
      }

      // Prepare private key
      let privateKey = process.env.FIREBASE_PRIVATE_KEY || '';
      
      if (process.env.FIREBASE_PRIVATE_KEY_BASE64) {
        privateKey = Buffer.from(process.env.FIREBASE_PRIVATE_KEY_BASE64, 'base64').toString('utf8');
      } else if (privateKey.includes('\\n')) {
        privateKey = privateKey.replace(/\\n/g, '\n');
      }

      // Create OAuth2 client with service account
      const auth = new google.auth.GoogleAuth({
        credentials: {
          client_email: process.env.FIREBASE_CLIENT_EMAIL,
          private_key: privateKey,
          project_id: process.env.FIREBASE_PROJECT_ID
        },
        scopes: [
          'https://www.googleapis.com/auth/calendar',
          'https://www.googleapis.com/auth/calendar.events'
        ]
      });

      this.calendar = google.calendar({ version: 'v3', auth });
      this.initialized = true;
      logger.info('✅ Google Calendar service initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize Google Calendar service:', error.message);
      this.initialized = false;
    }
  }

  /**
   * Create a Google Calendar event with Google Meet link
   * @param {Object} eventData - Event data
   * @param {string} eventData.summary - Meeting title
   * @param {string} eventData.description - Meeting description
   * @param {string} eventData.startDateTime - Start date-time (YYYY-MM-DD HH:MM:SS)
   * @param {number} eventData.durationMinutes - Meeting duration in minutes (default: 60)
   * @param {string} eventData.attendeeEmail - Attendee email address
   * @param {string} eventData.attendeeName - Attendee name
   * @param {string} eventData.timezone - Timezone (default: Asia/Karachi)
   * @returns {Promise<Object>} - Calendar event with Google Meet link
   */
  async createMeetingWithGoogleMeet(eventData) {
    try {
      if (!this.initialized) {
        throw new Error('Google Calendar service not initialized. Check credentials.');
      }

      const {
        summary,
        description = '',
        startDateTime, // Format: "YYYY-MM-DD HH:MM:SS"
        durationMinutes = 60,
        attendeeEmail,
        attendeeName = '',
        timezone = 'Asia/Karachi'
      } = eventData;

      // Validate required fields
      if (!summary || !startDateTime) {
        throw new Error('summary and startDateTime are required');
      }

      // Convert "YYYY-MM-DD HH:MM:SS" to ISO 8601
      const startDateTimeISO = startDateTime.replace(' ', 'T') + ':00';
      
      // Calculate end time
      const startDate = new Date(startDateTimeISO);
      const endDate = new Date(startDate.getTime() + (durationMinutes * 60 * 1000));
      const endDateTimeISO = endDate.toISOString().slice(0, 19);

      // Prepare attendees
      const attendees = [];
      if (attendeeEmail) {
        attendees.push({
          email: attendeeEmail,
          displayName: attendeeName || attendeeEmail,
          responseStatus: 'needsAction'
        });
      }

      // Create calendar event with Google Meet
      const event = {
        summary: summary,
        description: description,
        start: {
          dateTime: startDateTimeISO,
          timeZone: timezone
        },
        end: {
          dateTime: endDateTimeISO,
          timeZone: timezone
        },
        attendees: attendees,
        conferenceData: {
          createRequest: {
            requestId: `meet-${Date.now()}`,
            conferenceSolutionKey: {
              type: 'hangoutsMeet'
            }
          }
        },
        reminders: {
          useDefault: false,
          overrides: [
            { method: 'email', minutes: 24 * 60 }, // 1 day before
            { method: 'popup', minutes: 30 }        // 30 minutes before
          ]
        }
      };

      // Insert event to calendar
      const response = await this.calendar.events.insert({
        calendarId: 'primary',
        conferenceDataVersion: 1,
        sendUpdates: 'all', // Send email invites to attendees
        resource: event
      });

      const createdEvent = response.data;
      const meetLink = createdEvent.hangoutLink || createdEvent.conferenceData?.entryPoints?.[0]?.uri || null;

      logger.info(`Google Meet created: ${meetLink} for meeting: ${summary}`);

      return {
        success: true,
        eventId: createdEvent.id,
        meetLink: meetLink,
        htmlLink: createdEvent.htmlLink,
        startTime: createdEvent.start.dateTime,
        endTime: createdEvent.end.dateTime,
        attendees: createdEvent.attendees || []
      };

    } catch (error) {
      logger.error('Error creating Google Meet:', error.message);
      
      // Return a fallback - we'll still save the meeting without Google Meet link
      return {
        success: false,
        error: error.message,
        meetLink: null
      };
    }
  }

  /**
   * Update or cancel a Google Calendar event
   * @param {string} eventId - Google Calendar event ID
   * @param {Object} updates - Fields to update
   * @returns {Promise<Object>}
   */
  async updateMeeting(eventId, updates) {
    try {
      if (!this.initialized) {
        throw new Error('Google Calendar service not initialized');
      }

      const response = await this.calendar.events.update({
        calendarId: 'primary',
        eventId: eventId,
        sendUpdates: 'all',
        resource: updates
      });

      logger.info(`Google Meet updated: ${eventId}`);
      return {
        success: true,
        event: response.data
      };
    } catch (error) {
      logger.error('Error updating Google Meet:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Cancel a Google Calendar event
   * @param {string} eventId - Google Calendar event ID
   * @returns {Promise<Object>}
   */
  async cancelMeeting(eventId) {
    try {
      if (!this.initialized) {
        throw new Error('Google Calendar service not initialized');
      }

      await this.calendar.events.delete({
        calendarId: 'primary',
        eventId: eventId,
        sendUpdates: 'all' // Notify attendees
      });

      logger.info(`Google Meet cancelled: ${eventId}`);
      return {
        success: true,
        message: 'Meeting cancelled successfully'
      };
    } catch (error) {
      logger.error('Error cancelling Google Meet:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Check if service is initialized and ready
   * @returns {boolean}
   */
  isReady() {
    return this.initialized;
  }
}

// Export singleton instance
module.exports = new GoogleCalendarService();

