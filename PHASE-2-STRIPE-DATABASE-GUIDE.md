# Phase 2: Stripe & Database Configuration Guide

**Mission**: Configure Stripe products and update environment variables for Solo/Growth/Scale tier structure

**Date**: January 16, 2025
**Status**: User Manual Configuration Required

---

## Overview

Phase 1 updated the code to use `solo` instead of `coffee`. Now we need to:
1. Create new Stripe products/prices for the new tier structure
2. Update environment variables with new Stripe price IDs
3. No database migration needed (tier values stored as text)

---

## ⚠️ IMPORTANT: Current vs New Structure

### Current Stripe Configuration
```
Coffee: $4.95 one-time (STRIPE_LLM_TXT_COFFEE_PRICE_ID)
Growth: $9.95/month (STRIPE_LLM_TXT_GROWTH_PRICE_ID)
Scale: $19.95/month (STRIPE_LLM_TXT_SCALE_PRICE_ID)
```

### New Stripe Configuration Needed
```
Solo: $4.95/month recurring (STRIPE_LLM_TXT_SOLO_PRICE_ID)
Growth: $14.95/month recurring (STRIPE_LLM_TXT_GROWTH_PRICE_ID - NEW)
Scale: $29.95/month recurring (STRIPE_LLM_TXT_SCALE_PRICE_ID - NEW)
```

**KEY CHANGE**: Solo is now monthly recurring, NOT one-time!

---

## Step 1: Access Stripe Dashboard

### Instructions

1. **Open Terminal** (Cmd+Space, type "Terminal", press Enter)

2. **Log in to Stripe Dashboard**:
   ```
   Open browser: https://dashboard.stripe.com/login
   ```

3. **Verify you're in the correct account**:
   - Look for "LLM.txt Mastery" or your project name
   - Check you're in TEST mode (toggle in top right)

---

## Step 2: Create New Stripe Products

### 2A: Create Solo Product ($4.95/month)

**In Stripe Dashboard**:

1. Click **Products** in left sidebar
2. Click **+ Add product** button
3. Fill in product details:
   ```
   Name: LLM.txt Mastery - Solo
   Description: Perfect for solo builders - 20 analyses/month, 200 pages each

   Pricing model: Standard pricing
   Price: 4.95
   Currency: USD
   Billing period: Monthly
   ```
4. Click **Add product**
5. **COPY THE PRICE ID** - looks like `price_xxxxxxxxxxxxx`
6. Save this as: `STRIPE_LLM_TXT_SOLO_PRICE_ID=price_xxxxxxxxxxxxx`

### 2B: Create Growth Product ($14.95/month)

1. Click **+ Add product** button
2. Fill in product details:
   ```
   Name: LLM.txt Mastery - Growth
   Description: Built for active builders - 35 analyses/month, 500 pages each

   Pricing model: Standard pricing
   Price: 14.95
   Currency: USD
   Billing period: Monthly
   ```
3. Click **Add product**
4. **COPY THE PRICE ID**
5. Save this as: `STRIPE_LLM_TXT_GROWTH_PRICE_ID=price_xxxxxxxxxxxxx`

### 2C: Create Scale Product ($29.95/month)

1. Click **+ Add product** button
2. Fill in product details:
   ```
   Name: LLM.txt Mastery - Scale
   Description: For agencies & dev teams - 100 analyses/month, 1000 pages each

   Pricing model: Standard pricing
   Price: 29.95
   Currency: USD
   Billing period: Monthly
   ```
3. Click **Add product**
4. **COPY THE PRICE ID**
5. Save this as: `STRIPE_LLM_TXT_SCALE_PRICE_ID=price_xxxxxxxxxxxxx`

---

## Step 3: Update Environment Variables

### 3A: Update Railway (Backend)

**In Browser**:

1. Open Railway dashboard: `https://railway.app/`
2. Select your project: "LLM.txt Mastery"
3. Click on your backend service
4. Go to **Variables** tab
5. Update these variables:

   ```bash
   # REMOVE this old one
   STRIPE_LLM_TXT_COFFEE_PRICE_ID=<old value>

   # ADD these new ones (use price IDs from Step 2)
   STRIPE_LLM_TXT_SOLO_PRICE_ID=price_xxxxxxxxxxxxx
   STRIPE_LLM_TXT_GROWTH_PRICE_ID=price_xxxxxxxxxxxxx
   STRIPE_LLM_TXT_SCALE_PRICE_ID=price_xxxxxxxxxxxxx
   ```

6. Click **Save** - Railway will auto-redeploy

### 3B: Update Netlify (Frontend)

**In Browser**:

1. Open Netlify dashboard: `https://app.netlify.com/`
2. Select your site: "LLM.txt Mastery"
3. Go to **Site settings** → **Environment variables**
4. Update these variables:

   ```bash
   # REMOVE this old one
   VITE_STRIPE_LLM_TXT_COFFEE_PRICE_ID=<old value>

   # ADD these new ones (use price IDs from Step 2)
   VITE_STRIPE_LLM_TXT_SOLO_PRICE_ID=price_xxxxxxxxxxxxx
   VITE_STRIPE_LLM_TXT_GROWTH_PRICE_ID=price_xxxxxxxxxxxxx
   VITE_STRIPE_LLM_TXT_SCALE_PRICE_ID=price_xxxxxxxxxxxxx
   ```

5. Click **Save**
6. Go to **Deploys** tab → Click **Trigger deploy** → **Deploy site**

### 3C: Update Local .env Files

**In Terminal**:

```bash
cd /Users/jamiewatters/DevProjects/llm-txt-mastery

# Edit backend .env
nano server/.env
```

Update these lines:
```bash
# REMOVE
STRIPE_LLM_TXT_COFFEE_PRICE_ID=price_xxxxxxxxxxxxx

# ADD (use your actual price IDs from Step 2)
STRIPE_LLM_TXT_SOLO_PRICE_ID=price_xxxxxxxxxxxxx
STRIPE_LLM_TXT_GROWTH_PRICE_ID=price_xxxxxxxxxxxxx
STRIPE_LLM_TXT_SCALE_PRICE_ID=price_xxxxxxxxxxxxx
```

Press `Ctrl+X`, then `Y`, then `Enter` to save.

```bash
# Edit frontend .env
nano client/.env
```

Update these lines:
```bash
# REMOVE
VITE_STRIPE_LLM_TXT_COFFEE_PRICE_ID=price_xxxxxxxxxxxxx

# ADD (use your actual price IDs from Step 2)
VITE_STRIPE_LLM_TXT_SOLO_PRICE_ID=price_xxxxxxxxxxxxx
VITE_STRIPE_LLM_TXT_GROWTH_PRICE_ID=price_xxxxxxxxxxxxx
VITE_STRIPE_LLM_TXT_SCALE_PRICE_ID=price_xxxxxxxxxxxxx
```

Press `Ctrl+X`, then `Y`, then `Enter` to save.

---

## Step 4: Database Considerations

### Good News: No Migration Needed! ✅

**Why?**
- Tiers are stored as TEXT in database (not enum)
- `tier: text('tier')` allows any string value
- Existing 'coffee' values will continue to work
- New signups will use 'solo' automatically

**What This Means**:
- No SQL migration required
- No data conversion needed
- Backward compatible

**Optional: Update Existing Test Data** (if you have test users):

```sql
-- Only run this if you want to update test data
UPDATE auth_users SET tier = 'solo' WHERE tier = 'coffee';
UPDATE email_captures SET tier = 'solo' WHERE tier = 'coffee';
UPDATE one_time_credits SET product_type = 'solo' WHERE product_type = 'coffee';
```

**IMPORTANT**: Don't run this in production if you have real users! Check first.

---

## Step 5: Verification Checklist

### After completing Steps 1-4, verify:

**Stripe Dashboard**:
- [ ] Solo product exists at $4.95/month
- [ ] Growth product exists at $14.95/month
- [ ] Scale product exists at $29.95/month
- [ ] All products are in TEST mode
- [ ] Price IDs copied correctly

**Railway (Backend)**:
- [ ] `STRIPE_LLM_TXT_SOLO_PRICE_ID` is set
- [ ] `STRIPE_LLM_TXT_GROWTH_PRICE_ID` is set (NEW value)
- [ ] `STRIPE_LLM_TXT_SCALE_PRICE_ID` is set (NEW value)
- [ ] Old `STRIPE_LLM_TXT_COFFEE_PRICE_ID` removed
- [ ] Backend redeployed successfully

**Netlify (Frontend)**:
- [ ] `VITE_STRIPE_LLM_TXT_SOLO_PRICE_ID` is set
- [ ] `VITE_STRIPE_LLM_TXT_GROWTH_PRICE_ID` is set (NEW value)
- [ ] `VITE_STRIPE_LLM_TXT_SCALE_PRICE_ID` is set (NEW value)
- [ ] Old `VITE_STRIPE_LLM_TXT_COFFEE_PRICE_ID` removed
- [ ] Frontend redeployed successfully

**Local Environment**:
- [ ] server/.env updated with new price IDs
- [ ] client/.env updated with new price IDs
- [ ] Old COFFEE price ID removed from both

