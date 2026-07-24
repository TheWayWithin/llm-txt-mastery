import { useCallback, useState } from 'react';
import { Button } from '@/components/ui/button';
import { User, Settings, Coffee, Menu, X } from 'lucide-react';
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
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import HeroSection from '@/components/landing/HeroSection';
import ProblemAmplification from '@/components/landing/ProblemAmplification';
import SolutionIntro from '@/components/landing/SolutionIntro';
import ProofStack from '@/components/landing/ProofStack';
import AudienceCards from '@/components/landing/AudienceCards';
import PricingPreview from '@/components/landing/PricingPreview';
import FAQSection from '@/components/landing/FAQSection';
import FormatShowcase from '@/components/landing/FormatShowcase';
import FounderStory from '@/components/landing/FounderStory';
import { useSEO } from '@/hooks/useSEO';

export default function Home() {
  // Import auth hook to get email recognition capability
  const { recognizeEmailUser } = useAuth();
  const queryClient = useQueryClient();
  const [showDailyLimitModal, setShowDailyLimitModal] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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

  // Set page-specific SEO metadata
  useSEO({
    title: 'LLM.txt Mastery - AI-Ready Website Content Generator',
    description:
      'Generate optimized llms.txt files for your website. Help AI systems understand your content with our intelligent analyzer and file generator.',
  });

  // Fetch usage data to check limits
  const { data: usageData } = useQuery({
    queryKey: ['/api/usage', effectiveEmail],
    queryFn: async () => {
      if (!effectiveEmail) return null;
      const response = await apiRequest('GET', `/api/usage/${encodeURIComponent(effectiveEmail)}`);
      return response.json();
    },
    enabled: !!effectiveEmail,
    refetchInterval: 60000, // Sprint 2: Reduced from 10s to 60s to prevent excessive polling
    staleTime: 30000, // Data fresh for 30s prevents refetch storms
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

  // Determine what to show
  const showLanding = currentState === 'LANDING' && !user;
  const showWorkflow = !!user || currentState !== 'LANDING';

  return (
    <ErrorBoundary onReset={resetWorkflow}>
      <div className="min-h-screen bg-white">
        {/* Header */}
        <header className="bg-[#1E3A5F] sticky top-0 z-50 shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Link href="/">
                  <a>
                    <img
                      src="/images/logo-primary.png"
                      alt="LLM.txt Mastery"
                      className="h-12 md:h-14 w-auto brightness-0 invert"
                    />
                  </a>
                </Link>
              </div>

              {/* Desktop Nav */}
              <div className="hidden md:flex items-center space-x-6">
                {!user && (
                  <>
                    <a
                      href="#how-it-works"
                      className="text-sm text-white/80 hover:text-white transition-colors"
                    >
                      How It Works
                    </a>
                    <a
                      href="#pricing"
                      className="text-sm text-white/80 hover:text-white transition-colors"
                    >
                      Pricing
                    </a>
                    <Link href="/validator">
                      <a className="text-sm text-white/80 hover:text-white transition-colors">
                        Validator
                      </a>
                    </Link>
                  </>
                )}
                {/* Help & Reset Actions - Only show during workflow */}
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
              </div>

              {/* Mobile hamburger */}
              <div className="md:hidden flex items-center space-x-3">
                <AuthNav />
                <button
                  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                  className="text-white p-2 min-w-[44px] min-h-[44px] flex items-center justify-center"
                  aria-label="Toggle menu"
                >
                  {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
                </button>
              </div>
            </div>

            {/* Mobile overlay menu */}
            {mobileMenuOpen && (
              <div className="md:hidden fixed inset-0 top-[60px] bg-[#1E3A5F] z-50 flex flex-col items-center pt-8 space-y-4 overflow-y-auto">
                <a
                  href="#how-it-works"
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-lg text-white min-h-[44px] flex items-center px-4"
                >
                  How It Works
                </a>
                <a
                  href="#pricing"
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-lg text-white min-h-[44px] flex items-center px-4"
                >
                  Pricing
                </a>
                <Link href="/validator">
                  <a
                    onClick={() => setMobileMenuOpen(false)}
                    className="text-lg text-white min-h-[44px] flex items-center px-4"
                  >
                    Validator
                  </a>
                </Link>
                <Link href="/login">
                  <a
                    onClick={() => setMobileMenuOpen(false)}
                    className="text-lg text-white min-h-[44px] flex items-center px-4"
                  >
                    Sign In
                  </a>
                </Link>
                <Button
                  className="bg-signal-blue hover:bg-[#1D4ED8] text-white px-6 min-h-[44px]"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    window.location.href = '/signup';
                  }}
                >
                  Generate Your File
                </Button>
              </div>
            )}
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

        {/* Landing Page for unauthenticated visitors */}
        {showLanding && (
          <>
            <HeroSection user={user} />
            <ProblemAmplification />
            <SolutionIntro />
            <FormatShowcase />
            <ProofStack />
            <AudienceCards />
            <PricingPreview
              id="pricing"
              highlightTier="growth"
              showAllTiers={true}
              className="bg-cloud"
            />
            <FAQSection />
            <FounderStory />
          </>
        )}

        {/* App Workflow */}
        {showWorkflow && (
          <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {/* Welcome Back Message for Authenticated Users - Only show when NOT in URL_INPUT state */}
            {user && currentState !== 'URL_INPUT' && (
              <section className="mb-8">
                <div className="bg-success/10 border border-mist rounded-lg p-6 text-center">
                  <div className="flex items-center justify-center mb-2">
                    <div className="w-8 h-8 bg-success/10 rounded-full flex items-center justify-center mr-3">
                      <User className="h-4 w-4 text-success" />
                    </div>
                    <h3 className="text-lg font-semibold text-ink">
                      Welcome back, {user.email.split('@')[0]}!
                    </h3>
                  </div>
                  <p className="text-success mb-4">
                    {user.tier === 'solo' || user.tier === 'coffee'
                      ? `Your Solo subscription is active! ${
                          user.creditsRemaining > 0
                            ? `${user.creditsRemaining} of 20 analyses remaining this month.`
                            : 'Monthly analyses used — resets on your next billing cycle.'
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
                          className="text-success border-mist hover:bg-success/10"
                        >
                          <Settings className="h-4 w-4 mr-2" />
                          Go to Dashboard
                        </Button>
                      </a>
                    </Link>
                    {user.tier === 'solo' && (
                      <Button
                        size="sm"
                        className="bg-action-amber hover:bg-action-amber/90"
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
                        className="bg-action-amber hover:bg-action-amber/90"
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
                <div className="bg-success/10 border border-mist rounded-lg p-4 text-center">
                  <p className="text-success">
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
                      console.warn(`Email recognition failed for ${email}:`, error);
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
          </main>
        )}

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
