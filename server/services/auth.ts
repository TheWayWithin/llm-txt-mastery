import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { AuthUser, JWTPayload, UserTier } from '@shared/schema';

// Environment variables for JWT
const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-for-development';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'fallback-refresh-secret-for-development';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '15m';
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '7d';

// Password hashing
export async function hashPassword(password: string): Promise<string> {
  const saltRounds = 12;
  return bcrypt.hash(password, saltRounds);
}

export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword);
}

// JWT token generation
export function generateAccessToken(user: { id: number; email: string; tier: UserTier }): string {
  const payload = {
    userId: user.id,
    email: user.email,
    tier: user.tier,
    iat: Math.floor(Date.now() / 1000),
  };
  
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

export function generateRefreshToken(userId: number): string {
  const payload = {
    userId,
    type: 'refresh',
    iat: Math.floor(Date.now() / 1000),
  };
  
  return jwt.sign(payload, JWT_REFRESH_SECRET, { expiresIn: JWT_REFRESH_EXPIRES_IN });
}

// JWT token verification
export function verifyAccessToken(token: string): JWTPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;
    return decoded;
  } catch (error) {
    console.error('Access token verification failed:', error.message);
    return null;
  }
}

export function verifyRefreshToken(token: string): { userId: number; type: string } | null {
  try {
    const decoded = jwt.verify(token, JWT_REFRESH_SECRET) as any;
    if (decoded.type !== 'refresh') {
      throw new Error('Invalid token type');
    }
    return { userId: decoded.userId, type: decoded.type };
  } catch (error) {
    console.error('Refresh token verification failed:', error.message);
    return null;
  }
}

// Token hashing for database storage
export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

// Session management helpers
export function generateTokenExpiration(): Date {
  return new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
}

export function generateRefreshTokenExpiration(): Date {
  return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
}

// Extract token from Authorization header
export function extractTokenFromHeader(authHeader: string | undefined): string | null {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  
  return authHeader.substring(7); // Remove 'Bearer ' prefix
}

// Validate password strength
export function validatePassword(password: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }
  
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  
  if (!/\d/.test(password)) {
    errors.push('Password must contain at least one number');
  }
  
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

// Rate limiting helpers
export function generateLoginAttemptKey(email: string, ip: string): string {
  return `login_attempts:${email}:${ip}`;
}

export function generatePasswordResetKey(email: string): string {
  return crypto.createHash('sha256').update(`password_reset:${email}:${Date.now()}`).digest('hex');
}

// Email verification token
export function generateEmailVerificationToken(userId: number, email: string): string {
  const payload = {
    userId,
    email,
    type: 'email_verification',
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60), // 24 hours
  };
  
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '24h' });
}

export function verifyEmailVerificationToken(token: string): { userId: number; email: string } | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    if (decoded.type !== 'email_verification') {
      throw new Error('Invalid token type');
    }
    return { userId: decoded.userId, email: decoded.email };
  } catch (error) {
    console.error('Email verification token failed:', error.message);
    return null;
  }
}

// Authentication response helpers
export function createAuthResponse(user: AuthUser, accessToken: string, refreshToken: string) {
  return {
    user: {
      id: user.id,
      email: user.email,
      tier: user.tier as UserTier,
      creditsRemaining: user.creditsRemaining || 0,
      emailVerified: user.emailVerified || false,
    },
    accessToken,
    refreshToken,
  };
}

// Security headers for responses
export function getSecurityHeaders() {
  return {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0',
  };
}