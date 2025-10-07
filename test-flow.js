#!/usr/bin/env node

// Simple test script for the LLM.txt tool
const BASE_URL = 'http://localhost:3000';

async function testLLMTool(websiteUrl = 'https://example.com') {
  console.log(`🚀 Testing LLM.txt Tool with: ${websiteUrl}`);

  try {
    // Step 1: Capture email (this works without auth)
    console.log('\n📧 Step 1: Capturing email...');
    const emailResponse = await fetch(`${BASE_URL}/api/email-capture`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'test@example.com',
        websiteUrl: websiteUrl,
        tier: 'starter',
      }),
    });

    const emailResult = await emailResponse.json();
    console.log('✅ Email captured:', emailResult);

    console.log('\n🔐 Note: Analysis endpoints require authentication.');
    console.log('💡 For full testing, please use the web interface at: http://localhost:3000');
    console.log('\n🌐 Or test these URLs directly in your browser:');
    console.log('   • http://localhost:3000 - Main interface');
    console.log('   • Enter your test URL in the form');
    console.log('   • Choose tier: Starter (free), Growth, or Scale');
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.log('\n💡 Make sure the server is running with: npm run dev');
  }
}

// Get URL from command line or use default
const testUrl = process.argv[2] || 'https://example.com';
testLLMTool(testUrl);
