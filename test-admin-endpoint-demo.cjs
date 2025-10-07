#!/usr/bin/env node

/**
 * Coffee Credits Admin Endpoint Demo
 *
 * Demonstrates how the admin credit reset endpoint should work
 * once properly implemented in the Railway backend.
 */

const PRODUCTION_BACKEND = 'https://llm-txt-mastery-production.up.railway.app';
const JAMIE_EMAIL = 'jamie.watters.mail@icloud.com';
const ADMIN_KEY = process.env.ADMIN_KEY;

async function demonstrateAdminEndpoint() {
  console.log('🔧 Admin Credit Reset Endpoint Demonstration');
  console.log('==========================================\n');

  if (!ADMIN_KEY) {
    console.log('❌ ADMIN_KEY environment variable is required');
    console.log('Please set it before running this demo:');
    console.log('export ADMIN_KEY="your_admin_key_here"\n');
    return;
  }

  console.log('✅ ADMIN_KEY configured');
  console.log(`Backend: ${PRODUCTION_BACKEND}`);
  console.log(`Test User: ${JAMIE_EMAIL}\n`);

  // Test 1: Valid admin request
  console.log('🧪 Test 1: Valid Admin Credit Reset Request');
  console.log('--------------------------------------------');

  try {
    const response = await fetch(`${PRODUCTION_BACKEND}/api/auth/admin/reset-coffee-credits`, {
      method: 'POST',
      headers: {
        'x-admin-key': ADMIN_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: JAMIE_EMAIL,
      }),
    });

    console.log(`Response Status: ${response.status}`);
    console.log('Response Headers:', Object.fromEntries(response.headers().entries()));

    const contentType = response.headers.get('content-type') || '';

    if (contentType.includes('application/json')) {
      const data = await response.json();
      console.log('Response Data:', JSON.stringify(data, null, 2));

      if (response.ok && data.success) {
        console.log('✅ EXPECTED: Admin reset successful');
      } else {
        console.log('❌ UNEXPECTED: Admin reset failed with JSON error');
      }
    } else {
      console.log('❌ CURRENT: Returning HTML instead of JSON (endpoint not implemented)');
      const text = await response.text();
      console.log('Response preview:', text.substring(0, 100) + '...');
    }
  } catch (error) {
    console.log('❌ Request failed:', error.message);
  }

  console.log('\n');

  // Test 2: Unauthorized request (no admin key)
  console.log('🧪 Test 2: Unauthorized Request (No Admin Key)');
  console.log('----------------------------------------------');

  try {
    const response = await fetch(`${PRODUCTION_BACKEND}/api/auth/admin/reset-coffee-credits`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: JAMIE_EMAIL,
      }),
    });

    console.log(`Response Status: ${response.status}`);

    if (response.status === 401) {
      console.log('✅ EXPECTED: Properly rejected unauthorized request');
    } else {
      console.log('❌ CURRENT: Should return 401 for unauthorized requests');
    }
  } catch (error) {
    console.log('❌ Request failed:', error.message);
  }

  console.log('\n');

  // Test 3: Wrong admin key
  console.log('🧪 Test 3: Wrong Admin Key');
  console.log('---------------------------');

  try {
    const response = await fetch(`${PRODUCTION_BACKEND}/api/auth/admin/reset-coffee-credits`, {
      method: 'POST',
      headers: {
        'x-admin-key': 'wrong-key',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: JAMIE_EMAIL,
      }),
    });

    console.log(`Response Status: ${response.status}`);

    if (response.status === 401) {
      console.log('✅ EXPECTED: Properly rejected wrong admin key');
    } else {
      console.log('❌ CURRENT: Should return 401 for wrong admin key');
    }
  } catch (error) {
    console.log('❌ Request failed:', error.message);
  }

  console.log('\n📋 EXPECTED IMPLEMENTATION SPECIFICATION');
  console.log('========================================\n');

  console.log('Endpoint: POST /api/auth/admin/reset-coffee-credits');
  console.log('');
  console.log('Headers Required:');
  console.log('  x-admin-key: string (validates against ADMIN_KEY env var)');
  console.log('  Content-Type: application/json');
  console.log('');
  console.log('Request Body:');
  console.log('  {');
  console.log('    "email": "user@example.com",');
  console.log('    "credits": 100  // optional, defaults to 100');
  console.log('  }');
  console.log('');
  console.log('Success Response (200):');
  console.log('  {');
  console.log('    "success": true,');
  console.log('    "message": "Credits reset to 100 for coffee tier user",');
  console.log('    "email": "user@example.com",');
  console.log('    "creditsRemaining": 100,');
  console.log('    "tier": "coffee"');
  console.log('  }');
  console.log('');
  console.log('Error Responses:');
  console.log('  401: { "error": "Unauthorized" }');
  console.log('  400: { "error": "Coffee tier user not found" }');
  console.log('  500: { "error": "Internal server error" }');
  console.log('');
  console.log('Implementation Notes:');
  console.log('  - Validate admin key against process.env.ADMIN_KEY');
  console.log('  - Only reset credits for users with tier === "coffee"');
  console.log('  - Update both credits_remaining and credits_last_reset fields');
  console.log('  - Log admin actions for audit trail');
  console.log('  - Return updated user credit status');
}

// Run demonstration
demonstrateAdminEndpoint().catch(console.error);
