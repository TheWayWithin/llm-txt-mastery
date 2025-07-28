import express from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { 
  hashPassword, 
  verifyPassword, 
  generateAccessToken, 
  generateRefreshToken,
  verifyRefreshToken,
  hashToken,
  generateTokenExpiration,
  generateRefreshTokenExpiration,
  createAuthResponse,
  validatePassword,
  getSecurityHeaders
} from '../services/auth';
import { authStorage } from '../services/auth-storage';
import { authenticate, optionalAuth } from '../middleware/auth';
import { 
  userRegistrationSchema, 
  userLoginSchema, 
  UserTier,
  AuthResponse 
} from '@shared/schema';

const router = express.Router();

// Rate limiting for authentication endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per window
  message: {
    error: 'Too many authentication attempts',
    code: 'RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // 3 registrations per hour per IP
  message: {
    error: 'Too many registration attempts',
    code: 'REGISTRATION_RATE_LIMIT'
  },
});

// User Registration
router.post('/register', registerLimiter, async (req, res) => {
  try {
    // Apply security headers
    Object.entries(getSecurityHeaders()).forEach(([key, value]) => {
      res.setHeader(key, value);
    });

    // Validate request body
    const validationResult = userRegistrationSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        error: 'Validation failed',
        code: 'VALIDATION_ERROR',
        details: validationResult.error.errors
      });
    }

    const { email, password } = validationResult.data;

    // Validate password strength
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      return res.status(400).json({
        error: 'Password does not meet requirements',
        code: 'WEAK_PASSWORD',
        details: passwordValidation.errors
      });
    }

    // Check if email is already taken
    const existingUser = await authStorage.getUserByEmail(email);
    if (existingUser) {
      return res.status(409).json({
        error: 'Email already registered',
        code: 'EMAIL_EXISTS'
      });
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Create user
    const user = await authStorage.createUser({
      email,
      passwordHash,
      emailVerified: false,
      tier: 'starter' as UserTier,
      creditsRemaining: 0
    });

    // Generate tokens
    const accessToken = generateAccessToken({
      id: user.id,
      email: user.email,
      tier: user.tier as UserTier
    });
    const refreshToken = generateRefreshToken(user.id);

    // Create session
    const session = await authStorage.createSession({
      userId: user.id,
      tokenHash: hashToken(accessToken),
      refreshTokenHash: hashToken(refreshToken),
      expiresAt: generateTokenExpiration(),
      refreshExpiresAt: generateRefreshTokenExpiration(),
      userAgent: req.headers['user-agent'],
      ipAddress: req.ip
    });

    // Return auth response
    const authResponse = createAuthResponse({
      ...user,
      tier: user.tier as UserTier
    }, accessToken, refreshToken);
    
    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      ...authResponse
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      error: 'Registration failed',
      code: 'REGISTRATION_ERROR'
    });
  }
});

// User Login
router.post('/login', authLimiter, async (req, res) => {
  try {
    // Apply security headers
    Object.entries(getSecurityHeaders()).forEach(([key, value]) => {
      res.setHeader(key, value);
    });

    // Validate request body
    const validationResult = userLoginSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        error: 'Validation failed',
        code: 'VALIDATION_ERROR',
        details: validationResult.error.errors
      });
    }

    const { email, password } = validationResult.data;

    // Get user by email
    const user = await authStorage.getUserByEmail(email);
    if (!user) {
      return res.status(401).json({
        error: 'Invalid credentials',
        code: 'INVALID_CREDENTIALS'
      });
    }

    // Verify password
    const isPasswordValid = await verifyPassword(password, user.passwordHash);
    if (!isPasswordValid) {
      return res.status(401).json({
        error: 'Invalid credentials',
        code: 'INVALID_CREDENTIALS'
      });
    }

    // Generate tokens
    const accessToken = generateAccessToken({
      id: user.id,
      email: user.email,
      tier: user.tier as UserTier
    });
    const refreshToken = generateRefreshToken(user.id);

    // Create session
    const session = await authStorage.createSession({
      userId: user.id,
      tokenHash: hashToken(accessToken),
      refreshTokenHash: hashToken(refreshToken),
      expiresAt: generateTokenExpiration(),
      refreshExpiresAt: generateRefreshTokenExpiration(),
      userAgent: req.headers['user-agent'],
      ipAddress: req.ip
    });

    // Return auth response
    const authResponse = createAuthResponse({
      ...user,
      tier: user.tier as UserTier
    }, accessToken, refreshToken);
    
    res.json({
      success: true,
      message: 'Login successful',
      ...authResponse
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      error: 'Login failed',
      code: 'LOGIN_ERROR'
    });
  }
});

