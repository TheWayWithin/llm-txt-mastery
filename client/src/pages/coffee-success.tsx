import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, ArrowRight, Coffee, UserCheck } from 'lucide-react';
import { Link, useLocation } from 'wouter';
import { useAuth } from '@/contexts/AuthContext';
import { authApi } from '@/lib/auth-api';

export default function CoffeeSuccess() {
  const [location] = useLocation();
  const [loading, setLoading] = useState(true);
  const [autoLoginStatus, setAutoLoginStatus] = useState<'checking' | 'success' | 'created' | 'failed' | null>(null);
  const { user, refreshUser, isAuthenticated } = useAuth();
  
  // Extract session_id, website URL, and email from URL
  const urlParams = new URLSearchParams(location.split('?')[1] || '');
  const sessionId = urlParams.get('session_id');
  const websiteUrl = urlParams.get('website');
  const email = urlParams.get('email');

  useEffect(() => {
    const handleAutoLogin = async () => {
      if (!email || isAuthenticated) {
        setLoading(false);
        return;
      }

      try {
        setAutoLoginStatus('checking');

        // Check if account exists by attempting to get account info
        // The webhook should have already created/updated the account
        // We'll attempt to refresh the current user or check if account exists
        
        // Try to get account by email (we'll add this endpoint)
        const response = await fetch(`${import.meta.env.VITE_API_URL || 'https://llm-txt-mastery-production.up.railway.app'}/api/auth/check-account`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ email }),
        });

        if (response.ok) {
          const { hasAccount, user: accountUser } = await response.json();
          
          if (hasAccount && accountUser) {
            // Account exists, create a temporary login session for the coffee purchase
            // This is safe because we know they just completed payment
            const tempLoginResponse = await fetch(`${import.meta.env.VITE_API_URL || 'https://llm-txt-mastery-production.up.railway.app'}/api/auth/coffee-login`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ 
                email,
                sessionId, // Verify the purchase
              }),
            });

            if (tempLoginResponse.ok) {
              const authData = await tempLoginResponse.json();
              // Store tokens and refresh auth context
              localStorage.setItem('auth_access_token', authData.accessToken);
              localStorage.setItem('auth_refresh_token', authData.refreshToken);
              localStorage.setItem('auth_user', JSON.stringify(authData.user));
              
              await refreshUser();
              setAutoLoginStatus('success');
            } else {
              setAutoLoginStatus('failed');
            }
          } else {
            // No account exists - this would be unusual since webhook should create one
            setAutoLoginStatus('failed');
          }
        } else {
          setAutoLoginStatus('failed');
        }
      } catch (error) {
        console.error('Auto-login failed:', error);
        setAutoLoginStatus('failed');
      } finally {
        // Show the success page after a brief delay
        setTimeout(() => setLoading(false), 1500);
      }
    };

    handleAutoLogin();
  }, [email, isAuthenticated, refreshUser, sessionId]);

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardContent className="p-8 text-center">
          {loading ? (
            <>
              <Coffee className="h-12 w-12 animate-pulse mx-auto mb-4 text-orange-500" />
              <h1 className="text-xl font-semibold mb-2">
                {autoLoginStatus === 'checking' ? 'Setting up your account...' : 'Brewing your analysis credits...'}
              </h1>
              <p className="text-slate-600">
                {autoLoginStatus === 'checking' 
                  ? 'Creating your premium account experience' 
                  : 'Please wait while we set up your coffee analysis.'
                }
              </p>
              {autoLoginStatus === 'success' && (
                <div className="mt-4 flex items-center justify-center text-green-600">
                  <UserCheck className="h-5 w-5 mr-2" />
                  <span className="text-sm">Account ready!</span>
                </div>
              )}
            </>
          ) : (
            <>
              <div className="relative">
                <CheckCircle className="h-16 w-16 mx-auto mb-6 text-green-500" />
                <Coffee className="h-8 w-8 absolute -top-2 -right-2 text-orange-500" />
              </div>
              <h1 className="text-2xl font-bold text-green-800 mb-2">
                ☕ Coffee Analysis Ready!
              </h1>
              
              {/* Personalized welcome for authenticated users */}
              {isAuthenticated && user && (
                <div className="bg-green-50 rounded-lg p-4 mb-4 border border-green-200">
                  <div className="flex items-center justify-center text-green-700 mb-2">
                    <UserCheck className="h-5 w-5 mr-2" />
                    <span className="font-semibold">Welcome back, {user.email}!</span>
                  </div>
                  <p className="text-sm text-green-600">
                    Your Coffee tier is now active with premium AI analysis.
                  </p>
                </div>
              )}
              
              <p className="text-slate-600 mb-6">
                Your $4.95 purchase was successful! You now have <strong>1 analysis credit</strong> for premium website analysis with AI enhancement.
                {isAuthenticated && ' Your account dashboard is ready with all your files and history.'}
              </p>
              
              <div className="bg-orange-50 rounded-lg p-4 mb-6 border border-orange-200">
                <h3 className="font-semibold text-orange-800 mb-2">What you get:</h3>
                <ul className="text-sm text-orange-700 space-y-1 text-left">
                  <li>• Up to 200 pages per analysis (10x free tier)</li>
                  <li>• Full AI-enhanced quality scoring</li>
                  <li>• Professional LLM.txt file generation</li>
                  <li>• Credits never expire</li>
                </ul>
              </div>

              {sessionId && (
                <div className="bg-slate-100 rounded-lg p-4 mb-6">
                  <p className="text-sm text-slate-600">
                    Purchase ID: <span className="font-mono text-xs">{sessionId}</span>
                  </p>
                </div>
              )}

              <div className="space-y-3">
                {/* Different CTAs based on authentication status */}
                {isAuthenticated && user ? (
                  <>
                    {/* Authenticated user - priority on dashboard and analysis */}
                    {websiteUrl ? (
                      <Link href={`/?url=${encodeURIComponent(websiteUrl)}&coffee=true`}>
                        <a className="block">
                          <Button className="w-full bg-orange-600 hover:bg-orange-700">
                            <ArrowRight className="h-4 w-4 mr-2" />
                            Continue Analysis of {new URL(websiteUrl).hostname}
                          </Button>
                        </a>
                      </Link>
                    ) : (
                      <Link href="/dashboard">
                        <a className="block">
                          <Button className="w-full bg-orange-600 hover:bg-orange-700">
                            <UserCheck className="h-4 w-4 mr-2" />
                            Go to Dashboard
                          </Button>
                        </a>
                      </Link>
                    )}
                    <Link href="/">
                      <a className="block">
                        <Button variant="outline" className="w-full">
                          <ArrowRight className="h-4 w-4 mr-2" />
                          Start New Analysis
                        </Button>
                      </a>
                    </Link>
                  </>
                ) : (
                  <>
                    {/* Non-authenticated user - continue with current flow */}
                    {websiteUrl && email ? (
                      <Link href={`/?url=${encodeURIComponent(websiteUrl)}&email=${encodeURIComponent(email)}&coffee=true`}>
                        <a className="block">
                          <Button className="w-full bg-orange-600 hover:bg-orange-700">
                            <ArrowRight className="h-4 w-4 mr-2" />
                            Continue Analysis of {new URL(websiteUrl).hostname}
                          </Button>
                        </a>
                      </Link>
                    ) : (
                      <Link href="/">
                        <a className="block">
                          <Button className="w-full bg-orange-600 hover:bg-orange-700">
                            <ArrowRight className="h-4 w-4 mr-2" />
                            Start Your Analysis
                          </Button>
                        </a>
                      </Link>
                    )}
                  </>
                )}
              </div>

              <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-sm text-blue-800">
                  <strong>💡 Pro tip:</strong> Your credit will be automatically used for your next analysis. 
                  Enjoy the enhanced AI features!
                </p>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}