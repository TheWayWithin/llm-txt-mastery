# LLM.txt Mastery API Documentation

## Overview

The LLM.txt Mastery API enables programmatic access to website analysis and LLMs.txt file generation. This API is designed for integration with third-party tools, SEO platforms, and automation workflows.

**Base URL:** `https://llm-txt-mastery-production.up.railway.app`

**API Version:** v1

---

## Quick Start

### 1. Get an API Key

Contact the LLM.txt Mastery team to request an API key for your integration.

### 2. Make Your First Request

```bash
# Check API status (no auth required)
curl https://llm-txt-mastery-production.up.railway.app/api/v1/status

# Analyze a website (auth required)
curl -X POST \
  -H "X-API-Key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"url":"https://example.com"}' \
  https://llm-txt-mastery-production.up.railway.app/api/v1/analyze
```

---

## Authentication

All authenticated endpoints require an API key passed in the `X-API-Key` header.

```bash
X-API-Key: llmtxt_your_api_key_here
```

### API Key Format

API keys follow the format: `llmtxt_` followed by 64 hexadecimal characters.

Example: `llmtxt_238d256741a8b3a8cf8ede6a5d74e93e91254ed6f4ed3732751c16819dc95aa3`

### Authentication Errors

| Status | Code | Description |
|--------|------|-------------|
| 401 | `MISSING_API_KEY` | No X-API-Key header provided |
| 401 | `INVALID_API_KEY` | API key not found or inactive |
| 401 | `EXPIRED_API_KEY` | API key has expired |

---

## Rate Limiting

API requests are rate-limited based on your tier:

| Tier | Requests/Hour | Use Case |
|------|---------------|----------|
| Free | 100 | Testing & evaluation |
| Partner | 1,000 | Integration partners |
| Enterprise | 10,000 | High-volume applications |

### Rate Limit Headers

Every response includes rate limit information:

```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 2025-11-29T21:00:00.000Z
```

### Rate Limit Exceeded

When rate limit is exceeded, the API returns:

```json
{
  "success": false,
  "error": "Rate limit exceeded",
  "code": "RATE_LIMIT_EXCEEDED",
  "retryAfter": 1732914000
}
```

---

## Endpoints

### Health Check

Check API status. No authentication required.

```
GET /api/v1/status
```

**Response:**
```json
{
  "status": "ok",
  "version": "1.0.0",
  "timestamp": "2025-11-29T20:04:09.239Z"
}
```

---

### Analyze Website

Start a website analysis to discover pages and prepare for LLMs.txt generation.

```
POST /api/v1/analyze
```

**Headers:**
- `X-API-Key`: Required
- `Content-Type`: application/json

