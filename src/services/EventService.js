'use strict';

const Event = require('../models/Event');
const User = require('../models/User');
const Notification = require('../models/Notification');
const { logger } = require('../utils/logger');
const { sendEmail } = require('./EmailService');

class EventService {
  // Create Event
  static async createEvent(eventData, organizerId) {
    try {
      // Validate event data
      const validationErrors = EventService.validateEventData(eventData);
      if (validationErrors.length > 0) {
        throw new Error(`Validation failed: ${validationErrors.join(', ')}`);
      }

      // Verify organizer exists and is active
      const organizer = await User.findById(organizerId);
      if (!organizer || organizer.status !== 1) {
        throw new Error('Invalid organizer account');
      }

      // Create event
      const event = await Event.create({
        ...eventData,
        organizer_id: organizerId,
        status: 'active'
      });

      // Send event creation notification to relevant users
      try {
        await EventService.notifyEventCreation(event);
      } catch (notificationError) {
        logger.warn('Failed to send event creation notification:', notificationError);
      }

      return event;
    } catch (error) {
      logger.error('Error creating event:', error);
      throw error;
    }
  }

  // Update Event
  static async updateEvent(eventId, updateData, organizerId) {
    try {
      // Verify event ownership
      const event = await Event.findById(eventId);
      if (!event) {
        throw new Error('Event not found');
      }

      if (event.organizer_id !== organizerId) {
        throw new Error('Unauthorized to update this event');
      }

      // Validate update data
      const validationErrors = EventService.validateEventUpdateData(updateData);
      if (validationErrors.length > 0) {
        throw new Error(`Validation failed: ${validationErrors.join(', ')}`);
      }

      // Update event
      const updatedEvent = await Event.update(eventId, updateData);

      // Notify attendees if significant changes were made
      if (updateData.title || updateData.date || updateData.location || updateData.description) {
        try {
          await EventService.notifyEventUpdate(eventId, updateData);
        } catch (notificationError) {
          logger.warn('Failed to send event update notification:', notificationError);
        }
      }

      return updatedEvent;
    } catch (error) {
      logger.error('Error updating event:', error);
      throw error;
    }
  }

  // Register for Event
  static async registerForEvent(eventId, userId, registrationData = {}) {
    try {
      // Check if event exists and is active
      const event = await Event.findById(eventId);
      if (!event || event.status !== 'active') {
        throw new Error('Event not available for registration');
      }

      // Check if event is full
      if (event.max_attendees) {
        const currentAttendees = await Event.getAttendeeCount(eventId);
        if (currentAttendees >= event.max_attendees) {
          throw new Error('Event is full');
        }
      }

      // Check if user has already registered
      const existingRegistration = await Event.getRegistration(eventId, userId);
      if (existingRegistration) {
        throw new Error('You have already registered for this event');
      }

      // Verify user exists and is active
      const user = await User.findById(userId);
      if (!user || user.status !== 1) {
        throw new Error('Invalid user account');
      }

      // Create registration
      const registration = await Event.createRegistration({
        event_id: eventId,
        user_id: userId,
        ...registrationData,
        status: 'confirmed'
      });

      // Send registration confirmation to user
      try {
        await sendEmail({
          to: user.email,
          subject: 'Event Registration Confirmed',
          template: 'event_registration_confirmed',
          data: { 
            name: user.name, 
            eventTitle: event.title,
            eventDate: event.date,
            eventLocation: event.location
          }
        });
      } catch (emailError) {
        logger.warn('Failed to send registration confirmation email:', emailError);
      }

      // Send registration notification to organizer
      try {
        await EventService.notifyOrganizerOfRegistration(event, registration, user);
      } catch (notificationError) {
        logger.warn('Failed to send organizer notification:', notificationError);
      }

      return registration;
    } catch (error) {
      logger.error('Error registering for event:', error);
      throw error;
    }
  }

  // Cancel Event Registration
  static async cancelRegistration(eventId, userId) {
    try {
      // Get registration
      const registration = await Event.getRegistration(eventId, userId);
      if (!registration) {
        throw new Error('Registration not found');
      }

      // Cancel registration
      await Event.updateRegistration(registration.id, {
        status: 'cancelled',
        cancelled_at: new Date()
      });

      // Send cancellation confirmation to user
      try {
        const user = await User.findById(userId);
        const event = await Event.findById(eventId);
        
        await sendEmail({
          to: user.email,
          subject: 'Event Registration Cancelled',
          template: 'event_registration_cancelled',
          data: { 
            name: user.name, 
            eventTitle: event.title,
            eventDate: event.date
          }
        });
      } catch (emailError) {
        logger.warn('Failed to send cancellation confirmation email:', emailError);
      }

      // Notify organizer of cancellation
      try {
        await EventService.notifyOrganizerOfCancellation(eventId, userId);
      } catch (notificationError) {
        logger.warn('Failed to send cancellation notification to organizer:', notificationError);
      }

      return { message: 'Registration cancelled successfully' };
    } catch (error) {
      logger.error('Error cancelling registration:', error);
      throw error;
    }
  }

