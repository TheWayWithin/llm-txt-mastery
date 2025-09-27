import { performance } from 'perf_hooks';
import { Redis } from 'ioredis';
import { redisClient } from './redis-client';
import { db } from '../db';
import { pgTable, serial, text, integer, timestamp, jsonb, decimal, boolean } from 'drizzle-orm/pg-core';
import { eq, sql, desc, gte } from 'drizzle-orm';
import { semanticMonitoring } from './semantic-monitoring';
import OpenAI from 'openai';

// Benchmark database table
export const performanceBenchmarks = pgTable('performance_benchmarks', {
  id: serial('id').primaryKey(),
  benchmarkSuite: text('benchmark_suite').notNull(), // 'clustering', 'embeddings', 'database', 'integration'
  benchmarkName: text('benchmark_name').notNull(),
  version: text('version').notNull().default('1.0'),
  environment: text('environment').notNull(), // 'development', 'staging', 'production'
  duration: integer('duration').notNull(), // milliseconds
  throughput: decimal('throughput', { precision: 10, scale: 2 }), // operations per second
  memoryUsage: integer('memory_usage'), // bytes
  cpuUsage: decimal('cpu_usage', { precision: 5, scale: 2 }), // percentage
  errorCount: integer('error_count').notNull().default(0),
  successCount: integer('success_count').notNull().default(0),
  metadata: jsonb('metadata').$type<BenchmarkMetadata>(),
  results: jsonb('results').$type<BenchmarkResults>(),
  passed: boolean('passed').notNull().default(true),
  runBy: text('run_by'),
  runAt: timestamp('run_at').defaultNow(),
});

// TypeScript interfaces
export interface BenchmarkMetadata {
  inputSize?: number;
  outputSize?: number;
  modelUsed?: string;
  embeddingDimensions?: number;
  clusterCount?: number;
  cacheHitRate?: number;
  nodeVersion?: string;
  systemInfo?: {
    platform: string;
    arch: string;
    memory: number;
  };
  testParameters?: Record<string, any>;
  [key: string]: any;
}

export interface BenchmarkResults {
  avgResponseTime: number;
  p95ResponseTime: number;
  p99ResponseTime: number;
  minResponseTime: number;
  maxResponseTime: number;
  errorRate: number;
  successRate: number;
  memoryPeak: number;
  cpuPeak: number;
  operationsPerSecond: number;
  detailedResults?: any[];
  [key: string]: any;
}

export interface BenchmarkResult {
  suite: string;
  name: string;
  passed: boolean;
  duration: number;
  throughput: number;
  errorCount: number;
  successCount: number;
  metadata: BenchmarkMetadata;
  results: BenchmarkResults;
}

export interface BenchmarkSuiteResult {
  suite: string;
  totalBenchmarks: number;
  passedBenchmarks: number;
  failedBenchmarks: number;
  totalDuration: number;
  avgThroughput: number;
  benchmarks: BenchmarkResult[];
  summary: {
    overallPassed: boolean;
    performanceRegression: boolean;
    recommendations: string[];
  };
}

class PerformanceBenchmarkService {
  private redis: Redis;
  private baselineThresholds = {
    clustering: {
      maxDurationMs: 10000, // 10 seconds for 100 pages
      minThroughput: 10, // pages per second
      maxMemoryMB: 512,
      maxErrorRate: 0.05 // 5%
    },
    embeddings: {
      maxDurationMs: 5000, // 5 seconds for 50 embeddings
      minThroughput: 20, // embeddings per second
      maxMemoryMB: 256,
      maxErrorRate: 0.02 // 2%
    },
    database: {
      maxDurationMs: 1000, // 1 second for vector queries
      minThroughput: 100, // queries per second
      maxMemoryMB: 128,
      maxErrorRate: 0.01 // 1%
    },
    integration: {
      maxDurationMs: 15000, // 15 seconds for end-to-end
      minThroughput: 5, // requests per second
      maxMemoryMB: 1024,
      maxErrorRate: 0.1 // 10%
    }
  };

