# LLM.txt Mastery - Operations Manual

> Last Updated: August 25, 2025  
> Version: 1.1.1 - Current Pricing & Tier Information Updated

## Table of Contents
- [System Architecture](#system-architecture)
- [Authentication System](#authentication-system)
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

## Authentication System

### Overview
LLM.txt Mastery uses **JWT-based authentication** with access/refresh token pairs for secure user management and session handling.

```
┌─────────────────┐    JWT Tokens    ┌─────────────────┐    Session DB    ┌─────────────────┐
│                 │ ◄────────────────│                 │ ◄────────────────│                 │
│  React Frontend │    Access/       │  Express.js API │    Validation    │  PostgreSQL     │
│  (AuthContext)  │    Refresh       │  (Middleware)   │                  │  (Sessions)     │
│                 │ ─────────────────►│                 │ ─────────────────►│                 │
└─────────────────┘    Authorization  └─────────────────┘    Auth Storage   └─────────────────┘
```

### Database Schema

#### Authentication Tables
```sql
-- Primary authentication table
auth_users (
  id SERIAL PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  email_verified BOOLEAN DEFAULT false,
  tier TEXT DEFAULT 'starter',  -- starter|coffee|growth|scale
  credits_remaining INTEGER DEFAULT 0,
  stripe_customer_id TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Session management table
user_sessions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES auth_users(id),
  token_hash TEXT UNIQUE NOT NULL,
  refresh_token_hash TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  refresh_expires_at TIMESTAMP NOT NULL,
  last_used_at TIMESTAMP DEFAULT NOW()
);
```

### JWT Configuration

#### Token Types and Expiry
- **Access Token**: 15 minutes (short-lived for security)
- **Refresh Token**: 7 days (for seamless user experience)
- **Token Storage**: sessionStorage (proper incognito isolation)
- **Token Hashing**: SHA-256 before database storage

#### Token Structure
```javascript
// Access Token Payload
{
  "userId": 123,
  "email": "user@example.com", 
  "tier": "starter",
  "iat": 1643723400,
  "exp": 1643724300
}

// Refresh Token Payload
{
  "userId": 123,
  "type": "refresh",
  "iat": 1643723400,
  "exp": 1644328200
}
```

### Authentication Flow

#### Registration Process
1. **Input Validation**: Email format, password strength (12+ chars, complexity)
2. **Duplicate Check**: Verify email not already registered
3. **Password Hashing**: bcrypt with 12 salt rounds
4. **User Creation**: Insert into `auth_users` table
5. **Token Generation**: Create JWT access/refresh token pair
6. **Session Storage**: Store hashed tokens in `user_sessions`
7. **Response**: Return user data and tokens to frontend

#### Login Process
1. **Credential Validation**: Email/password verification against database
2. **Password Verification**: bcrypt comparison with stored hash
3. **Token Generation**: Create new JWT token pair
4. **Session Creation**: Insert new session record
5. **Old Session Cleanup**: Optional cleanup of expired sessions
6. **Response**: Return authenticated user and tokens

#### Session Validation (Per Request)
1. **Token Extraction**: Extract Bearer token from Authorization header
2. **JWT Verification**: Validate signature and expiration
3. **Session Lookup**: Find session in database by token hash
4. **User Attachment**: Add `req.user` and `req.session` to request
5. **Middleware Chain**: Continue to protected route handler

### Middleware System

#### Authentication Middlewares

**`authenticate`** - Strict Authentication
```typescript
// Requires valid authentication, returns 401 if missing/invalid
app.get('/api/auth/me', authenticate, handler);
```

**`optionalAuth`** - Optional Authentication  
```typescript
// Populates req.user if token present, continues if not
app.post('/api/analyze', optionalAuth, handler);
```

#### Rate Limiting for Auth Endpoints
```typescript
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minutes
  max: 5,                     // 5 attempts per window
  message: "Too many authentication attempts",
  standardHeaders: true,
  legacyHeaders: false
});
```

### User Tier Management

#### Current Tier System & Pricing

**Free Tier (Starter)**
- **Price**: $0 (Free forever)
- **Daily Limit**: 3 analyses per day
- **Page Limit**: 20 pages per analysis  
- **AI Analysis**: ✅ Full AI-enhanced quality scoring
- **Features**: HTML extraction, smart caching
- **Cache Duration**: 30 days

**Coffee Tier**
- **Price**: $4.95 (One-time payment)
- **Daily Limit**: Unlimited (credit-based system)
- **Page Limit**: 200 pages per analysis
- **AI Analysis**: ✅ Full AI-enhanced analysis  
- **Features**: HTML extraction, AI analysis, smart caching
- **Cache Duration**: 7 days
- **Target**: Individual users, small projects

**Growth Tier**  
- **Price**: $9.95/month (Monthly subscription)
- **Daily Limit**: Unlimited analyses
- **Page Limit**: 1,000 pages per analysis
- **AI Analysis**: ✅ 200 pages with AI enhancement
- **Features**: File history, priority support, smart caching
- **Cache Duration**: 7 days
- **Target**: Professional users, growing businesses

**Scale Tier**
- **Price**: $19.95/month (Monthly subscription)  
- **Daily Limit**: Unlimited analyses
- **Page Limit**: Unlimited pages per analysis
- **AI Analysis**: ✅ Unlimited AI-enhanced pages
- **Features**: API access, white-label support, enterprise features
- **Cache Duration**: 3 days (freshest data)
- **Target**: Enterprise users, high-volume applications

#### Tier Operations
```bash
# Check user tier status
curl -H "Authorization: Bearer $ACCESS_TOKEN" \
     https://llm-txt-mastery-production.up.railway.app/api/auth/me

# Update user tier (admin operation)
DATABASE_URL="..." npx tsx -e "
  import { authStorage } from './server/services/auth-storage';
  await authStorage.updateUserTier(userId, 'coffee', 5);
"
```

### Session Management Operations

#### Token Refresh Flow
1. **Access Token Expiry**: Frontend receives 401 response
2. **Refresh Request**: Send refresh token to `/api/auth/refresh`
3. **Refresh Validation**: Verify refresh token and session
4. **New Token Generation**: Create fresh access/refresh token pair
5. **Session Update**: Update session with new token hashes
6. **Response**: Return new tokens to frontend
7. **Retry Original Request**: Frontend retries with new access token

#### Session Cleanup
```bash
# Manual session cleanup (removes expired sessions)
DATABASE_URL="..." npx tsx -e "
  import { authStorage } from './server/services/auth-storage';
  const cleaned = await authStorage.deleteExpiredSessions();
  console.log(\`Cleaned \${cleaned} expired sessions\`);
"

# Logout specific user (invalidate all sessions)
DATABASE_URL="..." npx tsx -e "
  import { authStorage } from './server/services/auth-storage';
  const count = await authStorage.deleteAllUserSessions(userId);
  console.log(\`Invalidated \${count} user sessions\`);
"
```

### Security Features

#### Password Security
- **Hashing Algorithm**: bcrypt with 12 salt rounds
- **Strength Requirements**: 12+ characters, mixed case, numbers, symbols
- **No Plaintext Storage**: Passwords never stored in readable format
- **Reset Mechanism**: Email-based password reset with temporary tokens

#### Token Security
- **JWT Secrets**: Environment-based secrets for signing/verification
- **Token Hashing**: SHA-256 hashing before database storage
- **Short Expiration**: 15-minute access tokens minimize exposure
- **Secure Headers**: Proper Authorization header handling
- **CORS Configuration**: Controlled cross-origin access

#### Session Security
- **Database Validation**: Every request validates against session table
- **Automatic Expiry**: Expired sessions automatically rejected
- **Session Rotation**: New tokens on refresh prevent replay attacks
- **Logout Protection**: Secure session termination

---

## Environment Variables

### Critical Production Variables (Railway)

#### Database
```bash
DATABASE_URL=postgresql://neondb_owner:npg_QcNpixbZ7T9H@ep-dark-fire-ae795ogn-pooler.c-2.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require
```
⚠️ **NEVER CHANGE** without coordinating database migration

#### JWT Authentication
```bash
JWT_SECRET=your-256-bit-secret-key-here           # Access token signing key  
JWT_REFRESH_SECRET=different-256-bit-secret       # Refresh token signing key
JWT_EXPIRES_IN=15m                                # Access token expiry (15 minutes)
JWT_REFRESH_EXPIRES_IN=7d                         # Refresh token expiry (7 days)
```
🔒 **SECURITY CRITICAL**: Use strong, unique secrets. Never reuse between environments.

#### OpenAI Configuration
```bash
OPENAI_API_KEY=sk-proj-...  # Your OpenAI API key
OPENAI_MODEL=gpt-4o-mini    # Model selection (gpt-4o-mini | gpt-4o | gpt-3.5-turbo)
```

#### Stripe Payments
```bash
STRIPE_SECRET_KEY=sk_live_...                    # Production secret key
STRIPE_WEBHOOK_SECRET=whsec_...                  # Webhook endpoint secret
STRIPE_LLM_TXT_COFFEE_PRICE_ID=price_...        # $4.95/month subscription (Coffee tier)
STRIPE_LLM_TXT_GROWTH_PRICE_ID=price_...        # $9.95/month subscription (Growth tier)
STRIPE_LLM_TXT_SCALE_PRICE_ID=price_...         # $19.95/month subscription (Scale tier)
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
export const TIER_LIMITS: Record<UserTier, Omit<TierLimits, 'tier'>> = {
  starter: {
    dailyAnalyses: 3,        // Daily analysis limit
    maxPagesPerAnalysis: 20, // Page limit per analysis
    aiPagesLimit: 20,        // AI-enhanced pages
    cacheDurationDays: 30,   // Cache duration
    features: {
      htmlExtraction: true,
      aiAnalysis: true,      // ✅ AI enabled for free tier
      fileHistory: false,
      prioritySupport: false,
      smartCaching: true
    }
  },
  coffee: {
    dailyAnalyses: 999,      // Unlimited (credit-based)
    maxPagesPerAnalysis: 200,// 10x more than starter
    aiPagesLimit: 200,       // Full AI analysis
    cacheDurationDays: 7,    // Weekly cache refresh
    features: {
      htmlExtraction: true,
      aiAnalysis: true,
      fileHistory: false,    // No persistent history
      prioritySupport: false,
      smartCaching: true
    }
  },
  growth: {
    dailyAnalyses: 999,      // Unlimited
    maxPagesPerAnalysis: 1000,// Enterprise-level capacity  
    aiPagesLimit: 200,       // AI enhancement limit
    cacheDurationDays: 7,    // Professional cache duration
    features: {
      htmlExtraction: true,
      aiAnalysis: true,
      fileHistory: true,     // ✅ Persistent file history
      prioritySupport: true, // ✅ Priority support
      smartCaching: true
    }
  },
  scale: {
    dailyAnalyses: 999,      // Unlimited
    maxPagesPerAnalysis: 999999, // No practical limit
    aiPagesLimit: 999999,    // Unlimited AI enhancement
    cacheDurationDays: 3,    // Fresh data priority
    features: {
      htmlExtraction: true,
      aiAnalysis: true,
      fileHistory: true,
      prioritySupport: true,
      smartCaching: true,
      whiteLabel: true,      // ✅ White-label support
      apiAccess: true        // ✅ API access
    }
  }
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

#### Authentication Health
```bash
# Test authentication endpoints
curl https://llm-txt-mastery-production.up.railway.app/api/auth/health
# Expected: {"status":"ok","auth":"operational"}

# Verify JWT token generation (test endpoint)
curl -X POST https://llm-txt-mastery-production.up.railway.app/api/auth/test-token \
  -H "Content-Type: application/json" \
  -d '{"test":"jwt-generation"}'
# Should return valid JWT structure

# Check session table health
DATABASE_URL="..." npx tsx -e "
  import { authStorage } from './server/services/auth-storage';
  const activeCount = await authStorage.getActiveSessionCount();
  console.log(\`Active sessions: \${activeCount}\`);
"
```

### Monitoring Checklist (Daily)
- [ ] Check Railway metrics (memory, CPU, restarts)
- [ ] Verify Netlify build status
- [ ] Review error logs in Railway
- [ ] **Authentication Health**: Verify auth endpoints respond correctly
- [ ] **Session Count**: Monitor active session count for anomalies
- [ ] **Failed Logins**: Check for unusual authentication failure rates
- [ ] **Token Expiry**: Ensure token refresh flow working properly
- [ ] **Rate Limiting**: Review auth rate limit hits and potential abuse
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

#### 7. Authentication Failures
**Symptoms**: Users unable to login, 401 errors, token validation failures

**Common Authentication Issues**:

**JWT Secret Mismatch**:
```bash
# Verify JWT secrets are set in Railway
curl -H "Authorization: Bearer invalid-token" \
     https://llm-txt-mastery-production.up.railway.app/api/auth/me
# Should return structured error, not 500 server error
```

**Session Table Issues**:
```bash
# Check session table exists and has records
DATABASE_URL="..." npx tsx -e "
  import { db } from './server/db';
  import { userSessions } from '@shared/schema';
  const count = await db.select().from(userSessions).limit(1);
  console.log('Session table accessible:', count.length >= 0);
"
```

**Token Expiry Problems**:
```bash
# Check if tokens are expiring too quickly
# Review JWT_EXPIRES_IN and JWT_REFRESH_EXPIRES_IN settings
# Default: 15m access, 7d refresh
```

**Solutions**:
- **Invalid JWT Secret**: Update `JWT_SECRET` in Railway variables
- **Session DB Errors**: Run schema migration with `npm run db:push`
- **Mass Logouts**: Clear expired sessions with cleanup script
- **Rate Limiting**: Increase auth rate limits if legitimate traffic

#### 8. User Account Issues
**Symptoms**: Users can't register, email verification fails, tier mismatches

**Account Creation Problems**:
```bash
# Test registration endpoint
curl -X POST https://llm-txt-mastery-production.up.railway.app/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"TestPassword123!"}'
```

**Email Verification Issues**:
```bash
# Check email service health (if configured)
DATABASE_URL="..." npx tsx -e "
  import { authStorage } from './server/services/auth-storage';
  const user = await authStorage.getUserByEmail('user@example.com');
  console.log('Email verified:', user?.emailVerified);
"
```

**Tier/Permission Problems**:
```bash
# Verify user tier and credits
DATABASE_URL="..." npx tsx -e "
  import { authStorage } from './server/services/auth-storage';
  const user = await authStorage.getUserByEmail('user@example.com');
  console.log('Tier:', user?.tier, 'Credits:', user?.creditsRemaining);
"
```

**Solutions**:
- **Registration Fails**: Check password validation rules, email uniqueness
- **Email Not Verified**: Manual verification via database update
- **Wrong Tier**: Update user tier via admin script
- **Missing Credits**: Add credits for coffee tier users

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
- **v1.1.1** (Aug 25, 2025) - Updated pricing and tier information to reflect current offerings
  - Coffee tier: $4.95/month subscription (100 analyses/month)
  - Growth tier: $9.95/month (was $15/month)  
  - Scale tier: $19.95/month (was $49/month)
  - Added detailed feature breakdown for each tier
  - Updated TIER_LIMITS configuration with current values
- **v1.1.0** (Aug 25, 2025) - Authentication system coverage added
  - JWT-based authentication architecture
  - Database schema documentation
  - Session management procedures
  - Authentication monitoring and troubleshooting
- **v1.0.0** (Jan 20, 2025) - Initial operations manual
  - OpenAI model switching documentation
  - Cost optimization strategies
  - Comprehensive troubleshooting guide

---

*This document should be updated whenever significant operational changes are made to the system.*