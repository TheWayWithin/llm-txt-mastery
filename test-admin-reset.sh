#!/bin/bash

# Test Admin Credit Reset Script
# Usage: ./test-admin-reset.sh

echo "🔧 Testing Coffee Tier Admin Credit Reset"
echo "=========================================="
echo ""

# Your admin key from Railway
ADMIN_KEY="admin_llmtxt_8f7d4a2b9c3e6h5j8k2m4n7p9q3r6s8t"
EMAIL="jamie.watters.mail@icloud.com"
API_URL="https://llm-txt-mastery-production.up.railway.app"

echo "📍 Testing endpoint: $API_URL/api/auth/admin/reset-coffee-credits"
echo "📧 User email: $EMAIL"
echo "🔑 Admin key: ${ADMIN_KEY:0:20}..."
echo ""

echo "🚀 Sending request..."
echo "---"

# Make the request
response=$(curl -s -X POST "$API_URL/api/auth/admin/reset-coffee-credits" \
  -H "Content-Type: application/json" \
  -H "x-admin-key: $ADMIN_KEY" \
  -d "{\"email\": \"$EMAIL\"}")

# Check if response is HTML (error) or JSON (success)
if [[ $response == *"<!DOCTYPE"* ]]; then
  echo "❌ ERROR: Received HTML instead of JSON"
  echo "This usually means the endpoint isn't deployed yet."
  echo ""
  echo "Response preview:"
  echo "$response" | head -5
else
  echo "✅ Received JSON response:"
  echo "$response" | python3 -m json.tool 2>/dev/null || echo "$response"
fi

echo ""
echo "---"
echo "🔍 Checking user's current credits..."
curl -s "$API_URL/api/usage/$EMAIL" | python3 -m json.tool 2>/dev/null || echo "Could not fetch usage data"

echo ""
echo "✅ Test complete!"