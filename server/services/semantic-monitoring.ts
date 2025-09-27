import { Redis } from 'ioredis';
import { redisClient } from './redis-client';
import { db } from '../db';
import { pgTable, serial, text, integer, timestamp, jsonb, decimal, boolean } from 'drizzle-orm/pg-core';
import { eq, and, sql, desc, gte, lte } from 'drizzle-orm';
import { performance } from 'perf_hooks';

// Monitoring database tables
export const semanticLogs = pgTable('semantic_logs', {
  id: serial('id').primaryKey(),
  userId: text('user_id'),
  sessionId: text('session_id'),
  feature: text('feature').notNull(), // clustering, semantic_tags, enhanced_descriptions, etc.
  operation: text('operation').notNull(), // generate_embeddings, cluster_content, enhance_descriptions, etc.
  status: text('status').notNull(), // success, error, partial_success
  duration: integer('duration'), // milliseconds
  inputSize: integer('input_size'), // number of pages/items processed
  outputSize: integer('output_size'), // number of results generated
  tokenUsage: integer('token_usage'), // OpenAI tokens consumed
  cost: decimal('cost', { precision: 8, scale: 4 }), // Cost in USD
  errorMessage: text('error_message'),
  metadata: jsonb('metadata').$type<SemanticLogMetadata>(),
  timestamp: timestamp('timestamp').defaultNow(),
});

export const performanceMetrics = pgTable('semantic_performance_metrics', {
  id: serial('id').primaryKey(),
  feature: text('feature').notNull(),
  operation: text('operation').notNull(),
  metric: text('metric').notNull(), // response_time, throughput, error_rate, cache_hit_rate
  value: decimal('value', { precision: 10, scale: 4 }).notNull(),
  unit: text('unit').notNull(), // ms, requests/sec, percentage, etc.
  aggregationType: text('aggregation_type').notNull(), // avg, max, min, count, rate
  timeWindow: text('time_window').notNull(), // 1m, 5m, 1h, 1d
  timestamp: timestamp('timestamp').defaultNow(),
  metadata: jsonb('metadata'),
});

export const featureUsageStats = pgTable('semantic_feature_usage', {
  id: serial('id').primaryKey(),
  feature: text('feature').notNull(),
  date: text('date').notNull(), // YYYY-MM-DD
  hour: integer('hour'), // 0-23, null for daily aggregates
  totalRequests: integer('total_requests').notNull().default(0),
  successfulRequests: integer('successful_requests').notNull().default(0),
  failedRequests: integer('failed_requests').notNull().default(0),
  avgDuration: decimal('avg_duration', { precision: 8, scale: 2 }),
  totalTokenUsage: integer('total_token_usage').notNull().default(0),
  totalCost: decimal('total_cost', { precision: 10, scale: 4 }).notNull().default('0'),
  uniqueUsers: integer('unique_users').notNull().default(0),
  cacheHitRate: decimal('cache_hit_rate', { precision: 5, scale: 2 }),
});

// TypeScript interfaces
export interface SemanticLogMetadata {
  experimentVariant?: string;
  cacheHit?: boolean;
  modelUsed?: string;
  embeddingDimensions?: number;
  clusterCount?: number;
  qualityScore?: number;
  userTier?: string;
  processingSteps?: string[];
  [key: string]: any;
}

