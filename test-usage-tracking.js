#!/usr/bin/env node

import fetch from 'node-fetch';

async function testUsageTracking() {
  const testEmail = `tracktest${Date.now()}@test.com`;
  console.log(`🧪 Testing usage tracking with email: ${testEmail}\n`);
  
  try {
    // 1. Capture email first
    console.log('1️⃣ Capturing email...');
    const captureResponse = await fetch('https://llm-txt-mastery-production.up.railway.app/api/email-capture', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        tier: 'starter',
        websiteUrl: 'https://example.com'
      })
    });
    const captureData = await captureResponse.json();
    console.log('   Result:', captureData.message);
    
    // 2. Check initial usage
    console.log('\n2️⃣ Checking initial usage...');
    const usageResponse1 = await fetch(`https://llm-txt-mastery-production.up.railway.app/api/usage/${testEmail}`);
    const usage1 = await usageResponse1.json();
    console.log(`   Analyses today: ${usage1.usage.analysesToday}/${usage1.limits.dailyAnalyses}`);
    
    // 3. Start analysis
    console.log('\n3️⃣ Starting analysis...');
    const analyzeResponse = await fetch('https://llm-txt-mastery-production.up.railway.app/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: 'https://example.com',
        email: testEmail
      })
    });
    const analyzeData = await analyzeResponse.json();
    console.log(`   Analysis ID: ${analyzeData.analysisId}, Status: ${analyzeData.status}`);
    
    // 4. Wait for analysis to complete
    console.log('\n4️⃣ Waiting for analysis to complete...');
    await new Promise(resolve => setTimeout(resolve, 15000)); // Wait 15 seconds
    
    // 5. Check analysis status
    console.log('\n5️⃣ Checking analysis status...');
    const statusResponse = await fetch(`https://llm-txt-mastery-production.up.railway.app/api/analysis/${analyzeData.analysisId}`);
    const statusData = await statusResponse.json();
    console.log(`   Status: ${statusData.status}`);
    if (statusData.discoveredPages) {
      console.log(`   Pages discovered: ${statusData.discoveredPages.length}`);
    }
    
    // 6. Check usage after analysis
    console.log('\n6️⃣ Checking usage after analysis...');
    const usageResponse2 = await fetch(`https://llm-txt-mastery-production.up.railway.app/api/usage/${testEmail}`);
    const usage2 = await usageResponse2.json();
    console.log(`   Analyses today: ${usage2.usage.analysesToday}/${usage2.limits.dailyAnalyses}`);
    
    // 7. Verify tracking worked
    console.log('\n7️⃣ Results:');
    if (usage2.usage.analysesToday > usage1.usage.analysesToday) {
      console.log(`   ✅ Usage tracking WORKING! Count increased from ${usage1.usage.analysesToday} to ${usage2.usage.analysesToday}`);
    } else {
      console.log(`   ❌ Usage tracking FAILED! Count still at ${usage2.usage.analysesToday}`);
      
      // Additional debugging
      console.log('\n   🔍 Debugging info:');
      console.log(`   - Email: ${testEmail}`);
      console.log(`   - Tier: ${usage2.tier}`);
      console.log(`   - Analysis status: ${statusData.status}`);
      if (statusData.analysisMetadata) {
        console.log(`   - Metadata userEmail: ${statusData.analysisMetadata.userEmail}`);
        console.log(`   - Metadata tier: ${statusData.analysisMetadata.tier}`);
      }
    }
    
    // 8. Test daily limit enforcement
    console.log('\n8️⃣ Testing daily limit enforcement...');
    console.log('   Starting 3 more analyses to test limit...');
    
    for (let i = 2; i <= 4; i++) {
      const response = await fetch('https://llm-txt-mastery-production.up.railway.app/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: `https://site${i}.com`,
          email: testEmail
        })
      });
      const data = await response.json();
      
      if (data.analysisId) {
        console.log(`   Analysis #${i}: Started (ID: ${data.analysisId})`);
      } else if (data.error) {
        console.log(`   Analysis #${i}: BLOCKED - ${data.error}`);
      }
      
      await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
    }
    
    // 9. Final usage check
    console.log('\n9️⃣ Final usage check...');
    const usageResponse3 = await fetch(`https://llm-txt-mastery-production.up.railway.app/api/usage/${testEmail}`);
    const usage3 = await usageResponse3.json();
    console.log(`   Final count: ${usage3.usage.analysesToday}/${usage3.limits.dailyAnalyses}`);
    
    if (usage3.usage.analysesToday >= 3) {
      console.log('   ✅ Daily limit enforcement appears to be working');
    } else {
      console.log(`   ⚠️ Usage count is ${usage3.usage.analysesToday}, expected 3`);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
testUsageTracking().catch(console.error);