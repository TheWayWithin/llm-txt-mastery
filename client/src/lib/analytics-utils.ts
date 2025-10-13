/**
 * Enhanced analytics utilities for LLM.txt Mastery
 *
 * Provides standardized event tracking, typed event definitions,
 * and analytics hook wrapper with debug support.
 */

import { UserTier } from '@shared/schema';
import { trackEvent as baseTrackEvent } from '@/lib/analytics';

// Enhanced event tracking with type safety
export interface BaseEventProperties {
  event_category?: string;
  user_id?: string;
  session_id?: string;
  timestamp?: number;
  page_path?: string;
  user_agent?: string;
  referrer?: string;
}

export interface UserEventProperties extends BaseEventProperties {
  user_tier?: UserTier;
  user_email?: string;
  credits_remaining?: number;
}

export interface BusinessEventProperties extends UserEventProperties {
  value?: number;
  currency?: string;
  transaction_id?: string;
}

export interface AnalysisEventProperties extends UserEventProperties {
  website_url?: string;
  analysis_id?: number;
  pages_discovered?: number;
  processing_time?: number;
  cache_hit?: boolean;
  ai_calls_used?: number;
  html_extractions_used?: number;
}

export interface ConversionEventProperties extends BusinessEventProperties {
  tier_selected?: UserTier;
  previous_tier?: UserTier;
  conversion_step?: string;
  funnel_position?: number;
}

// Event type definitions for better type safety
export interface EventDefinitions {
  // Page view events
  page_view: {
    page_title: string;
    page_location?: string;
  } & BaseEventProperties;

  // User engagement events
  tier_selected: {
    tier_selected: UserTier;
    previous_tier?: UserTier | null;
    website_url?: string;
  } & UserEventProperties;

  login_click: {
    tier_selected?: UserTier;
    website_url?: string;
  } & UserEventProperties;

  signup_click: {
    tier_selected?: UserTier;
    website_url?: string;
  } & UserEventProperties;

  upgrade_click: {
    from_tier: UserTier;
    to_tier: UserTier;
  } & ConversionEventProperties;

  // Analysis flow events
  analysis_start: {
    website_url: string;
    user_tier: UserTier;
  } & AnalysisEventProperties;

  analysis_complete: {
    website_url: string;
    pages_discovered: number;
    user_tier: UserTier;
    processing_time?: number;
    cache_hit?: boolean;
  } & AnalysisEventProperties;

  analysis_failed: {
    website_url: string;
    error_type: string;
    error_message?: string;
    user_tier: UserTier;
  } & AnalysisEventProperties;

  // File generation events
  file_generation: {
    analysis_id: number;
    user_tier: UserTier;
    selected_pages_count?: number;
  } & UserEventProperties;

  file_download: {
    file_id: number;
    user_tier: UserTier;
    file_size?: number;
  } & UserEventProperties;

  // Conversion events
  email_capture: {
    email_tier: UserTier;
    website_url?: string;
  } & ConversionEventProperties;

  begin_checkout: {
    tier: UserTier;
    price: number;
  } & ConversionEventProperties;

  purchase: {
    transaction_id: string;
    tier: UserTier;
    price: number;
  } & ConversionEventProperties;

  // Limit and usage events
  daily_limit_reached: {
    user_tier: UserTier;
    analyses_count: number;
    limit_type: 'daily_analyses' | 'ai_calls' | 'pages';
  } & UserEventProperties;

  // Error tracking events
  error_occurred: {
    error_type: string;
    error_message: string;
    error_context?: string;
    user_tier?: UserTier;
  } & UserEventProperties;

  // Performance events
  performance_metric: {
    metric_name: string;
    metric_value: number;
    metric_unit?: string;
  } & BaseEventProperties;
}

export type EventName = keyof EventDefinitions;
export type EventProperties<T extends EventName> = EventDefinitions[T];

// Enhanced analytics class with debugging and validation
class AnalyticsManager {
  private isEnabled: boolean;
  private debugMode: boolean;
  private sessionId: string;
  private eventQueue: Array<{ event: string; properties: any; timestamp: number }>;
  private readonly maxQueueSize = 100;

