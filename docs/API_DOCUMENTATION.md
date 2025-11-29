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
    "includeSubdomains": false
  }
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| url | string | Yes | Website URL to analyze |
| options.maxPages | number | No | Maximum pages to discover (default: 50) |
| options.includeSubdomains | boolean | No | Include subdomains (default: false) |

**Response (New Analysis):**
```json
{
  "success": true,
  "cached": false,
  "analysis": {
    "id": 123,
    "url": "https://example.com",
    "status": "processing",
    "createdAt": "2025-11-29T20:00:00.000Z"
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
    "createdAt": "2025-10-11T17:18:37.304Z"
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
| `VALIDATION_ERROR` | 400 | Invalid request parameters |
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

## Changelog

### v1.0.0 (November 2025)
- Initial API release
- Endpoints: status, analyze, analysis, generate, download, usage
- API key authentication
- Tiered rate limiting
