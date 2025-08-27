import { useState } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { HelpCircle, Info, Book, MessageCircle, ExternalLink, CheckCircle } from "lucide-react";

interface HelpProps {
  context?: 'url-input' | 'email-capture' | 'analysis' | 'review' | 'generation' | 'error';
  className?: string;
}

interface HelpContent {
  title: string;
  description: string;
  steps?: string[];
  tips?: string[];
  troubleshooting?: Array<{
    problem: string;
    solution: string;
  }>;
}

const HELP_CONTENT: Record<string, HelpContent> = {
  'url-input': {
    title: 'Website URL Input',
    description: 'Enter the URL of the website you want to analyze for llms.txt file generation.',
    steps: [
      'Enter a complete URL including https:// (e.g., https://example.com)',
      'Make sure the website is publicly accessible',
      'The URL should point to your main website, not a specific page',
      'Click "Start Analysis" to begin the process'
    ],
    tips: [
      'Use your main domain URL for best results',
      'Avoid URLs with query parameters or fragments',
      'Ensure the website has public content to analyze'
    ],
    troubleshooting: [
      {
        problem: 'Invalid URL error',
        solution: 'Make sure to include https:// and use a valid domain format'
      },
      {
        problem: 'Website not accessible',
        solution: 'Check if the website is publicly available and not behind authentication'
      }
    ]
  },
  'email-capture': {
    title: 'Account Setup & Tier Selection',
    description: 'Choose your analysis type and provide your email to get started.',
    steps: [
      'Select your preferred analysis tier (Free, Coffee, Growth, or Scale)',
      'Choose between Quick Start or Create Account',
      'Enter your email address',
      'For paid tiers, complete the payment process',
      'Click "Start Analysis" or "Continue to Payment"'
    ],
    tips: [
      'Coffee tier ($4.95/month) provides 100 monthly analyses',
      'Create Account gives you dashboard access and analysis history',
      'Quick Start is fastest for immediate results',
      'Check your email for payment confirmations'
    ],
    troubleshooting: [
      {
        problem: 'Email already exists',
        solution: 'Use the "Login Instead" button or try a different email'
      },
      {
        problem: 'Payment issues',
        solution: 'Check your card details and try again, or contact support'
      }
    ]
  },
  'analysis': {
    title: 'Website Analysis Process',
    description: 'Your website is being analyzed to discover pages and assess content quality.',
    steps: [
      'Sitemap discovery: Finding your website structure',
      'Content fetching: Downloading page content',
      'AI analysis: Evaluating content quality and relevance',
      'Results compilation: Preparing your data for review'
    ],
    tips: [
      'Analysis typically takes 30-60 seconds',
      'Larger websites may take longer to process',
      'AI-enhanced analysis provides better quality scoring',
      'You can see real-time progress updates'
    ],
    troubleshooting: [
      {
        problem: 'Analysis taking too long',
        solution: 'Large websites can take up to 2 minutes. Please wait or try a smaller site first'
      },
      {
        problem: 'Analysis failed',
        solution: 'Try again or check if your website is accessible. Contact support if issues persist'
      }
    ]
  },
  'review': {
    title: 'Content Review & Selection',
    description: 'Review discovered pages and select which ones to include in your llms.txt file.',
    steps: [
      'Review the list of discovered pages',
      'Check quality scores (higher is better)',
      'Select/deselect pages using checkboxes',
      'Add custom descriptions if needed',
      'Click "Generate LLM.txt File" when ready'
    ],
    tips: [
      'Focus on high-quality, relevant pages',
      'Include key pages like About, Services, and main content',
      'Remove low-quality or irrelevant pages',
      'Custom descriptions help AI systems understand your content better'
    ],
    troubleshooting: [
      {
        problem: 'No pages found',
        solution: 'Try a different URL or check if your sitemap is accessible'
      },
      {
        problem: 'Low quality scores',
        solution: 'This is normal for some pages. Select the most important ones manually'
      }
    ]
  },
  'generation': {
    title: 'File Generation & Download',
    description: 'Your llms.txt file has been generated and is ready for download.',
    steps: [
      'Download the generated llms.txt file',
      'Upload it to your website\'s root directory',
      'Test accessibility at yourdomain.com/llms.txt',
      'Monitor AI system interactions'
    ],
    tips: [
      'Place the file in your website root directory',
      'Keep the filename exactly as "llms.txt"',
      'Update the file when you add new content',
      'Test the URL in your browser to ensure it works'
    ],
    troubleshooting: [
      {
        problem: 'Download not working',
        solution: 'Try right-clicking the download button and selecting "Save Link As"'
      },
      {
        problem: 'File not accessible after upload',
        solution: 'Check file permissions and ensure it\'s in the correct directory'
      }
    ]
  },
  'error': {
    title: 'Error Recovery',
    description: 'Something went wrong, but there are several ways to get back on track.',
    steps: [
      'Read the error message for specific guidance',
      'Try the suggested recovery actions',
      'Check your internet connection',
      'Refresh the page if needed',
      'Contact support if problems persist'
    ],
    tips: [
      'Most errors are temporary and resolve with a retry',
      'Network errors often resolve by waiting a moment',
      'Start over if you\'re completely stuck',
      'Save any important information before refreshing'
    ],
    troubleshooting: [
      {
        problem: 'Stuck in error loop',
        solution: 'Use the "Start Over" button to reset everything'
      },
      {
        problem: 'Payment errors',
        solution: 'Check with your bank and try again, or contact support'
      }
    ]
  }
};