export interface PerformanceMetric {
  feature: string;
  operation: string;
  metric: string;
  value: number;
  unit: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export interface SemanticLogEntry {
  userId?: string;
  sessionId?: string;
  feature: string;
  operation: string;
  status: 'success' | 'error' | 'partial_success';
  duration?: number;
  inputSize?: number;
  outputSize?: number;
  tokenUsage?: number;
  cost?: number;
  errorMessage?: string;
  metadata?: SemanticLogMetadata;
}

export interface DashboardMetrics {
  overview: {
    totalRequests: number;
    successRate: number;
    avgResponseTime: number;
    totalCost: number;
    activeFeatures: string[];
  };
  featureBreakdown: Array<{
    feature: string;
    requests: number;
    successRate: number;
    avgDuration: number;
    cost: number;
  }>;
  performanceTrends: Array<{
    timestamp: Date;
    responseTime: number;
    throughput: number;
    errorRate: number;
  }>;
  alerts: Array<{
    type: 'performance' | 'error' | 'cost';
    severity: 'low' | 'medium' | 'high';
    message: string;
    timestamp: Date;
  }>;
}

class SemanticMonitoringService {
  private redis: Redis;
  private metricsBuffer: Map<string, any[]> = new Map();
  private flushInterval: NodeJS.Timeout;
  private alertThresholds = {
    responseTimeMs: 5000, // Alert if response time > 5s
    errorRatePercent: 10, // Alert if error rate > 10%
    costPerHourUSD: 10, // Alert if hourly cost > $10
    cacheHitRatePercent: 50 // Alert if cache hit rate < 50%
  };

  constructor() {
    this.redis = redisClient.getInstance();
    
    // Flush metrics buffer every 30 seconds
    this.flushInterval = setInterval(() => {
      this.flushMetricsBuffer();
    }, 30000);

    this.initializeMetricsAggregation();
  }

  /**
   * Log semantic operation
   */
  async logOperation(entry: SemanticLogEntry): Promise<void> {
    try {
      // Add to database
      await db.insert(semanticLogs).values({
        userId: entry.userId,
        sessionId: entry.sessionId,
        feature: entry.feature,
        operation: entry.operation,
        status: entry.status,
        duration: entry.duration,
        inputSize: entry.inputSize,
        outputSize: entry.outputSize,
        tokenUsage: entry.tokenUsage,
        cost: entry.cost?.toString(),
        errorMessage: entry.errorMessage,
        metadata: entry.metadata
      });

      // Update real-time metrics in Redis
      await this.updateRealtimeMetrics(entry);

      // Check for alerts
      await this.checkAlerts(entry);

    } catch (error) {
      console.error('Error logging semantic operation:', error);
    }
  }

  /**
   * Record performance metric
   */
  async recordMetric(metric: PerformanceMetric): Promise<void> {
    try {
      // Buffer metrics for batch insertion
      const key = `${metric.feature}:${metric.operation}:${metric.metric}`;
      if (!this.metricsBuffer.has(key)) {
        this.metricsBuffer.set(key, []);
      }
      this.metricsBuffer.get(key)!.push(metric);

      // Also update real-time Redis metrics
      const redisKey = `metrics:realtime:${key}`;
      await this.redis.lpush(redisKey, JSON.stringify({
        value: metric.value,
        timestamp: metric.timestamp.toISOString()
      }));
      await this.redis.ltrim(redisKey, 0, 99); // Keep last 100 values
      await this.redis.expire(redisKey, 3600); // Expire after 1 hour

    } catch (error) {
      console.error('Error recording performance metric:', error);
    }
  }

