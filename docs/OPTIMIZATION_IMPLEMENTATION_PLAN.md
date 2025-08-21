# Performance Optimization Implementation Plan

## Overview
Systematic implementation of 4 performance optimizations with full testing gates between each feature. Cache warming deferred until 10,000+ users.

## Implementation Schedule

### Phase 1: Connection Pooling (Week 1)
**Timeline**: 3-4 days  
**Risk Level**: Low  
**Expected Impact**: 30-50% faster page fetching

### Phase 2: Circuit Breaker (Week 2)
**Timeline**: 2-3 days  
**Risk Level**: Low  
**Expected Impact**: 5% cost savings, better reliability

### Phase 3: Progressive Streaming (Week 3-4)
**Timeline**: 5-7 days  
**Risk Level**: Medium  
**Expected Impact**: 2-3x perceived performance improvement

### Phase 4: Dynamic Batch Sizing (Week 5)
**Timeline**: 3-4 days  
**Risk Level**: Medium  
**Expected Impact**: 40% faster for small-page sites

---

## Phase 1: Connection Pooling Implementation

### 1.1 Development Tasks

#### Create Connection Pool Manager
```typescript
// File: server/services/connection-pool.ts
import http from 'http';
import https from 'https';

export class ConnectionPoolManager {
  private agents: Map<string, https.Agent>;
  private lastUsed: Map<string, number>;
  private readonly maxAgents = 50;
  private readonly maxSocketsPerAgent = 10;
  private readonly idleTimeout = 60000; // 1 minute
  
  constructor() {
    this.agents = new Map();
    this.lastUsed = new Map();
    
    // Cleanup idle connections every 5 minutes
    setInterval(() => this.cleanupIdleAgents(), 300000);
  }
  
  getAgent(url: string): https.Agent {
    const hostname = new URL(url).hostname;
    
    if (!this.agents.has(hostname)) {
      // Evict oldest agent if at capacity
      if (this.agents.size >= this.maxAgents) {
        this.evictOldestAgent();
      }
      
      const agent = new https.Agent({
        keepAlive: true,
        keepAliveMsecs: 1000,
        maxSockets: this.maxSocketsPerAgent,
        maxFreeSockets: 5,
        timeout: 30000,
        scheduling: 'lifo' // Last-in-first-out for better connection reuse
      });
      
      this.agents.set(hostname, agent);
    }
    
    this.lastUsed.set(hostname, Date.now());
    return this.agents.get(hostname)!;
  }
  
  private cleanupIdleAgents(): void {
    const now = Date.now();
    for (const [hostname, lastUsedTime] of this.lastUsed.entries()) {
      if (now - lastUsedTime > this.idleTimeout) {
        const agent = this.agents.get(hostname);
        agent?.destroy();
        this.agents.delete(hostname);
        this.lastUsed.delete(hostname);
        console.log(`Cleaned up idle agent for ${hostname}`);
      }
    }
  }
  
  private evictOldestAgent(): void {
    let oldestHostname = '';
    let oldestTime = Date.now();
    
    for (const [hostname, time] of this.lastUsed.entries()) {
      if (time < oldestTime) {
        oldestTime = time;
        oldestHostname = hostname;
      }
    }
    
    if (oldestHostname) {
      const agent = this.agents.get(oldestHostname);
      agent?.destroy();
      this.agents.delete(oldestHostname);
      this.lastUsed.delete(oldestHostname);
      console.log(`Evicted agent for ${oldestHostname}`);
    }
  }
  
  // Graceful shutdown
  destroy(): void {
    for (const agent of this.agents.values()) {
      agent.destroy();
    }
    this.agents.clear();
    this.lastUsed.clear();
  }
  
  // Metrics for monitoring
  getStats(): { activeAgents: number, hostnames: string[] } {
    return {
      activeAgents: this.agents.size,
      hostnames: Array.from(this.agents.keys())
    };
  }
}

// Singleton instance
export const connectionPool = new ConnectionPoolManager();
```

