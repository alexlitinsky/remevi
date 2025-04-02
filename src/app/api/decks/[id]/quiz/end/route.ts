import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { db } from "@/lib/db";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    console.log('🟢 [quiz/end] POST request received', { deckId: params.id });
    const user = await currentUser();
    
    if (!user?.id) {
      console.error('🔴 [quiz/end] Unauthorized - no user ID');
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const body = await req.json();
    const { sessionId, totalTime } = body;

    console.log('🟢 [quiz/end] Processing request:', { 
      sessionId, 
      totalTime,
      userId: user.id,
      deckId: params.id
    });

    // Validate session exists and belongs to user
    const session = await db.quizSession.findFirst({
      where: {
        id: sessionId,
        userId: user.id,
        deckId: params.id,
      },
    });

    if (!session) {
      console.error('🔴 [quiz/end] Session not found:', { sessionId, userId: user.id, deckId: params.id });
      return new NextResponse("Session not found", { status: 404 });
    }

    console.log('🟢 [quiz/end] Found session:', { 
      sessionId: session.id,
      questionsAnswered: session.questionsAnswered,
      correctAnswers: session.correctAnswers,
      incorrectAnswers: session.incorrectAnswers
    });

    // Update session with completion data
    const updatedSession = await db.quizSession.update({
      where: { id: sessionId },
      data: {
        endTime: new Date(),
        totalTime: Math.max(0, Math.round(Number(totalTime) || 0)), // Ensure positive integer
      },
    });

    // Calculate accuracy (ensure division by zero is handled)
    const accuracy = updatedSession.questionsAnswered > 0
      ? Math.round((updatedSession.correctAnswers / updatedSession.questionsAnswered) * 100)
      : 0;
    
    // Calculate average time per question with safety checks
    const averageTime = (updatedSession.questionsAnswered > 0 && 
                         updatedSession.totalTime != null &&
                         updatedSession.totalTime > 0)
      ? Math.round(updatedSession.totalTime / updatedSession.questionsAnswered)
      : 0;

    // Get achievements (or empty array if none)
    const achievements = await checkAchievements(user.id, updatedSession);
    console.log('🟢 [quiz/end] Achievements unlocked:', achievements.length);

    // Prepare response with safety checks for null values
    const response = {
      message: "Quiz completed successfully",
      sessionStats: {
        totalTime: updatedSession.totalTime || 0,
        questionsAnswered: updatedSession.questionsAnswered || 0,
        correctAnswers: updatedSession.correctAnswers || 0,
        incorrectAnswers: updatedSession.incorrectAnswers || 0,
        pointsEarned: updatedSession.pointsEarned || 0,
        accuracy: accuracy,
        averageTime: averageTime,
      },
      achievements: achievements || [],
    };

    console.log('🟢 [quiz/end] Sending response:', { 
      pointsEarned: response.sessionStats.pointsEarned,
      accuracy: response.sessionStats.accuracy,
      achievementsCount: response.achievements.length
    });

    return NextResponse.json(response);
  } catch (error) {
    console.error("🔴 [quiz/end] Error completing quiz:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

async function checkAchievements(userId: string, session: any) {
  try {
    // Get achievements that should be unlocked based on this quiz
    const unlockedAchievements = [];
    
    // Check for perfect quiz achievement
    if (
      session.questionsAnswered >= 5 &&
      session.correctAnswers === session.questionsAnswered
    ) {
      const perfectQuizAchievement = await db.achievement.findFirst({
        where: {
          category: "quiz",
          requirements: {
            path: ["$.perfectQuiz"],
            equals: true,
          },
          NOT: {
            userAchievements: {
              some: {
                userId,
              },
            },
          },
        },
      });

      if (perfectQuizAchievement) {
        await db.userAchievement.create({
          data: {
            userId,
            achievementId: perfectQuizAchievement.id,
          },
        });

        // Award achievement points
        await db.userProgress.update({
          where: { userId },
          data: {
            points: { increment: perfectQuizAchievement.pointsAwarded },
          },
        });
        
        // Add to response achievements
        unlockedAchievements.push({
          id: perfectQuizAchievement.id,
          name: perfectQuizAchievement.name,
          description: perfectQuizAchievement.description,
          category: perfectQuizAchievement.category,
          pointsAwarded: perfectQuizAchievement.pointsAwarded,
        });
      }
    }

    // Return achievements for the response
    return unlockedAchievements;
  } catch (error) {
    console.error("🔴 [quiz/end] Error checking achievements:", error);
    return []; // Return empty array on error to prevent breaking the main flow
  }
} 