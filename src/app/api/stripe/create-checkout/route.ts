import { currentUser } from "@clerk/nextjs/server";
import { kv } from "@vercel/kv";
import { stripe, STRIPE_PRICE_IDS } from "@/lib/stripe";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  try {
    const user = await currentUser();

    if (!user) {
      return new Response("Unauthorized", { status: 401 });
    }

    const url = new URL(req.url);
    const priceId = url.searchParams.get("priceId");
    const returnUrl = url.searchParams.get("returnUrl") || url.origin;


    if (!priceId || ![STRIPE_PRICE_IDS.MONTHLY, STRIPE_PRICE_IDS.ANNUAL].includes(priceId)) {
      return new Response("Invalid price ID", { status: 400 });
    }

    // Get the stripeCustomerId from your KV store
    let stripeCustomerId = await kv.get(`stripe:user:${user.id}`);


    // Create a new Stripe customer if this user doesn't have one
    if (!stripeCustomerId) {
      const newCustomer = await stripe.customers.create({
        email: user.emailAddresses[0]?.emailAddress || "",
        metadata: {
          userId: user.id,
        },
      });

      // Store the relation between userId and stripeCustomerId in your KV
      await kv.set(`stripe:user:${user.id}`, newCustomer.id);
      stripeCustomerId = newCustomer.id;
    }

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: stripeCustomerId as string,
      success_url: `${returnUrl}?checkout=success`,
      cancel_url: `${returnUrl}?checkout=cancelled`,
      mode: "subscription",
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      allow_promotion_codes: true,
      subscription_data: {
        metadata: {
          userId: user.id,
        },
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Detailed error in checkout:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Unknown error",
        details: error 
      }), 
      { status: 500 }
    );
  }
}