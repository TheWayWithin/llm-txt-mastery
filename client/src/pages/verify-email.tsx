import React, { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/contexts/AuthContext';
import { useFlowStateMachine } from '@/hooks/useFlowStateMachine';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, CheckCircle2, Loader2, Mail } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function VerifyEmailPage() {
  const [, setLocation] = useLocation();
  const { refreshUser } = useAuth();
  const { actions } = useFlowStateMachine();
  const [verificationState, setVerificationState] = useState<'loading' | 'success' | 'error' | 'already-verified'>('loading');
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
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'https://llm-txt-mastery-production.up.railway.app'}/api/auth/verify-email?token=${token}`, {
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
          
          // Trigger EMAIL_VERIFIED event to update flow state machine
          if (updatedUser) {
            console.log('🔄 Triggering EMAIL_VERIFIED event for smooth transition to URL input');
            actions.verifyEmail(updatedUser);
          }
        } catch (error) {
          console.error('Failed to refresh user data after verification:', error);
          // Don't fail the verification, just log the error
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
    setLocation('/analyze');
  };

  const handleLogin = () => {
    setLocation('/');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-ai-purple/5 via-white to-ai-orange/5 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4">
            {verificationState === 'loading' && (
              <div className="w-16 h-16 bg-ai-purple/10 rounded-full flex items-center justify-center">
                <Loader2 className="h-8 w-8 text-ai-purple animate-spin" />
              </div>
            )}
            {verificationState === 'success' && (
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle2 className="h-8 w-8 text-green-600" />
              </div>
            )}
            {verificationState === 'already-verified' && (
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                <CheckCircle2 className="h-8 w-8 text-blue-600" />
              </div>
            )}
            {verificationState === 'error' && (
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                <AlertCircle className="h-8 w-8 text-red-600" />
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
            {verificationState === 'success' && `Your email ${email} has been successfully verified`}
            {verificationState === 'already-verified' && 'Your email address was already verified'}
            {verificationState === 'error' && 'We couldn\'t verify your email address'}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {verificationState === 'error' && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {errorMessage === 'Invalid or expired verification token' 
                  ? 'This verification link has expired or is invalid. Please request a new verification email.'
                  : errorMessage
                }
              </AlertDescription>
            </Alert>
          )}

          {verificationState === 'success' && (
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                You can now access all features including password reset and tier upgrades.
              </AlertDescription>
            </Alert>
          )}

          {verificationState === 'already-verified' && (
            <Alert className="border-blue-200 bg-blue-50">
              <Mail className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-blue-800">
                Your email was previously verified. You already have full access to your account.
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-3">
            {(verificationState === 'success' || verificationState === 'already-verified') && (
              <Button 
                onClick={handleContinue}
                className="w-full bg-gradient-to-r from-ai-purple to-ai-orange text-white"
              >
                Continue to LLM.txt Mastery
              </Button>
            )}

            {verificationState === 'error' && (
              <>
                <Button 
                  onClick={handleLogin}
                  className="w-full bg-gradient-to-r from-ai-purple to-ai-orange text-white"
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