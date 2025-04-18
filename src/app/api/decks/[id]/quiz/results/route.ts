import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const user = await currentUser();
    if (!user?.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }
    
    // Extract deck ID from URL
    const url = new URL(req.url);
    const pathParts = url.pathname.split('/');
    const deckId = pathParts[3]; // Index 3 contains the deck ID
    
    
    const sessionId = url.searchParams.get('sessionId');
    
    
    // Get the most recent quiz session for this deck if sessionId not provided
    let session;
    if (sessionId) {
      session = await db.quizSession.findFirst({
        where: {
          id: sessionId,
          userId: user.id,
          deckId: deckId,
        },
        orderBy: [
          { startTime: 'desc' }
        ]
      });
      
      if (!session) {
        return new NextResponse("Session not found", { status: 404 });
      }
    } else {
      // Get the most recent completed session
      session = await db.quizSession.findFirst({
        where: {
          userId: user.id,
          deckId: deckId,
          endTime: { not: null }
        },
        orderBy: [
          { startTime: 'desc' }
        ]
      });
      
      if (!session) {
        return new NextResponse("No completed sessions found", { status: 404 });
      }
    }
    
    
    // Get all answers for this session with their questions
    const answers = await db.quizAnswer.findMany({
      where: {
        quizSessionId: session.id
      },
      include: {
        studyContent: {
          include: {
            mcqContent: true,
            frqContent: true
          }
        }
      },
      orderBy: [
        { id: 'asc' }
      ]
    });
    
    
    // Get all study content for this deck (to know total possible questions)
    const deckContent = await db.deckContent.findMany({
      where: {
        deckId: deckId
      },
      select: {
        studyContentId: true
      }
    });
    
    const totalPossibleQuestions = deckContent.length;
    
    // Calculate stats
    const correctAnswers = answers.filter(a => a.isCorrect).length;
    const incorrectAnswers = answers.length - correctAnswers;
    const accuracy = answers.length > 0 ? (correctAnswers / answers.length) * 100 : 0;
    
    // Safe access to timeTaken, handling null values
    const averageTimePerQuestion = answers.length > 0 
      ? answers.reduce((sum, a) => sum + (a.timeTaken || 0), 0) / answers.length 
      : 0;
    
    // Format answers for response
    const formattedAnswers = answers.map((answer, index) => {
      // Determine the question text and correct answer
      let question = "";
      let correctAnswer = "";
      
      if (answer.studyContent.type === "mcq" && answer.studyContent.mcqContent) {
        const mcq = answer.studyContent.mcqContent;
        question = mcq.question as string;
        const options = mcq.options as string[];
        correctAnswer = options[mcq.correctOptionIndex] || "";
      } else if (answer.studyContent.type === "frq" && answer.studyContent.frqContent) {
        question = answer.studyContent.frqContent.question as string;
        const answers = answer.studyContent.frqContent.answers as string[];
        correctAnswer = answers.join(" OR ");
      }
      
      return {
        id: answer.id,
        questionId: answer.studyContentId,
        question,
        correctAnswer,
        userAnswer: answer.userAnswer,
        isCorrect: answer.isCorrect,
        timeTaken: answer.timeTaken || 0,
        pointsEarned: answer.pointsEarned,
        questionIndex: index,
        type: answer.studyContent.type,
        // Use a default topic since we can't access metadata
        topic: "General"
      };
    });
    
    // Get achievement unlocks during this session by time window
    const userAchievements = await db.userAchievement.findMany({
      where: {
        userId: user.id,
        // Use between filter with the session time range
        unlockedAt: {
          gte: session.startTime,
          lte: session.endTime || new Date()
        }
      }
    });
    
    // Get the actual achievement details
    const achievementIds = userAchievements.map(ua => ua.achievementId);
    const achievementDetails = await db.achievement.findMany({
      where: {
        id: {
          in: achievementIds
        }
      }
    });
    
    // Match user achievements with their details
    const formattedAchievements = userAchievements.map(ua => {
      const details = achievementDetails.find(a => a.id === ua.achievementId);
      return {
        id: ua.achievementId,
        name: details?.name || "Unknown Achievement",
        description: details?.description || "",
        category: details?.category || "general",
        pointsAwarded: details?.pointsAwarded || 0
      };
    });
    
    
    return NextResponse.json({
      sessionId: session.id,
      startTime: session.startTime,
      endTime: session.endTime,
      totalTime: session.totalTime || 0,
      questionsAnswered: answers.length,
      totalPossibleQuestions,
      correctAnswers,
      incorrectAnswers,
      accuracy,
      score: session.pointsEarned || 0,
      averageTimePerQuestion,
      answers: formattedAnswers,
      achievements: formattedAchievements
    });
  } catch (error) {
    console.error("🔴 [quiz/results] Error fetching results:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}