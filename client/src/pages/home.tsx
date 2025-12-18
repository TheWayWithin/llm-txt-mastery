import { useCallback, useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { User, Settings, Coffee, HelpCircle } from 'lucide-react';
import { AuthNav } from '@/components/AuthNav';
import { getTierDisplayName } from '@/lib/tier-utils';
import UrlInput from '@/components/url-input';
import EmailCapture from '@/components/email-capture';
import Footer from '@/components/footer';
import ContentAnalysis from '@/components/content-analysis';
import ContentReview from '@/components/content-review';
import FileGeneration from '@/components/file-generation';
import TierLimitsDisplay from '@/components/tier-limits-display';
import UsageDisplay from '@/components/usage-display';
import { AuthModal } from '@/components/auth/AuthModal';
import { ProgressBreadcrumb, FLOW_STEPS } from '@/components/ui/progress-breadcrumb';
import { EnhancedLoading, LOADING_STATES } from '@/components/ui/enhanced-loading';
import { useFlowStateMachine } from '@/hooks/useFlowStateMachine';
import { useAuth } from '@/contexts/AuthContext';
import { DiscoveredPage } from '@shared/schema';
import { Link } from 'wouter';
import ErrorBoundary from '@/components/ErrorBoundary';
import ErrorDisplay from '@/components/ErrorDisplay';
import ResetButton from '@/components/ResetButton';
import { QuickHelp } from '@/components/HelpSystem';
import DailyLimitModal from '@/components/DailyLimitModal';
import EmailVerificationBanner from '@/components/email-verification-banner';
import { DemoModeBanner } from '@/components/DemoModeBanner';
import { OptimizedImage } from '@/components/OptimizedImage';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import PricingPreview from '@/components/landing/PricingPreview';
import TrustBadges from '@/components/landing/TrustBadges';

export default function Home() {
  // Import auth hook to get email recognition capability
  const { recognizeEmailUser } = useAuth();
  const queryClient = useQueryClient();
  const [showDailyLimitModal, setShowDailyLimitModal] = useState(false);

  // Replace all complex state management with the state machine
  const {
    // State
    currentState,
    websiteUrl,
    userEmail,
    userTier,
    analysisId,
    discoveredPages,
    generatedFileId,
    user,
    authLoading,
    showAuthModal,
    progress,
    error,
    retryCount,

    // Computed properties
    effectiveEmail,
    effectiveTier,

    // Component visibility
    visibility,

    // Actions
    actions,
  } = useFlowStateMachine();

  // Fetch usage data to check limits
  const { data: usageData } = useQuery({
    queryKey: ['/api/usage', effectiveEmail],
    queryFn: async () => {
      if (!effectiveEmail) return null;
      const response = await apiRequest('GET', `/api/usage/${encodeURIComponent(effectiveEmail)}`);
      return response.json();
    },
    enabled: !!effectiveEmail,
    refetchInterval: 10000,
  });

  // Stable function reference to prevent infinite loops
  // Uses stable dispatch pattern to avoid dependency on actions object
  const handleAnalysisComplete = useCallback(
    (id: number, pages: DiscoveredPage[]) => {
      console.log(`🎯 ANALYSIS_COMPLETE triggered: id=${id}, pagesCount=${pages.length}`);

      // CRITICAL FIX: Invalidate usage queries to refresh counter immediately
      console.log(`🔄 Invalidating usage queries for user: ${effectiveEmail}`);
      if (effectiveEmail) {
        queryClient.invalidateQueries({
          queryKey: ['/api/usage', effectiveEmail],
        });
      }

      actions.completeAnalysis(id, pages);
    },
    [actions.completeAnalysis, effectiveEmail, queryClient]
  );

  const handleFileGenerated = useCallback(
    (fileId: number) => {
      actions.generateFile(fileId);
    },
    [actions.generateFile]
  );

  const resetWorkflow = () => {
    actions.resetWorkflow();
  };

  const startNewAnalysis = () => {
    // Check if user has reached daily limit
    if (
      usageData &&
      user?.tier === 'starter' &&
      usageData.usage?.analysesToday >= usageData.limits?.dailyAnalyses
    ) {
      setShowDailyLimitModal(true);
    } else {
      actions.startNewAnalysis();
    }
  };

  const handleViewAnalysisDetails = () => {
    actions.viewAnalysisDetails();
  };

  return (
    <ErrorBoundary onReset={resetWorkflow}>
      <div className="min-h-screen bg-slate-50">
        {/* Header */}
        <header className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <img
                  src="/images/logo-primary.png"
                  alt="LLM.txt Mastery"
                  className="h-20 md:h-24 w-auto"
                />
              </div>
              <div className="flex items-center space-x-4">
                {/* Help & Reset Actions - Only show during workflow, not on landing */}
                {currentState !== 'URL_INPUT' &&
                  currentState !== 'INITIALIZING' &&
                  currentState !== 'LANDING' && (
                    <div className="flex items-center space-x-2">
                      <QuickHelp
                        context={
                          currentState === 'EMAIL_CAPTURE'
                            ? 'email-capture'
                            : currentState === 'ANALYSIS'
                              ? 'analysis'
                              : currentState === 'REVIEW'
                                ? 'review'
                                : currentState === 'GENERATION'
                                  ? 'generation'
                                  : currentState === 'ERROR'
                                    ? 'error'
                                    : 'url-input'
                        }
                      />
                      <ResetButton
                        onReset={resetWorkflow}
                        variant="header"
                        showConfirmation={true}
                      />
                    </div>
                  )}
                <AuthNav />
                <div className="text-right hidden md:block">
                  <p className="text-sm text-ai-silver">Built by Jamie Watters</p>
                  <p className="text-xs text-ai-silver">Solopreneur & Tool Builder</p>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Demo Mode Banner - Show when user is in demo mode */}
        {user?.isDemo && <DemoModeBanner onLogin={() => actions.openAuthModal()} />}

        {/* Email Verification Banner - Show immediately after header */}
        {user &&
          console.log('🔍 User verification check:', {
            hasUser: !!user,
            email: user?.email,
            emailVerified: user?.emailVerified,
            typeOfEmailVerified: typeof user?.emailVerified,
            isExactlyFalse: user?.emailVerified === false,
            shouldShowBanner: user?.emailVerified === false,
            fullUserObject: user,
          })}
        {user && user.emailVerified === false && (
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-4">
            <EmailVerificationBanner userEmail={user.email} emailVerified={user.emailVerified} />
          </div>
        )}

        {/* Main Content */}
        <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Competitor Warning Alert - Updated December 2025 */}
          <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r-lg mb-6">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <svg
                  className="h-5 w-5 text-amber-500 mt-0.5"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm font-bold text-amber-800">
                  ⚠️ December 2025 Alert: Free Tools Find Pages, But Can't Score Quality
                </p>
                <p className="text-sm text-amber-700 mt-1">
                  <span className="font-semibold">Free llms.txt generators</span> find pages — but miss what matters.
                  Only <span className="font-semibold text-innovation-teal">LLM.txt Mastery</span> uses
                  <span className="font-semibold"> GPT-4o</span> to evaluate what ChatGPT, Claude & Perplexity will actually <span className="italic">cite</span>.
                </p>
              </div>
            </div>
          </div>

          {/* Hero Section - 6 Moats Positioning */}
          <section className="text-center mb-12">
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-framework-black mb-4">
              The ONLY Dedicated LLMs.txt Platform
            </h1>
            <p className="text-base sm:text-lg text-ai-silver mb-6 max-w-2xl mx-auto">
              Free tools are lead magnets for other products. We're <span className="font-semibold text-innovation-teal">100% focused on AI discoverability</span> —
              with GPT-4o analysis, any website type support, and 47+ updates shipped in 2025.
            </p>

            {/* 6 Moat Badges - Core Differentiators */}
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 mb-6 max-w-3xl mx-auto">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                <div className="flex items-center justify-center space-x-2 bg-white rounded-md px-3 py-2 border border-green-200">
                  <span className="text-green-600 font-bold">✓</span>
                  <span className="text-gray-700">AI Quality Scoring (GPT-4o)</span>
                </div>
                <div className="flex items-center justify-center space-x-2 bg-white rounded-md px-3 py-2 border border-green-200">
                  <span className="text-green-600 font-bold">✓</span>
                  <span className="text-gray-700">Any Website Type (SSR/CSR/SSG)</span>
                </div>
                <div className="flex items-center justify-center space-x-2 bg-white rounded-md px-3 py-2 border border-green-200">
                  <span className="text-green-600 font-bold">✓</span>
                  <span className="text-gray-700">15+ Frameworks Detected</span>
                </div>
                <div className="flex items-center justify-center space-x-2 bg-white rounded-md px-3 py-2 border border-green-200">
                  <span className="text-green-600 font-bold">✓</span>
                  <span className="text-gray-700">Validator + robots.txt Check</span>
                </div>
                <div className="flex items-center justify-center space-x-2 bg-white rounded-md px-3 py-2 border border-green-200">
                  <span className="text-green-600 font-bold">✓</span>
                  <span className="text-gray-700">All 4 File Locations</span>
                </div>
                <div className="flex items-center justify-center space-x-2 bg-white rounded-md px-3 py-2 border border-green-200">
                  <span className="text-green-600 font-bold">✓</span>
                  <span className="text-gray-700">47+ Updates in 2025</span>
                </div>
              </div>
            </div>

            {/* Hero Illustration */}
            <div className="my-8 flex justify-center">
              <OptimizedImage
                src="/images/hero-illustration-professional.png"
                alt="Website transformation into AI-ready content"
                className="max-w-full h-auto max-h-64 rounded-lg shadow-lg"
                loading="eager"
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 1200px"
              />
            </div>

            {/* Hero CTA Buttons */}
            <div className="mt-6 flex flex-col sm:flex-row justify-center gap-4">
              <Button
                size="lg"
                className="bg-mastery-blue hover:bg-mastery-blue/90 text-white px-8 py-3"
                onClick={() => {
                  if (user) {
                    // Authenticated users go directly to analyze
                    window.location.href = '/analyze';
                  } else {
                    // New users go to signup
                    window.location.href = '/signup';
                  }
                }}
              >
                Start Free Analysis
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="border-innovation-teal text-innovation-teal hover:bg-innovation-teal/10 px-8 py-3"
                onClick={() => {
                  document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' });
                }}
              >
                See How It Works
              </Button>
            </div>

            <div className="flex items-center justify-center space-x-2 text-sm text-ai-silver mt-4">
              <div className="flex items-center space-x-1">
                <span className="text-lg">✅</span>
                <span>89% see results in 30 days</span>
              </div>
              <span className="text-slate-300">•</span>
              <div className="flex items-center space-x-1">
                <span className="text-lg">🛡️</span>
                <span>30-day money-back guarantee</span>
              </div>
              <span className="text-slate-300">•</span>
              <div className="flex items-center space-x-1">
                <span className="text-lg">🚀</span>
                <span>Used by 5,000+ businesses</span>
              </div>
            </div>

            {/* Dedicated Platform Badge */}
            <div className="flex items-center justify-center space-x-1 text-sm text-ai-silver mt-2">
              <span className="text-lg">🎯</span>
              <span>This is our entire focus — not a marketing add-on for another product</span>
            </div>

            {/* Security Trust Badges */}
            <div className="mt-6">
              <TrustBadges variant="security" compact={true} alignment="center" />
            </div>
          </section>

          {/* Problem-Solution Section - Updated for Quality vs Quantity */}
          <section className="mb-16">
            <div className="bg-red-50 border border-red-200 rounded-lg p-8">
              <h3 className="text-2xl font-bold text-framework-black mb-6 text-center">
                Free Tools Find Pages. But Will AI Actually Cite You?
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <div>
                  <h4 className="font-semibold text-red-800 mb-3">The Hidden Problem:</h4>
                  <ul className="space-y-2 text-sm text-red-700">
                    <li>❌ Free generators find pages — but without quality scoring</li>
                    <li>❌ AI systems get a list, not guidance on what matters</li>
                    <li>❌ Your privacy policy ranks alongside your best content</li>
                    <li>❌ No framework detection means React/Next.js sites may fail</li>
                    <li>❌ robots.txt conflicts silently block AI access</li>
                    <li>❌ Lead magnets get abandoned — no updates after launch</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold text-green-800 mb-3">What Quality Intelligence Delivers:</h4>
                  <ul className="space-y-2 text-sm text-green-700">
                    <li>✅ GPT-4o analyzes what AI will actually cite</li>
                    <li>✅ Quality scoring prioritizes your best content</li>
                    <li>✅ 15+ framework detection (React, Next.js, Vue, Astro...)</li>
                    <li>✅ robots.txt conflict detection (unique feature)</li>
                    <li>✅ All 4 file locations (llms.txt, llms-full.txt, .well-known/, llms.md)</li>
                    <li>✅ 47+ updates in 2025 — actively developed platform</li>
                    <li>✅ Dedicated platform, not a side feature or lead magnet</li>
                  </ul>
                </div>
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-600 mb-4">
                  <strong>The insight:</strong> Finding pages is solved. <span className="italic">Finding the RIGHT pages for AI citation</span> — that's what we do.
                </p>
                <Button
                  variant="outline"
                  size="lg"
                  className="border-red-300 text-red-700 hover:bg-red-100"
                  onClick={() => {
                    document
                      .getElementById('competitor-comparison')
                      ?.scrollIntoView({ behavior: 'smooth' });
                  }}
                >
                  See the Full Comparison →
                </Button>
              </div>
            </div>
          </section>

          {/* Pricing Preview Section - Growth highlighted (Sprint 3) */}
          <PricingPreview
            highlightTier="growth"
            showAllTiers={true}
            className="mb-16"
          />

          {/* Trust Section */}
          <section className="mb-16">
            <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-8">
              <div className="text-center">
                <h3 className="text-2xl font-bold text-framework-black mb-6">
                  Trusted & Standards-Compliant
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl mx-auto">
                  <div className="flex items-center justify-center space-x-2">
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    <span className="text-ai-silver">
                      Following the official llms.txt specification
                    </span>
                  </div>
                  <div className="flex items-center justify-center space-x-2">
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    <span className="text-ai-silver">
                      Compliant with Google's structured data best practices
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Validator Tool Section - Enhanced with robots.txt */}
          <section className="mb-16">
            <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg border-2 border-innovation-teal shadow-lg p-8">
              <div className="text-center mb-6">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-innovation-teal rounded-full mb-4">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-3xl font-bold text-framework-black mb-3">
                  The Only Validator That Checks robots.txt Conflicts
                </h3>
                <p className="text-lg text-ai-silver max-w-2xl mx-auto mb-6">
                  Standalone validators check format. Our validator checks if your llms.txt <span className="font-semibold text-innovation-teal">actually works</span> — including robots.txt conflicts that silently block AI access.
                </p>
                <div className="inline-flex items-center justify-center px-4 py-2 bg-green-100 border border-green-300 rounded-full mb-4">
                  <span className="text-sm font-semibold text-green-800">✨ 100% Free Tool - No Sign-up Required</span>
                </div>
              </div>

              <div className="max-w-2xl mx-auto mb-6">
                <div className="bg-white rounded-lg shadow-md p-6">
                  <h4 className="font-semibold text-framework-black mb-4 text-center">
                    What Our Validator Checks (That Others Don't):
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div className="flex items-start space-x-2 p-2 bg-green-50 rounded-lg border border-green-200">
                      <span className="text-green-600 font-bold mt-0.5">✓</span>
                      <div>
                        <span className="text-gray-800 font-medium">robots.txt Conflict Detection</span>
                        <p className="text-gray-500 text-xs">Catches silent blocking issues</p>
                      </div>
                    </div>
                    <div className="flex items-start space-x-2 p-2 bg-green-50 rounded-lg border border-green-200">
                      <span className="text-green-600 font-bold mt-0.5">✓</span>
                      <div>
                        <span className="text-gray-800 font-medium">Content Quality Score</span>
                        <p className="text-gray-500 text-xs">Not just format compliance</p>
                      </div>
                    </div>
                    <div className="flex items-start space-x-2 p-2">
                      <div className="w-2 h-2 bg-innovation-teal rounded-full mt-1.5"></div>
                      <span className="text-ai-silver">Official spec compliance</span>
                    </div>
                    <div className="flex items-start space-x-2 p-2">
                      <div className="w-2 h-2 bg-innovation-teal rounded-full mt-1.5"></div>
                      <span className="text-ai-silver">Format validation</span>
                    </div>
                    <div className="flex items-start space-x-2 p-2">
                      <div className="w-2 h-2 bg-innovation-teal rounded-full mt-1.5"></div>
                      <span className="text-ai-silver">Actionable recommendations</span>
                    </div>
                    <div className="flex items-start space-x-2 p-2">
                      <div className="w-2 h-2 bg-innovation-teal rounded-full mt-1.5"></div>
                      <span className="text-ai-silver">Integrated improvement workflow</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row justify-center gap-4">
                <Link href="/validate">
                  <a>
                    <Button
                      size="lg"
                      className="bg-innovation-teal hover:bg-innovation-teal/90 text-white px-8 py-3 shadow-lg hover:shadow-xl transition-shadow"
                    >
                      <svg className="h-5 w-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                      </svg>
                      Validate Your llms.txt File
                    </Button>
                  </a>
                </Link>
              </div>

              <p className="text-center text-sm text-ai-silver mt-4">
                Don't let a robots.txt misconfiguration silently block your AI visibility
              </p>
            </div>
          </section>

          {/* How It Works Section */}
          <section id="how-it-works" className="mb-16">
            <div className="text-center mb-8">
              <h3 className="text-2xl sm:text-3xl font-bold text-framework-black mb-4">How It Works</h3>
              <p className="text-lg text-ai-silver max-w-2xl mx-auto">
                I built this tool to analyze websites and create llms.txt files that actually work.
                Three simple steps, no corporate complexity.
              </p>
            </div>

            {/* Process Diagram */}
            <div className="my-8 flex justify-center">
              <OptimizedImage
                src="/images/how-it-works-professional.png"
                alt="Process comparison showing LLM.txt Mastery finding 200+ pages vs competitors finding 20 pages"
                className="max-w-full h-auto max-h-64 rounded-lg shadow-lg object-contain"
                loading="lazy"
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 1200px"
              />
            </div>

            {/* Step Details */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
              <div className="text-center">
                <div className="w-12 h-12 bg-innovation-teal text-white rounded-full flex items-center justify-center mx-auto mb-4 text-xl font-bold">
                  1
                </div>
                <h4 className="text-xl font-semibold text-framework-black mb-2">Enter Your URL</h4>
                <p className="text-ai-silver">
                  Simply paste your website URL and we'll begin the systematic discovery process
                  using comprehensive sitemap discovery.
                </p>
              </div>

              <div className="text-center">
                <div className="w-12 h-12 bg-innovation-teal text-white rounded-full flex items-center justify-center mx-auto mb-4 text-xl font-bold">
                  2
                </div>
                <h4 className="text-xl font-semibold text-framework-black mb-2">AI Analysis</h4>
                <p className="text-ai-silver">
                  Our AI system evaluates your content quality, relevance, and structure to identify
                  the highest-quality, most relevant pages for inclusion.
                </p>
              </div>

              <div className="text-center">
                <div className="w-12 h-12 bg-innovation-teal text-white rounded-full flex items-center justify-center mx-auto mb-4 text-xl font-bold">
                  3
                </div>
                <h4 className="text-xl font-semibold text-framework-black mb-2">
                  Download Your File
                </h4>
                <p className="text-ai-silver">
                  Get your specification-compliant llms.txt file ready for immediate deployment.
                </p>
              </div>
            </div>

            {/* CTA Button after How It Works */}
            <div className="mt-8 flex justify-center">
              <Button
                size="lg"
                className="bg-mastery-blue hover:bg-mastery-blue/90 text-white px-8 py-3"
                onClick={() => {
                  if (user) {
                    window.location.href = '/analyze';
                  } else {
                    window.location.href = '/signup';
                  }
                }}
              >
                Start Free Analysis
              </Button>
            </div>
          </section>

          {/* Competitor Comparison Section - Updated December 2025 with Keploy */}
          <section id="competitor-comparison" className="mb-16">
            <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-8">
              <h3 className="text-2xl sm:text-3xl font-bold text-framework-black mb-4 text-center">
                Free Tools Find Pages. We Find What AI Will CITE.
              </h3>
              <p className="text-lg text-ai-silver text-center mb-4 max-w-3xl mx-auto">
                December 2025 independent testing. Yes, free generators find most pages — but without quality analysis,
                AI systems won't know which pages matter.
              </p>
              <p className="text-sm text-gray-500 text-center mb-8 max-w-2xl mx-auto">
                We openly acknowledge competitors. Honesty builds trust.
              </p>

              {/* Comparison Table - New format with Keploy */}
              <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
                <table className="w-full border-collapse min-w-[700px]">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="border border-gray-200 px-4 py-3 text-left font-semibold text-framework-black">
                        Feature
                      </th>
                      <th className="border border-gray-200 px-4 py-3 text-center font-semibold bg-innovation-teal/10 text-innovation-teal">
                        LLM.txt Mastery
                      </th>
                      <th className="border border-gray-200 px-4 py-3 text-center font-semibold text-gray-600">
                        Keploy (Free)
                      </th>
                      <th className="border border-gray-200 px-4 py-3 text-center font-semibold text-gray-600">
                        SiteSpeakAI
                      </th>
                      <th className="border border-gray-200 px-4 py-3 text-center font-semibold text-gray-600">
                        Writesonic
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* Product Focus - MOAT 6 */}
                    <tr className="hover:bg-gray-50 bg-green-50">
                      <td className="border border-gray-200 px-4 py-3 font-medium">
                        <span className="font-bold text-green-700">Product Focus</span>
                      </td>
                      <td className="border border-gray-200 px-4 py-3 text-center text-green-600 font-bold bg-green-50">
                        ✅ Dedicated Platform
                      </td>
                      <td className="border border-gray-200 px-4 py-3 text-center text-yellow-600">
                        ⚠️ Lead Magnet
                      </td>
                      <td className="border border-gray-200 px-4 py-3 text-center text-yellow-600">
                        ⚠️ Side Feature
                      </td>
                      <td className="border border-gray-200 px-4 py-3 text-center text-yellow-600">
                        ⚠️ Side Feature
                      </td>
                    </tr>
                    {/* AI Quality Scoring - MOAT 1 */}
                    <tr className="hover:bg-gray-50 bg-green-50">
                      <td className="border border-gray-200 px-4 py-3 font-medium">
                        <span className="font-bold text-green-700">AI Quality Scoring</span>
                      </td>
                      <td className="border border-gray-200 px-4 py-3 text-center text-green-600 font-bold bg-green-50">
                        ✅ GPT-4o Analysis
                      </td>
                      <td className="border border-gray-200 px-4 py-3 text-center text-red-600">
                        ❌ None
                      </td>
                      <td className="border border-gray-200 px-4 py-3 text-center text-red-600">
                        ❌ None
                      </td>
                      <td className="border border-gray-200 px-4 py-3 text-center text-red-600">
                        ❌ None
                      </td>
                    </tr>
                    {/* Website Type Detection - MOAT 2 */}
                    <tr className="hover:bg-gray-50 bg-green-50">
                      <td className="border border-gray-200 px-4 py-3 font-medium">
                        <span className="font-bold text-green-700">Website Type Detection</span>
                      </td>
                      <td className="border border-gray-200 px-4 py-3 text-center text-green-600 font-bold bg-green-50">
                        ✅ All 5 Types (SSR/CSR/SSG/ISR/Static)
                      </td>
                      <td className="border border-gray-200 px-4 py-3 text-center text-red-600">
                        ❌ HTML Only
                      </td>
                      <td className="border border-gray-200 px-4 py-3 text-center text-red-600">
                        ❌ HTML Only
                      </td>
                      <td className="border border-gray-200 px-4 py-3 text-center text-red-600">
                        ❌ HTML Only
                      </td>
                    </tr>
                    {/* Framework Detection - MOAT 3 */}
                    <tr className="hover:bg-gray-50 bg-green-50">
                      <td className="border border-gray-200 px-4 py-3 font-medium">
                        <span className="font-bold text-green-700">Framework Detection</span>
                      </td>
                      <td className="border border-gray-200 px-4 py-3 text-center text-green-600 font-bold bg-green-50">
                        ✅ 15+ Frameworks
                      </td>
                      <td className="border border-gray-200 px-4 py-3 text-center text-red-600">
                        ❌ None
                      </td>
                      <td className="border border-gray-200 px-4 py-3 text-center text-red-600">
                        ❌ None
                      </td>
                      <td className="border border-gray-200 px-4 py-3 text-center text-red-600">
                        ❌ None
                      </td>
                    </tr>
                    {/* Validator with robots.txt - MOAT 4 */}
                    <tr className="hover:bg-gray-50 bg-green-50">
                      <td className="border border-gray-200 px-4 py-3 font-medium">
                        <span className="font-bold text-green-700">Validator + robots.txt</span>
                      </td>
                      <td className="border border-gray-200 px-4 py-3 text-center text-green-600 font-bold bg-green-50">
                        ✅ Full + Conflict Check
                      </td>
                      <td className="border border-gray-200 px-4 py-3 text-center text-red-600">
                        ❌ None
                      </td>
                      <td className="border border-gray-200 px-4 py-3 text-center text-red-600">
                        ❌ None
                      </td>
                      <td className="border border-gray-200 px-4 py-3 text-center text-red-600">
                        ❌ None
                      </td>
                    </tr>
                    {/* Output Formats - MOAT 5 */}
                    <tr className="hover:bg-gray-50">
                      <td className="border border-gray-200 px-4 py-3 font-medium">
                        Output Formats
                      </td>
                      <td className="border border-gray-200 px-4 py-3 text-center text-green-600 font-bold">
                        ✅ All 3 Formats
                      </td>
                      <td className="border border-gray-200 px-4 py-3 text-center text-yellow-600">
                        ⚠️ 1 Format
                      </td>
                      <td className="border border-gray-200 px-4 py-3 text-center text-yellow-600">
                        ⚠️ 1 Format
                      </td>
                      <td className="border border-gray-200 px-4 py-3 text-center text-yellow-600">
                        ⚠️ 1 Format
                      </td>
                    </tr>
                    {/* Pages Found */}
                    <tr className="hover:bg-gray-50">
                      <td className="border border-gray-200 px-4 py-3 font-medium">
                        Pages Found (Test Site)
                      </td>
                      <td className="border border-gray-200 px-4 py-3 text-center text-green-600 font-bold">
                        ✅ 147 pages
                      </td>
                      <td className="border border-gray-200 px-4 py-3 text-center text-green-600">
                        ✅ 133 pages
                      </td>
                      <td className="border border-gray-200 px-4 py-3 text-center text-yellow-600">
                        ⚠️ 21 pages
                      </td>
                      <td className="border border-gray-200 px-4 py-3 text-center text-yellow-600">
                        ⚠️ 53 pages
                      </td>
                    </tr>
                    {/* CSR/SPA Support */}
                    <tr className="hover:bg-gray-50">
                      <td className="border border-gray-200 px-4 py-3 font-medium">
                        CSR/SPA Content Capture
                      </td>
                      <td className="border border-gray-200 px-4 py-3 text-center text-green-600 font-bold">
                        ✅ Full + Warnings
                      </td>
                      <td className="border border-gray-200 px-4 py-3 text-center text-red-600">
                        ❌ Fails Silently
                      </td>
                      <td className="border border-gray-200 px-4 py-3 text-center text-red-600">
                        ❌ Fails Silently
                      </td>
                      <td className="border border-gray-200 px-4 py-3 text-center text-red-600">
                        ❌ Fails Silently
                      </td>
                    </tr>
                    {/* Support */}
                    <tr className="hover:bg-gray-50">
                      <td className="border border-gray-200 px-4 py-3 font-medium">Support</td>
                      <td className="border border-gray-200 px-4 py-3 text-center text-green-600 font-bold">
                        ✅ Direct Founder Access
                      </td>
                      <td className="border border-gray-200 px-4 py-3 text-center text-yellow-600">
                        ⚠️ Self-Serve
                      </td>
                      <td className="border border-gray-200 px-4 py-3 text-center text-yellow-600">
                        ⚠️ Tickets
                      </td>
                      <td className="border border-gray-200 px-4 py-3 text-center text-yellow-600">
                        ⚠️ Tickets
                      </td>
                    </tr>
                    {/* 2025 Updates */}
                    <tr className="hover:bg-gray-50">
                      <td className="border border-gray-200 px-4 py-3 font-medium">2025 Updates</td>
                      <td className="border border-gray-200 px-4 py-3 text-center text-green-600 font-bold">
                        ✅ 47+ Shipped
                      </td>
                      <td className="border border-gray-200 px-4 py-3 text-center text-gray-400">
                        ❓ Unknown
                      </td>
                      <td className="border border-gray-200 px-4 py-3 text-center text-gray-400">
                        ❓ Unknown
                      </td>
                      <td className="border border-gray-200 px-4 py-3 text-center text-gray-400">
                        ❓ Unknown
                      </td>
                    </tr>
                    {/* Price */}
                    <tr className="hover:bg-gray-50">
                      <td className="border border-gray-200 px-4 py-3 font-medium">Price</td>
                      <td className="border border-gray-200 px-4 py-3 text-center text-green-600 font-bold">
                        $0-$19.95/mo
                      </td>
                      <td className="border border-gray-200 px-4 py-3 text-center text-green-600">
                        Free
                      </td>
                      <td className="border border-gray-200 px-4 py-3 text-center text-gray-600">
                        $20+/mo
                      </td>
                      <td className="border border-gray-200 px-4 py-3 text-center text-red-600">
                        3/day limit
                      </td>
                    </tr>
                    {/* Bottom Line */}
                    <tr className="bg-gray-100 font-bold">
                      <td className="border border-gray-200 px-4 py-3">Bottom Line</td>
                      <td className="border border-gray-200 px-4 py-3 text-center text-green-600 text-lg bg-green-50">
                        🏆 Quality + Quantity
                      </td>
                      <td className="border border-gray-200 px-4 py-3 text-center text-yellow-600">
                        Quantity Only
                      </td>
                      <td className="border border-gray-200 px-4 py-3 text-center text-gray-600">
                        Limited
                      </td>
                      <td className="border border-gray-200 px-4 py-3 text-center text-red-600">
                        Unusable
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Key Insight */}
              <div className="mt-8 bg-innovation-teal/10 border border-innovation-teal rounded-lg p-6">
                <p className="text-center text-framework-black mb-2">
                  <span className="font-bold text-innovation-teal">The Key Insight:</span> Free tools find most pages — <span className="italic">and that's fine</span>.
                </p>
                <p className="text-center text-ai-silver mb-4">
                  But finding pages isn't enough. AI systems need to know <span className="font-semibold">which pages matter</span>.
                  Only GPT-4o quality scoring tells them that.
                </p>
                <div className="flex justify-center">
                  <Button
                    size="lg"
                    className="bg-mastery-blue hover:bg-mastery-blue/90 text-white"
                    onClick={() => {
                      if (user) {
                        window.location.href = '/analyze';
                      } else {
                        window.location.href = '/signup';
                      }
                    }}
                  >
                    Start Free Analysis
                  </Button>
                </div>
              </div>
            </div>
          </section>

          {/* Tested & Proven Section - December 2025 */}
          <section className="mb-16">
            <div className="bg-gradient-to-r from-blue-50 to-innovation-teal/10 rounded-lg border border-blue-200 p-8">
              <h3 className="text-3xl font-bold text-framework-black mb-6 text-center">
                December 2025 Testing: Quality vs Quantity
              </h3>

              <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-xl font-semibold text-framework-black">
                    Real Test Results: FreecalcHub.com Analysis
                  </h4>
                  <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded">
                    December 2025 Testing
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                  <div className="text-center p-4 bg-green-50 rounded-lg border border-green-200">
                    <p className="text-sm font-medium text-gray-600 mb-1">LLM.txt Mastery</p>
                    <p className="text-3xl font-bold text-green-600">147</p>
                    <p className="text-xs text-gray-500">AI quality-scored pages</p>
                  </div>
                  <div className="text-center p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                    <p className="text-sm font-medium text-gray-600 mb-1">Keploy (Free)</p>
                    <p className="text-3xl font-bold text-yellow-600">133</p>
                    <p className="text-xs text-gray-500">Pages found (no scoring)</p>
                  </div>
                  <div className="text-center p-4 bg-red-50 rounded-lg border border-red-200">
                    <p className="text-sm font-medium text-gray-600 mb-1">SiteSpeakAI</p>
                    <p className="text-2xl font-bold text-red-600">21</p>
                    <p className="text-xs text-gray-500">Only 14% coverage</p>
                  </div>
                  <div className="text-center p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <p className="text-sm font-medium text-gray-600 mb-1">Writesonic</p>
                    <p className="text-2xl font-bold text-gray-600">53</p>
                    <p className="text-xs text-gray-500">3/day limit</p>
                  </div>
                </div>

                <div className="bg-innovation-teal/10 rounded-lg p-4">
                  <p className="text-sm text-gray-700">
                    <strong className="text-innovation-teal">The Real Difference:</strong> Free generators find most pages — that's great for discovery.
                    But only LLM.txt Mastery uses GPT-4o to evaluate <span className="italic">which pages AI will actually cite</span>.
                    Free tools give you quantity. We give you quality intelligence.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white rounded-lg p-4 border border-gray-200">
                  <div className="flex items-center mb-2">
                    <svg
                      className="w-5 h-5 text-green-500 mr-2"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <h5 className="font-semibold text-gray-900">GPT-4o Quality Scoring</h5>
                  </div>
                  <p className="text-sm text-gray-600">
                    Every page evaluated for AI citation potential — not just found
                  </p>
                </div>

                <div className="bg-white rounded-lg p-4 border border-gray-200">
                  <div className="flex items-center mb-2">
                    <svg
                      className="w-5 h-5 text-green-500 mr-2"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <h5 className="font-semibold text-gray-900">15+ Framework Detection</h5>
                  </div>
                  <p className="text-sm text-gray-600">
                    Works on React, Next.js, Vue, Angular, Astro sites that competitors miss
                  </p>
                </div>

                <div className="bg-white rounded-lg p-4 border border-gray-200">
                  <div className="flex items-center mb-2">
                    <svg
                      className="w-5 h-5 text-green-500 mr-2"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <h5 className="font-semibold text-gray-900">47+ Updates in 2025</h5>
                  </div>
                  <p className="text-sm text-gray-600">
                    Dedicated platform — not a side project or lead magnet
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Proof/Results Section - FreecalcHub Case Study */}
          <section className="mb-16">
            <div className="bg-gradient-to-r from-green-50 to-innovation-teal/10 rounded-lg border border-green-200 p-8">
              <h3 className="text-3xl font-bold text-framework-black mb-6 text-center">
                Real Results from Real Businesses
              </h3>

              {/* Case Study Card */}
              <div className="bg-white rounded-lg shadow-lg p-6 mb-6 max-w-3xl mx-auto">
                <div className="flex items-center mb-4">
                  <div className="w-16 h-16 bg-innovation-teal rounded-full flex items-center justify-center text-white font-bold text-xl mr-4">
                    FC
                  </div>
                  <div>
                    <h4 className="text-xl font-bold text-framework-black">
                      FreecalcHub Case Study
                    </h4>
                    <p className="text-sm text-ai-silver">Online Calculator Platform</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <p className="text-3xl font-bold text-green-600">326%</p>
                    <p className="text-sm text-gray-600">Increase in AI-driven traffic</p>
                    <p className="text-xs text-gray-500 mt-1">in 90 days</p>
                  </div>
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <p className="text-3xl font-bold text-blue-600">73%</p>
                    <p className="text-sm text-gray-600">More AI citations</p>
                    <p className="text-xs text-gray-500 mt-1">across all platforms</p>
                  </div>
                  <div className="text-center p-4 bg-purple-50 rounded-lg">
                    <p className="text-3xl font-bold text-purple-600">24hrs</p>
                    <p className="text-sm text-gray-600">To first AI citation</p>
                    <p className="text-xs text-gray-500 mt-1">after implementation</p>
                  </div>
                </div>

                <blockquote className="border-l-4 border-innovation-teal pl-4 italic text-gray-700 mb-4">
                  "We were invisible to AI search before. Now ChatGPT and Claude regularly cite our
                  calculators. The ROI was immediate – we saw results within 24 hours of
                  implementing the llms.txt file."
                </blockquote>
                <p className="text-sm text-gray-600">— Jamie Watters, builder of FreeCalcHub</p>
              </div>

              {/* Success Metrics Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
                <div className="bg-white rounded-lg p-4 text-center shadow">
                  <p className="text-2xl font-bold text-innovation-teal">89%</p>
                  <p className="text-xs text-gray-600">See results in 30 days</p>
                </div>
                <div className="bg-white rounded-lg p-4 text-center shadow">
                  <p className="text-2xl font-bold text-innovation-teal">94%</p>
                  <p className="text-xs text-gray-600">Customer retention rate</p>
                </div>
                <div className="bg-white rounded-lg p-4 text-center shadow">
                  <p className="text-2xl font-bold text-innovation-teal">5,000+</p>
                  <p className="text-xs text-gray-600">Businesses optimized</p>
                </div>
                <div className="bg-white rounded-lg p-4 text-center shadow">
                  <p className="text-2xl font-bold text-innovation-teal">99.97%</p>
                  <p className="text-xs text-gray-600">Platform uptime</p>
                </div>
              </div>

              {/* Risk Reversal */}
              <div className="mt-8 bg-white rounded-lg border-2 border-green-400 p-6 text-center max-w-2xl mx-auto">
                <h4 className="text-xl font-bold text-framework-black mb-3">
                  🛡️ 30-Day Money-Back Guarantee
                </h4>
                <p className="text-gray-700 mb-4">
                  If you don't see measurable improvement in your AI visibility within 30 days,
                  we'll refund your money. No questions asked. That's how confident we are.
                </p>
                <Button
                  size="lg"
                  className="bg-green-600 hover:bg-green-700 text-white"
                  onClick={() => {
                    if (user) {
                      window.location.href = '/analyze';
                    } else {
                      window.location.href = '/signup';
                    }
                  }}
                >
                  Start Free Analysis
                </Button>
              </div>
            </div>
          </section>

          {/* Reliability Guarantee Section */}
          <section className="mb-16">
            <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg border border-purple-200 p-8">
              <h3 className="text-3xl font-bold text-framework-black mb-6 text-center">
                Our Reliability Guarantee
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <div className="bg-white rounded-lg p-6 shadow-md text-center">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg
                      className="w-8 h-8 text-green-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                      ></path>
                    </svg>
                  </div>
                  <h4 className="font-bold text-lg mb-2">100% Uptime</h4>
                  <p className="text-sm text-gray-600">
                    Unlike 2 of our 4 competitors that don't work at all, we guarantee our tool
                    works every time
                  </p>
                </div>

                <div className="bg-white rounded-lg p-6 shadow-md text-center">
                  <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg
                      className="w-8 h-8 text-blue-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
                      ></path>
                    </svg>
                  </div>
                  <h4 className="font-bold text-lg mb-2">No Daily Limits</h4>
                  <p className="text-sm text-gray-600">
                    Unlimited analyses, unlike some tools with restrictive 3 uses per day limits
                  </p>
                </div>

                <div className="bg-white rounded-lg p-6 shadow-md text-center">
                  <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg
                      className="w-8 h-8 text-purple-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M13 10V3L4 14h7v7l9-11h-7z"
                      ></path>
                    </svg>
                  </div>
                  <h4 className="font-bold text-lg mb-2">24-Hour Fix Promise</h4>
                  <p className="text-sm text-gray-600">
                    If anything breaks, we fix it in 24 hours. Direct founder access means rapid
                    resolution
                  </p>
                </div>
              </div>

              <div className="bg-white rounded-lg border-2 border-green-400 p-6 text-center">
                <h4 className="text-xl font-bold text-framework-black mb-3">
                  🛡️ Reliability You Can Trust
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div className="p-3 bg-green-50 rounded">
                    <p className="font-semibold text-green-800">Always Works</p>
                    <p className="text-gray-600">
                      100% uptime guarantee - never broken like competitors
                    </p>
                  </div>
                  <div className="p-3 bg-blue-50 rounded">
                    <p className="font-semibold text-blue-800">No Limits</p>
                    <p className="text-gray-600">Unlimited analyses, not 3/day restrictions</p>
                  </div>
                  <div className="p-3 bg-purple-50 rounded">
                    <p className="font-semibold text-purple-800">Direct Support</p>
                    <p className="text-gray-600">Founder access - problems fixed in 24 hours</p>
                  </div>
                </div>
                <Button
                  size="lg"
                  className="mt-4 bg-green-600 hover:bg-green-700 text-white"
                  onClick={() => {
                    if (user) {
                      window.location.href = '/analyze';
                    } else {
                      window.location.href = '/signup';
                    }
                  }}
                >
                  Start Free Analysis
                </Button>
              </div>
            </div>
          </section>

          {/* Welcome Back Message for Authenticated Users - Only show when NOT in URL_INPUT state */}
          {user && currentState !== 'URL_INPUT' && (
            <section className="mb-8">
              <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
                <div className="flex items-center justify-center mb-2">
                  <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center mr-3">
                    <User className="h-4 w-4 text-green-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-green-800">
                    Welcome back, {user.email.split('@')[0]}! 👋
                  </h3>
                </div>
                <p className="text-green-600 mb-4">
                  {user.tier === 'solo'
                    ? `Your Coffee tier is active! ${
                        user.creditsRemaining > 0
                          ? `${user.creditsRemaining} premium analyses remaining.`
                          : 'Ready for unlimited premium analysis!'
                      }`
                    : user.tier === 'starter'
                      ? 'Ready for your next analysis?'
                      : `Your ${getTierDisplayName(user.tier)} tier gives you unlimited access to premium features.`}
                </p>
                <div className="flex items-center justify-center space-x-4">
                  <Link href="/dashboard">
                    <a>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-green-700 border-green-300 hover:bg-green-100"
                      >
                        <Settings className="h-4 w-4 mr-2" />
                        Go to Dashboard
                      </Button>
                    </a>
                  </Link>
                  {user.tier === 'solo' && (
                    <Button
                      size="sm"
                      className="bg-orange-600 hover:bg-orange-700"
                      onClick={() => {
                        console.log(
                          '☕ Coffee user starting new analysis - using smart reset to preserve context'
                        );
                        startNewAnalysis();
                      }}
                    >
                      <Coffee className="h-4 w-4 mr-2" />
                      Start New Analysis
                    </Button>
                  )}
                  {user.tier === 'starter' && (
                    <Button
                      size="sm"
                      className="bg-orange-600 hover:bg-orange-700"
                      onClick={startNewAnalysis}
                    >
                      <Coffee className="h-4 w-4 mr-2" />
                      Start New Analysis
                    </Button>
                  )}
                </div>
              </div>
            </section>
          )}

          {/* Simple Message for Authenticated Users When URL Input is Visible */}
          {user && currentState === 'URL_INPUT' && (
            <section className="mb-6">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                <p className="text-green-700">
                  <span className="font-medium">Welcome back, {user.email.split('@')[0]}!</span>{' '}
                  Enter a URL below to start your analysis.
                </p>
              </div>
            </section>
          )}

          {/* Progress Breadcrumb - Show when user has started the flow */}
          {currentState !== 'URL_INPUT' && currentState !== 'INITIALIZING' && (
            <ProgressBreadcrumb
              steps={FLOW_STEPS}
              currentStep={progress.currentStep}
              completedSteps={progress.completedSteps}
              className="mb-8"
            />
          )}

          {/* Progressive Steps */}
          <div className="space-y-8">
            {/* Error State Display */}
            {visibility.error && error && (
              <ErrorDisplay
                error={error}
                onRetry={() => actions.retryCurrentOperation()}
                onRecover={(targetState) => actions.recoverFromError(targetState)}
                onReset={resetWorkflow}
                retryCount={retryCount}
                maxRetries={3}
              />
            )}

            {/* Usage Display for logged in users */}
            {effectiveEmail && !visibility.error && <UsageDisplay userEmail={effectiveEmail} />}

            {/* Daily Limit Modal */}
            {showDailyLimitModal && usageData && (
              <DailyLimitModal
                isOpen={showDailyLimitModal}
                onClose={() => setShowDailyLimitModal(false)}
                userEmail={effectiveEmail}
                currentUsage={usageData.usage?.analysesToday || 0}
                dailyLimit={usageData.limits?.dailyAnalyses || 3}
                websiteUrl={websiteUrl}
              />
            )}

            {/* Step 2: URL Input (after email capture) */}
            <UrlInput
              onAnalysisStart={(url) => {
                console.log('🌐 Analysis started for URL:', url);
                actions.submitUrl(url);
              }}
              isVisible={visibility.urlInput}
              prefilledUrl={websiteUrl}
            />

            {/* Loading state during auth check */}
            {visibility.authLoading && <EnhancedLoading state={LOADING_STATES.AUTH_CHECK} />}

            {/* Step 1: Email Capture (first step for unauthenticated users) */}
            {visibility.emailCapture && (
              <EmailCapture
                websiteUrl={websiteUrl || undefined}
                onEmailCaptured={async (email, tier) => {
                  console.log(`📧 Email captured: ${email} with tier ${tier}`);

                  // First, try to recognize if this is a returning user
                  try {
                    const recognizedUser = await recognizeEmailUser(email);
                    if (recognizedUser) {
                      console.log(
                        `🔍 Recognized returning user: ${email} with tier ${recognizedUser.tier}`
                      );
                      actions.recognizeEmail(recognizedUser);
                      return;
                    }
                  } catch (error) {
                    console.warn(`⚠️ Email recognition failed for ${email}:`, error);
                  }

                  // Fallback to normal email capture flow
                  actions.captureEmail(email, tier);
                }}
                onLoginRequested={() => {
                  actions.openAuthModal();
                }}
                onReset={resetWorkflow}
                prefilledEmail={user?.email || userEmail}
                isVisible={visibility.emailCapture}
              />
            )}

            {/* Step 3: Tier Limits Check */}
            {visibility.tierLimits && (
              <TierLimitsDisplay
                url={websiteUrl}
                email={effectiveEmail}
                onProceed={() => actions.proceedToAnalysis()}
                isVisible={visibility.tierLimits}
              />
            )}

            {/* Step 4: Content Analysis */}
            {visibility.analysis && (
              <ContentAnalysis
                websiteUrl={websiteUrl}
                userEmail={effectiveEmail}
                onAnalysisComplete={handleAnalysisComplete}
                onReset={resetWorkflow}
                useAI={effectiveTier !== 'starter'}
                onProgressUpdate={(stage, totalPages, processedPages) => {
                  actions.updateAnalysisProgress(stage, totalPages, processedPages);
                }}
              />
            )}

            {/* Step 5: Content Review */}
            {visibility.review && (
              <ContentReview
                analysisId={analysisId!}
                discoveredPages={discoveredPages}
                onFileGenerated={handleFileGenerated}
                onStartOver={resetWorkflow}
                onStartNewAnalysis={startNewAnalysis}
              />
            )}

            {/* Step 6: File Generation */}
            {visibility.generation && (
              <FileGeneration
                fileId={generatedFileId!}
                analysisId={analysisId || undefined}
                onStartOver={resetWorkflow}
                onStartNewAnalysis={startNewAnalysis}
                onViewAnalysis={handleViewAnalysisDetails}
              />
            )}
          </div>

          {/* Built for Modern Web Section - NEW positioning */}
          <section className="mb-16">
            <div className="bg-gradient-to-r from-innovation-teal/10 to-blue-50 rounded-lg border border-innovation-teal/30 p-8">
              <h3 className="text-3xl font-bold text-framework-black mb-6 text-center">
                Built for the Modern Web — Not Just Static HTML
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                <div>
                  <h4 className="font-semibold text-red-700 mb-4 text-lg">
                    Why Free Tools Fail on Your Website:
                  </h4>
                  <ul className="space-y-3 text-sm text-gray-700">
                    <li className="flex items-start">
                      <span className="text-red-500 mr-2 mt-1">✗</span>
                      <div>
                        <strong>HTML Only:</strong> Can't process React, Next.js, Vue, or Angular
                      </div>
                    </li>
                    <li className="flex items-start">
                      <span className="text-red-500 mr-2 mt-1">✗</span>
                      <div>
                        <strong>No Quality Analysis:</strong> List every page equally, regardless of value
                      </div>
                    </li>
                    <li className="flex items-start">
                      <span className="text-red-500 mr-2 mt-1">✗</span>
                      <div>
                        <strong>Silent Failures:</strong> CSR/SPA content loads empty or missing
                      </div>
                    </li>
                    <li className="flex items-start">
                      <span className="text-red-500 mr-2 mt-1">✗</span>
                      <div>
                        <strong>Lead Magnets:</strong> Built once, never updated, abandoned quickly
                      </div>
                    </li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-semibold text-green-700 mb-4 text-lg">
                    Our Technical Superiority:
                  </h4>
                  <ul className="space-y-3 text-sm text-gray-700">
                    <li className="flex items-start">
                      <span className="text-green-500 mr-2 mt-1">✓</span>
                      <div>
                        <strong>15+ Frameworks:</strong> React, Next.js, Vue, Angular, Astro, Svelte, Nuxt...
                      </div>
                    </li>
                    <li className="flex items-start">
                      <span className="text-green-500 mr-2 mt-1">✓</span>
                      <div>
                        <strong>All 5 Rendering Types:</strong> SSR, CSR, SSG, ISR, and Static HTML
                      </div>
                    </li>
                    <li className="flex items-start">
                      <span className="text-green-500 mr-2 mt-1">✓</span>
                      <div>
                        <strong>CSR Warnings:</strong> Alert you when content may not be fully crawled
                      </div>
                    </li>
                    <li className="flex items-start">
                      <span className="text-green-500 mr-2 mt-1">✓</span>
                      <div>
                        <strong>Dedicated Platform:</strong> 47+ updates in 2025, continuous improvement
                      </div>
                    </li>
                  </ul>
                </div>
              </div>

              <div className="bg-white rounded-lg p-6 shadow-lg">
                <h4 className="font-semibold text-framework-black mb-3 text-center">
                  60-80% of Modern Websites Use JavaScript Frameworks
                </h4>
                <p className="text-sm text-center text-gray-600 mb-4">
                  Competitors only work on the 15-20% that are static HTML. We work on everything.
                </p>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 text-sm">
                  <div className="text-center p-2 bg-blue-50 rounded border border-blue-200">
                    <p className="font-bold text-blue-700">React</p>
                  </div>
                  <div className="text-center p-2 bg-gray-800 rounded">
                    <p className="font-bold text-white">Next.js</p>
                  </div>
                  <div className="text-center p-2 bg-green-50 rounded border border-green-200">
                    <p className="font-bold text-green-700">Vue</p>
                  </div>
                  <div className="text-center p-2 bg-red-50 rounded border border-red-200">
                    <p className="font-bold text-red-600">Angular</p>
                  </div>
                  <div className="text-center p-2 bg-orange-50 rounded border border-orange-200">
                    <p className="font-bold text-orange-600">Astro</p>
                  </div>
                </div>
                <p className="text-xs text-center text-gray-500 mt-3">
                  + Svelte, Nuxt, Gatsby, Remix, Solid, Qwik, WordPress, Webflow, Squarespace...
                </p>
              </div>

              <div className="mt-6 text-center">
                <p className="text-lg font-semibold text-innovation-teal mb-4">
                  This is our entire focus — not a marketing add-on
                </p>
                <p className="text-sm text-gray-600 max-w-2xl mx-auto">
                  Free tools are lead magnets built to convert you to their main product. LLM.txt Mastery is a dedicated platform with a single mission: make your website AI-discoverable. That focus means better features, faster updates, and actual support.
                </p>
              </div>
            </div>
          </section>

          {/* Why This Matters */}
          <section className="mt-16">
            <Card className="bg-slate-50 border-slate-200">
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold text-framework-black mb-4">
                  Why This Matters (I Built This Because I Needed It Myself)
                </h3>
                <div className="mb-6">
                  <p className="text-sm text-ai-silver mb-3">
                    ChatGPT, Claude, and Perplexity are already crawling websites - but most
                    businesses are invisible to them. I built this tool because my own content
                    wasn't getting found by AI search engines. Having the need, skills, and
                    experience to fix this problem, I created the solution.
                  </p>
                  <p className="text-sm text-ai-silver mb-4">
                    Now I'm sharing it with other creators, solopreneurs, founders, and small
                    businesses so they can leverage AI to connect directly with the people who need
                    their services. Built by someone who actually uses these tools daily. No
                    unnecessary complexity, no hidden fees. If I wouldn't use it myself, it doesn't
                    belong on this site.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-medium text-framework-black mb-2">What You'll Get</h4>
                    <ul className="text-sm text-ai-silver space-y-2">
                      <li>
                        ✓ Get indexed by AI search engines like ChatGPT, Claude, and Perplexity
                      </li>
                      <li>✓ Your content becomes AI-friendly and properly attributed</li>
                      <li>✓ Early adopter advantage - be discoverable before competitors</li>
                      <li>
                        ✓ Built following the official{' '}
                        <a
                          href="https://llmstxt.org/"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-innovation-teal hover:underline"
                        >
                          llms.txt spec
                        </a>
                      </li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-medium text-framework-black mb-2">
                      Here's How to Set It Up (It's Stupid Simple)
                    </h4>
                    <p className="text-sm text-ai-silver mb-3">
                      No complex setup - I've made this dead simple:
                    </p>
                    <ol className="text-sm text-ai-silver space-y-1">
                      <li>1. Download your llms.txt file</li>
                      <li>2. Upload it to your site's root</li>
                      <li>3. That's it - you're now AI-discoverable</li>
                    </ol>
                    <p className="text-xs text-ai-silver mt-3">
                      Make sure it's live at yourdomain.com/llms.txt and AI systems will find it
                      automatically.
                    </p>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-200">
                  <p className="text-xs text-ai-silver">
                    <strong>Pro tip from a fellow solopreneur:</strong> Update your llms.txt when
                    you publish new content. I usually do this monthly. Learn more at the
                    <a
                      href="https://llmstxt.org/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-innovation-teal hover:underline ml-1"
                    >
                      official llms.txt specification
                    </a>
                    .
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Final CTA Button */}
            <div className="mt-8 flex justify-center">
              <Button
                size="lg"
                className="bg-mastery-blue hover:bg-mastery-blue/90 text-white px-8 py-3"
                onClick={() => {
                  if (user) {
                    window.location.href = '/analyze';
                  } else {
                    window.location.href = '/signup';
                  }
                }}
              >
                Start Free Analysis
              </Button>
            </div>
          </section>
        </main>

        {/* Footer */}
        <Footer />

        {/* Authentication Modal */}
        <AuthModal
          isOpen={showAuthModal}
          onClose={() => actions.closeAuthModal()}
          defaultMode="login"
        />
      </div>
    </ErrorBoundary>
  );
}
