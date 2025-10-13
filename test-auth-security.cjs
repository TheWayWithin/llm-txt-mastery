#!/usr/bin/env node

/**
 * Test authentication security features
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

async function testAuthSecurity() {
  console.log('🔐 Testing Authentication Security Features...');
  
  try {
    // Test signup endpoint
    console.log('\n1. Testing Signup Endpoint...');
    const signupResponse = await makeRequest(`${BACKEND_URL}/api/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: 'security-test@example.com',
        password: 'test123'
      })
    });
    
    console.log(`   Status: ${signupResponse.statusCode}`);
    if (signupResponse.data) {
      console.log(`   Response: ${signupResponse.data.substring(0, 100)}...`);
    }
    
    // Test login endpoint
    console.log('\n2. Testing Login Endpoint...');
    const loginResponse = await makeRequest(`${BACKEND_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: 'test@example.com',
        password: 'testpass123'
      })
    });
    
    console.log(`   Status: ${loginResponse.statusCode}`);
    if (loginResponse.data) {
      console.log(`   Response: ${loginResponse.data.substring(0, 100)}...`);
    }
    
    // Test analysis endpoint (should require auth or have bot protection)
    console.log('\n3. Testing Analysis Endpoint (Bot Protection)...');
    const analysisResponse = await makeRequest(`${BACKEND_URL}/api/analyze`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (compatible; SecurityTest/1.0)'
      },
      body: JSON.stringify({
        url: 'https://example.com'
      })
    });
    
    console.log(`   Status: ${analysisResponse.statusCode}`);
    if (analysisResponse.data) {
      console.log(`   Response: ${analysisResponse.data.substring(0, 100)}...`);
    }
    
    // Test with bot-like user agent
    console.log('\n4. Testing Bot Detection...');
    const botResponse = await makeRequest(`${BACKEND_URL}/api/analyze`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'bot/1.0 crawler spider'
      },
      body: JSON.stringify({
        url: 'https://example.com'
      })
    });
    
    console.log(`   Bot Detection Status: ${botResponse.statusCode}`);
    if (botResponse.data) {
      console.log(`   Bot Response: ${botResponse.data.substring(0, 100)}...`);
    }
    
    // Rate limiting test
    console.log('\n5. Testing Rate Limiting...');
    const rateLimitPromises = [];
    for (let i = 0; i < 10; i++) {
      rateLimitPromises.push(
        makeRequest(`${BACKEND_URL}/api/analyze`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            url: 'https://example.com'
          })
        })
      );
    }
    
    const rateLimitResponses = await Promise.all(rateLimitPromises);
    const statusCodes = rateLimitResponses.map(r => r.statusCode);
    const rateLimited = statusCodes.includes(429);
    
    console.log(`   Status codes: ${statusCodes.join(', ')}`);
    console.log(`   Rate limiting active: ${rateLimited ? 'YES' : 'NO'}`);
    
    // Summary
    console.log('\n📊 Authentication Security Summary:');
    console.log(`   Signup endpoint: ${signupResponse.statusCode}`);
    console.log(`   Login endpoint: ${loginResponse.statusCode}`);
    console.log(`   Analysis endpoint: ${analysisResponse.statusCode}`);
    console.log(`   Bot detection: ${botResponse.statusCode}`);
    console.log(`   Rate limiting: ${rateLimited ? 'ACTIVE' : 'MISSING'}`);
    
    return {
      signupWorks: signupResponse.statusCode !== 500,
      loginWorks: loginResponse.statusCode !== 500,
      analysisWorks: analysisResponse.statusCode !== 500,
      botDetection: botResponse.statusCode !== analysisResponse.statusCode,
      rateLimiting: rateLimited
    };
    
  } catch (error) {
    console.error(`\n❌ Auth security test failed: ${error.message}`);
    return null;
  }
}

testAuthSecurity().then(results => {
  if (results) {
    const score = Object.values(results).filter(Boolean).length / Object.keys(results).length * 100;
    console.log(`\n🎯 Auth Security Score: ${score.toFixed(1)}%`);
    
    if (score >= 80) {
      console.log('✅ Authentication security is working well');
    } else if (score >= 60) {
      console.log('⚠️ Authentication security has some issues');
    } else {
      console.log('❌ Authentication security needs significant work');
    }
  }
});