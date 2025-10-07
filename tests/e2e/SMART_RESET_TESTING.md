# Smart Reset Testing Suite

This comprehensive Playwright test suite validates the critical "Analyze Another Website" smart reset functionality that allows users to start new analyses without losing their authentication context or being forced back to email capture.

## 🎯 Testing Mission

**CRITICAL USER FLOW ISSUE FIXED**: Users clicking "Analyze Another Website" no longer get forced back to email capture. The `START_NEW_ANALYSIS` event preserves user context while clearing analysis data.

### Test Email Accounts

- **Free Tier**: `idaltddlpaxgqjrecs@enotj.com` (3 analyses per day)
- **Coffee Tier**: `coffee-test@example.com` (unlimited premium analyses)

## 📁 Test Suite Structure

### Core Test Files

#### 1. `smart-reset-flow.spec.ts`

**Main user flow validation**

- Complete journey: URL → Email Capture → Analysis → "Analyze Another Website" → Direct to URL input
- State machine event validation (`START_NEW_ANALYSIS` vs `RESET_WORKFLOW`)
- Error recovery during smart reset
- Rapid interaction edge cases

#### 2. `multi-analysis-flow.spec.ts`

**Multiple analysis scenarios**

- Free tier usage tracking (1/3, 2/3, 3/3 progression)
- Coffee tier unlimited analysis capability
- Daily limit enforcement and upgrade prompts
- Usage persistence across browser sessions
- Concurrent analysis handling

#### 3. `state-preservation.spec.ts`

**Context preservation validation**

- User authentication context preservation
- Usage tracking accuracy across resets
- Tier-specific behavior maintenance
- Component state synchronization
- Browser event handling (refresh, navigation, resize)

#### 4. `smart-reset-test-runner.spec.ts`

**Comprehensive validation suite**

- End-to-end critical flow validation
- Complete user journey simulation
- Integration testing across all components
- Regression testing to ensure no broken functionality
- Health check reporting

### Utility Modules

#### 5. `utils/smart-reset-helpers.ts`

**Specialized smart reset utilities**

- State snapshot capture and comparison
- Complete analysis flow automation
- Smart reset execution and validation
- Usage tracking verification
- Multi-cycle testing patterns

#### 6. `utils/auth-helpers.ts` (Updated)

**Enhanced authentication helpers**

- Smart reset specific functions added
- User context validation
- Browser state monitoring
- Coffee tier simulation

## 🚀 Running the Tests

### Run All Smart Reset Tests

```bash
# Run complete smart reset test suite
npx playwright test tests/e2e/smart-reset-*

# Run with detailed logging
npx playwright test tests/e2e/smart-reset-* --headed --slowMo=1000

# Run specific test file
npx playwright test tests/e2e/smart-reset-flow.spec.ts
```

### Run Critical Tests Only

```bash
# Run the comprehensive test runner (most important)
npx playwright test tests/e2e/smart-reset-test-runner.spec.ts

# Run with different browsers
npx playwright test tests/e2e/smart-reset-test-runner.spec.ts --project=chromium
npx playwright test tests/e2e/smart-reset-test-runner.spec.ts --project=firefox
npx playwright test tests/e2e/smart-reset-test-runner.spec.ts --project=webkit
```

### Debug Mode

```bash
# Run in debug mode with inspector
npx playwright test tests/e2e/smart-reset-flow.spec.ts --debug

# Generate trace for debugging
npx playwright test tests/e2e/smart-reset-flow.spec.ts --trace=on
```

## ✅ Critical Test Scenarios

### 1. **Core User Flow Test**

```typescript
// Tests: Enter URL → Email Capture → Analysis → "Analyze Another Website" → Skip to URL input
test('should preserve user context when clicking "Analyze Another Website"');
```

### 2. **Free Tier Multi-Analysis Flow**

```typescript
// Tests: Complete 3 analyses with usage tracking 1/3 → 2/3 → 3/3
test('should accurately track usage through multiple analysis cycles');
```

### 3. **Coffee Tier Unlimited Analysis**

```typescript
// Tests: Coffee tier bypasses tier selection, allows unlimited analyses
test('should allow unlimited analyses for Coffee tier users');
```

### 4. **State Preservation Validation**

```typescript
// Tests: User email, tier info, usage counts maintained across resets
test('should preserve user authentication context across smart reset');
```

### 5. **Component Integration Tests**

```typescript
// Tests: Both content-review and file-generation "Analyze Another Website" buttons
test('should synchronize all UI components after smart reset');
```

## 🔍 Key Validation Criteria

### ✅ Must Pass Criteria

1. **User Context Preservation**
   - Usage display shows consistent "X/3" throughout entire flow
   - Tier badge (Starter/Coffee) maintained after reset
   - No re-authentication required

2. **Analysis Data Cleanup**
   - URL input field cleared after reset
   - Analysis results no longer visible
   - File generation state cleared

3. **Flow Optimization**
   - Smart reset goes directly to URL input (not email capture)
   - Coffee tier continues to bypass tier selection
   - State machine uses `START_NEW_ANALYSIS` event correctly

