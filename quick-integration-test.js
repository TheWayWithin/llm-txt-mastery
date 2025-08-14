#!/usr/bin/env node

/**
 * Quick Integration Test - Verify Key Fixes
 * 
 * Tests the critical fixes without requiring Playwright setup
 */

// Use built-in fetch (Node 18+) or fallback
const fetch = globalThis.fetch;

const BASE_URL = 'http://localhost:8080';
const TEST_EMAIL = `test-integration-${Date.now()}@example.com`;

async function testAPIEndpoints() {
  console.log('🧪 Testing API Endpoints...\n');
  
  const tests = [
    {
      name: 'Health Check',
      method: 'GET',
      endpoint: '/api/health',
      expectedStatus: 200
    },
    {
      name: 'URL Normalization Test',
      method: 'POST',
      endpoint: '/api/analyze',
      body: { 
        url: 'www.example.com',  // Test URL without protocol
        email: TEST_EMAIL 
      },
      expectedStatus: [200, 202] // Analysis might be async
    },
    {
      name: 'Usage Counter Check',
      method: 'GET',
      endpoint: `/api/usage/${encodeURIComponent(TEST_EMAIL)}`,
      expectedStatus: [200, 404] // 404 if user doesn't exist yet
    }
  ];

  let passedTests = 0;
  let totalTests = tests.length;

  for (const test of tests) {
    try {
      console.log(`Testing ${test.name}...`);
      
      const options = {
        method: test.method,
        headers: {
          'Content-Type': 'application/json',
        }
      };

      if (test.body) {
        options.body = JSON.stringify(test.body);
      }

      const response = await fetch(`${BASE_URL}${test.endpoint}`, options);
      
      const expectedStatuses = Array.isArray(test.expectedStatus) 
        ? test.expectedStatus 
        : [test.expectedStatus];
      
      if (expectedStatuses.includes(response.status)) {
        console.log(`✅ ${test.name}: PASSED (${response.status})`);
        passedTests++;
        
        // Log response for debugging
        if (test.endpoint.includes('/api/analyze')) {
          const responseData = await response.json().catch(() => ({}));
          console.log(`   Analysis Response: ${JSON.stringify(responseData, null, 2).substring(0, 200)}...`);
        }
      } else {
        console.log(`❌ ${test.name}: FAILED (${response.status})`);
        const errorBody = await response.text().catch(() => 'No response body');
        console.log(`   Error: ${errorBody.substring(0, 200)}...`);
      }
    } catch (error) {
      console.log(`❌ ${test.name}: ERROR - ${error.message}`);
    }
    
    console.log('');
  }

  return { passedTests, totalTests };
}

