'use strict';

const Settings = require('../models/Settings');
const User = require('../models/User');
const { logger } = require('../utils/logger');

class SettingsService {
  // Get user settings
  static async getUserSettings(userId, options = {}) {
    try {
      const {
        category = null,
        includeDefaults = true,
        format = 'object'
      } = options;

      let settings;
      if (category) {
        settings = await Settings.getByCategory(userId, category);
      } else {
        settings = await Settings.getAll(userId);
      }

      // Include default settings if requested
      if (includeDefaults) {
        const defaultSettings = Settings.getDefaultSettings();
        const mergedSettings = this.mergeWithDefaults(settings, defaultSettings, category);
        settings = mergedSettings;
      }

      // Format settings based on requested format
      switch (format) {
        case 'flat':
          return this.flattenSettings(settings);
        case 'grouped':
          return this.groupSettings(settings);
        case 'object':
        default:
          return settings;
      }
    } catch (error) {
      logger.error('Error getting user settings:', error);
      throw error;
    }
  }

  // Get specific setting
  static async getSetting(userId, settingKey, includeDefault = true) {
    try {
      let setting = await Settings.get(userId, settingKey);

      // Include default if setting doesn't exist and defaults are requested
      if (!setting && includeDefault) {
        const defaultSettings = Settings.getDefaultSettings();
        setting = defaultSettings[settingKey];
      }

      return setting;
    } catch (error) {
      logger.error('Error getting setting:', error);
      throw error;
    }
  }

  // Set user setting
  static async setSetting(userId, settingKey, value, options = {}) {
    try {
      const {
        category = null,
        type = 'string',
        description = null,
        isPublic = false,
        requiresRestart = false
      } = options;

      // Validate setting value
      const validationResult = SettingsService.validateSettingValue(settingKey, value, type);
      if (!validationResult.isValid) {
        throw new Error(`Setting validation failed: ${validationResult.error}`);
      }

      // Parse value based on type
      const parsedValue = SettingsService.parseValue(value, type);

      // Set the setting
      const setting = await Settings.set(userId, settingKey, {
        setting_value: parsedValue,
        category,
        type,
        description,
        is_public: isPublic,
        requires_restart: requiresRestart,
        updated_at: new Date()
      });

      // Log setting change
      await SettingsService.logSettingChange(userId, settingKey, value, 'set');

      logger.info(`Setting ${settingKey} set for user ${userId}`);
      return setting;
    } catch (error) {
      logger.error('Error setting user setting:', error);
      throw error;
    }
  }

  // Set multiple settings
  static async setMultipleSettings(userId, settingsData) {
    try {
      const results = [];
      const errors = [];

      for (const [settingKey, settingData] of Object.entries(settingsData)) {
        try {
          const result = await this.setSetting(
            userId,
            settingKey,
            settingData.value,
            {
              category: settingData.category,
              type: settingData.type,
              description: settingData.description,
              isPublic: settingData.isPublic || false,
              requiresRestart: settingData.requiresRestart || false
            }
          );
          results.push(result);
        } catch (error) {
          errors.push({
            settingKey,
            error: error.message
          });
        }
      }

      // Log bulk setting changes
      await SettingsService.logSettingChange(userId, 'bulk', {
        total: Object.keys(settingsData).length,
        successful: results.length,
        failed: errors.length
      }, 'bulk_set');

      return {
        total: Object.keys(settingsData).length,
        successful: results.length,
        failed: errors.length,
        results,
        errors
      };
    } catch (error) {
      logger.error('Error setting multiple settings:', error);
      throw error;
    }
  }

  // Update user settings
  static async updateSettings(userId, updates) {
    try {
      const results = [];
      const errors = [];

      for (const [settingKey, newValue] of Object.entries(updates)) {
        try {
          // Get current setting to preserve metadata
          const currentSetting = await Settings.get(userId, settingKey);
          if (!currentSetting) {
            errors.push({
              settingKey,
              error: 'Setting not found'
            });
            continue;
          }

          // Validate new value
          const validationResult = SettingsService.validateSettingValue(
            settingKey,
            newValue,
            currentSetting.type
          );
          if (!validationResult.isValid) {
            errors.push({
              settingKey,
              error: validationResult.error
            });
            continue;
          }

          // Parse and update value
          const parsedValue = SettingsService.parseValue(newValue, currentSetting.type);
          const updatedSetting = await Settings.update(userId, settingKey, {
            setting_value: parsedValue,
            updated_at: new Date()
          });

          results.push(updatedSetting);

          // Log individual setting change
          await SettingsService.logSettingChange(userId, settingKey, newValue, 'update');
        } catch (error) {
          errors.push({
            settingKey,
            error: error.message
          });
        }
      }

      return {
        total: Object.keys(updates).length,
        successful: results.length,
        failed: errors.length,
        results,
        errors
      };
    } catch (error) {
      logger.error('Error updating settings:', error);
      throw error;
    }
  }

