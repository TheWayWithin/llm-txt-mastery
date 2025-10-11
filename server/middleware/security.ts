import helmet from 'helmet';
import crypto from 'crypto';
import type { Express, Request, Response, NextFunction } from 'express';

// Extended request interface to include nonce
interface SecurityRequest extends Request {
  nonce?: string;
}

export function setupSecurityMiddleware(app: Express) {
  const isDevelopment = process.env.NODE_ENV === 'development';

  // Generate nonce for each request (CSP nonce-based script loading)
  app.use((req: SecurityRequest, res: Response, next: NextFunction) => {
    req.nonce = crypto.randomBytes(16).toString('base64');
    res.locals.nonce = req.nonce;
    next();
  });

  // Enhanced Content Security Policy with nonces
  app.use((req: SecurityRequest, res: Response, next: NextFunction) => {
    if (!isDevelopment) {
      const nonce = req.nonce;
      
      // Strict CSP with nonce-based script loading
      const cspDirectives = {
        defaultSrc: ["'self'"],
        styleSrc: [
          "'self'", 
          "'unsafe-inline'",  // Required for Tailwind CSS and inline styles
          'https://fonts.googleapis.com'
        ],
        fontSrc: ["'self'", 'https://fonts.gstatic.com'],
        scriptSrc: [
          "'self'",
          `'nonce-${nonce}'`,  // Nonce-based script loading
          "'strict-dynamic'",   // Allow scripts loaded by nonce to load other scripts
          'https://js.stripe.com',
          'https://www.googletagmanager.com',
          'https://www.google-analytics.com',
          'https://analytics.google.com'
        ],
        objectSrc: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'", 'https://checkout.stripe.com'],
        frameAncestors: ["'none'"],
        frameSrc: [
          "'self'", 
          'https://checkout.stripe.com', 
          'https://js.stripe.com'
        ],
        imgSrc: [
          "'self'", 
          'data:', 
          'https:',
          'https://www.google-analytics.com',
          'https://www.googletagmanager.com'
        ],
        connectSrc: [
          "'self'",
          'https://api.openai.com',
          'https://*.supabase.co',
          'https://api.stripe.com',
          'https://www.google-analytics.com',
          'https://analytics.google.com',
          'https://www.googletagmanager.com'
        ],
        workerSrc: ["'self'"],
        childSrc: ["'self'"],
        manifestSrc: ["'self'"],
        mediaSrc: ["'self'"],
        upgradeInsecureRequests: []
      };

      // Build CSP header string
      const cspHeader = Object.entries(cspDirectives)
        .map(([directive, sources]) => `${directive.replace(/[A-Z]/g, letter => `-${letter.toLowerCase()}`)} ${sources.join(' ')}`)
        .join('; ');
      
      res.setHeader('Content-Security-Policy', cspHeader);
    }
    next();
  });

  // Use helmet for additional security headers
  app.use(
    helmet({
      // Disable CSP in helmet since we handle it manually above
      contentSecurityPolicy: false,

      // Cross-Origin-Embedder-Policy
      crossOriginEmbedderPolicy: false, // Disable for better compatibility

      // Cross-Origin-Opener-Policy
      crossOriginOpenerPolicy: { policy: 'same-origin' },

      // Cross-Origin-Resource-Policy
      crossOriginResourcePolicy: { policy: 'cross-origin' },

      // X-DNS-Prefetch-Control
      dnsPrefetchControl: { allow: false },

      // X-Frame-Options
      frameguard: { action: 'deny' },

      // Hide X-Powered-By header
      hidePoweredBy: true,

      // HTTP Strict Transport Security
      hsts: {
        maxAge: 31536000, // 1 year
        includeSubDomains: true,
        preload: true,
      },

      // X-Content-Type-Options
      noSniff: true,

      // Origin-Agent-Cluster
      originAgentCluster: true,

      // X-Permitted-Cross-Domain-Policies
      permittedCrossDomainPolicies: false,

      // Referrer-Policy - More secure than default
      referrerPolicy: { policy: 'strict-origin-when-cross-origin' },

      // X-XSS-Protection (legacy but still useful)
      xssFilter: true,
    })
  );

  // Comprehensive security headers middleware
  app.use((req: SecurityRequest, res: Response, next: NextFunction) => {
    // Apply security headers in all environments (production and development)
    // Some headers are less strict in development for debugging
    
    // Prevent MIME type sniffing
    res.setHeader('X-Content-Type-Options', 'nosniff');

    // Prevent clickjacking
    res.setHeader('X-Frame-Options', 'DENY');

    // XSS protection (legacy but still useful)
    res.setHeader('X-XSS-Protection', '1; mode=block');

    // Referrer policy - control what referrer information is sent
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

    // Comprehensive Permissions Policy (formerly Feature Policy)
    const permissionsPolicy = [
      'camera=()',           // Block camera access
      'microphone=()',       // Block microphone access
      'geolocation=()',      // Block geolocation access
      'payment=()',          // Allow payment API (needed for Stripe)
      'usb=()',             // Block USB access
      'accelerometer=()',    // Block accelerometer access
      'gyroscope=()',       // Block gyroscope access
      'magnetometer=()',    // Block magnetometer access
      'fullscreen=(self)',  // Allow fullscreen on same origin
      'autoplay=()',        // Block autoplay
      'encrypted-media=()', // Block encrypted media access
      'picture-in-picture=()', // Block picture-in-picture
      'display-capture=()', // Block display capture
      'web-share=(self)',   // Allow web share on same origin
      'clipboard-read=()',  // Block clipboard read
      'clipboard-write=(self)', // Allow clipboard write on same origin
      'idle-detection=()'   // Block idle detection
    ].join(', ');
    
    res.setHeader('Permissions-Policy', permissionsPolicy);

    // Cross-Origin-Opener-Policy (COOP) - Enhanced isolation
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');

    // Cross-Origin-Resource-Policy (CORP) - Control cross-origin access
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');

    // Cross-Origin-Embedder-Policy (COEP) - Require opt-in for cross-origin resources
    if (!isDevelopment) {
      // More strict in production
      res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
    }

    // Server identification hiding
    res.removeHeader('X-Powered-By');
    res.removeHeader('Server');

    // Cache control for sensitive pages
    if (req.path.includes('/api/') || req.path.includes('/auth/')) {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
    }

    // Security headers specific to production
    if (!isDevelopment) {
      // Expect-CT header for Certificate Transparency
      res.setHeader('Expect-CT', 'max-age=86400, enforce');
      
      // Additional strict transport security
      res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
    }

    next();
  });
}

// CORS configuration for production
export const corsOptions = {
  origin: function (
    origin: string | undefined,
    callback: (err: Error | null, allow?: boolean) => void
  ) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);

    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:5000',
      'http://localhost:8080',
      'https://www.llmtxtmastery.com',
      'https://llmtxtmastery.com',
      process.env.FRONTEND_URL,
    ].filter(Boolean);

    // Allow Railway domains
    if (origin.includes('railway.app')) {
      return callback(null, true);
    }

    // Allow Netlify domains (including branch deploys)
    if (origin.includes('netlify.app')) {
      return callback(null, true);
    }

    // Allow localhost with any port
    if (origin.startsWith('http://localhost:')) {
      return callback(null, true);
    }

    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.log(`[CORS] Blocked origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  maxAge: 86400, // 24 hours
};
