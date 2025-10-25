'use strict';

const nodemailer = require('nodemailer');

function getTransporter() {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 465);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const secure = String(process.env.SMTP_SECURE || 'true') === 'true';
  if (!host || !user || !pass) return null;
  return nodemailer.createTransport({ host, port, secure, auth: { user, pass } });
}

async function sendEmail({ subject, html, to, name }) {
  const tx = getTransporter();
  if (!tx) return; // mimic PHP silent failure
  const fromName = process.env.EMAIL_FROM_NAME || 'AlphaLinkup';
  await tx.sendMail({ from: `${fromName} <${process.env.SMTP_USER}>`, to, subject, html });
}

module.exports = { sendEmail };