  // Delete user setting
  static async deleteSetting(userId, settingKey) {
    try {
      // Check if setting exists
      const setting = await Settings.get(userId, settingKey);
      if (!setting) {
        throw new Error('Setting not found');
      }

      // Delete the setting
      await Settings.delete(userId, settingKey);

      // Log setting deletion
      await SettingsService.logSettingChange(userId, settingKey, null, 'delete');

      logger.info(`Setting ${settingKey} deleted for user ${userId}`);
      return { message: 'Setting deleted successfully' };
    } catch (error) {
      logger.error('Error deleting setting:', error);
      throw error;
    }
  }

  // Delete all user settings
  static async deleteAllSettings(userId) {
    try {
      await Settings.deleteAll(userId);

      // Log bulk deletion
      await SettingsService.logSettingChange(userId, 'all', null, 'bulk_delete');

      logger.info(`All settings deleted for user ${userId}`);
      return { message: 'All settings deleted successfully' };
    } catch (error) {
      logger.error('Error deleting all settings:', error);
      throw error;
    }
  }

  // Reset user settings to defaults
  static async resetToDefaults(userId, category = null) {
    try {
      const defaultSettings = Settings.getDefaultSettings();
      let settingsToReset;

      if (category) {
        // Reset only settings in specific category
        settingsToReset = Object.entries(defaultSettings)
          .filter(([key, setting]) => setting.category === category)
          .reduce((acc, [key, setting]) => {
            acc[key] = setting;
            return acc;
          }, {});
      } else {
        // Reset all settings
        settingsToReset = defaultSettings;
      }

      // Set default values
      const results = [];
      for (const [settingKey, defaultSetting] of Object.entries(settingsToReset)) {
        try {
          const result = await Settings.set(userId, settingKey, {
            setting_value: defaultSetting.defaultValue,
            category: defaultSetting.category,
            type: defaultSetting.type,
            description: defaultSetting.description,
            is_public: defaultSetting.isPublic || false,
            requires_restart: defaultSetting.requiresRestart || false,
            updated_at: new Date()
          });
          results.push(result);
        } catch (error) {
          logger.warn(`Failed to reset setting ${settingKey}:`, error);
        }
      }

      // Log reset operation
      await SettingsService.logSettingChange(userId, category || 'all', {
        total: Object.keys(settingsToReset).length,
        successful: results.length
      }, 'reset_to_defaults');

      logger.info(`Settings reset to defaults for user ${userId}${category ? ` (${category})` : ''}`);
      return {
        total: Object.keys(settingsToReset).length,
        successful: results.length,
        results
      };
    } catch (error) {
      logger.error('Error resetting settings to defaults:', error);
      throw error;
    }
  }

  // Get settings metadata
  static async getSettingsMetadata(category = null) {
    try {
      const metadata = Settings.getSettingMetadata();
      
      if (category) {
        return Object.entries(metadata)
          .filter(([key, meta]) => meta.category === category)
          .reduce((acc, [key, meta]) => {
            acc[key] = meta;
            return acc;
          }, {});
      }

      return metadata;
    } catch (error) {
      logger.error('Error getting settings metadata:', error);
      throw error;
    }
  }

  // Validate setting value
  static validateSettingValue(settingKey, value, type) {
    try {
      switch (type) {
        case 'boolean':
          if (typeof value !== 'boolean' && !['true', 'false', '0', '1'].includes(String(value))) {
            return { isValid: false, error: 'Value must be a boolean' };
          }
          break;

        case 'number':
          if (isNaN(Number(value))) {
            return { isValid: false, error: 'Value must be a number' };
          }
          break;

        case 'string':
          if (typeof value !== 'string') {
            return { isValid: false, error: 'Value must be a string' };
          }
          break;

        case 'array':
          if (!Array.isArray(value)) {
            return { isValid: false, error: 'Value must be an array' };
          }
          break;

        case 'object':
          if (typeof value !== 'object' || value === null || Array.isArray(value)) {
            return { isValid: false, error: 'Value must be an object' };
          }
          break;

        case 'json':
          try {
            JSON.parse(String(value));
          } catch (e) {
            return { isValid: false, error: 'Value must be valid JSON' };
          }
          break;

        default:
          return { isValid: false, error: `Unknown type: ${type}` };
      }

      return { isValid: true };
    } catch (error) {
      return { isValid: false, error: 'Validation failed' };
    }
  }

