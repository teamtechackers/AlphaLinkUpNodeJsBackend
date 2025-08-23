'use strict';

const EventService = require('../services/EventService');
const NotificationService = require('../services/NotificationService');
const { logger } = require('../utils/logger');
const { successResponse, errorResponse } = require('../utils/response');

class EventController {
  // Create a new event
  static async createEvent(req, res) {
    try {
      const userId = req.user.id;
      const eventData = req.body;
      
      // Validate required fields
      if (!eventData.title || !eventData.description || !eventData.start_date) {
        return errorResponse(res, 'Title, description, and start date are required', 400);
      }

      // Create event
      const event = await EventService.createEvent(userId, eventData);
      
      // Send notification to relevant users
      try {
        await NotificationService.sendEventNotification(event.id, 'event_created', {
          title: event.title,
          organizer: event.organizer_name,
          startDate: event.start_date,
          location: event.location
        });
      } catch (notificationError) {
        logger.warn('Failed to send event creation notification:', notificationError);
      }

      logger.info(`New event created: ${event.title} by user ${userId}`);
      return successResponse(res, 'Event created successfully', { event }, 201);
    } catch (error) {
      logger.error('Create event error:', error);
      
      if (error.message.includes('Validation failed')) {
        return errorResponse(res, error.message, 400);
      }
      
      if (error.message.includes('User not authorized')) {
        return errorResponse(res, 'You are not authorized to create events', 403);
      }
      
      return errorResponse(res, 'Failed to create event', 500);
    }
  }

  // Get all events with filtering and pagination
  static async getEvents(req, res) {
    try {
      const {
        page = 1,
        limit = 20,
        status = 'upcoming',
        category,
        location,
        mode,
        start_date,
        end_date,
        organizer,
        search,
        sort_by = 'start_date',
        sort_order = 'asc'
      } = req.query;

      const filters = {
        status,
        category,
        location,
        mode,
        start_date: start_date ? new Date(start_date) : null,
        end_date: end_date ? new Date(end_date) : null,
        organizer,
        search
      };

      const events = await EventService.getEvents(filters, {
        page: parseInt(page),
        limit: parseInt(limit),
        sortBy: sort_by,
        sortOrder: sort_order
      });

      return successResponse(res, 'Events retrieved successfully', { events });
    } catch (error) {
      logger.error('Get events error:', error);
      return errorResponse(res, 'Failed to retrieve events', 500);
    }
  }

  // Get a specific event by ID
  static async getEvent(req, res) {
    try {
      const { eventId } = req.params;
      const userId = req.user?.id; // Optional for public access

      const event = await EventService.getEventById(eventId, userId);
      
      if (!event) {
        return errorResponse(res, 'Event not found', 404);
      }

      // Increment view count if user is authenticated
      if (userId) {
        try {
          await EventService.incrementEventViews(eventId, userId);
        } catch (viewError) {
          logger.warn('Failed to increment event views:', viewError);
        }
      }

      return successResponse(res, 'Event retrieved successfully', { event });
    } catch (error) {
      logger.error('Get event error:', error);
      
      if (error.message.includes('Event not found')) {
        return errorResponse(res, 'Event not found', 404);
      }
      
      return errorResponse(res, 'Failed to retrieve event', 500);
    }
  }

  // Update an event
  static async updateEvent(req, res) {
    try {
      const userId = req.user.id;
      const { eventId } = req.params;
      const updateData = req.body;

      if (Object.keys(updateData).length === 0) {
        return errorResponse(res, 'No update data provided', 400);
      }

      const updatedEvent = await EventService.updateEvent(eventId, userId, updateData);
      
      // Notify attendees about event updates
      try {
        await NotificationService.sendEventNotification(eventId, 'event_updated', {
          title: updatedEvent.title,
          organizer: updatedEvent.organizer_name,
          changes: Object.keys(updateData)
        });
      } catch (notificationError) {
        logger.warn('Failed to send event update notification:', notificationError);
      }
      
      logger.info(`Event ${eventId} updated by user ${userId}`);
      return successResponse(res, 'Event updated successfully', { event: updatedEvent });
    } catch (error) {
      logger.error('Update event error:', error);
      
      if (error.message.includes('Event not found')) {
        return errorResponse(res, 'Event not found', 404);
      }
      
      if (error.message.includes('not authorized')) {
        return errorResponse(res, 'You are not authorized to update this event', 403);
      }
      
      if (error.message.includes('Validation failed')) {
        return errorResponse(res, error.message, 400);
      }
      
      return errorResponse(res, 'Failed to update event', 500);
    }
  }

