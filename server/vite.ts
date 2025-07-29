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

  console.log(`[DEBUG] Looking for build directory at: ${distPath}`);
  console.log(`[DEBUG] Directory exists: ${fs.existsSync(distPath)}`);

  if (!fs.existsSync(distPath)) {
    console.error(`[ERROR] Build directory not found: ${distPath}`);
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`,
    );
  }

  // Log what files actually exist
  try {
    const allFiles = fs.readdirSync(distPath, { recursive: true });
    console.log(`[DEBUG] All files in dist/public:`, allFiles);
    
    const assetsPath = path.join(distPath, "assets");
    if (fs.existsSync(assetsPath)) {
      const assetFiles = fs.readdirSync(assetsPath);
      console.log(`[DEBUG] Asset files:`, assetFiles);
    } else {
      console.log(`[DEBUG] No assets directory found at: ${assetsPath}`);
    }

    // Also log the content of index.html to see what it's requesting
    const indexPath = path.join(distPath, "index.html");
    if (fs.existsSync(indexPath)) {
      const indexContent = fs.readFileSync(indexPath, 'utf-8');
      console.log(`[DEBUG] index.html content:`, indexContent);
    }
  } catch (err) {
    console.error(`[ERROR] Error reading build directory:`, err);
  }

  // Simple static file serving - this is the original working logic
  app.use(express.static(distPath, {
    setHeaders: (res, path) => {
      console.log(`[DEBUG] Serving static file: ${path}`);
    }
  }));

  // SPA fallback - serve index.html for non-API routes
  app.use("*", (req, res, next) => {
    // Don't serve index.html for API routes - let them 404 properly
    if (req.path.startsWith('/api/')) {
      return next();
    }
    
    console.log(`[DEBUG] SPA fallback for: ${req.path}`);
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}
