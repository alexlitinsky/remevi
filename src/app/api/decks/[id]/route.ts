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

    // Get user progress for streak
    const userProgress = await db.userProgress.findUnique({
      where: {
        userId: user.id
      }
    })

    if (userProgress) {
      currentStreak = userProgress.streak || 0
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
      isProcessing: deck.isProcessing && flashcards.length === 0,
      error: deck.error || null,
      flashcards,
      mindMap: mindMapData,
      studyStreak: currentStreak,
      lastStudied: sessions[0]?.startTime
    }

    return NextResponse.json(formattedDeck)
  } catch (error) {
    console.error("Error fetching deck:", error)
    return new NextResponse("Internal Server Error", { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await currentUser();
    if (!user?.id) {
      return new Response('Unauthorized', { status: 401 });
    }

    const { id } = await params;

    // Check if deck exists and belongs to user
    const deckCheck = await db.deck.findUnique({
      where: { 
        id,
        userId: user.id
      },
      select: { id: true }
    });

    if (!deckCheck) {
      return new Response('Deck not found or unauthorized', { status: 404 });
    }

    // Get the deck with its content
    const deck = await db.deck.findUnique({
      where: { id },
      include: {
        deckContent: {
          include: {
            studyContent: {
              include: {
                studyMaterial: true,
                QuizAnswer: true
              }
            }
          }
        }
      }
    });

    if (!deck) {
      return new Response('Deck not found', { status: 404 });
    }

    if (deck.userId !== user.id) {
      return new Response('Unauthorized', { status: 401 });
    }

    // Delete everything in a transaction
    await db.$transaction(async (tx) => {
      // Get all study sessions and accumulate stats before deletion
      const studySessions = await tx.studySession.findMany({
        where: { deckId: id }
      });

      // Accumulate study stats
      if (studySessions.length > 0) {
        const totalPoints = studySessions.reduce((sum, session) => sum + (session.pointsEarned || 0), 0);
        const totalTimeNumber = studySessions.reduce((sum, session) => sum + (session.totalTime || 0), 0);
        
        // Update user progress with accumulated stats
        await tx.userProgress.upsert({
          where: { userId: user.id },
          create: {
            userId: user.id,
            points: totalPoints,
            totalStudyTime: totalTimeNumber,
            streak: 0
          },
          update: {
            points: { increment: totalPoints },
            totalStudyTime: { increment: totalTimeNumber }
          }
        });
      }

      // First delete all quiz answers
      for (const content of deck.deckContent) {
        if (content.studyContent.QuizAnswer.length > 0) {
          await tx.quizAnswer.deleteMany({
            where: { studyContentId: content.studyContentId }
          });
        }
      }

      // Delete deck content
      await tx.deckContent.deleteMany({
        where: { deckId: id }
      });

      // Get unique study materials
      const studyMaterialIds = [...new Set(deck.deckContent.map(content => 
        content.studyContent.studyMaterial?.id
      ).filter(Boolean))];

      // Check and delete study materials if not used by other decks
      for (const studyMaterialId of studyMaterialIds) {
        // Check if study material is used by other decks
        const otherDecks = await tx.deckContent.findFirst({
          where: {
            studyContent: {
              studyMaterialId
            },
            deckId: {
              not: id
            }
          }
        });

        // If not used by other decks, delete the study material
        if (!otherDecks && studyMaterialId) {
          // Delete associated study content first
          await tx.studyContent.deleteMany({
            where: { studyMaterialId }
          });

          // Then delete the study material
          await tx.studyMaterial.delete({
            where: { id: studyMaterialId }
          });
        }
      }

      // Delete study sessions after preserving their stats
      await tx.studySession.deleteMany({
        where: { deckId: id }
      });

      // Finally delete the deck
      await tx.deck.delete({
        where: { id }
      });
    });

    return new Response('Deck deleted successfully', { status: 200 });
  } catch (error) {
    console.error('Error deleting deck:', error);
    return new Response('Error deleting deck', { status: 500 });
  }
}