#!/usr/bin/env node
/**
 * Repeatable production/staging probe for the Stripe webhook route.
 *
 * Proves, without sending a single real Stripe event and without printing any
 * secret, that:
 *   1. the service is up            -> GET  /health              == 200
 *   2. the webhook route exists     -> POST /api/stripe/webhook  == 400 (no sig)
 *   3. signature checking is alive  -> POST with a bogus stripe-signature == 400
 *   4. STRIPE_WEBHOOK_SECRET is set -> the bogus-signature error message is
 *      "Webhook signature validation failed: ..." (secret loaded, HMAC ran)
 *      and NOT "STRIPE_WEBHOOK_SECRET is required" (secret missing).
 *
 * See server/services/stripe.ts::validateWebhookSignature for those two branches.
 * The probe never learns the secret's value, only whether one is configured.
 *
 * Usage:
 *   node scripts/probe-stripe-webhook.mjs                 # production
 *   node scripts/probe-stripe-webhook.mjs <base-url>      # any environment
 *
 * Exit code 0 = all checks passed, 1 = at least one failed.
 */

const DEFAULT_BASE = 'https://llm-txt-mastery-production.up.railway.app';
const base = (process.argv[2] || process.env.PROBE_BASE_URL || DEFAULT_BASE).replace(/\/$/, '');

const results = [];
const record = (name, pass, detail) => {
  results.push({ name, pass, detail });
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
};

const readBody = async (res) => {
  const text = await res.text();
  try {
    return { text, json: JSON.parse(text) };
  } catch {
    return { text, json: null };
  }
};

console.log(`Probing ${base}\n`);

// 1. Service health
try {
  const res = await fetch(`${base}/health`, { method: 'GET' });
  record('health returns 200', res.status === 200, `status ${res.status}`);
} catch (err) {
  record('health returns 200', false, err.message);
}

// 2. Route exists and rejects an unsigned POST
try {
  const res = await fetch(`${base}/api/stripe/webhook`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ probe: 'unsigned', ts: Date.now() }),
  });
  const { json, text } = await readBody(res);
  const message = json?.message ?? text.slice(0, 120);
  record(
    'unsigned POST rejected with 400',
    res.status === 400,
    `status ${res.status}, message "${message}"`
  );
  record(
    'rejection is the missing-signature branch',
    /missing stripe signature/i.test(message),
    `message "${message}"`
  );
} catch (err) {
  record('unsigned POST rejected with 400', false, err.message);
}

// 3 + 4. Bogus signature: proves the secret is loaded and the HMAC check ran
try {
  const res = await fetch(`${base}/api/stripe/webhook`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      // Well-formed but deliberately invalid Stripe signature header.
      'stripe-signature': `t=${Math.floor(Date.now() / 1000)},v1=${'0'.repeat(64)}`,
    },
    body: JSON.stringify({ probe: 'bogus-signature', ts: Date.now() }),
  });
  const { json, text } = await readBody(res);
  const message = json?.message ?? text.slice(0, 200);

  record(
    'bogus signature rejected with 400',
    res.status === 400,
    `status ${res.status}`
  );

  const secretMissing = /STRIPE_WEBHOOK_SECRET is required/i.test(message);
  const signatureChecked = /signature validation failed/i.test(message);
  record(
    'STRIPE_WEBHOOK_SECRET is configured on the server',
    signatureChecked && !secretMissing,
    secretMissing
      ? 'server reports the secret is NOT set'
      : `signature verification ran (message "${message.slice(0, 90)}")`
  );
} catch (err) {
  record('bogus signature rejected with 400', false, err.message);
}

const failed = results.filter((r) => !r.pass);
console.log(
  `\n${results.length - failed.length}/${results.length} checks passed${failed.length ? ` — FAILED: ${failed.map((f) => f.name).join('; ')}` : ''}`
);
process.exit(failed.length ? 1 : 0);
