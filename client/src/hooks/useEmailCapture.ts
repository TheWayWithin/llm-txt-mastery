/**
 * useEmailCapture - Main business logic hook for email capture flow
 *
 * Manages tier selection, navigation, analytics tracking, and error handling
 * for the email capture component.
 */

import { useState, useCallback } from 'react';
import { UserTier } from '@shared/schema';
import { useAnalytics } from './useAnalytics';
import { AppError, errorMessages } from '@/lib/error-utils';

export interface UseEmailCaptureOptions {
  websiteUrl?: string;
  onEmailCaptured?: (email: string, tier: UserTier) => void;
  onLoginRequested?: () => void;
  onReset?: () => void;
  initialTier?: UserTier;
}

export interface UseEmailCaptureReturn {
  // State
  selectedTier: UserTier | null;
  error: string | null;
  isLoading: boolean;

  // Actions
  selectTier: (tier: UserTier) => void;
  clearError: () => void;
  handleSignIn: () => void;
  handleSignUp: () => void;
  reset: () => void;

  // Computed
  canProceed: boolean;
  shouldShowAuthOptions: boolean;
}

/**
 * Main email capture business logic hook
 */
export function useEmailCapture(options: UseEmailCaptureOptions = {}): UseEmailCaptureReturn {
  const {
    websiteUrl,
    onEmailCaptured,
    onLoginRequested,
    onReset,
    initialTier = 'coffee',
  } = options;

  // State
  const [selectedTier, setSelectedTier] = useState<UserTier | null>(initialTier);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Analytics
  const { trackTierSelection, trackLoginAttempt, trackSignupAttempt } = useAnalytics();

  // Select tier with analytics tracking
  const selectTier = useCallback(
    (tier: UserTier) => {
      const previousTier = selectedTier;

      // Track tier selection
      trackTierSelection(tier, previousTier, websiteUrl);

      // Update state
      setSelectedTier(tier);
      setError(null); // Clear any existing errors
    },
    [selectedTier, websiteUrl, trackTierSelection]
  );

  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Handle sign in navigation
  const handleSignIn = useCallback(() => {
    if (!selectedTier) {
      setError(errorMessages.validation.tierRequired);
      return;
    }

    try {
      setIsLoading(true);

      // Track analytics
      trackLoginAttempt(selectedTier, websiteUrl);

      // Navigate to login page with tier and website parameters
      const params = new URLSearchParams();
      params.set('tier', selectedTier);
      if (websiteUrl) {
        params.set('website', websiteUrl);
      }

      const loginUrl = `/login?${params.toString()}`;

      // Use window.location for navigation to ensure proper parameter handling
      window.location.href = loginUrl;

      // Call callback if provided
      onLoginRequested?.();
    } catch (error) {
      const appError = AppError.fromError(error, 'Failed to navigate to login');
      setError(appError.message);
    } finally {
      setIsLoading(false);
    }
  }, [selectedTier, websiteUrl, trackLoginAttempt, onLoginRequested]);

  // Handle sign up navigation
  const handleSignUp = useCallback(() => {
    if (!selectedTier) {
      setError(errorMessages.validation.tierRequired);
      return;
    }

    try {
      setIsLoading(true);

      // Track analytics
      trackSignupAttempt(selectedTier, websiteUrl);

      // Navigate to signup page with tier and website parameters
      const params = new URLSearchParams();
      params.set('tier', selectedTier);
      if (websiteUrl) {
        params.set('website', websiteUrl);
      }

      const signupUrl = `/signup?${params.toString()}`;

      // Use window.location for navigation to ensure proper parameter handling
      window.location.href = signupUrl;
    } catch (error) {
      const appError = AppError.fromError(error, 'Failed to navigate to signup');
      setError(appError.message);
    } finally {
      setIsLoading(false);
    }
  }, [selectedTier, websiteUrl, trackSignupAttempt]);

  // Reset to initial state
  const reset = useCallback(() => {
    setSelectedTier(initialTier);
    setError(null);
    setIsLoading(false);
    onReset?.();
  }, [initialTier, onReset]);

  // Computed values
  const canProceed = Boolean(selectedTier && !isLoading);
  const shouldShowAuthOptions = Boolean(selectedTier);

  return {
    // State
    selectedTier,
    error,
    isLoading,

    // Actions
    selectTier,
    clearError,
    handleSignIn,
    handleSignUp,
    reset,

    // Computed
    canProceed,
    shouldShowAuthOptions,
  };
}
