import { Redis } from 'ioredis';
import { redisClient } from './redis-client';

// Make Redis optional - don't crash if unavailable
const isRedisAvailable = () => {
  try {
    return redisClient && redisClient.status === 'ready';
  } catch {
    return false;
  }
};

export type FeatureFlagName =
  | 'clustering'
  | 'semantic_tags'
  | 'enhanced_descriptions'
  | 'multi_sequencing'
  | 'blockquote_summaries'
  | 'admin_dashboard'
  | 'performance_metrics';

export interface FeatureFlag {
  name: FeatureFlagName;
  enabled: boolean;
  rolloutPercentage: number; // 0-100
  environmentOverrides: Record<string, boolean>;
  userOverrides: Record<string, boolean>; // userId -> enabled
  metadata: {
    description: string;
    owner: string;
    createdAt: string;
    updatedAt: string;
    dependencies?: FeatureFlagName[];
    tags?: string[];
  };
}

export interface UserContext {
  userId?: number;
  email?: string;
  tier?: string;
  environment?: string;
}

class FeatureFlagService {
  private redis: Redis | null;
  private cacheKey = 'feature_flags';
  private cacheExpiry = 300; // 5 minutes
  private localCache = new Map<string, FeatureFlag>();
  private lastCacheUpdate = 0;

  constructor() {
    // Make Redis optional - use local cache if Redis unavailable
    try {
      this.redis = redisClient;
      console.log('Feature flags: Using Redis cache');
    } catch (error) {
      this.redis = null;
      console.log('Feature flags: Redis unavailable, using local cache only');
    }
    this.initializeDefaultFlags();
  }

  /**
   * Initialize default feature flags for semantic enhancements
   */
  private async initializeDefaultFlags(): Promise<void> {
    const defaultFlags: FeatureFlag[] = [
      {
        name: 'clustering',
        enabled: false,
        rolloutPercentage: 0,
        environmentOverrides: {
          development: true,
          staging: false,
          production: false,
        },
        userOverrides: {},
        metadata: {
          description: 'Semantic content clustering for better organization',
          owner: 'development-team',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          dependencies: [],
          tags: ['semantic', 'core'],
        },
      },
      {
        name: 'semantic_tags',
        enabled: false,
        rolloutPercentage: 0,
        environmentOverrides: {
          development: true,
          staging: false,
          production: false,
        },
        userOverrides: {},
        metadata: {
          description: 'AI-powered semantic tagging of content',
          owner: 'development-team',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          dependencies: [],
          tags: ['semantic', 'ai'],
        },
      },
      {
        name: 'enhanced_descriptions',
        enabled: false,
        rolloutPercentage: 0,
        environmentOverrides: {
          development: true,
          staging: false,
          production: false,
        },
        userOverrides: {},
        metadata: {
          description: 'Enhanced page descriptions with uniqueness validation',
          owner: 'development-team',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          dependencies: [],
          tags: ['semantic', 'content'],
        },
      },
      {
        name: 'multi_sequencing',
        enabled: false,
        rolloutPercentage: 0,
        environmentOverrides: {
          development: true,
          staging: false,
          production: false,
        },
        userOverrides: {},
        metadata: {
          description: 'Multiple content sequencing modes (logical, hierarchical, business)',
          owner: 'development-team',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          dependencies: ['clustering'],
          tags: ['semantic', 'ux'],
        },
      },
      {
        name: 'blockquote_summaries',
        enabled: false,
        rolloutPercentage: 0,
        environmentOverrides: {
          development: true,
          staging: false,
          production: false,
        },
        userOverrides: {},
        metadata: {
          description: 'AI-generated blockquote summaries for LLM.txt files',
          owner: 'development-team',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          dependencies: ['semantic_tags'],
          tags: ['semantic', 'ai', 'generation'],
        },
      },
      {
        name: 'admin_dashboard',
        enabled: false,
        rolloutPercentage: 0,
        environmentOverrides: {
          development: true,
          staging: true,
          production: false,
        },
        userOverrides: {},
        metadata: {
          description: 'Admin dashboard for feature flag management',
          owner: 'development-team',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          dependencies: [],
          tags: ['admin', 'infrastructure'],
        },
      },
      {
        name: 'performance_metrics',
        enabled: true,
        rolloutPercentage: 100,
        environmentOverrides: {},
        userOverrides: {},
        metadata: {
          description: 'Performance metrics collection for semantic features',
          owner: 'development-team',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          dependencies: [],
          tags: ['monitoring', 'performance'],
        },
      },
    ];

    // Initialize flags if they don't exist
    for (const flag of defaultFlags) {
      const exists = await this.redis.hexists(this.cacheKey, flag.name);
      if (!exists) {
        await this.redis.hset(this.cacheKey, flag.name, JSON.stringify(flag));
      }
    }
  }

