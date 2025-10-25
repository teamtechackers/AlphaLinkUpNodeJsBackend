'use strict';

const { query } = require('../config/db');
const { idDecode } = require('../utils/idCodec');
const { fail } = require('../utils/response');

// Mirrors PHP Api::checkUserId behavior
async function checkUser(req, res, next) {
  const userIdParam = (req.body.user_id || req.query.user_id || '').toString();
  if (userIdParam === '') {
    return fail(res, 500, 'Not A Valid User');
  }
  if (userIdParam === '0') {
    req.user = { id: 0 };
    return next();
  }
  const decoded = idDecode(userIdParam);
  if (!decoded) return fail(res, 500, 'Not A Valid User');
  const rows = await query('SELECT * FROM users WHERE user_id = ?', [decoded]);
  if (!rows || rows.length === 0) return fail(res, 500, 'Not A Valid User');
  req.user = { id: Number(decoded), details: rows[0] };
  return next();
}

module.exports = { checkUser };