#### Update Page Fetching Logic
```typescript
// File: server/services/sitemap.ts (modification)
import { connectionPool } from './connection-pool';
import fetch from 'node-fetch';

export async function fetchPageContent(url: string): Promise<string> {
  const MAX_RETRIES = 3;
  const TIMEOUT = 30000;
  
  // Use connection pool for HTTPS URLs
  const agent = url.startsWith('https') ? connectionPool.getAgent(url) : undefined;
  
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), TIMEOUT);
      
      const response = await fetch(url, {
        agent,
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; LLMtxtMastery/1.0)',
          'Accept': 'text/html,application/xhtml+xml',
          'Accept-Language': 'en-US,en;q=0.9',
          'Accept-Encoding': 'gzip, deflate',
          'Connection': 'keep-alive'
        }
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      return await response.text();
      
    } catch (error) {
      if (attempt === MAX_RETRIES) {
        throw error;
      }
      
      // Exponential backoff
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
    }
  }
  
  throw new Error(`Failed to fetch ${url} after ${MAX_RETRIES} attempts`);
}
```

### 1.2 Unit Tests

```typescript
// File: tests/connection-pool.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ConnectionPoolManager } from '../server/services/connection-pool';

describe('ConnectionPoolManager', () => {
  let pool: ConnectionPoolManager;
  
  beforeEach(() => {
    pool = new ConnectionPoolManager();
  });
  
  afterEach(() => {
    pool.destroy();
  });
  
  it('should create new agents for different hostnames', () => {
    const agent1 = pool.getAgent('https://example.com/page1');
    const agent2 = pool.getAgent('https://different.com/page1');
    
    expect(agent1).toBeDefined();
    expect(agent2).toBeDefined();
    expect(agent1).not.toBe(agent2);
  });
  
  it('should reuse agents for same hostname', () => {
    const agent1 = pool.getAgent('https://example.com/page1');
    const agent2 = pool.getAgent('https://example.com/page2');
    
    expect(agent1).toBe(agent2);
  });
  
  it('should evict oldest agent when at capacity', () => {
    // Set maxAgents to 2 for testing
    pool['maxAgents'] = 2;
    
    pool.getAgent('https://first.com');
    pool.getAgent('https://second.com');
    
    const stats1 = pool.getStats();
    expect(stats1.activeAgents).toBe(2);
    
    // This should evict the first agent
    pool.getAgent('https://third.com');
    
    const stats2 = pool.getStats();
    expect(stats2.activeAgents).toBe(2);
    expect(stats2.hostnames).not.toContain('first.com');
    expect(stats2.hostnames).toContain('third.com');
  });
  
  it('should handle concurrent requests to same host', async () => {
    const promises = Array(10).fill(null).map(() => 
      new Promise(resolve => {
        const agent = pool.getAgent('https://example.com');
        resolve(agent);
      })
    );
    
    const agents = await Promise.all(promises);
    
    // All should be the same agent
    expect(new Set(agents).size).toBe(1);
  });
});
```

### 1.3 Integration Tests

