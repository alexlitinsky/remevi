import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { generateObject } from "ai";
import { z } from "zod";
import { openai4oMiniResponsesProvider } from "@/lib/ai/providers";

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

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  console.log('🟢 [answer/route] POST request received');
  try {
    const user = await currentUser();
    if (!user?.id) {
      console.log('🔴 [answer/route] Unauthorized - No user found');
      return new NextResponse("Unauthorized", { status: 401 });
    }
    console.log(`🟢 [answer/route] User authenticated: ${user.id}`);

    const requestData = await req.json();
    console.log('🟢 [answer/route] Request payload:', JSON.stringify(requestData));
    
    const { sessionId, questionId, userAnswer: answer, timeTaken } = requestData;
    const awaitedParams = await params;
    const deckId = awaitedParams.id;
    
    console.log(`🟢 [answer/route] Processing answer for deck: ${deckId}, session: ${sessionId}, question: ${questionId}`);

    // Validate session exists and belongs to user
    const session = await db.quizSession.findFirst({
      where: {
        id: sessionId,
        userId: user.id,
        deckId: deckId,
      },
    });

    if (!session) {
      console.log(`🔴 [answer/route] Session not found - sessionId: ${sessionId}, userId: ${user.id}, deckId: ${deckId}`);
      return new NextResponse("Session not found", { status: 404 });
    }
    console.log(`🟢 [answer/route] Session found: ${session.id}`);

    // Get question content - first try to find MCQ or FRQ directly
    console.log(`🟢 [answer/route] Looking up question content for ID: ${questionId}`);

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
      console.log(`🔴 [answer/route] Question ID not found in either MCQ or FRQ content: ${questionId}`);
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
      console.log(`🔴 [answer/route] Study content found but not in requested deck - contentId: ${studyContentId}, deckId: ${deckId}`);
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
      console.log(`🔴 [answer/route] Study content not found after verifying IDs - contentId: ${studyContentId}`);
      return new NextResponse("Question not found", { status: 404 });
    }

    console.log(`🟢 [answer/route] Question found: ${studyContent.id}, type: ${studyContent.type}`);

    // Check answer
    let isCorrect = false;
    let pointsEarned = 0;
    let explanation = "";

    if (studyContent.type === "mcq" && studyContent.mcqContent) {
      // For MCQs, we need to check if the answer matches the correct option
      // The answer can either be the option's text or the option's index
      const mcq = studyContent.mcqContent;
      const options = mcq.options as string[];
      const correctOptionIndex = mcq.correctOptionIndex;
      
      console.log(`🟢 [answer/route] MCQ - answer submitted: "${answer}", correctIndex: ${correctOptionIndex}`);
      
      // Check if answer is an index or option text
      if (!isNaN(parseInt(answer))) {
        // It's an index
        isCorrect = parseInt(answer) === mcq.correctOptionIndex;
        console.log(`🟢 [answer/route] Answer is index: ${answer}, correct: ${isCorrect}`);
      } else {
        // It's the text of an option
        isCorrect = answer === options[mcq.correctOptionIndex];
        console.log(`🟢 [answer/route] Answer is text: "${answer}", correct: ${isCorrect}`);
      }
      
      pointsEarned = isCorrect ? 10 : 0;
      explanation = mcq.explanation ?? "No explanation provided";
    } else if (studyContent.type === "frq" && studyContent.frqContent) {
      const answers = studyContent.frqContent.answers as string[];
      const question = studyContent.frqContent.question as string;
      
      console.log(`🟢 [answer/route] FRQ - answer submitted: "${answer}", expected answers: ${JSON.stringify(answers)}`);
      
      const { isCorrect: aiGraded, confidence } = await gradeFRQAnswer(
        answer,
        answers,
        question
      );
      
      isCorrect = aiGraded;
      // Adjust points based on AI confidence
      pointsEarned = isCorrect ? Math.round(15 * confidence) : 0;
      explanation = studyContent.frqContent.explanation ?? "No explanation provided";
      
      console.log(`🟢 [answer/route] FRQ graded: ${isCorrect}, confidence: ${confidence}, points: ${pointsEarned}`);
    }

    // Record answer
    console.log(`🟢 [answer/route] Recording answer in database`);
    const quizAnswer = await db.quizAnswer.create({
      data: {
        quizSessionId: sessionId,
        studyContentId: studyContent.id,
        userAnswer: answer,
        isCorrect,
        timeTaken,
        pointsEarned,
      },
    });
    console.log(`🟢 [answer/route] Answer recorded: ${quizAnswer.id}`);

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
    console.log(`🟢 [answer/route] Session stats updated`);

    // Update user progress
    await db.userProgress.update({
      where: { userId: user.id },
      data: {
        points: { increment: pointsEarned },
      },
    });

    // Check for achievements
    await checkAchievements(user.id);

    console.log(`🟢 [answer/route] Answer processing complete, returning response`);
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
  totalQuizzes?: number;
  totalCorrectAnswers?: number;
}

async function checkAchievements(userId: string) {
  try {
    // Get user's quiz stats
    const quizStats = await db.quizSession.aggregate({
      where: { userId },
      _count: { id: true },
      _sum: {
        correctAnswers: true,
        questionsAnswered: true,
      },
    });

    // Get available achievements
    const achievements = await db.achievement.findMany({
      where: {
        category: "quiz",
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
      const requirements = achievement.requirements as AchievementRequirements;
      let unlocked = false;

      if (requirements.totalQuizzes && quizStats._count.id >= requirements.totalQuizzes) {
        unlocked = true;
      }

      if (requirements.totalCorrectAnswers && 
          quizStats._sum.correctAnswers &&
          quizStats._sum.correctAnswers >= requirements.totalCorrectAnswers) {
        unlocked = true;
      }

      if (unlocked) {
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