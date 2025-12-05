# Implementation Guide: llm-txt-mastery API Integration

## Executive Summary

This guide provides step-by-step instructions for transforming **llm-txt-mastery** into an API-callable service that can be consumed by **aimpactscanner** while remaining a fully functional standalone product.

**Approach**: Microservices API Architecture with TypeScript SDK

**Timeline**: 6-7 weeks total

**Effort Distribution**:
- llm-txt-mastery API enhancement: 40%
- SDK development: 20%
- aimpactscanner integration: 30%
- Testing & documentation: 10%

---

## Phase 1: API Authentication & Authorization (Week 1-2)

### 1.1 Database Schema Changes

Add new tables to llm-txt-mastery database:

```typescript
// db/schema.ts - Add these tables

export const apiKeys = pgTable('api_keys', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(), // e.g., "aimpactscanner-production"
  key: text('key').notNull().unique(), // hashed API key
  keyPrefix: text('key_prefix').notNull(), // e.g., "llmtxt_abc123..." for display
  consumer: text('consumer').notNull(), // 'aimpactscanner', 'public', 'internal'
  tier: text('tier').notNull().default('free'), // 'free', 'partner', 'enterprise'
  rateLimit: integer('rate_limit').notNull().default(100), // requests per hour
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  lastUsedAt: timestamp('last_used_at'),
  expiresAt: timestamp('expires_at'), // optional expiration
  metadata: jsonb('metadata'), // flexible additional data
});

export const apiUsage = pgTable('api_usage', {
  id: uuid('id').defaultRandom().primaryKey(),
  apiKeyId: uuid('api_key_id').notNull().references(() => apiKeys.id),
  endpoint: text('endpoint').notNull(),
  method: text('method').notNull(), // GET, POST, etc.
  statusCode: integer('status_code').notNull(),
  responseTime: integer('response_time'), // milliseconds
  requestSize: integer('request_size'), // bytes
  responseSize: integer('response_size'), // bytes
  errorMessage: text('error_message'),
  timestamp: timestamp('timestamp').notNull().defaultNow(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
});

export const apiWebhooks = pgTable('api_webhooks', {
  id: uuid('id').defaultRandom().primaryKey(),
  apiKeyId: uuid('api_key_id').notNull().references(() => apiKeys.id),
  url: text('url').notNull(),
  events: jsonb('events').notNull(), // ['analysis.completed', 'generation.completed']
  isActive: boolean('is_active').notNull().default(true),
  secret: text('secret').notNull(), // for webhook signature verification
  createdAt: timestamp('created_at').notNull().defaultNow(),
  lastTriggeredAt: timestamp('last_triggered_at'),
});
```

**Migration Command**:
```bash
npm run db:push
```

### 1.2 API Key Generation Utility

Create utility for generating and managing API keys:

```typescript
// server/utils/api-key-generator.ts
import crypto from 'crypto';
import { db } from '../db';
import { apiKeys } from '../db/schema';

export interface CreateApiKeyParams {
  name: string;
  consumer: string;
  tier?: 'free' | 'partner' | 'enterprise';
  rateLimit?: number;
  expiresAt?: Date;
}

export async function generateApiKey(params: CreateApiKeyParams) {
  // Generate secure random key
  const rawKey = `llmtxt_${crypto.randomBytes(32).toString('hex')}`;
  
  // Hash for storage (never store plain text)
  const hashedKey = crypto
    .createHash('sha256')
    .update(rawKey)
    .digest('hex');
  
  // Store prefix for display (first 12 chars)
  const keyPrefix = rawKey.substring(0, 19) + '...';
  
  // Insert into database
  const [apiKey] = await db.insert(apiKeys).values({
    name: params.name,
    key: hashedKey,
    keyPrefix,
    consumer: params.consumer,
    tier: params.tier || 'free',
    rateLimit: params.rateLimit || 100,
    expiresAt: params.expiresAt,
  }).returning();
  
  // Return the raw key ONCE (user must save it)
  return {
    id: apiKey.id,
    key: rawKey, // Only time this is visible
    keyPrefix,
    ...apiKey,
  };
}

export async function validateApiKey(rawKey: string) {
  const hashedKey = crypto
    .createHash('sha256')
    .update(rawKey)
    .digest('hex');
  
  const [apiKey] = await db
    .select()
    .from(apiKeys)
    .where(eq(apiKeys.key, hashedKey))
    .where(eq(apiKeys.isActive, true));
  
  if (!apiKey) {
    return null;
  }
  
  // Check expiration
  if (apiKey.expiresAt && apiKey.expiresAt < new Date()) {
    return null;
  }
  
  // Update last used timestamp
  await db
    .update(apiKeys)
    .set({ lastUsedAt: new Date() })
    .where(eq(apiKeys.id, apiKey.id));
  
  return apiKey;
}
```

### 1.3 API Authentication Middleware

Create middleware to protect API endpoints:

