'use strict';

const Twilio = require('twilio');

function getClient() {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  if (!accountSid || !authToken) return null;
  return Twilio(accountSid, authToken);
}

async function sendOtp(to) {
  const client = getClient();
  if (!client) throw new Error('Twilio not configured');
  const serviceSid = process.env.TWILIO_VERIFY_SERVICE_SID;
  const resp = await client.verify.v2.services(serviceSid).verifications.create({ to, channel: 'sms' });
  return resp.sid;
}

async function verifyOtp(to, verificationSid, code) {
  const client = getClient();
  if (!client) throw new Error('Twilio not configured');
  const serviceSid = process.env.TWILIO_VERIFY_SERVICE_SID;
  // Fetch verification to check status (parity with PHP logic)
  const verification = await client.verify.v2.services(serviceSid).verifications(verificationSid).fetch();
  if (verification.status === 'error') return 'error';
  const check = await client.verify.v2.services(serviceSid).verificationChecks.create({ to, code });
  return check.status;
}

module.exports = { sendOtp, verifyOtp };


