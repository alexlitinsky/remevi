import { db } from '@/lib/db';
import { currentUser } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

interface AchievementRequirements {
  pointThreshold: number;
}

export async function POST() {
  try {
    const user = await currentUser();
    if (!user) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    // Get user's current points
    const userProgress = await db.userProgress.findUnique({
      where: { userId: user.id }
    });
    const currentPoints = userProgress?.points || 0;

    // Get all achievements user hasn't unlocked yet
    const availableAchievements = await db.achievement.findMany({
      where: {
        visible: true,
        NOT: {
          userAchievements: {
            some: {
              userId: user.id
            }
          }
        }
      }
    });

    const newAchievements = [];

    // Check each achievement's requirements
    for (const achievement of availableAchievements) {
      const requirements = achievement.requirements as unknown as AchievementRequirements;
      
      // Check point threshold requirements
      if (requirements.pointThreshold && currentPoints >= requirements.pointThreshold) {
        try {
          const userAchievement = await db.userAchievement.upsert({
            where: {
              userId_achievementId: {
                userId: user.id,
                achievementId: achievement.id,
              },
            },
            update: {
              notified: false,
            },
            create: {
              userId: user.id,
              achievementId: achievement.id,
              notified: false
            },
            include: {
              achievement: true
            }
          });

          if (userAchievement) {
            await db.userProgress.update({
              where: { userId: user.id },
              data: {
                points: {
                  increment: achievement.pointsAwarded
                }
              }
            });

            newAchievements.push(userAchievement);
          }
        } catch (error) {
          console.error(`[ACHIEVEMENTS_CHECK] Error processing achievement ${achievement.id}:`, error);
          continue;
        }
      }
    }

    return NextResponse.json({ newAchievements });
  } catch (error) {
    console.error('[ACHIEVEMENTS_CHECK]', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
} 