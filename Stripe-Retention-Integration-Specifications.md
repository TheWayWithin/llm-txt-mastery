# Comprehensive Stripe Integration Requirements for Enhanced Retention System

**Document Type**: Technical Architecture Requirements  
**Author**: THE ARCHITECT (AGENT-11)  
**Date**: August 29, 2025  
**Priority**: Critical - Revenue Protection Infrastructure  
**Status**: Ready for Implementation

## Executive Summary

Based on analysis of the current Stripe implementation and the strategic retention requirements, this document defines comprehensive API endpoints, database schema updates, webhook handlers, and integration patterns needed to support the enhanced retention system for LLM.txt Mastery.

**Current State**: Basic subscription creation, cancellation, and refund processing  
**Target State**: Full retention lifecycle management with pause/resume, downgrades, retention offers, and win-back automation

---

## Current Implementation Analysis

### ✅ Existing Stripe Integration

- **Customer Management**: `createStripeCustomer()` for new customers
- **Subscription Creation**: Growth/Scale tier monthly subscriptions via Checkout Sessions
- **One-time Payments**: Coffee tier ($4.95) via one-time Checkout Sessions
- **Webhook Handling**: Basic events (checkout.completed, subscription.updated, etc.)
- **Portal Integration**: Customer portal for subscription management
- **Database Sync**: User profiles and email captures updated via webhooks

### 🎯 Integration Gaps for Retention System

1. **Subscription Modifications**: No pause/resume, downgrade, or upgrade flows
2. **Retention Offers**: No discount/coupon management system
3. **Advanced Webhooks**: Missing events for retention tracking
4. **Reporting Integration**: No retention metrics in Stripe data
5. **Automated Actions**: No trigger-based subscription modifications

---

## Database Schema Extensions

### 🗄️ New Tables Required

#### **Subscription Pauses Table**

