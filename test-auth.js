// Simple test script to verify authentication endpoints
const API_BASE = 'http://localhost:8080';

async function testEndpoint(endpoint, method = 'GET', body = null) {
  try {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : null,
    });
    
    const data = await response.json();
    console.log(`${method} ${endpoint}:`, response.status, data);
    return { status: response.status, data };
  } catch (error) {
    console.error(`${method} ${endpoint} failed:`, error.message);
    return { error: error.message };
  }
}

async function runTests() {
  console.log('Testing authentication endpoints...\n');
  
  // Test health endpoint first
  await testEndpoint('/api/health');
  
  // Test check-account endpoint
  await testEndpoint('/api/auth/check-account', 'POST', {
    email: 'test@example.com'
  });
  
  // Test coffee-login endpoint (should fail without valid data)
  await testEndpoint('/api/auth/coffee-login', 'POST', {
    email: 'test@example.com',
    sessionId: 'test-session'
  });
}

// Run tests if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runTests();
}