  // Parse value based on type
  static parseValue(value, type) {
    try {
      switch (type) {
        case 'boolean':
          if (typeof value === 'boolean') return value;
          if (typeof value === 'string') {
            return ['true', '1', 'yes', 'on'].includes(value.toLowerCase());
          }
          return Boolean(value);

        case 'number':
          return Number(value);

        case 'string':
          return String(value);

        case 'array':
          if (Array.isArray(value)) return value;
          if (typeof value === 'string') {
            try {
              return JSON.parse(value);
            } catch (e) {
              return value.split(',').map(item => item.trim());
            }
          }
          return [value];

        case 'object':
          if (typeof value === 'object' && value !== null) return value;
          if (typeof value === 'string') {
            try {
              return JSON.parse(value);
            } catch (e) {
              return { value };
            }
          }
          return { value };

        case 'json':
          if (typeof value === 'string') {
            return JSON.parse(value);
          }
          return value;

        default:
          return value;
      }
    } catch (error) {
      logger.error('Error parsing setting value:', error);
      return value;
    }
  }

  // Merge settings with defaults
  static mergeWithDefaults(userSettings, defaultSettings, category = null) {
    try {
      const merged = { ...defaultSettings };

      // Override with user settings
      userSettings.forEach(userSetting => {
        if (merged[userSetting.setting_key]) {
          merged[userSetting.setting_key] = {
            ...merged[userSetting.setting_key],
            ...userSetting,
            hasUserOverride: true
          };
        }
      });

      // Filter by category if specified
      if (category) {
        return Object.entries(merged)
          .filter(([key, setting]) => setting.category === category)
          .reduce((acc, [key, setting]) => {
            acc[key] = setting;
            return acc;
          }, {});
      }

      return merged;
    } catch (error) {
      logger.error('Error merging settings with defaults:', error);
      return defaultSettings;
    }
  }

  // Flatten settings object
  static flattenSettings(settings) {
    try {
      const flattened = {};
      
      Object.entries(settings).forEach(([key, setting]) => {
        flattened[key] = setting.setting_value || setting.defaultValue;
      });

      return flattened;
    } catch (error) {
      logger.error('Error flattening settings:', error);
      return {};
    }
  }

  // Group settings by category
  static groupSettings(settings) {
    try {
      const grouped = {};

      Object.entries(settings).forEach(([key, setting]) => {
        const category = setting.category || 'general';
        if (!grouped[category]) {
          grouped[category] = {};
        }
        grouped[category][key] = setting;
      });

      return grouped;
    } catch (error) {
      logger.error('Error grouping settings:', error);
      return {};
    }
  }

  // Get settings statistics
  static async getSettingsStats(userId = null) {
    try {
      const stats = await Settings.getStats(userId);
      return stats;
    } catch (error) {
      logger.error('Error getting settings statistics:', error);
      throw error;
    }
  }

  // Search settings
  static async searchSettings(userId, searchTerm, options = {}) {
    try {
      const {
        category = null,
        type = null,
        page = 1,
        limit = 20
      } = options;

      const searchResults = await Settings.search(userId, searchTerm, {
        category,
        type,
        page,
        limit
      });

      return searchResults;
    } catch (error) {
      logger.error('Error searching settings:', error);
      throw error;
    }
  }

  // Export user settings
  static async exportSettings(userId, format = 'json') {
    try {
      const settings = await this.getUserSettings(userId, { includeDefaults: false });

      switch (format) {
        case 'json':
          return JSON.stringify(settings, null, 2);
        case 'csv':
          return this.convertSettingsToCSV(settings);
        default:
          return settings;
      }
    } catch (error) {
      logger.error('Error exporting settings:', error);
      throw error;
    }
  }

