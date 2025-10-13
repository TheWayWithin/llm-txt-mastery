#!/usr/bin/env node

/**
 * Test Railway backend security headers directly
 */

const https = require('https');
const { URL } = require('url');

// Railway backend URL
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

async function testBackendSecurity() {
  console.log('🔒 Testing Railway Backend Security Headers...');
  console.log(`🎯 Backend URL: ${BACKEND_URL}`);
  
  try {
    // Test health endpoint
    const healthResponse = await makeRequest(`${BACKEND_URL}/health`);
    console.log(`\n📊 Health Endpoint: ${healthResponse.statusCode}`);
    
    // Check security headers
    const securityHeaders = [
      'Content-Security-Policy',
      'X-Frame-Options',
      'X-Content-Type-Options',
      'Strict-Transport-Security',
      'Referrer-Policy',
      'Permissions-Policy',
      'Cross-Origin-Opener-Policy',
      'Cross-Origin-Resource-Policy'
    ];
    
    let foundHeaders = 0;
    
    securityHeaders.forEach(header => {
      const value = healthResponse.headers[header.toLowerCase()];
      if (value) {
        console.log(`  ✅ ${header}: ${value.substring(0, 80)}${value.length > 80 ? '...' : ''}`);
        foundHeaders++;
      } else {
        console.log(`  ❌ ${header}: MISSING`);
      }
    });
    
    console.log(`\n📊 Backend Security Score: ${((foundHeaders / securityHeaders.length) * 100).toFixed(1)}%`);
    
    // Test API endpoint
    console.log('\n🔗 Testing API Endpoint Security...');
    const apiResponse = await makeRequest(`${BACKEND_URL}/api/health`);
    console.log(`📊 API Health: ${apiResponse.statusCode}`);
    
    if (apiResponse.statusCode === 200) {
      let apiHeadersFound = 0;
      securityHeaders.forEach(header => {
        const value = apiResponse.headers[header.toLowerCase()];
        if (value) {
          apiHeadersFound++;
        }
      });
      console.log(`📊 API Security Headers: ${((apiHeadersFound / securityHeaders.length) * 100).toFixed(1)}%`);
    }
    
    // Summary
    if (foundHeaders === securityHeaders.length) {
      console.log('\n✅ Backend security headers are properly implemented!');
      return true;
    } else {
      console.log(`\n⚠️ Backend missing ${securityHeaders.length - foundHeaders} security headers`);
      return false;
    }
    
  } catch (error) {
    console.error(`\n❌ Backend security test failed: ${error.message}`);
    return false;
  }
}

// Run the test
testBackendSecurity().then(success => {
  process.exit(success ? 0 : 1);
});