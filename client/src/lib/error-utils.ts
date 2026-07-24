/**
 * Standardized error handling utilities for LLM.txt Mastery
 *
 * Provides consistent error handling patterns, display components,
 * and recovery mechanisms across the application.
 */

import { ReactNode } from 'react';
import {
  ErrorContext,
  createErrorContext,
  errorHelpers,
  classifyError,
} from '@/utils/errorHelpers';

// Re-export existing error helpers for consistency
export { createErrorContext, errorHelpers, classifyError };
export type { ErrorContext };

// Enhanced error types for better categorization
export interface FormFieldError {
  field: string;
  message: string;
  code?: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: FormFieldError[];
  firstError?: FormFieldError;
}

// Error display configuration
export interface ErrorDisplayConfig {
  showIcon?: boolean;
  showActions?: boolean;
  compact?: boolean;
  dismissible?: boolean;
  severity?: 'error' | 'warning' | 'info';
}

// Toast notification types
export interface ToastOptions {
  type: 'error' | 'success' | 'warning' | 'info';
  title?: string;
  message: string;
  duration?: number;
  persistent?: boolean;
  actions?: Array<{
    label: string;
    action: () => void;
    variant?: 'default' | 'destructive' | 'outline';
  }>;
}

/**
 * Enhanced error wrapper that provides additional context and recovery options
 */
export class AppError extends Error {
  public readonly context: ErrorContext;
  public readonly originalError?: Error;

  constructor(context: ErrorContext | string, originalError?: Error) {
    const errorContext = typeof context === 'string' ? errorHelpers.unknownError(context) : context;

    super(errorContext.message);
    this.name = 'AppError';
    this.context = errorContext;
    this.originalError = originalError;
  }

  static fromError(error: unknown, fallbackMessage = 'An unexpected error occurred'): AppError {
    if (error instanceof AppError) {
      return error;
    }

    if (error instanceof Error) {
      const context = classifyError(error);
      return new AppError(context, error);
    }

    const context = errorHelpers.unknownError(typeof error === 'string' ? error : fallbackMessage);
    return new AppError(context);
  }

  isRetryable(): boolean {
    return this.context.retryable ?? false;
  }

  isRecoverable(): boolean {
    return this.context.recoverable ?? true;
  }

  getSuggestedActions(): string[] {
    return this.context.suggestedActions || [];
  }
}

/**
 * Form validation error aggregator
 */
export class ValidationError extends Error {
  public readonly errors: FormFieldError[];

  constructor(errors: FormFieldError[] | string, field?: string) {
    if (typeof errors === 'string') {
      const error: FormFieldError = { field: field || 'unknown', message: errors };
      super(errors);
      this.errors = [error];
    } else {
      super(`Validation failed: ${errors.map((e) => e.message).join(', ')}`);
      this.errors = errors;
    }
    this.name = 'ValidationError';
  }

  hasFieldError(field: string): boolean {
    return this.errors.some((error) => error.field === field);
  }

  getFieldError(field: string): FormFieldError | undefined {
    return this.errors.find((error) => error.field === field);
  }

  getFieldErrors(field: string): FormFieldError[] {
    return this.errors.filter((error) => error.field === field);
  }

  toValidationResult(): ValidationResult {
    return {
      isValid: false,
      errors: this.errors,
      firstError: this.errors[0],
    };
  }
}

/**
 * Standardized error message formatting
 */
export const errorMessages = {
  // Network errors
  network: {
    offline: 'You appear to be offline. Please check your internet connection.',
    timeout: 'The request timed out. Please try again.',
    serverError: 'Server error occurred. Our team has been notified.',
    maintenance: 'The service is temporarily unavailable for maintenance.',
  },

  // Validation errors
  validation: {
    required: (field: string) => `${field} is required`,
    email: 'Please enter a valid email address',
    url: 'Please enter a valid URL',
    password: 'Password must be at least 8 characters long',
    passwordMismatch: 'Passwords do not match',
    tierRequired: 'Please select a service tier',
  },

  // Authentication errors
  auth: {
    invalidCredentials: 'Invalid email or password. Please try again.',
    accountNotFound: 'No account found with this email address.',
    emailExists: 'An account with this email already exists.',
    emailNotVerified: 'Please verify your email address to continue.',
    sessionExpired: 'Your session has expired. Please log in again.',
    unauthorized: 'You do not have permission to access this resource.',
  },

  // Analysis errors
  analysis: {
    urlNotAccessible: 'The website could not be accessed. Please check the URL.',
    noContent: 'No suitable content was found on this website.',
    processingFailed: 'Website analysis failed. Please try again.',
    limitExceeded: 'Daily analysis limit reached. Upgrade for more analyses.',
    invalidWebsite: 'This URL does not appear to be a valid website.',
  },

  // Payment errors
  payment: {
    cardDeclined: 'Your card was declined. Please try a different payment method.',
    insufficientFunds: 'Insufficient funds. Please check your account balance.',
    processing: 'Payment processing failed. Please try again.',
    subscriptionFailed: 'Subscription setup failed. Please contact support.',
  },
} as const;

