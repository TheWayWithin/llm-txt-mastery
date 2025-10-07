/**
 * useAuthRedirect - Navigation logic for authentication flows
 *
 * Handles navigation to login/signup pages with proper parameter preservation
 * and error handling.
 */

import { useCallback, useState } from 'react';
import { UserTier } from '@shared/schema';
import { AppError, errorMessages } from '@/lib/error-utils';
import { useAnalytics } from './useAnalytics';

export interface UseAuthRedirectOptions {
  websiteUrl?: string;
  onNavigationError?: (error: AppError) => void;
}

export interface UseAuthRedirectReturn {
  // State
  isNavigating: boolean;
  navigationError: string | null;

  // Actions
  navigateToLogin: (tier: UserTier, additionalParams?: Record<string, string>) => void;
  navigateToSignup: (tier: UserTier, additionalParams?: Record<string, string>) => void;
  clearNavigationError: () => void;

  // Helpers
  buildAuthUrl: (
    path: 'login' | 'signup',
    tier: UserTier,
    additionalParams?: Record<string, string>
  ) => string;
}

/**
 * Hook for handling authentication navigation with analytics
 */
export function useAuthRedirect(options: UseAuthRedirectOptions = {}): UseAuthRedirectReturn {
  const { websiteUrl, onNavigationError } = options;

  // State
  const [isNavigating, setIsNavigating] = useState(false);
  const [navigationError, setNavigationError] = useState<string | null>(null);

  // Analytics
  const { trackLoginAttempt, trackSignupAttempt } = useAnalytics();

  // Build authentication URL with parameters
  const buildAuthUrl = useCallback(
    (
      path: 'login' | 'signup',
      tier: UserTier,
      additionalParams: Record<string, string> = {}
    ): string => {
      const params = new URLSearchParams();

      // Required tier parameter
      params.set('tier', tier);

      // Optional website URL
      if (websiteUrl) {
        params.set('website', websiteUrl);
      }

      // Additional parameters
      Object.entries(additionalParams).forEach(([key, value]) => {
        if (value) {
          params.set(key, value);
        }
      });

      return `/${path}?${params.toString()}`;
    },
    [websiteUrl]
  );

  // Navigate to login with error handling
  const navigateToLogin = useCallback(
    (tier: UserTier, additionalParams: Record<string, string> = {}) => {
      try {
        setIsNavigating(true);
        setNavigationError(null);

        // Validate tier
        if (!tier) {
          throw new Error(errorMessages.validation.tierRequired);
        }

        // Track analytics
        trackLoginAttempt(tier, websiteUrl);

        // Build URL and navigate
        const loginUrl = buildAuthUrl('login', tier, additionalParams);

        // Use window.location for reliable navigation
        window.location.href = loginUrl;
      } catch (error) {
        const appError = AppError.fromError(error, 'Failed to navigate to login');
        setNavigationError(appError.message);
        onNavigationError?.(appError);
      } finally {
        // Note: This may not execute if navigation occurs immediately
        setIsNavigating(false);
      }
    },
    [websiteUrl, trackLoginAttempt, buildAuthUrl, onNavigationError]
  );

  // Navigate to signup with error handling
  const navigateToSignup = useCallback(
    (tier: UserTier, additionalParams: Record<string, string> = {}) => {
      try {
        setIsNavigating(true);
        setNavigationError(null);

        // Validate tier
        if (!tier) {
          throw new Error(errorMessages.validation.tierRequired);
        }

        // Track analytics
        trackSignupAttempt(tier, websiteUrl);

        // Build URL and navigate
        const signupUrl = buildAuthUrl('signup', tier, additionalParams);

        // Use window.location for reliable navigation
        window.location.href = signupUrl;
      } catch (error) {
        const appError = AppError.fromError(error, 'Failed to navigate to signup');
        setNavigationError(appError.message);
        onNavigationError?.(appError);
      } finally {
        // Note: This may not execute if navigation occurs immediately
        setIsNavigating(false);
      }
    },
    [websiteUrl, trackSignupAttempt, buildAuthUrl, onNavigationError]
  );

  // Clear navigation error
  const clearNavigationError = useCallback(() => {
    setNavigationError(null);
  }, []);

  return {
    // State
    isNavigating,
    navigationError,

    // Actions
    navigateToLogin,
    navigateToSignup,
    clearNavigationError,

    // Helpers
    buildAuthUrl,
  };
}

/**
 * Simple navigation hook for basic auth redirects
 */
export function useSimpleAuthRedirect(websiteUrl?: string) {
  const { navigateToLogin, navigateToSignup, isNavigating } = useAuthRedirect({ websiteUrl });

  return {
    navigateToLogin,
    navigateToSignup,
    isNavigating,
  };
}
