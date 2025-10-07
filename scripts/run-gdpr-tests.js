#!/usr/bin/env node

/**
 * GDPR Compliance Test Runner
 *
 * Executes comprehensive GDPR compliance tests against the production site
 * and generates compliance documentation and reports.
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

console.log('🔒 GDPR Compliance Test Suite');
console.log('================================');
console.log('Testing against: https://www.llmtxtmastery.com');
console.log(`Timestamp: ${new Date().toISOString()}`);
console.log('');

// Ensure test results directory exists
const testResultsDir = path.join(projectRoot, 'test-results');
if (!fs.existsSync(testResultsDir)) {
  fs.mkdirSync(testResultsDir, { recursive: true });
}

// Clean up previous GDPR test results
const cleanupFiles = ['test-results-gdpr.json', 'test-results-gdpr.xml', 'playwright-report-gdpr'];

cleanupFiles.forEach((file) => {
  const fullPath = path.join(projectRoot, file);
  try {
    if (fs.existsSync(fullPath)) {
      if (fs.lstatSync(fullPath).isDirectory()) {
        fs.rmSync(fullPath, { recursive: true, force: true });
      } else {
        fs.unlinkSync(fullPath);
      }
      console.log(`🧹 Cleaned up: ${file}`);
    }
  } catch (error) {
    console.warn(`⚠️ Could not clean up ${file}:`, error.message);
  }
});

console.log('');

// Parse command line arguments
const args = process.argv.slice(2);
const options = {
  browser: 'all',
  debug: false,
  headed: false,
  ui: false,
  report: true,
};

args.forEach((arg) => {
  if (arg === '--chrome' || arg === '--chromium') options.browser = 'chromium-gdpr';
  if (arg === '--firefox') options.browser = 'firefox-gdpr';
  if (arg === '--safari' || arg === '--webkit') options.browser = 'webkit-gdpr';
  if (arg === '--mobile') options.browser = 'mobile-chrome-gdpr,mobile-safari-gdpr';
  if (arg === '--debug') options.debug = true;
  if (arg === '--headed') options.headed = true;
  if (arg === '--ui') options.ui = true;
  if (arg === '--no-report') options.report = false;
});

// Build playwright command
let playwrightCmd = 'npx playwright test gdpr-compliance-comprehensive.spec.ts';
playwrightCmd += ' --config playwright-gdpr.config.ts';

if (options.browser !== 'all') {
  playwrightCmd += ` --project=${options.browser}`;
}

if (options.debug) {
  playwrightCmd += ' --debug';
}

if (options.headed) {
  playwrightCmd += ' --headed';
}

if (options.ui) {
  playwrightCmd += ' --ui';
}

console.log(`🚀 Running command: ${playwrightCmd}`);
console.log('');

try {
  // Execute Playwright tests
  execSync(playwrightCmd, {
    stdio: 'inherit',
    cwd: projectRoot,
    env: {
      ...process.env,
      CI: process.env.CI || 'false',
    },
  });

  console.log('');
  console.log('✅ GDPR compliance tests completed successfully');

  // Generate compliance summary
  generateComplianceSummary();
} catch (error) {
  console.error('');
  console.error('❌ GDPR compliance tests failed');
  console.error('Error:', error.message);

  // Still try to generate summary if results exist
  try {
    generateComplianceSummary();
  } catch (summaryError) {
    console.error('Could not generate compliance summary:', summaryError.message);
  }

  process.exit(1);
}

function generateComplianceSummary() {
  console.log('');
  console.log('📊 Generating compliance summary...');

  const jsonResultsPath = path.join(projectRoot, 'test-results-gdpr.json');
  const htmlReportPath = path.join(projectRoot, 'playwright-report-gdpr', 'index.html');

  if (fs.existsSync(jsonResultsPath)) {
    try {
      const results = JSON.parse(fs.readFileSync(jsonResultsPath, 'utf8'));

      const summary = {
        timestamp: new Date().toISOString(),
        testUrl: 'https://www.llmtxtmastery.com',
        totalTests:
          results.suites?.reduce((acc, suite) => acc + (suite.specs?.length || 0), 0) || 0,
        passedTests: 0,
        failedTests: 0,
        skippedTests: 0,
        browsers: [],
        duration: results.duration || 0,
      };

      // Analyze results
      results.suites?.forEach((suite) => {
        suite.specs?.forEach((spec) => {
          spec.tests?.forEach((test) => {
            test.results?.forEach((result) => {
              if (result.status === 'passed') summary.passedTests++;
              else if (result.status === 'failed') summary.failedTests++;
              else if (result.status === 'skipped') summary.skippedTests++;

              if (
                result.workerIndex !== undefined &&
                !summary.browsers.includes(test.projectName)
              ) {
                summary.browsers.push(test.projectName);
              }
            });
          });
        });
      });

      const compliancePercentage =
        summary.totalTests > 0 ? Math.round((summary.passedTests / summary.totalTests) * 100) : 0;

      console.log('');
      console.log('📋 GDPR COMPLIANCE SUMMARY');
      console.log('==========================');
      console.log(`Test URL: ${summary.testUrl}`);
      console.log(`Timestamp: ${summary.timestamp}`);
      console.log(`Total Tests: ${summary.totalTests}`);
      console.log(`Passed: ${summary.passedTests}`);
      console.log(`Failed: ${summary.failedTests}`);
      console.log(`Skipped: ${summary.skippedTests}`);
      console.log(`Browsers: ${summary.browsers.join(', ')}`);
      console.log(`Duration: ${Math.round(summary.duration / 1000)}s`);
      console.log(`Compliance Rate: ${compliancePercentage}%`);

      if (compliancePercentage >= 90) {
        console.log('🟢 EXCELLENT GDPR Compliance');
      } else if (compliancePercentage >= 80) {
        console.log('🟡 GOOD GDPR Compliance - Minor improvements recommended');
      } else if (compliancePercentage >= 70) {
        console.log('🟠 FAIR GDPR Compliance - Improvements needed');
      } else {
        console.log('🔴 POOR GDPR Compliance - Critical issues require attention');
      }

      // Save compliance summary
      const summaryPath = path.join(projectRoot, 'gdpr-compliance-summary.json');
      fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2));
      console.log(`📄 Summary saved to: ${summaryPath}`);
    } catch (error) {
      console.error('❌ Could not parse test results:', error.message);
    }
  }

  if (fs.existsSync(htmlReportPath) && options.report) {
    console.log('');
    console.log('📊 GDPR Test Reports:');
    console.log(`HTML Report: ${htmlReportPath}`);
    console.log(`JSON Results: ${jsonResultsPath}`);
    console.log('');
    console.log('To view the HTML report:');
    console.log(`open ${htmlReportPath}`);
  }

  console.log('');
  console.log('🎯 Quick Commands:');
  console.log('- npm run test:gdpr           # Run GDPR tests (Chrome only)');
  console.log('- npm run test:gdpr:all       # Run GDPR tests (all browsers)');
  console.log('- npm run test:gdpr:debug     # Run GDPR tests with debugger');
  console.log('- npm run test:gdpr:report    # Generate HTML report');
  console.log('');
  console.log('📚 Script Usage:');
  console.log('- node scripts/run-gdpr-tests.js --chrome');
  console.log('- node scripts/run-gdpr-tests.js --firefox');
  console.log('- node scripts/run-gdpr-tests.js --mobile');
  console.log('- node scripts/run-gdpr-tests.js --debug --headed');
}
