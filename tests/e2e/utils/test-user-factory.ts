import { generateTempEmail } from './temp-email-service';
import { TEST_USER_TEMPLATES, TIER_CONFIGS } from './uat-test-data';

/**
 * Test User Factory
 * Creates and manages test users for different tiers
 */

export interface TestUser {
  email: string;
  password: string;
  tier: string;
  credits?: number;
  dailyLimit?: number;
  subscriptionId?: string;
  stripeCustomerId?: string;
  createdAt: Date;
  features: string[];
  metadata: Record<string, any>;
}

export class TestUserFactory {
  private static instance: TestUserFactory;
  private users: Map<string, TestUser> = new Map();
  private usedEmails: Set<string> = new Set();

  private constructor() {}

  static getInstance(): TestUserFactory {
    if (!TestUserFactory.instance) {
      TestUserFactory.instance = new TestUserFactory();
    }
    return TestUserFactory.instance;
  }

  /**
   * Create a test user for a specific tier
   */
  async createUser(tier: 'free' | 'solo' | 'growth' | 'scale'): Promise<TestUser> {
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(2, 8);
    const template = TEST_USER_TEMPLATES[tier];
    const config = TIER_CONFIGS[tier === 'free' ? 'starter' : tier];

    // Generate unique email
    const email = template.emailPattern.replace('{id}', `${timestamp}-${randomId}`);
    
    // Ensure email is unique
    if (this.usedEmails.has(email)) {
      return this.createUser(tier); // Retry with new timestamp
    }
    
    this.usedEmails.add(email);

    const user: TestUser = {
      email,
      password: template.password,
      tier,
      createdAt: new Date(),
      features: template.expectedFeatures,
      metadata: {
        testRun: timestamp,
        environment: process.env.TEST_ENV || 'development',
      },
    };

    // Add tier-specific properties
    switch (tier) {
      case 'solo':
        user.dailyLimit = config.dailyLimit;
        user.metadata.purchaseDate = new Date();
        user.metadata.refundEligible = true;
        user.metadata.monthlyLimit = config.monthlyLimit;
        break;

      case 'growth':
      case 'scale':
        user.dailyLimit = config.dailyLimit;
        user.subscriptionId = `sub_test_${randomId}`;
        user.stripeCustomerId = `cus_test_${randomId}`;
        user.metadata.billingCycle = 'monthly';
        user.metadata.nextBillingDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
        user.metadata.monthlyLimit = config.monthlyLimit;
        break;

      default: // free tier
        user.dailyLimit = config.dailyLimit;
    }

    // Store user for later retrieval
    this.users.set(email, user);

    return user;
  }

  /**
   * Create multiple users of the same tier
   */
  async createMultipleUsers(tier: 'free' | 'solo' | 'growth' | 'scale', count: number): Promise<TestUser[]> {
    const users: TestUser[] = [];
    
    for (let i = 0; i < count; i++) {
      const user = await this.createUser(tier);
      users.push(user);
    }
    
    return users;
  }

  /**
   * Create a complete set of test users (one for each tier)
   */
  async createTestUserSet(): Promise<{
    free: TestUser;
    solo: TestUser;
    growth: TestUser;
    scale: TestUser;
  }> {
    const [free, solo, growth, scale] = await Promise.all([
      this.createUser('free'),
      this.createUser('solo'),
      this.createUser('growth'),
      this.createUser('scale'),
    ]);

    return { free, solo, growth, scale };
  }

  /**
   * Get an existing test user by email
   */
  getUser(email: string): TestUser | undefined {
    return this.users.get(email);
  }

  /**
   * Get all users of a specific tier
   */
  getUsersByTier(tier: string): TestUser[] {
    return Array.from(this.users.values()).filter(user => user.tier === tier);
  }

  /**
   * Update user properties (simulating actions in the app)
   */
  updateUser(email: string, updates: Partial<TestUser>): TestUser | null {
    const user = this.users.get(email);
    if (!user) return null;

    const updatedUser = { ...user, ...updates };
    this.users.set(email, updatedUser);
    return updatedUser;
  }

