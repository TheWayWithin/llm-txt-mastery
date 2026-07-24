import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';

export type FeatureFlagName =
  | 'clustering'
  | 'semantic_tags'
  | 'enhanced_descriptions'
  | 'multi_sequencing'
  | 'blockquote_summaries'
  | 'admin_dashboard'
  | 'performance_metrics';

export interface FeatureFlagResponse {
  flags: Record<FeatureFlagName, boolean>;
  enabledFeatures: FeatureFlagName[];
  stats?: {
    totalFlags: number;
    enabledFlags: number;
    rolloutFlags: number;
    userOverrides: number;
  };
}

export interface UseFeatureFlagsReturn {
  flags: Record<FeatureFlagName, boolean>;
  enabledFeatures: FeatureFlagName[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  isEnabled: (flag: FeatureFlagName) => boolean;
}

/**
 * Hook for accessing feature flags in React components
 */
export function useFeatureFlags(): UseFeatureFlagsReturn {
  const { user } = useAuth();
  const [flags, setFlags] = useState<Record<FeatureFlagName, boolean>>(
    {} as Record<FeatureFlagName, boolean>
  );
  const [enabledFeatures, setEnabledFeatures] = useState<FeatureFlagName[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchFlags = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/feature-flags', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(user?.id && { Authorization: `Bearer ${localStorage.getItem('auth_token')}` }),
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch feature flags: ${response.statusText}`);
      }

      const data: FeatureFlagResponse = await response.json();
      setFlags(data.flags);
      setEnabledFeatures(data.enabledFeatures);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load feature flags';
      setError(errorMessage);
      console.error('Feature flags error:', err);

      // Set default flags for graceful degradation
      setFlags({
        clustering: false,
        semantic_tags: false,
        enhanced_descriptions: false,
        multi_sequencing: false,
        blockquote_summaries: false,
        admin_dashboard: false,
        performance_metrics: process.env.NODE_ENV === 'development',
      } as Record<FeatureFlagName, boolean>);
      setEnabledFeatures([]);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  const isEnabled = useCallback(
    (flag: FeatureFlagName): boolean => {
      return flags[flag] === true;
    },
    [flags]
  );

  useEffect(() => {
    fetchFlags();
  }, [fetchFlags]);

  // Refresh flags every 5 minutes
  useEffect(() => {
    const interval = setInterval(fetchFlags, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchFlags]);

  return {
    flags,
    enabledFeatures,
    loading,
    error,
    refresh: fetchFlags,
    isEnabled,
  };
}

/**
 * Hook for checking a single feature flag
 */
export function useFeatureFlag(flag: FeatureFlagName): {
  isEnabled: boolean;
  loading: boolean;
  error: string | null;
} {
  const { flags, loading, error } = useFeatureFlags();

  return {
    isEnabled: flags[flag] === true,
    loading,
    error,
  };
}

/**
 * Higher-order component for conditional feature rendering
 */
export function withFeatureFlag<P extends object>(
  flag: FeatureFlagName,
  WrappedComponent: React.ComponentType<P>,
  FallbackComponent?: React.ComponentType<P>
): React.ComponentType<P> {
  return function FeatureFlaggedComponent(props: P) {
    const { isEnabled, loading } = useFeatureFlag(flag);

    if (loading) {
      return <div className="animate-pulse bg-mist h-4 w-16 rounded"></div>;
    }

    if (!isEnabled) {
      return FallbackComponent ? <FallbackComponent {...props} /> : null;
    }

    return <WrappedComponent {...props} />;
  };
}

/**
 * Component for conditional rendering based on feature flags
 */
export interface FeatureGateProps {
  flag: FeatureFlagName;
  children: React.ReactNode;
  fallback?: React.ReactNode;
  loading?: React.ReactNode;
}

export function FeatureGate({ flag, children, fallback = null, loading }: FeatureGateProps) {
  const { isEnabled, loading: isLoading } = useFeatureFlag(flag);

  if (isLoading) {
    return <>{loading || <div className="animate-pulse bg-mist h-4 w-16 rounded"></div>}</>;
  }

  return <>{isEnabled ? children : fallback}</>;
}

/**
 * Hook for admin feature flag management
 */
export function useFeatureFlagAdmin() {
  const [adminFlags, setAdminFlags] = useState<any[]>([]);
  const [adminLoading, setAdminLoading] = useState(false);
  const [adminError, setAdminError] = useState<string | null>(null);

  const fetchAdminFlags = useCallback(async () => {
    try {
      setAdminLoading(true);
      setAdminError(null);

      const response = await fetch('/api/admin/feature-flags', {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('auth_token')}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch admin flags: ${response.statusText}`);
      }

      const flags = await response.json();
      setAdminFlags(flags);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load admin flags';
      setAdminError(errorMessage);
    } finally {
      setAdminLoading(false);
    }
  }, []);

  const updateFlag = useCallback(
    async (flagName: string, updates: any) => {
      try {
        const response = await fetch(`/api/admin/feature-flags/${flagName}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${localStorage.getItem('auth_token')}`,
          },
          body: JSON.stringify(updates),
        });

        if (!response.ok) {
          throw new Error(`Failed to update flag: ${response.statusText}`);
        }

        await fetchAdminFlags(); // Refresh the list
        return true;
      } catch (err) {
        console.error('Flag update error:', err);
        return false;
      }
    },
    [fetchAdminFlags]
  );

  const setUserOverride = useCallback(
    async (flagName: string, userId: string, enabled: boolean) => {
      try {
        const response = await fetch(`/api/admin/feature-flags/${flagName}/users/${userId}`, {
          method: enabled ? 'PUT' : 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${localStorage.getItem('auth_token')}`,
          },
          body: enabled ? JSON.stringify({ enabled }) : undefined,
        });

        if (!response.ok) {
          throw new Error(`Failed to set user override: ${response.statusText}`);
        }

        await fetchAdminFlags(); // Refresh the list
        return true;
      } catch (err) {
        console.error('User override error:', err);
        return false;
      }
    },
    [fetchAdminFlags]
  );

  return {
    flags: adminFlags,
    loading: adminLoading,
    error: adminError,
    refresh: fetchAdminFlags,
    updateFlag,
    setUserOverride,
  };
}
