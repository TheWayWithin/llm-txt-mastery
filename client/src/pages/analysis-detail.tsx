import { useEffect, useState } from 'react';
import { useRoute } from 'wouter';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { getTierDisplayName } from '@/lib/tier-utils';
import {
  Activity,
  Globe,
  Calendar,
  Clock,
  CheckCircle,
  AlertCircle,
  Loader2,
  RefreshCw,
  Download,
  ExternalLink,
  ArrowLeft,
  BarChart3,
  FileText,
  Zap,
  Eye,
} from 'lucide-react';
import { ContentCoverageBadge } from '@/components/ui/content-coverage-badge';
import { RenderingStrategyTag } from '@/components/ui/rendering-strategy-tag';
import type { SPADetectionResult, RenderingStrategy } from '@shared/schema';
import { Link } from 'wouter';

interface AnalysisDetail {
  id: number;
  url: string;
  status: 'pending' | 'analyzing' | 'processing' | 'completed' | 'failed';
  createdAt: string;
  discoveredPages: {
    url: string;
    title: string;
    description: string;
    category: string;
    qualityScore: number;
    lastModified?: string;
  }[];
  analysisMetadata: {
    tier: string;
    message: string;
    siteType: string;
    userEmail: string;
    totalPagesFound: number;
    analysisMethod: string;
    processingTime: number;
    metrics: {
      apiCalls: number;
      cacheHit: boolean;
      costSaved: number;
      timeSaved: number;
      totalPages: number;
      aiCallsUsed: number;
      cachedPages: number;
      analyzedPages: number;
      estimatedCost: number;
      processingTime: number;
      htmlExtractionsUsed: number;
    };
    // Enhanced SPA detection fields (Sprint 1: Phase 1)
    spaDetection?: SPADetectionResult;
    contentCoveragePercentage?: number;
    renderingStrategy?: RenderingStrategy;
  };
}

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'completed':
      return <CheckCircle className="h-5 w-5 text-green-500" />;
    case 'failed':
      return <AlertCircle className="h-5 w-5 text-red-500" />;
    case 'analyzing':
    case 'processing':
      return <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />;
    default:
      return <Clock className="h-5 w-5 text-yellow-500" />;
  }
};

const getStatusColor = (status: string) => {
  switch (status) {
    case 'completed':
      return 'bg-green-100 text-green-800 border-green-200';
    case 'failed':
      return 'bg-red-100 text-red-800 border-red-200';
    case 'analyzing':
    case 'processing':
      return 'bg-blue-100 text-blue-800 border-blue-200';
    default:
      return 'bg-yellow-100 text-yellow-800 border-yellow-200';
  }
};

