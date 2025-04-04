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
    <div className="h-screen flex flex-col items-center justify-center bg-background text-foreground p-6">
      {showConfetti && (
        <ReactConfetti
          width={windowSize.width}
          height={windowSize.height}
          recycle={true}
          numberOfPieces={200}
        />
      )}
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="text-center space-y-12 max-w-lg w-full border-2 rounded-xl p-8 bg-zinc-900/50 shadow-xl"
      >
        {/* Title */}
        <motion.div variants={item} className="space-y-2">
          <h1 className="text-4xl font-bold flex items-center justify-center gap-3">
            <Sparkles className="h-8 w-8 text-yellow-500" />
            <span>Deck Completed!</span>
          </h1>
        </motion.div>

        {/* Stats Grid */}
        <motion.div variants={item} className="grid grid-cols-3 gap-4">
          <div className="flex flex-col items-center space-y-2 p-4 rounded-lg border bg-zinc-900/80">
            <Brain className="h-6 w-6 text-primary" />
            <div className="text-2xl font-bold">{cardsReviewed}</div>
            <div className="text-sm text-muted-foreground">Cards Reviewed</div>
          </div>
          
          <div className="flex flex-col items-center space-y-2 p-4 rounded-lg border bg-zinc-900/80">
            <Trophy className="h-6 w-6 text-yellow-500" />
            <div className="text-2xl font-bold">{pointsEarned}</div>
            <div className="text-sm text-muted-foreground">Points Earned</div>
          </div>
          
          <div className="flex flex-col items-center space-y-2 p-4 rounded-lg border bg-zinc-900/80">
            <Timer className="h-6 w-6 text-blue-500" />
            <div className="text-2xl font-bold">{formatTime(sessionTime)}</div>
            <div className="text-sm text-muted-foreground">Study Time</div>
          </div>
        </motion.div>

        {/* Action Buttons */}
        <motion.div variants={item} className="flex flex-col gap-3 w-full max-w-sm mx-auto">
          <Button 
            onClick={onRestartDeck} 
            size="lg"
            className="w-full font-semibold cursor-pointer hover:shadow-md transition-all bg-blue-600 hover:bg-blue-700"
          >
            Study Again
          </Button>
          <Button 
            onClick={onReturnToDashboard} 
            variant="secondary"
            size="lg"
            className="w-full cursor-pointer hover:shadow-md transition-all bg-blue-500/20 hover:bg-blue-500/30 text-blue-400"
          >
            Return to Dashboard
          </Button>
          <Button 
            onClick={onReturnToHome} 
            variant="outline"
            size="lg"
            className="w-full cursor-pointer hover:shadow-md transition-all border-blue-500/50 hover:bg-blue-500/10 text-blue-400"
          >
            Return to Home
          </Button>
        </motion.div>
      </motion.div>
    </div>
  )
} 