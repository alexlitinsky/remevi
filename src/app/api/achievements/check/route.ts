import { db } from '@/lib/db';
import { currentUser } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const user = await currentUser();
    if (!user) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const body = await req.json();
    const { quizScore, streakDays, cardsStudied, correctAnswers, sessionType } = body;

    // Get user's current points
    const userProgress = await db.userProgress.findUnique({
      where: { userId: user.id }
    });
    const currentPoints = userProgress?.points || 0;

    // Get all achievements user hasn't unlocked yet
    const availableAchievements = await db.achievement.findMany({
      where: {
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
      const requirements = achievement.requirements as any;
      let isUnlocked = false;

      // Check different types of requirements
      if (sessionType === 'quiz') {
        if (requirements.quizScore && quizScore >= requirements.quizScore) {
          isUnlocked = true;
        }
        if (requirements.correctAnswers && correctAnswers >= requirements.correctAnswers) {
          isUnlocked = true;
        }
      }

      if (sessionType === 'study') {
        if (requirements.cardsStudied && cardsStudied >= requirements.cardsStudied) {
          isUnlocked = true;
        }
      }

      // Check streak requirements regardless of session type
      if (requirements.streakDays && streakDays >= requirements.streakDays) {
        isUnlocked = true;
      }

      // Check point threshold requirements
      if (requirements.pointThreshold && currentPoints >= requirements.pointThreshold) {
        isUnlocked = true;
      }

      if (isUnlocked) {
        // Check if user already has this achievement to avoid constraint error
        try {
          // Use upsert instead of create to handle existing achievements
          const userAchievement = await db.userAchievement.upsert({
            where: {
              userId_achievementId: {
                userId: user.id,
                achievementId: achievement.id,
              },
            },
            update: {
              // Just update the notified status if it already exists
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

          // Only award points if this is a new achievement (not previously awarded)
          if (userAchievement) {
            // Update user progress with points
            await db.userProgress.upsert({
              where: { userId: user.id },
              create: {
                userId: user.id,
                points: achievement.pointsAwarded
              },
              update: {
                points: {
                  increment: achievement.pointsAwarded
                }
              }
            });

            newAchievements.push(userAchievement);
          }
        } catch (error) {
          console.error(`[ACHIEVEMENTS_CHECK] Error processing achievement ${achievement.id}:`, error);
          // Continue processing other achievements rather than failing completely
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