import { db } from './db';

export async function checkAndUnlockAchievements(userId: string, currentPoints: number) {
  try {
    // Get all achievements that should be unlocked but aren't yet
    const achievementsToUnlock = await db.achievement.findMany({
      where: {
        visible: true,
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

      return achievementsToUnlock;
    }

    return [];
  } catch (error) {
    console.error('[CHECK_ACHIEVEMENTS]', error);
    return [];
  }
} 