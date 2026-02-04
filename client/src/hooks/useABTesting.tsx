import { useState, useEffect, useCallback, useContext } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import { nanoid } from 'nanoid';

export interface ExperimentAssignment {
  experimentId: number;
  experimentName: string;
  variant: string;
  config?: Record<string, any>;
  assignedAt: Date;
}

export interface UseABTestReturn {
  variant: string | null;
  config: Record<string, any> | null;
  loading: boolean;
  error: string | null;
  trackEvent: (eventType: string, eventValue?: number, eventProperties?: Record<string, any>) => Promise<void>;
}

export interface UseMultipleABTestsReturn {
  assignments: Record<string, ExperimentAssignment>;
  loading: boolean;
  error: string | null;
  trackEvent: (experimentName: string, eventType: string, eventValue?: number, eventProperties?: Record<string, any>) => Promise<void>;
}

// Session ID management
let sessionId: string | null = null;

const getSessionId = (): string => {
  if (!sessionId) {
    // Try to get from sessionStorage first
    sessionId = sessionStorage.getItem('ab_session_id');
    
    if (!sessionId) {
      sessionId = nanoid();
      sessionStorage.setItem('ab_session_id', sessionId);
    }
  }
  return sessionId;
};

/**
 * Hook for single A/B test
 */
export function useABTest(experimentName: string): UseABTestReturn {
  const { user } = useContext(AuthContext);
  const [assignment, setAssignment] = useState<ExperimentAssignment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAssignment = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const userContext = {
        userId: user?.id?.toString(),
        sessionId: getSessionId(),
        email: user?.email,
        tier: user?.tier,
        properties: {
          // Add any additional user properties here
          hasCompletedOnboarding: localStorage.getItem('onboarding_completed') === 'true',
          signupDate: user?.createdAt,
          lastActiveDate: new Date().toISOString()
        }
      };

      const response = await fetch(`/api/ab-testing/assignment/${experimentName}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(user?.id && { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` })
        },
        body: JSON.stringify({ userContext })
      });

      if (!response.ok) {
        if (response.status === 404) {
          // Experiment not found or not running
          setAssignment(null);
          return;
        }
        throw new Error(`Failed to get assignment: ${response.statusText}`);
      }

      const assignmentData = await response.json();
      setAssignment(assignmentData);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get experiment assignment';
      setError(errorMessage);
      console.error('A/B test assignment error:', err);
    } finally {
      setLoading(false);
    }
  }, [experimentName, user?.id, user?.email, user?.tier]);

  const trackEvent = useCallback(async (
    eventType: string, 
    eventValue?: number, 
    eventProperties?: Record<string, any>
  ) => {
    if (!assignment) return;

    try {
      const userContext = {
        userId: user?.id?.toString(),
        sessionId: getSessionId(),
        email: user?.email,
        tier: user?.tier
      };

      await fetch(`/api/ab-testing/event/${experimentName}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(user?.id && { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` })
        },
        body: JSON.stringify({
          variant: assignment.variant,
          eventType,
          eventValue,
          eventProperties,
          userContext
        })
      });
    } catch (err) {
      console.error('Error tracking A/B test event:', err);
    }
  }, [experimentName, assignment, user?.id, user?.email, user?.tier]);

  useEffect(() => {
    fetchAssignment();
  }, [fetchAssignment]);

  return {
    variant: assignment?.variant || null,
    config: assignment?.config || null,
    loading,
    error,
    trackEvent
  };
}

/**
 * Hook for multiple A/B tests
 */
