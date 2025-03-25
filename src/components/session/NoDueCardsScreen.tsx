import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Clock, RotateCcw } from "lucide-react";

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
      <Card className="max-w-lg w-full p-8 space-y-6">
        <div className="space-y-4 text-center">
          <Clock className="w-12 h-12 mx-auto text-primary" />
          <h2 className="text-2xl font-bold">No Cards Due</h2>
          <p className="text-muted-foreground">
            Great job! You&apos;ve reviewed all your due cards. Come back {formattedNextDue} for more cards to review.
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <Button 
            variant="outline" 
            className="w-full gap-2"
            onClick={onRestartDeck}
          >
            <RotateCcw className="w-4 h-4" />
            Restart Deck
          </Button>
          <Button 
            variant="secondary" 
            className="w-full"
            onClick={onReturnToDashboard}
          >
            Return to Dashboard
          </Button>
        </div>
      </Card>
    </div>
  );
} 