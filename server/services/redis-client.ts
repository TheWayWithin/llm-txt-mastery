import Redis from 'ioredis';

// Redis configuration for embedding cache
const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  db: parseInt(process.env.REDIS_DB || '0'),
  retryDelayOnFailover: 100,
  enableOfflineQueue: false,
  maxRetriesPerRequest: 3,
  lazyConnect: true,
  keepAlive: 30000,
  family: 4,
  connectTimeout: 10000,
  commandTimeout: 5000,
};

// Create Redis client with error handling
export const redisClient = new Redis(redisConfig);

// Connection event handlers
redisClient.on('connect', () => {
  console.log('✅ Redis connected successfully');
});

redisClient.on('ready', () => {
  console.log('✅ Redis ready to accept commands');
});

redisClient.on('error', (err) => {
  console.error('❌ Redis connection error:', err);
});

redisClient.on('close', () => {
  console.log('⚠️ Redis connection closed');
});

redisClient.on('reconnecting', () => {
  console.log('🔄 Redis reconnecting...');
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('🛑 Shutting down Redis connection...');
  await redisClient.quit();
  process.exit(0);
});

// Redis cache service for embeddings
export class EmbeddingCache {
  private static readonly CACHE_PREFIX = 'embedding:';
  private static readonly DEFAULT_TTL = 7 * 24 * 60 * 60; // 7 days in seconds
  private static readonly STATS_KEY = 'embedding:stats';

  /**
   * Generate cache key from content hash
   */
  private static getCacheKey(contentHash: string): string {
    return `${this.CACHE_PREFIX}${contentHash}`;
  }

  /**
   * Store embedding in cache with TTL
   */
  static async setEmbedding(
    contentHash: string,
    embedding: number[],
    metadata: {
      contentText: string;
      modelVersion: string;
      semanticTags?: string[];
    },
    ttlSeconds: number = this.DEFAULT_TTL
  ): Promise<void> {
    try {
      const key = this.getCacheKey(contentHash);
      const data = {
        embedding,
        ...metadata,
        cachedAt: new Date().toISOString(),
        hitCount: 0,
      };

      await redisClient.setex(key, ttlSeconds, JSON.stringify(data));

      // Update cache statistics
      await this.updateStats('writes', 1);

      console.log(`📦 Cached embedding for hash: ${contentHash}`);
    } catch (error) {
      console.error('❌ Error caching embedding:', error);
      throw error;
    }
  }

  /**
   * Retrieve embedding from cache
   */
  static async getEmbedding(contentHash: string): Promise<{
    embedding: number[];
    contentText: string;
    modelVersion: string;
    semanticTags?: string[];
    cachedAt: string;
    hitCount: number;
  } | null> {
    try {
      const key = this.getCacheKey(contentHash);
      const cached = await redisClient.get(key);

      if (!cached) {
        await this.updateStats('misses', 1);
        return null;
      }

      const data = JSON.parse(cached);

      // Increment hit count
      data.hitCount += 1;
      await redisClient.setex(key, await redisClient.ttl(key), JSON.stringify(data));

      // Update cache statistics
      await this.updateStats('hits', 1);

      console.log(`🎯 Cache hit for hash: ${contentHash}`);
      return data;
    } catch (error) {
      console.error('❌ Error retrieving cached embedding:', error);
      await this.updateStats('errors', 1);
      return null;
    }
  }

  /**
   * Check if embedding exists in cache
   */
  static async hasEmbedding(contentHash: string): Promise<boolean> {
    try {
      const key = this.getCacheKey(contentHash);
      const exists = await redisClient.exists(key);
      return exists === 1;
    } catch (error) {
      console.error('❌ Error checking cached embedding:', error);
      return false;
    }
  }

  /**
   * Remove embedding from cache
   */
  static async removeEmbedding(contentHash: string): Promise<boolean> {
    try {
      const key = this.getCacheKey(contentHash);
      const deleted = await redisClient.del(key);

      if (deleted > 0) {
        await this.updateStats('deletions', 1);
        console.log(`🗑️ Removed cached embedding: ${contentHash}`);
      }

      return deleted > 0;
    } catch (error) {
      console.error('❌ Error removing cached embedding:', error);
      return false;
    }
  }

