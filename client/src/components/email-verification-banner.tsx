import React, { useState } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Mail, Loader2, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

interface EmailVerificationBannerProps {
  userEmail: string;
  emailVerified?: boolean;
}

export default function EmailVerificationBanner({ userEmail, emailVerified }: EmailVerificationBannerProps) {
  const [isResending, setIsResending] = useState(false);
  const [resent, setResent] = useState(false);

  // Log for debugging and prevent tree-shaking
  console.log('📧 EmailVerificationBanner rendered:', { 
    userEmail, 
    emailVerified,
    typeOfEmailVerified: typeof emailVerified,
    isExactlyFalse: emailVerified === false,
    isNotFalse: emailVerified !== false,
    willReturn: emailVerified !== false ? 'null' : 'banner'
  });

  // Don't show if there's no user email or email is already verified
  if (!userEmail || emailVerified !== false) {
    console.log('❌ Banner hidden: no userEmail or emailVerified is not exactly false:', { userEmail, emailVerified });
    return null;
  }
  
  console.log('✅ Banner will show: emailVerified is false');
  
  // Test if we can render anything at all
  console.log('🎨 About to render Alert component');

  const handleResendVerification = async () => {
    setIsResending(true);
    try {
      const token = localStorage.getItem('auth_access_token');
      const apiUrl = import.meta.env.VITE_API_URL || 'https://llm-txt-mastery-production.up.railway.app';
      const response = await fetch(`${apiUrl}/api/auth/resend-verification`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
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
      <div className="border-2 border-amber-200 bg-amber-50 mb-4 p-4 rounded-lg" role="alert">
        <div className="flex items-center justify-between">
          <div className="text-amber-800">
            <span className="font-medium">🔔 Verify your email address</span>
            <span className="ml-2">to unlock all features including password reset and tier upgrades.</span>
          </div>
          <button
            onClick={handleResendVerification}
            disabled={isResending || resent}
            className="ml-4 px-3 py-1 border border-amber-300 rounded hover:bg-amber-100"
          >
            {resent ? 'Email Sent' : 'Resend Email'}
          </button>
        </div>
      </div>
    );
  }
  
  return (
    <Alert className="border-amber-200 bg-amber-50 mb-4">
      <Mail className="h-4 w-4 text-amber-600" />
      <AlertDescription className="flex items-center justify-between">
        <div className="text-amber-800">
          <span className="font-medium">Verify your email address</span>
          <span className="ml-2">to unlock all features including password reset and tier upgrades.</span>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleResendVerification}
          disabled={isResending || resent}
          className="ml-4 shrink-0 border-amber-300 hover:bg-amber-100"
        >
          {isResending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {resent && <CheckCircle2 className="mr-2 h-4 w-4 text-green-600" />}
          {resent ? 'Email Sent' : 'Resend Email'}
        </Button>
      </AlertDescription>
    </Alert>
  );
}