import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  CheckCircle,
  Circle,
  Loader2,
  FileText,
  Brain,
  Globe,
  AlertTriangle,
  RotateCcw,
  Home,
} from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { DiscoveredPage, SiteAnalysisResult } from '@shared/schema';
import { AnalysisProgress, ANALYSIS_STAGES } from '@/components/ui/analysis-progress';
import { EnhancedLoading, LOADING_STATES } from '@/components/ui/enhanced-loading';
import { QuickHelp, InlineHelp } from './HelpSystem';

interface ContentAnalysisProps {
  websiteUrl: string;
  userEmail: string;
  userTier: string;
  onAnalysisComplete: (analysisId: number, pages: DiscoveredPage[]) => void;
  onReset?: () => void;
  useAI?: boolean;
  onProgressUpdate?: (stage: string, totalPages?: number, processedPages?: number) => void;
  // Sprint 6: Enhanced JS rendering for Scale tier
  enhancedRendering?: boolean;
}

interface AnalysisStep {
  id: string;
  label: string;
  progress: number;
}

const analysisSteps: AnalysisStep[] = [
  { id: 'discovery', label: 'Discovering sitemap and pages', progress: 15 },
  { id: 'ai-analysis', label: 'AI analyzing each page', progress: 95 },
  { id: 'finalization', label: 'Saving results', progress: 100 },
];

// Tier page limits (must match server/services/cache.ts TIER_LIMITS)
const TIER_PAGE_LIMITS: Record<string, number> = {
  starter: 20,
  coffee: 200,  // Coffee = Solo equivalent (legacy tier name)
  solo: 200,
  growth: 500,
  scale: 1000,
};

// Estimate analysis time based on page count and tier limit
// ~1.3 seconds per page with AI analysis + overhead
function getEstimatedTime(pageCount: number, tier?: string): string {
  if (pageCount <= 0) return 'Calculating...';

  // Use tier limit if available, otherwise use full page count
  const tierLimit = tier ? TIER_PAGE_LIMITS[tier] || pageCount : pageCount;
  const actualPages = Math.min(pageCount, tierLimit);

  const secondsPerPage = 1.3;
  const overheadSeconds = 30; // sitemap discovery, saving, etc.
  const totalSeconds = Math.ceil(actualPages * secondsPerPage + overheadSeconds);

  if (totalSeconds < 60) {
    return `~${totalSeconds} seconds`;
  } else if (totalSeconds < 120) {
    return '~1-2 minutes';
  } else {
    const minutes = Math.ceil(totalSeconds / 60);
    return `~${minutes} minutes`;
  }
}