  // Delete an event
  static async deleteEvent(req, res) {
    try {
      const userId = req.user.id;
      const { eventId } = req.params;

      await EventService.deleteEvent(eventId, userId);
      
      // Notify attendees about event cancellation
      try {
        await NotificationService.sendEventNotification(eventId, 'event_cancelled', {
          title: 'Event Cancelled',
          message: 'This event has been cancelled by the organizer.'
        });
      } catch (notificationError) {
        logger.warn('Failed to send event cancellation notification:', notificationError);
      }
      
      logger.info(`Event ${eventId} deleted by user ${userId}`);
      return successResponse(res, 'Event deleted successfully');
    } catch (error) {
      logger.error('Delete event error:', error);
      
      if (error.message.includes('Event not found')) {
        return errorResponse(res, 'Event not found', 404);
      }
      
      if (error.message.includes('not authorized')) {
        return errorResponse(res, 'You are not authorized to delete this event', 403);
      }
      
      return errorResponse(res, 'Failed to delete event', 500);
    }
  }

  // Cancel an event
  static async cancelEvent(req, res) {
    try {
      const userId = req.user.id;
      const { eventId } = req.params;
      const { reason } = req.body;

      const cancelledEvent = await EventService.cancelEvent(eventId, userId, reason);
      
      // Notify attendees about event cancellation
      try {
        await NotificationService.sendEventNotification(eventId, 'event_cancelled', {
          title: cancelledEvent.title,
          organizer: cancelledEvent.organizer_name,
          reason: reason || 'Event cancelled by organizer'
        });
      } catch (notificationError) {
        logger.warn('Failed to send event cancellation notification:', notificationError);
      }
      
      logger.info(`Event ${eventId} cancelled by user ${userId}`);
      return successResponse(res, 'Event cancelled successfully', { event: cancelledEvent });
    } catch (error) {
      logger.error('Cancel event error:', error);
      
      if (error.message.includes('Event not found')) {
        return errorResponse(res, 'Event not found', 404);
      }
      
      if (error.message.includes('not authorized')) {
        return errorResponse(res, 'You are not authorized to cancel this event', 403);
      }
      
      if (error.message.includes('already cancelled')) {
        return errorResponse(res, 'Event is already cancelled', 400);
      }
      
      return errorResponse(res, 'Failed to cancel event', 500);
    }
  }

  // Reschedule an event
  static async rescheduleEvent(req, res) {
    try {
      const userId = req.user.id;
      const { eventId } = req.params;
      const { newStartDate, newEndDate, reason } = req.body;

      if (!newStartDate) {
        return errorResponse(res, 'New start date is required', 400);
      }

      const rescheduledEvent = await EventService.rescheduleEvent(eventId, userId, {
        newStartDate: new Date(newStartDate),
        newEndDate: newEndDate ? new Date(newEndDate) : null,
        reason
      });
      
      // Notify attendees about event rescheduling
      try {
        await NotificationService.sendEventNotification(eventId, 'event_rescheduled', {
          title: rescheduledEvent.title,
          organizer: rescheduledEvent.organizer_name,
          oldStartDate: rescheduledEvent.previous_start_date,
          newStartDate: rescheduledEvent.start_date,
          reason: reason || 'Event rescheduled by organizer'
        });
      } catch (notificationError) {
        logger.warn('Failed to send event rescheduling notification:', notificationError);
      }
      
      logger.info(`Event ${eventId} rescheduled by user ${userId}`);
      return successResponse(res, 'Event rescheduled successfully', { event: rescheduledEvent });
    } catch (error) {
      logger.error('Reschedule event error:', error);
      
      if (error.message.includes('Event not found')) {
        return errorResponse(res, 'Event not found', 404);
      }
      
      if (error.message.includes('not authorized')) {
        return errorResponse(res, 'You are not authorized to reschedule this event', 403);
      }
      
      if (error.message.includes('Invalid date')) {
        return errorResponse(res, 'Invalid date provided', 400);
      }
      
      return errorResponse(res, 'Failed to reschedule event', 500);
    }
  }