```sql
CREATE TABLE subscription_pauses (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES auth_users(id),
  subscription_id TEXT NOT NULL, -- Stripe subscription ID
  pause_type TEXT NOT NULL, -- 'free', 'discounted', 'seasonal'
  pause_start TIMESTAMP NOT NULL,
  pause_end TIMESTAMP NOT NULL,
  pause_reason TEXT, -- Customer-provided reason
  discount_percent INTEGER DEFAULT 0, -- 0-100 for discounted pauses
  original_price_id TEXT NOT NULL, -- To restore after pause
  paused_price_id TEXT, -- Discounted price if applicable
  status TEXT NOT NULL DEFAULT 'scheduled', -- 'scheduled', 'active', 'completed', 'cancelled'
  auto_resume BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### **Retention Attempts Table**

```sql
CREATE TABLE retention_attempts (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES auth_users(id),
  session_id TEXT UNIQUE, -- UUID for tracking retention flow
  cancellation_reason TEXT,
  offers_shown JSONB, -- Array of offers presented
  offer_selected TEXT, -- Which offer they chose
  outcome TEXT NOT NULL, -- 'retained', 'cancelled', 'abandoned'
  retention_value INTEGER DEFAULT 0, -- Revenue saved in cents
  feedback_rating INTEGER, -- 1-5 stars
  feedback_comments TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP
);
```

#### **Win-Back Campaigns Table**

```sql
CREATE TABLE winback_campaigns (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES auth_users(id),
  campaign_type TEXT NOT NULL, -- 'post_cancellation', 'seasonal', 'feature_announcement'
  status TEXT NOT NULL DEFAULT 'active', -- 'active', 'paused', 'completed', 'unsubscribed'
  next_email_date TIMESTAMP,
  emails_sent INTEGER DEFAULT 0,
  opens INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  replies INTEGER DEFAULT 0,
  unsubscribed BOOLEAN DEFAULT false,
  reactivated BOOLEAN DEFAULT false,
  reactivation_date TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### **Retention Coupons Table**

```sql
CREATE TABLE retention_coupons (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES auth_users(id),
  stripe_coupon_id TEXT UNIQUE NOT NULL,
  coupon_type TEXT NOT NULL, -- 'retention_discount', 'winback_offer', 'downgrade_credit'
  discount_percent INTEGER,
  discount_amount INTEGER, -- In cents
  duration_months INTEGER,
  tier_applicable TEXT[], -- Array of tiers this applies to
  usage_limit INTEGER DEFAULT 1,
  used_count INTEGER DEFAULT 0,
  expires_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  redeemed_at TIMESTAMP
);
```

### 🔄 Existing Table Extensions

#### **Auth Users Table - Add Retention Fields**

```sql
ALTER TABLE auth_users ADD COLUMN IF NOT EXISTS:
  subscription_status TEXT DEFAULT 'active', -- 'active', 'paused', 'cancelled'
  pause_end_date TIMESTAMP,
  retention_tier TEXT, -- Track if user is on retention pricing
  retention_expires_at TIMESTAMP,
  cancellation_requested_at TIMESTAMP,
  churn_risk_score INTEGER DEFAULT 0, -- 0-100 risk score
  last_retention_attempt TIMESTAMP;
```

#### **Subscription Metadata Tracking**

```sql
CREATE TABLE subscription_changes (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES auth_users(id),
  subscription_id TEXT NOT NULL,
  change_type TEXT NOT NULL, -- 'pause', 'resume', 'downgrade', 'upgrade', 'cancel'
  from_price_id TEXT,
  to_price_id TEXT,
  reason TEXT,
  retention_related BOOLEAN DEFAULT false,
  revenue_impact INTEGER, -- Positive or negative impact in cents
  stripe_event_id TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

## API Endpoint Specifications

### 🎯 1. Subscription Pause/Resume Endpoints

#### **POST /api/stripe/pause-subscription**

```typescript
interface PauseSubscriptionRequest {
  pauseType: 'free' | 'discounted';
  pauseDurationMonths: number; // 1-6 months
  pauseReason?: string;
  discountPercent?: number; // For discounted pauses (25-75%)
}

interface PauseSubscriptionResponse {
  success: boolean;
  pauseId: number;
  pauseStart: string; // ISO date
  pauseEnd: string; // ISO date
  nextBillingDate?: string; // For discounted pauses
  message: string;
}

// Implementation Logic:
async function pauseSubscription(userId: number, request: PauseSubscriptionRequest) {
  // 1. Get user's active subscription
  // 2. Create pause record in database
  // 3. For free pauses: Cancel Stripe subscription, store resume date
  // 4. For discounted pauses: Update to discounted price
  // 5. Schedule auto-resume job
  // 6. Send confirmation email
}
```

#### **POST /api/stripe/resume-subscription**

```typescript
interface ResumeSubscriptionRequest {
  pauseId: number;
  resumeImmediately?: boolean; // Default false
}

interface ResumeSubscriptionResponse {
  success: boolean;
  subscriptionId: string;
  resumeDate: string;
  nextBillingDate: string;
  message: string;
}

// Implementation Logic:
async function resumeSubscription(userId: number, request: ResumeSubscriptionRequest) {
  // 1. Validate pause exists and is active
  // 2. Create new Stripe subscription with original price
  // 3. Update pause status to 'completed'
  // 4. Update user tier and access
  // 5. Send welcome back email
}
```

#### **GET /api/stripe/pause-options**

```typescript
interface PauseOptionsResponse {
  availableOptions: Array<{
    type: 'free' | 'discounted';
    maxDurationMonths: number;
    discountPercent?: number;
    description: string;
    savings: number; // In cents
  }>;
  currentPause?: {
    id: number;
    type: string;
    endDate: string;
    canModify: boolean;
  };
}
```

### 🎯 2. Tier Change/Downgrade Endpoints

#### **POST /api/stripe/change-tier**

```typescript
interface ChangeTierRequest {
  targetTier: 'coffee' | 'growth' | 'scale';
  changeType: 'immediate' | 'end_of_period';
  retentionContext?: boolean; // Track if this is from retention flow
}

interface ChangeTierResponse {
  success: boolean;
  changeType: 'immediate' | 'scheduled';
  prorationAmount?: number; // Credits or charges in cents
  effectiveDate: string;
  newBillingAmount: number;
  features: {
    added: string[];
    removed: string[];
    restricted: string[];
  };
}

// Implementation Logic:
async function changeTier(userId: number, request: ChangeTierRequest) {
  // 1. Calculate proration for current billing period
  // 2. For upgrades: Charge difference immediately
  // 3. For downgrades: Issue credit or schedule change
  // 4. Update Stripe subscription
  // 5. Update user access and features
  // 6. Track retention context if applicable
}
```

### 🎯 3. Retention Offer Management

#### **POST /api/stripe/generate-retention-offers**

```typescript
interface GenerateOffersRequest {
  cancellationReason?: string;
  currentUsage?: {
    monthlyAnalyses: number;
    lastActiveDate: string;
    featuresUsed: string[];
  };
}

interface RetentionOffer {
  id: string;
  type: 'pause' | 'downgrade' | 'discount' | 'enhanced_support';
  title: string;
  description: string;
  savings: number; // In cents per month
  duration: number; // In months
  newPrice?: number; // In cents
  features: string[];
  cta: string;
  terms: string[];
}

interface GenerateOffersResponse {
  sessionId: string; // Track this retention attempt
  offers: RetentionOffer[];
  estimatedValue: number; // Lifetime value at risk
}
```

#### **POST /api/stripe/accept-retention-offer**

```typescript
interface AcceptOfferRequest {
  sessionId: string;
  offerId: string;
  feedback?: {
    rating: number; // 1-5
    comments?: string;
  };
}

interface AcceptOfferResponse {
  success: boolean;
  message: string;
  nextSteps: string[];
  confirmationDetails: {
    newPrice?: number;
    effectiveDate: string;
    duration?: number;
    benefits: string[];
  };
}
```

### 🎯 4. Coupon and Discount Management

#### **POST /api/stripe/create-retention-coupon**

```typescript
interface CreateCouponRequest {
  userId: number;
  couponType: 'retention_discount' | 'winback_offer' | 'loyalty_reward';
  discountType: 'percent' | 'amount';
  discountValue: number;
  durationMonths?: number;
  applicableTiers: string[];
  expiresInDays?: number;
  metadata?: Record<string, string>;
}

// Implementation Logic:
async function createRetentionCoupon(request: CreateCouponRequest) {
  // 1. Create Stripe coupon with specific naming convention
  // 2. Store in retention_coupons table
  // 3. Generate unique redemption link
  // 4. Set usage limits and expiration
  // 5. Return coupon code and link
}
```

#### **POST /api/stripe/apply-coupon**

```typescript
interface ApplyCouponRequest {
  couponCode: string;
  subscriptionId?: string; // For existing subscriptions
  checkoutSessionId?: string; // For new signups
}

interface ApplyCouponResponse {
  success: boolean;
  discountApplied: {
    amount: number;
    percent?: number;
    duration: string;
  };
  message: string;
}
```

---

## Enhanced Webhook Handling

### 🎯 New Webhook Events to Monitor

#### **customer.subscription.paused** (Custom Event)

```typescript
async function handleSubscriptionPaused(event: Stripe.Event) {
  const subscription = event.data.object;

  // 1. Update user status to 'paused'
  // 2. Preserve access until pause period ends
  // 3. Schedule resume reminder emails
  // 4. Track pause reason and duration
  // 5. Update analytics dashboard
}
```

#### **customer.subscription.resumed** (Custom Event)

```typescript
async function handleSubscriptionResumed(event: Stripe.Event) {
  const subscription = event.data.object;

  // 1. Restore full tier access
  // 2. Send welcome back email
  // 3. Track retention success
  // 4. Update user engagement metrics
  // 5. Resume usage tracking
}
```

#### **customer.discount.created**

```typescript
async function handleDiscountCreated(event: Stripe.Event) {
  const discount = event.data.object;

  // 1. Track retention coupon usage
  // 2. Update user retention status
  // 3. Calculate retention value saved
  // 4. Trigger success analytics
}
```

#### **invoice.upcoming** (Enhanced)

```typescript
async function handleUpcomingInvoice(event: Stripe.Event) {
  const invoice = event.data.object;

  // 1. Check for upcoming price changes
  // 2. Send billing reminder with retention context
  // 3. Trigger proactive retention if at-risk
  // 4. Update payment method health check
}
```

### 🎯 Enhanced Existing Webhook Handlers

#### **Update subscription.updated Handler**

```typescript
async function handleSubscriptionUpdate(subscription: Stripe.Subscription) {
  // Existing logic PLUS:

  // 1. Track tier changes from retention flows
  if (subscription.metadata.retention_related === 'true') {
    await trackRetentionSuccess(subscription);
  }

  // 2. Handle subscription schedule changes
  if (subscription.schedule) {
    await handleScheduledChanges(subscription);
  }

  // 3. Update churn risk scoring
  await updateChurnRiskScore(subscription.customer);

  // 4. Sync retention tier status
  await syncRetentionTierStatus(subscription);
}
```

#### **Enhanced invoice.payment_failed Handler**

```typescript
async function handlePaymentFailed(invoice: Stripe.Invoice) {
  // Existing logic PLUS:

  // 1. Trigger retention flow for payment issues
  const retentionOffers = await generatePaymentRetentionOffers(invoice.customer);

  // 2. Send payment update reminder with pause option
  await sendPaymentFailureRetention(invoice.customer, retentionOffers);

  // 3. Schedule automatic retry with retention context
  await scheduleRetentionRetry(invoice.subscription);
}
```

### 🎯 Idempotency and Error Handling

#### **Webhook Idempotency Strategy**

```typescript
interface WebhookProcessingRecord {
  stripeEventId: string;
  eventType: string;
  processedAt: Date;
  status: 'processing' | 'completed' | 'failed';
  retryCount: number;
  errorMessage?: string;
}

async function processWebhookIdempotent(event: Stripe.Event) {
  const existing = await getWebhookRecord(event.id);

  if (existing && existing.status === 'completed') {
    return { message: 'Already processed' };
  }

  if (existing && existing.retryCount > 3) {
    throw new Error('Max retry attempts exceeded');
  }

  // Process webhook with error handling and retry logic
  try {
    await processWebhookEvent(event);
    await updateWebhookRecord(event.id, 'completed');
  } catch (error) {
    await updateWebhookRecord(event.id, 'failed', error.message);
    throw error;
  }
}
```

---

## Stripe API Integration Patterns

### 🎯 Subscription Schedule Management

#### **Creating Scheduled Tier Changes**

```typescript
async function scheduleSubscriptionChange(
  subscriptionId: string,
  newPriceId: string,
  effectiveDate: Date,
  reason: string
) {
  // Create subscription schedule for end-of-period changes
  const schedule = await stripe.subscriptionSchedules.create({
    from_subscription: subscriptionId,
    phases: [
      {
        items: [{ price: newPriceId }],
        start_date: Math.floor(effectiveDate.getTime() / 1000),
        proration_behavior: 'none', // No immediate charge
      },
    ],
    metadata: {
      change_reason: reason,
      retention_related: 'true',
    },
  });

  // Store schedule information for tracking
  await storeScheduleRecord(schedule);
  return schedule;
}
```

#### **Subscription Pause Implementation**

```typescript
async function pauseStripeSubscription(
  subscriptionId: string,
  pauseType: 'free' | 'discounted',
  pauseDurationMonths: number,
  discountPercent?: number
) {
  if (pauseType === 'free') {
    // For free pauses: Cancel and store resume data
    const subscription = await stripe.subscriptions.cancel(subscriptionId, {
      prorate: true, // Give credit for unused time
      metadata: {
        pause_type: 'free',
        original_subscription: subscriptionId,
        pause_duration: pauseDurationMonths.toString(),
      },
    });

    return { type: 'cancelled_for_pause', subscription };
  } else {
    // For discounted pauses: Update to discounted price
    const discountedPrice = await getOrCreateDiscountedPrice(
      subscription.items.data[0].price.id,
      discountPercent
    );

    const updated = await stripe.subscriptions.update(subscriptionId, {
      items: [
        {
          id: subscription.items.data[0].id,
          price: discountedPrice.id,
        },
      ],
      metadata: {
        pause_type: 'discounted',
        original_price: subscription.items.data[0].price.id,
        discount_percent: discountPercent.toString(),
      },
    });

    return { type: 'discounted_pause', subscription: updated };
  }
}
```

### 🎯 Dynamic Pricing for Retention

#### **Retention Price Creation**

```typescript
async function createRetentionPrice(
  originalPriceId: string,
  discountPercent: number,
  durationMonths: number
) {
  const originalPrice = await stripe.prices.retrieve(originalPriceId);
  const discountedAmount = Math.round(originalPrice.unit_amount * (1 - discountPercent / 100));

  const retentionPrice = await stripe.prices.create({
    product: originalPrice.product,
    currency: originalPrice.currency,
    unit_amount: discountedAmount,
    recurring: originalPrice.recurring,
    metadata: {
      retention_price: 'true',
      original_price: originalPriceId,
      discount_percent: discountPercent.toString(),
      duration_months: durationMonths.toString(),
      expires_at: new Date(Date.now() + durationMonths * 30 * 24 * 60 * 60 * 1000).toISOString(),
    },
  });

  return retentionPrice;
}
```

### 🎯 Proration Calculations

#### **Downgrade Credit Calculation**

```typescript
async function calculateDowngradeCredit(
  subscriptionId: string,
  newPriceId: string
): Promise<{
  creditAmount: number;
  newProrationAmount: number;
  effectiveDate: Date;
}> {
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  const currentPrice = subscription.items.data[0].price;
  const newPrice = await stripe.prices.retrieve(newPriceId);

  // Calculate unused time in current billing period
  const now = new Date();
  const periodEnd = new Date(subscription.current_period_end * 1000);
  const periodStart = new Date(subscription.current_period_start * 1000);

  const totalPeriodDays = (periodEnd.getTime() - periodStart.getTime()) / (24 * 60 * 60 * 1000);
  const remainingDays = (periodEnd.getTime() - now.getTime()) / (24 * 60 * 60 * 1000);

  // Credit for unused portion of current tier
  const creditAmount = Math.round((currentPrice.unit_amount * remainingDays) / totalPeriodDays);

  // New proration amount for remaining period
  const newProrationAmount = Math.round((newPrice.unit_amount * remainingDays) / totalPeriodDays);

  return {
    creditAmount,
    newProrationAmount: Math.max(0, newProrationAmount - creditAmount),
    effectiveDate: now,
  };
}
```

---

## Reporting & Analytics Integration

### 🎯 Retention Metrics Dashboard

#### **Key Metrics to Track via Stripe Data**

```typescript
interface RetentionMetrics {
  // Flow Performance
  retentionFlowStarts: number;
  retentionFlowCompletions: number;
  retentionSuccessRate: number;

  // Offer Performance
  offerAcceptanceRates: {
    pause: number;
    downgrade: number;
    discount: number;
    support: number;
  };

  // Financial Impact
  revenueRetained: number; // Monthly recurring revenue saved
  averageRetentionValue: number; // Per customer
  lifetimeValueImpact: number;

  // Customer Behavior
  averagePauseDuration: number;
  downgradeToUpgradeRate: number;
  winbackSuccess: number;

  // Churn Analysis
  churnReasons: Record<string, number>;
  churnByTier: Record<string, number>;
  preventableChurnRate: number;
}

async function generateRetentionMetrics(startDate: Date, endDate: Date): Promise<RetentionMetrics> {
  // Query Stripe data combined with local database
  // Calculate key metrics and trends
  // Return comprehensive retention analytics
}
```

#### **Stripe Reporting API Integration**

```typescript
async function syncStripeRetentionData() {
  // 1. Fetch subscription modifications from Stripe
  const schedules = await stripe.subscriptionSchedules.list({
    created: { gte: Math.floor((Date.now() - 30 * 24 * 60 * 60 * 1000) / 1000) },
  });

  // 2. Fetch discount usage
  const discounts = await stripe.coupons.list({ limit: 100 });

  // 3. Correlate with local retention attempts
  await correlateRetentionData(schedules, discounts);

  // 4. Update analytics dashboard
  await updateRetentionDashboard();
}
```

### 🎯 A/B Testing Framework

#### **Retention Offer Testing**

```typescript
interface RetentionTest {
  id: string;
  name: string;
  variants: Array<{
    id: string;
    weight: number; // 0-100
    offers: RetentionOffer[];
  }>;
  segments: {
    tiers: string[];
    regions: string[];
    riskScores: { min: number; max: number };
  };
  status: 'draft' | 'running' | 'completed';
  metrics: {
    conversions: Record<string, number>;
    revenue_impact: Record<string, number>;
  };
}

async function assignRetentionVariant(userId: number, testId: string): Promise<RetentionOffer[]> {
  // 1. Check user eligibility for test
  // 2. Assign variant based on weights
  // 3. Track assignment for analysis
  // 4. Return variant-specific offers
}
```

---

## Security Considerations

### 🎯 Webhook Security Enhancements

#### **Enhanced Signature Validation**

```typescript
async function validateWebhookSecurely(payload: string, signature: string) {
  // 1. Validate Stripe signature
  const event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);

  // 2. Check event age (prevent replay attacks)
  const eventAge = Date.now() - event.created * 1000;
  if (eventAge > 5 * 60 * 1000) {
    // 5 minutes
    throw new Error('Webhook event too old');
  }

  // 3. Verify event hasn't been processed
  const processed = await checkEventProcessed(event.id);
  if (processed) {
    throw new Error('Event already processed');
  }

  // 4. Rate limit webhook processing
  await enforceWebhookRateLimit(event.type);

  return event;
}
```

### 🎯 Retention Data Protection

#### **Sensitive Data Handling**

```typescript
// Encrypt retention attempt data
const encryptedFeedback = await encryptSensitiveData(feedback);
await storeRetentionAttempt({
  ...attemptData,
  feedback_comments: encryptedFeedback,
});