  /**
   * Simulate daily limit consumption (Solo tier)
   */
  consumeDailyUsage(email: string): boolean {
    const user = this.users.get(email);
    if (!user || user.tier !== 'solo') {
      return false;
    }

    const today = new Date().toDateString();
    const dailyUsage = user.metadata.dailyUsage || {};
    const todayUsage = dailyUsage[today] || 0;

    if (todayUsage < (user.dailyLimit || 0)) {
      dailyUsage[today] = todayUsage + 1;
      user.metadata.dailyUsage = dailyUsage;
      this.users.set(email, user);
      return true;
    }

    return false;
  }

  /**
   * Simulate daily limit consumption
   */
  consumeDailyAnalysis(email: string): boolean {
    const user = this.users.get(email);
    if (!user || !user.dailyLimit) {
      return false;
    }

    const today = new Date().toDateString();
    const dailyUsage = user.metadata.dailyUsage || {};
    const todayUsage = dailyUsage[today] || 0;

    if (todayUsage < user.dailyLimit) {
      dailyUsage[today] = todayUsage + 1;
      user.metadata.dailyUsage = dailyUsage;
      this.users.set(email, user);
      return true;
    }

    return false;
  }

  /**
   * Check if user has reached daily limit
   */
  hasReachedDailyLimit(email: string): boolean {
    const user = this.users.get(email);
    if (!user || !user.dailyLimit) {
      return false;
    }

    const today = new Date().toDateString();
    const dailyUsage = user.metadata.dailyUsage || {};
    const todayUsage = dailyUsage[today] || 0;

    return todayUsage >= user.dailyLimit;
  }

  /**
   * Reset daily limits (for new day simulation)
   */
  resetDailyLimits(): void {
    this.users.forEach(user => {
      if (user.metadata.dailyUsage) {
        user.metadata.dailyUsage = {};
      }
    });
  }

  /**
   * Simulate subscription cancellation
   */
  cancelSubscription(email: string): boolean {
    const user = this.users.get(email);
    if (!user || !user.subscriptionId) {
      return false;
    }

    user.metadata.subscriptionStatus = 'canceled';
    user.metadata.canceledAt = new Date();
    user.metadata.activeUntil = user.metadata.nextBillingDate;
    this.users.set(email, user);
    
    return true;
  }

  /**
   * Simulate refund processing (Solo tier)
   */
  processRefund(email: string): boolean {
    const user = this.users.get(email);
    if (!user || user.tier !== 'solo') {
      return false;
    }

    // Check 30-day guarantee
    const purchaseDate = user.metadata.purchaseDate;
    if (!purchaseDate) return false;

    const daysSincePurchase = Math.floor((Date.now() - purchaseDate.getTime()) / (1000 * 60 * 60 * 24));
    if (daysSincePurchase > 30) {
      return false;
    }

    user.metadata.refunded = true;
    user.metadata.refundedAt = new Date();
    user.dailyLimit = 0;
    this.users.set(email, user);

    return true;
  }

  /**
   * Generate test user with specific properties
   */
  async createCustomUser(properties: Partial<TestUser>): Promise<TestUser> {
    const email = properties.email || generateTempEmail();
    const tier = properties.tier || 'free';
    
    const baseUser = await this.createUser(tier as any);
    const customUser = { ...baseUser, ...properties, email };
    
    this.users.set(email, customUser);
    this.usedEmails.add(email);
    
    return customUser;
  }

  /**
   * Clean up test users (for test teardown)
   */
  cleanup(): void {
    this.users.clear();
    this.usedEmails.clear();
  }

  /**
   * Get statistics about created test users
   */
  getStatistics(): {
    totalUsers: number;
    byTier: Record<string, number>;
    withSubscriptions: number;
    withDailyLimits: number;
    refunded: number;
    canceled: number;
  } {
    const stats = {
      totalUsers: this.users.size,
      byTier: {} as Record<string, number>,
      withSubscriptions: 0,
      withDailyLimits: 0,
      refunded: 0,
      canceled: 0,
    };

    this.users.forEach(user => {
      // Count by tier
      stats.byTier[user.tier] = (stats.byTier[user.tier] || 0) + 1;

      // Count subscriptions
      if (user.subscriptionId) stats.withSubscriptions++;

      // Count daily limits
      if (user.dailyLimit && user.dailyLimit > 0) stats.withDailyLimits++;

      // Count refunds
      if (user.metadata.refunded) stats.refunded++;

      // Count cancellations
      if (user.metadata.subscriptionStatus === 'canceled') stats.canceled++;
    });

    return stats;
  }