  // Register for an event
  static async registerForEvent(req, res) {
    try {
      const userId = req.user.id;
      const { eventId } = req.params;
      const registrationData = req.body;

      const registration = await EventService.registerForEvent(eventId, userId, registrationData);
      
      // Send registration confirmation to attendee
      try {
        await NotificationService.createNotification({
          user_id: userId,
          type: 'event_registration_confirmed',
          title: 'Event Registration Confirmed',
          message: `Your registration for ${registration.event_title} has been confirmed.`,
          data: { eventId, registrationId: registration.id }
        });
      } catch (notificationError) {
        logger.warn('Failed to send registration confirmation:', notificationError);
      }

      // Send notification to event organizer
      try {
        await NotificationService.createNotification({
          user_id: registration.organizer_id,
          type: 'new_event_registration',
          title: 'New Event Registration',
          message: `New registration for ${registration.event_title}.`,
          data: { eventId, registrationId: registration.id, attendeeId: userId }
        });
      } catch (notificationError) {
        logger.warn('Failed to send registration notification to organizer:', notificationError);
      }
      
      logger.info(`Event registration submitted by user ${userId} for event ${eventId}`);
      return successResponse(res, 'Registration successful', { registration }, 201);
    } catch (error) {
      logger.error('Register for event error:', error);
      
      if (error.message.includes('Event not found')) {
        return errorResponse(res, 'Event not found', 404);
      }
      
      if (error.message.includes('Event is cancelled')) {
        return errorResponse(res, 'This event has been cancelled', 400);
      }
      
      if (error.message.includes('already registered')) {
        return errorResponse(res, 'You are already registered for this event', 400);
      }
      
      if (error.message.includes('Event is full')) {
        return errorResponse(res, 'This event is at full capacity', 400);
      }
      
      if (error.message.includes('Registration closed')) {
        return errorResponse(res, 'Registration for this event is closed', 400);
      }
      
      return errorResponse(res, 'Failed to register for event', 500);
    }
  }

  // Cancel event registration
  static async cancelRegistration(req, res) {
    try {
      const userId = req.user.id;
      const { eventId } = req.params;

      const cancelledRegistration = await EventService.cancelRegistration(eventId, userId);
      
      // Send cancellation confirmation to attendee
      try {
        await NotificationService.createNotification({
          user_id: userId,
          type: 'event_registration_cancelled',
          title: 'Event Registration Cancelled',
          message: `Your registration for ${cancelledRegistration.event_title} has been cancelled.`,
          data: { eventId, registrationId: cancelledRegistration.id }
        });
      } catch (notificationError) {
        logger.warn('Failed to send cancellation confirmation:', notificationError);
      }

      // Notify organizer about registration cancellation
      try {
        await NotificationService.createNotification({
          user_id: cancelledRegistration.organizer_id,
          type: 'event_registration_cancelled',
          title: 'Event Registration Cancelled',
          message: `A registration for ${cancelledRegistration.event_title} has been cancelled.`,
          data: { eventId, registrationId: cancelledRegistration.id, attendeeId: userId }
        });
      } catch (notificationError) {
        logger.warn('Failed to send cancellation notification to organizer:', notificationError);
      }
      
      logger.info(`Event registration cancelled by user ${userId} for event ${eventId}`);
      return successResponse(res, 'Registration cancelled successfully', { registration: cancelledRegistration });
    } catch (error) {
      logger.error('Cancel registration error:', error);
      
      if (error.message.includes('Event not found')) {
        return errorResponse(res, 'Event not found', 404);
      }
      
      if (error.message.includes('not registered')) {
        return errorResponse(res, 'You are not registered for this event', 400);
      }
      
      if (error.message.includes('cannot be cancelled')) {
        return errorResponse(res, 'This registration cannot be cancelled', 400);
      }
      
      return errorResponse(res, 'Failed to cancel registration', 500);
    }
  }

