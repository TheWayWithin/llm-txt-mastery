# LLM.txt Mastery - Operations Manual

> Last Updated: January 20, 2025  
> Version: 1.0.0

## Table of Contents
- [System Architecture](#system-architecture)
- [Environment Variables](#environment-variables)
- [Deployment Guide](#deployment-guide)
- [Configuration Management](#configuration-management)
- [Monitoring & Maintenance](#monitoring--maintenance)
- [Cost Optimization](#cost-optimization)
- [Troubleshooting](#troubleshooting)
- [Emergency Procedures](#emergency-procedures)
- [Development Workflow](#development-workflow)

---

## System Architecture

### Overview
```
┌─────────────────┐         ┌──────────────────┐         ┌─────────────────┐
│                 │         │                  │         │                 │
│   Netlify CDN   │◄────────│   Railway API    │◄────────│   Neon DB      │
│   (Frontend)    │  CORS   │   (Backend)      │   SQL   │   (PostgreSQL)  │
│                 │         │                  │         │                 │
└─────────────────┘         └──────────────────┘         └─────────────────┘
        │                            │                            │
        ▼                            ▼                            ▼
   llmtxtmastery.com    llm-txt-mastery-         ep-dark-fire-ae795ogn
                        production.up.            -pooler.c-2.us-east-2
                        railway.app               .aws.neon.tech
```

### Components
- **Frontend**: React SPA deployed on Netlify (auto-deploy from GitHub)
- **Backend**: Express.js API on Railway (auto-deploy from GitHub)
- **Database**: Neon PostgreSQL (managed, connection pooling enabled)
- **Cache**: In-database caching with 30-day TTL for starter tier

---

## Environment Variables

### Critical Production Variables (Railway)

#### Database
```bash
DATABASE_URL=postgresql://neondb_owner:npg_QcNpixbZ7T9H@ep-dark-fire-ae795ogn-pooler.c-2.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require
```
⚠️ **NEVER CHANGE** without coordinating database migration

#### OpenAI Configuration
```bash
OPENAI_API_KEY=sk-proj-...  # Your OpenAI API key
OPENAI_MODEL=gpt-4o-mini    # Model selection (gpt-4o-mini | gpt-4o | gpt-3.5-turbo)
```

#### Stripe Payments
```bash
STRIPE_SECRET_KEY=sk_live_...                    # Production secret key
STRIPE_WEBHOOK_SECRET=whsec_...                  # Webhook endpoint secret
STRIPE_LLM_TXT_COFFEE_PRICE_ID=price_...        # $5 one-time payment
STRIPE_LLM_TXT_GROWTH_PRICE_ID=price_...        # $15/month subscription
STRIPE_LLM_TXT_SCALE_PRICE_ID=price_...         # $49/month subscription
```

#### Supabase Auth (if enabled)
```bash
SUPABASE_URL=https://xghwqtmveoiownqxgsii.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiI...
```

### Frontend Variables (Netlify)
```bash
VITE_API_URL=https://llm-txt-mastery-production.up.railway.app
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_...
VITE_SUPABASE_URL=https://xghwqtmveoiownqxgsii.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiI...
```

---

## Deployment Guide

### Automatic Deployments
Both platforms auto-deploy from GitHub `main` branch:
- **Push to main** → Railway deploys backend (2-3 minutes)
- **Push to main** → Netlify deploys frontend (1-2 minutes)

### Manual Deployment

#### Backend (Railway)
```bash
# No manual deployment needed - automatic from GitHub
# To force redeploy: Railway Dashboard > Service > Redeploy
```

#### Frontend (Netlify)
```bash
# Build locally first to test
npm run build

# Netlify auto-deploys, but to trigger manually:
# Netlify Dashboard > Deploys > Trigger Deploy
```

### Database Migrations
```bash
# Always backup first!
pg_dump $DATABASE_URL > backup-$(date +%Y%m%d).sql

# Apply schema changes
DATABASE_URL="..." npm run db:push

# Verify migration
DATABASE_URL="..." npx tsx -e "
  import { db } from './server/db';
  // Test queries here
"
```

---

## Configuration Management

### Switching OpenAI Models

#### Option 1: Via Railway Dashboard (Recommended)
1. Go to Railway Dashboard
2. Select your service
3. Variables tab
4. Update `OPENAI_MODEL` to one of:
   - `gpt-4o-mini` (default, cheapest, recommended)
   - `gpt-4o` (highest quality, 16x more expensive)
   - `gpt-3.5-turbo` (legacy, being phased out)
5. Service auto-redeploys

#### Option 2: Test Different Models
```bash
# Run comparison test locally
OPENAI_API_KEY=your-key npx tsx server/test-model-comparison.ts
```

### Adjusting Rate Limits
Edit `/server/middleware/rate-limit.ts`:
```typescript
export const analysisLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minutes
  max: 10,                    // Increase for higher limits
  message: "Too many analysis requests"
});
```

### Changing Tier Limits
Edit `/server/services/cache.ts`:
```typescript
export const TIER_LIMITS: Record<UserTier, TierLimits> = {
  starter: {
    dailyAnalyses: 3,        // Change daily limit
    maxPagesPerAnalysis: 20, // Change page limit
    aiPagesLimit: 20,        // AI analysis pages
    cacheDurationDays: 30    // Cache duration
  },
  // ... other tiers
};
```

---

## Monitoring & Maintenance

### Health Checks

#### Backend Health
```bash
curl https://llm-txt-mastery-production.up.railway.app/health
# Expected: {"status":"ok","timestamp":"...","database":"configured"}
```

#### Frontend Status
```bash
curl -I https://llmtxtmastery.com
# Expected: HTTP/2 200
```

#### Database Connection
```bash
curl https://llm-txt-mastery-production.up.railway.app/api/analyze \
  -X POST -H "Content-Type: application/json" \
  -d '{"url":"https://example.com","email":"test@example.com"}'
# Should not return "relation does not exist" errors
```

### Monitoring Checklist (Daily)
- [ ] Check Railway metrics (memory, CPU, restarts)
- [ ] Verify Netlify build status
- [ ] Review error logs in Railway
- [ ] Check database connection pool stats
- [ ] Monitor OpenAI API usage/costs
- [ ] Review Stripe webhook failures

### Cache Management
```bash
# Check cache statistics
DATABASE_URL="..." npx tsx -e "
  import { getCacheStats } from './server/services/cache';
  const stats = await getCacheStats();
  console.log('Cache stats:', stats);
"

# Clear expired cache entries
DATABASE_URL="..." npx tsx -e "
  import { cleanupExpiredCache } from './server/services/cache';
  await cleanupExpiredCache();
"
```

---

## Cost Optimization

### OpenAI API Costs

#### Current Model Pricing (Jan 2025)
| Model | Input (per 1M tokens) | Output (per 1M tokens) | Cost per 1000 pages |
|-------|----------------------|------------------------|---------------------|
| gpt-4o-mini | $0.15 | $0.60 | $0.11 |
| gpt-4o | $2.50 | $10.00 | $1.69 |
| gpt-3.5-turbo | $0.50 | $1.50 | $0.27 |

#### Cost Reduction Strategies
1. **Use gpt-4o-mini** (default) - 93% cheaper than gpt-4o
2. **Enable caching** - Reduces API calls by 70-90%
3. **Limit AI pages** - Process only high-value pages with AI
4. **Batch processing** - Group API calls for efficiency

### Database Costs
- **Current**: Neon free tier (0.5 GB storage, 1 compute unit)
- **Optimization**: Regularly clean old analyses
```sql
-- Remove analyses older than 90 days
DELETE FROM sitemap_analysis WHERE created_at < NOW() - INTERVAL '90 days';
```

### Monitoring Costs
```bash
# Check daily OpenAI usage
curl https://api.openai.com/v1/usage \
  -H "Authorization: Bearer $OPENAI_API_KEY"

# Estimate monthly costs
# Average: 100 analyses/day * 20 pages * $0.00011 = $0.22/day = $6.60/month
```

---

## Troubleshooting

### Common Issues & Solutions

#### 1. "relation does not exist" Error
**Cause**: Database schema out of sync  
**Solution**:
```bash
DATABASE_URL="..." npm run db:push
```

#### 2. CORS Errors
**Cause**: Frontend/backend URL mismatch  
**Solution**: Verify `VITE_API_URL` in Netlify matches Railway URL

#### 3. OpenAI API Not Working
**Symptoms**: Only HTML extraction, no AI analysis  
**Check**:
```bash
# In Railway logs, look for:
"✅ OPENAI_API_KEY configured - AI analysis enabled"
# or
"⚠️ WARNING: OPENAI_API_KEY not set"
```
**Solution**: Set `OPENAI_API_KEY` in Railway variables

#### 4. Stripe Webhooks Failing
**Check**: Stripe Dashboard > Webhooks > Event logs  
**Common fixes**:
- Update `STRIPE_WEBHOOK_SECRET` in Railway
- Verify endpoint URL: `https://llm-txt-mastery-production.up.railway.app/api/stripe/webhook`

#### 5. High Memory Usage
**Symptoms**: Railway container restarts  
**Solution**:
- Reduce batch size in `/server/services/sitemap-enhanced.ts`
- Lower concurrent batches from 5 to 3

#### 6. Cache Not Working
**Symptoms**: 0 cache hits displayed  
**Debug**:
```bash
# Check cache entries
DATABASE_URL="..." npx tsx -e "
  import { db } from './server/db';
  import { analysisCache } from '@shared/schema';
  const entries = await db.select().from(analysisCache).limit(10);
  console.log('Cache entries:', entries);
"
```

---

## Emergency Procedures

### Site Down - Recovery Steps
1. **Check service status**:
   - [Netlify Status](https://www.netlifystatus.com/)
   - [Railway Status](https://status.railway.app/)
   - [Neon Status](https://status.neon.tech/)

2. **If Railway is down**:
   ```bash
   # Check logs
   railway logs -n 100
   
   # Force redeploy
   # Railway Dashboard > Service > Redeploy
   ```

3. **If database is down**:
   ```bash
   # Test connection
   psql $DATABASE_URL -c "SELECT 1"
   
   # If connection pool exhausted, restart Railway service
   ```

### Rollback Procedures
```bash
# Find last working commit
git log --oneline -10

# Revert to specific commit
git revert HEAD
git push origin main

# Or reset to specific commit (destructive)
git reset --hard <commit-hash>
git push --force origin main
```

### Rate Limit / DDoS Attack
1. Increase rate limits temporarily in Railway
2. Enable Cloudflare protection on domain
3. Block IPs in Railway logs showing abuse

### Database Corruption
```bash
# Restore from backup
psql $DATABASE_URL < backup-20250120.sql

# Verify integrity
DATABASE_URL="..." npm run db:push
```

---

## Development Workflow

### Local Development Setup
```bash
# Install dependencies
npm install

# Set up .env file
cp .env.example .env
# Add your development keys

# Start dev server
npm run dev  # Runs on http://localhost:5000
```

### Testing Changes
```bash
# Type checking
npm run check

# Test OpenAI integration
npx tsx server/test-model-comparison.ts

# Test database queries
DATABASE_URL="..." npx tsx server/test-db-connection.ts
```

### Pre-deployment Checklist
- [ ] Run `npm run check` - no TypeScript errors
- [ ] Test locally with production API keys
- [ ] Verify rate limits are appropriate
- [ ] Check error handling for edge cases
- [ ] Review logs for any warnings

### Deployment Flow
```bash
# 1. Make changes
git add .
git commit -m "feat: description"

# 2. Test locally
npm run dev

# 3. Push to GitHub (auto-deploys)
git push origin main

# 4. Monitor deployment
# - Railway Dashboard: ~3 minutes
# - Netlify Dashboard: ~2 minutes

# 5. Verify production
curl https://llm-txt-mastery-production.up.railway.app/health
```

---

## Quick Reference

### Key Commands
```bash
# Local development
npm run dev                    # Start local server
npm run build                  # Build for production
npm run check                  # TypeScript checking

# Database
npm run db:push                # Push schema changes
npm run migrate                # Run migrations

# Testing
npx tsx server/test-model-comparison.ts  # Compare AI models
curl $API_URL/health           # Health check
```

### Important URLs
- **Production**: https://llmtxtmastery.com
- **API**: https://llm-txt-mastery-production.up.railway.app
- **Railway Dashboard**: https://railway.app/project/[project-id]
- **Netlify Dashboard**: https://app.netlify.com/sites/llmtxtmastery
- **Stripe Dashboard**: https://dashboard.stripe.com
- **Neon Dashboard**: https://console.neon.tech

### Support Contacts
- **Developer**: Jamie Watters
- **Email**: [your-email]
- **GitHub**: https://github.com/TheWayWithin/llm-txt-mastery

---

## Revision History
- **v1.0.0** (Jan 20, 2025) - Initial operations manual
- Added OpenAI model switching documentation
- Included cost optimization strategies
- Comprehensive troubleshooting guide

---

*This document should be updated whenever significant operational changes are made to the system.*