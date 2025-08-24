// Enzuzo GDPR compliance integration
declare global {
  interface Window {
    EnzuzoConfig: {
      theme: string;
      position: string;
      language: string;
      showPoweredBy: boolean;
    };
    EnzuzoSDK: {
      init: (config: any) => void;
      showCookieConsent: () => void;
      hideCookieConsent: () => void;
      onConsentChange: (callback: (consent: any) => void) => void;
      getConsent: () => any;
    };
  }
}

const ENZUZO_SCRIPT_ID = 'enzuzo-sdk';
const ENZUZO_WEBSITE_ID = import.meta.env.VITE_ENZUZO_WEBSITE_ID;

export const loadEnzuzo = () => {
  if (!ENZUZO_WEBSITE_ID || ENZUZO_WEBSITE_ID === 'your-enzuzo-website-id' || typeof window === 'undefined') {
    console.warn('Enzuzo website ID not configured - using fallback consent management');
    initializeFallbackConsent();
    return;
  }

  // Don't load if already loaded
  if (document.getElementById(ENZUZO_SCRIPT_ID)) return;

  const script = document.createElement('script');
  script.id = ENZUZO_SCRIPT_ID;
  script.async = true;
  script.defer = true;
  script.src = `https://app.enzuzo.com/apps/enzuzo/static/js/__enzuzo-cookiebar.js?websiteId=${ENZUZO_WEBSITE_ID}`;
  
  script.onload = () => {
    console.log('✅ Enzuzo loaded successfully');
    
    // Initialize with our configuration
    if (window.EnzuzoSDK) {
      window.EnzuzoSDK.init({
        websiteId: ENZUZO_WEBSITE_ID,
        ...window.EnzuzoConfig
      });

      // Set up consent synchronization
      window.EnzuzoSDK.onConsentChange((enzuzoConsent) => {
        syncEnzuzoToGTM(enzuzoConsent);
      });
    }
  };

  script.onerror = () => {
    console.error('❌ Failed to load Enzuzo');
  };

  document.head.appendChild(script);
};

// Sync Enzuzo consent to GTM dataLayer
const syncEnzuzoToGTM = (enzuzoConsent: any) => {
  if (typeof window === 'undefined') return;

  window.dataLayer = window.dataLayer || [];
  
  // Push consent update to GTM dataLayer
  window.dataLayer.push({
    event: 'consent_update',
    consent: {
      analytics_storage: enzuzoConsent.analytics ? 'granted' : 'denied',
      ad_storage: enzuzoConsent.marketing ? 'granted' : 'denied',
      functionality_storage: enzuzoConsent.functional ? 'granted' : 'denied',
      security_storage: 'granted' // Always granted for necessary cookies
    }
  });

  console.log('🔄 Synced Enzuzo consent to GTM:', enzuzoConsent);
};

export const showEnzuzoCookieConsent = () => {
  if (typeof window !== 'undefined' && window.EnzuzoSDK) {
    window.EnzuzoSDK.showCookieConsent();
  }
};

export const getEnzuzoConsent = () => {
  if (typeof window !== 'undefined' && window.EnzuzoSDK) {
    return window.EnzuzoSDK.getConsent();
  }
  return null;
};

// Fallback consent management when Enzuzo is not configured
const initializeFallbackConsent = () => {
  if (typeof window === 'undefined') return;
  
  // Initialize GTM consent mode with default denied state
  window.dataLayer = window.dataLayer || [];
  
  // Set default consent mode (denied until user consent)
  window.dataLayer.push({
    'gtm.start': new Date().getTime(),
    event: 'gtm.js',
    'consent': 'default',
    'analytics_storage': 'denied',
    'ad_storage': 'denied',
    'functionality_storage': 'denied',
    'security_storage': 'granted' // Always granted for essential functionality
  });
  
  console.log('🔒 GTM Consent Mode initialized with default denied state');
  
  // Check for stored consent
  const storedConsent = localStorage.getItem('gdpr_consent');
  if (storedConsent) {
    try {
      const consent = JSON.parse(storedConsent);
      updateGTMConsent(consent);
    } catch (e) {
      console.warn('Invalid stored consent, ignoring');
    }
  } else {
    // Show basic consent banner after a delay
    setTimeout(() => showBasicConsentBanner(), 2000);
  }
};

