'use strict';

const { query } = require('../config/db');
const { logger } = require('../utils/logger');

class Country {
  constructor(data = {}) {
    this.id = data.id;
    this.name = data.name;
    this.code = data.code;
    this.phone_code = data.phone_code;
    this.status = data.status;
  }

  // Get all countries
  static async getAll() {
    try {
      const countries = await query(
        'SELECT * FROM countries WHERE status = 1 ORDER BY name ASC'
      );
      return countries;
    } catch (error) {
      logger.error('Error getting countries:', error);
      throw error;
    }
  }

  // Get country by ID
  static async findById(id) {
    try {
      const [country] = await query(
        'SELECT * FROM countries WHERE id = ? AND status = 1',
        [id]
      );
      return country;
    } catch (error) {
      logger.error('Error getting country by ID:', error);
      throw error;
    }
  }

  // Search countries
  static async search(searchTerm) {
    try {
      const countries = await query(
        'SELECT * FROM countries WHERE name LIKE ? AND status = 1 ORDER BY name ASC',
        [`%${searchTerm}%`]
      );
      return countries;
    } catch (error) {
      logger.error('Error searching countries:', error);
      throw error;
    }
  }
}

class State {
  constructor(data = {}) {
    this.id = data.id;
    this.name = data.name;
    this.country_id = data.country_id;
    this.status = data.status;
  }

  // Get states by country ID
  static async getByCountryId(countryId) {
    try {
      const states = await query(
        'SELECT * FROM states WHERE country_id = ? AND status = 1 ORDER BY name ASC',
        [countryId]
      );
      return states;
    } catch (error) {
      logger.error('Error getting states by country ID:', error);
      throw error;
    }
  }

  // Get state by ID
  static async findById(id) {
    try {
      const [state] = await query(
        'SELECT * FROM states WHERE id = ? AND status = 1',
        [id]
      );
      return state;
    } catch (error) {
      logger.error('Error getting state by ID:', error);
      throw error;
    }
  }

  // Search states
  static async search(searchTerm, countryId = null) {
    try {
      let whereClause = 'WHERE name LIKE ? AND status = 1';
      let params = [`%${searchTerm}%`];

      if (countryId) {
        whereClause += ' AND country_id = ?';
        params.push(countryId);
      }

      const states = await query(
        `SELECT * FROM states ${whereClause} ORDER BY name ASC`,
        params
      );
      return states;
    } catch (error) {
      logger.error('Error searching states:', error);
      throw error;
    }
  }
}

class City {
  constructor(data = {}) {
    this.id = data.id;
    this.name = data.name;
    this.state_id = data.state_id;
    this.status = data.status;
  }

  // Get cities by state ID
  static async getByStateId(stateId) {
    try {
      const cities = await query(
        'SELECT * FROM cities WHERE state_id = ? AND status = 1 ORDER BY name ASC',
        [stateId]
      );
      return cities;
    } catch (error) {
      logger.error('Error getting cities by state ID:', error);
      throw error;
    }
  }

  // Get city by ID
  static async findById(id) {
    try {
      const [city] = await query(
        'SELECT * FROM cities WHERE id = ? AND status = 1',
        [id]
      );
      return city;
    } catch (error) {
      logger.error('Error getting city by ID:', error);
      throw error;
    }
  }

  // Search cities
  static async search(searchTerm, stateId = null) {
    try {
      let whereClause = 'WHERE name LIKE ? AND status = 1';
      let params = [`%${searchTerm}%`];

      if (stateId) {
        whereClause += ' AND state_id = ?';
        params.push(stateId);
      }

      const cities = await query(
        `SELECT * FROM cities ${whereClause} ORDER BY name ASC`,
        params
      );
      return cities;
    } catch (error) {
      logger.error('Error searching cities:', error);
      throw error;
    }
  }
}

class Interest {
  constructor(data = {}) {
    this.id = data.id;
    this.name = data.name;
    this.category = data.category;
    this.status = data.status;
  }

  // Get all interests
  static async getAll() {
    try {
      const interests = await query(
        'SELECT * FROM interests WHERE status = 1 ORDER BY name ASC'
      );
      return interests;
    } catch (error) {
      logger.error('Error getting interests:', error);
      throw error;
    }
  }

