import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { AlertCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Progress } from "@/components/ui/progress";

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

interface ErrorStateProps {
  message: string;
  description: string;
  onReturnToHome: () => void;
}

export function ErrorState({ message, description, onReturnToHome }: ErrorStateProps) {
  return (
    <div className="h-screen flex items-center justify-center p-4 bg-background">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="max-w-lg w-full text-center space-y-6"
      >
        <div className="mx-auto w-16 h-16 flex items-center justify-center">
          <AlertCircle className="w-12 h-12 text-destructive/70" />
        </div>
        
        <div className="space-y-2">
          <h2 className="text-2xl font-bold">{message}</h2>
          <p className="text-muted-foreground">
            {description}
          </p>
        </div>
        
        <Button onClick={onReturnToHome} className="mt-4 cursor-pointer">
          Return to Home
        </Button>
      </motion.div>
    </div>
  );
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
  );
}

interface ProcessingDeck {
  processingProgress: number;
  processingStage: string;
  processedChunks?: number;
  totalChunks?: number;
  error?: string;
}

export const ProcessingState = ({ deck }: { deck?: ProcessingDeck }) => {
  const router = useRouter();
  
  useEffect(() => {
    // Only reload if processing is complete and we're not in an error state
    if (deck?.processingProgress === 100 && deck?.processingStage === 'COMPLETED') {
      const timer = setTimeout(() => {
        window.location.reload();
      }, 2000); // Increased delay to ensure mind map is generated
      return () => clearTimeout(timer);
    }
  }, [deck?.processingProgress, deck?.processingStage]);

  const progress = Math.min(Math.max(0, deck?.processingProgress || 0), 100);

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-background/80 flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center space-y-8">
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
          {getStageMessage(deck?.processingStage, deck?.processedChunks, deck?.totalChunks)}
        </motion.h2>

        <div className="space-y-4">
          <Progress value={progress} className="w-full h-2" />
          <p className="text-sm text-muted-foreground">
            {progress.toFixed(0)}% Complete
          </p>
          {deck?.error && (
            <p className="text-sm text-muted-foreground mt-2 italic">
              {deck.error}
            </p>
          )}
        </div>

        <Button
          onClick={() => router.push('/')}
          variant="outline"
          className="mt-8 cursor-pointer"
        >
          Return to Home
        </Button>
      </div>
    </div>
  );
};

const getStageMessage = (stage: string | undefined, processed: number | undefined, total: number | undefined): string => {
  if (!stage) return 'Processing Your Document';
  
  switch (stage) {
    case 'CHUNKING':
      return 'Analyzing Your Document';
    case 'GENERATING':
      return processed && total ? `Creating Flashcards (${processed}/${total} sections)` : 'Creating Flashcards';
    case 'MINDMAP':
      return 'Building Mind Map';
    case 'COMPLETED':
      return 'Almost Ready!';
    case 'ERROR':
      return 'Oops! Something Went Wrong';
    default:
      return 'Processing Your Document';
  }
};
