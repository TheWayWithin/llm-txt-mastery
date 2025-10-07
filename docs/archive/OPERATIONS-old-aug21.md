# LLM.txt Mastery Operations Manual

_Last Updated: August 21, 2025 - Connection Pooling Added_

## 🎯 Quick Reference

**Live System URLs:**

- **Frontend**: https://www.llmtxtmastery.com (Netlify)
- **Backend**: https://llm-txt-mastery-production.up.railway.app (Railway)
- **Health Check**: https://llm-txt-mastery-production.up.railway.app/api/health
- **Admin Stats**: https://llm-txt-mastery-production.up.railway.app/api/admin/connection-pool-stats

**Emergency Contacts:**

- Developer: Jamie Watters
- Support Email: support@llmtxtmastery.com
- Status Page: Railway Dashboard + Netlify Dashboard

## 🏗️ System Architecture Overview

### Production Infrastructure

```
Frontend (Netlify)          Backend (Railway)         Database
==================          =================         ========
React 18 + TypeScript  -->  Express.js + TypeScript   Neon PostgreSQL
Tailwind CSS + shadcn       JWT Authentication         Drizzle ORM
Stripe Elements             OpenAI Integration         Connection Pooling
Real-time Updates           Multi-tier Management      Smart Caching
```

### Core Services

- **Website Analysis**: Real sitemap discovery + AI quality scoring
- **Payment Processing**: Stripe Coffee tier ($4.95) fully operational
- **User Management**: Complete authentication + customer dashboard
- **File Generation**: Standards-compliant LLM.txt with analysis summaries
- **Tier Management**: Free (20 pages) vs Coffee (200 pages + AI analysis)

## 🔄 Connection Pooling Configuration

### Overview

Connection pooling was deployed on August 21, 2025, providing significant performance improvements for API responses. The system auto-scales connections based on demand and includes comprehensive monitoring.

### Configuration Parameters

```typescript
// Agent Configuration
maxSockets: 10,        // Max simultaneous connections per origin
maxFreeSockets: 5,     // Max idle connections to maintain
timeout: 60000,        // Connection timeout (60 seconds)
keepAlive: true,       // Reuse connections for better performance

// Pool Management
minConnections: 2,     // Minimum pool size
maxConnections: 10,    // Maximum pool size
idleTimeout: 60000,    // Idle connection cleanup (60 seconds)
maxAgents: 50,         // Maximum HTTP agents globally
```

### Auto-Scaling Behavior

- **Startup**: Begins with 2 active connections
- **Load Increase**: Scales up to 10 connections based on demand
- **Load Decrease**: Scales down to minimum after idle timeout
- **Benefits**: 4.9% average performance improvement (up to 7.3% for some sites)

### Best Performance Scenarios

- **Multi-page same domain**: Maximum connection reuse
- **Sitemap discovery**: Reduced latency for consecutive requests
- **Large site analysis**: Batch requests benefit most
- **Minimal impact**: Single page analyses (still beneficial)

## 📊 Monitoring Connection Pool

### Pool Statistics Endpoint

```bash
# Check connection pool statistics
curl https://llm-txt-mastery-production.up.railway.app/api/admin/connection-pool-stats

# Expected response format:
{
  "totalAgents": 15,
  "activeConnections": 8,
  "idleConnections": 3,
  "requestsProcessed": 1247,
  "averageResponseTime": "1.2s",
  "poolEfficiency": "92%"
}
```

### Key Metrics to Monitor

- **totalAgents**: Number of HTTP agents created (should stay under 50)
- **activeConnections**: Currently processing requests
- **idleConnections**: Available for reuse
- **requestsProcessed**: Total requests through pool since startup
- **averageResponseTime**: Performance indicator (target: <2s)
- **poolEfficiency**: Connection reuse percentage (target: >80%)

### Health Check Commands

```bash
# Basic health check
curl https://llm-txt-mastery-production.up.railway.app/api/health

# Connection pool specific health
curl -s https://llm-txt-mastery-production.up.railway.app/api/admin/connection-pool-stats | jq '.poolEfficiency'

# Monitor real-time performance
watch -n 5 'curl -s https://llm-txt-mastery-production.up.railway.app/api/admin/connection-pool-stats'
```

## 🛠️ Troubleshooting Connection Pool

### Common Issues and Solutions

#### High Memory Usage

