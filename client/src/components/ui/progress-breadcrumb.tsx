import { CheckCircle, Circle, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ProgressStep {
  id: string;
  label: string;
  description?: string;
}

interface ProgressBreadcrumbProps {
  steps: ProgressStep[];
  currentStep: string;
  completedSteps: string[];
  className?: string;
}

export function ProgressBreadcrumb({
  steps,
  currentStep,
  completedSteps,
  className,
}: ProgressBreadcrumbProps) {
  const getCurrentStepIndex = () => steps.findIndex((step) => step.id === currentStep);
  const currentStepIndex = getCurrentStepIndex();

  return (
    <div className={cn('w-full max-w-4xl mx-auto mb-8', className)}>
      <div className="flex items-center justify-between relative">
        {/* Progress line background */}
        <div className="absolute top-4 left-8 right-8 h-0.5 bg-mist z-0" />

        {/* Progress line active */}
        <div
          className="absolute top-4 left-8 h-0.5 bg-signal-blue z-10 transition-all duration-500 ease-in-out"
          style={{
            width:
              currentStepIndex >= 0
                ? `${Math.max(0, (currentStepIndex / Math.max(1, steps.length - 1)) * 100)}%`
                : '0%',
          }}
        />

        {steps.map((step, index) => {
          const isCompleted = completedSteps.includes(step.id);
          const isCurrent = step.id === currentStep;
          const isPending = !isCompleted && !isCurrent;

          return (
            <div key={step.id} className="flex flex-col items-center relative z-20">
              {/* Step circle */}
              <div
                className={cn(
                  'w-8 h-8 rounded-full flex items-center justify-center border-2 bg-white transition-all duration-300',
                  isCompleted && 'border-signal-blue bg-signal-blue',
                  isCurrent && 'border-signal-blue bg-white',
                  isPending && 'border-mist bg-white'
                )}
              >
                {isCompleted ? (
                  <CheckCircle className="h-4 w-4 text-white" />
                ) : isCurrent ? (
                  <div className="w-3 h-3 rounded-full bg-signal-blue animate-pulse" />
                ) : (
                  <Circle className="h-4 w-4 text-stone-brand" />
                )}
              </div>

              {/* Step label */}
              <div className="mt-2 text-center max-w-24">
                <div
                  className={cn(
                    'text-xs font-medium transition-colors duration-300',
                    isCompleted && 'text-signal-blue',
                    isCurrent && 'text-signal-blue',
                    isPending && 'text-stone-brand'
                  )}
                >
                  {step.label}
                </div>
                {step.description && (
                  <div
                    className={cn(
                      'text-xs mt-1 transition-colors duration-300',
                      isCompleted && 'text-slate-brand',
                      isCurrent && 'text-ink',
                      isPending && 'text-stone-brand'
                    )}
                  >
                    {step.description}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Predefined step configurations for common flows
export const FLOW_STEPS: ProgressStep[] = [
  {
    id: 'url-input',
    label: 'URL Input',
    description: 'Enter website',
  },
  {
    id: 'email-capture',
    label: 'Email',
    description: 'User details',
  },
  {
    id: 'analysis',
    label: 'Analysis',
    description: 'Processing',
  },
  {
    id: 'review',
    label: 'Review',
    description: 'Select pages',
  },
  {
    id: 'generation',
    label: 'Generate',
    description: 'Create file',
  },
];
