'use strict';

const { query } = require('../config/db');
const { idEncode, idDecode } = require('../utils/idCodec');
const { logger } = require('../utils/logger');

class Folder {
  constructor(data = {}) {
    this.user_folder_id = data.user_folder_id;
    this.user_id = data.user_id;
    this.folder_name = data.folder_name;
    this.type = data.type; // 'contact', 'job', 'event', 'service', 'investor'
    this.description = data.description;
    this.status = data.status;
    this.created_dts = data.created_dts;
    this.updated_dts = data.updated_dts;
    
    // Joined fields
    this.sub_folders_count = data.sub_folders_count;
    this.contacts_count = data.contacts_count;
  }

  // Create new folder
  static async create(folderData) {
    try {
      const result = await query(
        `INSERT INTO user_folders (
          user_id, folder_name, type, description, status, created_dts
        ) VALUES (?, ?, ?, ?, ?, NOW())`,
        [
          folderData.user_id, folderData.folder_name, folderData.type,
          folderData.description, folderData.status || 1
        ]
      );

      return result.insertId;
    } catch (error) {
      logger.error('Error creating folder:', error);
      throw error;
    }
  }

  // Find folder by ID
  static async findById(folderId) {
    try {
      const [folder] = await query(
        'SELECT * FROM user_folders WHERE user_folder_id = ? AND status = 1',
        [folderId]
      );

      return folder ? new Folder(folder) : null;
    } catch (error) {
      logger.error('Error finding folder by ID:', error);
      throw error;
    }
  }

  // Get folders by user ID
  static async findByUserId(userId, type = null) {
    try {
      let whereClause = 'WHERE user_id = ? AND status = 1';
      let params = [userId];

      if (type) {
        whereClause += ' AND type = ?';
        params.push(type);
      }

      const folders = await query(
        `SELECT f.*, 
                (SELECT COUNT(*) FROM user_sub_folders sf WHERE sf.user_folder_id = f.user_folder_id AND sf.status = 1) AS sub_folders_count,
                (SELECT COUNT(*) FROM user_contacts c WHERE c.user_folder_id = f.user_folder_id AND c.status = 1) AS contacts_count
         FROM user_folders f
         ${whereClause}
         ORDER BY f.created_dts DESC`,
        params
      );

      return folders.map(folder => new Folder(folder));
    } catch (error) {
      logger.error('Error finding folders by user ID:', error);
      throw error;
    }
  }

  // Update folder
  async update(updateData) {
    try {
      const result = await query(
        `UPDATE user_folders SET 
          folder_name = ?, description = ?, updated_dts = NOW()
         WHERE user_folder_id = ? AND user_id = ?`,
        [updateData.folder_name, updateData.description, this.user_folder_id, this.user_id]
      );

      if (result.affectedRows > 0) {
        Object.assign(this, updateData);
        this.updated_dts = new Date();
        return true;
      }

      return false;
    } catch (error) {
      logger.error('Error updating folder:', error);
      throw error;
    }
  }

  // Soft delete folder
  async softDelete() {
    try {
      const result = await query(
        'UPDATE user_folders SET status = 0, updated_dts = NOW() WHERE user_folder_id = ? AND user_id = ?',
        [this.user_folder_id, this.user_id]
      );

      if (result.affectedRows > 0) {
        this.status = 0;
        this.updated_dts = new Date();
        return true;
      }

      return false;
    } catch (error) {
      logger.error('Error soft deleting folder:', error);
      throw error;
    }
  }

  // Get folder statistics for a user
  static async getFolderStats(userId) {
    try {
      const [stats] = await query(
        `SELECT 
          COUNT(*) AS total_folders,
          COUNT(CASE WHEN type = 'contact' THEN 1 END) AS contact_folders,
          COUNT(CASE WHEN type = 'job' THEN 1 END) AS job_folders,
          COUNT(CASE WHEN type = 'event' THEN 1 END) AS event_folders,
          COUNT(CASE WHEN type = 'service' THEN 1 END) AS service_folders,
          COUNT(CASE WHEN type = 'investor' THEN 1 END) AS investor_folders
         FROM user_folders 
         WHERE user_id = ? AND status = 1`,
        [userId]
      );

      return stats;
    } catch (error) {
      logger.error('Error getting folder stats:', error);
      throw error;
    }
  }

  // Get folder by encoded ID
  static async findByEncodedId(encodedId) {
    try {
      const folderId = idDecode(encodedId);
      if (!folderId) return null;
      
      return await Folder.findById(folderId);
    } catch (error) {
      logger.error('Error finding folder by encoded ID:', error);
      return null;
    }
  }

  // Get encoded folder ID for API responses
  getEncodedId() {
    return idEncode(this.user_folder_id);
  }

  // Get public folder data (for sharing)
  getPublicData() {
    return {
      user_folder_id: this.getEncodedId(),
      folder_name: this.folder_name,
      type: this.type,
      description: this.description,
      sub_folders_count: this.sub_folders_count,
      contacts_count: this.contacts_count,
      created_dts: this.created_dts
    };
  }

