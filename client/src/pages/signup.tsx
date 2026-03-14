import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/contexts/AuthContext';
import { getApiBaseUrl } from '@/lib/api-config';
import { authApi } from '@/lib/auth-api';
import { validatePasswordClient, isValidEmail } from '@/lib/auth-utils';
import { getTierDisplayName, getTierDescription, getTierColorClass } from '@/lib/tier-utils';
import { trackEvent } from '@/lib/analytics';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import {
  Eye,
  EyeOff,
  Mail,
  Lock,
  Check,
  X,
  Loader2,
  Shield,
  Zap,
  Coffee,
  Crown,
  ArrowRight,
} from 'lucide-react';
import { Link } from 'wouter';
import Footer from '@/components/footer';
import { useSEO } from '@/hooks/useSEO';

export default function SignupPage() {
  useSEO({
    title: 'Sign Up - LLM.txt Mastery',
    description: 'Create your free LLM.txt Mastery account.',
  });
  const [, navigate] = useLocation();
  const { signUp, isAuthenticated, user } = useAuth();

  // URL parameters
  const urlParams = new URLSearchParams(window.location.search);
  const emailParam = urlParams.get('email') || '';
  const tierParam =
    (urlParams.get('tier') as 'starter' | 'solo' | 'growth' | 'scale') || 'growth';
  const websiteUrlParam = urlParams.get('websiteUrl') || '';
  const billingParam = (urlParams.get('billing') as 'monthly' | 'annual') || 'monthly';

  // Form state
  const [email, setEmail] = useState(emailParam);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [selectedTier, setSelectedTier] = useState(tierParam);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Validation state
  const [passwordValidation, setPasswordValidation] = useState<{
    valid: boolean;
    errors: string[];
    requirements: string[];
  } | null>(null);
  const [emailChecking, setEmailChecking] = useState(false);
  const [emailAvailable, setEmailAvailable] = useState<boolean | null>(null);

  // Scroll to top on mount
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Redirect authenticated users
  useEffect(() => {
    if (isAuthenticated && user) {
      console.log('User already authenticated, redirecting to analyze page');
      const targetUrl = websiteUrlParam
        ? `/analyze?url=${encodeURIComponent(websiteUrlParam)}`
        : '/analyze';
      navigate(targetUrl);
    }
  }, [isAuthenticated, user, navigate, websiteUrlParam]);

  // Validate password strength as user types
  useEffect(() => {
    if (password.length > 0) {
      const clientValidation = validatePasswordClient(password);
      setPasswordValidation(clientValidation);

      // Also try API validation for consistency
      authApi
        .validatePassword(password)
        .then((apiValidation) => {
          if (apiValidation.valid !== clientValidation.valid) {
            setPasswordValidation(apiValidation);
          }
        })
        .catch(() => {
          // Keep client-side validation if API fails
        });
    } else {
      setPasswordValidation(null);
    }
  }, [password]);

  // Check email availability as user types
  useEffect(() => {
    if (email && isValidEmail(email)) {
      setEmailChecking(true);
      const timeoutId = setTimeout(() => {
        authApi
          .checkEmailAvailability(email)
          .then(setEmailAvailable)
          .catch(() => setEmailAvailable(null))
          .finally(() => setEmailChecking(false));
      }, 500); // Debounce for 500ms

      return () => clearTimeout(timeoutId);
    } else {
      setEmailAvailable(null);
      setEmailChecking(false);
    }
  }, [email]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Track signup attempt
    trackEvent('signup_attempt', {
      tier_selected: selectedTier,
      website_url: websiteUrlParam,
      event_category: 'auth',
    });

    try {
      // Enhanced validation
      if (!isValidEmail(email)) {
        throw new Error('Please enter a valid email address');
      }

      if (emailAvailable === false) {
        throw new Error('Email address is already registered');
      }

      const validation = passwordValidation || validatePasswordClient(password);
      if (!validation.valid) {
        throw new Error('Password does not meet security requirements');
      }

      if (password !== confirmPassword) {
        throw new Error('Passwords do not match');
      }

      // Handle paid tier checkouts BEFORE creating user (Coffee, Growth, Scale)
      if (selectedTier === 'solo' || selectedTier === 'growth' || selectedTier === 'scale') {
        console.log(
          `${selectedTier} tier selected, redirecting to Stripe checkout`
        );

        // Track signup attempt (not complete yet since payment pending)
        trackEvent('signup_stripe_redirect', {
          tier_selected: selectedTier,
          website_url: websiteUrlParam,
          event_category: 'auth',
        });

        // Store credentials temporarily for after payment
        sessionStorage.setItem('pendingSignupEmail', email);
        sessionStorage.setItem('pendingSignupPassword', btoa(password)); // Basic encoding for session storage
        sessionStorage.setItem('pendingSignupTier', selectedTier);

        // Determine the correct endpoint based on tier
        let endpoint = '';
        if (selectedTier === 'solo') {
          endpoint = '/api/stripe/create-coffee-checkout';
        } else if (selectedTier === 'growth') {
          endpoint = '/api/stripe/create-growth-checkout';
        } else if (selectedTier === 'scale') {
          endpoint = '/api/stripe/create-scale-checkout';
        }

        // Create Stripe checkout session
        const response = await fetch(`${getApiBaseUrl()}${endpoint}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: email,
            billing: billingParam,
            ...(websiteUrlParam && { websiteUrl: websiteUrlParam }), // Only include if not empty
            metadata: {
              password: btoa(password), // Will be used by webhook to create user
              tier: selectedTier,
            },
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || `Server error ${response.status}`);
        }

        if (data.url) {
          // Redirect to Stripe checkout
          window.location.href = data.url;
          return;
        } else {
          throw new Error(data.message || 'No checkout URL returned');
        }
      }

      // Only create user account for starter tier
      await signUp(email, password, confirmPassword, selectedTier);

      console.log('Registration successful');

      // Track successful signup
      trackEvent('signup_complete', {
        tier_selected: selectedTier,
        website_url: websiteUrlParam,
        event_category: 'auth',
      });

      // Store email and website URL for after verification
      localStorage.setItem('pendingVerificationEmail', email);
      if (websiteUrlParam) {
        localStorage.setItem('pendingAnalysisUrl', websiteUrlParam);
      }

      // Redirect to check-email page instead of analyze
      console.log('Redirecting to check-email page');
      window.location.href = '/check-email';
    } catch (err) {
      console.error('Signup error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Signup failed';

      // Handle specific error types
      if (errorMessage.includes('Too many registration attempts') || errorMessage.includes('429')) {
        setError('Too many registration attempts. Please wait a few minutes and try again.');
      } else if (
        errorMessage.includes('Email already exists') ||
        errorMessage.includes('already registered')
      ) {
        setError('An account with this email already exists. Please sign in instead.');
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
        return <Check className="h-5 w-5" />;
      case 'solo':
        return <Coffee className="h-5 w-5" />;
      case 'growth':
        return <Zap className="h-5 w-5" />;
      case 'scale':
        return <Crown className="h-5 w-5" />;
      default:
        return <Check className="h-5 w-5" />;
    }
  };

  const getTierBenefits = (tier: string) => {
    switch (tier) {
      case 'starter':
        return [
          'Discover if AI can find your business',
          'See which pages AI currently indexes',
          'Get a visibility score for your site',
          'Basic recommendations to improve',
        ];
      case 'solo':
        return [
          'AI finds 10x more of your content (200 pages)',
          'Know which pages are most likely to be cited',
          'Quality scoring helps AI prioritize your best content',
          'Get found for services, not just your homepage',
          '30-day money-back guarantee',
        ];
      case 'growth':
        return [
          'Be discoverable across all AI platforms',
          'Analyze multiple properties at once',
          'Export data to CSV/JSON for reporting',
          'Process 1,000 pages per site',
          'Bulk website processing for agencies',
        ];
      case 'scale':
        return [
          'JavaScript rendering for React, Angular, Vue sites',
          'Analyze any site, any size — no page limits',
          'Full AI analysis on every page',
          'Multi-site management for agencies and enterprises',
          'Direct support for your questions',
        ];
      default:
        return [];
    }
  };

  const getTierUpgradeHint = (tier: string) => {
    switch (tier) {
      case 'starter':
        return {
          text: 'Solo tier analyzes 10x more pages with quality scoring.',
          targetTier: 'solo' as const,
          ctaText: 'See Solo plan ($4.95/mo)',
        };
      case 'solo':
        return {
          text: 'Need to cover 200+ pages or multiple sites?',
          targetTier: 'growth' as const,
          ctaText: 'See Growth plan ($9.95/mo)',
        };
      case 'growth':
        return {
          text: 'Client using React, Angular, or Vue? Scale includes JS rendering.',
          targetTier: 'scale' as const,
          ctaText: 'See Scale plan ($19.95/mo)',
        };
      default:
        return null;
    }
  };

  const upgradeHint = getTierUpgradeHint(selectedTier);

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
      <main className="max-w-xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <form onSubmit={handleSubmit}>
          <div className="space-y-6">
            {/* Step 1: Choose Your Plan */}
            <Card className="w-full bg-white border-mist">
              <CardHeader className="space-y-1">
                <CardTitle className="text-2xl text-center text-ink">Get Found by AI</CardTitle>
                <CardDescription className="text-center">
                  Join early adopters making their businesses AI-discoverable
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Tier Selection Dropdown */}
                  <div className="space-y-2">
                    <Label htmlFor="tier">Step 1: Choose Your Plan</Label>
                    <select
                      id="tier"
                      data-testid="tier-select"
                      value={selectedTier}
                      onChange={(e) => {
                        const newTier = e.target.value as typeof selectedTier;
                        const previousTier = selectedTier;

                        // Track tier selection event
                        trackEvent('tier_selected', {
                          tier_selected: newTier,
                          previous_tier: previousTier,
                          page: 'signup',
                          website_url: websiteUrlParam,
                          event_category: 'engagement',
                        });

                        setSelectedTier(newTier);
                      }}
                      className="w-full px-3 py-2 border border-mist rounded-md focus:outline-none focus:ring-2 focus:ring-signal-blue"
                    >
                      <option value="starter" data-testid="tier-option-starter">
                        Starter (Free) — Quick check
                      </option>
                      <option value="solo" data-testid="tier-option-coffee">
                        {billingParam === 'annual'
                          ? 'Solo ($3.95/mo, billed $47.40/yr) — Solopreneurs'
                          : 'Solo ($4.95/mo) — Solopreneurs'}
                      </option>
                      <option value="growth" data-testid="tier-option-growth">
                        {billingParam === 'annual'
                          ? 'Growth ($7.95/mo, billed $95.40/yr) — Agencies'
                          : 'Growth ($9.95/mo) — Agencies'}
                      </option>
                      <option value="scale" data-testid="tier-option-scale">
                        {billingParam === 'annual'
                          ? 'Scale ($15.95/mo, billed $191.40/yr) — Developers'
                          : 'Scale ($19.95/mo) — Developers'}
                      </option>
                    </select>

                    {/* Selected Tier Details */}
                    <div className="rounded-lg p-4 border border-mist bg-cloud mt-2">
                      <div className="flex items-center justify-between">
                        <Badge className={getTierColorClass(selectedTier)}>
                          {getTierIcon(selectedTier)}
                          <span className="ml-1">{getTierDisplayName(selectedTier)}</span>
                        </Badge>
                      </div>
                      <p className="text-sm font-medium mt-2 text-slate-brand">
                        {getTierDescription(selectedTier)}
                      </p>

                      {/* Upgrade Hint */}
                      {upgradeHint && (
                        <div className="mt-3 p-3 bg-white border border-mist rounded-lg">
                          <p className="text-xs text-slate-brand mb-1">
                            {upgradeHint.text}
                          </p>
                          <button
                            type="button"
                            onClick={() => setSelectedTier(upgradeHint.targetTier)}
                            className="mt-1 text-xs font-medium text-signal-blue hover:underline"
                          >
                            {upgradeHint.ctaText}
                          </button>
                        </div>
                      )}

                      {selectedTier === 'scale' && (
                        <div className="mt-3 p-3 bg-white border border-mist rounded-lg">
                          <p className="text-xs font-medium text-ink mb-1">
                            Complete solution — no limits
                          </p>
                          <p className="text-xs text-slate-brand">
                            Unlimited pages, unlimited AI analysis, and direct support.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Benefits */}
            <Card className="bg-white border-mist">
              <CardHeader>
                <CardTitle className="flex items-center text-ink">
                  {getTierIcon(selectedTier)}
                  <span className="ml-2">What You Get with {getTierDisplayName(selectedTier)}</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {getTierBenefits(selectedTier).map((benefit, index) => (
                    <li key={index} className="flex items-start">
                      <Check className="h-4 w-4 mt-0.5 mr-3 flex-shrink-0 text-success" />
                      <span className="text-sm text-ink">{benefit}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            {/* Trust Signals */}
            <Card className="bg-white border-mist">
              <CardHeader>
                <CardTitle className="text-ink">Why trust us</CardTitle>
                <p className="text-sm text-slate-brand mt-1">
                  We benchmark competitor tools monthly and add any features they have
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-start space-x-3">
                  <Shield className="h-6 w-6 text-success mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="font-medium text-ink">30-Day Money Back Guarantee</h4>
                    <p className="text-sm text-slate-brand">
                      Don't see results? Get every penny back. No questions asked.
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <Zap className="h-6 w-6 text-signal-blue mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="font-medium text-ink">Cancel in 10 Seconds</h4>
                    <p className="text-sm text-slate-brand">
                      One click. No phone calls. No retention tactics.
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <Coffee className="h-6 w-6 text-slate-brand mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="font-medium text-ink">Built by a solopreneur, for solopreneurs</h4>
                    <p className="text-sm text-slate-brand">
                      Not VC-funded. Real indie maker who uses these tools daily.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Security Notice */}
            <Card className="bg-cloud border-mist">
              <CardContent className="pt-6">
                <div className="flex items-start space-x-3">
                  <Lock className="h-5 w-5 text-signal-blue mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="font-medium text-ink">Secure & Private</h4>
                    <p className="text-sm text-slate-brand">
                      Your data is encrypted and never shared. We only analyze public content and
                      generate files you control.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Step 2: Create Account */}
            <Card className="w-full border-2 border-signal-blue bg-white">
              <CardHeader className="space-y-1 bg-signal-blue/5">
                <CardTitle className="text-xl text-center text-ink">Step 2: Create Your Account</CardTitle>
                <CardDescription className="text-center">
                  Ready to get found by AI? Enter your details below.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="space-y-4">
                  {error && (
                    <Alert variant="destructive">
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}

                  {/* Email Field */}
                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-stone-brand" />
                      <Input
                        id="email"
                        data-testid="email-input"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="your@email.com"
                        className={`pl-10 pr-10 ${
                          emailAvailable === false
                            ? 'border-error'
                            : emailAvailable === true
                              ? 'border-success'
                              : ''
                        }`}
                        required
                      />
                      <div className="absolute right-3 top-3 h-4 w-4">
                        {emailChecking ? (
                          <Loader2 className="animate-spin text-stone-brand" />
                        ) : emailAvailable === true ? (
                          <Check className="text-success" />
                        ) : emailAvailable === false ? (
                          <X className="text-error" />
                        ) : null}
                      </div>
                    </div>
                    {emailAvailable === false && (
                      <p className="text-sm text-error">This email is already registered</p>
                    )}
                    {emailAvailable === true && (
                      <p className="text-sm text-success">Email is available</p>
                    )}
                  </div>

                  {/* Password Field */}
                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-stone-brand" />
                      <Input
                        id="password"
                        data-testid="password-input"
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Create a secure password"
                        className={`pl-10 pr-10 ${
                          passwordValidation && !passwordValidation.valid
                            ? 'border-error'
                            : passwordValidation?.valid
                              ? 'border-success'
                              : ''
                        }`}
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-3 h-5 w-5 text-stone-brand hover:text-slate-brand p-1 min-h-[44px] min-w-[44px] flex items-center justify-center"
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>

                    {/* Password Strength Indicator */}
                    {password.length > 0 && (
                      <div className="space-y-2">
                        {passwordValidation && passwordValidation.errors.length > 0 && (
                          <div className="text-sm text-error space-y-1">
                            {passwordValidation.errors.map((error, index) => (
                              <p key={index} className="flex items-center">
                                <X className="h-3 w-3 mr-1 flex-shrink-0" />
                                {error}
                              </p>
                            ))}
                          </div>
                        )}
                        {passwordValidation?.valid && (
                          <p className="text-sm text-success flex items-center">
                            <Check className="h-3 w-3 mr-1" />
                            Password meets all requirements
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Confirm Password Field */}
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirm Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-stone-brand" />
                      <Input
                        id="confirmPassword"
                        data-testid="confirm-password-input"
                        type={showConfirmPassword ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Confirm your password"
                        className={`pl-10 pr-10 ${
                          confirmPassword && password !== confirmPassword
                            ? 'border-error'
                            : confirmPassword && password === confirmPassword && password.length > 0
                              ? 'border-success'
                              : ''
                        }`}
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-3 h-5 w-5 text-stone-brand hover:text-slate-brand p-1 min-h-[44px] min-w-[44px] flex items-center justify-center"
                        aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                      >
                        {showConfirmPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                    {confirmPassword && password !== confirmPassword && (
                      <p className="text-sm text-error flex items-center">
                        <X className="h-3 w-3 mr-1" />
                        Passwords do not match
                      </p>
                    )}
                    {confirmPassword && password === confirmPassword && password.length > 0 && (
                      <p className="text-sm text-success flex items-center">
                        <Check className="h-3 w-3 mr-1" />
                        Passwords match
                      </p>
                    )}
                  </div>

                  {/* Terms Agreement */}
                  <div className="text-xs text-slate-brand bg-cloud p-3 rounded">
                    By creating an account, you agree to our{' '}
                    <Link href="/terms">
                      <a className="text-signal-blue hover:underline">
                        Terms of Service
                      </a>
                    </Link>{' '}
                    and{' '}
                    <Link href="/privacy">
                      <a className="text-signal-blue hover:underline">Privacy Policy</a>
                    </Link>
                  </div>

                  {/* Submit Button */}
                  <Button
                    type="submit"
                    data-testid="signup-submit"
                    className="w-full min-h-[48px] px-6 py-3 bg-signal-blue hover:bg-[#1D4ED8]"
                    size="default"
                    disabled={
                      loading ||
                      emailAvailable === false ||
                      (passwordValidation && !passwordValidation.valid) ||
                      password !== confirmPassword ||
                      !email ||
                      !password ||
                      !confirmPassword
                    }
                  >
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creating account...
                      </>
                    ) : (
                      <>
                        Create Account
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </>
                    )}
                  </Button>
                </div>

                {/* Login Link */}
                <div className="mt-6 text-center">
                  <p className="text-sm text-slate-brand">
                    Already have an account?{' '}
                    <Link href="/login">
                      <a className="text-signal-blue hover:underline font-medium">Sign in</a>
                    </Link>
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </form>
      </main>

      {/* Footer */}
      <Footer />
    </div>
  );
}
