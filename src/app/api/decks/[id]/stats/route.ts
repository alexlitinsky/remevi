import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const user = await currentUser();
    if (!user?.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }
    
    const url = new URL(req.url);
    const pathParts = url.pathname.split('/');
    const deckId = pathParts[pathParts.length - 2]; // Account for 'stats' at the end
    
    if (!deckId) {
      return new NextResponse("Missing deck ID", { status: 400 });
    }
    
    // Get the deck with its content and interactions
    const deck = await db.deck.findUnique({
      where: {
        id: deckId,
        userId: user.id
      },
      include: {
        deckContent: {
          include: {
            studyContent: {
              include: {
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
    
    // Calculate statistics
    const totalCards = deck.deckContent.length;
    const cardsWithProgress = deck.deckContent.filter(content => 
      content.studyContent.cardInteractions.length > 0
    ).length;
    const newCards = totalCards - cardsWithProgress;
    
    // Calculate cards due today
    const today = new Date();
    today.setHours(23, 59, 59, 999); // End of today
    
    const dueCards = deck.deckContent.filter(content => {
      const interaction = content.studyContent.cardInteractions[0];
      return interaction && new Date(interaction.dueDate) <= today;
    }).length;
    
    // Calculate averages and totals
    let totalStreak = 0;
    let totalEaseFactor = 0;
    let totalResponseTime = 0;
    let countWithResponseTime = 0;
    let totalPoints = 0;
    
    deck.deckContent.forEach(content => {
      const interaction = content.studyContent.cardInteractions[0];
      if (interaction) {
        totalStreak += interaction.streak;
        totalEaseFactor += interaction.easeFactor;
        totalPoints += interaction.score;
        
        if (interaction.responseTime) {
          totalResponseTime += interaction.responseTime;
          countWithResponseTime++;
        }
      }
    });
    
    const averageStreak = cardsWithProgress > 0 ? totalStreak / cardsWithProgress : 0;
    const averageEaseFactor = cardsWithProgress > 0 ? totalEaseFactor / cardsWithProgress : 2.5;
    const averageResponseTime = countWithResponseTime > 0 ? totalResponseTime / countWithResponseTime : 0;
    
    // Calculate review history (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const reviewHistory = deck.deckContent.flatMap(content => 
      content.studyContent.cardInteractions
        .filter(interaction => interaction.lastReviewed && new Date(interaction.lastReviewed) >= thirtyDaysAgo)
        .map(interaction => ({
          date: interaction.lastReviewed,
          difficulty: interaction.difficulty
        }))
    );
    
    // Group reviews by date
    interface ReviewsByDateEntry {
      total: number;
      easy: number;
      medium: number;
      hard: number;
      [key: string]: number;
    }
    
    const reviewsByDate: Record<string, ReviewsByDateEntry> = {};
    
    reviewHistory.forEach(review => {
      if (!review.date) return;
      
      const date = new Date(review.date).toISOString().split('T')[0];
      if (!reviewsByDate[date]) {
        reviewsByDate[date] = { total: 0, easy: 0, medium: 0, hard: 0 };
      }
      reviewsByDate[date].total++;
      
      const difficulty = review.difficulty || 'medium';
      if (difficulty === 'easy' || difficulty === 'medium' || difficulty === 'hard') {
        reviewsByDate[date][difficulty]++;
      }
    });
    
    return NextResponse.json({
      deckId,
      deckTitle: deck.title,
      totalCards,
      cardsWithProgress,
      newCards,
      dueCards,
      averageStreak,
      averageEaseFactor,
      averageResponseTime,
      totalPoints,
      reviewsByDate
    });
  } catch (error) {
    console.error("Error fetching deck statistics:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
