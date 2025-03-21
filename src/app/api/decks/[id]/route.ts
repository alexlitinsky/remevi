import { NextRequest, NextResponse } from "next/server"
import { currentUser } from "@clerk/nextjs/server"
import { db } from "@/lib/db"

export async function GET(req: NextRequest) {
  try {
    const user = await currentUser()
    if (!user?.id) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    // Extract the ID from the URL path
    const url = new URL(req.url)
    const pathParts = url.pathname.split('/')
    const id = pathParts[pathParts.length - 1]

    if (!id) {
      return new NextResponse("Missing deck ID", { status: 400 })
    }

    const deck = await db.deck.findUnique({
      where: {
        id,
        userId: user.id
      },
      include: {
        deckContent: {
          include: {
            studyContent: {
              include: {
                flashcardContent: true
              }
            }
          }
        }
      }
    })

    if (!deck) {
      return new NextResponse("Deck not found", { status: 404 })
    }

    // Transform the deck to match the expected format in the frontend
    const mindMapData = deck.mindMap || { nodes: [], connections: [] };
    
    // Extract flashcards from the deck content
    const flashcards = deck.deckContent
      .filter((content: any) => 
        content.studyContent.type === 'flashcard' && 
        content.studyContent.flashcardContent
      )
      .map((content: any) => ({
        id: content.studyContent.id,
        front: content.studyContent.flashcardContent.front,
        back: content.studyContent.flashcardContent.back
      }));

    const formattedDeck = {
      id: deck.id,
      title: deck.title,
      createdAt: deck.createdAt,
      isProcessing: deck.isProcessing,
      error: null,
      flashcards,
      mindMap: mindMapData
    };

    return NextResponse.json(formattedDeck)
  } catch (error) {
    console.error("Error fetching deck:", error)
    return new NextResponse("Internal Server Error", { status: 500 })
  }
}