**Symptoms**: Server memory consumption increasing over time
**Cause**: Connection pool not releasing connections properly
**Solution**:

```bash
# Check pool statistics
curl https://llm-txt-mastery-production.up.railway.app/api/admin/connection-pool-stats

# If activeConnections > 20 consistently:
# 1. Check for hung requests in Railway logs
# 2. Consider reducing maxConnections in config
# 3. Monitor for memory leaks in connection handling
```

#### Poor Performance Despite Pooling

**Symptoms**: Response times not improving with pooling enabled
**Cause**: Pool configuration mismatch or external bottlenecks
**Investigation**:

```bash
# Check efficiency metrics
curl -s https://llm-txt-mastery-production.up.railway.app/api/admin/connection-pool-stats | jq '.poolEfficiency'

# If efficiency < 60%:
# 1. Increase maxSockets if many different domains
# 2. Check if sites are blocking connection reuse
# 3. Review timeout settings for slow sites
```

#### Connection Pool Exhaustion

**Symptoms**: "EMFILE: too many open files" errors
**Cause**: Pool creating too many connections simultaneously
**Solution**:

```bash
# Temporary fix - disable pooling
export DISABLE_CONNECTION_POOL=true

# Permanent fix - adjust limits in config:
# maxConnections: 5 (reduced from 10)
# maxAgents: 25 (reduced from 50)
```

### Emergency Procedures

#### Disable Connection Pooling

If connection pooling causes issues, it can be disabled without code changes:

**Railway Environment Variable:**

```bash
DISABLE_CONNECTION_POOL=true
```

**Effects of Disabling:**

- Reverts to individual connections per request
- 4-7% performance decrease but stable operation
- All other functionality remains unchanged
- Can be re-enabled by removing the environment variable

#### Memory Monitoring Guidelines

Monitor these metrics to detect connection pool issues early:

**Memory Usage Alerts:**

- **Warning**: Memory usage > 80% of Railway plan limit
- **Critical**: Memory usage > 95% of Railway plan limit
- **Action**: Check connection pool stats and consider disabling temporarily

**Connection Count Alerts:**

- **Warning**: activeConnections > 15 for >5 minutes
- **Critical**: totalAgents > 40
- **Action**: Investigate slow responses or connection leaks

## 🌐 Environment Variables

### Railway Backend (Critical Variables)

```bash
# Database Configuration
DATABASE_URL=postgresql://neondb_owner:...@ep-dark-fire-ae795ogn-pooler.c-2.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require

# Connection Pooling (New)
DISABLE_CONNECTION_POOL=false  # Set to true to disable pooling
CONNECTION_POOL_MAX_SOCKETS=10 # Max connections per domain
CONNECTION_POOL_TIMEOUT=60000  # Connection timeout in ms

# AI Services
OPENAI_API_KEY=sk-proj-...
OPENAI_MODEL=gpt-4o-mini  # 93% cost savings vs gpt-4o

# Authentication
JWT_SECRET=...
SUPABASE_URL=https://...supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIs...

# Payment Processing
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_LLM_TXT_COFFEE_PRICE_ID=price_1RmkNAIiC84gpR8H33p6OPKV
STRIPE_LLM_TXT_GROWTH_PRICE_ID=price_...
STRIPE_LLM_TXT_SCALE_PRICE_ID=price_...

# Email Services
RESEND_API_KEY=re_...
EMAIL_FROM=noreply@llmtxtmastery.com

# Security & Bot Protection
RATE_LIMIT_ENABLED=true
BOT_PROTECTION_ENABLED=true
SMART_BOT_PROTECTION=true
```

### Netlify Frontend

```bash
VITE_API_URL=https://llm-txt-mastery-production.up.railway.app
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_...
VITE_SUPABASE_URL=https://...supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIs...
```

## 🔍 Health Monitoring

### System Health Checks

```bash
# Primary health check
curl https://llm-txt-mastery-production.up.railway.app/api/health
# Expected: {"status": "healthy", "timestamp": "..."}

# Frontend accessibility
curl -I https://www.llmtxtmastery.com
# Expected: HTTP/2 200

# Database connectivity
curl https://llm-txt-mastery-production.up.railway.app/api/admin/db-status
# Expected: {"database": "connected", "tables": "operational"}

# Stripe integration
curl https://llm-txt-mastery-production.up.railway.app/api/stripe/health
# Expected: {"stripe": "configured", "webhook": "active"}
```

