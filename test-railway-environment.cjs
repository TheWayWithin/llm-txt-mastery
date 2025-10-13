#!/usr/bin/env node

/**
 * Test Railway environment configuration
 */

const https = require('https');
const { URL } = require('url');

const BACKEND_URL = 'https://llm-txt-mastery-production.up.railway.app';

function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    
    const requestOptions = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || 443,
      path: parsedUrl.pathname + parsedUrl.search,
      method: options.method || 'GET',
      headers: options.headers || {}
    };

    const req = https.request(requestOptions, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          data: data
        });
      });
    });

    req.on('error', reject);
    
    if (options.body) {
      req.write(options.body);
    }
    
    req.end();
  });
}

async function checkRailwayEnvironment() {
  console.log('🚂 Testing Railway Environment Configuration...');
  
  try {
    // Test health endpoint to see environment info
    const healthResponse = await makeRequest(`${BACKEND_URL}/health`);
    console.log(`\n📊 Health Status: ${healthResponse.statusCode}`);
    
    if (healthResponse.statusCode === 200) {
      try {
        const healthData = JSON.parse(healthResponse.data);
        console.log('\n🔍 Environment Data:');
        console.log(`  Environment: ${healthData.environment || 'NOT SET'}`);
        console.log(`  Version: ${healthData.version || 'NOT SET'}`);
        console.log(`  Message: ${healthData.message || 'NOT SET'}`);
        
        if (healthData.environment) {
          if (healthData.environment === 'development') {
            console.log('\n🚨 CRITICAL: Railway is running in DEVELOPMENT mode!');
            console.log('   This explains why security headers are missing.');
            console.log('   Security middleware only applies in production mode.');
          } else if (healthData.environment === 'production') {
            console.log('\n✅ Railway is correctly set to PRODUCTION mode');
            console.log('   Security headers should be present but are missing');
            console.log('   This suggests a middleware configuration issue');
          }
        }
        
      } catch (parseError) {
        console.log('\n⚠️ Could not parse health response as JSON');
        console.log('Raw response:', healthResponse.data.substring(0, 200));
      }
    }
    
    // Test a few other endpoints to understand the deployment
    console.log('\n🔗 Testing Other Endpoints...');
    
    try {
      const apiHealthResponse = await makeRequest(`${BACKEND_URL}/api/health`);
      console.log(`  /api/health: ${apiHealthResponse.statusCode}`);
    } catch (e) {
      console.log(`  /api/health: ERROR - ${e.message}`);
    }
    
    try {
      const rootResponse = await makeRequest(`${BACKEND_URL}/`);
      console.log(`  /: ${rootResponse.statusCode}`);
    } catch (e) {
      console.log(`  /: ERROR - ${e.message}`);
    }
    
  } catch (error) {
    console.error(`\n❌ Environment check failed: ${error.message}`);
  }
}

checkRailwayEnvironment();