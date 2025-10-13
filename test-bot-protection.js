#!/usr/bin/env node

/**
 * Test Bot Protection - Verify cost protection is working
 */

import https from 'https';

const PRODUCTION_URL = 'https://llm-txt-mastery-production.up.railway.app';

function testBotProtection() {
  console.log('🤖 TESTING BOT PROTECTION & COST CONTROLS');
  console.log('=========================================');
  console.log(`Testing: ${PRODUCTION_URL}/api/analyze`);
  console.log('Expected: Should require email verification\n');

  // Test 1: No email provided (should block)
  console.log('TEST 1: No email (should be blocked)');
  testAnalyzeEndpoint(null).then(() => {
    
    // Test 2: Unverified email (should be blocked)
    console.log('\nTEST 2: Unverified email (should be blocked)');
    testAnalyzeEndpoint('fake@example.com').then(() => {
      
      // Test 3: Bot user-agent (should be rate limited)
      console.log('\nTEST 3: Bot user-agent (should be rate limited)');
      testAnalyzeEndpoint('test@example.com', 'bot/1.0').then(() => {
        
        console.log('\n' + '='.repeat(50));
        console.log('🔒 BOT PROTECTION ASSESSMENT COMPLETE');
        console.log('='.repeat(50));
      });
    });
  });
}

function testAnalyzeEndpoint(email, userAgent = 'BotTester/1.0') {
  return new Promise((resolve) => {
    const url = new URL(`${PRODUCTION_URL}/api/analyze`);
    
    const postData = JSON.stringify({
      url: 'https://example.com',
      email: email
    });
    
    const req = https.request({
      hostname: url.hostname,
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
        'User-Agent': userAgent
      }
    }, (res) => {
      let body = '';
      res.on('data', (chunk) => {
        body += chunk;
      });
      
      res.on('end', () => {
        console.log(`   Status: ${res.statusCode}`);
        console.log(`   Response: ${body}`);
        
        // Assess protection level
        if (res.statusCode === 400 && body.includes('Email required')) {
          console.log('   ✅ EMAIL PROTECTION: Working (blocks no email)');
        } else if (res.statusCode === 403 && body.includes('not found')) {
          console.log('   ✅ EMAIL VERIFICATION: Working (blocks unverified emails)');
        } else if (res.statusCode === 429) {
          console.log('   ✅ RATE LIMITING: Working (blocks excessive requests)');
        } else if (res.statusCode === 200) {
          console.log('   ⚠️  WARNING: Request allowed (may indicate weak protection)');
        } else {
          console.log(`   ❓ UNEXPECTED: Status ${res.statusCode}`);
        }
        
        resolve();
      });
    });
    
    req.on('error', (err) => {
      console.log(`   ❌ ERROR: ${err.message}`);
      resolve();
    });
    
    req.write(postData);
    req.end();
  });
}

// Run the test
testBotProtection();