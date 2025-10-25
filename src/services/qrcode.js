'use strict';

const path = require('path');
const fs = require('fs');
const QRCode = require('qrcode');

async function ensureDir(dir) {
  await fs.promises.mkdir(dir, { recursive: true });
}

async function generateToFile(data, filename) {
  const outDir = path.join(process.cwd(), 'AlphaLinkup_PHP_Backend', 'uploads', 'qr_codes');
  await ensureDir(outDir);
  const outPath = path.join(outDir, filename);
  await QRCode.toFile(outPath, data, { width: 300, margin: 2 });
  return outPath;
}

module.exports = { generateToFile };