```typescript
// File: tests/integration/connection-pool-integration.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { analyzeDiscoveredPagesWithCache } from '../server/services/sitemap-enhanced';
import { connectionPool } from '../server/services/connection-pool';

describe('Connection Pool Integration', () => {
  afterAll(() => {
    connectionPool.destroy();
  });
  
  it('should successfully analyze pages with connection pooling', async () => {
    const testEntries = [
      { url: 'https://example.com/page1', lastmod: new Date() },
      { url: 'https://example.com/page2', lastmod: new Date() },
      { url: 'https://example.com/page3', lastmod: new Date() }
    ];
    
    const startTime = Date.now();
    const result = await analyzeDiscoveredPagesWithCache(
      testEntries,
      'test@example.com',
      'starter'
    );
    const duration = Date.now() - startTime;
    
    expect(result.pages).toHaveLength(3);
    expect(result.metrics.totalPages).toBe(3);
    
    // Should be faster with connection pooling
    expect(duration).toBeLessThan(10000);
    
    // Check that agent was reused
    const stats = connectionPool.getStats();
    expect(stats.activeAgents).toBe(1);
    expect(stats.hostnames).toContain('example.com');
  });
  
  it('should handle mixed HTTP/HTTPS sites', async () => {
    const testEntries = [
      { url: 'https://secure.example.com/page1', lastmod: new Date() },
      { url: 'http://plain.example.com/page1', lastmod: new Date() }
    ];
    
    const result = await analyzeDiscoveredPagesWithCache(
      testEntries,
      'test@example.com',
      'starter'
    );
    
    expect(result.pages.length).toBeGreaterThan(0);
    
    // Only HTTPS should use connection pool
    const stats = connectionPool.getStats();
    expect(stats.hostnames).toContain('secure.example.com');
    expect(stats.hostnames).not.toContain('plain.example.com');
  });
});
```

### 1.4 Regression Test Suite

```typescript
// File: tests/e2e/regression-connection-pool.spec.ts
import { test, expect } from '@playwright/test';
import { generateTempEmail } from './utils/temp-email';

test.describe('Connection Pool Regression Tests', () => {
  test('Free tier analysis still respects 20-page limit', async ({ page }) => {
    const email = generateTempEmail();
    
    await page.goto('https://www.llmtxtmastery.com');
    await page.fill('[name="email"]', email);
    await page.click('text="Quick Start"');
    await page.fill('[name="url"]', 'https://docs.python.org');
    await page.click('text="Analyze"');
    
    // Wait for analysis to complete
    await page.waitForSelector('text="Analysis Complete"', { timeout: 60000 });
    
    // Check page count
    const pageCount = await page.textContent('.page-count');
    expect(parseInt(pageCount)).toBeLessThanOrEqual(20);
  });
  
  test('Coffee tier gets 200 pages with pooling', async ({ page }) => {
    // Test with coffee tier user
    const email = 'coffee-test@example.com';
    
    await page.goto('https://www.llmtxtmastery.com');
    await page.fill('[name="email"]', email);
    await page.fill('[name="password"]', 'testpass123');
    await page.click('text="Sign In"');
    
    await page.fill('[name="url"]', 'https://nodejs.org');
    await page.click('text="Analyze"');
    
    await page.waitForSelector('text="Analysis Complete"', { timeout: 120000 });
    
    const pageCount = await page.textContent('.page-count');
    expect(parseInt(pageCount)).toBeLessThanOrEqual(200);
  });
  
  test('Bot protection still works with pooling', async ({ page }) => {
    const email = generateTempEmail();
    
    await page.goto('https://www.llmtxtmastery.com');
    await page.fill('[name="email"]', email);
    await page.click('text="Quick Start"');
    
    // Try a site known to have bot protection
    await page.fill('[name="url"]', 'https://www.cloudflare.com');
    await page.click('text="Analyze"');
    
    // Should handle gracefully
    await page.waitForSelector('text=/Analysis Complete|Bot protection detected/', { 
      timeout: 60000 
    });
    
    // Should still get some results or clear error
    const hasResults = await page.isVisible('.analysis-results');
    const hasError = await page.isVisible('.error-message');
    expect(hasResults || hasError).toBe(true);
  });
  
  test('Performance improvement measurable', async ({ page }) => {
    const email = generateTempEmail();
    
    await page.goto('https://www.llmtxtmastery.com');
    await page.fill('[name="email"]', email);
    await page.click('text="Quick Start"');
    
    // Analyze a multi-page site
    await page.fill('[name="url"]', 'https://example.com');
    await page.click('text="Analyze"');
    
    const startTime = Date.now();
    await page.waitForSelector('text="Analysis Complete"', { timeout: 60000 });
    const duration = Date.now() - startTime;
    
    // Should complete in reasonable time
    expect(duration).toBeLessThan(30000);
    
    // Log performance for comparison
    console.log(`Analysis completed in ${duration}ms with connection pooling`);
  });
});
```

