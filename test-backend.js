#!/usr/bin/env node

'use strict';

const http = require('http');

// Test configuration
const TEST_CONFIG = {
  host: 'localhost',
  port: 3000,
  timeout: 5000
};

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

// Console logging functions
const log = {
  info: (msg) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
  success: (msg) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
  warning: (msg) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}✗${colors.reset} ${msg}`),
  header: (msg) => console.log(`\n${colors.cyan}${msg}${colors.reset}`)
};

// Test endpoints
const TEST_ENDPOINTS = [
  { path: '/health', name: 'Health Check', method: 'GET' },
  { path: '/version', name: 'API Version', method: 'GET' },
  { path: '/api/v1/auth', name: 'Auth API', method: 'GET' },
  { path: '/api/v1/users', name: 'Users API', method: 'GET' },
  { path: '/api/v1/jobs', name: 'Jobs API', method: 'GET' },
  { path: '/api/v1/events', name: 'Events API', method: 'GET' },
  { path: '/api/v1/chat', name: 'Chat API', method: 'GET' },
  { path: '/api/v1/admin', name: 'Admin API', method: 'GET' },
  { path: '/api/v1/search', name: 'Search API', method: 'GET' },
  { path: '/api/v1/analytics', name: 'Analytics API', method: 'GET' },
  { path: '/api/v1/payments', name: 'Payments API', method: 'GET' },
  { path: '/api/v1/business-cards', name: 'Business Cards API', method: 'GET' },
  { path: '/api/v1/unlocks', name: 'Unlocks API', method: 'GET' },
  { path: '/api/v1/contacts', name: 'Contacts API', method: 'GET' },
  { path: '/api/v1/master-data', name: 'Master Data API', method: 'GET' }
];

// Test a single endpoint
function testEndpoint(endpoint) {
  return new Promise((resolve) => {
    const options = {
      hostname: TEST_CONFIG.host,
      port: TEST_CONFIG.port,
      path: endpoint.path,
      method: endpoint.method,
      timeout: TEST_CONFIG.timeout
    };

    const req = http.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          
          if (res.statusCode === 200 || res.statusCode === 401) {
            // 401 is expected for protected endpoints without auth
            log.success(`${endpoint.name}: ${res.statusCode} - ${response.message || 'OK'}`);
            resolve({ success: true, statusCode: res.statusCode, response });
          } else if (res.statusCode === 404) {
            log.warning(`${endpoint.name}: ${res.statusCode} - Not Found`);
            resolve({ success: false, statusCode: res.statusCode, response });
          } else {
            log.error(`${endpoint.name}: ${res.statusCode} - ${response.message || 'Error'}`);
            resolve({ success: false, statusCode: res.statusCode, response });
          }
        } catch (parseError) {
          log.error(`${endpoint.name}: Failed to parse response`);
          resolve({ success: false, statusCode: res.statusCode, error: parseError.message });
        }
      });
    });

    req.on('error', (error) => {
      log.error(`${endpoint.name}: ${error.message}`);
      resolve({ success: false, error: error.message });
    });

    req.on('timeout', () => {
      log.error(`${endpoint.name}: Request timeout`);
      req.destroy();
      resolve({ success: false, error: 'Request timeout' });
    });

    req.end();
  });
}

// Run all tests
async function runTests() {
  log.header('🧪 Testing AlphaLinkup NodeJS Backend');
  log.info(`Testing endpoints on ${TEST_CONFIG.host}:${TEST_CONFIG.port}`);
  
  const results = [];
  
  for (const endpoint of TEST_ENDPOINTS) {
    const result = await testEndpoint(endpoint);
    results.push({
      name: endpoint.name,
      path: endpoint.path,
      ...result
    });
    
    // Small delay between requests
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  // Summary
  log.header('📊 Test Results Summary');
  
  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  const total = results.length;
  
  log.info(`Total endpoints tested: ${total}`);
  log.success(`Successful: ${successful}`);
  
  if (failed > 0) {
    log.error(`Failed: ${failed}`);
    
    log.header('❌ Failed Endpoints:');
    results.filter(r => !r.success).forEach(result => {
      log.error(`${result.name} (${result.path}): ${result.error || result.statusCode}`);
    });
  } else {
    log.success('🎉 All endpoints are working correctly!');
  }
  
  // Health check details
  const healthResult = results.find(r => r.path === '/health');
  if (healthResult && healthResult.success) {
    log.header('🏥 Health Check Details');
    log.info(`Status: ${healthResult.response.status}`);
    log.info(`Message: ${healthResult.response.message}`);
    log.info(`Version: ${healthResult.response.version}`);
    log.info(`Environment: ${healthResult.response.environment}`);
    log.info(`Uptime: ${Math.round(healthResult.response.uptime)}s`);
  }
  
  // API version details
  const versionResult = results.find(r => r.path === '/version');
  if (versionResult && versionResult.success) {
    log.header('📋 API Version Details');
    log.info(`Version: ${versionResult.response.version}`);
    log.info(`Status: ${versionResult.response.status}`);
    log.info(`Last Updated: ${versionResult.response.lastUpdated}`);
    log.info(`Features: ${versionResult.response.features.length} available`);
  }
  
  log.header('🚀 Backend Testing Complete');
  
  if (failed === 0) {
    log.success('Your AlphaLinkup NodeJS Backend is ready for production! 🎯');
  } else {
    log.warning('Some endpoints need attention. Check the logs above for details.');
  }
}

// Check if server is running
function checkServerStatus() {
  return new Promise((resolve) => {
    const req = http.request({
      hostname: TEST_CONFIG.host,
      port: TEST_CONFIG.port,
      path: '/health',
      method: 'GET',
      timeout: 2000
    }, (res) => {
      resolve(true);
    });
    
    req.on('error', () => {
      resolve(false);
    });
    
    req.on('timeout', () => {
      req.destroy();
      resolve(false);
    });
    
    req.end();
  });
}

// Main execution
async function main() {
  log.header('🔍 Checking Server Status');
  
  const isRunning = await checkServerStatus();
  
  if (!isRunning) {
    log.error('❌ Server is not running!');
    log.info('Please start the server first:');
    log.info('  npm run dev');
    log.info('  npm start');
    log.info('  node start.js');
    process.exit(1);
  }
  
  log.success('✅ Server is running');
  
  // Run tests
  await runTests();
}

// Run if called directly
if (require.main === module) {
  main().catch(error => {
    log.error('Test execution failed:', error.message);
    process.exit(1);
  });
}

module.exports = { testEndpoint, runTests, checkServerStatus };
