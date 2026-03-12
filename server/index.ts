import dotenv from 'dotenv';

// Load environment variables first
dotenv.config();

// CRITICAL SECURITY: Perform startup security validation
import { performStartupSecurityValidation } from './startup-security-validation';
performStartupSecurityValidation();

// Force Railway deployment: 2025-09-27 15:51 UTC - ENHANCED LLMS.TXT FEATURES

import express, { type Request, Response, NextFunction } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { registerRoutes } from './routes';
import { setupVite, serveStatic, log } from './vite';
import { setupSecurityMiddleware, corsOptions } from './middleware/security';
import { nonceInjectionMiddleware, cspViolationReporter } from './middleware/nonce-injection';
import { enhancedSessionSecurity, securityMonitoring, enhancedInputValidation, apiSecurityHeaders, productionErrorSanitizer } from './middleware/advanced-security';
import { keepAliveService } from './services/keep-alive';

const app = express();

// Health check endpoint - available immediately for Railway
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    message: 'Server is running',
    environment: process.env.NODE_ENV || 'production',
    version: '2.1.0-phase2-validation-api',
    deployedAt: new Date().toISOString(),
    phase2: {
      validationAPI: true,
      rateLimiting: true,
      cachingLayer: true,
    },
    fixes: {
      refundEligibility: 'DESC ordering for Coffee purchases',
      debugLogging: true,
    },
    enhancements: {
      blockquoteSummary: true,
      dynamicClustering: true,
      semanticTags: true,
      intelligentSequencing: true,
      enhancedMetadata: true,
      contentQuality: true,
    },
  });
});

// Trust proxy for Railway deployment
app.set('trust proxy', true);

// Enable CORS for cross-origin requests
app.use(cors(corsOptions));

// Apply security middleware first
setupSecurityMiddleware(app);

// Add CSP violation reporting
app.use(cspViolationReporter);

// Add nonce injection for CSP compliance
app.use(nonceInjectionMiddleware);

// Enhanced security middleware
app.use(enhancedSessionSecurity);
app.use(securityMonitoring);
app.use(enhancedInputValidation);
app.use(apiSecurityHeaders);

// Raw body for Stripe webhook — must run before express.json()
app.use('/api/stripe/webhook', express.raw({ type: 'application/json' }));

// JSON parsing for all other routes (skip webhook — already handled above)
app.use((req: Request, res: Response, next: NextFunction) => {
  if (req.path === '/api/stripe/webhook') return next();
  express.json({ limit: '10mb' })(req, res, next);
});
app.use(express.urlencoded({ extended: false, limit: '10mb' }));
app.use(cookieParser());

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on('finish', () => {
    const duration = Date.now() - start;
    if (path.startsWith('/api')) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + '…';
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  const server = await registerRoutes(app);

  // Set up static file serving BEFORE error handler
  // This prevents static file 404s from becoming JSON errors
  if (app.get('env') === 'development') {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // Global error handler with production error sanitization - comes AFTER static serving
  app.use(productionErrorSanitizer);

  // Use port from environment or default to 8080
  const port = parseInt(process.env.PORT || '8080', 10);
  const host = process.env.HOST || '0.0.0.0';
  server.listen(port, host, () => {
    log(`serving on port ${port} (host: ${host})`);

    // Initialize keep-alive service to prevent Railway hibernation
    keepAliveService.start();

    // Log important configuration status
    if (!process.env.OPENAI_API_KEY) {
      console.log(
        '⚠️ WARNING: OPENAI_API_KEY not set - AI analysis disabled, using HTML extraction only'
      );
      console.log('  To enable AI analysis, set OPENAI_API_KEY in Railway environment variables');
    } else {
      console.log('✅ OPENAI_API_KEY configured - AI analysis enabled');
    }
  });
})();
// Force Railway deployment - Phase 2 Validation API with cookie-parser + uuid: Sun Oct 19 16:58:00 EDT 2025