/**
 * Error recovery strategies
 */
export const errorRecovery = {
  retry: {
    withBackoff: (fn: () => Promise<any>, maxAttempts = 3, baseDelay = 1000) => {
      return async () => {
        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
          try {
            return await fn();
          } catch (error) {
            if (attempt === maxAttempts) throw error;

            const delay = baseDelay * Math.pow(2, attempt - 1);
            await new Promise((resolve) => setTimeout(resolve, delay));
          }
        }
      };
    },

    immediate: (fn: () => Promise<any>, maxAttempts = 2) => {
      return errorRecovery.retry.withBackoff(fn, maxAttempts, 0);
    },
  },

  fallback: {
    withDefault: <T>(fn: () => Promise<T>, defaultValue: T) => {
      return async (): Promise<T> => {
        try {
          return await fn();
        } catch {
          return defaultValue;
        }
      };
    },
  },
};

/**
 * Common error handling patterns
 */
export const errorHandlers = {
  /**
   * Handle async operations with consistent error handling
   */
  async: async <T>(
    operation: () => Promise<T>,
    errorMessage?: string
  ): Promise<{ data?: T; error?: AppError }> => {
    try {
      const data = await operation();
      return { data };
    } catch (error) {
      const appError = AppError.fromError(error, errorMessage);
      return { error: appError };
    }
  },

  /**
   * Handle form submission errors
   */
  form: (error: unknown): ValidationResult => {
    if (error instanceof ValidationError) {
      return error.toValidationResult();
    }

    const appError = AppError.fromError(error);
    return {
      isValid: false,
      errors: [{ field: 'form', message: appError.message }],
      firstError: { field: 'form', message: appError.message },
    };
  },

  /**
   * Handle API response errors
   */
  api: (response: Response, data?: any): AppError => {
    const message = data?.error || data?.message || 'API request failed';

    if (response.status === 401) {
      return new AppError(errorHelpers.authError(message));
    }

    if (response.status === 400) {
      return new AppError(errorHelpers.validationError(message));
    }

    if (response.status >= 500) {
      return new AppError(errorHelpers.networkError(message));
    }

    return new AppError(errorHelpers.unknownError(message));
  },
};

/**
 * Utility functions for error display
 */
export const errorUtils = {
  /**
   * Get appropriate error icon based on error type
   */
  getErrorIcon: (errorType: ErrorContext['type']) => {
    const iconMap = {
      network: 'wifi-off',
      validation: 'alert-circle',
      auth: 'lock',
      analysis: 'search-x',
      payment: 'credit-card',
      unknown: 'alert-triangle',
    };
    return iconMap[errorType] || iconMap.unknown;
  },

  /**
   * Get error severity based on type
   */
  getErrorSeverity: (errorType: ErrorContext['type']): 'error' | 'warning' | 'info' => {
    const severityMap = {
      network: 'error' as const,
      validation: 'warning' as const,
      auth: 'warning' as const,
      analysis: 'error' as const,
      payment: 'error' as const,
      unknown: 'error' as const,
    };
    return severityMap[errorType] || 'error';
  },

  /**
   * Check if error should be reported to error tracking service
   */
  shouldReport: (error: AppError): boolean => {
    // Don't report validation errors or user-facing errors
    return !['validation', 'auth'].includes(error.context.type);
  },

  /**
   * Extract user-friendly message from error
   */
  getUserMessage: (error: unknown): string => {
    if (error instanceof AppError) {
      return error.context.message;
    }

    if (error instanceof ValidationError) {
      return error.errors[0]?.message || 'Please check your input';
    }

    if (error instanceof Error) {
      return error.message;
    }

    return 'An unexpected error occurred';
  },
};
