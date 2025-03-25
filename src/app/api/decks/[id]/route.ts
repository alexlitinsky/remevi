import { NextRequest, NextResponse } from "next/server"
import { currentUser } from "@clerk/nextjs/server"
import { db } from "@/lib/db"

interface DeckContentItem {
  studyContent: {
    id: string;
    createdAt: Date;
    updatedAt: Date;
    studyMaterialId: string;
    type: string;
    difficultyLevel: string;
    shared: boolean;
    flashcardContent: {
      id: string;
      studyContentId: string;
      front: string;
      back: string;
    } | null;
  };
}

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

    // Get the deck with its content and study sessions
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
        },
        tags: true,
        studySessions: {
          orderBy: {
            startTime: 'desc'
          },
          take: 30 // Get last 30 days of sessions
        }
      }
    })

    if (!deck) {
      return new NextResponse("Deck not found", { status: 404 })
    }

    // Calculate study streak
    const sessions = deck.studySessions
    let currentStreak = 0
    const lastStudyDate = sessions[0]?.startTime

    if (lastStudyDate) {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      
      const yesterday = new Date(today)
      yesterday.setDate(yesterday.getDate() - 1)

      // Check if studied today
      const studiedToday = sessions.some(session => {
        const sessionDate = new Date(session.startTime)
        sessionDate.setHours(0, 0, 0, 0)
        return sessionDate.getTime() === today.getTime()
      })

      if (studiedToday) {
        currentStreak = 1
        // Count backwards from yesterday
        const checkDate = yesterday
        for (let i = 1; i < sessions.length; i++) {
          const sessionDate = new Date(sessions[i].startTime)
          sessionDate.setHours(0, 0, 0, 0)
          
          if (sessionDate.getTime() === checkDate.getTime()) {
            currentStreak++
            checkDate.setDate(checkDate.getDate() - 1)
          } else {
            break
          }
        }
      } else {
        // Check if studied yesterday and count backwards
        const checkDate = yesterday
        for (const session of sessions) {
          const sessionDate = new Date(session.startTime)
          sessionDate.setHours(0, 0, 0, 0)
          
          if (sessionDate.getTime() === checkDate.getTime()) {
            currentStreak++
            checkDate.setDate(checkDate.getDate() - 1)
          } else {
            break
          }
        }
      }
    }

    // Transform the deck to match the expected format in the frontend
    const mindMapData = deck.mindMap || { nodes: [], connections: [] }
    
    // Extract flashcards from the deck content
    const flashcards = deck.deckContent
      .filter((content: DeckContentItem) => 
        content.studyContent.type === 'flashcard' && 
        content.studyContent.flashcardContent
      )
      .map((content: DeckContentItem) => ({
        id: content.studyContent.id,
        front: content.studyContent.flashcardContent!.front,
        back: content.studyContent.flashcardContent!.back
      }))

    const formattedDeck = {
      id: deck.id,
      title: deck.title,
      category: deck.category || "Uncategorized",
      tags: deck.tags.map(tag => tag.name),
      createdAt: deck.createdAt,
      isProcessing: deck.isProcessing,
      error: deck.error || null,
      flashcards,
      mindMap: mindMapData,
      studyStreak: currentStreak,
      lastStudied: lastStudyDate
    }

    return NextResponse.json(formattedDeck)
  } catch (error) {
    console.error("Error fetching deck:", error)
    return new NextResponse("Internal Server Error", { status: 500 })
  }
}