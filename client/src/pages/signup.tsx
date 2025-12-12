import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/contexts/AuthContext';
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
  User,
  Check,
  X,
  Loader2,
  Shield,
  Zap,
  Coffee,
  ArrowRight,
} from 'lucide-react';
import { Link } from 'wouter';
import Footer from '@/components/footer';

export default function SignupPage() {
  const [, navigate] = useLocation();
  const { signUp, isAuthenticated, user } = useAuth();

  // URL parameters
  const urlParams = new URLSearchParams(window.location.search);
  const emailParam = urlParams.get('email') || '';
  const tierParam =
    (urlParams.get('tier') as 'starter' | 'solo' | 'growth' | 'scale') || 'growth';
  const websiteUrlParam = urlParams.get('websiteUrl') || '';

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
      console.log('✅ User already authenticated, redirecting to analyze page');
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
          `💳 ${selectedTier} tier selected, redirecting to Stripe checkout WITHOUT creating user first`
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
        const response = await fetch(`${import.meta.env.VITE_API_URL || ''}${endpoint}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: email,
            ...(websiteUrlParam && { websiteUrl: websiteUrlParam }), // Only include if not empty
            metadata: {
              password: btoa(password), // Will be used by webhook to create user
              tier: selectedTier,
            },
          }),
        });

        const data = await response.json();

        if (data.url) {
          // Redirect to Stripe checkout
          window.location.href = data.url;
          return;
        } else {
          throw new Error('Failed to create checkout session');
        }
      }

      // Only create user account for starter tier
      await signUp(email, password, confirmPassword, selectedTier);

      console.log('✅ Registration successful');

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
        return <Shield className="h-5 w-5" />;
      case 'solo':
        return <Coffee className="h-5 w-5" />;
      case 'growth':
        return <Zap className="h-5 w-5" />;
      case 'scale':
        return <Zap className="h-5 w-5" />;
      default:
        return <User className="h-5 w-5" />;
    }
  };

  const getTierBenefits = (tier: string) => {
    switch (tier) {
      case 'starter':
        return [
          'Discover if AI can even find your business',
          'See what pages AI currently sees (spoiler: probably not many)',
          'Get a wake-up call about your AI visibility',
          'Understand the gap between you and competitors',
        ];
      case 'solo':
        return [
          'AI finds 10x more of your content (200 vs 20 pages)',
          'Know exactly which pages convert and which don\'t',
          'Get found for your best services, not just your homepage',
          'Stop losing customers who never knew you existed',
          '30-day money-back guarantee — zero risk',
        ];
      case 'growth':
        return [
          'Dominate AI recommendations for your entire site',
          'Analyze multiple properties at once (agencies love this)',
          'Export data to prove ROI to clients or stakeholders',
          'Process 1,000 pages — handle sites competitors can\'t',
          'Never lose a client because their site was "too big"',
        ];
      case 'scale':
        return [
          'Analyze any site, any size, no exceptions',
          'Full AI analysis on every single page',
          'Direct support line — your questions answered fast',
          'Multi-site management for agencies and enterprises',
          'Freshest data with 3-day cache (others use 14 days)',
          'Complete mastery over your AI visibility',
        ];
      default:
        return [];
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
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
            <div className="text-right hidden md:block">
              <p className="text-sm text-slate-600">Built by Jamie Watters</p>
              <p className="text-xs text-slate-500">Solopreneur & Tool Builder</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <form onSubmit={handleSubmit}>
          <div className="space-y-6">
            {/* Step 1: Choose Your Plan */}
            <Card className="w-full">
              <CardHeader className="space-y-1">
                <CardTitle className="text-2xl text-center">Get Found by AI</CardTitle>
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
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-innovation-teal"
                    >
                      <option value="starter" data-testid="tier-option-starter">
                        🔍 Starter (Free) - Am I invisible?
                      </option>
                      <option value="solo" data-testid="tier-option-coffee">
                        🛡️ Solo ($4.95/mo) - Stop losing customers
                      </option>
                      <option value="growth" data-testid="tier-option-growth">
                        ⚔️ Growth ($9.95/mo) - Dominate AI
                      </option>
                      <option value="scale" data-testid="tier-option-scale">
                        👑 Scale ($19.95/mo) - No limits
                      </option>
                    </select>

                    {/* Selected Tier Details */}
                    <div
                      className={`rounded-lg p-4 border-2 mt-2 ${
                        selectedTier === 'starter'
                          ? 'bg-amber-50 border-amber-300'
                          : selectedTier === 'solo'
                            ? 'bg-green-50 border-green-400'
                            : selectedTier === 'growth'
                              ? 'bg-blue-50 border-blue-300'
                              : 'bg-purple-50 border-purple-300'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <Badge className={getTierColorClass(selectedTier)}>
                          {getTierIcon(selectedTier)}
                          <span className="ml-1">{getTierDisplayName(selectedTier)}</span>
                        </Badge>
                      </div>
                      <p
                        className={`text-sm font-medium mt-2 ${
                          selectedTier === 'starter'
                            ? 'text-amber-700'
                            : selectedTier === 'solo'
                              ? 'text-green-700'
                              : selectedTier === 'growth'
                                ? 'text-blue-700'
                                : 'text-purple-700'
                        }`}
                      >
                        {getTierDescription(selectedTier)}
                      </p>

                      {/* OB Headlines - Marketing Physics */}
                      <div className="mt-3 p-3 rounded border">
                        {selectedTier === 'starter' && (
                          <div className="bg-amber-50 border-amber-300">
                            <p className="text-sm font-bold text-amber-900 mb-1">
                              🔍 Find out if you're invisible to AI
                            </p>
                            <p className="text-xs text-amber-700">
                              Discover how AI sees your site (3 analyses/month, 20 pages each)
                            </p>
                          </div>
                        )}

                        {selectedTier === 'solo' && (
                          <div className="bg-green-50 border-green-300">
                            <p className="text-sm font-bold text-green-900 mb-1">
                              🛡️ Stop losing customers to the competitors AI recommends instead of you
                            </p>
                            <p className="text-xs text-green-700">
                              20 analyses/month • 200 pages • AI scoring • 30-day guarantee
                            </p>
                          </div>
                        )}

                        {selectedTier === 'growth' && (
                          <div className="bg-blue-50 border-blue-300">
                            <p className="text-sm font-bold text-blue-900 mb-1">
                              ⚔️ Dominate AI recommendations across all your properties
                            </p>
                            <p className="text-xs text-blue-700">
                              Unlimited analyses • 1,000 pages • Bulk processing • Export to CSV/JSON
                            </p>
                          </div>
                        )}

                        {selectedTier === 'scale' && (
                          <div className="bg-purple-50 border-purple-300">
                            <p className="text-sm font-bold text-purple-900 mb-1">
                              👑 No page limits. No excuses. Just results for your clients.
                            </p>
                            <p className="text-xs text-purple-700">
                              Unlimited pages • Full AI analysis • Multi-site management • Direct support
                            </p>
                          </div>
                        )}
                      </div>

                      {/* FoMo Section - What you're missing from the next tier */}
                      {selectedTier === 'starter' && (
                        <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                          <p className="text-xs font-semibold text-red-800 mb-2">
                            ⚠️ What you're missing:
                          </p>
                          <p className="text-xs text-red-700">
                            AI only sees 20 of your pages. Your pricing, case studies, testimonials, and best content stay invisible — while competitors with better llms.txt files get found instead.
                          </p>
                          <button
                            type="button"
                            onClick={() => setSelectedTier('solo')}
                            className="mt-2 text-xs font-bold text-green-700 hover:text-green-900 underline"
                          >
                            → Upgrade to Solo for just $4.95/month
                          </button>
                        </div>
                      )}

                      {selectedTier === 'solo' && (
                        <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                          <p className="text-xs font-semibold text-amber-800 mb-2">
                            📈 Outgrowing Solo?
                          </p>
                          <p className="text-xs text-amber-700">
                            If you have 200+ pages or multiple sites, you're still leaving customers invisible to AI.
                          </p>
                          <button
                            type="button"
                            onClick={() => setSelectedTier('growth')}
                            className="mt-2 text-xs font-bold text-blue-700 hover:text-blue-900 underline"
                          >
                            → Upgrade to Growth for $9.95/month
                          </button>
                        </div>
                      )}

                      {selectedTier === 'growth' && (
                        <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                          <p className="text-xs font-semibold text-amber-800 mb-2">
                            🏢 Working with enterprise clients?
                          </p>
                          <p className="text-xs text-amber-700">
                            Your client has 1,500 pages. You can only cover 1,000. Their competitors get full coverage. Your client loses customers — and blames you.
                          </p>
                          <button
                            type="button"
                            onClick={() => setSelectedTier('scale')}
                            className="mt-2 text-xs font-bold text-purple-700 hover:text-purple-900 underline"
                          >
                            → Upgrade to Scale for $19.95/month
                          </button>
                        </div>
                      )}

                      {selectedTier === 'scale' && (
                        <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                          <p className="text-xs font-semibold text-green-800 mb-1">
                            ✅ Complete solution — no limits holding you back
                          </p>
                          <p className="text-xs text-green-700">
                            You've chosen the best. Unlimited pages, unlimited AI analysis, and direct support.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Benefits & Trust Signals (before form) */}
            {/* Selected Tier Benefits */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  {getTierIcon(selectedTier)}
                  <span className="ml-2">What You Get with {getTierDisplayName(selectedTier)}</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {getTierBenefits(selectedTier).map((benefit, index) => (
                    <li key={index} className="flex items-start">
                      <Check className={`h-4 w-4 mt-0.5 mr-3 flex-shrink-0 ${
                        selectedTier === 'starter'
                          ? 'text-amber-500'
                          : selectedTier === 'solo'
                            ? 'text-green-500'
                            : selectedTier === 'growth'
                              ? 'text-blue-500'
                              : 'text-purple-500'
                      }`} />
                      <span
                        className={`text-sm font-medium ${
                          selectedTier === 'starter'
                            ? 'text-amber-800'
                            : selectedTier === 'solo'
                              ? 'text-green-700'
                              : selectedTier === 'growth'
                                ? 'text-blue-700'
                                : 'text-purple-700'
                        }`}
                      >
                        {benefit}
                      </span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            {/* Real Reasons to Believe - Marketing Physics RR */}
            <Card className="border-2 border-green-200 bg-gradient-to-br from-green-50 to-blue-50">
              <CardHeader>
                <CardTitle className="text-green-800">
                  🛡️ Real Reasons to Believe
                </CardTitle>
                <p className="text-sm text-green-700 mt-1">
                  The ONLY standalone paid tool between $0 and $879/year
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-start space-x-3">
                  <Shield className="h-6 w-6 text-green-600 mt-0.5" />
                  <div>
                    <h4 className="font-bold text-green-800">💰 30-Day Money Back Guarantee</h4>
                    <p className="text-sm text-green-700">
                      Don't see results? Get every penny back. No questions asked. No hoops.
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <Zap className="h-6 w-6 text-blue-600 mt-0.5" />
                  <div>
                    <h4 className="font-bold text-blue-800">⚡ Cancel in 10 Seconds</h4>
                    <p className="text-sm text-blue-700">
                      One click. No phone calls. No retention tactics. Just cancel.
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <User className="h-6 w-6 text-purple-600 mt-0.5" />
                  <div>
                    <h4 className="font-bold text-purple-800">👨‍💻 Built by Solopreneur for Solopreneurs</h4>
                    <p className="text-sm text-purple-700">
                      Not VC-funded. Real indie maker who understands your business needs.
                    </p>
                  </div>
                </div>

                <div className="bg-white p-3 rounded border-2 border-green-300 mt-4">
                  <p className="text-center text-sm font-bold text-green-800">
                    ✅ 89% see measurable improvement • ✅ Results in 24 hours • ✅ Used by 100+ businesses
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Security Notice */}
            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="pt-6">
                <div className="flex items-start space-x-3">
                  <Lock className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-blue-900">Secure & Private</h4>
                    <p className="text-sm text-blue-700">
                      Your data is encrypted and never shared. We only analyze public content and
                      generate files you control.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Step 2: Create Account (Form at the end) */}
            <Card className="w-full border-2 border-innovation-teal">
              <CardHeader className="space-y-1 bg-innovation-teal/5">
                <CardTitle className="text-xl text-center">Step 2: Create Your Account</CardTitle>
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
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input
                        id="email"
                        data-testid="email-input"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="your@email.com"
                        className={`pl-10 pr-10 ${
                          emailAvailable === false
                            ? 'border-red-500'
                            : emailAvailable === true
                              ? 'border-green-500'
                              : ''
                        }`}
                        required
                      />
                      <div className="absolute right-3 top-3 h-4 w-4">
                        {emailChecking ? (
                          <Loader2 className="animate-spin text-gray-400" />
                        ) : emailAvailable === true ? (
                          <Check className="text-green-500" />
                        ) : emailAvailable === false ? (
                          <X className="text-red-500" />
                        ) : null}
                      </div>
                    </div>
                    {emailAvailable === false && (
                      <p className="text-sm text-red-600">This email is already registered</p>
                    )}
                    {emailAvailable === true && (
                      <p className="text-sm text-green-600">Email is available</p>
                    )}
                  </div>

                  {/* Password Field */}
                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input
                        id="password"
                        data-testid="password-input"
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Create a secure password"
                        className={`pl-10 pr-10 ${
                          passwordValidation && !passwordValidation.valid
                            ? 'border-red-500'
                            : passwordValidation?.valid
                              ? 'border-green-500'
                              : ''
                        }`}
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-3 h-5 w-5 text-gray-400 hover:text-gray-600 p-1 min-h-[44px] min-w-[44px] flex items-center justify-center"
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
                          <div className="text-sm text-red-600 space-y-1">
                            {passwordValidation.errors.map((error, index) => (
                              <p key={index} className="flex items-center">
                                <X className="h-3 w-3 mr-1 flex-shrink-0" />
                                {error}
                              </p>
                            ))}
                          </div>
                        )}
                        {passwordValidation?.valid && (
                          <p className="text-sm text-green-600 flex items-center">
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
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input
                        id="confirmPassword"
                        data-testid="confirm-password-input"
                        type={showConfirmPassword ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Confirm your password"
                        className={`pl-10 pr-10 ${
                          confirmPassword && password !== confirmPassword
                            ? 'border-red-500'
                            : confirmPassword && password === confirmPassword && password.length > 0
                              ? 'border-green-500'
                              : ''
                        }`}
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-3 h-5 w-5 text-gray-400 hover:text-gray-600 p-1 min-h-[44px] min-w-[44px] flex items-center justify-center"
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
                      <p className="text-sm text-red-600 flex items-center">
                        <X className="h-3 w-3 mr-1" />
                        Passwords do not match
                      </p>
                    )}
                    {confirmPassword && password === confirmPassword && password.length > 0 && (
                      <p className="text-sm text-green-600 flex items-center">
                        <Check className="h-3 w-3 mr-1" />
                        Passwords match
                      </p>
                    )}
                  </div>

                  {/* Terms Agreement */}
                  <div className="text-xs text-gray-500 bg-gray-50 p-3 rounded">
                    By creating an account, you agree to our{' '}
                    <Link href="/terms">
                      <a className="text-blue-600 hover:text-blue-800 underline">
                        Terms of Service
                      </a>
                    </Link>{' '}
                    and{' '}
                    <Link href="/privacy">
                      <a className="text-blue-600 hover:text-blue-800 underline">Privacy Policy</a>
                    </Link>
                  </div>

                  {/* Submit Button */}
                  <Button
                    type="submit"
                    data-testid="signup-submit"
                    className="w-full min-h-[48px] px-6 py-3 bg-innovation-teal hover:bg-innovation-teal/90"
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
                  <p className="text-sm text-gray-600">
                    Already have an account?{' '}
                    <Link href="/login">
                      <a className="text-blue-600 hover:text-blue-800 font-medium">Sign in</a>
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
