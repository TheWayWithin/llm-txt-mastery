// Native GDPR consent initialization (replaces Enzuzo dependency)
import { getStoredConsent, isConsentPending, initConsentMode } from './consent';

declare global {
  interface Window {
    dataLayer: any[];
    gtag: (...args: any[]) => void;
  }
}

export const initializeConsent = () => {
  if (typeof window === 'undefined') return;

  // Initialize GTM consent mode with stored preferences
  initConsentMode();

  // Initialize dataLayer
  window.dataLayer = window.dataLayer || [];

  const consent = getStoredConsent();

  // Set default consent state
  window.dataLayer.push({
    'gtm.start': new Date().getTime(),
    event: 'gtm.js',
    consent: 'default',
    analytics_storage: consent.analytics === 'granted' ? 'granted' : 'denied',
    ad_storage: consent.marketing === 'granted' ? 'granted' : 'denied',
    functionality_storage: consent.functional === 'granted' ? 'granted' : 'denied',
    security_storage: 'granted',
  });

  console.log('🔒 Native consent management initialized');
};
