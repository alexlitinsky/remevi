import { db } from '@/lib/db';
import { currentUser } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { rateLimit } from '@/lib/rate-limit';

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

    const [achievements, userAchievements] = await Promise.all([
      db.achievement.findMany({
        orderBy: {
          category: 'asc'
        }
      }),
      db.userAchievement.findMany({
        where: { 
          userId: user.id 
        },
        include: {
          achievement: true
        }
      })
    ]);

    return NextResponse.json({
      achievements,
      userAchievements
    });
  } catch (error) {
    console.error('[ACHIEVEMENTS_GET]', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
} 