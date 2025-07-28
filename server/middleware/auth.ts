import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken, extractTokenFromHeader, hashToken } from '../services/auth';
import { authStorage } from '../services/auth-storage';
import { AuthUser, UserTier, JWTPayload } from '@shared/schema';

// Extend Express Request type to include user
declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
      session?: any;
    }
  }
}

// Main authentication middleware
export async function authenticate(req: Request, res: Response, next: NextFunction) {
  try {
    const token = extractTokenFromHeader(req.headers.authorization);
    
    if (!token) {
      return res.status(401).json({ 
        error: 'Authentication required',
        code: 'NO_TOKEN' 
      });
    }

    // Verify JWT token
    const payload: JWTPayload | null = verifyAccessToken(token);
    if (!payload) {
      return res.status(401).json({ 
        error: 'Invalid or expired token',
        code: 'INVALID_TOKEN' 
      });
    }

    // Get user with session validation
    const tokenHash = hashToken(token);
    const result = await authStorage.getUserWithSession(tokenHash);
    
    if (!result) {
      return res.status(401).json({ 
        error: 'Session not found or expired',
        code: 'SESSION_EXPIRED' 
      });
    }

    // Attach user to request
    req.user = result.user;
    req.session = result.session;
    
    next();
  } catch (error) {
    console.error('Authentication middleware error:', error);
    return res.status(500).json({ 
      error: 'Authentication service error',
      code: 'AUTH_ERROR' 
    });
  }
}

// Optional authentication middleware (doesn't fail if no token)
export async function optionalAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const token = extractTokenFromHeader(req.headers.authorization);
    
    if (!token) {
      return next(); // Continue without user
    }

    const payload: JWTPayload | null = verifyAccessToken(token);
    if (!payload) {
      return next(); // Continue without user
    }

    const tokenHash = hashToken(token);
    const result = await authStorage.getUserWithSession(tokenHash);
    
    if (result) {
      req.user = result.user;
      req.session = result.session;
    }
    
    next();
  } catch (error) {
    console.error('Optional auth middleware error:', error);
    next(); // Continue without user on error
  }
}

// Require specific tier middleware
export function requireTier(minTier: UserTier) {
  const tierLevels: Record<UserTier, number> = {
    starter: 0,
    coffee: 1,
    growth: 2,
    scale: 3
  };

  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ 
        error: 'Authentication required',
        code: 'NO_AUTH' 
      });
    }

    const userTierLevel = tierLevels[req.user.tier as UserTier] || 0;
    const requiredTierLevel = tierLevels[minTier];

    if (userTierLevel < requiredTierLevel) {
      return res.status(403).json({ 
        error: `${minTier} tier or higher required`,
        code: 'INSUFFICIENT_TIER',
        userTier: req.user.tier,
        requiredTier: minTier
      });
    }

    next();
  };
}

// Require email verification middleware
export function requireEmailVerified(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ 
      error: 'Authentication required',
      code: 'NO_AUTH' 
    });
  }

  if (!req.user.emailVerified) {
    return res.status(403).json({ 
      error: 'Email verification required',
      code: 'EMAIL_NOT_VERIFIED' 
    });
  }

  next();
}

// Check credits middleware (for coffee tier)
export function requireCredits(minCredits: number = 1) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ 
        error: 'Authentication required',
        code: 'NO_AUTH' 
      });
    }

    const userCredits = req.user.creditsRemaining || 0;
    
    if (userCredits < minCredits) {
      return res.status(403).json({ 
        error: 'Insufficient credits',
        code: 'INSUFFICIENT_CREDITS',
        creditsRemaining: userCredits,
        creditsRequired: minCredits
      });
    }

    next();
  };
}

// Admin only middleware
export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ 
      error: 'Authentication required',
      code: 'NO_AUTH' 
    });
  }

  // Check if user is admin (you may want to add an isAdmin field to the user schema)
  if (req.user.tier !== 'scale') { // For now, scale tier = admin
    return res.status(403).json({ 
      error: 'Admin access required',
      code: 'ADMIN_REQUIRED' 
    });
  }

  next();
}

// Rate limiting helper (to be used with express-rate-limit)
export function createUserKeyGenerator() {
  return (req: Request): string => {
    if (req.user) {
      return `user:${req.user.id}`;
    }
    return `ip:${req.ip}`;
  };
}

// Error handling for authentication
export function handleAuthError(error: any, req: Request, res: Response, next: NextFunction) {
  if (error.name === 'JsonWebTokenError') {
    return res.status(401).json({
      error: 'Invalid token',
      code: 'INVALID_TOKEN'
    });
  }

  if (error.name === 'TokenExpiredError') {
    return res.status(401).json({
      error: 'Token expired',
      code: 'TOKEN_EXPIRED'
    });
  }

  next(error);
}

// Combined middleware for common patterns
export const requireCoffeeAuth = [authenticate, requireTier('coffee')];
export const requireGrowthAuth = [authenticate, requireTier('growth')];
export const requireScaleAuth = [authenticate, requireTier('scale')];
export const requireVerifiedAuth = [authenticate, requireEmailVerified];
export const requireCoffeeCredits = [authenticate, requireCredits(1)];

// Legacy compatibility
export const requireAuth = authenticate;