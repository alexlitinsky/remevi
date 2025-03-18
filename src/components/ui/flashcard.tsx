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
  onRate?: (difficulty: Difficulty, responseTime: number) => void
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

// Memoize the rating buttons
const RatingButtons = memo(({ onRate }: { onRate: (difficulty: Difficulty) => void }) => (
  <div className="flex justify-center gap-2">
    <Button
      variant="destructive"
      onClick={() => onRate('hard')}
      className="w-24 hover:bg-red-700 transition-colors"
    >
      Hard
    </Button>
    <Button
      variant="secondary"
      onClick={() => onRate('medium')}
      className="w-24 hover:bg-zinc-600 transition-colors"
    >
      Medium
    </Button>
    <Button
      variant="default"
      onClick={() => onRate('easy')}
      className="w-24 hover:bg-green-700 transition-colors"
    >
      Easy
    </Button>
  </div>
));
RatingButtons.displayName = 'RatingButtons';

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
  <div className="w-full mt-4">
    <div className="w-full bg-zinc-800 rounded-full h-2.5 mb-1 overflow-hidden">
      <motion.div 
        className="bg-blue-500 h-2.5 rounded-full relative overflow-hidden"
        initial={{ width: 0 }}
        animate={{ width: `${progress * 100}%` }}
        transition={{ duration: 0.5, ease: "easeInOut" }}
      >
        {/* Animated gradient overlay */}
        <motion.div
          className="absolute inset-0 w-full h-full"
          style={{
            background: "linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.15) 50%, rgba(255,255,255,0) 100%)",
            backgroundSize: "200% 100%",
          }}
          animate={{
            backgroundPosition: ["0% 0%", "100% 0%", "0% 0%"],
          }}
          transition={{
            duration: 2,
            ease: "linear",
            repeat: Infinity,
          }}
        />
        
        {/* Pulsing effect */}
        <motion.div
          className="absolute inset-0 w-full h-full bg-blue-400 opacity-0"
          animate={{
            opacity: [0, 0.2, 0],
          }}
          transition={{
            duration: 1.5,
            ease: "easeInOut",
            repeat: Infinity,
          }}
        />
      </motion.div>
    </div>
    <div className="text-center text-xs text-zinc-400">
      {currentCardIndex + 1} of {totalCards}
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
  onRate,
  className,
  pointsEarned = null,
  progress = 0,
  totalCards = 1,
  currentCardIndex = 0,
}: FlashcardProps) {
  const [startTime, setStartTime] = useState<number | null>(null);
  const [showPoints, setShowPoints] = useState(false);
  const [earnedPoints, setEarnedPoints] = useState(0);

  // Use useEffect with a cleanup function to track when the card is flipped
  useEffect(() => {
    if (showBack && !startTime) {
      setStartTime(Date.now());
    }
    
    // Cleanup function to reset startTime when component unmounts
    return () => {
      if (startTime) setStartTime(null);
    };
  }, [showBack, startTime]);

  // Optimize points animation effect
  useEffect(() => {
    if (pointsEarned !== null) {
      // Batch state updates to reduce renders
      setEarnedPoints(pointsEarned);
      setShowPoints(true);
      
      const timer = setTimeout(() => {
        setShowPoints(false);
      }, 1500);
      
      return () => clearTimeout(timer);
    }
  }, [pointsEarned]);

  // Memoize the rate handler to prevent recreation on each render
  const handleRate = useCallback((difficulty: Difficulty) => {
    if (!startTime || !onRate) return;
    
    const responseTime = Date.now() - startTime;
    
    // Call the parent's onRate function
    onRate(difficulty, responseTime);
    
    // Reset startTime immediately to prevent multiple calls
    setStartTime(null);
  }, [startTime, onRate]);

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
      {/* Points animation - only render when needed */}
      <AnimatePresence>
        {showPoints && (
          <motion.div
            initial={{ opacity: 0, y: 0 }}
            animate={{ opacity: 1, y: -40 }}
            exit={{ opacity: 0, y: -80 }}
            transition={{ duration: 0.3 }} // Optimize animation duration
            className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-3xl font-bold text-yellow-500 z-50 pointer-events-none"
          >
            +{earnedPoints} points!
          </motion.div>
        )}
      </AnimatePresence>

      <div className="relative min-h-[300px] perspective-1000">
        <div 
          className={cn(
            "relative w-full h-full transition-transform duration-600",
            "transform-style-3d",
            showBack ? "rotate-y-180" : ""
          )}
        >
          {/* Use memoized components */}
          <CardFront content={front} onClick={onFlip} />
          <CardBack content={back} onClick={onFlip} />
        </div>
      </div>

      <div className="flex flex-col gap-4 mt-4">
        {showBack && <RatingButtons onRate={handleRate} />}
        <ProgressBar 
          progress={progress} 
          totalCards={totalCards}
          currentCardIndex={currentCardIndex}
        />
      </div>
    </div>
  );
}