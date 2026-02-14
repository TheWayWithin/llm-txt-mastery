import { useState } from 'react';
import { Link } from 'wouter';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  CheckCircle,
  XCircle,
  AlertTriangle,
  Info,
  Search,
  Clock,
  FileText,
  TrendingUp,
  Shield,
  ChevronRight,
  ExternalLink,
  Laptop,
  Server,
  Zap,
  BarChart3,
  Layers,
  FolderOpen,
  ArrowRight,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { AuthNav } from '@/components/AuthNav';
import { Switch } from '@/components/ui/switch';

interface ValidationIssue {
  severity: 'error' | 'warning' | 'info';
  message: string;
  suggestion?: string;
}

interface ValidationRecommendation {
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  example?: string;
  actionUrl?: string;
  actionLabel?: string;
}

interface RobotsConflict {
  conflict: string;
  rule: string;
  llmsTxtPath: string;
  recommendation: string;
}

// SPA Detection Types (Sprint 5)
type RenderingStrategy = 'SSR' | 'SSG' | 'CSR' | 'HYBRID' | 'UNKNOWN';

interface SPAFrameworkIndicators {
  framework: 'react' | 'vue' | 'angular' | 'svelte' | 'next' | 'nuxt' | 'gatsby' | 'astro' | 'wordpress' | 'unknown';
  renderingStrategy: RenderingStrategy;
  indicators: string[];
}

interface ContentCoverageSignals {
  textToHtmlRatio: number;
  hasSSRData: boolean;
  hasSkeletonUI: boolean;
  bodyContentLength: number;
  htmlStructureSize: number;
}

interface ContentCoverageEstimate {
  estimatedCoverage: number;
  confidence: 'high' | 'medium' | 'low';
  signals: ContentCoverageSignals;
}

interface SPADetectionResult {
  isSinglePage: boolean;
  framework: SPAFrameworkIndicators;
  contentCoverage: ContentCoverageEstimate;
  contentCoverageWarning?: string;
}

// Sprint 5: File type options
type LlmsTxtFileType = 'auto' | 'llms.txt' | 'llms-full.txt' | '.well-known' | 'llms.md';

const FILE_TYPE_OPTIONS: { value: LlmsTxtFileType; label: string; path: string }[] = [
  { value: 'auto', label: 'Auto-detect (check all)', path: 'all locations' },
  { value: 'llms.txt', label: 'llms.txt', path: '/llms.txt' },
  { value: 'llms-full.txt', label: 'llms-full.txt', path: '/llms-full.txt' },
  { value: '.well-known', label: '.well-known/llms.txt', path: '/.well-known/llms.txt' },
  { value: 'llms.md', label: 'llms.md', path: '/llms.md' },
];

// Sprint 5 Phase 4: Content Depth Analysis
interface ContentDepthMetrics {
  urlCount: number;
  sectionCount: number;
  wordCount: number;
  hasDescription: boolean;
  descriptionLength: number;
  hasOptionalSection: boolean;
  depthLevel: 'minimal' | 'basic' | 'good' | 'comprehensive';
  depthScore: number;
}

interface ValidationResult {
  valid: boolean;
  score: number;
  processingTime: number;
  issues: ValidationIssue[];
  recommendations: ValidationRecommendation[];
  robotsConflicts?: RobotsConflict[];
  spaDetection?: SPADetectionResult;
  // Sprint 5: Multi-file support
  fileType?: LlmsTxtFileType;
  detectedPath?: string;
  checkedPaths?: string[];
  // Sprint 5 Phase 4: Content depth
  contentDepth?: ContentDepthMetrics;
}

// Sprint 5 Phase 5: Batch validation types
interface BatchValidationFileResult {
  fileType: LlmsTxtFileType;
  path: string;
  found: boolean;
  result?: ValidationResult;
  error?: string;
}

interface BatchValidationComparison {
  bestFile: LlmsTxtFileType;
  bestScore: number;
  inconsistencies: string[];
  recommendation: string;
}

interface BatchValidationResult {
  baseUrl: string;
  results: BatchValidationFileResult[];
  comparison?: BatchValidationComparison;
  processingTime: number;
}

