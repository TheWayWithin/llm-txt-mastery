#!/bin/bash

# Coffee Credits Test Suite Runner
# Tests the complete Coffee tier credit system against production

echo "🧪 Starting Coffee Credits Test Suite"
echo "=================================="
echo "Frontend: https://www.llmtxtmastery.com"
echo "Backend: https://llm-txt-mastery-production.up.railway.app"
echo "Test User: jamie.watters.mail@icloud.com"
echo ""

# Check for required environment variables
if [ -z "$ADMIN_KEY" ]; then
    echo "❌ ADMIN_KEY environment variable is required"
    echo "Please set ADMIN_KEY before running tests:"
    echo "export ADMIN_KEY=your_admin_key_here"
    exit 1
fi

echo "✅ ADMIN_KEY configured"

# Create test results directory
mkdir -p test-results

# Run the Coffee credits test suite
echo ""
echo "🚀 Running Coffee Credits Test Suite..."
echo ""

npx playwright test \
    --config=playwright.coffee-credits.config.ts \
    --reporter=html,list \
    --workers=1 \
    --timeout=120000 \
    --output=test-results \
    --video=retain-on-failure \
    --screenshot=only-on-failure \
    tests/coffee-credits.spec.ts

TEST_EXIT_CODE=$?

echo ""
echo "📊 Test Results Summary"
echo "======================"

if [ $TEST_EXIT_CODE -eq 0 ]; then
    echo "✅ All tests passed successfully!"
else
    echo "❌ Some tests failed (exit code: $TEST_EXIT_CODE)"
fi

# Show results directory
echo ""
echo "📁 Test artifacts saved to:"
echo "  - HTML Report: playwright-report-coffee-credits/index.html"
echo "  - Screenshots: test-results/"
echo "  - Videos: test-results/videos/"
echo "  - JSON Results: test-results/coffee-credits-results.json"

# Open HTML report if tests ran
if [ -f "playwright-report-coffee-credits/index.html" ]; then
    echo ""
    echo "🌐 Opening HTML report..."
    open playwright-report-coffee-credits/index.html 2>/dev/null || echo "Open playwright-report-coffee-credits/index.html to view detailed results"
fi

echo ""
echo "🔍 Key Test Scenarios Covered:"
echo "  1. Admin credit reset functionality"
echo "  2. Credit display in UI"
echo "  3. Credit consumption during analysis"
echo "  4. Credit exhaustion handling"
echo "  5. Monthly renewal simulation"
echo "  6. Security (unauthorized admin access)"
echo "  7. Edge cases and error handling"
echo "  8. System health validation"

exit $TEST_EXIT_CODE