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
  onAnalysisComplete: (analysisId: number, pages: DiscoveredPage[]) => void;
  onReset?: () => void;
  useAI?: boolean;
  onProgressUpdate?: (stage: string, totalPages?: number, processedPages?: number) => void;
}

interface AnalysisStep {
  id: string;
  label: string;
  progress: number;
}

const analysisSteps: AnalysisStep[] = [
  { id: 'sitemap', label: 'Discovering sitemap.xml and content structure', progress: 20 },
  { id: 'pages', label: 'Processing discovered pages', progress: 40 },
  { id: 'content', label: 'Extracting and analyzing content', progress: 60 },
  { id: 'ai', label: 'AI quality analysis and scoring', progress: 80 },
  { id: 'finalize', label: 'Finalizing results', progress: 100 },
];

export default function ContentAnalysis({
  websiteUrl,
  userEmail,
  onAnalysisComplete,
  onReset,
  useAI = false,
  onProgressUpdate,
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
        const response = await apiRequest('POST', '/api/analyze', { url, force, email });
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
    if (error.message?.includes('timeout')) {
      return 'Analysis timed out. The website might be slow to respond or very large. Try again or contact support.';
    }
    if (error.message?.includes('network') || error.message?.includes('fetch')) {
      return 'Network connection problem. Please check your internet connection and try again.';
    }
    if (error.message?.includes('404') || error.message?.includes('not found')) {
      return 'Website not found. Please check the URL and make sure the website is publicly accessible.';
    }
    if (error.message?.includes('403') || error.message?.includes('forbidden')) {
      return 'Access denied. The website might be blocking automated analysis. Try a different website.';
    }
    if (error.message?.includes('rate limit')) {
      return 'Too many requests. Please wait a moment before trying again.';
    }
    if (error.message?.includes('sitemap')) {
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

  const { data: analysisData, error } = useQuery<SiteAnalysisResult>({
    queryKey: ['/api/analysis', analysisId],
    queryFn: async () => {
      const response = await apiRequest('GET', `/api/analysis/${analysisId}`);
      return response.json();
    },
    enabled: !!analysisId,
    refetchInterval: (query) => {
      // Stop polling when analysis is complete
      const data = query?.state?.data;
      return data?.status === 'completed' || data?.status === 'failed' ? false : 2000;
    },
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
      // Enhanced progress tracking with stage updates
      const stageMapping = [
        { stage: 'discovery', stepIndex: 0 },
        { stage: 'content-fetch', stepIndex: 1 },
        { stage: 'ai-analysis', stepIndex: 2 },
        { stage: 'finalization', stepIndex: 3 },
      ];

      let stageIndex = 0;
      const timer = setInterval(() => {
        setCurrentStepIndex((prev) => {
          if (prev < analysisSteps.length - 1) {
            const newIndex = prev + 1;
            setProgress(analysisSteps[newIndex].progress);

            // Update stage tracking
            if (stageIndex < stageMapping.length) {
              const currentStageData = stageMapping[stageIndex];
              if (newIndex >= currentStageData.stepIndex) {
                setCurrentStage(currentStageData.stage);
                setCompletedStages((prev) => {
                  const newCompleted = [...prev];
                  if (stageIndex > 0) {
                    const prevStage = stageMapping[stageIndex - 1].stage;
                    if (!newCompleted.includes(prevStage)) {
                      newCompleted.push(prevStage);
                    }
                  }
                  return newCompleted;
                });

                // Notify parent of progress (using current state values)
                onProgressUpdate?.(currentStageData.stage, totalPages, processedPages);
                stageIndex++;
              }
            }

            return newIndex;
          }
          return prev;
        });
      }, 5000); // Update every 5 seconds instead of 2 for more realistic progress on large sites

      return () => clearInterval(timer);
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

  return (
    <div className="space-y-6">
      {/* Analysis In Progress Illustration */}
      <Card className="bg-gradient-to-r from-blue-50 to-teal-50 border-blue-200">
        <CardContent className="p-6 text-center">
          <div className="flex justify-center mb-4">
            <img
              src="/images/analysis-in-progress.png"
              alt="AI analysis in progress - scanning your website"
              className="max-w-md h-auto max-h-40 rounded-lg"
            />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Analyzing Your Website</h3>
          {coldStartDetected && (
            <div className="mb-3 px-4 py-2 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-sm text-amber-800">
                <Loader2 className="inline mr-2 h-4 w-4 animate-spin" />
                Waking up services... First request after inactivity may take 30-60 seconds
              </p>
            </div>
          )}
          <p className="text-sm text-gray-600 mb-4">
            Our AI system is carefully examining your content structure and optimizing it for
            machine readability
          </p>
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
