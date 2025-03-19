import React from 'react';
import { Button } from '@/components/ui/button';

interface LoadingStateProps {
  message?: string;
}

export function LoadingState({ message = 'Loading flashcards...' }: LoadingStateProps) {
  return (
    <div className="h-screen pt-16 bg-background flex items-center justify-center">
      <div className="text-center space-y-6">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto"></div>
        <h2 className="text-xl font-semibold text-white animate-pulse">{message}</h2>
      </div>
    </div>
  );
}

interface ErrorStateProps {
  onReturnToDashboard: () => void;
  message?: string;
}

export function ErrorState({ 
  onReturnToDashboard, 
  message = 'Could not load the study deck. It may have been deleted or you may not have permission to view it.' 
}: ErrorStateProps) {
  return (
    <div className="h-screen pt-16 bg-background flex items-center justify-center">
      <div className="text-center space-y-6 max-w-md mx-auto p-8 bg-zinc-900/50 rounded-xl border border-zinc-800/50">
        <h1 className="text-3xl font-bold text-white">Error</h1>
        <p className="text-zinc-400">
          {message}
        </p>
        <Button 
          variant="default" 
          onClick={onReturnToDashboard}
          className="w-full bg-blue-600 hover:bg-blue-700"
        >
          Return to Dashboard
        </Button>
      </div>
    </div>
  );
}

export function ProcessingState() {
  return (
    <div className="h-screen pt-16 bg-background flex items-center justify-center">
      <div className="text-center space-y-6">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto"></div>
        <h1 className="text-2xl font-bold text-white animate-pulse">Processing Your Deck</h1>
        <p className="text-zinc-400">
          We&apos;re generating flashcards and a mind map for your study deck. This may take a minute or two.
        </p>
      </div>
    </div>
  );
}
