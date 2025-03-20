import React, { useState, useEffect, useCallback, memo } from "react"
import { cn } from "@/lib/utils"
import { Card, CardContent } from "./card"
import { Button } from "./button"
import { motion, AnimatePresence } from "framer-motion"
import { type Difficulty } from "@/lib/srs"

interface FlashcardProps {
  front: string
  back: string
  showBack: boolean
  onFlip: () => void
  onNext?: () => void
  onPrev?: () => void
  className?: string
  pointsEarned?: number | null
  progress?: number // Add progress prop (0-1)
  totalCards?: number
  currentCardIndex?: number
}

// Memoize the card sides to prevent unnecessary re-renders
const CardFront = memo(({ content, onClick }: { content: string, onClick: () => void }) => (
  <Card
    className="absolute w-full h-full backface-hidden cursor-pointer"
    onClick={onClick}
  >
    <CardContent className="flex items-center justify-center p-8 text-center min-h-[300px]">
      <div className="text-lg">{content}</div>
    </CardContent>
  </Card>
));
CardFront.displayName = 'CardFront';

const CardBack = memo(({ content, onClick }: { content: string, onClick: () => void }) => (
  <Card
    className="absolute w-full h-full backface-hidden cursor-pointer rotate-y-180"
    onClick={onClick}
  >
    <CardContent className="flex items-center justify-center p-8 text-center min-h-[300px]">
      <div className="text-lg">{content}</div>
    </CardContent>
  </Card>
));
CardBack.displayName = 'CardBack';

// Progress bar component
const ProgressBar = memo(({ 
  progress, 
  totalCards,
  currentCardIndex
}: { 
  progress: number, 
  totalCards: number,
  currentCardIndex: number
}) => (
  <div className="w-full">
    <div className="flex justify-between text-xs text-zinc-500 mb-1">
      <span>Card {currentCardIndex + 1} of {totalCards}</span>
      <span>{Math.round(progress * 100)}% complete</span>
    </div>
    <div className="w-full bg-zinc-800 rounded-full h-1.5">
      <div 
        className="bg-blue-600 h-1.5 rounded-full transition-all duration-300 ease-out"
        style={{ width: `${progress * 100}%` }}
      />
    </div>
  </div>
));
ProgressBar.displayName = 'ProgressBar';

export function Flashcard({
  front,
  back,
  showBack,
  onFlip,
  onNext,
  onPrev,
  className,
  pointsEarned = null,
  progress = 0,
  totalCards = 1,
  currentCardIndex = 0,
}: FlashcardProps) {
  const [showPoints, setShowPoints] = useState(false);
  const [earnedPoints, setEarnedPoints] = useState(0);

  // Optimize points animation effect
  useEffect(() => {
    if (pointsEarned !== null) {
      // Set points immediately
      setEarnedPoints(pointsEarned);
      setShowPoints(true);
      
      // Hide points after animation completes
      const timer = setTimeout(() => {
        setShowPoints(false);
      }, 500); // Shorter display time for quicker transition
      
      return () => clearTimeout(timer);
    }
  }, [pointsEarned]);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' && onNext) {
        onNext();
      } else if (e.key === 'ArrowLeft' && onPrev) {
        onPrev();
      } else if (e.key === ' ' || e.key === 'Enter') {
        onFlip();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onNext, onPrev, onFlip]);

  return (
    <div className={cn("relative w-full max-w-2xl mx-auto", className)}>
      {/* Points animation with faster fade out */}
      <AnimatePresence>
        {showPoints && (
          <motion.div
            initial={{ opacity: 0, y: 0 }}
            animate={{ opacity: 1, y: -40 }}
            exit={{ opacity: 0, y: -80 }}
            transition={{ duration: 0.2 }} // Faster animation
            className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-3xl font-bold text-yellow-500 z-50 pointer-events-none"
          >
            +{earnedPoints} points!
          </motion.div>
        )}
      </AnimatePresence>

      <div className="relative min-h-[300px] perspective-1000">
        <div 
          className={cn(
            "relative w-full h-full transition-transform duration-300",
            "transform-style-3d",
            showBack ? "rotate-y-180" : ""
          )}
          style={{ transformStyle: 'preserve-3d' }}
        >
          {/* Use memoized components */}
          <CardFront content={front} onClick={onFlip} />
          <CardBack content={back} onClick={onFlip} />
        </div>
      </div>

      <div className="flex flex-col gap-4 mt-4">
        <ProgressBar 
          progress={progress} 
          totalCards={totalCards}
          currentCardIndex={currentCardIndex}
        />
      </div>
    </div>
  );
}