import type { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';

// Enhanced bot protection for OpenAI API endpoints
// CRITICAL SECURITY FIX: CVSS 8.7 - Bot Protection for Cost-Sensitive Endpoints

interface EnhancedRequest extends Request {
  suspiciousActivity?: boolean;
  botScore?: number;
  isAuthenticated?: boolean;
}

// Bot detection patterns
const BOT_USER_AGENTS = [
  /bot/i,
  /crawler/i,
  /spider/i,
  /scraper/i,
  /curl/i,
  /wget/i,
  /python/i,
  /requests/i,
  /automated/i,
  /headless/i,
];

const SUSPICIOUS_PATTERNS = [
  /script/i,
  /automation/i,
  /phantom/i,
  /selenium/i,
  /webdriver/i,
  /chrome-headless/i,
];

// Human-like behavior indicators
const HUMAN_INDICATORS = [
  /mozilla/i,
  /webkit/i,
  /chrome/i,
  /firefox/i,
  /safari/i,
  /edge/i,
];

/**
 * Enhanced bot detection middleware for cost-sensitive endpoints
 */
export function enhancedBotProtection(req: EnhancedRequest, res: Response, next: NextFunction) {
  const userAgent = req.get('User-Agent') || '';
  const origin = req.get('Origin') || '';
  const referer = req.get('Referer') || '';
  const acceptHeader = req.get('Accept') || '';
  const acceptLanguage = req.get('Accept-Language') || '';
  
  let botScore = 0;
  const reasons: string[] = [];

  // Check User-Agent patterns
  if (BOT_USER_AGENTS.some(pattern => pattern.test(userAgent))) {
    botScore += 50;
    reasons.push('Bot user agent detected');
  }

  if (SUSPICIOUS_PATTERNS.some(pattern => pattern.test(userAgent))) {
    botScore += 30;
    reasons.push('Suspicious automation patterns');
  }

  // Missing typical browser headers (low signal — many legit clients skip these)
  if (!acceptHeader.includes('text/html') && !acceptHeader.includes('application/json')) {
    botScore += 10;
    reasons.push('Missing browser accept headers');
  }

  if (!acceptLanguage) {
    botScore += 5;
    reasons.push('Missing Accept-Language header');
  }

  // Suspicious request patterns (Origin/Referer missing is common for direct API calls)
  if (!origin && !referer) {
    botScore += 10;
    reasons.push('Missing origin and referer headers');
  }

  // Very short user agents are often bots
  if (userAgent.length < 20) {
    botScore += 30;
    reasons.push('Abnormally short user agent');
  }

  // Human behavior indicators (reduce bot score)
  if (HUMAN_INDICATORS.some(pattern => pattern.test(userAgent))) {
    botScore -= 15;
  }

  if (acceptHeader.includes('text/html')) {
    botScore -= 10;
  }

  if (referer && referer.includes(req.get('host') || '')) {
    botScore -= 10;
  }

  // Final assessment — threshold 70+ for suspicious (50 was too aggressive, blocked legit users)
  req.botScore = Math.max(0, botScore);
  req.suspiciousActivity = botScore >= 70;

  // Log suspicious activity for monitoring
  if (req.suspiciousActivity) {
    console.warn(`🤖 BOT DETECTION: High bot score ${botScore} for ${req.ip}`, {
      userAgent: userAgent.substring(0, 100),
      botScore,
      reasons,
      endpoint: req.path,
      method: req.method,
      severity: botScore >= 70 ? 'HIGH' : 'MEDIUM'
    });
  }

  next();
}

/**
 * Strict rate limiting for analysis endpoints with cost implications
 */
export const costProtectionLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour window
  max: (req: EnhancedRequest) => {
    // Authenticated users get higher limits
    if (req.user?.id) {
      return req.user.tier === 'scale' ? 100 : 
             req.user.tier === 'growth' ? 50 : 
             (req.user.tier === 'solo' || req.user.tier === 'coffee') ? 20 : 10;
    }
    
    // Suspicious requests get very low limits
    if (req.suspiciousActivity || (req.botScore || 0) >= 50) {
      return 2;
    }
    
    // Unauthenticated users get minimal limits
    return 5;
  },
  message: (req: EnhancedRequest) => ({
    error: 'Rate limit exceeded for analysis requests',
    retryAfter: '1 hour',
    reason: req.suspiciousActivity ? 'Suspicious activity detected' : 'Too many requests',
    suggestion: req.user?.id ? 'Consider upgrading your plan' : 'Please sign up for higher limits'
  }),
  standardHeaders: true,
  legacyHeaders: false,
  trustProxy: true,
  handler: (req: EnhancedRequest, res: Response) => {
    const isBot = req.suspiciousActivity || (req.botScore || 0) >= 50;
    
    console.error(`🚨 COST PROTECTION: Rate limit exceeded`, {
      ip: req.ip,
      userAgent: req.get('User-Agent')?.substring(0, 100),
      botScore: req.botScore,
      isAuthenticated: !!req.user?.id,
      userTier: req.user?.tier,
      endpoint: req.path,
      severity: isBot ? 'CRITICAL' : 'HIGH',
      suspiciousActivity: req.suspiciousActivity
    });

    res.status(429).json({
      error: 'Rate limit exceeded for analysis requests',
      retryAfter: '1 hour',
      reason: isBot ? 'Suspicious activity detected' : 'Too many requests',
      suggestion: req.user?.id ? 'Consider upgrading your plan' : 'Please sign up for higher limits'
    });
  },
});

