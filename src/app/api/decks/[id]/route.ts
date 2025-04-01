import { NextRequest, NextResponse } from "next/server"
import { currentUser } from "@clerk/nextjs/server"
import { db } from "@/lib/db"
import { getFileFromStorage, deleteFileFromStorage } from "@/lib/storage"

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

    const { id } = params;

    // Check if deck exists and belongs to user before proceeding
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

    // First, delete all card interactions
    try {
      await db.cardInteraction.deleteMany({
        where: {
          studyContent: {
            deckContent: {
              some: {
                deckId: id
              }
            }
          }
        }
      });
    } catch (error) {
      console.error('Error deleting card interactions:', error);
      // Continue even if this fails
    }

    // Delete all study sessions
    try {
      await db.studySession.deleteMany({
        where: {
          deckId: id
        }
      });
    } catch (error) {
      console.error('Error deleting study sessions:', error);
      // Continue even if this fails
    }

    // Get the deck with its content
    let deck;
    try {
      deck = await db.deck.findUnique({
        where: { id },
        include: {
          deckContent: {
            include: {
              studyContent: {
                include: {
                  flashcardContent: true,
                  studyMaterial: true
                }
              }
            }
          }
        }
      });
    } catch (error) {
      console.error('Error fetching deck for deletion:', error);
      return new Response('Error fetching deck details', { status: 500 });
    }

    if (!deck) {
      return new Response('Deck not found', { status: 404 });
    }

    if (deck.userId !== user.id) {
      return new Response('Unauthorized', { status: 403 });
    }

    // Begin transaction to delete remaining content
    try {
      await db.$transaction(async (tx) => {
        // Delete all related content in a more efficient order
        // We'll use a simpler approach to avoid relation filter complexities
        
        // Delete all flashcard content first
        for (const content of deck.deckContent) {
          if (content.studyContent?.flashcardContent) {
            try {
              await tx.flashcardContent.delete({
                where: { id: content.studyContent.flashcardContent.id }
              });
            } catch (error) {
              console.error('Failed to delete flashcard content:', error);
              // Continue with deletion even if flashcard content deletion fails
            }
          }
        }

        // Handle file storage for study materials
        for (const content of deck.deckContent) {
          if (content.studyContent?.studyMaterial) {
            const studyMaterial = content.studyContent.studyMaterial;
            
            // Delete file from storage if it exists
            if (studyMaterial.fileUrl) {
              try {
                await deleteFileFromStorage(studyMaterial.fileUrl);
              } catch (error) {
                console.error('Failed to delete file from storage:', error);
                // Continue with deletion even if file removal fails
              }
            }
            
            // Delete the study material
            try {
              await tx.studyMaterial.delete({
                where: { id: studyMaterial.id }
              });
            } catch (error) {
              console.error('Failed to delete study material:', error);
              // Continue with deletion even if deletion fails
            }
          }
        }
        
        // Now delete study content
        for (const content of deck.deckContent) {
          if (content.studyContent) {
            try {
              await tx.studyContent.delete({
                where: { id: content.studyContent.id }
              });
            } catch (error) {
              console.error('Failed to delete study content:', error);
              // Continue with deletion even if study content deletion fails
            }
          }
        }

        // Delete deck content
        try {
          await tx.deckContent.deleteMany({
            where: { deckId: deck.id }
          });
        } catch (error) {
          console.error('Failed to delete deck content:', error);
          // Continue with deletion even if deck content deletion fails
        }

        // Finally, delete the deck itself
        try {
          await tx.deck.delete({
            where: { id: deck.id }
          });
        } catch (error) {
          console.error('Failed to delete deck:', error);
          throw error; // Re-throw this error as deleting the deck is crucial
        }
      }, {
        timeout: 30000, // Increase timeout to 30 seconds
        maxWait: 10000, // Maximum time to wait for a transaction slot
        isolationLevel: 'ReadCommitted' // Less strict isolation for better performance
      });
    } catch (error) {
      console.error('Transaction failed during deck deletion:', error);
      return new Response('Failed to delete some deck components', { status: 500 });
    }

    return new Response('Deck deleted successfully', { status: 200 });
  } catch (error) {
    console.error('Error deleting deck:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}