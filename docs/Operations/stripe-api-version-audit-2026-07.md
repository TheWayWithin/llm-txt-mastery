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

| Event | Consumed fields |
|---|---|
| checkout.session.completed | `metadata.{userId,paymentType,productType,priceId,tier,password,trial}`, `customer_details.email` / `customer_email`, `payment_intent`, `subscription`, `customer` |
| customer.subscription.updated/created | `metadata.{userId,tier}`, `items.data[0].price.{id,unit_amount,currency}`, `status`, `id`, `customer` |
| customer.subscription.deleted | `metadata.userId`, `customer`, `id` |
| invoice.payment_succeeded / payment_failed | `subscription` ?? `parent.subscription_details.subscription` (dual-shape since LTM-ISS-8), `customer_email`, `billing_reason`, `amount_paid`, `currency` |

Direct-API reads (governed by the SDK pin, NOT the endpoint version):
`items.data[].current_period_end` via `subscriptionPeriodEnd()`, `cancel_at_period_end`,
invoice payments list via `resolveInvoicePaymentIntentId()`.

## Release-by-release verdict

Ten GA releases sit between basil and the target. Only two carry breaking changes at all;
none touch a consumed field:

| Release | Breaking? | Touches consumed shapes? |
|---|---|---|
| 2025-09-30.clover | Yes | No — removes checkout `currency_conversion` (unused), Discount `coupon`→`source` (unused), subscription-schedule changes (unused). Flexible billing_mode becomes creation-default (see watch-item 1) |
| 2025-10-29.clover → 2026-02-25.clover (5 releases) | No | No — additive only |
| 2026-03-25.dahlia | Yes | No — checkout `ui_mode` enum renamed (unused), additive cancellation reason, event-destination config param |
| 2026-04-22 / 05-27 / 06-24.dahlia | No | No — additive only |

Event type names (`checkout.session.completed`, `customer.subscription.updated/deleted`,
`invoice.payment_failed`, `invoice.payment_succeeded`) are all current with no deprecations.
Stripe confirms the endpoint-version-governs-payload rule still holds for dahlia.

**Overall: no consumed field differs between basil-shaped and dahlia-shaped events, and the
existing dual-shape handlers already tolerate everything older. The endpoint can move
2020-08-27 → 2026-06-24.dahlia with no code change.**

## Watch-items (non-blocking, documented for the future SDK upgrade)

1. **Flexible billing mode** (default for subscriptions created on clover+ API versions):
   portal cancellations then arrive as `cancel_at` set with `cancel_at_period_end: false`
   instead of `cancel_at_period_end: true`. Not live for us: our SDK pin (basil) means our
   subscriptions are created classic-mode, and billing_mode is fixed at creation. When the
   SDK is upgraded past clover, `server/services/cancellation.ts` (the
   `cancel_at_period_end` check, ~line 454) must also treat `cancel_at` as a cancellation
   signal. Tracked with the SDK-upgrade issue.
2. **`ui_mode` enum renames** in dahlia checkout.session payloads (`hosted`→`hosted_page`
   etc.) — we never read `ui_mode`; only relevant if that changes.

## SDK decision

Installed stripe-node 18.5.0 pins 2025-08-27.basil; npm latest is 22.3.2 pinning
2026-06-24.dahlia. The endpoint upgrade does not require an SDK change (webhook payloads
follow the endpoint version; the code tolerates both). A four-major SDK jump touches every
direct API call and deserves its own audit — deliberately deferred and tracked as a separate
issue rather than riding along here.

## Staging verification

See the LTM-ISS-16 close note in ISSUES.md for the staging evidence (test-mode endpoint at
2026-06-24.dahlia, triggered events, handler logs and subscriptions/payment_history rows).