```typescript
// server/middleware/api-auth.ts
import { Request, Response, NextFunction } from 'express';
import { validateApiKey } from '../utils/api-key-generator';
import { db } from '../db';
import { apiUsage } from '../db/schema';

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      apiKey?: {
        id: string;
        consumer: string;
        tier: string;
        rateLimit: number;
      };
    }
  }
}

export async function apiKeyAuth(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const apiKey = req.headers['x-api-key'] as string;
  
  if (!apiKey) {
    return res.status(401).json({
      error: 'Missing API key',
      message: 'Include X-API-Key header with your request',
    });
  }
  
  const validatedKey = await validateApiKey(apiKey);
  
  if (!validatedKey) {
    return res.status(401).json({
      error: 'Invalid API key',
      message: 'The provided API key is invalid or expired',
    });
  }
  
  // Attach to request for downstream use
  req.apiKey = {
    id: validatedKey.id,
    consumer: validatedKey.consumer,
    tier: validatedKey.tier,
    rateLimit: validatedKey.rateLimit,
  };
  
  next();
}

// Rate limiting per API key
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

export async function apiRateLimit(
  req: Request,
  res: Response,
  next: NextFunction
) {
  if (!req.apiKey) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  
  const keyId = req.apiKey.id;
  const now = Date.now();
  const windowMs = 60 * 60 * 1000; // 1 hour
  
  let record = rateLimitStore.get(keyId);
  
  // Reset if window expired
  if (!record || record.resetAt < now) {
    record = {
      count: 0,
      resetAt: now + windowMs,
    };
    rateLimitStore.set(keyId, record);
  }
  
  record.count++;
  
  // Check limit
  if (record.count > req.apiKey.rateLimit) {
    return res.status(429).json({
      error: 'Rate limit exceeded',
      limit: req.apiKey.rateLimit,
      resetAt: new Date(record.resetAt).toISOString(),
    });
  }
  
  // Add rate limit headers
  res.setHeader('X-RateLimit-Limit', req.apiKey.rateLimit);
  res.setHeader('X-RateLimit-Remaining', req.apiKey.rateLimit - record.count);
  res.setHeader('X-RateLimit-Reset', new Date(record.resetAt).toISOString());
  
  next();
}

// Usage tracking middleware
export async function trackApiUsage(
  req: Request,
  res: Response,
  next: NextFunction
) {
  if (!req.apiKey) {
    return next();
  }
  
  const startTime = Date.now();
  
  // Capture response
  const originalSend = res.send;
  let responseSize = 0;
  
  res.send = function (data: any) {
    responseSize = Buffer.byteLength(JSON.stringify(data));
    return originalSend.call(this, data);
  };
  
  res.on('finish', async () => {
    const responseTime = Date.now() - startTime;
    
    try {
      await db.insert(apiUsage).values({
        apiKeyId: req.apiKey!.id,
        endpoint: req.path,
        method: req.method,
        statusCode: res.statusCode,
        responseTime,
        requestSize: req.headers['content-length'] 
          ? parseInt(req.headers['content-length'] as string) 
          : 0,
        responseSize,
        timestamp: new Date(),
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      });
    } catch (error) {
      console.error('Failed to track API usage:', error);
    }
  });
  
  next();
}
```

### 1.4 Create API Routes

Create versioned API endpoints:

```typescript
// server/routes/api-v1.ts
import { Router } from 'express';
import { apiKeyAuth, apiRateLimit, trackApiUsage } from '../middleware/api-auth';

const router = Router();

// Apply middleware to all v1 routes
router.use(apiKeyAuth);
router.use(apiRateLimit);
router.use(trackApiUsage);

/**
 * POST /api/v1/analyze
 * Start website analysis
 */
router.post('/analyze', async (req, res) => {
  try {
    const { url, options } = req.body;
    
    if (!url) {
      return res.status(400).json({
        error: 'Missing required field: url',
      });
    }
    
    // Validate URL
    try {
      new URL(url);
    } catch {
      return res.status(400).json({
        error: 'Invalid URL format',
      });
    }
    
    // Call existing analysis logic
    // (reuse from existing /api/analyze endpoint)
    const analysis = await performAnalysis(url, {
      ...options,
      apiKeyId: req.apiKey!.id,
      consumer: req.apiKey!.consumer,
    });
    
    res.json({
      success: true,
      analysis: {
        id: analysis.id,
        url: analysis.url,
        status: analysis.status,
        createdAt: analysis.createdAt,
      },
      message: 'Analysis started successfully',
    });
  } catch (error) {
    console.error('API v1 analyze error:', error);
    res.status(500).json({
      error: 'Analysis failed',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/v1/analysis/:id
 * Get analysis status and results
 */
router.get('/analysis/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const analysis = await getAnalysisById(id);
    
    if (!analysis) {
      return res.status(404).json({
        error: 'Analysis not found',
      });
    }
    
    res.json({
      success: true,
      analysis: {
        id: analysis.id,
        url: analysis.url,
        status: analysis.status,
        progress: analysis.progress,
        results: analysis.results,
        createdAt: analysis.createdAt,
        completedAt: analysis.completedAt,
      },
    });
  } catch (error) {
    console.error('API v1 get analysis error:', error);
    res.status(500).json({
      error: 'Failed to retrieve analysis',
    });
  }
});

/**
 * POST /api/v1/generate
 * Generate LLMs.txt file from analysis
 */
router.post('/generate', async (req, res) => {
  try {
    const { analysisId, options } = req.body;
    
    if (!analysisId) {
      return res.status(400).json({
        error: 'Missing required field: analysisId',
      });
    }
    
    const llmFile = await generateLLMFile(analysisId, options);
    
    res.json({
      success: true,
      file: {
        id: llmFile.id,
        analysisId: llmFile.analysisId,
        content: llmFile.content,
        downloadUrl: `/api/v1/download/${llmFile.id}`,
        createdAt: llmFile.createdAt,
      },
    });
  } catch (error) {
    console.error('API v1 generate error:', error);
    res.status(500).json({
      error: 'File generation failed',
    });
  }
});

/**
 * GET /api/v1/download/:id
 * Download generated LLMs.txt file
 */
router.get('/download/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const llmFile = await getLLMFileById(id);
    
    if (!llmFile) {
      return res.status(404).json({
        error: 'File not found',
      });
    }
    
    res.setHeader('Content-Type', 'text/plain');
    res.setHeader('Content-Disposition', `attachment; filename="llms.txt"`);
    res.send(llmFile.content);
  } catch (error) {
    console.error('API v1 download error:', error);
    res.status(500).json({
      error: 'Download failed',
    });
  }
});

/**
 * GET /api/v1/usage
 * Get API usage statistics
 */
router.get('/usage', async (req, res) => {
  try {
    const usage = await getApiUsageStats(req.apiKey!.id);
    
    res.json({
      success: true,
      usage: {
        currentPeriod: usage.currentPeriod,
        limit: req.apiKey!.rateLimit,
        remaining: req.apiKey!.rateLimit - usage.currentPeriod,
        resetAt: usage.resetAt,
        totalRequests: usage.totalRequests,
        averageResponseTime: usage.averageResponseTime,
      },
    });
  } catch (error) {
    console.error('API v1 usage error:', error);
    res.status(500).json({
      error: 'Failed to retrieve usage statistics',
    });
  }
});

export default router;
```

### 1.5 Register API Routes

Update main routes file:

```typescript
// server/routes.ts
import apiV1Router from './routes/api-v1';

export function registerRoutes(app: Express) {
  // ... existing routes ...
  
  // API v1 routes (with authentication)
  app.use('/api/v1', apiV1Router);
  
  // ... rest of routes ...
}
```

### 1.6 Create API Key Management CLI

Create script to generate API keys:

```typescript
// scripts/create-api-key.ts
import { generateApiKey } from '../server/utils/api-key-generator';

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length < 2) {
    console.log('Usage: npm run create-api-key <name> <consumer> [tier] [rateLimit]');
    console.log('Example: npm run create-api-key "aimpactscanner-prod" aimpactscanner partner 1000');
    process.exit(1);
  }
  
  const [name, consumer, tier = 'free', rateLimitStr = '100'] = args;
  const rateLimit = parseInt(rateLimitStr);
  
  const apiKey = await generateApiKey({
    name,
    consumer,
    tier: tier as any,
    rateLimit,
  });
  
  console.log('\n✅ API Key created successfully!\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`Name:      ${apiKey.name}`);
  console.log(`Consumer:  ${apiKey.consumer}`);
  console.log(`Tier:      ${apiKey.tier}`);
  console.log(`Rate Limit: ${apiKey.rateLimit} requests/hour`);
  console.log(`\n🔑 API Key: ${apiKey.key}`);
  console.log('\n⚠️  IMPORTANT: Save this key now! It will not be shown again.');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  process.exit(0);
}

main().catch(console.error);
```

Add to package.json:
```json
{
  "scripts": {
    "create-api-key": "tsx scripts/create-api-key.ts"
  }
}
```

---

## Phase 2: SDK Development (Week 3)

### 2.1 Create SDK Package Structure

```
packages/sdk/
├── src/
│   ├── index.ts
│   ├── client.ts
│   ├── types.ts
│   ├── errors.ts
│   └── utils.ts
├── package.json
├── tsconfig.json
├── README.md
└── .npmignore
```

### 2.2 SDK Implementation

```typescript
// packages/sdk/src/types.ts
export interface ClientOptions {
  baseUrl?: string;
  timeout?: number;
  retries?: number;
}

export interface Analysis {
  id: string;
  url: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress?: number;
  results?: AnalysisResults;
  createdAt: string;
  completedAt?: string;
}

export interface AnalysisResults {
  pages: Page[];
  totalPages: number;
  processedPages: number;
  quality: QualityMetrics;
}

export interface Page {
  url: string;
  title: string;
  score: number;
  summary?: string;
  tags?: string[];
}

export interface QualityMetrics {
  averageScore: number;
  highQualityPages: number;
  mediumQualityPages: number;
  lowQualityPages: number;
}

export interface LLMFile {
  id: string;
  analysisId: string;
  content: string;
  downloadUrl: string;
  createdAt: string;
}

export interface UsageStats {
  currentPeriod: number;
  limit: number;
  remaining: number;
  resetAt: string;
  totalRequests: number;
  averageResponseTime: number;
}
```

