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

    // Get the study deck
    const studyDeck = await db.studyDeck.findUnique({
      where: { id: deckId }
    });
    
    if (!studyDeck) {
      return new NextResponse("Study deck not found", { status: 404 });
    }
    
    // Parse flashcards from JSON if it's a string, otherwise use as is
    const flashcardsData = typeof studyDeck.flashcards === 'string' 
      ? JSON.parse(studyDeck.flashcards) 
      : studyDeck.flashcards;
    
    
    const cardProgress = await db.cardProgress.findMany({
      where: {
        userId: user.id,
        deckId: deckId,
      }
    });


    // Create a map for quick lookups
    const progressMap = new Map();
    cardProgress.forEach(progress => {
      progressMap.set(progress.cardId, progress);
    });
    
    // Identify new and due cards
    const newCards: Card[] = [];
    const dueCards: Card[] = [];
    
    flashcardsData.forEach((card: Card) => {
      // Make sure card has an ID
      const cardWithId = {
        ...card,
        id: card.id || `card-${Math.random().toString(36).substring(2, 9)}`
      };

      const progress = progressMap.get(cardWithId.id);
      
      if (!progress) {
        // New card (never seen before)
        newCards.push({
          ...cardWithId,
          isNew: true,
          isDue: true,
        });
      } else if (isCardDue(new Date(progress.dueDate))) {
        // Due card
        dueCards.push({
          ...cardWithId,
          isNew: false,
          isDue: true,
          dueDate: progress.dueDate,
          easeFactor: progress.easeFactor,
          interval: progress.interval,
          repetitions: progress.repetitions
        });
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
      deckTitle: studyDeck.title,
      totalCardCount: flashcardsData.length,
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
