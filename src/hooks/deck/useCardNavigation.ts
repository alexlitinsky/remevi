import { useState } from 'react';

export function useCardNavigation() {
  const [showBack, setShowBack] = useState(false);
  const [pointsEarned, setPointsEarned] = useState<number | null>(null);

  const flipCard = () => {
    setShowBack(!showBack);
  };

  const moveToNextCard = (currentIndex: number, maxIndex: number, onMove: (index: number) => void) => {
    if (currentIndex < maxIndex - 1) {
      onMove(currentIndex + 1);
      setShowBack(false);
      setPointsEarned(null);
    }
  };

  const moveToPrevCard = (currentIndex: number, onMove: (index: number) => void) => {
    if (currentIndex > 0) {
      onMove(currentIndex - 1);
      setShowBack(false);
      setPointsEarned(null);
    }
  };

  return {
    showBack,
    setShowBack,
    pointsEarned,
    setPointsEarned,
    flipCard,
    moveToNextCard,
    moveToPrevCard
  };
} 