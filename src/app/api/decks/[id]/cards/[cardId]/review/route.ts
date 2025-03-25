import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { calculateNextReview, calculateStreak, type Difficulty } from "@/lib/srs";

export async function POST(req: NextRequest) {
  try {
    const user = await currentUser();
    if (!user?.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    // Extract parameters from the URL path
    const url = new URL(req.url);
    const pathParts = url.pathname.split('/');
    
    // For a route like /api/decks/[id]/cards/[cardId]/review
    // The id will be at index 3 and cardId at index 5
    const deckId = pathParts[3];
    const studyContentId = pathParts[5]; // This is now the studyContentId
    
    if (!deckId || !studyContentId) {
      return new NextResponse("Missing required parameters", { status: 400 });
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

    // Get the study content to ensure it exists
    const studyContent = await db.studyContent.findUnique({
      where: { id: studyContentId },
      include: {
        flashcardContent: true
      }
    });

    if (!studyContent) {
      return new NextResponse("Study content not found", { status: 404 });
    }

    // Get or create card interaction
    let cardInteraction = await db.cardInteraction.findUnique({
      where: {
        userId_studyContentId: {
          userId: user.id,
          studyContentId,
        },
      },
    });

    const review = {
      difficulty: difficulty as Difficulty,
      responseTime: parseInt(responseTime),
    };

    const nextReview = calculateNextReview(
      review,
      cardInteraction?.streak ?? 0,
      cardInteraction?.easeFactor ?? 2.5,
      cardInteraction?.repetitions ?? 0
    );

    const newStreak = calculateStreak(
      cardInteraction?.streak ?? 0,
      review.difficulty,
    );

    // Determine mastery level based on performance
    let masteryLevel = "new";
    if (nextReview.repetitions > 0) {
      if (nextReview.easeFactor >= 2.5 && newStreak >= 3) {
        masteryLevel = "mastered";
      } else if (nextReview.easeFactor >= 2.0) {
        masteryLevel = "learning";
      } else {
        masteryLevel = "struggling";
      }
    }

    // Create or update a study session
    const session = await db.studySession.upsert({
      where: {
        id: cardInteraction?.sessionId || 'new-session',
      },
      create: {
        userId: user.id,
        deckId: deckId,
        cardsStudied: 1,
        pointsEarned: nextReview.points,
      },
      update: {
        cardsStudied: {
          increment: 1,
        },
        pointsEarned: {
          increment: nextReview.points,
        },
      },
    });

    // Update or create card interaction
    cardInteraction = await db.cardInteraction.upsert({
      where: {
        userId_studyContentId: {
          userId: user.id,
          studyContentId,
        },
      },
      create: {
        userId: user.id,
        studyContentId,
        sessionId: session.id,
        easeFactor: nextReview.easeFactor,
        interval: nextReview.interval,
        repetitions: nextReview.repetitions,
        dueDate: nextReview.dueDate,
        lastReviewed: new Date(),
        streak: newStreak,
        score: nextReview.points,
        responseTime: review.responseTime,
        difficulty: review.difficulty,
        masteryLevel,
      },
      update: {
        sessionId: session.id,
        easeFactor: nextReview.easeFactor,
        interval: nextReview.interval,
        repetitions: nextReview.repetitions,
        dueDate: nextReview.dueDate,
        lastReviewed: new Date(),
        streak: newStreak,
        score: {
          increment: nextReview.points,
        },
        responseTime: review.responseTime,
        difficulty: review.difficulty,
        masteryLevel,
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
      cardInteraction,
      pointsEarned: nextReview.points,
      nextReview: nextReview.dueDate,
    });
  } catch (error) {
    console.error("Error reviewing card:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}