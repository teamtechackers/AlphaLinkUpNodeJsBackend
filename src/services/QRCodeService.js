'use strict';

const QRCode = require('qrcode');
const path = require('path');
const fs = require('fs').promises;
const { logger } = require('../utils/logger');

class QRCodeService {
  constructor() {
    this.uploadPath = process.env.QR_UPLOAD_PATH || './uploads/qr_codes';
    this.ensureUploadDirectory();
  }

  /**
   * Ensure upload directory exists
   */
  async ensureUploadDirectory() {
    try {
      await fs.mkdir(this.uploadPath, { recursive: true });
      logger.debug(`QR code upload directory ensured: ${this.uploadPath}`);
    } catch (error) {
      logger.error('Failed to create QR code upload directory:', error);
    }
  }

  /**
   * Generate QR code for user
   */
  async generateQRCode(uniqueToken, options = {}) {
    try {
      const {
        size = 300,
        margin = 2,
        color = '#000000',
        backgroundColor = '#FFFFFF',
        errorCorrectionLevel = 'M',
        format = 'png'
      } = options;

      // Generate QR code data
      const qrData = JSON.stringify({
        token: uniqueToken,
        type: 'user_profile',
        timestamp: Date.now()
      });

      // Generate QR code buffer
      const qrBuffer = await QRCode.toBuffer(qrData, {
        width: size,
        margin: margin,
        color: {
          dark: color,
          light: backgroundColor
        },
        errorCorrectionLevel: errorCorrectionLevel,
        type: 'image/png'
      });

      // Generate filename
      const filename = `qr_${uniqueToken}_${Date.now()}.${format}`;
      const filepath = path.join(this.uploadPath, filename);

      // Save QR code to file
      await fs.writeFile(filepath, qrBuffer);

      logger.info(`QR code generated successfully: ${filename}`);
      
      return {
        success: true,
        filename,
        filepath,
        url: `/uploads/qr_codes/${filename}`,
        size: qrBuffer.length,
        dimensions: { width: size, height: size }
      };
    } catch (error) {
      logger.error('QR code generation error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Generate QR code for business card
   */
  async generateBusinessCardQR(userId, cardData, options = {}) {
    try {
      const {
        size = 400,
        margin = 3,
        color = '#1a365d',
        backgroundColor = '#FFFFFF',
        errorCorrectionLevel = 'H'
      } = options;

      // Generate QR code data for business card
      const qrData = JSON.stringify({
        type: 'business_card',
        user_id: userId,
        card_data: cardData,
        timestamp: Date.now()
      });

      // Generate QR code buffer
      const qrBuffer = await QRCode.toBuffer(qrData, {
        width: size,
        margin: margin,
        color: {
          dark: color,
          light: backgroundColor
        },
        errorCorrectionLevel: errorCorrectionLevel,
        type: 'image/png'
      });

      // Generate filename
      const filename = `business_card_${userId}_${Date.now()}.png`;
      const filepath = path.join(this.uploadPath, filename);

      // Save QR code to file
      await fs.writeFile(filepath, qrBuffer);

      logger.info(`Business card QR code generated successfully: ${filename}`);
      
      return {
        success: true,
        filename,
        filepath,
        url: `/uploads/qr_codes/${filename}`,
        size: qrBuffer.length,
        dimensions: { width: size, height: size }
      };
    } catch (error) {
      logger.error('Business card QR code generation error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Generate QR code for event
   */
  async generateEventQR(eventId, eventData, options = {}) {
    try {
      const {
        size = 350,
        margin = 2,
        color = '#2563eb',
        backgroundColor = '#FFFFFF',
        errorCorrectionLevel = 'M'
      } = options;

      // Generate QR code data for event
      const qrData = JSON.stringify({
        type: 'event',
        event_id: eventId,
        event_data: eventData,
        timestamp: Date.now()
      });

      // Generate QR code buffer
      const qrBuffer = await QRCode.toBuffer(qrData, {
        width: size,
        margin: margin,
        color: {
          dark: color,
          light: backgroundColor
        },
        errorCorrectionLevel: errorCorrectionLevel,
        type: 'image/png'
      });

      // Generate filename
      const filename = `event_${eventId}_${Date.now()}.png`;
      const filepath = path.join(this.uploadPath, filename);

      // Save QR code to file
      await fs.writeFile(filepath, qrBuffer);

      logger.info(`Event QR code generated successfully: ${filename}`);
      
      return {
        success: true,
        filename,
        filepath,
        url: `/uploads/qr_codes/${filename}`,
        size: qrBuffer.length,
        dimensions: { width: size, height: size }
      };
    } catch (error) {
      logger.error('Event QR code generation error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Generate QR code for service
   */
  async generateServiceQR(serviceId, serviceData, options = {}) {
    try {
      const {
        size = 350,
        margin = 2,
        color = '#059669',
        backgroundColor = '#FFFFFF',
        errorCorrectionLevel = 'M'
      } = options;

      // Generate QR code data for service
      const qrData = JSON.stringify({
        type: 'service',
        service_id: serviceId,
        service_data: serviceData,
        timestamp: Date.now()
      });

      // Generate QR code buffer
      const qrBuffer = await QRCode.toBuffer(qrData, {
        width: size,
        margin: margin,
        color: {
          dark: color,
          light: backgroundColor
        },
        errorCorrectionLevel: errorCorrectionLevel,
        type: 'image/png'
      });

      // Generate filename
      const filename = `service_${serviceId}_${Date.now()}.png`;
      const filepath = path.join(this.uploadPath, filename);

      // Save QR code to file
      await fs.writeFile(filepath, qrBuffer);

      logger.info(`Service QR code generated successfully: ${filename}`);
      
      return {
        success: true,
        filename,
        filepath,
        url: `/uploads/qr_codes/${filename}`,
        size: qrBuffer.length,
        dimensions: { width: size, height: size }
      };
    } catch (error) {
      logger.error('Service QR code generation error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Generate QR code as data URL (for immediate use)
   */
  async generateQRDataURL(data, options = {}) {
    try {
      const {
        size = 200,
        margin = 1,
        color = '#000000',
        backgroundColor = '#FFFFFF',
        errorCorrectionLevel = 'L'
      } = options;

      // Generate QR code as data URL
      const dataURL = await QRCode.toDataURL(data, {
        width: size,
        margin: margin,
        color: {
          dark: color,
          light: backgroundColor
        },
        errorCorrectionLevel: errorCorrectionLevel,
        type: 'image/png'
      });

      logger.debug('QR code data URL generated successfully');
      
      return {
        success: true,
        dataURL,
        dimensions: { width: size, height: size }
      };
    } catch (error) {
      logger.error('QR code data URL generation error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Delete QR code file
   */
  async deleteQRCode(filename) {
    try {
      const filepath = path.join(this.uploadPath, filename);
      
      // Check if file exists
      try {
        await fs.access(filepath);
      } catch (error) {
        logger.warn(`QR code file not found: ${filename}`);
        return { success: false, error: 'File not found' };
      }

      // Delete file
      await fs.unlink(filepath);
      
      logger.info(`QR code file deleted successfully: ${filename}`);
      
      return { success: true };
    } catch (error) {
      logger.error('QR code deletion error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get QR code file info
   */
  async getQRCodeInfo(filename) {
    try {
      const filepath = path.join(this.uploadPath, filename);
      
      // Check if file exists
      try {
        await fs.access(filepath);
      } catch (error) {
        return { success: false, error: 'File not found' };
      }

      // Get file stats
      const stats = await fs.stat(filepath);
      
      return {
        success: true,
        filename,
        filepath,
        url: `/uploads/qr_codes/${filename}`,
        size: stats.size,
        created: stats.birthtime,
        modified: stats.mtime
      };
    } catch (error) {
      logger.error('QR code info retrieval error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Clean up old QR codes
   */
  async cleanupOldQRCodes(maxAge = 30 * 24 * 60 * 60 * 1000) { // 30 days default
    try {
      const files = await fs.readdir(this.uploadPath);
      const now = Date.now();
      let deletedCount = 0;
      
      for (const file of files) {
        if (!file.endsWith('.png') && !file.endsWith('.jpg') && !file.endsWith('.jpeg')) {
          continue;
        }
        
        const filepath = path.join(this.uploadPath, file);
        const stats = await fs.stat(filepath);
        const fileAge = now - stats.mtime.getTime();
        
        if (fileAge > maxAge) {
          await fs.unlink(filepath);
          deletedCount++;
          logger.debug(`Cleaned up old QR code: ${file}`);
        }
      }
      
      logger.info(`QR code cleanup completed. Deleted ${deletedCount} old files.`);
      
      return {
        success: true,
        deletedCount,
        totalFiles: files.length
      };
    } catch (error) {
      logger.error('QR code cleanup error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get service status
   */
  getServiceStatus() {
    return {
      uploadPath: this.uploadPath,
      uploadPathExists: true, // We ensure it exists in constructor
      supportedFormats: ['png', 'jpg', 'jpeg'],
      maxSize: 1000, // Maximum QR code size in pixels
      errorCorrectionLevels: ['L', 'M', 'Q', 'H']
    };
  }
}

// Create and export singleton instance
const qrCodeService = new QRCodeService();

// Clean up old QR codes daily
setInterval(() => {
  qrCodeService.cleanupOldQRCodes();
}, 24 * 60 * 60 * 1000);

module.exports = qrCodeService;
