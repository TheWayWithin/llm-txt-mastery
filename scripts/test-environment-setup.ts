#!/usr/bin/env tsx
/**
 * Environment Setup Test Suite
 * Tests all semantic enhancement infrastructure components
 */

import { Pool } from 'pg';
import Redis from 'ioredis';
import OpenAI from 'openai';
import {
  semanticConfig,
  validateSemanticConfig,
  getConfigSummary,
} from '../server/config/semantic-config';
import { EmbeddingCache } from '../server/services/redis-client';

interface TestResult {
  name: string;
  status: 'PASS' | 'FAIL' | 'WARN';
  message: string;
  duration: number;
  details?: any;
}

class EnvironmentTester {
  private results: TestResult[] = [];
  private pgPool: Pool | null = null;
  private redis: Redis | null = null;
  private openai: OpenAI | null = null;

  async runAllTests(): Promise<void> {
    console.log('🚀 Starting LLM.txt Mastery Environment Setup Tests\n');
    console.log(getConfigSummary());
    console.log('\n' + '='.repeat(60) + '\n');

    // Configuration Tests
    await this.testConfiguration();

    // Database Tests
    await this.testDatabaseConnection();
    await this.testPgvectorExtension();
    await this.testSemanticTables();
    await this.testVectorOperations();

    // Redis Tests
    await this.testRedisConnection();
    await this.testEmbeddingCache();

    // OpenAI Tests
    await this.testOpenAIConnection();
    await this.testEmbeddingGeneration();

    // Integration Tests
    await this.testFullPipeline();

    // Performance Tests
    await this.testPerformanceBenchmarks();

    // Cleanup
    await this.cleanup();

    // Report Results
    this.printSummary();
  }

  private async runTest(name: string, testFn: () => Promise<any>): Promise<void> {
    const start = Date.now();
    console.log(`🧪 ${name}...`);

    try {
      const result = await testFn();
      const duration = Date.now() - start;

      this.results.push({
        name,
        status: 'PASS',
        message: 'Success',
        duration,
        details: result,
      });

      console.log(`✅ ${name} - PASSED (${duration}ms)`);
    } catch (error) {
      const duration = Date.now() - start;
      const message = error instanceof Error ? error.message : 'Unknown error';

      this.results.push({
        name,
        status: 'FAIL',
        message,
        duration,
        details: error,
      });

      console.log(`❌ ${name} - FAILED (${duration}ms): ${message}`);
    }

    console.log('');
  }

  private async testConfiguration(): Promise<void> {
    await this.runTest('Configuration Validation', async () => {
      const validation = validateSemanticConfig();
      if (!validation.isValid) {
        throw new Error(`Configuration errors: ${validation.errors.join(', ')}`);
      }
      return validation;
    });
  }

  private async testDatabaseConnection(): Promise<void> {
    await this.runTest('PostgreSQL Connection', async () => {
      if (!process.env.DATABASE_URL) {
        throw new Error('DATABASE_URL not set');
      }

      this.pgPool = new Pool({ connectionString: process.env.DATABASE_URL });
      const client = await this.pgPool.connect();

      const result = await client.query('SELECT version()');
      client.release();

      return { version: result.rows[0].version };
    });
  }

  private async testPgvectorExtension(): Promise<void> {
    await this.runTest('pgvector Extension', async () => {
      if (!this.pgPool) throw new Error('Database not connected');

      const client = await this.pgPool.connect();

      // Check if extension exists
      const extensionCheck = await client.query(`
        SELECT extname, extversion 
        FROM pg_extension 
        WHERE extname = 'vector'
      `);

      if (extensionCheck.rows.length === 0) {
        // Try to create extension
        await client.query('CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA extensions');
      }

      // Test vector operations
      const vectorTest = await client.query(`
        SELECT '[1,2,3]'::vector <-> '[4,5,6]'::vector AS distance
      `);

      client.release();

      return {
        extensionExists: extensionCheck.rows.length > 0,
        version: extensionCheck.rows[0]?.extversion,
        vectorDistance: vectorTest.rows[0].distance,
      };
    });
  }

  private async testSemanticTables(): Promise<void> {
    await this.runTest('Semantic Enhancement Tables', async () => {
      if (!this.pgPool) throw new Error('Database not connected');

      const client = await this.pgPool.connect();

      const tables = [
        'embedding_cache',
        'content_clusters',
        'semantic_tags',
        'page_relationships',
        'enhanced_descriptions',
      ];

      const results = {};

      for (const table of tables) {
        const exists = await client.query(
          `
          SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_name = $1
          )
        `,
          [table]
        );

        results[table] = exists.rows[0].exists;
      }

      client.release();

      const allTablesExist = Object.values(results).every(Boolean);
      if (!allTablesExist) {
        throw new Error(
          `Missing tables: ${Object.entries(results)
            .filter(([_, exists]) => !exists)
            .map(([table]) => table)
            .join(', ')}`
        );
      }

      return results;
    });
  }

