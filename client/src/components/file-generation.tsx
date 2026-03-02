import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, Copy, Download, FileText, BarChart3 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { EnhancedLoading, LOADING_STATES } from '@/components/ui/enhanced-loading';
import DeploymentGuide, { mapFrameworkToPlatform, type DetectedPlatform } from './DeploymentGuide';
import type { SPADetectionResult } from '@shared/schema';
import { getApiBaseUrl } from '@/lib/api-config';

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

  const handleDownloadFile = () => {
    if (fileId) {
      console.log('Downloading file with ID:', fileId);
      // Use the Railway backend URL directly for download
      const baseUrl = getApiBaseUrl();
      const link = document.createElement('a');
      link.href = `${baseUrl}/api/download/${fileId}`;
      link.download = 'llms.txt';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      console.error('No fileId available for download');
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

          {/* Download Options */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="text-sm text-slate-brand">
              <p className="font-medium text-ink">Ready for deployment!</p>
              <p className="text-xs">
                Download your file and follow the deployment guide below
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
                  View Analysis Details
                </Button>
              )}
              <Button
                variant="secondary"
                onClick={handleCopyToClipboard}
                className="bg-cloud hover:bg-mist text-ink"
              >
                <Copy className="h-4 w-4 mr-2" />
                {copied ? 'Copied!' : 'Copy to Clipboard'}
              </Button>
              <Button
                onClick={handleDownloadFile}
                className="bg-signal-blue hover:bg-signal-blue/90 text-white"
              >
                <Download className="h-4 w-4 mr-2" />
                Download llms.txt
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