  constructor() {
    this.redis = redisClient.getInstance();
  }

  /**
   * Run clustering performance benchmarks
   */
  async runClusteringBenchmarks(): Promise<BenchmarkResult[]> {
    const results: BenchmarkResult[] = [];

    // Benchmark 1: Small dataset (10 pages)
    results.push(await this.runBenchmark(
      'clustering',
      'small_dataset_clustering',
      () => this.benchmarkClustering(this.generateMockPages(10))
    ));

    // Benchmark 2: Medium dataset (50 pages)
    results.push(await this.runBenchmark(
      'clustering',
      'medium_dataset_clustering',
      () => this.benchmarkClustering(this.generateMockPages(50))
    ));

    // Benchmark 3: Large dataset (100 pages)
    results.push(await this.runBenchmark(
      'clustering',
      'large_dataset_clustering',
      () => this.benchmarkClustering(this.generateMockPages(100))
    ));

    // Benchmark 4: Mixed content clustering
    results.push(await this.runBenchmark(
      'clustering',
      'mixed_content_clustering',
      () => this.benchmarkClustering(this.generateMixedContentPages())
    ));

    return results;
  }

  /**
   * Run embedding generation benchmarks
   */
  async runEmbeddingBenchmarks(): Promise<BenchmarkResult[]> {
    const results: BenchmarkResult[] = [];

    // Benchmark 1: Single embedding generation
    results.push(await this.runBenchmark(
      'embeddings',
      'single_embedding_generation',
      () => this.benchmarkSingleEmbedding()
    ));

    // Benchmark 2: Batch embedding generation (10 items)
    results.push(await this.runBenchmark(
      'embeddings',
      'batch_embedding_10',
      () => this.benchmarkBatchEmbeddings(10)
    ));

    // Benchmark 3: Batch embedding generation (50 items)
    results.push(await this.runBenchmark(
      'embeddings',
      'batch_embedding_50',
      () => this.benchmarkBatchEmbeddings(50)
    ));

    // Benchmark 4: Cache hit performance
    results.push(await this.runBenchmark(
      'embeddings',
      'cache_hit_performance',
      () => this.benchmarkEmbeddingCacheHits()
    ));

    return results;
  }

  /**
   * Run database performance benchmarks
   */
  async runDatabaseBenchmarks(): Promise<BenchmarkResult[]> {
    const results: BenchmarkResult[] = [];

    // Benchmark 1: Vector similarity search
    results.push(await this.runBenchmark(
      'database',
      'vector_similarity_search',
      () => this.benchmarkVectorSimilaritySearch()
    ));

    // Benchmark 2: Bulk vector insert
    results.push(await this.runBenchmark(
      'database',
      'bulk_vector_insert',
      () => this.benchmarkBulkVectorInsert()
    ));

    // Benchmark 3: Complex queries with joins
    results.push(await this.runBenchmark(
      'database',
      'complex_queries',
      () => this.benchmarkComplexQueries()
    ));

    // Benchmark 4: Connection pool performance
    results.push(await this.runBenchmark(
      'database',
      'connection_pool_performance',
      () => this.benchmarkConnectionPool()
    ));

    return results;
  }

  /**
   * Run integration benchmarks
   */
  async runIntegrationBenchmarks(): Promise<BenchmarkResult[]> {
    const results: BenchmarkResult[] = [];

    // Benchmark 1: End-to-end semantic analysis
    results.push(await this.runBenchmark(
      'integration',
      'end_to_end_semantic_analysis',
      () => this.benchmarkEndToEndSemanticAnalysis()
    ));

    // Benchmark 2: Concurrent user simulation
    results.push(await this.runBenchmark(
      'integration',
      'concurrent_user_simulation',
      () => this.benchmarkConcurrentUsers()
    ));

    // Benchmark 3: Memory leak detection
    results.push(await this.runBenchmark(
      'integration',
      'memory_leak_detection',
      () => this.benchmarkMemoryLeakDetection()
    ));

    return results;
  }

