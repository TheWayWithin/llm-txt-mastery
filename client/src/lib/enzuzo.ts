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
  if (!ENZUZO_WEBSITE_ID || typeof window === 'undefined') {
    console.warn('Enzuzo website ID not configured');
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