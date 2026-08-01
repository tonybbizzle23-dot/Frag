// Stripe integration — client, price ID, and shared constants.
//
// STRIPE_SECRET_KEY must be set in the environment (see .env.local; never
// committed). STRIPE_PRO_PRICE_ID is configurable via env; when unset we fall
// back to the price created by scripts/create-stripe-product.ts:
//   price_1TzgjHBDIM4vzeeEwG6Kguto  (FragClip Pro — $5/month)

import Stripe from "stripe";

/** Price ID for the "FragClip Pro" monthly subscription. */
export const STRIPE_PRO_PRICE_ID: string =
  process.env.STRIPE_PRO_PRICE_ID || "price_1TzgjHBDIM4vzeeEwG6Kguto";

let _stripe: Stripe | null = null;

/**
 * Lazily-created Stripe client. Construction is cheap and does not throw for
 * a missing/invalid key — the error only surfaces when an API call is made,
 * so the site can still boot before STRIPE_SECRET_KEY is configured.
 */
export function getStripe(): Stripe {
  if (!_stripe) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) {
      throw new Error(
        "STRIPE_SECRET_KEY is not set — Stripe API unavailable. " +
          "Add it to .env.local to enable checkout.",
      );
    }
    _stripe = new Stripe(key);
  }
  return _stripe;
}

/** Map a Stripe subscription status to our stored subscription_status value. */
export function normalizeSubscriptionStatus(
  status: string,
): "active" | "trialing" | "past_due" | "unpaid" | "incomplete" | "canceled" {
  switch (status) {
    case "trialing":
    case "past_due":
    case "unpaid":
    case "incomplete":
    case "canceled":
      return status;
    default:
      return "active";
  }
}

/** True when a Stripe status means the user should hold the Pro tier. */
export function isProStatus(status: string): boolean {
  return status === "active" || status === "trialing";
}
