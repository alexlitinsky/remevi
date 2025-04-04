import { XCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { motion } from "framer-motion"

export function RainbowSpinner() {
  return (
    <div className="relative w-32 h-32">
      {/* Rainbow rings */}
      {[...Array(5)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full border-4 border-transparent"
          style={{
            inset: `${i * 8}px`,
            borderLeftColor: `hsl(${i * 60}, 100%, 50%)`,
            borderTopColor: `hsl(${i * 60 + 30}, 100%, 50%)`,
            transformOrigin: 'center',
          }}
          animate={{
            rotate: [0, 360],
            scale: [1, 1.1, 1],
          }}
          transition={{
            duration: 3 - i * 0.4,
            repeat: Infinity,
            ease: "easeInOut",
            delay: i * 0.1,
          }}
        />
      ))}
      {/* Center sphere */}
      <motion.div
        className="absolute rounded-full bg-gradient-to-br from-primary to-primary/50"
        style={{
          inset: '35%',
          boxShadow: '0 0 20px rgba(var(--primary), 0.3)',
        }}
        animate={{
          scale: [1, 1.2, 1],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
    </div>
  )
}

export function LoadingState({ message = "Loading your study session..." }: { message?: string }) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-background/80 flex items-center justify-center">
      <div className="flex flex-col items-center gap-8">
        <RainbowSpinner />
        <motion.p 
          className="text-lg text-muted-foreground"
          animate={{
            opacity: [0.5, 1, 0.5],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        >
          {message}
        </motion.p>
      </div>
    </div>
  )
}

export function ErrorState({ 
  message = "Deck not found",
  description = "This deck doesn't exist or you don't have access to it.",
  onReturnToHome
}: { 
  message?: string;
  description?: string;
  onReturnToHome: () => void;
}) {
  return (
    <div className="h-screen flex items-center justify-center">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-4">{message}</h2>
        <p className="text-muted-foreground mb-8">{description}</p>
        <Button onClick={onReturnToHome}>Return to Home</Button>
      </div>
    </div>
  );
}

export function ProcessingState({ progress }: { progress?: string }) {
  // Extract numbers from progress string like "Processed 14/14 chunks (130 flashcards so far)"
  const progressMatch = progress?.match(/(\d+)\/(\d+)/);
  const current = progressMatch ? parseInt(progressMatch[1]) : 0;
  const total = progressMatch ? parseInt(progressMatch[2]) : 0;
  const percentage = total > 0 ? (current / total) * 100 : 0;

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-background/80 flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center">
        <div className="mb-6 flex justify-center">
          <RainbowSpinner />
        </div>

        <motion.h2 
          className="text-2xl font-bold mb-2"
          animate={{
            opacity: [0.7, 1, 0.7],
            scale: [0.98, 1, 0.98],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        >
          Processing Your Deck
        </motion.h2>
        
        <motion.p 
          className="text-muted-foreground mb-8"
          animate={{
            opacity: [0.5, 1, 0.5],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        >
          {progress || "We're analyzing your content and creating flashcards. This may take a few minutes."}
        </motion.p>

        <div className="w-full h-2 bg-muted rounded-full overflow-hidden mb-4">
          <motion.div
            className="h-full bg-gradient-to-r from-primary to-primary/50"
            initial={{ width: "0%" }}
            animate={{ 
              width: progress ? `${percentage}%` : "90%",
            }}
            transition={{ 
              duration: progress ? 0.5 : 20, 
              ease: "linear",
            }}
          />
        </div>
      </div>
    </div>
  )
} 