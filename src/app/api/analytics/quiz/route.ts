import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { QuizAnalyticsEvent } from '@/types/api';
import { Prisma } from '@prisma/client';

interface WhereClause {
  userId: string;
  eventData?: {
    path: string[];
    equals: string;
  };
}

interface QuizEventData {
  sessionId?: string;
  score?: number;
  accuracy?: number;
  questionsAnswered?: number;
  totalTime?: number;
}

interface QuestionEventData {
  questionId?: string;
  isCorrect?: boolean;
  timeTaken?: number;
  skipped?: boolean;
  questionType?: string;
  topic?: string;
}

interface AnalyticsRecord {
  id: string;
  userId: string;
  eventType: string;
  eventData: Prisma.JsonValue;
  timestamp: Date;
}

// Add GET endpoint to retrieve analytics data
export async function GET(req: NextRequest) {
  console.log('🟢 [analytics/quiz] GET request received');
  
  try {
    const user = await currentUser();
    if (!user?.id) {
      console.log('🔴 [analytics/quiz] Unauthorized - No user found');
      return new NextResponse('Unauthorized', { status: 401 });
    }
    
    const url = new URL(req.url);
    const sessionId = url.searchParams.get('sessionId');
    const deckId = url.searchParams.get('deckId');
    
    console.log('🟢 [analytics/quiz] Fetching analytics data:', { sessionId, deckId });
    
    // Filter events based on parameters
    const whereClause: WhereClause = { userId: user.id };
    
    if (sessionId) {
      whereClause.eventData = {
        path: ['sessionId'],
        equals: sessionId,
      };
    }
    
    if (deckId && !sessionId) {
      whereClause.eventData = {
        path: ['deckId'],
        equals: deckId,
      };
    }
    
    // Get all recent quiz_completed events for stats
    const completedQuizzes = await db.quizAnalytics.findMany({
      where: {
        userId: user.id,
        eventType: 'quiz_completed',
      },
      orderBy: {
        timestamp: 'desc',
      },
      take: 10,
    });
    
    console.log(`🟢 [analytics/quiz] Found ${completedQuizzes.length} completed quizzes`);
    
    // Get question_answered events for the specified session if provided
    const questionEvents: AnalyticsRecord[] = sessionId ? await db.quizAnalytics.findMany({
      where: {
        userId: user.id,
        eventType: 'question_answered',
        eventData: {
          path: ['sessionId'],
          equals: sessionId,
        },
      },
      orderBy: {
        timestamp: 'asc',
      },
    }) : [];
    
    console.log(`🟢 [analytics/quiz] Found ${questionEvents.length} question events for session ${sessionId}`);
    
    // Get topic mastery data
    const topicMastery = await db.topicMastery.findMany({
      where: {
        userId: user.id,
      },
    });
    
    // Get user progress data
    const userProgress = await db.userProgress.findUnique({
      where: {
        userId: user.id,
      },
    });
    
    // Format the completed quizzes data for the frontend
    const formattedQuizzes = completedQuizzes.map(quiz => {
      const eventData = quiz.eventData as unknown as QuizEventData;
      return {
        sessionId: eventData.sessionId || 'unknown',
        score: eventData.score || 0,
        accuracy: eventData.accuracy || 0,
        questionsAnswered: eventData.questionsAnswered || 0,
        totalTime: eventData.totalTime || 0,
        timestamp: quiz.timestamp,
        date: quiz.timestamp.getTime(),
      };
    });
    
    // Format question events if any
    const formattedQuestions = questionEvents.map(event => {
      const eventData = event.eventData as unknown as QuestionEventData;
      return {
        questionId: eventData.questionId || 'unknown',
        isCorrect: eventData.isCorrect || false,
        timeTaken: eventData.timeTaken || 0,
        skipped: eventData.skipped || false,
        questionType: eventData.questionType || 'unknown',
        topic: eventData.topic || 'general',
        timestamp: event.timestamp,
      };
    });
    
    // Build complete analytics dataset
    const analyticsData = {
      completedQuizzes: formattedQuizzes,
      questions: formattedQuestions,
      topicMastery: topicMastery.map(tm => ({
        topic: tm.topic,
        questionsAttempted: tm.questionsAttempted,
        questionsCorrect: tm.questionsCorrect,
        accuracy: tm.questionsAttempted > 0 
          ? (tm.questionsCorrect / tm.questionsAttempted) * 100 
          : 0,
        averageResponseTime: tm.averageResponseTime,
        lastAttempted: tm.lastAttempted,
      })),
      userStats: userProgress ? {
        totalStudyTime: Number(userProgress.totalStudyTime) || 0,
        points: userProgress.points || 0,
        totalQuizzesTaken: completedQuizzes.length,
        totalQuestionsAnswered: formattedQuizzes.reduce((sum, quiz) => sum + quiz.questionsAnswered, 0),
      } : null,
    };
    
    console.log('🟢 [analytics/quiz] Returning analytics data');
    
    return NextResponse.json(analyticsData);
  } catch (error) {
    console.error('🔴 [analytics/quiz] Error fetching analytics:', error);
    return new NextResponse(JSON.stringify({ error: 'Internal Server Error' }), { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  console.log('🟢 [analytics/quiz] POST request received');
  
  // Check for OPTIONS request (preflight)
  if (req.method === 'OPTIONS') {
    return new NextResponse(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  }
  
  try {
    // Check content type
    const contentType = req.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      console.log('🔴 [analytics/quiz] Invalid content type:', contentType);
      return new NextResponse('Invalid content type - expected application/json', { 
        status: 400,
        headers: {
          'Content-Type': 'application/json',
        }
      });
    }
    
    const user = await currentUser();
    if (!user?.id) {
      console.log('🔴 [analytics/quiz] Unauthorized - No user found');
      return new NextResponse('Unauthorized', { 
        status: 401,
        headers: {
          'Content-Type': 'application/json',
        }
      });
    }

    const event: QuizAnalyticsEvent = await req.json();
    console.log('🟢 [analytics/quiz] Processing event:', { type: event.type, data: event.data });

    // Store analytics event
    await db.quizAnalytics.create({
      data: {
        userId: user.id,
        eventType: event.type,
        eventData: event.data,
        timestamp: new Date(event.data.timestamp),
      },
    });
    console.log('🟢 [analytics/quiz] Event stored in database');

    // Update user stats based on event type
    switch (event.type) {
      case 'quiz_completed':
        console.log('🟢 [analytics/quiz] Processing quiz_completed event');
        try {
          // Make sure totalTime is a safe integer value for database
          const safeTimeValue = Math.min(
            // Ensure it's not larger than max safe PostgreSQL integer
            2147483647, // Max value for INT4
            Math.round(Number(event.data.totalTime)) || 0
          );
          
          console.log('🟢 [analytics/quiz] Safe time value calculated:', { 
            original: event.data.totalTime,
            converted: safeTimeValue
          });
          
          await db.userProgress.update({
            where: { userId: user.id },
            data: {
              // Prisma automatically converts number to BigInt for BigInt fields
              totalStudyTime: { increment: safeTimeValue },
              points: { increment: Math.round(Number(event.data.score)) || 0 },
            },
          });
          console.log('🟢 [analytics/quiz] Updated user progress for quiz completion');
        } catch (error) {
          console.error('🔴 [analytics/quiz] Error updating user progress:', error);
          // Continue processing other parts even if this fails
        }
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

          // Ensure numeric values are properly handled
          const timeTaken = Math.round(Number(event.data.timeTaken) || 0);
          
          const newAverageTime = currentMastery
            ? Math.round((currentMastery.averageResponseTime * currentMastery.questionsAttempted + timeTaken) / 
              (currentMastery.questionsAttempted + 1))
            : timeTaken;

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
              averageResponseTime: timeTaken,
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

    console.log('🟢 [analytics/quiz] Successfully processed event:', event.type);
    return NextResponse.json({ success: true, timestamp: new Date().toISOString() }, {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      }
    });
  } catch (error) {
    console.error('🔴 [analytics/quiz] Error processing analytics:', error);
    return new NextResponse(JSON.stringify({ error: 'Internal Server Error' }), { 
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      }
    });
  }
} 