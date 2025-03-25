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
    const id = pathParts[pathParts.length - 2]; // -2 because stats is the last part
    
    if (!id) {
      return new NextResponse("Missing deck ID", { status: 400 });
    }
    
    // Get current date for time-based queries
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);
    
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
    
    // Calculate review history
    const reviewsByDate: Record<string, { total: number; easy: number; medium: number; hard: number }> = {};
    const last30Days = Array.from({ length: 30 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - i);
      return date.toISOString().split('T')[0];
    });
    
    last30Days.forEach(date => {
      reviewsByDate[date] = { total: 0, easy: 0, medium: 0, hard: 0 };
    });
    
    let totalCards = 0;
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
        
        // Check if card is due
        if (interaction.dueDate <= now) {
          dueCards++;
        }
        
        // Add to review history if reviewed in last 30 days
        if (interaction.lastReviewed) {
          const reviewDate = interaction.lastReviewed.toISOString().split('T')[0];
          if (reviewsByDate[reviewDate]) {
            reviewsByDate[reviewDate].total++;
            if (interaction.difficulty) {
              reviewsByDate[reviewDate][interaction.difficulty as 'easy' | 'medium' | 'hard']++;
            }
          }
        }
      } else {
        newCards++;
        masteryLevels.new++;
      }
    });
    
    const stats = {
      deckId: deck.id,
      deckTitle: deck.title,
      totalCards,
      cardsWithProgress,
      newCards,
      dueCards,
      averageStreak: streakCount > 0 ? totalStreak / streakCount : 0,
      averageEaseFactor: easeFactorCount > 0 ? totalEaseFactor / easeFactorCount : 2.5,
      averageResponseTime: responseTimeCount > 0 ? totalResponseTime / responseTimeCount : null,
      totalPoints,
      reviewsByDate,
      masteryLevels,
      studyTime: studyTimeStats
    };
    
    return NextResponse.json(stats);
  } catch (error) {
    console.error("Error fetching deck stats:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
