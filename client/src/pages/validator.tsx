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
  Target,
  Eye,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { AuthNav } from '@/components/AuthNav';
import { Switch } from '@/components/ui/switch';
import Footer from '@/components/footer';
import PricingPreview from '@/components/landing/PricingPreview';
import TrustBadges from '@/components/landing/TrustBadges';
import { useSEO } from '@/hooks/useSEO';

// --- Shared types (same as validate.tsx) ---

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

type LlmsTxtFileType = 'auto' | 'llms.txt' | 'llms-full.txt' | '.well-known' | 'llms.md';

const FILE_TYPE_OPTIONS: { value: LlmsTxtFileType; label: string; path: string }[] = [
  { value: 'auto', label: 'Auto-detect (check all)', path: 'all locations' },
  { value: 'llms.txt', label: 'llms.txt', path: '/llms.txt' },
  { value: 'llms-full.txt', label: 'llms-full.txt', path: '/llms-full.txt' },
  { value: '.well-known', label: '.well-known/llms.txt', path: '/.well-known/llms.txt' },
  { value: 'llms.md', label: 'llms.md', path: '/llms.md' },
];

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
  fileType?: LlmsTxtFileType;
  detectedPath?: string;
  checkedPaths?: string[];
  contentDepth?: ContentDepthMetrics;
}

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

// --- Component ---

