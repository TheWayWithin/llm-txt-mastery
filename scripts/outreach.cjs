#!/usr/bin/env node
/**
 * Simple Outreach Helper
 * Generates personalized messages with UTM tracking, logs to CSV
 * 
 * Usage:
 *   node scripts/outreach.js "John Smith" "twitter" "A" "awesome-site.com"
 *   node scripts/outreach.js --list          # Show recent outreach
 *   node scripts/outreach.js --stats         # Show A/B stats
 */

const fs = require('fs');
const path = require('path');

const CSV_PATH = path.join(__dirname, '..', 'data', 'outreach.csv');
const VARIANTS_PATH = path.join(__dirname, '..', 'OUTREACH-VARIANTS.md');

// Message templates
const TEMPLATES = {
  A: {
    name: 'Shy Dev (Vulnerability-First)',
    generate: (prospect, site) => `Hi ${prospect},

I'm a developer who built something for AI optimization — but I'm painfully shy and honestly terrible at outreach. You clearly know what you're doing here.

Would you be open to a quick look at {{LINK}}? Less interested in a signup than honest feedback on whether this would even land with someone like you.

Any tips on how I could do this outreach better would genuinely be more valuable than a conversion 😅

— Jamie`
  },
  B: {
    name: 'Curiosity-First (The Question)',
    generate: (prospect, site) => `Hi ${prospect},

Saw your work${site ? ` on ${site}` : ''} — quick question: have you thought about how AI assistants see your sites?

I built {{LINK}} for exactly this — but I'm new to outreach and honestly learning as I go. You clearly know what you're doing.

Would love your honest take on whether this would resonate with someone like you. Tips on my approach welcome too 😅

— Jamie`
  }
};

function generateUTMLink(variant, channel, prospect) {
  const base = 'https://llmtxtmastery.com';
  const params = new URLSearchParams({
    utm_source: channel,
    utm_medium: 'dm',
    utm_campaign: 'launch_feb2026',
    utm_content: `variant_${variant.toLowerCase()}`
  });
  return `${base}?${params.toString()}`;
}

function getNextId() {
  if (!fs.existsSync(CSV_PATH)) {
    return 1;
  }
  const content = fs.readFileSync(CSV_PATH, 'utf-8');
  const lines = content.trim().split('\n').filter(l => l.trim());
  // Skip header, find max ID
  let maxId = 0;
  for (let i = 1; i < lines.length; i++) {
    const id = parseInt(lines[i].split(',')[0]);
    if (!isNaN(id) && id > maxId) maxId = id;
  }
  return maxId + 1;
}

function logOutreach(id, prospect, channel, variant, site) {
  const date = new Date().toISOString().split('T')[0];
  const row = `${id},${date},"${prospect}",${channel},${variant},"${TEMPLATES[variant]?.name || variant}","${site || ''}",sent,,,,,""\n`;
  
  // Ensure CSV exists with header
  if (!fs.existsSync(CSV_PATH)) {
    fs.writeFileSync(CSV_PATH, 'id,date,prospect,channel,variant,first_line,site_referenced,status,opened,replied,reply_sentiment,converted,notes\n');
  }
  
  fs.appendFileSync(CSV_PATH, row);
}

function showStats() {
  if (!fs.existsSync(CSV_PATH)) {
    console.log('No outreach data yet.');
    return;
  }
  
  const content = fs.readFileSync(CSV_PATH, 'utf-8');
  const lines = content.trim().split('\n').filter(l => l.trim());
  
  const stats = { A: { sent: 0, replied: 0 }, B: { sent: 0, replied: 0 } };
  
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',');
    const variant = cols[4];
    const replied = cols[9]?.toLowerCase();
    
    if (stats[variant]) {
      stats[variant].sent++;
      if (replied === 'yes' || replied === 'true' || replied === '1') {
        stats[variant].replied++;
      }
    }
  }
  
  console.log('\n📊 Outreach A/B Stats\n');
  console.log('Variant A (Shy Dev):');
  console.log(`  Sent: ${stats.A.sent}`);
  console.log(`  Replied: ${stats.A.replied}`);
  console.log(`  Reply Rate: ${stats.A.sent ? ((stats.A.replied / stats.A.sent) * 100).toFixed(1) + '%' : 'N/A'}`);
  console.log('\nVariant B (Curiosity):');
  console.log(`  Sent: ${stats.B.sent}`);
  console.log(`  Replied: ${stats.B.replied}`);
  console.log(`  Reply Rate: ${stats.B.sent ? ((stats.B.replied / stats.B.sent) * 100).toFixed(1) + '%' : 'N/A'}`);
  console.log('');
}

function showRecent(n = 10) {
  if (!fs.existsSync(CSV_PATH)) {
    console.log('No outreach data yet.');
    return;
  }
  
  const content = fs.readFileSync(CSV_PATH, 'utf-8');
  const lines = content.trim().split('\n').filter(l => l.trim());
  
  console.log('\n📋 Recent Outreach\n');
  console.log('ID  | Date       | Prospect            | Channel  | Variant | Replied');
  console.log('----|------------|---------------------|----------|---------|--------');
  
  const recent = lines.slice(1).slice(-n);
  for (const line of recent) {
    const cols = line.split(',');
    const id = cols[0].padEnd(3);
    const date = cols[1];
    const prospect = (cols[2] || '').replace(/"/g, '').substring(0, 19).padEnd(19);
    const channel = (cols[3] || '').padEnd(8);
    const variant = cols[4];
    const replied = cols[9] || '';
    console.log(`${id} | ${date} | ${prospect} | ${channel} | ${variant}       | ${replied}`);
  }
  console.log('');
}

// Main
const args = process.argv.slice(2);

if (args[0] === '--stats') {
  showStats();
  process.exit(0);
}

if (args[0] === '--list') {
  showRecent();
  process.exit(0);
}

if (args.length < 3) {
  console.log(`
🚀 Outreach Helper

Usage:
  node scripts/outreach.js "<name>" "<channel>" "<variant>" ["<their-site>"]

Examples:
  node scripts/outreach.js "John Smith" "twitter" "A"
  node scripts/outreach.js "Jane Doe" "linkedin" "B" "jane-portfolio.com"

Options:
  --list    Show recent outreach
  --stats   Show A/B test statistics

Variants:
  A = Shy Dev (vulnerability-first)
  B = Curiosity-First (the question)
`);
  process.exit(1);
}

const [prospect, channel, variant, site] = args;

if (!TEMPLATES[variant.toUpperCase()]) {
  console.error(`Unknown variant: ${variant}. Use A or B.`);
  process.exit(1);
}

const v = variant.toUpperCase();
const link = generateUTMLink(v, channel, prospect);
const message = TEMPLATES[v].generate(prospect, site).replace('{{LINK}}', link);
const id = getNextId();

// Log to CSV
logOutreach(id, prospect, channel, v, site);

console.log(`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📤 OUTREACH #${id} | ${channel.toUpperCase()} | Variant ${v}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${message}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Logged to CSV | Copy message above and send!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`);
