#!/usr/bin/env node

/**
 * Test API Endpoints - Check which routes are actually working
 */

import https from 'https';

const PRODUCTION_URL = 'https://llm-txt-mastery-production.up.railway.app';

function testEndpoint(path, method = 'GET', body = null) {
  return new Promise((resolve) => {
    console.log(`\n🔍 Testing: ${method} ${path}`);
    
    const url = new URL(`${PRODUCTION_URL}${path}`);
    
    const options = {
      hostname: url.hostname,
      path: url.pathname,
      method,
      headers: {
        'User-Agent': 'EndpointTester/1.0',
        'Accept': 'application/json'
      }
    };
    
    if (body && method === 'POST') {
      const postData = typeof body === 'string' ? body : JSON.stringify(body);
      options.headers['Content-Type'] = 'application/json';
      options.headers['Content-Length'] = Buffer.byteLength(postData);
    }
    
    const req = https.request(options, (res) => {
      let responseBody = '';
      res.on('data', (chunk) => {
        responseBody += chunk;
      });
      
      res.on('end', () => {
        const status = res.statusCode;
        const isWorking = status !== 404;
        
        console.log(`   Status: ${status} ${isWorking ? '✅' : '❌'}`);
        if (responseBody && responseBody.length < 200) {
          console.log(`   Response: ${responseBody}`);
        } else if (responseBody) {
          console.log(`   Response: ${responseBody.substring(0, 100)}...`);
        }
        
        resolve({
          path,
          method,
          status,
          working: isWorking,
          response: responseBody
        });
      });
    });
    
    req.on('error', (err) => {
      console.log(`   ERROR: ${err.message} ❌`);
      resolve({
        path,
        method,
        status: 0,
        working: false,
        error: err.message
      });
    });
    
    if (body && method === 'POST') {
      const postData = typeof body === 'string' ? body : JSON.stringify(body);
      req.write(postData);
    }
    
    req.end();
  });
}

async function testAllEndpoints() {
  console.log('🚨 API ENDPOINT DIAGNOSTIC TEST');
  console.log('==============================');
  console.log(`Testing Railway backend: ${PRODUCTION_URL}`);
  
  const endpoints = [
    // Working endpoints
    { path: '/health', method: 'GET', expected: 'Should work' },
    { path: '/api/version', method: 'GET', expected: 'Should work' },
    
    // Auth endpoints
    { path: '/api/auth/check-email', method: 'POST', body: { email: 'test@example.com' }, expected: 'Should work' },
    { path: '/api/auth/register', method: 'POST', body: { email: 'test@example.com', password: 'TestPass123!' }, expected: 'Should work' },
    { path: '/api/auth/login', method: 'POST', body: { email: 'test@example.com', password: 'TestPass123!' }, expected: 'Should work' },
    
    // Analysis endpoints
    { path: '/api/analyze', method: 'POST', body: { url: 'https://example.com', email: 'test@example.com' }, expected: 'Should work' },
    { path: '/api/check-limits', method: 'POST', body: { email: 'test@example.com', url: 'https://example.com' }, expected: 'Should work' },
    
    // Other endpoints
    { path: '/api/email-capture', method: 'POST', body: { email: 'test@example.com', tier: 'starter' }, expected: 'Should work' },
  ];
  
  const results = [];
  
  for (const endpoint of endpoints) {
    const result = await testEndpoint(endpoint.path, endpoint.method, endpoint.body);
    results.push(result);
    await new Promise(resolve => setTimeout(resolve, 500)); // 500ms delay between requests
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('📊 ENDPOINT TEST SUMMARY');
  console.log('='.repeat(60));
  
  const working = results.filter(r => r.working);
  const broken = results.filter(r => !r.working);
  
  console.log(`✅ Working endpoints: ${working.length}/${results.length}`);
  working.forEach(r => {
    console.log(`   ${r.method} ${r.path} (${r.status})`);
  });
  
  console.log(`❌ Broken endpoints: ${broken.length}/${results.length}`);
  broken.forEach(r => {
    console.log(`   ${r.method} ${r.path} (${r.status})`);
  });
  
  if (broken.length > 0) {
    console.log('\n🔍 DIAGNOSIS:');
    const all404 = broken.every(r => r.status === 404);
    const someWorking = working.length > 0;
    
    if (all404 && someWorking) {
      console.log('❌ Partial routing failure - some routes not registered');
      console.log('💡 Possible causes:');
      console.log('   - Auth routes not properly imported/registered');
      console.log('   - Build issue with route files');
      console.log('   - Environment-specific route filtering');
    } else if (all404 && !someWorking) {
      console.log('❌ Complete application failure');
    } else {
      console.log('❌ Mixed failures - investigation needed');
    }
  } else {
    console.log('\n✅ All endpoints working - security headers issue only');
  }
}

testAllEndpoints();