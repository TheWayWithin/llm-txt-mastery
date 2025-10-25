# Infrastructure Reference Guide

**Purpose**: Quick reference for production and staging infrastructure identifiers.

**Security Note**: This file contains non-secret identifiers (project IDs, URLs). Actual passwords and API keys are in Railway/Netlify environment variables.

---

## Database Infrastructure

### Production Database (Neon)
- **Project ID**: `ep-dark-fire-ae795ogn`
- **Region**: us-east-2 (AWS)
- **Pooler**: `ep-dark-fire-ae795ogn-pooler.c-2.us-east-2.aws.neon.tech`
- **Usage**: Live customer data, real transactions
- **Backups**: Automatic daily via Neon
- **Access**: Railway production service only

### Staging Database (Neon)
- **Project ID**: `ep-sweet-frog-aeobt2mo`
- **Region**: us-east-2 (AWS) - same as production
- **Pooler**: `ep-sweet-frog-aeobt2mo-pooler.c-2.us-east-2.aws.neon.tech`
- **Usage**: Test data, QA validation
- **Schema**: Mirrors production structure
- **Access**: Railway staging service only

**🚨 CRITICAL**: These are completely separate Neon projects with isolated data.

---

## Supabase Projects

### Production Supabase
- **Project ID**: `xghwqtmveoiownqxgsii`
- **URL**: https://xghwqtmveoiownqxgsii.supabase.co
- **Usage**: Production user profiles (future integration)

### Staging Supabase
- **Project ID**: `arxvrjfcadanxcpdeoch`
- **URL**: https://arxvrjfcadanxcpdeoch.supabase.co
- **Usage**: Staging user profiles (testing)

---

## Railway Services

### Production Railway
- **Service Name**: `llm-txt-mastery-production`
- **URL**: https://llm-txt-mastery-production.up.railway.app
- **Auto-Deploy**: From `main` branch
- **Environment**: NODE_ENV=production
- **Database**: ep-dark-fire-ae795ogn (auto-configured)

### Staging Railway
- **Service Name**: `llm-txt-mastery-staging`
- **URL**: https://llm-txt-mastery-staging.up.railway.app
- **Auto-Deploy**: From `develop` branch
- **Environment**: NODE_ENV=production (for realistic testing)
- **Database**: ep-sweet-frog-aeobt2mo (auto-configured)

---

## Netlify Sites

### Production Netlify
- **Domain**: https://llmtxtmastery.com
- **Site**: llm-txt-mastery (main branch)
- **Backend**: Points to Railway production
- **CDN**: Global edge distribution

### Staging Netlify
- **Domain**: https://develop--llm-txt-mastery.netlify.app
- **Site**: llm-txt-mastery (develop branch)
- **Backend**: Points to Railway staging
- **CDN**: Global edge distribution

---

## Quick Identification Guide

### How to Identify Which Database You're Connected To

**In Railway Logs**:
```
Look for the connection string in startup logs:
Production: "ep-dark-fire-ae795ogn"
Staging:    "ep-sweet-frog-aeobt2mo"
```

**In Neon Dashboard**:
- Production shows: ep-dark-fire-ae795ogn
- Staging shows: ep-sweet-frog-aeobt2mo

**Security Validation Logs**:
```bash
# Good - Correct database
✅ Database configuration is secure
✅ ALL SECURITY VALIDATIONS PASSED
Connected to Neon PostgreSQL

# Bad - Wrong database detected
❌ CRITICAL: Database URL points to localhost in production
❌ CRITICAL: Test/development database detected in production
🚨 STARTUP ABORTED: Critical security issues must be resolved
```

---

## Verification Checklist

### Before Deploying to Production

1. **Verify Railway Variables**:
   - Railway Dashboard → llm-txt-mastery-production → Variables
   - Check DATABASE_URL contains: `ep-dark-fire-ae795ogn`
   - Check NODE_ENV=production

2. **Check Startup Logs**:
   - Railway Dashboard → llm-txt-mastery-production → Deployments → View Logs
   - Look for: `✅ ALL SECURITY VALIDATIONS PASSED`
   - Verify: `Connected to Neon PostgreSQL`

3. **Confirm Isolation**:
   - Production uses: ep-dark-fire-ae795ogn
   - Staging uses: ep-sweet-frog-aeobt2mo
   - Never the same

---

## Security Guardrails (Active)

**Startup Validation** (`server/startup-security-validation.ts`):

Production will **NOT START** if:
- DATABASE_URL contains: `localhost`, `127.0.0.1`, `test`, `dev`, `local`
- JWT_SECRET is missing or < 64 characters in production
- JWT_REFRESH_SECRET is missing or < 64 characters in production
- OPENAI_API_KEY is missing or invalid format
- Secrets match between JWT_SECRET and JWT_REFRESH_SECRET

**Hard Block**: `process.exit(1)` - Server terminates immediately if validation fails.

**Railway Configuration**: Each Railway service has its own DATABASE_URL environment variable:
- Production Railway → Configured with ep-dark-fire-ae795ogn connection string
- Staging Railway → Configured with ep-sweet-frog-aeobt2mo connection string

---

## Troubleshooting

### "Database connection failed" on Railway

1. Check Railway Variables → DATABASE_URL is set
2. Verify connection string has `?sslmode=require` suffix
3. Check Neon dashboard shows database is active
4. Redeploy Railway service (triggers fresh connection)

### "Wrong database detected" error

1. Check Railway Variables → DATABASE_URL value
2. Verify correct project ID:
   - Production should be: `ep-dark-fire-ae795ogn`
   - Staging should be: `ep-sweet-frog-aeobt2mo`
3. Update Railway variable if incorrect
4. Redeploy service

### Staging using production database (DANGER)

**If this happens**:
1. IMMEDIATELY stop staging deployments
2. Railway Dashboard → llm-txt-mastery-staging → Variables
3. Update DATABASE_URL to staging connection string
4. Verify: `ep-sweet-frog-aeobt2mo` appears in new value
5. Redeploy staging service
6. Check logs for `✅ Database configuration is secure`

---

## Last Updated

**Date**: 2025-10-25
**Verified By**: Infrastructure documentation review
**Next Review**: When adding new environments or changing database providers
