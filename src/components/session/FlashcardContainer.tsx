import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Flashcard } from '@/components/ui/flashcard';
import { StudyControls } from '@/components/session/StudyControls';
import { type Difficulty } from '@/lib/srs';
import { type FlashcardData } from '@/hooks/deck/types';

interface FlashcardContainerProps {
  cards: FlashcardData[];
  currentCardIndex: number;
  showBack: boolean;
  pointsEarned: number | null;
  onFlip: () => void;
  onRate: (difficulty: Difficulty, responseTime: number) => void;
  onNext?: () => void;
  onPrev?: () => void;
}

export function FlashcardContainer({
  cards,
  currentCardIndex,
  showBack,
  pointsEarned,
  onFlip,
  onRate,
  onNext,
  onPrev
}: FlashcardContainerProps) {
  const [startTime, setStartTime] = useState(Date.now());

  // Reset start time when card changes or flips
  useEffect(() => {
    setStartTime(Date.now());
  }, [currentCardIndex, showBack]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Space or Enter to flip card
    if ((e.key === ' ' || e.key === 'Enter')) {
      onFlip();
    }
    // Number keys for rating (only when card is flipped)
    if (showBack) {
      if (e.key === 'q') {
        const responseTime = Date.now() - startTime;
        onRate('hard', responseTime);
      } else if (e.key === 'w') {
        const responseTime = Date.now() - startTime;
        onRate('medium', responseTime);
      } else if (e.key === 'e') {
        const responseTime = Date.now() - startTime;
        onRate('easy', responseTime);
      }
    }
  }, [onFlip, onRate, showBack, startTime]);

  // Add and remove keyboard event listener
  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);

  if (!cards.length || currentCardIndex >= cards.length) {
    return null;
  }

  const currentCard = cards[currentCardIndex];
  
  return (
    <div className="w-full max-w-4xl flex flex-col items-center">
      <AnimatePresence mode="wait">
        <motion.div
          key={`card-container-${currentCardIndex}-${currentCard.id}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }} 
          className="w-full"
        >
          <Flashcard
            key={`card-${currentCardIndex}-${currentCard.id}`}
            front={currentCard.front}
            back={currentCard.back}
            showBack={showBack}
            onFlip={onFlip}
            pointsEarned={pointsEarned}
            onNext={onNext}
            onPrev={onPrev}
            progress={cards.length > 1 
              ? currentCardIndex / (cards.length) 
              : 1}
            totalCards={cards.length}
            currentCardIndex={currentCardIndex}
          />
        </motion.div>
      </AnimatePresence>

      <StudyControls
        showBack={showBack}
        onFlip={onFlip}
        onRate={onRate}
        startTime={startTime}
      />
    </div>
  );
}
