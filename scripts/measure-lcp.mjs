#!/usr/bin/env node
/**
 * LCP measurement harness (LTM-ISS-13).
 *
 * Runs Lighthouse N times against a URL with BOTH throttling methods and prints
 * per-pass performance score + LCP plus the median of each set.
 *
 * Why both: devtools throttling is the source of truth for real network
 * behaviour here; the default simulated (lantern) model is what public
 * Lighthouse scores use, and it has mis-scored self-hosted fonts on this site
 * before (phantom 9.7s LCP vs a 543ms PerformanceObserver trace). A change is
 * only acceptable if devtools improves and simulated does not regress.
 *
 * Usage:
 *   node scripts/measure-lcp.mjs <url> [passes]
 *   node scripts/measure-lcp.mjs https://llmtxtmastery.com 3
 */
import { execFileSync } from 'node:child_process';

const url = process.argv[2];
const passes = Number(process.argv[3] || 3);
if (!url) {
  console.error('usage: node scripts/measure-lcp.mjs <url> [passes]');
  process.exit(1);
}

function runPass(method) {
  const args = [
    'lighthouse',
    url,
    '--only-categories=performance',
    '--output=json',
    '--quiet',
    '--chrome-flags=--headless=new',
  ];
  if (method === 'devtools') args.push('--throttling-method=devtools');
  const out = execFileSync('npx', args, {
    maxBuffer: 64 * 1024 * 1024,
    stdio: ['ignore', 'pipe', 'ignore'],
  });
  const r = JSON.parse(out.toString());
  return {
    score: r.categories.performance.score,
    lcpMs: r.audits['largest-contentful-paint'].numericValue,
    fcpMs: r.audits['first-contentful-paint'].numericValue,
  };
}

const median = (xs) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)];

for (const method of ['devtools', 'simulated']) {
  const results = [];
  for (let i = 1; i <= passes; i++) {
    const r = runPass(method);
    results.push(r);
    console.log(
      `${method} pass ${i}: score=${r.score?.toFixed(2)} LCP=${Math.round(r.lcpMs)}ms FCP=${Math.round(r.fcpMs)}ms`
    );
  }
  console.log(
    `${method} MEDIAN: score=${median(results.map((r) => r.score)).toFixed(2)} LCP=${Math.round(median(results.map((r) => r.lcpMs)))}ms`
  );
}