```typescript
// packages/sdk/src/errors.ts
export class LLMTxtMasteryError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public code?: string
  ) {
    super(message);
    this.name = 'LLMTxtMasteryError';
  }
}

export class AuthenticationError extends LLMTxtMasteryError {
  constructor(message = 'Authentication failed') {
    super(message, 401, 'AUTHENTICATION_ERROR');
    this.name = 'AuthenticationError';
  }
}

export class RateLimitError extends LLMTxtMasteryError {
  constructor(
    message = 'Rate limit exceeded',
    public resetAt?: string
  ) {
    super(message, 429, 'RATE_LIMIT_ERROR');
    this.name = 'RateLimitError';
  }
}

export class NotFoundError extends LLMTxtMasteryError {
  constructor(resource: string) {
    super(`${resource} not found`, 404, 'NOT_FOUND');
    this.name = 'NotFoundError';
  }
}

export class ValidationError extends LLMTxtMasteryError {
  constructor(message: string) {
    super(message, 400, 'VALIDATION_ERROR');
    this.name = 'ValidationError';
  }
}
```

```typescript
// packages/sdk/src/client.ts
import {
  ClientOptions,
  Analysis,
  LLMFile,
  UsageStats,
} from './types';
import {
  LLMTxtMasteryError,
  AuthenticationError,
  RateLimitError,
  NotFoundError,
  ValidationError,
} from './errors';

export class LLMTxtMasteryClient {
  private apiKey: string;
  private baseUrl: string;
  private timeout: number;
  private retries: number;
  
  constructor(apiKey: string, options: ClientOptions = {}) {
    if (!apiKey) {
      throw new Error('API key is required');
    }
    
    this.apiKey = apiKey;
    this.baseUrl = options.baseUrl || 'https://llm-txt-mastery-production.up.railway.app';
    this.timeout = options.timeout || 30000;
    this.retries = options.retries || 3;
  }
  
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    
    const headers = {
      'Content-Type': 'application/json',
      'X-API-Key': this.apiKey,
      ...options.headers,
    };
    
    let lastError: Error | null = null;
    
    for (let attempt = 0; attempt <= this.retries; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeout);
        
        const response = await fetch(url, {
          ...options,
          headers,
          signal: controller.signal,
        });
        
        clearTimeout(timeoutId);
        
        // Handle rate limiting
        if (response.status === 429) {
          const resetAt = response.headers.get('X-RateLimit-Reset');
          throw new RateLimitError('Rate limit exceeded', resetAt || undefined);
        }
        
        // Handle authentication errors
        if (response.status === 401) {
          throw new AuthenticationError();
        }
        
        // Handle not found
        if (response.status === 404) {
          const data = await response.json();
          throw new NotFoundError(data.error || 'Resource');
        }
        
        // Handle validation errors
        if (response.status === 400) {
          const data = await response.json();
          throw new ValidationError(data.error || 'Validation failed');
        }
        
        // Handle other errors
        if (!response.ok) {
          const data = await response.json();
          throw new LLMTxtMasteryError(
            data.message || 'Request failed',
            response.status,
            data.code
          );
        }
        
        return await response.json();
      } catch (error) {
        lastError = error as Error;
        
        // Don't retry on authentication or validation errors
        if (
          error instanceof AuthenticationError ||
          error instanceof ValidationError ||
          error instanceof NotFoundError
        ) {
          throw error;
        }
        
        // Wait before retry (exponential backoff)
        if (attempt < this.retries) {
          await new Promise(resolve => 
            setTimeout(resolve, Math.pow(2, attempt) * 1000)
          );
        }
      }
    }
    
    throw lastError || new Error('Request failed after retries');
  }
  
  /**
   * Start website analysis
   */
  async analyze(url: string, options?: {
    maxPages?: number;
    includeSubdomains?: boolean;
  }): Promise<Analysis> {
    const response = await this.request<{ success: boolean; analysis: Analysis }>(
      '/api/v1/analyze',
      {
        method: 'POST',
        body: JSON.stringify({ url, options }),
      }
    );
    
    return response.analysis;
  }
  
  /**
   * Get analysis status and results
   */
  async getAnalysis(id: string): Promise<Analysis> {
    const response = await this.request<{ success: boolean; analysis: Analysis }>(
      `/api/v1/analysis/${id}`
    );
    
    return response.analysis;
  }
  
  /**
   * Wait for analysis to complete
   */
  async waitForAnalysis(
    id: string,
    options?: {
      pollInterval?: number;
      timeout?: number;
      onProgress?: (analysis: Analysis) => void;
    }
  ): Promise<Analysis> {
    const pollInterval = options?.pollInterval || 2000;
    const timeout = options?.timeout || 300000; // 5 minutes
    const startTime = Date.now();
    
    while (true) {
      const analysis = await this.getAnalysis(id);
      
      if (options?.onProgress) {
        options.onProgress(analysis);
      }
      
      if (analysis.status === 'completed') {
        return analysis;
      }
      
      if (analysis.status === 'failed') {
        throw new Error('Analysis failed');
      }
      
      if (Date.now() - startTime > timeout) {
        throw new Error('Analysis timeout');
      }
      
      await new Promise(resolve => setTimeout(resolve, pollInterval));
    }
  }
  
  /**
   * Generate LLMs.txt file from analysis
   */
  async generateFile(
    analysisId: string,
    options?: {
      includeMetadata?: boolean;
      format?: 'standard' | 'enhanced';
    }
  ): Promise<LLMFile> {
    const response = await this.request<{ success: boolean; file: LLMFile }>(
      '/api/v1/generate',
      {
        method: 'POST',
        body: JSON.stringify({ analysisId, options }),
      }
    );
    
    return response.file;
  }
  
  /**
   * Download LLMs.txt file content
   */
  async downloadFile(fileId: string): Promise<string> {
    const response = await fetch(
      `${this.baseUrl}/api/v1/download/${fileId}`,
      {
        headers: {
          'X-API-Key': this.apiKey,
        },
      }
    );
    
    if (!response.ok) {
      throw new Error('Download failed');
    }
    
    return await response.text();
  }
  
  /**
   * Get API usage statistics
   */
  async getUsage(): Promise<UsageStats> {
    const response = await this.request<{ success: boolean; usage: UsageStats }>(
      '/api/v1/usage'
    );
    
    return response.usage;
  }
  
  /**
   * Convenience method: Analyze and generate in one call
   */
  async analyzeAndGenerate(
    url: string,
    options?: {
      analysisOptions?: Parameters<typeof this.analyze>[1];
      generateOptions?: Parameters<typeof this.generateFile>[1];
      onProgress?: (analysis: Analysis) => void;
    }
  ): Promise<{ analysis: Analysis; file: LLMFile }> {
    // Start analysis
    const analysis = await this.analyze(url, options?.analysisOptions);
    
    // Wait for completion
    const completedAnalysis = await this.waitForAnalysis(analysis.id, {
      onProgress: options?.onProgress,
    });
    
    // Generate file
    const file = await this.generateFile(
      completedAnalysis.id,
      options?.generateOptions
    );
    
    return {
      analysis: completedAnalysis,
      file,
    };
  }
}
```

