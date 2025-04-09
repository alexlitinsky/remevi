import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { db } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const user = await currentUser();
    if (!user?.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    // Extract the deck ID from the URL path
    const url = new URL(req.url);
    const pathParts = url.pathname.split('/');
    const deckId = pathParts[3]; // /api/decks/[id]/session/end

    if (!deckId) {
      return new NextResponse("Missing deck ID", { status: 400 });
    }

    // Get the session ID and client-tracked time from the request body
    const { sessionId, sessionTime } = await req.json();
    if (!sessionId) {
      return new NextResponse("Missing session ID", { status: 400 });
    }

    // Get the session to calculate total time
    const session = await db.studySession.findUnique({
      where: {
        id: sessionId,
        userId: user.id
      }
    });

    if (!session) {
      return new NextResponse("Session not found", { status: 404 });
    }

    // Calculate total time in seconds - use client-provided time if available
    const endTime = new Date();
    const totalTimeInSeconds = sessionTime || Math.round(
      (endTime.getTime() - session.startTime.getTime()) / 1000
    );

    // Update the session with end time and total time
    const updatedSession = await db.studySession.update({
      where: {
        id: sessionId
      },
      data: {
        endTime,
        totalTime: totalTimeInSeconds
      }
    });

    // Get user's timezone
    const userTimezone = req.headers.get('x-user-timezone') || 'UTC';
    const userDate = new Date(endTime.toLocaleString('en-US', { timeZone: userTimezone }));
    userDate.setHours(0, 0, 0, 0);

    // Get or create user progress
    const userProgress = await db.userProgress.findUnique({
      where: { userId: user.id }
    });

    let newStreak = 1; // Default to 1 for first time studying

    if (userProgress) {
      const lastStudyDate = userProgress.lastStudyDate;
      if (lastStudyDate) {
        const lastStudyDay = new Date(lastStudyDate);
        lastStudyDay.setHours(0, 0, 0, 0);
        const yesterday = new Date(userDate);
        yesterday.setDate(yesterday.getDate() - 1);
        
        if (lastStudyDay.getTime() === userDate.getTime()) {
          // Already studied today, keep current streak
          newStreak = userProgress.streak;
        } else if (lastStudyDay.getTime() === yesterday.getTime()) {
          // Studied yesterday, increment streak
          newStreak = userProgress.streak + 1;
        } else if (lastStudyDay.getTime() > yesterday.getTime()) {
          // Studied today but timezone shifted, keep streak
          newStreak = userProgress.streak;
        } else {
          // More than 1 day gap, reset streak to 1
          newStreak = 1;
        }
      }
    }

    // Update user progress
    await db.userProgress.upsert({
      where: {
        userId: user.id
      },
      create: {
        userId: user.id,
        streak: newStreak,
        lastStudyDate: userDate
      },
      update: {
        streak: newStreak,
        lastStudyDate: userDate
      }
    });

    return NextResponse.json(updatedSession);
  } catch (error) {
    console.error("Error ending study session:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
} 