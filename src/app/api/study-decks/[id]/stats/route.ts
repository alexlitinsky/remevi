import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const user = await currentUser();
    if (!user?.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }
    
    const url = new URL(req.url);
    const pathParts = url.pathname.split('/');
    const deckId = pathParts[pathParts.length - 2]; // Account for 'stats' at the end
    
    if (!deckId) {
      return new NextResponse("Missing deck ID", { status: 400 });
    }
    
    // Get the study deck with flashcards
    const studyDeck = await db.studyDeck.findUnique({
      where: {
        id: deckId,
        userId: user.id
      },
      include: {
        cardProgress: true
      }
    });
    
    if (!studyDeck) {
      return new NextResponse("Study deck not found", { status: 404 });
    }
    
    // Parse the flashcards from the JSON field
    const flashcards = Array.isArray(studyDeck.flashcards) ? studyDeck.flashcards : [];
    
    // Calculate statistics
    const totalCards = flashcards.length;
    const cardsWithProgress = studyDeck.cardProgress.length;
    const newCards = totalCards - cardsWithProgress;
    
    // Calculate cards due today
    const today = new Date();
    today.setHours(23, 59, 59, 999); // End of today
    
    const dueCards = studyDeck.cardProgress.filter(progress => 
      new Date(progress.dueDate) <= today
    ).length;
    
    // Calculate average streak and ease factor
    let totalStreak = 0;
    let totalEaseFactor = 0;
    let totalResponseTime = 0;
    let countWithResponseTime = 0;
    
    studyDeck.cardProgress.forEach(progress => {
      totalStreak += progress.streak;
      totalEaseFactor += progress.easeFactor;
      
      if (progress.responseTime) {
        totalResponseTime += progress.responseTime;
        countWithResponseTime++;
      }
    });
    
    const averageStreak = cardsWithProgress > 0 ? totalStreak / cardsWithProgress : 0;
    const averageEaseFactor = cardsWithProgress > 0 ? totalEaseFactor / cardsWithProgress : 2.5;
    const averageResponseTime = countWithResponseTime > 0 ? totalResponseTime / countWithResponseTime : 0;
    
    // Calculate total points earned
    const totalPoints = studyDeck.cardProgress.reduce((sum, progress) => sum + progress.totalPoints, 0);
    
    // Calculate review history (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const reviewHistory = studyDeck.cardProgress
      .filter(progress => progress.lastReviewed && new Date(progress.lastReviewed) >= thirtyDaysAgo)
      .map(progress => ({
        date: progress.lastReviewed,
        difficulty: progress.difficulty
      }));
    
    // Group reviews by date
    interface ReviewsByDateEntry {
      total: number;
      easy: number;
      medium: number;
      hard: number;
      [key: string]: number;
    }
    
    const reviewsByDate: Record<string, ReviewsByDateEntry> = {};
    
    reviewHistory.forEach(review => {
      if (!review.date) return;
      
      const date = new Date(review.date).toISOString().split('T')[0];
      if (!reviewsByDate[date]) {
        reviewsByDate[date] = { total: 0, easy: 0, medium: 0, hard: 0 };
      }
      reviewsByDate[date].total++;
      
      const difficulty = review.difficulty || 'medium';
      if (difficulty === 'easy' || difficulty === 'medium' || difficulty === 'hard') {
        reviewsByDate[date][difficulty]++;
      }
    });
    
    return NextResponse.json({
      deckId,
      deckTitle: studyDeck.title,
      totalCards,
      cardsWithProgress,
      newCards,
      dueCards,
      averageStreak,
      averageEaseFactor,
      averageResponseTime,
      totalPoints,
      reviewsByDate
    });
  } catch (error) {
    console.error("Error fetching deck statistics:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
