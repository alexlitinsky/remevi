import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { db } from "@/lib/db";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await currentUser();
    const awaitedParams = await params;
    if (!user?.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { sessionId, sessionTime } = await req.json();

    // Validate session exists and belongs to user
    const session = await db.quizSession.findFirst({
      where: {
        id: sessionId,
        userId: user.id,
        deckId: awaitedParams.id,
      },
    });

    if (!session) {
      return new NextResponse("Session not found", { status: 404 });
    }

    // Update session with completion data
    const updatedSession = await db.quizSession.update({
      where: { id: sessionId },
      data: {
        endTime: new Date(),
        totalTime: sessionTime,
      },
    });

    // Check for achievements
    await checkAchievements(user.id, "quiz_completed", updatedSession);

    return NextResponse.json({
      message: "Quiz completed successfully",
      stats: {
        totalTime: updatedSession.totalTime,
        questionsAnswered: updatedSession.questionsAnswered,
        correctAnswers: updatedSession.correctAnswers,
        incorrectAnswers: updatedSession.incorrectAnswers,
        pointsEarned: updatedSession.pointsEarned,
      },
    });
  } catch (error) {
    console.error("Error completing quiz:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

async function checkAchievements(userId: string, action: string, session: any) {
  try {
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
      }
    }

    // Get user's total quiz stats
    const quizStats = await db.quizSession.aggregate({
      where: { 
        userId,
        endTime: { not: null },
      },
      _count: { id: true },
      _sum: {
        correctAnswers: true,
        questionsAnswered: true,
        pointsEarned: true,
      },
    });

    // Check for milestone achievements
    const milestoneAchievements = await db.achievement.findMany({
      where: {
        category: "quiz",
        type: "milestone",
        NOT: {
          userAchievements: {
            some: {
              userId,
            },
          },
        },
      },
    });

    for (const achievement of milestoneAchievements) {
      const requirements = achievement.requirements as any;
      let unlocked = false;

      if (
        requirements.totalQuizzes && 
        quizStats._count.id >= requirements.totalQuizzes
      ) {
        unlocked = true;
      }

      if (
        requirements.totalCorrectAnswers && 
        quizStats._sum.correctAnswers &&
        quizStats._sum.correctAnswers >= requirements.totalCorrectAnswers
      ) {
        unlocked = true;
      }

      if (
        requirements.totalPoints && 
        quizStats._sum.pointsEarned &&
        quizStats._sum.pointsEarned >= requirements.totalPoints
      ) {
        unlocked = true;
      }

      if (unlocked) {
        await db.userAchievement.create({
          data: {
            userId,
            achievementId: achievement.id,
          },
        });

        // Award achievement points
        await db.userProgress.update({
          where: { userId },
          data: {
            points: { increment: achievement.pointsAwarded },
          },
        });
      }
    }
  } catch (error) {
    console.error("Error checking achievements:", error);
  }
} 