import { NextResponse } from "next/server"
import { currentUser } from "@clerk/nextjs/server"
import { db } from "@/lib/db"

// GET /api/decks - Get all decks for the current user
export async function GET() {
  try {
    const user = await currentUser()
    if (!user?.id) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    const decks = await db.deck.findMany({
      where: {
        userId: user.id
      },
      orderBy: {
        createdAt: 'desc'
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

    // Transform the data to match the expected format in the frontend
    const formattedDecks = decks.map(deck => {
      // Count the number of flashcards in the deck
      const flashcardCount = deck.deckContent.filter(
        (content: { studyContent: { type: string; flashcardContent: any } }) => 
          content.studyContent.type === 'flashcard' && content.studyContent.flashcardContent
      ).length;

      return {
        id: deck.id,
        title: deck.title,
        createdAt: deck.createdAt,
        isProcessing: false,
        flashcardCount
      };
    });

    return NextResponse.json(formattedDecks)
  } catch (error) {
    console.error("Error fetching decks:", error)
    return new NextResponse("Internal Server Error", { status: 500 })
  }
}

// We'll need to update the POST endpoint as well, but it's not being used directly
// in the current flow since we're using the /api/generate endpoint instead
export async function POST(req: Request) {
  try {
    const user = await currentUser()
    if (!user?.id) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    const { title, description } = await req.json()

    const deck = await db.deck.create({
      data: {
        userId: user.id,
        title,
        description
      }
    })

    return NextResponse.json(deck)
  } catch (error) {
    console.error("Error creating deck:", error)
    return new NextResponse("Internal Server Error", { status: 500 })
  }
}
