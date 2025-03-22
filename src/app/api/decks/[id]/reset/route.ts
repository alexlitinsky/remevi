import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { db } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const user = await currentUser();
    if (!user?.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }
    
    const url = new URL(req.url);
    const pathParts = url.pathname.split('/');
    const deckId = pathParts[pathParts.length - 2]; // Account for 'reset' at the end
    
    if (!deckId) {
      return new NextResponse("Missing deck ID", { status: 400 });
    }
    
    // Verify the deck exists and belongs to the user
    const deck = await db.deck.findUnique({
      where: {
        id: deckId,
        userId: user.id
      }
    });
    
    if (!deck) {
      return new NextResponse("Deck not found", { status: 404 });
    }
    
    // Update all card interactions for this deck to be due now
    // but preserve SRS data (easeFactor, interval, repetitions)
    await db.cardInteraction.updateMany({
      where: {
        userId: user.id,
        studyContent: {
          deckContent: {
            some: {
              deckId: deckId
            }
          }
        }
      },
      data: {
        dueDate: new Date(), // Mark all cards as due now
        lastReviewed: new Date() // Update last review time
      }
    });
    
    return NextResponse.json({
      success: true,
      message: "Deck progress has been reset successfully"
    });
  } catch (error) {
    console.error("Error resetting deck progress:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
