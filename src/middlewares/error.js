'use strict';

const { logger } = require('../utils/logger');
const { errorResponse, notFound } = require('../utils/response');

function notFoundHandler(req, res) {
  return notFound(res, 'Route not found');
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  logger.error('Unhandled error: %o', err);
  return errorResponse(res, 'Internal Server Error', 500);
}

module.exports = { notFoundHandler, errorHandler };


