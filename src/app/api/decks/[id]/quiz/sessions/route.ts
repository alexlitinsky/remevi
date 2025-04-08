import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const user = await currentUser();
    if (!user?.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    // Extract deckId from URL
    const url = new URL(req.url);
    const pathParts = url.pathname.split('/');
    const deckId = pathParts[3]; // The ID will be at index 3 for /api/decks/[id]/...

    // Validate deck exists and user has access
    const deck = await db.deck.findFirst({
      where: {
        id: deckId,
        userId: user.id,
      },
    });

    if (!deck) {
      return new NextResponse("Deck not found", { status: 404 });
    }

    // Get all quiz sessions for this deck
    const sessions = await db.quizSession.findMany({
      where: {
        userId: user.id,
        deckId: deckId,
      },
      orderBy: [
        { startTime: 'desc' }
      ],
    });

    console.log(`[quiz/sessions] Found ${sessions.length} sessions for deck: ${deckId}`);

    return NextResponse.json({
      sessions: sessions,
    });
  } catch (error) {
    console.error("Error getting quiz sessions:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
} 