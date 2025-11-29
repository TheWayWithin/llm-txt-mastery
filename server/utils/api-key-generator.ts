/**
 * API Key Generation and Validation Utility
 * SECURITY: Never store plain-text keys, only SHA-256 hashes
 *
 * This module provides secure API key generation, validation, and management
 * for the LLM.txt Mastery public API.
 */
import crypto from 'crypto';
import { db } from '../db';
import { apiKeys, apiUsage, type ApiKey, type NewApiKey, type ApiConsumerTier } from '@shared/schema';
import { eq, and, gte, sql } from 'drizzle-orm';

// ===================================================================
// API KEY GENERATION
// ===================================================================

export interface CreateApiKeyParams {
  name: string;
  consumer: string;
  tier?: ApiConsumerTier;
  rateLimit?: number;
  expiresAt?: Date;
  metadata?: Record<string, unknown>;
}

export interface CreateApiKeyResult {
  rawKey: string;    // Only returned once - user must save this!
  apiKey: ApiKey;    // Database record
}

/**
 * Generate a secure API key with SHA-256 hashing
 * SECURITY: Raw key is only returned ONCE - user must save it immediately
 *
 * @param params - API key creation parameters
 * @returns The raw key (once!) and the database record
 */
export async function generateApiKey(params: CreateApiKeyParams): Promise<CreateApiKeyResult> {
  try {
    // Generate secure random key: 32 bytes = 64 hex chars
    const randomBytes = crypto.randomBytes(32);
    const rawKey = `llmtxt_${randomBytes.toString('hex')}`;

    // Hash the key with SHA-256 for storage (NEVER store plain text)
    const keyHash = crypto
      .createHash('sha256')
      .update(rawKey)
      .digest('hex');

    // Extract prefix for display (e.g., "llmtxt_abc123def...")
    // Show first 18 chars of 71-char key (llmtxt_ + 64 hex)
    const keyPrefix = `${rawKey.substring(0, 18)}...`;

    // Determine rate limit based on tier if not explicitly provided
    const rateLimit = params.rateLimit ?? getTierRateLimit(params.tier || 'free');

    // Prepare insert data matching our schema
    const insertData: NewApiKey = {
      name: params.name,
      keyHash,
      keyPrefix,
      consumer: params.consumer,
      tier: params.tier || 'free',
      rateLimit,
      isActive: true,
      expiresAt: params.expiresAt ?? null,
      metadata: params.metadata ?? null,
    };

    // Insert into database
    const [apiKey] = await db
      .insert(apiKeys)
      .values(insertData)
      .returning();

    if (!apiKey) {
      throw new Error('Failed to create API key - database insert returned no result');
    }

    console.log(`✅ API key created: ${keyPrefix} for consumer '${params.consumer}'`);

    // Return raw key ONCE (user must save it) + database record
    return { rawKey, apiKey };
  } catch (error) {
    console.error('Error generating API key:', error);
    throw new Error(`Failed to generate API key: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// ===================================================================
// API KEY VALIDATION
// ===================================================================

/**
 * Validate an API key and update last used timestamp
 * SECURITY: Hashes provided key and compares hash in database
 *
 * @param rawKey - The raw API key string (starts with llmtxt_)
 * @returns The ApiKey record if valid, null otherwise
 */
export async function validateApiKey(rawKey: string): Promise<ApiKey | null> {
  try {
    // Basic format validation
    if (!rawKey || !rawKey.startsWith('llmtxt_')) {
      return null;
    }

    // Hash the provided key
    const keyHash = crypto
      .createHash('sha256')
      .update(rawKey)
      .digest('hex');

    // Look up in database
    const [apiKey] = await db
      .select()
      .from(apiKeys)
      .where(
        and(
          eq(apiKeys.keyHash, keyHash),
          eq(apiKeys.isActive, true)
        )
      )
      .limit(1);

    if (!apiKey) {
      return null;
    }

    // Check expiration
    if (apiKey.expiresAt && new Date(apiKey.expiresAt) < new Date()) {
      console.log(`API key ${apiKey.keyPrefix} has expired`);
      return null;
    }

    // Update last used timestamp (fire and forget for performance)
    db.update(apiKeys)
      .set({ lastUsedAt: new Date() })
      .where(eq(apiKeys.id, apiKey.id))
      .catch(err => console.error('Failed to update lastUsedAt:', err));

    return apiKey;
  } catch (error) {
    console.error('Error validating API key:', error);
    return null;
  }
}

// ===================================================================
// API KEY MANAGEMENT
// ===================================================================

/**
 * Deactivate an API key (soft delete)
 * The key remains in the database but is marked as inactive
 *
 * @param id - The API key ID to deactivate
 * @returns true if successful, false otherwise
 */
export async function deactivateApiKey(id: number): Promise<boolean> {
  try {
    const [result] = await db
      .update(apiKeys)
      .set({ isActive: false })
      .where(eq(apiKeys.id, id))
      .returning();

    if (result) {
      console.log(`✅ API key ${result.keyPrefix} deactivated`);
    }

    return !!result;
  } catch (error) {
    console.error('Error deactivating API key:', error);
    return false;
  }
}

/**
 * Reactivate a previously deactivated API key
 *
 * @param id - The API key ID to reactivate
 * @returns true if successful, false otherwise
 */
export async function reactivateApiKey(id: number): Promise<boolean> {
  try {
    const [result] = await db
      .update(apiKeys)
      .set({ isActive: true })
      .where(eq(apiKeys.id, id))
      .returning();

    if (result) {
      console.log(`✅ API key ${result.keyPrefix} reactivated`);
    }

    return !!result;
  } catch (error) {
    console.error('Error reactivating API key:', error);
    return false;
  }
}

/**
 * Get all API keys for a specific consumer
 *
 * @param consumer - The consumer name to filter by
 * @returns Array of ApiKey records (without sensitive data)
 */
export async function getApiKeysByConsumer(consumer: string): Promise<ApiKey[]> {
  try {
    const keys = await db
      .select()
      .from(apiKeys)
      .where(eq(apiKeys.consumer, consumer));

    return keys;
  } catch (error) {
    console.error('Error fetching API keys by consumer:', error);
    return [];
  }
}

// ===================================================================
// USAGE STATISTICS
// ===================================================================

export interface ApiKeyStats {
  totalRequests: number;
  requestsThisHour: number;
  averageResponseTime: number;
  errorRate: number;
  lastUsed: Date | null;
}

/**
 * Get usage statistics for an API key
 *
 * @param id - The API key ID
 * @returns Usage statistics or null if not found
 */
export async function getApiKeyStats(id: number): Promise<ApiKeyStats | null> {
  try {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

    // Get the API key to check if it exists and get lastUsedAt
    const [apiKey] = await db
      .select()
      .from(apiKeys)
      .where(eq(apiKeys.id, id))
      .limit(1);

    if (!apiKey) {
      return null;
    }

    // Get all-time stats
    const [allTimeStats] = await db
      .select({
        totalRequests: sql<number>`COUNT(*)::integer`,
        totalResponseTime: sql<number>`COALESCE(SUM(${apiUsage.responseTime}), 0)::integer`,
        totalErrors: sql<number>`COUNT(*) FILTER (WHERE ${apiUsage.statusCode} >= 400)::integer`,
      })
      .from(apiUsage)
      .where(eq(apiUsage.apiKeyId, id));

    // Get hourly stats
    const [hourlyStats] = await db
      .select({
        requestsThisHour: sql<number>`COUNT(*)::integer`,
      })
      .from(apiUsage)
      .where(
        and(
          eq(apiUsage.apiKeyId, id),
          gte(apiUsage.timestamp, oneHourAgo)
        )
      );

    const totalRequests = Number(allTimeStats?.totalRequests ?? 0);
    const totalResponseTime = Number(allTimeStats?.totalResponseTime ?? 0);
    const totalErrors = Number(allTimeStats?.totalErrors ?? 0);
    const requestsThisHour = Number(hourlyStats?.requestsThisHour ?? 0);

    const averageResponseTime = totalRequests > 0
      ? Math.round(totalResponseTime / totalRequests)
      : 0;

    const errorRate = totalRequests > 0
      ? Math.round((totalErrors / totalRequests) * 10000) / 100 // Round to 2 decimals
      : 0;

    return {
      totalRequests,
      requestsThisHour,
      averageResponseTime,
      errorRate,
      lastUsed: apiKey.lastUsedAt,
    };
  } catch (error) {
    console.error('Error fetching API key stats:', error);
    return null;
  }
}

// ===================================================================
// RATE LIMIT CHECKING
// ===================================================================

/**
 * Check if an API key has exceeded its rate limit
 *
 * @param apiKey - The validated API key record
 * @returns { allowed: boolean, remaining: number, resetAt: Date }
 */
export async function checkRateLimit(apiKey: ApiKey): Promise<{
  allowed: boolean;
  remaining: number;
  resetAt: Date;
}> {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const resetAt = new Date(oneHourAgo.getTime() + 60 * 60 * 1000);

  try {
    const [stats] = await db
      .select({
        count: sql<number>`COUNT(*)::integer`,
      })
      .from(apiUsage)
      .where(
        and(
          eq(apiUsage.apiKeyId, apiKey.id),
          gte(apiUsage.timestamp, oneHourAgo)
        )
      );

    const currentCount = Number(stats?.count ?? 0);
    const remaining = Math.max(0, apiKey.rateLimit - currentCount);
    const allowed = currentCount < apiKey.rateLimit;

    return { allowed, remaining, resetAt };
  } catch (error) {
    console.error('Error checking rate limit:', error);
    // On error, allow the request but log it
    return {
      allowed: true,
      remaining: apiKey.rateLimit,
      resetAt
    };
  }
}

// ===================================================================
// HELPERS
// ===================================================================

/**
 * Get default rate limits by tier
 */
function getTierRateLimit(tier: ApiConsumerTier): number {
  const limits: Record<ApiConsumerTier, number> = {
    free: 100,        // 100 requests per hour
    partner: 1000,    // 1,000 requests per hour
    enterprise: 10000, // 10,000 requests per hour
  };
  return limits[tier];
}

/**
 * Generate a webhook secret for signature verification
 * Used when creating webhooks for API consumers
 */
export function generateWebhookSecret(): string {
  return `whsec_${crypto.randomBytes(32).toString('hex')}`;
}
