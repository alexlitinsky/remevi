import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { isCardDue } from "@/lib/srs";

export async function GET(req: NextRequest) {
  try {
    const user = await currentUser();
    if (!user?.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }
    
    const url = new URL(req.url);
    const pathParts = url.pathname.split('/');
    const id = pathParts[pathParts.length - 2]; // -2 because stats is the last part
    
    if (!id) {
      return new NextResponse("Missing deck ID", { status: 400 });
    }
    
    // Get current date for time-based queries
    const now = new Date();
    // Convert to user's local timezone
    const userTimezone = req.headers.get('x-user-timezone') || 'UTC';
    const userDate = new Date(now.toLocaleString('en-US', { timeZone: userTimezone }));
    userDate.setHours(0, 0, 0, 0);
    const startOfToday = userDate;
    const startOfWeek = new Date(userDate);
    startOfWeek.setDate(userDate.getDate() - userDate.getDay());
    
    // Get the deck with its content and interactions
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
            userId: user.id,
            startTime: {
              gte: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
            }
          },
          orderBy: {
            startTime: 'desc'
          }
        }
      }
    });
    
    if (!deck) {
      return new NextResponse("Deck not found", { status: 404 });
    }
    
    // Calculate study time statistics
    const studyTimeStats = {
      today: 0,
      week: 0,
      total: 0
    };
    
    const todaySessions = deck.studySessions.filter(session => 
      session.startTime >= startOfToday
    );
    const weekSessions = deck.studySessions.filter(session => 
      session.startTime >= startOfWeek
    );
    
    studyTimeStats.today = todaySessions.reduce((acc, session) => 
      acc + (session.totalTime || 0), 0) / 60 // Convert to minutes
    studyTimeStats.week = weekSessions.reduce((acc, session) => 
      acc + (session.totalTime || 0), 0) / 60
    studyTimeStats.total = deck.studySessions.reduce((acc, session) => 
      acc + (session.totalTime || 0), 0) / 60
    
    // Calculate mastery levels
    const masteryLevels = {
      mastered: 0,
      learning: 0,
      struggling: 0,
      new: 0
    };
    
    // Initialize review history for the last 7 days
    const reviewsByDate: Record<string, { total: number; easy: number; medium: number; hard: number }> = {};
    Array.from({ length: 7 }, (_, i) => {
      const date = new Date(userDate);
      date.setDate(date.getDate() - i);
      const formattedDate = date.toLocaleDateString('en-US', { timeZone: userTimezone });
      reviewsByDate[formattedDate] = { total: 0, easy: 0, medium: 0, hard: 0 };
      return formattedDate;
    }).reverse();
    
    let totalCards = 0;
    let flashcardCount = 0;
    let cardsWithProgress = 0;
    let totalResponseTime = 0;
    let responseTimeCount = 0;
    let totalEaseFactor = 0;
    let easeFactorCount = 0;
    let totalStreak = 0;
    let streakCount = 0;
    let totalPoints = 0;
    let dueCards = 0;
    let newCards = 0;
    
    // Process each card's data
    deck.deckContent.forEach(content => {
      totalCards++;
      
      // Count only flashcards
      if (content.studyContent.type === 'flashcard') {
        flashcardCount++;
        const interaction = content.studyContent.cardInteractions[0];
      
        if (interaction) {
          cardsWithProgress++;
          masteryLevels[interaction.masteryLevel as keyof typeof masteryLevels]++;
          
          if (interaction.responseTime) {
            totalResponseTime += interaction.responseTime;
            responseTimeCount++;
          }
          
          if (interaction.easeFactor) {
            totalEaseFactor += interaction.easeFactor;
            easeFactorCount++;
          }
          
          if (interaction.streak) {
            totalStreak += interaction.streak;
            streakCount++;
          }
          
          totalPoints += interaction.score;
          
          // Check if card is due using the same logic as due-cards endpoint
          if (interaction.dueDate) {
            if (isCardDue(interaction.dueDate)) {
              dueCards++;
            }
          }
          
          // Add to review history if reviewed in last 7 days
          if (interaction.lastReviewed) {
            const reviewDate = new Date(interaction.lastReviewed.toLocaleString('en-US', { timeZone: userTimezone }));
            const formattedReviewDate = reviewDate.toLocaleDateString('en-US', { timeZone: userTimezone });
            
            if (reviewsByDate[formattedReviewDate]) {
              reviewsByDate[formattedReviewDate].total++;
              if (interaction.difficulty) {
                reviewsByDate[formattedReviewDate][interaction.difficulty as 'easy' | 'medium' | 'hard']++;
              }
            }
          }
        } else {
          newCards++;
          masteryLevels.new++;
        }
      } else {
        // Non-flashcard content (MCQ, FRQ) - don't count in any mastery levels
        const interaction = content.studyContent.cardInteractions[0];
        if (interaction) {
          // Still count points from these interactions
          totalPoints += interaction.score;
        }
      }
    });
    
    const stats = {
      deckId: deck.id,
      deckTitle: deck.title,
      totalCards,
      flashcardCount,
      cardsWithProgress,
      newCards,
      dueCards,
      averageStreak: streakCount > 0 ? totalStreak / streakCount : 0,
      averageEaseFactor: easeFactorCount > 0 ? totalEaseFactor / easeFactorCount : 2.5,
      averageResponseTime: responseTimeCount > 0 ? totalResponseTime / responseTimeCount : null,
      totalPoints,
      reviewsByDate,
      masteryLevels,
      studyTime: studyTimeStats,
      // Calculate weighted mastery level
      masteryLevel: flashcardCount > 0 
        ? ((masteryLevels.mastered * 100) + 
           (masteryLevels.learning * 66) + 
           (masteryLevels.struggling * 33) + 
           (masteryLevels.new * 0)) / flashcardCount
        : 0
    };
    
    return NextResponse.json(stats);
  } catch (error) {
    console.error("Error fetching deck stats:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
