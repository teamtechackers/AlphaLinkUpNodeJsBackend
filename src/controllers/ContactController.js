'use strict';

const ContactService = require('../services/ContactService');
const { logger } = require('../utils/logger');
const { successResponse, errorResponse } = require('../utils/response');
const { idEncode, idDecode } = require('../utils/idCodec');

class ContactController {
 
  static async addContact(req, res) {
    try {
      const userId = req.user.id;
      const contactData = {
        ...req.body,
        added_by: userId,
        added_at: new Date()
      };

      const contact = await ContactService.addContact(userId, contactData);

      logger.info(`Contact added by user ${userId}: ${contact.id}`);
      return successResponse(res, 'Contact added successfully', { contact });
    } catch (error) {
      logger.error('Add contact error:', error);
      
      if (error.message.includes('Contact already exists')) {
        return errorResponse(res, 'Contact already exists in your list', 400);
      }
      
      if (error.message.includes('Invalid contact data')) {
        return errorResponse(res, 'Invalid contact information', 400);
      }
      
      return errorResponse(res, 'Failed to add contact', 500);
    }
  }

 
  static async getUserContacts(req, res) {
    try {
      const userId = req.user.id;
      const { page = 1, limit = 20, folder_id, search, sort_by = 'name', sort_order = 'asc' } = req.query;
      
      const contacts = await ContactService.getUserContacts(userId, {
        page: parseInt(page),
        limit: parseInt(limit),
        folder_id,
        search,
        sort_by,
        sort_order
      });

      return successResponse(res, 'Contacts retrieved successfully', { contacts });
    } catch (error) {
      logger.error('Get user contacts error:', error);
      return errorResponse(res, 'Failed to retrieve contacts', 500);
    }
  }

 
  static async getContact(req, res) {
    try {
      const { contact_id } = req.params;
      const userId = req.user.id;
      
      const decodedContactId = idDecode(contact_id) || contact_id;
      
      const contact = await ContactService.getContact(userId, decodedContactId);

      if (!contact) {
        return errorResponse(res, 'Contact not found', 404);
      }

      return successResponse(res, 'Contact retrieved successfully', { contact });
    } catch (error) {
      logger.error('Get contact error:', error);
      return errorResponse(res, 'Failed to retrieve contact', 500);
    }
  }

  
  static async updateContact(req, res) {
    try {
      const { contact_id } = req.params;
      const userId = req.user.id;
      const updateData = {
        ...req.body,
        updated_at: new Date()
      };
      
      const decodedContactId = idDecode(contact_id) || contact_id;
      
      const updatedContact = await ContactService.updateContact(userId, decodedContactId, updateData);

      logger.info(`Contact updated by user ${userId}: ${decodedContactId}`);
      return successResponse(res, 'Contact updated successfully', { contact: updatedContact });
    } catch (error) {
      logger.error('Update contact error:', error);
      
      if (error.message.includes('Contact not found')) {
        return errorResponse(res, 'Contact not found', 404);
      }
      
      if (error.message.includes('Not authorized')) {
        return errorResponse(res, 'Not authorized to update this contact', 403);
      }
      
      return errorResponse(res, 'Failed to update contact', 500);
    }
  }

 
  static async deleteContact(req, res) {
    try {
      const { contact_id } = req.params;
      const userId = req.user.id;
      
      const decodedContactId = idDecode(contact_id) || contact_id;
      
      await ContactService.deleteContact(userId, decodedContactId);

      logger.info(`Contact deleted by user ${userId}: ${decodedContactId}`);
      return successResponse(res, 'Contact deleted successfully');
    } catch (error) {
      logger.error('Delete contact error:', error);
      
      if (error.message.includes('Contact not found')) {
        return errorResponse(res, 'Contact not found', 404);
      }
      
      if (error.message.includes('Not authorized')) {
        return errorResponse(res, 'Not authorized to delete this contact', 403);
      }
      
      return errorResponse(res, 'Failed to delete contact', 500);
    }
  }

 
  static async moveContact(req, res) {
    try {
      const { contact_id } = req.params;
      const { folder_id } = req.body;
      const userId = req.user.id;
      
      if (!folder_id) {
        return errorResponse(res, 'Folder ID is required', 400);
      }
      
      const decodedContactId = idDecode(contact_id) || contact_id;
      const decodedFolderId = idDecode(folder_id) || folder_id;
      
      const movedContact = await ContactService.moveContact(userId, decodedContactId, decodedFolderId);

      logger.info(`Contact moved by user ${userId}: ${decodedContactId} to folder ${decodedFolderId}`);
      return successResponse(res, 'Contact moved successfully', { contact: movedContact });
    } catch (error) {
      logger.error('Move contact error:', error);
      
      if (error.message.includes('Contact not found')) {
        return errorResponse(res, 'Contact not found', 404);
      }
      
      if (error.message.includes('Folder not found')) {
        return errorResponse(res, 'Destination folder not found', 404);
      }
      
      return errorResponse(res, 'Failed to move contact', 500);
    }
  }

  
  static async searchContacts(req, res) {
    try {
      const userId = req.user.id;
      const { query, page = 1, limit = 20, folder_id, category } = req.query;
      
      if (!query) {
        return errorResponse(res, 'Search query is required', 400);
      }
      
      const searchResults = await ContactService.searchContacts(userId, query, {
        page: parseInt(page),
        limit: parseInt(limit),
        folder_id,
        category
      });

      return successResponse(res, 'Contact search completed successfully', { searchResults });
    } catch (error) {
      logger.error('Search contacts error:', error);
      return errorResponse(res, 'Failed to search contacts', 500);
    }
  }

 
  static async getContactStats(req, res) {
    try {
      const userId = req.user.id;
      
      const stats = await ContactService.getContactStats(userId);

      return successResponse(res, 'Contact statistics retrieved successfully', { stats });
    } catch (error) {
      logger.error('Get contact stats error:', error);
      return errorResponse(res, 'Failed to retrieve contact statistics', 500);
    }
  }

  
  static async importContacts(req, res) {
    try {
      const userId = req.user.id;
      const { contacts, folder_id } = req.body;
      
      if (!contacts || !Array.isArray(contacts)) {
        return errorResponse(res, 'Valid contacts array is required', 400);
      }
      
      const decodedFolderId = folder_id ? (idDecode(folder_id) || folder_id) : null;
      
      const importResult = await ContactService.importContacts(userId, contacts, decodedFolderId);

      logger.info(`Contacts imported by user ${userId}: ${importResult.imported} imported, ${importResult.skipped} skipped`);
      return successResponse(res, 'Contacts imported successfully', { importResult });
    } catch (error) {
      logger.error('Import contacts error:', error);
      
      if (error.message.includes('Invalid contact format')) {
        return errorResponse(res, 'Invalid contact data format', 400);
      }
      
      return errorResponse(res, 'Failed to import contacts', 500);
    }
  }

  
  static async exportContacts(req, res) {
    try {
      const userId = req.user.id;
      const { format = 'json', folder_id, category } = req.query;
      
      const data = await ContactService.exportContacts(userId, {
        format,
        folder_id: folder_id ? (idDecode(folder_id) || folder_id) : null,
        category
      });

      if (format === 'json') {
        return successResponse(res, 'Contacts exported successfully', { data });
      } else {
        // For CSV format, set appropriate headers
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="contacts_${Date.now()}.csv"`);
        return res.send(data);
      }
    } catch (error) {
      logger.error('Export contacts error:', error);
      return errorResponse(res, 'Failed to export contacts', 500);
    }
  }

  
  static async getContactSuggestions(req, res) {
    try {
      const userId = req.user.id;
      const { query, limit = 10 } = req.query;
      
      if (!query) {
        return errorResponse(res, 'Search query is required', 400);
      }
      
      const suggestions = await ContactService.getContactSuggestions(userId, query, parseInt(limit));

      return successResponse(res, 'Contact suggestions retrieved successfully', { suggestions });
    } catch (error) {
      logger.error('Get contact suggestions error:', error);
      return errorResponse(res, 'Failed to retrieve contact suggestions', 500);
    }
  }

  static async syncContacts(req, res) {
    try {
      const userId = req.user.id;
      const { service, credentials } = req.body;
      
      if (!service || !credentials) {
        return errorResponse(res, 'Service and credentials are required', 400);
      }
      
      const syncResult = await ContactService.syncContacts(userId, service, credentials);

      logger.info(`Contacts synced by user ${userId} with service ${service}: ${syncResult.synced} synced`);
      return successResponse(res, 'Contacts synced successfully', { syncResult });
    } catch (error) {
      logger.error('Sync contacts error:', error);
      
      if (error.message.includes('Invalid service')) {
        return errorResponse(res, 'Unsupported service', 400);
      }
      
      if (error.message.includes('Invalid credentials')) {
        return errorResponse(res, 'Invalid service credentials', 400);
      }
      
      return errorResponse(res, 'Failed to sync contacts', 500);
    }
  }

  
  static async getContactCategories(req, res) {
    try {
      const userId = req.user.id;
      
      const categories = await ContactService.getContactCategories(userId);

      return successResponse(res, 'Contact categories retrieved successfully', { categories });
    } catch (error) {
      logger.error('Get contact categories error:', error);
      return errorResponse(res, 'Failed to retrieve contact categories', 500);
    }
  }

 
  static async addContactCategory(req, res) {
    try {
      const userId = req.user.id;
      const { name, color, description } = req.body;
      
      if (!name) {
        return errorResponse(res, 'Category name is required', 400);
      }
      
      const category = await ContactService.addContactCategory(userId, {
        name,
        color,
        description,
        created_at: new Date()
      });

      logger.info(`Contact category added by user ${userId}: ${category.id}`);
      return successResponse(res, 'Contact category added successfully', { category });
    } catch (error) {
      logger.error('Add contact category error:', error);
      
      if (error.message.includes('Category already exists')) {
        return errorResponse(res, 'Category with this name already exists', 400);
      }
      
      return errorResponse(res, 'Failed to add contact category', 500);
    }
  }


  static async updateContactCategory(req, res) {
    try {
      const { category_id } = req.params;
      const userId = req.user.id;
      const updateData = {
        ...req.body,
        updated_at: new Date()
      };
      
      const decodedCategoryId = idDecode(category_id) || category_id;
      
      const updatedCategory = await ContactService.updateContactCategory(userId, decodedCategoryId, updateData);

      logger.info(`Contact category updated by user ${userId}: ${decodedCategoryId}`);
      return successResponse(res, 'Contact category updated successfully', { category: updatedCategory });
    } catch (error) {
      logger.error('Update contact category error:', error);
      
      if (error.message.includes('Category not found')) {
        return errorResponse(res, 'Category not found', 404);
      }
      
      return errorResponse(res, 'Failed to update contact category', 500);
    }
  }

  static async deleteContactCategory(req, res) {
    try {
      const { category_id } = req.params;
      const userId = req.user.id;
      
      const decodedCategoryId = idDecode(category_id) || category_id;
      
      await ContactService.deleteContactCategory(userId, decodedCategoryId);

      logger.info(`Contact category deleted by user ${userId}: ${decodedCategoryId}`);
      return successResponse(res, 'Contact category deleted successfully');
    } catch (error) {
      logger.error('Delete contact category error:', error);
      
      if (error.message.includes('Category not found')) {
        return errorResponse(res, 'Category not found', 404);
      }
      
      if (error.message.includes('Category in use')) {
        return errorResponse(res, 'Cannot delete category that has contacts', 400);
      }
      
      return errorResponse(res, 'Failed to delete contact category', 500);
    }
  }
}

module.exports = ContactController;
