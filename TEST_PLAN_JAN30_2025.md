# LLM.txt Mastery - Comprehensive Test Plan

_Created: January 30, 2025_
_Purpose: Validate pricing corrections and perform full regression testing_

## 🎯 Test Objectives

1. Verify all Coffee tier pricing displays correctly as $4.95/month
2. Confirm Scale tier benefits are accurate (no false claims)
3. Validate free tier warning messages are compelling and accurate
4. Complete regression testing of all application features
5. Ensure payment flows work correctly with new pricing

## 📋 Test Environment

- **Frontend**: https://www.llmtxtmastery.com
- **Backend API**: https://llm-txt-mastery-production.up.railway.app
- **Test Payment Cards**: Stripe test mode cards
- **Browsers**: Chrome, Firefox, Safari, Edge

---

## PART 1: PRICING & BENEFITS VALIDATION TESTS

### Test Case 1.1: Coffee Tier Pricing Display

**Priority**: CRITICAL
**Objective**: Verify Coffee tier shows $4.95/month everywhere

#### Test Steps:

1. Navigate to homepage
2. Check pricing display in hero section
3. Navigate to /signup page
4. Verify Coffee tier shows "$4.95/month"
5. Navigate to /pricing page
6. Confirm Coffee tier pricing is $4.95/month
7. Start email capture flow
8. Verify tier selection shows "Coffee Power ($4.95/month)"
9. Login as existing user
10. Navigate to dashboard
11. Check billing section shows $4.95/month for Coffee tier

#### Expected Results:

- [ ] All pages show "$4.95/month" for Coffee tier
- [ ] No references to "$100/month" exist
- [ ] Message includes "100 analyses for the price of a coffee"
- [ ] Monthly subscription clearly indicated

### Test Case 1.2: Scale Tier Benefits Accuracy

**Priority**: HIGH
**Objective**: Ensure no misleading Scale tier benefits

#### Test Steps:

1. Navigate to /signup page
2. Review Scale tier benefits list
3. Navigate to /pricing page
4. Check Scale tier features
5. Start email capture flow
6. Select Scale tier and review benefits
7. Complete signup for Scale tier
8. Check dashboard for tier benefits display

#### Expected Results:

- [ ] NO mention of "Dedicated account manager"
- [ ] NO mention of "Custom SLA agreements"
- [ ] NO mention of "Enterprise white-label" (unless marked coming soon)
- [ ] Shows "API access for integrations"
- [ ] Shows "Multi-site management"
- [ ] Shows "Direct email support line"
- [ ] Shows "Unlimited pages per analysis"

### Test Case 1.3: Free Tier Warning Message

**Priority**: MEDIUM
**Objective**: Verify compelling free tier warnings

#### Test Steps:

1. Navigate to /signup page
2. Select free tier option
3. Check warning message
4. Navigate to email capture
5. Select free tier
6. Verify warning message

#### Expected Results:

- [ ] Warning shows: "AI sees only 20 pages - missing your pricing, features, case studies & what makes you unique!"
- [ ] NOT showing vague "competitors will find 10x more"
- [ ] Clearly explains impact of 20-page limitation
- [ ] Message is visually prominent (red/warning styling)

---

## PART 2: PAYMENT FLOW TESTING

### Test Case 2.1: Coffee Tier Purchase Flow

**Priority**: CRITICAL
**Objective**: Complete Coffee tier purchase at $4.95/month

#### Test Steps:

1. Start fresh incognito session
2. Navigate to homepage
3. Click "Get Started"
4. Enter test email: test-coffee-[timestamp]@example.com
5. Select Coffee tier ($4.95/month)
6. Click continue to payment
7. Enter Stripe test card: 4242 4242 4242 4242
8. Complete payment
9. Verify success page
10. Check email for confirmation

#### Expected Results:

- [ ] Stripe checkout shows $4.95/month subscription
- [ ] Payment processes successfully
- [ ] Success page confirms Coffee tier active
- [ ] User can access 100 monthly analyses
- [ ] Dashboard shows correct tier and benefits