  // Search Events
  static async searchEvents(searchParams, userId = null) {
    try {
      const {
        query,
        location,
        eventType,
        eventMode,
        startDate,
        endDate,
        price,
        page = 1,
        limit = 20,
        sortBy = 'date',
        sortOrder = 'asc'
      } = searchParams;

      // Build search criteria
      const searchCriteria = {
        query,
        location,
        eventType,
        eventMode,
        startDate,
        endDate,
        price,
        page,
        limit,
        sortBy,
        sortOrder
      };

      // Perform search
      const events = await Event.search(searchCriteria);

      // If user is authenticated, add registration status
      if (userId) {
        const eventsWithRegistrationStatus = await Promise.all(
          events.map(async (event) => {
            const registration = await Event.getRegistration(event.id, userId);
            return {
              ...event,
              isRegistered: !!registration,
              registrationStatus: registration ? registration.status : null
            };
          })
        );
        return eventsWithRegistrationStatus;
      }

      return events;
    } catch (error) {
      logger.error('Error searching events:', error);
      throw error;
    }
  }

  // Get Event Recommendations
  static async getEventRecommendations(userId, options = {}) {
    try {
      const { page = 1, limit = 20 } = options;

      // Get user profile
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Extract user preferences
      const userInterests = user.interests ? user.interests.split(',') : [];
      const userLocation = user.location;
      const userSkills = user.skills ? user.skills.split(',') : [];

      // Get recommended events based on user profile
      const recommendations = await Event.getRecommendations({
        interests: userInterests,
        location: userLocation,
        skills: userSkills,
        excludeRegistered: true,
        userId,
        page,
        limit
      });

      return recommendations;
    } catch (error) {
      logger.error('Error getting event recommendations:', error);
      throw error;
    }
  }

  // Get Event Statistics
  static async getEventStats(organizerId = null) {
    try {
      let stats;
      
      if (organizerId) {
        // Get organizer-specific stats
        stats = await Event.getOrganizerStats(organizerId);
      } else {
        // Get general event stats
        stats = await Event.getStats();
      }

      return stats;
    } catch (error) {
      logger.error('Error getting event statistics:', error);
      throw error;
    }
  }

  // Get Registration Statistics
  static async getRegistrationStats(eventId, organizerId) {
    try {
      // Verify event ownership
      const event = await Event.findById(eventId);
      if (!event || event.organizer_id !== organizerId) {
        throw new Error('Unauthorized to view this event');
      }

      const stats = await Event.getRegistrationStats(eventId);
      return stats;
    } catch (error) {
      logger.error('Error getting registration statistics:', error);
      throw error;
    }
  }

  // Cancel Event
  static async cancelEvent(eventId, organizerId, reason = null) {
    try {
      // Verify event ownership
      const event = await Event.findById(eventId);
      if (!event || event.organizer_id !== organizerId) {
        throw new Error('Unauthorized to cancel this event');
      }

      // Update event status
      const updatedEvent = await Event.update(eventId, {
        status: 'cancelled',
        cancelled_at: new Date(),
        cancellation_reason: reason
      });

      // Notify all registered attendees
      try {
        await EventService.notifyEventCancellation(eventId, reason);
      } catch (notificationError) {
        logger.warn('Failed to send event cancellation notification:', notificationError);
      }

      return updatedEvent;
    } catch (error) {
      logger.error('Error cancelling event:', error);
      throw error;
    }
  }

  // Reschedule Event
  static async rescheduleEvent(eventId, organizerId, newDate, newLocation = null) {
    try {
      // Verify event ownership
      const event = await Event.findById(eventId);
      if (!event || event.organizer_id !== organizerId) {
        throw new Error('Unauthorized to reschedule this event');
      }

      // Validate new date
      if (new Date(newDate) <= new Date()) {
        throw new Error('New event date must be in the future');
      }

      // Update event
      const updateData = { date: newDate };
      if (newLocation) {
        updateData.location = newLocation;
      }

      const updatedEvent = await Event.update(eventId, updateData);

      // Notify attendees of rescheduling
      try {
        await EventService.notifyEventRescheduling(eventId, newDate, newLocation);
      } catch (notificationError) {
        logger.warn('Failed to send rescheduling notification:', notificationError);
      }

      return updatedEvent;
    } catch (error) {
      logger.error('Error rescheduling event:', error);
      throw error;
    }
  }

