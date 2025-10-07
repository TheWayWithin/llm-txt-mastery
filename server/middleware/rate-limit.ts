import rateLimit from 'express-rate-limit';
import type { Request, Response } from 'express';

// General API rate limiting - Balanced for security and usability
export const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 60, // Limit each IP to 60 requests per minute (balanced for normal usage)
  message: {
    error: 'Too many requests from this IP, please try again later.',
    retryAfter: '1 minute',
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  trustProxy: true, // Trust Railway proxy
  handler: (req: Request, res: Response) => {
    // Log rate limit violations for security monitoring
    console.warn(`🚨 Rate limit exceeded: ${req.ip} - ${req.method} ${req.path}`, {
      userAgent: req.get('User-Agent'),
      fingerprint: (req as any).fingerprint,
    });

    res.status(429).json({
      error: 'Too many requests from this IP, please try again later.',
      retryAfter: '1 minute',
    });
  },
});

// Strict rate limiting for authentication endpoints
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 auth requests per windowMs (allow for password mistakes)
  message: {
    error: 'Too many authentication attempts from this IP, please try again later.',
    retryAfter: '15 minutes',
  },
  standardHeaders: true,
  legacyHeaders: false,
  trustProxy: true, // Trust Railway proxy
  skipSuccessfulRequests: true, // Don't count successful requests
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      error: 'Too many authentication attempts from this IP, please try again later.',
      retryAfter: '15 minutes',
    });
  },
});

// Very strict rate limiting for password reset
export const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // Limit each IP to 3 password reset requests per hour
  message: {
    error: 'Too many password reset attempts from this IP, please try again later.',
    retryAfter: '1 hour',
  },
  standardHeaders: true,
  legacyHeaders: false,
  trustProxy: true, // Trust Railway proxy
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      error: 'Too many password reset attempts from this IP, please try again later.',
      retryAfter: '1 hour',
    });
  },
});

// Rate limiting for analysis endpoints - Balanced for legitimate use
export const analysisLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20, // Limit each IP to 20 analysis requests per hour (reasonable for testing)
  message: {
    error: 'Too many analysis requests from this IP, please try again later.',
    retryAfter: '1 minute',
  },
  standardHeaders: true,
  legacyHeaders: false,
  trustProxy: true, // Trust Railway proxy
  handler: (req: Request, res: Response) => {
    // Log analysis rate limit violations - this is critical
    console.error(`🚨 ANALYSIS RATE LIMIT EXCEEDED: ${req.ip} - ${req.method} ${req.path}`, {
      userAgent: req.get('User-Agent'),
      fingerprint: (req as any).fingerprint,
      body: req.body,
      severity: 'HIGH',
    });

    res.status(429).json({
      error: 'Too many analysis requests from this IP, please try again later.',
      retryAfter: '1 minute',
    });
  },
});

// Rate limiting for email capture - more lenient for testing
export const emailCaptureLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 10, // Allow 10 email capture attempts per 5 minutes
  message: {
    error: 'Too many email capture attempts from this IP, please try again later.',
    retryAfter: '5 minutes',
  },
  standardHeaders: true,
  legacyHeaders: false,
  trustProxy: true,
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      error: 'Too many email capture attempts from this IP, please try again later.',
      retryAfter: '5 minutes',
    });
  },
});

// Rate limiting for file generation (per user, more restrictive)
export const fileGenerationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20, // Limit each IP to 20 file generation requests per hour
  message: {
    error: 'Too many file generation requests from this IP, please try again later.',
    retryAfter: '1 hour',
  },
  standardHeaders: true,
  legacyHeaders: false,
  trustProxy: true, // Trust Railway proxy
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      error: 'Too many file generation requests from this IP, please try again later.',
      retryAfter: '1 hour',
    });
  },
});