  /**
   * Get dashboard metrics
   */
  async getDashboardMetrics(timeRange: '1h' | '6h' | '24h' | '7d' = '24h'): Promise<DashboardMetrics> {
    try {
      const timeRangeHours = {
        '1h': 1,
        '6h': 6, 
        '24h': 24,
        '7d': 168
      };

      const hoursBack = timeRangeHours[timeRange];
      const startTime = new Date(Date.now() - hoursBack * 60 * 60 * 1000);

      // Overview metrics
      const overviewResults = await db
        .select({
          totalRequests: sql<number>`count(*)`,
          successfulRequests: sql<number>`count(case when status = 'success' then 1 end)`,
          avgDuration: sql<number>`avg(duration)`,
          totalCost: sql<number>`sum(cast(cost as decimal))`,
          activeFeatures: sql<string[]>`array_agg(distinct feature)`
        })
        .from(semanticLogs)
        .where(gte(semanticLogs.timestamp, startTime));

      const overview = overviewResults[0];
      const successRate = overview.totalRequests > 0 
        ? (overview.successfulRequests / overview.totalRequests) * 100 
        : 0;

      // Feature breakdown
      const featureResults = await db
        .select({
          feature: semanticLogs.feature,
          requests: sql<number>`count(*)`,
          successfulRequests: sql<number>`count(case when status = 'success' then 1 end)`,
          avgDuration: sql<number>`avg(duration)`,
          totalCost: sql<number>`sum(cast(cost as decimal))`
        })
        .from(semanticLogs)
        .where(gte(semanticLogs.timestamp, startTime))
        .groupBy(semanticLogs.feature);

      const featureBreakdown = featureResults.map(f => ({
        feature: f.feature,
        requests: f.requests,
        successRate: f.requests > 0 ? (f.successfulRequests / f.requests) * 100 : 0,
        avgDuration: f.avgDuration || 0,
        cost: f.totalCost || 0
      }));

      // Performance trends (hourly aggregation)
      const trendsResults = await db
        .select({
          hour: sql<string>`date_trunc('hour', timestamp)`,
          avgDuration: sql<number>`avg(duration)`,
          totalRequests: sql<number>`count(*)`,
          errorCount: sql<number>`count(case when status = 'error' then 1 end)`
        })
        .from(semanticLogs)
        .where(gte(semanticLogs.timestamp, startTime))
        .groupBy(sql`date_trunc('hour', timestamp)`)
        .orderBy(sql`date_trunc('hour', timestamp)`);

      const performanceTrends = trendsResults.map(t => ({
        timestamp: new Date(t.hour),
        responseTime: t.avgDuration || 0,
        throughput: t.totalRequests || 0,
        errorRate: t.totalRequests > 0 ? (t.errorCount / t.totalRequests) * 100 : 0
      }));

      // Get alerts from Redis
      const alerts = await this.getActiveAlerts();

      return {
        overview: {
          totalRequests: overview.totalRequests,
          successRate,
          avgResponseTime: overview.avgDuration || 0,
          totalCost: overview.totalCost || 0,
          activeFeatures: overview.activeFeatures?.filter(Boolean) || []
        },
        featureBreakdown,
        performanceTrends,
        alerts
      };

    } catch (error) {
      console.error('Error getting dashboard metrics:', error);
      return {
        overview: {
          totalRequests: 0,
          successRate: 0,
          avgResponseTime: 0,
          totalCost: 0,
          activeFeatures: []
        },
        featureBreakdown: [],
        performanceTrends: [],
        alerts: []
      };
    }
  }

  /**
   * Get feature-specific metrics
   */
  async getFeatureMetrics(feature: string, timeRange: '1h' | '6h' | '24h' | '7d' = '24h'): Promise<any> {
    try {
      const timeRangeHours = { '1h': 1, '6h': 6, '24h': 24, '7d': 168 };
      const hoursBack = timeRangeHours[timeRange];
      const startTime = new Date(Date.now() - hoursBack * 60 * 60 * 1000);

      // Operation breakdown
      const operationResults = await db
        .select({
          operation: semanticLogs.operation,
          requests: sql<number>`count(*)`,
          successfulRequests: sql<number>`count(case when status = 'success' then 1 end)`,
          avgDuration: sql<number>`avg(duration)`,
          totalTokens: sql<number>`sum(token_usage)`,
          totalCost: sql<number>`sum(cast(cost as decimal))`
        })
        .from(semanticLogs)
        .where(
          and(
            eq(semanticLogs.feature, feature),
            gte(semanticLogs.timestamp, startTime)
          )
        )
        .groupBy(semanticLogs.operation);

      // Performance over time
      const timeSeriesResults = await db
        .select({
          timestamp: sql<string>`date_trunc('hour', timestamp)`,
          avgDuration: sql<number>`avg(duration)`,
          requests: sql<number>`count(*)`,
          errors: sql<number>`count(case when status = 'error' then 1 end)`
        })
        .from(semanticLogs)
        .where(
          and(
            eq(semanticLogs.feature, feature),
            gte(semanticLogs.timestamp, startTime)
          )
        )
        .groupBy(sql`date_trunc('hour', timestamp)`)
        .orderBy(sql`date_trunc('hour', timestamp)`);

      return {
        operationBreakdown: operationResults.map(op => ({
          operation: op.operation,
          requests: op.requests,
          successRate: op.requests > 0 ? (op.successfulRequests / op.requests) * 100 : 0,
          avgDuration: op.avgDuration || 0,
          totalTokens: op.totalTokens || 0,
          totalCost: op.totalCost || 0
        })),
        timeSeries: timeSeriesResults.map(ts => ({
          timestamp: new Date(ts.timestamp),
          avgDuration: ts.avgDuration || 0,
          requests: ts.requests,
          errorRate: ts.requests > 0 ? (ts.errors / ts.requests) * 100 : 0
        }))
      };

    } catch (error) {
      console.error('Error getting feature metrics:', error);
      return { operationBreakdown: [], timeSeries: [] };
    }
  }