  // Get interests by category
  static async getByCategory(category) {
    try {
      const interests = await query(
        'SELECT * FROM interests WHERE category = ? AND status = 1 ORDER BY name ASC',
        [category]
      );
      return interests;
    } catch (error) {
      logger.error('Error getting interests by category:', error);
      throw error;
    }
  }

  // Search interests
  static async search(searchTerm) {
    try {
      const interests = await query(
        'SELECT * FROM interests WHERE name LIKE ? AND status = 1 ORDER BY name ASC',
        [`%${searchTerm}%`]
      );
      return interests;
    } catch (error) {
      logger.error('Error searching interests:', error);
      throw error;
    }
  }
}

class JobType {
  constructor(data = {}) {
    this.id = data.id;
    this.name = data.name;
    this.description = data.description;
    this.status = data.status;
  }

  // Get all job types
  static async getAll() {
    try {
      const jobTypes = await query(
        'SELECT * FROM job_type WHERE status = 1 ORDER BY name ASC'
      );
      return jobTypes;
    } catch (error) {
      logger.error('Error getting job types:', error);
      throw error;
    }
  }

  // Get job type by ID
  static async findById(id) {
    try {
      const [jobType] = await query(
        'SELECT * FROM job_type WHERE id = ? AND status = 1',
        [id]
      );
      return jobType;
    } catch (error) {
      logger.error('Error getting job type by ID:', error);
      throw error;
    }
  }
}

class Pay {
  constructor(data = {}) {
    this.id = data.id;
    this.name = data.name;
    this.description = data.description;
    this.status = data.status;
  }

  // Get all pay types
  static async getAll() {
    try {
      const payTypes = await query(
        'SELECT * FROM pay WHERE status = 1 ORDER BY name ASC'
      );
      return payTypes;
    } catch (error) {
      logger.error('Error getting pay types:', error);
      throw error;
    }
  }

  // Get pay type by ID
  static async findById(id) {
    try {
      const [payType] = await query(
        'SELECT * FROM pay WHERE id = ? AND status = 1',
        [id]
      );
      return payType;
    } catch (error) {
      logger.error('Error getting pay type by ID:', error);
      throw error;
    }
  }
}

class EventMode {
  constructor(data = {}) {
    this.id = data.id;
    this.name = data.name;
    this.description = data.description;
    this.status = data.status;
  }

  // Get all event modes
  static async getAll() {
    try {
      const eventModes = await query(
        'SELECT * FROM event_mode WHERE status = 1 ORDER BY name ASC'
      );
      return eventModes;
    } catch (error) {
      logger.error('Error getting event modes:', error);
      throw error;
    }
  }

  // Get event mode by ID
  static async findById(id) {
    try {
      const [eventMode] = await query(
        'SELECT * FROM event_mode WHERE id = ? AND status = 1',
        [id]
      );
      return eventMode;
    } catch (error) {
      logger.error('Error getting event mode by ID:', error);
      throw error;
    }
  }
}

class EventType {
  constructor(data = {}) {
    this.id = data.id;
    this.name = data.name;
    this.description = data.description;
    this.status = data.status;
  }

  // Get all event types
  static async getAll() {
    try {
      const eventTypes = await query(
        'SELECT * FROM event_type WHERE status = 1 ORDER BY name ASC'
      );
      return eventTypes;
    } catch (error) {
      logger.error('Error getting event types:', error);
      throw error;
    }
  }

  // Get event type by ID
  static async findById(id) {
    try {
      const [eventType] = await query(
        'SELECT * FROM event_type WHERE id = ? AND status = 1',
        [id]
      );
      return eventType;
    } catch (error) {
      logger.error('Error getting event type by ID:', error);
      throw error;
    }
  }
}

class FundSize {
  constructor(data = {}) {
    this.id = data.id;
    this.investment_range = data.investment_range;
    this.description = data.description;
    this.status = data.status;
  }

  // Get all fund sizes
  static async getAll() {
    try {
      const fundSizes = await query(
        'SELECT * FROM fund_size WHERE status = 1 ORDER BY id ASC'
      );
      return fundSizes;
    } catch (error) {
      logger.error('Error getting fund sizes:', error);
      throw error;
    }
  }

