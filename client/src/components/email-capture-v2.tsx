/**
 * EmailCapture V2 - Refactored implementation with improved architecture
 * 
 * This is a parallel implementation of the email capture component using:
 * - Extracted smaller components (TierSelectionGrid, AuthOptionsPanel, etc.)
 * - Custom hooks for business logic (useEmailCapture, useTierSelection, useAuthRedirect)
 * - Standardized error handling and validation
 * - Enhanced analytics tracking
 * 
 * This component maintains the exact same interface and behavior as the original
 * but with much better internal architecture.
 */

import React from 'react';
import { UserTier } from '@shared/schema';
import { EmailCaptureContainer } from './email-capture/EmailCaptureContainer';

// Feature flag check
const useNewEmailCapture = import.meta.env.VITE_NEW_EMAIL_CAPTURE === 'true';

export interface EmailCaptureProps {
  websiteUrl?: string;
  onEmailCaptured: (email: string, tier: "starter" | "coffee" | "growth" | "scale") => void;
  onLoginRequested?: () => void;
  onReset?: () => void;
  isVisible: boolean;
}

/**
 * Email Capture V2 - Refactored version with improved architecture
 * 
 * Uses the new container component with extracted hooks and components
 * while maintaining the exact same external interface.
 */
export default function EmailCaptureV2(props: EmailCaptureProps) {
  // If feature flag is disabled, fall back to original implementation
  if (!useNewEmailCapture) {
    // Dynamic import to avoid bundling the original when not needed
    const OriginalEmailCapture = React.lazy(() => import('./email-capture'));
    return <OriginalEmailCapture {...props} />;
  }

  // Type assertion to ensure compatibility
  const typedProps = {
    ...props,
    onEmailCaptured: (email: string, tier: UserTier) => {
      props.onEmailCaptured(email, tier as "starter" | "coffee" | "growth" | "scale");
    }
  };

  return <EmailCaptureContainer {...typedProps} />;
}