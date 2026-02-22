import { useState, useEffect, useCallback } from 'react';
import { useLocation, useRoute } from 'wouter';
import { useSEO } from '@/hooks/useSEO';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Search,
  CheckCircle,
  Info,
  User,
  Calendar,
  Settings,
  Zap,
  BarChart3,
  Clock,
  LogOut,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { AuthNav } from '@/components/AuthNav';
import { AuthModal } from '@/components/auth/AuthModal';
import UsageDisplay from '@/components/usage-display';
import ContentAnalysis from '@/components/content-analysis';
import ContentReview from '@/components/content-review';
import FileGeneration from '@/components/file-generation';
import TierLimitsDisplay from '@/components/tier-limits-display';
import { getTierDisplayName } from '@/lib/tier-utils';
import { ProgressBreadcrumb, FLOW_STEPS } from '@/components/ui/progress-breadcrumb';
import { EnhancedLoading, LOADING_STATES } from '@/components/ui/enhanced-loading';
import { useFlowStateMachine } from '@/hooks/useFlowStateMachine';
import { DiscoveredPage } from '@shared/schema';
import { Link } from 'wouter';
import ErrorBoundary from '@/components/ErrorBoundary';
import ErrorDisplay from '@/components/ErrorDisplay';
import DailyLimitModal from '@/components/DailyLimitModal';
import EmailVerificationBanner from '@/components/email-verification-banner';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useUsageTracking } from '@/hooks/useUsageTracking';

