import { NextRequest, NextResponse } from "next/server";
import { getSessionEmail } from "@/lib/auth";
import { stripeClient, isBillingConfigured, priceIdForPlan } from "@/lib/stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST /api/billing/checkout { plan } -> a Stripe Checkout URL for the
// signed-in user to subscribe to Pro/Team.
export async function POST(req: NextRequest) {
  const email = await getSessionEmail();
  if (!email) {
    return NextResponse.json({ error: "Sign in to upgrade." }, { status: 401 });
  }

  const stripe = stripeClient();
  if (!stripe || !isBillingConfigured()) {
    return NextResponse.json(
      { error: "Billing isn't configured on this deployment yet." },
      { status: 503 },
    );
  }

  const data = await req.json().catch(() => null);
  const plan: "pro" | "team" = data?.plan === "team" ? "team" : "pro";
  const price = priceIdForPlan(plan);
  if (!price) {
    return NextResponse.json(
      { error: `No Stripe price configured for the ${plan} plan.` },
      { status: 503 },
    );
  }

  const origin = process.env.APP_ORIGIN?.trim() || req.nextUrl.origin;
  try {
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price, quantity: 1 }],
      customer_email: email,
      client_reference_id: email,
      metadata: { email, plan },
      subscription_data: { metadata: { email, plan } },
      allow_promotion_codes: true,
      success_url: `${origin}/dashboard?upgraded=1`,
      cancel_url: `${origin}/dashboard?canceled=1`,
    });
    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("Stripe checkout failed:", err);
    return NextResponse.json({ error: "Couldn't start checkout." }, { status: 502 });
  }
}
