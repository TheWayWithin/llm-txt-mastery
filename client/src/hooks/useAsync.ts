/**
 * Generic async operation handler hook
 *
 * Provides consistent loading, error, and data states for async operations
 * with automatic error handling and retry mechanism.
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { AppError, errorHandlers } from '@/lib/error-utils';

export interface UseAsyncOptions<T> {
  /** Initial data value */
  initialData?: T;
  /** Should execute immediately on mount */
  immediate?: boolean;
  /** Maximum retry attempts */
  maxRetries?: number;
  /** Retry delay in milliseconds */
  retryDelay?: number;
  /** Function to determine if error is retryable */
  isRetryable?: (error: AppError) => boolean;
  /** Callback when operation succeeds */
  onSuccess?: (data: T) => void;
  /** Callback when operation fails */
  onError?: (error: AppError) => void;
  /** Callback when operation completes (success or failure) */
  onComplete?: () => void;
}

export interface UseAsyncState<T> {
  data: T | undefined;
  error: AppError | null;
  loading: boolean;
  retryCount: number;
}

export interface UseAsyncReturn<T, Args extends any[] = []> {
  /** Current data */
  data: T | undefined;
  /** Current error */
  error: AppError | null;
  /** Loading state */
  loading: boolean;
  /** Number of retry attempts */
  retryCount: number;
  /** Execute the async operation */
  execute: (...args: Args) => Promise<T>;
  /** Retry the last failed operation */
  retry: () => Promise<T>;
  /** Reset to initial state */
  reset: () => void;
  /** Cancel ongoing operation */
  cancel: () => void;
  /** Set data manually */
  setData: (data: T | undefined) => void;
  /** Set error manually */
  setError: (error: AppError | null) => void;
}

/**
 * Generic async operation hook with retry and error handling
 */
export function useAsync<T, Args extends any[] = []>(
  asyncFunction: (...args: Args) => Promise<T>,
  options: UseAsyncOptions<T> = {}
): UseAsyncReturn<T, Args> {
  const {
    initialData,
    immediate = false,
    maxRetries = 2,
    retryDelay = 1000,
    isRetryable = (error) => error.isRetryable(),
    onSuccess,
    onError,
    onComplete,
  } = options;

  // State
  const [state, setState] = useState<UseAsyncState<T>>({
    data: initialData,
    error: null,
    loading: false,
    retryCount: 0,
  });

  // Refs for cancellation and latest args
  const cancelRef = useRef<(() => void) | null>(null);
  const latestArgsRef = useRef<Args | null>(null);
  const isMountedRef = useRef(true);

  // Cleanup on unmount
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      cancelRef.current?.();
    };
  }, []);

  // Execute with retry logic
  const executeWithRetry = useCallback(
    async (args: Args, currentRetryCount = 0): Promise<T> => {
      if (!isMountedRef.current) {
        throw new Error('Component unmounted');
      }

      try {
        // Create cancellation mechanism
        let isCancelled = false;
        cancelRef.current = () => {
          isCancelled = true;
        };

        // Set loading state
        setState((prev) => ({
          ...prev,
          loading: true,
          error: null,
        }));

        // Execute the async function
        const result = await asyncFunction(...args);

        // Check if cancelled before setting result
        if (isCancelled || !isMountedRef.current) {
          throw new Error('Operation cancelled');
        }

        // Success
        setState((prev) => ({
          ...prev,
          data: result,
          loading: false,
          error: null,
          retryCount: currentRetryCount,
        }));

        onSuccess?.(result);
        onComplete?.();

        return result;
      } catch (error) {
        if (!isMountedRef.current) {
          return Promise.reject(error);
        }

        const appError = AppError.fromError(error);

        // Check if we should retry
        const shouldRetry = currentRetryCount < maxRetries && isRetryable(appError);

        if (shouldRetry) {
          // Wait before retry
          await new Promise((resolve) => setTimeout(resolve, retryDelay));

          // Recursive retry
          return executeWithRetry(args, currentRetryCount + 1);
        } else {
          // Final failure
          setState((prev) => ({
            ...prev,
            loading: false,
            error: appError,
            retryCount: currentRetryCount,
          }));

          onError?.(appError);
          onComplete?.();

          throw appError;
        }
      } finally {
        cancelRef.current = null;
      }
    },
    [asyncFunction, maxRetries, retryDelay, isRetryable, onSuccess, onError, onComplete]
  );

  // Main execute function
  const execute = useCallback(
    async (...args: Args): Promise<T> => {
      latestArgsRef.current = args;
      return executeWithRetry(args, 0);
    },
    [executeWithRetry]
  );

  // Retry function
  const retry = useCallback(async (): Promise<T> => {
    if (!latestArgsRef.current) {
      throw new Error('No previous operation to retry');
    }
    return execute(...latestArgsRef.current);
  }, [execute]);

  // Reset function
  const reset = useCallback(() => {
    cancelRef.current?.();
    setState({
      data: initialData,
      error: null,
      loading: false,
      retryCount: 0,
    });
    latestArgsRef.current = null;
  }, [initialData]);

  // Cancel function
  const cancel = useCallback(() => {
    cancelRef.current?.();
    setState((prev) => ({
      ...prev,
      loading: false,
    }));
  }, []);

  // Manual data setter
  const setData = useCallback((data: T | undefined) => {
    setState((prev) => ({
      ...prev,
      data,
      error: null,
    }));
  }, []);

  // Manual error setter
  const setError = useCallback((error: AppError | null) => {
    setState((prev) => ({
      ...prev,
      error,
      data: undefined,
    }));
  }, []);

  // Execute immediately if requested. `immediate` is only meaningful for
  // zero-argument async functions (Args = [], the default type parameter);
  // this has always called execute with no arguments.
  useEffect(() => {
    if (immediate && latestArgsRef.current === null) {
      execute(...([] as unknown as Args));
    }
  }, [immediate, execute]);

  return {
    data: state.data,
    error: state.error,
    loading: state.loading,
    retryCount: state.retryCount,
    execute,
    retry,
    reset,
    cancel,
    setData,
    setError,
  };
}

/**
 * Specialized hook for simple async operations without arguments
 */
export function useAsyncOperation<T>(
  asyncFunction: () => Promise<T>,
  options?: UseAsyncOptions<T>
): Omit<UseAsyncReturn<T>, 'execute'> & { execute: () => Promise<T> } {
  const result = useAsync(asyncFunction, options);

  return {
    ...result,
    execute: () => result.execute(),
  };
}

/**
 * Hook for async operations that should execute on mount
 */
export function useAsyncEffect<T>(
  asyncFunction: () => Promise<T>,
  dependencies: any[] = [],
  options?: Omit<UseAsyncOptions<T>, 'immediate'>
): Omit<UseAsyncReturn<T>, 'execute'> {
  const { execute, ...rest } = useAsync(asyncFunction, {
    ...options,
    immediate: false,
  });

  useEffect(() => {
    execute();
  }, dependencies);

  return rest;
}