  // Get event registrations
  static async getEventRegistrations(req, res) {
    try {
      const userId = req.user.id;
      const { eventId } = req.params;
      const { page = 1, limit = 20, status, sort_by = 'registered_at', sort_order = 'desc' } = req.query;

      const registrations = await EventService.getEventRegistrations(eventId, userId, {
        page: parseInt(page),
        limit: parseInt(limit),
        status,
        sortBy: sort_by,
        sortOrder: sort_order
      });

      return successResponse(res, 'Registrations retrieved successfully', { registrations });
    } catch (error) {
      logger.error('Get event registrations error:', error);
      
      if (error.message.includes('Event not found')) {
        return errorResponse(res, 'Event not found', 404);
      }
      
      if (error.message.includes('not authorized')) {
        return errorResponse(res, 'You are not authorized to view registrations for this event', 403);
      }
      
      return errorResponse(res, 'Failed to retrieve registrations', 500);
    }
  }

  // Get user's event registrations
  static async getUserRegistrations(req, res) {
    try {
      const userId = req.user.id;
      const { page = 1, limit = 20, status, sort_by = 'registered_at', sort_order = 'desc' } = req.query;

      const registrations = await EventService.getUserRegistrations(userId, {
        page: parseInt(page),
        limit: parseInt(limit),
        status,
        sortBy: sort_by,
        sortOrder: sort_order
      });

      return successResponse(res, 'Registrations retrieved successfully', { registrations });
    } catch (error) {
      logger.error('Get user registrations error:', error);
      return errorResponse(res, 'Failed to retrieve registrations', 500);
    }
  }

  // Update registration status
  static async updateRegistrationStatus(req, res) {
    try {
      const userId = req.user.id;
      const { registrationId } = req.params;
      const { status, notes } = req.body;

      if (!status) {
        return errorResponse(res, 'Status is required', 400);
      }

      const updatedRegistration = await EventService.updateRegistrationStatus(registrationId, userId, {
        status,
        notes
      });

      // Send notification to attendee about status change
      try {
        await NotificationService.createNotification({
          user_id: updatedRegistration.attendee_id,
          type: 'registration_status_updated',
          title: 'Registration Status Updated',
          message: `Your registration for ${updatedRegistration.event_title} has been ${status}.`,
          data: { 
            eventId: updatedRegistration.event_id, 
            registrationId, 
            status,
            notes
          }
        });
      } catch (notificationError) {
        logger.warn('Failed to send status update notification:', notificationError);
      }
      
      logger.info(`Registration ${registrationId} status updated to ${status} by user ${userId}`);
      return successResponse(res, 'Registration status updated successfully', { registration: updatedRegistration });
    } catch (error) {
      logger.error('Update registration status error:', error);
      
      if (error.message.includes('Registration not found')) {
        return errorResponse(res, 'Registration not found', 404);
      }
      
      if (error.message.includes('not authorized')) {
        return errorResponse(res, 'You are not authorized to update this registration', 403);
      }
      
      if (error.message.includes('Invalid status')) {
        return errorResponse(res, 'Invalid registration status', 400);
      }
      
      return errorResponse(res, 'Failed to update registration status', 500);
    }
  }

  // Search events
  static async searchEvents(req, res) {
    try {
      const { q, page = 1, limit = 20, filters } = req.query;
      
      if (!q || q.trim().length === 0) {
        return errorResponse(res, 'Search query is required', 400);
      }

      const results = await EventService.searchEvents(q, {
        page: parseInt(page),
        limit: parseInt(limit),
        filters: filters ? JSON.parse(filters) : {}
      });

      return successResponse(res, 'Search completed successfully', { results });
    } catch (error) {
      logger.error('Search events error:', error);
      return errorResponse(res, 'Search failed', 500);
    }
  }

