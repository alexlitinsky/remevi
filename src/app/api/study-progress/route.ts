import { NextResponse } from "next/server"
import { currentUser } from "@clerk/nextjs/server"
import { db } from "@/lib/db"

export async function GET() {
  try {
    const user = await currentUser()
    if (!user?.id) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    // Get current date for time-based queries
    const now = new Date()
    const startOfWeek = new Date(now)
    startOfWeek.setDate(now.getDate() - now.getDay())
    startOfWeek.setHours(0, 0, 0, 0)

    // Get all study sessions for the user
    const studySessions = await db.studySession.findMany({
      where: {
        userId: user.id,
        startTime: {
          gte: startOfWeek // Changed to only get last week's data
        }
      },
      select: {
        startTime: true,
        cardsStudied: true,
        totalTime: true,
        pointsEarned: true
      },
      orderBy: {
        startTime: 'desc'
      }
    })

    // Get all card interactions for mastery calculation
    const cardInteractions = await db.cardInteraction.findMany({
      where: {
        userId: user.id,
      },
      include: {
        studyContent: true
      }
    })

    // Get user progress for streak and points
    const userProgress = await db.userProgress.findUnique({
      where: { userId: user.id }
    });

    // Calculate total cards and mastered cards
    const uniqueCards = new Set(cardInteractions.map(ci => ci.studyContentId))
    const totalCards = await db.studyContent.count({
      where: {
        deckContent: {
          some: {
            deck: {
              userId: user.id
            }
          }
        }
      }
    })

    // Calculate mastery level based on cards in each category
    const masteryLevels = {
      mastered: 0,
      learning: 0,
      struggling: 0,
      new: 0
    };

    // Count cards in each mastery level
    cardInteractions.forEach(interaction => {
      masteryLevels[interaction.masteryLevel as keyof typeof masteryLevels]++;
    });

    // Calculate weighted progress
    const masteryScore = (
      (masteryLevels.mastered * 1.0) +     // Mastered cards count 100%
      (masteryLevels.learning * 0.66) +     // Learning cards count 75%
      (masteryLevels.struggling * 0.33) +   // Struggling cards count 33%
      (masteryLevels.new * 0)               // New cards count 0%
    );

    // Calculate overall mastery percentage
    const masteryLevel = Math.round((masteryScore / totalCards) * 100) || 0;
    const cardsReviewed = uniqueCards.size;

    // Use streak from UserProgress
    const currentStreak = userProgress?.streak || 0;

    // Calculate weekly activity (cards studied per day)
    const weeklyActivity = Array.from({ length: 7 }, (_, i) => {
      const date = new Date()
      date.setDate(date.getDate() - (6 - i))
      date.setHours(0, 0, 0, 0)
      const endDate = new Date(date)
      endDate.setHours(23, 59, 59, 999)
      
      const dayActivity = studySessions
        .filter(session => {
          const sessionTime = new Date(session.startTime)
          return sessionTime >= date && sessionTime <= endDate
        })
        .reduce((acc, session) => acc + (session.cardsStudied || 0), 0)

      return dayActivity
    })

    // Calculate total study time
    const totalStudyTime = studySessions.reduce((acc, session) => 
      acc + (session.totalTime || 0), 0
    )
    const studyTimeMinutes = Math.round(totalStudyTime / 60)

    const progress = {
      cardsReviewed,
      totalCards,
      masteryLevel,
      masteryBreakdown: {
        mastered: masteryLevels.mastered,
        learning: masteryLevels.learning,
        struggling: masteryLevels.struggling,
        new: masteryLevels.new
      },
      minutesStudied: studyTimeMinutes,
      studySessions: studySessions.length,
      currentStreak,
      weeklyActivity,
      recentMastery: Array.from({ length: 7 }, (_, i) => {
        const date = new Date()
        date.setDate(date.getDate() - (6 - i))
        const dateStr = date.toISOString().split('T')[0]
        return {
          date: dateStr,
          mastery: masteryLevel // Use current mastery level as we don't track historical mastery
        }
      }),
      totalPoints: userProgress?.points || 0
    }

    return NextResponse.json(progress)
  } catch (error) {
    console.error("Error fetching study progress:", error)
    return new NextResponse("Internal Server Error", { status: 500 })
  }
} 