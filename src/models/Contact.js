'use strict';

const { query } = require('../config/db');
const { idEncode, idDecode } = require('../utils/idCodec');
const { logger } = require('../utils/logger');

class Contact {
  constructor(data = {}) {
    this.contact_id = data.contact_id;
    this.user_id = data.user_id;
    this.user_folder_id = data.user_folder_id;
    this.user_sub_folder_id = data.user_sub_folder_id;
    this.contact_user_id = data.contact_user_id;
    this.notes = data.notes;
    this.status = data.status;
    this.created_dts = data.created_dts;
    this.updated_dts = data.updated_dts;
    
    // Joined fields
    this.contact_name = data.contact_name;
    this.contact_email = data.contact_email;
    this.contact_mobile = data.contact_mobile;
    this.contact_photo = data.contact_photo;
    this.folder_name = data.folder_name;
    this.sub_folder_name = data.sub_folder_name;
    this.folder_type = data.folder_type;
  }

  // Create new contact
  static async create(contactData) {
    try {
      const result = await query(
        `INSERT INTO user_contacts (
          user_id, user_folder_id, user_sub_folder_id, contact_user_id, notes, status, created_dts
        ) VALUES (?, ?, ?, ?, ?, ?, NOW())`,
        [
          contactData.user_id, contactData.user_folder_id, contactData.user_sub_folder_id,
          contactData.contact_user_id, contactData.notes, contactData.status || 1
        ]
      );

      return result.insertId;
    } catch (error) {
      logger.error('Error creating contact:', error);
      throw error;
    }
  }

  // Find contact by ID
  static async findById(contactId) {
    try {
      const [contact] = await query(
        `SELECT c.*, 
                u.full_name AS contact_name, u.email AS contact_email, u.mobile AS contact_mobile, u.profile_photo AS contact_photo,
                f.folder_name, f.type AS folder_type,
                sf.sub_folder_name
         FROM user_contacts c
         JOIN users u ON u.user_id = c.contact_user_id
         JOIN user_folders f ON f.user_folder_id = c.user_folder_id
         LEFT JOIN user_sub_folders sf ON sf.user_sub_folder_id = c.user_sub_folder_id
         WHERE c.contact_id = ? AND c.status = 1`,
        [contactId]
      );

      return contact ? new Contact(contact) : null;
    } catch (error) {
      logger.error('Error finding contact by ID:', error);
      throw error;
    }
  }

  // Get contacts by user ID
  static async findByUserId(userId, pagination = { page: 1, limit: 20 }) {
    try {
      const { page, limit } = pagination;
      const offset = (page - 1) * limit;

      const [total] = await query(
        'SELECT COUNT(*) AS total FROM user_contacts WHERE user_id = ? AND status = 1',
        [userId]
      );

      const contacts = await query(
        `SELECT c.*, 
                u.full_name AS contact_name, u.email AS contact_email, u.mobile AS contact_mobile, u.profile_photo AS contact_photo,
                f.folder_name, f.type AS folder_type,
                sf.sub_folder_name
         FROM user_contacts c
         JOIN users u ON u.user_id = c.contact_user_id
         JOIN user_folders f ON f.user_folder_id = c.user_folder_id
         LEFT JOIN user_sub_folders sf ON sf.user_sub_folder_id = c.user_sub_folder_id
         WHERE c.user_id = ? AND c.status = 1
         ORDER BY c.created_dts DESC
         LIMIT ? OFFSET ?`,
        [userId, limit, offset]
      );

      return {
        contacts: contacts.map(contact => new Contact(contact)),
        pagination: {
          page,
          limit,
          total: total.total,
          totalPages: Math.ceil(total.total / limit)
        }
      };
    } catch (error) {
      logger.error('Error finding contacts by user ID:', error);
      throw error;
    }
  }

  // Get contacts by folder ID
  static async findByFolderId(folderId, pagination = { page: 1, limit: 20 }) {
    try {
      const { page, limit } = pagination;
      const offset = (page - 1) * limit;

      const [total] = await query(
        'SELECT COUNT(*) AS total FROM user_contacts WHERE user_folder_id = ? AND status = 1',
        [folderId]
      );

      const contacts = await query(
        `SELECT c.*, 
                u.full_name AS contact_name, u.email AS contact_email, u.mobile AS contact_mobile, u.profile_photo AS contact_photo,
                f.folder_name, f.type AS folder_type,
                sf.sub_folder_name
         FROM user_contacts c
         JOIN users u ON u.user_id = c.contact_user_id
         JOIN user_folders f ON f.user_folder_id = c.user_folder_id
         LEFT JOIN user_sub_folders sf ON sf.user_sub_folder_id = c.user_sub_folder_id
         WHERE c.user_folder_id = ? AND c.status = 1
         ORDER BY c.created_dts DESC
         LIMIT ? OFFSET ?`,
        [folderId, limit, offset]
      );

      return {
        contacts: contacts.map(contact => new Contact(contact)),
        pagination: {
          page,
          limit,
          total: total.total,
          totalPages: Math.ceil(total.total / limit)
        }
      };
    } catch (error) {
      logger.error('Error finding contacts by folder ID:', error);
      throw error;
    }
  }

