'use strict';

function idEncode(id) {
  try {
    // Simple base64 encoding with URL-safe characters
    const base64 = Buffer.from(String(id), 'utf8').toString('base64');
    // Replace + with - and / with _ to make it URL-safe
    return base64.replace(/\+/g, '-').replace(/\//g, '_');
  } catch (e) {
    return '';
  }
}

function idDecode(encoded) {
  try {
    // Replace URL-safe characters back to standard base64
    const base64 = encoded.replace(/-/g, '+').replace(/_/g, '/');
    // Decode from base64
    const decoded = Buffer.from(base64, 'base64').toString('utf8');
    return decoded;
  } catch (e) {
    return '';
  }
}

module.exports = { idEncode, idDecode };


