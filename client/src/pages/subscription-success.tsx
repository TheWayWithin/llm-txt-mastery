import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, Loader2, ArrowRight, UserCheck } from 'lucide-react';
import { Link, useLocation } from 'wouter';
import { useAuth } from '@/contexts/AuthContext';
import { getApiBaseUrl } from '@/lib/api-config';

export default function SubscriptionSuccess() {
  const [location] = useLocation();
  const searchParams = new URLSearchParams(location.split('?')[1] || '');
  const { user, refreshUser, isAuthenticated } = useAuth();
  const [loading, setLoading] = useState(true);
  const [autoLoginStatus, setAutoLoginStatus] = useState<
    'checking' | 'success' | 'failed' | null
  >(null);

  const sessionId = searchParams.get('session_id');
  const tier = searchParams.get('tier') || 'growth';

  useEffect(() => {
    const handleAutoLogin = async () => {
      // Already authenticated — just refresh user data
      if (isAuthenticated) {
        if (refreshUser) await refreshUser();
        setLoading(false);
        return;
      }

      // Try to auto-login with credentials stored before Stripe redirect
      const pendingEmail = sessionStorage.getItem('pendingSignupEmail');
      const pendingPasswordEncoded = sessionStorage.getItem('pendingSignupPassword');

      if (!pendingEmail || !pendingPasswordEncoded) {
        setLoading(false);
        return;
      }

      const pendingPassword = atob(pendingPasswordEncoded);

      setAutoLoginStatus('checking');

      // Retry up to 4 times with 2s delay — webhook may not have fired yet
      let attempt = 0;
      const maxAttempts = 4;

      while (attempt < maxAttempts) {
        try {
          const response = await fetch(`${getApiBaseUrl()}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: pendingEmail, password: pendingPassword }),
          });

          if (response.ok) {
            const authData = await response.json();
            sessionStorage.setItem('auth_access_token', authData.accessToken);
            sessionStorage.setItem('auth_refresh_token', authData.refreshToken);
            sessionStorage.setItem('auth_user', JSON.stringify(authData.user));
            // Clear pending credentials
            sessionStorage.removeItem('pendingSignupEmail');
            sessionStorage.removeItem('pendingSignupPassword');
            sessionStorage.removeItem('pendingSignupTier');
            await refreshUser();
            setAutoLoginStatus('success');
            setLoading(false);
            return;
          }

          // Account may not exist yet (webhook timing) — wait and retry
          const body = await response.json().catch(() => ({}));
          const isNotFound =
            response.status === 401 || response.status === 404 ||
            (body.code === 'INVALID_CREDENTIALS' || body.code === 'USER_NOT_FOUND');

          if (!isNotFound) break; // Unexpected error — stop retrying
        } catch (_err) {
          // Network error — stop retrying
          break;
        }

        attempt++;
        if (attempt < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }

      setAutoLoginStatus('failed');
      setLoading(false);
    };

    handleAutoLogin();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const tierLabel = tier.charAt(0).toUpperCase() + tier.slice(1);

  return (
    <div className="min-h-screen bg-cloud flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardContent className="p-8 text-center">
          {loading ? (
            <>
              <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-signal-blue" />
              <h1 className="text-xl font-semibold mb-2">
                {autoLoginStatus === 'checking'
                  ? 'Setting up your account...'
                  : 'Processing your subscription...'}
              </h1>
              <p className="text-slate-brand">Please wait while we activate your plan.</p>
            </>
          ) : (
            <>
              <CheckCircle className="h-16 w-16 mx-auto mb-6 text-success" />
              <h1 className="text-2xl font-bold text-ink mb-2">
                Welcome to {tierLabel}!
              </h1>

              {(isAuthenticated && user) ? (
                <div className="bg-success/10 rounded-lg p-4 mb-4 border border-mist">
                  <div className="flex items-center justify-center text-success mb-2">
                    <UserCheck className="h-5 w-5 mr-2" />
                    <span className="font-semibold">Signed in as {user.email}</span>
                  </div>
                  <p className="text-sm text-slate-brand">
                    Your {tierLabel} plan is now active.
                  </p>
                </div>
              ) : autoLoginStatus === 'failed' ? (
                <div className="bg-cloud rounded-lg p-4 mb-4 border border-mist">
                  <p className="text-sm text-slate-brand">
                    Your payment was successful. Check your email for account details,
                    then{' '}
                    <Link href="/login">
                      <span className="text-signal-blue underline cursor-pointer">sign in</span>
                    </Link>{' '}
                    to access your dashboard.
                  </p>
                </div>
              ) : null}

              <p className="text-slate-brand mb-6">
                Your subscription is active. You now have access to all {tierLabel} features.
              </p>

              {sessionId && (
                <div className="bg-cloud rounded-lg p-4 mb-6 border border-mist">
                  <p className="text-sm text-slate-brand">
                    Session ID: <span className="font-mono text-xs">{sessionId}</span>
                  </p>
                </div>
              )}

              <div className="space-y-3">
                {isAuthenticated && user ? (
                  <>
                    <Link href="/dashboard">
                      <Button className="w-full bg-signal-blue hover:bg-[#1D4ED8]">
                        <UserCheck className="h-4 w-4 mr-2" />
                        Go to Dashboard
                      </Button>
                    </Link>
                    <Link href="/">
                      <Button variant="outline" className="w-full border-signal-blue text-signal-blue hover:bg-signal-blue/10">
                        <ArrowRight className="h-4 w-4 mr-2" />
                        Start Analysis
                      </Button>
                    </Link>
                  </>
                ) : (
                  <>
                    <Link href="/login">
                      <Button className="w-full bg-signal-blue hover:bg-[#1D4ED8]">
                        <ArrowRight className="h-4 w-4 mr-2" />
                        Sign In to Dashboard
                      </Button>
                    </Link>
                    <Link href="/">
                      <Button variant="outline" className="w-full border-signal-blue text-signal-blue hover:bg-signal-blue/10">
                        Go to Homepage
                      </Button>
                    </Link>
                  </>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
