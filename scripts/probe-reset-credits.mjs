#!/usr/bin/env node
/**
 * Repeatable staging probe for the admin credit-reset endpoint (LTM-ISS-3).
 *
 * Proves that POST /api/auth/admin/reset-coffee-credits guards and behaves
 * correctly across every branch, without printing any secret:
 *
 *   A. no  x-admin-key            -> 403 ADMIN_ACCESS_REQUIRED   (no secret needed)
 *   B. wrong x-admin-key          -> 403 ADMIN_ACCESS_REQUIRED   (no secret needed)
 *   C. valid key, no email        -> 400 EMAIL_REQUIRED          (needs ADMIN_KEY)
 *   D. valid key, unknown email   -> 404 USER_NOT_FOUND          (needs ADMIN_KEY)
 *   E. valid key, non-Solo user   -> 400 NOT_SOLO_TIER           (needs ADMIN_KEY + RESET_STARTER_EMAIL)
 *   F. valid key, Solo/coffee user-> 200 newCredits === 20       (needs ADMIN_KEY + RESET_TARGET_EMAIL)
 *
 * Checks A-E never mutate a row (they reject before the update runs). Check F is
 * the one write: it resets the target user's credits to the Solo monthly
 * allocation (20). It is OPT-IN — it runs only when RESET_TARGET_EMAIL is set —
 * so the default run is entirely non-mutating and safe to fire anytime.
 *
 * NEVER point this at production (see the guard below): the endpoint mutates real
 * customer credits. Staging only.
 *
 * Usage:
 *   node scripts/probe-reset-credits.mjs                      # staging, checks A-B only
 *   ADMIN_KEY=... node scripts/probe-reset-credits.mjs        # + checks C-D
 *   ADMIN_KEY=... RESET_STARTER_EMAIL=... RESET_TARGET_EMAIL=... \
 *     node scripts/probe-reset-credits.mjs                    # all six checks
 *   node scripts/probe-reset-credits.mjs <base-url>           # any staging-like env
 *
 * Exit code 0 = all executed checks passed, 1 = at least one failed.
 */

const DEFAULT_BASE = 'https://llm-txt-mastery-staging.up.railway.app';
const base = (process.argv[2] || process.env.PROBE_BASE_URL || DEFAULT_BASE).replace(/\/$/, '');
const path = '/api/auth/admin/reset-coffee-credits';
const url = `${base}${path}`;

// Hard guard: this endpoint writes credits. Refuse to run against production.
if (/production/.test(base) || /llmtxtmastery\.com/.test(base)) {
  console.error(`REFUSING to probe a production URL (${base}). Staging only.`);
  process.exit(2);
}

const adminKey = process.env.ADMIN_KEY || '';
const starterEmail = process.env.RESET_STARTER_EMAIL || '';
const targetEmail = process.env.RESET_TARGET_EMAIL || '';
const EXPECTED_CREDITS = 20; // TIER_LIMITS.solo.dailyAnalyses === COFFEE_TIER_CREDITS

const results = [];
const record = (name, pass, detail) => {
  results.push({ name, pass, detail });
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
};
const skip = (name, why) => console.log(`SKIP  ${name} — ${why}`);

const post = async (headers, body) => {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    /* non-JSON */
  }
  return { status: res.status, json, text };
};

console.log(`Probing ${url}\n`);

// A. no admin key -> 403
try {
  const r = await post({}, { email: 'probe-nobody@example.com' });
  record(
    'A. no admin key rejected with 403 ADMIN_ACCESS_REQUIRED',
    r.status === 403 && r.json?.code === 'ADMIN_ACCESS_REQUIRED',
    `status ${r.status}, code ${r.json?.code ?? '—'}`
  );
} catch (err) {
  record('A. no admin key rejected with 403 ADMIN_ACCESS_REQUIRED', false, err.message);
}

// B. wrong admin key -> 403
try {
  const r = await post(
    { 'x-admin-key': 'definitely-not-the-admin-key' },
    { email: 'probe-nobody@example.com' }
  );
  record(
    'B. wrong admin key rejected with 403 ADMIN_ACCESS_REQUIRED',
    r.status === 403 && r.json?.code === 'ADMIN_ACCESS_REQUIRED',
    `status ${r.status}, code ${r.json?.code ?? '—'}`
  );
} catch (err) {
  record('B. wrong admin key rejected with 403 ADMIN_ACCESS_REQUIRED', false, err.message);
}

// C. valid key, no email -> 400 EMAIL_REQUIRED
if (adminKey) {
  try {
    const r = await post({ 'x-admin-key': adminKey }, {});
    record(
      'C. valid key + no email rejected with 400 EMAIL_REQUIRED',
      r.status === 400 && r.json?.code === 'EMAIL_REQUIRED',
      `status ${r.status}, code ${r.json?.code ?? '—'}`
    );
  } catch (err) {
    record('C. valid key + no email rejected with 400 EMAIL_REQUIRED', false, err.message);
  }
} else {
  skip('C. valid key + no email', 'ADMIN_KEY not set');
}

// D. valid key, unknown email -> 404 USER_NOT_FOUND
if (adminKey) {
  try {
    const r = await post(
      { 'x-admin-key': adminKey },
      { email: `probe-unknown-${Date.now()}@no-such-user.invalid` }
    );
    record(
      'D. valid key + unknown user rejected with 404 USER_NOT_FOUND',
      r.status === 404 && r.json?.code === 'USER_NOT_FOUND',
      `status ${r.status}, code ${r.json?.code ?? '—'}`
    );
  } catch (err) {
    record('D. valid key + unknown user rejected with 404 USER_NOT_FOUND', false, err.message);
  }
} else {
  skip('D. valid key + unknown user', 'ADMIN_KEY not set');
}

// E. valid key, non-Solo tier -> 400 NOT_SOLO_TIER
if (adminKey && starterEmail) {
  try {
    const r = await post({ 'x-admin-key': adminKey }, { email: starterEmail });
    record(
      'E. valid key + non-Solo user rejected with 400 NOT_SOLO_TIER',
      r.status === 400 && r.json?.code === 'NOT_SOLO_TIER',
      `status ${r.status}, code ${r.json?.code ?? '—'}, userTier ${r.json?.userTier ?? '—'}`
    );
  } catch (err) {
    record('E. valid key + non-Solo user rejected with 400 NOT_SOLO_TIER', false, err.message);
  }
} else {
  skip('E. valid key + non-Solo user', 'ADMIN_KEY or RESET_STARTER_EMAIL not set');
}

// F. valid key, Solo/coffee tier -> 200, credits reset to 20 (THE ONE WRITE)
if (adminKey && targetEmail) {
  try {
    const r = await post({ 'x-admin-key': adminKey }, { email: targetEmail });
    record(
      'F. valid key + Solo user returns 200 and resets credits to 20',
      r.status === 200 && r.json?.success === true && r.json?.newCredits === EXPECTED_CREDITS,
      `status ${r.status}, newCredits ${r.json?.newCredits ?? '—'}, previousCredits ${r.json?.previousCredits ?? '—'}`
    );
  } catch (err) {
    record('F. valid key + Solo user returns 200 and resets credits to 20', false, err.message);
  }
} else {
  skip('F. valid key + Solo user (MUTATES)', 'ADMIN_KEY or RESET_TARGET_EMAIL not set');
}

const failed = results.filter((r) => !r.pass);
console.log(
  `\n${results.length - failed.length}/${results.length} checks passed${
    failed.length ? ` — FAILED: ${failed.map((f) => f.name).join('; ')}` : ''
  }`
);
process.exit(failed.length ? 1 : 0);