```typescript
// packages/sdk/src/index.ts
export { LLMTxtMasteryClient } from './client';
export * from './types';
export * from './errors';
```

### 2.3 SDK Package Configuration

```json
// packages/sdk/package.json
{
  "name": "@llmtxtmastery/sdk",
  "version": "1.0.0",
  "description": "TypeScript SDK for LLM.txt Mastery API",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "files": [
    "dist"
  ],
  "scripts": {
    "build": "tsc",
    "prepublishOnly": "npm run build",
    "test": "jest"
  },
  "keywords": [
    "llm",
    "llms.txt",
    "ai",
    "seo",
    "content-analysis"
  ],
  "author": "Your Name",
  "license": "MIT",
  "dependencies": {},
  "devDependencies": {
    "@types/node": "^20.0.0",
    "typescript": "^5.0.0"
  }
}
```

```json
// packages/sdk/tsconfig.json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "declaration": true,
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

### 2.4 SDK Documentation

```markdown
# @llmtxtmastery/sdk

Official TypeScript SDK for the LLM.txt Mastery API.

## Installation

\`\`\`bash
npm install @llmtxtmastery/sdk
\`\`\`

## Quick Start

\`\`\`typescript
import { LLMTxtMasteryClient } from '@llmtxtmastery/sdk';

const client = new LLMTxtMasteryClient('your-api-key');

// Analyze a website
const analysis = await client.analyze('https://example.com');

// Wait for completion
const completed = await client.waitForAnalysis(analysis.id, {
  onProgress: (analysis) => {
    console.log(`Progress: ${analysis.progress}%`);
  },
});

// Generate LLMs.txt file
const file = await client.generateFile(completed.id);
console.log(file.content);
\`\`\`

## API Reference

### Constructor

\`\`\`typescript
new LLMTxtMasteryClient(apiKey: string, options?: ClientOptions)
\`\`\`

### Methods

#### analyze(url, options?)
Start website analysis.

#### getAnalysis(id)
Get analysis status and results.

#### waitForAnalysis(id, options?)
Wait for analysis to complete with polling.

#### generateFile(analysisId, options?)
Generate LLMs.txt file from completed analysis.

#### downloadFile(fileId)
Download file content as string.

#### getUsage()
Get API usage statistics.

#### analyzeAndGenerate(url, options?)
Convenience method to analyze and generate in one call.

## Error Handling

\`\`\`typescript
import { 
  AuthenticationError, 
  RateLimitError,
  NotFoundError,
  ValidationError 
} from '@llmtxtmastery/sdk';

try {
  await client.analyze('https://example.com');
} catch (error) {
  if (error instanceof RateLimitError) {
    console.log('Rate limit exceeded, reset at:', error.resetAt);
  } else if (error instanceof AuthenticationError) {
    console.log('Invalid API key');
  }
}
\`\`\`
```

---

## Phase 3: aimpactscanner Integration (Week 4-5)

