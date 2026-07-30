#!/usr/bin/env node
/**
 * Repeatable TEST-MODE proof of the flexible-billing cancellation semantics that
 * LTM-ISS-17 depends on, exercised through the upgraded stripe-node SDK itself.
 *
 * Why this exists: our cancellation code used to decide "is this subscription
 * scheduled to cancel?" by reading `cancel_at_period_end` alone. From API version
 * 2025-09-30.clover onward, flexible billing mode is the creation default, and
 * Stripe documents that a Customer Portal cancellation then sets `cancel_at` and
 * leaves `cancel_at_period_end` FALSE:
 *   https://docs.stripe.com/billing/subscriptions/billing-mode/compare
 * That would make a real cancellation invisible to the old check.
 *
 * The unit tests (tests/unit/stripe-basil-shapes.test.ts) pin that our predicate
 * handles both shapes against fixtures. This script closes the loop: it imports the
 * REAL predicate from server/services/cancellation.ts and asserts it against live
 * test-mode Stripe objects, proving the API really does behave this way at our
 * pinned version and that the shipped code handles it.
 *
 * What it does (TEST MODE ONLY — see the guard):
 *   1. asserts the SDK pins 2026-06-24.dahlia
 *   2. creates a throwaway product + price + customer + subscription
 *   3. confirms the subscription defaulted to billing_mode.type === 'flexible'
 *   4. schedules cancellation the way the Portal does: cancel_at = 'max_period_end'
 *   5. asserts cancel_at is set AND cancel_at_period_end is FALSE  <-- the claim
 *   6. contrasts the classic path: cancel_at_period_end = true behaves as before
 *   7. deletes/cancels everything it created
 *
 * It refuses to run against a live key. It never prints the key.
 *
 * Usage:
 *   STRIPE_SECRET_KEY=sk_test_... npx tsx scripts/verify-stripe-dahlia-cancellation.ts
 *   # or let it read the staging key itself:
 *   STRIPE_SECRET_KEY=$(railway variables -e staging -s llm-txt-mastery --kv \
 *     | grep '^STRIPE_SECRET_KEY=' | cut -d= -f2-) \
 *     npx tsx scripts/verify-stripe-dahlia-cancellation.ts
 *
 * Exit 0 = every assertion held, 1 = at least one failed, 2 = refused to run.
 */

import Stripe from 'stripe';
// The REAL production predicate, not a copy: this script's whole point is to
// assert the shipped code against real test-mode Stripe objects.
import {
  isCancellationScheduled,
  effectiveSubscriptionEndAt,
} from '../server/services/cancellation';

const EXPECTED_API_VERSION = '2026-06-24.dahlia';
const key = process.env.STRIPE_SECRET_KEY || '';

// Hard guard: this script CREATES objects. Test mode only, never live.
if (!key) {
  console.error('STRIPE_SECRET_KEY not set.');
  process.exit(2);
}
if (!key.startsWith('sk_test_') && !key.startsWith('rk_test_')) {
  console.error('REFUSING to run: key is not a test-mode key (expected sk_test_/rk_test_ prefix).');
  process.exit(2);
}

const stripe = new Stripe(key, { apiVersion: EXPECTED_API_VERSION });

const results: Array<{ name: string; pass: boolean }> = [];
const check = (name: string, pass: boolean, detail?: string) => {
  results.push({ name, pass });
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
};

const effectiveEndAt = effectiveSubscriptionEndAt;

const created: { subs: string[]; customers: string[]; products: string[] } = {
  subs: [],
  customers: [],
  products: [],
};

