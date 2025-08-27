#!/usr/bin/env node

/**
 * Coffee Credits System Pre-Test Validation
 * 
 * Validates system readiness before running the full test suite
 */

const PRODUCTION_FRONTEND = 'https://www.llmtxtmastery.com';
const PRODUCTION_BACKEND = 'https://llm-txt-mastery-production.up.railway.app';
const JAMIE_EMAIL = 'jamie.watters.mail@icloud.com';

async function validateSystemReadiness() {
  console.log('🔍 Coffee Credits System Pre-Test Validation');
  console.log('===========================================\n');
  
  const results = {
    frontend: false,
    backend: false,
    adminEndpoint: false,
    usageEndpoint: false,
    analyzeEndpoint: false,
    overallReady: false
  };
  
  try {
    // Test 1: Frontend Accessibility
    console.log('1. Testing Frontend Accessibility...');
    const frontendResponse = await fetch(PRODUCTION_FRONTEND);
    results.frontend = frontendResponse.ok || frontendResponse.status === 301;
    console.log(`   Status: ${frontendResponse.status} - ${results.frontend ? '✅' : '❌'}`);
    
    // Test 2: Backend Health
    console.log('\n2. Testing Backend Health...');
    const backendResponse = await fetch(`${PRODUCTION_BACKEND}/api/health`);
    results.backend = backendResponse.ok;
    console.log(`   Status: ${backendResponse.status} - ${results.backend ? '✅' : '❌'}`);
    
    // Test 3: Admin Endpoint Availability (without key)
    console.log('\n3. Testing Admin Endpoint Availability...');
    const adminResponse = await fetch(`${PRODUCTION_BACKEND}/api/auth/admin/reset-coffee-credits`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: JAMIE_EMAIL })
    });
    // Should return 401 (unauthorized) which means endpoint exists
    results.adminEndpoint = adminResponse.status === 401;
    console.log(`   Status: ${adminResponse.status} - ${results.adminEndpoint ? '✅ (Properly secured)' : '❌'}`);
    
    // Test 4: Usage Endpoint
    console.log('\n4. Testing Usage Endpoint...');
    const usageResponse = await fetch(`${PRODUCTION_BACKEND}/api/usage/${encodeURIComponent(JAMIE_EMAIL)}`);
    results.usageEndpoint = usageResponse.ok;
    
    if (results.usageEndpoint) {
      const usageData = await usageResponse.json();
      console.log(`   Status: ${usageResponse.status} - ✅`);
      console.log(`   User Tier: ${usageData.tier || 'Unknown'}`);
      console.log(`   Credits Remaining: ${usageData.creditsRemaining || 'N/A'}`);
      
      if (usageData.tier === 'coffee') {
        console.log('   🎯 Coffee tier user confirmed');
      } else {
        console.log('   ⚠️ User is not Coffee tier - some tests may fail');
      }
    } else {
      console.log(`   Status: ${usageResponse.status} - ❌`);
    }
    
    // Test 5: Analyze Endpoint Availability
    console.log('\n5. Testing Analyze Endpoint Availability...');
    const analyzeResponse = await fetch(`${PRODUCTION_BACKEND}/api/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        url: 'https://example.com',
        email: 'test@example.com' 
      })
    });
    // Should return something other than 500 (internal server error)
    results.analyzeEndpoint = analyzeResponse.status < 500;
    console.log(`   Status: ${analyzeResponse.status} - ${results.analyzeEndpoint ? '✅' : '❌'}`);
    
    // Overall readiness assessment
    const readyCount = Object.values(results).filter(Boolean).length - 1; // Exclude overallReady
    results.overallReady = readyCount >= 4; // At least 4/5 checks should pass
    
    console.log('\n📊 System Readiness Summary:');
    console.log('============================');
    console.log(`Frontend Accessible: ${results.frontend ? '✅' : '❌'}`);
    console.log(`Backend Healthy: ${results.backend ? '✅' : '❌'}`);
    console.log(`Admin Endpoint: ${results.adminEndpoint ? '✅' : '❌'}`);
    console.log(`Usage Endpoint: ${results.usageEndpoint ? '✅' : '❌'}`);
    console.log(`Analyze Endpoint: ${results.analyzeEndpoint ? '✅' : '❌'}`);
    console.log(`Overall Ready: ${results.overallReady ? '✅' : '❌'}`);
    
    if (results.overallReady) {
      console.log('\n🎯 System is ready for Coffee Credits testing!');
      console.log('\nNext steps:');
      console.log('1. Set ADMIN_KEY environment variable');
      console.log('2. Run: ./run-coffee-credits-tests.sh');
    } else {
      console.log('\n⚠️ System has issues that need to be addressed before testing');
      console.log('\nPlease check the failed components and ensure Railway deployment is complete.');
    }
    
    return results.overallReady;
    
  } catch (error) {
    console.error('\n❌ Pre-test validation failed with error:', error.message);
    return false;
  }
}

// Run validation if called directly
if (require.main === module) {
  validateSystemReadiness()
    .then(ready => process.exit(ready ? 0 : 1))
    .catch(error => {
      console.error('Validation error:', error);
      process.exit(1);
    });
}

module.exports = { validateSystemReadiness };