// Token Refresh
router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        error: 'Refresh token required',
        code: 'NO_REFRESH_TOKEN'
      });
    }

    // Verify refresh token
    const decoded = verifyRefreshToken(refreshToken);
    if (!decoded) {
      return res.status(401).json({
        error: 'Invalid refresh token',
        code: 'INVALID_REFRESH_TOKEN'
      });
    }

    // Generate new tokens
    const user = await authStorage.getUserById(decoded.userId);
    if (!user) {
      return res.status(401).json({
        error: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }

    const newAccessToken = generateAccessToken({
      id: user.id,
      email: user.email,
      tier: user.tier as UserTier
    });
    const newRefreshToken = generateRefreshToken(user.id);

    // Update session
    const updatedSession = await authStorage.refreshUserSession(
      hashToken(refreshToken),
      hashToken(newAccessToken),
      hashToken(newRefreshToken),
      generateTokenExpiration(),
      generateRefreshTokenExpiration()
    );

    if (!updatedSession) {
      return res.status(401).json({
        error: 'Session refresh failed',
        code: 'REFRESH_FAILED'
      });
    }

    // Return new tokens
    const authResponse = createAuthResponse({
      ...user,
      tier: user.tier as UserTier
    }, newAccessToken, newRefreshToken);
    
    res.json({
      success: true,
      message: 'Tokens refreshed successfully',
      ...authResponse
    });

  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(500).json({
      error: 'Token refresh failed',
      code: 'REFRESH_ERROR'
    });
  }
});

// Logout
router.post('/logout', authenticate, async (req, res) => {
  try {
    if (req.session) {
      await authStorage.deleteSession(req.session.id);
    }

    res.json({
      success: true,
      message: 'Logged out successfully'
    });

  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      error: 'Logout failed',
      code: 'LOGOUT_ERROR'
    });
  }
});

// Logout from all devices
router.post('/logout-all', authenticate, async (req, res) => {
  try {
    if (req.user) {
      const deletedCount = await authStorage.deleteAllUserSessions(req.user.id);
      
      res.json({
        success: true,
        message: `Logged out from ${deletedCount} devices`
      });
    } else {
      res.status(401).json({
        error: 'User not authenticated',
        code: 'NOT_AUTHENTICATED'
      });
    }

  } catch (error) {
    console.error('Logout all error:', error);
    res.status(500).json({
      error: 'Logout failed',
      code: 'LOGOUT_ALL_ERROR'
    });
  }
});

// Get current user profile
router.get('/me', authenticate, async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: 'User not authenticated',
        code: 'NOT_AUTHENTICATED'
      });
    }

    // Get user stats
    const stats = await authStorage.getUserStats(req.user.id);

    res.json({
      success: true,
      user: {
        id: req.user.id,
        email: req.user.email,
        tier: req.user.tier,
        creditsRemaining: req.user.creditsRemaining || 0,
        emailVerified: req.user.emailVerified || false,
        createdAt: req.user.createdAt,
        stats
      }
    });

  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      error: 'Failed to get user profile',
      code: 'PROFILE_ERROR'
    });
  }
});

// Check if email is available
router.post('/check-email', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email || typeof email !== 'string') {
      return res.status(400).json({
        error: 'Email is required',
        code: 'EMAIL_REQUIRED'
      });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        error: 'Invalid email format',
        code: 'INVALID_EMAIL'
      });
    }

    const isEmailTaken = await authStorage.isEmailTaken(email);

    res.json({
      available: !isEmailTaken,
      email
    });

  } catch (error) {
    console.error('Check email error:', error);
    res.status(500).json({
      error: 'Failed to check email availability',
      code: 'EMAIL_CHECK_ERROR'
    });
  }
});

// Password strength validation
router.post('/validate-password', (req, res) => {
  try {
    const { password } = req.body;

    if (!password || typeof password !== 'string') {
      return res.status(400).json({
        error: 'Password is required',
        code: 'PASSWORD_REQUIRED'
      });
    }

    const validation = validatePassword(password);

    res.json({
      valid: validation.valid,
      errors: validation.errors,
      requirements: [
        'At least 8 characters long',
        'Contains at least one lowercase letter',
        'Contains at least one uppercase letter',
        'Contains at least one number',
        'Contains at least one special character'
      ]
    });

  } catch (error) {
    console.error('Password validation error:', error);
    res.status(500).json({
      error: 'Password validation failed',
      code: 'PASSWORD_VALIDATION_ERROR'
    });
  }
});

export default router;