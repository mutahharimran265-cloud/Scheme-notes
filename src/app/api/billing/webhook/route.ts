import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import { prisma } from "@/lib/prisma";
import { stripeClient } from "@/lib/stripe";
import { coercePlan } from "@/lib/plan";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST /api/billing/webhook — Stripe subscription lifecycle -> per-account plan.
// Point a Stripe webhook endpoint here and set STRIPE_WEBHOOK_SECRET.
export async function POST(req: NextRequest) {
  const stripe = stripeClient();
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!stripe || !secret) {
    return NextResponse.json({ error: "Billing webhook not configured." }, { status: 503 });
  }

  // Signature verification requires the exact raw body.
  const sig = req.headers.get("stripe-signature") ?? "";
  const raw = await req.text();
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(raw, sig, secret);
  } catch (err) {
    console.error("Stripe webhook signature check failed:", err);
    return NextResponse.json({ error: "Invalid signature." }, { status: 400 });
  }

  try {
    if (event.type === "checkout.session.completed") {
      const s = event.data.object as Stripe.Checkout.Session;
      const email = (s.metadata?.email || s.customer_email || s.client_reference_id || "")
        .toLowerCase();
      const plan = coercePlan(s.metadata?.plan);
      const customerId = typeof s.customer === "string" ? s.customer : null;
      const subscriptionId = typeof s.subscription === "string" ? s.subscription : null;
      if (email) {
        await prisma.account.upsert({
          where: { email },
          create: { email, plan, stripeCustomerId: customerId, stripeSubscriptionId: subscriptionId },
          update: {
            plan,
            stripeCustomerId: customerId ?? undefined,
            stripeSubscriptionId: subscriptionId ?? undefined,
          },
        });
      }
    } else if (
      event.type === "customer.subscription.updated" ||
      event.type === "customer.subscription.deleted"
    ) {
      const sub = event.data.object as Stripe.Subscription;
      const active =
        event.type === "customer.subscription.updated" &&
        (sub.status === "active" || sub.status === "trialing");
      const plan = active ? coercePlan(sub.metadata?.plan) : "free";
      const email = (sub.metadata?.email || "").toLowerCase();
      if (email) {
        await prisma.account.upsert({
          where: { email },
          create: { email, plan, stripeSubscriptionId: sub.id },
          update: { plan, stripeSubscriptionId: sub.id },
        });
      } else {
        await prisma.account.updateMany({
          where: { stripeSubscriptionId: sub.id },
          data: { plan },
        });
      }
    }
  } catch (err) {
    console.error("Stripe webhook handler error:", err);
    return NextResponse.json({ error: "Webhook handler error." }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