  // Import user settings
  static async importSettings(userId, settingsData, options = {}) {
    try {
      const {
        overwrite = false,
        validateOnly = false
      } = options;

      let settingsToImport;
      if (typeof settingsData === 'string') {
        try {
          settingsToImport = JSON.parse(settingsData);
        } catch (e) {
          throw new Error('Invalid JSON format');
        }
      } else {
        settingsToImport = settingsData;
      }

      // Validate imported settings
      const validationResults = [];
      for (const [settingKey, settingData] of Object.entries(settingsToImport)) {
        const validation = SettingsService.validateSettingValue(
          settingKey,
          settingData.value,
          settingData.type || 'string'
        );
        validationResults.push({
          settingKey,
          isValid: validation.isValid,
          error: validation.error
        });
      }

      const validSettings = validationResults.filter(r => r.isValid);
      const invalidSettings = validationResults.filter(r => !r.isValid);

      if (validateOnly) {
        return {
          total: validationResults.length,
          valid: validSettings.length,
          invalid: invalidSettings.length,
          validationResults
        };
      }

      // Import valid settings
      const results = [];
      for (const [settingKey, settingData] of Object.entries(settingsToImport)) {
        if (validationResults.find(r => r.settingKey === settingKey)?.isValid) {
          try {
            const result = await this.setSetting(
              userId,
              settingKey,
              settingData.value,
              {
                category: settingData.category,
                type: settingData.type,
                description: settingData.description,
                isPublic: settingData.isPublic || false,
                requiresRestart: settingData.requiresRestart || false
              }
            );
            results.push(result);
          } catch (error) {
            logger.warn(`Failed to import setting ${settingKey}:`, error);
          }
        }
      }

      // Log import operation
      await SettingsService.logSettingChange(userId, 'import', {
        total: validationResults.length,
        valid: validSettings.length,
        invalid: invalidSettings.length,
        successful: results.length
      }, 'import');

      return {
        total: validationResults.length,
        valid: validSettings.length,
        invalid: invalidSettings.length,
        successful: results.length,
        results,
        validationResults
      };
    } catch (error) {
      logger.error('Error importing settings:', error);
      throw error;
    }
  }

  // Get public settings for a user
  static async getPublicSettings(userId) {
    try {
      const publicSettings = await Settings.getPublicSettings(userId);
      return publicSettings;
    } catch (error) {
      logger.error('Error getting public settings:', error);
      throw error;
    }
  }

  // Update public settings
  static async updatePublicSettings(userId, updates) {
    try {
      const results = [];
      const errors = [];

      for (const [settingKey, newValue] of Object.entries(updates)) {
        try {
          const currentSetting = await Settings.get(userId, settingKey);
          if (!currentSetting) {
            errors.push({
              settingKey,
              error: 'Setting not found'
            });
            continue;
          }

          if (!currentSetting.is_public) {
            errors.push({
              settingKey,
              error: 'Setting is not public'
            });
            continue;
          }

          const result = await this.updateSettings(userId, { [settingKey]: newValue });
          results.push(result);
        } catch (error) {
          errors.push({
            settingKey,
            error: error.message
          });
        }
      }

      return {
        total: Object.keys(updates).length,
        successful: results.length,
        failed: errors.length,
        results,
        errors
      };
    } catch (error) {
      logger.error('Error updating public settings:', error);
      throw error;
    }
  }

  // Utility methods

  static async logSettingChange(userId, settingKey, value, action) {
    try {
      // Log setting changes for audit trail
      // This would typically write to an audit log
      logger.info(`Setting ${action} logged for user ${userId}`, {
        settingKey,
        value,
        action,
        timestamp: new Date()
      });
    } catch (error) {
      logger.error('Error logging setting change:', error);
    }
  }

  static convertSettingsToCSV(settings) {
    const headers = [
      'Setting Key',
      'Value',
      'Category',
      'Type',
      'Description',
      'Is Public',
      'Requires Restart',
      'Updated At'
    ];

    const rows = settings.map(setting => [
      setting.setting_key,
      setting.setting_value || setting.defaultValue,
      setting.category,
      setting.type,
      setting.description,
      setting.is_public ? 'Yes' : 'No',
      setting.requires_restart ? 'Yes' : 'No',
      setting.updated_at || setting.created_at
    ]);

    return [headers, ...rows]
      .map(row => row.map(field => `"${field || ''}"`).join(','))
      .join('\n');
  }

  // Get settings that require restart
  static async getSettingsRequiringRestart(userId) {
    try {
      const settings = await Settings.getByRequirement(userId, 'requires_restart', true);
      return settings;
    } catch (error) {
      logger.error('Error getting settings requiring restart:', error);
      throw error;
    }
  }

  // Check if user has pending restart settings
  static async hasPendingRestartSettings(userId) {
    try {
      const restartSettings = await this.getSettingsRequiringRestart(userId);
      return restartSettings.length > 0;
    } catch (error) {
      logger.error('Error checking pending restart settings:', error);
      return false;
    }
  }

  // Mark settings as restarted
  static async markSettingsAsRestarted(userId) {
    try {
      const restartSettings = await this.getSettingsRequiringRestart(userId);
      
      for (const setting of restartSettings) {
        await Settings.update(userId, setting.setting_key, {
          requires_restart: false,
          updated_at: new Date()
        });
      }

      logger.info(`Marked ${restartSettings.length} settings as restarted for user ${userId}`);
      return { message: 'Settings marked as restarted successfully' };
    } catch (error) {
      logger.error('Error marking settings as restarted:', error);
      throw error;
    }
  }
}

module.exports = SettingsService;