const getTierColor = (tier: string) => {
  switch (tier) {
    case 'solo':
      return 'bg-orange-100 text-orange-800 border-orange-200';
    case 'growth':
      return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'scale':
      return 'bg-purple-100 text-purple-800 border-purple-200';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
};

export default function AnalysisDetailPage() {
  const [match, params] = useRoute('/analysis/:id');
  const { getAccessToken } = useAuth();
  const [analysis, setAnalysis] = useState<AnalysisDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const analysisId = params?.id;

  useEffect(() => {
    if (analysisId) {
      loadAnalysisDetail();
    }
  }, [analysisId]);

  const loadAnalysisDetail = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = getAccessToken();
      if (!token) {
        setError('Authentication required');
        return;
      }

      const response = await fetch(
        `${import.meta.env.VITE_API_URL || 'https://llm-txt-mastery-production.up.railway.app'}/api/auth/my-analyses/${analysisId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        if (response.status === 404) {
          setError('Analysis not found');
        } else {
          setError(`Failed to load analysis (HTTP ${response.status})`);
        }
        return;
      }

      const data = await response.json();
      setAnalysis(data.analysis);
    } catch (error) {
      console.error('Failed to load analysis detail:', error);
      setError('Failed to load analysis details');
    } finally {
      setLoading(false);
    }
  };

  const handleRerunAnalysis = async (url: string) => {
    try {
      // Navigate to the home page with the URL pre-filled
      window.location.href = `/?url=${encodeURIComponent(url)}&rerun=true`;
    } catch (error) {
      console.error('Failed to initiate re-run:', error);
    }
  };

  if (!match) {
    return <div>Page not found</div>;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-framework-beige via-ai-silver/10 to-white">
        <div className="container mx-auto px-4 py-8">
          <Card>
            <CardContent className="flex items-center justify-center py-12">
              <div className="text-center">
                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
                <p className="text-gray-600">Loading analysis details...</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-framework-beige via-ai-silver/10 to-white">
        <div className="container mx-auto px-4 py-8">
          <Card>
            <CardContent className="text-center py-12">
              <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">{error}</h3>
              <p className="text-gray-600 mb-6">
                The analysis you're looking for could not be found or accessed.
              </p>
              <Link href="/dashboard">
                <a>
                  <Button>
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back to Dashboard
                  </Button>
                </a>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!analysis) {
    return <div>Analysis not found</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-framework-beige via-ai-silver/10 to-white">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-6">
          <Link href="/dashboard">
            <a className="inline-flex items-center text-innovation-teal hover:text-innovation-teal/80 mb-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </a>
          </Link>

          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-framework-black mb-2">Analysis Details</h1>
              <p className="text-gray-600">{new URL(analysis.url).hostname}</p>
            </div>

            <div className="flex items-center space-x-3">
              {getStatusIcon(analysis.status)}
              <Badge className={getStatusColor(analysis.status)}>{analysis.status}</Badge>
              <Badge className={getTierColor(analysis.analysisMetadata.tier)}>
                {getTierDisplayName(analysis.analysisMetadata.tier)}
              </Badge>
            </div>
          </div>
        </div>

        {/* Overview Card */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Globe className="h-5 w-5" />
              <span>Website Overview</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div>
                <h4 className="font-medium text-gray-900">Website URL</h4>
                <p className="text-sm text-gray-600 break-all">{analysis.url}</p>
                <a
                  href={analysis.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-innovation-teal hover:text-innovation-teal/80 text-sm inline-flex items-center mt-1"
                >
                  Visit site <ExternalLink className="h-3 w-3 ml-1" />
                </a>
              </div>

              <div>
                <h4 className="font-medium text-gray-900">Site Type</h4>
                <p className="text-sm text-gray-600 capitalize">
                  {analysis.analysisMetadata.siteType}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {analysis.analysisMetadata.analysisMethod}
                </p>
              </div>

              <div>
                <h4 className="font-medium text-gray-900">Pages Found</h4>
                <p className="text-sm text-gray-600">
                  {analysis.analysisMetadata.totalPagesFound} total
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {analysis.discoveredPages.length} analyzed
                </p>
              </div>

              <div>
                <h4 className="font-medium text-gray-900">Created</h4>
                <p className="text-sm text-gray-600">
                  {new Date(analysis.createdAt).toLocaleDateString()}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {new Date(analysis.createdAt).toLocaleTimeString()}
                </p>
              </div>
            </div>

            {analysis.analysisMetadata.message && (
              <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
                <p className="text-sm text-blue-800">{analysis.analysisMetadata.message}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* SPA Detection & Content Coverage (Sprint 1: Phase 1) */}
        {analysis.analysisMetadata.spaDetection && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Eye className="h-5 w-5" />
                <span>Content Analysis</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Framework & Rendering</h4>
                  <RenderingStrategyTag
                    framework={analysis.analysisMetadata.spaDetection.framework}
                  />
                  <p className="text-xs text-gray-500 mt-2">
                    Detected technology stack and how content is rendered
                  </p>
                </div>

                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Content Coverage</h4>
                  <ContentCoverageBadge
                    coverage={analysis.analysisMetadata.spaDetection.contentCoverage.estimatedCoverage}
                    confidence={analysis.analysisMetadata.spaDetection.contentCoverage.confidence}
                    warning={analysis.analysisMetadata.spaDetection.contentCoverageWarning}
                  />
                  <p className="text-xs text-gray-500 mt-2">
                    Estimated percentage of site content captured during analysis
                  </p>
                </div>
              </div>

              {analysis.analysisMetadata.spaDetection.contentCoverageWarning && (
                <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                  <p className="text-sm text-yellow-800">
                    {analysis.analysisMetadata.spaDetection.contentCoverageWarning}
                  </p>
                </div>
              )}

              {/* Detailed signals for advanced users */}
              <details className="mt-4">
                <summary className="text-sm text-gray-600 cursor-pointer hover:text-gray-900">
                  View detection details
                </summary>
                <div className="mt-2 p-3 bg-gray-50 rounded-md text-xs text-gray-600 space-y-1">
                  <p>
                    <strong>Text-to-HTML Ratio:</strong>{' '}
                    {(analysis.analysisMetadata.spaDetection.contentCoverage.signals.textToHtmlRatio * 100).toFixed(1)}%
                  </p>
                  <p>
                    <strong>Has SSR Data:</strong>{' '}
                    {analysis.analysisMetadata.spaDetection.contentCoverage.signals.hasSSRData ? 'Yes' : 'No'}
                  </p>
                  <p>
                    <strong>Has Skeleton UI:</strong>{' '}
                    {analysis.analysisMetadata.spaDetection.contentCoverage.signals.hasSkeletonUI ? 'Yes' : 'No'}
                  </p>
                  <p>
                    <strong>Body Content Length:</strong>{' '}
                    {analysis.analysisMetadata.spaDetection.contentCoverage.signals.bodyContentLength.toLocaleString()} chars
                  </p>
                </div>
              </details>
            </CardContent>
          </Card>
        )}

        {/* Performance Metrics */}
        {analysis.analysisMetadata.metrics && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <BarChart3 className="h-5 w-5" />
                <span>Performance Metrics</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <Zap className="h-6 w-6 text-green-600 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-green-700">
                    {analysis.analysisMetadata.metrics.processingTime.toFixed(1)}s
                  </div>
                  <div className="text-xs text-green-600">Processing Time</div>
                </div>

                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <Activity className="h-6 w-6 text-blue-600 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-blue-700">
                    {analysis.analysisMetadata.metrics.aiCallsUsed}
                  </div>
                  <div className="text-xs text-blue-600">AI Calls Used</div>
                </div>

                <div className="text-center p-4 bg-purple-50 rounded-lg">
                  <FileText className="h-6 w-6 text-purple-600 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-purple-700">
                    {analysis.analysisMetadata.metrics.cachedPages}
                  </div>
                  <div className="text-xs text-purple-600">Cached Pages</div>
                </div>

                <div className="text-center p-4 bg-orange-50 rounded-lg">
                  <Clock className="h-6 w-6 text-orange-600 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-orange-700">
                    ${analysis.analysisMetadata.metrics.estimatedCost.toFixed(3)}
                  </div>
                  <div className="text-xs text-orange-600">Estimated Cost</div>
                </div>
              </div>

              {analysis.analysisMetadata.metrics.cacheHit && (
                <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-md">
                  <p className="text-sm text-green-800">
                    🚀 Cache hit! Saved ${analysis.analysisMetadata.metrics.costSaved.toFixed(3)}
                    and {analysis.analysisMetadata.metrics.timeSaved}s processing time.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Discovered Pages */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <FileText className="h-5 w-5" />
              <span>Discovered Pages</span>
              <Badge variant="outline" className="ml-2">
                {analysis.discoveredPages.length} pages
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {analysis.discoveredPages.length === 0 ? (
              <p className="text-gray-600 text-center py-8">
                No pages were discovered for this analysis.
              </p>
            ) : (
              <div className="space-y-4">
                {analysis.discoveredPages.map((page, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-gray-900 mb-1">
                          {page.title || 'Untitled Page'}
                        </h4>
                        <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                          {page.description || 'No description available'}
                        </p>
                        <p className="text-xs text-innovation-teal break-all">{page.url}</p>
                        {page.lastModified && (
                          <p className="text-xs text-gray-500 mt-1">
                            Last modified: {new Date(page.lastModified).toLocaleDateString()}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center space-x-2 ml-4">
                        <Badge variant="outline" className="text-xs">
                          {page.category}
                        </Badge>
                        <div className="text-right">
                          <div className="text-lg font-semibold text-green-600">
                            {page.qualityScore}
                          </div>
                          <div className="text-xs text-gray-500">Quality</div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex items-center justify-center space-x-4">
          {analysis.status === 'completed' && (
            <Button
              onClick={() => handleRerunAnalysis(analysis.url)}
              className="bg-innovation-teal hover:bg-innovation-teal/90"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Re-run Analysis
            </Button>
          )}

          <Link href="/dashboard">
            <a>
              <Button variant="outline">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Button>
            </a>
          </Link>
        </div>
      </div>
    </div>
  );
}
