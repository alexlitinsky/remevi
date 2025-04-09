import { db } from '@/lib/db';
import { currentUser } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { rateLimit } from '@/lib/rate-limit';

// Helper function to unlock achievements
async function unlockAchievements(userId: string, currentPoints: number) {
  // Get all achievements that should be unlocked but aren't yet
  const achievementsToUnlock = await db.achievement.findMany({
    where: {
      AND: [
        // Where the point threshold is less than or equal to current points
        {
          requirements: {
            path: ['pointThreshold'],
            lte: currentPoints
          }
        },
        // And there's no existing unlock record
        {
          NOT: {
            userAchievements: {
              some: {
                userId: userId
              }
            }
          }
        }
      ]
    }
  });

  // If we found achievements to unlock, create the records
  if (achievementsToUnlock.length > 0) {
    await db.userAchievement.createMany({
      data: achievementsToUnlock.map(achievement => ({
        userId: userId,
        achievementId: achievement.id,
        unlockedAt: new Date(),
        notified: false
      }))
    });
  }

  return achievementsToUnlock;
}

export async function GET() {
  try {
    const user = await currentUser();
    if (!user) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    // Rate limiting
    const rateLimitResult = await rateLimit(user.id);
    if (rateLimitResult.error) {
      return rateLimitResult.error;
    }

    const [achievements, userProgress] = await Promise.all([
      db.achievement.findMany({
        where: {
          visible: true
        },
        orderBy: {
          requirements: 'asc' // This will order by point threshold
        },
        include: {
          userAchievements: {
            where: {
              userId: user.id
            }
          }
        }
      }),
      db.userProgress.findUnique({
        where: { userId: user.id },
        select: { points: true }
      })
    ]);

    const totalPoints = userProgress?.points || 0;

    // Check and unlock any achievements that should be unlocked
    const newlyUnlocked = await unlockAchievements(user.id, totalPoints);

    // If we unlocked new achievements, add them to the response
    const achievementsWithUnlocks = achievements.map(achievement => ({
      ...achievement,
      isUnlocked: achievement.userAchievements.length > 0 || 
                  newlyUnlocked.some(a => a.id === achievement.id)
    }));

    return NextResponse.json({
      achievements: achievementsWithUnlocks,
      totalPoints,
      newlyUnlocked: newlyUnlocked.length > 0 ? newlyUnlocked : undefined
    });
  } catch (error) {
    console.error('[ACHIEVEMENTS_GET]', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
} 