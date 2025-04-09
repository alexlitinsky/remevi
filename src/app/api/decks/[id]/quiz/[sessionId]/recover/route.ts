import { NextResponse, NextRequest } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { QuizAnswer } from '@/types/quiz';
import { formatQuizQuestion } from '@/lib/quiz';

export async function POST(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const segments = url.pathname.split('/');
    const sessionId = segments[segments.length - 2];
    const id = segments[segments.length - 4];
    
    const { userId } = await auth();
    if (!userId) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    // Get session with answers and deck content
    const session = await db.quizSession.findUnique({
      where: {
        id: sessionId,
        userId,
        deckId: id,
      },
      include: {
        quizAnswers: true,
        deck: {
          include: {
            deckContent: {
              include: {
                studyContent: {
                  include: {
                    mcqContent: true,
                    frqContent: true
                  }
                }
              }
            }
          }
        }
      }
    });

    if (!session) {
      return new NextResponse('Session not found', { status: 404 });
    }

    // Get all questions from deck content and format them
    const allQuestions = session.deck.deckContent.map(dc => {
      const content = dc.studyContent;
      return formatQuizQuestion({
        id: content.id,
        question: content.mcqContent?.question || content.frqContent?.question || '',
        hint: content.mcqContent?.explanation || content.frqContent?.explanation || '',
        topic: content.difficultyLevel,
        mcqContent: content.mcqContent ? {
          ...content.mcqContent,
          options: content.mcqContent.options as string[],
        } : null,
        frqContent: content.frqContent ? {
          ...content.frqContent,
          answers: content.frqContent.answers as string[],
        } : null,
      });
    });
    
    // Format answered questions
    const answeredQuestions = session.quizAnswers.reduce<Record<string, QuizAnswer>>((acc, answer) => {
      acc[answer.studyContentId] = {
        questionId: answer.studyContentId,
        userAnswer: answer.userAnswer,
        isCorrect: answer.isCorrect,
        pointsEarned: answer.pointsEarned,
        timeTaken: answer.timeTaken || 0,
        skipped: false // QuizAnswer doesn't track skips
      };
      return acc;
    }, {});

    // Calculate current state
    const lastAnsweredIndex = session.questionsAnswered - 1;
    const currentIndex = lastAnsweredIndex + 1;
    const currentQuestion = allQuestions[currentIndex] || null;
    
    return NextResponse.json({
      allQuestions,
      currentQuestion,
      currentIndex,
      answeredQuestions,
      score: session.pointsEarned,
      correctAnswers: session.correctAnswers,
      incorrectAnswers: session.incorrectAnswers,
      sessionStartTime: session.startTime.getTime(),
      totalPausedTime: session.totalTime || 0
    });

  } catch (error) {
    console.error('[QUIZ_RECOVER]', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
}