#!/usr/bin/env node

const testEmail = `test${Date.now()}@example.com`;
const testPassword = 'Test123!@#';
const apiUrl = 'http://localhost:8080/api';

async function testAuthFlow() {
  console.log('🧪 Testing Authentication Flow');
  console.log('================================');

  try {
    // Step 1: Register a new user
    console.log('\n1. Registering new user:', testEmail);
    const registerResponse = await fetch(`${apiUrl}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        password: testPassword,
        confirmPassword: testPassword,
      }),
    });

    const registerData = await registerResponse.json();
    if (!registerResponse.ok) {
      throw new Error(`Registration failed: ${JSON.stringify(registerData)}`);
    }

    console.log('✅ Registration successful');
    console.log('   - User ID:', registerData.user.id);
    console.log('   - Email:', registerData.user.email);
    console.log('   - Tier:', registerData.user.tier);
    console.log('   - Email Verified:', registerData.user.emailVerified);
    console.log('   - Access Token:', registerData.accessToken ? 'Received' : 'Missing');

    const accessToken = registerData.accessToken;

    // Step 2: Test analysis with JWT authentication
    console.log('\n2. Testing analysis with JWT authentication');
    const analyzeResponse = await fetch(`${apiUrl}/analyze`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        url: 'https://example.com',
        email: testEmail, // Should be optional for authenticated users
      }),
    });

    const analyzeData = await analyzeResponse.json();
    console.log('   Analysis Response Status:', analyzeResponse.status);
    console.log('   Analysis Response:', JSON.stringify(analyzeData, null, 2));

    if (analyzeResponse.ok) {
      console.log('✅ Analysis started successfully!');
      console.log('   - Analysis ID:', analyzeData.analysisId);
      console.log('   - Status:', analyzeData.status);
    } else {
      console.log('❌ Analysis failed:', analyzeData.message || analyzeData.error);
    }

    // Step 3: Test analysis WITHOUT email parameter (should work with JWT)
    console.log('\n3. Testing analysis WITHOUT email parameter (JWT only)');
    const analyzeResponse2 = await fetch(`${apiUrl}/analyze`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        url: 'https://github.com',
      }),
    });

    const analyzeData2 = await analyzeResponse2.json();
    console.log('   Analysis Response Status:', analyzeResponse2.status);

    if (analyzeResponse2.ok) {
      console.log('✅ JWT-only analysis worked!');
    } else {
      console.log('❌ JWT-only analysis failed:', analyzeData2.message || analyzeData2.error);
    }

    // Step 4: Check if email capture was created
    console.log('\n4. Checking if email capture was created');
    const usageResponse = await fetch(`${apiUrl}/usage/${encodeURIComponent(testEmail)}`);
    const usageData = await usageResponse.json();

    if (usageResponse.ok) {
      console.log('✅ Email capture exists');
      console.log('   - Tier:', usageData.tier);
      console.log('   - Analyses Today:', usageData.usage.analysesToday);
    } else {
      console.log('❌ Email capture not found');
    }

    console.log('\n================================');
    console.log('✅ Authentication flow test complete!');
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    process.exit(1);
  }
}

testAuthFlow();
