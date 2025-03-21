import { useState, useEffect } from 'react';
import type { StudyProgress } from './types';

export function useDeckProgress(deckId: string) {
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [totalPoints, setTotalPoints] = useState(0);
  const [completedCardIds, setCompletedCardIds] = useState<string[]>([]);

  // Load study progress from local storage
  useEffect(() => {
    if (!deckId) return;
    
    const savedProgress = localStorage.getItem(`study-progress-${deckId}`);
    if (savedProgress) {
      try {
        const { currentIndex, totalPointsEarned, completedCardIds } = JSON.parse(savedProgress);
        setCurrentCardIndex(currentIndex || 0);
        setTotalPoints(totalPointsEarned || 0);
        setCompletedCardIds(completedCardIds || []);
      } catch (error) {
        console.error('Error parsing saved progress:', error);
        localStorage.removeItem(`study-progress-${deckId}`);
      }
    }
  }, [deckId]);

  // Save progress to localStorage whenever it changes
  useEffect(() => {
    // Only save if we have made some progress
    if (currentCardIndex > 0 || totalPoints > 0) {
      localStorage.setItem(`study-progress-${deckId}`, JSON.stringify({
        currentIndex: currentCardIndex,
        totalPointsEarned: totalPoints,
        completedCardIds,
        lastStudied: new Date().toISOString()
      }));
    }
  }, [currentCardIndex, deckId, totalPoints, completedCardIds]);

  const clearProgress = () => {
    localStorage.removeItem(`study-progress-${deckId}`);
  };

  return {
    currentCardIndex,
    setCurrentCardIndex,
    totalPoints,
    setTotalPoints,
    completedCardIds,
    setCompletedCardIds,
    clearProgress
  };
} 