  /**
   * Create performance timer for measuring operations
   */
  createTimer(feature: string, operation: string): SemanticTimer {
    return new SemanticTimer(this, feature, operation);
  }

  /**
   * Update real-time metrics in Redis
   */
  private async updateRealtimeMetrics(entry: SemanticLogEntry): Promise<void> {
    const timestamp = new Date().toISOString();
    
    // Update counters
    await this.redis.hincrby(`metrics:counters:${entry.feature}`, 'total', 1);
    if (entry.status === 'success') {
      await this.redis.hincrby(`metrics:counters:${entry.feature}`, 'success', 1);
    } else {
      await this.redis.hincrby(`metrics:counters:${entry.feature}`, 'errors', 1);
    }

    // Update duration tracking
    if (entry.duration) {
      await this.redis.lpush(`metrics:durations:${entry.feature}`, entry.duration);
      await this.redis.ltrim(`metrics:durations:${entry.feature}`, 0, 99);
      await this.redis.expire(`metrics:durations:${entry.feature}`, 3600);
    }

    // Update cost tracking
    if (entry.cost) {
      await this.redis.lpush(`metrics:costs:${entry.feature}`, entry.cost);
      await this.redis.ltrim(`metrics:costs:${entry.feature}`, 0, 99);
      await this.redis.expire(`metrics:costs:${entry.feature}`, 3600);
    }

    // Set expiration on counters
    await this.redis.expire(`metrics:counters:${entry.feature}`, 3600);
  }

  /**
   * Check for alert conditions
   */
  private async checkAlerts(entry: SemanticLogEntry): Promise<void> {
    const alerts: any[] = [];

    // High response time alert
    if (entry.duration && entry.duration > this.alertThresholds.responseTimeMs) {
      alerts.push({
        type: 'performance',
        severity: 'high',
        message: `High response time detected: ${entry.duration}ms for ${entry.feature}:${entry.operation}`,
        timestamp: new Date(),
        metadata: { feature: entry.feature, operation: entry.operation, duration: entry.duration }
      });
    }

    // Error alert
    if (entry.status === 'error') {
      alerts.push({
        type: 'error',
        severity: 'medium',
        message: `Error in ${entry.feature}:${entry.operation}: ${entry.errorMessage}`,
        timestamp: new Date(),
        metadata: { feature: entry.feature, operation: entry.operation, error: entry.errorMessage }
      });
    }

    // High cost alert
    if (entry.cost && entry.cost > 1.0) { // $1 per operation
      alerts.push({
        type: 'cost',
        severity: 'high',
        message: `High cost operation: $${entry.cost} for ${entry.feature}:${entry.operation}`,
        timestamp: new Date(),
        metadata: { feature: entry.feature, operation: entry.operation, cost: entry.cost }
      });
    }

    // Store alerts in Redis
    for (const alert of alerts) {
      await this.redis.lpush('semantic:alerts', JSON.stringify(alert));
      await this.redis.ltrim('semantic:alerts', 0, 49); // Keep last 50 alerts
      await this.redis.expire('semantic:alerts', 86400); // 24 hours
    }
  }