  private async testVectorOperations(): Promise<void> {
    await this.runTest('Vector Operations Performance', async () => {
      if (!this.pgPool) throw new Error('Database not connected');

      const client = await this.pgPool.connect();

      // Test vector insertion and retrieval
      const testEmbedding = Array.from({ length: 1536 }, () => Math.random());
      const testHash = `test-${Date.now()}`;

      const insertStart = Date.now();
      await client.query(
        `
        INSERT INTO embedding_cache (content_hash, content_text, embedding, expires_at)
        VALUES ($1, $2, $3, NOW() + INTERVAL '1 hour')
      `,
        [testHash, 'test content', JSON.stringify(testEmbedding)]
      );
      const insertTime = Date.now() - insertStart;

      const queryStart = Date.now();
      const result = await client.query(
        `
        SELECT content_hash, embedding <-> $1 AS distance
        FROM embedding_cache 
        WHERE content_hash = $2
      `,
        [JSON.stringify(testEmbedding), testHash]
      );
      const queryTime = Date.now() - queryStart;

      // Cleanup test data
      await client.query('DELETE FROM embedding_cache WHERE content_hash = $1', [testHash]);

      client.release();

      return {
        insertTime,
        queryTime,
        distance: result.rows[0]?.distance,
      };
    });
  }

  private async testRedisConnection(): Promise<void> {
    await this.runTest('Redis Connection', async () => {
      this.redis = new Redis({
        host: semanticConfig.redis.host,
        port: semanticConfig.redis.port,
        password: semanticConfig.redis.password,
        db: semanticConfig.redis.db,
        lazyConnect: true,
        retryDelayOnFailover: 100,
        maxRetriesPerRequest: 3,
      });

      await this.redis.connect();

      const pingStart = Date.now();
      const pong = await this.redis.ping();
      const pingTime = Date.now() - pingStart;

      const info = await this.redis.info('server');
      const redisVersion = info.match(/redis_version:([^\r\n]+)/)?.[1] || 'unknown';

      return { pong, pingTime, version: redisVersion };
    });
  }

  private async testEmbeddingCache(): Promise<void> {
    await this.runTest('Embedding Cache Operations', async () => {
      if (!this.redis) throw new Error('Redis not connected');

      const testHash = `test-embedding-${Date.now()}`;
      const testEmbedding = Array.from({ length: 1536 }, () => Math.random());
      const testMetadata = {
        contentText: 'This is a test embedding content',
        modelVersion: 'text-embedding-3-small',
        semanticTags: ['test', 'embedding'],
      };

      // Test cache set
      const setStart = Date.now();
      await EmbeddingCache.setEmbedding(testHash, testEmbedding, testMetadata, 3600);
      const setTime = Date.now() - setStart;

      // Test cache get
      const getStart = Date.now();
      const cached = await EmbeddingCache.getEmbedding(testHash);
      const getTime = Date.now() - getStart;

      // Test cache exists
      const exists = await EmbeddingCache.hasEmbedding(testHash);

      // Cleanup
      await EmbeddingCache.removeEmbedding(testHash);

      if (!cached) {
        throw new Error('Failed to retrieve cached embedding');
      }

      return {
        setTime,
        getTime,
        exists,
        embeddingMatch: cached.embedding.length === testEmbedding.length,
        metadataMatch: cached.contentText === testMetadata.contentText,
      };
    });
  }

