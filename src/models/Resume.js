'use strict';

const { query } = require('../config/db');
const { idEncode, idDecode } = require('../utils/idCodec');
const { logger } = require('../utils/logger');

class Resume {
  constructor(data = {}) {
    this.resume_id = data.resume_id;
    this.user_id = data.user_id;
    this.resume_title = data.resume_title;
    this.resume_file = data.resume_file;
    this.resume_type = data.resume_type || 'pdf'; // 'pdf', 'doc', 'docx'
    this.file_size = data.file_size;
    this.is_primary = data.is_primary || 0;
    this.status = data.status;
    this.created_dts = data.created_dts;
    this.updated_dts = data.updated_dts;
  }

  // Create new resume
  static async create(resumeData) {
    try {
      // If this is the first resume, make it primary
      if (resumeData.is_primary) {
        await query(
          'UPDATE user_resumes SET is_primary = 0 WHERE user_id = ?',
          [resumeData.user_id]
        );
      }

      const result = await query(
        `INSERT INTO user_resumes (
          user_id, resume_title, resume_file, resume_type, file_size, is_primary, status, created_dts
        ) VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
        [
          resumeData.user_id, resumeData.resume_title, resumeData.resume_file,
          resumeData.resume_type, resumeData.file_size, resumeData.is_primary || 0,
          resumeData.status || 1
        ]
      );

      return result.insertId;
    } catch (error) {
      logger.error('Error creating resume:', error);
      throw error;
    }
  }

  // Find resume by ID
  static async findById(resumeId) {
    try {
      const [resume] = await query(
        'SELECT * FROM user_resumes WHERE resume_id = ? AND status = 1',
        [resumeId]
      );

      return resume ? new Resume(resume) : null;
    } catch (error) {
      logger.error('Error finding resume by ID:', error);
      throw error;
    }
  }

  // Get resumes by user ID
  static async findByUserId(userId) {
    try {
      const resumes = await query(
        'SELECT * FROM user_resumes WHERE user_id = ? AND status = 1 ORDER BY is_primary DESC, created_dts DESC',
        [userId]
      );

      return resumes.map(resume => new Resume(resume));
    } catch (error) {
      logger.error('Error finding resumes by user ID:', error);
      throw error;
    }
  }

  // Get primary resume for a user
  static async getPrimaryResume(userId) {
    try {
      const [resume] = await query(
        'SELECT * FROM user_resumes WHERE user_id = ? AND is_primary = 1 AND status = 1',
        [userId]
      );

      return resume ? new Resume(resume) : null;
    } catch (error) {
      logger.error('Error getting primary resume:', error);
      throw error;
    }
  }

  // Update resume
  async update(updateData) {
    try {
      const result = await query(
        `UPDATE user_resumes SET 
          resume_title = ?, resume_file = ?, resume_type = ?, file_size = ?, updated_dts = NOW()
         WHERE resume_id = ? AND user_id = ?`,
        [
          updateData.resume_title, updateData.resume_file, updateData.resume_type,
          updateData.file_size, this.resume_id, this.user_id
        ]
      );

      if (result.affectedRows > 0) {
        Object.assign(this, updateData);
        this.updated_dts = new Date();
        return true;
      }

      return false;
    } catch (error) {
      logger.error('Error updating resume:', error);
      throw error;
    }
  }

  // Soft delete resume
  async softDelete() {
    try {
      const result = await query(
        'UPDATE user_resumes SET status = 0, updated_dts = NOW() WHERE resume_id = ? AND user_id = ?',
        [this.resume_id, this.user_id]
      );

      if (result.affectedRows > 0) {
        this.status = 0;
        this.updated_dts = new Date();
        return true;
      }

      return false;
    } catch (error) {
      logger.error('Error soft deleting resume:', error);
      throw error;
    }
  }

  // Set resume as primary
  async setAsPrimary() {
    try {
      // First, remove primary status from all other resumes
      await query(
        'UPDATE user_resumes SET is_primary = 0, updated_dts = NOW() WHERE user_id = ? AND resume_id != ?',
        [this.user_id, this.resume_id]
      );

      // Then, set this resume as primary
      const result = await query(
        'UPDATE user_resumes SET is_primary = 1, updated_dts = NOW() WHERE resume_id = ? AND user_id = ?',
        [this.resume_id, this.user_id]
      );

      if (result.affectedRows > 0) {
        this.is_primary = 1;
        this.updated_dts = new Date();
        return true;
      }

      return false;
    } catch (error) {
      logger.error('Error setting resume as primary:', error);
      throw error;
    }
  }

  // Get resume statistics for a user
  static async getResumeStats(userId) {
    try {
      const [stats] = await query(
        `SELECT 
          COUNT(*) AS total_resumes,
          COUNT(CASE WHEN is_primary = 1 THEN 1 END) AS primary_resume,
          COUNT(CASE WHEN resume_type = 'pdf' THEN 1 END) AS pdf_resumes,
          COUNT(CASE WHEN resume_type = 'doc' THEN 1 END) AS doc_resumes,
          COUNT(CASE WHEN resume_type = 'docx' THEN 1 END) AS docx_resumes,
          SUM(file_size) AS total_size
         FROM user_resumes 
         WHERE user_id = ? AND status = 1`,
        [userId]
      );

      return {
        ...stats,
        total_size: stats.total_size || 0
      };
    } catch (error) {
      logger.error('Error getting resume stats:', error);
      throw error;
    }
  }

  // Search resumes
  static async searchResumes(userId, criteria, pagination = { page: 1, limit: 20 }) {
    try {
      const { search, resume_type, is_primary } = criteria;
      const { page, limit } = pagination;
      const offset = (page - 1) * limit;

      let whereClause = 'WHERE user_id = ? AND status = 1';
      let params = [userId];

      if (search) {
        whereClause += ' AND resume_title LIKE ?';
        params.push(`%${search}%`);
      }

      if (resume_type) {
        whereClause += ' AND resume_type = ?';
        params.push(resume_type);
      }

      if (is_primary !== undefined) {
        whereClause += ' AND is_primary = ?';
        params.push(is_primary);
      }

      const [total] = await query(
        `SELECT COUNT(*) AS total FROM user_resumes ${whereClause}`,
        params
      );

      const resumes = await query(
        `SELECT * FROM user_resumes ${whereClause}
         ORDER BY is_primary DESC, created_dts DESC
         LIMIT ? OFFSET ?`,
        [...params, limit, offset]
      );

      return {
        resumes: resumes.map(resume => new Resume(resume)),
        pagination: {
          page,
          limit,
          total: total.total,
          totalPages: Math.ceil(total.total / limit)
        }
      };
    } catch (error) {
      logger.error('Error searching resumes:', error);
      throw error;
    }
  }

  // Get resume by encoded ID
  static async findByEncodedId(encodedId) {
    try {
      const resumeId = idDecode(encodedId);
      if (!resumeId) return null;
      
      return await Resume.findById(resumeId);
    } catch (error) {
      logger.error('Error finding resume by encoded ID:', error);
      throw error;
    }
  }

  // Get encoded resume ID for API responses
  getEncodedId() {
    return idEncode(this.resume_id);
  }

  // Get public resume data (for sharing)
  getPublicData() {
    return {
      resume_id: this.getEncodedId(),
      resume_title: this.resume_title,
      resume_type: this.resume_type,
      file_size: this.file_size,
      is_primary: this.is_primary,
      created_dts: this.created_dts
    };
  }

  // Validate file type
  static validateFileType(fileType) {
    const validTypes = ['pdf', 'doc', 'docx'];
    return validTypes.includes(fileType.toLowerCase());
  }

  // Get file extension
  getFileExtension() {
    return this.resume_type || 'pdf';
  }

  // Get file size in MB
  getFileSizeInMB() {
    if (!this.file_size) return 0;
    return (this.file_size / (1024 * 1024)).toFixed(2);
  }

  // Get file size in KB
  getFileSizeInKB() {
    if (!this.file_size) return 0;
    return (this.file_size / 1024).toFixed(2);
  }

  // Get formatted file size
  getFormattedFileSize() {
    if (!this.file_size) return '0 B';
    
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(this.file_size) / Math.log(1024));
    
    return `${(this.file_size / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`;
  }

  // Check if resume is primary
  isPrimary() {
    return this.is_primary === 1;
  }

  // Get resume icon based on type
  getResumeIcon() {
    const icons = {
      'pdf': '📄',
      'doc': '📝',
      'docx': '📝'
    };
    return icons[this.resume_type] || '📄';
  }

  // Get resume type display name
  getResumeTypeDisplay() {
    const types = {
      'pdf': 'PDF Document',
      'doc': 'Word Document',
      'docx': 'Word Document'
    };
    return types[this.resume_type] || 'Document';
  }

  // Check if user can edit resume
  canEdit(userId) {
    // Users can only edit their own resumes
    return this.user_id === userId;
  }

  // Check if user can delete resume
  canDelete(userId) {
    // Users can only delete their own resumes
    return this.user_id === userId;
  }

  // Get resume download URL
  getDownloadUrl() {
    return `/api/v1/resumes/${this.getEncodedId()}/download`;
  }

  // Get resume preview URL
  getPreviewUrl() {
    if (this.resume_type === 'pdf') {
      return `/api/v1/resumes/${this.getEncodedId()}/preview`;
    }
    return null; // Only PDFs can be previewed
  }
}

module.exports = Resume;
