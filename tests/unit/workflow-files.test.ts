/**
 * GITHUB WORKFLOW FILE VALIDATION (LTM-ISS-19)
 *
 * ci-alert.yml sat INVALID for months and nobody knew. Its workflow_run trigger
 * omitted the required `workflows:` key, so GitHub rejected the file outright:
 * every run died in 0s with "this run likely failed because of a workflow file
 * issue" and no alert was ever raised. The repo therefore had no working CI or
 * deploy alerting at all, which is why a silent no-deploy shipped nothing and
 * nothing turned red.
 *
 * A note in a doc would not have caught that. These tests do, because they fail
 * red in the suite that already runs on every push:
 *   1. every workflow file parses
 *   2. a workflow_run trigger names the workflows it watches
 *   3. those names correspond to workflows that actually exist (a rename silently
 *      unhooks the watcher otherwise)
 *   4. every workflow running on main/develop IS watched by the alerter, so adding
 *      a new workflow cannot quietly leave it unmonitored
 */

import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';
import { load } from 'js-yaml';

const WORKFLOW_DIR = join(process.cwd(), '.github', 'workflows');
const ALERTER = 'ci-alert.yml';

type Workflow = { name?: string; on?: unknown; true?: unknown; [k: string]: unknown };

const files = readdirSync(WORKFLOW_DIR).filter((f) => /\.ya?ml$/.test(f));

function parse(file: string): Workflow {
  return load(readFileSync(join(WORKFLOW_DIR, file), 'utf8')) as Workflow;
}

// YAML 1.1 parses a bare `on:` key as the boolean true, so read both spellings.
function triggers(wf: Workflow): Record<string, any> {
  const raw = (wf.on ?? (wf as any)[true as unknown as string] ?? {}) as unknown;
  return typeof raw === 'object' && raw !== null ? (raw as Record<string, any>) : {};
}

function branchesOf(trigger: any): string[] {
  if (!trigger || typeof trigger !== 'object') return [];
  return Array.isArray(trigger.branches) ? trigger.branches : [];
}

describe('LTM-ISS-19: .github/workflows files are valid', () => {
  it('finds workflow files to check', () => {
    expect(files.length).toBeGreaterThan(0);
  });

  it.each(files)('%s parses as YAML and declares a name', (file) => {
    const wf = parse(file);
    expect(wf, `${file} did not parse to an object`).toBeTruthy();
    expect(typeof wf.name, `${file} is missing a top-level name:`).toBe('string');
  });

  it.each(files)('%s declares at least one trigger', (file) => {
    expect(Object.keys(triggers(parse(file))).length, `${file} has no triggers`).toBeGreaterThan(0);
  });

  // THE REGRESSION: this is the exact defect that disabled all alerting.
  it.each(files)('%s: any workflow_run trigger names the workflows it watches', (file) => {
    const wr = triggers(parse(file)).workflow_run;
    if (!wr) return; // no workflow_run trigger, nothing to assert
    expect(
      Array.isArray(wr.workflows) && wr.workflows.length > 0,
      `${file} uses workflow_run without a non-empty "workflows:" key. GitHub rejects ` +
        `the file as invalid and it will NEVER run — silently.`
    ).toBe(true);
  });

  it('every watched workflow name refers to a workflow that exists', () => {
    const existing = new Set(files.map((f) => parse(f).name).filter(Boolean) as string[]);
    for (const file of files) {
      const wr = triggers(parse(file)).workflow_run;
      if (!wr?.workflows) continue;
      for (const watched of wr.workflows as string[]) {
        expect(
          existing.has(watched),
          `${file} watches "${watched}", which matches no workflow name. A rename ` +
            `silently unhooks the watcher.`
        ).toBe(true);
      }
    }
  });

  it('the alerter watches every workflow that runs on main or develop', () => {
    const alerter = parse(ALERTER);
    const watched = new Set(((triggers(alerter).workflow_run?.workflows ?? []) as string[]) ?? []);

    const shouldBeWatched = files
      .filter((f) => f !== ALERTER)
      .map((f) => parse(f))
      .filter((wf) => {
        const t = triggers(wf);
        const branches = [...branchesOf(t.push), ...branchesOf(t.pull_request)];
        return branches.includes('main') || branches.includes('develop');
      })
      .map((wf) => wf.name as string);

    for (const name of shouldBeWatched) {
      expect(
        watched.has(name),
        `"${name}" runs on main/develop but ${ALERTER} does not watch it, so its ` +
          `failures raise no alert. Add it to the workflows: list.`
      ).toBe(true);
    }
  });
});