### Test Case 2.2: Growth Tier Upgrade

**Priority**: HIGH
**Objective**: Upgrade from Coffee to Growth tier

#### Test Steps:

1. Login as Coffee tier user
2. Navigate to dashboard
3. Click upgrade to Growth
4. Verify pricing shows $9.95/month
5. Complete Stripe checkout
6. Verify tier upgrade success

#### Expected Results:

- [ ] Growth tier price shows $9.95/month
- [ ] Upgrade processes successfully
- [ ] Dashboard updates to show Growth tier
- [ ] Previous Coffee subscription cancelled
- [ ] New benefits immediately available

### Test Case 2.3: Scale Tier Direct Purchase

**Priority**: HIGH
**Objective**: Purchase Scale tier directly

#### Test Steps:

1. Start fresh session
2. Navigate to /signup
3. Select Scale tier ($19.95/month)
4. Complete signup flow
5. Verify Stripe checkout
6. Complete payment
7. Verify account creation

#### Expected Results:

- [ ] Scale tier shows $19.95/month
- [ ] Correct benefits displayed (no false claims)
- [ ] Payment processes successfully
- [ ] Account created with Scale tier active
- [ ] API access available

---

## PART 3: ANALYSIS FUNCTIONALITY REGRESSION

### Test Case 3.1: Free Tier Analysis Limits

**Priority**: HIGH
**Objective**: Verify free tier restrictions work

#### Test Steps:

1. Create free tier account
2. Run first analysis (should work)
3. Run second analysis (should work)
4. Run third analysis (should work)
5. Attempt fourth analysis (should be blocked)
6. Wait 24 hours or reset date
7. Verify can analyze again

#### Expected Results:

- [ ] First 3 analyses work
- [ ] 4th analysis blocked with upgrade prompt
- [ ] Only 20 pages analyzed per site
- [ ] No AI quality scoring available
- [ ] Basic HTML extraction only

### Test Case 3.2: Coffee Tier Full Analysis

**Priority**: CRITICAL
**Objective**: Verify Coffee tier gets full features

#### Test Steps:

1. Login as Coffee tier user
2. Enter website URL: https://example.com
3. Start analysis
4. Monitor progress bar
5. Verify completion
6. Check results

#### Expected Results:

- [ ] Analysis includes up to 200 pages
- [ ] AI quality scoring enabled
- [ ] Progress bar reaches 100%
- [ ] Can download LLM.txt file
- [ ] Can run multiple analyses (up to 100/month)
- [ ] Credits remaining counter updates

### Test Case 3.3: Scale Tier Unlimited Pages

**Priority**: MEDIUM
**Objective**: Verify Scale tier has no page limits

#### Test Steps:

1. Login as Scale tier user
2. Analyze large website (1000+ pages)
3. Verify all pages discovered
4. Check AI analysis quality
5. Download results

#### Expected Results:

- [ ] No page limit enforced
- [ ] AI analysis capped at $19.95 cost
- [ ] Full sitemap discovery
- [ ] API access available
- [ ] Multi-site management works

---

## PART 4: USER MANAGEMENT REGRESSION

### Test Case 4.1: User Registration Flow

**Priority**: HIGH
**Objective**: Verify new user registration

#### Test Steps:

1. Navigate to /signup
2. Enter new email
3. Create password
4. Select tier
5. Complete registration
6. Verify email (if required)
7. Login with credentials

#### Expected Results:

- [ ] Account created successfully
- [ ] Can login immediately
- [ ] Correct tier assigned
- [ ] Dashboard accessible
- [ ] Email verification works (if enabled)

### Test Case 4.2: Password Reset Flow

**Priority**: MEDIUM
**Objective**: Verify password reset functionality

#### Test Steps:

1. Click "Forgot password"
2. Enter registered email
3. Check email for reset link
4. Click reset link
5. Enter new password
6. Login with new password

#### Expected Results:

