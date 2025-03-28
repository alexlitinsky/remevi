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
  totalCardCount: number
  currentCardIndex: number
  originalNewCount: number
  originalDueCount: number
  streak: number
  pointsEarned: number
  sessionTime: number
  progress: number
}

const ProgressBar = memo(({ 
  progress
}: { 
  progress: number
}) => {
  return (
    <div className="w-full mt-4">
      <div className="w-full bg-zinc-800 rounded-full h-2.5 mb-1 overflow-hidden">
        <motion.div 
          className="bg-blue-500 h-2.5 rounded-full relative overflow-hidden"
          initial={{ width: 0 }}
          animate={{ width: `${progress * 100}%` }}
          transition={{ duration: 0.5, ease: "easeInOut" }}
        >
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
    </div>
  )
});
ProgressBar.displayName = 'ProgressBar';

export function StudyDeckHeader({
  title,
  deckId,
  newCardCount,
  dueCardCount,
  currentCardIndex,
  originalNewCount,
  originalDueCount,
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
            <Button variant="ghost" className="px-0 font-bold text-xl hover:bg-transparent hover:text-primary">
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
            <Badge variant="outline" className="bg-blue-500/10 text-blue-500 border-blue-500/20">
              {currentCardIndex + 1} / {newCardCount + dueCardCount}
            </Badge>

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