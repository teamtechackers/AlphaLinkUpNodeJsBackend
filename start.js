#!/usr/bin/env node

'use strict';

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

// Console logging functions
const log = {
  info: (msg) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
  success: (msg) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
  warning: (msg) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}✗${colors.reset} ${msg}`),
  header: (msg) => console.log(`\n${colors.bright}${colors.cyan}${msg}${colors.reset}`),
  section: (msg) => console.log(`\n${colors.cyan}${msg}${colors.reset}`)
};

// Check if .env file exists
const envPath = path.join(__dirname, '.env');
if (!fs.existsSync(envPath)) {
  log.warning('.env file not found. Creating from .env.example...');
  const envExamplePath = path.join(__dirname, 'env.example');
  if (fs.existsSync(envExamplePath)) {
    fs.copyFileSync(envExamplePath, envPath);
    log.success('.env file created from .env.example');
  } else {
    log.error('.env.example file not found. Please create a .env file manually.');
    process.exit(1);
  }
}

// Check if node_modules exists
const nodeModulesPath = path.join(__dirname, 'node_modules');
if (!fs.existsSync(nodeModulesPath)) {
  log.warning('node_modules not found. Installing dependencies...');
  const installProcess = spawn('npm', ['install'], { 
    stdio: 'inherit', 
    cwd: __dirname 
  });
  
  installProcess.on('close', (code) => {
    if (code === 0) {
      log.success('Dependencies installed successfully');
      startServer();
    } else {
      log.error('Failed to install dependencies');
      process.exit(1);
    }
  });
} else {
  startServer();
}

function startServer() {
  log.header('🚀 AlphaLinkup NodeJS Backend');
  log.info('Starting development server...');
  
  // Check if database is accessible
  log.section('Database Connection');
  const dbCheckProcess = spawn('node', ['-e', `
    const db = require('./src/config/db');
    db.query('SELECT 1')
      .then(() => {
        console.log('Database connection successful');
        process.exit(0);
      })
      .catch(err => {
        console.error('Database connection failed:', err.message);
        process.exit(1);
      });
  `], { stdio: 'inherit', cwd: __dirname });
  
  dbCheckProcess.on('close', (code) => {
    if (code === 0) {
      log.success('Database connection verified');
      startApplication();
    } else {
      log.warning('Database connection failed. Starting server anyway...');
      startApplication();
    }
  });
}

function startApplication() {
  log.section('Starting Application');
  
  // Set development environment
  process.env.NODE_ENV = 'development';
  
  // Start the server
  const serverProcess = spawn('node', ['src/server.js'], { 
    stdio: 'inherit', 
    cwd: __dirname 
  });
  
  serverProcess.on('close', (code) => {
    if (code === 0) {
      log.success('Server stopped gracefully');
    } else {
      log.error(`Server stopped with code ${code}`);
    }
  });
  
  // Handle process termination
  process.on('SIGINT', () => {
    log.info('Shutting down...');
    serverProcess.kill('SIGINT');
    process.exit(0);
  });
  
  process.on('SIGTERM', () => {
    log.info('Shutting down...');
    serverProcess.kill('SIGTERM');
    process.exit(0);
  });
  
  log.success('Development server started!');
  log.info('Press Ctrl+C to stop the server');
  log.info('');
  log.info('Available endpoints:');
  log.info('  Health check: http://localhost:3000/health');
  log.info('  API version: http://localhost:3000/version');
  log.info('  API docs: http://localhost:3000/api/v1');
}

// Display help information
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  log.header('AlphaLinkup NodeJS Backend - Startup Script');
  log.info('Usage: node start.js [options]');
  log.info('');
  log.info('Options:');
  log.info('  --help, -h     Show this help message');
  log.info('  --version, -v  Show version information');
  log.info('');
  log.info('This script will:');
  log.info('  1. Check for .env file and create if needed');
  log.info('  2. Install dependencies if node_modules is missing');
  log.info('  3. Verify database connection');
  log.info('  4. Start the development server');
  log.info('');
  log.info('Environment variables:');
  log.info('  NODE_ENV       Set to "development" automatically');
  log.info('  PORT           Server port (default: 3000)');
  log.info('  DB_HOST        Database host');
  log.info('  DB_USER        Database username');
  log.info('  DB_PASSWORD    Database password');
  log.info('  DB_NAME        Database name');
  process.exit(0);
}

if (process.argv.includes('--version') || process.argv.includes('-v')) {
  const packageJson = require('./package.json');
  log.info(`Version: ${packageJson.version}`);
  process.exit(0);
}
