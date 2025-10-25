'use strict';

const MasterDataService = require('../services/MasterDataService');
const { logger } = require('../utils/logger');
const { successResponse, errorResponse } = require('../utils/response');
const { idEncode, idDecode } = require('../utils/idCodec');

class MasterDataController {
  /**
   * Get all master data categories
   */
  static async getMasterDataCategories(req, res) {
    try {
      const categories = await MasterDataService.getMasterDataCategories();

      return successResponse(res, 'Master data categories retrieved successfully', { categories });
    } catch (error) {
      logger.error('Get master data categories error:', error);
      return errorResponse(res, 'Failed to retrieve master data categories', 500);
    }
  }

  /**
   * Get master data by category
   */
  static async getMasterDataByCategory(req, res) {
    try {
      const { category } = req.params;
      const { active_only = true, include_deleted = false } = req.query;
      
      const masterData = await MasterDataService.getMasterDataByCategory(category, {
        active_only: active_only === 'true',
        include_deleted: include_deleted === 'true'
      });

      return successResponse(res, `Master data for category '${category}' retrieved successfully`, { masterData });
    } catch (error) {
      logger.error('Get master data by category error:', error);
      
      if (error.message.includes('Category not found')) {
        return errorResponse(res, 'Master data category not found', 404);
      }
      
      return errorResponse(res, 'Failed to retrieve master data', 500);
    }
  }

  /**
   * Get specific master data item
   */
  static async getMasterDataItem(req, res) {
    try {
      const { category, item_id } = req.params;
      
      const decodedItemId = idDecode(item_id) || item_id;
      
      const item = await MasterDataService.getMasterDataItem(category, decodedItemId);

      if (!item) {
        return errorResponse(res, 'Master data item not found', 404);
      }

      return successResponse(res, 'Master data item retrieved successfully', { item });
    } catch (error) {
      logger.error('Get master data item error:', error);
      
      if (error.message.includes('Category not found')) {
        return errorResponse(res, 'Master data category not found', 404);
      }
      
      return errorResponse(res, 'Failed to retrieve master data item', 500);
    }
  }

  /**
   * Add new master data item (admin only)
   */
  static async addMasterDataItem(req, res) {
    try {
      const { category } = req.params;
      const adminId = req.user.id;
      const itemData = {
        ...req.body,
        created_by: adminId,
        created_at: new Date()
      };
      
      const newItem = await MasterDataService.addMasterDataItem(category, itemData);

      logger.info(`Master data item added by admin ${adminId} in category ${category}: ${newItem.id}`);
      return successResponse(res, 'Master data item added successfully', { item: newItem });
    } catch (error) {
      logger.error('Add master data item error:', error);
      
      if (error.message.includes('Category not found')) {
        return errorResponse(res, 'Master data category not found', 404);
      }
      
      if (error.message.includes('Item already exists')) {
        return errorResponse(res, 'Item with this name already exists in this category', 400);
      }
      
      if (error.message.includes('Invalid item data')) {
        return errorResponse(res, 'Invalid item data', 400);
      }
      
      return errorResponse(res, 'Failed to add master data item', 500);
    }
  }

  /**
   * Update master data item (admin only)
   */
  static async updateMasterDataItem(req, res) {
    try {
      const { category, item_id } = req.params;
      const adminId = req.user.id;
      const updateData = {
        ...req.body,
        updated_by: adminId,
        updated_at: new Date()
      };
      
      const decodedItemId = idDecode(item_id) || item_id;
      
      const updatedItem = await MasterDataService.updateMasterDataItem(category, decodedItemId, updateData);

      logger.info(`Master data item updated by admin ${adminId} in category ${category}: ${decodedItemId}`);
      return successResponse(res, 'Master data item updated successfully', { item: updatedItem });
    } catch (error) {
      logger.error('Update master data item error:', error);
      
      if (error.message.includes('Category not found')) {
        return errorResponse(res, 'Master data category not found', 404);
      }
      
      if (error.message.includes('Item not found')) {
        return errorResponse(res, 'Master data item not found', 404);
      }
      
      return errorResponse(res, 'Failed to update master data item', 500);
    }
  }