### 1.5 Production Deployment Checklist

```markdown
## Connection Pooling Deployment Checklist

### Pre-Deployment
- [ ] All unit tests passing
- [ ] All integration tests passing  
- [ ] Code review completed
- [ ] Performance baseline recorded (current avg time for 20 pages)
- [ ] Memory usage baseline recorded

### Deployment Steps
1. [ ] Deploy to staging environment
2. [ ] Run staging regression tests
3. [ ] Monitor memory usage for 30 minutes
4. [ ] Deploy to production (off-peak hours)
5. [ ] Run production smoke tests

### Post-Deployment Validation
- [ ] Run full Playwright test suite on production
- [ ] Monitor error rates for 1 hour
- [ ] Check memory usage hasn't increased >10%
- [ ] Verify connection pool metrics in logs
- [ ] Compare performance metrics to baseline

### Rollback Criteria
- Error rate increases >5%
- Memory usage increases >20%
- Any regression test failures
- Response time increases (should decrease)
```

### 1.6 Operations Manual Update

```markdown
## Operations Manual Addition: Connection Pooling

### Overview
Connection pooling was implemented on [DATE] to improve page fetching performance by reusing HTTP connections to the same domain.

### Configuration
- Max agents: 50 (different domains)
- Max sockets per agent: 10 (concurrent requests per domain)
- Idle timeout: 60 seconds
- Cleanup interval: 5 minutes

### Monitoring
Check connection pool health:
```bash
# View active connection pools
curl https://llm-txt-mastery-production.up.railway.app/api/admin/connection-pool-stats

# Expected response:
{
  "activeAgents": 12,
  "hostnames": ["docs.python.org", "reactjs.org", ...],
  "memoryUsage": "45MB"
}
```

### Troubleshooting

**Issue**: Memory usage increasing
**Solution**: 
1. Check `activeAgents` count
2. If > 40, reduce `maxAgents` setting
3. Restart service if necessary

**Issue**: Connection refused errors
**Solution**:
1. Check if target site blocking persistent connections
2. Add hostname to exclusion list in connection-pool.ts
3. Site will use standard connections

### Performance Metrics
- Average improvement: 30-50% faster page fetching
- Memory overhead: ~10KB per active domain
- Best for: Sites with 10+ pages
- Minimal impact: Single-page analyses

### Rollback Procedure
To disable connection pooling:
1. Set environment variable: `DISABLE_CONNECTION_POOL=true`
2. Restart service
3. Connections will use standard fetch without pooling
```

---

## Phase 2: Circuit Breaker Implementation

### 2.1 Development Tasks

