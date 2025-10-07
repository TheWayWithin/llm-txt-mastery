/**
 * Jest Results Processor - Custom test results processing
 */

const fs = require('fs');
const path = require('path');

module.exports = (results) => {
  console.log('📊 Processing Jest test results...');

  // Extract key metrics
  const summary = {
    timestamp: new Date().toISOString(),
    testSuites: results.numTotalTestSuites,
    tests: results.numTotalTests,
    passed: results.numPassedTests,
    failed: results.numFailedTests,
    pending: results.numPendingTests,
    duration: results.testResults.reduce((total, suite) => total + suite.perfStats.runtime, 0),
    coverage: results.coverageMap
      ? {
          statements: results.coverageMap.getCoverageSummary().statements.pct,
          branches: results.coverageMap.getCoverageSummary().branches.pct,
          functions: results.coverageMap.getCoverageSummary().functions.pct,
          lines: results.coverageMap.getCoverageSummary().lines.pct,
        }
      : null,
  };

  // Log summary
  console.log('📈 Test Summary:');
  console.log(`  Tests: ${summary.passed}/${summary.tests} passed`);
  console.log(`  Duration: ${(summary.duration / 1000).toFixed(2)}s`);

  if (summary.coverage) {
    console.log(
      `  Coverage: ${summary.coverage.statements}% statements, ${summary.coverage.branches}% branches`
    );
  }

  // Save detailed results for CI
  const resultsDir = path.join(process.cwd(), 'test-results');
  if (!fs.existsSync(resultsDir)) {
    fs.mkdirSync(resultsDir, { recursive: true });
  }

  const resultsFile = path.join(resultsDir, 'jest-results.json');
  fs.writeFileSync(resultsFile, JSON.stringify({ summary, results }, null, 2));

  // Check if tests meet quality gates
  const qualityGate = {
    minPassRate: 0.95, // 95% pass rate
    minCoverage: 0.8, // 80% coverage
    maxDuration: 300000, // 5 minutes max
  };

  const passRate = summary.passed / summary.tests;
  const meetsPassRate = passRate >= qualityGate.minPassRate;
  const meetsCoverage = summary.coverage
    ? summary.coverage.statements >= qualityGate.minCoverage * 100
    : false;
  const meetsDuration = summary.duration <= qualityGate.maxDuration;

  if (!meetsPassRate) {
    console.warn(
      `⚠️ Pass rate ${(passRate * 100).toFixed(1)}% below threshold ${qualityGate.minPassRate * 100}%`
    );
  }

  if (summary.coverage && !meetsCoverage) {
    console.warn(
      `⚠️ Coverage ${summary.coverage.statements}% below threshold ${qualityGate.minCoverage * 100}%`
    );
  }

  if (!meetsDuration) {
    console.warn(
      `⚠️ Duration ${(summary.duration / 1000).toFixed(2)}s above threshold ${qualityGate.maxDuration / 1000}s`
    );
  }

  if (meetsPassRate && meetsCoverage && meetsDuration) {
    console.log('✅ All quality gates passed');
  }

  return results;
};