export function HelpTooltip({ children, content, side = "top" }: { 
  children: React.ReactNode; 
  content: string; 
  side?: "top" | "right" | "bottom" | "left" 
}) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          {children}
        </TooltipTrigger>
        <TooltipContent side={side} className="max-w-xs">
          <p className="text-sm">{content}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export function QuickHelp({ context = 'url-input', className = '' }: HelpProps) {
  const [isOpen, setIsOpen] = useState(false);
  const content = HELP_CONTENT[context];

  if (!content) return null;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={`text-blue-600 hover:text-blue-800 hover:bg-blue-50 ${className}`}
        >
          <HelpCircle className="h-4 w-4 mr-1" />
          Help
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Info className="h-5 w-5 mr-2 text-blue-600" />
            {content.title}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          <p className="text-slate-600">{content.description}</p>
          
          {content.steps && (
            <div>
              <h4 className="font-semibold text-slate-800 mb-3 flex items-center">
                <CheckCircle className="h-4 w-4 mr-2 text-green-600" />
                Step-by-step Guide
              </h4>
              <ol className="space-y-2">
                {content.steps.map((step, index) => (
                  <li key={index} className="flex">
                    <span className="inline-flex items-center justify-center w-6 h-6 bg-blue-100 text-blue-800 text-sm font-semibold rounded-full mr-3 mt-0.5 flex-shrink-0">
                      {index + 1}
                    </span>
                    <span className="text-slate-700">{step}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}
          
          {content.tips && (
            <div>
              <h4 className="font-semibold text-slate-800 mb-3">💡 Pro Tips</h4>
              <ul className="space-y-2">
                {content.tips.map((tip, index) => (
                  <li key={index} className="flex items-start">
                    <span className="text-green-500 mr-2 mt-1">•</span>
                    <span className="text-slate-700">{tip}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          
          {content.troubleshooting && (
            <div>
              <h4 className="font-semibold text-slate-800 mb-3">🔧 Troubleshooting</h4>
              <div className="space-y-3">
                {content.troubleshooting.map((item, index) => (
                  <div key={index} className="border-l-4 border-orange-200 pl-4 py-2">
                    <p className="font-medium text-orange-800">{item.problem}</p>
                    <p className="text-orange-700 text-sm mt-1">{item.solution}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          <div className="border-t pt-4">
            <p className="text-sm text-slate-600 mb-3">
              Still need help? We're here to support you!
            </p>
            <div className="flex flex-wrap gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open('mailto:support@llmtxtmastery.com', '_blank')}
              >
                <MessageCircle className="h-4 w-4 mr-2" />
                Contact Support
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open('/docs', '_blank')}
              >
                <Book className="h-4 w-4 mr-2" />
                Documentation
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function InlineHelp({ content, variant = 'info' }: { 
  content: string; 
  variant?: 'info' | 'warning' | 'success' 
}) {
  const bgColor = {
    info: 'bg-blue-50 border-blue-200',
    warning: 'bg-orange-50 border-orange-200',
    success: 'bg-green-50 border-green-200'
  }[variant];
  
  const textColor = {
    info: 'text-blue-800',
    warning: 'text-orange-800',
    success: 'text-green-800'
  }[variant];
  
  const iconColor = {
    info: 'text-blue-600',
    warning: 'text-orange-600',
    success: 'text-green-600'
  }[variant];
  
  return (
    <div className={`${bgColor} border rounded-lg p-3 text-sm`}>
      <div className="flex items-start">
        <Info className={`h-4 w-4 ${iconColor} mr-2 mt-0.5 flex-shrink-0`} />
        <p className={textColor}>{content}</p>
      </div>
    </div>
  );
}

export default function HelpSystem({ context = 'url-input', className = '' }: HelpProps) {
  return <QuickHelp context={context} className={className} />;
}