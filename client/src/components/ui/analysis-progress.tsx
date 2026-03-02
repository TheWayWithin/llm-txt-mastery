import { CheckCircle, Circle, Loader2, Clock, FileText, Brain } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { useEffect, useState } from 'react';

export interface AnalysisStage {
  id: string;
  label: string;
  description: string;
  icon?: React.ReactNode;
  progress: number;
  estimatedTime?: string;
}

interface AnalysisProgressProps {
  currentStage: string;
  completedStages: string[];
  totalPages?: number;
  processedPages?: number;
  overallProgress: number;
  stages: AnalysisStage[];
  className?: string;
  showPageCount?: boolean;
  showTimeEstimate?: boolean;
  estimatedTotalTime?: string;  // Dynamic estimate based on page count
}

const DEFAULT_STAGES: AnalysisStage[] = [
  {
    id: 'discovery',
    label: 'Site Discovery',
    description: 'Finding and cataloging pages from sitemap',
    icon: <FileText className="h-4 w-4" />,
    progress: 15,
  },
  {
    id: 'ai-analysis',
    label: 'AI Content Analysis',
    description: 'Extracting content and evaluating quality for each page',
    icon: <Brain className="h-4 w-4" />,
    progress: 95,
  },
  {
    id: 'finalization',
    label: 'Saving Results',
    description: 'Storing analysis results',
    icon: <CheckCircle className="h-4 w-4" />,
    progress: 100,
  },
];

export function AnalysisProgress({
  currentStage,
  completedStages,
  totalPages = 0,
  processedPages = 0,
  overallProgress,
  stages = DEFAULT_STAGES,
  className,
  estimatedTotalTime,
  showPageCount = true,
  showTimeEstimate = true,
}: AnalysisProgressProps) {
  const [animatedProgress, setAnimatedProgress] = useState(0);
  const currentStageData = stages.find((stage) => stage.id === currentStage);

  useEffect(() => {
    const timer = setTimeout(() => {
      setAnimatedProgress(overallProgress);
    }, 100);
    return () => clearTimeout(timer);
  }, [overallProgress]);

  const getStageIcon = (stage: AnalysisStage, isCompleted: boolean, isCurrent: boolean) => {
    if (isCompleted) {
      return <CheckCircle className="h-5 w-5 text-success" />;
    } else if (isCurrent) {
      return stage.icon ? (
        <div className="text-signal-blue animate-pulse">{stage.icon}</div>
      ) : (
        <Loader2 className="h-5 w-5 text-signal-blue animate-spin" />
      );
    } else {
      return <Circle className="h-5 w-5 text-stone-brand" />;
    }
  };

  return (
    <Card className={cn('w-full max-w-2xl mx-auto', className)}>
      <CardContent className="p-4 sm:p-6">
        {/* Header */}
        <div className="flex flex-col space-y-3 mb-6 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
          <div>
            <h3 className="text-lg font-semibold text-ink">
              Content Analysis in Progress
            </h3>
            <p className="text-sm text-slate-brand leading-relaxed">
              {currentStageData?.description || 'Processing your website...'}
            </p>
          </div>
          {showTimeEstimate && (estimatedTotalTime || currentStageData?.estimatedTime) && (
            <div className="flex items-center space-x-2 text-sm text-slate-brand">
              <Clock className="h-4 w-4 flex-shrink-0" />
              <span>{estimatedTotalTime || currentStageData?.estimatedTime}</span>
            </div>
          )}
        </div>

        {/* Overall Progress */}
        <div className="mb-6">
          <div className="flex justify-between text-sm text-slate-brand mb-2">
            <span>Overall Progress</span>
            <span>{Math.round(animatedProgress)}%</span>
          </div>
          <Progress value={animatedProgress} className="h-3" />
        </div>

        {/* Page Count Progress */}
        {showPageCount && totalPages > 0 && (
          <div className="mb-6 p-4 bg-cloud rounded-lg">
            <div className="flex flex-col space-y-2 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
              <span className="text-sm font-medium text-ink">
                Page Analysis Progress
              </span>
              <span className="text-sm text-slate-brand">
                {processedPages} of {totalPages} pages
              </span>
            </div>
            <Progress
              value={totalPages > 0 ? (processedPages / totalPages) * 100 : 0}
              className="h-3 mt-2"
            />
          </div>
        )}

        {/* Stage Progress */}
        <div className="space-y-4">
          <h4 className="text-sm font-medium text-ink mb-3">Analysis Stages</h4>

          {stages.map((stage, index) => {
            const isCompleted = completedStages.includes(stage.id);
            const isCurrent = stage.id === currentStage;
            const isPending = !isCompleted && !isCurrent;

            return (
              <div
                key={stage.id}
                className={cn(
                  'flex items-start space-x-3 p-4 rounded-lg transition-all duration-300',
                  isCurrent && 'bg-signal-blue/5 border border-signal-blue/20',
                  isCompleted && 'bg-success/10 border border-success/20',
                  isPending && 'opacity-60'
                )}
              >
                <div className="flex-shrink-0 mt-1">
                  {getStageIcon(stage, isCompleted, isCurrent)}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex flex-col space-y-1 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
                    <span
                      className={cn(
                        'text-sm font-medium leading-relaxed',
                        isCompleted && 'text-ink',
                        isCurrent && 'text-signal-blue',
                        isPending && 'text-stone-brand'
                      )}
                    >
                      {stage.label}
                    </span>

                    {isCurrent && (
                      <span className="text-xs text-signal-blue font-medium">In Progress</span>
                    )}

                    {isCompleted && (
                      <span className="text-xs text-success font-medium">Complete</span>
                    )}
                  </div>

                  <p
                    className={cn(
                      'text-xs mt-2 leading-relaxed',
                      isCompleted && 'text-success',
                      isCurrent && 'text-ink',
                      isPending && 'text-stone-brand'
                    )}
                  >
                    {stage.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Current Stage Details */}
        {currentStageData && (
          <div className="mt-6 p-4 bg-signal-blue/5 rounded-lg border border-signal-blue/20">
            <div className="flex items-center space-x-2 mb-2">
              <div className="text-signal-blue">
                {currentStageData.icon || <Loader2 className="h-4 w-4 animate-spin" />}
              </div>
              <span className="text-sm font-medium text-signal-blue">
                Currently: {currentStageData.label}
              </span>
            </div>
            <p className="text-xs text-slate-brand">{currentStageData.description}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Export default stages for reuse
export { DEFAULT_STAGES as ANALYSIS_STAGES };
