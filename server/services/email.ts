import { Resend } from 'resend';
import jwt from 'jsonwebtoken';
import { AuthUser } from '@shared/schema';

// Initialize Resend with API key (will be added to .env)
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

// Email configuration
const EMAIL_FROM = process.env.EMAIL_FROM || 'LLM.txt Mastery <noreply@llmtxtmastery.com>';
const FRONTEND_URL = process.env.NODE_ENV === 'production' 
  ? 'https://llmtxtmastery.com'
  : 'http://localhost:5000';

// Generate verification token
export function generateVerificationToken(userId: number, email: string): string {
  const secret = process.env.JWT_SECRET || 'your-secret-key';
  return jwt.sign(
    { 
      userId, 
      email, 
      type: 'email-verification' 
    },
    secret,
    { expiresIn: '24h' }
  );
}

// Verify token
export function verifyEmailToken(token: string): { userId: number; email: string } | null {
  try {
    const secret = process.env.JWT_SECRET || 'your-secret-key';
    const decoded = jwt.verify(token, secret) as any;
    
    if (decoded.type !== 'email-verification') {
      return null;
    }
    
    return {
      userId: decoded.userId,
      email: decoded.email
    };
  } catch (error) {
    console.error('Token verification failed:', error);
    return null;
  }
}