  /**
   * Delete master data item (admin only)
   */
  static async deleteMasterDataItem(req, res) {
    try {
      const { category, item_id } = req.params;
      const adminId = req.user.id;
      
      const decodedItemId = idDecode(item_id) || item_id;
      
      await MasterDataService.deleteMasterDataItem(category, decodedItemId);

      logger.info(`Master data item deleted by admin ${adminId} in category ${category}: ${decodedItemId}`);
      return successResponse(res, 'Master data item deleted successfully');
    } catch (error) {
      logger.error('Delete master data item error:', error);
      
      if (error.message.includes('Category not found')) {
        return errorResponse(res, 'Master data category not found', 404);
      }
      
      if (error.message.includes('Item not found')) {
        return errorResponse(res, 'Master data item not found', 404);
      }
      
      if (error.message.includes('Item in use')) {
        return errorResponse(res, 'Cannot delete item that is currently in use', 400);
      }
      
      return errorResponse(res, 'Failed to delete master data item', 500);
    }
  }

  /**
   * Get location hierarchy
   */
  static async getLocationHierarchy(req, res) {
    try {
      const { country_code, state_code, city_code } = req.query;
      
      const locationHierarchy = await MasterDataService.getLocationHierarchy({
        country_code,
        state_code,
        city_code
      });

      return successResponse(res, 'Location hierarchy retrieved successfully', { locationHierarchy });
    } catch (error) {
      logger.error('Get location hierarchy error:', error);
      return errorResponse(res, 'Failed to retrieve location hierarchy', 500);
    }
  }

  /**
   * Search master data
   */
  static async searchMasterData(req, res) {
    try {
      const { query, category, limit = 20 } = req.query;
      
      if (!query) {
        return errorResponse(res, 'Search query is required', 400);
      }
      
      const searchResults = await MasterDataService.searchMasterData(query, {
        category,
        limit: parseInt(limit)
      });

      return successResponse(res, 'Master data search completed successfully', { searchResults });
    } catch (error) {
      logger.error('Search master data error:', error);
      return errorResponse(res, 'Failed to search master data', 500);
    }
  }

  /**
   * Get master data statistics
   */
  static async getMasterDataStats(req, res) {
    try {
      const stats = await MasterDataService.getMasterDataStats();

      return successResponse(res, 'Master data statistics retrieved successfully', { stats });
    } catch (error) {
      logger.error('Get master data stats error:', error);
      return errorResponse(res, 'Failed to retrieve master data statistics', 500);
    }
  }

