/**
 * UAT Test Data Configuration
 * Central repository for all test data used in User Acceptance Testing
 */

export interface TestWebsite {
  url: string;
  name: string;
  expectedPages: number;
  type: 'small' | 'medium' | 'large' | 'single-page';
  hasSitemap: boolean;
  description: string;
}

export interface TestCard {
  number: string;
  exp: string;
  cvc: string;
  zip: string;
  description: string;
}

export interface TierConfig {
  name: string;
  price: string;
  dailyLimit: number;
  features: string[];
  credits?: number;
}

// Test websites for different scenarios
export const TEST_WEBSITES: Record<string, TestWebsite> = {
  small: {
    url: 'https://example.com',
    name: 'Example.com',
    expectedPages: 1,
    type: 'small',
    hasSitemap: false,
    description: 'Simple single page for basic testing',
  },
  medium: {
    url: 'https://jsonplaceholder.typicode.com',
    name: 'JSONPlaceholder',
    expectedPages: 10,
    type: 'medium',
    hasSitemap: true,
    description: 'Medium-sized API documentation site',
  },
  large: {
    url: 'https://developer.mozilla.org',
    name: 'MDN Web Docs',
    expectedPages: 200,
    type: 'large',
    hasSitemap: true,
    description: 'Large documentation site (will be truncated)',
  },
  singlePage: {
    url: 'https://www.example.org',
    name: 'Single Page App',
    expectedPages: 1,
    type: 'single-page',
    hasSitemap: false,
    description: 'Single page application',
  },
  withSitemap: {
    url: 'https://www.sitemaps.org',
    name: 'Sitemaps.org',
    expectedPages: 20,
    type: 'medium',
    hasSitemap: true,
    description: 'Site with proper sitemap.xml',
  },
  withoutSitemap: {
    url: 'https://httpbin.org',
    name: 'HTTPBin',
    expectedPages: 15,
    type: 'medium',
    hasSitemap: false,
    description: 'Site without sitemap (homepage crawl)',
  },
  wordpress: {
    url: 'https://wordpress.org',
    name: 'WordPress.org',
    expectedPages: 50,
    type: 'large',
    hasSitemap: true,
    description: 'WordPress site with wp-sitemap.xml',
  },
  shopify: {
    url: 'https://www.shopify.com',
    name: 'Shopify',
    expectedPages: 100,
    type: 'large',
    hasSitemap: true,
    description: 'E-commerce platform site',
  },
};

// Stripe test card numbers
export const STRIPE_TEST_CARDS: Record<string, TestCard> = {
  success: {
    number: '4242424242424242',
    exp: '12/34',
    cvc: '123',
    zip: '10001',
    description: 'Successful payment',
  },
  declined: {
    number: '4000000000000002',
    exp: '12/34',
    cvc: '123',
    zip: '10001',
    description: 'Card declined',
  },
  insufficientFunds: {
    number: '4000000000009995',
    exp: '12/34',
    cvc: '123',
    zip: '10001',
    description: 'Insufficient funds',
  },
  visa: {
    number: '4242424242424242',
    exp: '12/34',
    cvc: '123',
    zip: '10001',
    description: 'Visa test card',
  },
  mastercard: {
    number: '5555555555554444',
    exp: '12/34',
    cvc: '123',
    zip: '10001',
    description: 'Mastercard test card',
  },
  amex: {
    number: '378282246310005',
    exp: '12/34',
    cvc: '1234',
    zip: '10001',
    description: 'American Express test card',
  },
  threeDSecure: {
    number: '4000002500003155',
    exp: '12/34',
    cvc: '123',
    zip: '10001',
    description: 'Requires 3D Secure authentication',
  },
};

// Tier configurations
export const TIER_CONFIGS: Record<string, TierConfig> = {
  starter: {
    name: 'Free Tier',
    price: '$0',
    dailyLimit: 1,
    features: [
      '1 analysis per day',
      'Basic LLMs.txt generation',
      'Download functionality',
      'Email support',
    ],
  },
  coffee: {
    name: 'Coffee Tier',
    price: '$5',
    dailyLimit: 0, // Uses credits instead
    credits: 5,
    features: [
      '5 analysis credits',
      'Enhanced LLMs.txt with AI',
      '6-phase generation',
      'Quality scoring',
      '30-day money-back guarantee',
    ],
  },
  growth: {
    name: 'Growth Tier',
    price: '$25/month',
    dailyLimit: 20,
    features: [
      '20 analyses per day',
      'All Coffee tier features',
      'Priority processing',
      'Advanced analytics',
      'Email support',
    ],
  },
  scale: {
    name: 'Scale Tier',
    price: '$100/month',
    dailyLimit: 100,
    features: [
      '100 analyses per day',
      'All Growth tier features',
      'Priority support',
      'Bulk analysis',
      'API access (coming soon)',
      'Custom integrations',
    ],
  },
  enterprise: {
    name: 'Enterprise',
    price: 'Custom',
    dailyLimit: -1, // Unlimited
    features: [
      'Unlimited analyses',
      'All Scale tier features',
      'Dedicated support',
      'SLA guarantee',
      'Custom features',
      'White-label options',
    ],
  },
};

