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
                  className="h-12 md:h-14 w-auto"
                />
              </div>
              <div className="flex items-center space-x-4">
                {/* Help & Reset Actions */}
                {(currentState !== 'URL_INPUT' && currentState !== 'INITIALIZING') && (
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
        {/* Hero Section */}
        <section className="text-center mb-12">
          <h2 className="text-4xl font-bold text-framework-black mb-4">
            Get Found by ChatGPT, Claude & Perplexity
          </h2>
          <p className="text-lg text-ai-silver mb-6 max-w-2xl mx-auto">
            I escaped corporate to build this because I was tired of my content being invisible to AI. 
            Join early adopters making their businesses AI-discoverable.
          </p>
          
          {/* Hero Illustration */}
          <div className="my-8 flex justify-center">
            <img
              src="/images/hero-illustration.png" 
              alt="Website transformation into AI-ready content" 
              className="max-w-full h-auto max-h-64 rounded-lg shadow-lg"
              loading="eager"
            />
          </div>
          
          <div className="flex items-center justify-center space-x-2 text-sm text-ai-silver">
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 bg-innovation-teal rounded-full"></div>
              <span>Official llms.txt Spec</span>
            </div>
            <span className="text-slate-300">•</span>
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 bg-innovation-teal rounded-full"></div>
              <span>Built by a Solopreneur</span>
            </div>
            <span className="text-slate-300">•</span>
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 bg-innovation-teal rounded-full"></div>
              <span>No VC BS</span>
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
            <img
              src="/images/how-it-works.png" 
              alt="Three-step process: Enter URL, AI Analysis, Download File" 
              className="max-w-full h-auto max-h-64 rounded-lg shadow-lg object-contain"
              loading="lazy"
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
                Get your specification-compliant LLM.txt file ready for immediate deployment.
              </p>
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

        {/* Why This Matters */}
        <section className="mt-16">
          <Card className="bg-slate-50 border-slate-200">
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold text-framework-black mb-4">
                Why This Matters (I Built This Because I Needed It Myself)
              </h3>
              <div className="mb-6">
                <p className="text-sm text-ai-silver mb-3">
                  I escaped corporate because I was tired of building tools I wouldn't use myself. ChatGPT, Claude, and Perplexity 
                  are already crawling websites - but most businesses are invisible to them. I built this tool because my own content 
                  wasn't getting found by AI search engines.
                </p>
                <p className="text-sm text-ai-silver mb-4">
                  Built by someone who actually uses these tools daily. No unnecessary complexity, no hidden fees. 
                  If I wouldn't use it myself, it doesn't belong on this site.
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
        </section>
        </main>

        {/* Footer */}
        <footer className="bg-framework-black text-white py-12 mt-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div>
                <h5 className="font-semibold mb-4">LLM.txt Mastery</h5>
                <p className="text-sm text-slate-300">
                  Simple, effective AI visibility tools. Built by a solopreneur who got tired of corporate complexity.
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
                <h5 className="font-semibold mb-4">Connect</h5>
                <ul className="text-sm text-slate-300 space-y-2">
                  <li><a href="https://aisearchmastery.com" target="_blank" rel="noopener noreferrer" className="hover:text-innovation-teal transition-colors">Main Website</a></li>
                  <li><a href="https://github.com/TheWayWithin" target="_blank" rel="noopener noreferrer" className="hover:text-innovation-teal transition-colors">Other Projects</a></li>
                  <li><a href="/blog" className="hover:text-innovation-teal transition-colors">Blog</a></li>
                  <li><a href="/contact" className="hover:text-innovation-teal transition-colors">Contact</a></li>
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