- [ ] Reset email sent
- [ ] Reset link works
- [ ] Password updated successfully
- [ ] Can login with new password
- [ ] Old password no longer works

### Test Case 4.3: Subscription Management

**Priority**: HIGH
**Objective**: Verify billing portal access

#### Test Steps:

1. Login as paid user
2. Navigate to dashboard
3. Click "Manage Billing"
4. Verify Stripe portal opens
5. Check subscription details
6. Test update payment method
7. Test cancel subscription

#### Expected Results:

- [ ] Stripe portal accessible
- [ ] Shows correct subscription
- [ ] Can update payment method
- [ ] Can cancel subscription
- [ ] Cancellation reflected in app

---

## PART 5: CRITICAL BUSINESS FLOWS

### Test Case 5.1: Free to Paid Conversion

**Priority**: CRITICAL
**Objective**: Verify upgrade flow from free tier

#### Test Steps:

1. Create free account
2. Use up 3 daily analyses
3. Attempt 4th analysis
4. Click upgrade when prompted
5. Select Coffee tier
6. Complete payment
7. Verify can now analyze

#### Expected Results:

- [ ] Upgrade prompt appears after limit
- [ ] Smooth transition to payment
- [ ] Tier upgrades immediately
- [ ] Can continue analyzing
- [ ] Previous analyses retained

### Test Case 5.2: Cancellation and Retention

**Priority**: HIGH
**Objective**: Test cancellation flow

#### Test Steps:

1. Login as paid user
2. Navigate to billing
3. Click cancel subscription
4. Review retention offers (if any)
5. Proceed with cancellation
6. Verify access continues until period end
7. Check downgrade after expiry

#### Expected Results:

- [ ] Cancellation processes immediately
- [ ] Access continues until period end
- [ ] Downgrades to free tier after expiry
- [ ] Historical data retained
- [ ] Can resubscribe anytime

### Test Case 5.3: Multi-Device Access

**Priority**: MEDIUM
**Objective**: Verify account works across devices

#### Test Steps:

1. Login on desktop browser
2. Start analysis
3. Login on mobile browser
4. Check analysis status
5. Download results on mobile
6. Verify sync across devices

#### Expected Results:

- [ ] Can login on multiple devices
- [ ] Analyses visible on all devices
- [ ] Downloads work on mobile
- [ ] No session conflicts
- [ ] Responsive design works

---

## PART 6: API AND INTEGRATION TESTS (Scale Tier)

### Test Case 6.1: API Authentication

**Priority**: MEDIUM
**Objective**: Verify API access for Scale tier

#### Test Steps:

1. Login as Scale tier user
2. Generate API key
3. Make test API call
4. Verify authentication
5. Test rate limits

#### Expected Results:

- [ ] API key generation works
- [ ] Authentication successful
- [ ] Correct rate limits applied
- [ ] Error handling works
- [ ] API documentation accurate

---

## 🔧 REGRESSION TEST CHECKLIST

### Frontend Components

- [ ] Homepage loads correctly
- [ ] Navigation menu works
- [ ] Footer links functional
- [ ] Responsive design on mobile
- [ ] Forms validate properly
- [ ] Error messages display
- [ ] Loading states work
- [ ] Modals open/close properly

### Backend Services

- [ ] API endpoints respond
- [ ] Database queries work
- [ ] File uploads process
- [ ] Email sending works
- [ ] Webhook handling works
- [ ] Caching functions properly
- [ ] Rate limiting enforced
- [ ] Error logging works

### Security Tests

- [ ] SQL injection prevention
- [ ] XSS protection
- [ ] CSRF tokens work
- [ ] Authentication required
- [ ] Authorization enforced
- [ ] Sensitive data encrypted
- [ ] Rate limiting works
- [ ] Input validation works

### Performance Tests

- [ ] Page load under 3 seconds
- [ ] API response under 1 second
- [ ] Analysis completes timely
- [ ] No memory leaks
- [ ] Database queries optimized
- [ ] CDN serving assets
- [ ] Images optimized
- [ ] JavaScript minified

