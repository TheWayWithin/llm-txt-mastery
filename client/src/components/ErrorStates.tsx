import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { RefreshCw, Home, AlertCircle, Wifi, Bug } from 'lucide-react';

export type ErrorType = '404' | 'connection' | 'generic';

interface ErrorStatesProps {
  type: ErrorType;
  title?: string;
  message?: string;
  onRetry?: () => void;
  onHome?: () => void;
  showActions?: boolean;
  className?: string;
}

const ERROR_CONFIGS = {
  '404': {
    image: '/images/error-404.png',
    alt: 'Page not found - confused but helpful robot with magnifying glass',
    defaultTitle: 'Page Not Found',
    defaultMessage:
      "Oops! The page you're looking for seems to have wandered off. Let's help you find what you need.",
    icon: AlertCircle,
    color: 'text-orange-600',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-200',
  },
  connection: {
    image: '/images/error-connection.png',
    alt: 'Connection error - disconnected wifi and cable with retry button',
    defaultTitle: 'Connection Problem',
    defaultMessage:
      "We're having trouble connecting to our servers. Please check your internet connection and try again.",
    icon: Wifi,
    color: 'text-red-600',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
  },
  generic: {
    image: '/images/error-generic.png',
    alt: 'Something went wrong - friendly robot with wrench and tools, working to fix issues',
    defaultTitle: 'Something Went Wrong',
    defaultMessage:
      "We're working to fix this issue. Please try again in a moment, or contact support if the problem persists.",
    icon: Bug,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200',
  },
} as const;

export default function ErrorStates({
  type,
  title,
  message,
  onRetry,
  onHome,
  showActions = true,
  className = '',
}: ErrorStatesProps) {
  const config = ERROR_CONFIGS[type];
  const Icon = config.icon;

  return (
    <Card className={`${config.bgColor} ${config.borderColor} ${className}`}>
      <CardContent className="text-center py-12 px-6">
        {/* Error Illustration */}
        <div className="flex justify-center mb-6">
          <img
            src={config.image}
            alt={config.alt}
            className="max-w-xs h-auto max-h-48 rounded-lg"
          />
        </div>

        {/* Error Title */}
        <div className="flex items-center justify-center mb-3">
          <Icon className={`h-6 w-6 mr-2 ${config.color}`} />
          <h3 className={`text-xl font-semibold ${config.color}`}>
            {title || config.defaultTitle}
          </h3>
        </div>

        {/* Error Message */}
        <p className="text-gray-600 mb-6 max-w-md mx-auto">{message || config.defaultMessage}</p>

        {/* Action Buttons */}
        {showActions && (
          <div className="flex flex-col sm:flex-row gap-3 justify-center max-w-sm mx-auto">
            {onRetry && (
              <Button
                onClick={onRetry}
                className={`${config.color.replace('text-', 'bg-').replace('-600', '-600')} hover:opacity-90`}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                {type === 'connection' ? 'Reconnect' : 'Try Again'}
              </Button>
            )}

            {onHome && (
              <Button
                onClick={onHome}
                variant="outline"
                className={`${config.borderColor} ${config.color} hover:${config.bgColor}`}
              >
                <Home className="h-4 w-4 mr-2" />
                Go Home
              </Button>
            )}
          </div>
        )}

        {/* Contact Support for Generic Errors */}
        {type === 'generic' && (
          <div className="mt-6 pt-4 border-t border-purple-200">
            <p className="text-sm text-purple-600 mb-3">Need immediate help?</p>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                window.open('mailto:support@llmtxtmastery.com?subject=Error Report', '_blank')
              }
              className="text-purple-600 border-purple-300 hover:bg-purple-100"
            >
              Contact Support
            </Button>
          </div>
        )}

        {/* Additional Help for 404 Errors */}
        {type === '404' && (
          <div className="mt-6 pt-4 border-t border-orange-200">
            <p className="text-sm text-orange-600">
              Looking for something specific? Try checking our{' '}
              <a href="/" className="underline hover:no-underline">
                homepage
              </a>{' '}
              or{' '}
              <a href="/dashboard" className="underline hover:no-underline">
                dashboard
              </a>
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Convenience components for specific error types
export const NotFoundError = (props: Omit<ErrorStatesProps, 'type'>) => (
  <ErrorStates {...props} type="404" />
);

export const ConnectionError = (props: Omit<ErrorStatesProps, 'type'>) => (
  <ErrorStates {...props} type="connection" />
);

export const GenericError = (props: Omit<ErrorStatesProps, 'type'>) => (
  <ErrorStates {...props} type="generic" />
);
