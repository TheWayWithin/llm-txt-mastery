/**
 * SECURITY ENHANCEMENT: Advanced Security Middleware
 * 
 * This module provides advanced security features including:
 * - Session security hardening
 * - Error sanitization for production
 * - Security monitoring and logging
 * - Enhanced input validation
 * 
 * SECURITY IMPLEMENTATION: Defense-in-Depth Security Headers
 */

import type { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

interface SecurityRequest extends Request {
  securityContext?: {
    fingerprint: string;
    riskScore: number;
    sessionId: string;
  };
}

/**
 * Enhanced session security middleware
 * Implements session fingerprinting and rotation
 */
export function enhancedSessionSecurity(req: SecurityRequest, res: Response, next: NextFunction) {
  // Generate security fingerprint based on request characteristics
  const fingerprint = generateSecurityFingerprint(req);
  
  // Initialize security context
  req.securityContext = {
    fingerprint,
    riskScore: calculateRiskScore(req),
    sessionId: generateSessionId()
  };
  
  // Set secure session headers
  if (req.headers.authorization || req.cookies?.auth_token) {
    // For authenticated requests, add additional security
    res.setHeader('X-Session-Timeout', '900'); // 15 minutes
    res.setHeader('X-Session-Fingerprint', fingerprint.substring(0, 8)); // Partial fingerprint for debugging
  }
  
  next();
}

/**
 * Production error sanitization middleware
 * Prevents information disclosure through error messages
 */
export function productionErrorSanitizer(err: any, req: SecurityRequest, res: Response, next: NextFunction) {
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  // Log full error details for monitoring (but not in response)
  console.error('🚨 APPLICATION ERROR:', {
    error: err.message,
    stack: isDevelopment ? err.stack : '[REDACTED]',
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent')?.substring(0, 100),
    timestamp: new Date().toISOString(),
    securityContext: req.securityContext
  });
  
  // Sanitize error response for production
  if (!isDevelopment) {
    const status = err.status || err.statusCode || 500;
    
    // Generic error messages for production
    const sanitizedErrors: Record<number, string> = {
      400: 'Invalid request',
      401: 'Authentication required',
      403: 'Access denied',
      404: 'Resource not found',
      429: 'Too many requests',
      500: 'Internal server error',
      502: 'Service temporarily unavailable',
      503: 'Service temporarily unavailable'
    };
    
    const message = sanitizedErrors[status] || 'An error occurred';
    
    res.status(status).json({ 
      error: message,
      code: status,
      timestamp: new Date().toISOString()
    });
  } else {
    // In development, show detailed errors
    res.status(err.status || 500).json({
      error: err.message,
      stack: err.stack,
      details: err
    });
  }
}

/**
 * Security monitoring middleware
 * Tracks security-relevant events and anomalies
 */
export function securityMonitoring(req: SecurityRequest, res: Response, next: NextFunction) {
  const startTime = Date.now();
  
  // Monitor suspicious patterns
  const suspiciousIndicators = [];
  
  // Check for common attack patterns in URL
  const urlPatterns = [
    /\.\.\//g,           // Directory traversal
    /<script/gi,         // XSS attempts
    /union\s+select/gi,  // SQL injection
    /exec\(/gi,          // Code injection
    /eval\(/gi,          // Code injection
    /%3Cscript/gi,       // Encoded XSS
  ];
  
  urlPatterns.forEach(pattern => {
    if (pattern.test(req.url)) {
      suspiciousIndicators.push(`URL pattern: ${pattern.source}`);
    }
  });
  
  // Check request headers for suspicious patterns
  const userAgent = req.get('User-Agent') || '';
  if (userAgent.length === 0 || userAgent.length > 512) {
    suspiciousIndicators.push('Suspicious User-Agent length');
  }
  
  // Monitor for suspicious header combinations
  if (!req.get('Accept') && !req.get('Content-Type') && req.method !== 'GET') {
    suspiciousIndicators.push('Missing standard headers');
  }
  
  // Log suspicious activity
  if (suspiciousIndicators.length > 0) {
    console.warn('🔍 SECURITY MONITORING: Suspicious activity detected', {
      ip: req.ip,
      url: req.url,
      method: req.method,
      userAgent: userAgent.substring(0, 100),
      indicators: suspiciousIndicators,
      securityContext: req.securityContext,
      timestamp: new Date().toISOString()
    });
  }
  
  // Track response for security metrics
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    
    // Log security-relevant responses
    if (res.statusCode >= 400 || suspiciousIndicators.length > 0) {
      console.log('📊 SECURITY METRICS:', {
        statusCode: res.statusCode,
        duration,
        suspiciousIndicators: suspiciousIndicators.length,
        endpoint: req.path,
        method: req.method,
        ip: req.ip
      });
    }
  });
  
  next();
}

/**
 * Input validation security middleware
 * Provides enhanced validation for security-sensitive endpoints
 */
export function enhancedInputValidation(req: SecurityRequest, res: Response, next: NextFunction) {
  // Validate request size
  const contentLength = parseInt(req.get('Content-Length') || '0', 10);
  const maxSize = 10 * 1024 * 1024; // 10MB limit
  
  if (contentLength > maxSize) {
    console.warn('🚨 SECURITY: Request too large', {
      contentLength,
      maxSize,
      ip: req.ip,
      endpoint: req.path
    });
    
    return res.status(413).json({
      error: 'Request too large',
      maxSize: '10MB'
    });
  }
  
  // Validate URL length
  if (req.url.length > 2048) {
    console.warn('🚨 SECURITY: URL too long', {
      urlLength: req.url.length,
      ip: req.ip,
      url: req.url.substring(0, 100) + '...'
    });
    
    return res.status(414).json({
      error: 'URL too long'
    });
  }
  
  // Validate header count and sizes
  const headerCount = Object.keys(req.headers).length;
  if (headerCount > 50) {
    console.warn('🚨 SECURITY: Too many headers', {
      headerCount,
      ip: req.ip,
      endpoint: req.path
    });
    
    return res.status(400).json({
      error: 'Too many headers'
    });
  }
  
  next();
}

/**
 * Generate security fingerprint for request
 */
function generateSecurityFingerprint(req: Request): string {
  const components = [
    req.ip,
    req.get('User-Agent') || '',
    req.get('Accept-Language') || '',
    req.get('Accept-Encoding') || ''
  ];
  
  return crypto
    .createHash('sha256')
    .update(components.join('|'))
    .digest('hex');
}

/**
 * Calculate risk score for request
 */
function calculateRiskScore(req: Request): number {
  let score = 0;
  
  // IP-based scoring (simplified)
  if (!req.ip || req.ip === '127.0.0.1') score += 10;
  
  // User-Agent scoring
  const userAgent = req.get('User-Agent') || '';
  if (!userAgent) score += 30;
  if (userAgent.includes('bot')) score += 20;
  if (userAgent.length < 20) score += 15;
  
  // Header analysis
  if (!req.get('Accept')) score += 15;
  if (!req.get('Accept-Language')) score += 10;
  
  // Request method scoring
  if (['POST', 'PUT', 'DELETE'].includes(req.method)) score += 5;
  
  return Math.min(score, 100); // Cap at 100
}

/**
 * Generate unique session ID
 */
function generateSessionId(): string {
  return crypto.randomBytes(16).toString('hex');
}

/**
 * Security headers for API responses
 */
export function apiSecurityHeaders(req: Request, res: Response, next: NextFunction) {
  // Additional security headers for API endpoints
  if (req.path.startsWith('/api/')) {
    // Prevent caching of API responses
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    
    // API-specific security headers
    res.setHeader('X-API-Version', '2.0');
    res.setHeader('X-Rate-Limit-Policy', 'strict');
    
    // Content type enforcement
    if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
      const contentType = req.get('Content-Type') || '';
      if (!contentType.includes('application/json') && !contentType.includes('multipart/form-data')) {
        console.warn('⚠️ API SECURITY: Unexpected content type', {
          contentType,
          endpoint: req.path,
          method: req.method,
          ip: req.ip
        });
      }
    }
  }
  
  next();
}
