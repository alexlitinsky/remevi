import React, { useState, useEffect, useCallback, memo } from "react"
import { cn } from "@/lib/utils"
import { Card, CardContent } from "./card"
import { Button } from "./button"
import { ChevronLeft, ChevronRight } from "lucide-react"
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

// Memoize the navigation buttons
const NavigationButtons = memo(({ onPrev, onNext }: { onPrev?: () => void, onNext?: () => void }) => (
  <div className="flex justify-between">
    {onPrev && (
      <Button
        variant="outline"
        size="icon"
        onClick={(e) => {
          e.stopPropagation();
          onPrev();
        }}
        className="hover:bg-zinc-800 hover:text-white transition-colors"
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>
    )}
    {onNext && (
      <Button
        variant="outline"
        size="icon"
        onClick={(e) => {
          e.stopPropagation();
          onNext();
        }}
        className="ml-auto hover:bg-zinc-800 hover:text-white transition-colors"
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    )}
  </div>
));
NavigationButtons.displayName = 'NavigationButtons';

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
        <NavigationButtons onPrev={onPrev} onNext={onNext} />
      </div>
    </div>
  );
} 