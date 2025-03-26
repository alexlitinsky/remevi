import { currentUser } from "@clerk/nextjs/server";
import { kv } from "@vercel/kv";
import { stripe } from "@/lib/stripe";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const user = await currentUser();
  if (!user) return new Response("Unauthorized", { status: 401 });
  const url = new URL(req.url);

  const stripeCustomerId = await kv.get<string>(`stripe:user:${user.id}`);
  if (!stripeCustomerId) return new Response("No subscription found", { status: 404 });

  const session = await stripe.billingPortal.sessions.create({
    customer: stripeCustomerId,
    return_url: `${url.origin}/dashboard`,
  });

  return NextResponse.json({ url: session.url });
}