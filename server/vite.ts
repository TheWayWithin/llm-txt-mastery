import express, { type Express } from "express";
import fs from "fs";
import path from "path";
import { createServer as createViteServer, createLogger } from "vite";
import { type Server } from "http";
import { nanoid } from "nanoid";

const viteLogger = createLogger();

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

export async function setupVite(app: Express, server: Server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true as const,
  };

  // Use minimal config for development vite setup
  const viteConfig = {
    resolve: {
      alias: {
        "@": path.resolve(process.cwd(), "client/src"),
        "@shared": path.resolve(process.cwd(), "shared"),
      },
    },
  };
  
  const vite = await createViteServer({
    ...viteConfig,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      },
    },
    server: serverOptions,
    appType: "custom",
  });

  app.use(vite.middlewares);
  app.use("*", async (req, res, next) => {
    const url = req.originalUrl;

    try {
      const clientTemplate = path.resolve(
        process.cwd(),
        "client",
        "index.html",
      );

      // always reload the index.html file from disk incase it changes
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`,
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
}

export function serveStatic(app: Express) {
  const distPath = path.resolve(process.cwd(), "dist", "public");

  console.log(`[serveStatic] Looking for build directory at: ${distPath}`);
  console.log(`[serveStatic] Directory exists: ${fs.existsSync(distPath)}`);
  
  if (fs.existsSync(distPath)) {
    try {
      const files = fs.readdirSync(distPath, { recursive: true });
      console.log(`[serveStatic] Found files:`, files);
      
      // Also list assets directory specifically
      const assetsPath = path.join(distPath, "assets");
      if (fs.existsSync(assetsPath)) {
        const assetFiles = fs.readdirSync(assetsPath);
        console.log(`[serveStatic] Assets directory contains:`, assetFiles);
      }
    } catch (err) {
      console.error(`[serveStatic] Error reading directory:`, err);
    }
  }

  if (!fs.existsSync(distPath)) {
    console.error(`[serveStatic] Build directory not found: ${distPath}`);
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`,
    );
  }

  // Serve static files with better error handling
  app.use(express.static(distPath, {
    maxAge: '1d',
    etag: true,
    setHeaders: (res, filePath, stat) => {
      console.log(`[serveStatic] Serving file: ${filePath}`);
      // Set proper MIME types
      if (filePath.endsWith('.js')) {
        res.setHeader('Content-Type', 'application/javascript');
      } else if (filePath.endsWith('.css')) {
        res.setHeader('Content-Type', 'text/css');
      }
    }
  }));

  // SPA fallback - serve index.html for non-API routes
  app.get('*', (req, res, next) => {
    // Don't serve index.html for API routes
    if (req.path.startsWith('/api/')) {
      return next();
    }
    
    console.log(`[serveStatic] SPA fallback for: ${req.path}`);
    const indexPath = path.resolve(distPath, "index.html");
    
    if (fs.existsSync(indexPath)) {
      res.sendFile(indexPath);
    } else {
      console.error(`[serveStatic] index.html not found at: ${indexPath}`);
      res.status(404).send('index.html not found');
    }
  });
}
