import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { QuizAnalyticsEvent } from '@/types/api';
import { Prisma } from '@prisma/client';

export async function POST(req: NextRequest) {
  try {
    const user = await currentUser();
    if (!user?.id) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const event: QuizAnalyticsEvent = await req.json();

    // Store analytics event
    await db.quizAnalytics.create({
      data: {
        userId: user.id,
        eventType: event.type,
        eventData: event.data,
        timestamp: new Date(event.data.timestamp),
      },
    });

    // Update user stats based on event type
    switch (event.type) {
      case 'quiz_completed':
        await db.userProgress.update({
          where: { userId: user.id },
          data: {
            totalStudyTime: { increment: event.data.totalTime },
            points: { increment: event.data.score },
          },
        });
        break;

      case 'question_answered':
        if (event.data.isCorrect) {
          // Update topic mastery
          const currentMastery = await db.topicMastery.findUnique({
            where: {
              userId_topic: {
                userId: user.id,
                topic: event.data.topic,
              },
            },
          });

          const newAverageTime = currentMastery
            ? (currentMastery.averageResponseTime * currentMastery.questionsAttempted + event.data.timeTaken) / 
              (currentMastery.questionsAttempted + 1)
            : event.data.timeTaken;

          await db.topicMastery.upsert({
            where: {
              userId_topic: {
                userId: user.id,
                topic: event.data.topic,
              },
            },
            create: {
              userId: user.id,
              topic: event.data.topic,
              questionsAttempted: 1,
              questionsCorrect: 1,
              averageResponseTime: event.data.timeTaken,
              lastAttempted: new Date(),
            },
            update: {
              questionsAttempted: { increment: 1 },
              questionsCorrect: { increment: 1 },
              averageResponseTime: newAverageTime,
              lastAttempted: new Date(),
            },
          });
        }
        break;

      case 'error_occurred':
        // Log errors for monitoring
        await db.errorLog.create({
          data: {
            userId: user.id,
            errorType: event.data.errorType,
            errorMessage: event.data.errorMessage,
            sessionId: event.data.sessionId,
            timestamp: new Date(event.data.timestamp),
          },
        });
        break;

      case 'session_recovered':
        // Track successful recoveries
        await db.recoveryLog.create({
          data: {
            userId: user.id,
            sessionId: event.data.sessionId,
            recoveryType: event.data.recoveryType,
            questionsAnswered: event.data.questionsAnswered,
            timestamp: new Date(event.data.timestamp),
          },
        });
        break;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error processing analytics:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
} 