  /**
   * Check if a feature flag is enabled for a specific user context
   */
  async isEnabled(flagName: FeatureFlagName, userContext?: UserContext): Promise<boolean> {
    const flag = await this.getFlag(flagName);
    if (!flag) return false;

    const environment = userContext?.environment || process.env.NODE_ENV || 'development';
    const userId = userContext?.userId?.toString();

    // Check environment overrides first
    if (flag.environmentOverrides[environment] !== undefined) {
      return flag.environmentOverrides[environment];
    }

    // Check user-specific overrides
    if (userId && flag.userOverrides[userId] !== undefined) {
      return flag.userOverrides[userId];
    }

    // Check if flag is globally enabled
    if (!flag.enabled) return false;

    // Check rollout percentage
    if (flag.rolloutPercentage === 100) return true;
    if (flag.rolloutPercentage === 0) return false;

    // Use consistent hashing for percentage rollout
    const hash = userId ? this.hashUserId(userId) : Math.random();
    return hash * 100 < flag.rolloutPercentage;
  }

  /**
   * Get all enabled features for a user context
   */
  async getEnabledFeatures(userContext?: UserContext): Promise<FeatureFlagName[]> {
    const flags = await this.getAllFlags();
    const enabledFeatures: FeatureFlagName[] = [];

    for (const flag of flags) {
      const enabled = await this.isEnabled(flag.name, userContext);
      if (enabled) {
        enabledFeatures.push(flag.name);
      }
    }

    return enabledFeatures;
  }

  /**
   * Get feature flag configuration
   */
  async getFlag(flagName: FeatureFlagName): Promise<FeatureFlag | null> {
    try {
      // Check local cache first
      const cacheKey = `flag_${flagName}`;
      const now = Date.now();

      if (this.localCache.has(cacheKey) && now - this.lastCacheUpdate < this.cacheExpiry * 1000) {
        return this.localCache.get(cacheKey) || null;
      }

      // Fetch from Redis
      const flagData = await this.redis.hget(this.cacheKey, flagName);
      if (!flagData) return null;

      const flag: FeatureFlag = JSON.parse(flagData);

      // Update local cache
      this.localCache.set(cacheKey, flag);
      this.lastCacheUpdate = now;

      return flag;
    } catch (error) {
      console.error(`Error retrieving feature flag ${flagName}:`, error);
      return null;
    }
  }

  /**
   * Get all feature flags
   */
  async getAllFlags(): Promise<FeatureFlag[]> {
    try {
      const flagsData = await this.redis.hgetall(this.cacheKey);
      const flags: FeatureFlag[] = [];

      for (const [name, data] of Object.entries(flagsData)) {
        try {
          flags.push(JSON.parse(data));
        } catch (error) {
          console.error(`Error parsing flag ${name}:`, error);
        }
      }

      return flags;
    } catch (error) {
      console.error('Error retrieving all feature flags:', error);
      return [];
    }
  }

