'use strict';

const { query } = require('../config/db');
const { idEncode, idDecode } = require('../utils/idCodec');
const { logger } = require('../utils/logger');

class ServiceProvider {
  constructor(data = {}) {
    this.sp_id = data.sp_id;
    this.user_id = data.user_id;
    this.company_name = data.company_name;
    this.business_description = data.business_description;
    this.country_id = data.country_id;
    this.state_id = data.state_id;
    this.city_id = data.city_id;
    this.address = data.address;
    this.website = data.website;
    this.contact_person = data.contact_person;
    this.contact_email = data.contact_email;
    this.contact_phone = data.contact_phone;
    this.approval_status = data.approval_status;
    this.status = data.status;
    this.deleted = data.deleted;
    this.created_dts = data.created_dts;
    this.updated_dts = data.updated_dts;
    
    // Joined fields
    this.country_name = data.country_name;
    this.state_name = data.state_name;
    this.city_name = data.city_name;
    this.user_name = data.user_name;
    this.user_mobile = data.user_mobile;
  }

  // Create new service provider
  static async create(serviceProviderData) {
    try {
      const result = await query(
        `INSERT INTO user_service_provider (
          user_id, company_name, business_description, country_id, state_id, city_id,
          address, website, contact_person, contact_email, contact_phone,
          approval_status, status, created_dts
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
        [
          serviceProviderData.user_id, serviceProviderData.company_name,
          serviceProviderData.business_description, serviceProviderData.country_id,
          serviceProviderData.state_id, serviceProviderData.city_id,
          serviceProviderData.address, serviceProviderData.website,
          serviceProviderData.contact_person, serviceProviderData.contact_email,
          serviceProviderData.contact_phone, serviceProviderData.approval_status || 1,
          serviceProviderData.status || 1
        ]
      );

      return result.insertId;
    } catch (error) {
      logger.error('Error creating service provider:', error);
      throw error;
    }
  }

  // Find service provider by ID
  static async findById(spId) {
    try {
      const [serviceProvider] = await query(
        `SELECT sp.*, 
                c.name AS country_name, s.name AS state_name, ci.name AS city_name,
                u.full_name AS user_name, u.mobile AS user_mobile
         FROM user_service_provider sp
         JOIN countries c ON c.id = sp.country_id
         JOIN states s ON s.id = sp.state_id
         JOIN cities ci ON ci.id = sp.city_id
         JOIN users u ON u.user_id = sp.user_id
         WHERE sp.sp_id = ? AND sp.deleted = '0'`,
        [spId]
      );

      return serviceProvider ? new ServiceProvider(serviceProvider) : null;
    } catch (error) {
      logger.error('Error finding service provider by ID:', error);
      throw error;
    }
  }

  // Find service provider by user ID
  static async findByUserId(userId) {
    try {
      const [serviceProvider] = await query(
        `SELECT sp.*, 
                c.name AS country_name, s.name AS state_name, ci.name AS city_name
         FROM user_service_provider sp
         JOIN countries c ON c.id = sp.country_id
         JOIN states s ON s.id = sp.state_id
         JOIN cities ci ON ci.id = sp.city_id
         WHERE sp.user_id = ? AND sp.deleted = '0'`,
        [userId]
      );

      return serviceProvider ? new ServiceProvider(serviceProvider) : null;
    } catch (error) {
      logger.error('Error finding service provider by user ID:', error);
      throw error;
    }
  }

  // Update service provider
  async update(updateData) {
    try {
      const result = await query(
        `UPDATE user_service_provider SET 
          company_name = ?, business_description = ?, country_id = ?, state_id = ?,
          city_id = ?, address = ?, website = ?, contact_person = ?,
          contact_email = ?, contact_phone = ?, updated_dts = NOW()
         WHERE sp_id = ? AND user_id = ?`,
        [
          updateData.company_name, updateData.business_description,
          updateData.country_id, updateData.state_id, updateData.city_id,
          updateData.address, updateData.website, updateData.contact_person,
          updateData.contact_email, updateData.contact_phone,
          this.sp_id, this.user_id
        ]
      );

      if (result.affectedRows > 0) {
        Object.assign(this, updateData);
        this.updated_dts = new Date();
        return true;
      }

      return false;
    } catch (error) {
      logger.error('Error updating service provider:', error);
      throw error;
    }
  }

  // Soft delete service provider
  async softDelete() {
    try {
      const result = await query(
        "UPDATE user_service_provider SET deleted = '1', updated_dts = NOW() WHERE sp_id = ? AND user_id = ?",
        [this.sp_id, this.user_id]
      );

      if (result.affectedRows > 0) {
        this.deleted = '1';
        this.updated_dts = new Date();
        return true;
      }

      return false;
    } catch (error) {
      logger.error('Error soft deleting service provider:', error);
      throw error;
    }
  }

  // Update approval status
  async updateApprovalStatus(status) {
    try {
      const result = await query(
        'UPDATE user_service_provider SET approval_status = ?, updated_dts = NOW() WHERE sp_id = ?',
        [status, this.sp_id]
      );

      if (result.affectedRows > 0) {
        this.approval_status = status;
        this.updated_dts = new Date();
        return true;
      }

      return false;
    } catch (error) {
      logger.error('Error updating approval status:', error);
      throw error;
    }
  }

  // Get service provider services
  static async getServices(spId) {
    try {
      const services = await query(
        `SELECT usps.*, f.name AS service_category
         FROM user_service_provider_services usps
         JOIN folders f ON f.id = usps.service_id
         WHERE usps.sp_id = ? AND usps.status = 1
         ORDER BY usps.created_dts DESC`,
        [spId]
      );

      return services;
    } catch (error) {
      logger.error('Error getting service provider services:', error);
      throw error;
    }
  }

  // Add service to provider
  static async addService(serviceData) {
    try {
      const result = await query(
        `INSERT INTO user_service_provider_services (
          sp_id, service_id, name, description, amount, service_image,
          approval_status, status, created_dts
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
        [
          serviceData.sp_id, serviceData.service_id, serviceData.name,
          serviceData.description, serviceData.amount, serviceData.service_image,
          serviceData.approval_status || 1, serviceData.status || 1
        ]
      );

      return result.insertId;
    } catch (error) {
      logger.error('Error adding service to provider:', error);
      throw error;
    }
  }

  // Update service
  static async updateService(uspsId, updateData) {
    try {
      const result = await query(
        `UPDATE user_service_provider_services SET 
          service_id = ?, name = ?, description = ?, amount = ?, service_image = ?,
          updated_dts = NOW()
         WHERE usps_id = ?`,
        [
          updateData.service_id, updateData.name, updateData.description,
          updateData.amount, updateData.service_image, uspsId
        ]
      );

      return result.affectedRows > 0;
    } catch (error) {
      logger.error('Error updating service:', error);
      throw error;
    }
  }

  // Delete service
  static async deleteService(uspsId) {
    try {
      const result = await query(
        'UPDATE user_service_provider_services SET status = 0, updated_dts = NOW() WHERE usps_id = ?',
        [uspsId]
      );

      return result.affectedRows > 0;
    } catch (error) {
      logger.error('Error deleting service:', error);
      throw error;
    }
  }

  // Get service details
  static async getServiceDetails(uspsId) {
    try {
      const [service] = await query(
        `SELECT usps.*, f.name AS service_category,
                sp.company_name, sp.country_id, sp.state_id, sp.city_id,
                c.name AS country_name, s.name AS state_name, ci.name AS city_name,
                u.full_name, u.mobile
         FROM user_service_provider_services usps
         JOIN user_service_provider sp ON sp.sp_id = usps.sp_id
         JOIN folders f ON f.id = usps.service_id
         JOIN countries c ON c.id = sp.country_id
         JOIN states s ON s.id = sp.state_id
         JOIN cities ci ON ci.id = sp.city_id
         JOIN users u ON u.user_id = sp.user_id
         WHERE usps.usps_id = ? AND usps.status = 1`,
        [uspsId]
      );

      return service;
    } catch (error) {
      logger.error('Error getting service details:', error);
      throw error;
    }
  }

  // Get all services by category
  static async getAllServicesByCategory(serviceId, excludeUserId = null, pagination = { page: 1, limit: 20 }) {
    try {
      const { page, limit } = pagination;
      const offset = (page - 1) * limit;

      let whereClause = 'WHERE usps.service_id = ? AND usps.approval_status = 2 AND usps.status = 1';
      let params = [serviceId];

      if (excludeUserId) {
        whereClause += ' AND sp.user_id != ?';
        params.push(excludeUserId);
      }

      const [total] = await query(
        `SELECT COUNT(*) AS total 
         FROM user_service_provider_services usps
         JOIN user_service_provider sp ON sp.sp_id = usps.sp_id
         ${whereClause}`,
        params
      );

      const services = await query(
        `SELECT usps.*, f.name AS service_category,
                sp.company_name, sp.country_id, sp.state_id, sp.city_id,
                c.name AS country_name, s.name AS state_name, ci.name AS city_name,
                u.full_name, u.mobile
         FROM user_service_provider_services usps
         JOIN user_service_provider sp ON sp.sp_id = usps.sp_id
         JOIN folders f ON f.id = usps.service_id
         JOIN countries c ON c.id = sp.country_id
         JOIN states s ON s.id = sp.state_id
         JOIN cities ci ON ci.id = sp.city_id
         JOIN users u ON u.user_id = sp.user_id
         ${whereClause}
         ORDER BY usps.created_dts DESC
         LIMIT ? OFFSET ?`,
        [...params, limit, offset]
      );

      return {
        services,
        pagination: {
          page,
          limit,
          total: total.total,
          totalPages: Math.ceil(total.total / limit)
        }
      };
    } catch (error) {
      logger.error('Error getting all services by category:', error);
      throw error;
    }
  }

  // Search service providers
  static async searchServiceProviders(criteria, pagination = { page: 1, limit: 20 }) {
    try {
      const { search, service_id, country_id, state_id, city_id } = criteria;
      const { page, limit } = pagination;
      const offset = (page - 1) * limit;

      let whereClause = "WHERE sp.deleted = '0' AND sp.approval_status = 2 AND sp.status = 1";
      let params = [];

      if (search) {
        whereClause += ' AND (sp.company_name LIKE ? OR sp.business_description LIKE ?)';
        params.push(`%${search}%`, `%${search}%`);
      }

      if (service_id) {
        whereClause += ' AND EXISTS (SELECT 1 FROM user_service_provider_services usps WHERE usps.sp_id = sp.sp_id AND usps.service_id = ? AND usps.status = 1)';
        params.push(service_id);
      }

      if (country_id) {
        whereClause += ' AND sp.country_id = ?';
        params.push(country_id);
      }

      if (state_id) {
        whereClause += ' AND sp.state_id = ?';
        params.push(state_id);
      }

      if (city_id) {
        whereClause += ' AND sp.city_id = ?';
        params.push(city_id);
      }

      const [total] = await query(
        `SELECT COUNT(*) AS total FROM user_service_provider sp ${whereClause}`,
        params
      );

      const serviceProviders = await query(
        `SELECT sp.*, 
                c.name AS country_name, s.name AS state_name, ci.name AS city_name,
                u.full_name AS user_name, u.mobile AS user_mobile
         FROM user_service_provider sp
         JOIN countries c ON c.id = sp.country_id
         JOIN states s ON s.id = sp.state_id
         JOIN cities ci ON ci.id = sp.city_id
         JOIN users u ON u.user_id = sp.user_id
         ${whereClause}
         ORDER BY sp.created_dts DESC
         LIMIT ? OFFSET ?`,
        [...params, limit, offset]
      );

      return {
        serviceProviders: serviceProviders.map(sp => new ServiceProvider(sp)),
        pagination: {
          page,
          limit,
          total: total.total,
          totalPages: Math.ceil(total.total / limit)
        }
      };
    } catch (error) {
      logger.error('Error searching service providers:', error);
      throw error;
    }
  }

  // Get service provider statistics
  static async getServiceProviderStats(userId = null) {
    try {
      let whereClause = "WHERE sp.deleted = '0'";
      let params = [];

      if (userId) {
        whereClause += ' AND sp.user_id = ?';
        params.push(userId);
      }

      const [stats] = await query(
        `SELECT 
          COUNT(*) AS total_providers,
          COUNT(CASE WHEN sp.approval_status = 1 THEN 1 END) AS pending_approval,
          COUNT(CASE WHEN sp.approval_status = 2 THEN 1 END) AS approved,
          COUNT(CASE WHEN sp.approval_status = 3 THEN 1 END) AS rejected
         FROM user_service_provider sp ${whereClause}`,
        params
      );

      return stats;
    } catch (error) {
      logger.error('Error getting service provider stats:', error);
      throw error;
    }
  }

  // Get service provider by encoded ID
  static async findByEncodedId(encodedId) {
    try {
      const spId = idDecode(encodedId);
      if (!spId) return null;
      
      return await ServiceProvider.findById(spId);
    } catch (error) {
      logger.error('Error finding service provider by encoded ID:', error);
      return null;
    }
  }

  // Get encoded service provider ID for API responses
  getEncodedId() {
    return idEncode(this.sp_id);
  }

  // Get public service provider data (for sharing)
  getPublicData() {
    return {
      sp_id: this.getEncodedId(),
      company_name: this.company_name,
      business_description: this.business_description,
      country_name: this.country_name,
      state_name: this.state_name,
      city_name: this.city_name,
      address: this.address,
      website: this.website,
      contact_person: this.contact_person,
      contact_email: this.contact_email,
      contact_phone: this.contact_phone,
      user_name: this.user_name,
      user_mobile: this.user_mobile,
      created_dts: this.created_dts
    };
  }

  // Check if user can unlock service
  static async canUnlockService(userId, serviceId) {
    try {
      // Check if user has already unlocked this service
      const [unlocked] = await query(
        'SELECT unlock_id FROM user_services_unlocked WHERE user_id = ? AND service_id = ?',
        [userId, serviceId]
      );

      return !unlocked; // Can unlock if not already unlocked
    } catch (error) {
      logger.error('Error checking service unlock status:', error);
      throw error;
    }
  }

  // Unlock service for user
  static async unlockService(userId, serviceId) {
    try {
      const result = await query(
        'INSERT INTO user_services_unlocked (user_id, service_id, created_dts) VALUES (?, ?, NOW())',
        [userId, serviceId]
      );

      return result.insertId;
    } catch (error) {
      logger.error('Error unlocking service:', error);
      throw error;
    }
  }

  // Get unlocked services for user
  static async getUnlockedServices(userId) {
    try {
      const services = await query(
        `SELECT usu.*, f.name AS service_category
         FROM user_services_unlocked usu
         JOIN folders f ON f.id = usu.service_id
         WHERE usu.user_id = ?
         ORDER BY usu.created_dts DESC`,
        [userId]
      );

      return services;
    } catch (error) {
      logger.error('Error getting unlocked services:', error);
      throw error;
    }
  }
}

module.exports = ServiceProvider;
