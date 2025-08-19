// Analytics implementation supporting both GTM and direct GA4
declare global {
  interface Window {
    dataLayer: any[];
    gtag: (...args: any[]) => void;
  }
}

const GTM_CONTAINER_ID = import.meta.env.VITE_GTM_CONTAINER_ID;
const GA4_MEASUREMENT_ID = import.meta.env.VITE_GA4_MEASUREMENT_ID;

export const initAnalytics = () => {
  if (typeof window === 'undefined') return;

  // Initialize dataLayer first
  window.dataLayer = window.dataLayer || [];

  // Check if GTM is already loaded via HTML (preferred method)
  const gtmAlreadyLoaded = window.dataLayer.some(item => 
    item['gtm.start'] || (item.event === 'gtm.js')
  );

  if (gtmAlreadyLoaded) {
    console.log('✅ Google Tag Manager loaded via HTML');
    return;
  }

  // Fallback: Try programmatic GTM loading
  if (GTM_CONTAINER_ID && GTM_CONTAINER_ID !== 'GTM-XXXXXXX') {
    console.log('📊 Loading GTM programmatically...');
    initGTM();
  } 
  // Fallback to direct GA4 (for testing)
  else if (GA4_MEASUREMENT_ID && GA4_MEASUREMENT_ID !== 'G-XXXXXXXXXX') {
    console.log('📊 Loading GA4 directly...');
    initGA4Direct();
  }
  else {
    console.warn('⚠️ No analytics configuration found. Please set GTM_CONTAINER_ID or GA4_MEASUREMENT_ID');
  }
};

const initGTM = () => {
  // GTM initialization function
  window.dataLayer.push({
    'gtm.start': new Date().getTime(),
    event: 'gtm.js'
  });

  // Load GTM script
  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtm.js?id=${GTM_CONTAINER_ID}`;
  document.head.appendChild(script);

  // Add GTM noscript fallback to body
  const noscript = document.createElement('noscript');
  noscript.innerHTML = `<iframe src="https://www.googletagmanager.com/ns.html?id=${GTM_CONTAINER_ID}" height="0" width="0" style="display:none;visibility:hidden"></iframe>`;
  document.body.appendChild(noscript);

  console.log('✅ Google Tag Manager initialized with container:', GTM_CONTAINER_ID);
};

const initGA4Direct = () => {
  // Load gtag script for direct GA4
  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GA4_MEASUREMENT_ID}`;
  document.head.appendChild(script);

  // Initialize gtag function
  window.gtag = function gtag() {
    window.dataLayer.push(arguments);
  };
  
  window.gtag('js', new Date());
  window.gtag('config', GA4_MEASUREMENT_ID, {
    page_title: document.title,
    page_location: window.location.href,
  });

  console.log('✅ GA4 Direct initialized with ID:', GA4_MEASUREMENT_ID);
};

// Event tracking functions supporting both GTM and direct GA4
export const trackEvent = (event: string, parameters?: Record<string, any>) => {
  if (typeof window === 'undefined') return;
  
  window.dataLayer = window.dataLayer || [];
  
  // GTM approach (preferred)
  if (GTM_CONTAINER_ID && GTM_CONTAINER_ID !== 'GTM-XXXXXXX') {
    window.dataLayer.push({
      event: event,
      ...parameters
    });
    console.log('📊 GTM Event:', { event, ...parameters });
  }
  // Direct GA4 approach (fallback)
  else if (GA4_MEASUREMENT_ID && window.gtag) {
    window.gtag('event', event, parameters);
    console.log('📊 GA4 Event:', { event, ...parameters });
  }
  else {
    // Still push to dataLayer for future GTM setup
    window.dataLayer.push({
      event: event,
      ...parameters
    });
    console.log('📊 DataLayer Event (no analytics configured):', { event, ...parameters });
  }
};

// Conversion events for LLM.txt Mastery business
export const trackEmailCapture = (email: string, tier: string) => {
  trackEvent('email_capture', {
    email_tier: tier,
    value: tier === 'starter' ? 0 : tier === 'coffee' ? 4.95 : tier === 'growth' ? 9.95 : 19.95,
    currency: 'USD'
  });
};

export const trackAnalysisStart = (url: string, tier: string) => {
  trackEvent('analysis_start', {
    website_url: url,
    user_tier: tier,
    event_category: 'engagement'
  });
};

export const trackAnalysisComplete = (url: string, pages_found: number, tier: string) => {
  trackEvent('analysis_complete', {
    website_url: url,
    pages_discovered: pages_found,
    user_tier: tier,
    event_category: 'engagement',
    value: pages_found
  });
};

export const trackFileGeneration = (analysis_id: number, tier: string) => {
  trackEvent('file_generation', {
    analysis_id,
    user_tier: tier,
    event_category: 'conversion',
    value: 1
  });
};

export const trackFileDownload = (file_id: number, tier: string) => {
  trackEvent('file_download', {
    file_id,
    user_tier: tier,
    event_category: 'conversion',
    value: 1
  });
};

export const trackStripeCheckout = (tier: string, price: number) => {
  trackEvent('begin_checkout', {
    currency: 'USD',
    value: price,
    items: [{
      item_id: `${tier}_tier`,
      item_name: `${tier.charAt(0).toUpperCase() + tier.slice(1)} Tier`,
      category: 'subscription',
      price: price,
      quantity: 1
    }]
  });
};

export const trackPurchaseComplete = (tier: string, price: number, transaction_id: string) => {
  trackEvent('purchase', {
    transaction_id,
    currency: 'USD',
    value: price,
    items: [{
      item_id: `${tier}_tier`,
      item_name: `${tier.charAt(0).toUpperCase() + tier.slice(1)} Tier`,
      category: 'subscription',
      price: price,
      quantity: 1
    }]
  });
};

export const trackPageView = (page_title: string, page_location?: string) => {
  trackEvent('page_view', {
    page_title: page_title,
    page_location: page_location || window.location.href,
  });
};

export const trackDailyLimitReached = (tier: string, analyses_used: number) => {
  trackEvent('daily_limit_reached', {
    user_tier: tier,
    analyses_count: analyses_used,
    event_category: 'limit',
    value: analyses_used
  });
};

export const trackUpgradeClick = (from_tier: string, to_tier: string) => {
  trackEvent('upgrade_click', {
    from_tier,
    to_tier,
    event_category: 'conversion'
  });
};