---

## 📊 Test Execution Tracking

### Test Summary

| Category           | Total Tests | Passed | Failed | Blocked | Not Run |
| ------------------ | ----------- | ------ | ------ | ------- | ------- |
| Pricing Validation | 3           | -      | -      | -       | -       |
| Payment Flows      | 3           | -      | -      | -       | -       |
| Analysis Features  | 3           | -      | -      | -       | -       |
| User Management    | 3           | -      | -      | -       | -       |
| Business Flows     | 3           | -      | -      | -       | -       |
| API Tests          | 1           | -      | -      | -       | -       |
| **TOTAL**          | **16**      | **-**  | **-**  | **-**   | **-**   |

### Severity Classification

- **CRITICAL**: Blocks revenue or core functionality
- **HIGH**: Major feature broken but workarounds exist
- **MEDIUM**: Feature degraded but usable
- **LOW**: Cosmetic or minor issues

### Test Environment Details

- Date: ******\_\_\_\_******
- Tester: ******\_\_\_\_******
- Browser: ******\_\_\_\_******
- OS: ******\_\_\_\_******
- Build Version: ******\_\_\_\_******

---

## 🐛 Defect Log

### Defect Template

```
ID: [AUTO-INCREMENT]
Date: [DATE]
Test Case: [TEST CASE ID]
Severity: [CRITICAL/HIGH/MEDIUM/LOW]
Description: [WHAT HAPPENED]
Expected: [WHAT SHOULD HAPPEN]
Actual: [WHAT ACTUALLY HAPPENED]
Steps to Reproduce: [DETAILED STEPS]
Screenshots: [ATTACH IF APPLICABLE]
Status: [OPEN/IN PROGRESS/FIXED/CLOSED]
```

---

## ✅ Sign-Off Criteria

### Ready for Production when:

1. All CRITICAL test cases pass
2. All HIGH priority test cases pass
3. No CRITICAL or HIGH severity defects remain open
4. Payment flows tested with real Stripe test cards
5. Regression testing completed
6. Performance benchmarks met
7. Security tests passed

### Approval

- QA Lead: ******\_\_\_\_****** Date: ******\_\_\_\_******
- Product Owner: ******\_\_\_\_****** Date: ******\_\_\_\_******
- Engineering Lead: ******\_\_\_\_****** Date: ******\_\_\_\_******

---

## 🚀 Quick Smoke Test Script

For rapid validation after deployment:

```bash
#!/bin/bash
# Quick smoke test for pricing changes

echo "=== LLM.txt Mastery Smoke Test ==="
echo "Date: $(date)"
echo ""

# Test 1: Check Coffee tier pricing
echo "Test 1: Checking Coffee tier displays $4.95/month..."
curl -s https://www.llmtxtmastery.com | grep -q "4.95" && echo "✅ PASS" || echo "❌ FAIL"

# Test 2: Check API health
echo "Test 2: Checking API health..."
curl -s https://llm-txt-mastery-production.up.railway.app/api/health | grep -q "ok" && echo "✅ PASS" || echo "❌ FAIL"

# Test 3: Check no false Scale benefits
echo "Test 3: Checking Scale tier benefits..."
curl -s https://www.llmtxtmastery.com | grep -q "Dedicated account manager" && echo "❌ FAIL - Found false benefit" || echo "✅ PASS"

# Test 4: Check free tier warning
echo "Test 4: Checking free tier warning message..."
curl -s https://www.llmtxtmastery.com | grep -q "AI sees only 20 pages" && echo "✅ PASS" || echo "❌ FAIL"

echo ""
echo "=== Smoke Test Complete ==="
```

---

## 📝 Notes

- Always test in incognito/private mode to avoid cached data
- Use unique email addresses for each test run (append timestamp)
- Document any deviations from expected behavior
- Take screenshots of any failures
- Test on multiple browsers if possible
- Coordinate with development team before testing production

---

_End of Test Plan_
