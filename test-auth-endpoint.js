#!/usr/bin/env node

/**
 * Test Authentication Endpoint - Emergency Validation
 * Tests the signup endpoint that was returning 404
 */

import https from 'https';

const PRODUCTION_URL = 'https://llm-txt-mastery-production.up.railway.app';

function testAuthEndpoint() {
  console.log('🚨 EMERGENCY AUTH ENDPOINT VALIDATION');
  console.log('=====================================');
  console.log(`Testing: ${PRODUCTION_URL}/api/auth/register`);
  console.log('Expected: Should not return 404\n');

  const url = new URL(`${PRODUCTION_URL}/api/auth/register`);
  
  const postData = JSON.stringify({
    email: 'test@example.com',
    password: 'testpass123',
    tier: 'free'
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
    Object.keys(res.headers).forEach(key => {
      console.log(`  ${key}: ${res.headers[key]}`);
    });
    
    let body = '';
    res.on('data', (chunk) => {
      body += chunk;
    });
    
    res.on('end', () => {
      console.log('\nResponse Body:');
      console.log(body);
      
      if (res.statusCode === 404) {
        console.log('\n❌ CONFIRMED: Signup endpoint returns 404');
        console.log('This indicates routing/deployment issue');
      } else {
        console.log(`\n✅ Auth endpoint responding (status: ${res.statusCode})`);
      }
      
      // Check if we get security headers on auth endpoints
      const securityHeaders = [
        'content-security-policy',
        'x-frame-options',
        'x-content-type-options',
        'strict-transport-security'
      ];
      
      console.log('\nSecurity Headers on Auth Endpoint:');
      let foundAuthHeaders = 0;
      securityHeaders.forEach(header => {
        if (res.headers[header]) {
          console.log(`✅ ${header}: ${res.headers[header]}`);
          foundAuthHeaders++;
        } else {
          console.log(`❌ ${header}: MISSING`);
        }
      });
      
      console.log(`\nAuth Security Coverage: ${foundAuthHeaders}/${securityHeaders.length} (${Math.round((foundAuthHeaders/securityHeaders.length)*100)}%)`);
    });
  });
  
  req.on('error', (err) => {
    console.error('❌ ERROR:', err.message);
  });
  
  req.write(postData);
  req.end();
}

// Test the analyze endpoint too - critical for bot protection
function testAnalyzeEndpoint() {
  console.log('\n🤖 TESTING ANALYZE ENDPOINT (Bot Protection)');
  console.log('===========================================');
  console.log(`Testing: ${PRODUCTION_URL}/api/analyze`);
  
  const url = new URL(`${PRODUCTION_URL}/api/analyze`);
  
  const postData = JSON.stringify({
    url: 'https://example.com',
    userTier: 'free'
  });
  
  const req = https.request({
    hostname: url.hostname,
    port: url.port,
    path: url.pathname,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData),
      'User-Agent': 'bot/1.0 (should be rate limited)'
    }
  }, (res) => {
    console.log(`Response Status: ${res.statusCode}`);
    
    let body = '';
    res.on('data', (chunk) => {
      body += chunk;
    });
    
    res.on('end', () => {
      console.log('Response Body:', body);
      
      if (res.statusCode === 429) {
        console.log('\n✅ Bot protection working - rate limited');
      } else if (res.statusCode === 401) {
        console.log('\n✅ Auth protection working - requires authentication');
      } else if (res.statusCode === 200) {
        console.log('\n⚠️  WARNING: Bot protection may not be working - allowing unauthorized requests');
      } else {
        console.log(`\n❓ Unexpected response: ${res.statusCode}`);
      }
    });
  });
  
  req.on('error', (err) => {
    console.error('❌ ERROR:', err.message);
  });
  
  req.write(postData);
  req.end();
}

// Run tests
testAuthEndpoint();
setTimeout(testAnalyzeEndpoint, 2000);