export default function ValidatorPage() {
  const { user, isAuthenticated, getAccessToken } = useAuth();
  const [url, setUrl] = useState('');
  const [isValid, setIsValid] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [includeRobotsTxt, setIncludeRobotsTxt] = useState(true);
  const [fileType, setFileType] = useState<LlmsTxtFileType>('auto');
  const [isBatchValidating, setIsBatchValidating] = useState(false);
  const [batchResult, setBatchResult] = useState<BatchValidationResult | null>(null);

  useSEO({
    title: 'Free llms.txt Validator - Check Your AI Readiness | LLM.txt Mastery',
    description: 'Validate your llms.txt file for free. Check robots.txt conflicts, content quality, and framework compatibility. The only validator that catches silent AI blocking issues.',
  });

  const normalizeUrl = (value: string) => {
    if (!value.trim()) return value;
    if (/^https?:\/\//.test(value)) return value;
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
    setBatchResult(null);
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

      setValidationResult(data.validation || data);
    } catch (err) {
      setError('Network error. Please check your connection and try again.');
      console.error('Validation error:', err);
    } finally {
      setIsValidating(false);
    }
  };

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
    if (score >= 90) return 'text-success';
    if (score >= 75) return 'text-action-amber';
    return 'text-error';
  };

  const getScoreBgColor = (score: number) => {
    if (score >= 90) return 'bg-success/10 border-mist';
    if (score >= 75) return 'bg-action-amber/10 border-action-amber/40';
    return 'bg-error/10 border-mist';
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'error':
        return <XCircle className="h-5 w-5 text-error" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-action-amber" />;
      case 'info':
        return <Info className="h-5 w-5 text-signal-blue" />;
      default:
        return <Info className="h-5 w-5 text-stone-brand" />;
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'high':
        return <Badge variant="destructive">High</Badge>;
      case 'medium':
        return <Badge className="bg-action-amber/100">Medium</Badge>;
      case 'low':
        return <Badge variant="secondary">Low</Badge>;
      default:
        return <Badge variant="outline">{priority}</Badge>;
    }
  };

  // Determine post-validation CTA messaging
  const getPostValidationCTA = () => {
    if (!validationResult) return null;
    const score = validationResult.score;
    if (score >= 90) {
      return {
        headline: 'Great Score! Now Generate the Perfect File.',
        description: 'Your llms.txt is well-structured. Take the next step — let our AI analyzer generate a comprehensive, quality-scored llms.txt that ensures AI systems cite your best content.',
        ctaText: 'Generate Your llms.txt File',
        urgency: 'You\'re ahead of 90% of websites. Lock in your advantage.',
      };
    }
    if (score >= 75) {
      return {
        headline: 'Good Start — Let\'s Make It Great.',
        description: 'You\'re close! Our AI-powered generator will fix the remaining issues and create a file optimized for maximum AI visibility.',
        ctaText: 'Fix & Generate Automatically',
        urgency: 'Most sites score below 50. A few improvements could set you apart.',
      };
    }
    return {
      headline: 'Issues Found — We Can Fix This Automatically.',
      description: 'Don\'t worry — our AI-powered analyzer will scan your entire site, prioritize your best content by quality, and generate a perfect llms.txt file.',
      ctaText: 'Fix My Site\'s AI Visibility',
      urgency: 'Without a proper llms.txt, AI systems like ChatGPT and Claude can\'t find your content.',
    };
  };

  return (
    <div className="min-h-screen bg-cloud">
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
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="bg-gradient-to-b from-white to-slate-50 border-b border-mist">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 text-center">
          <div className="inline-flex items-center justify-center px-4 py-2 bg-signal-blue/10 border border-signal-blue/30 rounded-full mb-6">
            <Shield className="h-4 w-4 text-signal-blue mr-2" />
            <span className="text-sm font-semibold text-signal-blue">100% Free — No Sign-up Required</span>
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-ink mb-4">
            Is Your Website Visible to{' '}
            <span className="text-signal-blue">AI Search?</span>
          </h1>
          <p className="text-lg text-slate-brand max-w-2xl mx-auto mb-6">
            ChatGPT, Claude, and Perplexity are crawling websites right now. Validate your llms.txt file
            in seconds — and find out if AI can actually discover your content.
          </p>

          {/* Trust Signals */}
          <div className="flex flex-wrap items-center justify-center gap-4 text-sm text-slate-brand mb-2">
            <div className="flex items-center space-x-1">
              <CheckCircle className="h-4 w-4 text-success" />
              <span>Official llmstxt.org spec</span>
            </div>
            <div className="flex items-center space-x-1">
              <CheckCircle className="h-4 w-4 text-success" />
              <span>robots.txt conflict check</span>
            </div>
            <div className="flex items-center space-x-1">
              <CheckCircle className="h-4 w-4 text-success" />
              <span>Framework detection</span>
            </div>
            <div className="flex items-center space-x-1">
              <CheckCircle className="h-4 w-4 text-success" />
              <span>All 4 file locations</span>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Free Tool Banner for non-authenticated */}
        {!isAuthenticated && (
          <Alert className="mb-6 bg-signal-blue/10 border-signal-blue">
            <Info className="h-4 w-4 text-signal-blue" />
            <AlertDescription className="text-ink">
              Free validation: 3 checks per day. Need unlimited validations + AI-powered llms.txt generation?{' '}
              <Link href="/pricing">
                <a className="font-semibold text-signal-blue hover:underline">
                  See plans from $4.95/mo
                </a>
              </Link>
            </AlertDescription>
          </Alert>
        )}

        {/* Validation Input Card */}
        <Card className="bg-white shadow-md border border-mist mb-6">
          <CardContent className="p-6">
            <h2 className="text-xl font-bold text-ink mb-4 flex items-center">
              <Search className="h-5 w-5 mr-2 text-signal-blue" />
              Validate Your llms.txt File
            </h2>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleValidate();
              }}
              className="space-y-4"
            >
              <div>
                <Label htmlFor="website-url" className="text-sm font-medium text-ink">
                  Website URL
                </Label>
                <div className="relative mt-2">
                  <Input
                    id="website-url"
                    type="text"
                    placeholder="www.example.com or https://example.com"
                    value={url}
                    onChange={handleInputChange}
                    className="pr-12 border-mist focus:ring-signal-blue focus:border-signal-blue text-lg py-3"
                  />
                  {isValid && (
                    <div className="absolute right-3 top-3">
                      <CheckCircle className="h-5 w-5 text-success" />
                    </div>
                  )}
                </div>
                <p className="mt-2 text-sm text-slate-brand">
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

              {/* File Type Selection */}
              <div>
                <Label htmlFor="file-type" className="text-sm font-medium text-ink">
                  File Location
                </Label>
                <Select value={fileType} onValueChange={(value) => setFileType(value as LlmsTxtFileType)}>
                  <SelectTrigger className="mt-2 border-mist focus:ring-signal-blue">
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
                <Label htmlFor="robots-check" className="text-sm text-ink cursor-pointer">
                  Check for robots.txt conflicts{' '}
                  <span className="text-signal-blue font-medium">(unique feature)</span>
                </Label>
              </div>

              <div className="flex items-center justify-between pt-4">
                <div className="flex items-center space-x-2 text-sm text-slate-brand">
                  <Shield className="h-4 w-4 text-signal-blue" />
                  <span>Official llmstxt.org specification validator</span>
                </div>
                <div className="flex items-center space-x-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleBatchValidate}
                    disabled={!isValid || isBatchValidating || isValidating}
                    className="border-signal-blue text-signal-blue hover:bg-signal-blue/10 px-6 py-3"
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
                    className="bg-signal-blue hover:bg-signal-blue/90 text-white px-8 py-3 text-lg"
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

        {/* Batch Validation Results */}
        {batchResult && (
          <div className="space-y-6 mb-6">
            <Card className="bg-white shadow-sm border border-mist">
              <CardContent className="p-6">
                <h3 className="text-xl font-bold text-ink mb-4 flex items-center">
                  <Layers className="h-5 w-5 mr-2 text-signal-blue" />
                  Multi-Path Comparison
                  <span className="ml-auto text-sm font-normal text-slate-brand">
                    {batchResult.processingTime}ms
                  </span>
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                  {batchResult.results.map((fileResult) => (
                    <div
                      key={fileResult.path}
                      className={`p-4 rounded-lg border-2 ${
                        fileResult.found
                          ? fileResult.result && fileResult.result.score >= 75
                            ? 'border-mist bg-success/10'
                            : 'border-action-amber/40 bg-action-amber/10'
                          : 'border-mist bg-cloud'
                      }`}
                    >
                      <div className="flex items-center space-x-2 mb-2">
                        <FolderOpen
                          className={`h-4 w-4 ${
                            fileResult.found ? 'text-success' : 'text-slate-400'
                          }`}
                        />
                        <span className="text-sm font-medium text-ink">
                          {fileResult.fileType}
                        </span>
                      </div>
                      <p className="text-xs text-slate-brand mb-2">{fileResult.path}</p>
                      {fileResult.found && fileResult.result ? (
                        <div className="flex items-center justify-between">
                          <span
                            className={`text-lg font-bold ${getScoreColor(fileResult.result.score)}`}
                          >
                            {fileResult.result.score}/100
                          </span>
                          <Badge
                            className={
                              fileResult.result.valid
                                ? 'bg-success/10 text-ink'
                                : 'bg-error/10 text-error'
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

                {batchResult.comparison && (
                  <div className="border-t border-mist pt-4">
                    <div className="flex items-start space-x-3">
                      <div
                        className={`p-2 rounded-full ${
                          batchResult.comparison.inconsistencies.length > 0
                            ? 'bg-action-amber/10'
                            : 'bg-success/10'
                        }`}
                      >
                        {batchResult.comparison.inconsistencies.length > 0 ? (
                          <AlertTriangle className="h-5 w-5 text-action-amber" />
                        ) : (
                          <CheckCircle className="h-5 w-5 text-success" />
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <span className="font-semibold text-ink">
                            Best File: {batchResult.comparison.bestFile}
                          </span>
                          <Badge className="bg-signal-blue text-white">
                            Score: {batchResult.comparison.bestScore}
                          </Badge>
                        </div>
                        <p className="text-sm text-slate-brand mb-2">
                          {batchResult.comparison.recommendation}
                        </p>
                        {batchResult.comparison.inconsistencies.length > 0 && (
                          <div className="bg-action-amber/10 rounded-lg p-3 mt-2">
                            <p className="text-xs font-medium text-ink mb-1">
                              Inconsistencies Detected:
                            </p>
                            <ul className="text-xs text-ink space-y-1">
                              {batchResult.comparison.inconsistencies.map((inc, i) => (
                                <li key={i}>&#8226; {inc}</li>
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
                    <h2 className="text-2xl font-bold text-ink mb-1">
                      Validation Score
                    </h2>
                    <p className="text-sm text-slate-brand">
                      {validationResult.valid ? (
                        <span className="flex items-center text-success">
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Valid llms.txt file
                        </span>
                      ) : (
                        <span className="flex items-center text-error">
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
                    <div className="text-sm text-slate-brand">out of 100</div>
                  </div>
                </div>

                {validationResult.detectedPath && (
                  <div className="mb-4 p-3 bg-cloud rounded-lg">
                    <div className="flex items-center space-x-2 text-sm">
                      <FileText className="h-4 w-4 text-signal-blue" />
                      <span className="text-slate-brand">File found at:</span>
                      <code className="text-ink font-mono bg-white px-2 py-0.5 rounded">
                        {validationResult.detectedPath}
                      </code>
                    </div>
                    {validationResult.checkedPaths && validationResult.checkedPaths.length > 1 && (
                      <p className="text-xs text-slate-brand mt-1 ml-6">
                        Checked: {validationResult.checkedPaths.join(', ')}
                      </p>
                    )}
                  </div>
                )}

                <div className="flex items-center justify-between text-sm text-slate-brand">
                  <span className="flex items-center">
                    <Clock className="h-4 w-4 mr-1" />
                    Processed in {validationResult.processingTime}ms
                  </span>
                  {validationResult.score >= 85 && (
                    <span className="flex items-center text-success font-semibold">
                      <TrendingUp className="h-4 w-4 mr-1" />
                      Excellent quality!
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Issues */}
            {validationResult.issues.length > 0 && (
              <Card className="bg-white shadow-sm border border-mist">
                <CardContent className="p-6">
                  <h3 className="text-xl font-bold text-ink mb-4 flex items-center">
                    <FileText className="h-5 w-5 mr-2 text-signal-blue" />
                    Issues Found ({validationResult.issues.length})
                  </h3>
                  <div className="space-y-3">
                    {validationResult.issues.map((issue, index) => (
                      <div
                        key={index}
                        className="flex items-start space-x-3 p-3 bg-cloud rounded-lg"
                      >
                        <div className="flex-shrink-0 mt-0.5">{getSeverityIcon(issue.severity)}</div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-ink">
                            {issue.message}
                          </p>
                          {issue.suggestion && (
                            <p className="text-sm text-slate-brand mt-1 flex items-start">
                              <ChevronRight className="h-4 w-4 mr-1 flex-shrink-0 mt-0.5 text-signal-blue" />
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
              <Card className="bg-white shadow-sm border border-mist">
                <CardContent className="p-6">
                  <h3 className="text-xl font-bold text-ink mb-4 flex items-center">
                    <TrendingUp className="h-5 w-5 mr-2 text-signal-blue" />
                    Recommendations ({validationResult.recommendations.length})
                  </h3>
                  <div className="space-y-3">
                    {validationResult.recommendations.map((rec, index) => (
                      <div
                        key={index}
                        className="flex items-start space-x-3 p-4 bg-cloud rounded-lg"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <p className="text-sm font-semibold text-ink">
                              {rec.title}
                            </p>
                            {getPriorityBadge(rec.priority)}
                          </div>
                          <p className="text-sm text-slate-brand mb-3">{rec.description}</p>
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
              <Card className="bg-white shadow-sm border border-mist">
                <CardContent className="p-6">
                  <h3 className="text-xl font-bold text-ink mb-4 flex items-center">
                    <Shield className="h-5 w-5 mr-2 text-error" />
                    Robots.txt Conflicts ({validationResult.robotsConflicts.length})
                  </h3>
                  <div className="space-y-3">
                    {validationResult.robotsConflicts.map((conflict, index) => (
                      <div
                        key={index}
                        className="p-4 bg-error/10 border border-mist rounded-lg space-y-2"
                      >
                        <p className="text-sm font-semibold text-ink">{conflict.conflict}</p>
                        <div className="text-xs text-error space-y-1">
                          <p>
                            <span className="font-medium">Rule:</span> {conflict.rule}
                          </p>
                          <p>
                            <span className="font-medium">Path:</span> {conflict.llmsTxtPath}
                          </p>
                        </div>
                        <p className="text-sm text-error flex items-start">
                          <ChevronRight className="h-4 w-4 mr-1 flex-shrink-0 mt-0.5" />
                          {conflict.recommendation}
                        </p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Universal Compatibility - SPA Detection */}
            {validationResult.spaDetection && (
              <Card className="bg-white shadow-sm border border-mist">
                <CardContent className="p-6">
                  <h3 className="text-xl font-bold text-ink mb-4 flex items-center">
                    <Laptop className="h-5 w-5 mr-2 text-signal-blue" />
                    Universal Compatibility
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-4 bg-cloud rounded-lg">
                      <div className="flex items-center space-x-2 mb-2">
                        <Zap className="h-4 w-4 text-signal-blue" />
                        <span className="text-sm font-medium text-slate-brand">Framework</span>
                      </div>
                      <p className="text-lg font-semibold text-ink capitalize">
                        {validationResult.spaDetection.framework.framework === 'unknown'
                          ? 'Traditional'
                          : validationResult.spaDetection.framework.framework}
                      </p>
                    </div>
                    <div className="p-4 bg-cloud rounded-lg">
                      <div className="flex items-center space-x-2 mb-2">
                        <Server className="h-4 w-4 text-signal-blue" />
                        <span className="text-sm font-medium text-slate-brand">Rendering</span>
                      </div>
                      <p className="text-lg font-semibold text-ink">
                        {validationResult.spaDetection.framework.renderingStrategy === 'SSR' && 'Server-Side'}
                        {validationResult.spaDetection.framework.renderingStrategy === 'SSG' && 'Static (SSG)'}
                        {validationResult.spaDetection.framework.renderingStrategy === 'CSR' && 'Client-Side'}
                        {validationResult.spaDetection.framework.renderingStrategy === 'HYBRID' && 'Hybrid'}
                        {validationResult.spaDetection.framework.renderingStrategy === 'UNKNOWN' && 'Traditional'}
                      </p>
                    </div>
                    <div className="p-4 bg-cloud rounded-lg">
                      <div className="flex items-center space-x-2 mb-2">
                        <FileText className="h-4 w-4 text-signal-blue" />
                        <span className="text-sm font-medium text-slate-brand">Content Coverage</span>
                      </div>
                      <p className={`text-lg font-semibold ${
                        validationResult.spaDetection.contentCoverage.estimatedCoverage >= 70
                          ? 'text-success'
                          : validationResult.spaDetection.contentCoverage.estimatedCoverage >= 40
                          ? 'text-action-amber'
                          : 'text-error'
                      }`}>
                        {validationResult.spaDetection.contentCoverage.estimatedCoverage}%
                        <span className="text-xs text-slate-brand ml-1">
                          ({validationResult.spaDetection.contentCoverage.confidence})
                        </span>
                      </p>
                    </div>
                  </div>
                  {validationResult.spaDetection.contentCoverageWarning && (
                    <Alert className="mt-4 bg-action-amber/10 border-action-amber/40">
                      <AlertTriangle className="h-4 w-4 text-action-amber" />
                      <AlertDescription className="text-ink">
                        {validationResult.spaDetection.contentCoverageWarning}
                      </AlertDescription>
                    </Alert>
                  )}
                  {validationResult.spaDetection.framework.indicators.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-mist">
                      <p className="text-xs text-slate-brand">
                        <span className="font-medium">Detection signals:</span>{' '}
                        {validationResult.spaDetection.framework.indicators.join(', ')}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Content Depth Analysis */}
            {validationResult.contentDepth && (
              <Card className="bg-white shadow-sm border border-mist">
                <CardContent className="p-6">
                  <h3 className="text-xl font-bold text-ink mb-4 flex items-center">
                    <BarChart3 className="h-5 w-5 mr-2 text-signal-blue" />
                    Content Depth Analysis
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    <div className="p-4 bg-cloud rounded-lg text-center">
                      <p className="text-2xl font-bold text-ink">
                        {validationResult.contentDepth.urlCount}
                      </p>
                      <p className="text-xs text-slate-brand">URLs</p>
                    </div>
                    <div className="p-4 bg-cloud rounded-lg text-center">
                      <p className="text-2xl font-bold text-ink">
                        {validationResult.contentDepth.sectionCount}
                      </p>
                      <p className="text-xs text-slate-brand">Sections</p>
                    </div>
                    <div className="p-4 bg-cloud rounded-lg text-center">
                      <p className="text-2xl font-bold text-ink">
                        {validationResult.contentDepth.wordCount}
                      </p>
                      <p className="text-xs text-slate-brand">Words</p>
                    </div>
                    <div className="p-4 bg-cloud rounded-lg text-center">
                      <p className={`text-2xl font-bold ${
                        validationResult.contentDepth.depthScore >= 80
                          ? 'text-success'
                          : validationResult.contentDepth.depthScore >= 55
                          ? 'text-signal-blue'
                          : validationResult.contentDepth.depthScore >= 30
                          ? 'text-action-amber'
                          : 'text-error'
                      }`}>
                        {validationResult.contentDepth.depthScore}
                      </p>
                      <p className="text-xs text-slate-brand">Depth Score</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-4 pt-4 border-t border-mist">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-slate-brand">Content Level:</span>
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                        validationResult.contentDepth.depthLevel === 'comprehensive'
                          ? 'bg-success/10 text-ink'
                          : validationResult.contentDepth.depthLevel === 'good'
                          ? 'bg-signal-blue/10 text-mastery-blue'
                          : validationResult.contentDepth.depthLevel === 'basic'
                          ? 'bg-action-amber/10 text-ink'
                          : 'bg-error/10 text-error'
                      }`}>
                        {validationResult.contentDepth.depthLevel.charAt(0).toUpperCase() +
                          validationResult.contentDepth.depthLevel.slice(1)}
                      </span>
                    </div>
                    <div className="flex items-center space-x-3 text-xs text-slate-brand">
                      {validationResult.contentDepth.hasDescription && (
                        <span className="flex items-center">
                          <CheckCircle className="h-3 w-3 text-success mr-1" />
                          Description
                        </span>
                      )}
                      {validationResult.contentDepth.hasOptionalSection && (
                        <span className="flex items-center">
                          <CheckCircle className="h-3 w-3 text-success mr-1" />
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
                <Card className="bg-success/10 border-mist shadow-sm">
                  <CardContent className="p-6 text-center">
                    <CheckCircle className="h-16 w-16 text-success mx-auto mb-4" />
                    <h3 className="text-2xl font-bold text-ink mb-2">Perfect Score!</h3>
                    <p className="text-success">
                      Your llms.txt file follows all best practices and has no issues.
                    </p>
                  </CardContent>
                </Card>
              )}

            {/* POST-VALIDATION SALES FUNNEL CTA */}
            {(() => {
              const cta = getPostValidationCTA();
              if (!cta) return null;
              return (
                <Card className="bg-gradient-to-r from-mastery-blue to-signal-blue text-white shadow-lg border-0">
                  <CardContent className="p-8 text-center">
                    <Target className="h-10 w-10 mx-auto mb-4 text-white/80" />
                    <h3 className="text-2xl sm:text-3xl font-bold mb-3">{cta.headline}</h3>
                    <p className="text-white/90 mb-2 max-w-2xl mx-auto">{cta.description}</p>
                    <p className="text-sm text-white/70 mb-6">{cta.urgency}</p>
                    <div className="flex flex-col sm:flex-row justify-center gap-4">
                      <Button
                        size="lg"
                        className="bg-white text-mastery-blue hover:bg-cloud font-semibold px-8"
                        onClick={() => {
                          if (user) {
                            window.location.href = `/analyze?url=${encodeURIComponent(normalizeUrl(url))}`;
                          } else {
                            window.location.href = `/signup?url=${encodeURIComponent(normalizeUrl(url))}`;
                          }
                        }}
                      >
                        {cta.ctaText}
                        <ArrowRight className="h-5 w-5 ml-2" />
                      </Button>
                      <Link href="/pricing">
                        <a>
                          <Button
                            size="lg"
                            variant="outline"
                            className="border-white/50 text-white hover:bg-white/10"
                          >
                            View Pricing
                          </Button>
                        </a>
                      </Link>
                    </div>
                    <div className="flex items-center justify-center gap-4 mt-6 text-sm text-white/70">
                      <span className="flex items-center"><CheckCircle className="h-4 w-4 mr-1" /> Free tier available</span>
                      <span className="flex items-center"><Shield className="h-4 w-4 mr-1" /> 30-day money-back</span>
                    </div>
                  </CardContent>
                </Card>
              );
            })()}
          </div>
        )}

        {/* Pre-Validation Content (only shows before results) */}
        {!validationResult && !batchResult && !error && (
          <>
            {/* How It Works */}
            <Card className="bg-white shadow-sm border border-mist mt-6 mb-8">
              <CardContent className="p-6">
                <h3 className="text-xl font-bold text-ink mb-4 text-center">
                  How Validation Works
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="text-center">
                    <div className="w-12 h-12 bg-signal-blue/10 rounded-full flex items-center justify-center mx-auto mb-3">
                      <Search className="h-6 w-6 text-signal-blue" />
                    </div>
                    <h4 className="font-semibold text-ink mb-2">1. Enter URL</h4>
                    <p className="text-sm text-slate-brand">
                      We'll fetch and analyze your llms.txt file from all standard locations
                    </p>
                  </div>
                  <div className="text-center">
                    <div className="w-12 h-12 bg-signal-blue/10 rounded-full flex items-center justify-center mx-auto mb-3">
                      <FileText className="h-6 w-6 text-signal-blue" />
                    </div>
                    <h4 className="font-semibold text-ink mb-2">2. Get Your Score</h4>
                    <p className="text-sm text-slate-brand">
                      Receive a detailed score based on the official llmstxt.org specification
                    </p>
                  </div>
                  <div className="text-center">
                    <div className="w-12 h-12 bg-signal-blue/10 rounded-full flex items-center justify-center mx-auto mb-3">
                      <TrendingUp className="h-6 w-6 text-signal-blue" />
                    </div>
                    <h4 className="font-semibold text-ink mb-2">3. Take Action</h4>
                    <p className="text-sm text-slate-brand">
                      Get recommendations and fix issues automatically with our AI generator
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* What Makes Our Validator Different */}
            <section className="mb-8">
              <div className="bg-gradient-to-r from-mastery-blue/10 to-signal-blue/10 rounded-lg border-2 border-signal-blue/30 p-8">
                <h3 className="text-2xl font-bold text-ink mb-6 text-center">
                  What Makes This Validator Different
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <div>
                    <h4 className="font-semibold text-error mb-3">Other Validators:</h4>
                    <ul className="space-y-2 text-sm text-error">
                      <li className="flex items-start">
                        <XCircle className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0" />
                        Only check format compliance
                      </li>
                      <li className="flex items-start">
                        <XCircle className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0" />
                        Miss robots.txt conflicts that block AI
                      </li>
                      <li className="flex items-start">
                        <XCircle className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0" />
                        No framework or rendering detection
                      </li>
                      <li className="flex items-start">
                        <XCircle className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0" />
                        Only check one file location
                      </li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-semibold text-ink mb-3">Our Validator:</h4>
                    <ul className="space-y-2 text-sm text-success">
                      <li className="flex items-start">
                        <CheckCircle className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0" />
                        <div>
                          <span className="font-medium">robots.txt conflict detection</span>
                          <span className="text-xs block text-success">Catches silent blocking issues</span>
                        </div>
                      </li>
                      <li className="flex items-start">
                        <CheckCircle className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0" />
                        <div>
                          <span className="font-medium">Content quality scoring</span>
                          <span className="text-xs block text-success">Not just format — actual quality</span>
                        </div>
                      </li>
                      <li className="flex items-start">
                        <CheckCircle className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0" />
                        <div>
                          <span className="font-medium">15+ framework detection</span>
                          <span className="text-xs block text-success">React, Next.js, Vue, Angular, Astro...</span>
                        </div>
                      </li>
                      <li className="flex items-start">
                        <CheckCircle className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0" />
                        <div>
                          <span className="font-medium">All 4 file locations</span>
                          <span className="text-xs block text-success">llms.txt, llms-full.txt, .well-known/, llms.md</span>
                        </div>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </section>

            {/* Social Proof - Quick Stats */}
            <section className="mb-8">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white rounded-lg border border-mist p-4 text-center">
                  <p className="text-2xl font-bold text-signal-blue">47+</p>
                  <p className="text-xs text-slate-brand">Updates shipped in 2025</p>
                </div>
                <div className="bg-white rounded-lg border border-mist p-4 text-center">
                  <p className="text-2xl font-bold text-signal-blue">4</p>
                  <p className="text-xs text-slate-brand">File locations checked</p>
                </div>
                <div className="bg-white rounded-lg border border-mist p-4 text-center">
                  <p className="text-2xl font-bold text-signal-blue">15+</p>
                  <p className="text-xs text-slate-brand">Frameworks detected</p>
                </div>
                <div className="bg-white rounded-lg border border-mist p-4 text-center">
                  <p className="text-2xl font-bold text-signal-blue">100%</p>
                  <p className="text-xs text-slate-brand">Free — no signup needed</p>
                </div>
              </div>
            </section>

            {/* Pricing Preview */}
            <PricingPreview
              highlightTier="growth"
              showAllTiers={true}
              className="mb-8"
            />

            {/* Trust Badges */}
            <section className="mb-8">
              <TrustBadges variant="security" compact={true} alignment="center" />
            </section>

            {/* Why AI Visibility Matters */}
            <section className="mb-8">
              <Card className="bg-cloud border-mist">
                <CardContent className="p-6">
                  <h3 className="text-lg font-semibold text-ink mb-4 flex items-center">
                    <Eye className="h-5 w-5 mr-2 text-signal-blue" />
                    Why llms.txt Matters for Your Business
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                      <h4 className="font-medium text-ink mb-2">AI Search is Here</h4>
                      <p className="text-sm text-slate-brand">
                        ChatGPT, Claude, and Perplexity are replacing traditional search for millions of users. If they can't find your content, you're invisible.
                      </p>
                    </div>
                    <div>
                      <h4 className="font-medium text-ink mb-2">llms.txt is the Standard</h4>
                      <p className="text-sm text-slate-brand">
                        The{' '}
                        <a href="https://llmstxt.org" target="_blank" rel="noopener noreferrer" className="text-signal-blue hover:underline">
                          llmstxt.org specification
                        </a>{' '}
                        tells AI systems exactly what your site offers and which pages matter most.
                      </p>
                    </div>
                    <div>
                      <h4 className="font-medium text-ink mb-2">Early Adopter Advantage</h4>
                      <p className="text-sm text-slate-brand">
                        Less than 1% of websites have a proper llms.txt file. Set yours up now and be discoverable before your competitors.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </section>

            {/* Final CTA */}
            <div className="text-center mb-8">
              <p className="text-slate-brand mb-4">
                Ready to make your website AI-discoverable?
              </p>
              <div className="flex flex-col sm:flex-row justify-center gap-4">
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
                  Generate Your File
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="border-signal-blue text-signal-blue hover:bg-signal-blue/10"
                  onClick={() => {
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                >
                  Validate Your Site First
                </Button>
              </div>
            </div>
          </>
        )}

        {/* Post-results: Additional conversion content */}
        {validationResult && (
          <section className="mt-8 mb-8">
            <PricingPreview
              highlightTier="growth"
              showAllTiers={true}
              className="mb-8"
            />
          </section>
        )}
      </main>

      {/* Footer */}
      <Footer />
    </div>
  );
}
