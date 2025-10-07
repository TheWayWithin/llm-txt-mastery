# Behavior Specifications & Edge Cases

**Date**: 2025-08-20  
**Context**: Pre-refactor safety documentation for 843-line EmailCapture and 627-line Analyze components  
**Purpose**: Document expected behaviors and edge cases to prevent regression during refactoring

## EmailCapture Component (843 lines)

### Core Behaviors

#### Tier Selection System

**Current Implementation**: Default coffee tier selection with radio button grid

```typescript
// Default state on component mount
selectedTier: 'coffee'; // Always defaults to coffee tier
```

**Tier Options & Pricing**:

1. **Starter (Free)** - "Free (But Crippled)"
   - 3 analyses per day limit
   - 20 pages maximum
   - No AI quality scoring
   - Severe limitations warning

2. **Coffee ($4.95)** - "Coffee Power ($4.95 one-time)" [DEFAULT]
   - Unlimited daily analyses
   - 200 pages per analysis
   - AI-powered content scoring
   - One-time payment
   - Green success styling

3. **Growth ($9.95/mo)** - "Professional Power ($9.95/mo)"
   - 1,000 pages per analysis
   - Team collaboration
   - Monthly subscription

4. **Scale ($19.95/mo)** - "Agency & API ($19.95/mo)"
   - Full API access
   - White-label options
   - Enterprise features

#### Navigation Behavior

**CRITICAL**: Component uses direct wouter navigation, NOT form submission

```typescript
// Sign In Navigation
setLocation(`/login?tier=${selectedTier}&website=${encodeURIComponent(websiteUrl || '')}`);

// Sign Up Navigation
setLocation(`/signup?tier=${selectedTier}&website=${encodeURIComponent(websiteUrl || '')}`);
```

**URL Parameter Encoding**: Website URLs are properly encoded in query params
**Analytics Tracking**: All tier selections and auth clicks tracked with GA4 events

### Edge Cases & Business Rules

#### Tier Selection Logic

- **Default Selection**: Coffee tier ALWAYS selected on mount
- **Visual Feedback**: Selected tier shows checked radio button + special styling
- **State Persistence**: Tier selection maintained throughout component lifecycle
- **Analytics**: Every tier change triggers 'tier_selected' event with previous/current tiers

#### Authentication Flow Integration

- **Auth Buttons**: Only visible AFTER tier selection (since coffee is default, always visible)
- **Login vs Signup**: Both buttons navigate to respective pages with identical query params
- **Error Recovery**: Try Again/Start Over buttons appear only during error states
- **Help System**: QuickHelp context always set to 'email-capture'

#### UI Conditional Rendering

```typescript
// Authentication buttons show when tier selected (always true since default coffee)
{selectedTier && (
  <AuthenticationButtons />
)}

// Tier selection prompt shows when no tier (never true since default coffee)
{!selectedTier && (
  <SelectTierPrompt />
)}
```

#### Error State Handling

- **Error Display**: Red border, error message, Try Again/Start Over buttons
- **Error Recovery**: `setLastError(null)` clears error state
- **Fallback Actions**: onReset callback triggers parent component reset

### Marketing Content Integration

#### Guarantee Section

**Always Displayed**: 4-guarantee grid with money-back promises

- 30-day money back guarantee
- Instant cancellation
- 24-hour results or refund
- Competitor outperformance guarantee

#### Trust Indicators

**Static Content**: "Secure & Private • No Spam Ever • Built by Expert Solopreneur"
**Anti-VC Messaging**: "Not VC-Funded BS" - positioned against venture-backed competitors

#### Tier-Specific Messaging

- **Coffee Tier**: Green success styling, "SMART CHOICE" messaging
- **Free Tier**: Red warning styling, competitive disadvantage warnings
- **Growth/Scale**: Standard styling, professional feature focus

## Analyze Component (627 lines)

### Authentication Requirements

#### Access Control

**CRITICAL**: Page redirects unauthenticated users to login

```typescript
useEffect(() => {
  if (authResolved && !authLoading && !isAuthenticated) {
    const loginUrl = url ? `/login?websiteUrl=${encodeURIComponent(url)}` : '/login';
    navigate(loginUrl);
  }
}, [authResolved, authLoading, isAuthenticated, navigate, url]);
```

**URL Preservation**: Website URL preserved in login redirect for post-auth restoration

#### User Context Display

- **Welcome Message**: "Welcome back, {username}!" (username from email prefix)
- **User Stats**: Tier, usage, credits displayed in grid layout
- **Dashboard Link**: Always present in header navigation

### URL Input System

#### URL Parameter Handling

**Multiple Parameter Names**: Supports both 'websiteUrl' and 'url' query parameters

```typescript
const websiteUrlParam = urlParams.get('websiteUrl') || urlParams.get('url') || '';
```

**URL Normalization**:

- Accepts URLs with or without protocol
- Automatically adds https:// if missing
- Validates URL format before enabling submit button

#### Validation Behavior