4. **Error Recovery**
   - Smart reset available even after analysis failures
   - Network issues don't corrupt user context
   - Rapid clicks handled gracefully

### 🎯 Page Selectors Used

```typescript
const SELECTORS = {
  urlInput: 'input[placeholder*="https://"]',
  emailInput: 'input[type="email"]',
  analyzeButton: 'button:has-text("Start Analysis")',
  analyzeAnotherButton: 'button:has-text("Analyze Another Website")',
  usageDisplay: '[class*="Today\'s Progress"], [class*="Premium Credits"]',
  tierBadge: 'span:has-text("Starter"), span:has-text("Coffee")',
  contentReviewCard: '[class*="card"]:has-text("Content Review")',
  fileGenerationCard: '[class*="card"]:has-text("File Generated Successfully")',
};
```

## 📊 Test Results Interpretation

### Health Check Metrics

The test runner provides a comprehensive health check:

```
📊 SMART RESET HEALTH REPORT:
   Basic Functionality: ✅ PASS
   User Context Preservation: ✅ PASS
   Analysis Data Clearing: ✅ PASS
   Usage Tracking: ✅ PASS
   Error Free: ✅ PASS
📈 OVERALL HEALTH: 5/5 (100%)
🎉 SMART RESET SYSTEM: FULLY OPERATIONAL
```

### Expected Console Logs

```
🔄 State transition: GENERATION + START_NEW_ANALYSIS
🔄 START_NEW_ANALYSIS: Preserving user context, clearing analysis data
📋 Preserved context: email=test@example.com, tier=starter, hasUser=true
✅ Smart reset validated - Usage: 1 / 3 → 1 / 3, Tier: Starter → Starter
```

## 🐛 Troubleshooting

### Common Issues

1. **Test Timeout on Analysis**
   - Analysis can take up to 60 seconds
   - Increase timeout if backend is slow: `{ timeout: 90000 }`

2. **Usage Count Not Updating**
   - Check if usage tracking API is working
   - Verify database connection
   - Look for console errors in browser

3. **Smart Reset Button Not Found**
   - Check if analysis completed successfully
   - Verify file generation step if testing from that state
   - Look for different button text variations

4. **Email Capture Still Showing**
   - Indicates smart reset not preserving user context
   - Check START_NEW_ANALYSIS event firing
   - Verify state machine implementation

### Debug Helpers

```typescript
// Capture state for debugging
const state = await captureStateSnapshot(page);
console.log('Current state:', state);

// Monitor state transitions
const transitions = await monitorSmartResetTransitions(page);
console.log('State transitions:', transitions);

// Check auth context
const authContext = await createAuthTestContext(page);
console.log('Auth events:', authContext.smartResetEvents);
```

## 🎛️ Configuration

### Playwright Config for Smart Reset Tests

```typescript
// playwright.config.ts additions for smart reset testing
use: {
  baseURL: 'http://localhost:8080', // Ensure local server running
  trace: 'on-first-retry', // Capture traces for debugging
  screenshot: 'only-on-failure', // Screenshots on test failures
  video: 'retain-on-failure' // Video recordings for failures
}
```

### Environment Setup

```bash
# Ensure development server is running
npm run dev

# Run tests against local development server
npx playwright test tests/e2e/smart-reset-*
```

## 🎉 Success Criteria

### All Tests Pass = Smart Reset Working ✅

When all tests pass, you can be confident that:

1. **User Experience Fixed**: Users can seamlessly analyze multiple websites without authentication friction
2. **State Management Correct**: User context preserved while analysis data properly cleared
3. **Usage Tracking Accurate**: Free tier limits enforced, Coffee tier unlimited access maintained
4. **Error Recovery Robust**: System handles edge cases and network issues gracefully
5. **No Regressions**: Existing functionality remains intact

### Test Coverage Report

```
📈 SMART RESET TEST COVERAGE:
✅ Core user flow validation
✅ Multi-analysis usage tracking
✅ State preservation across resets
✅ Coffee tier unlimited analysis
✅ Error recovery scenarios
✅ Edge case handling
✅ Component integration
✅ Regression prevention
✅ Browser compatibility
✅ Performance under load

OVERALL: 10/10 Critical Scenarios Covered
```

---

## 🔧 Maintenance

### Adding New Smart Reset Tests

1. **Use Existing Helpers**: Import from `smart-reset-helpers.ts`
2. **Follow Patterns**: Use consistent selectors and validation functions
3. **Test State Transitions**: Always validate user context preservation
4. **Include Edge Cases**: Test rapid clicks, network issues, browser events
5. **Update Health Check**: Add new validation metrics to test runner

### Updating for New Features

When adding new features that interact with smart reset:

1. **Update Selectors**: Add new UI elements to `SMART_RESET_SELECTORS`
2. **Extend State Snapshot**: Include new state properties in `SmartResetStateSnapshot`
3. **Add Validation**: Create specific validation functions for new behavior
4. **Update Test Runner**: Include new scenarios in comprehensive validation suite

This test suite ensures the smart reset functionality remains reliable and user-friendly as the application evolves.
