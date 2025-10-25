'use strict';

const { query } = require('../config/db');
const { logger } = require('../utils/logger');

class Settings {
  constructor(data = {}) {
    this.id = data.id;
    this.user_id = data.user_id;
    this.setting_key = data.setting_key;
    this.setting_value = data.setting_value;
    this.setting_type = data.setting_type || 'string';
    this.description = data.description;
    this.created_at = data.created_at;
    this.updated_at = data.updated_at;
  }

  // Create or update a setting
  static async set(userId, key, value, type = 'string', description = null) {
    try {
      // Check if setting exists
      const [existing] = await query(
        'SELECT id FROM user_settings WHERE user_id = ? AND setting_key = ?',
        [userId, key]
      );

      if (existing) {
        // Update existing setting
        await query(
          'UPDATE user_settings SET setting_value = ?, setting_type = ?, description = ?, updated_at = NOW() WHERE id = ?',
          [value, type, description, existing.id]
        );
      } else {
        // Create new setting
        await query(
          'INSERT INTO user_settings (user_id, setting_key, setting_value, setting_type, description, created_at, updated_at) VALUES (?, ?, ?, ?, ?, NOW(), NOW())',
          [userId, key, value, type, description]
        );
      }

      return await Settings.get(userId, key);
    } catch (error) {
      logger.error('Error setting user setting:', error);
      throw error;
    }
  }

  // Get a specific setting
  static async get(userId, key) {
    try {
      const [setting] = await query(
        'SELECT * FROM user_settings WHERE user_id = ? AND setting_key = ?',
        [userId, key]
      );

      if (!setting) return null;

      // Parse value based on type
      return Settings.parseValue(setting);
    } catch (error) {
      logger.error('Error getting user setting:', error);
      throw error;
    }
  }

  // Get all settings for a user
  static async getAll(userId) {
    try {
      const settings = await query(
        'SELECT * FROM user_settings WHERE user_id = ? ORDER BY setting_key ASC',
        [userId]
      );

      // Parse values based on types
      return settings.map(setting => Settings.parseValue(setting));
    } catch (error) {
      logger.error('Error getting all user settings:', error);
      throw error;
    }
  }

  // Get settings by category
  static async getByCategory(userId, category) {
    try {
      const settings = await query(
        'SELECT * FROM user_settings WHERE user_id = ? AND setting_key LIKE ? ORDER BY setting_key ASC',
        [userId, `${category}%`]
      );

      // Parse values based on types
      return settings.map(setting => Settings.parseValue(setting));
    } catch (error) {
      logger.error('Error getting settings by category:', error);
      throw error;
    }
  }

  // Delete a setting
  static async delete(userId, key) {
    try {
      await query(
        'DELETE FROM user_settings WHERE user_id = ? AND setting_key = ?',
        [userId, key]
      );
      return true;
    } catch (error) {
      logger.error('Error deleting user setting:', error);
      throw error;
    }
  }

  // Delete all settings for a user
  static async deleteAll(userId) {
    try {
      await query('DELETE FROM user_settings WHERE user_id = ?', [userId]);
      return true;
    } catch (error) {
      logger.error('Error deleting all user settings:', error);
      throw error;
    }
  }

  // Parse setting value based on type
  static parseValue(setting) {
    const parsed = { ...setting };

    try {
      switch (setting.setting_type) {
        case 'boolean':
          parsed.setting_value = setting.setting_value === 'true' || setting.setting_value === '1';
          break;
        case 'number':
          parsed.setting_value = parseFloat(setting.setting_value);
          break;
        case 'json':
          parsed.setting_value = JSON.parse(setting.setting_value);
          break;
        case 'array':
          parsed.setting_value = setting.setting_value.split(',').map(item => item.trim());
          break;
        default:
          // string type - no parsing needed
          break;
      }
    } catch (error) {
      logger.warn(`Error parsing setting value for key ${setting.setting_key}:`, error);
      // Return original value if parsing fails
    }

    return parsed;
  }

  // Get default settings for a new user
  static getDefaultSettings() {
    return {
      'profile.visibility': 'public',
      'profile.show_email': false,
      'profile.show_phone': false,
      'profile.show_location': true,
      'notifications.email': true,
      'notifications.push': true,
      'notifications.sms': false,
      'notifications.job_alerts': true,
      'notifications.event_reminders': true,
      'notifications.connection_requests': true,
      'privacy.allow_search': true,
      'privacy.allow_contact': true,
      'privacy.show_online_status': true,
      'appearance.theme': 'light',
      'appearance.language': 'en',
      'appearance.timezone': 'UTC',
      'security.two_factor': false,
      'security.login_notifications': true,
      'security.session_timeout': 24
    };
  }

