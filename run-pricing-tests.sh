#!/bin/bash

# LLM.txt Mastery - Automated Pricing Validation Tests
# Created: January 30, 2025
# Purpose: Validate pricing corrections are live in production

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test counters
PASSED=0
FAILED=0

# Base URLs
FRONTEND_URL="https://www.llmtxtmastery.com"
API_URL="https://llm-txt-mastery-production.up.railway.app"

echo "=========================================="
echo "LLM.txt Mastery - Pricing Validation Tests"
echo "Date: $(date)"
echo "=========================================="
echo ""

# Function to run a test
run_test() {
    local test_name="$1"
    local command="$2"
    local expected="$3"
    
    echo -n "Testing: $test_name... "
    
    if eval "$command"; then
        echo -e "${GREEN}✅ PASS${NC}"
        ((PASSED++))
    else
        echo -e "${RED}❌ FAIL${NC}"
        echo "  Expected: $expected"
        ((FAILED++))
    fi
}

# Function to check for absence of text
check_not_present() {
    local test_name="$1"
    local url="$2"
    local search_text="$3"
    
    echo -n "Testing: $test_name... "
    
    if curl -s "$url" | grep -q "$search_text"; then
        echo -e "${RED}❌ FAIL${NC} - Found: '$search_text'"
        ((FAILED++))
    else
        echo -e "${GREEN}✅ PASS${NC} - Not found (correct)"
        ((PASSED++))
    fi
}

echo "=== PART 1: Coffee Tier Pricing Tests ==="
echo ""

# Test 1.1: Check homepage for $4.95 pricing
run_test "Homepage shows Coffee tier at \$4.95" \
    "curl -s $FRONTEND_URL | grep -q '\$4.95'" \
    "Coffee tier should show \$4.95/month"

# Test 1.2: Check for absence of $100 pricing
check_not_present "No \$100/month pricing for Coffee" \
    "$FRONTEND_URL" \
    "\$100.*month"

# Test 1.3: Check for correct Coffee messaging
run_test "Coffee tier mentions '100 analyses'" \
    "curl -s $FRONTEND_URL | grep -qi '100.*analy'" \
    "Should mention 100 analyses"

echo ""
echo "=== PART 2: Scale Tier Benefits Tests ==="
echo ""

# Test 2.1: Check for removed false benefits
check_not_present "No 'Dedicated account manager'" \
    "$FRONTEND_URL" \
    "Dedicated account manager"

check_not_present "No 'Custom SLA agreements'" \
    "$FRONTEND_URL" \
    "Custom SLA"

# Test 2.2: Check for correct Scale benefits
run_test "Scale tier mentions 'API access'" \
    "curl -s $FRONTEND_URL | grep -qi 'API access'" \
    "Should mention API access"

echo ""
echo "=== PART 3: Free Tier Warning Tests ==="
echo ""

# Test 3.1: Check for new compelling warning
run_test "Free tier warning about 20 pages" \
    "curl -s $FRONTEND_URL | grep -q 'only 20 pages'" \
    "Should warn about 20 page limit"

# Test 3.2: Check warning mentions missing content
run_test "Warning mentions missing features/pricing" \
    "curl -s $FRONTEND_URL | grep -qi 'missing.*pricing.*features'" \
    "Should mention missing critical content"

echo ""
echo "=== PART 4: API Health Checks ==="
echo ""

# Test 4.1: API health endpoint
run_test "API health endpoint responds" \
    "curl -s $API_URL/api/health | grep -q 'ok'" \
    "API should return ok status"

# Test 4.2: Check API for pricing data
run_test "API pricing endpoint (if exists)" \
    "curl -s -o /dev/null -w '%{http_code}' $API_URL/api/pricing | grep -q '200\|404'" \
    "API should respond with 200 or 404"

echo ""
echo "=== PART 5: Quick Visual Checks ==="
echo ""

# Generate test URLs for manual checking
echo "Please manually verify these pages:"
echo -e "${YELLOW}1. Signup page:${NC} $FRONTEND_URL/signup"
echo "   - Coffee tier should show \$4.95/month"
echo "   - Scale tier should NOT mention dedicated account manager"
echo ""
echo -e "${YELLOW}2. Pricing page:${NC} $FRONTEND_URL/pricing"
echo "   - All tiers should have correct pricing"
echo "   - Benefits should be accurate"
echo ""
echo -e "${YELLOW}3. Dashboard (requires login):${NC} $FRONTEND_URL/dashboard"
echo "   - Billing section should show correct pricing"
echo "   - Tier benefits should be accurate"

echo ""
echo "=========================================="
echo "TEST RESULTS SUMMARY"
echo "=========================================="
echo -e "Passed: ${GREEN}$PASSED${NC}"
echo -e "Failed: ${RED}$FAILED${NC}"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}✅ ALL AUTOMATED TESTS PASSED!${NC}"
    echo "Please complete manual verification above."
    exit 0
else
    echo -e "${RED}⚠️  SOME TESTS FAILED!${NC}"
    echo "Please investigate failures before deployment."
    exit 1
fi