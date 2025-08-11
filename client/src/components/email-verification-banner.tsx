import React, { useState } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Mail, Loader2, CheckCircle2 } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { toast } from 'sonner';

export function EmailVerificationBanner() {
  const { user } = useAuth();
  const [isResending, setIsResending] = useState(false);
  const [resent, setResent] = useState(false);

  // Don't show if no user or email is already verified
  if (!user || user.emailVerified) {
    return null;
  }

  const handleResendVerification = async () => {
    setIsResending(true);
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/auth/resend-verification`, {
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