### 3.1 Install SDK

```bash
cd aimpactscanner
npm install @llmtxtmastery/sdk
```

### 3.2 Create Integration Service

```typescript
// aimpactscanner/server/services/llmtxt-service.ts
import { LLMTxtMasteryClient, Analysis, LLMFile } from '@llmtxtmastery/sdk';

export class LLMTxtService {
  private client: LLMTxtMasteryClient;
  
  constructor() {
    const apiKey = process.env.LLMTXT_API_KEY;
    
    if (!apiKey) {
      throw new Error('LLMTXT_API_KEY environment variable is required');
    }
    
    this.client = new LLMTxtMasteryClient(apiKey, {
      baseUrl: process.env.LLMTXT_API_URL,
    });
  }
  
  /**
   * Analyze website for LLMs.txt optimization
   */
  async analyzeWebsite(url: string): Promise<Analysis> {
    return await this.client.analyze(url);
  }
  
  /**
   * Get analysis with progress tracking
   */
  async getAnalysisWithProgress(
    id: string,
    onProgress?: (progress: number) => void
  ): Promise<Analysis> {
    return await this.client.waitForAnalysis(id, {
      onProgress: (analysis) => {
        if (onProgress && analysis.progress) {
          onProgress(analysis.progress);
        }
      },
    });
  }
  
  /**
   * Generate LLMs.txt file
   */
  async generateFile(analysisId: string): Promise<LLMFile> {
    return await this.client.generateFile(analysisId);
  }
  
  /**
   * Full workflow: analyze and generate
   */
  async analyzeAndGenerate(
    url: string,
    onProgress?: (progress: number) => void
  ): Promise<{ analysis: Analysis; file: LLMFile }> {
    return await this.client.analyzeAndGenerate(url, {
      onProgress: (analysis) => {
        if (onProgress && analysis.progress) {
          onProgress(analysis.progress);
        }
      },
    });
  }
  
  /**
   * Calculate AI impact score based on LLMs.txt analysis
   */
  calculateAIImpactScore(analysis: Analysis): {
    score: number;
    factors: Record<string, number>;
    recommendations: string[];
  } {
    const factors: Record<string, number> = {};
    const recommendations: string[] = [];
    
    if (!analysis.results) {
      return { score: 0, factors, recommendations };
    }
    
    const { results } = analysis;
    
    // Factor 1: Content quality (0-40 points)
    const avgQuality = results.quality.averageScore;
    factors.contentQuality = Math.round(avgQuality * 40);
    
    if (avgQuality < 0.6) {
      recommendations.push(
        'Improve content quality on low-scoring pages to enhance AI understanding'
      );
    }
    
    // Factor 2: Coverage (0-30 points)
    const coverage = results.processedPages / results.totalPages;
    factors.coverage = Math.round(coverage * 30);
    
    if (coverage < 0.8) {
      recommendations.push(
        'Increase sitemap coverage to ensure all important pages are indexed by AI'
      );
    }
    
    // Factor 3: High-quality page ratio (0-30 points)
    const highQualityRatio = 
      results.quality.highQualityPages / results.processedPages;
    factors.highQualityRatio = Math.round(highQualityRatio * 30);
    
    if (highQualityRatio < 0.3) {
      recommendations.push(
        'Focus on creating more high-quality content pages for better AI visibility'
      );
    }
    
    const totalScore = Object.values(factors).reduce((a, b) => a + b, 0);
    
    return {
      score: totalScore,
      factors,
      recommendations,
    };
  }
}
```

### 3.3 Create API Endpoints

```typescript
// aimpactscanner/server/routes/llmtxt.ts
import { Router } from 'express';
import { LLMTxtService } from '../services/llmtxt-service';

const router = Router();
const llmtxtService = new LLMTxtService();

/**
 * POST /api/llmtxt/analyze
 * Start LLMs.txt analysis for a URL
 */
router.post('/analyze', async (req, res) => {
  try {
    const { url } = req.body;
    
    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }
    
    const analysis = await llmtxtService.analyzeWebsite(url);
    
    res.json({
      success: true,
      analysis,
    });
  } catch (error) {
    console.error('LLMTxt analysis error:', error);
    res.status(500).json({
      error: 'Analysis failed',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/llmtxt/analysis/:id
 * Get analysis status
 */
router.get('/analysis/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const analysis = await llmtxtService.client.getAnalysis(id);
    
    res.json({
      success: true,
      analysis,
    });
  } catch (error) {
    console.error('Get analysis error:', error);
    res.status(500).json({
      error: 'Failed to get analysis',
    });
  }
});

/**
 * POST /api/llmtxt/generate
 * Generate LLMs.txt file
 */
router.post('/generate', async (req, res) => {
  try {
    const { analysisId } = req.body;
    
    if (!analysisId) {
      return res.status(400).json({ error: 'analysisId is required' });
    }
    
    const file = await llmtxtService.generateFile(analysisId);
    
    res.json({
      success: true,
      file,
    });
  } catch (error) {
    console.error('Generate file error:', error);
    res.status(500).json({
      error: 'File generation failed',
    });
  }
});

/**
 * POST /api/llmtxt/impact-score
 * Calculate AI impact score from analysis
 */
router.post('/impact-score', async (req, res) => {
  try {
    const { analysisId } = req.body;
    
    if (!analysisId) {
      return res.status(400).json({ error: 'analysisId is required' });
    }
    
    const analysis = await llmtxtService.client.getAnalysis(analysisId);
    const impact = llmtxtService.calculateAIImpactScore(analysis);
    
    res.json({
      success: true,
      impact,
    });
  } catch (error) {
    console.error('Impact score error:', error);
    res.status(500).json({
      error: 'Failed to calculate impact score',
    });
  }
});

export default router;
```

