#!/bin/bash

# Production Validation Test Runner
# Executes comprehensive tests against www.llmtxtmastery.com

echo "🧪 Starting Production Validation Tests"
echo "========================================"
echo "Target: https://www.llmtxtmastery.com"
echo "Tests: Double-increment fix + Email verification flow"
echo ""

# Install Playwright browsers if needed
npx playwright install

# Run production tests with comprehensive reporting
echo "📊 Running Double-Increment Bug Fix Validation..."
npx playwright test tests/e2e/production-double-increment-validation.spec.ts \
  --config=playwright.production.config.ts \
  --reporter=html \
  --reporter=list \
  --project=chromium-production \
  --timeout=300000

echo ""
echo "📧 Running Email Verification Flow Tests..."
npx playwright test tests/e2e/production-email-verification-comprehensive.spec.ts \
  --config=playwright.production.config.ts \
  --reporter=html \
  --reporter=list \
  --project=chromium-production \
  --timeout=300000

echo ""
echo "🎯 Production Validation Complete!"
echo "📊 Check playwright-report-production/index.html for detailed results"
echo "📸 Screenshots saved in test-results/ directory"