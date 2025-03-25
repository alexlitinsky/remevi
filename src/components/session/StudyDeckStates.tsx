import { XCircle, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { motion } from "framer-motion"

export function LoadingState({ message = "Loading your study session..." }: { message?: string }) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-background/80 flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        <p className="text-muted-foreground animate-pulse">{message}</p>
      </div>
    </div>
  )
}

export function ErrorState({ onReturnToDashboard }: { onReturnToDashboard: () => void }) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-background/80 flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center">
        <div className="mb-6">
          <div className="w-20 h-20 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
            <XCircle className="h-10 w-10 text-destructive" />
          </div>
        </div>

        <h2 className="text-2xl font-bold mb-2">Oops! Something went wrong</h2>
        <p className="text-muted-foreground mb-8">We couldn&apos;t load your study session. Please try again later.</p>

        <Button onClick={onReturnToDashboard}>Return to Dashboard</Button>
      </div>
    </div>
  )
}

export function ProcessingState() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-background/80 flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center">
        <div className="mb-6">
          <div className="w-20 h-20 rounded-full bg-yellow-500/10 flex items-center justify-center mx-auto">
            <Sparkles className="h-10 w-10 text-yellow-500" />
          </div>
        </div>

        <h2 className="text-2xl font-bold mb-2">Processing Your Deck</h2>
        <p className="text-muted-foreground mb-8">
          We&apos;re analyzing your content and creating flashcards. This may take a few minutes.
        </p>

        <div className="w-full h-2 bg-muted rounded-full overflow-hidden mb-4">
          <motion.div
            className="h-full bg-yellow-500"
            initial={{ width: "0%" }}
            animate={{ width: "90%" }}
            transition={{ duration: 20, ease: "linear" }}
          />
        </div>

        <p className="text-sm text-muted-foreground">This usually takes 2-3 minutes</p>
      </div>
    </div>
  )
} 