import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { MCQQuestion, FRQQuestion } from "@/types/quiz";
import { QuizDifficulty } from "@/stores/useQuizStore";

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await currentUser();
    if (!user?.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { type = "mixed", questionCount = 10 } = await req.json();
    const awaitParams = await params;
    const deckId = awaitParams.id;

    // Validate deck exists and user has access
    const deck = await db.deck.findFirst({
      where: {
        id: deckId,
        userId: user.id,
      },
      include: {
        deckContent: {
          include: {
            studyContent: {
              include: {
                mcqContent: true,
                frqContent: true,
              },
            },
          },
        },
      },
    });

    if (!deck) {
      return new NextResponse("Deck not found", { status: 404 });
    }

    // Collect all available questions
    const questions: (MCQQuestion | FRQQuestion)[] = [];
    
    deck.deckContent.forEach(content => {
      const { studyContent } = content;
      
      if ((type === "mcq" || type === "mixed") && studyContent.mcqContent) {
        const mcq = studyContent.mcqContent;
        const options = mcq.options as string[];
        
        if (Array.isArray(options)) {
          questions.push({
            id: mcq.id,
            type: "mcq",
            topic: studyContent.type,
            difficulty: studyContent.difficultyLevel as QuizDifficulty,
            question: mcq.question,
            options: options,
            correctOptionIndex: mcq.correctOptionIndex,
            explanation: mcq.explanation || undefined,
            hint: undefined,
          });
        }
      }
      
      if ((type === "frq" || type === "mixed") && studyContent.frqContent) {
        const frq = studyContent.frqContent;
        const answers = frq.answers as string[];
        
        if (Array.isArray(answers)) {
          questions.push({
            id: frq.id,
            type: "frq",
            topic: studyContent.type,
            difficulty: studyContent.difficultyLevel as QuizDifficulty,
            question: frq.question,
            answers: answers,
            caseSensitive: frq.caseSensitive,
            explanation: frq.explanation || undefined,
            hint: undefined,
          });
        }
      }
    });

    if (questions.length === 0) {
      return new NextResponse("No questions available for quiz", { status: 404 });
    }

    // Shuffle and limit questions
    const selectedQuestions = shuffleArray(questions).slice(0, Math.min(questionCount, questions.length));

    // Create quiz session
    const quizSession = await db.quizSession.create({
      data: {
        userId: user.id,
        deckId: deckId,
        quizType: type,
        questionsAnswered: 0,
        correctAnswers: 0,
        incorrectAnswers: 0,
        pointsEarned: 0,
      },
    });

    return NextResponse.json({
      sessionId: quizSession.id,
      questions: selectedQuestions,
    });
  } catch (error) {
    console.error("Error starting quiz:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
} 