#!/usr/bin/env node

/**
 * Test Correct Auth Endpoint - Test /register instead of /signup
 */

import https from 'https';

const PRODUCTION_URL = 'https://llm-txt-mastery-production.up.railway.app';

function testAuthEndpoint() {
  console.log('🔍 TESTING CORRECT AUTH ENDPOINT');
  console.log('=================================');
  console.log(`Testing: ${PRODUCTION_URL}/api/auth/register`);
  console.log('Expected: Should work (not 404)\n');

  const url = new URL(`${PRODUCTION_URL}/api/auth/register`);
  
  const postData = JSON.stringify({
    email: 'test-signup@example.com',
    password: 'TestPass123!'
  });
  
  const req = https.request({
    hostname: url.hostname,
    port: url.port,
    path: url.pathname,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData),
      'User-Agent': 'AuthTester/1.0'
    }
  }, (res) => {
    console.log(`Response Status: ${res.statusCode}`);
    console.log(`Response Headers:`);
    
    // Check security headers specifically  
    const securityHeaders = [
      'content-security-policy',
      'x-frame-options',
      'x-content-type-options',
      'strict-transport-security'
    ];
    
    let securityHeaderCount = 0;
    securityHeaders.forEach(header => {
      if (res.headers[header]) {
        console.log(`✅ ${header}: ${res.headers[header]}`);
        securityHeaderCount++;
      } else {
        console.log(`❌ ${header}: MISSING`);
      }
    });
    
    let body = '';
    res.on('data', (chunk) => {
      body += chunk;
    });
    
    res.on('end', () => {
      console.log('\nResponse Body:');
      console.log(body);
      
      console.log('\n📊 ASSESSMENT:');
      if (res.statusCode === 404) {
        console.log('❌ STILL 404 - Route truly missing');
      } else if (res.statusCode === 409) {
        console.log('✅ SUCCESS - Route working (email already exists)');
      } else if (res.statusCode >= 400) {
        console.log(`⚠️  Route working but has error (${res.statusCode})`);
      } else {
        console.log('✅ SUCCESS - Route working correctly');
      }
      
      console.log(`\nSecurity Headers: ${securityHeaderCount}/4 present`);
      if (securityHeaderCount === 4) {
        console.log('✅ SECURITY HEADERS WORKING ON AUTH ENDPOINTS');
      } else {
        console.log('❌ Security headers missing on auth endpoints');
      }
    });
  });
  
  req.on('error', (err) => {
    console.error('❌ ERROR:', err.message);
  });
  
  req.write(postData);
  req.end();
}

// Run the test
testAuthEndpoint();