### Performance Monitoring

```bash
# Connection pool efficiency
curl -s https://llm-txt-mastery-production.up.railway.app/api/admin/connection-pool-stats | jq '.poolEfficiency'
# Target: >80%

# API response times
curl -w "@-" -o /dev/null -s https://llm-txt-mastery-production.up.railway.app/api/health <<< "time_total: %{time_total}s"
# Target: <500ms

# Analysis performance test
time curl -X POST https://llm-txt-mastery-production.up.railway.app/api/analyze \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com", "email": "test@example.com", "tier": "starter"}'
# Target: <5s for small sites
```

## 🚨 Critical Database Issues

### Primary Database: Neon PostgreSQL

**Connection String**: `postgresql://neondb_owner:npg_QcNpixbZ7T9H@ep-dark-fire-ae795ogn-pooler.c-2.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require`

### Common Database Problems

#### Issue: "relation does not exist" errors

**Symptoms**: `"relation \"sitemapAnalysis\" does not exist"`
**Cause**: Railway DATABASE_URL not pointing to Neon database
**Solution**:

```bash
# Verify Railway environment variable
railway vars

# Should show DATABASE_URL pointing to Neon, not Railway PostgreSQL
# If incorrect, update:
railway vars set DATABASE_URL="postgresql://neondb_owner:npg_QcNpixbZ7T9H@ep-dark-fire-ae795ogn-pooler.c-2.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require"
```

#### Issue: Column naming mismatches

**Symptoms**: `column "sitemap_content" does not exist`
**Cause**: Database schema out of sync with code
**Solution**:

```bash
# Sync database schema
DATABASE_URL="postgresql://neondb_owner:..." npm run db:push

# Verify schema matches
npm run db:studio  # Opens Drizzle Studio to inspect schema
```

## 🔧 Deployment Procedures

### Automatic Deployment (Normal Operations)

```bash
# Both frontend and backend auto-deploy on git push
git add .
git commit -m "Description of changes"
git push origin main

# Railway backend deploys automatically
# Netlify frontend deploys automatically
```

### Manual Deployment Verification

```bash
# 1. Wait for deployment completion (2-5 minutes)
# Check Railway dashboard: https://railway.app/project/...
# Check Netlify dashboard: https://app.netlify.com/sites/...

# 2. Verify backend deployment
curl https://llm-txt-mastery-production.up.railway.app/api/health

# 3. Verify frontend deployment
curl -I https://www.llmtxtmastery.com

# 4. Test critical path
curl -X POST https://llm-txt-mastery-production.up.railway.app/api/analyze \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com", "email": "test@example.com", "tier": "starter"}'
```

### Database Migration Procedures

```bash
# When schema changes are needed
npm run db:push  # Push schema changes to database

# Verify migration success
npm run db:studio  # Visual verification of schema

# Test application after migration
npm run check  # TypeScript compliance
npm run build  # Production build test
```

## 💰 Business Operations

### Tier Management

- **Free Tier**: 20 pages, HTML extraction, daily limits enforced
- **Coffee Tier ($4.95)**: 200 pages, AI analysis, customer dashboard
- **Growth Tier ($25/mo)**: Unlimited analysis, premium features
- **Scale Tier ($99/mo)**: API access, enterprise features

### Payment Processing

- **Stripe Integration**: Fully operational with webhook validation
- **Coffee Tier**: One-time $4.95 payments working end-to-end
- **Subscription Tiers**: Growth and Scale ready for activation
- **Revenue Tracking**: All purchases logged in database

### Usage Tracking

- **Daily Limits**: Enforced for free tier (1 analysis/day)
- **Usage Counter**: Real-time updates (1/3, 2/3, 3/3)
- **Tier Enforcement**: Page limits applied correctly (20 free, 200 Coffee)
- **Analytics**: Complete usage data for business intelligence

## 🛡️ Security Operations

### Authentication System

- **JWT Tokens**: Secure authentication with refresh capabilities
- **Email Verification**: Required for account activation
- **Password Security**: Special character requirements enforced
- **Session Management**: Automatic token refresh and expiry

### Bot Protection

- **Smart Detection**: Intelligent bot protection without false positives
- **Rate Limiting**: API (60/min), Analysis (20/hour)
- **Fingerprinting**: Progressive penalties for suspicious activity
- **Whitelisting**: Legitimate services and user flows protected

