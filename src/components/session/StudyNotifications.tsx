import { XCircle, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { motion } from "framer-motion"
import { JSX } from "react"

interface Achievement {
  id: string
  name: string
  description: string
  icon: JSX.Element
  unlocked: boolean
}

interface AchievementBannerProps {
  achievement: Achievement
  onClose: () => void
}

export function AchievementBanner({ achievement, onClose }: AchievementBannerProps) {
  return (
    <motion.div
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: -100, opacity: 0 }}
      className="fixed top-4 left-1/2 -translate-x-1/2 z-50 max-w-md w-full"
    >
      <Card className="border-2 border-primary/10 shadow-xl bg-card/90 backdrop-blur-sm overflow-hidden">
        <div className="h-1 w-full bg-gradient-to-r from-yellow-500 to-orange-500"></div>
        <div className="p-4 flex items-center gap-3">
          <div className="rounded-full bg-yellow-500/10 p-2">{achievement.icon}</div>
          <div className="flex-1">
            <h3 className="font-medium text-sm">Achievement Unlocked!</h3>
            <p className="text-base font-bold">{achievement.name}</p>
            <p className="text-xs text-muted-foreground">{achievement.description}</p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
            <XCircle className="h-4 w-4" />
          </Button>
        </div>
      </Card>
    </motion.div>
  )
}

interface MotivationalMessageProps {
  message: string
}

export function MotivationalMessage({ message }: MotivationalMessageProps) {
  return (
    <div className="fixed bottom-6 left-6 max-w-xs">
      <Card className="border border-primary/10 bg-card/90 backdrop-blur-sm p-4">
        <div className="flex items-center gap-3">
          <div className="rounded-full bg-primary/10 p-2">
            <Sparkles className="h-4 w-4 text-primary" />
          </div>
          <p className="text-sm">{message}</p>
        </div>
      </Card>
    </div>
  )
} 