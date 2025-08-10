import type { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

// Legitimate temporary email providers (commonly used for testing and privacy)
const LEGITIMATE_TEMP_EMAIL_DOMAINS = new Set([
  // Popular temporary email services
  '10minutemail.com', 'guerrillamail.com', 'mailinator.com', 'tempmail.org',
  'yopmail.com', 'maildrop.cc', 'throwaway.email', 'temp-mail.org',
  'mohmal.com', 'sharklasers.com', 'guerrillamailblock.com',
  // Testing domains
  'example.com', 'test.com', 'testing.com', 'example.org',
  // Common development domains
  'gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com', 'protonmail.com'
]);

// Expected user flow patterns that should NOT be blocked
const EXPECTED_FLOW_PATTERNS = {
  // Allow rapid polling during analysis (every 5 seconds for up to 5 minutes)
  ANALYSIS_POLLING: {
    paths: ['/api/analysis/'],
    maxRequestsPerMinute: 15, // Allow polling every 4 seconds
    windowMs: 60 * 1000
  },
  
  // Allow multiple page loads during navigation
  PAGE_NAVIGATION: {
    paths: ['/api/health', '/api/stripe/checkout', '/api/auth/'],
    maxRequestsPerMinute: 30,
    windowMs: 60 * 1000
  },
  
  // Allow form interactions during checkout
  CHECKOUT_FLOW: {
    paths: ['/api/stripe/'],
    maxRequestsPerMinute: 20,
    windowMs: 60 * 1000
  }
};

// Progressive penalty system
enum ThreatLevel {
  LOW = 'low',
  MEDIUM = 'medium', 
  HIGH = 'high',
  CRITICAL = 'critical'
}

interface ThreatResponse {
  action: 'allow' | 'throttle' | 'challenge' | 'block';
  delayMs?: number;
  message?: string;
  retryAfter?: number;
}

// Enhanced bot detection patterns
const SMART_DETECTION_PATTERNS = {
  // Only block obvious malicious patterns
  MALICIOUS_USER_AGENTS: /^(wget|curl|python-requests|scrapy|selenium|phantomjs|bot|spider|crawler)$/i,
  
  // Allow legitimate tools but monitor
  AUTOMATED_TOOLS: /postman|insomnia|httpie|axios|fetch/i,
  
  // Suspicious but not necessarily malicious
  MINIMAL_USER_AGENTS: /^mozilla\/5\.0$/i,
  
  // Rate limiting thresholds (more generous)
  RAPID_FIRE: 20, // More than 20 requests per second (very aggressive)
  BURST_THRESHOLD: 100, // More than 100 requests in 60 seconds (allow heavy usage)
  
  // Header patterns
  MISSING_CRITICAL_HEADERS: ['user-agent', 'accept'],
  SUSPICIOUS_HEADER_VALUES: {
    accept: /^\*\/\*$/,
    'user-agent': /^$/
  }
};

interface FingerprintData {
  requestTimes: number[];
  violations: Array<{
    type: string;
    timestamp: number;
    severity: ThreatLevel;
  }>;
  threatLevel: ThreatLevel;
  penalties: {
    throttledUntil?: number;
    challengeRequired?: boolean;
    blockedUntil?: number;
  };
  whitelisted: boolean;
  authenticatedUser?: string;
  lastActivity: number;
}

// In-memory store with better cleanup
const fingerprintStore = new Map<string, FingerprintData>();

// Cleanup old entries every 10 minutes
setInterval(() => {
  const now = Date.now();
  const thirtyMinutesAgo = now - 30 * 60 * 1000;
  
  for (const [fingerprint, data] of fingerprintStore.entries()) {
    // Remove old request times (keep last 30 minutes)
    data.requestTimes = data.requestTimes.filter(time => time > thirtyMinutesAgo);
    
    // Remove old violations (keep last 30 minutes)
    data.violations = data.violations.filter(v => v.timestamp > thirtyMinutesAgo);
    
    // Remove inactive entries
    if (data.lastActivity < thirtyMinutesAgo && !data.penalties.blockedUntil) {
      fingerprintStore.delete(fingerprint);
    }
  }
}, 10 * 60 * 1000);

function generateFingerprint(req: Request): string {
  const ip = req.ip || req.connection.remoteAddress || 'unknown';
  const userAgent = req.get('User-Agent') || '';
  const accept = req.get('Accept') || '';
  const acceptLanguage = req.get('Accept-Language') || '';
  
  // More sophisticated fingerprinting
  const data = `${ip}:${userAgent}:${accept}:${acceptLanguage}`;
  return crypto.createHash('sha256').update(data).digest('hex').substring(0, 16);
}

function isLegitimateEmail(email: string): boolean {
  if (!email || !email.includes('@')) return false;
  
  const domain = email.split('@')[1]?.toLowerCase();
  return LEGITIMATE_TEMP_EMAIL_DOMAINS.has(domain);
}

function isExpectedFlow(req: Request): boolean {
  const path = req.path;
  
  // Check if this request is part of an expected user flow
  for (const pattern of Object.values(EXPECTED_FLOW_PATTERNS)) {
    if (pattern.paths.some(p => path.startsWith(p))) {
      return true;
    }
  }
  
  return false;
}

function analyzeRequestPattern(req: Request, data: FingerprintData): Array<{type: string, severity: ThreatLevel}> {
  const violations: Array<{type: string, severity: ThreatLevel}> = [];
  const userAgent = req.get('User-Agent') || '';
  const accept = req.get('Accept') || '';
  const now = Date.now();
  
  // Check for malicious user agents (HIGH severity)
  if (SMART_DETECTION_PATTERNS.MALICIOUS_USER_AGENTS.test(userAgent)) {
    violations.push({type: 'malicious_user_agent', severity: ThreatLevel.HIGH});
  }
  
  // Monitor automated tools (LOW severity - not necessarily bad)
  if (SMART_DETECTION_PATTERNS.AUTOMATED_TOOLS.test(userAgent)) {
    violations.push({type: 'automated_tool', severity: ThreatLevel.LOW});
  }
  
  // Check for missing headers (MEDIUM severity)
  if (!userAgent) {
    violations.push({type: 'missing_user_agent', severity: ThreatLevel.MEDIUM});
  }
  if (!accept) {
    violations.push({type: 'missing_accept', severity: ThreatLevel.MEDIUM});
  }
  
  // Check request timing patterns with flow awareness
  if (!isExpectedFlow(req)) {
    // Only apply strict timing checks for non-expected flows
    const oneSecondAgo = now - 1000;
    const oneMinuteAgo = now - 60000;
    
    const recentRequests = data.requestTimes.filter(time => time > oneSecondAgo);
    const minuteRequests = data.requestTimes.filter(time => time > oneMinuteAgo);
    
    if (recentRequests.length > SMART_DETECTION_PATTERNS.RAPID_FIRE) {
      violations.push({type: 'rapid_fire', severity: ThreatLevel.HIGH});
    }
    if (minuteRequests.length > SMART_DETECTION_PATTERNS.BURST_THRESHOLD) {
      violations.push({type: 'burst_pattern', severity: ThreatLevel.MEDIUM});
    }
  }
  
  return violations;
}

function calculateThreatLevel(violations: Array<{type: string, severity: ThreatLevel}>): ThreatLevel {
  const criticalCount = violations.filter(v => v.severity === ThreatLevel.CRITICAL).length;
  const highCount = violations.filter(v => v.severity === ThreatLevel.HIGH).length;
  const mediumCount = violations.filter(v => v.severity === ThreatLevel.MEDIUM).length;
  
  if (criticalCount > 0 || highCount >= 3) return ThreatLevel.CRITICAL;
  if (highCount >= 2 || (highCount >= 1 && mediumCount >= 3)) return ThreatLevel.HIGH;
  if (highCount >= 1 || mediumCount >= 2) return ThreatLevel.MEDIUM;
  return ThreatLevel.LOW;
}

function determineThreatResponse(threatLevel: ThreatLevel, data: FingerprintData): ThreatResponse {
  const now = Date.now();
  
  // Check if currently under penalty
  if (data.penalties.blockedUntil && now < data.penalties.blockedUntil) {
    return {
      action: 'block',
      message: 'Request blocked due to suspicious activity',
      retryAfter: Math.ceil((data.penalties.blockedUntil - now) / 1000)
    };
  }
  
  if (data.penalties.challengeRequired) {
    return {
      action: 'challenge',
      message: 'Please complete verification to continue'
    };
  }
  
  if (data.penalties.throttledUntil && now < data.penalties.throttledUntil) {
    return {
      action: 'throttle',
      delayMs: 2000,
      message: 'Request throttled, please slow down'
    };
  }
  
  // Progressive response based on threat level
  switch (threatLevel) {
    case ThreatLevel.CRITICAL:
      // Block for 15 minutes
      data.penalties.blockedUntil = now + 15 * 60 * 1000;
      return {
        action: 'block',
        message: 'Request blocked due to suspicious activity',
        retryAfter: 900
      };
      
    case ThreatLevel.HIGH:
      // Require challenge (could be CAPTCHA in future)
      data.penalties.challengeRequired = true;
      return {
        action: 'challenge',
        message: 'Please complete verification to continue'
      };
      
    case ThreatLevel.MEDIUM:
      // Throttle for 5 minutes
      data.penalties.throttledUntil = now + 5 * 60 * 1000;
      return {
        action: 'throttle',
        delayMs: 1000,
        message: 'Request throttled, please slow down'
      };
      
    default:
      return { action: 'allow' };
  }
}

export function smartBotProtection(req: Request, res: Response, next: NextFunction) {
  const fingerprint = generateFingerprint(req);
  const now = Date.now();
  
  // Get or create fingerprint data
  let data = fingerprintStore.get(fingerprint);
  if (!data) {
    data = {
      requestTimes: [],
      violations: [],
      threatLevel: ThreatLevel.LOW,
      penalties: {},
      whitelisted: false,
      lastActivity: now
    };
    fingerprintStore.set(fingerprint, data);
  }
  
  // Update last activity
  data.lastActivity = now;
  
  // Check if whitelisted (authenticated users, etc.)
  const authToken = req.headers.authorization;
  if (authToken && authToken.startsWith('Bearer ')) {
    data.whitelisted = true;
    data.authenticatedUser = 'jwt_user'; // Could extract actual user ID
  }
  
  // Bypass protection for whitelisted users (but still log)
  if (data.whitelisted) {
    data.requestTimes.push(now);
    (req as any).fingerprint = fingerprint;
    (req as any).botProtection = { whitelisted: true };
    return next();
  }
  
  // Add current request time
  data.requestTimes.push(now);
  
  // Analyze for suspicious patterns
  const newViolations = analyzeRequestPattern(req, data);
  
  // Add violations with timestamps
  for (const violation of newViolations) {
    data.violations.push({
      ...violation,
      timestamp: now
    });
  }
  
  // Calculate current threat level
  const currentThreatLevel = calculateThreatLevel(data.violations);
  data.threatLevel = currentThreatLevel;
  
  // Determine response
  const threatResponse = determineThreatResponse(currentThreatLevel, data);
  
  // Log suspicious activity
  if (newViolations.length > 0 || threatResponse.action !== 'allow') {
    console.warn(`🛡️ Smart Bot Protection: ${fingerprint} - ${threatResponse.action}`, {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      path: req.path,
      method: req.method,
      threatLevel: currentThreatLevel,
      violations: newViolations.map(v => v.type),
      response: threatResponse.action
    });
  }
  
  // Apply response
  switch (threatResponse.action) {
    case 'block':
      return res.status(429).json({
        error: threatResponse.message,
        retryAfter: threatResponse.retryAfter,
        code: 'BLOCKED'
      });
      
    case 'challenge':
      return res.status(429).json({
        error: threatResponse.message,
        code: 'CHALLENGE_REQUIRED'
        // In future: include CAPTCHA challenge
      });
      
    case 'throttle':
      // Add artificial delay
      setTimeout(() => {
        (req as any).fingerprint = fingerprint;
        (req as any).botProtection = { throttled: true, delayMs: threatResponse.delayMs };
        next();
      }, threatResponse.delayMs);
      return;
      
    default:
      // Allow request
      (req as any).fingerprint = fingerprint;
      (req as any).botProtection = { allowed: true };
      return next();
  }
}

// Helper functions for debugging and monitoring
export function getFingerprintData(fingerprint: string): FingerprintData | undefined {
  return fingerprintStore.get(fingerprint);
}

export function whitelistFingerprint(fingerprint: string): void {
  const data = fingerprintStore.get(fingerprint);
  if (data) {
    data.whitelisted = true;
    data.penalties = {}; // Clear all penalties
  }
}

export function getProtectionStats() {
  const stats = {
    totalFingerprints: fingerprintStore.size,
    threatLevels: { low: 0, medium: 0, high: 0, critical: 0 },
    activeBlocks: 0,
    activeThrottles: 0,
    whitelisted: 0
  };
  
  const now = Date.now();
  for (const data of fingerprintStore.values()) {
    stats.threatLevels[data.threatLevel]++;
    if (data.whitelisted) stats.whitelisted++;
    if (data.penalties.blockedUntil && now < data.penalties.blockedUntil) stats.activeBlocks++;
    if (data.penalties.throttledUntil && now < data.penalties.throttledUntil) stats.activeThrottles++;
  }
  
  return stats;
}