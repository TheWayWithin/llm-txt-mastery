#!/usr/bin/env node
/**
 * Prospect Scanner — Checks prospect URLs for llms.txt files and categorizes results.
 * 
 * Usage:
 *   node scan-prospects.js                 # Scan all prospects
 *   node scan-prospects.js --only new      # Scan only un-scanned prospects
 *   node scan-prospects.js --url https://example.com  # Quick single-URL check
 * 
 * Updates prospects.json in place with scan results.
 */

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

const PROSPECTS_FILE = path.join(__dirname, 'prospects.json');
const TIMEOUT = 8000;
const PATHS = ['/llms.txt', '/.well-known/llms.txt', '/llms-full.txt', '/llms.md'];

function fetchUrl(url, timeout = TIMEOUT, redirects = 3) {
  return new Promise((resolve, reject) => {
    if (redirects <= 0) return reject(new Error('Too many redirects'));
    const mod = url.startsWith('https') ? https : http;
    const req = mod.get(url, { timeout, headers: { 'User-Agent': 'Mozilla/5.0 LLMtxt-Scanner/1.0' } }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        const loc = res.headers.location.startsWith('http') ? res.headers.location : new URL(res.headers.location, url).href;
        return fetchUrl(loc, timeout, redirects - 1).then(resolve).catch(reject);
      }
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, body: data, contentType: res.headers['content-type'] || '' }));
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
  });
}

function categorize(result) {
  if (!result.found) return 'no-file';
  if (result.body.trim().startsWith('<!DOCTYPE') || result.body.trim().startsWith('<html')) return 'broken';
  if (result.wordCount <= 10) return 'broken';
  if (result.wordCount < 50 && !result.body.includes('# ')) return 'weak';
  if (result.wordCount > 10000) return 'auto-generated';
  if (result.wordCount >= 50 && result.body.includes('# ')) return 'decent';
  if (result.wordCount >= 50) return 'decent';
  return 'weak';
}

function detectIssues(result) {
  const issues = [];
  if (!result.found) return ['No llms.txt file found at any standard path'];
  if (result.body.trim().startsWith('<!DOCTYPE') || result.body.trim().startsWith('<html'))
    issues.push('Serving HTML page instead of text/plain');
  if (!result.body.includes('# '))
    issues.push('Missing H1 header (# Title) — required by spec');
  if (result.wordCount <= 10)
    issues.push(`Only ${result.wordCount} words — too thin to be useful`);
  if (result.wordCount > 10000)
    issues.push(`${result.wordCount.toLocaleString()} words — too large, AI models will truncate`);
  if (result.urlCount === 0)
    issues.push('No URLs linked — should reference key pages');
  if (result.urlCount < 3 && result.wordCount > 50)
    issues.push(`Only ${result.urlCount} URL(s) — should link more resources`);
  if (result.body.includes('User-agent:') && result.body.includes('Disallow'))
    issues.push('Contains robots.txt content — wrong file format');
  return issues;
}

async function scanUrl(baseUrl) {
  const base = baseUrl.replace(/\/$/, '');
  
  for (const p of PATHS) {
    try {
      const res = await fetchUrl(base + p);
      if (res.status === 200 && res.body.length > 5) {
        const words = res.body.split(/\s+/).filter(w => w).length;
        const lines = res.body.split('\n').filter(l => l.trim()).length;
        const urls = (res.body.match(/https?:\/\//g) || []).length;
        const result = {
          found: true,
          path: p,
          body: res.body,
          wordCount: words,
          lineCount: lines,
          urlCount: urls,
          hasH1: res.body.includes('# '),
          contentType: res.contentType,
          preview: res.body.substring(0, 200).replace(/\n/g, ' ')
        };
        result.bucket = categorize(result);
        result.issues = detectIssues(result);
        return result;
      }
    } catch (e) { /* try next path */ }
  }
  
  return { found: false, bucket: 'no-file', issues: ['No llms.txt file found at any standard path'] };
}

async function main() {
  const args = process.argv.slice(2);
  
  // Quick single-URL mode
  if (args.includes('--url')) {
    const url = args[args.indexOf('--url') + 1];
    if (!url) { console.error('Usage: --url https://example.com'); process.exit(1); }
    console.log(`Scanning ${url}...`);
    const result = await scanUrl(url);
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  // Load prospects
  const data = JSON.parse(fs.readFileSync(PROSPECTS_FILE, 'utf8'));
  const onlyNew = args.includes('--only') && args[args.indexOf('--only') + 1] === 'new';
  
  let scanned = 0, updated = 0;
  for (const prospect of data.prospects) {
    if (onlyNew && prospect.scan?.scannedAt) continue;
    
    console.log(`Scanning ${prospect.name} (${prospect.url})...`);
    try {
      const result = await scanUrl(prospect.url);
      prospect.scan = {
        scannedAt: new Date().toISOString(),
        bucket: result.bucket,
        llmsTxtFound: result.found,
        ...(result.found ? {
          path: result.path,
          wordCount: result.wordCount,
          lineCount: result.lineCount,
          urlCount: result.urlCount,
          hasH1: result.hasH1,
          preview: result.preview,
          issues: result.issues
        } : {
          paths_checked: PATHS,
          issues: result.issues
        }),
        details: result.issues.join('. ')
      };
      prospect.outreach.pitch = result.bucket;
      if (prospect.outreach.status === 'new') prospect.outreach.status = 'scanned';
      
      const icon = result.found ? (result.bucket === 'decent' ? '✅' : '⚠️') : '❌';
      console.log(`  ${icon} ${result.bucket}${result.found ? ` (${result.wordCount} words, ${result.path})` : ''}`);
      scanned++;
      updated++;
    } catch (e) {
      console.log(`  ⚠️ Error: ${e.message}`);
    }
  }
  
  // Update meta
  data.meta.lastScanAt = new Date().toISOString();
  data.meta.totalProspects = data.prospects.length;
  
  // Write back
  fs.writeFileSync(PROSPECTS_FILE, JSON.stringify(data, null, 2) + '\n');
  
  // Summary
  const buckets = {};
  data.prospects.forEach(p => { buckets[p.scan?.bucket || 'unknown'] = (buckets[p.scan?.bucket || 'unknown'] || 0) + 1; });
  console.log(`\n=== Scan complete: ${scanned} scanned, ${updated} updated ===`);
  console.log('Buckets:', Object.entries(buckets).map(([k,v]) => `${k}: ${v}`).join(', '));
}

main().catch(e => { console.error(e); process.exit(1); });