  constructor() {
    this.isEnabled = import.meta.env.PROD || import.meta.env.VITE_ANALYTICS_ENABLED === 'true';
    this.debugMode = import.meta.env.DEV || import.meta.env.VITE_ANALYTICS_DEBUG === 'true';
    this.sessionId = this.generateSessionId();
    this.eventQueue = [];

    // Initialize analytics in production
    if (this.isEnabled) {
      this.initializeAnalytics();
    }
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private initializeAnalytics(): void {
    // Analytics initialization logic would go here
    if (this.debugMode) {
      console.log('🔧 Analytics initialized in debug mode');
    }
  }

  private addToQueue(event: string, properties: any): void {
    this.eventQueue.push({
      event,
      properties,
      timestamp: Date.now(),
    });

    // Keep queue size manageable
    if (this.eventQueue.length > this.maxQueueSize) {
      this.eventQueue = this.eventQueue.slice(-this.maxQueueSize);
    }
  }

  private enhanceProperties<T extends EventName>(
    eventName: T,
    properties: EventProperties<T>
  ): EventProperties<T> {
    const enhanced = {
      ...properties,
      session_id: this.sessionId,
      timestamp: Date.now(),
      page_path: window.location.pathname,
      referrer: document.referrer,
      user_agent: navigator.userAgent,
      event_category: properties.event_category || this.getCategoryForEvent(eventName),
    };

    return enhanced;
  }

  private getCategoryForEvent(eventName: EventName): string {
    const categoryMap: Partial<Record<EventName, string>> = {
      page_view: 'navigation',
      tier_selected: 'engagement',
      login_click: 'auth',
      signup_click: 'auth',
      upgrade_click: 'conversion',
      analysis_start: 'engagement',
      analysis_complete: 'engagement',
      analysis_failed: 'error',
      file_generation: 'conversion',
      file_download: 'conversion',
      email_capture: 'conversion',
      begin_checkout: 'conversion',
      purchase: 'conversion',
      daily_limit_reached: 'limit',
      error_occurred: 'error',
      performance_metric: 'performance',
    };

    return categoryMap[eventName] || 'general';
  }

  private validateEventProperties<T extends EventName>(
    eventName: T,
    properties: EventProperties<T>
  ): boolean {
    // Basic validation - could be enhanced with schema validation
    if (!properties || typeof properties !== 'object') {
      if (this.debugMode) {
        console.warn(`⚠️ Invalid properties for event ${eventName}:`, properties);
      }
      return false;
    }

    return true;
  }

  /**
   * Track a typed analytics event
   */
  track<T extends EventName>(eventName: T, properties: EventProperties<T>): void {
    if (!this.validateEventProperties(eventName, properties)) {
      return;
    }

    const enhancedProperties = this.enhanceProperties(eventName, properties);

    // Add to queue for debugging/offline support
    this.addToQueue(eventName, enhancedProperties);

    if (this.debugMode) {
      console.log(`📊 Analytics Event: ${eventName}`, enhancedProperties);
    }

    if (this.isEnabled) {
      // Use the existing analytics infrastructure
      baseTrackEvent(eventName, enhancedProperties);
    }
  }

  /**
   * Track page view with automatic property collection
   */
  trackPageView(additionalProperties?: Partial<EventProperties<'page_view'>>): void {
    this.track('page_view', {
      page_title: document.title,
      page_location: window.location.href,
      ...additionalProperties,
    });
  }

  /**
   * Track error with context
   */
  trackError(
    error: Error | string,
    context?: string,
    additionalProperties?: Partial<EventProperties<'error_occurred'>>
  ): void {
    const errorMessage = typeof error === 'string' ? error : error.message;
    const errorType = typeof error === 'string' ? 'manual' : error.constructor.name;

    this.track('error_occurred', {
      error_type: errorType,
      error_message: errorMessage,
      error_context: context,
      ...additionalProperties,
    });
  }

  /**
   * Track performance metric
   */
  trackPerformance(
    metricName: string,
    value: number,
    unit?: string,
    additionalProperties?: Partial<EventProperties<'performance_metric'>>
  ): void {
    this.track('performance_metric', {
      metric_name: metricName,
      metric_value: value,
      metric_unit: unit,
      ...additionalProperties,
    });
  }

  /**
   * Get recent events for debugging
   */
  getEventQueue(): Array<{ event: string; properties: any; timestamp: number }> {
    return [...this.eventQueue];
  }

  /**
   * Clear event queue
   */
  clearEventQueue(): void {
    this.eventQueue = [];
  }

  /**
   * Enable/disable analytics
   */
  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
    if (this.debugMode) {
      console.log(`🔧 Analytics ${enabled ? 'enabled' : 'disabled'}`);
    }
  }

