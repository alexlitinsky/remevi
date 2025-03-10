import { NextResponse } from "next/server"
import { currentUser } from "@clerk/nextjs/server"
import { db } from "@/lib/db"

// GET /api/study-decks - Get all study decks for the current user
export async function GET() {
  try {
    const user = await currentUser()
    if (!user?.id) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    const studyDecks = await db.studyDeck.findMany({
      where: {
        userId: user.id
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    return NextResponse.json(studyDecks)
  } catch (error) {
    console.error("Error fetching study decks:", error)
    return new NextResponse("Internal Server Error", { status: 500 })
  }
}

// POST /api/study-decks - Create a new study deck
export async function POST(req: Request) {
  try {
    const user = await currentUser()
    if (!user?.id) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    const { title, flashcards, mindMap } = await req.json()

    const studyDeck = await db.studyDeck.create({
      data: {
        userId: user.id,
        title,
        flashcards: JSON.stringify(flashcards),
        mindMap: JSON.stringify(mindMap)
      }
    })

    return NextResponse.json(studyDeck)
  } catch (error) {
    console.error("Error creating study deck:", error)
    return new NextResponse("Internal Server Error", { status: 500 })
  }
} 