  // Initialize default settings for a new user
  static async initializeDefaults(userId) {
    try {
      const defaultSettings = Settings.getDefaultSettings();
      const settings = [];

      for (const [key, value] of Object.entries(defaultSettings)) {
        const type = typeof value === 'boolean' ? 'boolean' : 
                    typeof value === 'number' ? 'number' : 'string';
        
        const setting = await Settings.set(userId, key, value, type);
        settings.push(setting);
      }

      return settings;
    } catch (error) {
      logger.error('Error initializing default settings:', error);
      throw error;
    }
  }

  // Bulk update settings
  static async bulkUpdate(userId, settingsData) {
    try {
      const updatedSettings = [];

      for (const [key, value] of Object.entries(settingsData)) {
        const type = typeof value === 'boolean' ? 'boolean' : 
                    typeof value === 'number' ? 'number' : 'string';
        
        const setting = await Settings.set(userId, key, value, type);
        updatedSettings.push(setting);
      }

      return updatedSettings;
    } catch (error) {
      logger.error('Error bulk updating settings:', error);
      throw error;
    }
  }

  // Get setting metadata
  static getSettingMetadata() {
    return {
      'profile.visibility': {
        type: 'select',
        options: ['public', 'private', 'connections_only'],
        description: 'Control who can see your profile'
      },
      'profile.show_email': {
        type: 'boolean',
        description: 'Show email address on profile'
      },
      'profile.show_phone': {
        type: 'boolean',
        description: 'Show phone number on profile'
      },
      'notifications.email': {
        type: 'boolean',
        description: 'Receive email notifications'
      },
      'notifications.push': {
        type: 'boolean',
        description: 'Receive push notifications'
      },
      'appearance.theme': {
        type: 'select',
        options: ['light', 'dark', 'auto'],
        description: 'Application theme preference'
      },
      'appearance.language': {
        type: 'select',
        options: ['en', 'es', 'fr', 'de', 'hi', 'zh'],
        description: 'Application language'
      }
    };
  }

  // Validate setting value
  static validateSetting(key, value) {
    const metadata = Settings.getSettingMetadata()[key];
    if (!metadata) return true; // Allow unknown settings

    switch (metadata.type) {
      case 'boolean':
        return typeof value === 'boolean';
      case 'number':
        return typeof value === 'number' && !isNaN(value);
      case 'select':
        return metadata.options.includes(value);
      case 'string':
        return typeof value === 'string';
      default:
        return true;
    }
  }

  // Get settings statistics
  static async getStats(userId) {
    try {
      const [total] = await query(
        'SELECT COUNT(*) as count FROM user_settings WHERE user_id = ?',
        [userId]
      );

      const [typeStats] = await query(
        'SELECT setting_type, COUNT(*) as count FROM user_settings WHERE user_id = ? GROUP BY setting_type',
        [userId]
      );

      return {
        total: total.count,
        byType: typeStats
      };
    } catch (error) {
      logger.error('Error getting settings statistics:', error);
      throw error;
    }
  }

  // Search settings
  static async search(userId, searchTerm) {
    try {
      const settings = await query(
        'SELECT * FROM user_settings WHERE user_id = ? AND (setting_key LIKE ? OR description LIKE ?) ORDER BY setting_key ASC',
        [userId, `%${searchTerm}%`, `%${searchTerm}%`]
      );

      // Parse values based on types
      return settings.map(setting => Settings.parseValue(setting));
    } catch (error) {
      logger.error('Error searching settings:', error);
      throw error;
    }
  }

  // Export settings for backup
  static async exportSettings(userId) {
    try {
      const settings = await Settings.getAll(userId);
      const exportData = {
        user_id: userId,
        exported_at: new Date().toISOString(),
        settings: settings.reduce((acc, setting) => {
          acc[setting.setting_key] = {
            value: setting.setting_value,
            type: setting.setting_type,
            description: setting.description
          };
          return acc;
        }, {})
      };

      return exportData;
    } catch (error) {
      logger.error('Error exporting settings:', error);
      throw error;
    }
  }

  // Import settings from backup
  static async importSettings(userId, importData) {
    try {
      if (!importData.settings || typeof importData.settings !== 'object') {
        throw new Error('Invalid import data format');
      }

      const importedSettings = [];

      for (const [key, settingData] of Object.entries(importData.settings)) {
        if (Settings.validateSetting(key, settingData.value)) {
          const setting = await Settings.set(
            userId, 
            key, 
            settingData.value, 
            settingData.type, 
            settingData.description
          );
          importedSettings.push(setting);
        }
      }

      return importedSettings;
    } catch (error) {
      logger.error('Error importing settings:', error);
      throw error;
    }
  }
}

module.exports = Settings;
