'use strict';

const path = require('path');
const fs = require('fs');
const multer = require('multer');

/**
 * Ensures a directory exists synchronously
 * @param {string} dir Directory path
 */
function ensureDirSync(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

/**
 * Creates a multer disk storage configuration for a given subdirectory
 * @param {string} subdir Directory under uploads/
 * @returns {object} Multer disk storage config
 */
function storageFor(subdir) {
  const base = path.join(__dirname, '../../uploads', subdir);
  ensureDirSync(base);
  return multer.diskStorage({
    destination: function (req, file, cb) {
      console.log('Multer - Destination for:', file.fieldname, 'Target:', base);
      cb(null, base);
    },
    filename: function (req, file, cb) {
      const ext = path.extname(file.originalname) || '';
      const name = path.basename(file.originalname, ext).replace(/\s+/g, '_').slice(0, 40);
      const newName = `${name}_${Date.now()}${ext}`;
      cb(null, newName);
    }
  });
}

// Export various upload middlewares
const uploadProjectLogo = multer({ storage: storageFor('project_logo') });
const uploadEvents = multer({ storage: storageFor('events') });
const uploadServices = multer({ storage: storageFor('services') });
const uploadVisitingCards = multer({ storage: storageFor('visiting_cards') });
const uploadProfilePhoto = multer({ storage: storageFor('profiles') });
const uploadResume = multer({ storage: storageFor('resumes') });
const uploadInvestor = multer({ storage: storageFor('investors') });
const uploadBusinessDocs = multer({ storage: storageFor('business_documents') });
const uploadBusinessCards = multer({ storage: storageFor('business_cards') });
const uploadFormData = multer();

module.exports = {
  uploadProjectLogo,
  uploadEvents,
  uploadServices,
  uploadVisitingCards,
  uploadProfilePhoto,
  uploadResume,
  uploadInvestor,
  uploadBusinessDocs,
  uploadBusinessCards,
  uploadFormData
};