### Data Protection

- **Input Sanitization**: All user inputs validated and cleaned
- **SQL Injection**: Protected via Drizzle ORM parameterized queries
- **XSS Protection**: React's automatic HTML escaping utilized
- **HTTPS Enforcement**: All traffic encrypted end-to-end

## 📞 Support Procedures

### User Support Escalation

1. **Level 1**: Check system health and user tier status
2. **Level 2**: Review usage logs and error messages
3. **Level 3**: Database investigation and manual intervention
4. **Emergency**: Disable problematic features via environment variables

### Common Support Issues

#### "Analysis not working"

1. Check user's tier and daily limits
2. Verify website URL accessibility
3. Review sitemap discovery logs
4. Check OpenAI API status and credits

#### "Payment not processed"

1. Verify Stripe webhook delivery
2. Check emailCaptures table for tier update
3. Review Stripe dashboard for payment status
4. Manual tier upgrade if needed

#### "File not downloading"

1. Check llmTextFiles table for file record
2. Verify file generation completion
3. Test download endpoint directly
4. Regenerate file if corrupted

### Emergency Response

#### Complete System Outage

1. Check Railway and Netlify status pages
2. Verify environment variables in both platforms
3. Test database connectivity from Railway
4. Review recent deployment logs for errors

#### Database Connection Issues

1. Verify DATABASE_URL environment variable
2. Check Neon database status
3. Test direct database connection
4. Consider connection pool adjustment or disabling

#### Performance Degradation

1. Check connection pool statistics
2. Review OpenAI API response times
3. Monitor Railway resource usage
4. Disable connection pooling if necessary

## 📊 Performance Metrics

### Target Performance

- **Analysis Speed**: <5 seconds for 200-page analysis
- **API Response Time**: <500ms for most endpoints
- **Sitemap Discovery**: >95% success rate
- **Cache Hit Rate**: >70% for returning users
- **System Uptime**: >99.9% monthly

### Current Benchmarks (August 21, 2025)

- **Connection Pool Efficiency**: 92% (4.9% performance improvement)
- **OpenAI Cost**: $0.11 per 1000 pages (93% reduction from previous)
- **Cache Performance**: 70-90% API call reduction for popular sites
- **Payment Success**: 100% Coffee tier conversion rate
- **User Retention**: Customer dashboard enabling repeat usage

## 🔄 Backup and Recovery

### Database Backup

- **Neon Automatic**: Point-in-time recovery available
- **Frequency**: Continuous backup with 7-day retention
- **Recovery**: Via Neon dashboard or CLI tools

### Environment Configuration Backup

- **Railway**: Environment variables backed up in dashboard
- **Netlify**: Build configuration stored in Git repository
- **Secrets**: Stored securely in respective platform vaults

### Code Repository

- **Primary**: GitHub repository with full history
- **Branches**: Main branch protected, requires PR reviews
- **Releases**: Tagged releases for rollback capability

## 📋 Maintenance Schedules

### Daily Operations

- Monitor system health endpoints
- Review error logs in Railway dashboard
- Check connection pool performance
- Verify payment processing status

### Weekly Operations

- Review usage analytics and conversion metrics
- Check database performance and optimize queries
- Update dependencies and security patches
- Analyze customer feedback and support tickets

### Monthly Operations

- Performance review and optimization planning
- Security audit and vulnerability assessment
- Cost analysis and optimization opportunities
- Backup and disaster recovery testing

---

## Quick Commands Reference

```bash
# Health Checks
curl https://llm-txt-mastery-production.up.railway.app/api/health
curl https://llm-txt-mastery-production.up.railway.app/api/admin/connection-pool-stats

# Database Operations
npm run db:push     # Apply schema changes
npm run db:studio   # Visual database browser

# Development
npm run dev         # Local development server
npm run build       # Production build test
npm run check       # TypeScript validation

# Emergency
railway vars set DISABLE_CONNECTION_POOL=true  # Disable pooling
railway vars set OPENAI_API_KEY=backup_key     # Switch API keys
```

## Contact Information

- **Developer**: Jamie Watters
- **Repository**: https://github.com/jwatters/llm-txt-mastery
- **Railway Dashboard**: https://railway.app/project/...
- **Netlify Dashboard**: https://app.netlify.com/sites/...
- **Emergency**: Disable features via environment variables

---

_This operations manual should be reviewed and updated with each major deployment or system change._
