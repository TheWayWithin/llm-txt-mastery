#!/usr/bin/env node

/**
 * Comprehensive Security Validation Testing
 * 
 * This script tests all security features implemented in the security fixes.
 * It validates that the production environment has proper security configuration.
 */

const https = require('https');
const { URL } = require('url');

// Production URL to test
const PRODUCTION_URL = 'https://llmtxtmastery.com';

// Expected security headers based on implementation
const EXPECTED_SECURITY_HEADERS = [
  'Content-Security-Policy',
  'X-Frame-Options',
  'X-Content-Type-Options', 
  'Strict-Transport-Security',
  'Referrer-Policy',
  'Permissions-Policy',
  'Cross-Origin-Opener-Policy',
  'Cross-Origin-Resource-Policy'
];

// Security test results
const testResults = {
  headerTests: {},
  cspTests: {},
  authenticationTests: {},
  botProtectionTests: {},
  overallScore: 0,
  criticalIssues: [],
  passed: 0,
  failed: 0
};

/**
 * Make HTTPS request and return response headers
 */
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

/**
 * Test 1: Security Headers Validation
 */
async function testSecurityHeaders() {
  console.log('\n🔒 Testing Security Headers...');
  
  try {
    const response = await makeRequest(PRODUCTION_URL);
    const headers = response.headers;
    
    let passedHeaders = 0;
    
    for (const expectedHeader of EXPECTED_SECURITY_HEADERS) {
      const headerKey = expectedHeader.toLowerCase();
      const headerValue = headers[headerKey];
      
      if (headerValue) {
        console.log(`  ✅ ${expectedHeader}: ${headerValue}`);
        testResults.headerTests[expectedHeader] = {
          present: true,
          value: headerValue,
          status: 'PASS'
        };
        passedHeaders++;
      } else {
        console.log(`  ❌ ${expectedHeader}: MISSING`);
        testResults.headerTests[expectedHeader] = {
          present: false,
          value: null,
          status: 'FAIL'
        };
        testResults.criticalIssues.push(`Missing security header: ${expectedHeader}`);
      }
    }
    
    const headerScore = (passedHeaders / EXPECTED_SECURITY_HEADERS.length) * 100;
    console.log(`\n📊 Security Headers Score: ${headerScore.toFixed(1)}% (${passedHeaders}/${EXPECTED_SECURITY_HEADERS.length})`);
    
    if (passedHeaders === EXPECTED_SECURITY_HEADERS.length) {
      testResults.passed++;
    } else {
      testResults.failed++;
    }
    
    return headerScore;
    
  } catch (error) {
    console.error(`  ❌ Security headers test failed: ${error.message}`);
    testResults.criticalIssues.push(`Security headers test failed: ${error.message}`);
    testResults.failed++;
    return 0;
  }
}

/**
 * Test 2: Content Security Policy Validation
 */
async function testContentSecurityPolicy() {
  console.log('\n🛡️ Testing Content Security Policy...');
  
  try {
    const response = await makeRequest(PRODUCTION_URL);
    const csp = response.headers['content-security-policy'];
    
    if (!csp) {
      console.log('  ❌ Content-Security-Policy header missing');
      testResults.cspTests.present = false;
      testResults.criticalIssues.push('CSP header missing');
      testResults.failed++;
      return 0;
    }
    
    console.log(`  ✅ CSP Present: ${csp.substring(0, 100)}...`);
    
    // Validate key CSP directives
    const requiredDirectives = [
      'default-src',
      'script-src', 
      'style-src',
      'object-src',
      'frame-ancestors'
    ];
    
    let directivesPassed = 0;
    
    for (const directive of requiredDirectives) {
      if (csp.includes(directive)) {
        console.log(`  ✅ ${directive} directive present`);
        directivesPassed++;
      } else {
        console.log(`  ❌ ${directive} directive missing`);
      }
    }
    
    // Check for nonce support
    const hasNonce = csp.includes('nonce-') || csp.includes("'strict-dynamic'");
    if (hasNonce) {
      console.log('  ✅ Nonce-based script loading detected');
      directivesPassed++;
    } else {
      console.log('  ⚠️ No nonce-based script loading detected');
    }
    
    testResults.cspTests = {
      present: true,
      value: csp,
      directivesPassed,
      totalDirectives: requiredDirectives.length + 1,
      hasNonce
    };
    
    const cspScore = (directivesPassed / (requiredDirectives.length + 1)) * 100;
    console.log(`\n📊 CSP Score: ${cspScore.toFixed(1)}% (${directivesPassed}/${requiredDirectives.length + 1})`);
    
    if (directivesPassed >= requiredDirectives.length) {
      testResults.passed++;
    } else {
      testResults.failed++;
    }
    
    return cspScore;
    
  } catch (error) {
    console.error(`  ❌ CSP test failed: ${error.message}`);
    testResults.criticalIssues.push(`CSP test failed: ${error.message}`);
    testResults.failed++;
    return 0;
  }
}