  private async testOpenAIConnection(): Promise<void> {
    await this.runTest('OpenAI API Connection', async () => {
      if (!process.env.OPENAI_API_KEY) {
        throw new Error('OPENAI_API_KEY not set');
      }

      this.openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      });

      // Test API access with a simple request
      const models = await this.openai.models.list();
      const embeddingModels = models.data.filter((m) => m.id.includes('embedding'));

      return {
        totalModels: models.data.length,
        embeddingModels: embeddingModels.length,
        hasTargetModel: embeddingModels.some((m) => m.id === semanticConfig.openai.model),
      };
    });
  }

  private async testEmbeddingGeneration(): Promise<void> {
    await this.runTest('Embedding Generation', async () => {
      if (!this.openai) throw new Error('OpenAI not initialized');

      const testText = 'This is a test sentence for embedding generation.';

      const start = Date.now();
      const response = await this.openai.embeddings.create({
        model: semanticConfig.openai.model,
        input: testText,
      });
      const duration = Date.now() - start;

      const embedding = response.data[0].embedding;

      return {
        duration,
        embeddingLength: embedding.length,
        expectedLength: semanticConfig.openai.dimensions,
        usage: response.usage,
        dimensionsMatch: embedding.length === semanticConfig.openai.dimensions,
      };
    });
  }

  private async testFullPipeline(): Promise<void> {
    await this.runTest('Full Integration Pipeline', async () => {
      if (!this.openai || !this.redis || !this.pgPool) {
        throw new Error('Required services not initialized');
      }

      const testText = 'Integration test content for semantic analysis pipeline.';
      const contentHash = `integration-test-${Date.now()}`;

      // Step 1: Generate embedding
      const embeddingResponse = await this.openai.embeddings.create({
        model: semanticConfig.openai.model,
        input: testText,
      });

      const embedding = embeddingResponse.data[0].embedding;

      // Step 2: Cache embedding in Redis
      await EmbeddingCache.setEmbedding(contentHash, embedding, {
        contentText: testText,
        modelVersion: semanticConfig.openai.model,
        semanticTags: ['integration', 'test'],
      });

      // Step 3: Store in PostgreSQL
      const client = await this.pgPool.connect();
      await client.query(
        `
        INSERT INTO embedding_cache (content_hash, content_text, embedding, expires_at)
        VALUES ($1, $2, $3, NOW() + INTERVAL '1 hour')
        ON CONFLICT (content_hash) DO UPDATE SET hit_count = embedding_cache.hit_count + 1
      `,
        [contentHash, testText, JSON.stringify(embedding)]
      );

      // Step 4: Test similarity search
      const similarityResult = await client.query(
        `
        SELECT content_hash, embedding <-> $1 AS distance
        FROM embedding_cache 
        WHERE content_hash = $2
      `,
        [JSON.stringify(embedding), contentHash]
      );

      // Cleanup
      await client.query('DELETE FROM embedding_cache WHERE content_hash = $1', [contentHash]);
      await EmbeddingCache.removeEmbedding(contentHash);
      client.release();

      return {
        embeddingGenerated: embedding.length === semanticConfig.openai.dimensions,
        redisCacheWorked: (await EmbeddingCache.hasEmbedding(contentHash)) === false, // Should be false after removal
        postgresStoreWorked: similarityResult.rows.length === 1,
        similarityDistance: similarityResult.rows[0]?.distance,
      };
    });
  }

  private async testPerformanceBenchmarks(): Promise<void> {
    await this.runTest('Performance Benchmarks', async () => {
      if (!this.pgPool) throw new Error('Database not connected');

      const client = await this.pgPool.connect();

      // Run the built-in performance test function
      const perfResults = await client.query('SELECT * FROM test_vector_performance()');

      client.release();

      const results = {};
      perfResults.rows.forEach((row) => {
        results[row.operation] = {
          duration_ms: row.duration_ms,
          status: row.status,
        };
      });

      return results;
    });
  }

  private async cleanup(): Promise<void> {
    try {
      if (this.pgPool) {
        await this.pgPool.end();
      }
      if (this.redis) {
        this.redis.disconnect();
      }
    } catch (error) {
      console.error('Cleanup error:', error);
    }
  }

  private printSummary(): void {
    console.log('\n' + '='.repeat(60));
    console.log('📊 TEST SUMMARY');
    console.log('='.repeat(60));

    const passed = this.results.filter((r) => r.status === 'PASS').length;
    const failed = this.results.filter((r) => r.status === 'FAIL').length;
    const warned = this.results.filter((r) => r.status === 'WARN').length;

    console.log(`Total Tests: ${this.results.length}`);
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`⚠️  Warnings: ${warned}`);

    if (failed > 0) {
      console.log('\n❌ FAILED TESTS:');
      this.results
        .filter((r) => r.status === 'FAIL')
        .forEach((result) => {
          console.log(`  - ${result.name}: ${result.message}`);
        });
    }

    const totalTime = this.results.reduce((sum, r) => sum + r.duration, 0);
    console.log(`\n⏱️  Total execution time: ${totalTime}ms`);

    if (failed === 0) {
      console.log('\n🎉 All tests passed! Environment is ready for semantic enhancements.');
    } else {
      console.log('\n🔧 Some tests failed. Please check the configuration and try again.');
      process.exit(1);
    }
  }
}

// Run tests if called directly
if (require.main === module) {
  const tester = new EnvironmentTester();
  tester.runAllTests().catch((error) => {
    console.error('❌ Test runner failed:', error);
    process.exit(1);
  });
}

export { EnvironmentTester, TestResult };