### 3.4 Create Frontend Components

```typescript
// aimpactscanner/client/components/LLMTxtPanel.tsx
import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Download, CheckCircle, AlertCircle } from 'lucide-react';

interface LLMTxtPanelProps {
  url: string;
}

export function LLMTxtPanel({ url }: LLMTxtPanelProps) {
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [analysis, setAnalysis] = useState<any>(null);
  const [file, setFile] = useState<any>(null);
  const [impact, setImpact] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  
  const handleAnalyze = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Start analysis
      const analyzeRes = await fetch('/api/llmtxt/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });
      
      const { analysis: initialAnalysis } = await analyzeRes.json();
      
      // Poll for completion
      let completed = false;
      while (!completed) {
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        const statusRes = await fetch(`/api/llmtxt/analysis/${initialAnalysis.id}`);
        const { analysis: currentAnalysis } = await statusRes.json();
        
        setProgress(currentAnalysis.progress || 0);
        
        if (currentAnalysis.status === 'completed') {
          setAnalysis(currentAnalysis);
          completed = true;
          
          // Generate file
          const fileRes = await fetch('/api/llmtxt/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ analysisId: currentAnalysis.id }),
          });
          const { file: generatedFile } = await fileRes.json();
          setFile(generatedFile);
          
          // Calculate impact
          const impactRes = await fetch('/api/llmtxt/impact-score', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ analysisId: currentAnalysis.id }),
          });
          const { impact: calculatedImpact } = await impactRes.json();
          setImpact(calculatedImpact);
        } else if (currentAnalysis.status === 'failed') {
          throw new Error('Analysis failed');
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Analysis failed');
    } finally {
      setLoading(false);
    }
  };
  
  const handleDownload = () => {
    if (!file) return;
    
    const blob = new Blob([file.content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'llms.txt';
    a.click();
    URL.revokeObjectURL(url);
  };
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>LLMs.txt Optimization</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!analysis && (
          <Button
            onClick={handleAnalyze}
            disabled={loading}
            className="w-full"
          >
            {loading ? 'Analyzing...' : 'Analyze for LLMs.txt'}
          </Button>
        )}
        
        {loading && (
          <div className="space-y-2">
            <Progress value={progress} />
            <p className="text-sm text-muted-foreground text-center">
              {progress}% complete
            </p>
          </div>
        )}
        
        {error && (
          <div className="flex items-center gap-2 text-destructive">
            <AlertCircle className="h-4 w-4" />
            <span>{error}</span>
          </div>
        )}
        
        {analysis && impact && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="font-semibold">AI Impact Score</span>
              <Badge variant={impact.score >= 70 ? 'default' : 'secondary'}>
                {impact.score}/100
              </Badge>
            </div>
            
            <div className="space-y-2">
              <h4 className="text-sm font-semibold">Score Breakdown</h4>
              {Object.entries(impact.factors).map(([key, value]) => (
                <div key={key} className="flex justify-between text-sm">
                  <span className="capitalize">
                    {key.replace(/([A-Z])/g, ' $1').trim()}
                  </span>
                  <span>{value}</span>
                </div>
              ))}
            </div>
            
            {impact.recommendations.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-semibold">Recommendations</h4>
                <ul className="list-disc list-inside space-y-1 text-sm">
                  {impact.recommendations.map((rec: string, i: number) => (
                    <li key={i}>{rec}</li>
                  ))}
                </ul>
              </div>
            )}
            
            {file && (
              <Button
                onClick={handleDownload}
                variant="outline"
                className="w-full"
              >
                <Download className="h-4 w-4 mr-2" />
                Download LLMs.txt
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
```

---

## Phase 4: Testing & Documentation (Week 6)

### 4.1 Integration Tests

