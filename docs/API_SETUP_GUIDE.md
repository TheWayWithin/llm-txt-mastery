# API Setup Guide for Semantic Enhancement Features

This guide walks you through configuring all API integrations needed for LLM.txt Mastery's semantic enhancement features.

## Overview

The semantic enhancement features require:

- **OpenAI API** (Required) - For embeddings and content analysis
- **Google Analytics API** (Optional) - For Business Objective mode insights
- **API Key Management** (Built-in) - For security and monitoring

## Quick Start

1. **Copy environment template:**

   ```bash
   cp .env.example .env
   ```

2. **Configure OpenAI API (Required):**

   ```bash
   # Add to .env file
   OPENAI_API_KEY=your_openai_api_key_here
   OPENAI_EMBEDDING_MODEL=text-embedding-3-small
   EMBEDDING_DIMENSIONS=1536
   ```

3. **Test OpenAI integration:**

   ```bash
   node scripts/test-openai-simple.js
   ```

4. **Optional: Configure Google Analytics** (see detailed guide below)

## OpenAI API Configuration

### Step 1: Get API Key

1. Go to [OpenAI Platform](https://platform.openai.com/)
2. Create an account or sign in
3. Navigate to **API Keys**
4. Click **Create new secret key**
5. Copy the key (starts with `sk-`)

### Step 2: Environment Variables

Add these to your `.env` file:

```bash
# OpenAI API Configuration (Required)
OPENAI_API_KEY=sk-your-secret-key-here

# Embedding Model Configuration
OPENAI_EMBEDDING_MODEL=text-embedding-3-small  # Recommended: most cost-effective
EMBEDDING_DIMENSIONS=1536                       # Standard dimensions
EMBEDDING_RATE_LIMIT_PER_MINUTE=3000          # Conservative rate limit

# Chat Model Configuration
OPENAI_MODEL=gpt-4o-mini                       # Recommended: 93% cheaper than gpt-4o

# Rate Limiting and Retry
EMBEDDING_BATCH_SIZE=100                       # Process in batches
API_KEY_ROTATION_DAYS=90                       # Security best practice
ENABLE_API_ALERTS=true                         # Monitor usage and errors
```

### Step 3: Verify Setup

Run the test script:

```bash
node scripts/test-openai-simple.js
```

Expected output:

```
✅ All Tests Passed!
🚀 OpenAI APIs are ready for semantic enhancement features
```

### OpenAI Pricing (2024)

| Model                  | Type       | Price per 1K tokens             | Use Case                                    |
| ---------------------- | ---------- | ------------------------------- | ------------------------------------------- |
| text-embedding-3-small | Embeddings | $0.00002                        | **Recommended** - Semantic analysis         |
| text-embedding-3-large | Embeddings | $0.00013                        | Higher accuracy (not needed for most cases) |
| gpt-4o-mini            | Chat       | $0.00015 input / $0.0006 output | **Recommended** - Content analysis          |
| gpt-4o                 | Chat       | $0.005 input / $0.015 output    | Premium quality (expensive)                 |

### Cost Estimates

Typical costs for semantic enhancement:

| Site Size  | Embeddings | AI Analysis | Total      |
| ---------- | ---------- | ----------- | ---------- |
| 50 pages   | $0.001     | $0.002      | **$0.003** |
| 200 pages  | $0.004     | $0.008      | **$0.012** |
| 500 pages  | $0.010     | $0.020      | **$0.030** |
| 1000 pages | $0.020     | $0.040      | **$0.060** |

_Note: Caching reduces repeat costs significantly_

## Google Analytics API (Optional)

Google Analytics provides additional insights for Business Objective mode but is completely optional.

### Step 1: Enable API

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create/select a project
3. Enable Google Analytics Data API
4. Create service account
5. Download JSON key file

### Step 2: Configure Analytics

1. Add service account email to your GA4 property (Viewer role)
2. Get your Property ID from GA4 settings

### Step 3: Environment Variables

```bash
# Google Analytics Configuration (Optional)
GA4_PROPERTY_ID=123456789
GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account-key.json

# Alternative: Inline JSON (for hosted environments)
GA4_SERVICE_ACCOUNT_KEY_JSON={"type":"service_account",...}

# Analytics Features
ENABLE_ANALYTICS_INTEGRATION=true
ANALYTICS_CACHE_TTL_HOURS=24
```

See [Google Analytics Setup Guide](./GOOGLE_ANALYTICS_API_SETUP.md) for detailed instructions.

## API Key Security & Monitoring

The system includes built-in API key management and monitoring:

### Security Features

1. **Key Rotation Tracking**: Monitors key age and alerts when rotation is due
2. **Usage Monitoring**: Tracks API calls, tokens, and costs
3. **Rate Limiting**: Prevents API quota exhaustion
4. **Error Handling**: Automatic retries with exponential backoff
5. **Security Alerts**: Notifications for suspicious activity

### Environment Variables

```bash
# Security Configuration
API_KEY_ROTATION_DAYS=90                    # Rotate keys every 90 days
API_KEY_WARNING_DAYS=7                      # Warn 7 days before rotation
ENABLE_API_KEY_AUTO_ROTATION=false          # Manual rotation recommended
ENABLE_API_ALERTS=true                      # Enable monitoring alerts

# Monitoring Configuration
ALERT_COOLDOWN_MINUTES=15                   # Prevent alert spam
MAX_ALERTS_STORED=1000                      # Keep last 1000 alerts

# Notification Channels (Optional)
ALERT_EMAIL_TO=admin@example.com            # Email alerts
ALERT_WEBHOOK_URL=https://hooks.slack.com/... # Slack/Discord webhooks
```

## Testing & Verification

### 1. Basic OpenAI Test

```bash
node scripts/test-openai-simple.js
```

### 2. Comprehensive API Test

```bash
# Note: This requires TypeScript compilation
npm run build
node scripts/test-api-integrations.js
```

### 3. Production Readiness Check

Verify these items before production:

- [ ] OpenAI API key is valid and has sufficient quota
- [ ] Rate limiting is configured appropriately
- [ ] API usage monitoring is working
- [ ] Error handling and retries are functioning
- [ ] Security alerts are configured
- [ ] Cost tracking is accurate

## Troubleshooting

### OpenAI API Issues

**Authentication Error (401):**

```bash
Error: Incorrect API key provided
```

- Check your API key in .env file
- Ensure key starts with 'sk-'
- Verify key is active on OpenAI platform

**Rate Limit Error (429):**

```bash
Error: Rate limit reached
```

- Reduce EMBEDDING_RATE_LIMIT_PER_MINUTE
- Implement request batching
- Add delays between requests

**Quota Exceeded:**

```bash
Error: You exceeded your current quota
```

- Check usage on OpenAI platform
- Add payment method if needed
- Upgrade plan if necessary

### Google Analytics Issues

**Property Access Error:**

```bash
Error: User does not have sufficient permissions
```

- Verify service account has Viewer role in GA4
- Check Property ID is correct
- Ensure you're using GA4 (not Universal Analytics)

**API Not Enabled:**

```bash
Error: Google Analytics Data API has not been used
```

- Enable API in Google Cloud Console
- Wait a few minutes for propagation

### General Issues

**Module Import Errors:**

```bash
Cannot find module 'openai'
```

- Run `npm install` to install dependencies
- Check package.json includes required packages

**Environment Variables Not Loading:**

```bash
API Key configured: ❌ No
```

- Verify .env file exists in project root
- Check file name is exactly `.env` (not `.env.txt`)
- Restart application after changes

## Production Deployment

### Environment Variables Checklist

For production deployment, ensure these environment variables are set:

**Required:**

- `OPENAI_API_KEY` - Your OpenAI API key
- `NODE_ENV=production` - Enable production mode

**Recommended:**

- `OPENAI_MODEL=gpt-4o-mini` - Cost-effective model
- `EMBEDDING_RATE_LIMIT_PER_MINUTE=3000` - Conservative rate limiting
- `ENABLE_API_ALERTS=true` - Monitor API health

**Optional (Enhanced Features):**

- `GA4_PROPERTY_ID` - Google Analytics integration
- `GOOGLE_APPLICATION_CREDENTIALS` - GA service account
- `ALERT_EMAIL_TO` - Alert notifications

### Security Best Practices

1. **Never commit API keys** to version control
2. **Rotate keys regularly** (90 days recommended)
3. **Monitor usage** and set up alerts
4. **Use environment-specific keys** (dev/staging/prod)
5. **Implement proper error handling**
6. **Log security events** but not sensitive data

### Performance Optimization

1. **Cache embeddings** to avoid regeneration
2. **Batch API requests** for better efficiency
3. **Use appropriate models** for each use case
4. **Implement request throttling**
5. **Monitor and optimize token usage**

## Next Steps

Once your APIs are configured:

1. ✅ Verify all tests pass
2. 🔧 Implement semantic analysis features
3. 📊 Set up monitoring dashboards
4. 🚀 Deploy to production with confidence

For detailed implementation guides, see:

- [Semantic Analysis Implementation](./SEMANTIC_SETUP_GUIDE.md)
- [Google Analytics Integration](./GOOGLE_ANALYTICS_API_SETUP.md)
- [Production Deployment](./DEPLOYMENT.md)

## Support

If you encounter issues:

1. Check the troubleshooting section above
2. Verify your environment configuration
3. Run the test scripts to isolate problems
4. Check API status pages for service outages

The semantic enhancement features gracefully degrade when APIs are unavailable, so your application will continue to work even during API issues.