// Audit trail for retention actions
await createAuditLog({
  action: 'retention_offer_presented',
  userId,
  metadata: {
    offers: offerIds,
    reason: cancellationReason,
  },
  timestamp: new Date(),
});
```

### 🎯 API Security Measures

#### **Retention Endpoint Protection**

```typescript
// Rate limiting for retention endpoints
app.use(
  '/api/stripe/retention-*',
  rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // Maximum 10 retention attempts per window
    message: 'Too many retention attempts',
  })
);

// User context validation
async function validateRetentionRequest(req: Request) {
  const user = req.user;

  // 1. Verify user owns the subscription
  const subscription = await getUserSubscription(user.id);
  if (!subscription) {
    throw new Error('No active subscription found');
  }

  // 2. Check for recent retention attempts
  const recentAttempt = await getRecentRetentionAttempt(user.id);
  if (recentAttempt && recentAttempt.createdAt > new Date(Date.now() - 24 * 60 * 60 * 1000)) {
    throw new Error('Recent retention attempt found');
  }

  return { user, subscription };
}
```

---

## Testing Scenarios and Edge Cases

### 🎯 Critical Test Scenarios

#### **Subscription State Management**

```typescript
describe('Retention Flow Integration', () => {
  test('Pause and resume maintains data integrity', async () => {
    // 1. Create active subscription
    // 2. Pause subscription via API
    // 3. Verify Stripe subscription status
    // 4. Resume subscription
    // 5. Verify access restoration
    // 6. Check billing continuity
  });

  test('Downgrade with proration calculates correctly', async () => {
    // 1. Mid-cycle subscription downgrade
    // 2. Calculate expected credit amount
    // 3. Verify Stripe invoice proration
    // 4. Check user tier transition
    // 5. Validate feature access changes
  });

  test('Retention offers respect business rules', async () => {
    // 1. Generate offers for different tiers
    // 2. Verify discount limits enforced
    // 3. Check offer availability windows
    // 4. Test exclusive offer logic
    // 5. Validate tier-appropriate offers
  });
});
```

#### **Webhook Processing Reliability**

```typescript
describe('Webhook Processing', () => {
  test('Handles duplicate webhook events', async () => {
    // 1. Process webhook event
    // 2. Send same event again
    // 3. Verify idempotent processing
    // 4. Check no duplicate database records
  });

  test('Recovers from processing failures', async () => {
    // 1. Simulate webhook processing error
    // 2. Verify retry mechanism
    // 3. Check error logging
    // 4. Test manual retry capability
  });

  test('Handles out-of-order webhook delivery', async () => {
    // 1. Send webhook events out of sequence
    // 2. Verify state consistency
    // 3. Check conflict resolution
    // 4. Validate final state correctness
  });
});
```

#### **Edge Cases and Error Conditions**

```typescript
describe('Edge Case Handling', () => {
  test('Failed payment during retention offer', async () => {
    // 1. Accept retention discount offer
    // 2. Simulate payment method failure
    // 3. Verify graceful degradation
    // 4. Check retry and notification logic
  });

  test('Stripe rate limiting during high retention volume', async () => {
    // 1. Generate multiple concurrent retention requests
    // 2. Simulate Stripe API rate limits
    // 3. Verify request queuing and retry
    // 4. Check user experience during delays
  });

  test('Subscription modified externally during retention', async () => {
    // 1. Start retention flow
    // 2. Modify subscription via Stripe dashboard
    // 3. Verify conflict detection
    // 4. Check resolution strategy
  });
});
```

---

## Performance Optimization

### 🎯 API Response Time Optimization

#### **Caching Strategy**

```typescript
// Cache retention offers to avoid repeated calculations
const RETENTION_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