  // Get event recommendations for user
  static async getEventRecommendations(req, res) {
    try {
      const userId = req.user.id;
      const { page = 1, limit = 20, category, location, mode } = req.query;

      const recommendations = await EventService.getEventRecommendations(userId, {
        page: parseInt(page),
        limit: parseInt(limit),
        category,
        location,
        mode
      });

      return successResponse(res, 'Event recommendations retrieved successfully', { recommendations });
    } catch (error) {
      logger.error('Get event recommendations error:', error);
      return errorResponse(res, 'Failed to retrieve event recommendations', 500);
    }
  }

  // Get event statistics
  static async getEventStats(req, res) {
    try {
      const userId = req.user.id;
      const { startDate, endDate, groupBy } = req.query;

      const stats = await EventService.getEventStatistics(userId, {
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        groupBy: groupBy || 'month'
      });

      return successResponse(res, 'Event statistics retrieved successfully', { stats });
    } catch (error) {
      logger.error('Get event stats error:', error);
      return errorResponse(res, 'Failed to retrieve event statistics', 500);
    }
  }

  // Get popular event categories
  static async getPopularEventCategories(req, res) {
    try {
      const categories = await EventService.getPopularEventCategories();
      return successResponse(res, 'Popular event categories retrieved successfully', { categories });
    } catch (error) {
      logger.error('Get popular event categories error:', error);
      return errorResponse(res, 'Failed to retrieve popular event categories', 500);
    }
  }

  // Get trending event locations
  static async getTrendingEventLocations(req, res) {
    try {
      const locations = await EventService.getTrendingEventLocations();
      return successResponse(res, 'Trending event locations retrieved successfully', { locations });
    } catch (error) {
      logger.error('Get trending event locations error:', error);
      return errorResponse(res, 'Failed to retrieve trending event locations', 500);
    }
  }

  // Save event for later
  static async saveEvent(req, res) {
    try {
      const userId = req.user.id;
      const { eventId } = req.params;

      const savedEvent = await EventService.saveEvent(eventId, userId);
      
      logger.info(`Event ${eventId} saved by user ${userId}`);
      return successResponse(res, 'Event saved successfully', { savedEvent });
    } catch (error) {
      logger.error('Save event error:', error);
      
      if (error.message.includes('Event not found')) {
        return errorResponse(res, 'Event not found', 404);
      }
      
      if (error.message.includes('already saved')) {
        return errorResponse(res, 'Event is already saved', 400);
      }
      
      return errorResponse(res, 'Failed to save event', 500);
    }
  }

  // Remove saved event
  static async removeSavedEvent(req, res) {
    try {
      const userId = req.user.id;
      const { eventId } = req.params;

      await EventService.removeSavedEvent(eventId, userId);
      
      logger.info(`Event ${eventId} removed from saved events by user ${userId}`);
      return successResponse(res, 'Event removed from saved events successfully');
    } catch (error) {
      logger.error('Remove saved event error:', error);
      
      if (error.message.includes('Event not found')) {
        return errorResponse(res, 'Event not found', 404);
      }
      
      if (error.message.includes('not saved')) {
        return errorResponse(res, 'Event is not in your saved events', 400);
      }
      
      return errorResponse(res, 'Failed to remove saved event', 500);
    }
  }

  // Get user's saved events
  static async getSavedEvents(req, res) {
    try {
      const userId = req.user.id;
      const { page = 1, limit = 20, sort_by = 'saved_at', sort_order = 'desc' } = req.query;

      const savedEvents = await EventService.getSavedEvents(userId, {
        page: parseInt(page),
        limit: parseInt(limit),
        sortBy: sort_by,
        sortOrder: sort_order
      });

      return successResponse(res, 'Saved events retrieved successfully', { savedEvents });
    } catch (error) {
      logger.error('Get saved events error:', error);
      return errorResponse(res, 'Failed to retrieve saved events', 500);
    }
  }