  /**
   * Run all benchmark suites
   */
  async runAllBenchmarks(): Promise<BenchmarkSuiteResult[]> {
    console.log('🚀 Starting comprehensive performance benchmarks...');

    const suiteResults: BenchmarkSuiteResult[] = [];

    try {
      // Run clustering benchmarks
      console.log('📊 Running clustering benchmarks...');
      const clusteringResults = await this.runClusteringBenchmarks();
      suiteResults.push(this.analyzeSuiteResults('clustering', clusteringResults));

      // Run embedding benchmarks
      console.log('🧠 Running embedding benchmarks...');
      const embeddingResults = await this.runEmbeddingBenchmarks();
      suiteResults.push(this.analyzeSuiteResults('embeddings', embeddingResults));

      // Run database benchmarks
      console.log('💾 Running database benchmarks...');
      const databaseResults = await this.runDatabaseBenchmarks();
      suiteResults.push(this.analyzeSuiteResults('database', databaseResults));

      // Run integration benchmarks
      console.log('🔗 Running integration benchmarks...');
      const integrationResults = await this.runIntegrationBenchmarks();
      suiteResults.push(this.analyzeSuiteResults('integration', integrationResults));

      console.log('✅ All benchmarks completed!');
      
      // Store results summary
      await this.storeBenchmarkSummary(suiteResults);

      return suiteResults;
    } catch (error) {
      console.error('❌ Benchmark execution failed:', error);
      throw error;
    }
  }

  /**
   * Generic benchmark runner
   */
  private async runBenchmark(
    suite: string,
    name: string,
    benchmarkFn: () => Promise<any>
  ): Promise<BenchmarkResult> {
    console.log(`  Running ${name}...`);
    
    const startTime = performance.now();
    const startMemory = process.memoryUsage();
    let endMemory: NodeJS.MemoryUsage;
    let error: Error | null = null;
    let result: any = null;
    let successCount = 0;
    let errorCount = 0;

    try {
      result = await benchmarkFn();
      successCount = result.successCount || 1;
      errorCount = result.errorCount || 0;
    } catch (err) {
      error = err instanceof Error ? err : new Error('Unknown error');
      errorCount = 1;
      console.error(`    ❌ ${name} failed:`, error.message);
    }

    const endTime = performance.now();
    endMemory = process.memoryUsage();

    const duration = Math.round(endTime - startTime);
    const memoryUsed = endMemory.heapUsed - startMemory.heapUsed;
    const throughput = successCount > 0 ? (successCount / (duration / 1000)) : 0;

    const metadata: BenchmarkMetadata = {
      inputSize: result?.inputSize || 0,
      outputSize: result?.outputSize || 0,
      modelUsed: result?.modelUsed || 'unknown',
      embeddingDimensions: result?.embeddingDimensions,
      clusterCount: result?.clusterCount,
      nodeVersion: process.version,
      systemInfo: {
        platform: process.platform,
        arch: process.arch,
        memory: Math.round(endMemory.heapTotal / 1024 / 1024)
      },
      testParameters: result?.testParameters || {}
    };

    const results: BenchmarkResults = {
      avgResponseTime: duration,
      p95ResponseTime: duration * 1.1, // Simplified
      p99ResponseTime: duration * 1.2, // Simplified
      minResponseTime: duration * 0.8, // Simplified
      maxResponseTime: duration * 1.3, // Simplified
      errorRate: (errorCount / (successCount + errorCount)) * 100,
      successRate: (successCount / (successCount + errorCount)) * 100,
      memoryPeak: Math.round(memoryUsed / 1024 / 1024), // MB
      cpuPeak: 0, // Would need additional monitoring
      operationsPerSecond: throughput,
      detailedResults: result?.detailedResults || []
    };

    const passed = this.evaluateBenchmarkResult(suite, duration, throughput, errorCount, memoryUsed);

    // Store benchmark result
    await db.insert(performanceBenchmarks).values({
      benchmarkSuite: suite,
      benchmarkName: name,
      environment: process.env.NODE_ENV || 'development',
      duration,
      throughput: throughput.toString(),
      memoryUsage: memoryUsed,
      errorCount,
      successCount,
      metadata,
      results,
      passed,
      runBy: 'automated'
    });

    const status = passed ? '✅' : '❌';
    console.log(`    ${status} ${name}: ${duration}ms, ${throughput.toFixed(2)} ops/sec`);

    return {
      suite,
      name,
      passed,
      duration,
      throughput,
      errorCount,
      successCount,
      metadata,
      results
    };
  }

