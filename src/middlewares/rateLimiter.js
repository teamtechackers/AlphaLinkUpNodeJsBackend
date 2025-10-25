'use strict';

const { 
  apiLimiter, 
  authLimiter, 
  uploadLimiter, 
  otpLimiter,
  searchLimiter,
  paymentLimiter,
  speedLimiter,
  dynamicLimiter
} = require('./rateLimit');

module.exports = {
  general: apiLimiter,
  auth: authLimiter,
  upload: uploadLimiter,
  otp: otpLimiter,
  search: searchLimiter,
  payment: paymentLimiter,
  dynamic: dynamicLimiter,
  speed: speedLimiter
};
