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

    // Get the session ID from the request body
    const { sessionId } = await req.json();
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

    // Calculate total time in seconds
    const endTime = new Date();
    const totalTimeInSeconds = Math.round(
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

    return NextResponse.json(updatedSession);
  } catch (error) {
    console.error("Error ending study session:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
} 