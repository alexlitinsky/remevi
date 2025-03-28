import { XCircle, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { motion } from "framer-motion"

export function LoadingState({ message = "Loading your study session..." }: { message?: string }) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-background/80 flex items-center justify-center">
      <div className="flex flex-col items-center gap-8">
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
        <div className="mb-6">
          <div className="relative w-32 h-32 mx-auto">
            {/* Outer spinning ring */}
            <motion.div
              className="absolute inset-0 rounded-full border-4 border-yellow-500/30"
              style={{ borderRightColor: 'transparent', transformOrigin: 'center' }}
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            />
            
            {/* Inner spinning particles */}
            {[...Array(8)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-3 h-3 rounded-full bg-yellow-500"
                style={{
                  left: '50%',
                  top: '50%',
                }}
                animate={{
                  x: [0, Math.cos(i * (Math.PI / 4)) * 50],
                  y: [0, Math.sin(i * (Math.PI / 4)) * 50],
                  scale: [1, 0.5, 1],
                  opacity: [1, 0.2, 1],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  delay: i * 0.2,
                  ease: "easeInOut",
                }}
              />
            ))}

            {/* Center sparkle */}
            <motion.div
              className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
              animate={{
                scale: [1, 1.2, 1],
                opacity: [0.5, 1, 0.5],
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            >
            </motion.div>

            {/* Rotating dots */}
            {[...Array(12)].map((_, i) => (
              <motion.div
                key={`dot-${i}`}
                className="absolute w-2 h-2 rounded-full bg-yellow-500/50"
                style={{
                  left: '50%',
                  top: '50%',
                  transformOrigin: '0 0',
                }}
                animate={{
                  rotate: [i * 30, i * 30 + 360],
                  opacity: [0.2, 1, 0.2],
                }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  delay: i * 0.1,
                  ease: "linear",
                }}
              />
            ))}
          </div>
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
            className="h-full bg-gradient-to-r from-yellow-500 via-yellow-400 to-yellow-500"
            initial={{ width: "0%" }}
            animate={{ 
              width: progress ? `${percentage}%` : "90%",
              background: progress ? undefined : [
                "linear-gradient(to right, #fbbf24, #f59e0b, #fbbf24)",
                "linear-gradient(to right, #f59e0b, #fbbf24, #f59e0b)",
                "linear-gradient(to right, #fbbf24, #f59e0b, #fbbf24)",
              ],
            }}
            transition={{ 
              duration: progress ? 0.5 : 20, 
              ease: "linear",
              background: {
                duration: 2,
                repeat: Infinity,
                ease: "linear",
              }
            }}
          />
        </div>

        <motion.p 
          className="text-sm text-muted-foreground"
          animate={{
            opacity: [0.5, 1, 0.5],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        >
          {/* {progress ? `Processing chunk ${current} of ${total}` : "This usually takes 2-3 minutes"} */}
        </motion.p>
      </div>
    </div>
  )
} 