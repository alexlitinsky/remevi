import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Clock, RotateCcw } from "lucide-react";
import { motion } from "framer-motion";

interface NoDueCardsScreenProps {
  onRestartDeck: () => void;
  onReturnToDashboard: () => void;
  nextDueDate?: Date;
}

export function NoDueCardsScreen({
  onRestartDeck,
  onReturnToDashboard,
  nextDueDate
}: NoDueCardsScreenProps) {
  const formattedNextDue = nextDueDate 
    ? new Date(nextDueDate).toLocaleString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        hour: 'numeric',
        minute: 'numeric'
      })
    : 'later';

  return (
    <div className="h-screen flex items-center justify-center p-4 bg-background">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.3 }}
        className="max-w-lg w-full"
      >
        <Card className="p-8 space-y-6 border-2 shadow-xl bg-zinc-900/50">
          <div className="space-y-4 text-center">
            <div className="w-16 h-16 mx-auto rounded-full bg-blue-500/10 flex items-center justify-center">
              <Clock className="w-8 h-8 text-blue-500" />
            </div>
            <h2 className="text-2xl font-bold">No Cards Due</h2>
            <p className="text-muted-foreground text-lg">
              Great job! You&apos;ve reviewed all your due cards. Come back {formattedNextDue} for more cards to review.
            </p>
          </div>

          <div className="flex flex-col gap-3">
            <Button 
              size="lg"
              className="w-full gap-2 cursor-pointer hover:shadow-md transition-all bg-blue-600 hover:bg-blue-700 font-semibold"
              onClick={onRestartDeck}
            >
              <RotateCcw className="w-4 h-4" />
              Restart Deck
            </Button>
            <Button 
              variant="outline"
              size="lg"
              className="w-full cursor-pointer hover:shadow-md transition-all border-blue-500/50 hover:bg-blue-500/10 text-blue-400"
              onClick={onReturnToDashboard}
            >
              Return to Dashboard
            </Button>
          </div>
        </Card>
      </motion.div>
    </div>
  );
} 