```typescript
// aimpactscanner/tests/llmtxt-integration.test.ts
import { LLMTxtService } from '../server/services/llmtxt-service';

describe('LLMTxt Integration', () => {
  let service: LLMTxtService;
  
  beforeAll(() => {
    service = new LLMTxtService();
  });
  
  it('should analyze a website', async () => {
    const analysis = await service.analyzeWebsite('https://example.com');
    
    expect(analysis).toBeDefined();
    expect(analysis.id).toBeDefined();
    expect(analysis.url).toBe('https://example.com');
  });
  
  it('should wait for analysis completion', async () => {
    const analysis = await service.analyzeWebsite('https://example.com');
    const completed = await service.getAnalysisWithProgress(analysis.id);
    
    expect(completed.status).toBe('completed');
    expect(completed.results).toBeDefined();
  });
  
  it('should generate file', async () => {
    const { analysis, file } = await service.analyzeAndGenerate('https://example.com');
    
    expect(file).toBeDefined();
    expect(file.content).toContain('# LLMs.txt');
  });
  
  it('should calculate impact score', async () => {
    const analysis = await service.analyzeWebsite('https://example.com');
    const completed = await service.getAnalysisWithProgress(analysis.id);
    const impact = service.calculateAIImpactScore(completed);
    
    expect(impact.score).toBeGreaterThanOrEqual(0);
    expect(impact.score).toBeLessThanOrEqual(100);
    expect(impact.factors).toBeDefined();
    expect(impact.recommendations).toBeInstanceOf(Array);
  });
});
```

### 4.2 API Documentation

Create OpenAPI/Swagger documentation for the API:

```yaml
# docs/api-v1.yaml
openapi: 3.0.0
info:
  title: LLM.txt Mastery API
  version: 1.0.0
  description: API for analyzing websites and generating LLMs.txt files

servers:
  - url: https://llm-txt-mastery-production.up.railway.app/api/v1
    description: Production server

security:
  - ApiKeyAuth: []

paths:
  /analyze:
    post:
      summary: Start website analysis
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                url:
                  type: string
                  format: uri
                options:
                  type: object
                  properties:
                    maxPages:
                      type: integer
                    includeSubdomains:
                      type: boolean
      responses:
        '200':
          description: Analysis started
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/AnalysisResponse'
        '401':
          $ref: '#/components/responses/Unauthorized'
        '429':
          $ref: '#/components/responses/RateLimitExceeded'

  /analysis/{id}:
    get:
      summary: Get analysis status and results
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: string
      responses:
        '200':
          description: Analysis details
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/AnalysisResponse'
        '404':
          $ref: '#/components/responses/NotFound'

components:
  securitySchemes:
    ApiKeyAuth:
      type: apiKey
      in: header
      name: X-API-Key
  
  schemas:
    AnalysisResponse:
      type: object
      properties:
        success:
          type: boolean
        analysis:
          $ref: '#/components/schemas/Analysis'
    
    Analysis:
      type: object
      properties:
        id:
          type: string
        url:
          type: string
        status:
          type: string
          enum: [pending, processing, completed, failed]
        progress:
          type: integer
        results:
          type: object
        createdAt:
          type: string
          format: date-time
        completedAt:
          type: string
          format: date-time
  
  responses:
    Unauthorized:
      description: Invalid or missing API key
    RateLimitExceeded:
      description: Rate limit exceeded
    NotFound:
      description: Resource not found
```

---

## Deployment Checklist

### llm-txt-mastery Deployment

- [ ] Run database migrations for new tables
- [ ] Generate API key for aimpactscanner
- [ ] Deploy API changes to Railway
- [ ] Test API endpoints with Postman/curl
- [ ] Monitor error logs for issues
- [ ] Update documentation

### SDK Deployment

- [ ] Build SDK package
- [ ] Publish to npm registry
- [ ] Test installation in clean project
- [ ] Verify TypeScript types work correctly

### aimpactscanner Deployment

- [ ] Add LLMTXT_API_KEY to environment variables
- [ ] Install SDK dependency
- [ ] Deploy backend changes
- [ ] Deploy frontend changes
- [ ] Test end-to-end integration
- [ ] Monitor API usage and costs

---

## Monitoring & Maintenance

### Metrics to Track

1. **API Usage**
   - Requests per hour/day
   - Response times
   - Error rates
   - Rate limit hits

2. **Cost Management**
   - OpenAI API costs per consumer
   - Infrastructure costs
   - Cost per analysis

3. **Performance**
   - Analysis completion time
   - Cache hit rates
   - Database query performance

### Alerts to Configure

- Rate limit approaching for any consumer
- Error rate > 5%
- Response time > 5 seconds
- OpenAI API costs spike

---

## Future Enhancements

### Phase 2 Features

1. **Webhook Support**
   - Notify consumers when analysis completes
   - Signature verification for security

2. **Batch Operations**
   - Analyze multiple URLs in one request
   - Bulk file generation

3. **Advanced Analytics**
   - Historical trend analysis
   - Competitive benchmarking
   - Content recommendations

4. **White-label Options**
   - Custom branding for API consumers
   - Embedded widgets

5. **GraphQL API**
   - Alternative to REST
   - More flexible queries

---

## Conclusion

This implementation guide provides a complete roadmap for integrating llm-txt-mastery into aimpactscanner while maintaining both as independent products. The microservices API approach with SDK provides the best balance of flexibility, maintainability, and scalability.

**Key Benefits**:
- ✅ Clean separation of concerns
- ✅ Independent scaling and deployment
- ✅ Type-safe integration via SDK
- ✅ Monetization flexibility
- ✅ Multiple consumer support

**Next Steps**:
1. Review and approve this approach
2. Set up project timeline
3. Begin Phase 1 implementation
4. Iterate based on feedback