  /**
   * Enable/disable debug mode
   */
  setDebugMode(debug: boolean): void {
    this.debugMode = debug;
    if (debug) {
      console.log('🔧 Analytics debug mode enabled');
    }
  }
}

// Singleton instance
export const analytics = new AnalyticsManager();

// Convenience functions for common events
export const analyticsHelpers = {
  // User journey events
  trackTierSelection: (tier: UserTier, previousTier?: UserTier | null, websiteUrl?: string) => {
    analytics.track('tier_selected', {
      tier_selected: tier,
      previous_tier: previousTier,
      website_url: websiteUrl,
    });
  },

  trackLoginAttempt: (tier?: UserTier, websiteUrl?: string) => {
    analytics.track('login_click', {
      tier_selected: tier,
      website_url: websiteUrl,
    });
  },

  trackSignupAttempt: (tier?: UserTier, websiteUrl?: string) => {
    analytics.track('signup_click', {
      tier_selected: tier,
      website_url: websiteUrl,
    });
  },

  // Analysis flow events
  trackAnalysisStart: (websiteUrl: string, userTier: UserTier) => {
    analytics.track('analysis_start', {
      website_url: websiteUrl,
      user_tier: userTier,
    });
  },

  trackAnalysisComplete: (
    websiteUrl: string,
    pagesDiscovered: number,
    userTier: UserTier,
    processingTime?: number,
    cacheHit?: boolean
  ) => {
    analytics.track('analysis_complete', {
      website_url: websiteUrl,
      pages_discovered: pagesDiscovered,
      user_tier: userTier,
      processing_time: processingTime,
      cache_hit: cacheHit,
      value: pagesDiscovered,
    });
  },

  trackAnalysisFailed: (
    websiteUrl: string,
    errorType: string,
    userTier: UserTier,
    errorMessage?: string
  ) => {
    analytics.track('analysis_failed', {
      website_url: websiteUrl,
      error_type: errorType,
      error_message: errorMessage,
      user_tier: userTier,
    });
  },

  // Conversion events
  trackEmailCapture: (emailTier: UserTier, websiteUrl?: string) => {
    const tierValues = {
      starter: 0,
      solo: 4.95,
      growth: 14.95,
      scale: 29.95,
    };

    analytics.track('email_capture', {
      email_tier: emailTier,
      website_url: websiteUrl,
      value: tierValues[emailTier],
      currency: 'USD',
    });
  },

  trackCheckoutStart: (tier: UserTier, price: number) => {
    analytics.track('begin_checkout', {
      tier,
      price,
      value: price,
      currency: 'USD',
    });
  },

  trackPurchaseComplete: (tier: UserTier, price: number, transactionId: string) => {
    analytics.track('purchase', {
      transaction_id: transactionId,
      tier,
      price,
      value: price,
      currency: 'USD',
    });
  },

  // File events
  trackFileGeneration: (analysisId: number, userTier: UserTier, selectedPagesCount?: number) => {
    analytics.track('file_generation', {
      analysis_id: analysisId,
      user_tier: userTier,
      selected_pages_count: selectedPagesCount,
      value: 1,
    });
  },

  trackFileDownload: (fileId: number, userTier: UserTier, fileSize?: number) => {
    analytics.track('file_download', {
      file_id: fileId,
      user_tier: userTier,
      file_size: fileSize,
      value: 1,
    });
  },

  // Limit events
  trackDailyLimitReached: (
    userTier: UserTier,
    analysesCount: number,
    limitType: 'daily_analyses' | 'ai_calls' | 'pages' = 'daily_analyses'
  ) => {
    analytics.track('daily_limit_reached', {
      user_tier: userTier,
      analyses_count: analysesCount,
      limit_type: limitType,
      value: analysesCount,
    });
  },

  // Upgrade events
  trackUpgradeClick: (fromTier: UserTier, toTier: UserTier) => {
    const tierValues = {
      starter: 0,
      solo: 4.95,
      growth: 14.95,
      scale: 29.95,
    };

    analytics.track('upgrade_click', {
      from_tier: fromTier,
      to_tier: toTier,
      value: tierValues[toTier] - tierValues[fromTier],
    });
  },
};

// Export the main analytics object and helpers
export { analytics };
export default analytics;
