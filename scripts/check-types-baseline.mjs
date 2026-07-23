#!/usr/bin/env node
// TypeScript error-baseline gate (LTM-ISS-1).
//
// Runs the full-project `tsc --noEmit` and compares the errors against the
// committed baseline in .tsc-baseline.txt. The commit is blocked only when a
// NEW error appears (a key not in the baseline, or more occurrences of an
// existing key than the baseline allows). Pre-existing debt is tracked in the
// baseline and burned down separately (see ISSUES.md).
//
// Keys are `file|TScode|message` (no line/column numbers), so unrelated edits
// that shift line numbers do not produce false positives.
//
// Usage:
//   node scripts/check-types-baseline.mjs            # gate (used by .husky/pre-commit)
//   node scripts/check-types-baseline.mjs --update   # regenerate the baseline

import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const baselinePath = join(repoRoot, '.tsc-baseline.txt');
const updateMode = process.argv.includes('--update');

function runTsc() {
  try {
    execFileSync('npx', ['tsc', '--noEmit', '--pretty', 'false'], {
      cwd: repoRoot,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      maxBuffer: 64 * 1024 * 1024,
    });
    return '';
  } catch (err) {
    if (err.stdout === undefined && err.stderr === undefined) throw err;
    return `${err.stdout ?? ''}${err.stderr ?? ''}`;
  }
}

function parseErrors(output) {
  const counts = new Map();
  const re = /^(.+?)\(\d+,\d+\): error (TS\d+): (.*)$/;
  for (const line of output.split('\n')) {
    const m = re.exec(line);
    if (!m) continue; // skip continuation/detail lines
    const key = `${m[1]}|${m[2]}|${m[3].trim()}`;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return counts;
}

function loadBaseline() {
  if (!existsSync(baselinePath)) return null;
  const counts = new Map();
  for (const line of readFileSync(baselinePath, 'utf8').split('\n')) {
    if (!line.trim() || line.startsWith('#')) continue;
    const tab = line.indexOf('\t');
    if (tab === -1) continue;
    counts.set(line.slice(tab + 1), Number(line.slice(0, tab)));
  }
  return counts;
}

function writeBaseline(counts) {
  const header = [
    '# TypeScript error baseline (LTM-ISS-1). Pre-existing debt only.',
    '# The pre-commit gate (scripts/check-types-baseline.mjs) fails on any error NOT in this file.',
    '# Regenerate ONLY when debt is reduced: node scripts/check-types-baseline.mjs --update',
    '# Never add new entries by hand to sneak an error past the gate.',
  ].join('\n');
  const lines = [...counts.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([key, n]) => `${n}\t${key}`);
  writeFileSync(baselinePath, `${header}\n${lines.join('\n')}\n`);
}

const current = parseErrors(runTsc());
const total = [...current.values()].reduce((a, b) => a + b, 0);

if (updateMode) {
  writeBaseline(current);
  console.log(`Baseline written: ${total} error(s) across ${current.size} unique key(s) -> .tsc-baseline.txt`);
  process.exit(0);
}

const baseline = loadBaseline();
if (baseline === null) {
  if (total === 0) {
    console.log('TypeScript check clean (no baseline needed).');
    process.exit(0);
  }
  console.error(`No .tsc-baseline.txt found and tsc reports ${total} error(s).`);
  console.error('Run: node scripts/check-types-baseline.mjs --update');
  process.exit(1);
}

const fresh = [];
for (const [key, n] of current) {
  const allowed = baseline.get(key) ?? 0;
  if (n > allowed) fresh.push({ key, extra: n - allowed });
}

if (fresh.length > 0) {
  console.error('NEW TypeScript error(s) not in the baseline:');
  for (const { key, extra } of fresh) {
    const [file, code, msg] = key.split('|');
    console.error(`  ${file}: ${code}: ${msg}${extra > 1 ? `  (x${extra})` : ''}`);
  }
  console.error('\nFix these before committing. (Baseline covers pre-existing debt only;');
  console.error('run `npx tsc --noEmit` to see file/line detail.)');
  process.exit(1);
}

const baselineTotal = [...baseline.values()].reduce((a, b) => a + b, 0);
if (total < baselineTotal) {
  console.log(`TypeScript debt reduced: ${total}/${baselineTotal} baselined errors remain.`);
  console.log('Consider refreshing: node scripts/check-types-baseline.mjs --update');
} else {
  console.log(`TypeScript check passed (no new errors; ${baselineTotal} baselined, tracked in ISSUES.md).`);
}
process.exit(0);