  /**
   * Get active alerts from Redis
   */
  private async getActiveAlerts(): Promise<any[]> {
    try {
      const alertStrings = await this.redis.lrange('semantic:alerts', 0, -1);
      return alertStrings.map(alertStr => JSON.parse(alertStr))
        .filter(alert => {
          // Only show alerts from the last hour
          const alertTime = new Date(alert.timestamp);
          const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
          return alertTime > oneHourAgo;
        });
    } catch (error) {
      console.error('Error getting active alerts:', error);
      return [];
    }
  }

  /**
   * Flush metrics buffer to database
   */
  private async flushMetricsBuffer(): Promise<void> {
    if (this.metricsBuffer.size === 0) return;

    try {
      const metricsToInsert: any[] = [];
      
      for (const [key, metrics] of this.metricsBuffer.entries()) {
        for (const metric of metrics) {
          metricsToInsert.push({
            feature: metric.feature,
            operation: metric.operation,
            metric: metric.metric,
            value: metric.value.toString(),
            unit: metric.unit,
            aggregationType: 'instant',
            timeWindow: '1m',
            timestamp: metric.timestamp,
            metadata: metric.metadata
          });
        }
      }

      if (metricsToInsert.length > 0) {
        await db.insert(performanceMetrics).values(metricsToInsert);
      }

      // Clear buffer
      this.metricsBuffer.clear();

    } catch (error) {
      console.error('Error flushing metrics buffer:', error);
    }
  }

  /**
   * Initialize metrics aggregation (run periodically)
   */
  private initializeMetricsAggregation(): void {
    // Aggregate hourly stats every hour
    setInterval(async () => {
      await this.aggregateHourlyStats();
    }, 60 * 60 * 1000); // 1 hour

    // Aggregate daily stats once per day
    setInterval(async () => {
      await this.aggregateDailyStats();
    }, 24 * 60 * 60 * 1000); // 24 hours
  }

  /**
   * Aggregate hourly statistics
   */
  private async aggregateHourlyStats(): Promise<void> {
    try {
      const now = new Date();
      const hourAgo = new Date(now.getTime() - 60 * 60 * 1000);
      
      await db.execute(sql`
        INSERT INTO semantic_feature_usage (
          feature, date, hour, total_requests, successful_requests, failed_requests,
          avg_duration, total_token_usage, total_cost, unique_users
        )
        SELECT 
          feature,
          DATE(${hourAgo}) as date,
          EXTRACT(HOUR FROM ${hourAgo}) as hour,
          COUNT(*) as total_requests,
          COUNT(CASE WHEN status = 'success' THEN 1 END) as successful_requests,
          COUNT(CASE WHEN status != 'success' THEN 1 END) as failed_requests,
          AVG(duration) as avg_duration,
          SUM(token_usage) as total_token_usage,
          SUM(CAST(cost AS DECIMAL)) as total_cost,
          COUNT(DISTINCT COALESCE(user_id, session_id)) as unique_users
        FROM semantic_logs 
        WHERE timestamp >= ${hourAgo} AND timestamp < ${now}
        GROUP BY feature
        ON CONFLICT (feature, date, hour) DO UPDATE SET
          total_requests = EXCLUDED.total_requests,
          successful_requests = EXCLUDED.successful_requests,
          failed_requests = EXCLUDED.failed_requests,
          avg_duration = EXCLUDED.avg_duration,
          total_token_usage = EXCLUDED.total_token_usage,
          total_cost = EXCLUDED.total_cost,
          unique_users = EXCLUDED.unique_users
      `);
    } catch (error) {
      console.error('Error aggregating hourly stats:', error);
    }
  }