export default function ContentAnalysis({
  websiteUrl,
  userEmail,
  userTier,
  onAnalysisComplete,
  onReset,
  useAI = false,
  onProgressUpdate,
  enhancedRendering = false,
}: ContentAnalysisProps) {
  const queryClient = useQueryClient();
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [analysisId, setAnalysisId] = useState<number | null>(null);
  const [currentStage, setCurrentStage] = useState('discovery');
  const [completedStages, setCompletedStages] = useState<string[]>([]);
  const [totalPages, setTotalPages] = useState<number | undefined>(undefined);
  const [processedPages, setProcessedPages] = useState<number>(0);
  const [retryCount, setRetryCount] = useState(0);
  const [lastError, setLastError] = useState<string | null>(null);
  const [coldStartDetected, setColdStartDetected] = useState(false);
  const [requestStartTime, setRequestStartTime] = useState<number | null>(null);
  const [estimatedTime, setEstimatedTime] = useState<string>('Calculating...');
  const [effectiveTier, setEffectiveTier] = useState<string>(userTier);

  // Calculate tier limit for display - use effectiveTier which updates from API
  const tierLimit = TIER_PAGE_LIMITS[effectiveTier] || 20;
  const tierDisplayName = effectiveTier === 'coffee' ? 'Coffee' :
    effectiveTier === 'solo' ? 'Solo' :
    effectiveTier === 'growth' ? 'Growth' :
    effectiveTier === 'scale' ? 'Scale' : 'Starter';

  const startAnalysisMutation = useMutation({
    mutationFn: async ({
      url,
      force = false,
      email,
    }: {
      url: string;
      force?: boolean;
      email: string;
    }) => {
      setLastError(null);
      setRequestStartTime(Date.now());
      setColdStartDetected(false);

      // Detect cold start if request takes more than 10 seconds
      const coldStartTimer = setTimeout(() => {
        setColdStartDetected(true);
      }, 10000);

      try {
        // Use real sitemap analysis endpoint with email for tier-based analysis
        const response = await apiRequest('POST', '/api/analyze', { url, force, email, enhancedRendering });
        clearTimeout(coldStartTimer);
        return response.json();
      } catch (error) {
        clearTimeout(coldStartTimer);
        throw error;
      }
    },
    onSuccess: (data) => {
      setLastError(null);
      setAnalysisId(data.analysisId);
      if (data.status === 'completed') {
        onAnalysisComplete(data.analysisId, data.discoveredPages);
      }
    },
    onError: (error) => {
      console.error('Analysis failed:', error);
      const errorMessage = getDetailedAnalysisError(error);
      setLastError(errorMessage);
    },
  });

  function getDetailedAnalysisError(error: any): string {
    const errorMsg = error.message || '';

    // Check for authentication/email errors FIRST (before generic "not found" check)
    if (errorMsg.includes('Email not found') || errorMsg.includes('sign up first')) {
      return 'Session expired. Please refresh the page and try again, or log in again.';
    }
    if (errorMsg.includes('Email verification expired')) {
      return 'Your session has expired. Please log in again to continue analyzing websites.';
    }
    if (errorMsg.includes('Email required')) {
      return 'Authentication required. Please log in to analyze websites.';
    }

    if (errorMsg.includes('timeout')) {
      return 'Analysis timed out. The website might be slow to respond or very large. Try again or contact support.';
    }
    if (errorMsg.includes('network') || errorMsg.includes('fetch')) {
      return 'Network connection problem. Please check your internet connection and try again.';
    }
    // Be more specific - only match HTTP 404 errors, not "Email not found" etc.
    if (errorMsg.includes('404')) {
      return 'Website not found. Please check the URL and make sure the website is publicly accessible.';
    }
    // For 403, check if it's a website blocking us vs our own auth error
    if (errorMsg.includes('403')) {
      // If message contains our specific auth errors, don't show "website blocking" message
      if (errorMsg.includes('Email') || errorMsg.includes('sign up') || errorMsg.includes('log in')) {
        return 'Session expired. Please refresh the page and try again.';
      }
      return 'Access denied. The website might be blocking automated analysis. Try a different website.';
    }
    if (errorMsg.includes('rate limit')) {
      return 'Too many requests. Please wait a moment before trying again.';
    }
    if (errorMsg.includes('sitemap')) {
      return "Unable to find or parse the website's sitemap. The site might not have public content to analyze.";
    }
    return (
      error.message ||
      'Analysis failed due to an unexpected error. Please try again or contact support.'
    );
  }

  const handleRetry = () => {
    setRetryCount((prev) => prev + 1);
    setLastError(null);
    if (websiteUrl && userEmail) {
      startAnalysisMutation.mutate({ url: websiteUrl, force: true, email: userEmail });
    }
  };

  const { data: analysisData, error, isRefetching } = useQuery<SiteAnalysisResult>({
    queryKey: ['/api/analysis', analysisId],
    queryFn: async () => {
      const response = await apiRequest('GET', `/api/analysis/${analysisId}`);
      return response.json();
    },
    enabled: !!analysisId,
    // Polling configuration for long-running analyses (can take 5+ minutes for large sites)
    refetchInterval: (query) => {
      // Stop polling when analysis is complete
      const data = query?.state?.data;
      return data?.status === 'completed' || data?.status === 'failed' ? false : 3000;
    },
    // Keep polling even if window loses focus (important for long analyses)
    refetchIntervalInBackground: true,
    // Don't consider data stale while processing
    staleTime: 0,
    // Retry failed polls (network issues shouldn't stop polling)
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
  });

  // Handle query errors
  useEffect(() => {
    if (error) {
      console.error('Analysis polling failed:', error);
      const errorMessage = getDetailedAnalysisError(error);
      setLastError(errorMessage);
    }
  }, [error]);

  useEffect(() => {
    if (websiteUrl && userEmail) {
      startAnalysisMutation.mutate({ url: websiteUrl, force: true, email: userEmail });
    }
  }, [websiteUrl, userEmail]);

  // Track completion to prevent duplicate calls - using analysisId for better tracking
  const [completedAnalysisIds, setCompletedAnalysisIds] = useState<Set<number>>(new Set());

  useEffect(() => {
    console.log(
      `🔍 Analysis status check: status=${analysisData?.status}, id=${analysisData?.id}, alreadyCompleted=${analysisData?.id ? completedAnalysisIds.has(analysisData.id) : 'n/a'}`
    );

    if (
      analysisData &&
      analysisData.status === 'completed' &&
      !completedAnalysisIds.has(analysisData.id)
    ) {
      console.log(
        `📊 Analysis completed: id=${analysisData.id}, pages=${analysisData.discoveredPages.length}`
      );
      // CRITICAL FIX: Immediately update progress to 100% when analysis completes
      // Don't wait for timer when analysis is already complete
      setProgress(100);
      setCurrentStepIndex(analysisSteps.length - 1);
      setCurrentStage('finalization');
      setCompletedStages(['discovery', 'content-fetch', 'ai-analysis', 'finalization']);
      setTotalPages(analysisData.totalPagesFound);
      setProcessedPages(analysisData.discoveredPages.length);

      // Notify parent of progress completion
      onProgressUpdate?.(
        'finalization',
        analysisData.totalPagesFound,
        analysisData.discoveredPages.length
      );

      // Mark this specific analysis ID as completed
      setCompletedAnalysisIds((prev) => new Set([...prev, analysisData.id]));

      // CRITICAL FIX: Invalidate usage queries to refresh counter immediately
      console.log(`🔄 Invalidating usage queries for user: ${userEmail}`);
      queryClient.invalidateQueries({
        queryKey: ['/api/usage', userEmail],
      });

      // Call completion callback with delay to allow state updates
      console.log(`🚀 Calling onAnalysisComplete: id=${analysisData.id} in 500ms`);
      setTimeout(() => {
        console.log(`✅ Executing onAnalysisComplete callback now`);
        onAnalysisComplete(analysisData.id, analysisData.discoveredPages);
      }, 500);
    } else if (analysisData && analysisData.status === 'failed') {
      console.error(`❌ Analysis failed: id=${analysisData.id}, error=${analysisData.error}`);
      setLastError(analysisData.error || 'Analysis failed unexpectedly');
    } else if (analysisData && analysisData.status === 'processing') {
      // Update estimated time and mark discovery complete when we know the page count
      if (analysisData.totalPagesFound && analysisData.totalPagesFound > 0) {
        // Use API tier as source of truth (fresh from database) - userTier prop may be stale JWT
        const apiTier = analysisData.analysisMetadata?.tier || analysisData.tier || userTier;
        const apiTierLimit = TIER_PAGE_LIMITS[apiTier] || analysisData.totalPagesFound;
        const actualPages = Math.min(analysisData.totalPagesFound, apiTierLimit);

        // Update effective tier state so UI shows correct tier info
        setEffectiveTier(apiTier);
        setTotalPages(analysisData.totalPagesFound);
        setEstimatedTime(getEstimatedTime(analysisData.totalPagesFound, apiTier));

        console.log(`📊 Analysis tier info: tier=${apiTier}, limit=${apiTierLimit}, totalPages=${analysisData.totalPagesFound}, analyzing=${actualPages}`);

        // Discovery is complete once we have the page count
        // Now we're in content extraction / AI analysis phase
        setCompletedStages(['discovery']);
        setCurrentStage('ai-analysis'); // Main phase - AI analysis of all pages

        // Progress during processing: 15% (discovery done) to 95% max
        // Estimate progress based on ACTUAL pages to analyze (tier-limited)
        const estimatedSeconds = actualPages * 1.3 + 30;

        const timer = setInterval(() => {
          setProgress((prev) => {
            // Slowly increment from 15% to 95% over the estimated time
            // Cap at 95% - only completion sets 100%
            if (prev < 95) {
              // Increment by ~1% every few seconds, but cap at 95%
              const increment = Math.max(0.5, 80 / (estimatedSeconds / 3));
              return Math.min(prev + increment, 95);
            }
            return prev;
          });
        }, 3000); // Update every 3 seconds

        return () => clearInterval(timer);
      }
    }
  }, [
    analysisData?.status,
    analysisData?.id,
    completedAnalysisIds,
    onAnalysisComplete,
    onProgressUpdate,
  ]);

  const getStepIcon = (stepIndex: number) => {
    if (stepIndex < currentStepIndex) {
      return <CheckCircle className="h-5 w-5 text-green-500" />;
    } else if (stepIndex === currentStepIndex) {
      return <Loader2 className="h-5 w-5 text-innovation-teal animate-spin" />;
    } else {
      return <Circle className="h-5 w-5 text-slate-300" />;
    }
  };

  // Show error state
  if (lastError || (error && !analysisData)) {
    const displayError =
      lastError || (error instanceof Error ? error.message : 'Failed to analyze website');
    const canRetry = retryCount < 3;

    return (
      <Card className="bg-white shadow-sm border border-red-200">
        <CardContent className="p-6">
          <div className="flex items-center mb-4">
            <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center mr-3">
              <AlertTriangle className="text-white h-5 w-5" />
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-semibold text-red-600">Analysis Failed</h3>
              <p className="text-red-600 text-sm mt-1">
                {retryCount > 0 && `Attempt ${retryCount + 1} of 3`}
              </p>
            </div>
            <QuickHelp context="analysis" />
          </div>

          <div className="space-y-4">
            <p className="text-red-700 bg-red-50 p-3 rounded-lg border border-red-200">
              {displayError}
            </p>

            <InlineHelp
              variant="warning"
              content="Analysis errors can happen with complex websites or network issues. Most problems resolve with a retry."
            />

            <div className="flex flex-col sm:flex-row gap-3">
              {canRetry && (
                <Button
                  onClick={handleRetry}
                  disabled={startAnalysisMutation.isPending}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <RotateCcw className="mr-2 h-4 w-4" />
                  {startAnalysisMutation.isPending
                    ? 'Retrying...'
                    : `Try Again ${retryCount > 0 ? `(${retryCount + 1}/3)` : ''}`}
                </Button>
              )}

              {onReset && (
                <Button
                  onClick={onReset}
                  variant="outline"
                  className="flex-1 border-green-300 text-green-700 hover:bg-green-50"
                >
                  <Home className="mr-2 h-4 w-4" />
                  Start Over
                </Button>
              )}
            </div>

            {retryCount >= 3 && (
              <div className="text-center pt-4 border-t">
                <p className="text-sm text-slate-600 mb-3">
                  Still having trouble? We're here to help!
                </p>
                <Button
                  variant="outline"
                  onClick={() =>
                    window.open(
                      'mailto:support@llmtxtmastery.com?subject=Analysis Error&body=Error: ' +
                        encodeURIComponent(displayError),
                      '_blank'
                    )
                  }
                >
                  Contact Support
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Show initial loading state while starting analysis
  if (!analysisData) {
    const loadingState = useAI
      ? LOADING_STATES.COFFEE_TIER_LOADING
      : LOADING_STATES.SITEMAP_DISCOVERY;

    return <EnhancedLoading state={loadingState} />;
  }

  // Calculate how many pages will actually be analyzed based on tier
  const actualPagesToAnalyze = totalPages ? Math.min(totalPages, tierLimit) : undefined;
  const isLimited = totalPages ? totalPages > tierLimit : false;

  return (
    <div className="space-y-6">
      {/* Analysis In Progress */}
      <Card className="bg-gradient-to-r from-blue-50 to-teal-50 border-blue-200">
        <CardContent className="p-6 text-center">
          <h3 className="text-lg font-medium text-gray-900 mb-2">Analyzing Your Website</h3>

          {/* URL being analyzed */}
          <div className="mb-3 px-4 py-2 bg-white/50 border border-blue-100 rounded-lg inline-block">
            <p className="text-sm text-gray-700 font-medium">
              <Globe className="inline mr-2 h-4 w-4 text-blue-600" />
              {websiteUrl}
            </p>
          </div>

          {coldStartDetected && (
            <div className="mb-3 px-4 py-2 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-sm text-amber-800">
                <Loader2 className="inline mr-2 h-4 w-4 animate-spin" />
                Waking up services... First request after inactivity may take 30-60 seconds
              </p>
            </div>
          )}
          <p className="text-sm text-gray-600 mb-2">
            Our AI system is carefully examining your content structure and optimizing it for
            machine readability
          </p>
          {/* Estimated time and tier info display */}
          {totalPages && totalPages > 0 && (
            <div className="mt-3 space-y-2">
              <div className="px-4 py-2 bg-blue-50 border border-blue-200 rounded-lg inline-block">
                <p className="text-sm text-blue-800">
                  <FileText className="inline mr-2 h-4 w-4" />
                  {isLimited ? (
                    <>
                      Analyzing <strong>{actualPagesToAnalyze}</strong> of {totalPages} pages
                      <span className="text-blue-600 ml-1">({tierDisplayName} tier limit)</span>
                    </>
                  ) : (
                    <>{totalPages} pages found</>
                  )}
                  {' '} • Estimated time: <strong>{estimatedTime}</strong>
                </p>
              </div>
              {isLimited && (
                <div className="px-4 py-2 bg-amber-50 border border-amber-200 rounded-lg inline-block">
                  <p className="text-sm text-amber-700">
                    <AlertTriangle className="inline mr-2 h-4 w-4" />
                    Upgrade to analyze more pages: Growth (500) or Scale (1000)
                  </p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <AnalysisProgress
        currentStage={currentStage}
        completedStages={completedStages}
        totalPages={totalPages}
        processedPages={processedPages}
        overallProgress={progress}
        stages={ANALYSIS_STAGES}
        showPageCount={totalPages !== undefined && totalPages > 0}
        showTimeEstimate={true}
        estimatedTotalTime={estimatedTime !== 'Calculating...' ? estimatedTime : undefined}
      />

      {/* Analysis Results - Show when completed */}
      {analysisData && analysisData.status === 'completed' && (
        <Card className="bg-white shadow-sm border border-slate-200">
          <CardContent className="p-6">
            <h4 className="font-semibold text-framework-black mb-4">Analysis Results</h4>
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-ai-silver">Site Type:</span>
                <span className="text-framework-black font-medium">
                  {analysisData.siteType === 'single-page'
                    ? 'Single-Page Site'
                    : analysisData.siteType === 'multi-page'
                      ? 'Multi-Page Site'
                      : 'Unknown'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-ai-silver">Sitemap Found:</span>
                <span className="text-framework-black font-medium">
                  {analysisData.sitemapFound ? 'Yes' : 'No'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-ai-silver">Analysis Method:</span>
                <span className="text-framework-black font-medium">
                  {analysisData.analysisMethod === 'sitemap'
                    ? 'Sitemap Discovery'
                    : analysisData.analysisMethod === 'robots.txt'
                      ? 'Robots.txt Fallback'
                      : analysisData.analysisMethod === 'homepage-only'
                        ? 'Homepage Only'
                        : analysisData.analysisMethod === 'fallback-crawl'
                          ? 'Basic Crawling'
                          : 'Unknown'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-ai-silver">Pages Found:</span>
                <span className="text-framework-black font-medium">
                  {analysisData.totalPagesFound}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-ai-silver">Pages Analyzed:</span>
                <span className="text-framework-black font-medium">
                  {analysisData.discoveredPages.length}
                </span>
              </div>
              {analysisData.discoveredPages.length < analysisData.totalPagesFound && (
                <div className="flex items-center justify-between">
                  <span className="text-ai-silver">Pages Skipped:</span>
                  <span className="text-yellow-600 font-medium">
                    {analysisData.totalPagesFound - analysisData.discoveredPages.length}
                  </span>
                </div>
              )}
              {analysisData.message && (
                <div className="pt-3 border-t border-slate-200">
                  <p className="text-ai-silver text-xs">{analysisData.message}</p>
                </div>
              )}
              {analysisData.metrics && (
                <div className="pt-3 border-t border-slate-200 space-y-1">
                  <p className="text-framework-black text-xs font-semibold">Performance Metrics:</p>
                  <p className="text-ai-silver text-xs">
                    • Cache hit: {analysisData.metrics.cacheHit ? 'Yes' : 'No'}
                  </p>
                  <p className="text-ai-silver text-xs">
                    • Processing time: {analysisData.metrics.processingTime}s
                  </p>
                  <p className="text-ai-silver text-xs">
                    • API calls: {analysisData.metrics.apiCalls}
                  </p>
                  <p className="text-ai-silver text-xs">
                    • Cost saved: ${analysisData.metrics.costSaved.toFixed(2)}
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
