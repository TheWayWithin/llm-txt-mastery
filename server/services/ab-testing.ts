import { Redis } from 'ioredis';
import { redisClient } from './redis-client';
import { db } from '../db';
import { eq, and, sql, desc } from 'drizzle-orm';
import {
  pgTable,
  serial,
  text,
  integer,
  timestamp,
  boolean,
  jsonb,
  decimal,
} from 'drizzle-orm/pg-core';

// A/B Testing database tables
export const experiments = pgTable('ab_experiments', {
  id: serial('id').primaryKey(),
  name: text('name').notNull().unique(),
  description: text('description'),
  featureFlag: text('feature_flag'), // Associated feature flag
  status: text('status').notNull().default('draft'), // draft, running, paused, completed
  trafficAllocation: decimal('traffic_allocation', { precision: 5, scale: 2 })
    .notNull()
    .default('100.00'), // 0-100%
  variants: jsonb('variants').$type<ExperimentVariant[]>().notNull(),
  targetingRules: jsonb('targeting_rules').$type<TargetingRule[]>(),
  metrics: jsonb('metrics').$type<ExperimentMetric[]>().notNull(),
  startDate: timestamp('start_date'),
  endDate: timestamp('end_date'),
  winnerVariant: text('winner_variant'),
  confidence: decimal('confidence', { precision: 5, scale: 2 }),
  createdBy: text('created_by').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const experimentAssignments = pgTable('ab_experiment_assignments', {
  id: serial('id').primaryKey(),
  experimentId: integer('experiment_id')
    .notNull()
    .references(() => experiments.id),
  userId: text('user_id'),
  sessionId: text('session_id'),
  variant: text('variant').notNull(),
  assignedAt: timestamp('assigned_at').defaultNow(),
  metadata: jsonb('metadata'), // Additional context
});

export const experimentEvents = pgTable('ab_experiment_events', {
  id: serial('id').primaryKey(),
  experimentId: integer('experiment_id')
    .notNull()
    .references(() => experiments.id),
  assignmentId: integer('assignment_id').references(() => experimentAssignments.id),
  userId: text('user_id'),
  sessionId: text('session_id'),
  variant: text('variant').notNull(),
  eventType: text('event_type').notNull(), // impression, conversion, click, etc.
  eventValue: decimal('event_value', { precision: 10, scale: 2 }), // Optional numeric value
  eventProperties: jsonb('event_properties'), // Additional event data
  timestamp: timestamp('timestamp').defaultNow(),
});

// TypeScript interfaces
export interface ExperimentVariant {
  name: string;
  description?: string;
  trafficAllocation: number; // 0-100%
  config?: Record<string, any>; // Variant configuration
}

export interface TargetingRule {
  type: 'user_property' | 'session_property' | 'random';
  property?: string;
  operator: 'equals' | 'not_equals' | 'in' | 'not_in' | 'greater_than' | 'less_than' | 'contains';
  value: any;
}

export interface ExperimentMetric {
  name: string;
  type: 'conversion_rate' | 'click_through_rate' | 'average_value' | 'count';
  eventType: string; // Which event type to track
  description?: string;
  isPrimary?: boolean;
}

export interface ExperimentAssignment {
  experimentId: number;
  experimentName: string;
  variant: string;
  config?: Record<string, any>;
  assignedAt: Date;
}

export interface ExperimentResult {
  variant: string;
  users: number;
  conversions: number;
  conversionRate: number;
  averageValue?: number;
  totalValue?: number;
  confidence?: number;
}

export interface UserContext {
  userId?: string;
  sessionId?: string;
  email?: string;
  tier?: string;
  properties?: Record<string, any>;
}

class ABTestingService {
  private redis: Redis | null;
  private assignmentCacheKey = 'ab_assignments';
  private experimentCacheKey = 'ab_experiments';

  constructor() {
    // Make Redis optional - use null if Redis unavailable
    try {
      this.redis = redisClient;
      console.log('A/B Testing: Using Redis cache');
    } catch (error) {
      this.redis = null;
      console.log('A/B Testing: Redis unavailable, service disabled');
    }
  }

  /**
   * Get experiment assignment for a user/session
   */
  async getAssignment(
    experimentName: string,
    userContext: UserContext
  ): Promise<ExperimentAssignment | null> {
    try {
      // Check cache first (if Redis is available)
      const cacheKey = `${this.assignmentCacheKey}:${experimentName}:${userContext.userId || userContext.sessionId}`;
      const cachedAssignment = this.redis ? await this.redis.get(cacheKey) : null;

      if (cachedAssignment) {
        return JSON.parse(cachedAssignment);
      }

      // Get experiment
      const experiment = await this.getExperiment(experimentName);
      if (!experiment || experiment.status !== 'running') {
        return null;
      }

      // Check if user already has an assignment
      const existingAssignment = await db
        .select()
        .from(experimentAssignments)
        .where(
          and(
            eq(experimentAssignments.experimentId, experiment.id),
            userContext.userId
              ? eq(experimentAssignments.userId, userContext.userId)
              : eq(experimentAssignments.sessionId, userContext.sessionId!)
          )
        )
        .limit(1);

      if (existingAssignment.length > 0) {
        const assignment: ExperimentAssignment = {
          experimentId: experiment.id,
          experimentName: experiment.name,
          variant: existingAssignment[0].variant,
          config: this.getVariantConfig(experiment, existingAssignment[0].variant),
          assignedAt: existingAssignment[0].assignedAt!,
        };

        // Cache for 1 hour (if Redis is available)
        if (this.redis) {
          await this.redis.setex(cacheKey, 3600, JSON.stringify(assignment));
        }
        return assignment;
      }

      // Check targeting rules
      if (!this.matchesTargeting(experiment, userContext)) {
        return null;
      }

      // Check traffic allocation
      if (!this.isInTrafficAllocation(experiment, userContext)) {
        return null;
      }

      // Assign variant
      const variant = this.assignVariant(experiment, userContext);

      // Save assignment
      const [newAssignment] = await db
        .insert(experimentAssignments)
        .values({
          experimentId: experiment.id,
          userId: userContext.userId,
          sessionId: userContext.sessionId,
          variant: variant.name,
          metadata: { userContext },
        })
        .returning();

      const assignment: ExperimentAssignment = {
        experimentId: experiment.id,
        experimentName: experiment.name,
        variant: variant.name,
        config: variant.config,
        assignedAt: newAssignment.assignedAt!,
      };

      // Cache for 1 hour (if Redis is available)
      if (this.redis) {
        await this.redis.setex(cacheKey, 3600, JSON.stringify(assignment));
      }

      // Track impression event
      await this.trackEvent(experiment.name, assignment.variant, 'impression', userContext);

      return assignment;
    } catch (error) {
      console.error('Error getting experiment assignment:', error);
      return null;
    }
  }

  /**
   * Get multiple experiment assignments for a user
   */
  async getMultipleAssignments(
    experimentNames: string[],
    userContext: UserContext
  ): Promise<Record<string, ExperimentAssignment>> {
    const assignments: Record<string, ExperimentAssignment> = {};

    for (const experimentName of experimentNames) {
      const assignment = await this.getAssignment(experimentName, userContext);
      if (assignment) {
        assignments[experimentName] = assignment;
      }
    }

    return assignments;
  }

  /**
   * Track experiment event
   */
  async trackEvent(
    experimentName: string,
    variant: string,
    eventType: string,
    userContext: UserContext,
    eventValue?: number,
    eventProperties?: Record<string, any>
  ): Promise<boolean> {
    try {
      const experiment = await this.getExperiment(experimentName);
      if (!experiment) return false;

      await db.insert(experimentEvents).values({
        experimentId: experiment.id,
        userId: userContext.userId,
        sessionId: userContext.sessionId,
        variant,
        eventType,
        eventValue: eventValue?.toString(),
        eventProperties,
      });

      return true;
    } catch (error) {
      console.error('Error tracking experiment event:', error);
      return false;
    }
  }

  /**
   * Get experiment results
   */
  async getExperimentResults(experimentName: string): Promise<{
    experiment: any;
    results: ExperimentResult[];
    statisticalSignificance?: boolean;
    winner?: string;
  } | null> {
    try {
      const experiment = await this.getExperiment(experimentName);
      if (!experiment) return null;

      // Get results for each variant
      const results: ExperimentResult[] = [];

      for (const variant of experiment.variants) {
        const userCount = await db
          .select({
            count: sql<number>`count(DISTINCT COALESCE(${experimentAssignments.userId}, ${experimentAssignments.sessionId}))`,
          })
          .from(experimentAssignments)
          .where(
            and(
              eq(experimentAssignments.experimentId, experiment.id),
              eq(experimentAssignments.variant, variant.name)
            )
          );

        // Get primary metric conversions
        const primaryMetric = experiment.metrics.find((m: ExperimentMetric) => m.isPrimary);
        let conversions = 0;
        let totalValue = 0;

        if (primaryMetric) {
          const conversionData = await db
            .select({
              count: sql<number>`count(*)`,
              totalValue: sql<number>`sum(COALESCE(${experimentEvents.eventValue}, 0))`,
            })
            .from(experimentEvents)
            .where(
              and(
                eq(experimentEvents.experimentId, experiment.id),
                eq(experimentEvents.variant, variant.name),
                eq(experimentEvents.eventType, primaryMetric.eventType)
              )
            );

          conversions = conversionData[0]?.count || 0;
          totalValue = conversionData[0]?.totalValue || 0;
        }

        const users = userCount[0]?.count || 0;
        const conversionRate = users > 0 ? (conversions / users) * 100 : 0;
        const averageValue = conversions > 0 ? totalValue / conversions : 0;

        results.push({
          variant: variant.name,
          users,
          conversions,
          conversionRate,
          averageValue,
          totalValue,
        });
      }

      // Calculate statistical significance (simplified chi-square test)
      const statisticalSignificance = this.calculateStatisticalSignificance(results);
      const winner = statisticalSignificance ? this.determineWinner(results) : undefined;

      return {
        experiment,
        results,
        statisticalSignificance,
        winner,
      };
    } catch (error) {
      console.error('Error getting experiment results:', error);
      return null;
    }
  }

  /**
   * Create new experiment
   */
  async createExperiment(experiment: {
    name: string;
    description?: string;
    featureFlag?: string;
    variants: ExperimentVariant[];
    metrics: ExperimentMetric[];
    targetingRules?: TargetingRule[];
    trafficAllocation?: number;
    createdBy: string;
  }): Promise<number | null> {
    try {
      const [created] = await db
        .insert(experiments)
        .values({
          name: experiment.name,
          description: experiment.description,
          featureFlag: experiment.featureFlag,
          variants: experiment.variants,
          metrics: experiment.metrics,
          targetingRules: experiment.targetingRules || [],
          trafficAllocation: experiment.trafficAllocation?.toString() || '100.00',
          createdBy: experiment.createdBy,
        })
        .returning({ id: experiments.id });

      // Clear experiment cache (if Redis is available)
      if (this.redis) {
        await this.redis.del(`${this.experimentCacheKey}:${experiment.name}`);
      }

      return created.id;
    } catch (error) {
      console.error('Error creating experiment:', error);
      return null;
    }
  }

  /**
   * Start experiment
   */
  async startExperiment(experimentName: string): Promise<boolean> {
    try {
      await db
        .update(experiments)
        .set({
          status: 'running',
          startDate: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(experiments.name, experimentName));

      // Clear cache (if Redis is available)
      if (this.redis) {
        await this.redis.del(`${this.experimentCacheKey}:${experimentName}`);
      }

      return true;
    } catch (error) {
      console.error('Error starting experiment:', error);
      return false;
    }
  }

  /**
   * Stop experiment
   */
  async stopExperiment(experimentName: string, winnerVariant?: string): Promise<boolean> {
    try {
      await db
        .update(experiments)
        .set({
          status: 'completed',
          endDate: new Date(),
          winnerVariant,
          updatedAt: new Date(),
        })
        .where(eq(experiments.name, experimentName));

      // Clear cache (if Redis is available)
      if (this.redis) {
        await this.redis.del(`${this.experimentCacheKey}:${experimentName}`);
      }

      return true;
    } catch (error) {
      console.error('Error stopping experiment:', error);
      return false;
    }
  }

  /**
   * Get experiment by name (with caching)
   */
  private async getExperiment(name: string): Promise<any> {
    const cacheKey = `${this.experimentCacheKey}:${name}`;
    const cached = this.redis ? await this.redis.get(cacheKey) : null;

    if (cached) {
      return JSON.parse(cached);
    }

    const [experiment] = await db
      .select()
      .from(experiments)
      .where(eq(experiments.name, name))
      .limit(1);

    if (experiment) {
      // Cache for 10 minutes (if Redis is available)
      if (this.redis) {
        await this.redis.setex(cacheKey, 600, JSON.stringify(experiment));
      }
    }

    return experiment;
  }

  /**
   * Check if user matches targeting rules
   */
  private matchesTargeting(experiment: any, userContext: UserContext): boolean {
    if (!experiment.targetingRules || experiment.targetingRules.length === 0) {
      return true; // No targeting rules means everyone is eligible
    }

    for (const rule of experiment.targetingRules) {
      if (!this.evaluateTargetingRule(rule, userContext)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Evaluate individual targeting rule
   */
  private evaluateTargetingRule(rule: TargetingRule, userContext: UserContext): boolean {
    let propertyValue: any;

    if (rule.type === 'user_property') {
      propertyValue =
        userContext.properties?.[rule.property!] || (userContext as any)[rule.property!];
    } else if (rule.type === 'session_property') {
      propertyValue = userContext.properties?.[rule.property!];
    } else if (rule.type === 'random') {
      return Math.random() < (rule.value as number);
    }

    switch (rule.operator) {
      case 'equals':
        return propertyValue === rule.value;
      case 'not_equals':
        return propertyValue !== rule.value;
      case 'in':
        return Array.isArray(rule.value) && rule.value.includes(propertyValue);
      case 'not_in':
        return !Array.isArray(rule.value) || !rule.value.includes(propertyValue);
      case 'greater_than':
        return propertyValue > rule.value;
      case 'less_than':
        return propertyValue < rule.value;
      case 'contains':
        return propertyValue && propertyValue.toString().includes(rule.value);
      default:
        return false;
    }
  }

  /**
   * Check if user is in traffic allocation
   */
  private isInTrafficAllocation(experiment: any, userContext: UserContext): boolean {
    const allocation = parseFloat(experiment.trafficAllocation);
    if (allocation >= 100) return true;

    const hash = this.hashUserContext(userContext);
    return hash * 100 < allocation;
  }

  /**
   * Assign variant to user
   */
  private assignVariant(experiment: any, userContext: UserContext): ExperimentVariant {
    const variants = experiment.variants;
    const hash = this.hashUserContext(userContext);

    let cumulativeAllocation = 0;
    for (const variant of variants) {
      cumulativeAllocation += variant.trafficAllocation;
      if (hash * 100 < cumulativeAllocation) {
        return variant;
      }
    }

    // Fallback to first variant
    return variants[0];
  }

  /**
   * Get variant configuration
   */
  private getVariantConfig(experiment: any, variantName: string): Record<string, any> | undefined {
    const variant = experiment.variants.find((v: ExperimentVariant) => v.name === variantName);
    return variant?.config;
  }

  /**
   * Hash user context for consistent bucketing
   */
  private hashUserContext(userContext: UserContext): number {
    const identifier = userContext.userId || userContext.sessionId || 'anonymous';
    let hash = 0;
    for (let i = 0; i < identifier.length; i++) {
      const char = identifier.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash) / 2147483647; // Normalize to 0-1
  }

  /**
   * Calculate statistical significance (simplified)
   */
  private calculateStatisticalSignificance(results: ExperimentResult[]): boolean {
    if (results.length < 2) return false;

    // Simplified check: need at least 100 users per variant and > 5% difference
    const hasEnoughUsers = results.every((r) => r.users >= 100);
    if (!hasEnoughUsers) return false;

    const rates = results.map((r) => r.conversionRate);
    const maxRate = Math.max(...rates);
    const minRate = Math.min(...rates);

    return maxRate - minRate > 5; // 5% difference threshold
  }

  /**
   * Determine winner variant
   */
  private determineWinner(results: ExperimentResult[]): string {
    return results.reduce((winner, current) =>
      current.conversionRate > winner.conversionRate ? current : winner
    ).variant;
  }

  /**
   * Get all active experiments for a user
   */
  async getActiveExperiments(userContext: UserContext): Promise<string[]> {
    try {
      const activeExperiments = await db
        .select({ name: experiments.name })
        .from(experiments)
        .where(eq(experiments.status, 'running'));

      return activeExperiments.map((e) => e.name);
    } catch (error) {
      console.error('Error getting active experiments:', error);
      return [];
    }
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<{ status: string; details: any }> {
    try {
      if (this.redis) {
        await this.redis.ping();
      }

      const stats = await db
        .select({
          totalExperiments: sql<number>`count(*)`,
          runningExperiments: sql<number>`count(case when status = 'running' then 1 end)`,
          totalAssignments: sql<number>`count(*) from ${experimentAssignments}`,
          totalEvents: sql<number>`count(*) from ${experimentEvents}`,
        })
        .from(experiments);

      return {
        status: 'healthy',
        details: {
          redis: this.redis ? 'connected' : 'unavailable',
          stats: stats[0],
        },
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        details: {
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      };
    }
  }
}

export const abTestingService = new ABTestingService();
