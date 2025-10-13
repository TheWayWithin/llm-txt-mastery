#!/usr/bin/env node

/**
 * COMPREHENSIVE SECURITY RETEST
 * Re-validate security headers after discovering they ARE present on auth endpoints
 */

import https from 'https';

const PRODUCTION_URL = 'https://llm-txt-mastery-production.up.railway.app';

function testEndpointSecurity(endpoint, description) {
  return new Promise((resolve) => {
    console.log(`\n🔍 TESTING: ${endpoint}`);
    console.log(`Description: ${description}`);
    console.log('='.repeat(60));
    
    const url = new URL(`${PRODUCTION_URL}${endpoint}`);
    
    const req = https.request({
      hostname: url.hostname,
      path: url.pathname,
      method: 'GET',
      headers: {
        'User-Agent': 'SecurityValidator/2.0'
      }
    }, (res) => {
      console.log(`Status: ${res.statusCode}`);
      
      // Count ALL security-related headers
      const allSecurityHeaders = [
        'content-security-policy',
        'x-frame-options',
        'x-content-type-options', 
        'strict-transport-security',
        'referrer-policy',
        'permissions-policy',
        'cross-origin-opener-policy',
        'cross-origin-resource-policy',
        'x-xss-protection',
        'x-dns-prefetch-control',
        'origin-agent-cluster'
      ];
      
      let foundHeaders = 0;
      let missingHeaders = [];
      
      console.log('\nSECURITY HEADERS ANALYSIS:');
      allSecurityHeaders.forEach(header => {
        const value = res.headers[header];
        if (value) {
          console.log(`✅ ${header}: ${value}`);
          foundHeaders++;
        } else {
          console.log(`❌ ${header}: MISSING`);
          missingHeaders.push(header);
        }
      });
      
      console.log(`\nSUMMARY: ${foundHeaders}/${allSecurityHeaders.length} security headers (${Math.round((foundHeaders/allSecurityHeaders.length)*100)}%)`);
      
      resolve({
        endpoint,
        status: res.statusCode,
        foundHeaders,
        totalHeaders: allSecurityHeaders.length,
        coverage: Math.round((foundHeaders/allSecurityHeaders.length)*100),
        headers: res.headers
      });
    });
    
    req.on('error', (err) => {
      console.error('❌ ERROR:', err.message);
      resolve({ endpoint, error: err.message });
    });
    
    req.end();
  });
}

async function comprehensiveSecurityTest() {
  console.log('🚨 COMPREHENSIVE SECURITY HEADER REVALIDATION');
  console.log('==============================================');
  console.log('Re-testing after discovering security headers on auth endpoints');
  
  const endpoints = [
    { path: '/health', desc: 'Health check endpoint' },
    { path: '/api/auth/register', desc: 'Authentication endpoint' },
    { path: '/api/analyze', desc: 'Analysis endpoint (bot protection)' },
    { path: '/', desc: 'Root endpoint' },
    { path: '/api/health', desc: 'API health endpoint' }
  ];
  
  const results = [];
  
  for (const endpoint of endpoints) {
    const result = await testEndpointSecurity(endpoint.path, endpoint.desc);
    results.push(result);
    await new Promise(resolve => setTimeout(resolve, 1000)); // 1 second delay
  }
  
  console.log('\n' + '='.repeat(80));
  console.log('🔍 COMPREHENSIVE SECURITY ANALYSIS SUMMARY');
  console.log('='.repeat(80));
  
  let totalCoverage = 0;
  let validTests = 0;
  
  results.forEach(result => {
    if (!result.error) {
      console.log(`${result.endpoint}: ${result.coverage}% coverage (${result.foundHeaders}/${result.totalHeaders} headers)`);
      totalCoverage += result.coverage;
      validTests++;
    } else {
      console.log(`${result.endpoint}: ERROR - ${result.error}`);
    }
  });
  
  const averageCoverage = validTests > 0 ? Math.round(totalCoverage / validTests) : 0;
  
  console.log('\n📊 FINAL SECURITY ASSESSMENT:');
  console.log(`Average Security Coverage: ${averageCoverage}%`);
  
  if (averageCoverage >= 90) {
    console.log('✅ EXCELLENT: Security headers properly deployed');
  } else if (averageCoverage >= 70) {
    console.log('⚠️  GOOD: Most security headers present, some gaps');
  } else if (averageCoverage >= 50) {
    console.log('🔴 POOR: Major security gaps detected');
  } else {
    console.log('🚨 CRITICAL: Security headers mostly missing');
  }
  
  // Check specific critical headers across all endpoints
  const criticalHeaders = ['content-security-policy', 'x-frame-options', 'strict-transport-security'];
  const criticalCoverage = {};
  
  criticalHeaders.forEach(header => {
    const endpointsWithHeader = results.filter(r => r.headers && r.headers[header]).length;
    criticalCoverage[header] = Math.round((endpointsWithHeader / validTests) * 100);
  });
  
  console.log('\n🔒 CRITICAL SECURITY HEADERS STATUS:');
  Object.entries(criticalCoverage).forEach(([header, coverage]) => {
    const status = coverage >= 80 ? '✅' : coverage >= 50 ? '⚠️' : '❌';
    console.log(`${status} ${header}: ${coverage}% of endpoints`);
  });
}

comprehensiveSecurityTest();