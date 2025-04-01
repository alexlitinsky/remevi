import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { db } from "@/lib/db";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await currentUser();
    if (!user?.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }
    const awaitedParams = await params;

    // Validate deck exists and user has access
    const deck = await db.deck.findFirst({
      where: {
        id: awaitedParams.id,
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