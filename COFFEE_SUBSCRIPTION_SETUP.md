# Coffee Tier Subscription Setup & Credit Renewal

## Overview

Coffee tier is now a **$4.95/month subscription** with **100 analyses per month**. Credits reset automatically on each monthly billing cycle.

## Stripe Configuration

### 1. Product Setup in Stripe Dashboard

- **Product Name**: LLM.txt Mastery - Coffee Tier
- **Price**: $4.95/month (recurring)
- **Billing Period**: Monthly
- **Product ID**: Save this for your environment variables

### 2. Webhook Events Required

The system listens for these Stripe webhook events:

- `checkout.session.completed` - Initial subscription creation
- `invoice.payment_succeeded` - Monthly renewal (resets credits)
- `customer.subscription.deleted` - Cancellation handling

## Credit Reset Mechanism

### Automatic Monthly Reset

When Stripe processes the monthly payment, the webhook automatically:

1. Detects `invoice.payment_succeeded` event
2. Checks if `billing_reason === 'subscription_cycle'` (renewal, not first payment)
3. Resets credits to 100 for Coffee tier users
4. Logs the renewal: `[RENEWAL] Reset credits to 100 for Coffee tier user: {email}`

### Code Flow

```
Stripe Monthly Billing
    ↓
invoice.payment_succeeded webhook
    ↓
handlePaymentSucceeded() in stripe.ts
    ↓
Reset credits to 100
    ↓
User can analyze 100 more websites
```

## Testing the Credit Reset

### Method 1: Manual Reset via Admin API

```bash
# Set your admin key in Railway environment
ADMIN_KEY=your-secret-admin-key

# Reset credits for a specific user
curl -X POST https://llm-txt-mastery-production.up.railway.app/api/auth/admin/reset-coffee-credits \
  -H "Content-Type: application/json" \
  -H "x-admin-key: your-secret-admin-key" \
  -d '{"email": "jamie.watters.mail@icloud.com"}'
```

### Method 2: Stripe CLI Testing (Local Development)

```bash
# Install Stripe CLI
brew install stripe/stripe-cli/stripe

# Login to Stripe
stripe login

# Listen to webhooks locally
stripe listen --forward-to localhost:5000/api/stripe/webhook

# Trigger a test renewal event
stripe trigger invoice.payment_succeeded \
  --add invoice:billing_reason=subscription_cycle \
  --add invoice:customer_email=test@example.com
```

### Method 3: Stripe Dashboard Test

1. Go to Stripe Dashboard → Webhooks
2. Find your webhook endpoint
3. Click "Send test webhook"
4. Select `invoice.payment_succeeded`
5. Add custom payload:

```json
{
  "billing_reason": "subscription_cycle",
  "customer_email": "your-test-email@example.com",
  "subscription": "sub_xxxxx",
  "amount_paid": 495,
  "currency": "usd"
}
```

## Environment Variables

Add to Railway/production environment:

```bash
# Stripe Configuration
STRIPE_SECRET_KEY=sk_live_xxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxx
STRIPE_LLM_TXT_COFFEE_PRICE_ID=price_xxxxx

# Admin Access (for manual resets)
ADMIN_KEY=your-secure-admin-key
```

## Monitoring Credit Resets

### Check Logs

Look for these log messages in Railway logs:

- `[RENEWAL] Reset credits to 100 for Coffee tier user: {email}`
- `Subscription renewal detected for: {email}`
- `Payment succeeded for subscription: {subscriptionId}`

### Verify Credits in Database

```sql
-- Check a user's current credits
SELECT email, tier, credits_remaining
FROM auth_users
WHERE email = 'user@example.com';

-- See all Coffee tier users and their credits
SELECT email, credits_remaining, updated_at
FROM auth_users
WHERE tier = 'coffee'
ORDER BY updated_at DESC;
```

## Troubleshooting

### Credits Not Resetting

1. **Check webhook is registered**: Stripe Dashboard → Webhooks → Verify endpoint is active
2. **Check webhook secret**: Ensure `STRIPE_WEBHOOK_SECRET` matches Stripe Dashboard
3. **Check user tier**: User must be `tier = 'coffee'` in auth_users table
4. **Check billing_reason**: Only resets on `subscription_cycle`, not `subscription_create`

### Manual Credit Adjustment

If automatic reset fails, use admin endpoint:

```bash
# Fix all Coffee tier users to have 100 credits
curl -X POST https://llm-txt-mastery-production.up.railway.app/api/auth/admin/fix-coffee-credits \
  -H "x-admin-key: your-secret-admin-key"
```

## User Experience

### What Users See

- **Before Renewal**: Low/zero credits, prompted to wait for renewal
- **After Renewal**: Credits reset to 100, can analyze again
- **In UI**: Credit counter shows current balance (e.g., "87 credits")

### Subscription Management

Users can manage their Coffee subscription through:

1. Stripe Customer Portal (cancel, update payment)
2. Dashboard → Billing section
3. Email support for manual assistance

## Future Enhancements

Consider implementing:

1. **Email Notifications**: Send email when credits reset
2. **Grace Period**: Allow 3-5 extra analyses if renewal payment is pending
3. **Rollover Credits**: Allow unused credits to roll over (max 200)
4. **Bulk Packages**: Offer 500 or 1000 credit packages for power users
