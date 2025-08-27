#!/usr/bin/env node

/**
 * Post-Deployment Validation Script
 * 
 * Run this after deploying the credit system fix to verify it's working
 */

const https = require('https');
const BASE_URL = 'https://llm-txt-mastery-production.up.railway.app';
const JAMIE_EMAIL = 'jamie.watters.mail@icloud.com';

function makeRequest(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, data: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, data: data });
        }
      });
    }).on('error', reject);
  });
}

async function validateDeploymentFix() {
  console.log('🚀 POST-DEPLOYMENT VALIDATION');
  console.log('===============================\n');
  
  console.log('Testing Jamie\'s Coffee tier account...');
  const jamieUsageUrl = `${BASE_URL}/api/usage/${encodeURIComponent(JAMIE_EMAIL)}`;
  
  try {
    const response = await makeRequest(jamieUsageUrl);
    
    if (response.status !== 200) {
      console.log('❌ FAILED: API returned status', response.status);
      return false;
    }
    
    const data = response.data;
    
    if (data.tier !== 'coffee') {
      console.log('❌ FAILED: Jamie is not Coffee tier. Current tier:', data.tier);
      return false;
    }
    
    console.log('✅ Confirmed: Jamie is Coffee tier user');
    
    // CRITICAL TEST: Check if creditsRemaining is now included
    if ('creditsRemaining' in data) {
      console.log('✅ SUCCESS: creditsRemaining field is present!');
      console.log(`   Jamie has ${data.creditsRemaining} credits remaining`);
      
      if (data.creditsRemaining > 0) {
        console.log('✅ Jamie can perform analyses');
      } else {
        console.log('⚠️  Jamie has 0 credits - needs to purchase more');
      }
      
      console.log('\n📊 Full API Response:');
      console.log(JSON.stringify(data, null, 2));
      
      console.log('\n🎉 DEPLOYMENT VALIDATION: PASSED');
      console.log('The Coffee tier credit system is now fully operational!');
      
      return true;
      
    } else {
      console.log('❌ FAILED: creditsRemaining field is STILL missing');
      console.log('🔧 This means the deployment has not taken effect yet');
      console.log('   Wait a few minutes and try again, or check Railway deployment status');
      
      console.log('\n📊 Current API Response:');
      console.log(JSON.stringify(data, null, 2));
      
      return false;
    }
    
  } catch (error) {
    console.error('❌ FAILED: Could not validate deployment:', error.message);
    return false;
  }
}

// Run validation
validateDeploymentFix().then(success => {
  if (success) {
    console.log('\n✅ VALIDATION COMPLETE: Credit system fix is working!');
    process.exit(0);
  } else {
    console.log('\n❌ VALIDATION FAILED: Fix not yet deployed or not working');
    process.exit(1);
  }
}).catch(error => {
  console.error('❌ Validation script error:', error);
  process.exit(1);
});