import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Flashcard } from '@/components/ui/flashcard';
import { StudyControls } from '@/components/session-v2/StudyControls';
import { type Difficulty } from '@/lib/srs';
import { type FlashcardData } from '@/stores/useStudySessionStore';

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
    e.preventDefault();
    // Space or Enter to flip card
    if ((e.key === ' ' || e.key === 'Enter')) {
      e.preventDefault(); // Prevent page scroll on space
      onFlip();
    }
    // Number keys for rating (only when card is flipped)
    if (showBack) {
      const responseTime = Date.now() - startTime;
      if (e.key === '1') {
        onRate('again', responseTime);
      } else if (e.key === '2') {
        onRate('hard', responseTime);
      } else if (e.key === '3') {
        onRate('good', responseTime);
      } else if (e.key === '4') {
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
  const progress = cards.length > 0 ? currentCardIndex / cards.length : 0;
  
  return (
    <div className="w-full max-w-4xl flex flex-col items-center">
      <AnimatePresence mode="wait">
        <motion.div
          key={`card-container-${currentCardIndex}-${currentCard.id}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }} 
          className="w-full mb-8"
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
            progress={progress}
            totalCards={cards.length}
            currentCardIndex={currentCardIndex}
            className="shadow-xl"
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