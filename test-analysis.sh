#\!/bin/bash

# Test improved analysis on multiple sites

echo "=== TESTING IMPROVED ANALYSIS ===="
echo ""

# Sites to test
SITES=("https://home.cern" "https://freecalchub.com" "https://example.com")
EMAIL="test$(date +%s)@guerrillamail.com"

echo "1. Capturing email for testing: $EMAIL"
curl -s -X POST https://llm-txt-mastery-production.up.railway.app/api/email-capture \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"tier\":\"starter\"}" | python3 -c "import sys,json; print('Email captured:',json.loads(sys.stdin.read())['message'])" 2>/dev/null

echo ""
for SITE in "${SITES[@]}"; do
  echo "2. Testing analysis for: $SITE"
  
  # Start analysis
  RESPONSE=$(curl -s -X POST https://llm-txt-mastery-production.up.railway.app/api/analyze \
    -H "Content-Type: application/json" \
    -d "{\"url\":\"$SITE\",\"email\":\"$EMAIL\"}")
  
  ANALYSIS_ID=$(echo "$RESPONSE" | python3 -c "import sys,json; print(json.loads(sys.stdin.read())['analysisId'])" 2>/dev/null)
  
  if [ -z "$ANALYSIS_ID" ]; then
    echo "   Failed to start analysis: $RESPONSE"
    continue
  fi
  
  echo "   Analysis started with ID: $ANALYSIS_ID"
  
  # Poll for results (max 30 seconds)
  for i in {1..10}; do
    sleep 3
    STATUS_RESPONSE=$(curl -s "https://llm-txt-mastery-production.up.railway.app/api/analysis/$ANALYSIS_ID")
    STATUS=$(echo "$STATUS_RESPONSE" | python3 -c "import sys,json; print(json.loads(sys.stdin.read())['status'])" 2>/dev/null)
    
    if [ "$STATUS" = "completed" ]; then
      PAGES=$(echo "$STATUS_RESPONSE" | python3 -c "import sys,json; print(len(json.loads(sys.stdin.read())['discoveredPages']))" 2>/dev/null)
      echo "   ✅ Analysis completed: Found $PAGES pages"
      break
    elif [ "$STATUS" = "failed" ]; then
      ERROR=$(echo "$STATUS_RESPONSE" | python3 -c "import sys,json; print(json.loads(sys.stdin.read()).get('error','Unknown error'))" 2>/dev/null)
      echo "   ❌ Analysis failed: $ERROR"
      break
    else
      echo "   Status: $STATUS (attempt $i/10)"
    fi
  done
  
  echo ""
done

echo "=== TEST COMPLETE ===="
