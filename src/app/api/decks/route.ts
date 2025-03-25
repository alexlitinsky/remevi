import { NextResponse } from "next/server"
import { currentUser } from "@clerk/nextjs/server"
import { db } from "@/lib/db"

interface DeckContent {
  studyContent: {
    id: string;
    type: string;
    flashcardContent: {
      id: string;
      studyContentId: string;
      front: string;
      back: string;
    } | null;
    cardInteractions: Array<{
      id: string;
      createdAt: Date;
      updatedAt: Date;
      dueDate: Date;
      easeFactor: number;
      interval: number;
      repetitions: number;
      masteryLevel: string;
    }>;
  };
}

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
                flashcardContent: true,
                cardInteractions: {
                  where: {
                    userId: user.id
                  },
                  orderBy: {
                    lastReviewed: 'desc'
                  },
                  take: 1
                }
              }
            }
          }
        },
        studySessions: {
          where: {
            userId: user.id
          },
          orderBy: {
            startTime: 'desc'
          },
          take: 1
        },
        tags: true
      }
    })

    // Transform the data to match the expected format in the frontend
    const formattedDecks = decks.map(deck => {
      // Count the number of flashcards in the deck
      const flashcardCount = deck.deckContent.filter(
        (content: DeckContent) => content.studyContent.type === 'flashcard' && content.studyContent.flashcardContent
      ).length

      // Calculate due cards
      const now = new Date()
      const dueCards = deck.deckContent.filter((content: DeckContent) => {
        const interaction = content.studyContent.cardInteractions[0]
        return interaction && new Date(interaction.dueDate) <= now
      }).length

      // Calculate mastery levels using the same logic as stats/route.ts
      const masteryLevels = {
        mastered: 0,
        learning: 0,
        struggling: 0,
        new: 0
      };

      let totalCards = 0;
      
      // Process each card's mastery level
      deck.deckContent.forEach(content => {
        totalCards++;
        const interaction = content.studyContent.cardInteractions[0];
        
        if (interaction) {
          // Use the interaction's masteryLevel directly
          masteryLevels[interaction.masteryLevel as keyof typeof masteryLevels]++;
        } else {
          masteryLevels.new++;
        }
      });

      // Calculate weighted mastery level exactly as in stats/route.ts
      const totalProgress = totalCards > 0 
        ? Math.round(((masteryLevels.mastered * 100) + 
                     (masteryLevels.learning * 66) + 
                     (masteryLevels.struggling * 33) + 
                     (masteryLevels.new * 0)) / totalCards)
        : 0;

      // Get last studied date from study sessions
      const lastStudied = deck.studySessions[0]?.startTime

      return {
        id: deck.id,
        title: deck.title,
        category: deck.category || "Uncategorized",
        flashcardCount,
        createdAt: deck.createdAt,
        isProcessing: deck.isProcessing,
        error: deck.error,
        lastStudied: lastStudied?.toISOString(),
        dueCards,
        totalProgress,
        tags: deck.tags.map(tag => tag.name)
      }
    })

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