export function useMultipleABTests(experimentNames: string[]): UseMultipleABTestsReturn {
  const { user } = useContext(AuthContext);
  const [assignments, setAssignments] = useState<Record<string, ExperimentAssignment>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAssignments = useCallback(async () => {
    if (experimentNames.length === 0) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const userContext = {
        userId: user?.id?.toString(),
        sessionId: getSessionId(),
        email: user?.email,
        tier: user?.tier,
        properties: {
          hasCompletedOnboarding: localStorage.getItem('onboarding_completed') === 'true',
          signupDate: user?.createdAt,
          lastActiveDate: new Date().toISOString()
        }
      };

      const response = await fetch('/api/ab-testing/assignments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(user?.id && { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` })
        },
        body: JSON.stringify({ 
          experimentNames,
          userContext 
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to get assignments: ${response.statusText}`);
      }

      const assignmentsData = await response.json();
      setAssignments(assignmentsData);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get experiment assignments';
      setError(errorMessage);
      console.error('Multiple A/B test assignments error:', err);
    } finally {
      setLoading(false);
    }
  }, [experimentNames, user?.id, user?.email, user?.tier]);

  const trackEvent = useCallback(async (
    experimentName: string,
    eventType: string, 
    eventValue?: number, 
    eventProperties?: Record<string, any>
  ) => {
    const assignment = assignments[experimentName];
    if (!assignment) return;

    try {
      const userContext = {
        userId: user?.id?.toString(),
        sessionId: getSessionId(),
        email: user?.email,
        tier: user?.tier
      };

      await fetch(`/api/ab-testing/event/${experimentName}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(user?.id && { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` })
        },
        body: JSON.stringify({
          variant: assignment.variant,
          eventType,
          eventValue,
          eventProperties,
          userContext
        })
      });
    } catch (err) {
      console.error('Error tracking A/B test event:', err);
    }
  }, [assignments, user?.id, user?.email, user?.tier]);

  useEffect(() => {
    fetchAssignments();
  }, [fetchAssignments]);

  return {
    assignments,
    loading,
    error,
    trackEvent
  };
}

/**
 * Higher-order component for A/B test variants
 */
export function withABTest<P extends object>(
  experimentName: string,
  variants: Record<string, React.ComponentType<P>>,
  DefaultComponent?: React.ComponentType<P>
): React.ComponentType<P> {
  return function ABTestComponent(props: P) {
    const { variant, loading } = useABTest(experimentName);

    if (loading) {
      return <div className="animate-pulse bg-gray-200 h-4 w-16 rounded"></div>;
    }

    if (!variant) {
      return DefaultComponent ? <DefaultComponent {...props} /> : null;
    }

    const VariantComponent = variants[variant];
    if (!VariantComponent) {
      return DefaultComponent ? <DefaultComponent {...props} /> : null;
    }

    return <VariantComponent {...props} />;
  };
}

/**
 * Component for conditional rendering based on A/B test variant
 */
export interface ABTestGateProps {
  experimentName: string;
  variant: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
  loading?: React.ReactNode;
}

export function ABTestGate({ 
  experimentName, 
  variant: targetVariant, 
  children, 
  fallback = null, 
  loading: loadingComponent 
}: ABTestGateProps) {
  const { variant, loading } = useABTest(experimentName);

  if (loading) {
    return <>{loadingComponent || <div className="animate-pulse bg-gray-200 h-4 w-16 rounded"></div>}</>;
  }

  return <>{variant === targetVariant ? children : fallback}</>;
}

/**
 * Hook for tracking conversion events with common patterns
 */
export function useConversionTracking() {
  const trackConversion = useCallback(async (
    experimentName: string, 
    conversionType: 'signup' | 'purchase' | 'upgrade' | 'feature_use' | 'custom',
    value?: number,
    properties?: Record<string, any>
  ) => {
    try {
      const userContext = {
        userId: localStorage.getItem('user_id'),
        sessionId: getSessionId(),
      };

      await fetch(`/api/ab-testing/conversion`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify({
          experimentName,
          conversionType,
          eventValue: value,
          eventProperties: properties,
          userContext
        })
      });
    } catch (err) {
      console.error('Error tracking conversion:', err);
    }
  }, []);

  return { trackConversion };
}

/**
 * Common experiment configurations for semantic features
 */
export const SEMANTIC_EXPERIMENTS = {
  CLUSTERING_UI: 'clustering_ui_test',
  SEQUENCING_MODE: 'sequencing_mode_test', 
  ENHANCED_DESCRIPTIONS: 'enhanced_descriptions_test',
  BLOCKQUOTE_SUMMARY: 'blockquote_summary_test'
} as const;