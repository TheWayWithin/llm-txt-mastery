import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/contexts/AuthContext';
import { isValidEmail } from '@/lib/auth-utils';
import { getTierDisplayName, getTierDescription, getTierColorClass } from '@/lib/tier-utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Eye, EyeOff, Mail, Lock, ArrowRight, Loader2, Coffee, Shield, Zap } from 'lucide-react';
import { Link } from 'wouter';
import Footer from '@/components/footer';
import { useSEO } from '@/hooks/useSEO';

export default function LoginPage() {
  useSEO({
    title: 'Log In - LLM.txt Mastery',
    description: 'Log in to your LLM.txt Mastery account.',
  });
  const [, navigate] = useLocation();
  const { signIn, isAuthenticated, user } = useAuth();

  // URL parameters
  const urlParams = new URLSearchParams(window.location.search);
  const emailParam = urlParams.get('email') || '';
  const tierParam = urlParams.get('tier') as 'starter' | 'solo' | 'growth' | 'scale' | null;
  const websiteUrlParam = urlParams.get('websiteUrl') || '';

  // Form state
  const [email, setEmail] = useState(emailParam);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Redirect authenticated users
  useEffect(() => {
    if (isAuthenticated && user) {
      console.log('✅ User already authenticated, redirecting to home page');
      const targetUrl = websiteUrlParam ? `/?url=${encodeURIComponent(websiteUrlParam)}` : '/';
      navigate(targetUrl);
    }
  }, [isAuthenticated, user, navigate, websiteUrlParam]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Basic validation
      if (!isValidEmail(email)) {
        throw new Error('Please enter a valid email address');
      }

      if (!password) {
        throw new Error('Please enter your password');
      }

      // Sign in the user
      await signIn(email, password);

      console.log('✅ Login successful, redirecting to analyze page');

      // Navigate to analyze page with website URL if provided
      const targetUrl = websiteUrlParam
        ? `/analyze?url=${encodeURIComponent(websiteUrlParam)}`
        : '/analyze';
      // Use window.location for full page refresh to reset auth state
      window.location.href = targetUrl;
    } catch (err) {
      console.error('Login error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Login failed';

      // Handle specific error types
      if (errorMessage.includes('Invalid credentials') || errorMessage.includes('unauthorized')) {
        setError('Invalid email or password. Please check your credentials and try again.');
      } else if (errorMessage.includes('Too many login attempts') || errorMessage.includes('429')) {
        setError('Too many login attempts. Please wait a few minutes and try again.');
      } else if (errorMessage.includes('User not found')) {
        setError('No account found with this email address. Please sign up first.');
      } else {
        setError(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  const getTierIcon = (tier: string) => {
    switch (tier) {
      case 'starter':
        return <Shield className="h-5 w-5" />;
      case 'solo':
        return <Coffee className="h-5 w-5" />;
      case 'growth':
        return <Zap className="h-5 w-5" />;
      case 'scale':
        return <Zap className="h-5 w-5" />;
      default:
        return <Shield className="h-5 w-5" />;
    }
  };

  return (
    <div className="min-h-screen bg-cloud">
      {/* Header */}
      <header className="bg-mastery-blue shadow-sm border-b border-mastery-blue">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <Link href="/">
              <a className="flex items-center space-x-3 hover:opacity-80 transition-opacity">
                <img
                  src="/images/logo-primary.png"
                  alt="LLM.txt Mastery"
                  className="h-16 md:h-20 w-auto"
                />
              </a>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-md mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <Card className="w-full">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl text-center">Welcome Back</CardTitle>
            <CardDescription className="text-center">
              Sign in to your LLM.txt Mastery account
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {/* Selected Tier Display */}
              {tierParam && (
                <div className="bg-cloud rounded-lg p-4 border border-mist">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-ink">Selected Plan:</span>
                    <Badge className={getTierColorClass(tierParam)}>
                      {getTierIcon(tierParam)}
                      <span className="ml-1">{getTierDisplayName(tierParam)}</span>
                    </Badge>
                  </div>
                  <p className="text-xs text-slate-brand">{getTierDescription(tierParam)}</p>
                </div>
              )}

              {/* Email Field */}
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-stone-brand" />
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your@email.com"
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              {/* Password Field */}
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-stone-brand" />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="pl-10 pr-10"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3 h-5 w-5 text-stone-brand hover:text-slate-brand p-1 min-h-[44px] min-w-[44px] flex items-center justify-center"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Forgot Password Link */}
              <div className="text-right">
                <Link href="/forgot-password">
                  <a className="text-sm text-signal-blue hover:text-mastery-blue">Forgot your password?</a>
                </Link>
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                className="w-full min-h-[48px] px-6 py-3 bg-signal-blue hover:bg-[#1D4ED8]"
                size="default"
                disabled={loading || !email || !password}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  <>
                    Sign In
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </form>

            {/* Signup Link */}
            <div className="mt-6 text-center">
              <p className="text-sm text-slate-brand">
                Don't have an account?{' '}
                <Link
                  href={`/signup?tier=${tierParam || 'solo'}${emailParam ? `&email=${encodeURIComponent(emailParam)}` : ''}${websiteUrlParam ? `&websiteUrl=${encodeURIComponent(websiteUrlParam)}` : ''}`}
                >
                  <a className="text-signal-blue hover:text-mastery-blue font-medium">Sign up for free</a>
                </Link>
              </p>
            </div>

            {/* Demo Option */}
            <div className="mt-4 pt-4 border-t border-mist">
              <div className="text-center">
                <p className="text-sm text-stone-brand mb-3">Want to try it first?</p>
                <Link href="/">
                  <a>
                    <Button variant="outline" className="w-full">
                      Try Demo Mode
                    </Button>
                  </a>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Trust Signal */}
        <div className="mt-8 text-center">
          <p className="text-xs text-stone-brand">
            Secure login protected by industry-standard encryption
          </p>
        </div>
      </main>

      {/* Footer */}
      <Footer />
    </div>
  );
}