  // Validate folder type
  static validateType(type) {
    const validTypes = ['contact', 'job', 'event', 'service', 'investor'];
    return validTypes.includes(type);
  }

  // Get folder icon based on type
  getFolderIcon() {
    const icons = {
      'contact': '👥',
      'job': '💼',
      'event': '📅',
      'service': '🔧',
      'investor': '💰'
    };
    return icons[this.type] || '📁';
  }

  // Get folder color based on type
  getFolderColor() {
    const colors = {
      'contact': '#3498db',
      'job': '#e74c3c',
      'event': '#f39c12',
      'service': '#27ae60',
      'investor': '#9b59b6'
    };
    return colors[this.type] || '#95a5a6';
  }
}

class SubFolder {
  constructor(data = {}) {
    this.user_sub_folder_id = data.user_sub_folder_id;
    this.user_folder_id = data.user_folder_id;
    this.sub_folder_name = data.sub_folder_name;
    this.description = data.description;
    this.status = data.status;
    this.created_dts = data.created_dts;
    this.updated_dts = data.updated_dts;
    
    // Joined fields
    this.folder_name = data.folder_name;
    this.folder_type = data.folder_type;
    this.contacts_count = data.contacts_count;
  }

  // Create new subfolder
  static async create(subFolderData) {
    try {
      const result = await query(
        `INSERT INTO user_sub_folders (
          user_folder_id, sub_folder_name, description, status, created_dts
        ) VALUES (?, ?, ?, ?, NOW())`,
        [
          subFolderData.user_folder_id, subFolderData.sub_folder_name,
          subFolderData.description, subFolderData.status || 1
        ]
      );

      return result.insertId;
    } catch (error) {
      logger.error('Error creating subfolder:', error);
      throw error;
    }
  }

  // Find subfolder by ID
  static async findById(subFolderId) {
    try {
      const [subFolder] = await query(
        `SELECT sf.*, f.folder_name, f.type AS folder_type
         FROM user_sub_folders sf
         JOIN user_folders f ON f.user_folder_id = sf.user_folder_id
         WHERE sf.user_sub_folder_id = ? AND sf.status = 1`,
        [subFolderId]
      );

      return subFolder ? new SubFolder(subFolder) : null;
    } catch (error) {
      logger.error('Error finding subfolder by ID:', error);
      throw error;
    }
  }

  // Get subfolders by folder ID
  static async findByFolderId(folderId) {
    try {
      const subFolders = await query(
        `SELECT sf.*, f.folder_name, f.type AS folder_type,
                (SELECT COUNT(*) FROM user_contacts c WHERE c.user_sub_folder_id = sf.user_sub_folder_id AND c.status = 1) AS contacts_count
         FROM user_sub_folders sf
         JOIN user_folders f ON f.user_folder_id = sf.user_folder_id
         WHERE sf.user_folder_id = ? AND sf.status = 1
         ORDER BY sf.created_dts ASC`,
        [folderId]
      );

      return subFolders.map(subFolder => new SubFolder(subFolder));
    } catch (error) {
      logger.error('Error finding subfolders by folder ID:', error);
      throw error;
    }
  }

  // Update subfolder
  async update(updateData) {
    try {
      const result = await query(
        `UPDATE user_sub_folders SET 
          sub_folder_name = ?, description = ?, updated_dts = NOW()
         WHERE user_sub_folder_id = ?`,
        [updateData.sub_folder_name, updateData.description, this.user_sub_folder_id]
      );

      if (result.affectedRows > 0) {
        Object.assign(this, updateData);
        this.updated_dts = new Date();
        return true;
      }

      return false;
    } catch (error) {
      logger.error('Error updating subfolder:', error);
      throw error;
    }
  }

  // Soft delete subfolder
  async softDelete() {
    try {
      const result = await query(
        'UPDATE user_sub_folders SET status = 0, updated_dts = NOW() WHERE user_sub_folder_id = ?',
        [this.user_sub_folder_id]
      );

      if (result.affectedRows > 0) {
        this.status = 0;
        this.updated_dts = new Date();
        return true;
      }

      return false;
    } catch (error) {
      logger.error('Error soft deleting subfolder:', error);
      throw error;
    }
  }

  // Get subfolder by encoded ID
  static async findByEncodedId(encodedId) {
    try {
      const subFolderId = idDecode(encodedId);
      if (!subFolderId) return null;
      
      return await SubFolder.findById(subFolderId);
    } catch (error) {
      logger.error('Error finding subfolder by encoded ID:', error);
      return null;
    }
  }

  // Get encoded subfolder ID for API responses
  getEncodedId() {
    return idEncode(this.user_sub_folder_id);
  }

  // Get public subfolder data (for sharing)
  getPublicData() {
    return {
      user_sub_folder_id: this.getEncodedId(),
      user_folder_id: this.user_folder_id,
      sub_folder_name: this.sub_folder_name,
      description: this.description,
      folder_name: this.folder_name,
      folder_type: this.folder_type,
      contacts_count: this.contacts_count,
      created_dts: this.created_dts
    };
  }
}

module.exports = { Folder, SubFolder };
