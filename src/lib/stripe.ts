// Stripe billing. Everything is gated behind STRIPE_SECRET_KEY so the app runs
// fine with no billing configured — the upgrade UI simply hides.

import Stripe from "stripe";

let cached: Stripe | null | undefined;

export function stripeClient(): Stripe | null {
  if (cached !== undefined) return cached;
  const key = process.env.STRIPE_SECRET_KEY;
  cached = key ? new Stripe(key) : null;
  return cached;
}

export function isBillingConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

/** The configured Stripe recurring price id for a paid plan (env-driven). */
export function priceIdForPlan(plan: "pro" | "team"): string | undefined {
  return plan === "team"
    ? process.env.STRIPE_PRICE_TEAM
    : process.env.STRIPE_PRICE_PRO;
}
