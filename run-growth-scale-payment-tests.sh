#!/bin/bash

# Growth & Scale Tier Payment Testing Script
# THE TESTER - AGENT-11
# 
# This script runs comprehensive tests for the newly implemented 
# Growth ($9.95/month) and Scale ($19.95/month) payment processing

echo "🚀 GROWTH & SCALE TIER PAYMENT TESTING"
echo "======================================"
echo ""

# Set test environment
export NODE_ENV=test
export TEST_ENV=local

# Ensure test environment is clean
echo "🧹 Cleaning test environment..."
rm -rf test-results/growth-scale-* 2>/dev/null
rm -rf playwright-report-growth-scale-* 2>/dev/null

# Run the payment flow tests
echo "💳 Running Growth & Scale Payment Flow Tests..."
echo ""

# Test 1: Local environment tests
echo "📍 Testing against LOCAL environment (http://localhost:8080)..."
npx playwright test growth-scale-payment-flows --config=playwright.growth-scale-payment.config.ts --project=chromium-growth-scale-payments

# Check if local tests passed
if [ $? -eq 0 ]; then
    echo "✅ Local payment flow tests PASSED"
    local_tests_passed=true
else
    echo "❌ Local payment flow tests FAILED"
    local_tests_passed=false
fi

echo ""

# Test 2: Production environment tests (optional, commented out for safety)
# echo "📍 Testing against PRODUCTION environment (https://www.llmtxtmastery.com)..."
# export TEST_ENV=production
# npx playwright test growth-scale-payment-flows --config=playwright.growth-scale-payment.config.ts --project=chromium-growth-scale-payments --workers=1

# Test 3: API endpoint validation
echo "🔧 Testing API Endpoints Directly..."
echo ""

# Test Growth checkout endpoint
echo "Testing /api/stripe/create-growth-checkout..."
curl_result=$(curl -s -o /dev/null -w "%{http_code}" -X POST \
    http://localhost:8080/api/stripe/create-growth-checkout \
    -H "Content-Type: application/json" \
    -d '{"email":"test@example.com"}' 2>/dev/null)

if [ "$curl_result" = "401" ]; then
    echo "✅ Growth checkout endpoint responds (401 - auth required)"
    growth_api_ok=true
elif [ "$curl_result" = "400" ]; then
    echo "✅ Growth checkout endpoint responds (400 - validation error)"
    growth_api_ok=true
else
    echo "❌ Growth checkout endpoint issue (HTTP $curl_result)"
    growth_api_ok=false
fi

# Test Scale checkout endpoint  
echo "Testing /api/stripe/create-scale-checkout..."
curl_result=$(curl -s -o /dev/null -w "%{http_code}" -X POST \
    http://localhost:8080/api/stripe/create-scale-checkout \
    -H "Content-Type: application/json" \
    -d '{"email":"test@example.com"}' 2>/dev/null)

if [ "$curl_result" = "401" ]; then
    echo "✅ Scale checkout endpoint responds (401 - auth required)"
    scale_api_ok=true
elif [ "$curl_result" = "400" ]; then
    echo "✅ Scale checkout endpoint responds (400 - validation error)"
    scale_api_ok=true
else
    echo "❌ Scale checkout endpoint issue (HTTP $curl_result)"
    scale_api_ok=false
fi

# Test Upgrade session endpoint
echo "Testing /api/stripe/create-upgrade-session..."
curl_result=$(curl -s -o /dev/null -w "%{http_code}" -X POST \
    http://localhost:8080/api/stripe/create-upgrade-session \
    -H "Content-Type: application/json" \
    -d '{"targetTier":"growth"}' 2>/dev/null)

if [ "$curl_result" = "401" ]; then
    echo "✅ Upgrade session endpoint responds (401 - auth required)"
    upgrade_api_ok=true
else
    echo "❌ Upgrade session endpoint issue (HTTP $curl_result)"
    upgrade_api_ok=false
fi

echo ""

# Generate test report
echo "📊 TEST RESULTS SUMMARY"
echo "======================"
echo ""

if [ "$local_tests_passed" = true ]; then
    echo "✅ Payment Flow Tests: PASSED"
else
    echo "❌ Payment Flow Tests: FAILED"
fi

if [ "$growth_api_ok" = true ]; then
    echo "✅ Growth Checkout API: WORKING"
else
    echo "❌ Growth Checkout API: ISSUES FOUND"
fi

if [ "$scale_api_ok" = true ]; then
    echo "✅ Scale Checkout API: WORKING"
else
    echo "❌ Scale Checkout API: ISSUES FOUND"
fi

if [ "$upgrade_api_ok" = true ]; then
    echo "✅ Upgrade Session API: WORKING"
else
    echo "❌ Upgrade Session API: ISSUES FOUND"
fi

echo ""

# Overall assessment
all_passed=true

if [ "$local_tests_passed" != true ]; then
    all_passed=false
fi
if [ "$growth_api_ok" != true ]; then
    all_passed=false
fi
if [ "$scale_api_ok" != true ]; then
    all_passed=false
fi
if [ "$upgrade_api_ok" != true ]; then
    all_passed=false
fi

if [ "$all_passed" = true ]; then
    echo "🎉 OVERALL STATUS: ALL TESTS PASSED"
    echo "The Growth and Scale tier payment processing is working correctly!"
    exit_code=0
else
    echo "⚠️  OVERALL STATUS: SOME TESTS FAILED"
    echo "Review the test results above for specific issues to address."
    exit_code=1
fi

echo ""
echo "📁 Test artifacts saved to:"
echo "   - playwright-report-growth-scale-payments/"
echo "   - test-results-growth-scale-payments.json"
echo ""

# Show report location
if [ -d "playwright-report-growth-scale-payments" ]; then
    echo "🎯 View detailed test report:"
    echo "   npx playwright show-report playwright-report-growth-scale-payments"
    echo ""
fi

exit $exit_code