import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RotateCcw, Home, RefreshCw, Wifi, CreditCard, Shield, Brain, HelpCircle } from "lucide-react";
import { ErrorContext, FlowState } from "@/hooks/useFlowStateMachine";
import { InlineHelp, QuickHelp } from "./HelpSystem";

interface ErrorDisplayProps {
  error: ErrorContext;
  onRetry?: () => void;
  onRecover?: (targetState?: FlowState) => void;
  onReset?: () => void;
  retryCount?: number;
  maxRetries?: number;
}

const ERROR_ICONS = {
  network: Wifi,
  validation: AlertTriangle,
  auth: Shield,
  analysis: Brain,
  payment: CreditCard,
  unknown: AlertTriangle
};

const ERROR_COLORS = {
  network: 'border-blue-200 bg-blue-50',
  validation: 'border-orange-200 bg-orange-50',
  auth: 'border-purple-200 bg-purple-50',
  analysis: 'border-green-200 bg-green-50',
  payment: 'border-red-200 bg-red-50',
  unknown: 'border-slate-200 bg-slate-50'
};

const ERROR_TITLE_COLORS = {
  network: 'text-blue-800',
  validation: 'text-orange-800',
  auth: 'text-purple-800',
  analysis: 'text-green-800',
  payment: 'text-red-800',
  unknown: 'text-slate-800'
};

const ERROR_TEXT_COLORS = {
  network: 'text-blue-700',
  validation: 'text-orange-700',
  auth: 'text-purple-700',
  analysis: 'text-green-700',
  payment: 'text-red-700',
  unknown: 'text-slate-700'
};

function getErrorTitle(type: ErrorContext['type']): string {
  switch (type) {
    case 'network':
      return 'Connection Problem';
    case 'validation':
      return 'Input Validation Error';
    case 'auth':
      return 'Authentication Issue';
    case 'analysis':
      return 'Analysis Error';
    case 'payment':
      return 'Payment Problem';
    default:
      return 'Unexpected Error';
  }
}

function getErrorContext(type: ErrorContext['type']): 'error' | 'url-input' | 'email-capture' | 'analysis' {
  switch (type) {
    case 'network':
    case 'unknown':
      return 'error';
    case 'validation':
      return 'url-input';
    case 'auth':
    case 'payment':
      return 'email-capture';
    case 'analysis':
      return 'analysis';
    default:
      return 'error';
  }
}

export default function ErrorDisplay({
  error,
  onRetry,
  onRecover,
  onReset,
  retryCount = 0,
  maxRetries = 3
}: ErrorDisplayProps) {
  const IconComponent = ERROR_ICONS[error.type];
  const cardColors = ERROR_COLORS[error.type];
  const titleColor = ERROR_TITLE_COLORS[error.type];
  const textColor = ERROR_TEXT_COLORS[error.type];
  const helpContext = getErrorContext(error.type);
  
  const canRetry = error.retryable && retryCount < maxRetries;
  const tooManyRetries = retryCount >= maxRetries;

  return (
    <Card className={`w-full max-w-2xl mx-auto border-2 ${cardColors}`}>
      <CardHeader className="text-center">
        <div className="flex items-center justify-center mb-4">
          <div className={`w-16 h-16 ${cardColors} rounded-full flex items-center justify-center border-2`}>
            <IconComponent className={`text-2xl ${titleColor}`} />
          </div>
        </div>
        <CardTitle className={`text-2xl ${titleColor}`}>
          {getErrorTitle(error.type)}
        </CardTitle>
        <p className={`${textColor} mt-2`}>
          {error.message}
        </p>
        {error.details && (
          <p className={`${textColor} text-sm mt-1 opacity-80`}>
            {error.details}
          </p>
        )}
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Error Info */}
        <div className="text-center text-sm text-slate-600">
          <p>Error occurred at {error.timestamp.toLocaleTimeString()}</p>
          {error.code && <p className="font-mono text-xs mt-1">Code: {error.code}</p>}
          {tooManyRetries && (
            <p className="text-orange-600 font-medium mt-2">
              Maximum retry attempts reached ({maxRetries})
            </p>
          )}
        </div>

        {/* Suggested Actions */}
        {error.suggestedActions.length > 0 && (
          <div>
            <h4 className="font-semibold text-slate-800 mb-3">💡 What you can do:</h4>
            <ul className="space-y-2">
              {error.suggestedActions.map((action, index) => (
                <li key={index} className="flex items-start">
                  <span className="text-blue-500 mr-2 mt-1">•</span>
                  <span className="text-slate-700 text-sm">{action}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Recovery Actions */}
        <div className="flex flex-col sm:flex-row gap-3">
          {canRetry && onRetry && (
            <Button
              onClick={onRetry}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
              size="lg"
            >
              <RotateCcw className="mr-2 h-5 w-5" />
              Try Again {retryCount > 0 && `(${retryCount + 1}/${maxRetries})`}
            </Button>
          )}
          
          {error.recoverable && onRecover && (
            <Button
              onClick={() => onRecover()}
              variant={canRetry ? "outline" : "default"}
              className={`flex-1 ${!canRetry ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'border-slate-300 hover:bg-slate-50'}`}
              size="lg"
            >
              <RefreshCw className="mr-2 h-5 w-5" />
              Continue
            </Button>
          )}
          
          {onReset && (
            <Button
              onClick={onReset}
              variant="outline"
              className="flex-1 border-green-300 text-green-700 hover:bg-green-50"
              size="lg"
            >
              <Home className="mr-2 h-5 w-5" />
              Start Over
            </Button>
          )}
        </div>

        {/* Help Section */}
        <div className="border-t pt-4 text-center">
          <p className="text-slate-600 mb-4 text-sm">
            Need more help with this error?
          </p>
          <div className="flex justify-center">
            <QuickHelp context={helpContext} />
          </div>
        </div>

        {/* Additional Help */}
        {error.type === 'network' && (
          <InlineHelp
            variant="info"
            content="Network errors are usually temporary. Check your internet connection and try again in a moment."
          />
        )}
        
        {error.type === 'payment' && (
          <InlineHelp
            variant="warning"
            content="Payment issues can often be resolved by checking your card details or trying a different payment method."
          />
        )}
        
        {error.type === 'analysis' && (
          <InlineHelp
            variant="info"
            content="Analysis errors might occur with complex websites. Try a simpler site first or contact support if the issue persists."
          />
        )}
      </CardContent>
    </Card>
  );
}