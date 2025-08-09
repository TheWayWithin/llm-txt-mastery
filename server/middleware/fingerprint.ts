import type { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

// Bot detection patterns
const SUSPICIOUS_PATTERNS = {
  // Missing or suspicious user agents
  NO_USER_AGENT: /^$/,
  // Only block obvious malicious bots, not testing tools
  BOT_USER_AGENTS: /bot|crawler|spider|scraper|wget|curl|python/i,
  GENERIC_USER_AGENTS: /^(User-Agent)$/i, // Don't block Mozilla/5.0
  
  // Suspicious request patterns
  TOO_FAST: 10, // More than 10 requests per second (allow normal browsing)
  BURST_THRESHOLD: 30, // More than 30 requests in 10 seconds (allow page loads)
  
  // Suspicious headers
  MISSING_ACCEPT: /^$/,
  SUSPICIOUS_ACCEPT: /^\*\/\*$/
};

// In-memory tracking for suspicious activity
const fingerprintStore = new Map<string, {
  requestTimes: number[];
  violations: string[];
  blocked: boolean;
  blockedUntil?: number;
}>();

// Cleanup old entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  const fiveMinutesAgo = now - 5 * 60 * 1000;
  
  for (const [fingerprint, data] of fingerprintStore.entries()) {
    // Remove old request times
    data.requestTimes = data.requestTimes.filter(time => time > fiveMinutesAgo);
    
    // Remove entries with no recent activity
    if (data.requestTimes.length === 0 && (!data.blockedUntil || data.blockedUntil < now)) {
      fingerprintStore.delete(fingerprint);
    }
  }
}, 5 * 60 * 1000);

function generateFingerprint(req: Request): string {
  const ip = req.ip || req.connection.remoteAddress || 'unknown';
  const userAgent = req.get('User-Agent') || '';
  const accept = req.get('Accept') || '';
  
  // Create a hash of identifying characteristics
  const data = `${ip}:${userAgent}:${accept}`;
  return crypto.createHash('sha256').update(data).digest('hex').substring(0, 16);
}

function detectSuspiciousActivity(req: Request, fingerprint: string): string[] {
  const violations: string[] = [];
  const userAgent = req.get('User-Agent') || '';
  const accept = req.get('Accept') || '';
  
  // Check for missing or suspicious user agent
  if (SUSPICIOUS_PATTERNS.NO_USER_AGENT.test(userAgent)) {
    violations.push('missing_user_agent');
  }
  if (SUSPICIOUS_PATTERNS.BOT_USER_AGENTS.test(userAgent)) {
    violations.push('bot_user_agent');
  }
  if (SUSPICIOUS_PATTERNS.GENERIC_USER_AGENTS.test(userAgent)) {
    violations.push('generic_user_agent');
  }
  
  // Check for suspicious Accept headers
  if (SUSPICIOUS_PATTERNS.MISSING_ACCEPT.test(accept)) {
    violations.push('missing_accept_header');
  }
  if (SUSPICIOUS_PATTERNS.SUSPICIOUS_ACCEPT.test(accept)) {
    violations.push('suspicious_accept_header');
  }
  
  // Check request timing patterns
  const data = fingerprintStore.get(fingerprint);
  if (data) {
    const now = Date.now();
    const oneSecondAgo = now - 1000;
    const tenSecondsAgo = now - 10000;
    
    const recentRequests = data.requestTimes.filter(time => time > oneSecondAgo);
    const burstRequests = data.requestTimes.filter(time => time > tenSecondsAgo);
    
    if (recentRequests.length > SUSPICIOUS_PATTERNS.TOO_FAST) {
      violations.push('too_fast');
    }
    if (burstRequests.length > SUSPICIOUS_PATTERNS.BURST_THRESHOLD) {
      violations.push('burst_pattern');
    }
  }
  
  return violations;
}

export function fingerprintMiddleware(req: Request, res: Response, next: NextFunction) {
  const fingerprint = generateFingerprint(req);
  const now = Date.now();
  
  // Get or create fingerprint data
  let data = fingerprintStore.get(fingerprint);
  if (!data) {
    data = {
      requestTimes: [],
      violations: [],
      blocked: false
    };
    fingerprintStore.set(fingerprint, data);
  }
  
  // TEMPORARILY DISABLED: Skip blocking check to allow testing
  // Check if currently blocked
  // if (data.blocked && data.blockedUntil && now < data.blockedUntil) {
  //   console.warn(`🚫 Blocked fingerprint attempting access: ${fingerprint} (${req.method} ${req.path})`);
  //   return res.status(429).json({
  //     error: 'Request blocked due to suspicious activity',
  //     retryAfter: Math.ceil((data.blockedUntil - now) / 1000)
  //   });
  // }
  
  // Add current request time
  data.requestTimes.push(now);
  
  // Check for suspicious activity
  const violations = detectSuspiciousActivity(req, fingerprint);
  
  if (violations.length > 0) {
    data.violations.push(...violations);
    
    // Log suspicious activity
    console.warn(`🚨 Suspicious activity detected: ${fingerprint}`, {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      violations,
      path: req.path,
      method: req.method
    });
    
    // TEMPORARILY DISABLED: Skip automatic blocking to allow testing
    // Block only for severe violations
    // const criticalViolations = violations.filter(v => 
    //   ['too_fast', 'burst_pattern', 'bot_user_agent'].includes(v)
    // );
    
    // Require multiple critical violations or many total violations to block
    // if (criticalViolations.length >= 2 || data.violations.length >= 10) {
    //   data.blocked = true;
    //   data.blockedUntil = now + 15 * 60 * 1000; // Block for 15 minutes
      
    //   console.error(`🔒 BLOCKING fingerprint: ${fingerprint} for 15 minutes`, {
    //     totalViolations: data.violations.length,
    //     criticalViolations,
    //     recentViolations: violations
    //   });
      
    //   return res.status(429).json({
    //     error: 'Request blocked due to suspicious activity',
    //     retryAfter: 900 // 15 minutes
    //   });
    // }
  }
  
  // Add fingerprint to request for logging purposes
  (req as any).fingerprint = fingerprint;
  
  next();
}

// Helper function to check if a fingerprint is currently blocked
export function isFingerprintBlocked(fingerprint: string): boolean {
  const data = fingerprintStore.get(fingerprint);
  if (!data) return false;
  
  const now = Date.now();
  return data.blocked && data.blockedUntil !== undefined && now < data.blockedUntil;
}

// Helper function to get fingerprint stats (for debugging)
export function getFingerprintStats(fingerprint: string) {
  return fingerprintStore.get(fingerprint);
}