import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { db } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const user = await currentUser();
    if (!user?.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    // Extract the deck ID from the URL path
    const url = new URL(req.url);
    const pathParts = url.pathname.split('/');
    const deckId = pathParts[3]; // /api/decks/[id]/session/start

    if (!deckId) {
      return new NextResponse("Missing deck ID", { status: 400 });
    }

    // Create a new study session
    const session = await db.studySession.create({
      data: {
        userId: user.id,
        deckId: deckId,
        startTime: new Date(),
        cardsStudied: 0,
        pointsEarned: 0
      }
    });

    return NextResponse.json(session);
  } catch (error) {
    console.error("Error starting study session:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
} 