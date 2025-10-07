// Consent management for GDPR compliance
export type ConsentStatus = 'granted' | 'denied' | 'pending';

export interface ConsentState {
  analytics: ConsentStatus;
  marketing: ConsentStatus;
  functional: ConsentStatus;
  necessary: ConsentStatus;
}

const CONSENT_STORAGE_KEY = 'llmtxt_consent';

// Default consent - necessary is always granted, others pending
const DEFAULT_CONSENT: ConsentState = {
  analytics: 'pending',
  marketing: 'pending',
  functional: 'pending',
  necessary: 'granted',
};

export const getStoredConsent = (): ConsentState => {
  try {
    const stored = localStorage.getItem(CONSENT_STORAGE_KEY);
    if (stored) {
      return { ...DEFAULT_CONSENT, ...JSON.parse(stored) };
    }
  } catch (error) {
    console.warn('Failed to load consent state:', error);
  }
  return DEFAULT_CONSENT;
};

export const setConsent = (consent: Partial<ConsentState>): ConsentState => {
  const newConsent = { ...getStoredConsent(), ...consent };

  try {
    localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(newConsent));
  } catch (error) {
    console.warn('Failed to save consent state:', error);
  }

  // Update gtag consent if available
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('consent', 'update', {
      analytics_storage: newConsent.analytics === 'granted' ? 'granted' : 'denied',
      ad_storage: newConsent.marketing === 'granted' ? 'granted' : 'denied',
      functionality_storage: newConsent.functional === 'granted' ? 'granted' : 'denied',
      security_storage: 'granted', // Always granted for necessary cookies
    });
  }

  return newConsent;
};

export const hasConsentFor = (category: keyof ConsentState): boolean => {
  const consent = getStoredConsent();
  return consent[category] === 'granted';
};

export const isConsentPending = (): boolean => {
  const consent = getStoredConsent();
  return Object.values(consent).some((status) => status === 'pending');
};

export const initConsentMode = () => {
  if (typeof window === 'undefined' || !window.gtag) return;

  const consent = getStoredConsent();

  // Set initial consent state
  window.gtag('consent', 'default', {
    analytics_storage: consent.analytics === 'granted' ? 'granted' : 'denied',
    ad_storage: consent.marketing === 'granted' ? 'granted' : 'denied',
    functionality_storage: consent.functional === 'granted' ? 'granted' : 'denied',
    security_storage: 'granted',
    wait_for_update: 500, // Wait 500ms for consent update
  });
};

export const acceptAllCookies = (): ConsentState => {
  return setConsent({
    analytics: 'granted',
    marketing: 'granted',
    functional: 'granted',
    necessary: 'granted',
  });
};

export const rejectOptionalCookies = (): ConsentState => {
  return setConsent({
    analytics: 'denied',
    marketing: 'denied',
    functional: 'denied',
    necessary: 'granted',
  });
};

export const acceptAnalyticsOnly = (): ConsentState => {
  return setConsent({
    analytics: 'granted',
    marketing: 'denied',
    functional: 'granted',
    necessary: 'granted',
  });
};
