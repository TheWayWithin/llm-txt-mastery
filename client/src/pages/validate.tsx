import { useState } from 'react';
import { Link } from 'wouter';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
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
}

interface RobotsConflict {
  conflict: string;
  rule: string;
  llmsTxtPath: string;
  recommendation: string;
}

interface ValidationResult {
  valid: boolean;
  score: number;
  processingTime: number;
  issues: ValidationIssue[];
  recommendations: ValidationRecommendation[];
  robotsConflicts?: RobotsConflict[];
}

export default function ValidatePage() {
  const { user, isAuthenticated } = useAuth();
  const [url, setUrl] = useState('');
  const [isValid, setIsValid] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [includeRobotsTxt, setIncludeRobotsTxt] = useState(true);

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
  };

  const handleValidate = async () => {
    if (!isValid || !url) return;

    setIsValidating(true);
    setError(null);
    setValidationResult(null);

    try {
      const normalizedUrl = normalizeUrl(url);
      const API_URL = import.meta.env.VITE_API_URL || '';
      const response = await fetch(`${API_URL}/api/validate-llms-txt`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
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
              Free validation: 3 checks per day. Want unlimited validations?{' '}
              <Link href="/signup">
                <a className="font-semibold text-innovation-teal hover:underline">
                  Sign up for free
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
                  We'll check {url ? `${normalizeUrl(url)}/llms.txt` : 'your-site.com/llms.txt'}
                </p>
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
                <Button
                  type="submit"
                  disabled={!isValid || isValidating}
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
                        className="flex items-start space-x-3 p-3 bg-slate-50 rounded-lg"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <p className="text-sm font-semibold text-framework-black">
                              {rec.title}
                            </p>
                            {getPriorityBadge(rec.priority)}
                          </div>
                          <p className="text-sm text-ai-silver">{rec.description}</p>
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