#### Create Circuit Breaker Service
```typescript
// File: server/services/circuit-breaker.ts
export enum CircuitState {
  CLOSED = 'CLOSED',  // Normal operation
  OPEN = 'OPEN',      // Failing, reject requests
  HALF_OPEN = 'HALF_OPEN' // Testing if service recovered
}

export interface CircuitBreakerOptions {
  failureThreshold: number;  // Number of failures before opening
  successThreshold: number;  // Successes needed to close from half-open
  timeout: number;          // Time before trying half-open
  volumeThreshold: number;  // Minimum requests before evaluating
}

export class CircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED;
  private failureCount = 0;
  private successCount = 0;
  private requestCount = 0;
  private lastFailureTime?: number;
  private nextAttempt?: number;
  
  constructor(
    private name: string,
    private options: CircuitBreakerOptions = {
      failureThreshold: 5,
      successThreshold: 2,
      timeout: 60000, // 1 minute
      volumeThreshold: 10
    }
  ) {}
  
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === CircuitState.OPEN) {
      if (Date.now() < this.nextAttempt!) {
        throw new Error(`Circuit breaker is OPEN for ${this.name}`);
      }
      // Try half-open
      this.state = CircuitState.HALF_OPEN;
      this.successCount = 0;
      this.failureCount = 0;
    }
    
    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }
  
  private onSuccess(): void {
    this.requestCount++;
    
    if (this.state === CircuitState.HALF_OPEN) {
      this.successCount++;
      if (this.successCount >= this.options.successThreshold) {
        this.state = CircuitState.CLOSED;
        this.failureCount = 0;
        console.log(`Circuit breaker ${this.name} is now CLOSED`);
      }
    } else if (this.state === CircuitState.CLOSED) {
      this.failureCount = Math.max(0, this.failureCount - 1);
    }
  }
  
  private onFailure(): void {
    this.requestCount++;
    this.failureCount++;
    this.lastFailureTime = Date.now();
    
    if (this.state === CircuitState.HALF_OPEN) {
      this.state = CircuitState.OPEN;
      this.nextAttempt = Date.now() + this.options.timeout;
      console.log(`Circuit breaker ${this.name} is now OPEN (half-open test failed)`);
    } else if (
      this.state === CircuitState.CLOSED &&
      this.requestCount >= this.options.volumeThreshold &&
      this.failureCount >= this.options.failureThreshold
    ) {
      this.state = CircuitState.OPEN;
      this.nextAttempt = Date.now() + this.options.timeout;
      console.log(`Circuit breaker ${this.name} is now OPEN (threshold exceeded)`);
    }
  }
  
  getState(): { state: CircuitState; stats: any } {
    return {
      state: this.state,
      stats: {
        failureCount: this.failureCount,
        successCount: this.successCount,
        requestCount: this.requestCount,
        lastFailureTime: this.lastFailureTime,
        nextAttempt: this.nextAttempt
      }
    };
  }
  
  reset(): void {
    this.state = CircuitState.CLOSED;
    this.failureCount = 0;
    this.successCount = 0;
    this.requestCount = 0;
    this.lastFailureTime = undefined;
    this.nextAttempt = undefined;
  }
}

// Circuit breaker registry
class CircuitBreakerRegistry {
  private breakers = new Map<string, CircuitBreaker>();
  
  get(name: string, options?: CircuitBreakerOptions): CircuitBreaker {
    if (!this.breakers.has(name)) {
      this.breakers.set(name, new CircuitBreaker(name, options));
    }
    return this.breakers.get(name)!;
  }
  
  getAll(): Map<string, CircuitBreaker> {
    return this.breakers;
  }
  
  reset(name?: string): void {
    if (name) {
      this.breakers.get(name)?.reset();
    } else {
      this.breakers.forEach(breaker => breaker.reset());
    }
  }
}

export const circuitBreakerRegistry = new CircuitBreakerRegistry();
```

#### Integrate with OpenAI Service
```typescript
// File: server/services/openai.ts (modification)
import { circuitBreakerRegistry } from './circuit-breaker';

async function generateAIAnalysis(url: string, htmlContent: string): Promise<ContentAnalysisResult> {
  const circuitBreaker = circuitBreakerRegistry.get('openai', {
    failureThreshold: 3,
    successThreshold: 2,
    timeout: 30000, // 30 seconds
    volumeThreshold: 5
  });
  
  try {
    return await circuitBreaker.execute(async () => {
      // Existing OpenAI call logic
      const response = await openai.chat.completions.create({
        model: process.env.OPENAI_MODEL || "gpt-4o-mini",
        // ... rest of config
      });
      
      return parseResponse(response);
    });
  } catch (error) {
    if (error.message.includes('Circuit breaker is OPEN')) {
      console.log('OpenAI circuit breaker open, falling back to HTML analysis');
      return generateHTMLAnalysis(url, htmlContent);
    }
    throw error;
  }
}
```

