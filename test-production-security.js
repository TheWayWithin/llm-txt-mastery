#!/usr/bin/env node

/**
 * Emergency Security Header Validation for Railway Production
 * Tests actual security headers returned by production backend
 */

import https from 'https';
import http from 'http';

const PRODUCTION_URL = 'https://llm-txt-mastery-production.up.railway.app';

// Expected security headers from our implementation
const EXPECTED_HEADERS = [
  'content-security-policy',
  'x-frame-options', 
  'x-content-type-options',
  'strict-transport-security',
  'referrer-policy',
  'permissions-policy',
  'cross-origin-opener-policy',
  'cross-origin-resource-policy'
];

function testSecurityHeaders() {
  console.log('🚨 EMERGENCY SECURITY HEADER VALIDATION');
  console.log('=========================================');
  console.log(`Testing: ${PRODUCTION_URL}/health`);
  console.log(`Expected: ${EXPECTED_HEADERS.length} security headers\n`);

  const url = new URL(`${PRODUCTION_URL}/health`);
  const client = url.protocol === 'https:' ? https : http;
  
  const req = client.request({
    hostname: url.hostname,
    port: url.port,
    path: url.pathname,
    method: 'GET',
    headers: {
      'User-Agent': 'SecurityTester/1.0'
    }
  }, (res) => {
    console.log(`Response Status: ${res.statusCode}`);
    console.log(`Response Headers Count: ${Object.keys(res.headers).length}\n`);
    
    // Check each expected security header
    let foundHeaders = 0;
    let missingHeaders = [];
    
    console.log('SECURITY HEADER ANALYSIS:');
    console.log('=========================');
    
    EXPECTED_HEADERS.forEach(header => {
      const value = res.headers[header];
      if (value) {
        console.log(`✅ ${header}: ${value}`);
        foundHeaders++;
      } else {
        console.log(`❌ ${header}: MISSING`);
        missingHeaders.push(header);
      }
    });
    
    console.log('\nSUMMARY:');
    console.log('========');
    console.log(`Found: ${foundHeaders}/${EXPECTED_HEADERS.length} security headers`);
    console.log(`Coverage: ${Math.round((foundHeaders/EXPECTED_HEADERS.length)*100)}%`);
    
    if (foundHeaders === 0) {
      console.log('\n🚨 CRITICAL: NO SECURITY HEADERS FOUND');
      console.log('Security middleware is NOT active in production!');
      console.log('This confirms the deployment failure described in handoff notes.');
    } else if (foundHeaders < EXPECTED_HEADERS.length) {
      console.log('\n⚠️  PARTIAL: Some security headers missing');
      console.log('Security middleware partially deployed');
    } else {
      console.log('\n✅ SUCCESS: All security headers present');
      console.log('Security middleware fully deployed');
    }
    
    // Check for CSP nonce
    const csp = res.headers['content-security-policy'];
    if (csp && csp.includes('nonce-')) {
      console.log('✅ CSP nonce system: ACTIVE');
    } else if (csp) {
      console.log('⚠️  CSP nonce system: MISSING');
    }
    
    console.log('\nALL RESPONSE HEADERS:');
    console.log('====================');
    Object.keys(res.headers).forEach(key => {
      console.log(`${key}: ${res.headers[key]}`);
    });
  });
  
  req.on('error', (err) => {
    console.error('❌ ERROR:', err.message);
  });
  
  req.end();
}

// Run the test
testSecurityHeaders();