import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { isCardDue } from "@/lib/srs";

interface Card {
  id: string;
  front: string;
  back: string;
  isNew: boolean;
  isDue: boolean;
  dueDate?: Date;
  easeFactor?: number;
  interval?: number;
  repetitions?: number;
}

export async function GET(req: NextRequest) {
  try {
    const user = await currentUser();
    if (!user?.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }
    const url = new URL(req.url)
    const pathParts = url.pathname.split('/')
    const deckId = pathParts[pathParts.length - 2]

    // Get the deck
    const deck = await db.deck.findUnique({
      where: { id: deckId },
      include: {
        deckContent: {
          include: {
            studyContent: {
              include: {
                flashcardContent: true,
                cardInteractions: {
                  where: {
                    userId: user.id
                  }
                }
              }
            }
          }
        }
      }
    });
    
    if (!deck) {
      return new NextResponse("Deck not found", { status: 404 });
    }
    
    // Identify new and due cards
    const newCards: Card[] = [];
    const dueCards: Card[] = [];
    
    // Process each deck content item
    deck.deckContent.forEach((content: any) => {
      const studyContent = content.studyContent;
      
      // Only process flashcard content for now
      if (studyContent.type === 'flashcard' && studyContent.flashcardContent) {
        const flashcard = studyContent.flashcardContent;
        const interaction = studyContent.cardInteractions[0]; // Get the first interaction if it exists
        
        if (!interaction) {
          // New card (never seen before)
          newCards.push({
            id: studyContent.id,
            front: flashcard.front,
            back: flashcard.back,
            isNew: true,
            isDue: true,
          });
        } else if (isCardDue(new Date(interaction.dueDate))) {
          // Due card
          dueCards.push({
            id: studyContent.id,
            front: flashcard.front,
            back: flashcard.back,
            isNew: false,
            isDue: true,
            dueDate: interaction.dueDate,
            easeFactor: interaction.easeFactor,
            interval: interaction.interval,
            repetitions: interaction.repetitions
          });
        }
      }
    });
    
    // Get user preferences (create default if not exists)
    const userPrefs = await db.userPreferences.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        newCardsPerDay: 15,
        reviewsPerDay: 20
      },
      update: {}
    });
    
    // Apply limits from user preferences
    const limitedNewCards = newCards.slice(0, userPrefs.newCardsPerDay);
    const limitedDueCards = dueCards
      .sort((a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime())
      .slice(0, userPrefs.reviewsPerDay);
    
    // Combine new and due cards
    const cardsToStudy = [...limitedNewCards, ...limitedDueCards];

    return NextResponse.json({
      deckId: deckId,
      deckTitle: deck.title,
      totalCardCount: deck.deckContent.length,
      newCardCount: newCards.length,
      limitedNewCardCount: limitedNewCards.length,
      dueCardCount: dueCards.length,
      limitedDueCardCount: limitedDueCards.length,
      cards: cardsToStudy
    });
  } catch (error) {
    console.error("Error fetching due cards:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