  // Get Organizer Events
  static async getOrganizerEvents(organizerId, options = {}) {
    try {
      const { page = 1, limit = 20, status = null } = options;

      const events = await Event.getByOrganizer(organizerId, {
        page,
        limit,
        status
      });

      return events;
    } catch (error) {
      logger.error('Error getting organizer events:', error);
      throw error;
    }
  }

  // Get User Events
  static async getUserEvents(userId, options = {}) {
    try {
      const { page = 1, limit = 20, status = null } = options;

      const events = await Event.getUserEvents(userId, {
        page,
        limit,
        status
      });

      return events;
    } catch (error) {
      logger.error('Error getting user events:', error);
      throw error;
    }
  }

  // Get Event Attendees
  static async getEventAttendees(eventId, organizerId, options = {}) {
    try {
      // Verify event ownership
      const event = await Event.findById(eventId);
      if (!event || event.organizer_id !== organizerId) {
        throw new Error('Unauthorized to view attendees');
      }

      const { page = 1, limit = 20, status = null } = options;

      const attendees = await Event.getAttendees(eventId, {
        page,
        limit,
        status
      });

      return attendees;
    } catch (error) {
      logger.error('Error getting event attendees:', error);
      throw error;
    }
  }

  // Send Event Reminders
  static async sendEventReminders(eventId, organizerId) {
    try {
      // Verify event ownership
      const event = await Event.findById(eventId);
      if (!event || event.organizer_id !== organizerId) {
        throw new Error('Unauthorized to send reminders');
      }

      // Check if event is within 24 hours
      const eventDate = new Date(event.date);
      const now = new Date();
      const timeDiff = eventDate.getTime() - now.getTime();
      const hoursDiff = timeDiff / (1000 * 3600);

      if (hoursDiff > 24) {
        throw new Error('Event reminders can only be sent within 24 hours of the event');
      }

      // Get confirmed attendees
      const attendees = await Event.getAttendees(eventId, { status: 'confirmed' });

      // Send reminder notifications
      const notifications = attendees.map(attendee => ({
        user_id: attendee.user_id,
        type: 'event_reminder',
        title: 'Event Reminder',
        message: `Reminder: ${event.title} is starting soon`,
        data: { 
          eventId: event.id, 
          eventTitle: event.title,
          eventDate: event.date,
          eventLocation: event.location
        }
      }));

      await Notification.createBulk(notifications);

      // Send reminder emails
      for (const attendee of attendees) {
        try {
          const user = await User.findById(attendee.user_id);
          await sendEmail({
            to: user.email,
            subject: `Reminder: ${event.title}`,
            template: 'event_reminder',
            data: { 
              name: user.name, 
              eventTitle: event.title,
              eventDate: event.date,
              eventLocation: event.location
            }
          });
        } catch (emailError) {
          logger.warn(`Failed to send reminder email to ${attendee.user_id}:`, emailError);
        }
      }

      return { message: `Reminders sent to ${attendees.length} attendees` };
    } catch (error) {
      logger.error('Error sending event reminders:', error);
      throw error;
    }
  }

  // Notification Methods

  static async notifyEventCreation(event) {
    try {
      // Get relevant users based on event criteria
      const relevantUsers = await User.search({
        interests: event.tags ? event.tags.split(',') : [],
        location: event.location,
        limit: 100
      });

      // Create notifications
      const notifications = relevantUsers.map(user => ({
        user_id: user.id,
        type: 'new_event',
        title: 'New Event',
        message: `New ${event.event_type} event: ${event.title}`,
        data: { eventId: event.id, eventTitle: event.title, eventType: event.event_type }
      }));

      await Notification.createBulk(notifications);
    } catch (error) {
      logger.error('Error notifying event creation:', error);
      throw error;
    }
  }

  static async notifyEventUpdate(eventId, updateData) {
    try {
      // Get all registered attendees
      const attendees = await Event.getAttendees(eventId, { status: 'confirmed' });
      
      const notifications = attendees.map(attendee => ({
        user_id: attendee.user_id,
        type: 'event_updated',
        title: 'Event Updated',
        message: 'An event you registered for has been updated',
        data: { eventId, updates: updateData }
      }));

      await Notification.createBulk(notifications);
    } catch (error) {
      logger.error('Error notifying event update:', error);
      throw error;
    }
  }

  static async notifyOrganizerOfRegistration(event, registration, user) {
    try {
      await Notification.create({
        user_id: event.organizer_id,
        type: 'new_registration',
        title: 'New Event Registration',
        message: `${user.name} registered for ${event.title}`,
        data: { 
          eventId: event.id, 
          eventTitle: event.title, 
          userId: user.id,
          userName: user.name,
          registrationId: registration.id
        }
      });
    } catch (error) {
      logger.error('Error notifying organizer of registration:', error);
      throw error;
    }
  }