  // Get contacts by subfolder ID
  static async findBySubFolderId(subFolderId, pagination = { page: 1, limit: 20 }) {
    try {
      const { page, limit } = pagination;
      const offset = (page - 1) * limit;

      const [total] = await query(
        'SELECT COUNT(*) AS total FROM user_contacts WHERE user_sub_folder_id = ? AND status = 1',
        [subFolderId]
      );

      const contacts = await query(
        `SELECT c.*, 
                u.full_name AS contact_name, u.email AS contact_email, u.mobile AS contact_mobile, u.profile_photo AS contact_photo,
                f.folder_name, f.type AS folder_type,
                sf.sub_folder_name
         FROM user_contacts c
         JOIN users u ON u.user_id = c.contact_user_id
         JOIN user_folders f ON f.user_folder_id = c.user_folder_id
         LEFT JOIN user_sub_folders sf ON sf.user_sub_folder_id = c.user_sub_folder_id
         WHERE c.user_sub_folder_id = ? AND c.status = 1
         ORDER BY c.created_dts DESC
         LIMIT ? OFFSET ?`,
        [subFolderId, limit, offset]
      );

      return {
        contacts: contacts.map(contact => new Contact(contact)),
        pagination: {
          page,
          limit,
          total: total.total,
          totalPages: Math.ceil(total.total / limit)
        }
      };
    } catch (error) {
      logger.error('Error finding contacts by subfolder ID:', error);
      throw error;
    }
  }

  // Update contact
  async update(updateData) {
    try {
      const result = await query(
        `UPDATE user_contacts SET 
          user_folder_id = ?, user_sub_folder_id = ?, notes = ?, updated_dts = NOW()
         WHERE contact_id = ? AND user_id = ?`,
        [
          updateData.user_folder_id, updateData.user_sub_folder_id,
          updateData.notes, this.contact_id, this.user_id
        ]
      );

      if (result.affectedRows > 0) {
        Object.assign(this, updateData);
        this.updated_dts = new Date();
        return true;
      }

      return false;
    } catch (error) {
      logger.error('Error updating contact:', error);
      throw error;
    }
  }

  // Soft delete contact
  async softDelete() {
    try {
      const result = await query(
        'UPDATE user_contacts SET status = 0, updated_dts = NOW() WHERE contact_id = ? AND user_id = ?',
        [this.contact_id, this.user_id]
      );

      if (result.affectedRows > 0) {
        this.status = 0;
        this.updated_dts = new Date();
        return true;
      }

      return false;
    } catch (error) {
      logger.error('Error soft deleting contact:', error);
      throw error;
    }
  }

  // Move contact to different folder
  async moveToFolder(folderId, subFolderId = null) {
    try {
      const result = await query(
        `UPDATE user_contacts SET 
          user_folder_id = ?, user_sub_folder_id = ?, updated_dts = NOW()
         WHERE contact_id = ? AND user_id = ?`,
        [folderId, subFolderId, this.contact_id, this.user_id]
      );

      if (result.affectedRows > 0) {
        this.user_folder_id = folderId;
        this.user_sub_folder_id = subFolderId;
        this.updated_dts = new Date();
        return true;
      }

      return false;
    } catch (error) {
      logger.error('Error moving contact to folder:', error);
      throw error;
    }
  }

  // Check if contact already exists in folder
  static async contactExistsInFolder(userId, contactUserId, folderId, subFolderId = null) {
    try {
      let whereClause = 'WHERE user_id = ? AND contact_user_id = ? AND user_folder_id = ? AND status = 1';
      let params = [userId, contactUserId, folderId];

      if (subFolderId) {
        whereClause += ' AND user_sub_folder_id = ?';
        params.push(subFolderId);
      }

      const [contact] = await query(
        `SELECT contact_id FROM user_contacts ${whereClause}`,
        params
      );

      return !!contact;
    } catch (error) {
      logger.error('Error checking if contact exists in folder:', error);
      throw error;
    }
  }

