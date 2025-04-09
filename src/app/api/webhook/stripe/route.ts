import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { stripe, syncStripeDataToKV } from "@/lib/stripe";
import type Stripe from "stripe";

// List of events we want to handle
const allowedEvents: Stripe.Event["type"][] = [
  "checkout.session.completed",
  "customer.subscription.created",
  "customer.subscription.updated",
  "customer.subscription.deleted",
  "customer.subscription.paused",
  "customer.subscription.resumed",
  "customer.subscription.pending_update_applied",
  "customer.subscription.pending_update_expired",
  "customer.subscription.trial_will_end",
  "invoice.paid",
  "invoice.payment_failed",
  "invoice.payment_action_required",
  "invoice.upcoming",
  "invoice.marked_uncollectible",
  "invoice.payment_succeeded",
  "payment_intent.succeeded",
  "payment_intent.payment_failed",
  "payment_intent.canceled",
];

export async function POST(req: Request) {
  const body = await req.text();
  const signature = (await headers()).get("Stripe-Signature");

  if (!signature || !process.env.STRIPE_WEBHOOK_SECRET) {
    return new Response("Missing signature or webhook secret", { status: 400 });
  }

  try {
    const event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );

    if (!allowedEvents.includes(event.type)) {
      return NextResponse.json({ received: true });
    }

    const { customer: customerId } = event.data.object as {
      customer?: string;
    };

    if (typeof customerId !== "string") {
      throw new Error(
        `[STRIPE HOOK] Customer ID not found or invalid. Event type: ${event.type}`
      );
    }

    await syncStripeDataToKV(customerId);

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("[STRIPE HOOK] Error:", error);
    return new Response(
      "Webhook error: " + (error instanceof Error ? error.message : "Unknown error"),
      { status: 400 }
    );
  }
}
// ok this is a bit dif from theos implementation but it should work