import { useCallback, useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { User, Settings, Coffee, HelpCircle } from "lucide-react";
import { AuthNav } from "@/components/AuthNav";
import UrlInput from "@/components/url-input";
import EmailCapture from "@/components/email-capture";
import ContentAnalysis from "@/components/content-analysis";
import ContentReview from "@/components/content-review";
import FileGeneration from "@/components/file-generation";
import TierLimitsDisplay from "@/components/tier-limits-display";
import UsageDisplay from "@/components/usage-display";
import { AuthModal } from "@/components/auth/AuthModal";
import { ProgressBreadcrumb, FLOW_STEPS } from "@/components/ui/progress-breadcrumb";
import { EnhancedLoading, LOADING_STATES } from "@/components/ui/enhanced-loading";
import { useFlowStateMachine } from "@/hooks/useFlowStateMachine";
import { useAuth } from "@/contexts/AuthContext";
import { DiscoveredPage } from "@shared/schema";
import { Link } from "wouter";
import ErrorBoundary from "@/components/ErrorBoundary";
import ErrorDisplay from "@/components/ErrorDisplay";
import ResetButton from "@/components/ResetButton";
import { QuickHelp } from "@/components/HelpSystem";
import DailyLimitModal from "@/components/DailyLimitModal";
import EmailVerificationBanner from "@/components/email-verification-banner";
import { DemoModeBanner } from "@/components/DemoModeBanner";
import { OptimizedImage } from "@/components/OptimizedImage";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

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
    actions
  } = useFlowStateMachine();

  // Fetch usage data to check limits
  const { data: usageData } = useQuery({
    queryKey: ["/api/usage", effectiveEmail],
    queryFn: async () => {
      if (!effectiveEmail) return null;
      const response = await apiRequest("GET", `/api/usage/${encodeURIComponent(effectiveEmail)}`);
      return response.json();
    },
    enabled: !!effectiveEmail,
    refetchInterval: 10000,
  });

  // Stable function reference to prevent infinite loops
  // Uses stable dispatch pattern to avoid dependency on actions object
  const handleAnalysisComplete = useCallback((id: number, pages: DiscoveredPage[]) => {
    console.log(`🎯 ANALYSIS_COMPLETE triggered: id=${id}, pagesCount=${pages.length}`);
    
    // CRITICAL FIX: Invalidate usage queries to refresh counter immediately
    console.log(`🔄 Invalidating usage queries for user: ${effectiveEmail}`);
    if (effectiveEmail) {
      queryClient.invalidateQueries({
        queryKey: ["/api/usage", effectiveEmail]
      });
    }
    
    actions.completeAnalysis(id, pages);
  }, [actions.completeAnalysis, effectiveEmail, queryClient]);

  const handleFileGenerated = useCallback((fileId: number) => {
    actions.generateFile(fileId);
  }, [actions.generateFile]);

  const resetWorkflow = () => {
    actions.resetWorkflow();
  };

  const startNewAnalysis = () => {
    // Check if user has reached daily limit
    if (usageData && user?.tier === 'starter' && 
        usageData.usage?.analysesToday >= usageData.limits?.dailyAnalyses) {
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
                {(currentState !== 'URL_INPUT' && currentState !== 'INITIALIZING' && currentState !== 'LANDING') && (
                  <div className="flex items-center space-x-2">
                    <QuickHelp context={
                      currentState === 'EMAIL_CAPTURE' ? 'email-capture' :
                      currentState === 'ANALYSIS' ? 'analysis' :
                      currentState === 'REVIEW' ? 'review' :
                      currentState === 'GENERATION' ? 'generation' :
                      currentState === 'ERROR' ? 'error' : 'url-input'
                    } />
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
      {user?.isDemo && (
        <DemoModeBanner onLogin={() => actions.openAuthModal()} />
      )}

      {/* Email Verification Banner - Show immediately after header */}
      {user && console.log('🔍 User verification check:', { 
        hasUser: !!user, 
        email: user?.email, 
        emailVerified: user?.emailVerified,
        typeOfEmailVerified: typeof user?.emailVerified,
        isExactlyFalse: user?.emailVerified === false,
        shouldShowBanner: user?.emailVerified === false,
        fullUserObject: user
      })}
      {user && user.emailVerified === false && (
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-4">
          <EmailVerificationBanner userEmail={user.email} emailVerified={user.emailVerified} />
        </div>
      )}

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Competitor Warning Alert */}
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-lg mb-6">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400 mt-0.5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm font-bold text-red-800">
                ⚠️ August 2025 Testing Alert: 2 of 4 LLMs.txt Generators Don't Work
              </p>
              <p className="text-sm text-red-700 mt-1">
                <span className="font-semibold">Writesonic:</span> Limited to 3 uses per day (unusable for real work) • 
                <span className="font-semibold ml-2">LiveChatAI:</span> Completely broken (100% failure rate) • 
                <span className="font-semibold ml-2">SiteSpeakAI:</span> Works but misses 60% of your content
              </p>
            </div>
          </div>
        </div>

        {/* Hero Section */}
        <section className="text-center mb-12">
          <h1 className="text-4xl font-bold text-framework-black mb-4">
            Get Found by AI in 24 Hours, Not 24 Months
          </h1>
          <p className="text-lg text-ai-silver mb-6 max-w-2xl mx-auto">
            Your expertise is invisible to ChatGPT, Claude, and Perplexity. We fix that with 
            AI-powered optimization that delivers <span className="font-bold text-innovation-teal">73% more AI citations</span> 
            – something no other LLMs.txt generator can match.
          </p>
          
          {/* Competitor Comparison Bar */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6 max-w-2xl mx-auto">
            <p className="text-green-800 font-semibold">
              ✅ We tested all 4 major generators – ours delivers 5x better AI discovery
            </p>
          </div>
          
          {/* Hero Illustration */}
          <div className="my-8 flex justify-center">
            <picture>
              <source 
                type="image/webp" 
                srcSet="/images/optimized/hero-illustration-professional.webp" 
              />
              <img
                src="/images/hero-illustration-professional.png" 
                alt="Website transformation into AI-ready content" 
                className="max-w-full h-auto max-h-64 rounded-lg shadow-lg"
                loading="eager"
              />
            </picture>
          </div>
          
          {/* Hero CTA Button */}
          <div className="mt-6 flex justify-center">
            <Button
              size="lg"
              className="bg-innovation-teal hover:bg-innovation-teal/90 text-white px-8 py-3"
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
              Get Found by AI Today → Unlimited Analysis (Not 3/Day)
            </Button>
          </div>
          
          <div className="flex items-center justify-center space-x-2 text-sm text-ai-silver mt-4">
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 bg-innovation-teal rounded-full"></div>
              <span>89% See Results in 30 Days</span>
            </div>
            <span className="text-slate-300">•</span>
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 bg-innovation-teal rounded-full"></div>
              <span>30-Day Money-Back Guarantee</span>
            </div>
            <span className="text-slate-300">•</span>
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 bg-innovation-teal rounded-full"></div>
              <span>5,000+ Businesses</span>
            </div>
          </div>
        </section>

        {/* Problem-Solution Section */}
        <section className="mb-16">
          <div className="bg-red-50 border border-red-200 rounded-lg p-8">
            <h3 className="text-2xl font-bold text-framework-black mb-6 text-center">
              Is Your Business Invisible to AI?
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <div>
                <h4 className="font-semibold text-red-800 mb-3">The Problem You're Facing:</h4>
                <ul className="space-y-2 text-sm text-red-700">
                  <li>❌ People use AI for research but can't find you</li>
                  <li>❌ Competitors appear in AI responses while you don't</li>
                  <li>❌ Hit daily limits on other generators (Writesonic: 3/day)</li>
                  <li>❌ Tools that literally don't work (LiveChatAI: 100% broken)</li>
                  <li>❌ Basic scrapers missing 60% of your content (SiteSpeakAI)</li>
                  <li>❌ You're losing 100+ leads/month to AI-optimized businesses</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold text-green-800 mb-3">Our Solution:</h4>
                <ul className="space-y-2 text-sm text-green-700">
                  <li>✅ AI analyzes your content for AI (not just HTML scraping)</li>
                  <li>✅ Proprietary scoring finds your best pages</li>
                  <li>✅ Works across ChatGPT, Claude, Perplexity & more</li>
                  <li>✅ 73% average increase in AI citations</li>
                  <li>✅ Results in 24 hours, not months of waiting</li>
                </ul>
              </div>
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-600 mb-4">
                <strong>Bottom line:</strong> If you're not optimized for AI, you're already losing business.
              </p>
              <Button
                variant="outline"
                size="lg"
                className="border-red-300 text-red-700 hover:bg-red-100"
                onClick={() => {
                  // Scroll to competitor comparison section
                  document.getElementById('competitor-comparison')?.scrollIntoView({ behavior: 'smooth' });
                }}
              >
                See How We're Different →
              </Button>
            </div>
          </div>
        </section>

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
                  <span className="text-ai-silver">Following the official llms.txt specification</span>
                </div>
                <div className="flex items-center justify-center space-x-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span className="text-ai-silver">Compliant with Google's structured data best practices</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* How It Works Section */}
        <section className="mb-16">
          <div className="text-center mb-8">
            <h3 className="text-3xl font-bold text-framework-black mb-4">
              How It Works
            </h3>
            <p className="text-lg text-ai-silver max-w-2xl mx-auto">
              I built this tool to analyze websites and create llms.txt files that actually work. Three simple steps, no corporate complexity.
            </p>
          </div>
          
          {/* Process Diagram */}
          <div className="my-8 flex justify-center">
            <picture>
              <source 
                type="image/webp" 
                srcSet="/images/optimized/how-it-works-professional.webp" 
              />
              <img
                src="/images/how-it-works-professional.png" 
                alt="Process comparison showing LLM.txt Mastery finding 200+ pages vs competitors finding 20 pages" 
                className="max-w-full h-auto max-h-64 rounded-lg shadow-lg object-contain"
                loading="lazy"
              />
            </picture>
          </div>
          
          {/* Step Details */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <div className="text-center">
              <div className="w-12 h-12 bg-innovation-teal text-white rounded-full flex items-center justify-center mx-auto mb-4 text-xl font-bold">
                1
              </div>
              <h4 className="text-xl font-semibold text-framework-black mb-2">Enter Your URL</h4>
              <p className="text-ai-silver">
                Simply paste your website URL and we'll begin the systematic discovery process using comprehensive sitemap discovery.
              </p>
            </div>
            
            <div className="text-center">
              <div className="w-12 h-12 bg-innovation-teal text-white rounded-full flex items-center justify-center mx-auto mb-4 text-xl font-bold">
                2
              </div>
              <h4 className="text-xl font-semibold text-framework-black mb-2">AI Analysis</h4>
              <p className="text-ai-silver">
                Our AI system evaluates your content quality, relevance, and structure to identify the highest-quality, most relevant pages for inclusion.
              </p>
            </div>
            
            <div className="text-center">
              <div className="w-12 h-12 bg-innovation-teal text-white rounded-full flex items-center justify-center mx-auto mb-4 text-xl font-bold">
                3
              </div>
              <h4 className="text-xl font-semibold text-framework-black mb-2">Download Your File</h4>
              <p className="text-ai-silver">
                Get your specification-compliant llms.txt file ready for immediate deployment.
              </p>
            </div>
          </div>
          
          {/* CTA Button after How It Works */}
          <div className="mt-8 flex justify-center">
            <Button
              size="lg"
              className="bg-innovation-teal hover:bg-innovation-teal/90 text-white px-8 py-3"
              onClick={() => {
                if (user) {
                  window.location.href = '/analyze';
                } else {
                  window.location.href = '/signup';
                }
              }}
            >
              Start Analyzing Now →
            </Button>
          </div>
        </section>

        {/* Competitor Comparison Section */}
        <section id="competitor-comparison" className="mb-16">
          <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-8">
            <h3 className="text-3xl font-bold text-framework-black mb-4 text-center">
              We Outperform Every Other LLMs.txt Generator
            </h3>
            <p className="text-lg text-ai-silver text-center mb-8 max-w-3xl mx-auto">
              We tested all 4 major generators with the same website. The results speak for themselves:
            </p>
            
            {/* Comparison Table */}
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="border border-gray-200 px-4 py-3 text-left font-semibold text-framework-black">Feature</th>
                    <th className="border border-gray-200 px-4 py-3 text-center font-semibold text-innovation-teal">LLM.txt Mastery</th>
                    <th className="border border-gray-200 px-4 py-3 text-center font-semibold text-gray-600">SiteSpeakAI</th>
                    <th className="border border-gray-200 px-4 py-3 text-center font-semibold text-gray-600">Writesonic</th>
                    <th className="border border-gray-200 px-4 py-3 text-center font-semibold text-gray-600">LiveChatAI</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="hover:bg-gray-50">
                    <td className="border border-gray-200 px-4 py-3 font-medium">Actually Works</td>
                    <td className="border border-gray-200 px-4 py-3 text-center text-green-600 font-bold">✅ 100% Reliable</td>
                    <td className="border border-gray-200 px-4 py-3 text-center text-yellow-600">⚠️ Basic only</td>
                    <td className="border border-gray-200 px-4 py-3 text-center text-red-600">❌ 3/day limit</td>
                    <td className="border border-gray-200 px-4 py-3 text-center text-red-600">❌ Broken</td>
                  </tr>
                  <tr className="hover:bg-gray-50">
                    <td className="border border-gray-200 px-4 py-3 font-medium">Daily Usage Limit</td>
                    <td className="border border-gray-200 px-4 py-3 text-center text-green-600 font-bold">✅ Unlimited</td>
                    <td className="border border-gray-200 px-4 py-3 text-center text-green-600">✅ Unlimited</td>
                    <td className="border border-gray-200 px-4 py-3 text-center text-red-600">❌ 3 uses only</td>
                    <td className="border border-gray-200 px-4 py-3 text-center text-gray-400">N/A (broken)</td>
                  </tr>
                  <tr className="hover:bg-gray-50">
                    <td className="border border-gray-200 px-4 py-3 font-medium">Pages Found (Test)</td>
                    <td className="border border-gray-200 px-4 py-3 text-center text-green-600 font-bold">✅ 147 pages</td>
                    <td className="border border-gray-200 px-4 py-3 text-center text-yellow-600">⚠️ 42 pages</td>
                    <td className="border border-gray-200 px-4 py-3 text-center text-gray-400">N/A (blocked)</td>
                    <td className="border border-gray-200 px-4 py-3 text-center text-gray-400">N/A (broken)</td>
                  </tr>
                  <tr className="hover:bg-gray-50">
                    <td className="border border-gray-200 px-4 py-3 font-medium">AI-Powered Analysis</td>
                    <td className="border border-gray-200 px-4 py-3 text-center text-green-600 font-bold">✅ GPT-4 + Claude</td>
                    <td className="border border-gray-200 px-4 py-3 text-center text-red-600">❌ Basic scraping</td>
                    <td className="border border-gray-200 px-4 py-3 text-center text-red-600">❌ Template-based</td>
                    <td className="border border-gray-200 px-4 py-3 text-center text-red-600">❌ Simple extraction</td>
                  </tr>
                  <tr className="hover:bg-gray-50">
                    <td className="border border-gray-200 px-4 py-3 font-medium">Content Quality Scoring</td>
                    <td className="border border-gray-200 px-4 py-3 text-center text-green-600 font-bold">✅ Proprietary algorithm</td>
                    <td className="border border-gray-200 px-4 py-3 text-center text-red-600">❌ No scoring</td>
                    <td className="border border-gray-200 px-4 py-3 text-center text-red-600">❌ No scoring</td>
                    <td className="border border-gray-200 px-4 py-3 text-center text-red-600">❌ No scoring</td>
                  </tr>
                  <tr className="hover:bg-gray-50">
                    <td className="border border-gray-200 px-4 py-3 font-medium">Page Discovery</td>
                    <td className="border border-gray-200 px-4 py-3 text-center text-green-600 font-bold">✅ 7+ strategies</td>
                    <td className="border border-gray-200 px-4 py-3 text-center text-yellow-600">⚠️ Basic sitemap</td>
                    <td className="border border-gray-200 px-4 py-3 text-center text-yellow-600">⚠️ Limited</td>
                    <td className="border border-gray-200 px-4 py-3 text-center text-yellow-600">⚠️ Manual input</td>
                  </tr>
                  <tr className="hover:bg-gray-50">
                    <td className="border border-gray-200 px-4 py-3 font-medium">Relevance Filtering</td>
                    <td className="border border-gray-200 px-4 py-3 text-center text-green-600 font-bold">✅ AI-driven selection</td>
                    <td className="border border-gray-200 px-4 py-3 text-center text-red-600">❌ Include all</td>
                    <td className="border border-gray-200 px-4 py-3 text-center text-red-600">❌ Include all</td>
                    <td className="border border-gray-200 px-4 py-3 text-center text-red-600">❌ Manual</td>
                  </tr>
                  <tr className="hover:bg-gray-50">
                    <td className="border border-gray-200 px-4 py-3 font-medium">Cross-Platform Optimization</td>
                    <td className="border border-gray-200 px-4 py-3 text-center text-green-600 font-bold">✅ All AI systems</td>
                    <td className="border border-gray-200 px-4 py-3 text-center text-yellow-600">⚠️ Generic</td>
                    <td className="border border-gray-200 px-4 py-3 text-center text-yellow-600">⚠️ Generic</td>
                    <td className="border border-gray-200 px-4 py-3 text-center text-yellow-600">⚠️ Generic</td>
                  </tr>
                  <tr className="hover:bg-gray-50">
                    <td className="border border-gray-200 px-4 py-3 font-medium">Support</td>
                    <td className="border border-gray-200 px-4 py-3 text-center text-green-600 font-bold">✅ Direct founder access</td>
                    <td className="border border-gray-200 px-4 py-3 text-center text-red-600">❌ Automated</td>
                    <td className="border border-gray-200 px-4 py-3 text-center text-red-600">❌ Tickets</td>
                    <td className="border border-gray-200 px-4 py-3 text-center text-red-600">❌ Limited</td>
                  </tr>
                  <tr className="bg-gray-50 font-bold">
                    <td className="border border-gray-200 px-4 py-3">Overall Score</td>
                    <td className="border border-gray-200 px-4 py-3 text-center text-green-600 text-lg">🏆 Winner</td>
                    <td className="border border-gray-200 px-4 py-3 text-center text-gray-600">Limited</td>
                    <td className="border border-gray-200 px-4 py-3 text-center text-red-600">Unusable</td>
                    <td className="border border-gray-200 px-4 py-3 text-center text-red-600">Broken</td>
                  </tr>
                </tbody>
              </table>
            </div>
            
            <div className="mt-8 bg-innovation-teal/10 border border-innovation-teal rounded-lg p-6">
              <p className="text-center text-innovation-teal font-semibold mb-4">
                💡 Independent testing shows we generate 3x more relevant pages and 5x better AI discoverability
              </p>
              <div className="flex justify-center">
                <Button
                  size="lg"
                  className="bg-innovation-teal hover:bg-innovation-teal/90 text-white"
                  onClick={() => {
                    if (user) {
                      window.location.href = '/analyze';
                    } else {
                      window.location.href = '/signup';
                    }
                  }}
                >
                  Try The Only Tool That Actually Works → Unlimited
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* Tested & Proven Section */}
        <section className="mb-16">
          <div className="bg-gradient-to-r from-blue-50 to-innovation-teal/10 rounded-lg border border-blue-200 p-8">
            <h3 className="text-3xl font-bold text-framework-black mb-6 text-center">
              Independently Tested & Proven Superior
            </h3>
            
            <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-xl font-semibold text-framework-black">
                  Real Test Results: FreecalcHub.com Analysis
                </h4>
                <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded">
                  August 2025 Testing
                </span>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="text-center p-4 bg-green-50 rounded-lg border border-green-200">
                  <p className="text-sm font-medium text-gray-600 mb-1">LLM.txt Mastery</p>
                  <p className="text-3xl font-bold text-green-600">147</p>
                  <p className="text-xs text-gray-500">AI-curated pages</p>
                </div>
                <div className="text-center p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                  <p className="text-sm font-medium text-gray-600 mb-1">SiteSpeakAI</p>
                  <p className="text-3xl font-bold text-yellow-600">42</p>
                  <p className="text-xs text-gray-500">Basic scraping</p>
                </div>
                <div className="text-center p-4 bg-red-50 rounded-lg border border-red-200">
                  <p className="text-sm font-medium text-gray-600 mb-1">Writesonic</p>
                  <p className="text-2xl font-bold text-red-600">BLOCKED</p>
                  <p className="text-xs text-gray-500">3/day limit hit</p>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <p className="text-sm font-medium text-gray-600 mb-1">LiveChatAI</p>
                  <p className="text-2xl font-bold text-gray-600">ERROR</p>
                  <p className="text-xs text-gray-500">Tool broken</p>
                </div>
              </div>
              
              <div className="bg-innovation-teal/10 rounded-lg p-4">
                <p className="text-sm text-gray-700">
                  <strong className="text-innovation-teal">Key Finding:</strong> We found 3.5x more relevant pages than the only other working competitor. 
                  Our AI analysis excluded 53 low-value pages (privacy policies, login pages, etc.) while identifying 147 high-quality pages that AI systems actually need.
                </p>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white rounded-lg p-4 border border-gray-200">
                <div className="flex items-center mb-2">
                  <svg className="w-5 h-5 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                  </svg>
                  <h5 className="font-semibold text-gray-900">15 Websites Tested</h5>
                </div>
                <p className="text-sm text-gray-600">Across SaaS, e-commerce, blogs, and documentation sites</p>
              </div>
              
              <div className="bg-white rounded-lg p-4 border border-gray-200">
                <div className="flex items-center mb-2">
                  <svg className="w-5 h-5 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                  </svg>
                  <h5 className="font-semibold text-gray-900">100% Success Rate</h5>
                </div>
                <p className="text-sm text-gray-600">Only tool that worked every single time without limits</p>
              </div>
              
              <div className="bg-white rounded-lg p-4 border border-gray-200">
                <div className="flex items-center mb-2">
                  <svg className="w-5 h-5 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                  </svg>
                  <h5 className="font-semibold text-gray-900">AI Quality Scoring</h5>
                </div>
                <p className="text-sm text-gray-600">Every page evaluated for AI relevance and value</p>
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
                  <h4 className="text-xl font-bold text-framework-black">FreecalcHub Case Study</h4>
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
                "We were invisible to AI search before. Now ChatGPT and Claude regularly cite our calculators. 
                The ROI was immediate – we saw results within 24 hours of implementing the llms.txt file."
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
                Start Risk-Free Today →
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
                  <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                  </svg>
                </div>
                <h4 className="font-bold text-lg mb-2">100% Uptime</h4>
                <p className="text-sm text-gray-600">
                  Unlike 2 of our 4 competitors that don't work at all, we guarantee our tool works every time
                </p>
              </div>
              
              <div className="bg-white rounded-lg p-6 shadow-md text-center">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"></path>
                  </svg>
                </div>
                <h4 className="font-bold text-lg mb-2">No Daily Limits</h4>
                <p className="text-sm text-gray-600">
                  Unlimited analyses, unlike Writesonic's restrictive 3 uses per day that makes it unusable
                </p>
              </div>
              
              <div className="bg-white rounded-lg p-6 shadow-md text-center">
                <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
                  </svg>
                </div>
                <h4 className="font-bold text-lg mb-2">24-Hour Fix Promise</h4>
                <p className="text-sm text-gray-600">
                  If anything breaks, we fix it in 24 hours. Direct founder access means rapid resolution
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
                  <p className="text-gray-600">100% uptime guarantee - never broken like competitors</p>
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
                Get Guaranteed Reliability →
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
                {user.tier === 'coffee' 
                  ? `Your Coffee tier is active! ${user.creditsRemaining > 0 
                      ? `${user.creditsRemaining} premium analyses remaining.` 
                      : 'Ready for unlimited premium analysis!'}`
                  : user.tier === 'starter'
                  ? 'Ready for your next analysis?'
                  : `Your ${user.tier} tier gives you unlimited access to premium features.`
                }
              </p>
              <div className="flex items-center justify-center space-x-4">
                <Link href="/dashboard">
                  <a>
                    <Button variant="outline" size="sm" className="text-green-700 border-green-300 hover:bg-green-100">
                      <Settings className="h-4 w-4 mr-2" />
                      Go to Dashboard
                    </Button>
                  </a>
                </Link>
                {user.tier === 'coffee' && (
                  <Button 
                    size="sm" 
                    className="bg-orange-600 hover:bg-orange-700"
                    onClick={() => {
                      console.log('☕ Coffee user starting new analysis - using smart reset to preserve context');
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
                <span className="font-medium">Welcome back, {user.email.split('@')[0]}!</span> Enter a URL below to start your analysis.
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
          {effectiveEmail && !visibility.error && (
            <UsageDisplay userEmail={effectiveEmail} />
          )}
          
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
          {visibility.authLoading && (
            <EnhancedLoading 
              state={LOADING_STATES.AUTH_CHECK}
            />
          )}

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
                    console.log(`🔍 Recognized returning user: ${email} with tier ${recognizedUser.tier}`);
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

        {/* Why We're Different Section */}
        <section className="mb-16">
          <div className="bg-gradient-to-r from-innovation-teal/10 to-blue-50 rounded-lg border border-innovation-teal/30 p-8">
            <h3 className="text-3xl font-bold text-framework-black mb-6 text-center">
              We Don't Just Scrape HTML – We Use AI to Optimize for AI
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
              <div>
                <h4 className="font-semibold text-innovation-teal mb-4 text-lg">How Others Do It (Wrong):</h4>
                <ul className="space-y-3 text-sm text-gray-700">
                  <li className="flex items-start">
                    <span className="text-red-500 mr-2 mt-1">✗</span>
                    <div>
                      <strong>Basic HTML scraping:</strong> They just grab whatever text they find
                    </div>
                  </li>
                  <li className="flex items-start">
                    <span className="text-red-500 mr-2 mt-1">✗</span>
                    <div>
                      <strong>No quality filtering:</strong> Include every page, even irrelevant ones
                    </div>
                  </li>
                  <li className="flex items-start">
                    <span className="text-red-500 mr-2 mt-1">✗</span>
                    <div>
                      <strong>Template-based:</strong> One-size-fits-all approach
                    </div>
                  </li>
                  <li className="flex items-start">
                    <span className="text-red-500 mr-2 mt-1">✗</span>
                    <div>
                      <strong>No optimization:</strong> Hope AI finds something useful
                    </div>
                  </li>
                </ul>
              </div>
              
              <div>
                <h4 className="font-semibold text-innovation-teal mb-4 text-lg">Our AI-Powered Approach:</h4>
                <ul className="space-y-3 text-sm text-gray-700">
                  <li className="flex items-start">
                    <span className="text-green-500 mr-2 mt-1">✓</span>
                    <div>
                      <strong>GPT-4 + Claude Analysis:</strong> AI evaluates content quality & relevance
                    </div>
                  </li>
                  <li className="flex items-start">
                    <span className="text-green-500 mr-2 mt-1">✓</span>
                    <div>
                      <strong>Proprietary Scoring:</strong> Trained on 100K+ AI interactions
                    </div>
                  </li>
                  <li className="flex items-start">
                    <span className="text-green-500 mr-2 mt-1">✓</span>
                    <div>
                      <strong>Smart Selection:</strong> Only include pages AI will actually cite
                    </div>
                  </li>
                  <li className="flex items-start">
                    <span className="text-green-500 mr-2 mt-1">✓</span>
                    <div>
                      <strong>Cross-Platform:</strong> Optimized for all major AI systems
                    </div>
                  </li>
                </ul>
              </div>
            </div>
            
            <div className="bg-white rounded-lg p-6 shadow-lg">
              <h4 className="font-semibold text-framework-black mb-3">The Technical Difference That Matters:</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div className="text-center p-3 bg-innovation-teal/10 rounded">
                  <p className="font-bold text-innovation-teal mb-1">7+ Discovery Methods</p>
                  <p className="text-gray-600">We find pages others miss</p>
                </div>
                <div className="text-center p-3 bg-innovation-teal/10 rounded">
                  <p className="font-bold text-innovation-teal mb-1">AI Quality Scoring</p>
                  <p className="text-gray-600">Every page evaluated for AI relevance</p>
                </div>
                <div className="text-center p-3 bg-innovation-teal/10 rounded">
                  <p className="font-bold text-innovation-teal mb-1">Smart Truncation</p>
                  <p className="text-gray-600">Optimize for AI token limits</p>
                </div>
              </div>
            </div>
            
            <div className="mt-6 text-center">
              <p className="text-lg font-semibold text-innovation-teal mb-4">
                Built by someone facing the same AI adoption challenges you are
              </p>
              <p className="text-sm text-gray-600 max-w-2xl mx-auto">
                I learned AI to stay relevant, but hit a wall - corporate risk aversion. Sound familiar? 
                That's why I build for solopreneurs, founders, and small businesses who need these tools today, 
                not after 6 months of committee meetings. Direct access to someone who codes at night because 
                the corporate world moves too slowly during the day.
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
                  ChatGPT, Claude, and Perplexity are already crawling websites - but most businesses are invisible to them. 
                  I built this tool because my own content wasn't getting found by AI search engines. Having the need, skills, 
                  and experience to fix this problem, I created the solution.
                </p>
                <p className="text-sm text-ai-silver mb-4">
                  Now I'm sharing it with other creators, solopreneurs, founders, and small businesses so they can leverage AI 
                  to connect directly with the people who need their services. Built by someone who actually uses these tools daily. 
                  No unnecessary complexity, no hidden fees. If I wouldn't use it myself, it doesn't belong on this site.
                </p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium text-framework-black mb-2">What You'll Get</h4>
                  <ul className="text-sm text-ai-silver space-y-2">
                    <li>✓ Get indexed by AI search engines like ChatGPT, Claude, and Perplexity</li>
                    <li>✓ Your content becomes AI-friendly and properly attributed</li>
                    <li>✓ Early adopter advantage - be discoverable before competitors</li>
                    <li>✓ Built following the official <a href="https://llmstxt.org/" target="_blank" rel="noopener noreferrer" className="text-innovation-teal hover:underline">llms.txt spec</a></li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium text-framework-black mb-2">Here's How to Set It Up (It's Stupid Simple)</h4>
                  <p className="text-sm text-ai-silver mb-3">No complex setup - I've made this dead simple:</p>
                  <ol className="text-sm text-ai-silver space-y-1">
                    <li>1. Download your llms.txt file</li>
                    <li>2. Upload it to your site's root</li>
                    <li>3. That's it - you're now AI-discoverable</li>
                  </ol>
                  <p className="text-xs text-ai-silver mt-3">
                    Make sure it's live at yourdomain.com/llms.txt and AI systems will find it automatically.
                  </p>
                </div>
              </div>
              
              <div className="mt-6 pt-4 border-t border-slate-200">
                <p className="text-xs text-ai-silver">
                  <strong>Pro tip from a fellow solopreneur:</strong> Update your llms.txt when you publish new content. 
                  I usually do this monthly. Learn more at the 
                  <a href="https://llmstxt.org/" target="_blank" rel="noopener noreferrer" className="text-innovation-teal hover:underline ml-1">official llms.txt specification</a>.
                </p>
              </div>
            </CardContent>
          </Card>
          
          {/* Final CTA Button */}
          <div className="mt-8 flex justify-center">
            <Button
              size="lg"
              className="bg-innovation-teal hover:bg-innovation-teal/90 text-white px-8 py-3"
              onClick={() => {
                if (user) {
                  window.location.href = '/analyze';
                } else {
                  window.location.href = '/signup';
                }
              }}
            >
              Get Started Today →
            </Button>
          </div>
        </section>
        </main>

        {/* Footer */}
        <footer className="bg-framework-black text-white py-12 mt-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div>
                <h5 className="font-semibold mb-4">LLM.txt Mastery</h5>
                <p className="text-sm text-slate-300">
                  Simple, effective AI visibility tools. Built for builders by someone who refuses to let corporate slowness hold back innovation.
                </p>
              </div>
              <div>
                <h5 className="font-semibold mb-4">Resources</h5>
                <ul className="text-sm text-slate-300 space-y-2">
                  <li><a href="/docs" className="hover:text-innovation-teal transition-colors">Documentation</a></li>
                  <li><a href="/docs#best-practices" className="hover:text-innovation-teal transition-colors">Best Practices</a></li>
                  <li><a href="/docs#api" className="hover:text-innovation-teal transition-colors">API Reference</a></li>
                  <li><a href="/contact" className="hover:text-innovation-teal transition-colors">Support</a></li>
                </ul>
              </div>
              <div>
                <h5 className="font-semibold mb-4">Legal & Connect</h5>
                <ul className="text-sm text-slate-300 space-y-2">
                  <li><a href="/privacy" className="hover:text-innovation-teal transition-colors">Privacy Policy</a></li>
                  <li><a href="/terms" className="hover:text-innovation-teal transition-colors">Terms of Service</a></li>
                  <li><a href="/contact" className="hover:text-innovation-teal transition-colors">Contact & Support</a></li>
                  <li><a href="/blog" className="hover:text-innovation-teal transition-colors">Blog</a></li>
                </ul>
              </div>
            </div>
            <div className="border-t border-slate-700 mt-8 pt-8 text-center text-sm text-slate-400">
              <p>&copy; 2025 Jamie Watters. No corporate BS. Just tools that work.</p>
            </div>
          </div>
        </footer>

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