#### Integrate with Page Fetching
```typescript
// File: server/services/sitemap.ts (modification)
import { circuitBreakerRegistry } from './circuit-breaker';

export async function fetchPageContent(url: string): Promise<string> {
  const hostname = new URL(url).hostname;
  const circuitBreaker = circuitBreakerRegistry.get(`fetch-${hostname}`, {
    failureThreshold: 5,
    successThreshold: 1,
    timeout: 120000, // 2 minutes
    volumeThreshold: 3
  });
  
  try {
    return await circuitBreaker.execute(async () => {
      // Existing fetch logic with connection pooling
      const response = await fetch(url, { agent });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      return await response.text();
    });
  } catch (error) {
    if (error.message.includes('Circuit breaker is OPEN')) {
      throw new Error(`Site ${hostname} is currently unavailable (circuit breaker open)`);
    }
    throw error;
  }
}
```

### 2.2 Testing & Deployment

Similar structure to Phase 1 with unit tests, integration tests, and Playwright regression tests.

---

## Phase 3: Progressive Streaming Implementation

### 3.1 Development Tasks

#### Create Streaming Analysis Service
```typescript
// File: server/services/streaming-analyzer.ts
import { EventEmitter } from 'events';

export interface StreamUpdate {
  type: 'progress' | 'partial' | 'complete' | 'error';
  data: any;
  timestamp: number;
}

export class StreamingAnalyzer extends EventEmitter {
  async analyzeWithProgress(
    entries: SitemapEntry[],
    userEmail: string,
    tier: UserTier
  ): AsyncIterableIterator<StreamUpdate> {
    const stream = this;
    
    async function* generate() {
      // Phase 1: Discovery
      yield {
        type: 'progress',
        data: { 
          phase: 'discovery',
          message: `Found ${entries.length} pages to analyze`,
          pagesFound: entries.length
        },
        timestamp: Date.now()
      };
      
      // Phase 2: Cache Check
      const cached = await checkCache(entries);
      if (cached.length > 0) {
        yield {
          type: 'partial',
          data: {
            phase: 'cache',
            pages: cached,
            message: `Retrieved ${cached.length} pages from cache`
          },
          timestamp: Date.now()
        };
      }
      
      // Phase 3: Progressive Analysis
      const toAnalyze = entries.filter(e => !cached.find(c => c.url === e.url));
      const batchSize = 5; // Smaller batches for more frequent updates
      
      for (let i = 0; i < toAnalyze.length; i += batchSize) {
        const batch = toAnalyze.slice(i, i + batchSize);
        const results = await analyzeBatch(batch);
        
        yield {
          type: 'partial',
          data: {
            phase: 'analysis',
            pages: results,
            progress: Math.min(100, ((i + batchSize) / toAnalyze.length) * 100),
            message: `Analyzed ${Math.min(i + batchSize, toAnalyze.length)} of ${toAnalyze.length} pages`
          },
          timestamp: Date.now()
        };
      }
      
      // Phase 4: Final Processing
      const allPages = [...cached, ...analyzed];
      const deduplicated = deduplicateAndFilter(allPages);
      const sorted = deduplicated.sort((a, b) => b.qualityScore - a.qualityScore);
      
      yield {
        type: 'complete',
        data: {
          pages: sorted,
          metrics: calculateMetrics(),
          message: 'Analysis complete!'
        },
        timestamp: Date.now()
      };
    }
    
    return generate();
  }
}
```

