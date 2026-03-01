import * as React from 'react';
import { cn } from '@/lib/utils';
import { AlertTriangle, CheckCircle, Info } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface ContentCoverageBadgeProps {
  coverage: number; // 0-100
  confidence: 'high' | 'medium' | 'low';
  warning?: string;
  showDetails?: boolean;
  className?: string;
}

/**
 * Color-coded badge showing content coverage percentage
 * - Green (>=95%): Excellent - full content available
 * - Yellow (>=70%): Good - most content available
 * - Orange (>=40%): Limited - significant content may be missing
 * - Red (<40%): Poor - minimal content captured
 */
export function ContentCoverageBadge({
  coverage,
  confidence,
  warning,
  showDetails = true,
  className,
}: ContentCoverageBadgeProps) {
  const getCoverageColor = () => {
    if (coverage >= 95) return 'bg-success/10 text-ink border-mist';
    if (coverage >= 70) return 'bg-action-amber/10 text-ink border-action-amber/40';
    if (coverage >= 40) return 'bg-cloud text-ink border-mist';
    return 'bg-error/10 text-error border-mist';
  };

  const getCoverageLabel = () => {
    if (coverage >= 95) return 'Excellent';
    if (coverage >= 70) return 'Good';
    if (coverage >= 40) return 'Limited';
    return 'Poor';
  };

  const getConfidenceIcon = () => {
    switch (confidence) {
      case 'high':
        return <CheckCircle className="h-3 w-3" />;
      case 'medium':
        return <Info className="h-3 w-3" />;
      case 'low':
        return <AlertTriangle className="h-3 w-3" />;
    }
  };

  const badge = (
    <div
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold',
        getCoverageColor(),
        className
      )}
    >
      {warning && coverage < 70 && <AlertTriangle className="h-3 w-3" />}
      <span>{Math.round(coverage)}% Coverage</span>
      {showDetails && (
        <span className="opacity-70">({getCoverageLabel()})</span>
      )}
    </div>
  );

  if (!showDetails) {
    return badge;
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>{badge}</TooltipTrigger>
        <TooltipContent className="max-w-xs">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              {getConfidenceIcon()}
              <span className="font-medium capitalize">{confidence} Confidence</span>
            </div>
            {warning ? (
              <p className="text-xs text-action-amber">{warning}</p>
            ) : (
              <p className="text-xs">
                Estimated percentage of site content accessible for analysis.
              </p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export { ContentCoverageBadge as default };
