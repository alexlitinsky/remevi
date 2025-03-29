import { Trophy, Timer, Brain, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { motion } from "framer-motion"
import ReactConfetti from "react-confetti"
import { useEffect, useState } from "react"

interface DeckCompletionScreenProps {
  totalPoints: number
  onRestartDeck: () => void
  onSeePerformance: () => void
  onReturnToDashboard: () => void
  onReturnToHome: () => void
  sessionTime: number
  pointsEarned: number
  cardsReviewed: number
}

export function DeckCompletionScreen({
  totalPoints,
  onRestartDeck,
  onSeePerformance,
  onReturnToDashboard,
  onReturnToHome,
  sessionTime,
  pointsEarned,
  cardsReviewed,
}: DeckCompletionScreenProps) {
  const [windowSize, setWindowSize] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 0,
    height: typeof window !== 'undefined' ? window.innerHeight : 0
  });
  const [showConfetti, setShowConfetti] = useState(true);

  useEffect(() => {
    const handleResize = () => {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight
      });
    };

    window.addEventListener('resize', handleResize);
    
    // Stop confetti after 5 seconds
    const timer = setTimeout(() => setShowConfetti(false), 5000);

    return () => {
      window.removeEventListener('resize', handleResize);
      clearTimeout(timer);
    };
  }, []);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}m ${secs}s`
  }

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2
      }
    }
  };

  const item = {
    hidden: { y: 20, opacity: 0 },
    show: { y: 0, opacity: 1 }
  };

  return (
    <>
      {showConfetti && (
        <ReactConfetti
          width={windowSize.width}
          height={windowSize.height}
          recycle={false}
          numberOfPieces={300}
          gravity={0.1}
          colors={['#F3F4F6', '#3B82F6', '#60A5FA', '#93C5FD', '#DBEAFE']}
        />
      )}
      
      <div className="h-screen bg-background flex items-center justify-center p-4">
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="w-full max-w-2xl p-8 border-2 border-blue-500/20 rounded-xl bg-card shadow-xl"
        >
          <motion.div variants={item} className="text-center mb-8">
            <div className="w-20 h-20 mx-auto rounded-full bg-blue-500/20 flex items-center justify-center mb-4">
              <Trophy className="h-10 w-10 text-blue-500" />
            </div>
            <h1 className="text-3xl font-bold mb-2">Session Complete!</h1>
            <p className="text-muted-foreground">Great job! You've completed this study session.</p>
          </motion.div>
          
          <motion.div variants={item} className="grid grid-cols-3 gap-4 mb-8">
            <div className="p-4 rounded-lg bg-muted/50 text-center">
              <div className="flex justify-center mb-2">
                <Brain className="h-6 w-6 text-purple-500" />
              </div>
              <p className="text-sm text-muted-foreground mb-1">Cards Reviewed</p>
              <p className="text-2xl font-semibold">{cardsReviewed}</p>
            </div>
            
            <div className="p-4 rounded-lg bg-muted/50 text-center">
              <div className="flex justify-center mb-2">
                <Sparkles className="h-6 w-6 text-amber-500" />
              </div>
              <p className="text-sm text-muted-foreground mb-1">Points Earned</p>
              <p className="text-2xl font-semibold">{pointsEarned}</p>
            </div>
            
            <div className="p-4 rounded-lg bg-muted/50 text-center">
              <div className="flex justify-center mb-2">
                <Timer className="h-6 w-6 text-emerald-500" />
              </div>
              <p className="text-sm text-muted-foreground mb-1">Time Spent</p>
              <p className="text-2xl font-semibold">{formatTime(sessionTime)}</p>
            </div>
          </motion.div>
          
          <motion.div variants={item} className="space-y-3">
            <Button 
              onClick={onRestartDeck}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2"
            >
              Study Again
            </Button>
            
            <Button 
              onClick={onSeePerformance}
              variant="outline"
              className="w-full border-blue-500/30 text-blue-500 hover:bg-blue-500/10 py-2"
            >
              See Performance
            </Button>
            
            <Button 
              onClick={onReturnToDashboard}
              variant="ghost"
              className="w-full hover:bg-muted py-2"
            >
              Return to Deck
            </Button>

            <Button 
              onClick={onReturnToHome}
              variant="ghost"
              className="w-full text-muted-foreground py-2"
            >
              Return to Home
            </Button>
          </motion.div>
        </motion.div>
      </div>
    </>
  );
} 