  // Share event
  static async shareEvent(req, res) {
    try {
      const userId = req.user.id;
      const { eventId } = req.params;
      const { shareType, recipientEmail, message } = req.body;

      if (!shareType) {
        return errorResponse(res, 'Share type is required', 400);
      }

      const shareResult = await EventService.shareEvent(eventId, userId, {
        shareType,
        recipientEmail,
        message
      });

      logger.info(`Event ${eventId} shared by user ${userId} via ${shareType}`);
      return successResponse(res, 'Event shared successfully', { shareResult });
    } catch (error) {
      logger.error('Share event error:', error);
      
      if (error.message.includes('Event not found')) {
        return errorResponse(res, 'Event not found', 404);
      }
      
      if (error.message.includes('Invalid share type')) {
        return errorResponse(res, 'Invalid share type', 400);
      }
      
      return errorResponse(res, 'Failed to share event', 500);
    }
  }

  // Report event
  static async reportEvent(req, res) {
    try {
      const userId = req.user.id;
      const { eventId } = req.params;
      const { reason, description } = req.body;

      if (!reason) {
        return errorResponse(res, 'Report reason is required', 400);
      }

      const report = await EventService.reportEvent(eventId, userId, {
        reason,
        description
      });

      logger.info(`Event ${eventId} reported by user ${userId} for reason: ${reason}`);
      return successResponse(res, 'Event reported successfully', { report });
    } catch (error) {
      logger.error('Report event error:', error);
      
      if (error.message.includes('Event not found')) {
        return errorResponse(res, 'Event not found', 404);
      }
      
      if (error.message.includes('already reported')) {
        return errorResponse(res, 'You have already reported this event', 400);
      }
      
      return errorResponse(res, 'Failed to report event', 500);
    }
  }

  // Get event insights
  static async getEventInsights(req, res) {
    try {
      const userId = req.user.id;
      const { eventId } = req.params;

      const insights = await EventService.getEventInsights(eventId, userId);
      
      return successResponse(res, 'Event insights retrieved successfully', { insights });
    } catch (error) {
      logger.error('Get event insights error:', error);
      
      if (error.message.includes('Event not found')) {
        return errorResponse(res, 'Event not found', 404);
      }
      
      if (error.message.includes('not authorized')) {
        return errorResponse(res, 'You are not authorized to view insights for this event', 403);
      }
      
      return errorResponse(res, 'Failed to retrieve event insights', 500);
    }
  }

  // Export event data
  static async exportEventData(req, res) {
    try {
      const userId = req.user.id;
      const { eventId } = req.params;
      const { format = 'json' } = req.query;

      const data = await EventService.exportEventData(eventId, userId, format);

      if (format === 'json') {
        return successResponse(res, 'Event data exported successfully', { data });
      } else {
        // For CSV format, set appropriate headers
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="event_${eventId}.csv"`);
        return res.send(data);
      }
    } catch (error) {
      logger.error('Export event data error:', error);
      
      if (error.message.includes('Event not found')) {
        return errorResponse(res, 'Event not found', 404);
      }
      
      if (error.message.includes('not authorized')) {
        return errorResponse(res, 'You are not authorized to export this event data', 403);
      }
      
      return errorResponse(res, 'Failed to export event data', 500);
    }
  }

  // Send event reminders
  static async sendEventReminders(req, res) {
    try {
      const userId = req.user.id;
      const { eventId } = req.params;
      const { reminderType, customMessage } = req.body;

      if (!reminderType) {
        return errorResponse(res, 'Reminder type is required', 400);
      }

      const result = await EventService.sendEventReminders(eventId, userId, {
        reminderType,
        customMessage
      });
      
      logger.info(`Event reminders sent for event ${eventId} by user ${userId}`);
      return successResponse(res, 'Event reminders sent successfully', { result });
    } catch (error) {
      logger.error('Send event reminders error:', error);
      
      if (error.message.includes('Event not found')) {
        return errorResponse(res, 'Event not found', 404);
      }
      
      if (error.message.includes('not authorized')) {
        return errorResponse(res, 'You are not authorized to send reminders for this event', 403);
      }
      
      if (error.message.includes('Invalid reminder type')) {
        return errorResponse(res, 'Invalid reminder type', 400);
      }
      
      return errorResponse(res, 'Failed to send event reminders', 500);
    }
  }
}

module.exports = EventController;
