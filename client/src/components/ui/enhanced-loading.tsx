import { Loader2, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { useEffect, useState } from 'react';

export interface LoadingState {
  type: 'loading' | 'success' | 'error' | 'warning';
  title: string;
  message: string;
  progress?: number;
  timeEstimate?: string;
  details?: string[];
  showProgress?: boolean;
}

interface EnhancedLoadingProps {
  state: LoadingState;
  className?: string;
  animated?: boolean;
}

export function EnhancedLoading({ state, className, animated = true }: EnhancedLoadingProps) {
  const [animatedProgress, setAnimatedProgress] = useState(0);

  useEffect(() => {
    if (state.progress !== undefined && animated) {
      const timer = setTimeout(() => {
        setAnimatedProgress(state.progress || 0);
      }, 100);
      return () => clearTimeout(timer);
    } else if (state.progress !== undefined) {
      setAnimatedProgress(state.progress);
    }
  }, [state.progress, animated]);

  const getIcon = () => {
    switch (state.type) {
      case 'loading':
        return <Loader2 className="h-6 w-6 animate-spin text-innovation-teal" />;
      case 'success':
        return <CheckCircle className="h-6 w-6 text-green-600" />;
      case 'error':
        return <AlertCircle className="h-6 w-6 text-red-600" />;
      case 'warning':
        return <AlertCircle className="h-6 w-6 text-yellow-600" />;
      default:
        return <Loader2 className="h-6 w-6 animate-spin text-innovation-teal" />;
    }
  };

  const getCardStyles = () => {
    switch (state.type) {
      case 'success':
        return 'border-green-200 bg-green-50';
      case 'error':
        return 'border-red-200 bg-red-50';
      case 'warning':
        return 'border-yellow-200 bg-yellow-50';
      default:
        return 'border-slate-200 bg-white';
    }
  };

  const getTitleStyles = () => {
    switch (state.type) {
      case 'success':
        return 'text-green-800';
      case 'error':
        return 'text-red-800';
      case 'warning':
        return 'text-yellow-800';
      default:
        return 'text-framework-black';
    }
  };

  const getMessageStyles = () => {
    switch (state.type) {
      case 'success':
        return 'text-green-700';
      case 'error':
        return 'text-red-700';
      case 'warning':
        return 'text-yellow-700';
      default:
        return 'text-ai-silver';
    }
  };

  return (
    <Card className={cn('w-full max-w-2xl mx-auto', getCardStyles(), className)}>
      <CardContent className="p-6">
        <div className="flex items-start space-x-4">
          <div className="flex-shrink-0 mt-1">{getIcon()}</div>

          <div className="flex-1 min-w-0">
            <h3 className={cn('text-lg font-semibold mb-2', getTitleStyles())}>{state.title}</h3>

            <p className={cn('text-sm mb-4', getMessageStyles())}>{state.message}</p>

            {/* Time Estimate */}
            {state.timeEstimate && (
              <div className="flex items-center space-x-2 mb-4">
                <Clock className="h-4 w-4 text-ai-silver" />
                <span className="text-sm text-ai-silver">{state.timeEstimate}</span>
              </div>
            )}

            {/* Progress Bar */}
            {(state.showProgress || state.progress !== undefined) && (
              <div className="mb-4">
                <div className="flex justify-between text-sm text-ai-silver mb-2">
                  <span>Progress</span>
                  <span>{Math.round(animatedProgress)}%</span>
                </div>
                <Progress value={animatedProgress} className="h-2" />
              </div>
            )}

            {/* Details List */}
            {state.details && state.details.length > 0 && (
              <div className="space-y-2">
                {state.details.map((detail, index) => (
                  <div key={index} className="flex items-center space-x-2 text-sm">
                    <div className="w-1.5 h-1.5 rounded-full bg-innovation-teal flex-shrink-0" />
                    <span className="text-ai-silver">{detail}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Predefined loading states for common scenarios
export const LOADING_STATES = {
  AUTH_CHECK: {
    type: 'loading' as const,
    title: 'Verifying Access',
    message: 'Checking your authentication status and tier permissions...',
    timeEstimate: 'Usually takes a few seconds',
    showProgress: false,
  },

  SITEMAP_DISCOVERY: {
    type: 'loading' as const,
    title: 'Discovering Content Structure',
    message: "Analyzing your website's sitemap and content organization...",
    timeEstimate: 'Typically takes 15-30 seconds',
    details: [
      'Checking for sitemap.xml',
      'Analyzing robots.txt directives',
      'Discovering page hierarchy',
    ] as string[],
  },

  CONTENT_ANALYSIS: {
    type: 'loading' as const,
    title: 'AI-Powered Content Analysis',
    message: 'Our AI is analyzing your pages for quality and relevance...',
    timeEstimate: 'Usually takes 1-2 minutes',
    showProgress: true,
  },

  FILE_GENERATION: {
    type: 'loading' as const,
    title: 'Generating llms.txt File',
    message: 'Creating your optimized, standards-compliant llms.txt file...',
    timeEstimate: 'Almost done - just a few seconds',
    details: [
      'Formatting selected pages',
      'Generating descriptions',
      'Validating compliance',
    ] as string[],
  },

  COFFEE_TIER_LOADING: {
    type: 'loading' as const,
    title: 'Premium Analysis Launching',
    message: 'Activating your Coffee tier premium features and AI analysis...',
    timeEstimate: 'Enhanced processing - usually 30-60 seconds',
    details: [
      'Applying premium analysis algorithms',
      'Accessing enhanced AI models',
      'Generating detailed insights',
    ] as string[],
  },
};
