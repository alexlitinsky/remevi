'use client';

import { useQuizStore } from "@/stores/useQuizStore";
import { useEffect, useState } from "react";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";

interface QuizProviderProps {
  children: React.ReactNode;
  deckId: string;
  quizType?: 'mcq' | 'frq' | 'mixed';
  questionCount?: number;
}

export function QuizProvider({ 
  children, 
  deckId,
  quizType = 'mixed',
  questionCount = 10
}: QuizProviderProps) {
  const {
    startQuiz,
    recoverSession,
    activeSession,
    cleanupSession,
    checkForExistingSession,
    checkAndAutoRestart,
    ui: { isLoading, error },
    actions: { setIsLoading }
  } = useQuizStore();

  const { toast } = useToast();
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize or recover session
  useEffect(() => {
    const initializeQuiz = async () => {
      try {
        setIsLoading(true);
        console.log('[QuizProvider] Initializing quiz with deckId:', deckId);
        
        // Force cleanup and wait for it to complete
        console.log('[QuizProvider] Forcing session cleanup');
        cleanupSession();
        
        // Small delay to ensure cleanup is complete
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Start fresh quiz
        console.log('[QuizProvider] Starting fresh quiz');
        const success = await startQuiz({
          deckId,
          type: quizType,
          questionCount
        });
        
        if (!success) {
          throw new Error('Failed to start quiz');
        }
        
      } catch (error) {
        console.error('[QuizProvider] Initialization error:', error);
        toast({
          title: "Error",
          description: "Failed to start quiz. Please try again.",
          variant: "destructive"
        });
      } finally {
        setIsLoading(false);
        setIsInitialized(true);
      }
    };

    if (!isInitialized) {
      initializeQuiz();
    }
  }, [deckId, quizType, questionCount, isInitialized]);

  // Handle navigation events
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (activeSession.status === 'active') {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden' && activeSession.status === 'active') {
        // Auto-save progress when tab becomes hidden
        const state = useQuizStore.getState();
        state.actions.togglePause();
      }
    };

    const handlePopState = (e: PopStateEvent) => {
      if (activeSession.status === 'active') {
        // Prevent accidental navigation
        if (window.confirm('Are you sure you want to leave? Your progress will be saved.')) {
          cleanupSession();
        } else {
          e.preventDefault();
          window.history.pushState(null, '', window.location.href);
        }
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('popstate', handlePopState);

    // Push initial state to prevent back navigation
    window.history.pushState(null, '', window.location.href);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('popstate', handlePopState);
    };
  }, [activeSession.status, cleanupSession]);

  // Show loading state
  if (!isInitialized || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="space-y-4 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
          <p className="text-sm text-muted-foreground">Loading quiz...</p>
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="space-y-4 text-center">
          <p className="text-sm text-destructive">{error}</p>
          <Button onClick={() => window.location.reload()}>
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
} 