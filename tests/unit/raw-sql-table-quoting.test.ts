import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'fs';
import { join, relative } from 'path';

/**
 * LTM-ISS-6 regression guard, for the whole bug class rather than one line.
 *
 * Most tables in shared/schema.ts are snake_case, but three are declared with
 * quoted camelCase names: emailCaptures, sitemapAnalysis, llmTextFiles. Postgres
 * folds unquoted identifiers to lowercase, so raw SQL that names one of those
 * tables WITHOUT double quotes can never resolve — it throws "relation ... does
 * not exist" at runtime, which is easy to miss when a catch block swallows it.
 *
 * That is precisely how getUserUsageStats and three live /api/admin/ai-costs
 * queries stayed broken: the admin cost dashboard returned 500 and the stats
 * helper returned null, silently, for the life of the code.
 *
 * Drizzle's query builder (db.select().from(emailCaptures)) is always safe — it
 * quotes identifiers for you. This test only inspects raw SQL text.
 */

const REPO_ROOT = join(__dirname, '..', '..');
const SCANNED_DIRS = ['server', 'shared'];
const SCANNED_EXTENSIONS = ['.ts', '.js', '.sql'];

/** Table names declared in shared/schema.ts that contain an uppercase letter. */
function camelCaseTableNames(): string[] {
  const schema = readFileSync(join(REPO_ROOT, 'shared', 'schema.ts'), 'utf8');
  const names = [...schema.matchAll(/pgTable\('([^']+)'/g)].map((m) => m[1]);
  return names.filter((name) => /[A-Z]/.test(name));
}

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    if (entry === 'node_modules' || entry === 'dist' || entry.startsWith('.')) continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...walk(full));
    else if (SCANNED_EXTENSIONS.some((ext) => full.endsWith(ext))) out.push(full);
  }
  return out;
}

/**
 * Strip comments before scanning. Prose routinely says things like "Update
 * emailCaptures to reference this user", and the note explaining this very bug
 * quotes the broken SQL verbatim; neither is executable, and treating them as
 * findings would make the guard cry wolf until someone deleted it.
 *
 * The `(?<!:)` guard keeps `https://` from being mistaken for a line comment.
 */
function stripComments(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, ' ') // /* block */
    .replace(/(?<!:)\/\/[^\n]*/g, ' ') // // line
    .replace(/^\s*--[^\n]*/gm, ' '); // -- SQL line
}

/**
 * Find SQL clauses that name `table` without wrapping it in double quotes.
 * Matches the positions where a table name is legal: FROM, JOIN, INTO,
 * UPDATE, ALTER TABLE, TABLE and REFERENCES. The snake_case spelling is
 * included because that is the shape the original bug took.
 */
function unquotedReferences(source: string, table: string): string[] {
  const snake = table.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);
  const spellings = [table, snake].map((s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  const clause = '(?:FROM|JOIN|INTO|UPDATE|ALTER\\s+TABLE|TABLE|REFERENCES)';
  const pattern = new RegExp(`${clause}\\s+(?!")(?:${spellings.join('|')})\\b`, 'gi');
  return source.match(pattern) ?? [];
}

describe('raw SQL quotes camelCase table names (LTM-ISS-6)', () => {
  const camelTables = camelCaseTableNames();

  it('finds the camelCase tables it is meant to protect', () => {
    // If a rename ever makes this list empty, the test below would pass
    // vacuously. Fail loudly instead.
    expect(camelTables.length).toBeGreaterThan(0);
    expect(camelTables).toContain('emailCaptures');
  });

  it('has no unquoted references to a camelCase table in server or shared code', () => {
    const offenders: string[] = [];

    for (const dir of SCANNED_DIRS) {
      for (const file of walk(join(REPO_ROOT, dir))) {
        const source = stripComments(readFileSync(file, 'utf8'));
        for (const table of camelTables) {
          for (const hit of unquotedReferences(source, table)) {
            offenders.push(`${relative(REPO_ROOT, file)}: ${hit.replace(/\s+/g, ' ').trim()}`);
          }
        }
      }
    }

    expect(offenders, `Unquoted camelCase table(s) in raw SQL:\n${offenders.join('\n')}`).toEqual(
      []
    );
  });

  it('detects the exact shape of the original bug', () => {
    const original = 'SELECT id FROM email_captures WHERE email = $1';
    expect(unquotedReferences(original, 'emailCaptures')).not.toEqual([]);
  });

  it('accepts the corrected, quoted form', () => {
    const fixed = 'JOIN "emailCaptures" ec ON ec.user_id = ut.user_id';
    expect(unquotedReferences(fixed, 'emailCaptures')).toEqual([]);
  });

  it('does not flag Drizzle query-builder usage', () => {
    const drizzle = 'db.select().from(emailCaptures).where(eq(emailCaptures.email, email))';
    expect(unquotedReferences(drizzle, 'emailCaptures')).toEqual([]);
  });
});
