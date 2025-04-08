import { motion, AnimatePresence } from "framer-motion"
import { ArrowBigUp, Brain, CornerDownRight } from "lucide-react"
import { Card } from "@/types/index"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { useState, useEffect } from "react"
import { Button } from "../ui/button"

interface FlashcardProps {
  card: Card
  isFlipped: boolean
  showHint?: boolean
  isActive: boolean
  pointsEarned?: number | null
}

export function Flashcard({
  card,
  isFlipped,
  showHint = false,
  isActive,
  pointsEarned = null
}: FlashcardProps) {
  const [showFullHint, setShowFullHint] = useState(false)
  const [showPoints, setShowPoints] = useState(false);
  const [earnedPoints, setEarnedPoints] = useState(0);
  
  // Handle different content types (markdown, html, etc.)
  const renderContent = (content: string) => {
    // For now, simple HTML rendering. Can be extended with markdown or other formats
    return <div dangerouslySetInnerHTML={{ __html: content }} />;
  };
  
  // Effect for points animation
  useEffect(() => {
    if (pointsEarned !== null) {
      setEarnedPoints(pointsEarned);
      setShowPoints(true);
      
      const timer = setTimeout(() => {
        setShowPoints(false);
      }, 1500); // Slightly longer animation to make it more visible
      
      return () => clearTimeout(timer);
    }
  }, [pointsEarned]);
  
  return (
    <div className="relative h-full">
      {/* Points animation */}
      <AnimatePresence>
        {showPoints && (
          <motion.div
            initial={{ opacity: 0, y: -20, x: 50 }}
            animate={{ opacity: 1, y: 0, x: 0 }}
            exit={{ opacity: 0, y: -10, x: -20 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="absolute -top-4 right-8 transform -translate-y-full 
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
      
      <motion.div
        initial={false}
        animate={{ rotateY: isFlipped ? 180 : 0 }}
        transition={{ duration: 0.5, type: "spring", stiffness: 200, damping: 20 }}
        style={{ perspective: 1000 }}
        className="w-full h-full relative preserve-3d"
      >
        {/* Front of card */}
        <motion.div
          className={cn(
            "absolute w-full h-full backface-hidden bg-zinc-800/20 border border-zinc-700/50 rounded-xl p-6 overflow-auto",
            !isFlipped ? "z-10" : "z-0"
          )}
        >
          <div className="flex justify-between items-start">
            <div className="w-full">
              <div className="flex justify-between mb-4">
                <div className="flex gap-2">
                  {card.tags?.map((tag: string, idx: number) => (
                    <Badge key={idx} variant="secondary" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
                {card.deck_id && (
                  <Badge variant="outline" className="text-xs">
                    ID: {card.id?.slice(-4) || "New"}
                  </Badge>
                )}
              </div>
              <div className="prose dark:prose-invert prose-sm sm:prose-base lg:prose-lg max-w-none">
                {renderContent(card.front)}
              </div>
            </div>
          </div>
          
          {showHint && card.hint && (
            <div className="mt-4 pt-4 border-t border-zinc-700/50">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Brain className="h-4 w-4" />
                <h3 className="text-sm font-medium">Hint</h3>
              </div>
              {!showFullHint ? (
                <Button 
                  variant="link" 
                  className="text-xs px-0 text-muted-foreground hover:text-blue-400"
                  onClick={() => setShowFullHint(true)}
                >
                  Show hint
                </Button>
              ) : (
                <div className="text-sm text-muted-foreground mt-2 italic">
                  {card.hint}
                </div>
              )}
            </div>
          )}
          
          {isActive && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="absolute bottom-4 right-4"
            >
              <div className="flex items-center gap-1 text-xs text-muted-foreground bg-zinc-800/70 backdrop-blur-sm px-2 py-1 rounded-md border border-zinc-700/40">
                <ArrowBigUp className="h-3 w-3 -rotate-90" />
                <span>Press space to flip</span>
              </div>
            </motion.div>
          )}
        </motion.div>
        
        {/* Back of card */}
        <motion.div
          className={cn(
            "absolute w-full h-full backface-hidden bg-zinc-800/30 border border-zinc-700/50 rounded-xl p-6 rotateY-180 overflow-auto",
            isFlipped ? "z-10" : "z-0"
          )}
        >
          <div className="flex flex-col h-full">
            <div className="flex justify-between mb-4">
              <div className="flex gap-2">
                {card.tags?.map((tag: string, idx: number) => (
                  <Badge key={idx} variant="secondary" className="text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>
              {card.deck_id && (
                <Badge variant="outline" className="text-xs">
                  ID: {card.id?.slice(-4) || "New"}
                </Badge>
              )}
            </div>
            
            <div className="bg-zinc-900/50 p-3 rounded-md mb-4 border border-zinc-800/50">
              <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
                <CornerDownRight className="h-3 w-3" />
                <span className="font-medium">Question</span>
              </div>
              <div className="prose dark:prose-invert prose-sm max-w-none opacity-80">
                {renderContent(card.front)}
              </div>
            </div>
            
            <div className="flex-1">
              <div className="prose dark:prose-invert prose-sm sm:prose-base lg:prose-lg max-w-none">
                {renderContent(card.back)}
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
} 