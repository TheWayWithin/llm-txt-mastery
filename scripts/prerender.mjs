#!/usr/bin/env node
// Build-time prerender of the marketing routes (LTM-ISS-9).
//
// The site is a client-rendered SPA, so non-JS crawlers saw an empty shell.
// This script runs AFTER `vite build`: it serves dist/public locally, renders
// each marketing route in headless Chromium (playwright is already a production
// dependency for the product's own JS-rendering feature), and writes the fully
// rendered HTML back into dist/public:
//
//   dist/public/app-shell/index.html   pristine SPA shell (fallback for app routes)
//   dist/public/index.html             prerendered homepage
//   dist/public/<route>/index.html     prerendered marketing page
//
// The client still boots with createRoot, which replaces #root on mount, so
// browsers get exactly the interactive app they had before; only the initial
// HTML payload changes. Tool/app routes (/analyze, /validate, /validator,
// auth, account, ...) are NOT prerendered and keep the empty shell.
//
// Usage: node scripts/prerender.mjs   (requires dist/public from `vite build`
// and a Chromium install for playwright: `npx playwright install chromium`)

import { createServer } from 'node:http';
import { readFileSync, writeFileSync, mkdirSync, existsSync, statSync } from 'node:fs';
import { join, resolve, extname, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const distDir = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'dist', 'public');

// Marketing routes from sitemap.xml. Tool routes (/validate, /analyze,
// /validator) are deliberately excluded — they stay pure SPA.
const MARKETING_ROUTES = [
  '/',
  '/pricing',
  '/about',
  '/docs',
  '/blog',
  '/contact',
  '/privacy',
  '/terms',
  '/cookies',
];

const MIME = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.mjs': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain',
  '.xml': 'application/xml',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

function fail(message) {
  console.error(`[prerender] FATAL: ${message}`);
  process.exit(1);
}

if (!existsSync(join(distDir, 'index.html'))) {
  fail(`no build found at ${distDir} — run vite build first`);
}

const shellHtml = readFileSync(join(distDir, 'index.html'), 'utf8');
if (!shellHtml.includes('<div id="root"></div>')) {
  fail('dist/public/index.html does not look like the pristine SPA shell (has #root content?)');
}

// Tiny static server over dist/public with SPA fallback to the shell.
const server = createServer((req, res) => {
  const urlPath = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  let filePath = join(distDir, urlPath);
  try {
    if (existsSync(filePath) && statSync(filePath).isFile()) {
      res.setHeader('Content-Type', MIME[extname(filePath)] || 'application/octet-stream');
      res.end(readFileSync(filePath));
      return;
    }
  } catch {
    // fall through to shell
  }
  res.setHeader('Content-Type', 'text/html');
  res.end(shellHtml);
});

await new Promise((resolveListen) => server.listen(0, '127.0.0.1', resolveListen));
const port = server.address().port;
const origin = `http://127.0.0.1:${port}`;
console.log(`[prerender] serving ${distDir} at ${origin}`);

const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });

// Determinism: block every non-local request (analytics, fonts, the production
// API). The captured DOM keeps the original tags; only prerender-time network
// activity is suppressed. Marketing pages render their full static content in
// the unauthenticated state, which is exactly what a crawler should see.
await context.route('**/*', (route) => {
  const url = route.request().url();
  if (url.startsWith(origin)) return route.continue();
  return route.abort();
});

const snapshots = new Map();

for (const routePath of MARKETING_ROUTES) {
  const page = await context.newPage();
  await page.goto(`${origin}${routePath}`, { waitUntil: 'load', timeout: 30000 });
  try {
    // Wait until React has painted real content into #root.
    await page.waitForFunction(
      () => {
        const root = document.getElementById('root');
        return root && root.innerText.trim().length > 200;
      },
      { timeout: 20000 }
    );
  } catch {
    fail(`route ${routePath} did not render meaningful content within 20s`);
  }
  // Small settle for late paints (icons, lazy sections).
  await page.waitForTimeout(500);

  let html = await page.content();

  // The GTM bootstrap in the shell injects a gtm.js <script> tag at runtime;
  // captured copies would double-inject on real page loads. Strip only that
  // runtime-injected tag — the inline bootstrap itself stays untouched.
  html = html.replace(
    /<script[^>]*src="https:\/\/www\.googletagmanager\.com\/gtm\.js[^"]*"[^>]*><\/script>/g,
    ''
  );

  const h1 = await page
    .locator('h1')
    .first()
    .textContent()
    .catch(() => null);
  console.log(
    `[prerender] ${routePath}  h1: ${h1 ? JSON.stringify(h1.trim()) : '(none)'}  ${Math.round(html.length / 1024)}KB`
  );
  snapshots.set(routePath, html);
  await page.close();
}

await browser.close();
server.close();

// Write outputs only after every route rendered successfully.
// 1) Preserve the pristine shell for app-route fallback.
mkdirSync(join(distDir, 'app-shell'), { recursive: true });
writeFileSync(join(distDir, 'app-shell', 'index.html'), shellHtml);

// 2) Marketing snapshots.
for (const [routePath, html] of snapshots) {
  if (routePath === '/') {
    writeFileSync(join(distDir, 'index.html'), html);
  } else {
    const outDir = join(distDir, routePath.slice(1));
    mkdirSync(outDir, { recursive: true });
    writeFileSync(join(outDir, 'index.html'), html);
  }
}

console.log(`[prerender] wrote ${snapshots.size} routes + app-shell/index.html`);
