import { kv } from "@vercel/kv";
import Stripe from "stripe";

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error("Missing STRIPE_SECRET_KEY");
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2025-02-24.acacia",
  typescript: true,
});

export type STRIPE_SUB_CACHE =
  | {
      subscriptionId: string;
      status: Stripe.Subscription.Status;
      priceId: string;
      currentPeriodStart: number;
      currentPeriodEnd: number;
      cancelAtPeriodEnd: boolean;
      paymentMethod: {
        brand: string | null;
        last4: string | null;
      } | null;
    }
  | {
      status: "none";
    };

// The contents of this function should probably be wrapped in a try/catch
export async function syncStripeDataToKV(customerId: string) {
  // Fetch latest subscription data from Stripe
  const subscriptions = await stripe.subscriptions.list({
    customer: customerId,
    limit: 1,
    status: "all",
    expand: ["data.default_payment_method"],
  });

  if (subscriptions.data.length === 0) {
    const subData: STRIPE_SUB_CACHE = { status: "none" };
    await kv.set(`stripe:customer:${customerId}`, subData);
    return subData;
  }

  // If a user can have multiple subscriptions, that's your problem
  const subscription = subscriptions.data[0];

  // Store complete subscription state
  const subData: STRIPE_SUB_CACHE = {
    subscriptionId: subscription.id,
    status: subscription.status,
    priceId: subscription.items.data[0].price.id,
    currentPeriodEnd: subscription.current_period_end,
    currentPeriodStart: subscription.current_period_start,
    cancelAtPeriodEnd: subscription.cancel_at_period_end,
    paymentMethod:
      subscription.default_payment_method &&
      typeof subscription.default_payment_method !== "string"
        ? {
            brand: subscription.default_payment_method.card?.brand ?? null,
            last4: subscription.default_payment_method.card?.last4 ?? null,
          }
        : null,
  };

  // Store the data in your KV
  await kv.set(`stripe:customer:${customerId}`, subData);
  return subData;
}

export const STRIPE_PRICE_IDS = {
  MONTHLY: process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_MONTHLY,
  ANNUAL: process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_ANNUAL,
} as const;

export async function getUserSubscriptionStatus(userId: string) {
  const stripeCustomerId = await kv.get<string>(`stripe:user:${userId}`);
  if (!stripeCustomerId) return null;
  
  const subData = await kv.get<STRIPE_SUB_CACHE>(`stripe:customer:${stripeCustomerId}`);
  return subData;
}

export function isSubscribed(subData: STRIPE_SUB_CACHE | null) {
  if (!subData || subData.status === "none") return false;
  return ["active", "trialing"].includes(subData.status);
}