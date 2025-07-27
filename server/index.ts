import dotenv from 'dotenv';

// Load environment variables first
dotenv.config();

import express, { type Request, Response, NextFunction } from "express";
import cors from "cors";
import { registerRoutes } from "./routes-enhanced";
import { setupVite, serveStatic, log } from "./vite";
import { setupSecurityMiddleware, corsOptions } from "./middleware/security";

const app = express();

// Health check endpoint for debugging
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    message: 'Railway backend is running'
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

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // Use port from environment or default to 8080
  const port = parseInt(process.env.PORT || "8080", 10);
  const host = process.env.HOST || "0.0.0.0";
  server.listen(port, host, () => {
    log(`serving on port ${port} (host: ${host})`);
  });
})();
