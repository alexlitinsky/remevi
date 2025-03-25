import { Trophy, Zap, BarChart } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { motion } from "framer-motion"

interface DeckCompletionScreenProps {
  totalPoints: number
  onRestartDeck: () => void
  onSeePerformance: () => void
  onReturnToDashboard: () => void
  sessionTime: number
  pointsEarned: number
  cardsReviewed: number
}

export function DeckCompletionScreen({
  totalPoints,
  onRestartDeck,
  onSeePerformance,
  onReturnToDashboard,
  sessionTime,
  pointsEarned,
  cardsReviewed,
}: DeckCompletionScreenProps) {
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}m ${secs}s`
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-background/80 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="max-w-md w-full"
      >
        <Card className="border-2 border-primary/10 shadow-xl bg-card/90 backdrop-blur-sm overflow-hidden">
          <div className="h-2 w-full bg-gradient-to-r from-green-500 via-blue-500 to-purple-500"></div>

          <div className="p-8 text-center">
            <div className="mb-6">
              <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                <Trophy className="h-10 w-10 text-primary" />
              </div>
            </div>

            <h2 className="text-2xl font-bold mb-2">Session Complete!</h2>
            <p className="text-muted-foreground mb-8">Great job! You've completed your study session.</p>

            <div className="grid grid-cols-2 gap-4 mb-8">
              <div className="bg-muted/30 rounded-lg p-4">
                <div className="text-sm text-muted-foreground mb-1">Cards Reviewed</div>
                <div className="text-2xl font-bold">{cardsReviewed}</div>
              </div>

              <div className="bg-muted/30 rounded-lg p-4">
                <div className="text-sm text-muted-foreground mb-1">Points Earned</div>
                <div className="text-2xl font-bold text-yellow-500">+{pointsEarned}</div>
              </div>

              <div className="bg-muted/30 rounded-lg p-4">
                <div className="text-sm text-muted-foreground mb-1">Session Time</div>
                <div className="text-2xl font-bold">{formatTime(sessionTime)}</div>
              </div>

              <div className="bg-muted/30 rounded-lg p-4">
                <div className="text-sm text-muted-foreground mb-1">Total Points</div>
                <div className="text-2xl font-bold">{totalPoints}</div>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <Button onClick={onRestartDeck} className="gap-2">
                <Zap className="h-4 w-4" />
                Study Again
              </Button>

              <Button variant="outline" onClick={onSeePerformance} className="gap-2">
                <BarChart className="h-4 w-4" />
                See Performance
              </Button>

              <Button variant="ghost" onClick={onReturnToDashboard}>
                Return to Dashboard
              </Button>
            </div>
          </div>
        </Card>
      </motion.div>
    </div>
  )
} 