'use strict';

const multer = require('multer');
const sharp = require('sharp');
const fs = require('fs').promises;
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { logger } = require('../utils/logger');

class FileService {
  constructor() {
    this.uploadPath = process.env.UPLOAD_PATH || 'uploads';
    this.maxFileSize = parseInt(process.env.UPLOAD_MAX_SIZE) || 10 * 1024 * 1024; // 10MB
    this.allowedImageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    this.allowedDocumentTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain'
    ];
    this.initializeUploadDirectory();
  }

  // Initialize upload directory
  async initializeUploadDirectory() {
    try {
      await fs.mkdir(this.uploadPath, { recursive: true });
      await fs.mkdir(path.join(this.uploadPath, 'images'), { recursive: true });
      await fs.mkdir(path.join(this.uploadPath, 'documents'), { recursive: true });
      await fs.mkdir(path.join(this.uploadPath, 'resumes'), { recursive: true });
      await fs.mkdir(path.join(this.uploadPath, 'temp'), { recursive: true });
      logger.info('Upload directories initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize upload directories:', error);
    }
  }

  // Configure multer storage
  getStorageConfig() {
    return multer.diskStorage({
      destination: (req, file, cb) => {
        const uploadType = this.getUploadType(file);
        const uploadDir = path.join(this.uploadPath, uploadType);
        cb(null, uploadDir);
      },
      filename: (req, file, cb) => {
        const uniqueName = this.generateUniqueFilename(file);
        cb(null, uniqueName);
      }
    });
  }

  // Get upload type based on file
  getUploadType(file) {
    if (this.allowedImageTypes.includes(file.mimetype)) {
      return 'images';
    } else if (this.allowedDocumentTypes.includes(file.mimetype)) {
      return 'documents';
    } else if (file.fieldname === 'resume') {
      return 'resumes';
    } else {
      return 'temp';
    }
  }

  // Generate unique filename
  generateUniqueFilename(file) {
    const timestamp = Date.now();
    const randomString = uuidv4().substring(0, 8);
    const extension = path.extname(file.originalname);
    const baseName = path.basename(file.originalname, extension);
    
    return `${baseName}_${timestamp}_${randomString}${extension}`;
  }

  // Get multer configuration
  getMulterConfig() {
    return {
      storage: this.getStorageConfig(),
      limits: {
        fileSize: this.maxFileSize,
        files: 10 // Maximum 10 files per request
      },
      fileFilter: (req, file, cb) => {
        if (this.isFileAllowed(file)) {
          cb(null, true);
        } else {
          cb(new Error(`File type ${file.mimetype} is not allowed`), false);
        }
      }
    };
  }

  // Check if file type is allowed
  isFileAllowed(file) {
    const allowedTypes = [
      ...this.allowedImageTypes,
      ...this.allowedDocumentTypes
    ];
    return allowedTypes.includes(file.mimetype);
  }

  // Upload single file
  async uploadSingleFile(file, options = {}) {
    try {
      if (!file) {
        throw new Error('No file provided');
      }

      // Validate file
      const validationResult = await this.validateFile(file);
      if (!validationResult.isValid) {
        throw new Error(validationResult.error);
      }

      // Process file based on type
      let processedFile = file;
      if (this.allowedImageTypes.includes(file.mimetype)) {
        processedFile = await this.processImage(file, options);
      }

      // Generate file metadata
      const fileMetadata = await this.generateFileMetadata(processedFile);

      // Save file info to database (if needed)
      // await this.saveFileInfo(fileMetadata);

      return fileMetadata;
    } catch (error) {
      logger.error('Error uploading single file:', error);
      throw error;
    }
  }

  // Upload multiple files
  async uploadMultipleFiles(files, options = {}) {
    try {
      if (!files || files.length === 0) {
        throw new Error('No files provided');
      }

      const uploadedFiles = [];
      const errors = [];

      for (const file of files) {
        try {
          const uploadedFile = await this.uploadSingleFile(file, options);
          uploadedFiles.push(uploadedFile);
        } catch (error) {
          errors.push({
            filename: file.originalname,
            error: error.message
          });
        }
      }

      return {
        successful: uploadedFiles,
        failed: errors,
        total: files.length,
        successfulCount: uploadedFiles.length,
        failedCount: errors.length
      };
    } catch (error) {
      logger.error('Error uploading multiple files:', error);
      throw error;
    }
  }

  // Process image file
  async processImage(file, options = {}) {
    try {
      const {
        resize = true,
        maxWidth = 1920,
        maxHeight = 1080,
        quality = 80,
        format = 'jpeg',
        createThumbnail = true,
        thumbnailSize = 300
      } = options;

      const imagePath = file.path;
      let processedImage = sharp(imagePath);

      // Resize image if requested
      if (resize) {
        processedImage = processedImage.resize(maxWidth, maxHeight, {
          fit: 'inside',
          withoutEnlargement: true
        });
      }

      // Set quality and format
      if (format === 'jpeg' || format === 'jpg') {
        processedImage = processedImage.jpeg({ quality });
      } else if (format === 'png') {
        processedImage = processedImage.png({ quality });
      } else if (format === 'webp') {
        processedImage = processedImage.webp({ quality });
      }

      // Generate new filename
      const newFilename = this.generateProcessedImageFilename(file.filename, format);
      const newPath = path.join(path.dirname(imagePath), newFilename);

      // Save processed image
      await processedImage.toFile(newPath);

      // Create thumbnail if requested
      let thumbnailPath = null;
      if (createThumbnail) {
        thumbnailPath = await this.createThumbnail(newPath, thumbnailSize);
      }

      // Update file object
      const processedFile = {
        ...file,
        filename: newFilename,
        path: newPath,
        thumbnailPath,
        processed: true
      };

      // Clean up original file
      await this.cleanupFile(imagePath);

      return processedFile;
    } catch (error) {
      logger.error('Error processing image:', error);
      throw error;
    }
  }

  // Create thumbnail
  async createThumbnail(imagePath, size = 300) {
    try {
      const thumbnailFilename = `thumb_${path.basename(imagePath)}`;
      const thumbnailPath = path.join(path.dirname(imagePath), thumbnailFilename);

      await sharp(imagePath)
        .resize(size, size, {
          fit: 'cover',
          position: 'center'
        })
        .jpeg({ quality: 80 })
        .toFile(thumbnailPath);

      return thumbnailPath;
    } catch (error) {
      logger.error('Error creating thumbnail:', error);
      throw error;
    }
  }

  // Generate processed image filename
  generateProcessedImageFilename(originalFilename, format) {
    const baseName = path.basename(originalFilename, path.extname(originalFilename));
    return `${baseName}_processed.${format}`;
  }

  // Validate file
  async validateFile(file) {
    try {
      // Check file size
      if (file.size > this.maxFileSize) {
        return {
          isValid: false,
          error: `File size ${file.size} exceeds maximum allowed size ${this.maxFileSize}`
        };
      }

      // Check file type
      if (!this.isFileAllowed(file)) {
        return {
          isValid: false,
          error: `File type ${file.mimetype} is not allowed`
        };
      }

      // Check if file exists and is readable
      try {
        await fs.access(file.path, fs.constants.R_OK);
      } catch (error) {
        return {
          isValid: false,
          error: 'File is not readable'
        };
      }

      return { isValid: true };
    } catch (error) {
      logger.error('Error validating file:', error);
      return {
        isValid: false,
        error: 'File validation failed'
      };
    }
  }

  // Generate file metadata
  async generateFileMetadata(file) {
    try {
      const stats = await fs.stat(file.path);
      
      return {
        originalName: file.originalname,
        filename: file.filename,
        path: file.path,
        thumbnailPath: file.thumbnailPath || null,
        size: file.size,
        mimetype: file.mimetype,
        uploadType: this.getUploadType(file),
        processed: file.processed || false,
        uploadDate: new Date(),
        fileStats: {
          size: stats.size,
          created: stats.birthtime,
          modified: stats.mtime
        }
      };
    } catch (error) {
      logger.error('Error generating file metadata:', error);
      throw error;
    }
  }

  // Delete file
  async deleteFile(filePath) {
    try {
      // Check if file exists
      try {
        await fs.access(filePath, fs.constants.F_OK);
      } catch (error) {
        return { message: 'File does not exist', deleted: false };
      }

      // Delete file
      await fs.unlink(filePath);

      // Delete thumbnail if exists
      const thumbnailPath = this.getThumbnailPath(filePath);
      try {
        await fs.access(thumbnailPath, fs.constants.F_OK);
        await fs.unlink(thumbnailPath);
      } catch (error) {
        // Thumbnail doesn't exist, ignore
      }

      logger.info(`File deleted successfully: ${filePath}`);
      return { message: 'File deleted successfully', deleted: true };
    } catch (error) {
      logger.error('Error deleting file:', error);
      throw error;
    }
  }

  // Get thumbnail path
  getThumbnailPath(filePath) {
    const dir = path.dirname(filePath);
    const filename = path.basename(filePath);
    return path.join(dir, `thumb_${filename}`);
  }

  // Clean up temporary files
  async cleanupTempFiles(maxAge = 24 * 60 * 60 * 1000) { // 24 hours
    try {
      const tempDir = path.join(this.uploadPath, 'temp');
      const files = await fs.readdir(tempDir);
      const now = Date.now();
      let cleanedCount = 0;

      for (const file of files) {
        const filePath = path.join(tempDir, file);
        try {
          const stats = await fs.stat(filePath);
          const age = now - stats.mtime.getTime();

          if (age > maxAge) {
            await fs.unlink(filePath);
            cleanedCount++;
          }
        } catch (error) {
          logger.warn(`Failed to process temp file ${file}:`, error);
        }
      }

      logger.info(`Cleaned up ${cleanedCount} temporary files`);
      return { cleanedCount, message: 'Temporary files cleaned up successfully' };
    } catch (error) {
      logger.error('Error cleaning up temporary files:', error);
      throw error;
    }
  }

  // Get file info
  async getFileInfo(filePath) {
    try {
      const stats = await fs.stat(filePath);
      const ext = path.extname(filePath).toLowerCase();
      
      return {
        path: filePath,
        filename: path.basename(filePath),
        size: stats.size,
        created: stats.birthtime,
        modified: stats.mtime,
        extension: ext,
        isImage: this.allowedImageTypes.includes(`image/${ext.substring(1)}`),
        isDocument: this.allowedDocumentTypes.includes(`application/${ext.substring(1)}`)
      };
    } catch (error) {
      logger.error('Error getting file info:', error);
      throw error;
    }
  }

  // Check disk space
  async checkDiskSpace() {
    try {
      // This is a simplified check - in production you'd use a proper disk space checking library
      const stats = await fs.stat(this.uploadPath);
      return {
        path: this.uploadPath,
        available: true, // Simplified - would check actual available space
        message: 'Disk space check completed'
      };
    } catch (error) {
      logger.error('Error checking disk space:', error);
      throw error;
    }
  }

  // Move file
  async moveFile(sourcePath, destinationPath) {
    try {
      // Ensure destination directory exists
      const destDir = path.dirname(destinationPath);
      await fs.mkdir(destDir, { recursive: true });

      // Move file
      await fs.rename(sourcePath, destinationPath);

      // Move thumbnail if exists
      const sourceThumbnail = this.getThumbnailPath(sourcePath);
      const destThumbnail = this.getThumbnailPath(destinationPath);
      
      try {
        await fs.access(sourceThumbnail, fs.constants.F_OK);
        await fs.rename(sourceThumbnail, destThumbnail);
      } catch (error) {
        // Thumbnail doesn't exist, ignore
      }

      logger.info(`File moved successfully: ${sourcePath} -> ${destinationPath}`);
      return { message: 'File moved successfully', newPath: destinationPath };
    } catch (error) {
      logger.error('Error moving file:', error);
      throw error;
    }
  }

  // Copy file
  async copyFile(sourcePath, destinationPath) {
    try {
      // Ensure destination directory exists
      const destDir = path.dirname(destinationPath);
      await fs.mkdir(destDir, { recursive: true });

      // Copy file
      await fs.copyFile(sourcePath, destinationPath);

      // Copy thumbnail if exists
      const sourceThumbnail = this.getThumbnailPath(sourcePath);
      const destThumbnail = this.getThumbnailPath(destinationPath);
      
      try {
        await fs.access(sourceThumbnail, fs.constants.F_OK);
        await fs.copyFile(sourceThumbnail, destThumbnail);
      } catch (error) {
        // Thumbnail doesn't exist, ignore
      }

      logger.info(`File copied successfully: ${sourcePath} -> ${destinationPath}`);
      return { message: 'File copied successfully', newPath: destinationPath };
    } catch (error) {
      logger.error('Error copying file:', error);
      throw error;
    }
  }

  // Get file URL
  getFileURL(filePath, baseURL = process.env.BASE_URL || 'http://localhost:3000') {
    try {
      const relativePath = path.relative(this.uploadPath, filePath);
      return `${baseURL}/uploads/${relativePath}`;
    } catch (error) {
      logger.error('Error generating file URL:', error);
      throw error;
    }
  }

  // Get thumbnail URL
  getThumbnailURL(filePath, baseURL = process.env.BASE_URL || 'http://localhost:3000') {
    try {
      const thumbnailPath = this.getThumbnailPath(filePath);
      const relativePath = path.relative(this.uploadPath, thumbnailPath);
      return `${baseURL}/uploads/${relativePath}`;
    } catch (error) {
      logger.error('Error generating thumbnail URL:', error);
      throw error;
    }
  }

  // Validate file upload request
  validateUploadRequest(files, maxFiles = 10) {
    const errors = [];

    if (!files || files.length === 0) {
      errors.push('No files provided');
    }

    if (files && files.length > maxFiles) {
      errors.push(`Maximum ${maxFiles} files allowed per request`);
    }

    if (files) {
      for (const file of files) {
        if (!this.isFileAllowed(file)) {
          errors.push(`File type ${file.mimetype} is not allowed`);
        }

        if (file.size > this.maxFileSize) {
          errors.push(`File ${file.originalname} exceeds maximum size limit`);
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // Get upload statistics
  async getUploadStats() {
    try {
      const stats = {
        totalFiles: 0,
        totalSize: 0,
        byType: {},
        byDate: {}
      };

      const directories = ['images', 'documents', 'resumes', 'temp'];
      
      for (const dir of directories) {
        const dirPath = path.join(this.uploadPath, dir);
        try {
          const files = await fs.readdir(dirPath);
          stats.totalFiles += files.length;
          
          for (const file of files) {
            const filePath = path.join(dirPath, file);
            try {
              const fileStats = await fs.stat(filePath);
              stats.totalSize += fileStats.size;
              
              // Count by type
              const ext = path.extname(file).toLowerCase();
              stats.byType[ext] = (stats.byType[ext] || 0) + 1;
              
              // Count by date (last 30 days)
              const daysAgo = Math.floor((Date.now() - fileStats.mtime.getTime()) / (1000 * 60 * 60 * 24));
              if (daysAgo <= 30) {
                stats.byDate[daysAgo] = (stats.byDate[daysAgo] || 0) + 1;
              }
            } catch (error) {
              logger.warn(`Failed to get stats for file ${file}:`, error);
            }
          }
        } catch (error) {
          logger.warn(`Failed to read directory ${dir}:`, error);
        }
      }

      return stats;
    } catch (error) {
      logger.error('Error getting upload statistics:', error);
      throw error;
    }
  }
}

// Create singleton instance
const fileService = new FileService();

// Export both the class and the singleton instance
module.exports = {
  FileService,
  uploadSingleFile: (file, options) => fileService.uploadSingleFile(file, options),
  uploadMultipleFiles: (files, options) => fileService.uploadMultipleFiles(files, options),
  deleteFile: (filePath) => fileService.deleteFile(filePath),
  getFileInfo: (filePath) => fileService.getFileInfo(filePath),
  getMulterConfig: () => fileService.getMulterConfig(),
  getFileURL: (filePath, baseURL) => fileService.getFileURL(filePath, baseURL),
  getThumbnailURL: (filePath, baseURL) => fileService.getThumbnailURL(filePath, baseURL),
  validateUploadRequest: (files, maxFiles) => fileService.validateUploadRequest(files, maxFiles),
  cleanupTempFiles: (maxAge) => fileService.cleanupTempFiles(maxAge),
  getUploadStats: () => fileService.getUploadStats()
};
