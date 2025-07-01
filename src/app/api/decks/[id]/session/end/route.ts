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

    // Standardize on UTC for date comparisons
    const todayUTC = new Date();
    todayUTC.setUTCHours(0, 0, 0, 0);

    // Get user progress
    const userProgress = await db.userProgress.findUnique({
      where: { userId: user.id }
    });

    // Calculate new streak
    let newStreak = 1;
    const ONE_DAY_MS = 86400000; // 24 hours in milliseconds

    if (userProgress?.lastStudyDate) {
      const lastStudyUTC = new Date(userProgress.lastStudyDate);
      lastStudyUTC.setUTCHours(0, 0, 0, 0);

      const daysSinceLastStudy = Math.floor(
        (todayUTC.getTime() - lastStudyUTC.getTime()) / ONE_DAY_MS
      );

      if (daysSinceLastStudy === 0) {
        // Already studied today - maintain streak
        newStreak = userProgress.streak;
      } else if (daysSinceLastStudy === 1) {
        // Studied yesterday - increment streak
        newStreak = userProgress.streak + 1;
      }
      // All other cases (daysSinceLastStudy > 1) will reset to 1
    }

    // Update user progress with UTC date
    await db.userProgress.upsert({
      where: {
        userId: user.id
      },
      create: {
        userId: user.id,
        streak: newStreak,
        lastStudyDate: todayUTC
      },
      update: {
        streak: newStreak,
        lastStudyDate: todayUTC
      }
    });

    return NextResponse.json(updatedSession);
  } catch (error) {
    console.error("Error ending study session:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}