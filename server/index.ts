import dotenv from 'dotenv';

// Load environment variables first
dotenv.config();

// Force Railway deployment: 2025-01-20

import express, { type Request, Response, NextFunction } from "express";
import cors from "cors";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { setupSecurityMiddleware, corsOptions } from "./middleware/security";

const app = express();

// Health check endpoint for debugging
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    message: 'Railway backend is running',
    database: process.env.DATABASE_URL ? 'configured' : 'missing'
  });
});


// Trust proxy for Railway deployment
app.set('trust proxy', true);

// Enable CORS for cross-origin requests
app.use(cors(corsOptions));

// Apply security middleware first
setupSecurityMiddleware(app);

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
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
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // Global error handler for API routes only - comes AFTER static serving
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // Use port from environment or default to 8080
  const port = parseInt(process.env.PORT || "8080", 10);
  const host = process.env.HOST || "0.0.0.0";
  server.listen(port, host, () => {
    log(`serving on port ${port} (host: ${host})`);
    
    // Log important configuration status
    if (!process.env.OPENAI_API_KEY) {
      console.log("⚠️ WARNING: OPENAI_API_KEY not set - AI analysis disabled, using HTML extraction only");
      console.log("  To enable AI analysis, set OPENAI_API_KEY in Railway environment variables");
    } else {
      console.log("✅ OPENAI_API_KEY configured - AI analysis enabled");
    }
  });
})();
// Force Railway redeploy: Wed Aug 27 13:05:42 EDT 2025
