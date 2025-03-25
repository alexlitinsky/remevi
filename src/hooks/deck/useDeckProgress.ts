import { useState, useEffect } from 'react';
import type { StudyProgress } from './types';

export function useDeckProgress(deckId: string) {
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [totalPoints, setTotalPoints] = useState(0);
  const [completedCardIds, setCompletedCardIds] = useState<string[]>([]);

  // Load progress from localStorage on mount
  useEffect(() => {
    const savedProgress = localStorage.getItem(`deck-${deckId}-progress`);
    if (savedProgress) {
      const { points, completed } = JSON.parse(savedProgress);
      setTotalPoints(points);
      setCompletedCardIds(completed);
    }
  }, [deckId]);

  // Save progress to localStorage when it changes
  useEffect(() => {
    localStorage.setItem(`deck-${deckId}-progress`, JSON.stringify({
      points: totalPoints,
      completed: completedCardIds
    }));
  }, [deckId, totalPoints, completedCardIds]);

  const clearProgress = () => {
    setCurrentCardIndex(0);
    setTotalPoints(0);
    setCompletedCardIds([]);
    localStorage.removeItem(`deck-${deckId}-progress`);
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