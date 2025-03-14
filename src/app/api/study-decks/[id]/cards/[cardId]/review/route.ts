import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { calculateNextReview, calculateStreak, type Difficulty } from "@/lib/srs";

// Define the correct type for the params
type ReviewRouteContext = {
  params: {
    id: string;
    cardId: string;
  };
};

export async function POST(
  req: NextRequest,
  context: ReviewRouteContext
) {
  try {
    const user = await currentUser();
    if (!user?.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    // Verify user exists in our database
    await db.user.upsert({
      where: { id: user.id },
      create: {
        id: user.id,
        email: user.emailAddresses[0]?.emailAddress || '',
        name: user.firstName || '',
      },
      update: {},
    });

    const { difficulty, responseTime } = await req.json();
    const { id: deckId, cardId } = context.params;

    // Get or create card progress
    let cardProgress = await db.cardProgress.findUnique({
      where: {
        userId_cardId: {
          userId: user.id,
          cardId,
        },
      },
    });

    const review = {
      difficulty: difficulty as Difficulty,
      responseTime: parseInt(responseTime),
    };

    const nextReview = calculateNextReview(
      review,
      cardProgress?.streak ?? 0,
      cardProgress?.easeFactor ?? 2.5,
      cardProgress?.repetitions ?? 0
    );

    const newStreak = calculateStreak(
      cardProgress?.streak ?? 0,
      review.difficulty,
      cardProgress?.lastReviewed ?? null
    );

    // Update or create card progress
    cardProgress = await db.cardProgress.upsert({
      where: {
        userId_cardId: {
          userId: user.id,
          cardId,
        },
      },
      create: {
        userId: user.id,
        cardId,
        deckId,
        easeFactor: nextReview.easeFactor,
        interval: nextReview.interval,
        repetitions: nextReview.repetitions,
        dueDate: nextReview.dueDate,
        lastReviewed: new Date(),
        streak: newStreak,
        totalPoints: nextReview.points,
        responseTime: review.responseTime,
        difficulty: review.difficulty,
      },
      update: {
        easeFactor: nextReview.easeFactor,
        interval: nextReview.interval,
        repetitions: nextReview.repetitions,
        dueDate: nextReview.dueDate,
        lastReviewed: new Date(),
        streak: newStreak,
        totalPoints: {
          increment: nextReview.points,
        },
        responseTime: review.responseTime,
        difficulty: review.difficulty,
      },
    });

    // Update user progress
    await db.userProgress.upsert({
      where: {
        userId: user.id,
      },
      create: {
        userId: user.id,
        points: nextReview.points,
        streak: newStreak,
        lastStudyDate: new Date(),
      },
      update: {
        points: {
          increment: nextReview.points,
        },
        streak: newStreak,
        lastStudyDate: new Date(),
      },
    });

    return NextResponse.json({
      cardProgress,
      pointsEarned: nextReview.points,
      nextReview: nextReview.dueDate,
    });
  } catch (error) {
    console.error("Error reviewing card:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
} 