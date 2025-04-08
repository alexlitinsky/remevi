import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { generateObject } from "ai";
import { z } from "zod";
import { openai4oMiniResponsesProvider } from "@/lib/ai/providers";
import { rateLimit } from '@/lib/rate-limit';

async function gradeFRQAnswer(userAnswer: string, correctAnswers: string[], question: string): Promise<{isCorrect: boolean; confidence: number}> {
  const prompt = `Grade this free response answer for correctness. Question: "${question}"
Correct answer(s): ${correctAnswers.join(" OR ")}
Student answer: "${userAnswer}"`;

  const result = await generateObject({
    model: openai4oMiniResponsesProvider,
    messages: [{ role: "user", content: prompt }],
    schema: z.object({
      isCorrect: z.boolean().describe("Whether the answer is correct"),
      confidence: z.number().describe("Confidence score between 0 and 1"),
      explanation: z.string().describe("Explanation of the grading")
    })
  });

  return {
    isCorrect: result.object.isCorrect,
    confidence: result.object.confidence
  };
}

export async function POST(req: NextRequest) {
  try {
    const user = await currentUser();
    if (!user?.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    // Rate limiting
    const rateLimitResult = await rateLimit(user.id);
    if (rateLimitResult.error) {
      return rateLimitResult.error;
    }

    const requestData = await req.json();
    
    const { sessionId, questionId, userAnswer: answer, timeTaken } = requestData;
    const url = new URL(req.url);
    const segments = url.pathname.split('/');
    const deckId = segments[segments.indexOf('decks') + 1];
    

    // Validate session exists and belongs to user
    const session = await db.quizSession.findFirst({
      where: {
        id: sessionId,
        userId: user.id,
        deckId: deckId,
      },
    });

    if (!session) {
      return new NextResponse("Session not found", { status: 404 });
    }

    // Get question content - first try to find MCQ or FRQ directly

    // Modified approach - get studyContent for MCQ/FRQ first
    const mcqContent = await db.mCQContent.findUnique({
      where: { id: questionId },
      select: { studyContentId: true }
    });

    const frqContent = !mcqContent ? await db.fRQContent.findUnique({
      where: { id: questionId },
      select: { studyContentId: true }
    }) : null;

    // Find the studyContentId from either MCQ or FRQ
    const studyContentId = mcqContent?.studyContentId || frqContent?.studyContentId;

    if (!studyContentId) {
      return new NextResponse("Question not found", { status: 404 });
    }

    // Check if this study content is in the requested deck
    const deckContent = await db.deckContent.findFirst({
      where: {
        studyContentId: studyContentId,
        deckId: deckId
      }
    });

    if (!deckContent) {
      return new NextResponse("Question not found in this deck", { status: 404 });
    }

    // Now get the full study content with related content
    const studyContent = await db.studyContent.findUnique({
      where: { id: studyContentId },
      include: {
        mcqContent: true,
        frqContent: true
      }
    });

    if (!studyContent) {
      return new NextResponse("Question not found", { status: 404 });
    }


    // Check answer
    let isCorrect = false;
    let pointsEarned = 0;
    let explanation = "";

    if (studyContent.type === "mcq" && studyContent.mcqContent) {
      // For MCQs, we need to check if the answer matches the correct option
      // The answer can either be the option's text or the option's index
      const mcq = studyContent.mcqContent;
      const options = mcq.options as string[];
      
      
      // Check if answer is an index or option text
      if (!isNaN(parseInt(answer))) {
        // It's an index
        isCorrect = parseInt(answer) === mcq.correctOptionIndex;
      } else {
        // It's the text of an option
        isCorrect = answer === options[mcq.correctOptionIndex];
      }
      
      pointsEarned = isCorrect ? 50 : 0;
      explanation = mcq.explanation ?? "No explanation provided";
    } else if (studyContent.type === "frq" && studyContent.frqContent) {
      const answers = studyContent.frqContent.answers as string[];
      const question = studyContent.frqContent.question as string;
      
      
      const { isCorrect: aiGraded, confidence } = await gradeFRQAnswer(
        answer,
        answers,
        question
      );
      
      isCorrect = aiGraded;
      // Adjust points based on AI confidence
      pointsEarned = isCorrect ? Math.round(70 * confidence) : 0;
      explanation = studyContent.frqContent.explanation ?? "No explanation provided";
      
    }

    // Record answer
    await db.quizAnswer.create({
      data: {
        quizSessionId: sessionId,
        studyContentId: studyContent.id,
        userAnswer: answer,
        isCorrect,
        timeTaken,
        pointsEarned,
      },
    });

    // Update session stats
    await db.quizSession.update({
      where: { id: sessionId },
      data: {
        questionsAnswered: { increment: 1 },
        correctAnswers: { increment: isCorrect ? 1 : 0 },
        incorrectAnswers: { increment: isCorrect ? 0 : 1 },
        pointsEarned: { increment: pointsEarned },
      },
    });

    // Update user progress
    await db.userProgress.update({
      where: { userId: user.id },
      data: {
        points: { increment: pointsEarned },
      },
    });

    // Check for achievements
    await checkAchievements(user.id);

    return NextResponse.json({
      isCorrect,
      pointsEarned,
      explanation,
    });
  } catch (error) {
    console.error("🔴 [answer/route] Error submitting answer:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

interface AchievementRequirements {
  pointThreshold: number;
}

async function checkAchievements(userId: string) {
  try {
    // Get user's current points
    const userProgress = await db.userProgress.findUnique({
      where: { userId },
      select: { points: true }
    });

    if (!userProgress) return;

    // Get available achievements
    const achievements = await db.achievement.findMany({
      where: {
        visible: true,
        NOT: {
          userAchievements: {
            some: {
              userId,
            },
          },
        },
      },
    });

    // Check each achievement
    for (const achievement of achievements) {
      const requirements = achievement.requirements as unknown as AchievementRequirements;
      
      if (requirements.pointThreshold && userProgress.points >= requirements.pointThreshold) {
        await db.userAchievement.create({
          data: {
            userId,
            achievementId: achievement.id,
          },
        });

        // Award achievement points
        await db.userProgress.update({
          where: { userId },
          data: {
            points: { increment: achievement.pointsAwarded },
          },
        });
      }
    }
  } catch (error) {
    console.error("Error checking achievements:", error);
  }
}