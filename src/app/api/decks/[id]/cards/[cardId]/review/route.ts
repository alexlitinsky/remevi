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
    const studyContentId = pathParts[5];
    
    // Get user's timezone
    const userTimezone = req.headers.get('x-user-timezone') || 'UTC';
    
    console.log('Processing review for:', { deckId, studyContentId });
    
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

    const { difficulty, responseTime, sessionId: requestSessionId } = await req.json();
    console.log('Review data:', { difficulty, responseTime });

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

    console.log('Existing card interaction:', cardInteraction);

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

    console.log('Calculated next review:', nextReview);

    const newStreak = calculateStreak(
      cardInteraction?.streak ?? 0,
      review.difficulty,
    );

    console.log('New streak:', newStreak);

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

    // Get session ID from request or card interaction
    const sessionId = requestSessionId || cardInteraction?.sessionId;
    
    if (!sessionId) {
      return new NextResponse("Missing session ID", { status: 400 });
    }
    
    // Find the existing session
    const session = await db.studySession.findUnique({
      where: {
        id: sessionId,
        userId: user.id
      }
    });
    
    if (!session) {
      return new NextResponse("Session not found", { status: 404 });
    }
    
    // Update the session stats without modifying timestamps
    await db.studySession.update({
      where: { id: sessionId },
      data: {
        cardsStudied: { increment: 1 },
        pointsEarned: { increment: nextReview.points }
      }
    });

    // Create or update card interaction with existing session ID
    const updatedCardInteraction = await db.cardInteraction.upsert({
      where: {
        userId_studyContentId: {
          userId: user.id,
          studyContentId: studyContentId,
        },
      },
      create: {
        userId: user.id,
        studyContentId: studyContentId,
        sessionId: sessionId,
        easeFactor: nextReview.easeFactor,
        interval: nextReview.interval,
        repetitions: nextReview.repetitions,
        dueDate: nextReview.dueDate,
        lastReviewed: new Date(),
        streak: newStreak,
        responseTime: review.responseTime,
        difficulty: review.difficulty,
        score: nextReview.points,
        masteryLevel
      },
      update: {
        sessionId: sessionId,
        easeFactor: nextReview.easeFactor,
        interval: nextReview.interval,
        repetitions: nextReview.repetitions,
        dueDate: nextReview.dueDate,
        lastReviewed: new Date(),
        streak: newStreak,
        responseTime: review.responseTime,
        difficulty: review.difficulty,
        score: {
          increment: nextReview.points
        },
        masteryLevel
      },
      include: {
        studyContent: true
      }
    });

    // Update user progress with proper date handling
    const now = new Date();
    const userDate = new Date(now.toLocaleString('en-US', { timeZone: userTimezone }));
    userDate.setHours(0, 0, 0, 0);

    await db.userProgress.upsert({
      where: {
        userId: user.id,
      },
      create: {
        userId: user.id,
        points: nextReview.points,
        streak: newStreak,
        lastStudyDate: userDate,
      },
      update: {
        points: {
          increment: nextReview.points,
        },
        streak: newStreak,
        lastStudyDate: userDate,
      },
    });

    // Return detailed response for debugging
    return NextResponse.json({
      cardInteraction: updatedCardInteraction,
      pointsEarned: nextReview.points,
      nextReview: nextReview.dueDate,
      session: {
        id: sessionId,
        cardsStudied: (session.cardsStudied || 0) + 1,
        pointsEarned: (session.pointsEarned || 0) + nextReview.points
      },
      masteryLevel,
      streak: newStreak
    });
  } catch (error) {
    console.error("Error reviewing card:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}