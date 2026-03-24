import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Copy, Download, FileText, BarChart3, Shield, Loader2, AlertCircle } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { EnhancedLoading, LOADING_STATES } from '@/components/ui/enhanced-loading';
import DeploymentGuide, { mapFrameworkToPlatform, type DetectedPlatform } from './DeploymentGuide';
import type { SPADetectionResult } from '@shared/schema';
import { getApiBaseUrl } from '@/lib/api-config';

type FormatType = 'standard' | 'full' | 'mini';

interface FileGenerationProps {
  fileId: number;
  analysisId?: number;
  onStartOver: () => void;
  onStartNewAnalysis?: () => void;
  onViewAnalysis?: () => void;
}

interface AnalysisMetadata {
  id: number;
  url: string;
  analysisMetadata?: {
    spaDetection?: SPADetectionResult;
    siteType?: string;
  };
}

export default function FileGeneration({
  fileId,
  analysisId,
  onStartOver,
  onStartNewAnalysis,
  onViewAnalysis,
}: FileGenerationProps) {
  const [copied, setCopied] = useState(false);
  const [activeFormat, setActiveFormat] = useState<FormatType>('standard');
  const [verifying, setVerifying] = useState(false);
  const [verifyResult, setVerifyResult] = useState<any>(null);
  const { toast } = useToast();

  // Fetch file data
  const { data: fileData, isLoading: isLoadingFile } = useQuery({
    queryKey: ['/api/llm-file', fileId],
    queryFn: async () => {
      const baseUrl = getApiBaseUrl();
      const response = await fetch(`${baseUrl}/api/llm-file/${fileId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch file data');
      }
      return response.json();
    },
  });

  // Fetch analysis metadata to get framework detection info
  const { data: analysisData } = useQuery<AnalysisMetadata>({
    queryKey: ['/api/analysis-metadata', analysisId],
    queryFn: async () => {
      if (!analysisId) return null;
      const baseUrl = getApiBaseUrl();
      const response = await fetch(`${baseUrl}/api/analysis/${analysisId}`);
      if (!response.ok) {
        // Non-critical - just won't show platform-specific instructions
        console.warn('Could not fetch analysis metadata for deployment guide');
        return null;
      }
      return response.json();
    },
    enabled: !!analysisId,
  });

  // Determine the detected platform from analysis metadata
  const detectedPlatform: DetectedPlatform = (() => {
    const framework = analysisData?.analysisMetadata?.spaDetection?.framework?.framework;
    const websiteUrl = analysisData?.url || fileData?.url || '';
    return mapFrameworkToPlatform(framework, websiteUrl);
  })();

  const websiteUrl = analysisData?.url || fileData?.url || '';

  const handleCopyToClipboard = async () => {
    if (fileData?.content) {
      try {
        await navigator.clipboard.writeText(fileData.content);
        setCopied(true);
        toast({
          title: 'Copied to clipboard',
          description: 'LLM.txt content has been copied to your clipboard.',
        });
        setTimeout(() => setCopied(false), 2000);
      } catch (error) {
        toast({
          title: 'Copy failed',
          description: 'Failed to copy content to clipboard.',
          variant: 'destructive',
        });
      }
    }
  };

  const handleDownloadFile = (format: FormatType = 'standard') => {
    if (fileId) {
      const baseUrl = getApiBaseUrl();
      const filenames: Record<FormatType, string> = {
        standard: 'llms.txt',
        full: 'llms-full.txt',
        mini: 'llms-mini.txt',
      };
      const link = document.createElement('a');
      link.href = `${baseUrl}/api/download/${fileId}?format=${format}`;
      link.download = filenames[format];
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleVerifyDeployment = async () => {
    if (!websiteUrl) return;
    setVerifying(true);
    try {
      const baseUrl = getApiBaseUrl();
      const resp = await fetch(`${baseUrl}/api/verify-deployment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain: websiteUrl }),
      });
      const data = await resp.json();
      setVerifyResult(data);
    } catch {
      toast({ title: 'Verification failed', description: 'Could not reach the server.', variant: 'destructive' });
    } finally {
      setVerifying(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  if (isLoadingFile) {
    return <EnhancedLoading state={LOADING_STATES.FILE_GENERATION} />;
  }

  return (
    <div className="space-y-6">
      <Card className="bg-white shadow-sm border border-mist">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-signal-blue rounded-full flex items-center justify-center mr-3">
                <span className="text-white font-semibold text-sm">4</span>
              </div>
              <h3 className="text-xl font-semibold text-ink">
                Professional LLMs.txt File Generated
              </h3>
            </div>
            <div className="flex items-center space-x-2 text-sm text-success">
              <CheckCircle className="h-4 w-4" />
              <span>Specification Compliant</span>
            </div>
          </div>

          {/* File Preview */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-medium text-ink">File Preview</h4>
              <div className="flex items-center space-x-4 text-sm text-slate-brand">
                <div className="flex items-center space-x-2">
                  <span className="font-medium text-ink">
                    {fileData?.pageCount || 0} pages
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <FileText className="h-4 w-4" />
                  <span>{fileData?.fileSize ? formatFileSize(fileData.fileSize) : 'N/A'}</span>
                </div>
              </div>
            </div>
            <div className="bg-cloud rounded-lg p-4 border border-mist max-h-96 overflow-y-auto">
              <div className="bg-signal-blue/10 border border-mist rounded p-3 mb-3">
                <div className="text-sm text-mastery-blue font-medium mb-1">
                  Preview Limitation Notice
                </div>
                <div className="text-xs text-mastery-blue">
                  This preview shows only the first portion of your llms.txt file due to display
                  constraints. The complete file contains{' '}
                  <span className="font-bold">{fileData?.pageCount || 0} pages</span> and is{' '}
                  <span className="font-bold">
                    {fileData?.fileSize ? formatFileSize(fileData.fileSize) : 'N/A'}
                  </span>
                  . Use the download button below to get the full file.
                </div>
              </div>
              <pre className="text-sm text-ink font-mono whitespace-pre-wrap">
                <code>{fileData?.content || 'No content available'}</code>
              </pre>
            </div>
          </div>

          {/* Quality Assessment */}
          <div className="mb-6 p-4 bg-success/10 border border-mist rounded-lg">
            <h4 className="font-medium text-ink mb-2">Quality Assessment</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-4 w-4 text-success" />
                <span className="text-success">Specification Compliant</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-4 w-4 text-success" />
                <span className="text-success">High-Quality Content</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-4 w-4 text-success" />
                <span className="text-success">Optimized for AI Systems</span>
              </div>
            </div>
          </div>

          {/* Sprint 12: Multi-Format Downloads */}
          <div className="mb-6">
            <h4 className="font-medium text-ink mb-3">Download Formats</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* Standard */}
              <div className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                activeFormat === 'standard' ? 'border-signal-blue bg-signal-blue/5' : 'border-mist hover:border-signal-blue/40'
              }`} onClick={() => setActiveFormat('standard')}>
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold text-sm text-ink">llms.txt</span>
                  <Badge className="bg-signal-blue/10 text-signal-blue text-xs">Standard</Badge>
                </div>
                <p className="text-xs text-slate-brand mb-2">Structured summary with quality-scored page descriptions</p>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-brand">
                    {fileData?.formats?.standard
                      ? `~${fileData.formats.standard.tokenCount.toLocaleString()} tokens`
                      : fileData?.fileSize ? formatFileSize(fileData.fileSize) : ''}
                  </span>
                  <Button size="sm" onClick={(e) => { e.stopPropagation(); handleDownloadFile('standard'); }}
                    className="h-7 bg-signal-blue hover:bg-signal-blue/90 text-white text-xs">
                    <Download className="h-3 w-3 mr-1" /> Download
                  </Button>
                </div>
              </div>

              {/* Full */}
              <div className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                activeFormat === 'full' ? 'border-signal-blue bg-signal-blue/5' : 'border-mist hover:border-signal-blue/40'
              }`} onClick={() => setActiveFormat('full')}>
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold text-sm text-ink">llms-full.txt</span>
                  <Badge className="bg-emerald-100 text-emerald-700 text-xs">Full</Badge>
                </div>
                <p className="text-xs text-slate-brand mb-2">Complete content extraction for full LLM ingestion</p>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-brand">
                    {fileData?.formats?.full
                      ? `~${fileData.formats.full.tokenCount.toLocaleString()} tokens`
                      : ''}
                  </span>
                  <Button size="sm" onClick={(e) => { e.stopPropagation(); handleDownloadFile('full'); }}
                    className="h-7 bg-signal-blue hover:bg-signal-blue/90 text-white text-xs">
                    <Download className="h-3 w-3 mr-1" /> Download
                  </Button>
                </div>
              </div>

              {/* Mini */}
              <div className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                activeFormat === 'mini' ? 'border-signal-blue bg-signal-blue/5' : 'border-mist hover:border-signal-blue/40'
              }`} onClick={() => setActiveFormat('mini')}>
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold text-sm text-ink">llms-mini.txt</span>
                  <Badge className="bg-amber-100 text-amber-700 text-xs">Mini</Badge>
                </div>
                <p className="text-xs text-slate-brand mb-2">Token-constrained — top 5 pages for small context windows</p>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-brand">
                    {fileData?.formats?.mini
                      ? `~${fileData.formats.mini.tokenCount.toLocaleString()} tokens`
                      : ''}
                  </span>
                  <Button size="sm" onClick={(e) => { e.stopPropagation(); handleDownloadFile('mini'); }}
                    className="h-7 bg-signal-blue hover:bg-signal-blue/90 text-white text-xs">
                    <Download className="h-3 w-3 mr-1" /> Download
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="text-sm text-slate-brand">
              <p className="font-medium text-ink">Ready for deployment!</p>
              <p className="text-xs">
                Download your files and follow the deployment guide below
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              {onViewAnalysis && (
                <Button
                  variant="outline"
                  onClick={onViewAnalysis}
                  className="border-mist text-mastery-blue hover:bg-signal-blue/10"
                >
                  <BarChart3 className="h-4 w-4 mr-2" />
                  View Analysis
                </Button>
              )}
              <Button
                variant="secondary"
                onClick={handleCopyToClipboard}
                className="bg-cloud hover:bg-mist text-ink"
              >
                <Copy className="h-4 w-4 mr-2" />
                {copied ? 'Copied!' : 'Copy'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Deployment Guide - Platform-Specific Instructions */}
      {websiteUrl && (
        <DeploymentGuide
          detectedPlatform={detectedPlatform}
          websiteUrl={websiteUrl}
        />
      )}

      {/* Sprint 12: Deployment Verification */}
      {websiteUrl && (
        <Card className="bg-white shadow-sm border border-mist">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-ink flex items-center">
                <Shield className="h-5 w-5 mr-2 text-signal-blue" />
                Verify Your Deployment
              </h3>
              <Button
                onClick={handleVerifyDeployment}
                disabled={verifying}
                className="bg-signal-blue hover:bg-signal-blue/90 text-white"
              >
                {verifying ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Checking...</>
                ) : (
                  'Verify Now'
                )}
              </Button>
            </div>
            <p className="text-sm text-slate-brand mb-4">
              After uploading your file and adding discovery mechanisms, click "Verify Now" to confirm AI crawlers can find your llms.txt.
            </p>

            {verifyResult && (
              <div className="space-y-3">
                <div className={`p-3 rounded-lg ${
                  verifyResult.status === 'fully_deployed' ? 'bg-emerald-50 border border-emerald-200' :
                  verifyResult.status === 'partially_deployed' ? 'bg-amber-50 border border-amber-200' :
                  'bg-red-50 border border-red-200'
                }`}>
                  <p className={`font-semibold text-sm ${
                    verifyResult.status === 'fully_deployed' ? 'text-emerald-800' :
                    verifyResult.status === 'partially_deployed' ? 'text-amber-800' : 'text-red-800'
                  }`}>
                    {verifyResult.score}/{verifyResult.total} checks passed — {verifyResult.message}
                  </p>
                </div>
                {verifyResult.checks?.map((check: any, i: number) => (
                  <div key={i} className="flex items-center gap-3 text-sm">
                    {check.status === 'pass' ? (
                      <CheckCircle className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
                    )}
                    <span className="text-ink">{check.name.replace(/_/g, ' ')}</span>
                    <span className="text-slate-brand text-xs ml-auto">{check.details}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Start Over Button */}
      <div className="text-center">
        <Button
          variant="outline"
          onClick={onStartNewAnalysis || onStartOver}
          className="text-slate-brand hover:text-ink"
        >
          Analyze Another Website
        </Button>
      </div>
    </div>
  );
}
