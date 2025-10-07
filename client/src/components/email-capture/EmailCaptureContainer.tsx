/**
 * EmailCaptureContainer - Business logic container for email capture
 *
 * Orchestrates the email capture flow using extracted hooks and components.
 * This is the new implementation that will replace the monolithic email-capture.tsx
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Mail, RotateCcw, Home } from 'lucide-react';
import { QuickHelp } from '../HelpSystem';
import { UserTier } from '@shared/schema';

// Extracted components
import { TierSelectionGrid } from './TierSelectionGrid';
import { AuthOptionsPanel } from './AuthOptionsPanel';
import { TierGuaranteeContent } from './TierGuaranteeContent';

// Extracted hooks
import { useEmailCapture } from '@/hooks/useEmailCapture';
import { useAnalytics } from '@/hooks/useAnalytics';

// Utilities
import { AppError } from '@/lib/error-utils';

export interface EmailCaptureContainerProps {
  websiteUrl?: string;
  onEmailCaptured: (email: string, tier: UserTier) => void;
  onLoginRequested?: () => void;
  onReset?: () => void;
  isVisible: boolean;
}

/**
 * Container component that orchestrates the email capture flow
 */
export function EmailCaptureContainer({
  websiteUrl,
  onEmailCaptured,
  onLoginRequested,
  onReset,
  isVisible,
}: EmailCaptureContainerProps) {
  // Main business logic hook
  const {
    selectedTier,
    error,
    isLoading,
    selectTier,
    clearError,
    handleSignIn,
    handleSignUp,
    reset,
    canProceed,
    shouldShowAuthOptions,
  } = useEmailCapture({
    websiteUrl,
    onEmailCaptured,
    onLoginRequested,
    onReset,
  });

  // Analytics for component-level tracking
  const { trackError } = useAnalytics();

  // Handle error tracking
  const handleErrorWithTracking = (errorMessage: string) => {
    trackError(new Error(errorMessage), 'email_capture_container');
  };

  // Enhanced error handling
  const handleErrorDismiss = () => {
    clearError();
  };

  // Enhanced reset with error tracking
  const handleReset = () => {
    try {
      reset();
    } catch (error) {
      const appError = AppError.fromError(error);
      handleErrorWithTracking(appError.message);
    }
  };

  // Don't render if not visible
  if (!isVisible) return null;

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader className="text-center">
        <CardTitle className="flex items-center justify-center space-x-2">
          <Mail className="text-mastery-blue" />
          <span>Choose Your Analysis Type</span>
        </CardTitle>
        <p className="text-sm text-ai-silver">
          {websiteUrl ? (
            <>
              Generate professional llms.txt files for <strong>{websiteUrl}</strong> in seconds
            </>
          ) : (
            <>
              Select your tier, enter your email, and we'll help you create a professional llms.txt
              file
            </>
          )}
        </p>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <h4 className="text-sm font-semibold text-red-800 mb-2">Unable to proceed</h4>
                <p className="text-sm text-red-700 mb-3">{error}</p>
                <div className="flex items-center space-x-3">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleErrorDismiss}
                    className="border-red-300 text-red-700 hover:bg-red-100"
                    disabled={isLoading}
                  >
                    <RotateCcw className="h-4 w-4 mr-1" />
                    Try Again
                  </Button>
                  {onReset && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleReset}
                      className="border-green-300 text-green-700 hover:bg-green-100"
                      disabled={isLoading}
                    >
                      <Home className="h-4 w-4 mr-1" />
                      Start Over
                    </Button>
                  )}
                </div>
              </div>
              <div className="ml-4">
                <QuickHelp context="email-capture" />
              </div>
            </div>
          </div>
        )}

        {/* Tier Selection Grid */}
        <TierSelectionGrid
          selectedTier={selectedTier}
          onTierSelect={selectTier}
          disabled={isLoading}
        />

        {/* Authentication Options - Show after tier selection */}
        {shouldShowAuthOptions && selectedTier && (
          <div className="space-y-6">
            {/* Help Section */}
            <div className="flex items-center justify-between border-t pt-4">
              <div className="text-sm text-slate-600">
                Need help choosing? <span className="font-medium">Coffee tier</span> is perfect for
                most users.
              </div>
              <QuickHelp context="email-capture" />
            </div>

            {/* Authentication Panel */}
            <AuthOptionsPanel
              selectedTier={selectedTier}
              onSignIn={handleSignIn}
              onSignUp={handleSignUp}
              loading={isLoading}
              disabled={!canProceed}
            />

            {/* Tier-specific content and guarantees */}
            <TierGuaranteeContent selectedTier={selectedTier} />
          </div>
        )}

        {/* Show tier selection prompt when no tier is selected */}
        {!selectedTier && (
          <div className="text-center py-8">
            <p className="text-slate-600 text-lg">Please select a tier above to continue</p>
            <p className="text-sm text-slate-500 mt-2">
              Choose the analysis type that best fits your needs
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