  /**
   * Export users for reporting
   */
  exportUsers(): TestUser[] {
    return Array.from(this.users.values());
  }

  /**
   * Import users from previous test run
   */
  importUsers(users: TestUser[]): void {
    users.forEach(user => {
      this.users.set(user.email, user);
      this.usedEmails.add(user.email);
    });
  }
}

// Convenience functions for quick user creation

/**
 * Create a standard set of test users for UAT
 */
export async function createTestUsers(): Promise<{
  free: TestUser;
  solo: TestUser;
  growth: TestUser;
  scale: TestUser;
}> {
  const factory = TestUserFactory.getInstance();
  return factory.createTestUserSet();
}

/**
 * Create a single test user
 */
export async function createTestUser(tier: 'free' | 'solo' | 'growth' | 'scale'): Promise<TestUser> {
  const factory = TestUserFactory.getInstance();
  return factory.createUser(tier);
}

/**
 * Create multiple test users
 */
export async function createMultipleTestUsers(
  tier: 'free' | 'solo' | 'growth' | 'scale',
  count: number
): Promise<TestUser[]> {
  const factory = TestUserFactory.getInstance();
  return factory.createMultipleUsers(tier, count);
}

/**
 * Clean up all test users
 */
export function cleanupTestUsers(): void {
  const factory = TestUserFactory.getInstance();
  factory.cleanup();
}

/**
 * Get test user statistics
 */
export function getTestUserStatistics() {
  const factory = TestUserFactory.getInstance();
  return factory.getStatistics();
}

// Test user presets for common scenarios

export const TEST_USER_SCENARIOS = {
  // User who just signed up
  newUser: {
    tier: 'free',
    metadata: {
      isNew: true,
      onboardingCompleted: false,
    },
  },

  // User at their daily limit
  limitReached: {
    tier: 'free',
    metadata: {
      dailyUsage: {
        [new Date().toDateString()]: 1,
      },
    },
  },

  // Solo user approaching daily limit
  approachingLimit: {
    tier: 'solo',
    dailyLimit: 35,
    metadata: {
      dailyUsage: {
        [new Date().toDateString()]: 30,
      },
      warningShown: false,
    },
  },

  // User eligible for refund
  refundEligible: {
    tier: 'solo',
    dailyLimit: 35,
    metadata: {
      purchaseDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), // 10 days ago
      refundEligible: true,
    },
  },

  // User past refund period
  refundIneligible: {
    tier: 'solo',
    dailyLimit: 35,
    metadata: {
      purchaseDate: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000), // 35 days ago
      refundEligible: false,
    },
  },

  // Active subscriber
  activeSubscriber: {
    tier: 'growth',
    dailyLimit: 20,
    metadata: {
      subscriptionStatus: 'active',
      billingCycle: 'monthly',
    },
  },

  // Canceled subscriber (still active)
  canceledSubscriber: {
    tier: 'growth',
    dailyLimit: 20,
    metadata: {
      subscriptionStatus: 'canceled',
      activeUntil: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
    },
  },

  // Trial user (future feature)
  trialUser: {
    tier: 'growth',
    dailyLimit: 20,
    metadata: {
      isTrial: true,
      trialEndsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  },

  // Power user
  powerUser: {
    tier: 'scale',
    dailyLimit: 100,
    metadata: {
      totalAnalyses: 1500,
      memberSince: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000),
    },
  },

  // User with payment issues
  paymentFailed: {
    tier: 'growth',
    dailyLimit: 0, // Limited due to payment failure
    metadata: {
      subscriptionStatus: 'past_due',
      paymentFailedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
    },
  },
};