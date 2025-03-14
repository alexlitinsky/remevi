import { NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { db } from "@/lib/db";

// Get user progress
export async function GET() {
  try {
    const user = await currentUser();
    if (!user?.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const userProgress = await db.userProgress.findUnique({
      where: { userId: user.id },
    });

    if (!userProgress) {
      // Create initial progress if it doesn't exist
      const newProgress = await db.userProgress.create({
        data: {
          userId: user.id,
          points: 0,
          streak: 0,
        },
      });
      return NextResponse.json(newProgress);
    }

    return NextResponse.json(userProgress);
  } catch (error) {
    console.error("[USER_PROGRESS_GET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

// Update user progress
export async function POST(req: Request) {
  try {
    const user = await currentUser();
    if (!user?.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const body = await req.json();
    const { points = 0 } = body;

    let userProgress = await db.userProgress.findUnique({
      where: { userId: user.id },
    });

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    if (!userProgress) {
      // Create new progress
      userProgress = await db.userProgress.create({
        data: {
          userId: user.id,
          points,
          streak: 1,
          lastStudyDate: today,
        },
      });
    } else {
      // Check streak
      let newStreak = userProgress.streak;
      if (userProgress.lastStudyDate) {
        const lastStudy = new Date(userProgress.lastStudyDate);
        const lastStudyDay = new Date(
          lastStudy.getFullYear(),
          lastStudy.getMonth(),
          lastStudy.getDate()
        );
        
        const diffTime = today.getTime() - lastStudyDay.getTime();
        const diffDays = diffTime / (1000 * 60 * 60 * 24);

        if (diffDays === 1) {
          // Consecutive day
          newStreak += 1;
        } else if (diffDays > 1) {
          // Streak broken
          newStreak = 1;
        }
        // If diffDays === 0, same day, keep streak
      }

      // Update progress
      userProgress = await db.userProgress.update({
        where: { userId: user.id },
        data: {
          points: userProgress.points + points,
          streak: newStreak,
          lastStudyDate: points > 0 ? today : userProgress.lastStudyDate,
        },
      });
    }

    return NextResponse.json(userProgress);
  } catch (error) {
    console.error("[USER_PROGRESS_POST]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
} 