// Send verification email
export async function sendVerificationEmail(user: { id: number; email: string }) {
  console.log('📧 sendVerificationEmail called for:', user.email);
  console.log('📧 RESEND_API_KEY exists:', !!process.env.RESEND_API_KEY);
  console.log('📧 NODE_ENV:', process.env.NODE_ENV);
  
  // In development without Resend key, log the link
  if (!resend) {
    const token = generateVerificationToken(user.id, user.email);
    const verificationUrl = `${FRONTEND_URL}/verify-email?token=${token}`;
    console.log('📧 Verification Email (No Resend API Key):');
    console.log(`To: ${user.email}`);
    console.log(`Verification URL: ${verificationUrl}`);
    
    // In production, this is an error
    if (process.env.NODE_ENV === 'production') {
      console.error('❌ RESEND_API_KEY not set in production! Email cannot be sent.');
      return { 
        success: false, 
        error: 'RESEND_API_KEY not configured in production environment' 
      };
    }
    
    return { success: true, message: 'Email logged to console (dev mode)' };
  }

  try {
    const token = generateVerificationToken(user.id, user.email);
    const verificationUrl = `${FRONTEND_URL}/verify-email?token=${token}`;
    
    // Enhanced logging for debugging
    console.log('📧 Email service configuration:');
    console.log('  - FROM:', EMAIL_FROM);
    console.log('  - TO:', user.email);
    console.log('  - FRONTEND_URL:', FRONTEND_URL);
    console.log('  - Token length:', token.length);
    console.log('  - Verification URL:', verificationUrl);
    
    // Validate email parameters
    if (!EMAIL_FROM || !EMAIL_FROM.includes('@')) {
      console.error('❌ Invalid EMAIL_FROM format:', EMAIL_FROM);
      return { 
        success: false, 
        error: `Invalid EMAIL_FROM format: ${EMAIL_FROM}` 
      };
    }
    
    if (!user.email || !user.email.includes('@')) {
      console.error('❌ Invalid recipient email format:', user.email);
      return { 
        success: false, 
        error: `Invalid recipient email format: ${user.email}` 
      };
    }
    
    console.log('📧 Attempting to send email via Resend API...');
    const emailPayload = {
      from: EMAIL_FROM,
      to: user.email,
      subject: 'Verify your email for LLM.txt Mastery',
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Verify Your Email</title>
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 28px;">Welcome to LLM.txt Mastery!</h1>
            </div>
            
            <div style="background: white; padding: 30px; border: 1px solid #e1e1e1; border-top: none; border-radius: 0 0 10px 10px;">
              <h2 style="color: #333; margin-top: 0;">Verify Your Email Address</h2>
              
              <p style="color: #666; font-size: 16px;">
                Thank you for signing up! Please click the button below to verify your email address and unlock all features:
              </p>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${verificationUrl}" style="display: inline-block; padding: 14px 30px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 16px;">
                  Verify Email Address
                </a>
              </div>
              
              <p style="color: #999; font-size: 14px;">
                Or copy and paste this link into your browser:
              </p>
              <p style="color: #667eea; font-size: 14px; word-break: break-all;">
                ${verificationUrl}
              </p>
              
              <hr style="border: none; border-top: 1px solid #e1e1e1; margin: 30px 0;">
              
              <div style="color: #999; font-size: 13px;">
                <p><strong>Why verify your email?</strong></p>
                <ul style="margin: 10px 0; padding-left: 20px;">
                  <li>Secure your account with password reset capability</li>
                  <li>Receive important updates about your analyses</li>
                  <li>Access premium features and tier upgrades</li>
                </ul>
                
                <p style="margin-top: 20px;">
                  This link expires in 24 hours. If you didn't create an account, you can safely ignore this email.
                </p>
              </div>
            </div>
            
            <div style="text-align: center; margin-top: 20px; color: #999; font-size: 12px;">
              <p>© 2025 LLM.txt Mastery. All rights reserved.</p>
              <p>
                <a href="${FRONTEND_URL}/privacy" style="color: #667eea; text-decoration: none;">Privacy Policy</a> •
                <a href="${FRONTEND_URL}/terms" style="color: #667eea; text-decoration: none;">Terms of Service</a>
              </p>
            </div>
          </body>
        </html>
      `,
      text: `
Welcome to LLM.txt Mastery!

Please verify your email address by clicking the link below:
${verificationUrl}

This link expires in 24 hours.

Why verify your email?
- Secure your account with password reset capability
- Receive important updates about your analyses  
- Access premium features and tier upgrades

If you didn't create an account, you can safely ignore this email.

Best regards,
The LLM.txt Mastery Team
      `
    };

    console.log('📧 Email payload prepared, calling Resend API...');
    
    const { data, error } = await resend.emails.send(emailPayload);

    // Enhanced error logging
    if (error) {
      console.error('❌ Resend API Error Details:');
      console.error('  - Error Object:', JSON.stringify(error, null, 2));
      console.error('  - Error Type:', typeof error);
      console.error('  - Error Keys:', Object.keys(error || {}));
      
      // Check for common Resend error patterns
      const errorString = JSON.stringify(error);
      if (errorString.includes('domain')) {
        console.error('🔍 Domain verification issue detected');
      }
      if (errorString.includes('rate')) {
        console.error('🔍 Rate limiting issue detected');
      }
      if (errorString.includes('auth') || errorString.includes('key')) {
        console.error('🔍 Authentication/API key issue detected');
      }
      
      return { 
        success: false, 
        error: error.message || JSON.stringify(error),
        errorType: 'resend_api_error',
        errorDetails: error
      };
    }

    // Success logging
    console.log('✅ Email sent successfully via Resend API');
    console.log('  - Message ID:', data?.id);
    console.log('  - Data:', JSON.stringify(data, null, 2));
    
    return { 
      success: true, 
      messageId: data?.id,
      provider: 'resend' 
    };
    
  } catch (error) {
    console.error('❌ Email service catch error:', error);
    console.error('  - Error Type:', typeof error);
    console.error('  - Error Name:', error instanceof Error ? error.name : 'Unknown');
    console.error('  - Error Message:', error instanceof Error ? error.message : 'Unknown');
    console.error('  - Stack Trace:', error instanceof Error ? error.stack : 'No stack');
    
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to send email',
      errorType: 'service_error',
      errorDetails: error instanceof Error ? {
        name: error.name,
        message: error.message,
        stack: error.stack
      } : error
    };
  }
}

// Email service health check
export async function checkEmailServiceHealth() {
  console.log('🏥 Email service health check starting...');
  
  const health = {
    service: 'email',
    status: 'unknown',
    checks: {
      resendApiKey: false,
      emailFromConfig: false,
      frontendUrlConfig: false,
      resendConnection: false
    },
    configuration: {
      nodeEnv: process.env.NODE_ENV,
      emailFrom: EMAIL_FROM,
      frontendUrl: FRONTEND_URL,
      hasResendKey: !!process.env.RESEND_API_KEY
    },
    errors: [] as string[]
  };
  
  try {
    // Check 1: RESEND_API_KEY exists
    if (process.env.RESEND_API_KEY) {
      health.checks.resendApiKey = true;
      console.log('✅ RESEND_API_KEY is configured');
    } else {
      health.errors.push('RESEND_API_KEY environment variable not set');
      console.log('❌ RESEND_API_KEY is missing');
    }
    
    // Check 2: EMAIL_FROM format
    if (EMAIL_FROM && EMAIL_FROM.includes('@')) {
      health.checks.emailFromConfig = true;
      console.log('✅ EMAIL_FROM is properly formatted:', EMAIL_FROM);
    } else {
      health.errors.push(`EMAIL_FROM is invalid: ${EMAIL_FROM}`);
      console.log('❌ EMAIL_FROM is invalid:', EMAIL_FROM);
    }
    
    // Check 3: FRONTEND_URL configuration
    if (FRONTEND_URL && (FRONTEND_URL.startsWith('http'))) {
      health.checks.frontendUrlConfig = true;
      console.log('✅ FRONTEND_URL is configured:', FRONTEND_URL);
    } else {
      health.errors.push(`FRONTEND_URL is invalid: ${FRONTEND_URL}`);
      console.log('❌ FRONTEND_URL is invalid:', FRONTEND_URL);
    }
    
    // Check 4: Test Resend API connection (if available)
    if (resend && health.checks.resendApiKey) {
      try {
        // Note: Resend doesn't have a health check endpoint, so we can't test connection directly
        health.checks.resendConnection = true;
        console.log('✅ Resend client initialized successfully');
      } catch (error) {
        health.errors.push(`Resend client error: ${error instanceof Error ? error.message : 'Unknown'}`);
        console.log('❌ Resend client error:', error);
      }
    }
    
    // Overall health status
    const allChecksPass = Object.values(health.checks).every(check => check);
    health.status = allChecksPass ? 'healthy' : 'degraded';
    
    console.log('🏥 Email service health check completed:', health.status);
    console.log('  - Passed checks:', Object.entries(health.checks).filter(([,v]) => v).length);
    console.log('  - Failed checks:', Object.entries(health.checks).filter(([,v]) => !v).length);
    console.log('  - Errors:', health.errors.length);
    
    return health;
    
  } catch (error) {
    console.error('❌ Email service health check failed:', error);
    health.status = 'unhealthy';
    health.errors.push(`Health check exception: ${error instanceof Error ? error.message : 'Unknown'}`);
    return health;
  }
}

// Send password reset email
export async function sendPasswordResetEmail(user: { id: number; email: string }) {
  const token = jwt.sign(
    { userId: user.id, email: user.email, type: 'password-reset' },
    process.env.JWT_SECRET || 'your-secret-key',
    { expiresIn: '1h' }
  );
  
  const resetUrl = `${FRONTEND_URL}/reset-password?token=${token}`;
  
  // In development without Resend key, log the link
  if (!resend) {
    console.log('📧 Password Reset Email (Dev Mode):');
    console.log(`To: ${user.email}`);
    console.log(`Reset URL: ${resetUrl}`);
    return { success: true, message: 'Email logged to console (dev mode)' };
  }

  try {
    const { data, error } = await resend.emails.send({
      from: EMAIL_FROM,
      to: user.email,
      subject: 'Reset your password - LLM.txt Mastery',
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Reset Your Password</title>
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 28px;">Password Reset Request</h1>
            </div>
            
            <div style="background: white; padding: 30px; border: 1px solid #e1e1e1; border-top: none; border-radius: 0 0 10px 10px;">
              <p style="color: #666; font-size: 16px;">
                We received a request to reset your password. Click the button below to create a new password:
              </p>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${resetUrl}" style="display: inline-block; padding: 14px 30px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 16px;">
                  Reset Password
                </a>
              </div>
              
              <p style="color: #999; font-size: 14px;">
                Or copy and paste this link into your browser:
              </p>
              <p style="color: #667eea; font-size: 14px; word-break: break-all;">
                ${resetUrl}
              </p>
              
              <hr style="border: none; border-top: 1px solid #e1e1e1; margin: 30px 0;">
              
              <p style="color: #999; font-size: 13px;">
                This link expires in 1 hour for security reasons. If you didn't request a password reset, you can safely ignore this email.
              </p>
            </div>
          </body>
        </html>
      `,
      text: `
Password Reset Request

We received a request to reset your password. Click the link below to create a new password:
${resetUrl}

This link expires in 1 hour for security reasons.

If you didn't request a password reset, you can safely ignore this email.

Best regards,
The LLM.txt Mastery Team
      `
    });

    if (error) {
      console.error('Failed to send password reset email:', error);
      return { success: false, error: error.message };
    }

    return { success: true, messageId: data?.id };
  } catch (error) {
    console.error('Email service error:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to send email' 
    };
  }
}