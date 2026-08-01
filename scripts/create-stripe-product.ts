// One-time Stripe setup: creates the "FragClip Pro" product and a $5/month
// recurring price in the owner's Stripe account, then prints the IDs.
//
// Usage:  bun run scripts/create-stripe-product.ts
// Requires STRIPE_SECRET_KEY in the environment (test or live key).
//
// The printed price ID should go in STRIPE_PRO_PRICE_ID (see src/stripe.ts,
// which also carries the created price as a hardcoded fallback).

import Stripe from "stripe";

const key = process.env.STRIPE_SECRET_KEY;
if (!key) {
  console.error("STRIPE_SECRET_KEY is not set — cannot create Stripe product.");
  process.exit(1);
}

const stripe = new Stripe(key);

const product = await stripe.products.create({
  name: "FragClip Pro",
  description:
    "Unlimited clips, watermark-free exports, custom trigger rules, multi-game profiles.",
  // txcd_10000000 = General – Electronically Supplied Services (software/digital).
  tax_code: "txcd_10000000",
});

const price = await stripe.prices.create({
  product: product.id,
  unit_amount: 500, // $5.00
  currency: "usd",
  recurring: { interval: "month" },
  nickname: "FragClip Pro Monthly",
});

console.log(`product_id: ${product.id}`);
console.log(`price_id:   ${price.id}`);
console.log(`Add to .env.local: STRIPE_PRO_PRICE_ID=${price.id}`);
