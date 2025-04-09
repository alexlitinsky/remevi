import { Clock, Flame, Trophy } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { motion } from "framer-motion"
import { memo } from "react"

interface StudyDeckHeaderProps {
  title: string
  deckId: string
  newCardCount: number
  dueCardCount: number
  streak: number
  pointsEarned: number
  sessionTime: number
  progress: number
}

// Progress bar component
const ProgressBar = memo(function ProgressBar({ progress }: { progress: number }) {
  return (
    <div className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden">
      <motion.div 
        className="h-full bg-blue-600 rounded-full"
        initial={{ width: 0 }}
        animate={{ width: `${progress * 100}%` }}
        transition={{ 
          type: "spring", 
          stiffness: 200, 
          damping: 20,
          mass: 1
        }}
      />
    </div>
  );
});

export function StudyDeckHeader({
  title,
  deckId,
  newCardCount,
  dueCardCount,
  streak,
  pointsEarned,
  sessionTime,
  progress,
}: StudyDeckHeaderProps) {

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`
  }

  return (
    <div className="px-6 py-4 border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50">
      <div className="flex flex-col space-y-4">
        <div className="flex items-center justify-between">
          <Link href={`/deck/${deckId}`}>
            <Button variant="ghost" className="px-0 font-bold text-xl hover:bg-transparent cursor-pointer hover:text-primary">
              {title}
            </Button>
          </Link>
          <div className="flex items-center gap-4">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-1.5">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">{formatTime(sessionTime)}</span>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Session time</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-1.5">
                    <Flame className="h-4 w-4 text-orange-500" />
                    <span className="text-sm font-medium">{streak} day streak</span>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Your current study streak</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-1.5">
                    <Trophy className="h-4 w-4 text-yellow-500" />
                    <span className="text-sm font-medium">+{pointsEarned} pts</span>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Points earned this session</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="bg-purple-500/10 text-purple-500 border-purple-500/20">
              {newCardCount} new
            </Badge>

            <Badge variant="outline" className="bg-orange-500/10 text-orange-500 border-orange-500/20">
              {dueCardCount} due
            </Badge>
          </div>
        </div>

        <ProgressBar progress={progress} />
      </div>
    </div>
  )
} 