export default function ValidatePage() {
  const { user, isAuthenticated, getAccessToken } = useAuth();
  const [url, setUrl] = useState('');
  const [isValid, setIsValid] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [includeRobotsTxt, setIncludeRobotsTxt] = useState(true);
  const [fileType, setFileType] = useState<LlmsTxtFileType>('auto');
  // Sprint 5 Phase 5: Batch validation state
  const [isBatchValidating, setIsBatchValidating] = useState(false);
  const [batchResult, setBatchResult] = useState<BatchValidationResult | null>(null);

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
    setError(null);
    setValidationResult(null);
    setBatchResult(null); // Sprint 5 Phase 5: Reset batch results
  };

  const handleValidate = async () => {
    if (!isValid || !url) return;

    setIsValidating(true);
    setError(null);
    setValidationResult(null);

    try {
      const normalizedUrl = normalizeUrl(url);
      const API_URL = import.meta.env.VITE_API_URL || '';
      const token = getAccessToken();
      const response = await fetch(`${API_URL}/api/validate-llms-txt`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: JSON.stringify({
          url: normalizedUrl,
          fileType,
          includeRobotsTxt,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 429) {
          setError(
            `Rate limit exceeded: ${data.message || 'Too many requests'}. ${
              data.resetAt
                ? `Try again after ${new Date(data.resetAt).toLocaleTimeString()}`
                : 'Please try again later.'
            }`
          );
        } else {
          setError(data.error || 'Validation failed. Please try again.');
        }
        return;
      }

      // API returns { validation: {...} }
      setValidationResult(data.validation || data);
    } catch (err) {
      setError('Network error. Please check your connection and try again.');
      console.error('Validation error:', err);
    } finally {
      setIsValidating(false);
    }
  };

  // Sprint 5 Phase 5: Batch validation handler
  const handleBatchValidate = async () => {
    if (!isValid || !url) return;

    setIsBatchValidating(true);
    setError(null);
    setBatchResult(null);

    try {
      const normalizedUrl = normalizeUrl(url);
      const API_URL = import.meta.env.VITE_API_URL || '';
      const token = getAccessToken();
      const response = await fetch(`${API_URL}/api/batch-validate-llms-txt`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: JSON.stringify({
          url: normalizedUrl,
          includeRobotsTxt,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 429) {
          setError(
            `Rate limit exceeded: ${data.message || 'Too many requests'}. Please try again later.`
          );
        } else {
          setError(data.error || 'Batch validation failed. Please try again.');
        }
        return;
      }

      setBatchResult(data.batchValidation);
    } catch (err) {
      setError('Network error. Please check your connection and try again.');
      console.error('Batch validation error:', err);
    } finally {
      setIsBatchValidating(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 75) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreBgColor = (score: number) => {
    if (score >= 90) return 'bg-green-50 border-green-200';
    if (score >= 75) return 'bg-yellow-50 border-yellow-200';
    return 'bg-red-50 border-red-200';
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'error':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case 'info':
        return <Info className="h-5 w-5 text-blue-500" />;
      default:
        return <Info className="h-5 w-5 text-gray-500" />;
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'high':
        return <Badge variant="destructive">High</Badge>;
      case 'medium':
        return <Badge className="bg-yellow-500">Medium</Badge>;
      case 'low':
        return <Badge variant="secondary">Low</Badge>;
      default:
        return <Badge variant="outline">{priority}</Badge>;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <Link href="/">
              <a className="flex items-center space-x-3 hover:opacity-80 transition-opacity">
                <img
                  src="/images/logo-primary.png"
                  alt="LLM.txt Mastery"
                  className="h-20 md:h-24 w-auto"
                />
              </a>
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

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Title */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-framework-black mb-3">
            Validate Your llms.txt File
          </h1>
          <p className="text-lg text-ai-silver max-w-2xl mx-auto">
            Check if your llms.txt file follows the official{' '}
            <a
              href="https://llmstxt.org"
              target="_blank"
              rel="noopener noreferrer"
              className="text-innovation-teal hover:underline inline-flex items-center"
            >
              llmstxt.org
              <ExternalLink className="h-3 w-3 ml-1" />
            </a>{' '}
            specification and get actionable recommendations to improve your score.
          </p>
        </div>

        {/* Free Tool Banner */}
        {!isAuthenticated && (
          <Alert className="mb-6 bg-innovation-teal/10 border-innovation-teal">
            <Info className="h-4 w-4 text-innovation-teal" />
            <AlertDescription className="text-framework-black">
              Free validation: 3 checks per day. Need unlimited validations + AI-powered llms.txt generation?{' '}
              <Link href="/pricing">
                <a className="font-semibold text-innovation-teal hover:underline">
                  See plans from $4.95/mo
                </a>
              </Link>
            </AlertDescription>
          </Alert>
        )}

        {/* Validation Input */}
        <Card className="bg-white shadow-sm border border-slate-200 mb-6">
          <CardContent className="p-6">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleValidate();
              }}
              className="space-y-4"
            >
              <div>
                <Label htmlFor="website-url" className="text-sm font-medium text-framework-black">
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
                  We'll check{' '}
                  {url
                    ? fileType === 'auto'
                      ? `${normalizeUrl(url)} at all standard locations`
                      : `${normalizeUrl(url)}${FILE_TYPE_OPTIONS.find((o) => o.value === fileType)?.path}`
                    : fileType === 'auto'
                    ? 'your-site.com at all standard locations'
                    : `your-site.com${FILE_TYPE_OPTIONS.find((o) => o.value === fileType)?.path}`}
                </p>
              </div>

              {/* Sprint 5: File Type Selection */}
              <div>
                <Label htmlFor="file-type" className="text-sm font-medium text-framework-black">
                  File Location
                </Label>
                <Select value={fileType} onValueChange={(value) => setFileType(value as LlmsTxtFileType)}>
                  <SelectTrigger className="mt-2 border-slate-300 focus:ring-innovation-teal">
                    <SelectValue placeholder="Select file type" />
                  </SelectTrigger>
                  <SelectContent>
                    {FILE_TYPE_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="robots-check"
                  checked={includeRobotsTxt}
                  onCheckedChange={setIncludeRobotsTxt}
                />
                <Label htmlFor="robots-check" className="text-sm text-framework-black cursor-pointer">
                  Check for robots.txt conflicts
                </Label>
              </div>

              <div className="flex items-center justify-between pt-4">
                <div className="flex items-center space-x-2 text-sm text-ai-silver">
                  <Shield className="h-4 w-4 text-innovation-teal" />
                  <span>Official llmstxt.org specification validator</span>
                </div>
                <div className="flex items-center space-x-3">
                  {/* Sprint 5 Phase 5: Batch Validation Button */}
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleBatchValidate}
                    disabled={!isValid || isBatchValidating || isValidating}
                    className="border-innovation-teal text-innovation-teal hover:bg-innovation-teal/10 px-6 py-3"
                  >
                    {isBatchValidating ? (
                      <>
                        <Clock className="h-5 w-5 mr-2 animate-spin" />
                        Comparing...
                      </>
                    ) : (
                      <>
                        <Layers className="h-5 w-5 mr-2" />
                        Compare All
                      </>
                    )}
                  </Button>
                  <Button
                    type="submit"
                    disabled={!isValid || isValidating || isBatchValidating}
                    className="bg-innovation-teal hover:bg-innovation-teal/90 text-white px-8 py-3 text-lg"
                  >
                    {isValidating ? (
                      <>
                        <Clock className="h-5 w-5 mr-2 animate-spin" />
                        Validating...
                      </>
                    ) : (
                      <>
                        <Search className="h-5 w-5 mr-2" />
                        Validate File
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Error Display */}
        {error && (
          <Alert variant="destructive" className="mb-6">
            <XCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Sprint 5 Phase 5: Batch Validation Results */}
        {batchResult && (
          <div className="space-y-6 mb-6">
            <Card className="bg-white shadow-sm border border-slate-200">
              <CardContent className="p-6">
                <h3 className="text-xl font-bold text-framework-black mb-4 flex items-center">
                  <Layers className="h-5 w-5 mr-2 text-innovation-teal" />
                  Multi-Path Comparison
                  <span className="ml-auto text-sm font-normal text-ai-silver">
                    {batchResult.processingTime}ms
                  </span>
                </h3>

                {/* File Location Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                  {batchResult.results.map((fileResult) => (
                    <div
                      key={fileResult.path}
                      className={`p-4 rounded-lg border-2 ${
                        fileResult.found
                          ? fileResult.result && fileResult.result.score >= 75
                            ? 'border-green-200 bg-green-50'
                            : 'border-yellow-200 bg-yellow-50'
                          : 'border-slate-200 bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center space-x-2 mb-2">
                        <FolderOpen
                          className={`h-4 w-4 ${
                            fileResult.found ? 'text-green-600' : 'text-slate-400'
                          }`}
                        />
                        <span className="text-sm font-medium text-framework-black">
                          {fileResult.fileType}
                        </span>
                      </div>
                      <p className="text-xs text-ai-silver mb-2">{fileResult.path}</p>
                      {fileResult.found && fileResult.result ? (
                        <div className="flex items-center justify-between">
                          <span
                            className={`text-lg font-bold ${getScoreColor(
                              fileResult.result.score
                            )}`}
                          >
                            {fileResult.result.score}/100
                          </span>
                          <Badge
                            className={
                              fileResult.result.valid
                                ? 'bg-green-100 text-green-800'
                                : 'bg-red-100 text-red-800'
                            }
                          >
                            {fileResult.result.valid ? 'Valid' : 'Issues'}
                          </Badge>
                        </div>
                      ) : (
                        <span className="text-sm text-slate-500">Not found</span>
                      )}
                    </div>
                  ))}
                </div>

                {/* Comparison Summary */}
                {batchResult.comparison && (
                  <div className="border-t border-slate-200 pt-4">
                    <div className="flex items-start space-x-3">
                      <div
                        className={`p-2 rounded-full ${
                          batchResult.comparison.inconsistencies.length > 0
                            ? 'bg-yellow-100'
                            : 'bg-green-100'
                        }`}
                      >
                        {batchResult.comparison.inconsistencies.length > 0 ? (
                          <AlertTriangle className="h-5 w-5 text-yellow-600" />
                        ) : (
                          <CheckCircle className="h-5 w-5 text-green-600" />
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <span className="font-semibold text-framework-black">
                            Best File: {batchResult.comparison.bestFile}
                          </span>
                          <Badge className="bg-innovation-teal text-white">
                            Score: {batchResult.comparison.bestScore}
                          </Badge>
                        </div>
                        <p className="text-sm text-ai-silver mb-2">
                          {batchResult.comparison.recommendation}
                        </p>
                        {batchResult.comparison.inconsistencies.length > 0 && (
                          <div className="bg-yellow-50 rounded-lg p-3 mt-2">
                            <p className="text-xs font-medium text-yellow-800 mb-1">
                              Inconsistencies Detected:
                            </p>
                            <ul className="text-xs text-yellow-700 space-y-1">
                              {batchResult.comparison.inconsistencies.map((inc, i) => (
                                <li key={i}>• {inc}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Validation Results */}
        {validationResult && (
          <div className="space-y-6">
            {/* Score Card */}
            <Card className={`shadow-sm border-2 ${getScoreBgColor(validationResult.score)}`}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-2xl font-bold text-framework-black mb-1">
                      Validation Score
                    </h2>
                    <p className="text-sm text-ai-silver">
                      {validationResult.valid ? (
                        <span className="flex items-center text-green-600">
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Valid llms.txt file
                        </span>
                      ) : (
                        <span className="flex items-center text-red-600">
                          <XCircle className="h-4 w-4 mr-1" />
                          Issues found
                        </span>
                      )}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className={`text-6xl font-bold ${getScoreColor(validationResult.score)}`}>
                      {validationResult.score}
                    </div>
                    <div className="text-sm text-ai-silver">out of 100</div>
                  </div>
                </div>

                {/* Sprint 5: Show detected file path */}
                {validationResult.detectedPath && (
                  <div className="mb-4 p-3 bg-slate-50 rounded-lg">
                    <div className="flex items-center space-x-2 text-sm">
                      <FileText className="h-4 w-4 text-innovation-teal" />
                      <span className="text-ai-silver">File found at:</span>
                      <code className="text-framework-black font-mono bg-white px-2 py-0.5 rounded">
                        {validationResult.detectedPath}
                      </code>
                    </div>
                    {validationResult.checkedPaths && validationResult.checkedPaths.length > 1 && (
                      <p className="text-xs text-ai-silver mt-1 ml-6">
                        Checked: {validationResult.checkedPaths.join(', ')}
                      </p>
                    )}
                  </div>
                )}

                <div className="flex items-center justify-between text-sm text-ai-silver">
                  <span className="flex items-center">
                    <Clock className="h-4 w-4 mr-1" />
                    Processed in {validationResult.processingTime}ms
                  </span>
                  {validationResult.score >= 85 && (
                    <span className="flex items-center text-green-600 font-semibold">
                      <TrendingUp className="h-4 w-4 mr-1" />
                      Excellent quality!
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Issues */}
            {validationResult.issues.length > 0 && (
              <Card className="bg-white shadow-sm border border-slate-200">
                <CardContent className="p-6">
                  <h3 className="text-xl font-bold text-framework-black mb-4 flex items-center">
                    <FileText className="h-5 w-5 mr-2 text-innovation-teal" />
                    Issues Found ({validationResult.issues.length})
                  </h3>
                  <div className="space-y-3">
                    {validationResult.issues.map((issue, index) => (
                      <div
                        key={index}
                        className="flex items-start space-x-3 p-3 bg-slate-50 rounded-lg"
                      >
                        <div className="flex-shrink-0 mt-0.5">{getSeverityIcon(issue.severity)}</div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-framework-black">
                            {issue.message}
                          </p>
                          {issue.suggestion && (
                            <p className="text-sm text-ai-silver mt-1 flex items-start">
                              <ChevronRight className="h-4 w-4 mr-1 flex-shrink-0 mt-0.5 text-innovation-teal" />
                              {issue.suggestion}
                            </p>
                          )}
                        </div>
                        <Badge variant="outline" className="uppercase text-xs">
                          {issue.severity}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Recommendations */}
            {validationResult.recommendations.length > 0 && (
              <Card className="bg-white shadow-sm border border-slate-200">
                <CardContent className="p-6">
                  <h3 className="text-xl font-bold text-framework-black mb-4 flex items-center">
                    <TrendingUp className="h-5 w-5 mr-2 text-innovation-teal" />
                    Recommendations ({validationResult.recommendations.length})
                  </h3>
                  <div className="space-y-3">
                    {validationResult.recommendations.map((rec, index) => (
                      <div
                        key={index}
                        className="flex items-start space-x-3 p-4 bg-slate-50 rounded-lg"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <p className="text-sm font-semibold text-framework-black">
                              {rec.title}
                            </p>
                            {getPriorityBadge(rec.priority)}
                          </div>
                          <p className="text-sm text-ai-silver mb-3">{rec.description}</p>
                          {rec.actionUrl && rec.actionLabel && (
                            <Link
                              href={`${rec.actionUrl}?url=${encodeURIComponent(url)}`}
                              className="inline-flex items-center px-4 py-2 bg-mastery-blue text-white text-sm font-medium rounded-lg hover:bg-mastery-blue/90 transition-colors"
                            >
                              {rec.actionLabel}
                              <ArrowRight className="ml-2 h-4 w-4" />
                            </Link>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Robots.txt Conflicts */}
            {validationResult.robotsConflicts && validationResult.robotsConflicts.length > 0 && (
              <Card className="bg-white shadow-sm border border-slate-200">
                <CardContent className="p-6">
                  <h3 className="text-xl font-bold text-framework-black mb-4 flex items-center">
                    <Shield className="h-5 w-5 mr-2 text-red-500" />
                    Robots.txt Conflicts ({validationResult.robotsConflicts.length})
                  </h3>
                  <div className="space-y-3">
                    {validationResult.robotsConflicts.map((conflict, index) => (
                      <div
                        key={index}
                        className="p-4 bg-red-50 border border-red-200 rounded-lg space-y-2"
                      >
                        <p className="text-sm font-semibold text-red-900">{conflict.conflict}</p>
                        <div className="text-xs text-red-700 space-y-1">
                          <p>
                            <span className="font-medium">Rule:</span> {conflict.rule}
                          </p>
                          <p>
                            <span className="font-medium">Path:</span> {conflict.llmsTxtPath}
                          </p>
                        </div>
                        <p className="text-sm text-red-800 flex items-start">
                          <ChevronRight className="h-4 w-4 mr-1 flex-shrink-0 mt-0.5" />
                          {conflict.recommendation}
                        </p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Universal Compatibility - SPA Detection (Sprint 5) */}
            {validationResult.spaDetection && (
              <Card className="bg-white shadow-sm border border-slate-200">
                <CardContent className="p-6">
                  <h3 className="text-xl font-bold text-framework-black mb-4 flex items-center">
                    <Laptop className="h-5 w-5 mr-2 text-innovation-teal" />
                    Universal Compatibility
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Framework Detection */}
                    <div className="p-4 bg-slate-50 rounded-lg">
                      <div className="flex items-center space-x-2 mb-2">
                        <Zap className="h-4 w-4 text-innovation-teal" />
                        <span className="text-sm font-medium text-ai-silver">Framework</span>
                      </div>
                      <p className="text-lg font-semibold text-framework-black capitalize">
                        {validationResult.spaDetection.framework.framework === 'unknown'
                          ? 'Traditional'
                          : validationResult.spaDetection.framework.framework}
                      </p>
                    </div>

                    {/* Rendering Strategy */}
                    <div className="p-4 bg-slate-50 rounded-lg">
                      <div className="flex items-center space-x-2 mb-2">
                        <Server className="h-4 w-4 text-innovation-teal" />
                        <span className="text-sm font-medium text-ai-silver">Rendering</span>
                      </div>
                      <p className="text-lg font-semibold text-framework-black">
                        {validationResult.spaDetection.framework.renderingStrategy === 'SSR' && 'Server-Side'}
                        {validationResult.spaDetection.framework.renderingStrategy === 'SSG' && 'Static (SSG)'}
                        {validationResult.spaDetection.framework.renderingStrategy === 'CSR' && 'Client-Side'}
                        {validationResult.spaDetection.framework.renderingStrategy === 'HYBRID' && 'Hybrid'}
                        {validationResult.spaDetection.framework.renderingStrategy === 'UNKNOWN' && 'Traditional'}
                      </p>
                    </div>

                    {/* Content Coverage */}
                    <div className="p-4 bg-slate-50 rounded-lg">
                      <div className="flex items-center space-x-2 mb-2">
                        <FileText className="h-4 w-4 text-innovation-teal" />
                        <span className="text-sm font-medium text-ai-silver">Content Coverage</span>
                      </div>
                      <p className={`text-lg font-semibold ${
                        validationResult.spaDetection.contentCoverage.estimatedCoverage >= 70
                          ? 'text-green-600'
                          : validationResult.spaDetection.contentCoverage.estimatedCoverage >= 40
                          ? 'text-yellow-600'
                          : 'text-red-600'
                      }`}>
                        {validationResult.spaDetection.contentCoverage.estimatedCoverage}%
                        <span className="text-xs text-ai-silver ml-1">
                          ({validationResult.spaDetection.contentCoverage.confidence})
                        </span>
                      </p>
                    </div>
                  </div>

                  {/* Coverage Warning */}
                  {validationResult.spaDetection.contentCoverageWarning && (
                    <Alert className="mt-4 bg-yellow-50 border-yellow-200">
                      <AlertTriangle className="h-4 w-4 text-yellow-600" />
                      <AlertDescription className="text-yellow-800">
                        {validationResult.spaDetection.contentCoverageWarning}
                      </AlertDescription>
                    </Alert>
                  )}

                  {/* Technical Details (collapsed by default) */}
                  {validationResult.spaDetection.framework.indicators.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-slate-200">
                      <p className="text-xs text-ai-silver">
                        <span className="font-medium">Detection signals:</span>{' '}
                        {validationResult.spaDetection.framework.indicators.join(', ')}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Content Depth Analysis (Sprint 5 Phase 4) */}
            {validationResult.contentDepth && (
              <Card className="bg-white shadow-sm border border-slate-200">
                <CardContent className="p-6">
                  <h3 className="text-xl font-bold text-framework-black mb-4 flex items-center">
                    <BarChart3 className="h-5 w-5 mr-2 text-innovation-teal" />
                    Content Depth Analysis
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    {/* URLs */}
                    <div className="p-4 bg-slate-50 rounded-lg text-center">
                      <p className="text-2xl font-bold text-framework-black">
                        {validationResult.contentDepth.urlCount}
                      </p>
                      <p className="text-xs text-ai-silver">URLs</p>
                    </div>

                    {/* Sections */}
                    <div className="p-4 bg-slate-50 rounded-lg text-center">
                      <p className="text-2xl font-bold text-framework-black">
                        {validationResult.contentDepth.sectionCount}
                      </p>
                      <p className="text-xs text-ai-silver">Sections</p>
                    </div>

                    {/* Words */}
                    <div className="p-4 bg-slate-50 rounded-lg text-center">
                      <p className="text-2xl font-bold text-framework-black">
                        {validationResult.contentDepth.wordCount}
                      </p>
                      <p className="text-xs text-ai-silver">Words</p>
                    </div>

                    {/* Depth Score */}
                    <div className="p-4 bg-slate-50 rounded-lg text-center">
                      <p className={`text-2xl font-bold ${
                        validationResult.contentDepth.depthScore >= 80
                          ? 'text-green-600'
                          : validationResult.contentDepth.depthScore >= 55
                          ? 'text-blue-600'
                          : validationResult.contentDepth.depthScore >= 30
                          ? 'text-yellow-600'
                          : 'text-red-600'
                      }`}>
                        {validationResult.contentDepth.depthScore}
                      </p>
                      <p className="text-xs text-ai-silver">Depth Score</p>
                    </div>
                  </div>

                  {/* Depth Level Badge */}
                  <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-200">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-ai-silver">Content Level:</span>
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                        validationResult.contentDepth.depthLevel === 'comprehensive'
                          ? 'bg-green-100 text-green-800'
                          : validationResult.contentDepth.depthLevel === 'good'
                          ? 'bg-blue-100 text-blue-800'
                          : validationResult.contentDepth.depthLevel === 'basic'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {validationResult.contentDepth.depthLevel.charAt(0).toUpperCase() +
                          validationResult.contentDepth.depthLevel.slice(1)}
                      </span>
                    </div>
                    <div className="flex items-center space-x-3 text-xs text-ai-silver">
                      {validationResult.contentDepth.hasDescription && (
                        <span className="flex items-center">
                          <CheckCircle className="h-3 w-3 text-green-500 mr-1" />
                          Description
                        </span>
                      )}
                      {validationResult.contentDepth.hasOptionalSection && (
                        <span className="flex items-center">
                          <CheckCircle className="h-3 w-3 text-green-500 mr-1" />
                          Optional Section
                        </span>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Success State - No Issues */}
            {validationResult.issues.length === 0 &&
              validationResult.recommendations.length === 0 && (
                <Card className="bg-green-50 border-green-200 shadow-sm">
                  <CardContent className="p-6 text-center">
                    <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
                    <h3 className="text-2xl font-bold text-green-900 mb-2">Perfect Score!</h3>
                    <p className="text-green-700">
                      Your llms.txt file follows all best practices and has no issues.
                    </p>
                  </CardContent>
                </Card>
              )}

            {/* CTA */}
            <Card className="bg-gradient-to-r from-innovation-teal to-blue-500 text-white shadow-lg">
              <CardContent className="p-6 text-center">
                <h3 className="text-2xl font-bold mb-2">Want to improve your score?</h3>
                <p className="mb-4 text-white/90">
                  Use our AI-powered analyzer to automatically generate a perfect llms.txt file for
                  your website.
                </p>
                <Link href="/analyze">
                  <a>
                    <Button
                      size="lg"
                      className="bg-white text-innovation-teal hover:bg-slate-100 font-semibold"
                    >
                      Analyze & Generate llms.txt
                      <ChevronRight className="h-5 w-5 ml-2" />
                    </Button>
                  </a>
                </Link>
              </CardContent>
            </Card>
          </div>
        )}

        {/* How It Works */}
        {!validationResult && !error && (
          <Card className="bg-white shadow-sm border border-slate-200 mt-6">
            <CardContent className="p-6">
              <h3 className="text-xl font-bold text-framework-black mb-4">How It Works</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="w-12 h-12 bg-innovation-teal/10 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Search className="h-6 w-6 text-innovation-teal" />
                  </div>
                  <h4 className="font-semibold text-framework-black mb-2">1. Enter URL</h4>
                  <p className="text-sm text-ai-silver">
                    We'll fetch and analyze your llms.txt file from your website
                  </p>
                </div>
                <div className="text-center">
                  <div className="w-12 h-12 bg-innovation-teal/10 rounded-full flex items-center justify-center mx-auto mb-3">
                    <FileText className="h-6 w-6 text-innovation-teal" />
                  </div>
                  <h4 className="font-semibold text-framework-black mb-2">2. Get Score</h4>
                  <p className="text-sm text-ai-silver">
                    Receive a detailed score based on official llmstxt.org standards
                  </p>
                </div>
                <div className="text-center">
                  <div className="w-12 h-12 bg-innovation-teal/10 rounded-full flex items-center justify-center mx-auto mb-3">
                    <TrendingUp className="h-6 w-6 text-innovation-teal" />
                  </div>
                  <h4 className="font-semibold text-framework-black mb-2">3. Improve</h4>
                  <p className="text-sm text-ai-silver">
                    Follow our recommendations to achieve a perfect score
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