async function getCachedRetentionOffers(
  userId: number,
  cacheKey: string
): Promise<RetentionOffer[] | null> {
  const cached = await redis.get(`retention:${userId}:${cacheKey}`);

  if (cached) {
    return JSON.parse(cached);
  }

  const offers = await generateRetentionOffers(userId);
  await redis.setex(`retention:${userId}:${cacheKey}`, RETENTION_CACHE_TTL, JSON.stringify(offers));

  return offers;
}
```

#### **Database Query Optimization**

```typescript
// Optimize retention data queries
async function getRetentionMetrics(userId: number) {
  // Single query with joins to reduce database round trips
  const metrics = await db.query(
    `
    SELECT 
      u.tier,
      u.subscription_status,
      ra.outcome,
      COUNT(ra.id) as attempt_count,
      AVG(ra.retention_value) as avg_value
    FROM auth_users u
    LEFT JOIN retention_attempts ra ON u.id = ra.user_id
    WHERE u.id = $1
      AND ra.created_at > NOW() - INTERVAL '90 days'
    GROUP BY u.tier, u.subscription_status, ra.outcome
  `,
    [userId]
  );

  return processMetrics(metrics.rows);
}
```

### 🎯 Webhook Processing Performance

#### **Async Processing Pattern**

```typescript
// Queue webhook processing for heavy operations
async function processWebhookAsync(event: Stripe.Event) {
  // Immediate acknowledgment
  const processingRecord = await createWebhookRecord(event.id, 'processing');

  // Queue heavy processing
  await retentionQueue.add(
    'process-webhook',
    {
      eventId: event.id,
      eventType: event.type,
      eventData: event.data,
    },
    {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 5000,
      },
    }
  );

  return { received: true, processing: true };
}
```

---

## Implementation Timeline & Dependencies

### 🎯 Phase 1: Core Infrastructure (Weeks 1-3)

#### **Week 1: Database and API Foundation**

- [ ] Create database schema extensions
- [ ] Implement subscription pause/resume endpoints
- [ ] Build retention attempt tracking
- [ ] Set up webhook processing enhancements

#### **Week 2: Stripe Integration Core**

- [ ] Implement subscription schedule management
- [ ] Build proration calculation logic
- [ ] Create retention pricing system
- [ ] Develop coupon management APIs

#### **Week 3: Testing and Validation**

- [ ] Comprehensive API testing
- [ ] Stripe integration validation
- [ ] Webhook processing verification
- [ ] Performance optimization

### 🎯 Phase 2: Advanced Features (Weeks 4-6)

#### **Week 4: Retention Offer Engine**

- [ ] Dynamic offer generation system
- [ ] A/B testing framework
- [ ] Customer segmentation logic
- [ ] Offer personalization algorithms

#### **Week 5: Analytics and Reporting**

- [ ] Retention metrics dashboard
- [ ] Stripe data synchronization
- [ ] Performance monitoring
- [ ] Business intelligence integration

#### **Week 6: Security and Optimization**

- [ ] Enhanced security measures
- [ ] Performance optimization
- [ ] Error handling improvements
- [ ] Production deployment preparation

---

## Conclusion and Recommendations

### 🎯 Implementation Priority

**Immediate Focus**: Implement Phase 1 (Weeks 1-3) to enable core retention functionality and begin capturing retention opportunities.

**Success Criteria**:

- 25-35% reduction in voluntary churn within 90 days
- <2 second response time for retention offer generation
- 99.9% webhook processing reliability
- Zero security incidents related to retention data

### 🎯 Technical Architecture Validation

This comprehensive Stripe integration design leverages:

- **Existing Infrastructure**: Builds on current Stripe implementation without breaking changes
- **Scalable Patterns**: Uses proven approaches for webhook processing and API design
- **Security Best Practices**: Implements comprehensive data protection and audit trails
- **Performance Optimization**: Includes caching, async processing, and query optimization

### 🎯 Business Impact Projection

**Revenue Protection**: $2.5K-5K monthly through improved retention rates  
**Customer Experience**: Enhanced cancellation flow with genuine value options  
**Operational Efficiency**: Automated retention system reduces manual intervention  
**Data Intelligence**: Rich retention analytics enable continuous optimization

**Recommendation**: Proceed with immediate implementation of Phase 1 to begin capturing retention value while building toward comprehensive system in Phase 2.

---

_Architecture Decision: This integration design prioritizes reliability, security, and customer value while maximizing revenue retention through intelligent, ethical retention strategies built on solid technical foundations._
