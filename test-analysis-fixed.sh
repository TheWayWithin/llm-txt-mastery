#\!/bin/bash

# Test improved analysis on production with your Coffee tier account

echo "=== TESTING IMPROVED ANALYSIS WITH COFFEE TIER ===="
echo ""

# Sites to test
SITES=("https://home.cern" "https://freecalchub.com" "https://docs.python.org")

for SITE in "${SITES[@]}"; do
  echo "Testing analysis for: $SITE"
  echo "1. Open browser to: https://www.llmtxtmastery.com"
  echo "2. Log in with your Coffee tier account"
  echo "3. Start analysis for: $SITE"
  echo "4. Watch the progress bar - it should:"
  echo "   - Update to 100% when complete (not stuck at 40%)"
  echo "   - Find more than 1-2 pages"
  echo ""
  echo "Press Enter to continue to next site..."
  read
done

echo "=== MANUAL TEST COMPLETE ===="
echo ""
echo "Summary of what to verify:"
echo "✅ Progress bar updates to 100% when analysis completes"
echo "✅ Analysis finds multiple pages (not just 1-2)"
echo "✅ CERN site should find documentation pages"
echo "✅ Freecalchub should find calculator pages"
echo "✅ Python docs should find many documentation pages"