- **Real-time Validation**: URL validated on every input change
- **Visual Feedback**: Green checkmark appears for valid URLs
- **Submit Control**: Analyze button disabled until URL is valid

### State Machine Integration

#### Flow Management

**Current Implementation**: Uses `useFlowStateMachine` hook for complex workflow

- States: URL_INPUT → ANALYSIS → REVIEW → GENERATION
- Progress tracking with breadcrumb navigation
- Error recovery with retry mechanisms

#### Component Visibility Control

```typescript
// URL Input shows in initial states only
{(currentState === 'URL_INPUT' || currentState === 'INITIALIZING') && (
  <URLInputSection />
)}

// Analysis components show based on visibility flags
{visibility.analysis && <ContentAnalysis />}
{visibility.review && <ContentReview />}
{visibility.generation && <FileGeneration />}
```

### Usage Tracking & Limits

#### Tier-Based Limits

- **Starter Tier**: 3 analyses per day, AI analysis for first 5 pages only
- **Coffee Tier**: Shows credits remaining, premium analysis features
- **Growth+ Tiers**: Unlimited analysis with advanced features

#### Usage Display Integration

**Real-time Usage**: `useUsageTracking` hook provides current usage data
**Limit Enforcement**: Daily limit modal appears when limits exceeded
**Server Sync**: Usage tracked on both client and server for accuracy

### Email Verification Flow

#### Verification Banner

**Conditional Display**: Shows only when `user.emailVerified === false`
**User Feedback**: Banner displays user email and verification status
**Persistence**: Banner remains until email verification confirmed

### Error Handling System

#### Error Display Component

- **Error Visualization**: Dedicated ErrorDisplay component for failures
- **Recovery Options**: Retry, recover, reset functionality
- **Retry Limits**: Maximum 3 retries before requiring reset

#### Error Boundary Integration

**Full Page Protection**: Entire analyze page wrapped in ErrorBoundary
**Graceful Degradation**: Component failures don't crash entire application

## Critical Edge Cases

### EmailCapture Edge Cases

1. **Website URL Missing**: Component handles undefined websiteUrl gracefully
2. **Rapid Tier Switching**: State updates handle rapid user interactions
3. **Analytics Failure**: Component continues to function if analytics fails
4. **Navigation Failure**: Error handling for router navigation issues
5. **Network Connectivity**: Component works offline for tier selection

### Analyze Page Edge Cases

1. **Auth State Race Conditions**: Handles rapid auth state transitions
2. **URL Parameter Malformation**: Gracefully handles malformed URL params
3. **Usage Limit Edge Cases**: Handles server/client usage sync issues
4. **State Machine Errors**: Error recovery from any workflow state
5. **Component Mount Timing**: Handles auth resolution before component mount

### Cross-Component Edge Cases

1. **Navigation Interruption**: Handles navigation interruption between components
2. **State Persistence**: Maintains state across browser refresh/navigation
3. **URL Encoding Issues**: Handles special characters in website URLs
4. **Analytics Data Loss**: Functions correctly without analytics tracking
5. **Error Propagation**: Prevents errors from cascading between components

## Business Logic Rules

### Conversion Optimization

- **Coffee Tier Default**: Maximizes conversion to paid tier
- **Free Tier Friction**: Explicit warnings about limitations
- **Urgency Messaging**: Competitive advantage messaging throughout
- **Social Proof**: Trust indicators and guarantee prominently displayed

### User Experience Patterns

- **Progressive Disclosure**: Information revealed as user progresses
- **Clear CTAs**: Distinct Sign In vs Sign Up paths
- **Error Recovery**: Multiple paths to recover from errors
- **Mobile Responsive**: All interactions work on mobile devices

### Data Flow Integrity

- **Analytics Consistency**: All user actions tracked for funnel analysis
- **URL Parameter Flow**: Website URLs preserved through entire flow
- **Auth State Management**: User authentication state consistent across components
- **Error Boundary Protection**: Component failures isolated and recoverable

## Refactoring Safety Requirements

### Must Preserve Behaviors

1. **Default Coffee Tier Selection**: Critical for conversion optimization
2. **Navigation Parameter Encoding**: URL encoding must remain identical
3. **Analytics Event Tracking**: All existing events must continue firing
4. **Error State UI**: Error handling UX must remain unchanged
5. **Tier-Specific Messaging**: Marketing content must remain exactly the same

### Must Maintain Performance

1. **Render Times**: Component render times must not increase
2. **State Update Speed**: Tier selection responsiveness must be maintained
3. **Memory Usage**: No memory leaks during state updates
4. **Bundle Size**: Component size should not significantly increase

### Must Preserve Integrations

1. **Wouter Navigation**: Router integration must remain functional
2. **Auth Context**: Authentication integration must work identically
3. **Analytics Integration**: GA4 event tracking must continue working
4. **State Machine**: Flow management must remain compatible

---

**CRITICAL REMINDER**: These are CURRENT behaviors, not ideal behaviors. All documented behaviors must be preserved during refactoring to prevent regression and maintain conversion rates.
