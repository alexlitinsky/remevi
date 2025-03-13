import { NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { db } from "@/lib/db";

// Get card progress for a user and deck
export async function GET(req: Request) {
  try {
    const user = await currentUser();
    if (!user?.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }
    const userId = user.id;

    const { searchParams } = new URL(req.url);
    const deckId = searchParams.get("deckId");

    if (!deckId) {
      return new NextResponse("Deck ID is required", { status: 400 });
    }

    const cardProgress = await db.cardProgress.findMany({
      where: {
        userId,
        deckId,
      },
    });

    return NextResponse.json(cardProgress);
  } catch (error) {
    console.error("[CARD_PROGRESS_GET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

// Update card progress using SuperMemo2 algorithm
export async function POST(req: Request) {
  try {
    const user = await currentUser();
    if (!user?.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }
    const userId = user.id;

    const body = await req.json();
    const { cardId, deckId, quality } = body;

    if (!cardId || !deckId || quality === undefined) {
      return new NextResponse("Missing required fields", { status: 400 });
    }

    // Get existing progress or create new
    let progress = await db.cardProgress.findFirst({
      where: {
        userId,
        cardId,
        deckId,
      },
    });

    // SuperMemo2 Algorithm implementation
    const calculateSM2 = (quality: number, repetitions: number, easeFactor: number) => {
      if (quality < 0 || quality > 5) throw new Error("Quality must be between 0 and 5");

      let newEaseFactor = easeFactor;
      let newRepetitions = repetitions;
      let newInterval = 1;

      if (quality >= 3) {
        if (repetitions === 0) {
          newInterval = 1;
        } else if (repetitions === 1) {
          newInterval = 6;
        } else {
          newInterval = Math.round(newInterval * easeFactor);
        }
        newRepetitions++;
        
        newEaseFactor = easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
        if (newEaseFactor < 1.3) newEaseFactor = 1.3;
      } else {
        newRepetitions = 0;
        newInterval = 1;
        newEaseFactor = easeFactor;
      }

      return { interval: newInterval, repetitions: newRepetitions, easeFactor: newEaseFactor };
    };

    const now = new Date();
    if (!progress) {
      // Create new progress
      const sm2 = calculateSM2(quality, 0, 2.5);
      progress = await db.cardProgress.create({
        data: {
          userId,
          cardId,
          deckId,
          easeFactor: sm2.easeFactor,
          interval: sm2.interval,
          repetitions: sm2.repetitions,
          dueDate: new Date(now.getTime() + sm2.interval * 24 * 60 * 60 * 1000),
          lastReviewed: now,
        },
      });
    } else {
      // Update existing progress
      const sm2 = calculateSM2(quality, progress.repetitions, progress.easeFactor);
      progress = await db.cardProgress.update({
        where: { id: progress.id },
        data: {
          easeFactor: sm2.easeFactor,
          interval: sm2.interval,
          repetitions: sm2.repetitions,
          dueDate: new Date(now.getTime() + sm2.interval * 24 * 60 * 60 * 1000),
          lastReviewed: now,
        },
      });
    }

    return NextResponse.json(progress);
  } catch (error) {
    console.error("[CARD_PROGRESS_POST]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
} 