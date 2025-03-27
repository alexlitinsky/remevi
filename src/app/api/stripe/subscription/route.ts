import { NextRequest, NextResponse } from "next/server";
import { getUserSubscriptionStatus } from "@/lib/stripe";

export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get("userId");
  
  if (!userId) {
    return NextResponse.json({ error: "Missing userId" }, { status: 400 });
  }

  try {
    const subscription = await getUserSubscriptionStatus(userId);
    return NextResponse.json(subscription);
  } catch (error) {
    console.error("Error fetching subscription:", error);
    return NextResponse.json(
      { error: "Failed to fetch subscription status" },
      { status: 500 }
    );
  }
} 