#### Server-Sent Events Endpoint
```typescript
// File: server/routes/analysis-stream.ts
import { Router } from 'express';
import { StreamingAnalyzer } from '../services/streaming-analyzer';

const router = Router();

router.get('/api/analyze-stream', async (req, res) => {
  const { url, email, tier } = req.query;
  
  // Set SSE headers
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no' // Disable Nginx buffering
  });
  
  // Send initial connection message
  res.write(`data: ${JSON.stringify({ type: 'connected' })}\n\n`);
  
  const analyzer = new StreamingAnalyzer();
  
  try {
    // Discover pages first
    const entries = await discoverPages(url);
    
    // Stream analysis updates
    for await (const update of analyzer.analyzeWithProgress(entries, email, tier)) {
      res.write(`data: ${JSON.stringify(update)}\n\n`);
      
      // Keep connection alive
      if (update.type === 'progress') {
        res.write(': keepalive\n\n');
      }
    }
    
    res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`);
    res.end();
    
  } catch (error) {
    res.write(`data: ${JSON.stringify({ 
      type: 'error', 
      error: error.message 
    })}\n\n`);
    res.end();
  }
});
```

#### React Frontend Updates
```typescript
// File: client/src/hooks/useStreamingAnalysis.ts
export function useStreamingAnalysis() {
  const [updates, setUpdates] = useState<StreamUpdate[]>([]);
  const [isComplete, setIsComplete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const startAnalysis = useCallback(async (url: string) => {
    const eventSource = new EventSource(
      `/api/analyze-stream?url=${encodeURIComponent(url)}&email=${email}&tier=${tier}`
    );
    
    eventSource.onmessage = (event) => {
      const update = JSON.parse(event.data);
      
      if (update.type === 'error') {
        setError(update.error);
        eventSource.close();
      } else if (update.type === 'done') {
        setIsComplete(true);
        eventSource.close();
      } else {
        setUpdates(prev => [...prev, update]);
      }
    };
    
    eventSource.onerror = () => {
      setError('Connection lost');
      eventSource.close();
    };
    
    return () => eventSource.close();
  }, [email, tier]);
  
  return { updates, isComplete, error, startAnalysis };
}
```

### 3.2 Testing & Deployment

Progressive streaming requires special testing for connection handling, partial updates, and error recovery.

---

## Phase 4: Dynamic Batch Sizing Implementation

### 4.1 Development Tasks

#### Create Dynamic Batch Calculator
```typescript
// File: server/services/dynamic-batch.ts
export interface BatchConfig {
  size: number;
  concurrency: number;
  timeout: number;
}

export class DynamicBatchCalculator {
  private performanceHistory: Map<string, number[]> = new Map();
  
  async calculateOptimalBatch(
    entries: SitemapEntry[],
    tier: UserTier
  ): Promise<BatchConfig> {
    // Sample first few pages to estimate complexity
    const sampleSize = Math.min(3, entries.length);
    const samples = entries.slice(0, sampleSize);
    
    const sizes = await Promise.all(
      samples.map(async (entry) => {
        try {
          const response = await fetch(entry.url, { method: 'HEAD' });
          const contentLength = response.headers.get('content-length');
          return parseInt(contentLength || '0');
        } catch {
          return 50000; // Default to medium size
        }
      })
    );
    
    const avgSize = sizes.reduce((a, b) => a + b, 0) / sizes.length;
    const hostname = new URL(entries[0].url).hostname;
    
    // Check historical performance
    const history = this.performanceHistory.get(hostname) || [];
    const avgResponseTime = history.length > 0 
      ? history.reduce((a, b) => a + b, 0) / history.length
      : 2000; // Default 2 seconds
    
    // Calculate optimal batch size
    let batchSize: number;
    let concurrency: number;
    let timeout: number;
    
    if (avgSize < 10000 && avgResponseTime < 1000) {
      // Small, fast pages
      batchSize = 50;
      concurrency = 4;
      timeout = 20000;
    } else if (avgSize < 50000 && avgResponseTime < 3000) {
      // Medium pages
      batchSize = 30;
      concurrency = 3;
      timeout = 30000;
    } else if (avgSize < 200000) {
      // Large pages
      batchSize = 20;
      concurrency = 2;
      timeout = 45000;
    } else {
      // Very large pages
      batchSize = 10;
      concurrency = 1;
      timeout = 60000;
    }
    
    // Adjust for tier limits
    const tierLimits = TIER_LIMITS[tier];
    batchSize = Math.min(batchSize, Math.ceil(tierLimits.maxPagesPerAnalysis / 4));
    
    console.log(`Dynamic batch sizing for ${hostname}:`);
    console.log(`  Average size: ${(avgSize / 1024).toFixed(1)}KB`);
    console.log(`  Average response time: ${avgResponseTime}ms`);
    console.log(`  Optimal batch: ${batchSize} pages, ${concurrency} concurrent`);
    
    return { size: batchSize, concurrency, timeout };
  }
  
  recordPerformance(hostname: string, responseTime: number): void {
    if (!this.performanceHistory.has(hostname)) {
      this.performanceHistory.set(hostname, []);
    }
    
    const history = this.performanceHistory.get(hostname)!;
    history.push(responseTime);
    
    // Keep only last 10 measurements
    if (history.length > 10) {
      history.shift();
    }
  }
}
```

#### Integrate with Analysis Pipeline
```typescript
// File: server/services/sitemap-enhanced.ts (modification)
import { DynamicBatchCalculator } from './dynamic-batch';

const batchCalculator = new DynamicBatchCalculator();

async function performPageAnalysisWithCache(
  entries: SitemapEntry[],
  userEmail: string,
  tier: UserTier
): Promise<{ pages: DiscoveredPage[], metrics: AnalysisMetrics }> {
  // Calculate optimal batch configuration
  const batchConfig = await batchCalculator.calculateOptimalBatch(entries, tier);
  
  const pages: DiscoveredPage[] = [];
  const BATCH_SIZE = batchConfig.size;
  const CONCURRENT_BATCHES = batchConfig.concurrency;
  
  console.log(`Using dynamic batch sizing: ${BATCH_SIZE} pages × ${CONCURRENT_BATCHES} concurrent`);
  
  for (let i = 0; i < pagesToAnalyze.length; i += BATCH_SIZE * CONCURRENT_BATCHES) {
    const batchPromises = [];
    
    for (let j = 0; j < CONCURRENT_BATCHES && i + j * BATCH_SIZE < pagesToAnalyze.length; j++) {
      const batchStart = i + j * BATCH_SIZE;
      const batchEnd = Math.min(batchStart + BATCH_SIZE, pagesToAnalyze.length);
      const batch = pagesToAnalyze.slice(batchStart, batchEnd);
      
      const startTime = Date.now();
      batchPromises.push(
        processBatchWithCache(batch, userEmail, tier, tierLimits.aiPagesLimit, metrics)
          .then(result => {
            // Record performance for future optimization
            const hostname = new URL(batch[0].url).hostname;
            batchCalculator.recordPerformance(hostname, Date.now() - startTime);
            return result;
          })
      );
    }
    
    const batchResults = await Promise.all(batchPromises);
    // ... rest of processing
  }
}
```

### 4.2 Testing & Deployment

Focus on testing different content types and ensuring tier limits are still respected.

---

## Success Metrics

### Phase 1 (Connection Pooling)
- [ ] 30% reduction in multi-page analysis time
- [ ] Memory usage increase < 10%
- [ ] Zero increase in error rates
- [ ] All regression tests passing

### Phase 2 (Circuit Breaker)
- [ ] 5% reduction in failed API calls
- [ ] Faster failure detection (< 5 seconds vs timeout)
- [ ] Automatic recovery after service restoration
- [ ] Clear error messages for users

### Phase 3 (Progressive Streaming)
- [ ] First results visible in < 5 seconds
- [ ] 50% improvement in perceived performance
- [ ] No increase in total processing time
- [ ] Smooth UI updates without flashing

### Phase 4 (Dynamic Batch Sizing)
- [ ] 40% faster for documentation sites
- [ ] No memory errors on large pages
- [ ] Adaptive to content type
- [ ] All tier limits still enforced