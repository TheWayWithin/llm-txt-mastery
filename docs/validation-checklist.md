# User Journey Validation Checklist

## Email Verification Flow Validation

### Prerequisites

- [ ] Test email service configured (10minutemail.com or similar)
- [ ] Browser in incognito mode for clean testing
- [ ] Network tab open to monitor requests

### Signup & Email Verification

- [ ] Navigate to signup page with tier parameter
- [ ] Complete signup form with temporary email
- [ ] Verify redirect to /check-email page (NOT /analyze)
- [ ] Confirm check-email page displays proper instructions
- [ ] Verify resend email functionality works
- [ ] Check email inbox for verification message
- [ ] Click verification link in email
- [ ] Confirm auto-redirect to /analyze page after verification
- [ ] Verify no duplicate tabs created during process

### Access Protection Verification

- [ ] Attempt to access /analyze without email verification
- [ ] Confirm unauthorized users are redirected to appropriate page
- [ ] Verify email verification status persists across browser sessions
- [ ] Test logout/login cycle maintains verification status

## Usage Counter Validation

### Free Tier Testing

- [ ] Complete first analysis - verify counter shows 1/3
- [ ] Complete second analysis - verify counter shows 2/3 (NOT 4/3)
- [ ] Complete third analysis - verify counter shows 3/3
- [ ] Attempt fourth analysis - verify daily limit modal appears
- [ ] Confirm fourth analysis is blocked with proper error message

### Authenticated User Testing

- [ ] Login with verified account
- [ ] Perform analysis and verify counter increments correctly
- [ ] Logout and login again - verify counter persists
- [ ] Test across different browser sessions

### Counter Persistence Testing

- [ ] Perform analysis, refresh page - verify counter maintains state
- [ ] Complete analysis, navigate away and back - verify counter persists
- [ ] Test with multiple tabs open - verify counter sync

## Payment Flow Validation

### Coffee Tier Testing

- [ ] Select Coffee tier during signup
- [ ] Verify redirect to Stripe checkout
- [ ] Complete test payment (use Stripe test cards)
- [ ] Confirm account creation after successful payment
- [ ] Verify unlimited analysis access for Coffee tier users

### Upgrade Flow Testing

- [ ] Reach daily limit as free user
- [ ] Click upgrade prompts
- [ ] Verify Stripe checkout loads correctly
- [ ] Complete upgrade and verify tier change

## Cross-Browser Testing

### Chrome

- [ ] Complete full signup and verification flow
- [ ] Test usage counter functionality
- [ ] Verify payment integration works

### Firefox

- [ ] Complete full signup and verification flow
- [ ] Test usage counter functionality
- [ ] Verify payment integration works

### Safari

- [ ] Complete full signup and verification flow
- [ ] Test usage counter functionality
- [ ] Verify payment integration works

## Mobile Testing

### Mobile Chrome

- [ ] Complete signup flow on mobile device
- [ ] Verify email verification works on mobile
- [ ] Test analysis functionality on mobile

### Mobile Safari

- [ ] Complete signup flow on mobile device
- [ ] Verify email verification works on mobile
- [ ] Test analysis functionality on mobile

## Error Handling Validation

### Network Errors

- [ ] Test signup with network interruption
- [ ] Verify email resend during network issues
- [ ] Test payment flow with network problems

### Invalid Data

- [ ] Test signup with invalid email formats
- [ ] Verify password requirements are enforced
- [ ] Test with malformed URLs in analysis

### Rate Limiting

- [ ] Test email resend rate limiting (20 per 5 minutes)
- [ ] Verify analysis rate limiting enforcement
- [ ] Confirm appropriate error messages for rate limits

## Security Validation

### Email Verification Security

- [ ] Verify email tokens expire after 24 hours
- [ ] Confirm tokens are single-use only
- [ ] Test that expired tokens redirect to signup

### Access Control

- [ ] Verify unverified users cannot access protected features
- [ ] Confirm JWT tokens are properly validated
- [ ] Test session timeout behavior

## Performance Validation

### Page Load Times

- [ ] Verify signup page loads in <2 seconds
- [ ] Confirm check-email page loads quickly
- [ ] Test analysis page performance

### API Response Times

- [ ] Email verification API responds in <500ms
- [ ] Usage tracking updates in <1 second
- [ ] Analysis initiation responds quickly

## Regression Testing

### Previous Bug Verification

- [ ] Confirm double-increment bug is fixed (counter: 1→2→3, not 1→2→4)
- [ ] Verify email verification bypass is closed
- [ ] Test that all previous fixes remain working

### Feature Compatibility

- [ ] Verify all existing features work with email verification
- [ ] Confirm tier selection works with new flow
- [ ] Test that usage tracking integrates properly

## Production Validation

### Live Site Testing

- [ ] Test on actual production URL (www.llmtxtmastery.com)
- [ ] Verify all production environment variables are set
- [ ] Confirm email delivery works in production

### Database Validation

- [ ] Verify user records are created correctly
- [ ] Confirm email verification status is stored
- [ ] Test usage tracking data persistence

## Documentation Validation

### User Experience

- [ ] Verify check-email page instructions are clear
- [ ] Confirm error messages are user-friendly
- [ ] Test that help text is accessible and helpful

### Developer Experience

- [ ] Verify API documentation is up to date
- [ ] Confirm test utilities work as documented
- [ ] Test that error logs provide useful debugging info

---

## Test Completion Sign-off

**Tester**: ********\_******** **Date**: ********\_********

**Email Verification Flow**: ✅ / ❌ **Notes**: ********\_********

**Usage Counter Accuracy**: ✅ / ❌ **Notes**: ********\_********

**Payment Integration**: ✅ / ❌ **Notes**: ********\_********

**Cross-Browser Compatibility**: ✅ / ❌ **Notes**: ********\_********

**Security Validation**: ✅ / ❌ **Notes**: ********\_********

**Performance Standards**: ✅ / ❌ **Notes**: ********\_********

**Overall Result**: ✅ Ready for Production / ❌ Issues Found

**Critical Issues Found**: ********\_********

**Recommended Actions**: ********\_********
