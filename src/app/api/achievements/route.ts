import { db } from '@/lib/db';
import { currentUser } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const user = await currentUser();
    if (!user) {
      return new NextResponse('Unauthorized', { status: 401 });
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