  // Get fund size by ID
  static async findById(id) {
    try {
      const [fundSize] = await query(
        'SELECT * FROM fund_size WHERE id = ? AND status = 1',
        [id]
      );
      return fundSize;
    } catch (error) {
      logger.error('Error getting fund size by ID:', error);
      throw error;
    }
  }
}

class Folder {
  constructor(data = {}) {
    this.id = data.id;
    this.name = data.name;
    this.type = data.type;
    this.description = data.description;
    this.status = data.status;
  }

  // Get all folders
  static async getAll() {
    try {
      const folders = await query(
        'SELECT * FROM folders WHERE status = 1 ORDER BY name ASC'
      );
      return folders;
    } catch (error) {
      logger.error('Error getting folders:', error);
      throw error;
    }
  }

  // Get folders by type
  static async getByType(type) {
    try {
      const folders = await query(
        'SELECT * FROM folders WHERE type = ? AND status = 1 ORDER BY name ASC',
        [type]
      );
      return folders;
    } catch (error) {
      logger.error('Error getting folders by type:', error);
      throw error;
    }
  }

  // Get folder by ID
  static async findById(id) {
    try {
      const [folder] = await query(
        'SELECT * FROM folders WHERE id = ? AND status = 1',
        [id]
      );
      return folder;
    } catch (error) {
      logger.error('Error getting folder by ID:', error);
      throw error;
    }
  }
}

// Utility function to get location hierarchy
class LocationHierarchy {
  // Get country with states and cities
  static async getCountryWithStatesAndCities(countryId) {
    try {
      const [country] = await query(
        'SELECT * FROM countries WHERE id = ? AND status = 1',
        [countryId]
      );

      if (!country) return null;

      const states = await query(
        'SELECT * FROM states WHERE country_id = ? AND status = 1 ORDER BY name ASC',
        [countryId]
      );

      const statesWithCities = await Promise.all(
        states.map(async (state) => {
          const cities = await query(
            'SELECT * FROM cities WHERE state_id = ? AND status = 1 ORDER BY name ASC',
            [state.id]
          );
          return { ...state, cities };
        })
      );

      return { ...country, states: statesWithCities };
    } catch (error) {
      logger.error('Error getting location hierarchy:', error);
      throw error;
    }
  }

  // Get state with cities
  static async getStateWithCities(stateId) {
    try {
      const [state] = await query(
        'SELECT * FROM states WHERE id = ? AND status = 1',
        [stateId]
      );

      if (!state) return null;

      const cities = await query(
        'SELECT * FROM cities WHERE state_id = ? AND status = 1 ORDER BY name ASC',
        [stateId]
      );

      return { ...state, cities };
    } catch (error) {
      logger.error('Error getting state with cities:', error);
      throw error;
    }
  }

  // Search locations
  static async searchLocations(searchTerm) {
    try {
      const countries = await query(
        'SELECT id, name, "country" as type FROM countries WHERE name LIKE ? AND status = 1',
        [`%${searchTerm}%`]
      );

      const states = await query(
        'SELECT s.id, s.name, "state" as type, c.name as country_name FROM states s JOIN countries c ON c.id = s.country_id WHERE s.name LIKE ? AND s.status = 1',
        [`%${searchTerm}%`]
      );

      const cities = await query(
        `SELECT ci.id, ci.name, "city" as type, s.name as state_name, c.name as country_name 
         FROM cities ci 
         JOIN states s ON s.id = ci.state_id 
         JOIN countries c ON c.id = s.country_id 
         WHERE ci.name LIKE ? AND ci.status = 1`,
        [`%${searchTerm}%`]
      );

      return {
        countries,
        states,
        cities,
        total: countries.length + states.length + cities.length
      };
    } catch (error) {
      logger.error('Error searching locations:', error);
      throw error;
    }
  }
}

module.exports = {
  Country,
  State,
  City,
  Interest,
  JobType,
  Pay,
  EventMode,
  EventType,
  FundSize,
  Folder,
  LocationHierarchy
};
