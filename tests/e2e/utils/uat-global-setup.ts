import { FullConfig } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Global Setup for UAT Testing
 * Runs once before all tests
 */
async function globalSetup(config: FullConfig) {
  console.log('🚀 Starting UAT Global Setup...');
  
  const startTime = Date.now();
  
  // Create necessary directories
  const directories = [
    'tests/reports',
    'tests/screenshots',
    'tests/downloads',
    'tests/videos',
    'tests/traces',
    'tests/reports/uat-html-report',
  ];
  
  for (const dir of directories) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      console.log(`📁 Created directory: ${dir}`);
    }
  }
  
  // Set environment variables
  process.env.TEST_RUN_ID = Date.now().toString();
  process.env.TEST_START_TIME = new Date().toISOString();
  
  // Log test configuration
  console.log('📋 Test Configuration:');
  console.log(`  - Environment: ${process.env.TEST_ENV || 'production'}`);
  console.log(`  - Base URL: ${config.use?.baseURL || 'https://www.llmtxtmastery.com'}`);
  console.log(`  - Workers: ${config.workers}`);
  console.log(`  - Projects: ${config.projects?.length || 0}`);
  console.log(`  - Test Run ID: ${process.env.TEST_RUN_ID}`);
  
  // Initialize test metrics file
  const metricsFile = path.join('tests/reports', 'uat-metrics.json');
  const initialMetrics = {
    runId: process.env.TEST_RUN_ID,
    startTime: process.env.TEST_START_TIME,
    environment: process.env.TEST_ENV || 'production',
    baseUrl: config.use?.baseURL,
    totalTests: 0,
    passedTests: 0,
    failedTests: 0,
    skippedTests: 0,
    bugs: [],
    performanceIssues: [],
    securityIssues: [],
  };
  
  fs.writeFileSync(metricsFile, JSON.stringify(initialMetrics, null, 2));
  console.log('📊 Initialized metrics tracking');
  
  // Check if test environment is reachable
  if (config.use?.baseURL) {
    try {
      const fetch = (await import('node-fetch')).default;
      const response = await fetch(config.use.baseURL);
      
      if (response.ok) {
        console.log(`✅ Test environment is reachable: ${config.use.baseURL}`);
      } else {
        console.warn(`⚠️ Test environment returned status ${response.status}`);
      }
    } catch (error) {
      console.error(`❌ Failed to reach test environment: ${error.message}`);
      
      // Don't fail setup if it's a local environment
      if (!config.use.baseURL.includes('localhost')) {
        throw new Error(`Cannot reach test environment: ${config.use.baseURL}`);
      }
    }
  }
  
  // Create test user database (for tracking across tests)
  const userDb = path.join('tests/reports', 'test-users.json');
  fs.writeFileSync(userDb, JSON.stringify({
    created: [],
    used: [],
    deleted: [],
  }, null, 2));
  
  // Log Stripe test mode warning if applicable
  if (process.env.TEST_ENV !== 'production') {
    console.log('⚠️ Running in TEST mode - Stripe payments will use test cards');
  } else {
    console.log('⚠️ Running against PRODUCTION - Be careful with real payments!');
  }
  
  const setupTime = Date.now() - startTime;
  console.log(`✨ Global setup completed in ${setupTime}ms`);
  
  return async () => {
    // This function will be called for teardown
    await globalTeardown(config);
  };
}

/**
 * Global Teardown for UAT Testing
 * Runs once after all tests
 */
async function globalTeardown(config: FullConfig) {
  console.log('🧹 Starting UAT Global Teardown...');
  
  const endTime = new Date().toISOString();
  
  // Update metrics with final data
  const metricsFile = path.join('tests/reports', 'uat-metrics.json');
  if (fs.existsSync(metricsFile)) {
    const metrics = JSON.parse(fs.readFileSync(metricsFile, 'utf-8'));
    metrics.endTime = endTime;
    metrics.duration = Date.now() - Date.parse(metrics.startTime);
    
    // Calculate pass rate
    if (metrics.totalTests > 0) {
      metrics.passRate = ((metrics.passedTests / metrics.totalTests) * 100).toFixed(2);
    }
    
    fs.writeFileSync(metricsFile, JSON.stringify(metrics, null, 2));
    
    // Generate summary report
    console.log('\n' + '='.repeat(80));
    console.log('UAT SUMMARY REPORT');
    console.log('='.repeat(80));
    console.log(`Run ID: ${metrics.runId}`);
    console.log(`Environment: ${metrics.environment}`);
    console.log(`Duration: ${(metrics.duration / 1000).toFixed(2)} seconds`);
    console.log(`Total Tests: ${metrics.totalTests}`);
    console.log(`Passed: ${metrics.passedTests}`);
    console.log(`Failed: ${metrics.failedTests}`);
    console.log(`Skipped: ${metrics.skippedTests}`);
    console.log(`Pass Rate: ${metrics.passRate}%`);
    
    // Check UAT sign-off criteria
    const signOffCriteria = {
      passRate: parseFloat(metrics.passRate) >= 95,
      noCriticalBugs: !metrics.bugs.some(b => b.severity === 'CRITICAL'),
      fewHighBugs: metrics.bugs.filter(b => b.severity === 'HIGH').length < 5,
      performanceOk: metrics.performanceIssues.length === 0,
      securityOk: metrics.securityIssues.length === 0,
    };
    
    console.log('\n📋 UAT Sign-off Criteria:');
    console.log(`  ${signOffCriteria.passRate ? '✅' : '❌'} Pass rate >= 95%`);
    console.log(`  ${signOffCriteria.noCriticalBugs ? '✅' : '❌'} No critical bugs`);
    console.log(`  ${signOffCriteria.fewHighBugs ? '✅' : '❌'} Less than 5 high severity bugs`);
    console.log(`  ${signOffCriteria.performanceOk ? '✅' : '❌'} Performance within SLA`);
    console.log(`  ${signOffCriteria.securityOk ? '✅' : '❌'} No security issues`);
    
    const allCriteriaMet = Object.values(signOffCriteria).every(v => v);
    
    if (allCriteriaMet) {
      console.log('\n🎉 UAT PASSED - Application is ready for production!');
    } else {
      console.log('\n⚠️ UAT FAILED - Issues need to be resolved before production');
    }
    
    console.log('='.repeat(80));
  }
  
  // Clean up test users (if needed)
  const userDb = path.join('tests/reports', 'test-users.json');
  if (fs.existsSync(userDb)) {
    const users = JSON.parse(fs.readFileSync(userDb, 'utf-8'));
    console.log(`📊 Test Users Created: ${users.created.length}`);
    
    // In a real scenario, you might want to delete test users from the database
    // For now, we just log them
  }
  
  // Archive test artifacts if needed
  if (process.env.ARCHIVE_RESULTS === 'true') {
    const archiveName = `uat-results-${process.env.TEST_RUN_ID}.tar.gz`;
    console.log(`📦 Archiving results to ${archiveName}`);
    
    // Archive command would go here
    // exec(`tar -czf ${archiveName} tests/reports tests/screenshots tests/videos`);
  }
  
  console.log('✨ Global teardown completed');
}

export default globalSetup;