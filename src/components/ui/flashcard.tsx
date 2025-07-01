import React, { useState, useEffect, memo } from "react"
import { cn } from "@/lib/utils"
import { Card, CardContent } from "./card"
import { motion, AnimatePresence } from "framer-motion"

interface FlashcardProps {
  front: string
  back: string
  showBack: boolean
  onFlip: () => void
  onNext?: () => void
  onPrev?: () => void
  className?: string
  pointsEarned?: number | null
  progress?: number
  totalCards?: number
  currentCardIndex?: number
}

// Memoize the card sides to prevent unnecessary re-renders
const CardFront = memo(({ content, onClick }: { content: string, onClick: () => void }) => (
  <Card
    className="absolute w-full h-full backface-hidden cursor-pointer bg-card"
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
    className="absolute w-full h-full backface-hidden cursor-pointer rotate-y-180 bg-card"
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
  className,
  pointsEarned = null,
}: FlashcardProps) {
  const [showPoints, setShowPoints] = useState(false);
  const [earnedPoints, setEarnedPoints] = useState(0);

  // Optimize points animation effect
  useEffect(() => {
    if (pointsEarned !== null) {
      setEarnedPoints(pointsEarned);
      setShowPoints(true);
      
      const timer = setTimeout(() => {
        setShowPoints(false);
      }, 500); // Even faster animation
      
      return () => clearTimeout(timer);
    }
  }, [pointsEarned]);

  return (
    <div className={cn("relative w-full max-w-2xl mx-auto", className)}>
      {/* Points animation with improved positioning and styling */}
      <AnimatePresence>
        {showPoints && (
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="absolute -top-2 right-0 transform -translate-y-full 
                       bg-green-500/10 backdrop-blur-sm border border-green-500/20 
                       px-3 py-1.5 rounded-full
                       text-lg font-medium text-green-500
                       z-50 pointer-events-none
                       flex items-center gap-1.5"
          >
            <svg 
              viewBox="0 0 24 24" 
              className="w-4 h-4 animate-bounce"
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2"
            >
              <path d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
            +{earnedPoints}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="relative min-h-[300px] perspective-1000">
        <div
          style={{
            position: 'relative',
            width: '100%',
            height: '100%',
            transition: 'transform 300ms',
            transformStyle: 'preserve-3d',
            transform: showBack ? 'rotateY(180deg) translateZ(0)' : 'rotateY(0deg) translateZ(0)',
            backfaceVisibility: 'hidden'
          }}
        >
          {/* Use memoized components */}
          <CardFront content={front} onClick={onFlip} />
          <CardBack content={back} onClick={onFlip} />
        </div>
      </div>
    </div>
  );
}