// UAT Configuration
export const UAT_CONFIG = {
  // Test environment settings
  environment: {
    baseUrl: process.env.TEST_URL || 'https://www.llmtxtmastery.com',
    apiUrl: process.env.API_URL || 'https://llm-txt-mastery-production.up.railway.app',
    isProduction: process.env.TEST_ENV === 'production',
    debugMode: process.env.DEBUG === 'true',
  },

  // Timeouts (in milliseconds)
  timeouts: {
    navigation: 30000,
    analysis: 60000,
    payment: 45000,
    api: 10000,
    email: 30000,
  },

  // Performance thresholds
  performance: {
    maxPageLoadTime: 3000,
    maxApiResponseTime: 200,
    maxAnalysisTime: 45000,
    maxDatabaseQueryTime: 100,
  },

  // Rate limits
  rateLimits: {
    general: { requests: 100, window: 900000 }, // 100 requests per 15 min
    analysis: { requests: 10, window: 3600000 }, // 10 per hour
    email: { requests: 5, window: 120000 }, // 5 per 2 min
    fileGeneration: { requests: 20, window: 3600000 }, // 20 per hour
  },

  // Stripe configuration
  stripe: {
    testMode: true,
    testCards: STRIPE_TEST_CARDS,
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET_TEST,
    products: {
      coffee: 'price_test_coffee',
      growth: 'price_test_growth',
      scale: 'price_test_scale',
    },
  },

  // Email configuration
  email: {
    provider: 'temp', // 'temp' | 'mailinator' | '10minutemail'
    verificationTimeout: 30000,
    domains: [
      '@example.com',
      '@mailinator.com',
      '@10minutemail.com',
      '@temp-mail.org',
    ],
  },

  // Security test payloads
  security: {
    xssPayloads: [
      '<script>alert("XSS")</script>',
      'javascript:alert("XSS")',
      '<img src=x onerror="alert(\'XSS\')">',
      '"><script>alert("XSS")</script>',
      '\';alert(String.fromCharCode(88,83,83))//\';',
      '<svg/onload=alert("XSS")>',
      '<iframe src="javascript:alert(\'XSS\')">',
    ],
    sqlInjectionPayloads: [
      "' OR '1'='1",
      "'; DROP TABLE users; --",
      "admin' --",
      "' UNION SELECT * FROM users --",
      "1' AND '1' = '1",
    ],
    malformedUrls: [
      'not-a-url',
      'ftp://invalid-protocol.com',
      'http://',
      'https://.com',
      'javascript:void(0)',
      'data:text/html,<script>alert("XSS")</script>',
      '../../../etc/passwd',
    ],
  },

  // Expected validation messages
  validationMessages: {
    invalidUrl: 'Please enter a valid URL',
    rateLimitExceeded: 'Rate limit exceeded',
    dailyLimitReached: 'Daily analysis limit reached',
    insufficientCredits: 'Insufficient credits',
    paymentRequired: 'Payment required',
    emailRequired: 'Email is required',
    passwordTooWeak: 'Password must be at least 8 characters',
    emailAlreadyExists: 'Email already registered',
    invalidCredentials: 'Invalid email or password',
    sessionExpired: 'Session expired. Please login again',
  },

  // Success criteria for UAT sign-off
  signOffCriteria: {
    minTestPassRate: 95, // Percentage
    maxCriticalBugs: 0,
    maxHighBugs: 5,
    maxMediumBugs: 10,
    performanceWithinSLA: true,
    securityValidationComplete: true,
    allCriticalPathsTested: true,
  },
};

// Test user templates (updated for authentication-first architecture)
export const TEST_USER_TEMPLATES = {
  free: {
    emailPattern: 'uat-free-{id}@example.com',
    password: 'TestUser123!',
    tier: 'free', // Updated to match 'free' instead of 'starter'
    expectedFeatures: ['basic-analysis', 'authenticated-access', 'download', '1-per-day-limit'],
    signupFlow: 'landing → signup → login → analysis',
  },
  coffee: {
    emailPattern: 'uat-coffee-{id}@example.com',
    password: 'CoffeeUser123!',
    tier: 'coffee',
    expectedFeatures: ['enhanced-analysis', 'quality-scoring', 'credits', 'refund-button', 'authenticated-access'],
    signupFlow: 'landing → signup → payment → login → analysis',
  },
  growth: {
    emailPattern: 'uat-growth-{id}@example.com',
    password: 'GrowthUser123!',
    tier: 'growth',
    expectedFeatures: ['20-daily-limit', 'analytics', 'priority-processing', 'subscription-management', 'authenticated-access'],
    signupFlow: 'landing → signup → subscription → login → analysis',
  },
  scale: {
    emailPattern: 'uat-scale-{id}@example.com',
    password: 'ScaleUser123!',
    tier: 'scale',
    expectedFeatures: ['100-daily-limit', 'priority-support', 'bulk-analysis', 'export-analytics', 'authenticated-access'],
    signupFlow: 'landing → signup → premium-subscription → login → analysis',
  },
};

