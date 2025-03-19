import React from 'react';
import { Button } from '@/components/ui/button';
import { ArrowPathIcon, ChartBarIcon } from '@heroicons/react/24/outline';

interface DeckCompletionScreenProps {
  totalPoints: number;
  onRestartDeck: () => void;
  onSeePerformance: () => void;
  onReturnToDashboard: () => void;
}

export function DeckCompletionScreen({
  totalPoints,
  onRestartDeck,
  onSeePerformance,
  onReturnToDashboard
}: DeckCompletionScreenProps) {
  const hasEarnedPoints = totalPoints > 0;

  return (
    <div className="h-screen pt-16 bg-background flex items-center justify-center">
      <div className="text-center space-y-6 max-w-md mx-auto p-8 bg-zinc-900/50 rounded-xl border border-zinc-800/50">
        <h1 className="text-3xl font-bold text-white">
          {hasEarnedPoints ? 'Deck Completed!' : 'No Cards Due'}
        </h1>
        
        {hasEarnedPoints && (
          <div className="text-5xl font-bold text-yellow-500">+{totalPoints} points</div>
        )}
        
        <p className="text-zinc-400">
          {hasEarnedPoints 
            ? "Great job! You've completed all the flashcards that are due for review."
            : "There are no cards due for review at this time. Come back later or add more cards to this deck."}
        </p>
        
        <div className="flex flex-col space-y-4 pt-4">
          <Button 
            onClick={onRestartDeck}
            className="w-full bg-blue-600 hover:bg-blue-700"
          >
            <ArrowPathIcon className="w-5 h-5 mr-2" />
            Study Again
          </Button>
          
          {hasEarnedPoints && (
            <Button 
              onClick={onSeePerformance}
              className="w-full bg-green-600 hover:bg-green-700"
            >
              <ChartBarIcon className="w-5 h-5 mr-2" />
              See Performance
            </Button>
          )}
          
          <Button 
            variant="outline" 
            onClick={onReturnToDashboard}
            className="w-full"
          >
            Return to Dashboard
          </Button>
        </div>
      </div>
    </div>
  );
}
