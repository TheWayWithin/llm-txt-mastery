import React, { useState, useEffect } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Mail, Loader2, CheckCircle2, X } from 'lucide-react';
import { getApiBaseUrl } from '@/lib/api-config';
import { toast } from 'sonner';

interface EmailVerificationBannerProps {
  userEmail: string;
  emailVerified?: boolean;
}

export default function EmailVerificationBanner({
  userEmail,
  emailVerified,
}: EmailVerificationBannerProps) {
  const [isResending, setIsResending] = useState(false);
  const [resent, setResent] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  // Check localStorage for dismiss state on mount
  useEffect(() => {
    const dismissKey = `email-banner-dismissed-${userEmail}`;
    const dismissedUntil = localStorage.getItem(dismissKey);

    if (dismissedUntil) {
      const dismissTime = parseInt(dismissedUntil, 10);
      if (dismissTime > Date.now()) {
        setIsDismissed(true);
      } else {
        // Clean up expired dismiss
        localStorage.removeItem(dismissKey);
      }
    }
  }, [userEmail]);

  // Log for debugging and prevent tree-shaking
  console.log('📧 EmailVerificationBanner rendered:', {
    userEmail,
    emailVerified,
    isDismissed,
    typeOfEmailVerified: typeof emailVerified,
    isExactlyFalse: emailVerified === false,
    isNotFalse: emailVerified !== false,
    willReturn: emailVerified !== false || isDismissed ? 'null' : 'banner',
  });

  // Don't show if there's no user email, email is already verified, or user dismissed it
  if (!userEmail || emailVerified !== false || isDismissed) {
    console.log('❌ Banner hidden:', { userEmail, emailVerified, isDismissed });
    return null;
  }

  console.log('✅ Banner will show: emailVerified is false');

  // Test if we can render anything at all
  console.log('🎨 About to render Alert component');

  const handleDismiss = () => {
    // Dismiss for 24 hours
    const dismissKey = `email-banner-dismissed-${userEmail}`;
    const dismissUntil = Date.now() + 24 * 60 * 60 * 1000; // 24 hours from now
    localStorage.setItem(dismissKey, dismissUntil.toString());
    setIsDismissed(true);
    console.log('📧 Banner dismissed for 24 hours');
  };

  const handleResendVerification = async () => {
    setIsResending(true);
    try {
      const token = sessionStorage.getItem('auth_access_token');
      const apiUrl =
        getApiBaseUrl();
      const response = await fetch(`${apiUrl}/api/auth/resend-verification`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setResent(true);
        toast.success('Verification email sent! Please check your inbox.');

        // Reset the resent state after 30 seconds
        setTimeout(() => setResent(false), 30000);
      } else {
        toast.error(data.error || 'Failed to send verification email');
      }
    } catch (error) {
      console.error('Resend verification error:', error);
      toast.error('An error occurred while sending the verification email');
    } finally {
      setIsResending(false);
    }
  };

  // Try rendering a simple div first to isolate the issue
  const USE_SIMPLE_DIV = false; // Set to true to debug

  if (USE_SIMPLE_DIV) {
    return (
      <div className="border-2 border-mist bg-action-amber/10 mb-4 p-4 rounded-lg" role="alert">
        <div className="flex items-center justify-between">
          <div className="text-ink">
            <span className="font-medium">🔔 Verify your email address</span>
            <span className="ml-2">
              to unlock all features including password reset and tier upgrades.
            </span>
          </div>
          <button
            onClick={handleResendVerification}
            disabled={isResending || resent}
            className="ml-4 px-3 py-1 border border-action-amber rounded hover:bg-action-amber/20"
          >
            {resent ? 'Email Sent' : 'Resend Email'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <Alert className="border-mist bg-action-amber/10 mb-4 relative">
      <Mail className="h-4 w-4 text-action-amber" />
      <AlertDescription className="flex items-center justify-between pr-8">
        <div className="text-ink">
          <span className="font-medium">Verify your email address</span>
          <span className="ml-2">
            to unlock all features including password reset and tier upgrades.
          </span>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleResendVerification}
          disabled={isResending || resent}
          className="ml-4 shrink-0 border-action-amber hover:bg-action-amber/20"
        >
          {isResending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {resent && <CheckCircle2 className="mr-2 h-4 w-4 text-success" />}
          {resent ? 'Email Sent' : 'Resend Email'}
        </Button>
      </AlertDescription>
      <button
        onClick={handleDismiss}
        className="absolute top-2 right-2 text-action-amber hover:text-ink transition-colors"
        aria-label="Dismiss for 24 hours"
        title="Dismiss for 24 hours"
      >
        <X className="h-4 w-4" />
      </button>
    </Alert>
  );
}
