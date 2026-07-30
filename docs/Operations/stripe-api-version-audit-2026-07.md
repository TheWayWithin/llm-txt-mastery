# Stripe API version audit: 2025-08-27.basil → 2026-06-24.dahlia (LTM-ISS-16)

**Date**: 2026-07-28
**Purpose**: decide whether the production webhook endpoint (`we_1Ty164IiC84gpR8HkSSfUgXQ`,
created at API version 2020-08-27) can be safely upgraded to 2026-06-24.dahlia.
**Method**: field-level audit of every Stripe GA release after 2025-08-27.basil against the
exact fields our handlers consume, sourced from docs.stripe.com/changelog (and the clover/
dahlia release pages), docs.stripe.com/upgrades, docs.stripe.com/webhooks/versioning,
docs.stripe.com/api/events/types, and stripe-node GitHub releases. Audited 2026-07-28.

## What the app consumes from webhook events

Handlers: `server/routes/stripe.ts` (webhook), `server/services/stripe.ts` (client/checkout),
`server/services/cancellation.ts` (direct API reads).

| Event                                      | Consumed fields                                                                                                                                                    |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| checkout.session.completed                 | `metadata.{userId,paymentType,productType,priceId,tier,password,trial}`, `customer_details.email` / `customer_email`, `payment_intent`, `subscription`, `customer` |
| customer.subscription.updated/created      | `metadata.{userId,tier}`, `items.data[0].price.{id,unit_amount,currency}`, `status`, `id`, `customer`                                                              |
| customer.subscription.deleted              | `metadata.userId`, `customer`, `id`                                                                                                                                |
| invoice.payment_succeeded / payment_failed | `subscription` ?? `parent.subscription_details.subscription` (dual-shape since LTM-ISS-8), `customer_email`, `billing_reason`, `amount_paid`, `currency`           |

Direct-API reads (governed by the SDK pin, NOT the endpoint version):
`items.data[].current_period_end` via `subscriptionPeriodEnd()`, `cancel_at_period_end`,
invoice payments list via `resolveInvoicePaymentIntentId()`.

## Release-by-release verdict

Ten GA releases sit between basil and the target. Only two carry breaking changes at all;
none touch a consumed field:

| Release                                            | Breaking? | Touches consumed shapes?                                                                                                                                                                             |
| -------------------------------------------------- | --------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2025-09-30.clover                                  | Yes       | No — removes checkout `currency_conversion` (unused), Discount `coupon`→`source` (unused), subscription-schedule changes (unused). Flexible billing_mode becomes creation-default (see watch-item 1) |
| 2025-10-29.clover → 2026-02-25.clover (5 releases) | No        | No — additive only                                                                                                                                                                                   |
| 2026-03-25.dahlia                                  | Yes       | No — checkout `ui_mode` enum renamed (unused), additive cancellation reason, event-destination config param                                                                                          |
| 2026-04-22 / 05-27 / 06-24.dahlia                  | No        | No — additive only                                                                                                                                                                                   |

Event type names (`checkout.session.completed`, `customer.subscription.updated/deleted`,
`invoice.payment_failed`, `invoice.payment_succeeded`) are all current with no deprecations.
Stripe confirms the endpoint-version-governs-payload rule still holds for dahlia.

**Overall: no consumed field differs between basil-shaped and dahlia-shaped events, and the
existing dual-shape handlers already tolerate everything older. The endpoint can move
2020-08-27 → 2026-06-24.dahlia with no code change.**

## Watch-items (non-blocking, documented for the future SDK upgrade)

1. **Flexible billing mode** — ✅ **RESOLVED in LTM-ISS-17 (2026-07-29)**, see the SDK
   upgrade section below. (Original note: default for subscriptions created on clover+ API
   versions; portal cancellations then arrive as `cancel_at` set with
   `cancel_at_period_end: false` instead of `cancel_at_period_end: true`. Not live while
   the SDK pinned basil, because billing_mode is fixed at creation.)