  static async notifyOrganizerOfCancellation(eventId, userId) {
    try {
      const event = await Event.findById(eventId);
      const user = await User.findById(userId);
      
      await Notification.create({
        user_id: event.organizer_id,
        type: 'registration_cancelled',
        title: 'Event Registration Cancelled',
        message: `${user.name} cancelled registration for ${event.title}`,
        data: { 
          eventId: event.id, 
          eventTitle: event.title, 
          userId: user.id,
          userName: user.name
        }
      });
    } catch (error) {
      logger.error('Error notifying organizer of cancellation:', error);
      throw error;
    }
  }

  static async notifyEventCancellation(eventId, reason) {
    try {
      // Get all registered attendees
      const attendees = await Event.getAttendees(eventId, { status: 'confirmed' });
      
      const notifications = attendees.map(attendee => ({
        user_id: attendee.user_id,
        type: 'event_cancelled',
        title: 'Event Cancelled',
        message: 'An event you registered for has been cancelled',
        data: { eventId, reason }
      }));

      await Notification.createBulk(notifications);

      // Send cancellation emails
      for (const attendee of attendees) {
        try {
          const user = await User.findById(attendee.user_id);
          const event = await Event.findById(eventId);
          
          await sendEmail({
            to: user.email,
            subject: `Event Cancelled: ${event.title}`,
            template: 'event_cancelled',
            data: { 
              name: user.name, 
              eventTitle: event.title,
              reason
            }
          });
        } catch (emailError) {
          logger.warn(`Failed to send cancellation email to ${attendee.user_id}:`, emailError);
        }
      }
    } catch (error) {
      logger.error('Error notifying event cancellation:', error);
      throw error;
    }
  }

  static async notifyEventRescheduling(eventId, newDate, newLocation) {
    try {
      // Get all registered attendees
      const attendees = await Event.getAttendees(eventId, { status: 'confirmed' });
      
      const notifications = attendees.map(attendee => ({
        user_id: attendee.user_id,
        type: 'event_rescheduled',
        title: 'Event Rescheduled',
        message: 'An event you registered for has been rescheduled',
        data: { eventId, newDate, newLocation }
      }));

      await Notification.createBulk(notifications);

      // Send rescheduling emails
      for (const attendee of attendees) {
        try {
          const user = await User.findById(attendee.user_id);
          const event = await Event.findById(eventId);
          
          await sendEmail({
            to: user.email,
            subject: `Event Rescheduled: ${event.title}`,
            template: 'event_rescheduled',
            data: { 
              name: user.name, 
              eventTitle: event.title,
              newDate,
              newLocation
            }
          });
        } catch (emailError) {
          logger.warn(`Failed to send rescheduling email to ${attendee.user_id}:`, emailError);
        }
      }
    } catch (error) {
      logger.error('Error notifying event rescheduling:', error);
      throw error;
    }
  }

  // Validation Methods

  static validateEventData(eventData) {
    const errors = [];

    if (!eventData.title || eventData.title.trim().length < 5) {
      errors.push('Event title must be at least 5 characters long');
    }

    if (!eventData.description || eventData.description.trim().length < 50) {
      errors.push('Event description must be at least 50 characters long');
    }

    if (!eventData.date) {
      errors.push('Event date is required');
    } else {
      const eventDate = new Date(eventData.date);
      if (eventDate <= new Date()) {
        errors.push('Event date must be in the future');
      }
    }

    if (!eventData.location || eventData.location.trim().length < 2) {
      errors.push('Event location is required');
    }

    if (eventData.max_attendees && eventData.max_attendees < 1) {
      errors.push('Maximum attendees must be at least 1');
    }

    if (eventData.price && eventData.price < 0) {
      errors.push('Event price cannot be negative');
    }

    return errors;
  }

  static validateEventUpdateData(updateData) {
    const errors = [];

    if (updateData.title && updateData.title.trim().length < 5) {
      errors.push('Event title must be at least 5 characters long');
    }

    if (updateData.description && updateData.description.trim().length < 50) {
      errors.push('Event description must be at least 50 characters long');
    }

    if (updateData.date) {
      const eventDate = new Date(updateData.date);
      if (eventDate <= new Date()) {
        errors.push('Event date must be in the future');
      }
    }

    if (updateData.max_attendees && updateData.max_attendees < 1) {
      errors.push('Maximum attendees must be at least 1');
    }

    if (updateData.price && updateData.price < 0) {
      errors.push('Event price cannot be negative');
    }

    return errors;
  }
}

module.exports = EventService;