// Basic consent banner implementation
const showBasicConsentBanner = () => {
  if (typeof window === 'undefined') return;
  
  // Check if banner already shown
  if (document.getElementById('basic-consent-banner')) return;
  
  const banner = document.createElement('div');
  banner.id = 'basic-consent-banner';
  banner.style.cssText = `
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    background: #1f2937;
    color: white;
    padding: 1rem;
    z-index: 9999;
    box-shadow: 0 -2px 10px rgba(0,0,0,0.1);
  `;
  
  banner.innerHTML = `
    <div style="max-width: 1200px; margin: 0 auto; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 1rem;">
      <div style="flex: 1; min-width: 300px;">
        <p style="margin: 0; font-size: 14px;">
          We use cookies to enhance your experience and analyze site usage. By continuing to use this site, you consent to our use of cookies.
          <a href="/privacy-policy" style="color: #60a5fa; text-decoration: underline; margin-left: 4px;" target="_blank">Privacy Policy</a>
        </p>
      </div>
      <div style="display: flex; gap: 0.5rem; align-items: center;">
        <button id="consent-accept-all" style="background: #3b82f6; color: white; border: none; padding: 0.5rem 1rem; border-radius: 0.375rem; cursor: pointer; font-size: 14px;">
          Accept All
        </button>
        <button id="consent-necessary-only" style="background: #6b7280; color: white; border: none; padding: 0.5rem 1rem; border-radius: 0.375rem; cursor: pointer; font-size: 14px;">
          Necessary Only
        </button>
      </div>
    </div>
  `;
  
  document.body.appendChild(banner);
  
  // Handle consent choices
  document.getElementById('consent-accept-all')?.addEventListener('click', () => {
    acceptAllConsent();
    banner.remove();
  });
  
  document.getElementById('consent-necessary-only')?.addEventListener('click', () => {
    acceptNecessaryOnly();
    banner.remove();
  });
};

const acceptAllConsent = () => {
  const consent = {
    analytics: true,
    marketing: false, // Keep marketing false for now
    functional: true,
    necessary: true,
    timestamp: new Date().toISOString()
  };
  
  localStorage.setItem('gdpr_consent', JSON.stringify(consent));
  updateGTMConsent(consent);
  console.log('✅ User accepted all cookies');
};

const acceptNecessaryOnly = () => {
  const consent = {
    analytics: false,
    marketing: false,
    functional: false,
    necessary: true,
    timestamp: new Date().toISOString()
  };
  
  localStorage.setItem('gdpr_consent', JSON.stringify(consent));
  updateGTMConsent(consent);
  console.log('✅ User accepted necessary cookies only');
};

const updateGTMConsent = (consent: any) => {
  if (typeof window === 'undefined') return;
  
  window.dataLayer = window.dataLayer || [];
  
  // Update GTM consent mode
  window.dataLayer.push({
    event: 'consent_update',
    'analytics_storage': consent.analytics ? 'granted' : 'denied',
    'ad_storage': consent.marketing ? 'granted' : 'denied',
    'functionality_storage': consent.functional ? 'granted' : 'denied',
    'security_storage': 'granted'
  });
  
  console.log('🔄 GTM consent updated:', consent);
};

export const initializeEnzuzo = () => {
  if (typeof window === 'undefined') return;

  // Load Enzuzo script
  loadEnzuzo();
  
  // Show consent banner on first visit
  setTimeout(() => {
    if (window.EnzuzoSDK && !getEnzuzoConsent()) {
      showEnzuzoCookieConsent();
    }
  }, 1000);
};