---

## Step 6: Update Code References

**After environment variables are set**, update the Stripe service file:

```bash
cd /Users/jamiewatters/DevProjects/llm-txt-mastery
```

Open `server/services/stripe.ts` and update lines 20-39:

```typescript
// OLD (lines 20-39)
export const TIER_PRICES = {
  coffee: {
    priceId: process.env.STRIPE_LLM_TXT_COFFEE_PRICE_ID || 'price_llm_txt_coffee_onetime',
    amount: 495,
    currency: 'usd',
    interval: 'one_time',
  },
  growth: {
    priceId: process.env.STRIPE_LLM_TXT_GROWTH_PRICE_ID || 'price_llm_txt_growth_monthly',
    amount: 995,
    currency: 'usd',
    interval: 'month',
  },
  scale: {
    priceId: process.env.STRIPE_LLM_TXT_SCALE_PRICE_ID || 'price_llm_txt_scale_monthly',
    amount: 1995,
    currency: 'usd',
    interval: 'month',
  },
} as const;

// NEW (replace with this)
export const TIER_PRICES = {
  solo: {
    priceId: process.env.STRIPE_LLM_TXT_SOLO_PRICE_ID || 'price_llm_txt_solo_monthly',
    amount: 495, // $4.95
    currency: 'usd',
    interval: 'month', // CHANGED: Now monthly recurring
  },
  growth: {
    priceId: process.env.STRIPE_LLM_TXT_GROWTH_PRICE_ID || 'price_llm_txt_growth_monthly',
    amount: 1495, // $14.95 (CHANGED from 995)
    currency: 'usd',
    interval: 'month',
  },
  scale: {
    priceId: process.env.STRIPE_LLM_TXT_SCALE_PRICE_ID || 'price_llm_txt_scale_monthly',
    amount: 2995, // $29.95 (CHANGED from 1995)
    currency: 'usd',
    interval: 'month',
  },
} as const;
```

Also update line 276 (getTierFromPriceId function):

```typescript
// OLD (line 276-280)
export function getTierFromPriceId(priceId: string): 'coffee' | 'growth' | 'scale' | null {
  if (priceId === TIER_PRICES.coffee.priceId) return 'coffee';
  if (priceId === TIER_PRICES.growth.priceId) return 'growth';
  if (priceId === TIER_PRICES.scale.priceId) return 'scale';
  return null;
}

// NEW (replace with this)
export function getTierFromPriceId(priceId: string): 'solo' | 'growth' | 'scale' | null {
  if (priceId === TIER_PRICES.solo.priceId) return 'solo';
  if (priceId === TIER_PRICES.growth.priceId) return 'growth';
  if (priceId === TIER_PRICES.scale.priceId) return 'scale';
  return null;
}
```

---

## Troubleshooting

### Issue: Railway won't deploy
**Solution**: Check Railway logs for errors. Ensure all required env vars are set.

### Issue: Netlify build fails
**Solution**: Verify all `VITE_` prefixed variables are set in Netlify dashboard.

### Issue: Can't find Stripe price ID
**Solution**: In Stripe dashboard, go to Products → Click product → Copy price ID from pricing section.

### Issue: Payments failing
**Solution**:
1. Check Stripe is in TEST mode
2. Verify webhook secret is set: `STRIPE_WEBHOOK_SECRET`
3. Check Railway logs for Stripe errors

---

## Next Steps

After completing Phase 2:

**✅ Stripe Configuration**: Complete
**✅ Environment Variables**: Updated
**✅ Database**: No migration needed

**Ready for Phase 3**: Frontend Updates
- Update pricing page
- Update tier selection UI
- Update dashboard displays

---

## Summary of Changes

| Component | Action | Details |
|-----------|--------|---------|
| **Stripe Products** | CREATE | Solo ($4.95/mo), Growth ($14.95/mo), Scale ($29.95/mo) |
| **Railway Env Vars** | UPDATE | 3 new price IDs, remove 1 old |
| **Netlify Env Vars** | UPDATE | 3 new VITE_ price IDs, remove 1 old |
| **Local .env** | UPDATE | Both client and server .env files |
| **stripe.ts** | UPDATE | TIER_PRICES object and getTierFromPriceId() |
| **Database** | NONE | No migration needed (text fields) |

---

## When Complete

**Come back and say**: "Phase 2 complete, here are my Stripe price IDs:"
- Solo: `price_xxxxxxxxxxxxx`
- Growth: `price_xxxxxxxxxxxxx`
- Scale: `price_xxxxxxxxxxxxx`

I'll verify the configuration and proceed to Phase 3 (Frontend Updates).
