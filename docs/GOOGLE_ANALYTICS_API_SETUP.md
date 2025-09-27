# Google Analytics Data API v1 Setup Guide

This guide walks you through setting up Google Analytics Data API v1 for the LLM.txt Mastery semantic enhancement features. The Analytics integration is **optional** - the semantic features work without it, but Analytics provides additional insights for Business Objective mode.

## Overview

The Google Analytics Data API v1 allows you to:
- Extract website traffic patterns for content optimization
- Identify high-performing content for prioritization 
- Get user behavior insights to improve semantic clustering
- Track content performance metrics for Business Objective mode

## Prerequisites

- Google Analytics 4 (GA4) property configured for your website
- Google Cloud Platform (GCP) account
- Admin access to your Analytics property

## Step 1: Enable the API

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Select or create a project
3. Enable the Google Analytics Data API:
   ```bash
   # Via gcloud CLI
   gcloud services enable analyticsdata.googleapis.com
   ```
   
   Or navigate to **APIs & Services > Library** and search for "Google Analytics Data API"

## Step 2: Create Service Account

1. Navigate to **IAM & Admin > Service Accounts**
2. Click **Create Service Account**
3. Fill in the details:
   - **Name**: `llm-txt-mastery-analytics`
   - **Description**: `Service account for LLM.txt Mastery Analytics integration`
4. Click **Create and Continue**
5. Grant the **Viewer** role (or create custom role with minimal permissions)
6. Click **Done**

## Step 3: Generate Service Account Key

1. Click on your newly created service account
2. Go to **Keys** tab
3. Click **Add Key > Create new key**
4. Select **JSON** format
5. Download the key file (keep it secure!)

**Security Note**: Never commit this JSON file to version control. Store it securely and reference via environment variable.

## Step 4: Grant Analytics Access

1. Go to [Google Analytics](https://analytics.google.com/)
2. Navigate to **Admin** (gear icon)
3. In the **Property** column, click **Property Access Management**
4. Click **+** to add users
5. Enter your service account email (ends with `@your-project.iam.gserviceaccount.com`)
6. Select **Viewer** role
7. Click **Add**

## Step 5: Get Property ID

1. In Google Analytics, go to **Admin > Property Settings**
2. Copy the **Property ID** (format: `123456789`)
3. This will be your `GA4_PROPERTY_ID` environment variable

## Step 6: Environment Configuration

Add these variables to your `.env` file:

```bash
# Google Analytics Data API Configuration
GA4_PROPERTY_ID=your_property_id_here
GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account-key.json

# Alternative: Inline JSON key (for hosted environments)
GA4_SERVICE_ACCOUNT_KEY_JSON={"type":"service_account","project_id":"..."}

# Analytics Features (optional)
ENABLE_ANALYTICS_INTEGRATION=true
ANALYTICS_CACHE_TTL_HOURS=24
ANALYTICS_MAX_RESULTS=1000
```

## Step 7: Install Dependencies

The Google Analytics Data API client library:

```bash
npm install @google-analytics/data
```

## API Quotas and Limits

**Free Tier Limits (per day):**
- Core Reporting API: 25,000 requests
- Real-time Reporting API: 10,000 requests  
- Data retention: 14 months (standard)

**Rate Limits:**
- 10 queries per second per project
- 100 concurrent requests per project

**Cost Estimation:**
- Standard Analytics properties: FREE up to limits
- Analytics 360 properties: May have different limits
- Typical usage for semantic enhancement: ~100-500 requests/day

## Testing the Integration

Run the test script to verify your setup:

```bash
node scripts/test-google-analytics.js
```

This will test:
- Authentication with service account
- Property access permissions
- Basic data retrieval
- Error handling

## Available Analytics Data

The API provides access to:

### Audience Data
- User demographics
- Technology (devices, browsers)
- Geographic data
- User behavior flow

### Acquisition Data  
- Traffic sources
- Campaign performance
- Social media referrals
- Search terms

### Behavior Data
- Page views and sessions
- Bounce rates
- Time on page
- Content performance
- Event tracking

### Conversion Data
- Goal completions
- E-commerce metrics
- Custom events
- Attribution modeling

## Business Objective Mode Integration

When Analytics is configured, Business Objective mode can:

1. **Content Prioritization**: Identify high-traffic pages for priority semantic analysis
2. **Performance Correlation**: Link content quality scores with traffic metrics  
3. **User Journey Analysis**: Understand how users interact with different content types
4. **ROI Optimization**: Focus semantic improvements on pages that drive business value

## Security Best Practices

1. **Service Account Key Security**:
   - Never commit JSON keys to version control
   - Use environment variables or secret management
   - Rotate keys regularly (90 days recommended)
   - Use minimum required permissions

2. **Data Privacy**:
   - Only access aggregated data
   - Respect user privacy and GDPR compliance
   - Cache data appropriately to minimize API calls
   - Don't store personally identifiable information

3. **Error Handling**:
   - Graceful degradation when Analytics unavailable
   - Proper logging without exposing credentials
   - Rate limit handling and backoff strategies

## Troubleshooting

### Common Issues

**Authentication Failed**:
```
Error: Could not load the default credentials
```
- Check `GOOGLE_APPLICATION_CREDENTIALS` path
- Verify service account key JSON format
- Ensure service account has Analytics access

**Property Access Denied**:
```
Error: User does not have sufficient permissions
```
- Verify Property ID is correct
- Check service account has Viewer role in Analytics
- Ensure you're using GA4 (not Universal Analytics)

**API Not Enabled**:
```
Error: Google Analytics Data API has not been used
```
- Enable the API in Google Cloud Console
- Wait a few minutes for propagation
- Verify correct project is selected

**Quota Exceeded**:
```
Error: Quota exceeded for quota metric
```
- Implement caching to reduce API calls
- Add request throttling
- Consider upgrading to Analytics 360 if needed

### Debug Mode

Enable debug logging:

```bash
export GOOGLE_ANALYTICS_DEBUG=true
node your-script.js
```

## Alternative Setup (Optional)

For development or simplified setup, you can use:

1. **OAuth 2.0** instead of service account (requires user interaction)
2. **Application Default Credentials** if running on Google Cloud
3. **Measurement Protocol** for simpler data collection (write-only)

## Next Steps

Once configured:

1. Test the integration with provided scripts
2. Implement semantic analysis with Analytics context
3. Set up monitoring for API quota usage
4. Configure caching strategies for optimal performance

The Analytics integration enhances semantic analysis but is completely optional. All semantic features work without it.

## References

- [Google Analytics Data API Documentation](https://developers.google.com/analytics/devguides/reporting/data/v1)
- [Service Account Authentication](https://cloud.google.com/docs/authentication/getting-started)
- [Google Analytics 4 Help](https://support.google.com/analytics/answer/10089681)
- [API Quotas and Limits](https://developers.google.com/analytics/devguides/reporting/data/v1/quotas)