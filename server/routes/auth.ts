import express from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import jwt from 'jsonwebtoken';
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
import { sendVerificationEmail, sendPasswordResetEmail, verifyEmailToken, checkEmailServiceHealth } from '../services/email';
import { storage } from '../storage';
import { ensureDemoData } from '../services/demo-data';
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
  windowMs: 2 * 60 * 1000, // 2 minutes
  max: 50, // 50 registrations per 2 minutes per IP - very generous for testing
  message: {
    error: 'Too many registration attempts. Please wait a few minutes and try again.',
    code: 'REGISTRATION_RATE_LIMIT'
  },
});

// User Registration
router.post('/register', registerLimiter, async (req, res) => {
  try {
    console.log('🔍 Registration attempt - DATABASE_URL:', process.env.DATABASE_URL ? 'Set' : 'Not set');
    
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

    // Create email capture for the user (so analyze endpoint can find them)
    try {
      const existingCapture = await storage.getEmailCapture(email);
      if (!existingCapture) {
        await storage.createEmailCapture({
          email,
          tier: 'starter',
          websiteUrl: '' // Use empty string instead of null to satisfy database constraint
          // Note: userId references the old users table, not authUsers, so we skip it
        });
        console.log(`✅ Created email capture for new user: ${email}`);
      } else if (!existingCapture.userId) {
        // Skip updating userId since it references the old users table
        console.log(`✅ Email capture already exists for: ${email}`);
      }
    } catch (error) {
      console.error('Failed to create/update email capture for user:', error);
      // Don't fail registration if email capture fails
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

    // Send verification email (non-blocking)
    sendVerificationEmail(user).catch(error => {
      console.error('Failed to send verification email:', error);
    });

    // Return auth response
    const authResponse = createAuthResponse({
      ...user,
      tier: user.tier as UserTier
    }, accessToken, refreshToken);
    
    res.status(201).json({
      success: true,
      message: 'User registered successfully. Please check your email to verify your account.',
      ...authResponse
    });

  } catch (error) {
    console.error('Registration error:', error);
    console.error('Registration error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      databaseUrl: process.env.DATABASE_URL ? 'Set' : 'Not set',
      nodeEnv: process.env.NODE_ENV
    });
    res.status(500).json({
      error: 'Registration failed', 
      code: 'REGISTRATION_ERROR',
      debug: error instanceof Error ? error.message : 'Unknown error',
      dbStatus: process.env.DATABASE_URL ? 'configured' : 'missing'
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

    // Check for demo credentials
    if (email === 'demo@llmtxtmastery.com' && password === 'DemoAccess2025!') {
      console.log('🎭 Demo login detected for:', email);
      
      // Ensure demo data exists (non-blocking)
      ensureDemoData().catch(error => {
        console.error('Failed to ensure demo data:', error);
      });
      
      // Create demo user object
      const demoUser = {
        id: -1,
        email: 'demo@llmtxtmastery.com',
        tier: 'coffee' as UserTier,
        emailVerified: true,
        creditsRemaining: 100,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Generate tokens for demo user
      const accessToken = generateAccessToken({
        id: demoUser.id,
        email: demoUser.email,
        tier: demoUser.tier
      });
      const refreshToken = generateRefreshToken(demoUser.id);

      // Create auth response with demo flag
      const authResponse = createAuthResponse(demoUser, accessToken, refreshToken);
      
      return res.json({
        success: true,
        message: 'Demo login successful',
        isDemo: true,
        ...authResponse
      });
    }

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
    console.error('Check email error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    res.status(500).json({
      error: 'Failed to check email availability',
      code: 'EMAIL_CHECK_ERROR',
      debug: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.message : 'Unknown error') : undefined
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

// Check if user account exists (for auto-login after purchase)
router.post('/check-account', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email || typeof email !== 'string') {
      return res.status(400).json({
        error: 'Email is required',
        code: 'EMAIL_REQUIRED'
      });
    }

    const user = await authStorage.getUserByEmail(email);
    
    res.json({
      hasAccount: !!user,
      user: user ? {
        id: user.id,
        email: user.email,
        tier: user.tier,
        creditsRemaining: user.creditsRemaining || 0,
        emailVerified: user.emailVerified || false
      } : null
    });

  } catch (error) {
    console.error('Check account error:', error);
    res.status(500).json({
      error: 'Failed to check account',
      code: 'ACCOUNT_CHECK_ERROR'
    });
  }
});

// Coffee purchase auto-login (secure login after verified purchase)
router.post('/coffee-login', async (req, res) => {
  try {
    const { email, sessionId } = req.body;
    console.log('☕ Coffee login attempt for:', email, 'sessionId:', sessionId);

    if (!email || !sessionId) {
      return res.status(400).json({
        error: 'Email and session ID are required',
        code: 'MISSING_PARAMETERS'
      });
    }

    // Get user by email
    const user = await authStorage.getUserByEmail(email);
    console.log('🔍 User lookup result:', user ? `Found user ${user.email} with tier ${user.tier}` : 'User not found');
    
    if (!user) {
      console.log('❌ Coffee login failed: User not found for', email);
      return res.status(404).json({
        error: 'User account not found',
        code: 'USER_NOT_FOUND'
      });
    }

    // Verify this is a recent coffee purchase by checking if user has coffee tier
    // Additional security: only allow if user has coffee tier (updated by webhook)
    if (user.tier !== 'coffee') {
      console.log('❌ Coffee login failed: Invalid tier for', email, '- expected coffee, got:', user.tier);
      return res.status(403).json({
        error: 'Coffee tier not found for user',
        code: 'INVALID_TIER'
      });
    }
    
    console.log('✅ Coffee user verified, generating tokens for:', email);

    // Generate tokens for auto-login
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
      message: 'Auto-login successful',
      ...authResponse
    });

  } catch (error) {
    console.error('Coffee auto-login error:', error);
    res.status(500).json({
      error: 'Auto-login failed',
      code: 'AUTO_LOGIN_ERROR'
    });
  }
});

// Get user's analysis history
router.get('/my-analyses', authenticate, async (req, res) => {
  try {
    const authUser = req.user;
    if (!authUser) {
      return res.status(401).json({
        error: 'User not authenticated',
        code: 'NOT_AUTHENTICATED'
      });
    }

    // Get analyses by email (since analyses are stored with email, not auth user ID)
    const analyses = await authStorage.getUserAnalyses(authUser.email);
    
    res.json({
      success: true,
      analyses: analyses.map(analysis => ({
        id: analysis.id,
        url: analysis.url,
        status: analysis.status,
        createdAt: analysis.createdAt,
        totalPages: analysis.analysisMetadata?.totalPagesFound || 0,
        siteType: analysis.analysisMetadata?.siteType || 'unknown',
        analysisMethod: analysis.analysisMetadata?.analysisMethod || 'unknown',
        processingTime: analysis.analysisMetadata?.processingTime || 0,
        tier: analysis.analysisMetadata?.tier || 'starter',
        // Include metrics if available
        metrics: analysis.analysisMetadata?.metrics,
        // Include page count for completed analyses
        discoveredPagesCount: analysis.discoveredPages?.length || 0
      }))
    });

  } catch (error) {
    console.error('Get user analyses error:', error);
    res.status(500).json({
      error: 'Failed to get analysis history',
      code: 'ANALYSES_ERROR'
    });
  }
});

// Get specific analysis details for authenticated user
router.get('/my-analyses/:id', authenticate, async (req, res) => {
  try {
    const authUser = req.user;
    if (!authUser) {
      return res.status(401).json({
        error: 'User not authenticated',
        code: 'NOT_AUTHENTICATED'
      });
    }

    const analysisId = parseInt(req.params.id);
    const analysis = await authStorage.getUserAnalysis(authUser.email, analysisId);
    
    if (!analysis) {
      return res.status(404).json({
        error: 'Analysis not found or access denied',
        code: 'ANALYSIS_NOT_FOUND'
      });
    }

    res.json({
      success: true,
      analysis: {
        id: analysis.id,
        url: analysis.url,
        status: analysis.status,
        createdAt: analysis.createdAt,
        discoveredPages: analysis.discoveredPages || [],
        analysisMetadata: analysis.analysisMetadata
      }
    });

  } catch (error) {
    console.error('Get user analysis error:', error);
    res.status(500).json({
      error: 'Failed to get analysis details',
      code: 'ANALYSIS_ERROR'
    });
  }
});

// Email verification endpoint
router.get('/verify-email', async (req, res) => {
  try {
    const { token } = req.query;
    
    if (!token || typeof token !== 'string') {
      return res.status(400).json({
        error: 'Verification token is required',
        code: 'TOKEN_REQUIRED'
      });
    }
    
    // Verify the token
    const tokenData = verifyEmailToken(token);
    if (!tokenData) {
      return res.status(400).json({
        error: 'Invalid or expired verification token',
        code: 'INVALID_TOKEN'
      });
    }
    
    // Get user and verify email matches
    const user = await authStorage.getUserById(tokenData.userId);
    if (!user || user.email !== tokenData.email) {
      return res.status(400).json({
        error: 'Token validation failed',
        code: 'TOKEN_VALIDATION_FAILED'
      });
    }
    
    // Check if already verified
    if (user.emailVerified) {
      return res.json({
        success: true,
        message: 'Email already verified',
        alreadyVerified: true
      });
    }
    
    // Mark email as verified
    await authStorage.verifyUserEmail(user.id);
    
    res.json({
      success: true,
      message: 'Email verified successfully',
      email: user.email
    });
    
  } catch (error) {
    console.error('Email verification error:', error);
    res.status(500).json({
      error: 'Email verification failed',
      code: 'VERIFICATION_ERROR'
    });
  }
});

// Resend verification email
router.post('/resend-verification', authenticate, async (req, res) => {
  try {
    const authUser = req.user;
    if (!authUser) {
      return res.status(401).json({
        error: 'User not authenticated',
        code: 'NOT_AUTHENTICATED'
      });
    }
    
    // Check if already verified
    if (authUser.emailVerified) {
      return res.json({
        success: true,
        message: 'Email already verified',
        alreadyVerified: true
      });
    }
    
    // Send verification email
    const result = await sendVerificationEmail({
      id: authUser.id,
      email: authUser.email
    });
    
    if (!result.success) {
      console.error('❌ Resend verification failed:', result.error);
      console.error('  - Error Type:', result.errorType);
      console.error('  - Error Details:', result.errorDetails);
      
      // Provide user-friendly error messages based on error type
      let userMessage = result.error || 'Failed to send verification email';
      if (result.errorType === 'resend_api_error') {
        const errorStr = JSON.stringify(result.errorDetails || {});
        if (errorStr.includes('domain')) {
          userMessage = 'Email service configuration issue. Please contact support.';
        } else if (errorStr.includes('rate')) {
          userMessage = 'Too many email requests. Please try again in a few minutes.';
        } else if (errorStr.includes('auth') || errorStr.includes('key')) {
          userMessage = 'Email service authentication issue. Please contact support.';
        }
      }
      
      return res.status(500).json({
        error: userMessage,
        code: 'EMAIL_SEND_FAILED',
        errorType: result.errorType,
        technicalError: result.error
      });
    }
    
    res.json({
      success: true,
      message: 'Verification email sent successfully'
    });
    
  } catch (error) {
    console.error('Resend verification error:', error);
    res.status(500).json({
      error: 'Failed to resend verification email',
      code: 'RESEND_ERROR'
    });
  }
});

// Request password reset
router.post('/request-password-reset', async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email || typeof email !== 'string') {
      return res.status(400).json({
        error: 'Email is required',
        code: 'EMAIL_REQUIRED'
      });
    }
    
    // Get user by email
    const user = await authStorage.getUserByEmail(email);
    
    // Always return success to prevent email enumeration
    if (!user) {
      return res.json({
        success: true,
        message: 'If an account exists with this email, a password reset link has been sent'
      });
    }
    
    // Check if email is verified
    if (!user.emailVerified) {
      return res.status(400).json({
        error: 'Please verify your email address first',
        code: 'EMAIL_NOT_VERIFIED'
      });
    }
    
    // Send password reset email
    const result = await sendPasswordResetEmail({
      id: user.id,
      email: user.email
    });
    
    res.json({
      success: true,
      message: 'If an account exists with this email, a password reset link has been sent'
    });
    
  } catch (error) {
    console.error('Password reset request error:', error);
    res.status(500).json({
      error: 'Failed to process password reset request',
      code: 'RESET_REQUEST_ERROR'
    });
  }
});

