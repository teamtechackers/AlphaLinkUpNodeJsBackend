'use strict';

const path = require('path');
const fs = require('fs');
const multer = require('multer');

function ensureDirSync(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function storageFor(subdir) {
  const base = path.join(process.cwd(), 'AlphaLinkup_PHP_Backend', 'uploads', subdir);
  ensureDirSync(base);
  return multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, base);
    },
    filename: function (req, file, cb) {
      const ext = path.extname(file.originalname) || '';
      const name = path.basename(file.originalname, ext).replace(/\s+/g, '_').slice(0, 40);
      cb(null, `${name}_${Date.now()}${ext}`);
    }
  });
}

const uploadProjectLogo = multer({ storage: storageFor('project_logo') });
const uploadEvents = multer({ storage: storageFor('events') });
const uploadServices = multer({ storage: storageFor('services') });
const uploadVisitingCards = multer({ storage: storageFor('visting_cards') });

module.exports = { uploadProjectLogo, uploadEvents, uploadServices, uploadVisitingCards };