// Analysis test scenarios (updated for authentication-first architecture)
export const ANALYSIS_SCENARIOS = [
  {
    name: 'Basic free tier analysis (authenticated)',
    website: TEST_WEBSITES.small,
    tier: 'free', // Updated from 'starter' to 'free'
    authRequired: true,
    expectedResult: {
      pagesAnalyzed: 1,
      hasQualityScore: false,
      hasSixPhaseGeneration: false,
      downloadAvailable: true,
      requiresAuthentication: true,
    },
  },
  {
    name: 'Coffee tier with quality scoring (authenticated)',
    website: TEST_WEBSITES.medium,
    tier: 'coffee',
    authRequired: true,
    expectedResult: {
      pagesAnalyzed: 10,
      hasQualityScore: true,
      hasSixPhaseGeneration: true,
      creditsConsumed: 1,
      requiresAuthentication: true,
      requiresPayment: true,
    },
  },
  {
    name: 'Growth tier bulk analysis (authenticated)',
    website: TEST_WEBSITES.large,
    tier: 'growth',
    authRequired: true,
    expectedResult: {
      pagesAnalyzed: 200, // Truncated at max
      hasQualityScore: true,
      hasSixPhaseGeneration: true,
      withinDailyLimit: true,
      requiresAuthentication: true,
      requiresSubscription: true,
    },
  },
  {
    name: 'Scale tier with priority processing (authenticated)',
    website: TEST_WEBSITES.wordpress,
    tier: 'scale',
    authRequired: true,
    expectedResult: {
      pagesAnalyzed: 50,
      priorityProcessing: true,
      analyticsAvailable: true,
      exportOptions: ['csv', 'pdf', 'json'],
      requiresAuthentication: true,
      requiresPremiumSubscription: true,
    },
  },
];

// Dashboard test expectations (updated for authentication-first architecture)
export const DASHBOARD_EXPECTATIONS = {
  free: { // Updated from 'starter' to 'free'
    sections: ['overview', 'recent-analysis', 'upgrade-prompt'],
    metrics: ['analyses-today', 'analyses-remaining'],
    actions: ['new-analysis', 'view-history', 'upgrade'],
    authRequired: true,
  },
  coffee: {
    sections: ['overview', 'credits-remaining', 'recent-analyses', 'refund-option'],
    metrics: ['credits-used', 'credits-remaining', 'purchase-date'],
    actions: ['use-credit', 'view-history', 'request-refund', 'buy-more-credits'],
    authRequired: true,
  },
  growth: {
    sections: ['overview', 'usage-chart', 'recent-analyses', 'subscription'],
    metrics: ['analyses-today', 'analyses-this-month', 'next-billing-date'],
    actions: ['new-analysis', 'view-analytics', 'manage-subscription', 'download-invoice'],
    authRequired: true,
  },
  scale: {
    sections: ['overview', 'advanced-analytics', 'bulk-operations', 'priority-support'],
    metrics: ['analyses-today', 'api-usage', 'performance-metrics', 'cost-analysis'],
    actions: ['bulk-analysis', 'export-data', 'api-docs', 'contact-support'],
    authRequired: true,
  },
};

// Expected error codes and messages
export const ERROR_EXPECTATIONS = {
  '400': 'Bad Request',
  '401': 'Unauthorized',
  '403': 'Forbidden',
  '404': 'Not Found',
  '429': 'Too Many Requests',
  '500': 'Internal Server Error',
  '503': 'Service Unavailable',
};

// Browser viewport configurations
export const VIEWPORTS = {
  mobile: {
    iPhone12: { width: 390, height: 844 },
    iPhone13Pro: { width: 390, height: 844 },
    iPhoneSE: { width: 375, height: 667 },
    Pixel5: { width: 393, height: 851 },
    GalaxyS21: { width: 360, height: 800 },
  },
  tablet: {
    iPadMini: { width: 768, height: 1024 },
    iPadPro: { width: 1024, height: 1366 },
    SurfacePro: { width: 912, height: 1368 },
    GalaxyTab: { width: 800, height: 1280 },
  },
  desktop: {
    laptop: { width: 1366, height: 768 },
    desktop: { width: 1920, height: 1080 },
    wide: { width: 2560, height: 1440 },
    ultrawide: { width: 3440, height: 1440 },
  },
};

// Accessibility test configurations
export const ACCESSIBILITY_CONFIG = {
  wcagLevel: 'AA',
  contrastRatio: {
    normal: 4.5,
    large: 3.0,
  },
  touchTargetSize: 44, // pixels
  focusIndicator: {
    minContrast: 3.0,
    minWidth: 2,
  },
  screenReaderLabels: [
    'navigation',
    'main',
    'complementary',
    'contentinfo',
  ],
};