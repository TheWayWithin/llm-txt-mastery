// Authentication API client for JWT-based authentication
const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://llm-txt-mastery-production.up.railway.app';

export interface AuthUser {
  id: number;
  email: string;
  tier: 'starter' | 'coffee' | 'growth' | 'scale';
  creditsRemaining: number;
  emailVerified: boolean;
  createdAt: string;
  isDemo?: boolean;
}

export interface AuthResponse {
  user: AuthUser;
  accessToken: string;
  refreshToken: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  confirmPassword: string;
}

export interface ApiError {
  error: string;
  code: string;
  details?: any;
}

class AuthApiClient {
  private accessToken: string | null = null;
  private refreshToken: string | null = null;

  constructor() {
    // Load tokens from sessionStorage for proper incognito isolation
    this.accessToken = sessionStorage.getItem('auth_access_token');
    this.refreshToken = sessionStorage.getItem('auth_refresh_token');
  }

  private async makeRequest(endpoint: string, options: RequestInit = {}): Promise<any> {
    const url = `${API_BASE_URL}${endpoint}`;
    
    const config: RequestInit = {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    };

    // Add authorization header if we have an access token
    if (this.accessToken && !endpoint.includes('/auth/refresh')) {
      config.headers = {
        ...config.headers,
        Authorization: `Bearer ${this.accessToken}`,
      };
    }

    const response = await fetch(url, config);
    
    // Handle 401 errors by attempting token refresh
    if (response.status === 401 && this.refreshToken && !endpoint.includes('/auth/refresh')) {
      const refreshed = await this.refreshTokens();
      if (refreshed) {
        // Retry the original request with new token
        config.headers = {
          ...config.headers,
          Authorization: `Bearer ${this.accessToken}`,
        };
        return this.makeRequest(endpoint, options);
      } else {
        // Refresh failed, clear tokens and throw error
        this.clearTokens();
        throw new Error('Session expired. Please sign in again.');
      }
    }

    const data = await response.json();

    if (!response.ok) {
      console.error('API Error:', {
        status: response.status,
        endpoint,
        error: data.error,
        code: data.code,
        details: data.details || data
      });
      throw new Error(data.error || `HTTP ${response.status}`);
    }

    return data;
  }

  private setTokens(authResponse: AuthResponse) {
    this.accessToken = authResponse.accessToken;
    this.refreshToken = authResponse.refreshToken;
    
    // Store in sessionStorage for proper incognito isolation
    sessionStorage.setItem('auth_access_token', authResponse.accessToken);
    sessionStorage.setItem('auth_refresh_token', authResponse.refreshToken);
    sessionStorage.setItem('auth_user', JSON.stringify(authResponse.user));
    
    // Debug logging for Coffee users
    console.log('🔐 Tokens stored for user:', authResponse.user.email, 'tier:', authResponse.user.tier);
    if (authResponse.user.tier === 'coffee') {
      console.log('☕ Coffee user authentication - credits:', authResponse.user.creditsRemaining);
    }
  }

  private clearTokens() {
    this.accessToken = null;
    this.refreshToken = null;
    
    sessionStorage.removeItem('auth_access_token');
    sessionStorage.removeItem('auth_refresh_token');
    sessionStorage.removeItem('auth_user');
  }

  private async refreshTokens(): Promise<boolean> {
    if (!this.refreshToken) return false;

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          refreshToken: this.refreshToken,
        }),
      });

      if (!response.ok) return false;

      const data: AuthResponse = await response.json();
      this.setTokens(data);
      return true;
    } catch (error) {
      console.error('Token refresh failed:', error);
      return false;
    }
  }

  // Get stored user from sessionStorage
  getStoredUser(): AuthUser | null {
    const userData = sessionStorage.getItem('auth_user');
    return userData ? JSON.parse(userData) : null;
  }

  // Check if user is authenticated
  isAuthenticated(): boolean {
    const hasToken = !!this.accessToken;
    const hasUser = !!this.getStoredUser();
    const isAuth = hasToken && hasUser;
    
    // Debug logging for authentication checks
    if (!isAuth) {
      console.log('🔒 Authentication check failed - token:', hasToken, 'user:', hasUser);
    }
    
    return isAuth;
  }

  // Register new user
  async register(data: RegisterRequest): Promise<AuthResponse> {
    const response = await this.makeRequest('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });

    this.setTokens(response);
    return response;
  }

  // Login user
  async login(data: LoginRequest): Promise<AuthResponse> {
    const response = await this.makeRequest('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    });

    // Handle demo login - preserve isDemo flag in user object
    if (response.isDemo && response.user) {
      response.user.isDemo = true;
    }

    this.setTokens(response);
    return response;
  }

  // Logout user
  async logout(): Promise<void> {
    try {
      await this.makeRequest('/api/auth/logout', {
        method: 'POST',
      });
    } catch (error) {
      // Continue with logout even if server request fails
      console.error('Logout request failed:', error);
    } finally {
      this.clearTokens();
    }
  }

  // Logout from all devices
  async logoutAll(): Promise<void> {
    try {
      await this.makeRequest('/api/auth/logout-all', {
        method: 'POST',
      });
    } catch (error) {
      console.error('Logout all request failed:', error);
    } finally {
      this.clearTokens();
    }
  }

  // Get current user profile
  async getCurrentUser(): Promise<AuthUser> {
    const response = await this.makeRequest('/api/auth/me');
    
    // Update stored user data
    sessionStorage.setItem('auth_user', JSON.stringify(response.user));
    return response.user;
  }

  // Check if email is available
  async checkEmailAvailability(email: string): Promise<boolean> {
    const response = await this.makeRequest('/api/auth/check-email', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
    return response.available;
  }

  // Validate password strength
  async validatePassword(password: string): Promise<{
    valid: boolean;
    errors: string[];
    requirements: string[];
  }> {
    return this.makeRequest('/api/auth/validate-password', {
      method: 'POST',
      body: JSON.stringify({ password }),
    });
  }

  // Request password reset
  async requestPasswordReset(email: string): Promise<{ success: boolean; message: string }> {
    const response = await this.makeRequest('/api/auth/request-password-reset', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
    return response;
  }

  // Reset password with token
  async resetPassword(token: string, newPassword: string): Promise<{ success: boolean; message: string }> {
    const response = await this.makeRequest('/api/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token, newPassword }),
    });
    return response;
  }

  // Emergency method to clear tokens (for race condition recovery)
  clearAuthTokens(): void {
    console.log('🧹 Emergency token cleanup triggered')
    this.clearTokens()
  }
}

// Export singleton instance
export const authApi = new AuthApiClient();