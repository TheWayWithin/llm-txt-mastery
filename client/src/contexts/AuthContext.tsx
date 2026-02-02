import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { authApi, AuthUser, LoginRequest, RegisterRequest } from '@/lib/auth-api';
import { getApiBaseUrl } from '@/lib/api-config';

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  authResolved: boolean;
  signUp: (
    email: string,
    password: string,
    confirmPassword: string,
    tier?: 'starter' | 'solo' | 'growth' | 'scale'
  ) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
  getAccessToken: () => string | null;
  hasCredits: boolean;
  canAnalyze: boolean;
  isAuthenticated: boolean;
  recognizeEmailUser: (email: string) => Promise<AuthUser | null>;
  emailBasedUser: AuthUser | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [authResolved, setAuthResolved] = useState(false);
  const [emailBasedUser, setEmailBasedUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    // Initialize auth state on mount - single source of truth for auth resolution
    const initializeAuth = async () => {
      console.log('🔐 Initializing auth state...');

      try {
        // Step 1: Check for stored authentication state
        const isCurrentlyAuthenticated = authApi.isAuthenticated();
        const storedUser = authApi.getStoredUser();

        if (!isCurrentlyAuthenticated || !storedUser) {
          console.log('❌ No valid authentication found');
          setUser(null);
          return;
        }

        console.log('📱 Found stored user:', storedUser.email, 'tier:', storedUser.tier);

        // Step 2: Set stored user immediately to prevent loading state race conditions
        setUser(storedUser);

        // Step 3: Attempt to refresh user data from server for accuracy
        // This is optional and should not affect the resolved state
        try {
          console.log('🔄 Refreshing user data from server...');
          const currentUser = await authApi.getCurrentUser();
          console.log(
            '✅ Server user data refreshed:',
            currentUser?.email,
            'tier:',
            currentUser?.tier,
            'credits:',
            currentUser?.creditsRemaining
          );
          setUser(currentUser);
        } catch (refreshError) {
          console.warn('⚠️ Failed to refresh user data from server:', refreshError);

          // Determine if this is a network issue vs auth issue
          const isNetworkError =
            refreshError.message?.includes('fetch') ||
            refreshError.message?.includes('NetworkError') ||
            refreshError.message?.includes('Failed to fetch');

          if (isNetworkError) {
            // Network issue - keep stored user data (especially important for Solo users)
            console.log('🌐 Network issue detected, keeping stored user data');
            if (storedUser.tier === 'solo') {
              console.log(
                '👤 Solo user - stored credentials should be sufficient for offline operation'
              );
            }
          } else if (
            refreshError.message?.includes('expired') ||
            refreshError.message?.includes('invalid') ||
            refreshError.message?.includes('unauthorized')
          ) {
            // Auth issue - tokens are invalid
            console.log('🔒 Authentication tokens invalid, clearing auth state');
            setUser(null);
            authApi.clearAuthTokens();
          } else {
            // Unknown error - be conservative and keep stored data
            console.log('❓ Unknown refresh error, keeping stored user data as fallback');
          }
        }
      } catch (initError) {
        console.error('💥 Critical error during auth initialization:', initError);

        // Only clear auth state if we're certain tokens are invalid
        const shouldClearAuth =
          initError.message?.includes('invalid') ||
          initError.message?.includes('expired') ||
          initError.message?.includes('unauthorized');

        if (shouldClearAuth) {
          console.log('🧹 Clearing invalid auth state due to critical error');
          setUser(null);
          authApi.clearAuthTokens();
        } else {
          console.log('🛡️ Preserving auth state despite initialization error');
        }
      } finally {
        // CRITICAL: Always set both flags together to prevent race conditions
        setLoading(false);
        setAuthResolved(true);
        console.log('🏁 Auth initialization complete - resolved state set');
      }
    };

    initializeAuth();
  }, []);

  const signUp = async (
    email: string,
    password: string,
    confirmPassword: string,
    tier: 'starter' | 'solo' | 'growth' | 'scale' = 'starter'
  ) => {
    try {
      setLoading(true); // Set loading during auth operation
      const response = await authApi.register({
        email,
        password,
        confirmPassword,
      });
      setUser(response.user);
      console.log(
        '✅ User signed up successfully:',
        response.user.email,
        'tier:',
        response.user.tier,
        'emailVerified:',
        response.user.emailVerified
      );
    } catch (error) {
      console.error('❌ Sign up failed:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      setLoading(true); // Set loading during auth operation
      const response = await authApi.login({
        email,
        password,
      });
      setUser(response.user);
      console.log(
        '✅ User signed in successfully:',
        response.user.email,
        'tier:',
        response.user.tier
      );
    } catch (error) {
      console.error('❌ Sign in failed:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    try {
      console.log('🚪 Signing out user...');
      setLoading(true); // Set loading during logout
      await authApi.logout();
    } catch (error) {
      console.error('❌ Logout error:', error);
    } finally {
      setUser(null);
      setLoading(false);
      // Note: authResolved stays true - we know the auth state (signed out)
      console.log('✅ User signed out successfully');
    }
  };

  const refreshUser = async () => {
    if (!authApi.isAuthenticated()) {
      console.log('🔒 Cannot refresh user - not authenticated');
      return;
    }

    try {
      console.log('🔄 Refreshing user data...');
      const currentUser = await authApi.getCurrentUser();
      setUser(currentUser);
      console.log(
        '✅ User data refreshed:',
        currentUser.email,
        'tier:',
        currentUser.tier,
        'credits:',
        currentUser.creditsRemaining
      );
    } catch (error) {
      console.error('❌ Failed to refresh user data:', error);

      // Determine error type for better handling
      const isNetworkError =
        error.message?.includes('fetch') ||
        error.message?.includes('NetworkError') ||
        error.message?.includes('Failed to fetch');

      const isAuthError =
        error.message?.includes('expired') ||
        error.message?.includes('invalid') ||
        error.message?.includes('unauthorized') ||
        error.message?.includes('Session expired');

      if (isAuthError) {
        console.log('🔒 Authentication error during refresh - signing out');
        await signOut();
      } else if (isNetworkError) {
        console.log('🌐 Network error during refresh - keeping current user data');
        // Keep current user data for offline operation
      } else {
        console.log('❓ Unknown error during refresh - keeping current user data');
        // For unknown errors, be conservative and keep current state
      }
    }
  };

  const getAccessToken = () => {
    return sessionStorage.getItem('auth_access_token');
  };

  // Email-based user recognition for returning users
  const recognizeEmailUser = async (email: string): Promise<AuthUser | null> => {
    try {
      console.log(`🔍 Attempting to recognize email-based user: ${email}`);

      // Check usage API to see if this email has a tier/history
      const response = await fetch(
        `${getApiBaseUrl()}/api/usage/${encodeURIComponent(email)}`
      );

      if (response.ok) {
        const usageData = await response.json();

        // If user has a tier other than starter or has usage history, create email-based user object
        if (usageData.tier !== 'starter' || (usageData.usage?.analysesToday || 0) > 0) {
          const emailUser: AuthUser = {
            id: `email-${email}`, // Temporary ID for email-based users
            email: email,
            tier: usageData.tier as any,
            creditsRemaining: usageData.usage?.creditsRemaining || 0,
            username: email.split('@')[0],
          };

          console.log(`✅ Email user recognized: ${email} with tier ${usageData.tier}`);
          setEmailBasedUser(emailUser);
          return emailUser;
        }
      }

      console.log(`ℹ️ Email user not recognized or no history: ${email}`);
      setEmailBasedUser(null);
      return null;
    } catch (error) {
      console.error(`❌ Error recognizing email user ${email}:`, error);
      setEmailBasedUser(null);
      return null;
    }
  };

  // Computed properties - merge authenticated user with email-based user
  const effectiveUser = user || emailBasedUser;
  const hasCredits = effectiveUser?.tier === 'solo' && (effectiveUser?.creditsRemaining || 0) > 0;
  const canAnalyze =
    !effectiveUser ||
    effectiveUser?.tier === 'starter' ||
    hasCredits ||
    ['growth', 'scale'].includes(effectiveUser?.tier || '');
  const isAuthenticated = !!user && authApi.isAuthenticated();

  const value = {
    user: effectiveUser, // Return effective user (authenticated or email-based)
    loading,
    authResolved,
    signUp,
    signIn,
    signOut,
    refreshUser,
    getAccessToken,
    hasCredits,
    canAnalyze,
    isAuthenticated,
    recognizeEmailUser,
    emailBasedUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