  // Search contacts
  static async searchContacts(userId, criteria, pagination = { page: 1, limit: 20 }) {
    try {
      const { search, folder_id, sub_folder_id, folder_type } = criteria;
      const { page, limit } = pagination;
      const offset = (page - 1) * limit;

      let whereClause = 'WHERE c.user_id = ? AND c.status = 1';
      let params = [userId];

      if (search) {
        whereClause += ' AND (u.full_name LIKE ? OR u.email LIKE ? OR u.mobile LIKE ?)';
        params.push(`%${search}%`, `%${search}%`, `%${search}%`);
      }

      if (folder_id) {
        whereClause += ' AND c.user_folder_id = ?';
        params.push(folder_id);
      }

      if (sub_folder_id) {
        whereClause += ' AND c.user_sub_folder_id = ?';
        params.push(sub_folder_id);
      }

      if (folder_type) {
        whereClause += ' AND f.type = ?';
        params.push(folder_type);
      }

      const [total] = await query(
        `SELECT COUNT(*) AS total 
         FROM user_contacts c
         JOIN users u ON u.user_id = c.contact_user_id
         JOIN user_folders f ON f.user_folder_id = c.user_folder_id
         ${whereClause}`,
        params
      );

      const contacts = await query(
        `SELECT c.*, 
                u.full_name AS contact_name, u.email AS contact_email, u.mobile AS contact_mobile, u.profile_photo AS contact_photo,
                f.folder_name, f.type AS folder_type,
                sf.sub_folder_name
         FROM user_contacts c
         JOIN users u ON u.user_id = c.contact_user_id
         JOIN user_folders f ON f.user_folder_id = c.user_folder_id
         LEFT JOIN user_sub_folders sf ON sf.user_sub_folder_id = c.user_sub_folder_id
         ${whereClause}
         ORDER BY c.created_dts DESC
         LIMIT ? OFFSET ?`,
        [...params, limit, offset]
      );

      return {
        contacts: contacts.map(contact => new Contact(contact)),
        pagination: {
          page,
          limit,
          total: total.total,
          totalPages: Math.ceil(total.total / limit)
        }
      };
    } catch (error) {
      logger.error('Error searching contacts:', error);
      throw error;
    }
  }

  // Get contact statistics for a user
  static async getContactStats(userId) {
    try {
      const [stats] = await query(
        `SELECT 
          COUNT(*) AS total_contacts,
          COUNT(DISTINCT user_folder_id) AS total_folders_used,
          COUNT(DISTINCT user_sub_folder_id) AS total_subfolders_used
         FROM user_contacts 
         WHERE user_id = ? AND status = 1`,
        [userId]
      );

      return stats;
    } catch (error) {
      logger.error('Error getting contact stats:', error);
      throw error;
    }
  }

  // Get contacts by type
  static async getContactsByType(userId, folderType, pagination = { page: 1, limit: 20 }) {
    try {
      const { page, limit } = pagination;
      const offset = (page - 1) * limit;

      const [total] = await query(
        `SELECT COUNT(*) AS total 
         FROM user_contacts c
         JOIN user_folders f ON f.user_folder_id = c.user_folder_id
         WHERE c.user_id = ? AND f.type = ? AND c.status = 1`,
        [userId, folderType]
      );

      const contacts = await query(
        `SELECT c.*, 
                u.full_name AS contact_name, u.email AS contact_email, u.mobile AS contact_mobile, u.profile_photo AS contact_photo,
                f.folder_name, f.type AS folder_type,
                sf.sub_folder_name
         FROM user_contacts c
         JOIN users u ON u.user_id = c.contact_user_id
         JOIN user_folders f ON f.user_folder_id = c.user_folder_id
         LEFT JOIN user_sub_folders sf ON sf.user_sub_folder_id = c.user_sub_folder_id
         WHERE c.user_id = ? AND f.type = ? AND c.status = 1
         ORDER BY c.created_dts DESC
         LIMIT ? OFFSET ?`,
        [userId, folderType, limit, offset]
      );

      return {
        contacts: contacts.map(contact => new Contact(contact)),
        pagination: {
          page,
          limit,
          total: total.total,
          totalPages: Math.ceil(total.total / limit)
        }
      };
    } catch (error) {
      logger.error('Error getting contacts by type:', error);
      throw error;
    }
  }

  // Get contact by encoded ID
  static async findByEncodedId(encodedId) {
    try {
      const contactId = idDecode(encodedId);
      if (!contactId) return null;
      
      return await Contact.findById(contactId);
    } catch (error) {
      logger.error('Error finding contact by encoded ID:', error);
      return null;
    }
  }

  // Get encoded contact ID for API responses
  getEncodedId() {
    return idEncode(this.contact_id);
  }

  // Get public contact data (for sharing)
  getPublicData() {
    return {
      contact_id: this.getEncodedId(),
      contact_name: this.contact_name,
      contact_email: this.contact_email,
      contact_mobile: this.contact_mobile,
      contact_photo: this.contact_photo,
      folder_name: this.folder_name,
      sub_folder_name: this.sub_folder_name,
      folder_type: this.folder_type,
      notes: this.notes,
      created_dts: this.created_dts
    };
  }

  // Get contact initials for avatar
  getInitials() {
    if (!this.contact_name) return '?';
    
    const names = this.contact_name.split(' ');
    if (names.length === 1) {
      return names[0].charAt(0).toUpperCase();
    }
    
    return (names[0].charAt(0) + names[names.length - 1].charAt(0)).toUpperCase();
  }

  // Check if contact has photo
  hasPhoto() {
    return !!this.contact_photo;
  }

  // Get contact display name
  getDisplayName() {
    return this.contact_name || this.contact_email || this.contact_mobile || 'Unknown Contact';
  }

  // Get contact type icon
  getContactTypeIcon() {
    const icons = {
      'contact': '👤',
      'job': '💼',
      'event': '📅',
      'service': '🔧',
      'investor': '💰'
    };
    return icons[this.folder_type] || '👤';
  }
}

module.exports = Contact;
