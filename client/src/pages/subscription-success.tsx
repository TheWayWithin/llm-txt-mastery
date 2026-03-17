import { useEffect, useState, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, Mail, ArrowRight, BarChart3 } from 'lucide-react';
import { Link, useLocation } from 'wouter';
import { useAuth } from '@/contexts/AuthContext';

export default function SubscriptionSuccess() {
  const searchParams = new URLSearchParams(window.location.search);
  const { isAuthenticated, user, refreshUser } = useAuth();
  const [, navigate] = useLocation();
  const [redirecting, setRedirecting] = useState(false);
  const hasStartedRedirect = useRef(false);

  const email = searchParams.get('email') || '';
  const tier = searchParams.get('tier') || 'growth';
  const upgraded = searchParams.get('upgraded') === 'true';
  const tierLabel = tier.charAt(0).toUpperCase() + tier.slice(1);

  // If user is already authenticated (upgrade flow), refresh once and redirect
  useEffect(() => {
    if (isAuthenticated && user && !hasStartedRedirect.current) {
      hasStartedRedirect.current = true;
      setRedirecting(true);
      // Refresh user data once so tier is up to date from webhook
      refreshUser?.();
      // Redirect after brief confirmation
      setTimeout(() => {
        window.location.href = '/analyze';
      }, 2000);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, user]);

  // Authenticated user upgrade flow — brief confirmation then redirect
  if (isAuthenticated && user) {
    return (
      <div className="min-h-screen bg-cloud flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <CheckCircle className="h-16 w-16 mx-auto mb-6 text-success" />

            <h1 className="text-2xl font-bold text-ink mb-2">
              Upgrade successful!
            </h1>

            <p className="text-slate-brand mb-6">
              Your plan has been upgraded to {tierLabel}. Taking you to your dashboard...
            </p>

            <div className="flex items-center justify-center gap-2 text-signal-blue mb-6">
              <BarChart3 className="h-5 w-5" />
              <span className="font-medium">{tierLabel} Plan Active</span>
            </div>

            <Link href="/analyze">
              <Button className="w-full bg-signal-blue hover:bg-[#1D4ED8]">
                <ArrowRight className="h-4 w-4 mr-2" />
                {redirecting ? 'Redirecting...' : 'Go to Analyze'}
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  // New signup flow — show verification instructions
  return (
    <div className="min-h-screen bg-cloud flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardContent className="p-8 text-center">
          <CheckCircle className="h-16 w-16 mx-auto mb-6 text-success" />

          <h1 className="text-2xl font-bold text-ink mb-2">
            Payment confirmed!
          </h1>

          <p className="text-slate-brand mb-6">
            Your {tierLabel} plan is active. We've sent a verification email to:
          </p>

          {email && (
            <div className="bg-cloud rounded-lg p-3 mb-6 border border-mist flex items-center justify-center gap-2">
              <Mail className="h-4 w-4 text-signal-blue flex-shrink-0" />
              <span className="font-mono text-sm text-ink">{decodeURIComponent(email)}</span>
            </div>
          )}

          <div className="bg-signal-blue/5 rounded-lg p-4 mb-6 border border-signal-blue/20 text-left">
            <p className="text-sm text-ink font-medium mb-2">Next steps:</p>
            <ol className="text-sm text-slate-brand space-y-1 list-decimal list-inside">
              <li>Check your inbox for a verification email</li>
              <li>Click the link in the email to verify your account</li>
              <li>Sign in with your email and password</li>
            </ol>
          </div>

          <div className="space-y-3">
            <Link href="/login">
              <Button className="w-full bg-signal-blue hover:bg-[#1D4ED8]">
                <ArrowRight className="h-4 w-4 mr-2" />
                Go to Sign In
              </Button>
            </Link>
            <Link href="/">
              <Button variant="outline" className="w-full border-signal-blue text-signal-blue hover:bg-signal-blue/10">
                Back to Homepage
              </Button>
            </Link>
          </div>

          <p className="text-xs text-slate-brand mt-6">
            Didn't receive the email? Check your spam folder or{' '}
            <Link href="/login">
              <span className="text-signal-blue underline cursor-pointer">sign in</span>
            </Link>{' '}
            — the link may arrive within a few minutes.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
