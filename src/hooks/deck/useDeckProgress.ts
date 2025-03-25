import { useState, useEffect } from 'react';

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

  // Safe setter for currentCardIndex that ensures it doesn't exceed bounds
  const setCurrentCardIndexSafe = (index: number | ((prev: number) => number), maxIndex: number) => {
    setCurrentCardIndex(prev => {
      const newIndex = typeof index === 'function' ? index(prev) : index;
      // Ensure index is between 0 and maxIndex
      return Math.max(0, Math.min(newIndex, maxIndex));
    });
  };

  return {
    currentCardIndex,
    setCurrentCardIndex: setCurrentCardIndexSafe,
    totalPoints,
    setTotalPoints,
    completedCardIds,
    setCompletedCardIds,
    clearProgress
  };
} 