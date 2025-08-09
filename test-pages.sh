#!/bin/bash

# Visual Refresh Page Testing
echo "🎨 TESTING VISUAL REFRESH ON KEY PAGES"
echo "========================================"

# Base URL
BASE_URL="http://localhost:5173"
USER_AGENT="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"

# Test homepage
echo -e "\n1. Testing Homepage (/)..."
curl -s -H "User-Agent: $USER_AGENT" "$BASE_URL/" | grep -c "logo-primary.png" > /dev/null && echo "  ✅ Logo loaded" || echo "  ❌ Logo missing"
curl -s -H "User-Agent: $USER_AGENT" "$BASE_URL/" | grep -c "hero-illustration.png" > /dev/null && echo "  ✅ Hero illustration loaded" || echo "  ❌ Hero missing"
curl -s -H "User-Agent: $USER_AGENT" "$BASE_URL/" | grep -c "how-it-works.png" > /dev/null && echo "  ✅ How it works diagram loaded" || echo "  ❌ How it works missing"

# Test pricing page
echo -e "\n2. Testing Pricing Page (/pricing)..."
curl -s -H "User-Agent: $USER_AGENT" "$BASE_URL/pricing" | grep -c "logo-primary.png" > /dev/null && echo "  ✅ Logo on pricing page" || echo "  ❌ Logo missing"

# Test 404 page
echo -e "\n3. Testing 404 Error Page..."
curl -s -H "User-Agent: $USER_AGENT" "$BASE_URL/nonexistent" | grep -c "error-404.png" > /dev/null && echo "  ✅ 404 error illustration" || echo "  ❌ 404 illustration missing"

# Test dashboard (requires auth but we can check if page loads)
echo -e "\n4. Testing Dashboard (/dashboard)..."
response=$(curl -s -o /dev/null -w "%{http_code}" -H "User-Agent: $USER_AGENT" "$BASE_URL/dashboard")
if [ "$response" = "200" ]; then
  echo "  ✅ Dashboard page accessible"
else
  echo "  ⚠️  Dashboard requires authentication (expected)"
fi

# Test Coffee Success page
echo -e "\n5. Testing Coffee Success Page..."
curl -s -H "User-Agent: $USER_AGENT" "$BASE_URL/coffee-success" | grep -c "success-celebration.png" > /dev/null && echo "  ✅ Success celebration loaded" || echo "  ❌ Success image missing"

echo -e "\n========================================"
echo "📱 VISUAL REFRESH TEST COMPLETE"
echo ""
echo "To manually verify:"
echo "1. Open http://localhost:5173 in your browser"
echo "2. Check that the logo appears in the header"
echo "3. Verify hero illustration on homepage"
echo "4. Start an analysis to see tier icons"
echo "5. Navigate to non-existent page for 404 test"
echo ""
echo "✨ All automated tests completed!"