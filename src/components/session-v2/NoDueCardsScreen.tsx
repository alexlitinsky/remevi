import { Check, ArrowLeft, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

interface NoDueCardsScreenProps {
  onRestartDeck: () => void;
  onReturnToDashboard: () => void;
}

export function NoDueCardsScreen({
  onRestartDeck,
  onReturnToDashboard
}: NoDueCardsScreenProps) {
  return (
    <div className="h-screen flex items-center justify-center p-4 bg-background">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="max-w-lg w-full text-center space-y-6"
      >
        <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full mx-auto flex items-center justify-center">
          <Check className="h-8 w-8 text-green-600 dark:text-green-400" />
        </div>
        
        <div className="space-y-2">
          <h2 className="text-2xl font-bold">No Due Cards!</h2>
          <p className="text-muted-foreground">
            You've completed all the due cards for today. Come back tomorrow for new cards!
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-4 justify-center mt-8">
          <Button 
            variant="outline" 
            onClick={onReturnToDashboard}
            className="space-x-2"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Deck</span>
          </Button>
          
          <Button 
            onClick={onRestartDeck}
            className="space-x-2"
          >
            <RotateCcw className="h-4 w-4" />
            <span>Reset & Study Again</span>
          </Button>
        </div>
      </motion.div>
    </div>
  );
} 