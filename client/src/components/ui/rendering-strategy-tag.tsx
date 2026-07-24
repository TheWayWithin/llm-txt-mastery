import * as React from 'react';
import { cn } from '@/lib/utils';
import { Server, Smartphone, Zap, Layers, HelpCircle } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import type { RenderingStrategy, SPAFrameworkIndicators } from '@shared/schema';

interface RenderingStrategyTagProps {
  framework: SPAFrameworkIndicators;
  showTooltip?: boolean;
  className?: string;
}

const frameworkLabels: Record<SPAFrameworkIndicators['framework'], string> = {
  react: 'React',
  vue: 'Vue.js',
  angular: 'Angular',
  svelte: 'Svelte',
  next: 'Next.js',
  nuxt: 'Nuxt',
  gatsby: 'Gatsby',
  astro: 'Astro',
  unknown: 'Unknown',
};

const strategyConfig: Record<
  RenderingStrategy,
  { icon: React.ElementType; label: string; color: string; description: string }
> = {
  SSR: {
    icon: Server,
    label: 'Server-Side',
    color: 'bg-success/10 text-ink border-mist',
    description: 'Content is rendered on the server. Full content is available for analysis.',
  },
  SSG: {
    icon: Zap,
    label: 'Static/SSG',
    color: 'bg-signal-blue/10 text-mastery-blue border-mist',
    description: 'Pre-rendered static pages at build time. Excellent for analysis.',
  },
  CSR: {
    icon: Smartphone,
    label: 'Client-Side',
    color: 'bg-cloud text-ink border-mist',
    description: 'Content is rendered in the browser. Some content may not be captured.',
  },
  HYBRID: {
    icon: Layers,
    label: 'Hybrid',
    color: 'bg-cloud text-ink border-mist',
    description: 'Mix of server and client rendering. Most content should be available.',
  },
  UNKNOWN: {
    icon: HelpCircle,
    label: 'Unknown',
    color: 'bg-cloud text-ink border-mist',
    description: 'Unable to determine rendering strategy.',
  },
};

/**
 * Tag displaying framework name and rendering strategy
 * with appropriate icon and color coding
 */
export function RenderingStrategyTag({
  framework,
  showTooltip = true,
  className,
}: RenderingStrategyTagProps) {
  const config = strategyConfig[framework.renderingStrategy];
  const Icon = config.icon;
  const frameworkLabel = frameworkLabels[framework.framework];

  const tag = (
    <div
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold',
        config.color,
        className
      )}
    >
      <Icon className="h-3 w-3" />
      <span>{frameworkLabel}</span>
      <span className="opacity-70">({config.label})</span>
    </div>
  );

  if (!showTooltip) {
    return tag;
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>{tag}</TooltipTrigger>
        <TooltipContent className="max-w-xs">
          <div className="space-y-2">
            <p className="font-medium">
              {frameworkLabel} - {config.label} Rendering
            </p>
            <p className="text-xs">{config.description}</p>
            {framework.indicators.length > 0 && (
              <div className="text-xs">
                <span className="font-medium">Detected indicators:</span>
                <ul className="list-disc list-inside mt-1">
                  {framework.indicators.slice(0, 3).map((indicator, i) => (
                    <li key={i} className="truncate">
                      {indicator}
                    </li>
                  ))}
                  {framework.indicators.length > 3 && (
                    <li>+{framework.indicators.length - 3} more</li>
                  )}
                </ul>
              </div>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export { RenderingStrategyTag as default };