  /**
   * Update a feature flag (admin operation)
   */
  async updateFlag(flagName: FeatureFlagName, updates: Partial<FeatureFlag>): Promise<boolean> {
    try {
      const existingFlag = await this.getFlag(flagName);
      if (!existingFlag) return false;

      const updatedFlag: FeatureFlag = {
        ...existingFlag,
        ...updates,
        name: flagName, // Ensure name doesn't change
        metadata: {
          ...existingFlag.metadata,
          ...updates.metadata,
          updatedAt: new Date().toISOString(),
        },
      };

      await this.redis.hset(this.cacheKey, flagName, JSON.stringify(updatedFlag));

      // Clear local cache
      this.localCache.delete(`flag_${flagName}`);

      return true;
    } catch (error) {
      console.error(`Error updating feature flag ${flagName}:`, error);
      return false;
    }
  }

  /**
   * Enable/disable flag for specific user
   */
  async setUserOverride(
    flagName: FeatureFlagName,
    userId: string,
    enabled: boolean
  ): Promise<boolean> {
    const flag = await this.getFlag(flagName);
    if (!flag) return false;

    flag.userOverrides[userId] = enabled;
    flag.metadata.updatedAt = new Date().toISOString();

    return await this.updateFlag(flagName, flag);
  }

  /**
   * Remove user override
   */
  async removeUserOverride(flagName: FeatureFlagName, userId: string): Promise<boolean> {
    const flag = await this.getFlag(flagName);
    if (!flag) return false;

    delete flag.userOverrides[userId];
    flag.metadata.updatedAt = new Date().toISOString();

    return await this.updateFlag(flagName, flag);
  }

  /**
   * Get feature flag stats
   */
  async getStats(): Promise<{
    totalFlags: number;
    enabledFlags: number;
    rolloutFlags: number;
    userOverrides: number;
  }> {
    const flags = await this.getAllFlags();

    return {
      totalFlags: flags.length,
      enabledFlags: flags.filter((f) => f.enabled).length,
      rolloutFlags: flags.filter((f) => f.rolloutPercentage > 0 && f.rolloutPercentage < 100)
        .length,
      userOverrides: flags.reduce((sum, f) => sum + Object.keys(f.userOverrides).length, 0),
    };
  }

  /**
   * Check feature dependencies
   */
  async checkDependencies(
    flagName: FeatureFlagName,
    userContext?: UserContext
  ): Promise<{
    canEnable: boolean;
    missingDependencies: FeatureFlagName[];
  }> {
    const flag = await this.getFlag(flagName);
    if (!flag || !flag.metadata.dependencies) {
      return { canEnable: true, missingDependencies: [] };
    }

    const missingDependencies: FeatureFlagName[] = [];

    for (const dependency of flag.metadata.dependencies) {
      const dependencyEnabled = await this.isEnabled(dependency, userContext);
      if (!dependencyEnabled) {
        missingDependencies.push(dependency);
      }
    }

    return {
      canEnable: missingDependencies.length === 0,
      missingDependencies,
    };
  }

  /**
   * Hash user ID for consistent percentage rollout
   */
  private hashUserId(userId: string): number {
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
      const char = userId.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash) / 2147483647; // Normalize to 0-1
  }

  /**
   * Clear all caches
   */
  async clearCache(): Promise<void> {
    this.localCache.clear();
    this.lastCacheUpdate = 0;
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<{ status: 'healthy' | 'degraded' | 'unhealthy'; details: any }> {
    try {
      await this.redis.ping();
      const stats = await this.getStats();

      return {
        status: 'healthy',
        details: {
          redis: 'connected',
          cacheSize: this.localCache.size,
          lastCacheUpdate: new Date(this.lastCacheUpdate).toISOString(),
          stats,
        },
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        details: {
          error: error instanceof Error ? error.message : 'Unknown error',
          redis: 'disconnected',
        },
      };
    }
  }
}

export const featureFlagService = new FeatureFlagService();

// React hook for frontend usage
export interface UseFeatureFlagsReturn {
  flags: Record<FeatureFlagName, boolean>;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}