2. **`ui_mode` enum renames** in dahlia checkout.session payloads (`hosted`→`hosted_page`
   etc.) — we never read `ui_mode`; only relevant if that changes.

## SDK decision

Installed stripe-node 18.5.0 pins 2025-08-27.basil; npm latest is 22.3.2 pinning
2026-06-24.dahlia. The endpoint upgrade does not require an SDK change (webhook payloads
follow the endpoint version; the code tolerates both). A four-major SDK jump touches every
direct API call and deserves its own audit — deliberately deferred and tracked as a separate
issue rather than riding along here.

## SDK upgrade 18.5.0 → 22.3.2 (LTM-ISS-17, completed 2026-07-29)

**Done.** The SDK now pins 2026-06-24.dahlia, matching the production webhook endpoint, so
direct API reads and webhook payloads are on the same API version for the first time.

**Call-site audit.** All 21 direct call sites (`server/services/stripe.ts`,
`server/services/cancellation.ts`, `server/routes/stripe.ts`) were checked against the
shipped `.d.ts` files of 22.3.2. Every one is unaffected: `checkout.sessions.create`,
`subscriptions.list/create/update/cancel`, `customers.create/retrieve`,
`billingPortal.sessions.create`, `invoices.retrieve` (incl. `expand: ['payments']`),
`invoices.list`, `refunds.create`, `webhooks.constructEvent`. The only required change was
the typed `PINNED_STRIPE_API_VERSION` literal. `npx tsc --noEmit` is 0 errors, and
`moduleResolution: bundler` means the v22 exports-map types genuinely resolve (verified —
so the clean typecheck is real, not a silently-`any` false green).

**SDK-surface breaks that did NOT affect us**, per the stripe-node changelog/migration
guides for v19–v22: v19/v20 changes are all V2-API/thin-event surface; v21 retyped
`decimal_string` fields to `Stripe.Decimal` (we read `unit_amount`, an integer — no
`*_decimal` field is read anywhere); v22 removed callbacks, positional API keys,
per-request `host`, the `types/` directory, and several `StripeResource` internals — none of
which the codebase used.

**Behaviour change we DID have to make.** Flexible billing_mode is the creation default from
2025-09-30.clover, so every subscription created under the dahlia pin is flexible. Stripe
documents ([compare](https://docs.stripe.com/billing/subscriptions/billing-mode/compare))
that a Customer Portal cancellation in flexible mode sets `cancel_at` and leaves
`cancel_at_period_end` **false**, so the old `cancel_at_period_end`-only check missed real
cancellations. `cancellation.ts` now exposes `isCancellationScheduled()` (accepts either
signal, requires a live status and a future end date) and `effectiveSubscriptionEndAt()`
(`cancel_at` wins — flexible resolves it once and never re-derives it), and
`subscriptionPeriodEnd()` now takes the LATEST item period end, matching how Stripe resolves
a flexible cancellation. The write path still sends `cancel_at_period_end: true`, which
remains accepted and behaviourally unchanged (deprecated in favour of the `cancel_at` enums;
migrating the write is optional and was deliberately left alone).

**Version pinned exactly** (`"stripe": "22.3.2"`, no caret). 22.4.0 pins 2026-07-29.dahlia,
and because `apiVersion` is typed to a single literal, a caret bump would both fail the
typecheck and re-misalign the SDK from the production endpoint. SDK and pin must move in
lockstep, as a deliberate two-line change.

**Proof.** `scripts/verify-stripe-dahlia-cancellation.ts` imports the real predicate and
asserts it against live test-mode Stripe (9/9: flexible is the default, portal-style
`cancel_at = max_period_end` sets `cancel_at` with `cancel_at_period_end` false, the old
check would miss it, the new one detects it, and both classic and flexible write paths still
work). Plus 13 unit tests in `tests/unit/stripe-basil-shapes.test.ts`, proven to fail when
the old predicate is reinstated.

## Staging verification

See the LTM-ISS-16 close note in ISSUES.md for the staging evidence (test-mode endpoint at
2026-06-24.dahlia, triggered events, handler logs and subscriptions/payment_history rows).
