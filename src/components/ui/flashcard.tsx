import React, { useState, useEffect } from "react"
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
}

export function Flashcard({
  front,
  back,
  showBack,
  onFlip,
  onNext,
  onPrev,
  onRate,
  className,
}: FlashcardProps) {
  const [startTime, setStartTime] = useState<number | null>(null);
  const [showPoints, setShowPoints] = useState(false);
  const [earnedPoints, setEarnedPoints] = useState(0);

  useEffect(() => {
    if (showBack && !startTime) {
      setStartTime(Date.now());
    }
  }, [showBack]);

  const handleRate = (difficulty: Difficulty) => {
    if (!startTime || !onRate) return;
    
    const responseTime = Date.now() - startTime;
    onRate(difficulty, responseTime);
    setStartTime(null);
  };

  return (
    <div className={cn("relative w-full max-w-2xl mx-auto", className)}>
      <AnimatePresence>
        {showPoints && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: -20 }}
            exit={{ opacity: 0, y: -40 }}
            className="absolute top-0 left-1/2 transform -translate-x-1/2 text-2xl font-bold text-yellow-500"
          >
            +{earnedPoints} points!
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        animate={{ rotateY: showBack ? 180 : 0 }}
        transition={{ duration: 0.6 }}
        style={{ perspective: 1000 }}
      >
        <Card
          className={cn(
            "min-h-[300px] cursor-pointer transition-all duration-500 transform-gpu backface-hidden",
            showBack && "bg-secondary"
          )}
          onClick={onFlip}
        >
          <CardContent className="flex items-center justify-center p-8 text-center min-h-[300px]">
            <div className="text-lg">{showBack ? back : front}</div>
          </CardContent>
        </Card>
      </motion.div>

      <div className="flex flex-col gap-4 mt-4">
        {showBack && (
          <div className="flex justify-center gap-2">
            <Button
              variant="destructive"
              onClick={() => handleRate('hard')}
              className="w-24"
            >
              Hard
            </Button>
            <Button
              variant="secondary"
              onClick={() => handleRate('medium')}
              className="w-24"
            >
              Medium
            </Button>
            <Button
              variant="default"
              onClick={() => handleRate('easy')}
              className="w-24 bg-green-600 hover:bg-green-700"
            >
              Easy
            </Button>
          </div>
        )}

        <div className="flex justify-between">
          {onPrev && (
            <Button
              variant="outline"
              size="icon"
              onClick={(e) => {
                e.stopPropagation();
                onPrev();
              }}
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
              className="ml-auto"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
} 