  /**
   * Get multiple embeddings in batch
   */
  static async getBatchEmbeddings(contentHashes: string[]): Promise<Map<string, any>> {
    const results = new Map();

    try {
      const keys = contentHashes.map((hash) => this.getCacheKey(hash));
      const cached = await redisClient.mget(...keys);

      for (let i = 0; i < contentHashes.length; i++) {
        if (cached[i]) {
          try {
            results.set(contentHashes[i], JSON.parse(cached[i]));
            await this.updateStats('hits', 1);
          } catch (parseError) {
            console.error(`❌ Error parsing cached data for ${contentHashes[i]}:`, parseError);
            await this.updateStats('errors', 1);
          }
        } else {
          await this.updateStats('misses', 1);
        }
      }

      console.log(`📦 Batch retrieved ${results.size}/${contentHashes.length} embeddings`);
    } catch (error) {
      console.error('❌ Error in batch retrieval:', error);
      await this.updateStats('errors', contentHashes.length);
    }

    return results;
  }

  /**
   * Update cache statistics
   */
  private static async updateStats(metric: string, count: number): Promise<void> {
    try {
      const today = new Date().toISOString().split('T')[0];
      const statsKey = `${this.STATS_KEY}:${today}`;

      await redisClient.hincrby(statsKey, metric, count);
      await redisClient.expire(statsKey, 30 * 24 * 60 * 60); // 30 days
    } catch (error) {
      // Don't throw on stats errors
      console.error('❌ Error updating cache stats:', error);
    }
  }

  /**
   * Get cache statistics for monitoring
   */
  static async getStats(days: number = 7): Promise<
    {
      date: string;
      hits: number;
      misses: number;
      writes: number;
      deletions: number;
      errors: number;
      hitRate: number;
    }[]
  > {
    const stats = [];
    const today = new Date();

    for (let i = 0; i < days; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      const statsKey = `${this.STATS_KEY}:${dateStr}`;

      try {
        const dayStats = await redisClient.hgetall(statsKey);
        const hits = parseInt(dayStats.hits || '0');
        const misses = parseInt(dayStats.misses || '0');
        const writes = parseInt(dayStats.writes || '0');
        const deletions = parseInt(dayStats.deletions || '0');
        const errors = parseInt(dayStats.errors || '0');

        const total = hits + misses;
        const hitRate = total > 0 ? (hits / total) * 100 : 0;

        stats.unshift({
          date: dateStr,
          hits,
          misses,
          writes,
          deletions,
          errors,
          hitRate: Math.round(hitRate * 100) / 100,
        });
      } catch (error) {
        console.error(`❌ Error retrieving stats for ${dateStr}:`, error);
        stats.unshift({
          date: dateStr,
          hits: 0,
          misses: 0,
          writes: 0,
          deletions: 0,
          errors: 0,
          hitRate: 0,
        });
      }
    }

    return stats;
  }

  /**
   * Clear all embeddings (use with caution!)
   */
  static async clearAll(): Promise<number> {
    try {
      const keys = await redisClient.keys(`${this.CACHE_PREFIX}*`);
      if (keys.length === 0) return 0;

      const deleted = await redisClient.del(...keys);
      console.log(`🗑️ Cleared ${deleted} cached embeddings`);

      await this.updateStats('deletions', deleted);
      return deleted;
    } catch (error) {
      console.error('❌ Error clearing cache:', error);
      return 0;
    }
  }

  /**
   * Health check for Redis connection
   */
  static async healthCheck(): Promise<{
    status: 'healthy' | 'unhealthy';
    latency?: number;
    error?: string;
  }> {
    try {
      const start = Date.now();
      await redisClient.ping();
      const latency = Date.now() - start;

      return {
        status: 'healthy',
        latency,
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}

export default redisClient;
