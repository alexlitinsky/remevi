import { NextResponse } from "next/server"
import { currentUser } from "@clerk/nextjs/server"
import { db } from "@/lib/db"
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'
import { isCardDue } from "@/lib/srs"

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(20, '1 m'), // 20 requests per minute
  analytics: true,
})

// GET /api/decks - Get all decks for the current user
export async function GET() {
  try {
    const user = await currentUser()
    if (!user?.id) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    // Rate limiting
    const { success } = await ratelimit.limit(user.id)
    if (!success) {
      return new NextResponse("Too Many Requests", { status: 429 })
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
                cardInteractions: {
                  where: {
                    userId: user.id
                  },
                  orderBy: {
                    lastReviewed: 'desc'
                  }
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

    const decksWithStats = decks.map(deck => {
      let flashcardCount = 0;
      let dueCards = 0;
      const masteryLevels = {
        mastered: 0,
        learning: 0,
        struggling: 0,
        new: 0
      };

      deck.deckContent.forEach(content => {
        if (content.studyContent.type === 'flashcard') {
          flashcardCount++;
          const interaction = content.studyContent.cardInteractions[0];

          if (interaction) {
            // Count mastery levels
            masteryLevels[interaction.masteryLevel as keyof typeof masteryLevels]++;

            // Check if card is due
            if (interaction.dueDate && isCardDue(interaction.dueDate)) {
              dueCards++;
            }
          } else {
            masteryLevels.new++;
          }
        }
      });

      // Calculate weighted progress based on mastery levels
      const totalProgress = flashcardCount > 0 
        ? Math.round(
            ((masteryLevels.mastered * 100) + 
             (masteryLevels.learning * 66) + 
             (masteryLevels.struggling * 33)) / flashcardCount
          )
        : 0;

      const lastStudied = deck.deckContent
        .flatMap(content => content.studyContent.cardInteractions)
        .filter(interaction => interaction?.lastReviewed)
        .sort((a, b) => {
          if (!a.lastReviewed || !b.lastReviewed) return 0;
          return b.lastReviewed.getTime() - a.lastReviewed.getTime();
        })[0]?.lastReviewed;

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
        tags: deck.tags?.map(tag => tag.name) || []
      }
    })

    return NextResponse.json(decksWithStats)
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

    // Rate limiting
    const { success } = await ratelimit.limit(user.id)
    if (!success) {
      return new NextResponse("Too Many Requests", { status: 429 })
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
