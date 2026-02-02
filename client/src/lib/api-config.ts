/**
 * Smart environment-aware API URL configuration
 * Automatically detects staging vs production based on hostname
 */
export function getApiBaseUrl(): string {
  // Primary source: environment variable
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }

  // Fallback: detect environment from hostname
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    
    // Staging environment detection
    if (hostname.includes('develop--') || hostname.includes('staging')) {
      return 'https://llm-txt-mastery-staging.up.railway.app';
    }
  }

  // Production fallback
  return 'https://llm-txt-mastery-production.up.railway.app';
}