**Request Body:**
```json
{
  "url": "https://example.com",
  "options": {
    "maxPages": 50,
    "force": false,
    "userTier": "scale",
    "renderJs": true,
    "userId": "your_user_123"
  }
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| url | string | Yes | Website URL to analyze |
| options.maxPages | number | No | Maximum pages to discover (default: 50, max varies by tier) |
| options.force | boolean | No | Force fresh analysis, bypass cache (default: false) |
| options.userTier | string | No | User's subscription tier (default: "starter") |
| options.renderJs | boolean | No | Enable JavaScript rendering for SPAs (default: false, Scale tier only) |
| options.userId | string | No | Your user's ID for quota tracking (recommended for JS rendering) |

#### Tier-Based Limits

| userTier | Max Pages | AI Pages | JS Rendering |
|----------|-----------|----------|--------------|
| starter  | 20        | 20       | ❌ Not available |
| solo     | 200       | 200      | ❌ Not available |
| growth   | 500       | 500      | ❌ Not available |
| scale    | 1000      | 1000     | ✅ 100/month per user |

**Response (New Analysis):**
```json
{
  "success": true,
  "analysis": {
    "id": 123,
    "url": "https://example.com",
    "status": "processing",
    "createdAt": "2025-11-29T20:00:00.000Z",
    "message": "Analysis started. Poll GET /api/v1/analysis/:id for results.",
    "tierInfo": {
      "userTier": "scale",
      "maxPages": 1000,
      "jsRenderingEnabled": true
    },
    "jsRenderQuota": {
      "used": 15,
      "remaining": 85,
      "limit": 100,
      "resetAt": "2025-02-01T00:00:00.000Z"
    }
  }
}
```

**Response (Cached):**
```json
{
  "success": true,
  "cached": true,
  "analysis": {
    "id": 68,
    "url": "https://example.com",
    "status": "completed",
    "createdAt": "2025-10-11T17:18:37.304Z",
    "tierInfo": {
      "userTier": "scale",
      "maxPages": 1000,
      "jsRenderingEnabled": true
    }
  }
}
```

#### JS Rendering Errors

**JS Rendering Not Available (Wrong Tier):**
```json
{
  "error": "Forbidden",
  "code": "JS_RENDER_NOT_AVAILABLE",
  "message": "JS rendering requires 'scale' tier. Current tier: 'growth'",
  "userTier": "growth"
}
```

**JS Render Quota Exceeded:**
```json
{
  "error": "Quota Exceeded",
  "code": "JS_RENDER_QUOTA_EXCEEDED",
  "message": "Monthly JS rendering quota exhausted",
  "quota": {
    "used": 100,
    "limit": 100,
    "resetAt": "2025-02-01T00:00:00.000Z"
  }
}
```

---

### Get Analysis Results

Retrieve the status and results of an analysis.

```
GET /api/v1/analysis/:id
```

**Headers:**
- `X-API-Key`: Required

**Response:**
```json
{
  "success": true,
  "analysis": {
    "id": 123,
    "url": "https://example.com",
    "status": "completed",
    "discoveredPages": 25,
    "selectedPages": 15,
    "createdAt": "2025-11-29T20:00:00.000Z",
    "completedAt": "2025-11-29T20:01:30.000Z"
  }
}
```

**Status Values:**
- `pending` - Analysis queued
- `processing` - Analysis in progress
- `completed` - Analysis finished successfully
- `failed` - Analysis failed

---

### Generate LLMs.txt File

Generate an LLMs.txt file from a completed analysis.

```
POST /api/v1/generate
```

**Headers:**
- `X-API-Key`: Required
- `Content-Type`: application/json

**Request Body:**
```json
{
  "analysisId": 123,
  "options": {
    "format": "standard",
    "includeMetadata": true
  }
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| analysisId | number | Yes | ID from analyze response |
| options.format | string | No | Output format (default: "standard") |
| options.includeMetadata | boolean | No | Include metadata comments (default: true) |

**Response:**
```json
{
  "success": true,
  "file": {
    "id": 456,
    "analysisId": 123,
    "format": "standard",
    "createdAt": "2025-11-29T20:02:00.000Z"
  }
}
```

---

### Download LLMs.txt File

Download a generated LLMs.txt file.

```
GET /api/v1/download/:id
```

**Headers:**
- `X-API-Key`: Required

**Response:**
Returns the raw LLMs.txt file content with `Content-Type: text/plain`.

```
# LLMs.txt for example.com
# Generated by LLM.txt Mastery

> Example Domain - A demonstration website

## Pages

- [Home](https://example.com/)
- [About](https://example.com/about)
...
```

---

### Get Usage Statistics

Retrieve your API usage statistics for the current period.

```
GET /api/v1/usage
```

**Headers:**
- `X-API-Key`: Required

**Response:**
```json
{
  "success": true,
  "usage": {
    "currentPeriod": 5,
    "limit": 1000,
    "remaining": 995,
    "resetAt": "2025-11-29T21:00:00.000Z",
    "totalRequests": 150,
    "averageResponseTime": 1250,
    "errorRate": 0.02,
    "lastUsed": "2025-11-29T20:04:47.823Z"
  },
  "apiKey": {
    "name": "my-integration",
    "prefix": "llmtxt_238d256741a...",
    "tier": "partner",
    "consumer": "mycompany",
    "createdAt": "2025-11-29T19:54:07.890Z"
  }
}
```

---

## Error Handling

All errors follow a consistent format:

```json
{
  "success": false,
  "error": "Human-readable error message",
  "code": "ERROR_CODE"
}
```

### Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `MISSING_API_KEY` | 401 | No API key provided |
| `INVALID_API_KEY` | 401 | Invalid or inactive API key |
| `EXPIRED_API_KEY` | 401 | API key has expired |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests |
| `JS_RENDER_QUOTA_EXCEEDED` | 429 | Monthly JS rendering quota exhausted |
| `VALIDATION_ERROR` | 400 | Invalid request parameters |
| `JS_RENDER_NOT_AVAILABLE` | 403 | JS rendering not available for tier |
| `ANALYSIS_NOT_FOUND` | 404 | Analysis ID not found |
| `FILE_NOT_FOUND` | 404 | File ID not found |
| `ANALYSIS_FAILED` | 500 | Analysis processing failed |
| `INTERNAL_ERROR` | 500 | Unexpected server error |

---

## Best Practices

### 1. Handle Rate Limits Gracefully

```javascript
async function makeRequest(url, options) {
  const response = await fetch(url, options);

  if (response.status === 429) {
    const retryAfter = response.headers.get('X-RateLimit-Reset');
    console.log(`Rate limited. Retry after: ${retryAfter}`);
    // Wait and retry
  }

  return response;
}
```

### 2. Poll for Analysis Completion

```javascript
async function waitForAnalysis(analysisId, apiKey) {
  while (true) {
    const response = await fetch(`/api/v1/analysis/${analysisId}`, {
      headers: { 'X-API-Key': apiKey }
    });
    const data = await response.json();

    if (data.analysis.status === 'completed') {
      return data.analysis;
    }

    if (data.analysis.status === 'failed') {
      throw new Error('Analysis failed');
    }

    // Wait 5 seconds before polling again
    await new Promise(r => setTimeout(r, 5000));
  }
}
```

### 3. Cache Results

Analysis results are cached. The API returns `"cached": true` when returning cached results. Consider caching on your end to minimize API calls.

---

## Support

For API support, questions, or to request higher rate limits:

- Email: support@llmtxtmastery.com
- Documentation: https://llmtxtmastery.com/docs

---

## Validation Endpoints

### Validate LLMs.txt File

Validate an existing llms.txt file at any URL. Supports multiple file locations and formats.

```
POST /api/validate-llms-txt
```

**Headers:**
- `Content-Type`: application/json
- `X-API-Key`: Optional (for authenticated users with higher limits)

**Request Body:**
```json
{
  "url": "https://example.com",
  "fileType": "auto",
  "includeRobotsTxt": true,
  "bustCache": false
}
```

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| url | string | Yes | - | Base URL of website with llms.txt file |
| fileType | string | No | "auto" | File type to validate: "auto", "llms.txt", "llms-full.txt", ".well-known", "llms.md" |
| includeRobotsTxt | boolean | No | true | Check for robots.txt conflicts |
| bustCache | boolean | No | false | Force fresh validation (bypass cache) |

**File Type Options:**
- `auto` - Auto-detect: checks all standard locations in priority order
- `llms.txt` - Standard file at `/llms.txt`
- `llms-full.txt` - Extended file at `/llms-full.txt`
- `.well-known` - Well-known location at `/.well-known/llms.txt`
- `llms.md` - Markdown variant at `/llms.md`

**Response:**
```json
{
  "success": true,
  "validation": {
    "id": 123,
    "url": "https://example.com",
    "valid": true,
    "score": 85,
    "issues": [
      {
        "severity": "warning",
        "message": "Only 3 URL(s) found - severely limited AI understanding",
        "suggestion": "Add at least 3-5 key URLs..."
      }
    ],
    "recommendations": [
      {
        "title": "Expand URL coverage",
        "description": "Professional generation automatically discovers 50-200+ URLs...",
        "priority": "high",
        "example": "## Key Resources..."
      }
    ],
    "robotsConflicts": [],
    "spaDetection": {
      "isSinglePage": false,
      "framework": {
        "framework": "next",
        "renderingStrategy": "SSR",
        "indicators": ["__NEXT_DATA__", "next-router-state-tree"]
      },
      "contentCoverage": {
        "estimatedCoverage": 85,
        "confidence": "high",
        "signals": { ... }
      }
    },
    "fileType": "llms.txt",
    "detectedPath": "/llms.txt",
    "checkedPaths": ["/llms.txt"],
    "contentDepth": {
      "urlCount": 15,
      "sectionCount": 4,
      "wordCount": 250,
      "hasDescription": true,
      "descriptionLength": 120,
      "hasOptionalSection": false,
      "depthLevel": "good",
      "depthScore": 65
    },
    "processingTime": 2450,
    "createdAt": "2025-12-15T12:00:00.000Z"
  },
  "user": {
    "tier": "growth",
    "remainingValidations": 32
  }
}
```

**Content Depth Levels:**
- `minimal` (score 0-29): Very limited content, needs significant improvement
- `basic` (score 30-54): Basic structure present, could be enhanced
- `good` (score 55-79): Well-structured file with decent coverage
- `comprehensive` (score 80-100): Excellent coverage and organization

---

### Batch Validate All Locations

Validates all standard llms.txt file locations and provides a comparison.

```
POST /api/batch-validate-llms-txt
```

**Headers:**
- `Content-Type`: application/json
- `X-API-Key`: Optional (for authenticated users with higher limits)

**Request Body:**
```json
{
  "url": "https://example.com",
  "includeRobotsTxt": true
}
```

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| url | string | Yes | - | Base URL of website to check |
| includeRobotsTxt | boolean | No | true | Check for robots.txt conflicts |

**Response:**
```json
{
  "success": true,
  "batchValidation": {
    "baseUrl": "https://example.com",
    "results": [
      {
        "fileType": "llms.txt",
        "path": "/llms.txt",
        "found": true,
        "result": { ... full validation result ... }
      },
      {
        "fileType": ".well-known",
        "path": "/.well-known/llms.txt",
        "found": false,
        "error": "File not found"
      },
      {
        "fileType": "llms-full.txt",
        "path": "/llms-full.txt",
        "found": false,
        "error": "File not found"
      },
      {
        "fileType": "llms.md",
        "path": "/llms.md",
        "found": false,
        "error": "File not found"
      }
    ],
    "comparison": {
      "bestFile": "llms.txt",
      "bestScore": 85,
      "inconsistencies": [],
      "recommendation": "Only llms.txt was found. Consider adding files at other standard locations for broader compatibility."
    },
    "processingTime": 8500
  }
}
```

**Use Cases:**
- Verify consistent content across multiple file locations
- Identify the best-performing file type for a site
- Detect inconsistencies between different llms.txt variants
- Recommend which file to prioritize for AI model access

---

## Changelog

### v1.2.0 (December 2025)
- **Tiered Access Control**: Added `userTier` parameter to pass your user's subscription tier
- **JavaScript Rendering**: Added `renderJs` option for Scale tier users to handle SPAs
- **Per-User Quota Tracking**: Track JS render usage per external user with `userId` parameter
- **Enhanced Responses**: Added `tierInfo` and `jsRenderQuota` to analysis responses
- **Tier-Based Page Limits**: Automatic enforcement of max pages based on user tier
- **New Error Codes**: `JS_RENDER_NOT_AVAILABLE`, `JS_RENDER_QUOTA_EXCEEDED`

### v1.1.0 (December 2025)
- Added validation endpoints: validate-llms-txt, batch-validate-llms-txt
- Multi-file support: llms.txt, llms-full.txt, .well-known/llms.txt, llms.md
- Auto-detect mode for finding files at any standard location
- Content depth analysis with scoring and recommendations
- SPA/Framework detection for Universal Compatibility
- Batch validation with file comparison and inconsistency detection

### v1.0.0 (November 2025)
- Initial API release
- Endpoints: status, analyze, analysis, generate, download, usage
- API key authentication
- Tiered rate limiting