export default function AnalyzePage() {
  useSEO({
    title: 'Analyze Your Website - LLM.txt Mastery',
    description: "Analyze your website's AI readiness. Discover all pages, assess content quality, and generate an optimized llms.txt file.",
  });
  const [, navigate] = useLocation();
  const { user, isAuthenticated, authResolved, loading: authLoading } = useAuth();
  const queryClient = useQueryClient();
  const [showDailyLimitModal, setShowDailyLimitModal] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);

  // URL parameter handling
  const urlParams = new URLSearchParams(window.location.search);
  const websiteUrlParam = urlParams.get('websiteUrl') || urlParams.get('url') || '';

  // URL input state
  const [url, setUrl] = useState(websiteUrlParam);
  const [isValid, setIsValid] = useState(false);

  // Sprint 6: Enhanced JS rendering for Scale tier
  const [enhancedRendering, setEnhancedRendering] = useState(false);

  // State machine for analysis flow (authenticated version)
  const {
    currentState,
    websiteUrl,
    analysisId,
    discoveredPages,
    generatedFileId,
    progress,
    error,
    retryCount,
    visibility,
    actions,
  } = useFlowStateMachine();

  // Set pre-filled URL if provided
  useEffect(() => {
    if (websiteUrlParam) {
      setUrl(websiteUrlParam);
      validateUrl(websiteUrlParam);
    }
  }, [websiteUrlParam]);

  // Authentication check - redirect to signup if not authenticated
  useEffect(() => {
    if (authResolved && !authLoading && !isAuthenticated) {
      console.log('🔒 User not authenticated, redirecting to signup');
      const signupUrl = url ? `/signup?websiteUrl=${encodeURIComponent(url)}` : '/signup';
      navigate(signupUrl);
    }
  }, [authResolved, authLoading, isAuthenticated, navigate, url]);

  // Use the robust usage tracking hook
  const {
    usage: usageData,
    // trackUsage removed - server handles incrementing
    isLimitReached,
    serverUsage,
    clientUsage,
  } = useUsageTracking(user?.email);

  // TODO: Add recent analyses when API endpoint is implemented
  // const { data: recentAnalyses } = useQuery({
  //   queryKey: ["/api/recent-analyses", user?.email],
  //   queryFn: async () => {
  //     if (!user?.email) return [];
  //     const response = await apiRequest("GET", `/api/recent-analyses/${encodeURIComponent(user.email)}`);
  //     return response.json();
  //   },
  //   enabled: !!user?.email,
  // });
  const recentAnalyses: any[] = []; // Temporary until API is implemented

  const normalizeUrl = (value: string) => {
    if (!value.trim()) return value;
    if (/^https?:\/\//.test(value)) {
      return value;
    }
    return `https://${value}`;
  };

  const validateUrl = (value: string) => {
    const normalizedUrl = normalizeUrl(value);
    const urlPattern = /^https?:\/\/.+\..+/;
    const valid = urlPattern.test(normalizedUrl);
    setIsValid(valid);
    return valid;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setUrl(value);
    validateUrl(value);
  };

  const handleAnalysisStart = () => {
    if (!isValid || !url) return;

    // Check if user has reached daily limit
    if (isLimitReached && user?.tier === 'starter') {
      setShowDailyLimitModal(true);
      return;
    }

    const normalizedUrl = normalizeUrl(url);
    console.log('🌐 Starting analysis for URL:', normalizedUrl);
    actions.submitUrl(normalizedUrl);
  };

  const handleAnalysisComplete = useCallback(
    (id: number, pages: DiscoveredPage[]) => {
      const handlerStart = performance.now();
      console.log(`🎯 ANALYSIS_COMPLETE triggered: id=${id}, pagesCount=${pages.length}`);

      // DON'T track usage here - server already increments when analysis completes
      // This was causing double incrementing!
      // trackUsage(); // REMOVED - server handles this

      // Wait a bit for server to update, then invalidate queries
      setTimeout(() => {
        console.log(`🔄 Invalidating usage queries for user: ${user?.email}`);
        if (user?.email) {
          queryClient.invalidateQueries({
            queryKey: ['/api/usage', user.email],
          });
          queryClient.invalidateQueries({
            queryKey: ['/api/simple-usage', user.email],
          });
          // TODO: Add recent analyses invalidation when API is implemented
          // queryClient.invalidateQueries({
          //   queryKey: ["/api/recent-analyses", user.email]
          // })
        }
      }, 1000); // Give server 1 second to update

      // Time the state machine action
      const actionStart = performance.now();
      actions.completeAnalysis(id, pages);
      const actionEnd = performance.now();

      const handlerEnd = performance.now();
      console.log(
        `⏱️ handleAnalysisComplete took ${(handlerEnd - handlerStart).toFixed(2)}ms (action: ${(actionEnd - actionStart).toFixed(2)}ms)`
      );
    },
    [actions.completeAnalysis, user?.email, queryClient]
  );

  const handleFileGenerated = useCallback(
    (fileId: number) => {
      actions.generateFile(fileId);
    },
    [actions.generateFile]
  );

  const resetWorkflow = () => {
    actions.resetWorkflow();
    setUrl('');
    setIsValid(false);
  };

  const startNewAnalysis = () => {
    actions.startNewAnalysis();
    setUrl('');
    setIsValid(false);
  };

  // Show loading while auth is resolving
  if (!authResolved || authLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <EnhancedLoading state={LOADING_STATES.AUTH_CHECK} />
      </div>
    );
  }

  // If not authenticated after auth resolves, the useEffect above will redirect
  if (!isAuthenticated || !user) {
    return null;
  }

  return (
    <ErrorBoundary onReset={startNewAnalysis}>
      <div className="min-h-screen bg-slate-50">
        {/* Header */}
        <header className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              <Link href="/" className="flex items-center space-x-3 hover:opacity-80 transition-opacity">
                <img
                  src="/images/logo-primary.png"
                    alt="LLM.txt Mastery"
                    className="h-20 md:h-24 w-auto"
                  />
              </Link>
              <div className="flex items-center space-x-4">
                <AuthNav />
                <div className="text-right hidden md:block">
                  <p className="text-sm text-ai-silver">Built by Jamie Watters</p>
                  <p className="text-xs text-ai-silver">Solopreneur & Tool Builder</p>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Email Verification Banner */}
        {user?.emailVerified === false && (
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-4">
            <EmailVerificationBanner userEmail={user.email} emailVerified={user.emailVerified} />
          </div>
        )}

        {/* Main Content */}
        <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* User Welcome & Status */}
          <section className="mb-8">
            <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-innovation-teal rounded-full flex items-center justify-center">
                    <User className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h1 className="text-xl font-semibold text-framework-black">
                      Welcome back, {user.email.split('@')[0]}!
                    </h1>
                    <p className="text-sm text-ai-silver">
                      Ready to analyze your website and generate an optimized llms.txt file?
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Link href="/dashboard">
                    <Button variant="outline" size="sm">
                      <Settings className="h-4 w-4 mr-2" />
                      Dashboard
                    </Button>
                  </Link>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      sessionStorage.removeItem('auth_access_token');
                      sessionStorage.removeItem('auth_refresh_token');
                      sessionStorage.removeItem('auth_user');
                      window.location.href = '/';
                    }}
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    Sign Out
                  </Button>
                </div>
              </div>

              {/* Quick Stats */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex items-center space-x-3 p-3 bg-slate-50 rounded-lg">
                  <Zap className="h-5 w-5 text-innovation-teal" />
                  <div>
                    <p className="text-sm font-medium text-framework-black">Current Tier</p>
                    <p className="text-xs text-ai-silver">{getTierDisplayName(user.tier)}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3 p-3 bg-slate-50 rounded-lg">
                  <BarChart3 className="h-5 w-5 text-innovation-teal" />
                  <div>
                    <p className="text-sm font-medium text-framework-black">
                      {user.tier === 'solo' ? 'Credits' : "Today's Usage"}
                    </p>
                    <p className="text-xs text-ai-silver">
                      {user.tier === 'solo'
                        ? `${usageData?.creditsRemaining || 0} remaining`
                        : `${usageData?.currentUsage || 0} / ${usageData?.dailyAnalyses || 3}`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-3 p-3 bg-slate-50 rounded-lg">
                  <Clock className="h-5 w-5 text-innovation-teal" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-framework-black">
                      {user.tier === 'solo'
                        ? 'Manage Subscription'
                        : user.tier === 'starter'
                          ? 'Upgrade Available'
                          : user.tier === 'growth'
                            ? 'Pro Features Active'
                            : 'Enterprise Features'}
                    </p>
                    <p className="text-xs text-ai-silver">
                      {user.tier === 'solo'
                        ? 'View billing & invoices'
                        : user.tier === 'starter'
                          ? 'Get more analyses'
                          : user.tier === 'growth'
                            ? '500 pages per site'
                            : 'Unlimited everything'}
                    </p>
                  </div>
                  {user.tier !== 'scale' && (
                    <Link href="/dashboard?tab=billing">
                      <Button variant="outline" size="sm" className="h-7 text-xs">
                        {user.tier === 'starter'
                          ? 'Upgrade'
                          : user.tier === 'solo'
                            ? 'Billing'
                            : 'Manage'}
                      </Button>
                    </Link>
                  )}
                </div>
              </div>
            </div>
          </section>

          {/* Progress Breadcrumb - Show when user has started analysis */}
          {currentState !== 'URL_INPUT' && currentState !== 'INITIALIZING' && (
            <ProgressBreadcrumb
              steps={FLOW_STEPS}
              currentStep={progress.currentStep}
              completedSteps={progress.completedSteps}
              className="mb-8"
            />
          )}

          {/* Error State Display */}
          {visibility.error && error && (
            <ErrorDisplay
              error={error}
              onRetry={() => actions.retryCurrentOperation()}
              onRecover={(targetState) => actions.recoverFromError(targetState)}
              onReset={startNewAnalysis}
              retryCount={retryCount}
              maxRetries={3}
            />
          )}

          {/* Usage Display - Pass usageData to avoid duplicate fetching */}
          {user.email && !visibility.error && (
            <UsageDisplay
              userEmail={user.email}
              // Let UsageDisplay fetch its own data to get cache hits
              // Don't pass usageData prop so it fetches fresh data
            />
          )}

          {/* Daily Limit Modal */}
          {showDailyLimitModal && usageData && (
            <DailyLimitModal
              isOpen={showDailyLimitModal}
              onClose={() => setShowDailyLimitModal(false)}
              userEmail={user.email}
              currentUsage={usageData.currentUsage || 0}
              dailyLimit={usageData.dailyAnalyses || 3}
              websiteUrl={url || undefined}
            />
          )}

          {/* URL Input - Primary Interface */}
          {(currentState === 'URL_INPUT' || currentState === 'INITIALIZING') && (
            <section className="mb-8">
              <Card className="bg-white shadow-sm border border-slate-200">
                <CardContent className="p-6">
                  <div className="text-center mb-6">
                    <h2 className="text-2xl font-bold text-framework-black mb-2">
                      Analyze Your Website
                    </h2>
                    <p className="text-ai-silver">
                      Enter your website URL to discover pages and generate an optimized llms.txt
                      file
                    </p>
                  </div>

                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleAnalysisStart();
                    }}
                    className="space-y-4"
                  >
                    <div>
                      <Label
                        htmlFor="website-url"
                        className="text-sm font-medium text-framework-black"
                      >
                        Website URL
                      </Label>
                      <div className="relative mt-2">
                        <Input
                          id="website-url"
                          type="text"
                          placeholder="www.example.com or https://example.com"
                          value={url}
                          onChange={handleInputChange}
                          className="pr-12 border-slate-300 focus:ring-innovation-teal focus:border-innovation-teal text-lg py-3"
                        />
                        {isValid && (
                          <div className="absolute right-3 top-3">
                            <CheckCircle className="h-5 w-5 text-green-500" />
                          </div>
                        )}
                      </div>
                      <p className="mt-2 text-sm text-ai-silver">
                        Protocol (https://) is optional - we'll add it automatically
                      </p>
                    </div>

                    {/* Sprint 6: Enhanced JS Rendering Toggle - Scale tier only */}
                    {user.tier === 'scale' && (
                      <div className="flex items-center space-x-3 p-3 bg-gradient-to-r from-purple-50 to-indigo-50 rounded-lg border border-purple-200">
                        <input
                          type="checkbox"
                          id="enhanced-rendering"
                          checked={enhancedRendering}
                          onChange={(e) => setEnhancedRendering(e.target.checked)}
                          className="h-4 w-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                        />
                        <label htmlFor="enhanced-rendering" className="flex-1 cursor-pointer">
                          <span className="text-sm font-medium text-purple-900">
                            Enhanced JS Rendering
                          </span>
                          <p className="text-xs text-purple-700">
                            Use browser rendering for React, Angular, Vue and other JS-heavy sites
                          </p>
                        </label>
                        <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded">
                          Scale
                        </span>
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-4">
                      <div className="flex items-center space-x-2 text-sm text-ai-silver">
                        <Info className="h-4 w-4 text-innovation-teal" />
                        <span>
                          {user.tier === 'starter'
                            ? 'AI analysis for first 5 pages'
                            : user.tier === 'solo'
                              ? `${user.creditsRemaining || 0} premium analyses remaining`
                              : 'Unlimited AI-enhanced analysis'}
                        </span>
                      </div>
                      <Button
                        type="submit"
                        disabled={!isValid}
                        className="bg-innovation-teal hover:bg-innovation-teal/90 text-white px-8 py-3 text-lg"
                      >
                        <Search className="h-5 w-5 mr-2" />
                        Analyze Website
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </section>
          )}

          {/* Tier Limits Check */}
          {visibility.tierLimits && (
            <TierLimitsDisplay
              url={websiteUrl}
              email={user.email}
              onProceed={() => actions.proceedToAnalysis()}
              isVisible={visibility.tierLimits}
            />
          )}

          {/* Analysis Components */}
          {visibility.analysis && (
            <ContentAnalysis
              websiteUrl={websiteUrl}
              userEmail={user.email}
              userTier={user.tier}
              onAnalysisComplete={handleAnalysisComplete}
              onReset={startNewAnalysis}
              useAI={user.tier !== 'starter'}
              enhancedRendering={enhancedRendering}
              onProgressUpdate={(stage, totalPages, processedPages) => {
                actions.updateAnalysisProgress(stage, totalPages, processedPages);
              }}
            />
          )}

          {visibility.review && (
            <ContentReview
              analysisId={analysisId!}
              discoveredPages={discoveredPages}
              onFileGenerated={handleFileGenerated}
              onStartOver={resetWorkflow}
              onStartNewAnalysis={startNewAnalysis}
            />
          )}

          {visibility.generation && (
            <FileGeneration
              fileId={generatedFileId!}
              analysisId={analysisId || undefined}
              onStartOver={resetWorkflow}
              onStartNewAnalysis={startNewAnalysis}
              onViewAnalysis={() => actions.viewAnalysisDetails()}
            />
          )}

          {/* Recent Analyses - Show only when in URL input state */}
          {(currentState === 'URL_INPUT' || currentState === 'INITIALIZING') &&
            recentAnalyses &&
            recentAnalyses.length > 0 && (
              <section className="mt-8">
                <Card className="bg-white shadow-sm border border-slate-200">
                  <CardContent className="p-6">
                    <h3 className="text-lg font-semibold text-framework-black mb-4">
                      Recent Analyses
                    </h3>
                    <div className="space-y-3">
                      {recentAnalyses.slice(0, 5).map((analysis: any) => (
                        <div
                          key={analysis.id}
                          className="flex items-center justify-between p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"
                        >
                          <div className="flex-1">
                            <p className="font-medium text-framework-black truncate">
                              {analysis.websiteUrl}
                            </p>
                            <p className="text-sm text-ai-silver">
                              {analysis.discoveredPages} pages •{' '}
                              {new Date(analysis.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setUrl(analysis.websiteUrl);
                              validateUrl(analysis.websiteUrl);
                            }}
                          >
                            Re-analyze
                          </Button>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </section>
            )}
        </main>

        {/* Authentication Modal */}
        <AuthModal
          isOpen={showAuthModal}
          onClose={() => setShowAuthModal(false)}
          defaultMode="login"
        />
      </div>
    </ErrorBoundary>
  );
}
