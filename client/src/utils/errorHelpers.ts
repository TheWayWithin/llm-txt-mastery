import { ErrorContext } from '@/hooks/useFlowStateMachine';

// Re-export so consumers (e.g. lib/error-utils) can import the type from here
export type { ErrorContext };

export function createErrorContext(
  type: ErrorContext['type'],
  message: string,
  options: Partial<{
    details: string;
    code: string;
    recoverable: boolean;
    retryable: boolean;
    suggestedActions: string[];
  }> = {}
): ErrorContext {
  const defaultActions = {
    network: [
      'Check your internet connection',
      'Try refreshing the page',
      'Wait a moment and try again',
      'Contact support if the problem persists',
    ],
    validation: [
      'Check your input format',
      'Make sure all required fields are filled',
      'Try a different value',
      'Contact support if you need help',
    ],
    auth: [
      'Try logging in again',
      'Check your credentials',
      'Reset your password if needed',
      'Contact support for account issues',
    ],
    analysis: [
      'Try a different website URL',
      'Make sure the website is publicly accessible',
      'Wait a moment and try again',
      'Contact support if issues persist',
    ],
    payment: [
      'Check your payment details',
      'Try a different payment method',
      'Contact your bank if needed',
      'Contact support for billing issues',
    ],
    unknown: [
      'Try refreshing the page',
      'Wait a moment and try again',
      'Check your internet connection',
      'Contact support if problems continue',
    ],
  };

  return {
    type,
    message,
    details: options.details,
    code: options.code,
    recoverable: options.recoverable ?? true,
    retryable: options.retryable ?? true,
    suggestedActions: options.suggestedActions ?? defaultActions[type],
    timestamp: new Date(),
  };
}

// Common error creators
export const errorHelpers = {
  networkError: (message = 'Network connection failed') =>
    createErrorContext('network', message, { retryable: true }),

  validationError: (message: string, field?: string) =>
    createErrorContext('validation', message, {
      details: field ? `Invalid field: ${field}` : undefined,
      retryable: false,
      recoverable: true,
    }),

  authError: (message = 'Authentication failed') =>
    createErrorContext('auth', message, { retryable: true }),

  analysisError: (message = 'Website analysis failed') =>
    createErrorContext('analysis', message, { retryable: true }),

  paymentError: (message = 'Payment processing failed') =>
    createErrorContext('payment', message, {
      retryable: true,
      suggestedActions: [
        'Check your payment card details',
        'Ensure your card has sufficient funds',
        'Try a different payment method',
        'Contact your bank if the card was declined',
        'Contact support if problems continue',
      ],
    }),

  unknownError: (message = 'An unexpected error occurred') =>
    createErrorContext('unknown', message, { retryable: true }),
};

// Error classification helper
export function classifyError(error: any): ErrorContext {
  const message = error?.message || error?.toString() || 'Unknown error occurred';

  if (
    message.includes('network') ||
    message.includes('fetch') ||
    message.includes('NetworkError')
  ) {
    return errorHelpers.networkError(message);
  }

  if (
    message.includes('validation') ||
    message.includes('invalid') ||
    message.includes('ValidationError')
  ) {
    return errorHelpers.validationError(message);
  }

  if (message.includes('auth') || message.includes('unauthorized') || message.includes('login')) {
    return errorHelpers.authError(message);
  }

  if (
    message.includes('analysis') ||
    message.includes('sitemap') ||
    message.includes('404') ||
    message.includes('403')
  ) {
    return errorHelpers.analysisError(message);
  }

  if (
    message.includes('payment') ||
    message.includes('stripe') ||
    message.includes('card') ||
    message.includes('billing')
  ) {
    return errorHelpers.paymentError(message);
  }

  return errorHelpers.unknownError(message);
}
