import React, { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/contexts/AuthContext';
import { useFlowStateMachine } from '@/hooks/useFlowStateMachine';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, CheckCircle2, Loader2, Mail } from 'lucide-react';
import { getApiBaseUrl } from '@/lib/api-config';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function VerifyEmailPage() {
  const [, setLocation] = useLocation();
  const { refreshUser } = useAuth();
  const { actions } = useFlowStateMachine();
  const [verificationState, setVerificationState] = useState<
    'loading' | 'success' | 'error' | 'already-verified'
  >('loading');
  const [errorMessage, setErrorMessage] = useState('');
  const [email, setEmail] = useState('');

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');

    if (!token) {
      setVerificationState('error');
      setErrorMessage('No verification token provided');
      return;
    }

    // Verify the email
    verifyEmail(token);
  }, []);

  const verifyEmail = async (token: string) => {
    try {
      const response = await fetch(`${getApiBaseUrl()}/api/auth/verify-email?token=${token}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (response.ok && data.success) {
        if (data.alreadyVerified) {
          setVerificationState('already-verified');
        } else {
          setVerificationState('success');
        }
        setEmail(data.email || '');

        // Refresh the user data in the auth context to update emailVerified status
        try {
          const updatedUser = await refreshUser();
          console.log('✅ User data refreshed after email verification');

          // Force update the stored user data to ensure emailVerified is true
          const storedUser = sessionStorage.getItem('auth_user');
          if (storedUser) {
            const userData = JSON.parse(storedUser);
            userData.emailVerified = true;
            sessionStorage.setItem('auth_user', JSON.stringify(userData));
            console.log('✅ Updated stored user emailVerified status');
          }

          // Auto-redirect after successful verification
          setTimeout(() => {
            localStorage.removeItem('pendingVerificationEmail');
            localStorage.removeItem('pendingAnalysisUrl');

            if (updatedUser) {
              // Already logged in — go straight to analyze
              const pendingUrl = localStorage.getItem('pendingAnalysisUrl');
              const targetUrl = pendingUrl
                ? `/analyze?url=${encodeURIComponent(pendingUrl)}`
                : '/analyze';
              console.log('✅ Logged in, redirecting to:', targetUrl);
              window.location.href = targetUrl;
            } else {
              // Not logged in (post-payment new user) — go to login
              console.log('✅ Not logged in, redirecting to /login');
              window.location.href = '/login?verified=true';
            }
          }, 2000);
        } catch (error) {
          console.error('Failed to refresh user data after verification:', error);
          // Fall back to login page
          setTimeout(() => {
            window.location.href = '/login?verified=true';
          }, 2000);
        }
      } else {
        setVerificationState('error');
        setErrorMessage(data.error || 'Verification failed');
      }
    } catch (error) {
      console.error('Verification error:', error);
      setVerificationState('error');
      setErrorMessage('An error occurred during verification');
    }
  };

  const handleContinue = () => {
    // After successful verification, navigate to analyze page for clean URL input
    console.log('🚀 Continuing to /analyze page for URL input');
    // Use window.location for full page refresh to ensure proper routing
    window.location.href = '/analyze';
  };

  const handleLogin = () => {
    setLocation('/');
  };

  return (
    <div className="min-h-screen bg-cloud flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4">
            {verificationState === 'loading' && (
              <div className="w-16 h-16 bg-signal-blue/10 rounded-full flex items-center justify-center">
                <Loader2 className="h-8 w-8 text-signal-blue animate-spin" />
              </div>
            )}
            {verificationState === 'success' && (
              <div className="w-16 h-16 bg-success/10 rounded-full flex items-center justify-center">
                <CheckCircle2 className="h-8 w-8 text-success" />
              </div>
            )}
            {verificationState === 'already-verified' && (
              <div className="w-16 h-16 bg-signal-blue/10 rounded-full flex items-center justify-center">
                <CheckCircle2 className="h-8 w-8 text-signal-blue" />
              </div>
            )}
            {verificationState === 'error' && (
              <div className="w-16 h-16 bg-error/10 rounded-full flex items-center justify-center">
                <AlertCircle className="h-8 w-8 text-error" />
              </div>
            )}
          </div>

          <CardTitle className="text-2xl font-bold">
            {verificationState === 'loading' && 'Verifying Your Email...'}
            {verificationState === 'success' && 'Email Verified!'}
            {verificationState === 'already-verified' && 'Already Verified'}
            {verificationState === 'error' && 'Verification Failed'}
          </CardTitle>

          <CardDescription className="mt-2">
            {verificationState === 'loading' && 'Please wait while we verify your email address'}
            {verificationState === 'success' &&
              `Your email ${email} has been successfully verified`}
            {verificationState === 'already-verified' && 'Your email address was already verified'}
            {verificationState === 'error' && "We couldn't verify your email address"}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {verificationState === 'error' && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {errorMessage === 'Invalid or expired verification token'
                  ? 'This verification link has expired or is invalid. Please request a new verification email.'
                  : errorMessage}
              </AlertDescription>
            </Alert>
          )}

          {verificationState === 'success' && (
            <Alert className="border-mist bg-success/10">
              <CheckCircle2 className="h-4 w-4 text-success" />
              <AlertDescription className="text-ink">
                You can now access all features including password reset and tier upgrades.
              </AlertDescription>
            </Alert>
          )}

          {verificationState === 'already-verified' && (
            <Alert className="border-mist bg-signal-blue/10">
              <Mail className="h-4 w-4 text-signal-blue" />
              <AlertDescription className="text-ink">
                Your email was previously verified. You already have full access to your account.
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-3">
            {(verificationState === 'success' || verificationState === 'already-verified') && (
              <Button
                onClick={handleContinue}
                className="w-full bg-signal-blue hover:bg-[#1D4ED8] text-white"
              >
                Continue to LLM.txt Mastery
              </Button>
            )}

            {verificationState === 'error' && (
              <>
                <Button
                  onClick={handleLogin}
                  className="w-full bg-signal-blue hover:bg-[#1D4ED8] text-white"
                >
                  Go to Login
                </Button>
                <p className="text-sm text-center text-muted-foreground">
                  You can request a new verification email from your account settings
                </p>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
