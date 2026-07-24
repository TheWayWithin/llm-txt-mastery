/**
 * Analytics hook for simplified event tracking
 *
 * Provides a React hook interface for the analytics system with
 * automatic context management and debugging support.
 */

import { useCallback, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { analytics, analyticsHelpers, EventName, EventProperties } from '@/lib/analytics-utils';
import { UserTier, StoredUserTier } from '@shared/schema';

export interface UseAnalyticsOptions {
  /** Enable debug mode for this component */
  debug?: boolean;
  /** Automatically track page views */
  trackPageViews?: boolean;
  /** User context to include in events */
  userContext?: {
    tier?: StoredUserTier;
    email?: string;
    creditsRemaining?: number;
  };
}

export interface UseAnalyticsReturn {
  /** Track a typed event */
  track: <T extends EventName>(
    eventName: T,
    properties: Omit<EventProperties<T>, 'user_tier' | 'user_email' | 'credits_remaining'>
  ) => void;
  /** Track page view */
  trackPageView: (additionalProperties?: Record<string, any>) => void;
  /** Track error */
  trackError: (error: Error | string, context?: string) => void;
  /** Track performance metric */
  trackPerformance: (metricName: string, value: number, unit?: string) => void;

  // Convenience methods for common events
  trackTierSelection: typeof analyticsHelpers.trackTierSelection;
  trackLoginAttempt: typeof analyticsHelpers.trackLoginAttempt;
  trackSignupAttempt: typeof analyticsHelpers.trackSignupAttempt;
  trackAnalysisStart: typeof analyticsHelpers.trackAnalysisStart;
  trackAnalysisComplete: typeof analyticsHelpers.trackAnalysisComplete;
  trackAnalysisFailed: typeof analyticsHelpers.trackAnalysisFailed;
  trackEmailCapture: typeof analyticsHelpers.trackEmailCapture;
  trackCheckoutStart: typeof analyticsHelpers.trackCheckoutStart;
  trackPurchaseComplete: typeof analyticsHelpers.trackPurchaseComplete;
  trackFileGeneration: typeof analyticsHelpers.trackFileGeneration;
  trackFileDownload: typeof analyticsHelpers.trackFileDownload;
  trackDailyLimitReached: typeof analyticsHelpers.trackDailyLimitReached;
  trackUpgradeClick: typeof analyticsHelpers.trackUpgradeClick;

  /** Get recent events for debugging */
  getEventQueue: () => Array<{ event: string; properties: any; timestamp: number }>;
  /** Clear event queue */
  clearEventQueue: () => void;
}

/**
 * Analytics hook with automatic user context
 */
export function useAnalytics(options: UseAnalyticsOptions = {}): UseAnalyticsReturn {
  const { debug = false, trackPageViews = false, userContext: manualUserContext } = options;

  const { user } = useAuth();
  const mountedRef = useRef(true);

  // Determine user context
  const userContext = manualUserContext || {
    tier: user?.tier,
    email: user?.email,
    creditsRemaining: user?.creditsRemaining,
  };

  // Set debug mode
  useEffect(() => {
    if (debug) {
      analytics.setDebugMode(true);
    }

    return () => {
      if (debug) {
        analytics.setDebugMode(false);
      }
    };
  }, [debug]);

  // Track page views if enabled
  useEffect(() => {
    if (trackPageViews && mountedRef.current) {
      analytics.trackPageView({
        user_tier: userContext.tier,
        user_email: userContext.email,
        credits_remaining: userContext.creditsRemaining,
      });
    }
  }, [trackPageViews, userContext.tier, userContext.email, userContext.creditsRemaining]);

  // Cleanup on unmount
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Enhanced track function with automatic user context
  const track = useCallback(
    <T extends EventName>(
      eventName: T,
      properties: Omit<EventProperties<T>, 'user_tier' | 'user_email' | 'credits_remaining'>
    ) => {
      if (!mountedRef.current) return;

      const enhancedProperties = {
        ...properties,
        user_tier: userContext.tier,
        user_email: userContext.email,
        credits_remaining: userContext.creditsRemaining,
      } as EventProperties<T>;

      analytics.track(eventName, enhancedProperties);
    },
    [userContext]
  );

  // Enhanced trackPageView with user context
  const trackPageView = useCallback(
    (additionalProperties: Record<string, any> = {}) => {
      if (!mountedRef.current) return;

      analytics.trackPageView({
        ...additionalProperties,
        user_tier: userContext.tier,
        user_email: userContext.email,
        credits_remaining: userContext.creditsRemaining,
      });
    },
    [userContext]
  );

  // Enhanced trackError with user context
  const trackError = useCallback(
    (error: Error | string, context?: string) => {
      if (!mountedRef.current) return;

      analytics.trackError(error, context, {
        user_tier: userContext.tier,
        user_email: userContext.email,
        credits_remaining: userContext.creditsRemaining,
      });
    },
    [userContext]
  );

  // Enhanced trackPerformance with user context
  const trackPerformance = useCallback(
    (metricName: string, value: number, unit?: string) => {
      if (!mountedRef.current) return;

      analytics.trackPerformance(metricName, value, unit, {
        user_tier: userContext.tier,
        user_email: userContext.email,
        credits_remaining: userContext.creditsRemaining,
      });
    },
    [userContext]
  );

  // Convenience methods from analyticsHelpers
  const trackTierSelection = useCallback(
    (tier: UserTier, previousTier?: UserTier | null, websiteUrl?: string) => {
      if (!mountedRef.current) return;
      analyticsHelpers.trackTierSelection(tier, previousTier, websiteUrl);
    },
    []
  );

  const trackLoginAttempt = useCallback((tier?: UserTier, websiteUrl?: string) => {
    if (!mountedRef.current) return;
    analyticsHelpers.trackLoginAttempt(tier, websiteUrl);
  }, []);

  const trackSignupAttempt = useCallback((tier?: UserTier, websiteUrl?: string) => {
    if (!mountedRef.current) return;
    analyticsHelpers.trackSignupAttempt(tier, websiteUrl);
  }, []);

  const trackAnalysisStart = useCallback((websiteUrl: string, userTier: UserTier) => {
    if (!mountedRef.current) return;
    analyticsHelpers.trackAnalysisStart(websiteUrl, userTier);
  }, []);

  const trackAnalysisComplete = useCallback(
    (
      websiteUrl: string,
      pagesDiscovered: number,
      userTier: UserTier,
      processingTime?: number,
      cacheHit?: boolean
    ) => {
      if (!mountedRef.current) return;
      analyticsHelpers.trackAnalysisComplete(
        websiteUrl,
        pagesDiscovered,
        userTier,
        processingTime,
        cacheHit
      );
    },
    []
  );

  const trackAnalysisFailed = useCallback(
    (websiteUrl: string, errorType: string, userTier: UserTier, errorMessage?: string) => {
      if (!mountedRef.current) return;
      analyticsHelpers.trackAnalysisFailed(websiteUrl, errorType, userTier, errorMessage);
    },
    []
  );

  const trackEmailCapture = useCallback((emailTier: UserTier, websiteUrl?: string) => {
    if (!mountedRef.current) return;
    analyticsHelpers.trackEmailCapture(emailTier, websiteUrl);
  }, []);

  const trackCheckoutStart = useCallback((tier: UserTier, price: number) => {
    if (!mountedRef.current) return;
    analyticsHelpers.trackCheckoutStart(tier, price);
  }, []);

  const trackPurchaseComplete = useCallback(
    (tier: UserTier, price: number, transactionId: string) => {
      if (!mountedRef.current) return;
      analyticsHelpers.trackPurchaseComplete(tier, price, transactionId);
    },
    []
  );

  const trackFileGeneration = useCallback(
    (analysisId: number, userTier: UserTier, selectedPagesCount?: number) => {
      if (!mountedRef.current) return;
      analyticsHelpers.trackFileGeneration(analysisId, userTier, selectedPagesCount);
    },
    []
  );

  const trackFileDownload = useCallback((fileId: number, userTier: UserTier, fileSize?: number) => {
    if (!mountedRef.current) return;
    analyticsHelpers.trackFileDownload(fileId, userTier, fileSize);
  }, []);

  const trackDailyLimitReached = useCallback(
    (
      userTier: UserTier,
      analysesCount: number,
      limitType: 'daily_analyses' | 'ai_calls' | 'pages' = 'daily_analyses'
    ) => {
      if (!mountedRef.current) return;
      analyticsHelpers.trackDailyLimitReached(userTier, analysesCount, limitType);
    },
    []
  );

  const trackUpgradeClick = useCallback((fromTier: UserTier, toTier: UserTier) => {
    if (!mountedRef.current) return;
    analyticsHelpers.trackUpgradeClick(fromTier, toTier);
  }, []);

  return {
    track,
    trackPageView,
    trackError,
    trackPerformance,
    trackTierSelection,
    trackLoginAttempt,
    trackSignupAttempt,
    trackAnalysisStart,
    trackAnalysisComplete,
    trackAnalysisFailed,
    trackEmailCapture,
    trackCheckoutStart,
    trackPurchaseComplete,
    trackFileGeneration,
    trackFileDownload,
    trackDailyLimitReached,
    trackUpgradeClick,
    getEventQueue: analytics.getEventQueue.bind(analytics),
    clearEventQueue: analytics.clearEventQueue.bind(analytics),
  };
}

/**
 * Hook for automatic page view tracking
 */
export function usePageTracking(pageName?: string, additionalProperties?: Record<string, any>) {
  const { trackPageView } = useAnalytics();

  useEffect(() => {
    trackPageView({
      page_title: pageName || document.title,
      ...additionalProperties,
    });
  }, [pageName, trackPageView, additionalProperties]);
}

/**
 * Hook for performance monitoring
 */
export function usePerformanceTracking(componentName: string) {
  const { trackPerformance } = useAnalytics();
  const startTimeRef = useRef<number>();

  useEffect(() => {
    // Track component mount time
    startTimeRef.current = performance.now();

    return () => {
      // Track component unmount time
      if (startTimeRef.current) {
        const mountDuration = performance.now() - startTimeRef.current;
        trackPerformance(`${componentName}_mount_time`, mountDuration, 'ms');
      }
    };
  }, [componentName, trackPerformance]);

  const trackRenderTime = useCallback(
    (renderPhase: string = 'default') => {
      if (startTimeRef.current) {
        const renderTime = performance.now() - startTimeRef.current;
        trackPerformance(`${componentName}_${renderPhase}_render_time`, renderTime, 'ms');
      }
    },
    [componentName, trackPerformance]
  );

  const trackCustomMetric = useCallback(
    (metricName: string, value: number, unit?: string) => {
      trackPerformance(`${componentName}_${metricName}`, value, unit);
    },
    [componentName, trackPerformance]
  );

  return {
    trackRenderTime,
    trackCustomMetric,
  };
}