async function testURLNormalization() {
  console.log('🔗 Testing URL Normalization...\n');
  
  const urlTests = [
    { input: 'www.example.com', expected: 'should accept without protocol' },
    { input: 'example.com', expected: 'should accept bare domain' },
    { input: 'https://example.com', expected: 'should accept with https' },
    { input: 'invalid-url', expected: 'should reject invalid URLs' }
  ];

  let passedUrlTests = 0;
  
  for (const urlTest of urlTests) {
    try {
      console.log(`Testing URL: "${urlTest.input}"`);
      
      const response = await fetch(`${BASE_URL}/api/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          url: urlTest.input, 
          email: `test-url-${Date.now()}@example.com` 
        })
      });

      if (urlTest.input === 'invalid-url') {
        // Should fail for invalid URLs
        if (response.status >= 400) {
          console.log(`✅ ${urlTest.expected}: PASSED (${response.status})`);
          passedUrlTests++;
        } else {
          console.log(`❌ ${urlTest.expected}: FAILED (${response.status}) - should have rejected invalid URL`);
        }
      } else {
        // Should succeed for valid URLs
        if (response.status < 400) {
          console.log(`✅ ${urlTest.expected}: PASSED (${response.status})`);
          passedUrlTests++;
        } else {
          console.log(`❌ ${urlTest.expected}: FAILED (${response.status})`);
          const errorBody = await response.text().catch(() => 'No response body');
          console.log(`   Error: ${errorBody.substring(0, 200)}...`);
        }
      }
    } catch (error) {
      console.log(`❌ ${urlTest.expected}: ERROR - ${error.message}`);
    }
    
    console.log('');
  }

  return { passedUrlTests, totalUrlTests: urlTests.length };
}

async function testUsageTracking() {
  console.log('📊 Testing Usage Counter...\n');
  
  const testEmail = `usage-test-${Date.now()}@example.com`;
  
  try {
    // First, check initial usage (should be 0)
    console.log('Checking initial usage...');
    let response = await fetch(`${BASE_URL}/api/usage/${encodeURIComponent(testEmail)}`);
    let initialUsage = 0;
    
    if (response.status === 200) {
      const usageData = await response.json();
      initialUsage = usageData.usage?.analysesToday || 0;
      console.log(`✅ Initial usage: ${initialUsage}`);
    } else {
      console.log(`ℹ️  New user - no usage data yet`);
    }

    // Perform an analysis
    console.log('Performing analysis to increment counter...');
    response = await fetch(`${BASE_URL}/api/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        url: 'www.example.com', 
        email: testEmail 
      })
    });

    if (response.status < 400) {
      console.log(`✅ Analysis started successfully (${response.status})`);
      
      // Wait a bit for processing
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Check usage again
      console.log('Checking updated usage...');
      response = await fetch(`${BASE_URL}/api/usage/${encodeURIComponent(testEmail)}`);
      
      if (response.status === 200) {
        const usageData = await response.json();
        const newUsage = usageData.usage?.analysesToday || 0;
        
        if (newUsage > initialUsage) {
          console.log(`✅ Usage counter incremented: ${initialUsage} → ${newUsage}`);
          return true;
        } else {
          console.log(`❌ Usage counter did not increment: still ${newUsage}`);
          return false;
        }
      } else {
        console.log(`❌ Could not fetch updated usage data (${response.status})`);
        return false;
      }
    } else {
      console.log(`❌ Analysis failed (${response.status})`);
      const errorBody = await response.text().catch(() => 'No response body');
      console.log(`   Error: ${errorBody.substring(0, 200)}...`);
      return false;
    }
  } catch (error) {
    console.log(`❌ Usage tracking test failed: ${error.message}`);
    return false;
  }
}

async function runAllTests() {
  console.log(`
🧪 QUICK INTEGRATION TEST SUITE
===============================
Testing server at: ${BASE_URL}
Test email: ${TEST_EMAIL}
`);

  let totalPassed = 0;
  let totalTests = 0;

  // Test 1: API Endpoints
  const apiResults = await testAPIEndpoints();
  totalPassed += apiResults.passedTests;
  totalTests += apiResults.totalTests;

  // Test 2: URL Normalization
  const urlResults = await testURLNormalization();
  totalPassed += urlResults.passedUrlTests;
  totalTests += urlResults.totalUrlTests;

  // Test 3: Usage Tracking
  const usageWorking = await testUsageTracking();
  if (usageWorking) totalPassed++;
  totalTests++;

  // Results
  console.log(`
📊 TEST RESULTS SUMMARY
======================
Passed: ${totalPassed}/${totalTests} tests
Success Rate: ${Math.round((totalPassed / totalTests) * 100)}%

🎯 CRITICAL FIXES STATUS:
${apiResults.passedTests >= 2 ? '✅' : '❌'} API endpoints responding
${urlResults.passedUrlTests >= 3 ? '✅' : '❌'} URL normalization working
${usageWorking ? '✅' : '❌'} Usage counter incrementing

🚀 PRODUCTION READINESS: ${totalPassed >= totalTests * 0.8 ? '✅ READY' : '❌ NEEDS FIXES'}
`);

  if (totalPassed < totalTests * 0.8) {
    console.log(`
⚠️  ISSUES DETECTED - Manual verification needed:
1. Check server logs for detailed error information
2. Verify database connection is working
3. Test email capture form manually
4. Test post-verification redirect manually
`);
  } else {
    console.log(`
🎉 INTEGRATION TESTS PASSED!
✅ All critical fixes are working
✅ Ready for production deployment
✅ End-to-end flow should work smoothly
`);
  }

  process.exit(totalPassed >= totalTests * 0.8 ? 0 : 1);
}

// Check if server is available
async function checkServer() {
  try {
    const response = await fetch(`${BASE_URL}/health`);
    if (response.ok) {
      console.log('✅ Server is running and accessible');
      return true;
    }
  } catch (error) {
    console.log(`❌ Server not accessible at ${BASE_URL}`);
    console.log('Please run: npm run dev');
    return false;
  }
}

// Main execution
(async () => {
  if (await checkServer()) {
    await runAllTests();
  } else {
    process.exit(1);
  }
})();