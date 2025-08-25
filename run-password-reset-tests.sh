#!/bin/bash

# Password Reset Testing Script
# Comprehensive end-to-end testing with 10minutemail.com integration

echo "🚀 Starting Comprehensive Password Reset Testing"
echo "================================================="
echo "Target Environment: https://www.llmtxtmastery.com"
echo "Email Service: 10minutemail.com"
echo "Date: $(date)"
echo "================================================="

# Create test results directory
mkdir -p test-results
mkdir -p playwright-report-password-reset

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to log with timestamp
log() {
    echo "[$(date '+%H:%M:%S')] $1"
}

# Function to print colored output
print_status() {
    local status=$1
    local message=$2
    case $status in
        "SUCCESS")
            echo -e "${GREEN}✅ $message${NC}"
            ;;
        "ERROR") 
            echo -e "${RED}❌ $message${NC}"
            ;;
        "WARNING")
            echo -e "${YELLOW}⚠️ $message${NC}"
            ;;
        *)
            echo "ℹ️ $message"
            ;;
    esac
}

# Pre-flight checks
log "🔍 Running pre-flight checks..."

# Check if Playwright is installed
if ! npx playwright --version > /dev/null 2>&1; then
    print_status "ERROR" "Playwright not found. Installing Playwright..."
    npm install @playwright/test
    npx playwright install
fi

# Check if production site is accessible
log "🌐 Checking production site accessibility..."
if curl -s --head "https://www.llmtxtmastery.com" | head -n 1 | grep -q "200 OK"; then
    print_status "SUCCESS" "Production site is accessible"
else
    print_status "WARNING" "Production site may not be fully accessible, but continuing with tests"
fi

# Check if API is accessible
log "🔗 Checking API accessibility..."
if curl -s --head "https://llm-txt-mastery-production.up.railway.app/api/health" | head -n 1 | grep -q "200 OK"; then
    print_status "SUCCESS" "API backend is accessible"
else
    print_status "WARNING" "API backend may not be fully accessible, but continuing with tests"
fi

# Check if 10minutemail is accessible
log "📧 Checking 10minutemail.com accessibility..."
if curl -s --head "https://10minutemail.com" | head -n 1 | grep -q "200 OK"; then
    print_status "SUCCESS" "10minutemail.com is accessible"
else
    print_status "WARNING" "10minutemail.com may not be accessible - tests may fail"
fi

print_status "SUCCESS" "Pre-flight checks completed"
echo ""

# Run the comprehensive password reset tests
log "🧪 Starting comprehensive password reset tests..."
echo ""

# Run tests with password reset configuration
npx playwright test --config=playwright.password-reset.config.ts --reporter=list

# Capture exit code
TEST_EXIT_CODE=$?

echo ""
log "📊 Test execution completed with exit code: $TEST_EXIT_CODE"

# Generate additional reporting
if [ $TEST_EXIT_CODE -eq 0 ]; then
    print_status "SUCCESS" "All password reset tests passed!"
else
    print_status "ERROR" "Some password reset tests failed - check results"
fi

# Generate HTML report
log "📈 Generating HTML test report..."
npx playwright show-report playwright-report-password-reset --host=localhost --port=0 &
REPORT_PID=$!

# Wait a moment for the server to start
sleep 3

print_status "SUCCESS" "HTML report generated at: playwright-report-password-reset/index.html"

# Kill the report server
kill $REPORT_PID 2>/dev/null || true

# Display test results summary
echo ""
echo "📋 TEST EXECUTION SUMMARY"
echo "========================="

if [ -f "test-results-password-reset.json" ]; then
    # Extract basic stats from JSON report
    TOTAL_TESTS=$(grep -o '"tests":\[' test-results-password-reset.json | wc -l)
    echo "Total Tests Executed: $TOTAL_TESTS"
    
    # Check for failures
    if grep -q '"status":"failed"' test-results-password-reset.json; then
        FAILED_TESTS=$(grep -o '"status":"failed"' test-results-password-reset.json | wc -l)
        echo "Failed Tests: $FAILED_TESTS"
        print_status "ERROR" "Some tests failed - review the detailed report"
    else
        print_status "SUCCESS" "All tests passed!"
    fi
else
    print_status "WARNING" "JSON test results not found"
fi

# List generated artifacts
echo ""
echo "📁 GENERATED ARTIFACTS"
echo "======================"
echo "• HTML Report: playwright-report-password-reset/index.html"
echo "• JSON Results: test-results-password-reset.json"
echo "• JUnit XML: test-results-password-reset.xml"
echo "• Screenshots: test-results/password-reset-*.png"
echo "• Videos: test-results/*.webm (if failures occurred)"

# Security validation summary
echo ""
echo "🔒 SECURITY VALIDATION CHECKLIST"
echo "================================="
echo "• Invalid token rejection"
echo "• Password strength enforcement"
echo "• Password confirmation matching" 
echo "• Email enumeration protection"
echo "• Rate limiting behavior"
echo "• Network error handling"
echo "• Cross-browser compatibility"

# Recommendations
echo ""
echo "💡 NEXT STEPS"
echo "============="
echo "1. Review the HTML report for detailed test results"
echo "2. Check any failed test screenshots for debugging"
echo "3. Validate security measures are working correctly"
echo "4. Confirm real email delivery is functioning"
echo "5. Test password reset flow manually if needed"

# Final status
echo ""
if [ $TEST_EXIT_CODE -eq 0 ]; then
    print_status "SUCCESS" "Password reset testing completed successfully!"
    echo "🎉 All tests passed - password reset functionality is production-ready!"
else
    print_status "ERROR" "Password reset testing completed with issues"
    echo "🔧 Review failed tests and fix any issues before production deployment"
fi

echo ""
echo "Testing completed at: $(date)"
echo "================================================="

exit $TEST_EXIT_CODE