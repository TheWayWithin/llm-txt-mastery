/**
 * API Authentication and Rate Limiting Middleware
 *
 * Provides middleware for authenticating public API requests using API keys,
 * enforcing rate limits, and tracking usage for analytics/billing.
 *
 * SECURITY: API keys are validated against SHA-256 hashes stored in database.
 * Rate limit and usage data are tracked per API key.
 */
import { Request, Response, NextFunction } from 'express';
import { db } from '../db';
import { apiUsage, type ApiKey } from '@shared/schema';
import { validateApiKey, checkRateLimit } from '../utils/api-key-generator';

// Extend Express Request type to include API key data
declare global {
  namespace Express {
    interface Request {
      apiKey?: ApiKey;
      apiStartTime?: number;
    }
  }
}

// ===================================================================
// API KEY AUTHENTICATION
// ===================================================================

/**
 * Middleware to authenticate requests using API key from X-API-Key header
 * Validates the key and attaches the full apiKey object to req.apiKey
 */
export async function apiKeyAuth(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const apiKey = req.header('X-API-Key');

    if (!apiKey) {
      res.status(401).json({
        error: 'Unauthorized',
        code: 'MISSING_API_KEY',
        message: 'API key is required. Include X-API-Key header in your request.',
      });
      return;
    }

    // Validate API key using the utility function
    const validatedKey = await validateApiKey(apiKey);

    if (!validatedKey) {
      res.status(401).json({
        error: 'Unauthorized',
        code: 'INVALID_API_KEY',
        message: 'Invalid, inactive, or expired API key.',
      });
      return;
    }

    // Attach validated API key to request for downstream middleware/routes
    req.apiKey = validatedKey;
    next();
  } catch (error) {
    console.error('API key authentication error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      code: 'AUTH_ERROR',
      message: 'Failed to authenticate API key.',
    });
  }
}

// ===================================================================
// RATE LIMITING
// ===================================================================

/**
 * Middleware to enforce rate limits based on API key tier
 * Sets rate limit headers and returns 429 if limit exceeded
 */
export async function apiRateLimit(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.apiKey) {
      res.status(401).json({
        error: 'Unauthorized',
        code: 'NO_API_KEY',
        message: 'API key authentication required before rate limiting.',
      });
      return;
    }

    // Check rate limit using the utility function
    const rateLimitResult = await checkRateLimit(req.apiKey);

    // Set rate limit headers
    res.setHeader('X-RateLimit-Limit', rateLimitResult.allowed ? req.apiKey.rateLimit : 0);
    res.setHeader('X-RateLimit-Remaining', rateLimitResult.remaining);
    res.setHeader('X-RateLimit-Reset', rateLimitResult.resetAt.toISOString());

    if (!rateLimitResult.allowed) {
      const retryAfterSeconds = Math.ceil(
        (rateLimitResult.resetAt.getTime() - Date.now()) / 1000
      );
      res.setHeader('Retry-After', retryAfterSeconds);

      res.status(429).json({
        error: 'Too Many Requests',
        code: 'RATE_LIMIT_EXCEEDED',
        message: `Rate limit exceeded. Limit: ${req.apiKey.rateLimit} requests per hour.`,
        limit: req.apiKey.rateLimit,
        remaining: 0,
        retryAfter: retryAfterSeconds,
        resetAt: rateLimitResult.resetAt.toISOString(),
      });
      return;
    }

    next();
  } catch (error) {
    console.error('Rate limit check error:', error);
    // On rate limit check error, allow request but log
    next();
  }
}

// ===================================================================
// USAGE TRACKING
// ===================================================================

/**
 * Middleware to track API usage for analytics and billing
 * Records request details asynchronously (fire-and-forget)
 * Captures request start time for response time calculation
 */
export function trackApiUsage(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Capture start time for response time calculation
  req.apiStartTime = Date.now();

  // Track usage after response is sent (non-blocking)
  res.on('finish', () => {
    // Only track if we have a valid API key
    if (!req.apiKey || !req.apiStartTime) {
      return;
    }

    const responseTime = Date.now() - req.apiStartTime;
    const requestSize = parseInt(req.header('content-length') || '0', 10);
    const responseSize = parseInt(
      (res.getHeader('content-length') as string) || '0',
      10
    );

    // Insert usage record asynchronously (fire-and-forget)
    // We don't await this to avoid slowing down response
    db.insert(apiUsage)
      .values({
        apiKeyId: req.apiKey.id,
        endpoint: req.path,
        method: req.method,
        statusCode: res.statusCode,
        responseTime,
        requestSize: requestSize || null,
        responseSize: responseSize || null,
        errorMessage: res.statusCode >= 400 ? res.statusMessage || null : null,
        ipAddress: req.ip || req.socket.remoteAddress || null,
        userAgent: req.header('user-agent') || null,
      })
      .catch((error) => {
        // Log but don't throw - usage tracking should not block requests
        console.error('Failed to track API usage:', error);
      });
  });

  next();
}

// ===================================================================
// COMBINED MIDDLEWARE CHAINS
// ===================================================================

/**
 * Combined middleware chain for public API v1 routes
 * Use this for convenience: app.use('/api/v1', apiAuthChain)
 */
export const apiAuthChain = [apiKeyAuth, apiRateLimit, trackApiUsage];

/**
 * Lightweight chain without rate limiting (for health/status endpoints)
 */
export const apiAuthOnly = [apiKeyAuth, trackApiUsage];

// ===================================================================
// TIER VALIDATION
// ===================================================================

/**
 * Middleware factory to require a specific API key tier
 */
export function requireApiTier(requiredTier: 'free' | 'partner' | 'enterprise') {
  const tierLevels = {
    free: 0,
    partner: 1,
    enterprise: 2,
  };

  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.apiKey) {
      return res.status(401).json({
        error: 'Unauthorized',
        code: 'NO_API_KEY',
        message: 'API key authentication required.',
      });
    }

    const keyTierLevel = tierLevels[req.apiKey.tier as keyof typeof tierLevels] ?? 0;
    const requiredTierLevel = tierLevels[requiredTier];

    if (keyTierLevel < requiredTierLevel) {
      return res.status(403).json({
        error: 'Forbidden',
        code: 'INSUFFICIENT_TIER',
        message: `API key tier '${requiredTier}' or higher required.`,
        currentTier: req.apiKey.tier,
        requiredTier,
      });
    }

    next();
  };
}

// ===================================================================
// ERROR HANDLING
// ===================================================================

/**
 * Error handler for API authentication errors
 */
export function handleApiAuthError(
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  if (error.name === 'ApiKeyError' || error.message.includes('API key')) {
    res.status(401).json({
      error: 'Authentication Failed',
      code: 'API_KEY_ERROR',
      message: error.message,
    });
    return;
  }

  next(error);
}

// ===================================================================
// LEGACY/CONVENIENCE EXPORTS
// ===================================================================

export const requirePartnerTier = [apiKeyAuth, requireApiTier('partner')];
export const requireEnterpriseTier = [apiKeyAuth, requireApiTier('enterprise')];
