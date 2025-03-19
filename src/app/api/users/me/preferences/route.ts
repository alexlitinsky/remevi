import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const user = await currentUser();
    if (!user?.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }
    
    // Get or create user preferences
    const preferences = await db.userPreferences.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        newCardsPerDay: 5,
        reviewsPerDay: 20
      },
      update: {}
    });
    
    return NextResponse.json(preferences);
  } catch (error) {
    console.error("Error fetching preferences:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const user = await currentUser();
    if (!user?.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }
    
    const { newCardsPerDay, reviewsPerDay } = await req.json();
    
    const preferences = await db.userPreferences.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        newCardsPerDay,
        reviewsPerDay
      },
      update: {
        newCardsPerDay,
        reviewsPerDay
      }
    });
    
    return NextResponse.json(preferences);
  } catch (error) {
    console.error("Error updating preferences:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