  /**
   * Aggregate daily statistics
   */
  private async aggregateDailyStats(): Promise<void> {
    try {
      const now = new Date();
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      
      await db.execute(sql`
        INSERT INTO semantic_feature_usage (
          feature, date, total_requests, successful_requests, failed_requests,
          avg_duration, total_token_usage, total_cost, unique_users
        )
        SELECT 
          feature,
          DATE(${yesterday}) as date,
          COUNT(*) as total_requests,
          COUNT(CASE WHEN status = 'success' THEN 1 END) as successful_requests,
          COUNT(CASE WHEN status != 'success' THEN 1 END) as failed_requests,
          AVG(duration) as avg_duration,
          SUM(token_usage) as total_token_usage,
          SUM(CAST(cost AS DECIMAL)) as total_cost,
          COUNT(DISTINCT COALESCE(user_id, session_id)) as unique_users
        FROM semantic_logs 
        WHERE DATE(timestamp) = DATE(${yesterday})
        GROUP BY feature
        ON CONFLICT (feature, date) WHERE hour IS NULL DO UPDATE SET
          total_requests = EXCLUDED.total_requests,
          successful_requests = EXCLUDED.successful_requests,
          failed_requests = EXCLUDED.failed_requests,
          avg_duration = EXCLUDED.avg_duration,
          total_token_usage = EXCLUDED.total_token_usage,
          total_cost = EXCLUDED.total_cost,
          unique_users = EXCLUDED.unique_users
      `);
    } catch (error) {
      console.error('Error aggregating daily stats:', error);
    }
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<{ status: string; details: any }> {
    try {
      await this.redis.ping();
      
      const recentLogs = await db
        .select({ count: sql<number>`count(*)` })
        .from(semanticLogs)
        .where(gte(semanticLogs.timestamp, new Date(Date.now() - 60 * 60 * 1000)));

      return {
        status: 'healthy',
        details: {
          redis: 'connected',
          recentLogs: recentLogs[0]?.count || 0,
          bufferSize: Array.from(this.metricsBuffer.values()).reduce((sum, arr) => sum + arr.length, 0)
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

/**
 * Timer class for measuring semantic operations
 */
export class SemanticTimer {
  private startTime: number;
  private endTime?: number;
  private metadata: SemanticLogMetadata = {};

  constructor(
    private monitoring: SemanticMonitoringService,
    private feature: string,
    private operation: string
  ) {
    this.startTime = performance.now();
  }

  /**
   * Add metadata to the timer
   */
  addMetadata(key: string, value: any): this {
    this.metadata[key] = value;
    return this;
  }

  /**
   * End the timer and log the operation
   */
  async end(
    status: 'success' | 'error' | 'partial_success',
    options: {
      userId?: string;
      sessionId?: string;
      inputSize?: number;
      outputSize?: number;
      tokenUsage?: number;
      cost?: number;
      errorMessage?: string;
    } = {}
  ): Promise<void> {
    this.endTime = performance.now();
    const duration = Math.round(this.endTime - this.startTime);

    await this.monitoring.logOperation({
      userId: options.userId,
      sessionId: options.sessionId,
      feature: this.feature,
      operation: this.operation,
      status,
      duration,
      inputSize: options.inputSize,
      outputSize: options.outputSize,
      tokenUsage: options.tokenUsage,
      cost: options.cost,
      errorMessage: options.errorMessage,
      metadata: this.metadata
    });

    // Record performance metric
    await this.monitoring.recordMetric({
      feature: this.feature,
      operation: this.operation,
      metric: 'response_time',
      value: duration,
      unit: 'ms',
      timestamp: new Date(),
      metadata: this.metadata
    });
  }
}

export const semanticMonitoring = new SemanticMonitoringService();