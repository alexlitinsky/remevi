import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const user = await currentUser();
    if (!user?.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }
    
    // Extract deck ID from URL
    const url = new URL(req.url);
    const pathParts = url.pathname.split('/');
    const deckId = pathParts[3]; // Index 3 contains the deck ID

    // Validate deck exists and user has access
    const deck = await db.deck.findFirst({
      where: {
        id: deckId,
        userId: user.id,
      },
      include: {
        deckContent: {
          include: {
            studyContent: {
              include: {
                mcqContent: true,
                frqContent: true,
              },
            },
          },
        },
      },
    });

    if (!deck) {
      return new NextResponse("Deck not found", { status: 404 });
    }

    // Count questions by type
    const mcqCount = deck.deckContent.filter(content => 
      content.studyContent.mcqContent !== null
    ).length;

    const frqCount = deck.deckContent.filter(content => 
      content.studyContent.frqContent !== null
    ).length;

    const totalCount = mcqCount + frqCount;
    console.log('[available-questions] Deck stats:', {
      deckId,
      userId: user.id,
      mcqCount,
      frqCount,
      totalCount
    });

    return NextResponse.json({
      mcq: mcqCount,
      frq: frqCount,
      total: totalCount
    });
  } catch (error) {
    console.error("Error getting available questions:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
} 