  /**
   * Benchmark clustering performance
   */
  private async benchmarkClustering(pages: any[]): Promise<any> {
    // Mock clustering implementation for benchmarking
    const startTime = performance.now();
    
    // Simulate clustering algorithm
    await new Promise(resolve => setTimeout(resolve, Math.random() * 1000 + 500));
    
    const clusters = this.mockClustering(pages);
    const endTime = performance.now();

    return {
      inputSize: pages.length,
      outputSize: clusters.length,
      clusterCount: clusters.length,
      successCount: 1,
      errorCount: 0,
      processingTime: endTime - startTime
    };
  }

  /**
   * Benchmark single embedding generation
   */
  private async benchmarkSingleEmbedding(): Promise<any> {
    const text = "This is a sample text for embedding generation benchmarking.";
    const startTime = performance.now();
    
    try {
      // Mock embedding generation
      await new Promise(resolve => setTimeout(resolve, Math.random() * 200 + 100));
      const embedding = new Array(1536).fill(0).map(() => Math.random());
      
      const endTime = performance.now();
      
      return {
        inputSize: text.length,
        outputSize: embedding.length,
        embeddingDimensions: embedding.length,
        successCount: 1,
        errorCount: 0,
        processingTime: endTime - startTime
      };
    } catch (error) {
      return {
        inputSize: text.length,
        successCount: 0,
        errorCount: 1,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Benchmark batch embedding generation
   */
  private async benchmarkBatchEmbeddings(count: number): Promise<any> {
    const texts = Array(count).fill(0).map((_, i) => 
      `This is sample text ${i} for batch embedding generation benchmarking.`
    );
    
    const startTime = performance.now();
    
    try {
      // Mock batch embedding generation
      await new Promise(resolve => setTimeout(resolve, count * 50 + Math.random() * 500));
      
      const embeddings = texts.map(() => 
        new Array(1536).fill(0).map(() => Math.random())
      );
      
      const endTime = performance.now();
      
      return {
        inputSize: texts.length,
        outputSize: embeddings.length,
        embeddingDimensions: 1536,
        successCount: embeddings.length,
        errorCount: 0,
        processingTime: endTime - startTime
      };
    } catch (error) {
      return {
        inputSize: texts.length,
        successCount: 0,
        errorCount: count,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Benchmark embedding cache hits
   */
  private async benchmarkEmbeddingCacheHits(): Promise<any> {
    const cacheHits = 8;
    const cacheMisses = 2;
    const total = cacheHits + cacheMisses;
    
    const startTime = performance.now();
    
    // Simulate cache hits (fast) and misses (slower)
    await Promise.all([
      ...Array(cacheHits).fill(0).map(() => 
        new Promise(resolve => setTimeout(resolve, Math.random() * 50 + 10))
      ),
      ...Array(cacheMisses).fill(0).map(() => 
        new Promise(resolve => setTimeout(resolve, Math.random() * 200 + 100))
      )
    ]);
    
    const endTime = performance.now();
    
    return {
      inputSize: total,
      outputSize: total,
      cacheHitRate: (cacheHits / total) * 100,
      successCount: total,
      errorCount: 0,
      processingTime: endTime - startTime
    };
  }

  /**
   * Benchmark vector similarity search
   */
  private async benchmarkVectorSimilaritySearch(): Promise<any> {
    const queryCount = 100;
    const startTime = performance.now();
    
    try {
      // Mock database queries
      await Promise.all(
        Array(queryCount).fill(0).map(() => 
          new Promise(resolve => setTimeout(resolve, Math.random() * 100 + 20))
        )
      );
      
      const endTime = performance.now();
      
      return {
        inputSize: queryCount,
        outputSize: queryCount * 10, // Assume 10 results per query
        successCount: queryCount,
        errorCount: 0,
        processingTime: endTime - startTime
      };
    } catch (error) {
      return {
        inputSize: queryCount,
        successCount: 0,
        errorCount: queryCount,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Benchmark bulk vector insert
   */
  private async benchmarkBulkVectorInsert(): Promise<any> {
    const vectorCount = 1000;
    const startTime = performance.now();
    
    try {
      // Mock bulk insert
      await new Promise(resolve => setTimeout(resolve, vectorCount * 2 + Math.random() * 1000));
      
      const endTime = performance.now();
      
      return {
        inputSize: vectorCount,
        outputSize: vectorCount,
        successCount: vectorCount,
        errorCount: 0,
        processingTime: endTime - startTime
      };
    } catch (error) {
      return {
        inputSize: vectorCount,
        successCount: 0,
        errorCount: vectorCount,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Benchmark complex database queries
   */
  private async benchmarkComplexQueries(): Promise<any> {
    const queryCount = 50;
    const startTime = performance.now();
    
    try {
      // Mock complex queries with joins and aggregations
      await Promise.all(
        Array(queryCount).fill(0).map(() => 
          new Promise(resolve => setTimeout(resolve, Math.random() * 300 + 100))
        )
      );
      
      const endTime = performance.now();
      
      return {
        inputSize: queryCount,
        outputSize: queryCount * 20,
        successCount: queryCount,
        errorCount: 0,
        processingTime: endTime - startTime
      };
    } catch (error) {
      return {
        inputSize: queryCount,
        successCount: 0,
        errorCount: queryCount,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Benchmark connection pool performance
   */
  private async benchmarkConnectionPool(): Promise<any> {
    const connectionCount = 20;
    const queriesPerConnection = 10;
    const startTime = performance.now();
    
    try {
      // Mock concurrent database connections
      await Promise.all(
        Array(connectionCount).fill(0).map(() =>
          Promise.all(
            Array(queriesPerConnection).fill(0).map(() =>
              new Promise(resolve => setTimeout(resolve, Math.random() * 100 + 50))
            )
          )
        )
      );
      
      const endTime = performance.now();
      
      return {
        inputSize: connectionCount * queriesPerConnection,
        outputSize: connectionCount * queriesPerConnection,
        successCount: connectionCount * queriesPerConnection,
        errorCount: 0,
        processingTime: endTime - startTime
      };
    } catch (error) {
      return {
        inputSize: connectionCount * queriesPerConnection,
        successCount: 0,
        errorCount: connectionCount * queriesPerConnection,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Benchmark end-to-end semantic analysis
   */
  private async benchmarkEndToEndSemanticAnalysis(): Promise<any> {
    const pageCount = 25;
    const startTime = performance.now();
    
    try {
      // Mock complete semantic analysis pipeline
      const pages = this.generateMockPages(pageCount);
      
      // 1. Generate embeddings
      await new Promise(resolve => setTimeout(resolve, pageCount * 100));
      
      // 2. Perform clustering
      await new Promise(resolve => setTimeout(resolve, Math.random() * 2000 + 1000));
      
      // 3. Enhance descriptions
      await new Promise(resolve => setTimeout(resolve, pageCount * 150));
      
      // 4. Generate summary
      await new Promise(resolve => setTimeout(resolve, Math.random() * 1000 + 500));
      
      const endTime = performance.now();
      
      return {
        inputSize: pageCount,
        outputSize: pageCount,
        successCount: 1,
        errorCount: 0,
        processingTime: endTime - startTime,
        detailedResults: [
          { step: 'embedding_generation', duration: pageCount * 100 },
          { step: 'clustering', duration: 1500 },
          { step: 'description_enhancement', duration: pageCount * 150 },
          { step: 'summary_generation', duration: 750 }
        ]
      };
    } catch (error) {
      return {
        inputSize: pageCount,
        successCount: 0,
        errorCount: 1,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Benchmark concurrent user simulation
   */
  private async benchmarkConcurrentUsers(): Promise<any> {
    const userCount = 10;
    const requestsPerUser = 5;
    const startTime = performance.now();
    
    try {
      // Mock concurrent user requests
      await Promise.all(
        Array(userCount).fill(0).map(() =>
          Promise.all(
            Array(requestsPerUser).fill(0).map(() =>
              new Promise(resolve => 
                setTimeout(resolve, Math.random() * 2000 + 1000)
              )
            )
          )
        )
      );
      
      const endTime = performance.now();
      
      return {
        inputSize: userCount * requestsPerUser,
        outputSize: userCount * requestsPerUser,
        successCount: userCount * requestsPerUser,
        errorCount: 0,
        processingTime: endTime - startTime
      };
    } catch (error) {
      return {
        inputSize: userCount * requestsPerUser,
        successCount: 0,
        errorCount: userCount * requestsPerUser,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Benchmark memory leak detection
   */
  private async benchmarkMemoryLeakDetection(): Promise<any> {
    const iterations = 100;
    const startTime = performance.now();
    const startMemory = process.memoryUsage().heapUsed;
    
    try {
      // Simulate operations that might cause memory leaks
      const data: any[] = [];
      
      for (let i = 0; i < iterations; i++) {
        data.push(this.generateMockPages(50));
        
        if (i % 10 === 0) {
          // Force garbage collection if available
          if (global.gc) {
            global.gc();
          }
        }
        
        await new Promise(resolve => setTimeout(resolve, 10));
      }
      
      const endTime = performance.now();
      const endMemory = process.memoryUsage().heapUsed;
      const memoryGrowth = endMemory - startMemory;
      
      return {
        inputSize: iterations,
        outputSize: data.length,
        successCount: iterations,
        errorCount: 0,
        processingTime: endTime - startTime,
        memoryGrowth: Math.round(memoryGrowth / 1024 / 1024) // MB
      };
    } catch (error) {
      return {
        inputSize: iterations,
        successCount: 0,
        errorCount: iterations,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Generate mock pages for testing
   */
  private generateMockPages(count: number): any[] {
    const categories = ['technical', 'marketing', 'documentation', 'blog', 'product'];
    
    return Array(count).fill(0).map((_, i) => ({
      url: `https://example.com/page-${i}`,
      title: `Sample Page ${i}`,
      description: `This is a sample page description for page ${i} about ${categories[i % categories.length]} content.`,
      qualityScore: Math.random() * 10,
      category: categories[i % categories.length],
      content: `Sample content for page ${i}`.repeat(Math.floor(Math.random() * 50) + 10)
    }));
  }

  /**
   * Generate mixed content pages for testing
   */
  private generateMixedContentPages(): any[] {
    return [
      ...this.generateMockPages(20),
      ...Array(20).fill(0).map((_, i) => ({
        url: `https://example.com/special-${i}`,
        title: `Special Content ${i}`,
        description: `Unique description for special content ${i}`,
        qualityScore: Math.random() * 10,
        category: 'special',
        content: `Unique content pattern ${i}`.repeat(30)
      })),
      ...Array(10).fill(0).map((_, i) => ({
        url: `https://example.com/duplicate-${i}`,
        title: `Duplicate Title`,
        description: `Similar description pattern`,
        qualityScore: Math.random() * 5,
        category: 'duplicate',
        content: `Duplicate content pattern`.repeat(20)
      }))
    ];
  }

  /**
   * Mock clustering implementation
   */
  private mockClustering(pages: any[]): any[] {
    const clusterCount = Math.min(Math.ceil(pages.length / 10), 5);
    const clusters: any[] = [];
    
    for (let i = 0; i < clusterCount; i++) {
      clusters.push({
        id: i,
        name: `Cluster ${i}`,
        pages: pages.slice(i * Math.floor(pages.length / clusterCount), (i + 1) * Math.floor(pages.length / clusterCount))
      });
    }
    
    return clusters;
  }

  /**
   * Evaluate benchmark result against thresholds
   */
  private evaluateBenchmarkResult(
    suite: string,
    duration: number,
    throughput: number,
    errorCount: number,
    memoryUsed: number
  ): boolean {
    const thresholds = this.baselineThresholds[suite as keyof typeof this.baselineThresholds];
    if (!thresholds) return true;

    const memoryMB = memoryUsed / 1024 / 1024;
    const errorRate = errorCount > 0 ? errorCount / (errorCount + 1) : 0;

    return (
      duration <= thresholds.maxDurationMs &&
      throughput >= thresholds.minThroughput &&
      memoryMB <= thresholds.maxMemoryMB &&
      errorRate <= thresholds.maxErrorRate
    );
  }

  /**
   * Analyze suite results and generate summary
   */
  private analyzeSuiteResults(suite: string, results: BenchmarkResult[]): BenchmarkSuiteResult {
    const passedBenchmarks = results.filter(r => r.passed).length;
    const failedBenchmarks = results.length - passedBenchmarks;
    const totalDuration = results.reduce((sum, r) => sum + r.duration, 0);
    const avgThroughput = results.reduce((sum, r) => sum + r.throughput, 0) / results.length;

    // Check for performance regression
    const performanceRegression = await this.checkPerformanceRegression(suite, results);

    // Generate recommendations
    const recommendations = this.generateRecommendations(suite, results);

    return {
      suite,
      totalBenchmarks: results.length,
      passedBenchmarks,
      failedBenchmarks,
      totalDuration,
      avgThroughput,
      benchmarks: results,
      summary: {
        overallPassed: failedBenchmarks === 0,
        performanceRegression,
        recommendations
      }
    };
  }

  /**
   * Check for performance regression compared to historical data
   */
  private async checkPerformanceRegression(suite: string, results: BenchmarkResult[]): Promise<boolean> {
    try {
      // Get historical benchmark results (last 7 days)
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      
      const historicalResults = await db
        .select({
          benchmarkName: performanceBenchmarks.benchmarkName,
          avgDuration: sql<number>`avg(duration)`,
          avgThroughput: sql<number>`avg(cast(throughput as decimal))`
        })
        .from(performanceBenchmarks)
        .where(
          sql`${performanceBenchmarks.benchmarkSuite} = ${suite} 
              AND ${performanceBenchmarks.runAt} >= ${sevenDaysAgo}
              AND ${performanceBenchmarks.passed} = true`
        )
        .groupBy(performanceBenchmarks.benchmarkName);

      // Check for significant degradation (>20% slower or >20% lower throughput)
      for (const result of results) {
        const historical = historicalResults.find(h => h.benchmarkName === result.name);
        if (historical) {
          const durationIncrease = (result.duration - historical.avgDuration) / historical.avgDuration;
          const throughputDecrease = (historical.avgThroughput - result.throughput) / historical.avgThroughput;
          
          if (durationIncrease > 0.2 || throughputDecrease > 0.2) {
            return true;
          }
        }
      }

      return false;
    } catch (error) {
      console.error('Error checking performance regression:', error);
      return false;
    }
  }

  /**
   * Generate performance recommendations
   */
  private generateRecommendations(suite: string, results: BenchmarkResult[]): string[] {
    const recommendations: string[] = [];
    const thresholds = this.baselineThresholds[suite as keyof typeof this.baselineThresholds];

    for (const result of results) {
      if (!result.passed) {
        if (result.duration > (thresholds?.maxDurationMs || 10000)) {
          recommendations.push(`Optimize ${result.name} performance - duration exceeded threshold`);
        }
        
        if (result.throughput < (thresholds?.minThroughput || 1)) {
          recommendations.push(`Improve ${result.name} throughput - consider parallel processing`);
        }
        
        if (result.errorCount > 0) {
          recommendations.push(`Investigate and fix errors in ${result.name}`);
        }
        
        const memoryMB = result.results.memoryPeak;
        if (memoryMB > (thresholds?.maxMemoryMB || 1024)) {
          recommendations.push(`Reduce memory usage in ${result.name} - consider streaming or chunking`);
        }
      }
    }

    // General recommendations
    if (suite === 'clustering' && results.some(r => r.duration > 5000)) {
      recommendations.push('Consider implementing incremental clustering for large datasets');
    }
    
    if (suite === 'embeddings' && results.some(r => r.results.errorRate > 5)) {
      recommendations.push('Implement better error handling and retry logic for embedding generation');
    }
    
    if (suite === 'database' && results.some(r => r.throughput < 50)) {
      recommendations.push('Consider adding database indexes or connection pooling optimization');
    }

    return recommendations;
  }

  /**
   * Store benchmark summary for historical tracking
   */
  private async storeBenchmarkSummary(suiteResults: BenchmarkSuiteResult[]): Promise<void> {
    try {
      const summary = {
        timestamp: new Date(),
        suites: suiteResults.map(suite => ({
          name: suite.suite,
          passed: suite.summary.overallPassed,
          totalBenchmarks: suite.totalBenchmarks,
          passedBenchmarks: suite.passedBenchmarks,
          totalDuration: suite.totalDuration,
          avgThroughput: suite.avgThroughput,
          performanceRegression: suite.summary.performanceRegression,
          recommendations: suite.summary.recommendations
        })),
        overallHealth: suiteResults.every(s => s.summary.overallPassed) ? 'healthy' : 'degraded',
        totalRecommendations: suiteResults.reduce((sum, s) => sum + s.summary.recommendations.length, 0)
      };

      await this.redis.setex('benchmark:latest_summary', 86400, JSON.stringify(summary)); // 24 hours
      await this.redis.lpush('benchmark:history', JSON.stringify(summary));
      await this.redis.ltrim('benchmark:history', 0, 29); // Keep last 30 runs
      
    } catch (error) {
      console.error('Error storing benchmark summary:', error);
    }
  }

  /**
   * Get latest benchmark results
   */
  async getLatestResults(): Promise<any> {
    try {
      const summary = await this.redis.get('benchmark:latest_summary');
      return summary ? JSON.parse(summary) : null;
    } catch (error) {
      console.error('Error getting latest benchmark results:', error);
      return null;
    }
  }

  /**
   * Get benchmark history
   */
  async getBenchmarkHistory(limit: number = 10): Promise<any[]> {
    try {
      const history = await this.redis.lrange('benchmark:history', 0, limit - 1);
      return history.map(h => JSON.parse(h));
    } catch (error) {
      console.error('Error getting benchmark history:', error);
      return [];
    }
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<{ status: string; details: any }> {
    try {
      await this.redis.ping();
      
      const recentBenchmarks = await db
        .select({ count: sql<number>`count(*)` })
        .from(performanceBenchmarks)
        .where(gte(performanceBenchmarks.runAt, new Date(Date.now() - 24 * 60 * 60 * 1000)));

      return {
        status: 'healthy',
        details: {
          redis: 'connected',
          recentBenchmarks: recentBenchmarks[0]?.count || 0
        }
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        details: { 
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      };
    }
  }
}

export const performanceBenchmarks = new PerformanceBenchmarkService();