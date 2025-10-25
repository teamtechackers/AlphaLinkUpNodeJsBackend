'use strict';

const mysql = require('mysql2/promise');
const { logger } = require('../utils/logger');

const pool = mysql.createPool({
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASS || '',
  database: process.env.DB_NAME || 'alphalinkup',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  dateStrings: true,
  multipleStatements: false
});

async function query(sql, params) {
  const start = Date.now();
  const [rows] = await pool.query(sql, params);
  const ms = Date.now() - start;
  logger.debug(`SQL ${ms}ms: ${sql} ${params ? JSON.stringify(params) : ''}`);
  return rows;
}

module.exports = { pool, query };


