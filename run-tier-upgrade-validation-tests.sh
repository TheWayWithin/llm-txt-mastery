#!/bin/bash

# TIER UPGRADE VALIDATION TEST RUNNER
# 
# This script runs comprehensive tests to validate the critical tier upgrade fixes
# in the Stripe webhook handlers. These tests ensure revenue protection is working
# correctly after the bug fix.

set -e

echo "🧪 TIER UPGRADE VALIDATION TEST SUITE"
echo "====================================="
echo ""
echo "Testing critical fixes for emailCaptures table updates in webhook handlers."
echo "BUSINESS IMPACT: Ensures paid customers receive correct tier benefits."
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test categories
echo -e "${BLUE}📋 TEST CATEGORIES:${NC}"
echo "1. Unit Tests - Webhook Handler Logic"
echo "2. Integration Tests - Database Updates"
echo "3. E2E Tests - Revenue Protection Flow"
echo "4. Validation Tests - emailCaptures Updates"
echo "5. Verification Tests - getUserTier() Function"
echo ""

# Check if we have the necessary dependencies
echo -e "${YELLOW}🔍 Checking test environment...${NC}"

if ! command -v npm &> /dev/null; then
    echo -e "${RED}❌ npm is required but not installed.${NC}"
    exit 1
fi

if [ ! -f "package.json" ]; then
    echo -e "${RED}❌ package.json not found. Please run from project root.${NC}"
    exit 1
fi

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}📦 Installing dependencies...${NC}"
    npm install
fi

echo -e "${GREEN}✅ Environment check passed${NC}"
echo ""

# Function to run test with error handling
run_test() {
    local test_name="$1"
    local test_command="$2"
    local test_description="$3"
    
    echo -e "${BLUE}🧪 Running: $test_name${NC}"
    echo "   $test_description"
    
    if eval "$test_command"; then
        echo -e "${GREEN}✅ $test_name PASSED${NC}"
        return 0
    else
        echo -e "${RED}❌ $test_name FAILED${NC}"
        return 1
    fi
}

# Track test results
passed_tests=0
failed_tests=0
total_tests=0

# Function to update test counters
update_counters() {
    if [ $1 -eq 0 ]; then
        ((passed_tests++))
    else
        ((failed_tests++))
    fi
    ((total_tests++))
}

echo -e "${BLUE}🚀 STARTING TIER UPGRADE VALIDATION TESTS${NC}"
echo ""

# 1. Unit Tests - Webhook Handler Logic
echo -e "${YELLOW}═══ UNIT TESTS ═══${NC}"

run_test "Webhook Handlers Unit Tests" \
    "npx vitest run tests/unit/stripe-webhook-handlers.test.ts --reporter=verbose" \
    "Tests webhook handler functions for correct emailCaptures updates"
update_counters $?

run_test "Email Captures Validation Tests" \
    "npx vitest run tests/unit/email-captures-validation.test.ts --reporter=verbose" \
    "Tests emailCaptures table update operations and data integrity"
update_counters $?

run_test "getUserTier() Validation Tests" \
    "npx vitest run tests/unit/get-user-tier-validation.test.ts --reporter=verbose" \
    "Tests that getUserTier() returns correct tier after webhook processing"
update_counters $?

echo ""

# 2. Integration Tests - Database Updates
echo -e "${YELLOW}═══ INTEGRATION TESTS ═══${NC}"

run_test "Tier Upgrade Integration Tests" \
    "npx vitest run tests/integration/tier-upgrade-integration.test.ts --reporter=verbose" \
    "Tests complete webhook processing flow with real database operations"
update_counters $?

echo ""

# 3. TypeScript Compilation Check
echo -e "${YELLOW}═══ COMPILATION VALIDATION ═══${NC}"

run_test "TypeScript Compilation" \
    "npx tsc --noEmit --skipLibCheck" \
    "Ensures all test files compile without TypeScript errors"
update_counters $?

echo ""

# 4. E2E Tests (if environment allows)
echo -e "${YELLOW}═══ E2E TESTS (OPTIONAL) ═══${NC}"

if [ "$RUN_E2E_TESTS" = "true" ]; then
    echo "🌐 Running E2E tests..."
    run_test "Revenue Protection E2E Tests" \
        "npx playwright test tests/e2e/tier-upgrade-revenue-protection.spec.ts --reporter=line" \
        "Tests complete customer journey and revenue protection"
    update_counters $?
else
    echo "ℹ️  E2E tests skipped. Set RUN_E2E_TESTS=true to enable."
    echo "   E2E tests validate complete customer journey and webhook integration."
fi

echo ""

# Test Summary
echo -e "${BLUE}📊 TEST SUMMARY${NC}"
echo "===================="
echo "Total Tests: $total_tests"
echo -e "Passed: ${GREEN}$passed_tests${NC}"
echo -e "Failed: ${RED}$failed_tests${NC}"

if [ $failed_tests -eq 0 ]; then
    echo ""
    echo -e "${GREEN}🎉 ALL TESTS PASSED! 🎉${NC}"
    echo ""
    echo -e "${GREEN}✅ TIER UPGRADE FIXES VALIDATED${NC}"
    echo "   • emailCaptures table updates work correctly"
    echo "   • getUserTier() returns accurate tier information"
    echo "   • Revenue protection is functioning properly"
    echo "   • Webhook handlers update both userProfiles AND emailCaptures"
    echo ""
    echo -e "${GREEN}🛡️  REVENUE PROTECTION CONFIRMED${NC}"
    echo "   Paid customers will receive correct tier benefits."
    
    exit 0
else
    echo ""
    echo -e "${RED}❌ SOME TESTS FAILED${NC}"
    echo ""
    echo -e "${RED}⚠️  REVENUE PROTECTION AT RISK${NC}"
    echo "   Failed tests indicate potential issues with tier upgrade handling."
    echo "   Please review and fix failing tests before deploying."
    echo ""
    echo -e "${YELLOW}🔧 NEXT STEPS:${NC}"
    echo "   1. Review failed test output above"
    echo "   2. Fix identified issues in webhook handlers"
    echo "   3. Ensure emailCaptures table updates are working"
    echo "   4. Re-run tests until all pass"
    
    exit 1
fi