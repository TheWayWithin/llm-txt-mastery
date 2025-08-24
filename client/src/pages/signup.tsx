import { useState, useEffect } from "react"
import { useLocation } from "wouter"
import { useAuth } from "@/contexts/AuthContext"
import { authApi } from "@/lib/auth-api"
import { validatePasswordClient, isValidEmail } from "@/lib/auth-utils"
import { getTierDisplayName, getTierDescription, getTierColorClass } from "@/lib/tier-utils"
import { trackEvent } from "@/lib/analytics"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Eye, EyeOff, Mail, Lock, User, Check, X, Loader2, Shield, Zap, Coffee, ArrowRight } from "lucide-react"
import { Link } from "wouter"

export default function SignupPage() {
  const [, navigate] = useLocation()
  const { signUp, isAuthenticated, user } = useAuth()
  
  // URL parameters
  const urlParams = new URLSearchParams(window.location.search)
  const emailParam = urlParams.get('email') || ''
  const tierParam = urlParams.get('tier') as 'starter' | 'coffee' | 'growth' | 'scale' || 'coffee'
  const websiteUrlParam = urlParams.get('websiteUrl') || ''
  
  // Form state
  const [email, setEmail] = useState(emailParam)
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [selectedTier, setSelectedTier] = useState(tierParam)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  
  // Validation state
  const [passwordValidation, setPasswordValidation] = useState<{
    valid: boolean;
    errors: string[];
    requirements: string[];
  } | null>(null)
  const [emailChecking, setEmailChecking] = useState(false)
  const [emailAvailable, setEmailAvailable] = useState<boolean | null>(null)

  // Redirect authenticated users
  useEffect(() => {
    if (isAuthenticated && user) {
      console.log('✅ User already authenticated, redirecting to analyze page')
      const targetUrl = websiteUrlParam 
        ? `/analyze?url=${encodeURIComponent(websiteUrlParam)}`
        : '/analyze'
      navigate(targetUrl)
    }
  }, [isAuthenticated, user, navigate, websiteUrlParam])

  // Validate password strength as user types
  useEffect(() => {
    if (password.length > 0) {
      const clientValidation = validatePasswordClient(password)
      setPasswordValidation(clientValidation)
      
      // Also try API validation for consistency
      authApi.validatePassword(password)
        .then(apiValidation => {
          if (apiValidation.valid !== clientValidation.valid) {
            setPasswordValidation(apiValidation)
          }
        })
        .catch(() => {
          // Keep client-side validation if API fails
        })
    } else {
      setPasswordValidation(null)
    }
  }, [password])

  // Check email availability as user types
  useEffect(() => {
    if (email && isValidEmail(email)) {
      setEmailChecking(true)
      const timeoutId = setTimeout(() => {
        authApi.checkEmailAvailability(email)
          .then(setEmailAvailable)
          .catch(() => setEmailAvailable(null))
          .finally(() => setEmailChecking(false))
      }, 500) // Debounce for 500ms

      return () => clearTimeout(timeoutId)
    } else {
      setEmailAvailable(null)
      setEmailChecking(false)
    }
  }, [email])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    // Track signup attempt
    trackEvent('signup_attempt', {
      tier_selected: selectedTier,
      website_url: websiteUrlParam,
      event_category: 'auth'
    });

    try {
      // Enhanced validation
      if (!isValidEmail(email)) {
        throw new Error("Please enter a valid email address")
      }

      if (emailAvailable === false) {
        throw new Error("Email address is already registered")
      }

      const validation = passwordValidation || validatePasswordClient(password)
      if (!validation.valid) {
        throw new Error("Password does not meet security requirements")
      }

      if (password !== confirmPassword) {
        throw new Error("Passwords do not match")
      }

      // Register the user
      await signUp(email, password, confirmPassword, selectedTier)
      
      console.log('✅ Registration successful')
      
      // Track successful signup
      trackEvent('signup_complete', {
        tier_selected: selectedTier,
        website_url: websiteUrlParam,
        event_category: 'auth'
      });
      
      // If Coffee tier, redirect to Stripe checkout
      if (selectedTier === 'coffee') {
        console.log('☕ Coffee tier selected, redirecting to Stripe checkout')
        
        // Create Stripe checkout session
        const response = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/stripe/create-coffee-checkout`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: email,
            websiteUrl: websiteUrlParam || ''
          })
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
      
      // Store email and website URL for after verification
      localStorage.setItem('pendingVerificationEmail', email)
      if (websiteUrlParam) {
        localStorage.setItem('pendingAnalysisUrl', websiteUrlParam)
      }
      
      // Redirect to check-email page instead of analyze
      console.log('Redirecting to check-email page')
      window.location.href = '/check-email'
      
    } catch (err) {
      console.error('Signup error:', err)
      const errorMessage = err instanceof Error ? err.message : "Signup failed"
      
      // Handle specific error types
      if (errorMessage.includes('Too many registration attempts') || errorMessage.includes('429')) {
        setError("Too many registration attempts. Please wait a few minutes and try again.")
      } else if (errorMessage.includes('Email already exists') || errorMessage.includes('already registered')) {
        setError("An account with this email already exists. Please sign in instead.")
      } else {
        setError(errorMessage)
      }
    } finally {
      setLoading(false)
    }
  }

  const getTierIcon = (tier: string) => {
    switch (tier) {
      case 'starter':
        return <Shield className="h-5 w-5" />
      case 'coffee':
        return <Coffee className="h-5 w-5" />
      case 'growth':
        return <Zap className="h-5 w-5" />
      case 'scale':
        return <Zap className="h-5 w-5" />
      default:
        return <User className="h-5 w-5" />
    }
  }

  const getTierBenefits = (tier: string) => {
    switch (tier) {
      case 'starter':
        return [
          "❌ Only 3 analyses per day (then locked out)",
          "❌ Severely limited to 20 pages only",
          "❌ No AI quality scoring",
          "❌ Basic features only",
          "⚠️ WARNING: Your competitors will find 10x more pages"
        ]
      case 'coffee':
        return [
          "✅ Go from INVISIBLE to Gen AI → INDEXED & REFERENCED instantly",
          "✅ UNLIMITED daily analyses (destroy daily limits)",
          "✅ 200 pages per analysis (10x more than free)",
          "✅ AI-powered content scoring (find hidden gems)",
          "✅ Beat competitors who use broken tools"
        ]
      case 'growth':
        return [
          "✅ Unlimited AI analysis",
          "✅ Up to 500 pages per analysis",
          "✅ Team collaboration features",
          "✅ Advanced analytics dashboard",
          "✅ Priority support",
          "🛡️ All Coffee tier guarantees included"
        ]
      case 'scale':
        return [
          "✅ Unlimited everything",
          "✅ Enterprise white-label options",
          "✅ Custom API integrations",
          "✅ Dedicated account manager",
          "✅ Custom SLA agreements",
          "🛡️ All guarantees + enterprise protection"
        ]
      default:
        return []
    }
  }

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
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          
          {/* Signup Form */}
          <div>
            <Card className="w-full max-w-md mx-auto lg:mx-0">
              <CardHeader className="space-y-1">
                <CardTitle className="text-2xl text-center">Create Your Account</CardTitle>
                <CardDescription className="text-center">
                  Join early adopters making their businesses AI-discoverable
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  {error && (
                    <Alert variant="destructive">
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}
                  
                  {/* Tier Selection Dropdown */}
                  <div className="space-y-2">
                    <Label htmlFor="tier">Select Your Plan</Label>
                    <select
                      id="tier"
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
                          event_category: 'engagement'
                        });
                        
                        setSelectedTier(newTier);
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-innovation-teal"
                    >
                      <option value="starter">⚠️ FREE (Severely Limited - Miss Critical Pages)</option>
                      <option value="coffee">🏆 COFFEE - Crush Competition ($4.95 one-time + Guarantees)</option>
                      <option value="growth">💼 GROWTH - Professional Power ($9.95/month)</option>
                      <option value="scale">🚀 SCALE - Enterprise Domination ($19.95/month)</option>
                    </select>
                    
                    {/* Selected Tier Details */}
                    <div className={`rounded-lg p-4 border-2 mt-2 ${
                      selectedTier === 'starter' ? 'bg-red-50 border-red-300' :
                      selectedTier === 'coffee' ? 'bg-green-50 border-green-400' :
                      'bg-blue-50 border-blue-300'
                    }`}>
                      <div className="flex items-center justify-between">
                        <Badge className={getTierColorClass(selectedTier)}>
                          {getTierIcon(selectedTier)}
                          <span className="ml-1">{getTierDisplayName(selectedTier)}</span>
                        </Badge>
                      </div>
                      <p className={`text-sm font-medium mt-2 ${
                        selectedTier === 'starter' ? 'text-red-700' :
                        selectedTier === 'coffee' ? 'text-green-700' :
                        'text-blue-700'
                      }`}>
                        {getTierDescription(selectedTier)}
                      </p>
                      
                      {/* Dramatic messaging for each tier */}
                      {selectedTier === 'starter' && (
                        <div className="mt-3 p-3 bg-red-100 border border-red-300 rounded">
                          <p className="text-xs font-bold text-red-800">
                            ⚠️ WARNING: You'll miss critical pages and your competitors will outrank you with better llms.txt files!
                          </p>
                        </div>
                      )}
                      
                      {selectedTier === 'coffee' && (
                        <div className="mt-3 p-3 bg-green-100 border border-green-300 rounded">
                          <p className="text-xs font-bold text-green-800">
                            🚀 SMART CHOICE! Full power + 30-day guarantee + cancel instantly. After signup, secure Stripe payment ($5/month)
                          </p>
                        </div>
                      )}
                      
                      {(selectedTier === 'growth' || selectedTier === 'scale') && (
                        <div className="mt-3 p-3 bg-blue-100 border border-blue-300 rounded">
                          <p className="text-xs font-bold text-blue-800">
                            💼 PROFESSIONAL CHOICE: All guarantees included + advanced features for serious businesses
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Email Field */}
                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="your@email.com"
                        className={`pl-10 pr-10 ${
                          emailAvailable === false ? 'border-red-500' : 
                          emailAvailable === true ? 'border-green-500' : ''
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
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Create a secure password"
                        className={`pl-10 pr-10 ${
                          passwordValidation && !passwordValidation.valid ? 'border-red-500' : 
                          passwordValidation?.valid ? 'border-green-500' : ''
                        }`}
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-3 h-5 w-5 text-gray-400 hover:text-gray-600 p-1 min-h-[44px] min-w-[44px] flex items-center justify-center"
                        aria-label={showPassword ? "Hide password" : "Show password"}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
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
                        type={showConfirmPassword ? "text" : "password"}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Confirm your password"
                        className={`pl-10 pr-10 ${
                          confirmPassword && password !== confirmPassword ? 'border-red-500' : 
                          confirmPassword && password === confirmPassword && password.length > 0 ? 'border-green-500' : ''
                        }`}
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-3 h-5 w-5 text-gray-400 hover:text-gray-600 p-1 min-h-[44px] min-w-[44px] flex items-center justify-center"
                        aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                      >
                        {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
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
                    By creating an account, you agree to our{" "}
                    <Link href="/terms">
                      <a className="text-blue-600 hover:text-blue-800 underline">Terms of Service</a>
                    </Link>{" "}
                    and{" "}
                    <Link href="/privacy">
                      <a className="text-blue-600 hover:text-blue-800 underline">Privacy Policy</a>
                    </Link>
                  </div>

                  {/* Submit Button */}
                  <Button
                    type="submit"
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
                </form>

                {/* Login Link */}
                <div className="mt-6 text-center">
                  <p className="text-sm text-gray-600">
                    Already have an account?{" "}
                    <Link href="/login">
                      <a className="text-blue-600 hover:text-blue-800 font-medium">
                        Sign in
                      </a>
                    </Link>
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Tier Benefits & Trust Signals */}
          <div className="space-y-6">
            
            {/* Selected Tier Benefits */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  {getTierIcon(selectedTier)}
                  <span className="ml-2">{getTierDisplayName(selectedTier)} Plan Benefits</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {getTierBenefits(selectedTier).map((benefit, index) => (
                    <li key={index} className="flex items-start">
                      {selectedTier === 'starter' ? (
                        <X className="h-4 w-4 text-red-500 mt-0.5 mr-3 flex-shrink-0" />
                      ) : (
                        <Check className="h-4 w-4 text-green-500 mt-0.5 mr-3 flex-shrink-0" />
                      )}
                      <span className={`text-sm font-medium ${
                        selectedTier === 'starter' ? 'text-red-700' : 
                        selectedTier === 'coffee' ? 'text-green-700' : 'text-gray-700'
                      }`}>
                        {benefit}
                      </span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            {/* Dramatic Trust Signals */}
            <Card className="border-2 border-green-200 bg-gradient-to-br from-green-50 to-blue-50">
              <CardHeader>
                <CardTitle className="text-green-800">🛡️ ZERO RISK - We Remove ALL Your Fears</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-start space-x-3">
                  <Shield className="h-6 w-6 text-green-600 mt-0.5" />
                  <div>
                    <h4 className="font-bold text-green-800">💰 30-Day Money Back Guarantee</h4>
                    <p className="text-sm text-green-700">Don't like the results? Get every penny back. No questions asked. No hoops to jump through.</p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-3">
                  <Zap className="h-6 w-6 text-blue-600 mt-0.5" />
                  <div>
                    <h4 className="font-bold text-blue-800">⚡ Cancel Instantly Anytime</h4>
                    <p className="text-sm text-blue-700">One click cancellation. No phone calls. No retention tactics. Cancel in 10 seconds flat.</p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-3">
                  <User className="h-6 w-6 text-purple-600 mt-0.5" />
                  <div>
                    <h4 className="font-bold text-purple-800">🏆 Results in 24 Hours or Refund</h4>
                    <p className="text-sm text-purple-700">See dramatic improvements within 24 hours or get a full refund immediately.</p>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <Coffee className="h-6 w-6 text-orange-600 mt-0.5" />
                  <div>
                    <h4 className="font-bold text-orange-800">🚀 Outperform Competitors or Refund</h4>
                    <p className="text-sm text-orange-700">We find 3x more pages than competitors or you get your money back. Guaranteed.</p>
                  </div>
                </div>

                <div className="bg-white p-3 rounded border-2 border-green-300 mt-4">
                  <p className="text-center text-sm font-bold text-green-800">
                    ✅ Built by Expert Solopreneur • ✅ Not VC-Funded BS • ✅ Real Results for Real Businesses
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
                      Your data is encrypted and never shared. We only analyze public content 
                      and generate files you control.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-framework-black text-white py-8 mt-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-4">
            <div className="flex justify-center space-x-6 text-sm">
              <a href="/privacy" className="text-slate-300 hover:text-innovation-teal transition-colors">Privacy Policy</a>
              <a href="/terms" className="text-slate-300 hover:text-innovation-teal transition-colors">Terms of Service</a>
              <a href="/contact" className="text-slate-300 hover:text-innovation-teal transition-colors">Contact</a>
            </div>
          </div>
          <div className="text-center">
            <p className="text-sm text-slate-400">
              &copy; 2025 Jamie Watters. No corporate BS. Just tools that work.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}