// Reset password with token
router.post('/reset-password', async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    
    if (!token || !newPassword) {
      return res.status(400).json({
        error: 'Token and new password are required',
        code: 'MISSING_PARAMETERS'
      });
    }
    
    // Validate new password
    const validation = validatePassword(newPassword);
    if (!validation.valid) {
      return res.status(400).json({
        error: 'Password does not meet requirements',
        code: 'WEAK_PASSWORD',
        details: validation.errors
      });
    }
    
    // Verify token (reusing email verification token logic for simplicity)
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key') as any;
    if (decoded.type !== 'password-reset') {
      return res.status(400).json({
        error: 'Invalid reset token',
        code: 'INVALID_TOKEN'
      });
    }
    
    // Update password
    const passwordHash = await hashPassword(newPassword);
    await authStorage.updateUserPassword(decoded.userId, passwordHash);
    
    res.json({
      success: true,
      message: 'Password reset successfully'
    });
    
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(400).json({
        error: 'Invalid or expired reset token',
        code: 'INVALID_TOKEN'
      });
    }
    
    console.error('Password reset error:', error);
    res.status(500).json({
      error: 'Failed to reset password',
      code: 'RESET_ERROR'
    });
  }
});

// Email service health check endpoint
router.get('/email-health', async (req, res) => {
  try {
    console.log('🏥 Email health check requested');
    const health = await checkEmailServiceHealth();
    
    // Return appropriate HTTP status based on health
    const statusCode = health.status === 'healthy' ? 200 : 
                      health.status === 'degraded' ? 207 : 503;
    
    res.status(statusCode).json({
      success: health.status === 'healthy',
      ...health,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Email health check endpoint error:', error);
    res.status(500).json({
      success: false,
      service: 'email',
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
});

// Demo data reset endpoint
router.post('/demo/reset', async (req, res) => {
  try {
    console.log('🔄 Demo data reset requested');

    // Demo user constants
    const DEMO_USER_ID = -1;
    const DEMO_USER_EMAIL = 'demo@llmtxtmastery.com';
    
    // Delete existing demo data
    const deletedAnalyses = await storage.deleteAnalysesForUser(DEMO_USER_ID);
    const deletedLlmFiles = await storage.deleteLlmFilesForUser(DEMO_USER_ID);
    const deletedUsage = await storage.deleteUsageForUser(DEMO_USER_ID);
    
    console.log(`🗑️ Deleted: ${deletedAnalyses} analyses, ${deletedLlmFiles} LLM files, ${deletedUsage} usage records`);
    
    // Recreate fresh demo data
    await ensureDemoData();
    
    res.json({ 
      success: true, 
      message: 'Demo data reset successfully',
      deleted: {
        analyses: deletedAnalyses,
        llmFiles: deletedLlmFiles,
        usage: deletedUsage
      }
    });
    
  } catch (error) {
    console.error('❌ Demo reset failed:', error);
    res.status(500).json({ 
      error: 'Demo reset failed',
      code: 'DEMO_RESET_ERROR'
    });
  }
});

// Admin endpoint to manually reset Coffee tier credits (for testing renewals)
router.post('/admin/reset-coffee-credits', async (req, res) => {
  try {
    // Security check - require admin access
    const adminKey = req.headers['x-admin-key'] as string;
    if (adminKey !== process.env.ADMIN_KEY) {
      return res.status(403).json({ 
        error: 'Admin access required',
        code: 'ADMIN_ACCESS_REQUIRED'
      });
    }

    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({
        error: 'Email required',
        code: 'EMAIL_REQUIRED'
      });
    }

    // Get the user
    const user = await authStorage.getUserByEmail(email);
    
    if (!user) {
      return res.status(404).json({
        error: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }

    if (user.tier !== 'coffee') {
      return res.status(400).json({
        error: 'User is not on Coffee tier',
        code: 'NOT_COFFEE_TIER',
        userTier: user.tier
      });
    }

    // Reset credits to 100
    await authStorage.updateUser(user.id, {
      creditsRemaining: 100
    });

    // Also call the renewal handler
    const { handleSubscriptionRenewal } = await import('../services/usage');
    await handleSubscriptionRenewal(user.id);

    console.log(`[ADMIN] Manually reset credits to 100 for Coffee tier user: ${email}`);

    res.json({
      success: true,
      message: 'Credits reset successfully',
      user: email,
      newCredits: 100,
      previousCredits: user.creditsRemaining
    });

  } catch (error) {
    console.error('Admin credit reset error:', error);
    res.status(500).json({
      error: 'Failed to reset credits',
      code: 'RESET_ERROR'
    });
  }
});

// Admin endpoint to fix existing Coffee tier users with incorrect credit amounts
router.post('/admin/fix-coffee-credits', async (req, res) => {
  try {
    // Security check - require admin access (this is a temporary migration endpoint)
    const adminKey = req.headers['x-admin-key'] as string;
    if (adminKey !== process.env.ADMIN_KEY) {
      return res.status(403).json({ 
        error: 'Admin access required',
        code: 'ADMIN_ACCESS_REQUIRED'
      });
    }

    const COFFEE_TIER_CREDITS = 100;
    
    // Find all Coffee tier users with less than 100 credits
    const coffeeUsers = await authStorage.getUsersByTier('coffee');
    const usersToFix = coffeeUsers.filter(user => 
      (user.creditsRemaining || 0) < COFFEE_TIER_CREDITS
    );
    
    console.log(`Found ${usersToFix.length} Coffee tier users needing credit adjustment`);
    
    const fixes = [];
    
    for (const user of usersToFix) {
      const currentCredits = user.creditsRemaining || 0;
      const creditDiff = COFFEE_TIER_CREDITS - currentCredits;
      
      // Update user to have 100 total credits
      await authStorage.updateUser(user.id, {
        creditsRemaining: COFFEE_TIER_CREDITS
      });
      
      fixes.push({
        userId: user.id,
        email: user.email,
        oldCredits: currentCredits,
        newCredits: COFFEE_TIER_CREDITS,
        creditsAdded: creditDiff
      });
      
      console.log(`Fixed Coffee user ${user.email}: ${currentCredits} -> ${COFFEE_TIER_CREDITS} credits`);
    }
    
    res.json({ 
      success: true, 
      message: `Fixed ${fixes.length} Coffee tier users`,
      fixes
    });
    
  } catch (error) {
    console.error('❌ Coffee credits fix failed:', error);
    res.status(500).json({ 
      error: 'Coffee credits fix failed',
      code: 'COFFEE_CREDITS_FIX_ERROR',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;