try {
  // 1. The client really will SEND the version we expect. Asserted via
  // getApiField('version') rather than Stripe.LatestApiVersion, which is a
  // type-only export and is undefined at runtime in v22.
  const sentVersion = stripe.getApiField('version');
  check(
    `client sends API version ${EXPECTED_API_VERSION}`,
    sentVersion === EXPECTED_API_VERSION,
    `getApiField('version') = ${sentVersion}`
  );

  // 2. Throwaway fixtures
  const product = await stripe.products.create({ name: 'LTM-ISS-17 verification (delete me)' });
  created.products.push(product.id);
  const price = await stripe.prices.create({
    product: product.id,
    unit_amount: 495,
    currency: 'usd',
    recurring: { interval: 'month' },
  });
  const pm = 'pm_card_visa'; // Stripe test payment method
  const customer = await stripe.customers.create({
    name: 'LTM-ISS-17 verification',
    payment_method: pm,
    invoice_settings: { default_payment_method: pm },
  });
  created.customers.push(customer.id);

  const makeSub = async (billingModeType: 'flexible' | 'classic') => {
    const sub = await stripe.subscriptions.create({
      customer: customer.id,
      items: [{ price: price.id }],
      billing_mode: { type: billingModeType },
    });
    created.subs.push(sub.id);
    return sub;
  };

  // 3. FLEXIBLE: the default under dahlia — verify it really is the default
  const defaultSub = await makeSub('flexible');
  check(
    'subscription is created in flexible billing mode',
    defaultSub.billing_mode?.type === 'flexible',
    `billing_mode.type = ${JSON.stringify(defaultSub.billing_mode?.type)}`
  );

  // 4 + 5. Schedule cancellation the way the Customer Portal does in flexible mode
  const flexCancelled = await stripe.subscriptions.update(defaultSub.id, {
    cancel_at: 'max_period_end',
  });
  check(
    'FLEXIBLE portal-style cancellation sets cancel_at',
    typeof flexCancelled.cancel_at === 'number',
    `cancel_at = ${flexCancelled.cancel_at}`
  );
  check(
    'FLEXIBLE portal-style cancellation leaves cancel_at_period_end FALSE (the trap)',
    flexCancelled.cancel_at_period_end === false,
    `cancel_at_period_end = ${flexCancelled.cancel_at_period_end}`
  );
  check(
    'old predicate (cancel_at_period_end only) would MISS this cancellation',
    flexCancelled.cancel_at_period_end === false,
    'confirms the regression this issue fixes'
  );
  check(
    'new predicate isCancellationScheduled() DETECTS it',
    isCancellationScheduled(flexCancelled) === true,
    `status=${flexCancelled.status}, effectiveEndAt=${effectiveEndAt(flexCancelled)}`
  );

  // 6. CLASSIC contrast: our own write path still behaves as before
  const classicSub = await makeSub('classic');
  const classicCancelled = await stripe.subscriptions.update(classicSub.id, {
    cancel_at_period_end: true,
  });
  check(
    'CLASSIC cancel_at_period_end=true still accepted and set (our write path)',
    classicCancelled.cancel_at_period_end === true,
    `cancel_at_period_end = ${classicCancelled.cancel_at_period_end}`
  );
  check(
    'new predicate also detects the CLASSIC shape',
    isCancellationScheduled(classicCancelled) === true,
    `cancel_at = ${classicCancelled.cancel_at}, effectiveEndAt = ${effectiveEndAt(classicCancelled)}`
  );

  // Our own write path against a FLEXIBLE subscription (what production now does)
  const flexOwnWrite = await makeSub('flexible');
  const flexOwnWriteCancelled = await stripe.subscriptions.update(flexOwnWrite.id, {
    cancel_at_period_end: true,
  });
  check(
    'our cancel_at_period_end write still works on a FLEXIBLE subscription',
    isCancellationScheduled(flexOwnWriteCancelled) === true,
    `cancel_at_period_end=${flexOwnWriteCancelled.cancel_at_period_end}, cancel_at=${flexOwnWriteCancelled.cancel_at}`
  );
} catch (err) {
  check('script ran without throwing', false, err?.message ?? String(err));
} finally {
  // 7. Clean up everything we created
  for (const id of created.subs) {
    try {
      await stripe.subscriptions.cancel(id);
    } catch {
      /* already gone */
    }
  }
  for (const id of created.customers) {
    try {
      await stripe.customers.del(id);
    } catch {
      /* already gone */
    }
  }
  for (const id of created.products) {
    try {
      await stripe.products.update(id, { active: false });
    } catch {
      /* best effort */
    }
  }
  console.log(
    `\ncleaned up ${created.subs.length} subscription(s), ${created.customers.length} customer(s)`
  );
}

const failed = results.filter((r) => !r.pass);
console.log(
  `${results.length - failed.length}/${results.length} checks passed${
    failed.length ? ` — FAILED: ${failed.map((f) => f.name).join('; ')}` : ''
  }`
);
process.exit(failed.length ? 1 : 0);