  /**
   * Export master data
   */
  static async exportMasterData(req, res) {
    try {
      const { format = 'json', category, active_only = true } = req.query;
      
      const data = await MasterDataService.exportMasterData({
        format,
        category,
        active_only: active_only === 'true'
      });

      if (format === 'json') {
        return successResponse(res, 'Master data exported successfully', { data });
      } else {
        // For CSV format, set appropriate headers
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="master_data_${category || 'all'}_${Date.now()}.csv"`);
        return res.send(data);
      }
    } catch (error) {
      logger.error('Export master data error:', error);
      return errorResponse(res, 'Failed to export master data', 500);
    }
  }

  /**
   * Import master data (admin only)
   */
  static async importMasterData(req, res) {
    try {
      const { category, items, update_existing = false } = req.body;
      const adminId = req.user.id;
      
      if (!category || !items || !Array.isArray(items)) {
        return errorResponse(res, 'Category and valid items array are required', 400);
      }
      
      const importResult = await MasterDataService.importMasterData(category, items, {
        update_existing: update_existing === true,
        imported_by: adminId
      });

      logger.info(`Master data imported by admin ${adminId} in category ${category}: ${importResult.imported} imported, ${importResult.updated} updated, ${importResult.skipped} skipped`);
      return successResponse(res, 'Master data imported successfully', { importResult });
    } catch (error) {
      logger.error('Import master data error:', error);
      
      if (error.message.includes('Category not found')) {
        return errorResponse(res, 'Master data category not found', 400);
      }
      
      if (error.message.includes('Invalid item format')) {
        return errorResponse(res, 'Invalid item data format', 400);
      }
      
      return errorResponse(res, 'Failed to import master data', 500);
    }
  }

  /**
   * Get master data suggestions
   */
  static async getMasterDataSuggestions(req, res) {
    try {
      const { query, category, limit = 10 } = req.query;
      
      if (!query) {
        return errorResponse(res, 'Search query is required', 400);
      }
      
      const suggestions = await MasterDataService.getMasterDataSuggestions(query, {
        category,
        limit: parseInt(limit)
      });

      return successResponse(res, 'Master data suggestions retrieved successfully', { suggestions });
    } catch (error) {
      logger.error('Get master data suggestions error:', error);
      return errorResponse(res, 'Failed to retrieve master data suggestions', 500);
    }
  }

  /**
   * Bulk update master data (admin only)
   */
  static async bulkUpdateMasterData(req, res) {
    try {
      const { category, updates } = req.body;
      const adminId = req.user.id;
      
      if (!category || !updates || !Array.isArray(updates)) {
        return errorResponse(res, 'Category and valid updates array are required', 400);
      }
      
      const bulkUpdateResult = await MasterDataService.bulkUpdateMasterData(category, updates, {
        updated_by: adminId
      });

      logger.info(`Master data bulk updated by admin ${adminId} in category ${category}: ${bulkUpdateResult.updated} updated, ${bulkUpdateResult.failed} failed`);
      return successResponse(res, 'Master data bulk updated successfully', { bulkUpdateResult });
    } catch (error) {
      logger.error('Bulk update master data error:', error);
      
      if (error.message.includes('Category not found')) {
        return errorResponse(res, 'Master data category not found', 400);
      }
      
      if (error.message.includes('Invalid update format')) {
        return errorResponse(res, 'Invalid update data format', 400);
      }
      
      return errorResponse(res, 'Failed to bulk update master data', 500);
    }
  }

  /**
   * Get master data audit log (admin only)
   */
  static async getMasterDataAuditLog(req, res) {
    try {
      const { category, item_id, action, start_date, end_date, page = 1, limit = 50 } = req.query;
      
      const auditLog = await MasterDataService.getMasterDataAuditLog({
        category,
        item_id: item_id ? (idDecode(item_id) || item_id) : null,
        action,
        start_date: start_date ? new Date(start_date) : null,
        end_date: end_date ? new Date(end_date) : null,
        page: parseInt(page),
        limit: parseInt(limit)
      });

      return successResponse(res, 'Master data audit log retrieved successfully', { auditLog });
    } catch (error) {
      logger.error('Get master data audit log error:', error);
      return errorResponse(res, 'Failed to retrieve master data audit log', 500);
    }
  }

  /**
   * Validate master data integrity
   */
  static async validateMasterDataIntegrity(req, res) {
    try {
      const { category } = req.query;
      
      const validationResult = await MasterDataService.validateMasterDataIntegrity(category);

      return successResponse(res, 'Master data integrity validation completed', { validationResult });
    } catch (error) {
      logger.error('Validate master data integrity error:', error);
      return errorResponse(res, 'Failed to validate master data integrity', 500);
    }
  }

  /**
   * Get master data dependencies
   */
  static async getMasterDataDependencies(req, res) {
    try {
      const { category, item_id } = req.params;
      
      const decodedItemId = idDecode(item_id) || item_id;
      
      const dependencies = await MasterDataService.getMasterDataDependencies(category, decodedItemId);

      return successResponse(res, 'Master data dependencies retrieved successfully', { dependencies });
    } catch (error) {
      logger.error('Get master data dependencies error:', error);
      
      if (error.message.includes('Category not found')) {
        return errorResponse(res, 'Master data category not found', 404);
      }
      
      if (error.message.includes('Item not found')) {
        return errorResponse(res, 'Master data item not found', 404);
      }
      
      return errorResponse(res, 'Failed to retrieve master data dependencies', 500);
    }
  }

  /**
   * Sync master data with external source (admin only)
   */
  static async syncMasterData(req, res) {
    try {
      const { category, source, credentials } = req.body;
      const adminId = req.user.id;
      
      if (!category || !source || !credentials) {
        return errorResponse(res, 'Category, source, and credentials are required', 400);
      }
      
      const syncResult = await MasterDataService.syncMasterData(category, source, credentials, {
        synced_by: adminId
      });

      logger.info(`Master data synced by admin ${adminId} in category ${category} from source ${source}: ${syncResult.synced} synced, ${syncResult.updated} updated`);
      return successResponse(res, 'Master data synced successfully', { syncResult });
    } catch (error) {
      logger.error('Sync master data error:', error);
      
      if (error.message.includes('Category not found')) {
        return errorResponse(res, 'Master data category not found', 400);
      }
      
      if (error.message.includes('Invalid source')) {
        return errorResponse(res, 'Unsupported external source', 400);
      }
      
      if (error.message.includes('Invalid credentials')) {
        return errorResponse(res, 'Invalid source credentials', 400);
      }
      
      return errorResponse(res, 'Failed to sync master data', 500);
    }
  }
}

module.exports = MasterDataController;