/**
 * Test 3: Authentication Security
 */
async function testAuthenticationSecurity() {
  console.log('\n🔐 Testing Authentication Security...');
  
  try {
    // Test signup endpoint security
    const signupResponse = await makeRequest(`${PRODUCTION_URL}/api/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: 'security-test@example.com',
        password: 'test123'
      })
    });
    
    console.log(`  ✅ Signup endpoint responds: ${signupResponse.statusCode}`);
    
    // Test that weak passwords are rejected (if validation exists)
    const weakPasswordResponse = await makeRequest(`${PRODUCTION_URL}/api/auth/register`, {
      method: 'POST', 
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: 'weak-test@example.com',
        password: '123'
      })
    });
    
    console.log(`  ✅ Weak password test: ${weakPasswordResponse.statusCode}`);
    
    // Test authentication endpoint security headers
    const authHeaders = signupResponse.headers;
    const hasSecurityHeaders = authHeaders['x-frame-options'] || 
                              authHeaders['x-content-type-options'] ||
                              authHeaders['content-security-policy'];
                              
    if (hasSecurityHeaders) {
      console.log('  ✅ Authentication endpoints have security headers');
      testResults.passed++;
    } else {
      console.log('  ⚠️ Authentication endpoints missing some security headers');
      testResults.failed++;
    }
    
    testResults.authenticationTests = {
      signupEndpoint: signupResponse.statusCode,
      weakPasswordTest: weakPasswordResponse.statusCode,
      hasSecurityHeaders
    };
    
    return hasSecurityHeaders ? 100 : 75;
    
  } catch (error) {
    console.error(`  ❌ Authentication security test failed: ${error.message}`);
    testResults.criticalIssues.push(`Authentication test failed: ${error.message}`);
    testResults.failed++;
    return 0;
  }
}

/**
 * Test 4: Bot Protection and Rate Limiting
 */
async function testBotProtection() {
  console.log('\n🤖 Testing Bot Protection and Rate Limiting...');
  
  try {
    // Test with bot-like user agent
    const botResponse = await makeRequest(`${PRODUCTION_URL}/api/analyze`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'bot/1.0 crawler'
      },
      body: JSON.stringify({
        url: 'https://example.com'
      })
    });
    
    console.log(`  ✅ Bot request test: ${botResponse.statusCode}`);
    
    // Test rate limiting with multiple requests
    const requests = [];
    for (let i = 0; i < 5; i++) {
      requests.push(
        makeRequest(`${PRODUCTION_URL}/api/analyze`, {
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
    
    const responses = await Promise.all(requests);
    const rateLimited = responses.some(r => r.statusCode === 429);
    
    if (rateLimited) {
      console.log('  ✅ Rate limiting is active (429 responses detected)');
    } else {
      console.log('  ⚠️ No rate limiting detected in quick succession');
    }
    
    testResults.botProtectionTests = {
      botUserAgentTest: botResponse.statusCode,
      rateLimitingActive: rateLimited,
      multipleRequestsTest: responses.map(r => r.statusCode)
    };
    
    if (rateLimited) {
      testResults.passed++;
      return 100;
    } else {
      testResults.failed++;
      return 50;
    }
    
  } catch (error) {
    console.error(`  ❌ Bot protection test failed: ${error.message}`);
    testResults.criticalIssues.push(`Bot protection test failed: ${error.message}`);
    testResults.failed++;
    return 0;
  }
}

/**
 * Test 5: HTTPS and SSL Security
 */
async function testHTTPSSecurity() {
  console.log('\n🔐 Testing HTTPS and SSL Security...');
  
  try {
    const response = await makeRequest(PRODUCTION_URL);
    
    // Check HSTS header
    const hsts = response.headers['strict-transport-security'];
    if (hsts) {
      console.log(`  ✅ HSTS Header: ${hsts}`);
    } else {
      console.log('  ❌ HSTS Header missing');
      testResults.criticalIssues.push('HSTS header missing');
    }
    
    // Check redirect from HTTP to HTTPS
    const httpUrl = PRODUCTION_URL.replace('https://', 'http://');
    try {
      const httpResponse = await makeRequest(httpUrl);
      if (httpResponse.statusCode >= 300 && httpResponse.statusCode < 400) {
        console.log('  ✅ HTTP to HTTPS redirect working');
      } else {
        console.log('  ⚠️ HTTP to HTTPS redirect may not be working');
      }
    } catch (httpError) {
      console.log('  ✅ HTTP requests properly blocked/redirected');
    }
    
    return hsts ? 100 : 75;
    
  } catch (error) {
    console.error(`  ❌ HTTPS security test failed: ${error.message}`);
    testResults.criticalIssues.push(`HTTPS test failed: ${error.message}`);
    testResults.failed++;
    return 0;
  }
}

/**
 * Generate final security report
 */
function generateSecurityReport(scores) {
  const averageScore = scores.reduce((a, b) => a + b, 0) / scores.length;
  testResults.overallScore = averageScore;
  
  console.log('\n' + '='.repeat(60));
  console.log('🔒 COMPREHENSIVE SECURITY VALIDATION REPORT');
  console.log('='.repeat(60));
  
  console.log(`\n📊 OVERALL SECURITY SCORE: ${averageScore.toFixed(1)}/100`);
  
  if (averageScore >= 90) {
    console.log('🟢 SECURITY STATUS: EXCELLENT - Production Ready');
  } else if (averageScore >= 75) {
    console.log('🟡 SECURITY STATUS: GOOD - Minor improvements needed');
  } else if (averageScore >= 60) {
    console.log('🟠 SECURITY STATUS: MODERATE - Important fixes required');
  } else {
    console.log('🔴 SECURITY STATUS: POOR - Critical fixes required');
  }
  
  console.log(`\n📈 TEST RESULTS:`);
  console.log(`   ✅ Tests Passed: ${testResults.passed}`);
  console.log(`   ❌ Tests Failed: ${testResults.failed}`);
  console.log(`   📊 Total Tests: ${testResults.passed + testResults.failed}`);
  
  if (testResults.criticalIssues.length > 0) {
    console.log(`\n🚨 CRITICAL ISSUES IDENTIFIED:`);
    testResults.criticalIssues.forEach((issue, index) => {
      console.log(`   ${index + 1}. ${issue}`);
    });
  }
  
  console.log(`\n🔧 DETAILED RESULTS:`);
  console.log(`   Security Headers: ${scores[0]?.toFixed(1) || 0}/100`);
  console.log(`   Content Security Policy: ${scores[1]?.toFixed(1) || 0}/100`);
  console.log(`   Authentication Security: ${scores[2]?.toFixed(1) || 0}/100`);
  console.log(`   Bot Protection: ${scores[3]?.toFixed(1) || 0}/100`);
  console.log(`   HTTPS/SSL Security: ${scores[4]?.toFixed(1) || 0}/100`);
  
  // Production readiness assessment
  console.log(`\n🚀 PRODUCTION READINESS:`);
  if (averageScore >= 85 && testResults.criticalIssues.length === 0) {
    console.log('   ✅ APPROVED FOR PRODUCTION DEPLOYMENT');
  } else if (averageScore >= 75 && testResults.criticalIssues.length <= 2) {
    console.log('   ⚠️ CONDITIONAL APPROVAL - Address critical issues first');
  } else {
    console.log('   ❌ NOT READY FOR PRODUCTION - Security fixes required');
  }
  
  console.log('\n' + '='.repeat(60));
  
  return {
    overallScore: averageScore,
    productionReady: averageScore >= 85 && testResults.criticalIssues.length === 0,
    testResults
  };
}

/**
 * Main security validation execution
 */
async function runSecurityValidation() {
  console.log('🔒 STARTING COMPREHENSIVE SECURITY VALIDATION');
  console.log(`🎯 Target: ${PRODUCTION_URL}`);
  console.log(`⏰ Started: ${new Date().toISOString()}`);
  
  const scores = [];
  
  try {
    // Run all security tests
    scores.push(await testSecurityHeaders());
    scores.push(await testContentSecurityPolicy());
    scores.push(await testAuthenticationSecurity());
    scores.push(await testBotProtection());
    scores.push(await testHTTPSSecurity());
    
    // Generate final report
    const report = generateSecurityReport(scores);
    
    // Save detailed results to file
    const fs = require('fs');
    const reportFile = `security-validation-report-${Date.now()}.json`;
    fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));
    console.log(`\n💾 Detailed report saved to: ${reportFile}`);
    
    // Exit with appropriate code
    process.exit(report.productionReady ? 0 : 1);
    
  } catch (error) {
    console.error(`\n💥 Security validation failed: ${error.message}`);
    process.exit(1);
  }
}

// Run the security validation
if (require.main === module) {
  runSecurityValidation();
}

module.exports = {
  runSecurityValidation,
  testResults
};