/**
 * Authentication requirement for cost-sensitive endpoints
 */
export function requireAuthForAnalysis(req: EnhancedRequest, res: Response, next: NextFunction) {
  const isHighRiskBot = (req.botScore || 0) >= 85;
  const isSuspicious = req.suspiciousActivity && (req.botScore || 0) >= 70;
  
  // Only block clearly automated requests — free tier has rate limits for abuse protection
  if ((isHighRiskBot || isSuspicious) && !req.user?.id) {
    console.warn(`🔒 AUTH REQUIRED: Blocking unauthenticated suspicious request`, {
      ip: req.ip,
      userAgent: req.get('User-Agent')?.substring(0, 100),
      botScore: req.botScore,
      endpoint: req.path,
      severity: 'HIGH'
    });

    return res.status(401).json({
      error: 'Authentication required for this request',
      reason: 'Suspicious activity detected',
      message: 'Please sign up or log in to continue'
    });
  }

  // For medium-risk bots, add additional validation
  if ((req.botScore || 0) >= 30 && !req.user?.id) {
    // Could add CAPTCHA challenge here in the future
    console.info(`⚠️ MEDIUM RISK: Allowing unauthenticated request with monitoring`, {
      ip: req.ip,
      botScore: req.botScore,
      endpoint: req.path
    });
  }

  next();
}

/**
 * OpenAI API cost monitoring middleware
 */
export function openaiCostMonitoring(req: EnhancedRequest, res: Response, next: NextFunction) {
  const startTime = Date.now();
  
  // Store original end function
  const originalEnd = res.end;
  
  // Override end function to log API usage
  res.end = function(chunk?: any, encoding?: any) {
    const duration = Date.now() - startTime;
    const success = res.statusCode < 400;
    
    // Log OpenAI API usage for cost tracking
    console.log(`💰 OPENAI API USAGE:`, {
      ip: req.ip,
      userAgent: req.get('User-Agent')?.substring(0, 50),
      userId: req.user?.id,
      userTier: req.user?.tier,
      endpoint: req.path,
      method: req.method,
      statusCode: res.statusCode,
      duration,
      success,
      botScore: req.botScore,
      suspiciousActivity: req.suspiciousActivity,
      timestamp: new Date().toISOString()
    });

    // Call original end function
    return originalEnd.call(this, chunk, encoding);
  };

  next();
}

/**
 * Combined middleware for comprehensive protection of analysis endpoints
 */
export function comprehensiveAnalysisProtection(req: EnhancedRequest, res: Response, next: NextFunction) {
  // Apply bot detection first
  enhancedBotProtection(req, res, (error) => {
    if (error) return next(error);
    
    // Then apply authentication requirements
    requireAuthForAnalysis(req, res, (error) => {
      if (error) return next(error);
      
      // Finally add cost monitoring
      openaiCostMonitoring(req, res, next);
    });
  });
}